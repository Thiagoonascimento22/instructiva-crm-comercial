import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "25mb" }));

/* ============================================================
   BANCO EM ARQUIVO JSON (com espera do volume do Railway)
   ============================================================ */
const DB_PATH = process.env.DB_PATH || "/data/crm.json";

async function aguardarVolume() {
  const dir = path.dirname(DB_PATH);
  // O volume do Railway monta alguns segundos DEPOIS do servidor subir.
  // Esperamos a pasta aparecer antes de ler/gravar (senão os dados somem).
  for (let i = 0; i < 30; i++) {
    if (fs.existsSync(dir)) {
      console.log("Volume pronto. Banco em:", DB_PATH);
      return;
    }
    console.log(`Aguardando volume em ${dir}... (${i + 1})`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  // Sem volume (ex: rodando local) — cria a pasta pra funcionar mesmo assim
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (_) {}
  console.log("Volume não detectado, usando pasta local:", dir);
}

function novoToken() {
  return crypto.randomBytes(18).toString("hex");
}

function dbVazio() {
  return {
    users: [
      {
        id: "u_admin",
        nome: "Gerente Comercial",
        login: "gerente",
        senha: "admin123",
        role: "gerente",
        meta: 0,
        ativo: true,
        token: null,
        precisaOnboarding: true,
        criadoEm: Date.now(),
      },
    ],
    cards: [],
    waConfig: {
      url: "",
      apiKey: "",
      publicUrl: "",
      webhookToken: crypto.randomBytes(12).toString("hex"),
      instancias: [], // [{ instance, vendedorId }]
    },
    waChats: {}, // { "instance::numero": { ...conversa } }
    seq: 1,
  };
}

let db = dbVazio();

function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, "utf8");
      db = JSON.parse(raw);
      // migrações leves / campos que podem faltar
      if (!Array.isArray(db.users)) db.users = dbVazio().users;
      if (!Array.isArray(db.cards)) db.cards = [];
      if (typeof db.seq !== "number") db.seq = 1;
      if (!db.waConfig) db.waConfig = dbVazio().waConfig;
      if (!db.waConfig.webhookToken)
        db.waConfig.webhookToken = crypto.randomBytes(12).toString("hex");
      if (!Array.isArray(db.waConfig.instancias)) db.waConfig.instancias = [];
      if (!db.waChats || typeof db.waChats !== "object") db.waChats = {};
      db.users.forEach((u) => {
        if (typeof u.meta !== "number") u.meta = 0;
        if (typeof u.ativo !== "boolean") u.ativo = true;
      });
      console.log(
        `Banco carregado. Usuários: ${db.users.length} | Cards: ${db.cards.length}`
      );
    } else {
      db = dbVazio();
      saveDB();
      console.log("Banco novo criado. Admin: gerente / admin123");
    }
  } catch (e) {
    console.error("Erro ao ler banco, criando novo:", e.message);
    db = dbVazio();
    saveDB();
  }
}

function saveDB() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error("Erro ao salvar banco:", e.message);
  }
}
// grava na hora a cada mudança (garante que nada se perde em restart/deploy)
function saveSoon() {
  saveDB();
}

function proximoId(prefixo) {
  const n = db.seq++;
  saveSoon();
  return `${prefixo}_${n}_${crypto.randomBytes(3).toString("hex")}`;
}

/* ============================================================
   AUTENTICAÇÃO
   ============================================================ */
function semSenha(u) {
  if (!u) return u;
  const { senha, token, ...resto } = u;
  return resto;
}

function auth(req, res, next) {
  const t = (req.headers.authorization || "").replace("Bearer ", "").trim();
  const user = db.users.find((u) => u.token && u.token === t);
  if (!user || !user.ativo)
    return res.status(401).json({ error: "Não autenticado" });
  req.user = user;
  next();
}
function gerenteOnly(req, res, next) {
  if (req.user.role !== "gerente")
    return res.status(403).json({ error: "Acesso restrito ao gerente" });
  next();
}

app.post("/api/login", (req, res) => {
  const { login, senha } = req.body || {};
  const user = db.users.find(
    (u) => u.login.toLowerCase() === String(login || "").toLowerCase()
  );
  if (!user || user.senha !== senha)
    return res.status(401).json({ error: "Login ou senha incorretos" });
  if (!user.ativo)
    return res.status(403).json({ error: "Usuário desativado" });
  if (user.role !== "gerente")
    return res.status(403).json({ error: "Apenas a gerência acessa o sistema de monitoria." });
  user.token = novoToken();
  saveSoon();
  res.json({ token: user.token, user: semSenha(user) });
});

app.get("/api/me", auth, (req, res) => res.json(semSenha(req.user)));

app.put("/api/me", auth, (req, res) => {
  const { nome, senha } = req.body || {};
  if (nome && nome.trim()) req.user.nome = nome.trim();
  if (senha && senha.length >= 3) req.user.senha = senha;
  req.user.precisaOnboarding = false;
  saveSoon();
  res.json(semSenha(req.user));
});

/* ============================================================
   EQUIPE (somente gerente)
   ============================================================ */
app.get("/api/users", auth, gerenteOnly, (req, res) => {
  res.json(db.users.map(semSenha));
});

