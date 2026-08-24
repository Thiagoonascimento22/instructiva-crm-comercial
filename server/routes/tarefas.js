import express from 'express';
import { db, salvar, novoId } from '../lib/db.js';
import { autenticar, exigirPapel, ehGestor } from '../lib/auth.js';
import { notificar } from '../lib/notificacoes.js';

const router = express.Router();

const STATUS = ['triagem', 'pendente', 'em_andamento', 'concluida', 'cancelada'];
const PRIORIDADES = ['baixa', 'media', 'alta', 'urgente'];

function registrar(tarefa, usuario, acao) {
  tarefa.historico.push({ em: new Date().toISOString(), por: usuario.id, porNome: usuario.nome, acao });
  tarefa.atualizadoEm = new Date().toISOString();
}

function enriquecer(t) {
  const resp = db.usuarios.find((u) => u.id === t.responsavelId);
  const proj = db.projetos.find((p) => p.id === t.projetoId);
  return {
    ...t,
    responsavelNome: resp?.nome || null,
    responsavelSetor: resp?.setor || null,
    projetoNome: proj?.nome || null,
    projetoCor: proj?.cor || null
  };
}

/** Colaborador so enxerga o que e dele. Gestor e admin enxergam tudo. */
function visivelPara(usuario) {
  return (t) => ehGestor(usuario) || t.responsavelId === usuario.id || t.criadoPor === usuario.id;
}

router.get('/tarefas', autenticar, (req, res) => {
  const { status, responsavelId, projetoId, documentoId, prioridade, busca, minhas } = req.query;
  let lista = db.tarefas.filter(visivelPara(req.usuario));

  if (minhas === 'true') lista = lista.filter((t) => t.responsavelId === req.usuario.id);
  if (status) {
    const alvos = String(status).split(',');
    lista = lista.filter((t) => alvos.includes(t.status));
  }
  if (responsavelId) {
    lista = responsavelId === 'sem'
      ? lista.filter((t) => !t.responsavelId)
      : lista.filter((t) => t.responsavelId === responsavelId);
  }
  if (projetoId) lista = lista.filter((t) => t.projetoId === projetoId);
  if (documentoId) lista = lista.filter((t) => t.documentoId === documentoId);
  if (prioridade) lista = lista.filter((t) => t.prioridade === prioridade);
  if (busca) {
    const q = String(busca).toLowerCase();
    lista = lista.filter(
      (t) =>
        t.titulo.toLowerCase().includes(q) ||
        (t.descricao || '').toLowerCase().includes(q) ||
        (t.documentoNome || '').toLowerCase().includes(q)
    );
  }

  const pesoP = { urgente: 0, alta: 1, media: 2, baixa: 3 };
  lista.sort((a, b) => {
    if (a.status === 'concluida' && b.status !== 'concluida') return 1;
    if (b.status === 'concluida' && a.status !== 'concluida') return -1;
    const p = (pesoP[a.prioridade] ?? 2) - (pesoP[b.prioridade] ?? 2);
    if (p !== 0) return p;
    if (a.prazo && b.prazo) return a.prazo < b.prazo ? -1 : 1;
    if (a.prazo) return -1;
    if (b.prazo) return 1;
    return a.criadoEm < b.criadoEm ? 1 : -1;
  });

  res.json(lista.map(enriquecer));
});

router.get('/tarefas/:id', autenticar, (req, res) => {
  const t = db.tarefas.find((x) => x.id === req.params.id);
  if (!t) return res.status(404).json({ erro: 'Tarefa nao encontrada' });
  if (!visivelPara(req.usuario)(t)) return res.status(403).json({ erro: 'Sem permissao' });
  res.json(enriquecer(t));
});

