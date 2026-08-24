import { db, salvar, novoId } from './db.js';

const LIMITE = 500;

export function notificar(usuarioId, tipo, mensagem, tarefaId = null) {
  if (!usuarioId) return null;
  const n = {
    id: novoId(),
    usuarioId,
    tipo,
    mensagem,
    tarefaId,
    lida: false,
    criadoEm: new Date().toISOString()
  };
  db.notificacoes.unshift(n);
  if (db.notificacoes.length > LIMITE) db.notificacoes.length = LIMITE;
  salvar('notificacoes');
  return n;
}

export function doUsuario(usuarioId, apenasNaoLidas = false) {
  return db.notificacoes.filter(
    (n) => n.usuarioId === usuarioId && (!apenasNaoLidas || !n.lida)
  );
}

export function marcarLidas(usuarioId, ids = null) {
  let mudou = false;
  for (const n of db.notificacoes) {
    if (n.usuarioId !== usuarioId) continue;
    if (ids && !ids.includes(n.id)) continue;
    if (!n.lida) { n.lida = true; mudou = true; }
  }
  if (mudou) salvar('notificacoes');
}
