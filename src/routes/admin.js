import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ler, salvar, UPLOADS_DIR } from '../db.js';
import { id, token, lojaAberta, STATUS, STATUS_LABEL, telefoneCompleto } from '../util.js';

const router = express.Router();
const SENHA = process.env.ADMIN_SENHA || 'marmita2026';
const sessoes = new Map();

function limparSessoes() {
  const agora = Date.now();
  for (const [t, exp] of sessoes) if (exp < agora) sessoes.delete(t);
}
setInterval(limparSessoes, 60 * 60 * 1000).unref?.();

router.post('/login', (req, res) => {
  const senha = String(req.body?.senha || '');
  if (senha !== SENHA) return res.status(401).json({ erro: 'Senha incorreta.' });
  const t = token();
  sessoes.set(t, Date.now() + 30 * 24 * 60 * 60 * 1000);
  res.json({ ok: true, token: t });
});

function auth(req, res, next) {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  const exp = sessoes.get(t);
  if (!exp || exp < Date.now()) return res.status(401).json({ erro: 'Sessão expirada. Entre novamente.' });
  sessoes.set(t, Date.now() + 30 * 24 * 60 * 60 * 1000);
  next();
}
router.use(auth);

router.get('/sessao', (req, res) => res.json({ ok: true }));

/* ---------------- Upload de imagem ---------------- */
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
      cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|gif|avif)$/.test(file.mimetype);
    cb(ok ? null : new Error('Envie uma imagem JPG, PNG ou WEBP.'), ok);
  },
});

router.post('/upload', (req, res) => {
  upload.single('arquivo')(req, res, (err) => {
    if (err) return res.status(400).json({ erro: err.message });
    if (!req.file) return res.status(400).json({ erro: 'Nenhuma imagem enviada.' });
    res.json({ ok: true, url: `/uploads/${req.file.filename}` });
  });
});

/* ---------------- Configuração da loja ---------------- */
router.get('/config', (req, res) => {
  const c = ler('config');
  res.json({ ...c, abertoAgora: lojaAberta(c) });
});

router.put('/config', (req, res) => {
  const c = ler('config');
  const b = req.body || {};
  const campos = ['nome', 'slogan', 'logo', 'cor', 'corSecundaria', 'whatsapp', 'whatsapp2', 'instagram', 'endereco', 'tempoPreparo', 'avisoTopo'];
  for (const k of campos) if (b[k] !== undefined) c[k] = String(b[k]);
  if (b.aberto !== undefined) c.aberto = !!b.aberto;
  if (b.abrirAutomatico !== undefined) c.abrirAutomatico = !!b.abrirAutomatico;
  if (b.pedidoMinimo !== undefined) c.pedidoMinimo = Number(b.pedidoMinimo) || 0;
  if (Array.isArray(b.horarios)) c.horarios = b.horarios;
  if (b.entrega) {
    c.entrega.entregaAtiva = !!b.entrega.entregaAtiva;
    c.entrega.retiradaAtiva = !!b.entrega.retiradaAtiva;
    c.entrega.taxaPadrao = Number(b.entrega.taxaPadrao) || 0;
    if (Array.isArray(b.entrega.bairros)) {
      c.entrega.bairros = b.entrega.bairros
        .filter((x) => String(x.nome || '').trim())
        .map((x) => ({ nome: String(x.nome).trim(), taxa: Number(x.taxa) || 0, tempo: String(x.tempo || '') }));
    }
  }
  if (b.pagamentos) {
    const p = b.pagamentos;
    if (p.pix) c.pagamentos.pix = { ativo: !!p.pix.ativo, chave: String(p.pix.chave || ''), titular: String(p.pix.titular || '') };
    if (p.dinheiro) c.pagamentos.dinheiro = { ativo: !!p.dinheiro.ativo };
    if (p.cartaoEntrega) c.pagamentos.cartaoEntrega = { ativo: !!p.cartaoEntrega.ativo, detalhe: String(p.cartaoEntrega.detalhe || '') };
  }
  salvar('config');
  res.json({ ok: true, config: c });
});

/* ---------------- Cardápio ---------------- */
router.get('/cardapio', (req, res) => res.json(ler('cardapio')));

router.post('/categorias', (req, res) => {
  const c = ler('cardapio');
  const nova = {
    id: id('cat_'),
    nome: String(req.body?.nome || 'Nova categoria').trim(),
    descricao: String(req.body?.descricao || ''),
    icone: String(req.body?.icone || ''),
    ordem: (c.categorias.length || 0) + 1,
    ativo: true,
  };
  c.categorias.push(nova);
  salvar('cardapio');
  res.json({ ok: true, categoria: nova });
});

