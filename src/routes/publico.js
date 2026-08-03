import express from 'express';
import { ler, salvar } from '../db.js';
import { id, token, normalizarTelefone, montarPedido, lojaAberta, STATUS_LABEL } from '../util.js';

const router = express.Router();

function configPublica() {
  const c = ler('config');
  const { pagamentos, ...resto } = c;
  return {
    ...resto,
    abertoAgora: lojaAberta(c),
    pagamentos: {
      pix: { ativo: pagamentos.pix.ativo },
      dinheiro: { ativo: pagamentos.dinheiro.ativo },
      cartaoEntrega: pagamentos.cartaoEntrega,
    },
  };
}

router.get('/loja', (req, res) => {
  const cardapio = ler('cardapio');
  res.json({
    config: configPublica(),
    categorias: (cardapio.categorias || []).filter((c) => c.ativo).sort((a, b) => (a.ordem || 0) - (b.ordem || 0)),
    produtos: (cardapio.produtos || [])
      .filter((p) => p.ativo)
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0)),
  });
});

router.post('/pedidos', (req, res) => {
  const config = ler('config');
  const cardapio = ler('cardapio');
  const dados = req.body || {};

  if (!lojaAberta(config)) return res.status(400).json({ erro: 'A loja está fechada no momento.' });

  const nome = String(dados.nome || '').trim();
  const telefone = String(dados.telefone || '').trim();
  const tipo = dados.tipo === 'retirada' ? 'retirada' : 'entrega';
  const forma = String(dados.formaPagamento || '');

  const erros = [];
  if (nome.length < 2) erros.push('Informe seu nome.');
  if (normalizarTelefone(telefone).length < 10) erros.push('Informe um WhatsApp válido com DDD.');

  let endereco = null;
  if (tipo === 'entrega') {
    if (!config.entrega.entregaAtiva) erros.push('A entrega está indisponível no momento.');
    const e = dados.endereco || {};
    if (!String(e.rua || '').trim()) erros.push('Informe a rua.');
    if (!String(e.numero || '').trim()) erros.push('Informe o número.');
    if (!String(e.bairro || '').trim()) erros.push('Informe o bairro.');
    endereco = {
      rua: String(e.rua || '').trim(),
      numero: String(e.numero || '').trim(),
      bairro: String(e.bairro || '').trim(),
      complemento: String(e.complemento || '').trim(),
      referencia: String(e.referencia || '').trim(),
    };
  } else if (!config.entrega.retiradaAtiva) {
    erros.push('A retirada no local está indisponível no momento.');
  }

  const formasValidas = [];
  if (config.pagamentos.pix.ativo) formasValidas.push('pix');
  if (config.pagamentos.dinheiro.ativo) formasValidas.push('dinheiro');
  if (config.pagamentos.cartaoEntrega.ativo) formasValidas.push('cartao');
  if (!formasValidas.includes(forma)) erros.push('Escolha uma forma de pagamento.');

  const calculo = montarPedido(
    { itens: dados.itens, tipo, bairro: endereco?.bairro },
    cardapio,
    config
  );
  erros.push(...calculo.erros);

  if (erros.length) return res.status(400).json({ erro: erros[0], erros });

  const store = ler('pedidos');
  store.contador = (store.contador || 0) + 1;

  const trocoPara = forma === 'dinheiro' && dados.trocoPara ? Number(dados.trocoPara) : null;

  const pedido = {
    id: id('ped_'),
    token: token(),
    codigo: String(store.contador).padStart(4, '0'),
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    status: 'novo',
    historico: [{ status: 'novo', em: new Date().toISOString() }],
    cliente: { nome, telefone, telefoneKey: normalizarTelefone(telefone) },
    tipo,
    endereco,
    itens: calculo.itens,
    subtotal: calculo.subtotal,
    taxaEntrega: calculo.taxaEntrega,
    total: calculo.total,
    pagamento: {
      forma,
      trocoPara: trocoPara && trocoPara > calculo.total ? trocoPara : null,
      troco: trocoPara && trocoPara > calculo.total ? Number((trocoPara - calculo.total).toFixed(2)) : null,
    },
    obs: String(dados.obs || '').slice(0, 400),
    chat: [],
    naoLidasLoja: 0,
    naoLidasCliente: 0,
  };

  store.pedidos.unshift(pedido);
  if (store.pedidos.length > 5000) store.pedidos.length = 5000;
  salvar('pedidos');

  res.json({ ok: true, id: pedido.id, token: pedido.token, codigo: pedido.codigo });
});

function acharPorToken(req) {
  const store = ler('pedidos');
  return store.pedidos.find((p) => p.token === req.params.token);
}

function pedidoPublico(p, config) {
  return {
    codigo: p.codigo,
    criadoEm: p.criadoEm,
    status: p.status,
    statusLabel: STATUS_LABEL[p.status],
    historico: p.historico,
    cliente: { nome: p.cliente.nome },
    tipo: p.tipo,
    endereco: p.endereco,
    itens: p.itens,
    subtotal: p.subtotal,
    taxaEntrega: p.taxaEntrega,
    total: p.total,
    pagamento: p.pagamento,
    obs: p.obs,
    chat: p.chat,
    pix: p.pagamento.forma === 'pix' ? config.pagamentos.pix : null,
    tempoPreparo: config.tempoPreparo,
    loja: { nome: config.nome, logo: config.logo, cor: config.cor, whatsapp: config.whatsapp, endereco: config.endereco },
  };
}

router.get('/pedidos/:token', (req, res) => {
  const p = acharPorToken(req);
  if (!p) return res.status(404).json({ erro: 'Pedido não encontrado.' });
  p.naoLidasCliente = 0;
  salvar('pedidos');
  res.json(pedidoPublico(p, ler('config')));
});

router.post('/pedidos/:token/chat', (req, res) => {
  const p = acharPorToken(req);
  if (!p) return res.status(404).json({ erro: 'Pedido não encontrado.' });
  const texto = String(req.body?.texto || '').trim().slice(0, 800);
  if (!texto) return res.status(400).json({ erro: 'Escreva uma mensagem.' });
  p.chat.push({ id: id('msg_'), de: 'cliente', texto, em: new Date().toISOString() });
  p.naoLidasLoja = (p.naoLidasLoja || 0) + 1;
  salvar('pedidos');
  res.json({ ok: true, chat: p.chat });
});

// Histórico do cliente pelo telefone
router.post('/meus-pedidos', (req, res) => {
  const key = normalizarTelefone(req.body?.telefone || '');
  if (key.length < 10) return res.status(400).json({ erro: 'Informe um telefone válido.' });
  const store = ler('pedidos');
  const lista = store.pedidos
    .filter((p) => p.cliente.telefoneKey === key)
    .slice(0, 20)
    .map((p) => ({ codigo: p.codigo, token: p.token, criadoEm: p.criadoEm, status: p.status, statusLabel: STATUS_LABEL[p.status], total: p.total }));
  res.json({ pedidos: lista });
});

export default router;