app.post("/api/users", auth, gerenteOnly, (req, res) => {
  const { nome, login, senha, role } = req.body || {};
  if (!nome || !nome.trim())
    return res.status(400).json({ error: "Informe o nome" });
  const ehGerente = role === "gerente";
  if (ehGerente && (!login || !senha))
    return res.status(400).json({ error: "Gerente precisa de login e senha" });
  const id = proximoId("u");
  const loginFinal = ehGerente ? login.trim() : "vend-" + id;
  if (db.users.some((u) => u.login.toLowerCase() === loginFinal.toLowerCase()))
    return res.status(400).json({ error: "Já existe alguém com esse login" });
  const novo = {
    id,
    nome: nome.trim(),
    login: loginFinal,
    senha: ehGerente ? senha : crypto.randomBytes(8).toString("hex"),
    role: ehGerente ? "gerente" : "vendedor",
    ativo: true,
    token: null,
    criadoEm: Date.now(),
  };
  db.users.push(novo);
  saveSoon();
  res.json(semSenha(novo));
});

app.put("/api/users/:id", auth, gerenteOnly, (req, res) => {
  const u = db.users.find((x) => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: "Usuário não encontrado" });
  const { nome, senha, role, meta, ativo } = req.body || {};
  if (nome && nome.trim()) u.nome = nome.trim();
  if (senha && senha.length >= 3) u.senha = senha;
  if (role) u.role = role === "gerente" ? "gerente" : "vendedor";
  if (meta !== undefined) u.meta = Number(meta) || 0;
  if (ativo !== undefined) u.ativo = !!ativo;
  saveSoon();
  res.json(semSenha(u));
});

app.delete("/api/users/:id", auth, gerenteOnly, (req, res) => {
  if (req.params.id === req.user.id)
    return res.status(400).json({ error: "Você não pode excluir a si mesmo" });
  const i = db.users.findIndex((x) => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: "Usuário não encontrado" });
  db.users.splice(i, 1);
  saveSoon();
  res.json({ ok: true });
});

/* ============================================================
   PIPELINE — CARDS
   ============================================================ */
const ETAPAS = ["lead", "contato", "sem_resposta", "negociando", "fechou", "perdeu"];

function podeVerCard(user, card) {
  if (user.role === "gerente") return true;
  return card.responsavelId === user.id;
}

app.get("/api/cards", auth, (req, res) => {
  let cards = db.cards.filter((c) => !c.arquivado);
  if (req.user.role === "vendedor") {
    cards = cards.filter((c) => c.responsavelId === req.user.id);
  } else if (req.query.responsavel && req.query.responsavel !== "todos") {
    cards = cards.filter((c) => c.responsavelId === req.query.responsavel);
  }
  res.json(cards);
});

app.post("/api/cards", auth, (req, res) => {
  const { cliente, telefone, valorEstimado, responsavelId, etapa, obs, curso, origem } =
    req.body || {};
  if (!cliente || !cliente.trim())
    return res.status(400).json({ error: "Nome do cliente é obrigatório" });
  // vendedor só cria card pra si mesmo; gerente escolhe o responsável
  let resp = req.user.id;
  if (req.user.role === "gerente" && responsavelId) resp = responsavelId;
  const card = {
    id: proximoId("c"),
    cliente: cliente.trim(),
    telefone: (telefone || "").trim(),
    valorEstimado: Number(valorEstimado) || 0,
    valorFinal: 0,
    etapa: ETAPAS.includes(etapa) ? etapa : "lead",
    responsavelId: resp,
    curso: (curso || "").trim(),
    origem: (origem || "").trim(),
    obs: (obs || "").trim(),
    arquivado: false,
    fechadoEm: ETAPAS.includes(etapa) && etapa === "fechou" ? Date.now() : null,
    criadoEm: Date.now(),
    atualizadoEm: Date.now(),
  };
  db.cards.push(card);
  saveSoon();
  res.json(card);
});

app.put("/api/cards/:id", auth, (req, res) => {
  const card = db.cards.find((c) => c.id === req.params.id);
  if (!card || card.arquivado)
    return res.status(404).json({ error: "Card não encontrado" });
  if (!podeVerCard(req.user, card))
    return res.status(403).json({ error: "Sem acesso a esse card" });

  const b = req.body || {};
  if (b.cliente !== undefined) card.cliente = String(b.cliente).trim();
  if (b.telefone !== undefined) card.telefone = String(b.telefone).trim();
  if (b.valorEstimado !== undefined)
    card.valorEstimado = Number(b.valorEstimado) || 0;
  if (b.valorFinal !== undefined) card.valorFinal = Number(b.valorFinal) || 0;
  if (b.obs !== undefined) card.obs = String(b.obs).trim();
  if (b.curso !== undefined) card.curso = String(b.curso).trim();
  if (b.origem !== undefined) card.origem = String(b.origem).trim();
  if (b.etapa !== undefined && ETAPAS.includes(b.etapa)) card.etapa = b.etapa;
  // registra/limpa a data de fechamento (pro dashboard filtrar por período)
  if (card.etapa === "fechou") {
    if (!card.fechadoEm) card.fechadoEm = Date.now();
  } else {
    card.fechadoEm = null;
  }
  // transferência: gerente transfere pra qualquer um; vendedor pode repassar o próprio card
  if (b.responsavelId !== undefined) {
    const destino = db.users.find((u) => u.id === b.responsavelId);
    if (destino) card.responsavelId = destino.id;
  }
  card.atualizadoEm = Date.now();
  saveSoon();
  res.json(card);
});