router.put('/categorias/:id', (req, res) => {
  const c = ler('cardapio');
  const cat = c.categorias.find((x) => x.id === req.params.id);
  if (!cat) return res.status(404).json({ erro: 'Categoria não encontrada.' });
  const b = req.body || {};
  if (b.nome !== undefined) cat.nome = String(b.nome);
  if (b.descricao !== undefined) cat.descricao = String(b.descricao);
  if (b.ordem !== undefined) cat.ordem = Number(b.ordem) || 0;
  if (b.icone !== undefined) cat.icone = String(b.icone);
  if (b.ativo !== undefined) cat.ativo = !!b.ativo;
  salvar('cardapio');
  res.json({ ok: true, categoria: cat });
});

router.delete('/categorias/:id', (req, res) => {
  const c = ler('cardapio');
  if (c.produtos.some((p) => p.categoriaId === req.params.id))
    return res.status(400).json({ erro: 'Mova ou exclua os itens desta categoria antes de removê-la.' });
  c.categorias = c.categorias.filter((x) => x.id !== req.params.id);
  salvar('cardapio');
  res.json({ ok: true });
});

function sanitizarProduto(b, base = {}) {
  const grupos = Array.isArray(b.grupos)
    ? b.grupos.map((g) => ({
        id: g.id || id('g_'),
        nome: String(g.nome || 'Opções'),
        tipo: g.tipo === 'multiplo' ? 'multiplo' : 'unico',
        obrigatorio: !!g.obrigatorio,
        min: Number(g.min) || 0,
        max: Number(g.max) || 1,
        itens: (g.itens || []).map((i) => ({ id: i.id || id('i_'), nome: String(i.nome || ''), preco: Number(i.preco) || 0 })).filter((i) => i.nome),
      }))
    : base.grupos || [];

  return {
    ...base,
    categoriaId: b.categoriaId !== undefined ? String(b.categoriaId) : base.categoriaId,
    nome: b.nome !== undefined ? String(b.nome).trim() : base.nome,
    descricao: b.descricao !== undefined ? String(b.descricao) : base.descricao,
    composicao: Array.isArray(b.composicao) ? b.composicao.map((x) => String(x)).filter(Boolean) : base.composicao || [],
    preco: b.preco !== undefined ? Number(b.preco) || 0 : base.preco,
    precoPromo: b.precoPromo === '' || b.precoPromo === null || b.precoPromo === undefined ? null : Number(b.precoPromo) || null,
    imagem: b.imagem !== undefined ? String(b.imagem) : base.imagem,
    ativo: b.ativo !== undefined ? !!b.ativo : base.ativo,
    destaque: b.destaque !== undefined ? !!b.destaque : base.destaque,
    esgotado: b.esgotado !== undefined ? !!b.esgotado : base.esgotado,
    ordem: b.ordem !== undefined ? Number(b.ordem) || 0 : base.ordem,
    grupos,
  };
}

router.post('/produtos', (req, res) => {
  const c = ler('cardapio');
  const novo = sanitizarProduto(req.body || {}, {
    id: id('prod_'),
    categoriaId: c.categorias[0]?.id || '',
    nome: 'Novo item',
    descricao: '',
    preco: 0,
    precoPromo: null,
    imagem: '',
    ativo: true,
    destaque: false,
    esgotado: false,
    ordem: c.produtos.length + 1,
    composicao: [],
    grupos: [],
  });
  c.produtos.push(novo);
  salvar('cardapio');
  res.json({ ok: true, produto: novo });
});

router.put('/produtos/:id', (req, res) => {
  const c = ler('cardapio');
  const i = c.produtos.findIndex((p) => p.id === req.params.id);
  if (i < 0) return res.status(404).json({ erro: 'Item não encontrado.' });
  c.produtos[i] = sanitizarProduto(req.body || {}, c.produtos[i]);
  salvar('cardapio');
  res.json({ ok: true, produto: c.produtos[i] });
});

router.delete('/produtos/:id', (req, res) => {
  const c = ler('cardapio');
  c.produtos = c.produtos.filter((p) => p.id !== req.params.id);
  salvar('cardapio');
  res.json({ ok: true });
});

