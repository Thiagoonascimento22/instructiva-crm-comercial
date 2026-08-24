import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// DATA_DIR permite apontar para um volume persistente do Railway.
// Se nao existir volume, cai em server/data (sobrevive ate o proximo deploy).
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');

export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(DATA_DIR, 'uploads');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/**
 * IMPORTANTE: cada colecao em seu proprio arquivo JSON.
 * Nunca juntar tudo num blob unico - blobs consolidados quebram em redeploy.
 */
const COLECOES = {
  usuarios: [],
  projetos: [],
  documentos: [],
  tarefas: [],
  notificacoes: [],
  config: {
    validarTudo: false,
    gestorPadraoId: null,
    modeloIA: process.env.MODELO_IA || 'gpt-4o-mini',
    empresa: 'Escola Instructiva'
  }
};

const cache = {};
const timers = {};
const sujos = new Set();
const DEBOUNCE_MS = 400;

function arquivo(nome) {
  return path.join(DATA_DIR, `${nome}.json`);
}

function carregar(nome) {
  const p = arquivo(nome);
  try {
    if (fs.existsSync(p)) {
      const bruto = fs.readFileSync(p, 'utf8');
      if (bruto.trim()) return JSON.parse(bruto);
    }
  } catch (e) {
    console.error(`[db] falha ao ler ${nome}.json:`, e.message);
    // backup do arquivo corrompido para nao perder dados
    try { fs.copyFileSync(p, `${p}.corrompido-${Date.now()}`); } catch {}
  }
  return JSON.parse(JSON.stringify(COLECOES[nome]));
}

for (const nome of Object.keys(COLECOES)) {
  cache[nome] = carregar(nome);
}

function gravarSync(nome) {
  const p = arquivo(nome);
  const tmp = `${p}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(cache[nome], null, 2), 'utf8');
  fs.renameSync(tmp, p);
  sujos.delete(nome);
}

async function gravarAsync(nome) {
  const p = arquivo(nome);
  const tmp = `${p}.tmp-${process.pid}`;
  await fsp.writeFile(tmp, JSON.stringify(cache[nome], null, 2), 'utf8');
  await fsp.rename(tmp, p);
  sujos.delete(nome);
}

/** Marca a colecao como suja e agenda gravacao debounced. */
export function salvar(nome) {
  sujos.add(nome);
  clearTimeout(timers[nome]);
  timers[nome] = setTimeout(() => {
    gravarAsync(nome).catch((e) => console.error(`[db] erro gravando ${nome}:`, e.message));
  }, DEBOUNCE_MS);
}

/** Forca gravacao imediata de tudo que esta pendente (usado no shutdown). */
export function flushSync() {
  for (const nome of Array.from(sujos)) {
    try { gravarSync(nome); } catch (e) { console.error(`[db] flush ${nome}:`, e.message); }
  }
}

export const db = {
  get usuarios() { return cache.usuarios; },
  get projetos() { return cache.projetos; },
  get documentos() { return cache.documentos; },
  get tarefas() { return cache.tarefas; },
  get notificacoes() { return cache.notificacoes; },
  get config() { return cache.config; },
  set config(v) { cache.config = v; salvar('config'); }
};

export function novoId() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  ).toUpperCase();
}

/** Etapas iniciais do fluxo pessoal (CRM) de cada usuario. */
export function etapasPadrao() {
  return [
    { id: novoId(), nome: 'A fazer', cor: '#2F6FB8', tipo: 'todo' },
    { id: novoId(), nome: 'Fazendo', cor: '#F26522', tipo: 'doing' },
    { id: novoId(), nome: 'Concluido', cor: '#25A06B', tipo: 'done' }
  ];
}

let encerrando = false;
function encerrar(sinal) {
  if (encerrando) return;
  encerrando = true;
  console.log(`[db] ${sinal} recebido, gravando dados pendentes...`);
  flushSync();
  process.exit(0);
}
process.on('SIGTERM', () => encerrar('SIGTERM'));
process.on('SIGINT', () => encerrar('SIGINT'));
process.on('beforeExit', () => flushSync());