app.delete("/api/cards/:id", auth, (req, res) => {
  const card = db.cards.find((c) => c.id === req.params.id);
  if (!card) return res.status(404).json({ error: "Card não encontrado" });
  if (!podeVerCard(req.user, card))
    return res.status(403).json({ error: "Sem acesso a esse card" });
  card.arquivado = true;
  card.atualizadoEm = Date.now();
  saveSoon();
  res.json({ ok: true });
});

// importação de leads em massa (planilha de números)
app.post("/api/cards/import", auth, (req, res) => {
  const { leads, origem, curso, responsavelId } = req.body || {};
  if (!Array.isArray(leads) || leads.length === 0)
    return res.status(400).json({ error: "Nenhum lead pra importar" });
  let resp = req.user.id;
  if (req.user.role === "gerente" && responsavelId) resp = responsavelId;
  const agora = Date.now();
  let criados = 0;
  leads.slice(0, 5000).forEach((l) => {
    const tel = String((l && l.telefone) || "").trim();
    const nome = String((l && l.cliente) || "").trim() || tel || "Sem nome";
    if (!tel && !(l && l.cliente)) return;
    db.cards.push({
      id: proximoId("c"),
      cliente: nome,
      telefone: tel,
      valorEstimado: 0,
      valorFinal: 0,
      etapa: "lead",
      responsavelId: resp,
      curso: String((l && l.curso) || curso || "").trim(),
      origem: String(origem || "").trim(),
      obs: "",
      arquivado: false,
      fechadoEm: null,
      criadoEm: agora,
      atualizadoEm: agora,
    });
    criados++;
  });
  saveSoon();
  res.json({ criados });
});

// lista enxuta de vendedores ativos (pra transferência — acessível a todos)
app.get("/api/vendedores", auth, (req, res) => {
  res.json(
    db.users
      .filter((u) => u.role === "vendedor" && u.ativo)
      .map((u) => ({ id: u.id, nome: u.nome }))
  );
});

// ações em massa: mover etapa, atribuir vendedor, ou excluir
app.post("/api/cards/bulk", auth, (req, res) => {
  const { ids, acao, etapa, responsavelId } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0)
    return res.status(400).json({ error: "Nada selecionado" });
  const agora = Date.now();
  let afetados = 0;
  ids.slice(0, 5000).forEach((id) => {
    const card = db.cards.find((c) => c.id === id && !c.arquivado);
    if (!card || !podeVerCard(req.user, card)) return;
    if (acao === "mover" && ETAPAS.includes(etapa)) {
      card.etapa = etapa;
      if (etapa === "fechou") { if (!card.fechadoEm) card.fechadoEm = agora; }
      else card.fechadoEm = null;
    } else if (acao === "atribuir" && responsavelId) {
      const destino = db.users.find((u) => u.id === responsavelId);
      if (!destino) return;
      card.responsavelId = destino.id;
    } else if (acao === "excluir") {
      card.arquivado = true;
    } else {
      return;
    }
    card.atualizadoEm = agora;
    afetados++;
  });
  saveSoon();
  res.json({ afetados });
});

/* ============================================================
   WHATSAPP (Evolution API)
   ============================================================ */
