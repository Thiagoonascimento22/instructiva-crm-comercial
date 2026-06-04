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
const ETAPAS = ["lead", "contato", "negociando", "fechou", "perdeu"];

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
  const { cliente, telefone, valorEstimado, responsavelId, etapa, obs } =
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
    obs: (obs || "").trim(),
    arquivado: false,
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
  if (b.etapa !== undefined && ETAPAS.includes(b.etapa)) card.etapa = b.etapa;
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

/* ============================================================
   FRONTEND (build do Vite)
   ============================================================ */
const dist = path.join(__dirname, "..", "dist");
app.use(express.static(dist));
app.get("*", (req, res) => {
  res.sendFile(path.join(dist, "index.html"));
});

/* ============================================================
   START
   ============================================================ */
const PORT = process.env.PORT || 3000;
aguardarVolume().then(() => {
  loadDB();
  app.listen(PORT, () => console.log("✓ CRM Comercial rodando na porta", PORT));
});
