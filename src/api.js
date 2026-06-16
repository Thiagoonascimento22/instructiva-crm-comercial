const TOKEN_KEY = "instructiva_crm_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

async function req(method, url, body) {
  const headers = { "Content-Type": "application/json" };
  const t = getToken();
  if (t) headers.Authorization = "Bearer " + t;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (_) {}
  if (!res.ok) {
    const msg = (data && data.error) || "Erro " + res.status;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  login: (login, senha) => req("POST", "/api/login", { login, senha }),
  me: () => req("GET", "/api/me"),
  updateMe: (dados) => req("PUT", "/api/me", dados),

  listUsers: () => req("GET", "/api/users"),
  createUser: (dados) => req("POST", "/api/users", dados),
  updateUser: (id, dados) => req("PUT", "/api/users/" + id, dados),
  deleteUser: (id) => req("DELETE", "/api/users/" + id),

  listCards: (responsavel) =>
    req("GET", "/api/cards" + (responsavel ? "?responsavel=" + responsavel : "")),
  createCard: (dados) => req("POST", "/api/cards", dados),
  updateCard: (id, dados) => req("PUT", "/api/cards/" + id, dados),
  deleteCard: (id) => req("DELETE", "/api/cards/" + id),
  importCards: (dados) => req("POST", "/api/cards/import", dados),
  bulkCards: (dados) => req("POST", "/api/cards/bulk", dados),
  listVendedores: () => req("GET", "/api/vendedores"),

  // WhatsApp
  waConfig: () => req("GET", "/api/wa/config"),
  waSetConfig: (dados) => req("PUT", "/api/wa/config", dados),
  waMinha: () => req("GET", "/api/wa/minha"),
  waChats: (instance, q, arquivadas) =>
    req("GET", "/api/wa/chats" + (() => {
      const p = [instance ? "instance=" + encodeURIComponent(instance) : "", q ? "q=" + encodeURIComponent(q) : "", arquivadas ? "arquivadas=1" : ""].filter(Boolean);
      return p.length ? "?" + p.join("&") : "";
    })()),
  waChat: (id) => req("GET", "/api/wa/chats/" + id),
  waSendMidia: (id, dados) => req("POST", "/api/wa/chats/" + id + "/send-midia", dados),
  waArquivar: (id, arquivar) => req("POST", "/api/wa/chats/" + id + "/arquivar", { arquivar }),
  midiaUrl: (chatId, mid) => "/api/wa/midia/" + encodeURIComponent(chatId) + "/" + encodeURIComponent(mid),
  midiaBlob: async (chatId, mid) => {
    const t = getToken();
    const res = await fetch(api.midiaUrl(chatId, mid), { headers: t ? { Authorization: "Bearer " + t } : {} });
    if (!res.ok) { let e = "Erro " + res.status; try { const j = await res.json(); e = j.error || e; } catch (_) {} throw new Error(e); }
    return URL.createObjectURL(await res.blob());
  },
  waSend: (id, texto) => req("POST", "/api/wa/chats/" + id + "/send", { texto }),
  waEncerrar: (id, encerrar) => req("POST", "/api/wa/chats/" + id + "/encerrar", { encerrar }),
  nps: (desde, ate, vendedorId) => req("GET", `/api/nps?desde=${desde || 0}&ate=${ate || Date.now()}` + (vendedorId ? `&vendedorId=${encodeURIComponent(vendedorId)}` : "")),
  waIniciar: (dados) => req("POST", "/api/wa/iniciar", dados),
  waConnect: (instance) =>
    req("POST", "/api/wa/connect", { instance, publicUrl: window.location.origin }),
  waStatus: (instance) => req("GET", "/api/wa/status/" + instance),
  waInstanciasEvolution: () => req("GET", "/api/wa/instancias-evolution"),
  waLogout: (instance) => req("POST", "/api/wa/logout/" + instance),
  waDeleteInstance: (instance) => req("DELETE", "/api/wa/instance/" + instance),

  // IA
  iaEquipe: (desde, ate) => req("POST", "/api/ia/equipe", { desde: desde || 0, ate: ate || Date.now() }),
  iaVendedor: (id, desde, ate) => req("POST", "/api/ia/vendedor/" + id, { desde: desde || 0, ate: ate || Date.now() }),

  // Monitoria
  horario: () => req("GET", "/api/horario"),
  setHorario: (h) => req("PUT", "/api/horario", h),
  monitoria: (desde, ate) => req("GET", `/api/monitoria?desde=${desde || 0}&ate=${ate || Date.now()}`),
  monitoriaVendedor: (id, desde, ate) => req("GET", `/api/monitoria/vendedor/${id}?desde=${desde || 0}&ate=${ate || Date.now()}`),
  monitoriaEvolucao: (desde, ate, vendedorId) => req("GET", `/api/monitoria/evolucao?desde=${desde || 0}&ate=${ate || Date.now()}${vendedorId ? "&vendedorId=" + vendedorId : ""}`),

  // Solicitações de suporte
  solicitacoes: (status) => req("GET", "/api/solicitacoes" + (status ? "?status=" + encodeURIComponent(status) : "")),
  criarSolicitacao: (dados) => req("POST", "/api/solicitacoes", dados),
  enviarMensagemSolic: (id, texto, anexo) => req("POST", "/api/solicitacoes/" + id + "/mensagem", { texto, anexo }),
  abrirChatAnexo: async (id, anexoId) => {
    const t = getToken();
    const r = await fetch("/api/solicitacoes/" + id + "/chat-anexo/" + anexoId, { headers: t ? { Authorization: "Bearer " + t } : {} });
    if (!r.ok) throw new Error("não foi possível abrir o anexo");
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  },
  marcarChatVisto: (id) => req("POST", "/api/solicitacoes/" + id + "/visto"),
  sincronizarSolic: (id) => req("GET", "/api/solicitacoes/" + id + "/sync"),
  excluirSolicitacao: (id) => req("DELETE", "/api/solicitacoes/" + id),
  statusSolicitacao: (id, status, resposta) => req("PATCH", "/api/solicitacoes/" + id, { status, resposta }),
  marcarSolicitacoesVistas: () => req("POST", "/api/solicitacoes/marcar-vistas"),
  solicitacoesRelatorio: (desde, ate) => req("GET", `/api/solicitacoes/relatorio?desde=${desde || 0}&ate=${ate || Date.now()}`),
  solicitacoesIA: (desde, ate) => req("GET", `/api/solicitacoes/ia?desde=${desde || 0}&ate=${ate || Date.now()}`),
};