/* ---------------- Pedidos ---------------- */
router.get('/pedidos', (req, res) => {
  const store = ler('pedidos');
  const { status, busca, dia } = req.query;
  let lista = store.pedidos;

  if (dia) lista = lista.filter((p) => p.criadoEm.slice(0, 10) === dia);
  if (status && status !== 'todos') lista = lista.filter((p) => p.status === status);
  if (busca) {
    const q = String(busca).toLowerCase();
    lista = lista.filter((p) => p.codigo.includes(q) || p.cliente.nome.toLowerCase().includes(q) || p.cliente.telefone.includes(q));
  }

  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const doDia = store.pedidos.filter((p) => p.criadoEm.slice(0, 10) === hoje && p.status !== 'cancelado');

  res.json({
    pedidos: lista.slice(0, 200).map((p) => ({ ...p, statusLabel: STATUS_LABEL[p.status], whatsapp: telefoneCompleto(p.cliente.telefone) })),
    resumo: {
      hoje: doDia.length,
      faturamentoHoje: Number(doDia.reduce((s, p) => s + p.total, 0).toFixed(2)),
      ticketMedio: doDia.length ? Number((doDia.reduce((s, p) => s + p.total, 0) / doDia.length).toFixed(2)) : 0,
      abertos: store.pedidos.filter((p) => ['novo', 'aceito', 'preparando', 'saiu'].includes(p.status)).length,
      novos: store.pedidos.filter((p) => p.status === 'novo').length,
      mensagens: store.pedidos.reduce((s, p) => s + (p.naoLidasLoja || 0), 0),
    },
  });
});

router.put('/pedidos/:id/status', (req, res) => {
  const store = ler('pedidos');
  const p = store.pedidos.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ erro: 'Pedido não encontrado.' });
  const novo = String(req.body?.status || '');
  if (!STATUS.includes(novo)) return res.status(400).json({ erro: 'Status inválido.' });
  p.status = novo;
  p.atualizadoEm = new Date().toISOString();
  p.historico.push({ status: novo, em: p.atualizadoEm });

  const aviso = {
    aceito: 'Seu pedido foi confirmado! Já vamos começar o preparo.',
    preparando: 'Seu pedido está sendo preparado agora.',
    saiu: 'Seu pedido saiu para entrega!',
    entregue: 'Pedido entregue. Bom apetite e obrigado pela preferência!',
    cancelado: 'Seu pedido foi cancelado. Qualquer dúvida, é só chamar por aqui.',
  }[novo];
  if (aviso) {
    p.chat.push({ id: id('msg_'), de: 'sistema', texto: aviso, em: new Date().toISOString() });
    p.naoLidasCliente = (p.naoLidasCliente || 0) + 1;
  }
  salvar('pedidos');
  res.json({ ok: true, pedido: p });
});

router.post('/pedidos/:id/chat', (req, res) => {
  const store = ler('pedidos');
  const p = store.pedidos.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ erro: 'Pedido não encontrado.' });
  const texto = String(req.body?.texto || '').trim().slice(0, 800);
  if (!texto) return res.status(400).json({ erro: 'Escreva uma mensagem.' });
  p.chat.push({ id: id('msg_'), de: 'loja', texto, em: new Date().toISOString() });
  p.naoLidasCliente = (p.naoLidasCliente || 0) + 1;
  salvar('pedidos');
  res.json({ ok: true, chat: p.chat });
});

router.post('/pedidos/:id/lido', (req, res) => {
  const store = ler('pedidos');
  const p = store.pedidos.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ erro: 'Pedido não encontrado.' });
  p.naoLidasLoja = 0;
  salvar('pedidos');
  res.json({ ok: true });
});

/* ---------------- Relatório ---------------- */
router.get('/relatorio', (req, res) => {
  const store = ler('pedidos');
  const dias = Math.min(90, Number(req.query.dias) || 7);
  const limite = Date.now() - dias * 86400000;
  const lista = store.pedidos.filter((p) => new Date(p.criadoEm).getTime() >= limite && p.status !== 'cancelado');

  const porDia = {};
  const porProduto = {};
  for (const p of lista) {
    const d = p.criadoEm.slice(0, 10);
    porDia[d] = porDia[d] || { dia: d, pedidos: 0, total: 0 };
    porDia[d].pedidos++;
    porDia[d].total = Number((porDia[d].total + p.total).toFixed(2));
    for (const i of p.itens) {
      porProduto[i.nome] = porProduto[i.nome] || { nome: i.nome, qtd: 0, total: 0 };
      porProduto[i.nome].qtd += i.qtd;
      porProduto[i.nome].total = Number((porProduto[i.nome].total + i.subtotal).toFixed(2));
    }
  }

  res.json({
    dias,
    total: Number(lista.reduce((s, p) => s + p.total, 0).toFixed(2)),
    pedidos: lista.length,
    ticketMedio: lista.length ? Number((lista.reduce((s, p) => s + p.total, 0) / lista.length).toFixed(2)) : 0,
    porDia: Object.values(porDia).sort((a, b) => a.dia.localeCompare(b.dia)),
    ranking: Object.values(porProduto).sort((a, b) => b.qtd - a.qtd).slice(0, 15),
    formas: lista.reduce((acc, p) => { acc[p.pagamento.forma] = (acc[p.pagamento.forma] || 0) + 1; return acc; }, {}),
  });
});

export default router;
