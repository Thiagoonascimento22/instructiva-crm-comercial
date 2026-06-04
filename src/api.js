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
  listVendedores: () => req("GET", "/api/vendedores"),

  // WhatsApp
  waConfig: () => req("GET", "/api/wa/config"),
  waSetConfig: (dados) => req("PUT", "/api/wa/config", dados),
  waMinha: () => req("GET", "/api/wa/minha"),
  waChats: (instance) =>
    req("GET", "/api/wa/chats" + (instance ? "?instance=" + instance : "")),
  waChat: (id) => req("GET", "/api/wa/chats/" + id),
  waSend: (id, texto) => req("POST", "/api/wa/chats/" + id + "/send", { texto }),
  waIniciar: (dados) => req("POST", "/api/wa/iniciar", dados),
  waConnect: (instance) =>
    req("POST", "/api/wa/connect", { instance, publicUrl: window.location.origin }),
  waStatus: (instance) => req("GET", "/api/wa/status/" + instance),
  waLogout: (instance) => req("POST", "/api/wa/logout/" + instance),
  waDeleteInstance: (instance) => req("DELETE", "/api/wa/instance/" + instance),

  // IA
  iaEquipe: () => req("POST", "/api/ia/equipe"),
  iaVendedor: (id) => req("POST", "/api/ia/vendedor/" + id),
};
