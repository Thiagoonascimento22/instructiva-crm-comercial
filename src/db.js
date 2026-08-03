import fs from 'fs';
import path from 'path';
import { CONFIG_PADRAO, CARDAPIO_PADRAO } from './seed.js';

// DATA_DIR deve apontar para um volume persistente no Railway (ex: /data)
export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ARQUIVOS = {
  config: 'config.json',
  cardapio: 'cardapio.json',
  pedidos: 'pedidos.json',
};

const PADROES = {
  config: CONFIG_PADRAO,
  cardapio: CARDAPIO_PADRAO,
  pedidos: { pedidos: [], contador: 0 },
};

const cache = {};

function caminho(modulo) {
  return path.join(DATA_DIR, ARQUIVOS[modulo]);
}

function mesclar(padrao, atual) {
  if (Array.isArray(padrao) || typeof padrao !== 'object' || padrao === null) {
    return atual === undefined ? padrao : atual;
  }
  const saida = { ...padrao };
  for (const chave of Object.keys(atual || {})) {
    if (padrao[chave] && typeof padrao[chave] === 'object' && !Array.isArray(padrao[chave])) {
      saida[chave] = mesclar(padrao[chave], atual[chave]);
    } else {
      saida[chave] = atual[chave];
    }
  }
  return saida;
}

export function ler(modulo) {
  if (cache[modulo]) return cache[modulo];
  const arquivo = caminho(modulo);
  let dados = {};
  try {
    if (fs.existsSync(arquivo)) {
      dados = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
    }
  } catch (e) {
    console.error(`[db] falha ao ler ${arquivo}:`, e.message);
    try {
      fs.copyFileSync(arquivo, `${arquivo}.corrompido.${Date.now()}`);
    } catch {}
    dados = {};
  }
  cache[modulo] = mesclar(PADROES[modulo], dados);
  if (!fs.existsSync(arquivo)) salvar(modulo);
  return cache[modulo];
}

let timers = {};
export function salvar(modulo) {
  clearTimeout(timers[modulo]);
  timers[modulo] = setTimeout(() => gravar(modulo), 120);
}

export function gravar(modulo) {
  const arquivo = caminho(modulo);
  const tmp = `${arquivo}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(cache[modulo], null, 2), 'utf8');
    fs.renameSync(tmp, arquivo);
  } catch (e) {
    console.error(`[db] falha ao gravar ${arquivo}:`, e.message);
  }
}

export function gravarTudo() {
  for (const m of Object.keys(cache)) gravar(m);
}

process.on('SIGTERM', () => { gravarTudo(); process.exit(0); });
process.on('SIGINT', () => { gravarTudo(); process.exit(0); });
