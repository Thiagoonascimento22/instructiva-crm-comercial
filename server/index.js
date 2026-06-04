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
  const { nome, login, senha, role, meta } = req.body || {};
  if (!nome || !login || !senha)
    return res.status(400).json({ error: "Nome, login e senha são obrigatórios" });
  if (db.users.some((u) => u.login.toLowerCase() === login.toLowerCase()))
    return res.status(400).json({ error: "Já existe alguém com esse login" });
  const novo = {
    id: proximoId("u"),
    nome: nome.trim(),
    login: login.trim(),
    senha,
    role: role === "gerente" ? "gerente" : "vendedor",
    meta: Number(meta) || 0,
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
    // cria a instância (se já existir, a Evolution dá erro — então tentamos só conectar)
    try {
      await evo("POST", `/instance/create`, {
        instanceName: instance,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
      });
    } catch (e) {
      // provavelmente já existe — segue pro connect
    }
    await configurarWebhook(instance);
    const r = await evo("GET", `/instance/connect/${instance}`);
    const base64 = r.base64 || (r.qrcode && r.qrcode.base64) || null;
    res.json({ qr: base64, pairingCode: r.pairingCode || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/wa/status/:instance", auth, async (req, res) => {
  try {
    const r = await evo("GET", `/instance/connectionState/${req.params.instance}`);
    res.json({ estado: (r && r.instance && r.instance.state) || "close" });
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
function statsVendedor(vendedorId) {
  const cs = db.cards.filter((c) => !c.arquivado && c.responsavelId === vendedorId);
  const fechados = cs.filter((c) => c.etapa === "fechou");
  const total = fechados.reduce((s, c) => s + (Number(c.valorFinal) || 0), 0);
  return {
    leads: cs.length,
    fechados: fechados.length,
    perdidos: cs.filter((c) => c.etapa === "perdeu").length,
    emAberto: cs.filter((c) => ["lead", "contato", "negociando"].includes(c.etapa)).length,
    total,
    ticket: fechados.length ? total / fechados.length : 0,
    conversao: cs.length ? Math.round((fechados.length / cs.length) * 100) : 0,
  };
}
function conversasVendedor(vendedorId, maxChats = 6, maxMsgs = 12) {
  const insts = (db.waConfig.instancias || []).filter((i) => i.vendedorId === vendedorId).map((i) => i.instance);
  return Object.values(db.waChats)
    .filter((c) => insts.includes(c.instance))
    .sort((a, b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0))
    .slice(0, maxChats)
    .map((c) => {
      const msgs = c.mensagens.slice(-maxMsgs)
        .map((m) => (m.role === "me" ? "Vendedor" : "Cliente") + ": " + String(m.content).slice(0, 200))
        .join("\n");
      return `Conversa com ${c.nome}:\n${msgs}`;
    });
}

app.post("/api/ia/equipe", auth, gerenteOnly, async (req, res) => {
  try {
    const vendedores = db.users.filter((u) => u.role === "vendedor" && u.ativo);
    const linhas = vendedores.map((v) => {
      const s = statsVendedor(v.id);
      return `- ${v.nome}: ${s.fechados} vendas, R$ ${s.total.toFixed(2)} vendido, ticket R$ ${s.ticket.toFixed(2)}, ${s.conversao}% conversão (${s.fechados}/${s.leads} leads), ${s.perdidos} perdidos, meta mensal R$ ${(Number(v.meta) || 0).toFixed(2)}`;
    }).join("\n");
    const amostras = [];
    vendedores.slice(0, 6).forEach((v) => {
      const cv = conversasVendedor(v.id, 1, 8);
      if (cv[0]) amostras.push(`[${v.nome}] ${cv[0]}`);
    });
    const prompt = `Você é um gestor comercial sênior analisando a equipe de vendas da Escola Instructiva (cursos técnicos de eletrônica). Analise a EQUIPE como um todo com base nos dados.

DESEMPENHO DOS VENDEDORES:
${linhas || "Nenhum vendedor cadastrado."}

AMOSTRA DE ATENDIMENTOS NO WHATSAPP:
${amostras.join("\n\n") || "Sem conversas registradas ainda."}

Responda SOMENTE em JSON puro, sem markdown, neste formato:
{"resumo":"2 a 4 frases sobre o estado geral da equipe","pontos_fortes":["..."],"pontos_a_melhorar":["..."],"sugestoes":["3 a 5 sugestões práticas e específicas pra melhorar os resultados do time"]}
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
    const s = statsVendedor(v.id);
    const conv = conversasVendedor(v.id, 6, 12);
    const prompt = `Você é um gestor comercial sênior avaliando UM vendedor da Escola Instructiva (cursos técnicos de eletrônica). Avalie tanto os RESULTADOS quanto a QUALIDADE DO ATENDIMENTO (tom, rapidez, educação, clareza, follow-up).

VENDEDOR: ${v.nome}
NÚMEROS: ${s.fechados} vendas fechadas, R$ ${s.total.toFixed(2)} vendido, ticket médio R$ ${s.ticket.toFixed(2)}, ${s.conversao}% de conversão (${s.fechados} de ${s.leads} leads), ${s.perdidos} perdidos, ${s.emAberto} em aberto. Meta mensal: R$ ${(Number(v.meta) || 0).toFixed(2)}.

ATENDIMENTOS NO WHATSAPP:
${conv.join("\n\n") || "Poucas conversas registradas pra avaliar o atendimento."}

Responda SOMENTE em JSON puro, sem markdown, neste formato:
{"resumo":"2 a 4 frases avaliando esse vendedor","pontos_fortes":["..."],"pontos_a_melhorar":["..."],"sugestoes":["3 a 5 sugestões práticas e específicas pra esse vendedor melhorar"]}
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