router.post('/tarefas', autenticar, (req, res) => {
  const { titulo, descricao, responsavelId, projetoId, prioridade, prazo, categoria } = req.body || {};
  if (!titulo || String(titulo).trim().length < 3) {
    return res.status(400).json({ erro: 'Informe um titulo para a tarefa' });
  }
  const podeAtribuir = ehGestor(req.usuario);
  const destino = podeAtribuir ? (responsavelId || null) : req.usuario.id;
  const agora = new Date().toISOString();

  const tarefa = {
    id: novoId(),
    titulo: String(titulo).trim().slice(0, 180),
    descricao: String(descricao || '').slice(0, 2000),
    documentoId: null,
    documentoNome: null,
    projetoId: projetoId || null,
    responsavelId: destino,
    etapaId: null,
    responsavelSugerido: null,
    sugestaoCasada: null,
    status: destino ? 'pendente' : 'triagem',
    prioridade: PRIORIDADES.includes(prioridade) ? prioridade : 'media',
    categoria: String(categoria || '').toLowerCase().slice(0, 40),
    prazo: prazo || null,
    prazoTexto: null,
    trechoOrigem: '',
    origem: 'manual',
    criadoPor: req.usuario.id,
    criadoEm: agora,
    atualizadoEm: agora,
    concluidaEm: null,
    comentarios: [],
    historico: [{ em: agora, por: req.usuario.id, porNome: req.usuario.nome, acao: 'Tarefa criada manualmente' }]
  };

  db.tarefas.push(tarefa);
  salvar('tarefas');
  if (destino && destino !== req.usuario.id) {
    notificar(destino, 'nova_tarefa', `Nova tarefa: ${tarefa.titulo}`, tarefa.id);
  }
  res.status(201).json(enriquecer(tarefa));
});

router.patch('/tarefas/:id', autenticar, (req, res) => {
  const t = db.tarefas.find((x) => x.id === req.params.id);
  if (!t) return res.status(404).json({ erro: 'Tarefa nao encontrada' });

  const gestor = ehGestor(req.usuario);
  const meu = t.responsavelId === req.usuario.id;
  if (!gestor && !meu) return res.status(403).json({ erro: 'Sem permissao' });

  const { titulo, descricao, status, prioridade, prazo, categoria, projetoId, responsavelId } = req.body || {};

  if (status && STATUS.includes(status) && status !== t.status) {
    if (!gestor && status === 'triagem') {
      return res.status(403).json({ erro: 'Somente o gestor pode devolver para triagem' });
    }
    const de = t.status;
    t.status = status;
    t.concluidaEm = status === 'concluida' ? new Date().toISOString() : null;
    registrar(t, req.usuario, `Status alterado de "${de}" para "${status}"`);
    if (status === 'concluida' && t.criadoPor && t.criadoPor !== req.usuario.id) {
      notificar(t.criadoPor, 'concluida', `${req.usuario.nome} concluiu: ${t.titulo}`, t.id);
    }
  }

  if (gestor) {
    if (titulo !== undefined) t.titulo = String(titulo).trim().slice(0, 180);
    if (descricao !== undefined) t.descricao = String(descricao).slice(0, 2000);
    if (categoria !== undefined) t.categoria = String(categoria).toLowerCase().slice(0, 40);
    if (projetoId !== undefined) t.projetoId = projetoId || null;
    if (prioridade && PRIORIDADES.includes(prioridade) && prioridade !== t.prioridade) {
      registrar(t, req.usuario, `Prioridade alterada para "${prioridade}"`);
      t.prioridade = prioridade;
    }
    if (prazo !== undefined) {
      t.prazo = prazo || null;
      registrar(t, req.usuario, prazo ? `Prazo definido para ${prazo}` : 'Prazo removido');
    }
    if (responsavelId !== undefined) {
      atribuir(t, responsavelId, req.usuario);
    }
  } else {
    if (descricao !== undefined) t.descricao = String(descricao).slice(0, 2000);
  }

  t.atualizadoEm = new Date().toISOString();
  salvar('tarefas');
  res.json(enriquecer(t));
});

function atribuir(tarefa, responsavelId, autor) {
  const destino = responsavelId ? db.usuarios.find((u) => u.id === responsavelId) : null;
  if (responsavelId && !destino) return false;
  const antes = tarefa.responsavelId;
  tarefa.responsavelId = destino ? destino.id : null;
  tarefa.etapaId = null; // fluxo pessoal e por dono: zera ao trocar de responsavel
  if (destino) {
    if (tarefa.status === 'triagem') tarefa.status = 'pendente';
    registrar(tarefa, autor, `Atribuida a ${destino.nome}`);
    if (destino.id !== autor.id && destino.id !== antes) {
      notificar(destino.id, 'nova_tarefa', `Nova tarefa: ${tarefa.titulo}`, tarefa.id);
    }
  } else {
    tarefa.status = 'triagem';
    registrar(tarefa, autor, 'Responsavel removido - devolvida para triagem');
  }
  return true;
}

