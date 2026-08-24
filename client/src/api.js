const CHAVE = 'instructiva.projetos.token';

export function pegarToken() {
  return localStorage.getItem(CHAVE);
}
export function guardarToken(t) {
  if (t) localStorage.setItem(CHAVE, t);
  else localStorage.removeItem(CHAVE);
}

async function requisitar(caminho, opcoes = {}) {
  const cabecalhos = { ...(opcoes.headers || {}) };
  const token = pegarToken();
  if (token) cabecalhos.Authorization = `Bearer ${token}`;
  if (opcoes.body && !(opcoes.body instanceof FormData)) {
    cabecalhos['Content-Type'] = 'application/json';
    opcoes.body = JSON.stringify(opcoes.body);
  }

  const r = await fetch(`/api${caminho}`, { ...opcoes, headers: cabecalhos });

  if (r.status === 401) {
    guardarToken(null);
    if (!location.pathname.startsWith('/entrar')) location.href = '/entrar';
    throw new Error('Sessao expirada');
  }

  const tipo = r.headers.get('content-type') || '';
  const dados = tipo.includes('application/json') ? await r.json() : await r.text();
  if (!r.ok) throw new Error(dados?.erro || 'Nao foi possivel completar a acao');
  return dados;
}

export const api = {
  get: (c) => requisitar(c),
  post: (c, body) => requisitar(c, { method: 'POST', body }),
  put: (c, body) => requisitar(c, { method: 'PUT', body }),
  patch: (c, body) => requisitar(c, { method: 'PATCH', body }),
  del: (c) => requisitar(c, { method: 'DELETE' }),
  enviarArquivo: (c, formData) => requisitar(c, { method: 'POST', body: formData })
};

/* ---------- Formatacao ---------- */

export const ROTULO_STATUS = {
  triagem: 'Na triagem',
  pendente: 'A fazer',
  em_andamento: 'Em andamento',
  concluida: 'Concluida',
  cancelada: 'Cancelada'
};

export const CLASSE_STATUS = {
  triagem: 'etq-ambar',
  pendente: 'etq-azul',
  em_andamento: 'etq-teal',
  concluida: 'etq-verde',
  cancelada: 'etq-cinza'
};

export const ROTULO_PRIORIDADE = {
  urgente: 'Urgente',
  alta: 'Alta',
  media: 'Media',
  baixa: 'Baixa'
};

export const CLASSE_PRIORIDADE = {
  urgente: 'etq-vermelha',
  alta: 'etq-ambar',
  media: 'etq-cinza',
  baixa: 'etq-cinza'
};

export function dataBR(iso) {
  if (!iso) return '--';
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function dataHoraBR(iso) {
  if (!iso) return '--';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
  });
}

export function atrasada(t) {
  if (!t.prazo || ['concluida', 'cancelada'].includes(t.status)) return false;
  return t.prazo < new Date().toISOString().slice(0, 10);
}

export function iniciais(nome = '') {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

export function tamanhoArquivo(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
