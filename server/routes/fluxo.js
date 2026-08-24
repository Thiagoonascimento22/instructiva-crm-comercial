import express from 'express';
import { db, salvar, novoId, etapasPadrao } from '../lib/db.js';
import { autenticar } from '../lib/auth.js';

const router = express.Router();

const TIPOS = ['todo', 'doing', 'done'];
const CORES_OK = /^#[0-9a-fA-F]{6}$/;

function garantirEtapas(usuario) {
  if (!Array.isArray(usuario.etapas) || usuario.etapas.length === 0) {
    usuario.etapas = etapasPadrao();
    salvar('usuarios');
  }
  return usuario.etapas;
}

/** Fluxo pessoal: colunas do usuario + as tarefas dele. */
router.get('/meu-fluxo', autenticar, (req, res) => {
  const etapas = garantirEtapas(req.usuario);
  const tarefas = db.tarefas
    .filter((t) => t.responsavelId === req.usuario.id && t.status !== 'cancelada')
    .map((t) => {
      const proj = db.projetos.find((p) => p.id === t.projetoId);
      return {
        id: t.id,
        titulo: t.titulo,
        prioridade: t.prioridade,
        prazo: t.prazo,
        status: t.status,
        etapaId: t.etapaId || null,
        categoria: t.categoria,
        documentoNome: t.documentoNome,
        comentarios: t.comentarios?.length || 0,
        projetoNome: proj?.nome || null,
        projetoCor: proj?.cor || null
      };
    });
  res.json({ etapas, tarefas });
});

/** Salva o conjunto de etapas (adicionar, renomear, reordenar, recolorir, apagar). */
router.put('/meu-fluxo/etapas', autenticar, (req, res) => {
  const lista = Array.isArray(req.body?.etapas) ? req.body.etapas : null;
  if (!lista || lista.length === 0) {
    return res.status(400).json({ erro: 'Envie ao menos uma etapa' });
  }
  if (lista.length > 12) {
    return res.status(400).json({ erro: 'Maximo de 12 etapas' });
  }

  const anteriores = new Set((req.usuario.etapas || []).map((e) => e.id));
  const novas = [];
  for (const e of lista) {
    const nome = String(e?.nome || '').trim();
    if (!nome) return res.status(400).json({ erro: 'Toda etapa precisa de um nome' });
    novas.push({
      id: e.id && anteriores.has(e.id) ? e.id : novoId(),
      nome: nome.slice(0, 40),
      cor: CORES_OK.test(e?.cor) ? e.cor : '#6B7583',
      tipo: TIPOS.includes(e?.tipo) ? e.tipo : 'todo'
    });
  }

  // tarefas em etapas que sumiram voltam para "sem etapa"
  const idsValidos = new Set(novas.map((e) => e.id));
  for (const t of db.tarefas) {
    if (t.responsavelId === req.usuario.id && t.etapaId && !idsValidos.has(t.etapaId)) {
      t.etapaId = null;
    }
  }

  req.usuario.etapas = novas;
  salvar('usuarios');
  salvar('tarefas');
  res.json({ etapas: novas });
});

export default router;