/** Move a tarefa para uma etapa do fluxo pessoal do responsavel e ajusta o status global. */
router.patch('/tarefas/:id/etapa', autenticar, (req, res) => {
  const t = db.tarefas.find((x) => x.id === req.params.id);
  if (!t) return res.status(404).json({ erro: 'Tarefa nao encontrada' });
  if (t.responsavelId !== req.usuario.id && !ehGestor(req.usuario)) {
    return res.status(403).json({ erro: 'Esta tarefa nao esta no seu fluxo' });
  }

  const dono = db.usuarios.find((u) => u.id === t.responsavelId) || req.usuario;
  const etapaId = req.body?.etapaId || null;
  const etapa = (dono.etapas || []).find((e) => e.id === etapaId);
  if (etapaId && !etapa) return res.status(400).json({ erro: 'Etapa invalida' });

  t.etapaId = etapaId;
  if (etapa) {
    const mapa = { todo: 'pendente', doing: 'em_andamento', done: 'concluida' };
    const novo = mapa[etapa.tipo] || t.status;
    if (novo !== t.status) {
      t.status = novo;
      t.concluidaEm = novo === 'concluida' ? new Date().toISOString() : null;
      registrar(t, req.usuario, `Movida para "${etapa.nome}" no fluxo`);
    }
  }
  t.atualizadoEm = new Date().toISOString();
  salvar('tarefas');
  res.json({ ok: true, etapaId: t.etapaId, status: t.status });
});

/** Distribuicao em lote a partir da fila de triagem. */
router.post('/tarefas/lote/atribuir', autenticar, exigirPapel('gestor'), (req, res) => {
  const { ids, responsavelId, prazo, prioridade } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ erro: 'Selecione ao menos uma tarefa' });
  }
  const destino = responsavelId ? db.usuarios.find((u) => u.id === responsavelId) : null;
  if (responsavelId && !destino) return res.status(400).json({ erro: 'Responsavel invalido' });

  let n = 0;
  for (const id of ids) {
    const t = db.tarefas.find((x) => x.id === id);
    if (!t) continue;
    if (prioridade && PRIORIDADES.includes(prioridade)) t.prioridade = prioridade;
    if (prazo !== undefined && prazo !== null && prazo !== '') t.prazo = prazo;
    atribuir(t, responsavelId || null, req.usuario);
    n++;
  }
  salvar('tarefas');
  res.json({ ok: true, atualizadas: n });
});

router.post('/tarefas/lote/status', autenticar, exigirPapel('gestor'), (req, res) => {
  const { ids, status } = req.body || {};
  if (!Array.isArray(ids) || !STATUS.includes(status)) {
    return res.status(400).json({ erro: 'Parametros invalidos' });
  }
  let n = 0;
  for (const id of ids) {
    const t = db.tarefas.find((x) => x.id === id);
    if (!t) continue;
    t.status = status;
    t.concluidaEm = status === 'concluida' ? new Date().toISOString() : null;
    registrar(t, req.usuario, `Status alterado em lote para "${status}"`);
    n++;
  }
  salvar('tarefas');
  res.json({ ok: true, atualizadas: n });
});

router.post('/tarefas/:id/comentarios', autenticar, (req, res) => {
  const t = db.tarefas.find((x) => x.id === req.params.id);
  if (!t) return res.status(404).json({ erro: 'Tarefa nao encontrada' });
  if (!visivelPara(req.usuario)(t)) return res.status(403).json({ erro: 'Sem permissao' });
  const texto = String(req.body?.texto || '').trim();
  if (!texto) return res.status(400).json({ erro: 'Comentario vazio' });

  const c = {
    id: novoId(),
    autorId: req.usuario.id,
    autorNome: req.usuario.nome,
    texto: texto.slice(0, 2000),
    criadoEm: new Date().toISOString()
  };
  t.comentarios.push(c);
  t.atualizadoEm = c.criadoEm;
  salvar('tarefas');

  const avisar = new Set([t.responsavelId, t.criadoPor].filter((id) => id && id !== req.usuario.id));
  for (const id of avisar) {
    notificar(id, 'comentario', `${req.usuario.nome} comentou em: ${t.titulo}`, t.id);
  }
  res.status(201).json(c);
});

router.delete('/tarefas/:id', autenticar, exigirPapel('gestor'), (req, res) => {
  const idx = db.tarefas.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ erro: 'Tarefa nao encontrada' });
  db.tarefas.splice(idx, 1);
  salvar('tarefas');
  res.json({ ok: true });
});

export default router;