function instanciaLimpa(nome) {
  return String(nome || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "");
}
function instanciasDoUser(user) {
  const insts = db.waConfig.instancias || [];
  if (user.role === "gerente") {
    // gerente: todas as cadastradas + as que aparecem em conversas
    const set = new Set(insts.map((i) => i.instance));
    Object.values(db.waChats).forEach((c) => set.add(c.instance));
    return [...set];
  }
  return insts.filter((i) => i.vendedorId === user.id).map((i) => i.instance);
}
function vendedorDaInstancia(instance) {
  const m = (db.waConfig.instancias || []).find((i) => i.instance === instance);
  return m ? m.vendedorId : null;
}
async function evo(method, caminho, body) {
  const cfg = db.waConfig;
  if (!cfg.url || !cfg.apiKey) throw new Error("Conexão Evolution não configurada");
  const base = cfg.url.replace(/\/+$/, "");
  const res = await fetch(base + caminho, {
    method,
    headers: { "Content-Type": "application/json", apikey: cfg.apiKey },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || "Erro Evolution " + res.status;
    throw new Error(Array.isArray(msg) ? msg.join("; ") : String(msg));
  }
  return data;
}
// extrai o QR (base64) e o pairingCode de qualquer formato que a Evolution devolva
function extrairQR(r) {
  if (!r) return { qr: null, pairing: null };
  const q = r.qrcode || r.qr || {};
  let qr = r.base64 || q.base64 || null;
  if (!qr && typeof q === "string" && q.startsWith("data:")) qr = q;
  if (qr && !String(qr).startsWith("data:")) qr = "data:image/png;base64," + qr;
  const pairing = r.pairingCode || q.pairingCode || null;
  return { qr, pairing };
}
function webhookUrl() {
  const base = (db.waConfig.publicUrl || "").replace(/\/+$/, "");
  return base ? `${base}/api/wa/webhook/${db.waConfig.webhookToken}` : "";
}
async function configurarWebhook(instance) {
  const url = webhookUrl();
  if (!url) return;
  try {
    await evo("POST", `/webhook/set/${instance}`, {
      webhook: {
        enabled: true,
        url,
        webhookByEvents: false,
        webhookBase64: true,
        events: ["MESSAGES_UPSERT"],
      },
    });
  } catch (e) {
    console.error("Falha ao configurar webhook:", e.message);
  }
}

/* ---- WEBHOOK (Evolution chama aqui quando chega mensagem) ---- */
app.post("/api/wa/webhook/:token", (req, res) => {
  if (req.params.token !== db.waConfig.webhookToken)
    return res.status(403).json({ error: "token inválido" });
  try {
    const b = req.body || {};
    const instance = b.instance || (b.sender && b.sender.instanceName) || "";
    const data = b.data || {};
    const key = data.key || {};
    const jid = key.remoteJid || "";
    if (!instance || !jid || jid.endsWith("@g.us")) {
      return res.json({ ok: true }); // ignora grupos / sem dados
    }
    const numero = jid.split("@")[0];
    const fromMe = !!key.fromMe;
    const msg = data.message || {};
    const texto =
      msg.conversation ||
      (msg.extendedTextMessage && msg.extendedTextMessage.text) ||
      (msg.imageMessage && "[imagem]") ||
      (msg.audioMessage && "[áudio]") ||
      (msg.documentMessage && "[documento]") ||
      (msg.videoMessage && "[vídeo]") ||
      "";
    if (!texto) return res.json({ ok: true });

    const id = `${instance}::${numero}`;
    let chat = db.waChats[id];
    if (!chat) {
      chat = {
        id, instance, numero,
        nome: data.pushName || numero,
        mensagens: [], naoLidas: 0, atualizadoEm: Date.now(),
      };
      db.waChats[id] = chat;
    }
    if (!fromMe && data.pushName) chat.nome = data.pushName;
    chat.mensagens.push({
      role: fromMe ? "me" : "them",
      content: texto,
      ts: Date.now(),
    });
    if (chat.mensagens.length > 300) chat.mensagens = chat.mensagens.slice(-300);
    if (!fromMe) chat.naoLidas = (chat.naoLidas || 0) + 1;
    chat.atualizadoEm = Date.now();
    saveSoon();
    res.json({ ok: true });
  } catch (e) {
    console.error("Webhook erro:", e.message);
    res.json({ ok: true });
  }
});

/* ---- CONFIG (gerente) ---- */
app.get("/api/wa/config", auth, gerenteOnly, (req, res) => {
  const c = db.waConfig;
  res.json({
    url: c.url, publicUrl: c.publicUrl,
    temApiKey: !!c.apiKey,
    instancias: c.instancias,
    webhookUrl: webhookUrl(),
  });
});
app.put("/api/wa/config", auth, gerenteOnly, (req, res) => {
  const { url, apiKey, publicUrl, instancias } = req.body || {};
  if (url !== undefined) db.waConfig.url = String(url).trim();
  if (apiKey) db.waConfig.apiKey = String(apiKey).trim();
  if (publicUrl) db.waConfig.publicUrl = String(publicUrl).trim();
  if (Array.isArray(instancias)) {
    db.waConfig.instancias = instancias
      .filter((i) => i && i.instance)
      .map((i) => ({ instance: instanciaLimpa(i.instance), vendedorId: i.vendedorId || null }));
  }
  saveSoon();
  res.json({ ok: true, webhookUrl: webhookUrl() });
});

/* ---- minha instância (vendedor conecta o próprio) ---- */
app.get("/api/wa/minha", auth, async (req, res) => {
  const insts = instanciasDoUser(req.user);
  const instance = insts[0] || null;
  let estado = "sem_instancia";
  if (instance) {
    try {
      const r = await evo("GET", `/instance/connectionState/${instance}`);
      estado = (r && r.instance && r.instance.state) || "close";
    } catch (_) { estado = "desconhecido"; }
  }
  res.json({ instance, estado });
});

/* ---- listar conversas (escopo por instância) ---- */
app.get("/api/wa/chats", auth, (req, res) => {
  const permitidas = new Set(instanciasDoUser(req.user));
  let chats = Object.values(db.waChats).filter((c) => permitidas.has(c.instance));
  if (req.user.role === "gerente" && req.query.instance && req.query.instance !== "todas") {
    chats = chats.filter((c) => c.instance === req.query.instance);
  }
  chats.sort((a, b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0));
  res.json(
    chats.map((c) => ({
      id: c.id, instance: c.instance, numero: c.numero, nome: c.nome,
      naoLidas: c.naoLidas || 0, atualizadoEm: c.atualizadoEm,
      ultima: c.mensagens.length ? c.mensagens[c.mensagens.length - 1].content : "",
      vendedorId: vendedorDaInstancia(c.instance),
    }))
  );
});

/* ---- abrir conversa (marca como lida) ---- */
app.get("/api/wa/chats/:id", auth, (req, res) => {
  const chat = db.waChats[req.params.id];
  if (!chat) return res.status(404).json({ error: "Conversa não encontrada" });
  const permitidas = new Set(instanciasDoUser(req.user));
  if (!permitidas.has(chat.instance))
    return res.status(403).json({ error: "Sem acesso a essa conversa" });
  chat.naoLidas = 0;
  saveSoon();
  res.json(chat);
});

/* ---- enviar mensagem ---- */
app.post("/api/wa/chats/:id/send", auth, async (req, res) => {
  const chat = db.waChats[req.params.id];
  if (!chat) return res.status(404).json({ error: "Conversa não encontrada" });
  const permitidas = new Set(instanciasDoUser(req.user));
  if (!permitidas.has(chat.instance))
    return res.status(403).json({ error: "Sem acesso a essa conversa" });
  const texto = (req.body && req.body.texto) || "";
  if (!texto.trim()) return res.status(400).json({ error: "Mensagem vazia" });
  try {
    await evo("POST", `/message/sendText/${chat.instance}`, {
      number: chat.numero,
      text: texto,
    });
    chat.mensagens.push({ role: "me", content: texto, ts: Date.now() });
    chat.atualizadoEm = Date.now();
    saveSoon();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ---- iniciar nova conversa (manda 1ª mensagem pra um número) ---- */
app.post("/api/wa/iniciar", auth, async (req, res) => {
  const { instance, numero, texto } = req.body || {};
  const permitidas = new Set(instanciasDoUser(req.user));
  const inst = instance || instanciasDoUser(req.user)[0];
  if (!inst || !permitidas.has(inst))
    return res.status(403).json({ error: "Sem WhatsApp vinculado" });
  const num = String(numero || "").replace(/\D/g, "");
  if (num.length < 8) return res.status(400).json({ error: "Número inválido" });
  try {
    await evo("POST", `/message/sendText/${inst}`, { number: num, text: texto || "Olá!" });
    const id = `${inst}::${num}`;
    let chat = db.waChats[id];
    if (!chat) {
      chat = { id, instance: inst, numero: num, nome: num, mensagens: [], naoLidas: 0, atualizadoEm: Date.now() };
      db.waChats[id] = chat;
    }
    chat.mensagens.push({ role: "me", content: texto || "Olá!", ts: Date.now() });
    chat.atualizadoEm = Date.now();
    saveSoon();
    res.json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ---- criar instância + QR (gerente, ou vendedor pra própria) ---- */
app.post("/api/wa/connect", auth, async (req, res) => {
  let { instance, publicUrl } = req.body || {};
  instance = instanciaLimpa(instance);
  if (!instance) return res.status(400).json({ error: "Informe o nome da instância" });
  // permissão: gerente conecta qualquer uma; vendedor só a dele
  if (req.user.role !== "gerente") {
    const minhas = instanciasDoUser(req.user);
    if (!minhas.includes(instance))
      return res.status(403).json({ error: "Você só pode conectar o seu WhatsApp" });
  }
  if (publicUrl && !db.waConfig.publicUrl) {
    db.waConfig.publicUrl = String(publicUrl).trim();
    saveSoon();
  }
  try {
    let qr = null, pairing = null;
    // 1) tenta criar — instância NOVA já devolve o QR aqui mesmo
    try {
      const cr = await evo("POST", `/instance/create`, {
        instanceName: instance,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
      });
      const ex = extrairQR(cr);
      qr = ex.qr; pairing = ex.pairing;
    } catch (e) {
      // se já existe, tudo bem (segue pro connect). Qualquer outro erro real, mostra.
      if (!/in use|already|exists|já está em uso/i.test(e.message)) throw e;
    }
    await configurarWebhook(instance);
    // 2) se ainda não tem QR (instância já existia), pede pelo connect
    if (!qr) {
      const r = await evo("GET", `/instance/connect/${instance}`);
      const ex = extrairQR(r);
      qr = ex.qr; pairing = ex.pairing;
    }
    res.json({ qr, pairingCode: pairing });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/wa/status/:instance", auth, async (req, res) => {
  try {
    const r = await evo("GET", `/instance/connectionState/${req.params.instance}`);
    const estado =
      (r && r.instance && (r.instance.state || r.instance.connectionStatus)) ||
      (r && (r.state || r.status)) ||
      "close";
    res.json({ estado });
  } catch (e) {
    res.json({ estado: "desconhecido" });
  }
});

app.post("/api/wa/logout/:instance", auth, gerenteOnly, async (req, res) => {
  try { await evo("DELETE", `/instance/logout/${req.params.instance}`); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/wa/instance/:instance", auth, gerenteOnly, async (req, res) => {
  try {
    try { await evo("DELETE", `/instance/logout/${req.params.instance}`); } catch (_) {}
    await evo("DELETE", `/instance/delete/${req.params.instance}`);
  } catch (e) { /* segue mesmo se já não existir */ }
  // remove do mapeamento e conversas
  db.waConfig.instancias = db.waConfig.instancias.filter((i) => i.instance !== req.params.instance);
  Object.keys(db.waChats).forEach((k) => {
    if (db.waChats[k].instance === req.params.instance) delete db.waChats[k];
  });
  saveSoon();
  res.json({ ok: true });
});

/* ============================================================
   ANÁLISE POR IA (Claude / Anthropic) — sugestão da equipe e individual
   ============================================================ */
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

async function chamarIA(prompt) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key)
    throw new Error("IA não configurada: adicione a variável ANTHROPIC_API_KEY no Railway.");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  let data = null;
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) {
    const m = (data && data.error && data.error.message) || "Erro na IA " + res.status;
    if (res.status === 404 || /model/i.test(m))
      throw new Error("Modelo da IA não encontrado. Ajuste a variável ANTHROPIC_MODEL no Railway (ex: claude-haiku-4-5-20251001 ou claude-sonnet-4-6). Detalhe: " + m);
    if (res.status === 401)
      throw new Error("Chave da IA inválida. Confira o valor da ANTHROPIC_API_KEY no Railway.");
    throw new Error(m);
  }
  const blocos = Array.isArray(data && data.content) ? data.content : [];
  const out = blocos.filter((b) => b.type === "text").map((b) => b.text).join("");
  if (!out.trim()) throw new Error("A IA não retornou resposta. Tente de novo.");
  return out;
}
function parseIA(txt) {
  let t = (txt || "").trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  try {
    const o = JSON.parse(t);
    const arr = (a) => (Array.isArray(a) ? a.filter(Boolean).map(String) : []);
    return {
      resumo: o.resumo || o.avaliacao || "",
      pontosFortes: arr(o.pontos_fortes || o.pontosFortes),
      pontosMelhorar: arr(o.pontos_a_melhorar || o.pontosMelhorar),
      sugestoes: arr(o.sugestoes),
    };
  } catch (_) {
    return { resumo: txt, pontosFortes: [], pontosMelhorar: [], sugestoes: [] };
  }
}
function chatsDoVendedor(vendedorId) {
  const insts = (db.waConfig.instancias || []).filter((i) => i.vendedorId === vendedorId).map((i) => i.instance);
  return Object.values(db.waChats).filter((c) => insts.includes(c.instance));
}
function mediaSeg(arr) {
  return arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length / 1000) : 0;
}
function metricasChat(chat, desde, ate) {
  const msgs = (chat.mensagens || [])
    .filter((m) => m.ts >= desde && m.ts <= ate)
    .sort((a, b) => a.ts - b.ts);
  if (msgs.length === 0) return null;
  let resp = [], primeira = null, pend = null, temMe = false, temThem = false;
  msgs.forEach((m) => {
    if (m.role === "them") { temThem = true; if (pend === null) pend = m.ts; }
    else { temMe = true; if (pend !== null) { const d = m.ts - pend; resp.push(d); if (primeira === null) primeira = d; pend = null; } }
  });
  return {
    enviadas: msgs.filter((m) => m.role === "me").length,
    resp, primeira,
    dur: msgs.length >= 2 ? msgs[msgs.length - 1].ts - msgs[0].ts : 0,
    atendida: temMe,
    semResposta: temThem && msgs[msgs.length - 1].role === "them",
  };
}
function agregaVendedor(vendedorId, desde, ate) {
  let conversas = 0, atendidas = 0, semResp = 0, enviadas = 0;
  let resp = [], primeiras = [], duracoes = [];
  chatsDoVendedor(vendedorId).forEach((c) => {
    const m = metricasChat(c, desde, ate);
    if (!m) return;
    conversas++;
    if (m.atendida) atendidas++;
    if (m.semResposta) semResp++;
    enviadas += m.enviadas;
    resp = resp.concat(m.resp);
    if (m.primeira != null) primeiras.push(m.primeira);
    if (m.dur > 0) duracoes.push(m.dur);
  });
  return {
    conversas, atendidas, semResposta: semResp, mensagensEnviadas: enviadas,
    tmrSeg: mediaSeg(resp), primeiraSeg: mediaSeg(primeiras), duracaoSeg: mediaSeg(duracoes),
    taxaResposta: conversas ? Math.round((atendidas / conversas) * 100) : 0,
  };
}

app.get("/api/monitoria", auth, (req, res) => {
  const desde = req.query.desde ? Number(req.query.desde) : 0;
  const ate = req.query.ate ? Number(req.query.ate) : Date.now();
  let vendedores = db.users.filter((u) => u.role === "vendedor" && u.ativo);
  if (req.user.role !== "gerente") vendedores = vendedores.filter((v) => v.id === req.user.id);
  const out = vendedores.map((v) => ({ id: v.id, nome: v.nome, ...agregaVendedor(v.id, desde, ate) }));
  const soma = (k) => out.reduce((s, x) => s + x[k], 0);
  const mediaDe = (k) => { const c = out.filter((x) => x[k] > 0); return c.length ? Math.round(c.reduce((s, x) => s + x[k], 0) / c.length) : 0; };
  const time = {
    conversas: soma("conversas"), atendidas: soma("atendidas"),
    semResposta: soma("semResposta"), mensagensEnviadas: soma("mensagensEnviadas"),
    tmrSeg: mediaDe("tmrSeg"), primeiraSeg: mediaDe("primeiraSeg"), duracaoSeg: mediaDe("duracaoSeg"),
  };
  time.taxaResposta = time.conversas ? Math.round((time.atendidas / time.conversas) * 100) : 0;
  res.json({ vendedores: out, time, desde, ate });
});

app.get("/api/monitoria/vendedor/:id", auth, (req, res) => {
  const v = db.users.find((u) => u.id === req.params.id);
  if (!v) return res.status(404).json({ error: "Vendedor não encontrado" });
  if (req.user.role !== "gerente" && req.user.id !== v.id)
    return res.status(403).json({ error: "Sem acesso" });
  const desde = req.query.desde ? Number(req.query.desde) : 0;
  const ate = req.query.ate ? Number(req.query.ate) : Date.now();
  const lista = chatsDoVendedor(v.id).map((c) => {
    const m = metricasChat(c, desde, ate);
    if (!m) return null;
    const msgsP = (c.mensagens || []).filter((x) => x.ts >= desde && x.ts <= ate).sort((a, b) => a.ts - b.ts);
    const ult = msgsP[msgsP.length - 1];
    return {
      id: c.id, numero: c.numero, nome: c.nome,
      nMsgs: msgsP.length, enviadas: m.enviadas, atendida: m.atendida, semResposta: m.semResposta,
      tmrSeg: mediaSeg(m.resp), primeiraSeg: m.primeira != null ? Math.round(m.primeira / 1000) : 0,
      ultimoTs: ult ? ult.ts : 0, ultimaMsg: ult ? String(ult.content).slice(0, 90) : "", ultimaDe: ult ? ult.role : "",
    };
  }).filter(Boolean).sort((a, b) => b.ultimoTs - a.ultimoTs);
  res.json({ id: v.id, nome: v.nome, ...agregaVendedor(v.id, desde, ate), lista });
});

app.get("/api/monitoria/evolucao", auth, (req, res) => {
  const DAY = 86400000;
  let desde = req.query.desde ? Number(req.query.desde) : 0;
  const ate = req.query.ate ? Number(req.query.ate) : Date.now();
  if (!desde || ate - desde > 62 * DAY) desde = ate - 62 * DAY;
  let ids;
  if (req.user.role === "gerente")
    ids = req.query.vendedorId ? [req.query.vendedorId] : db.users.filter((u) => u.role === "vendedor" && u.ativo).map((u) => u.id);
  else ids = [req.user.id];
  const keyOf = (ts) => { const d = new Date(ts); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const labelOf = (ts) => { const d = new Date(ts); return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0"); };
  const dias = {};
  const ensure = (ts) => { const k = keyOf(ts); if (!dias[k]) dias[k] = { conv: new Set(), atendidas: new Set(), msgs: 0, resp: [], primeiras: [] }; return dias[k]; };
  ids.forEach((id) => chatsDoVendedor(id).forEach((c) => {
    const msgs = (c.mensagens || []).filter((m) => m.ts >= desde && m.ts <= ate).sort((a, b) => a.ts - b.ts);
    let pend = null, primeiraFeita = false;
    msgs.forEach((m) => {
      const b = ensure(m.ts);
      b.conv.add(c.id);
      if (m.role === "them") { if (pend === null) pend = m.ts; }
      else {
        b.msgs++; b.atendidas.add(c.id);
        if (pend !== null) {
          const delta = m.ts - pend;
          b.resp.push(delta);
          if (!primeiraFeita) { b.primeiras.push(delta); primeiraFeita = true; }
          pend = null;
        }
      }
    });
  }));
  const startDay = new Date(desde); startDay.setHours(0, 0, 0, 0);
  const endDay = new Date(ate); endDay.setHours(0, 0, 0, 0);
  const out = [];
  for (let t = startDay.getTime(); t <= endDay.getTime() + 1; t += DAY) {
    const d = dias[keyOf(t)];
    out.push({
      label: labelOf(t),
      atendimentos: d ? d.conv.size : 0,
      atendidas: d ? d.atendidas.size : 0,
      mensagens: d ? d.msgs : 0,
      tmrSeg: d ? mediaSeg(d.resp) : 0,
      primeiraSeg: d ? mediaSeg(d.primeiras) : 0,
    });
  }
  res.json({ dias: out, desde: startDay.getTime(), ate });
});

function conversasVendedor(vendedorId, maxChats = 6, maxMsgs = 12) {
  return chatsDoVendedor(vendedorId)
    .sort((a, b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0))
    .slice(0, maxChats)
    .map((c) => {
      const msgs = c.mensagens.slice(-maxMsgs)
        .map((m) => (m.role === "me" ? "Vendedor" : "Cliente") + ": " + String(m.content).slice(0, 200))
        .join("\n");
      return `Conversa com ${c.nome}:\n${msgs}`;
    });
}
function fmtSegBR(seg) {
  if (!seg) return "—";
  if (seg < 60) return seg + "s";
  if (seg < 3600) return Math.floor(seg / 60) + "min " + (seg % 60) + "s";
  return Math.floor(seg / 3600) + "h " + Math.floor((seg % 3600) / 60) + "min";
}

app.post("/api/ia/equipe", auth, gerenteOnly, async (req, res) => {
  try {
    const vendedores = db.users.filter((u) => u.role === "vendedor" && u.ativo);
    const linhas = vendedores.map((v) => {
      const s = agregaVendedor(v.id, 0, Date.now());
      return `- ${v.nome}: ${s.conversas} conversas, ${s.atendidas} atendidas, ${s.semResposta} sem resposta, ${s.mensagensEnviadas} mensagens enviadas, tempo médio de resposta ${fmtSegBR(s.tmrSeg)}, 1ª resposta ${fmtSegBR(s.primeiraSeg)}, taxa de resposta ${s.taxaResposta}%`;
    }).join("\n");
    const amostras = [];
    vendedores.slice(0, 6).forEach((v) => {
      const cv = conversasVendedor(v.id, 1, 8);
      if (cv[0]) amostras.push(`[${v.nome}] ${cv[0]}`);
    });
    const prompt = `Você é um supervisor de atendimento sênior monitorando a equipe da Escola Instructiva (cursos técnicos de eletrônica) que atende clientes pelo WhatsApp. Avalie a QUALIDADE E A PRODUTIVIDADE DO ATENDIMENTO da equipe (rapidez nas respostas, clientes deixados sem resposta, volume, tom e educação).

DESEMPENHO DE ATENDIMENTO DOS VENDEDORES:
${linhas || "Nenhum vendedor cadastrado."}

AMOSTRA DE CONVERSAS NO WHATSAPP:
${amostras.join("\n\n") || "Sem conversas registradas ainda."}

Responda SOMENTE em JSON puro, sem markdown, neste formato:
{"resumo":"2 a 4 frases sobre o atendimento da equipe","pontos_fortes":["..."],"pontos_a_melhorar":["..."],"sugestoes":["3 a 5 sugestões práticas pra melhorar a velocidade, a cobertura e a qualidade do atendimento"]}
Escreva em português brasileiro, tom direto e construtivo.`;
    res.json(parseIA(await chamarIA(prompt)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/ia/vendedor/:id", auth, async (req, res) => {
  const v = db.users.find((u) => u.id === req.params.id);
  if (!v) return res.status(404).json({ error: "Vendedor não encontrado" });
  if (req.user.role !== "gerente" && req.user.id !== v.id)
    return res.status(403).json({ error: "Sem acesso" });
  try {
    const s = agregaVendedor(v.id, 0, Date.now());
    const conv = conversasVendedor(v.id, 6, 12);
    const prompt = `Você é um supervisor de atendimento sênior avaliando UM atendente da Escola Instructiva (cursos técnicos de eletrônica) que atende clientes pelo WhatsApp. Avalie a QUALIDADE e a PRODUTIVIDADE do atendimento (rapidez de resposta, clientes sem resposta, volume, tom, educação, clareza, follow-up).

ATENDENTE: ${v.nome}
NÚMEROS: ${s.conversas} conversas, ${s.atendidas} atendidas, ${s.semResposta} sem resposta, ${s.mensagensEnviadas} mensagens enviadas, tempo médio de resposta ${fmtSegBR(s.tmrSeg)}, tempo da 1ª resposta ${fmtSegBR(s.primeiraSeg)}, taxa de resposta ${s.taxaResposta}%.

CONVERSAS NO WHATSAPP:
${conv.join("\n\n") || "Poucas conversas registradas pra avaliar o atendimento."}

Responda SOMENTE em JSON puro, sem markdown, neste formato:
{"resumo":"2 a 4 frases avaliando o atendimento dessa pessoa","pontos_fortes":["..."],"pontos_a_melhorar":["..."],"sugestoes":["3 a 5 sugestões práticas e específicas pra essa pessoa melhorar o atendimento"]}
Escreva em português brasileiro, tom direto e construtivo, sem ser ofensivo.`;
    const out = parseIA(await chamarIA(prompt));
    out.vendedor = v.nome;
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ============================================================
   FRONTEND (build do Vite)
   ============================================================ */
const dist = path.join(__dirname, "..", "dist");
app.use(express.static(dist));
app.get("*", (req, res) => {
  res.sendFile(path.join(dist, "index.html"));
});

/* ============================================================
   RESET DE EMERGÊNCIA (se a variável RESET_ADMIN estiver ligada)
   Restaura o acesso gerente / admin123 SEM apagar vendedores/leads.
   ============================================================ */
function resetAdminSeNecessario() {
  if (!process.env.RESET_ADMIN) return;
  let g = db.users.find((u) => u.login === "gerente");
  if (!g) {
    g = {
      id: proximoId("u"),
      nome: "Gerente Comercial",
      login: "gerente",
      role: "gerente",
      meta: 0,
      ativo: true,
      token: null,
      criadoEm: Date.now(),
    };
    db.users.push(g);
  }
  g.senha = "admin123";
  g.role = "gerente";
  g.ativo = true;
  g.precisaOnboarding = false; // não pede pra trocar de novo
  g.token = null; // força login novo
  saveDB();
  console.log("⚠️  RESET_ADMIN ativo: acesso restaurado -> usuário 'gerente' / senha 'admin123'");
}

/* ============================================================
   START
   ============================================================ */
const PORT = process.env.PORT || 3000;
aguardarVolume().then(() => {
  loadDB();
  resetAdminSeNecessario();
  app.listen(PORT, () => console.log("✓ CRM Comercial rodando na porta", PORT));
});
