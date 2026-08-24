import express from 'express';
import { db, salvar, novoId } from '../lib/db.js';
import { autenticar, exigirPapel, ehGestor } from '../lib/auth.js';
import { doUsuario, marcarLidas } from '../lib/notificacoes.js';

const router = express.Router();

/* ---------- Projetos ---------- */

router.get('/projetos', autenticar, (req, res) => {
  const lista = db.projetos.map((p) => {
    const tarefas = db.tarefas.filter((t) => t.projetoId === p.id);
    return {
      ...p,
      totalTarefas: tarefas.length,
      concluidas: tarefas.filter((t) => t.status === 'concluida').length,
      emTriagem: tarefas.filter((t) => t.status === 'triagem').length
    };
  });
  res.json(lista);
});

router.post('/projetos', autenticar, exigirPapel('gestor'), (req, res) => {
  const { nome, descricao, cor } = req.body || {};
  if (!nome) return res.status(400).json({ erro: 'Informe o nome do projeto' });
  const projeto = {
    id: novoId(),
    nome: String(nome).trim().slice(0, 120),
    descricao: String(descricao || '').slice(0, 1000),
    cor: cor || '#F26522',
    status: 'ativo',
    criadoPor: req.usuario.id,
    criadoEm: new Date().toISOString()
  };
  db.projetos.push(projeto);
  salvar('projetos');
  res.status(201).json(projeto);
});

router.patch('/projetos/:id', autenticar, exigirPapel('gestor'), (req, res) => {
  const p = db.projetos.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ erro: 'Projeto nao encontrado' });
  const { nome, descricao, cor, status } = req.body || {};
  if (nome !== undefined) p.nome = String(nome).trim().slice(0, 120);
  if (descricao !== undefined) p.descricao = String(descricao).slice(0, 1000);
  if (cor !== undefined) p.cor = cor;
  if (status !== undefined) p.status = status;
  salvar('projetos');
  res.json(p);
});

router.delete('/projetos/:id', autenticar, exigirPapel('gestor'), (req, res) => {
  const idx = db.projetos.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ erro: 'Projeto nao encontrado' });
  const [p] = db.projetos.splice(idx, 1);
  for (const t of db.tarefas) if (t.projetoId === p.id) t.projetoId = null;
  for (const d of db.documentos) if (d.projetoId === p.id) d.projetoId = null;
  salvar('projetos'); salvar('tarefas'); salvar('documentos');
  res.json({ ok: true });
});

/* ---------- Dashboard ---------- */

router.get('/dashboard', autenticar, (req, res) => {
  const gestor = ehGestor(req.usuario);
  const todas = gestor
    ? db.tarefas
    : db.tarefas.filter((t) => t.responsavelId === req.usuario.id);

  const hoje = new Date().toISOString().slice(0, 10);
  const conta = (f) => todas.filter(f).length;

  const porPessoa = db.usuarios
    .filter((u) => u.ativo !== false)
    .map((u) => {
      const dele = db.tarefas.filter((t) => t.responsavelId === u.id);
      return {
        id: u.id,
        nome: u.nome,
        setor: u.setor,
        papel: u.papel,
        total: dele.length,
        pendentes: dele.filter((t) => t.status === 'pendente').length,
        emAndamento: dele.filter((t) => t.status === 'em_andamento').length,
        concluidas: dele.filter((t) => t.status === 'concluida').length,
        atrasadas: dele.filter(
          (t) => t.prazo && t.prazo < hoje && !['concluida', 'cancelada'].includes(t.status)
        ).length
      };
    })
    .sort((a, b) => b.total - a.total);

  const ultimosDocs = db.documentos
    .slice()
    .sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1))
    .slice(0, 6)
    .map(({ texto, caminho, ...r }) => r);

  res.json({
    resumo: {
      triagem: gestor ? db.tarefas.filter((t) => t.status === 'triagem').length : 0,
      pendentes: conta((t) => t.status === 'pendente'),
      emAndamento: conta((t) => t.status === 'em_andamento'),
      concluidas: conta((t) => t.status === 'concluida'),
      atrasadas: conta(
        (t) => t.prazo && t.prazo < hoje && !['concluida', 'cancelada'].includes(t.status)
      ),
      total: todas.length,
      documentos: db.documentos.length,
      pessoas: db.usuarios.filter((u) => u.ativo !== false).length
    },
    porPessoa: gestor ? porPessoa : [],
    ultimosDocumentos: gestor ? ultimosDocs : [],
    minhasProximas: db.tarefas
      .filter(
        (t) => t.responsavelId === req.usuario.id && !['concluida', 'cancelada'].includes(t.status)
      )
      .sort((a, b) => {
        if (a.prazo && b.prazo) return a.prazo < b.prazo ? -1 : 1;
        if (a.prazo) return -1;
        if (b.prazo) return 1;
        return 0;
      })
      .slice(0, 8)
  });
});

/* ---------- Notificacoes ---------- */

router.get('/notificacoes', autenticar, (req, res) => {
  res.json(doUsuario(req.usuario.id).slice(0, 50));
});

router.post('/notificacoes/lidas', autenticar, (req, res) => {
  marcarLidas(req.usuario.id, Array.isArray(req.body?.ids) ? req.body.ids : null);
  res.json({ ok: true });
});

/* ---------- Configuracoes ---------- */

router.get('/config', autenticar, (req, res) => {
  res.json({ ...db.config, iaAtiva: Boolean(process.env.OPENAI_API_KEY) });
});

router.patch('/config', autenticar, exigirPapel('gestor'), (req, res) => {
  const { validarTudo, gestorPadraoId, modeloIA } = req.body || {};
  if (validarTudo !== undefined) db.config.validarTudo = Boolean(validarTudo);
  if (gestorPadraoId !== undefined) db.config.gestorPadraoId = gestorPadraoId || null;
  if (modeloIA !== undefined) db.config.modeloIA = String(modeloIA).slice(0, 60);
  salvar('config');
  res.json({ ...db.config, iaAtiva: Boolean(process.env.OPENAI_API_KEY) });
});

export default router;
