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

  // Canal Oficial (WhatsApp Cloud API)
  ofNumeros: () => req("GET", "/api/oficial/numeros"),
  ofTokenGlobalStatus: () => req("GET", "/api/oficial/token-global"),
  ofSetTokenGlobal: (token) => req("POST", "/api/oficial/token-global", { token }),
  ofCriarNumero: (dados) => req("POST", "/api/oficial/numeros", dados),
  ofEditarNumero: (id, dados) => req("PUT", "/api/oficial/numeros/" + id, dados),
  ofExcluirNumero: (id) => req("DELETE", "/api/oficial/numeros/" + id),
  ofRegistrarNumero: (id, pin) => req("POST", "/api/oficial/numeros/" + id + "/registrar", { pin }),
  ofAssinarWebhook: (id) => req("POST", "/api/oficial/numeros/" + id + "/assinar-webhook"),
  ofDiagnostico: () => req("GET", "/api/oficial/diagnostico"),
  ofTemplates: (id) => req("GET", "/api/oficial/numeros/" + id + "/templates"),
  ofCriarTemplate: (id, dados) => req("POST", "/api/oficial/numeros/" + id + "/templates", dados),
  ofVendedoresLista: () => req("GET", "/api/oficial/vendedores-lista"),
  ofLimparChats: (modo) => req("POST", "/api/oficial/chats/limpar", { modo }),
  ofVendedores: () => req("GET", "/api/oficial/vendedores"),
  ofEditarVendedor: (id, dados) => req("PUT", "/api/oficial/vendedores/" + id, dados),
  ofZerarContadores: () => req("POST", "/api/oficial/vendedores/zerar"),
  ofDisparar: (dados) => req("POST", "/api/oficial/disparar", dados),
  ofCampanhas: () => req("GET", "/api/oficial/campanhas"),
  ofRecontar: () => req("POST", "/api/oficial/campanhas/recontar"),
  ofExcluirCampanha: (id, apagarConversas) => req("DELETE", "/api/oficial/campanhas/" + id + (apagarConversas ? "?conversas=1" : "")),
  ofChats: (q, numeroId) =>
    req("GET", "/api/oficial/chats" + (() => {
      const p = [q ? "q=" + encodeURIComponent(q) : "", numeroId ? "numeroId=" + encodeURIComponent(numeroId) : ""].filter(Boolean);
      return p.length ? "?" + p.join("&") : "";
    })()),
  ofChat: (id) => req("GET", "/api/oficial/chats/" + encodeURIComponent(id)),
  ofEnviar: (id, texto) => req("POST", "/api/oficial/chats/" + encodeURIComponent(id) + "/send", { texto }),
  ofEnviarMidia: (id, dados) => req("POST", "/api/oficial/chats/" + encodeURIComponent(id) + "/midia", dados),
  ofStats: (desde, ate) => req("GET", "/api/oficial/stats?desde=" + (desde || 0) + "&ate=" + (ate || Date.now())),
  ofIAPendentes: () => req("GET", "/api/oficial/ia-pendentes"),
  ofResponderPendentes: () => req("POST", "/api/oficial/ia-responder-pendentes", {}),
  ofMidiaUrl: (chatId, mid) => "/api/oficial/chats/" + encodeURIComponent(chatId) + "/midia/" + encodeURIComponent(mid),
  ofMidiaBlob: async (chatId, mid) => {
    const t = getToken();
    const res = await fetch(api.ofMidiaUrl(chatId, mid), { headers: t ? { Authorization: "Bearer " + t } : {} });
    if (!res.ok) { let e = "Erro " + res.status; try { const j = await res.json(); e = j.error || e; } catch (_) {} throw new Error(e); }
    return URL.createObjectURL(await res.blob());
  },
  ofAtribuir: (id, vendedorId) => req("POST", "/api/oficial/chats/" + encodeURIComponent(id) + "/atribuir", { vendedorId }),
  ofEncerrar: (id) => req("POST", "/api/oficial/chats/" + encodeURIComponent(id) + "/encerrar", { encerrar: true }),
  ofWebhookInfo: (base) => req("GET", "/api/oficial/webhook-info?base=" + encodeURIComponent(base || "")),

  // IAs do Canal Oficial (cérebro)
  ofIAs: () => req("GET", "/api/oficial/ias"),
  ofCriarIA: (dados) => req("POST", "/api/oficial/ias", dados),
  ofDuplicarIA: (id, nome) => req("POST", "/api/oficial/ias/" + id + "/duplicar", { nome }),
  ofRetomarCampanha: (id) => req("POST", "/api/oficial/campanhas/" + id + "/retomar"),
  ofRedispararCampanha: (id) => req("POST", "/api/oficial/campanhas/" + id + "/redisparar"),
  ofEditarIA: (id, dados) => req("PUT", "/api/oficial/ias/" + id, dados),
  ofExcluirIA: (id) => req("DELETE", "/api/oficial/ias/" + id),
  ofExtrairArquivo: (nome, base64) => req("POST", "/api/oficial/ias/extrair", { nome, base64 }),
  ofPreviewIA: (dados) => req("POST", "/api/oficial/ias/preview", dados),
  ofIAGlobal: () => req("GET", "/api/oficial/ia-global"),
  ofSetIAGlobal: (ativa) => req("POST", "/api/oficial/ia-global", { ativa }),
  ofPausarIAChat: (id, pausar) => req("POST", "/api/oficial/chats/" + encodeURIComponent(id) + "/ia", { pausar }),
  ofPausarTodasAtuais: () => req("POST", "/api/oficial/chats/pausar-todas-atuais"),
  // monta a URL de download da base de conhecimento (token vai na query)
  ofUrlExportarIA: (id) => "/api/oficial/ias/" + encodeURIComponent(id) + "/exportar?token=" + encodeURIComponent(getToken()),

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
    const win = window.open("", "_blank");
    try {
      const t = getToken();
      const r = await fetch("/api/solicitacoes/" + id + "/chat-anexo/" + anexoId, { headers: t ? { Authorization: "Bearer " + t } : {} });
      if (!r.ok) { let msg = ""; try { const j = await r.json(); if (j && j.error) msg = j.error; } catch (_) {} if (!msg) msg = "não foi possível abrir o anexo (erro " + r.status + ")"; throw new Error(msg); }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      if (win) { win.location.href = url; }
      else {
        const cd = r.headers.get("content-disposition") || "";
        const mm = cd.match(/filename="?([^"]+)"?/);
        const a = document.createElement("a");
        a.href = url; a.download = mm ? mm[1] : "arquivo";
        document.body.appendChild(a); a.click(); a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { if (win) win.close(); throw e; }
  },
  marcarChatVisto: (id) => req("POST", "/api/solicitacoes/" + id + "/visto"),
  sincronizarSolic: (id) => req("GET", "/api/solicitacoes/" + id + "/sync"),
  excluirSolicitacao: (id) => req("DELETE", "/api/solicitacoes/" + id),
  statusSolicitacao: (id, status, resposta) => req("PATCH", "/api/solicitacoes/" + id, { status, resposta }),
  marcarSolicitacoesVistas: () => req("POST", "/api/solicitacoes/marcar-vistas"),
  solicitacoesRelatorio: (desde, ate) => req("GET", `/api/solicitacoes/relatorio?desde=${desde || 0}&ate=${ate || Date.now()}`),
  solicitacoesIA: (desde, ate) => req("GET", `/api/solicitacoes/ia?desde=${desde || 0}&ate=${ate || Date.now()}`),
};
