// Camada de comunicação com o backend.
// Guarda o token em memória + localStorage para manter login entre recarregamentos.

let token = localStorage.getItem("instructiva_token") || null;

function setToken(t) {
  token = t;
  if (t) localStorage.setItem("instructiva_token", t);
  else localStorage.removeItem("instructiva_token");
}

async function req(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  const r = await fetch("/api" + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await r.json(); } catch {}
  if (!r.ok) throw new Error(data.error || "erro na requisição");
  return data;
}

export const api = {
  get token() { return token; },
  setToken,
  // auth
  login: (login, senha) => req("POST", "/login", { login, senha }),
  logout: () => req("POST", "/logout"),
  me: () => req("GET", "/me"),
  updateMe: (payload) => req("PUT", "/me", payload),
  // users
  listUsers: () => req("GET", "/users"),
  listUserNames: () => req("GET", "/users/names"),
  createUser: (payload) => req("POST", "/users", payload),
  updateUser: (id, payload) => req("PUT", "/users/" + id, payload),
  deleteUser: (id) => req("DELETE", "/users/" + id),
  // records
  listRecords: () => req("GET", "/records"),
  createRecord: (payload) => req("POST", "/records", payload),
  updateRecord: (id, payload) => req("PUT", "/records/" + id, payload),
  deleteRecord: (id) => req("DELETE", "/records/" + id),
  // vendas
  listVendas: () => req("GET", "/vendas"),
  createVenda: (payload) => req("POST", "/vendas", payload),
  updateVenda: (id, payload) => req("PUT", "/vendas/" + id, payload),
  deleteVenda: (id) => req("DELETE", "/vendas/" + id),
  // agendamentos
  listAgendamentos: () => req("GET", "/agendamentos"),
  createAgendamento: (payload) => req("POST", "/agendamentos", payload),
  updateAgendamento: (id, payload) => req("PUT", "/agendamentos/" + id, payload),
  deleteAgendamento: (id) => req("DELETE", "/agendamentos/" + id),
  // tasks
  listTasks: () => req("GET", "/tasks"),
  createTask: (payload) => req("POST", "/tasks", payload),
  updateTask: (id, payload) => req("PUT", "/tasks/" + id, payload),
  deleteTask: (id) => req("DELETE", "/tasks/" + id),
  // ia
  analise: (colaboradoraId) => req("POST", "/analise", colaboradoraId ? { colaboradoraId } : {}),
  // solicitações (vindas do comercial)
  solicitacoes: () => req("GET", "/solicitacoes"),
  abrirAnexo: async (solId, anexoId) => {
    const win = window.open("", "_blank");
    try {
      const r = await fetch("/api/solic/anexo/" + solId + "/" + anexoId, { headers: token ? { Authorization: "Bearer " + token } : {} });
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
  solicAceitar: (id) => req("POST", "/solicitacoes/" + id + "/aceitar"),
  solicConcluir: (id, resposta) => req("POST", "/solicitacoes/" + id + "/concluir", { resposta }),
  solicMensagem: (id, texto, anexo) => req("POST", "/solicitacoes/" + id + "/mensagem", { texto, anexo }),
  solicVisto: (id) => req("POST", "/solicitacoes/" + id + "/visto"),
  solicExcluir: (id) => req("DELETE", "/solicitacoes/" + id),
  solicReabrir: (id) => req("POST", "/solicitacoes/" + id + "/reabrir"),
  // whatsapp
  waGetConfig: () => req("GET", "/wa/config"),
  waSetConfig: (payload) => req("PUT", "/wa/config", payload),
  waListChats: (instance) => req("GET", "/wa/chats" + (instance ? "?instance=" + encodeURIComponent(instance) : "")),
  waGetChat: (id) => req("GET", "/wa/chats/" + encodeURIComponent(id)),
  waSend: (id, texto) => req("POST", "/wa/send", { id, texto }),
  waSendMedia: (payload) => req("POST", "/wa/send-media", payload),
  waSendAudio: (id, base64) => req("POST", "/wa/send-audio", { id, base64 }),
  waConnectInstance: (instance) => req("POST", "/wa/instance/connect", { instance }),
  waInstanceStatus: (nome) => req("GET", "/wa/instance/status/" + encodeURIComponent(nome)),
  waMinhaInstancia: () => req("GET", "/wa/minha-instancia"),
  waLogoutInstance: (nome) => req("POST", "/wa/instance/logout/" + encodeURIComponent(nome)),
  waDeleteInstance: (nome) => req("DELETE", "/wa/instance/" + encodeURIComponent(nome)),
  waLimparFantasmas: () => req("POST", "/wa/limpar-fantasmas"),
  waBaixarMidia: (id, mediaMsgId) => req("POST", "/wa/media", { id, mediaMsgId }),
  waNovaConversa: (instance, numero, texto) => req("POST", "/wa/nova-conversa", { instance, numero, texto }),
  waInstanciasEvolution: () => req("GET", "/wa/instancias-evolution"),
  waLimparConversas: () => req("POST", "/wa/limpar-conversas"),
};
