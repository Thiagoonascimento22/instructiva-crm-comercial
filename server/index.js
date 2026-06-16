import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import crypto from "crypto";
import fs from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const app = express();
app.use(cors());
app.use(express.json({ limit: "40mb" }));

// ---------------------------------------------------------------------------
// Armazenamento em arquivo JSON (JavaScript puro — sem compilação nativa).
// No Railway, monte um volume e aponte DB_PATH para dentro dele
// (ex.: DB_PATH=/data/instructiva.json) para os dados persistirem.
// ---------------------------------------------------------------------------
let DB_PATH = process.env.DB_PATH || join(ROOT, "instructiva.json");
// se vier com extensão .db (config antiga), troca para .json
if (DB_PATH.endsWith(".db")) DB_PATH = DB_PATH.replace(/\.db$/, ".json");

const DB_DIR = dirname(DB_PATH);
const COMPROV_DIR = join(DB_DIR, "comprovantes");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Espera o volume montar. No Railway o volume pode montar alguns segundos
// DEPOIS do servidor iniciar; se gravarmos antes, o mount "cobre" os dados.
async function aguardarVolume(maxTentativas = 30) {
  for (let i = 0; i < maxTentativas; i++) {
    try {
      if (!fs.existsSync(DB_DIR)) {
        try { fs.mkdirSync(DB_DIR, { recursive: true }); } catch {}
      }
      const testFile = join(DB_DIR, ".write-test");
      fs.writeFileSync(testFile, "ok");
      fs.unlinkSync(testFile);
      return true;
    } catch (e) {
      await sleep(1000);
    }
  }
  console.warn("⚠ Volume não confirmado após espera; seguindo mesmo assim.");
  return false;
}

function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const d = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
      // garante que todos os campos existam (migração de bancos antigos)
      if (!d.users) d.users = [];
      if (!d.records) d.records = [];
      if (!d.tasks) d.tasks = [];
      if (!d.sessions) d.sessions = {};
      if (!d.waChats) d.waChats = {};       // conversas do WhatsApp
      if (!d.waConfig) d.waConfig = {};      // config da conexão (url, key, instâncias)
      if (!Array.isArray(d.solicitacoes)) d.solicitacoes = [];  // solicitações vindas do comercial (Monitoria)
      // MIGRAÇÃO: conversas antigas usavam a chave = número. Agora é "instancia::numero".
      // Converte as que ainda estão no formato velho (sem o campo id ou chave sem "::").
      const novasChaves = {};
      let migrou = false;
      for (const [chave, chat] of Object.entries(d.waChats)) {
        if (chave.includes("::") && chat.id) {
          novasChaves[chave] = chat;   // já está no formato novo
        } else {
          // formato antigo: monta a chave nova
          const inst = chat.instance || "?";
          const numero = chat.numero || chave;
          const novaChave = `${inst}::${numero}`;
          chat.id = novaChave;
          chat.numero = numero;
          if (chat.ehGrupo === undefined) chat.ehGrupo = false;
          novasChaves[novaChave] = chat;
          migrou = true;
        }
      }
      d.waChats = novasChaves;
      if (migrou) { try { fs.writeFileSync(DB_PATH, JSON.stringify(d, null, 2)); } catch {} }
      return d;
    }
  } catch (e) { console.error("Erro ao ler banco:", e.message); }
  return { users: [], records: [], tasks: [], sessions: {}, waChats: {}, waConfig: {}, solicitacoes: [] };
}
function saveDB(database) {
  try { fs.writeFileSync(DB_PATH, JSON.stringify(database, null, 2)); }
  catch (e) { console.error("Erro ao salvar banco:", e.message); }
}

let db = { users: [], records: [], tasks: [], sessions: {}, waChats: {}, waConfig: {}, solicitacoes: [] };

// Inicialização assíncrona: espera o volume, carrega o banco, cria admin,
// e SÓ ENTÃO sobe o servidor.
async function iniciar() {
  console.log("Aguardando volume em:", DB_DIR);
  await aguardarVolume();
  console.log("Volume pronto. Usando banco em:", DB_PATH);

  db = loadDB();

  // cria a conta admin padrão se não existir nenhuma
  if (!db.users.some((u) => u.role === "admin")) {
    db.users.push({
      id: "admin",
      nome: "",
      login: "gerente",
      senha: hash("admin123"),
      role: "admin",
      perms: { ver_todos: true, registrar: true, excluir: true, exportar: true, ia: true, gerir_usuarios: true },
      ativo: true,
    });
    saveDB(db);
    console.log("→ Conta admin criada: login 'gerente' / senha 'admin123'");
  } else {
    console.log("→ Banco já existe. Usuários:", db.users.length, "| Atendimentos:", db.records.length);
  }

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`✓ Servidor rodando na porta ${PORT}`));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function hash(senha) {
  return crypto.createHash("sha256").update(senha + "::instructiva-salt").digest("hex");
}
function newToken() { return crypto.randomBytes(24).toString("hex"); }
function publicUser(u) {
  return { id: u.id, nome: u.nome, login: u.login, role: u.role, perms: u.perms, ativo: !!u.ativo, excluirAnalise: !!u.excluirAnalise };
}
function userFromToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "");
  if (!token) return null;
  const userId = db.sessions[token];
  if (!userId) return null;
  return db.users.find((u) => u.id === userId) || null;
}
function requireAuth(req, res, next) {
  const u = userFromToken(req);
  if (!u) return res.status(401).json({ error: "não autenticado" });
  req.user = u;
  req.perms = u.perms || {};
  req.isAdmin = u.role === "admin";
  next();
}
function can(req, perm) { return req.isAdmin || req.perms?.[perm]; }

// ---------------------------------------------------------------------------
// PONTE COM O COMERCIAL (Monitoria) — recebe solicitações via chave compartilhada
// ---------------------------------------------------------------------------
const BRIDGE_KEY = process.env.BRIDGE_KEY || "";
function bridgeAuth(req, res, next) {
  if (!BRIDGE_KEY || String(req.headers["x-bridge-key"] || "") !== BRIDGE_KEY)
    return res.status(401).json({ error: "ponte não autorizada" });
  next();
}
const URG_OK = ["baixa", "media", "alta"];

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------
app.post("/api/login", (req, res) => {
  const { login, senha } = req.body;
  const u = db.users.find((x) => x.login.toLowerCase() === String(login || "").trim().toLowerCase() && x.ativo);
  if (!u || u.senha !== hash(senha || "")) return res.status(401).json({ error: "usuário ou senha incorretos" });
  const token = newToken();
  db.sessions[token] = u.id;
  saveDB(db);
  res.json({ token, user: publicUser(u) });
});

app.post("/api/logout", requireAuth, (req, res) => {
  const auth = (req.headers.authorization || "").replace("Bearer ", "");
  delete db.sessions[auth];
  saveDB(db);
  res.json({ ok: true });
});

app.get("/api/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

app.put("/api/me", requireAuth, (req, res) => {
  const { nome, login, senha } = req.body;
  const u = req.user;
  const novoNome = (nome ?? u.nome).trim() || u.nome;
  const novoLogin = (login ?? u.login).trim() || u.login;
  if (novoLogin.toLowerCase() !== u.login.toLowerCase()) {
    if (db.users.some((x) => x.login.toLowerCase() === novoLogin.toLowerCase() && x.id !== u.id))
      return res.status(400).json({ error: "esse usuário já existe" });
  }
  u.nome = novoNome;
  u.login = novoLogin;
  if (senha && senha.trim()) u.senha = hash(senha.trim());
  saveDB(db);
  res.json({ user: publicUser(u) });
});

// ---------------------------------------------------------------------------
// USERS
// ---------------------------------------------------------------------------
app.get("/api/users", requireAuth, (req, res) => {
  if (!can(req, "gerir_usuarios")) return res.status(403).json({ error: "sem permissão" });
  const sorted = [...db.users].sort((a, b) => (b.role === "admin") - (a.role === "admin") || (a.nome || "").localeCompare(b.nome || ""));
  res.json({ users: sorted.map(publicUser) });
});

app.get("/api/users/names", requireAuth, (req, res) => {
  res.json({ users: db.users.map((u) => ({ id: u.id, nome: u.nome, role: u.role, ativo: !!u.ativo })) });
});

app.post("/api/users", requireAuth, (req, res) => {
  if (!can(req, "gerir_usuarios")) return res.status(403).json({ error: "sem permissão" });
  const { nome, login, senha, perms } = req.body;
  if (!nome?.trim() || !login?.trim() || !senha?.trim()) return res.status(400).json({ error: "preencha nome, login e senha" });
  if (db.users.some((u) => u.login.toLowerCase() === login.trim().toLowerCase())) return res.status(400).json({ error: "esse usuário já existe" });
  const defaultPerms = { registrar: true, ver_todos: false, excluir: false, exportar: false, ia: false, gerir_usuarios: false };
  const novo = {
    id: "u" + Date.now() + crypto.randomBytes(2).toString("hex"),
    nome: nome.trim(), login: login.trim(), senha: hash(senha.trim()),
    role: "colaboradora", perms: { ...defaultPerms, ...(perms || {}) }, ativo: true,
  };
  db.users.push(novo);
  saveDB(db);
  res.json({ user: publicUser(novo) });
});

app.put("/api/users/:id", requireAuth, (req, res) => {
  if (!can(req, "gerir_usuarios")) return res.status(403).json({ error: "sem permissão" });
  const u = db.users.find((x) => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: "não encontrado" });
  if (u.role === "admin") return res.status(400).json({ error: "não é possível editar o admin por aqui" });
  const { perms, ativo, nome, senha, excluirAnalise } = req.body;
  if (perms) u.perms = perms;
  if (ativo !== undefined) u.ativo = !!ativo;
  if (nome !== undefined) u.nome = nome.trim() || u.nome;
  if (senha && senha.trim()) u.senha = hash(senha.trim());
  if (excluirAnalise !== undefined) u.excluirAnalise = !!excluirAnalise;
  saveDB(db);
  res.json({ user: publicUser(u) });
});

app.delete("/api/users/:id", requireAuth, (req, res) => {
  if (!can(req, "gerir_usuarios")) return res.status(403).json({ error: "sem permissão" });
  const u = db.users.find((x) => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: "não encontrado" });
  if (u.role === "admin") return res.status(400).json({ error: "não é possível remover o admin" });
  db.users = db.users.filter((x) => x.id !== req.params.id);
  saveDB(db);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// RECORDS
// ---------------------------------------------------------------------------
app.get("/api/records", requireAuth, (req, res) => {
  let rows = can(req, "ver_todos") ? db.records : db.records.filter((r) => r.colaboradoraId === req.user.id);
  rows = [...rows].sort((a, b) => (b.data || "").localeCompare(a.data || "") || (b.criadoEm || "").localeCompare(a.criadoEm || ""));
  res.json({ records: rows });
});

app.post("/api/records", requireAuth, (req, res) => {
  if (!can(req, "registrar")) return res.status(403).json({ error: "sem permissão para registrar" });
  const b = req.body;
  if (!b.aluno?.trim() || !b.assunto?.trim()) return res.status(400).json({ error: "aluno e assunto são obrigatórios" });
  const colabId = req.isAdmin && b.colaboradoraId ? b.colaboradoraId : req.user.id;
  const rec = {
    id: Date.now() + "-" + crypto.randomBytes(3).toString("hex"),
    data: b.data || new Date().toISOString().slice(0, 10),
    colaboradoraId: colabId,
    aluno: b.aluno?.trim() || "", email: b.email?.trim() || "", telefone: b.telefone?.trim() || "",
    assunto: b.assunto?.trim() || "", solucao: b.solucao?.trim() || "", status: b.status || "resolvido",
    obs: b.obs?.trim() || "", criadoEm: new Date().toISOString(),
  };
  db.records.unshift(rec);
  saveDB(db);
  res.json({ record: rec });
});

app.delete("/api/records/:id", requireAuth, (req, res) => {
  const rec = db.records.find((r) => r.id === req.params.id);
  if (!rec) return res.status(404).json({ error: "não encontrado" });
  if (!can(req, "excluir")) return res.status(403).json({ error: "sem permissão para excluir" });
  db.records = db.records.filter((r) => r.id !== req.params.id);
  saveDB(db);
  res.json({ ok: true });
});

// ---- atualizar um atendimento (editar status, solução, etc) ----
app.put("/api/records/:id", requireAuth, (req, res) => {
  const rec = db.records.find((r) => r.id === req.params.id);
  if (!rec) return res.status(404).json({ error: "não encontrado" });
  // quem registrou pode editar o próprio; quem tem ver_todos pode editar qualquer um
  const ehDono = rec.colaboradoraId === req.user.id;
  if (!ehDono && !can(req, "ver_todos")) {
    return res.status(403).json({ error: "sem permissão para editar este atendimento" });
  }
  // campos que podem ser editados
  const editaveis = ["status", "solucao", "obs", "assunto", "aluno", "email", "telefone", "data"];
  editaveis.forEach((campo) => {
    if (req.body[campo] !== undefined) rec[campo] = req.body[campo];
  });
  saveDB(db);
  res.json({ record: rec });
});

// ---------------------------------------------------------------------------
// SOLICITAÇÕES (vindas do comercial / Monitoria)
// ---------------------------------------------------------------------------
// recebe uma nova solicitação do app do comercial (ponte)
function sanitizeCampos(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .slice(0, 40)
    .map((c) => ({ label: String((c && c.label) || "").slice(0, 60), valor: String((c && c.valor) || "").slice(0, 500) }))
    .filter((c) => c.label && c.valor);
}

function salvarAnexos(solId, arr) {
  if (!Array.isArray(arr) || !arr.length) return [];
  try { fs.mkdirSync(COMPROV_DIR, { recursive: true }); } catch {}
  const out = [];
  arr.slice(0, 5).forEach((a, i) => {
    const dados = String((a && a.dados) || "");
    if (!dados) return;
    const anexoId = i + "-" + crypto.randomBytes(3).toString("hex");
    const arquivo = solId + "__" + anexoId;
    try {
      fs.writeFileSync(join(COMPROV_DIR, arquivo), Buffer.from(dados, "base64"));
      out.push({
        id: anexoId,
        nome: String((a && a.nome) || "arquivo").slice(0, 200),
        mime: String((a && a.mime) || "application/octet-stream").slice(0, 100),
        arquivo,
      });
    } catch (_) {}
  });
  return out;
}

function apagarAnexos(s) {
  (s && Array.isArray(s.anexos) ? s.anexos : []).forEach((a) => {
    try { fs.unlinkSync(join(COMPROV_DIR, a.arquivo)); } catch (_) {}
  });
  (s && Array.isArray(s.mensagens) ? s.mensagens : []).forEach((m) => {
    if (m && m.anexo && m.anexo.arquivo) { try { fs.unlinkSync(join(COMPROV_DIR, m.anexo.arquivo)); } catch (_) {} }
  });
}

// salva 1 arquivo enviado no chat e devolve a referência {id,nome,mime,arquivo}
function salvarAnexoChat(solId, a) {
  const dados = String((a && a.dados) || "");
  if (!dados || dados.length > 16 * 1024 * 1024) return null;
  try { fs.mkdirSync(COMPROV_DIR, { recursive: true }); } catch {}
  const anexoId = "c" + Date.now() + crypto.randomBytes(3).toString("hex");
  const arquivo = solId + "__" + anexoId;
  try {
    fs.writeFileSync(join(COMPROV_DIR, arquivo), Buffer.from(dados, "base64"));
    return { id: anexoId, nome: String((a && a.nome) || "arquivo").slice(0, 200), mime: String((a && a.mime) || "application/octet-stream").slice(0, 100), arquivo };
  } catch (_) { return null; }
}

// acha um anexo (da solicitação ou de qualquer mensagem do chat) pelo id
function acharAnexo(s, anexoId) {
  if (!s) return null;
  let a = (s.anexos || []).find((x) => x.id === anexoId);
  if (!a) for (const m of (s.mensagens || [])) if (m && m.anexo && m.anexo.id === anexoId) { a = m.anexo; break; }
  return a || null;
}

function servirAnexo(res, s, anexoId) {
  try {
    if (!s) return res.status(404).json({ error: "Chamado não encontrado" });
    const a = acharAnexo(s, anexoId);
    if (!a) return res.status(404).json({ error: "Anexo não encontrado nos dados (id " + anexoId + ")" });
    const nome = String(a.nome || "arquivo").replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
    const mime = String(a.mime || "application/octet-stream");
    // fallback: bytes embutidos (sempre funciona)
    if (a.dados) {
      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Disposition", 'inline; filename="' + nome + '"');
      return res.end(Buffer.from(String(a.dados), "base64"));
    }
    if (!a.arquivo) return res.status(404).json({ error: "Anexo sem arquivo salvo" });
    const fp = join(COMPROV_DIR, String(a.arquivo));
    if (!fs.existsSync(fp)) return res.status(410).json({ error: "O arquivo não está mais no servidor. A pasta de anexos provavelmente não está no volume persistente do Railway (some a cada deploy). Reenvie o arquivo ou ajuste o volume." });
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", 'inline; filename="' + nome + '"');
    const stream = fs.createReadStream(fp);
    stream.on("error", (e) => { if (!res.headersSent) res.status(500).json({ error: "Erro lendo o arquivo: " + (e && e.message ? e.message : String(e)) }); else { try { res.end(); } catch (_) {} } });
    stream.pipe(res);
  } catch (e) {
    if (!res.headersSent) res.status(500).json({ error: "Erro ao abrir anexo: " + (e && e.message ? e.message : String(e)) });
  }
}

app.post("/api/solic/inbound", bridgeAuth, (req, res) => {
  const b = req.body || {};
  if (!b.descricao?.trim()) return res.status(400).json({ error: "descrição obrigatória" });
  const id = Date.now() + "-" + crypto.randomBytes(3).toString("hex");
  const s = {
    id,
    monitoriaId: String(b.monitoriaId || ""),
    vendedorNome: (b.vendedorNome || "").trim() || "Comercial",
    cliente: (b.cliente || "").trim(),
    numero: (b.numero || "").trim(),
    descricao: b.descricao.trim(),
    urgencia: URG_OK.includes(b.urgencia) ? b.urgencia : "media",
    tipo: String(b.tipo || "outras").trim().slice(0, 40),
    tipoLabel: String(b.tipoLabel || "").trim().slice(0, 60),
    campos: sanitizeCampos(b.campos),
    anexos: salvarAnexos(id, b.anexos),
    mensagens: [],
    suporteViu: 0,
    status: "recebida",   // recebida | em_atendimento | concluida
    colaboradoraId: null, colaboradoraNome: "",
    resposta: "",
    criadoEm: new Date().toISOString(), aceitoEm: null, concluidoEm: null,
  };
  db.solicitacoes.unshift(s);
  saveDB(db);
  res.json({ ok: true, id: s.id, status: s.status });
});

// o comercial exclui uma solicitação -> remove aqui também (ponte)
app.delete("/api/solic/inbound/:monitoriaId", bridgeAuth, (req, res) => {
  const i = db.solicitacoes.findIndex((s) => s.monitoriaId === req.params.monitoriaId);
  if (i >= 0) { apagarAnexos(db.solicitacoes[i]); db.solicitacoes.splice(i, 1); saveDB(db); }
  res.json({ ok: true });
});

// serve um comprovante (só logado no Suporte)
app.get("/api/solic/anexo/:solId/:anexoId", requireAuth, (req, res) => {
  const s = db.solicitacoes.find((x) => x.id === req.params.solId);
  servirAnexo(res, s, req.params.anexoId);
});

// serving de anexo pela ponte (o comercial faz proxy disso pro vendedor ver)
app.get("/api/solic/inbound/:monitoriaId/anexo/:anexoId", bridgeAuth, (req, res) => {
  const s = db.solicitacoes.find((x) => x.monitoriaId === req.params.monitoriaId);
  servirAnexo(res, s, req.params.anexoId);
});

// o comercial consulta o status das solicitações dele (poll) — ponte
app.get("/api/solic/status", bridgeAuth, (req, res) => {
  const ids = String(req.query.ids || "").split(",").map((x) => x.trim()).filter(Boolean);
  const set = new Set(ids);
  const out = db.solicitacoes
    .filter((s) => set.has(s.monitoriaId))
    .map((s) => ({ monitoriaId: s.monitoriaId, status: s.status, resposta: s.resposta, colaboradoraNome: s.colaboradoraNome, concluidoEm: s.concluidoEm, mensagens: s.mensagens || [] }));
  res.json({ solicitacoes: out });
});

// o comercial encaminha uma mensagem do vendedor para o chat do chamado (ponte)
app.post("/api/solic/inbound/:monitoriaId/mensagem", bridgeAuth, (req, res) => {
  const s = db.solicitacoes.find((x) => x.monitoriaId === req.params.monitoriaId);
  if (!s) return res.status(404).json({ error: "não encontrada" });
  const texto = String((req.body && req.body.texto) || "").trim().slice(0, 2000);
  const autorNome = String((req.body && req.body.autorNome) || "Vendedor").trim().slice(0, 80) || "Vendedor";
  const anexo = (req.body && req.body.anexo) ? salvarAnexoChat(s.id, req.body.anexo) : null;
  if (!texto && !anexo) return res.status(400).json({ error: "mensagem vazia" });
  if (!Array.isArray(s.mensagens)) s.mensagens = [];
  s.mensagens.push({ id: "m" + Date.now() + crypto.randomBytes(3).toString("hex"), autor: "vendedor", autorNome, texto, ts: Date.now(), ...(anexo ? { anexo } : {}) });
  saveDB(db);
  res.json({ mensagens: s.mensagens });
});

// ---- UI interna do Suporte ----
app.get("/api/solicitacoes", requireAuth, (req, res) => {
  const rows = [...db.solicitacoes].sort((a, b) => {
    const ord = { recebida: 0, em_atendimento: 1, concluida: 2 };
    if (ord[a.status] !== ord[b.status]) return ord[a.status] - ord[b.status];
    return (b.criadoEm || "").localeCompare(a.criadoEm || "");
  });
  res.json({ solicitacoes: rows });
});

app.post("/api/solicitacoes/:id/aceitar", requireAuth, (req, res) => {
  const s = db.solicitacoes.find((x) => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: "não encontrada" });
  s.status = "em_atendimento";
  s.colaboradoraId = req.user.id;
  s.colaboradoraNome = req.user.nome;
  s.aceitoEm = new Date().toISOString();
  saveDB(db);
  res.json({ solicitacao: s });
});

app.post("/api/solicitacoes/:id/concluir", requireAuth, (req, res) => {
  const s = db.solicitacoes.find((x) => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: "não encontrada" });
  s.resposta = (req.body?.resposta || "").trim();
  s.status = "concluida";
  if (!s.colaboradoraId) { s.colaboradoraId = req.user.id; s.colaboradoraNome = req.user.nome; }
  s.concluidoEm = new Date().toISOString();
  saveDB(db);
  res.json({ solicitacao: s });
});

app.post("/api/solicitacoes/:id/reabrir", requireAuth, (req, res) => {
  const s = db.solicitacoes.find((x) => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: "não encontrada" });
  s.status = s.colaboradoraId ? "em_atendimento" : "recebida";
  s.resposta = "";
  s.concluidoEm = null;
  saveDB(db);
  res.json({ solicitacao: s });
});

// suporte envia mensagem no chat do chamado (vai pro vendedor via sync da ponte)
app.post("/api/solicitacoes/:id/mensagem", requireAuth, (req, res) => {
  const s = db.solicitacoes.find((x) => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: "não encontrada" });
  const texto = String((req.body && req.body.texto) || "").trim().slice(0, 2000);
  const anexo = (req.body && req.body.anexo) ? salvarAnexoChat(s.id, req.body.anexo) : null;
  if (!texto && !anexo) return res.status(400).json({ error: "mensagem vazia" });
  if (!Array.isArray(s.mensagens)) s.mensagens = [];
  s.mensagens.push({ id: "m" + Date.now() + crypto.randomBytes(3).toString("hex"), autor: "suporte", autorNome: req.user.nome || "Suporte", texto, ts: Date.now(), ...(anexo ? { anexo } : {}) });
  saveDB(db);
  res.json({ solicitacao: s });
});

// suporte marca o chat como visto (zera o selo de não-lidas do lado dele)
app.post("/api/solicitacoes/:id/visto", requireAuth, (req, res) => {
  const s = db.solicitacoes.find((x) => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: "não encontrada" });
  s.suporteViu = Date.now();
  saveDB(db);
  res.json({ solicitacao: s });
});

// suporte exclui a solicitação (remove arquivos; o comercial percebe no sync e remove também)
app.delete("/api/solicitacoes/:id", requireAuth, (req, res) => {
  const i = db.solicitacoes.findIndex((x) => x.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: "não encontrada" });
  apagarAnexos(db.solicitacoes[i]);
  db.solicitacoes.splice(i, 1);
  saveDB(db);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// TASKS (tarefas com prazo) — a gerente atribui, a colaboradora vê as dela
// ---------------------------------------------------------------------------
app.get("/api/tasks", requireAuth, (req, res) => {
  // admin/quem vê todos: todas as tarefas; colaboradora: só as atribuídas a ela
  let rows = can(req, "ver_todos") ? db.tasks : db.tasks.filter((t) => t.responsavelId === req.user.id);
  rows = [...rows].sort((a, b) => {
    // não concluídas primeiro, depois por prazo
    if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
    return (a.prazo || "9999").localeCompare(b.prazo || "9999");
  });
  res.json({ tasks: rows });
});

app.post("/api/tasks", requireAuth, (req, res) => {
  // só admin (ou quem gerencia usuários) pode criar/atribuir tarefas
  if (!req.isAdmin && !can(req, "gerir_usuarios")) return res.status(403).json({ error: "sem permissão para atribuir tarefas" });
  const b = req.body;
  if (!b.titulo?.trim() || !b.responsavelId) return res.status(400).json({ error: "título e responsável são obrigatórios" });
  const task = {
    id: "t" + Date.now() + crypto.randomBytes(2).toString("hex"),
    titulo: b.titulo.trim(),
    descricao: b.descricao?.trim() || "",
    responsavelId: b.responsavelId,
    prazo: b.prazo || "",
    prioridade: b.prioridade || "media", // baixa | media | alta
    concluida: false,
    criadaPor: req.user.id,
    criadaEm: new Date().toISOString(),
    concluidaEm: null,
  };
  db.tasks.unshift(task);
  saveDB(db);
  res.json({ task });
});

app.put("/api/tasks/:id", requireAuth, (req, res) => {
  const t = db.tasks.find((x) => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: "não encontrada" });
  const b = req.body;
  const ehDono = req.isAdmin || can(req, "gerir_usuarios");
  const ehResponsavel = t.responsavelId === req.user.id;
  // a colaboradora responsável pode marcar concluída/desmarcar; o dono pode editar tudo
  if (b.concluida !== undefined && (ehResponsavel || ehDono)) {
    t.concluida = !!b.concluida;
    t.concluidaEm = b.concluida ? new Date().toISOString() : null;
  }
  if (ehDono) {
    if (b.titulo !== undefined) t.titulo = b.titulo.trim() || t.titulo;
    if (b.descricao !== undefined) t.descricao = b.descricao.trim();
    if (b.responsavelId !== undefined) t.responsavelId = b.responsavelId;
    if (b.prazo !== undefined) t.prazo = b.prazo;
    if (b.prioridade !== undefined) t.prioridade = b.prioridade;
  }
  if (!ehResponsavel && !ehDono) return res.status(403).json({ error: "sem permissão" });
  saveDB(db);
  res.json({ task: t });
});

app.delete("/api/tasks/:id", requireAuth, (req, res) => {
  if (!req.isAdmin && !can(req, "gerir_usuarios")) return res.status(403).json({ error: "sem permissão" });
  const t = db.tasks.find((x) => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: "não encontrada" });
  db.tasks = db.tasks.filter((x) => x.id !== req.params.id);
  saveDB(db);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// IA — análise de desempenho (chave protegida no servidor)
// ---------------------------------------------------------------------------
app.post("/api/analise", requireAuth, async (req, res) => {
  if (!can(req, "ia")) return res.status(403).json({ error: "sem permissão" });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "IA não configurada (defina ANTHROPIC_API_KEY no Railway)" });

  const users = db.users.filter((u) => u.ativo);
  const records = db.records;
  const colaboradoraId = req.body?.colaboradoraId || null;

  let prompt;
  if (colaboradoraId) {
    // ---- ANÁLISE INDIVIDUAL ----
    const alvo = db.users.find((u) => u.id === colaboradoraId);
    if (!alvo) return res.status(404).json({ error: "colaboradora não encontrada" });
    const resumoInd = buildIndividualPayload(records, db.tasks, alvo);
    prompt = `Você é um especialista em gestão de equipes de atendimento ao cliente / suporte ao aluno. Analise o desempenho INDIVIDUAL da colaboradora abaixo e produza um parecer em português do Brasil.

DADOS DA COLABORADORA:
${resumoInd}

SOLICITAÇÕES DO COMERCIAL atendidas por ela: ${solicDaColaboradora(db.solicitacoes, colaboradoraId)}

Retorne SOMENTE um JSON válido (sem markdown, sem crases) com esta estrutura exata:
{
  "individual": true,
  "nome": "nome exato da colaboradora",
  "avaliacao": "Excelente" | "Bom" | "Regular" | "Precisa atenção",
  "resumo": "2-3 frases sobre o desempenho geral dela, baseado nos números",
  "pontos_fortes": ["ponto forte 1", "ponto forte 2"],
  "pontos_melhoria": ["ponto a melhorar 1", "ponto a melhorar 2"],
  "sugestoes": ["sugestão prática e acionável 1", "sugestão 2", "sugestão 3"],
  "feedback_sugerido": "um parágrafo curto de feedback que a gerente poderia dar diretamente a ela, em tom construtivo"
}
Seja específico usando os números reais. Tom profissional, construtivo e acionável.`;
  } else {
    // ---- ANÁLISE DA EQUIPE (padrão) ----
    const resumo = buildAIPayload(records, users);
    prompt = `Você é um especialista em gestão de equipes de atendimento ao cliente / suporte ao aluno. Analise os dados de desempenho da equipe abaixo e produza um relatório gerencial em português do Brasil.

DADOS DA EQUIPE (período completo registrado):
${resumo}

SOLICITAÇÕES DO COMERCIAL (pedidos de suporte que os vendedores encaminharam — considere no parecer quem está absorvendo e resolvendo essa demanda):
${buildSolicPayload(db.solicitacoes, users)}

Retorne SOMENTE um JSON válido (sem markdown, sem crases) com esta estrutura exata:
{
  "panorama": "2-3 frases sobre a situação geral do setor",
  "destaque": "nome da colaboradora com melhor desempenho e por quê (1 frase)",
  "atencao": "nome da colaboradora que precisa de mais apoio e por quê, de forma construtiva (1 frase), ou null se todas vão bem",
  "colaboradoras": [
    { "nome": "nome exato", "avaliacao": "Excelente" | "Bom" | "Regular" | "Precisa atenção", "leitura": "1-2 frases sobre como ela está, baseado nos números", "sugestoes": ["sugestão prática 1", "sugestão prática 2"] }
  ],
  "acoes_setor": ["ação recomendada para o setor 1", "ação 2", "ação 3"]
}
Seja específico usando os números reais. Tom profissional, construtivo e acionável.`;
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 2000, messages: [{ role: "user", content: prompt }] }),
    });
    const data = await r.json();
    if (data.error) return res.status(502).json({ error: data.error.message || "erro na IA" });
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    res.json({ result: JSON.parse(clean) });
  } catch (e) {
    console.error("Erro IA:", e);
    res.status(502).json({ error: "não foi possível gerar a análise agora" });
  }
});

function buildSolicPayload(solicitacoes, users) {
  const nomeDe = (id) => (users.find((u) => u.id === id) || {}).nome || "—";
  const total = (solicitacoes || []).length;
  const st = { recebida: 0, em_atendimento: 0, concluida: 0 };
  const porColab = {};
  (solicitacoes || []).forEach((s) => {
    st[s.status] = (st[s.status] || 0) + 1;
    if (s.colaboradoraId) {
      const k = s.colaboradoraId;
      porColab[k] = porColab[k] || { nome: s.colaboradoraNome || nomeDe(k), aceitas: 0, concluidas: 0 };
      porColab[k].aceitas += 1;
      if (s.status === "concluida") porColab[k].concluidas += 1;
    }
  });
  let txt = `Total recebidas do comercial: ${total} | Aguardando: ${st.recebida || 0} | Em atendimento: ${st.em_atendimento || 0} | Concluídas: ${st.concluida || 0}\n`;
  const linhas = Object.values(porColab).map((c) => `- ${c.nome}: ${c.aceitas} atendidas, ${c.concluidas} concluídas`);
  txt += "Por colaboradora:\n" + (linhas.length ? linhas.join("\n") : "- (nenhuma atendida ainda)");
  return txt;
}

function solicDaColaboradora(solicitacoes, id) {
  const dela = (solicitacoes || []).filter((s) => s.colaboradoraId === id);
  const concl = dela.filter((s) => s.status === "concluida").length;
  return `${dela.length} atendidas (${concl} concluídas)`;
}

function buildAIPayload(records, users) {
  // gestores (gerente/diretor) não entram na análise de produtividade
  const equipe = users.filter((u) => !u.excluirAnalise && u.role !== "admin");
  const lines = equipe.map((u) => {
    const rs = records.filter((r) => r.colaboradoraId === u.id);
    if (rs.length === 0) return `- ${u.nome || u.login}: nenhum atendimento registrado`;
    const resolv = rs.filter((r) => r.status === "resolvido").length;
    const and = rs.filter((r) => r.status === "andamento").length;
    const pen = rs.filter((r) => r.status === "pendente").length;
    const taxa = Math.round((resolv / rs.length) * 100);
    const assuntos = {};
    rs.forEach((r) => { const k = r.assunto || "outros"; assuntos[k] = (assuntos[k] || 0) + 1; });
    const topA = Object.entries(assuntos).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([a, n]) => `${a} (${n})`).join(", ");
    return `- ${u.nome || u.login}: ${rs.length} atendimentos | ${resolv} resolvidos, ${and} em andamento, ${pen} pendentes | taxa de resolução ${taxa}% | principais assuntos: ${topA}`;
  });
  // total considera só atendimentos da equipe operacional
  const idsEquipe = new Set(equipe.map((u) => u.id));
  const recordsEquipe = records.filter((r) => idsEquipe.has(r.colaboradoraId));
  const total = recordsEquipe.length;
  const totalRes = recordsEquipe.filter((r) => r.status === "resolvido").length;
  return `Total geral: ${total} atendimentos | Taxa de resolução do setor: ${total ? Math.round((totalRes / total) * 100) : 0}%\n\nPor colaboradora:\n${lines.join("\n")}`;
}

function buildIndividualPayload(records, tasks, alvo) {
  const rs = records.filter((r) => r.colaboradoraId === alvo.id);
  const resolv = rs.filter((r) => r.status === "resolvido").length;
  const and = rs.filter((r) => r.status === "andamento").length;
  const pen = rs.filter((r) => r.status === "pendente").length;
  const taxa = rs.length ? Math.round((resolv / rs.length) * 100) : 0;
  const assuntos = {};
  rs.forEach((r) => { const k = r.assunto || "outros"; assuntos[k] = (assuntos[k] || 0) + 1; });
  const topA = Object.entries(assuntos).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([a, n]) => `${a} (${n})`).join(", ") || "nenhum";

  // tarefas atribuídas a ela
  const ts = (tasks || []).filter((t) => t.responsavelId === alvo.id);
  const tConcl = ts.filter((t) => t.concluida).length;
  const hoje = new Date().toISOString().slice(0, 10);
  const tAtrasadas = ts.filter((t) => !t.concluida && t.prazo && t.prazo < hoje).length;

  // média geral do setor para comparação
  const totalSetor = records.length;
  const resSetor = records.filter((r) => r.status === "resolvido").length;
  const taxaSetor = totalSetor ? Math.round((resSetor / totalSetor) * 100) : 0;

  return `Nome: ${alvo.nome || alvo.login}
Atendimentos: ${rs.length} no total
- Resolvidos: ${resolv}
- Em andamento: ${and}
- Pendentes: ${pen}
- Taxa de resolução individual: ${taxa}%
Principais assuntos que ela atende: ${topA}

Tarefas atribuídas: ${ts.length} (${tConcl} concluídas, ${tAtrasadas} atrasadas)

Comparação com o setor: a taxa de resolução média do setor é ${taxaSetor}%. A dela é ${taxa}%.`;
}

// ---------------------------------------------------------------------------
// WHATSAPP (integração com Evolution API)
// ---------------------------------------------------------------------------

// helper: normaliza um número de telefone (tira sufixos do whatsapp)
function normalizeJid(jid) {
  if (!jid) return "";
  return String(jid).split("@")[0].split(":")[0];
}

// ---- WEBHOOK: a Evolution chama aqui quando chega/sai mensagem ----
// Não exige login (é a Evolution chamando), mas valida um token simples na URL.
app.post("/api/wa/webhook/:token", (req, res) => {
  // valida o token configurado (evita qualquer um chamar)
  const expected = db.waConfig?.webhookToken;
  if (expected && req.params.token !== expected) {
    return res.status(403).json({ error: "token inválido" });
  }

  try {
    const body = req.body || {};
    const event = body.event || body.type || "";
    const instance = body.instance || body.instanceName || "";

    // a Evolution manda eventos de mensagem como "messages.upsert"
    if (event === "messages.upsert" || event === "messages.update" || body.data?.message) {
      const data = body.data || {};
      const key = data.key || {};
      const remoteJid = key.remoteJid || "";
      const numero = normalizeJid(remoteJid);
      const ehGrupo = remoteJid.includes("@g.us");
      // ignora status/broadcast
      if (numero && !remoteJid.includes("status@broadcast")) {
        const fromMe = !!key.fromMe;
        // extrai o texto da mensagem (vários formatos possíveis)
        const msg = data.message || {};
        // detecta o tipo de mídia
        let tipoMidia = null;
        if (msg.audioMessage) tipoMidia = "audio";
        else if (msg.imageMessage) tipoMidia = "image";
        else if (msg.videoMessage) tipoMidia = "video";
        else if (msg.documentMessage) tipoMidia = "document";
        else if (msg.stickerMessage) tipoMidia = "sticker";
        const texto =
          msg.conversation ||
          msg.extendedTextMessage?.text ||
          msg.imageMessage?.caption ||
          msg.videoMessage?.caption ||
          (tipoMidia === "audio" ? "🎤 Áudio" : "") ||
          (tipoMidia === "image" ? "📷 Imagem" : "") ||
          (tipoMidia === "video" ? "🎥 Vídeo" : "") ||
          (tipoMidia === "document" ? "📄 Documento" : "") ||
          (tipoMidia === "sticker" ? "Figurinha" : "") ||
          "";
        const pushName = data.pushName || "";
        const ts = (data.messageTimestamp ? Number(data.messageTimestamp) * 1000 : Date.now());
        // chave única: junta instância + número (mesma pessoa em WhatsApps diferentes = conversas separadas)
        const chaveId = `${instance || "?"}::${numero}`;

        if (!db.waChats[chaveId]) {
          db.waChats[chaveId] = { id: chaveId, numero, nome: pushName || numero, instance, ehGrupo, mensagens: [], atualizadoEm: ts, naoLidas: 0 };
        }
        const chat = db.waChats[chaveId];
        if (pushName && !fromMe) chat.nome = pushName;
        chat.instance = instance || chat.instance;
        chat.ehGrupo = ehGrupo;
        chat.numero = numero;
        // guarda a mensagem; se for mídia, guarda o messageId pra baixar depois
        const novaMsg = { id: key.id || (Date.now() + "-" + Math.random()), fromMe, texto, ts };
        if (tipoMidia && tipoMidia !== "sticker") {
          novaMsg.tipoMidia = tipoMidia;
          novaMsg.mediaMsgId = key.id;       // usado pra baixar a mídia da Evolution
          novaMsg.mimetype = msg[`${tipoMidia}Message`]?.mimetype || "";
          if (tipoMidia === "document") novaMsg.fileName = msg.documentMessage?.fileName || "documento";
        }
        chat.mensagens.push(novaMsg);
        // mantém só as últimas 200 mensagens por conversa (evita crescer demais)
        if (chat.mensagens.length > 200) chat.mensagens = chat.mensagens.slice(-200);
        chat.atualizadoEm = ts;
        if (!fromMe) chat.naoLidas = (chat.naoLidas || 0) + 1;
        saveDB(db);
      }
    }
    res.json({ ok: true });
  } catch (e) {
    console.error("Erro no webhook WA:", e.message);
    res.json({ ok: true }); // sempre 200 pra Evolution não ficar reenviando
  }
});

// ---- CONFIG: salvar dados da conexão (admin) ----
app.get("/api/wa/config", requireAuth, (req, res) => {
  if (!req.isAdmin && !can(req, "gerir_whatsapp")) return res.status(403).json({ error: "sem permissão" });
  const c = db.waConfig || {};
  res.json({ config: {
    url: c.url || "",
    webhookToken: c.webhookToken || "",
    temApiKey: !!c.apiKey,
    conectado: !!c.url,
    instancias: c.instancias || [],   // [{ instance, colaboradoraId, colaboradoraNome }]
  } });
});

app.put("/api/wa/config", requireAuth, (req, res) => {
  if (!req.isAdmin && !can(req, "gerir_whatsapp")) return res.status(403).json({ error: "sem permissão" });
  const { url, apiKey, instancias } = req.body;
  db.waConfig = db.waConfig || {};
  if (url !== undefined) db.waConfig.url = String(url).trim().replace(/\/$/, "");
  if (apiKey !== undefined && apiKey) db.waConfig.apiKey = String(apiKey).trim();
  if (Array.isArray(instancias)) {
    // limpa e normaliza a lista de instâncias
    db.waConfig.instancias = instancias
      .filter((i) => i && i.instance && String(i.instance).trim())
      .map((i) => ({
        instance: String(i.instance).trim(),
        colaboradoraId: i.colaboradoraId || "",
        colaboradoraNome: i.colaboradoraNome || "",
      }));
  }
  // gera um token de webhook se ainda não tiver
  if (!db.waConfig.webhookToken) db.waConfig.webhookToken = crypto.randomBytes(12).toString("hex");
  // guarda a URL pública do próprio sistema (para montar o webhook automaticamente)
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (host) db.waConfig.publicUrl = `${proto}://${host}`;
  saveDB(db);
  res.json({ ok: true, webhookToken: db.waConfig.webhookToken });
});

// helper: quais instâncias o usuário logado pode ver
// - admin (gerente) ou quem gerencia whatsapp: vê todas
// - colaboradora comum: só as instâncias vinculadas a ela
function instanciasVisiveis(req) {
  const todas = db.waConfig?.instancias || [];
  if (req.isAdmin || can(req, "gerir_whatsapp")) return null; // null = todas
  return todas.filter((i) => String(i.colaboradoraId) === String(req.user.id)).map((i) => i.instance);
}

// ---- listar conversas (com filtro opcional por instância) ----
app.get("/api/wa/chats", requireAuth, (req, res) => {
  const filtroInstance = req.query.instance || "";   // filtra por atendente
  const permitidas = instanciasVisiveis(req);          // null = todas
  const instMap = {};
  (db.waConfig?.instancias || []).forEach((i) => { instMap[i.instance] = i.colaboradoraNome || i.instance; });
  let chats = Object.values(db.waChats || {})
    .map((c) => ({
      id: c.id || `${c.instance || "?"}::${c.numero}`,
      numero: c.numero,
      nome: c.nome,
      instance: c.instance,
      ehGrupo: !!c.ehGrupo,
      atendente: instMap[c.instance] || c.instance || "",   // nome da colaboradora
      atualizadoEm: c.atualizadoEm,
      naoLidas: c.naoLidas || 0,
      ultima: c.mensagens?.[c.mensagens.length - 1]?.texto || "",
    }))
    .sort((a, b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0));
  // PRIVACIDADE: colaboradora só vê conversas das instâncias dela
  if (permitidas !== null) chats = chats.filter((c) => permitidas.includes(c.instance));
  if (filtroInstance) chats = chats.filter((c) => c.instance === filtroInstance);
  // monta a lista de instâncias para o filtro
  let instParaFiltro;
  if (permitidas === null) {
    // gerente: mostra só instâncias cadastradas na config + as que REALMENTE têm conversa
    const cadastradas = db.waConfig?.instancias || [];
    const instComConversa = new Set(Object.values(db.waChats || {}).map((c) => c.instance).filter(Boolean));
    const jaListadas = new Set();
    instParaFiltro = [];
    // primeiro as cadastradas (com nome bonito)
    cadastradas.forEach((i) => {
      if (!jaListadas.has(i.instance)) { jaListadas.add(i.instance); instParaFiltro.push(i); }
    });
    // depois as que têm conversa mas não estão cadastradas
    instComConversa.forEach((inst) => {
      if (!jaListadas.has(inst)) { jaListadas.add(inst); instParaFiltro.push({ instance: inst, colaboradoraNome: inst }); }
    });
  } else {
    instParaFiltro = (db.waConfig?.instancias || []).filter((i) => permitidas.includes(i.instance));
  }
  res.json({ chats, instancias: instParaFiltro });
});

// ---- ver mensagens de uma conversa (pela chave id = instancia::numero) ----
app.get("/api/wa/chats/:id", requireAuth, (req, res) => {
  const id = decodeURIComponent(req.params.id);
  let chat = db.waChats?.[id];
  // fallback: se não achou pela chave exata, tenta pelo id interno ou pelo número
  if (!chat) {
    chat = Object.values(db.waChats || {}).find((c) => c.id === id || c.numero === id);
  }
  if (!chat) return res.status(404).json({ error: "conversa não encontrada" });
  // PRIVACIDADE: bloqueia abrir conversa de instância que não é da pessoa
  const permitidas = instanciasVisiveis(req);
  if (permitidas !== null && !permitidas.includes(chat.instance)) {
    return res.status(403).json({ error: "sem acesso a esta conversa" });
  }
  // zera não-lidas ao abrir
  chat.naoLidas = 0;
  saveDB(db);
  res.json({ chat });
});

// ---- limpar instâncias "fantasmas" do filtro (que não têm conversa nem estão conectadas) ----
app.post("/api/wa/limpar-fantasmas", requireAuth, (req, res) => {
  if (!req.isAdmin && !can(req, "gerir_whatsapp")) return res.status(403).json({ error: "sem permissão" });
  // remove da config as instâncias que não têm nenhuma conversa
  const comConversa = new Set(Object.values(db.waChats || {}).map((c) => c.instance).filter(Boolean));
  if (db.waConfig?.instancias) {
    db.waConfig.instancias = db.waConfig.instancias.filter((i) => comConversa.has(i.instance));
    saveDB(db);
  }
  res.json({ ok: true });
});

// ---- minha instância (para a colaboradora conectar o próprio WhatsApp) ----
app.get("/api/wa/minha-instancia", requireAuth, (req, res) => {
  const c = db.waConfig || {};
  const minhas = (c.instancias || []).filter((i) => String(i.colaboradoraId) === String(req.user.id));
  res.json({
    configurado: !!(c.url && c.apiKey),    // a gerente já configurou a Evolution?
    instancias: minhas,                      // normalmente 1, mas pode ter mais
  });
});

// ---- criar instância + obter QR code (conecta um WhatsApp pelo sistema) ----
app.post("/api/wa/instance/connect", requireAuth, async (req, res) => {
  const { instance } = req.body;
  const c = db.waConfig || {};
  if (!c.url || !c.apiKey) return res.status(400).json({ error: "A conexão ainda não foi configurada pela gerente." });
  if (!instance || !String(instance).trim()) return res.status(400).json({ error: "informe o nome da instância" });
  const nome = String(instance).trim();
  // PERMISSÃO: gerente conecta qualquer uma; colaboradora só a dela
  const ehGerente = req.isAdmin || can(req, "gerir_whatsapp");
  if (!ehGerente) {
    const minhas = (c.instancias || []).filter((i) => String(i.colaboradoraId) === String(req.user.id)).map((i) => i.instance);
    if (!minhas.includes(nome)) {
      return res.status(403).json({ error: "você só pode conectar o seu próprio WhatsApp" });
    }
  }
  // monta a URL do webhook (pra Evolution já avisar o sistema sozinha)
  const base = c.publicUrl || "";
  const webhookUrl = (base && c.webhookToken) ? `${base}/api/wa/webhook/${c.webhookToken}` : "";

  try {
    // 1) tenta criar a instância (se já existir, a Evolution retorna erro, e a gente segue pro connect)
    const criarPayload = {
      instanceName: nome,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
      groupsIgnore: true,
    };
    if (webhookUrl) {
      criarPayload.webhook = { url: webhookUrl, byEvents: false, events: ["MESSAGES_UPSERT"] };
    }
    let createData = null;
    const rc = await fetch(`${c.url}/instance/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": c.apiKey },
      body: JSON.stringify(criarPayload),
    });
    createData = await rc.json().catch(() => ({}));
    // se veio o QR já na criação, devolve direto
    const qrFromCreate = createData?.qrcode?.base64 || null;
    if (qrFromCreate) {
      // garante o webhook setado (algumas versões ignoram no create)
      if (webhookUrl) await setWebhook(c, nome, webhookUrl);
      return res.json({ qr: qrFromCreate, status: "connecting" });
    }

    // 2) senão, chama o connect pra pegar o QR
    if (webhookUrl) await setWebhook(c, nome, webhookUrl);
    const rq = await fetch(`${c.url}/instance/connect/${nome}`, {
      method: "GET",
      headers: { "apikey": c.apiKey },
    });
    const qrData = await rq.json().catch(() => ({}));
    const qr = qrData?.base64 || qrData?.qrcode?.base64 || null;
    if (qr) return res.json({ qr, status: "connecting" });

    // já conectado?
    if (qrData?.instance?.state === "open" || createData?.instance?.state === "open") {
      return res.json({ qr: null, status: "open" });
    }
    return res.json({ qr: null, status: "connecting", aviso: "QR não retornado ainda, tente novamente em alguns segundos." });
  } catch (e) {
    console.error("Erro ao conectar instância:", e.message);
    res.status(502).json({ error: "não foi possível falar com a Evolution" });
  }
});

// helper: configura o webhook de uma instância na Evolution
async function setWebhook(c, nome, webhookUrl) {
  try {
    await fetch(`${c.url}/webhook/set/${nome}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": c.apiKey },
      body: JSON.stringify({ webhook: { enabled: true, url: webhookUrl, webhookByEvents: false, events: ["MESSAGES_UPSERT"] } }),
    });
  } catch (e) { /* não bloqueia o fluxo */ }
}

// ---- checar status de conexão de uma instância ----
app.get("/api/wa/instance/status/:nome", requireAuth, async (req, res) => {
  const c = db.waConfig || {};
  if (!c.url || !c.apiKey) return res.status(400).json({ error: "não configurado" });
  try {
    const r = await fetch(`${c.url}/instance/connectionState/${req.params.nome}`, {
      method: "GET", headers: { "apikey": c.apiKey },
    });
    const data = await r.json().catch(() => ({}));
    const state = data?.instance?.state || data?.state || "unknown";
    res.json({ state });   // "open" = conectado, "connecting", "close"
  } catch (e) {
    res.json({ state: "unknown" });
  }
});

// ---- baixar mídia de uma mensagem (áudio/imagem/vídeo/doc) em base64 ----
app.post("/api/wa/media", requireAuth, async (req, res) => {
  const { id, mediaMsgId } = req.body;
  const c = db.waConfig || {};
  if (!c.url || !c.apiKey) return res.status(400).json({ error: "não configurado" });
  const chat = id ? db.waChats?.[id] : null;
  if (!chat) return res.status(404).json({ error: "conversa não encontrada" });
  const permitidas = instanciasVisiveis(req);
  if (permitidas !== null && !permitidas.includes(chat.instance)) {
    return res.status(403).json({ error: "sem acesso" });
  }
  // acha a mensagem com aquele mediaMsgId
  const msg = chat.mensagens.find((m) => m.mediaMsgId === mediaMsgId);
  if (!msg) return res.status(404).json({ error: "mídia não encontrada" });
  // se já baixamos antes, devolve do cache
  if (msg.mediaBase64) return res.json({ base64: msg.mediaBase64, mimetype: msg.mimetype, tipoMidia: msg.tipoMidia });
  try {
    // pede a mídia decodificada pra Evolution
    const r = await fetch(`${c.url}/chat/getBase64FromMediaMessage/${chat.instance}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": c.apiKey },
      body: JSON.stringify({ message: { key: { id: mediaMsgId } }, convertToMp4: false }),
    });
    const data = await r.json().catch(() => ({}));
    const base64 = data?.base64 || data?.media || "";
    if (!base64) return res.status(502).json({ error: "não foi possível baixar a mídia" });
    const mimetype = data?.mimetype || msg.mimetype || "application/octet-stream";
    // guarda no cache (só áudio/imagem pequenos; evita inchar o banco com vídeo grande)
    if (msg.tipoMidia === "audio" || msg.tipoMidia === "image") {
      msg.mediaBase64 = base64;
      msg.mimetype = mimetype;
      saveDB(db);
    }
    res.json({ base64, mimetype, tipoMidia: msg.tipoMidia });
  } catch (e) {
    console.error("Erro ao baixar mídia:", e.message);
    res.status(502).json({ error: "erro ao baixar a mídia" });
  }
});

// ---- iniciar uma nova conversa (manda 1ª mensagem para um número novo) ----
app.post("/api/wa/nova-conversa", requireAuth, async (req, res) => {
  const { instance, numero, texto } = req.body;
  const c = db.waConfig || {};
  if (!c.url || !c.apiKey) return res.status(400).json({ error: "WhatsApp não configurado" });
  if (!numero || !texto?.trim()) return res.status(400).json({ error: "número e mensagem são obrigatórios" });
  // descobre a instância: a escolhida, ou a única da colaboradora, ou a 1ª
  let inst = instance;
  const permitidas = instanciasVisiveis(req);
  if (permitidas !== null) {
    // colaboradora: força usar uma instância dela
    if (!inst || !permitidas.includes(inst)) inst = permitidas[0];
  }
  if (!inst) inst = c.instancias?.[0]?.instance;
  if (!inst) return res.status(400).json({ error: "nenhuma instância disponível" });
  // limpa o número (só dígitos)
  const num = String(numero).replace(/\D/g, "");
  if (num.length < 10) return res.status(400).json({ error: "número inválido — use DDD + número (ex: 5544999998888)" });
  try {
    const r = await fetch(`${c.url}/message/sendText/${inst}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": c.apiKey },
      body: JSON.stringify({ number: num, text: texto.trim() }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: data?.message || "não foi possível enviar (número tem WhatsApp?)" });
    // cria/atualiza a conversa no sistema
    const chaveId = `${inst}::${num}`;
    if (!db.waChats[chaveId]) {
      db.waChats[chaveId] = { id: chaveId, numero: num, nome: num, instance: inst, ehGrupo: false, mensagens: [], atualizadoEm: Date.now(), naoLidas: 0 };
    }
    db.waChats[chaveId].mensagens.push({ id: Date.now() + "-out", fromMe: true, texto: texto.trim(), ts: Date.now() });
    db.waChats[chaveId].atualizadoEm = Date.now();
    saveDB(db);
    res.json({ ok: true, id: chaveId });
  } catch (e) {
    console.error("Erro ao iniciar conversa:", e.message);
    res.status(502).json({ error: "não foi possível iniciar a conversa" });
  }
});

// ---- desconectar uma instância (logout — desliga o WhatsApp, dá pra reconectar) ----
app.post("/api/wa/instance/logout/:nome", requireAuth, async (req, res) => {
  if (!req.isAdmin && !can(req, "gerir_whatsapp")) return res.status(403).json({ error: "sem permissão" });
  const c = db.waConfig || {};
  if (!c.url || !c.apiKey) return res.status(400).json({ error: "não configurado" });
  try {
    const r = await fetch(`${c.url}/instance/logout/${req.params.nome}`, {
      method: "DELETE", headers: { "apikey": c.apiKey },
    });
    await r.json().catch(() => ({}));
    res.json({ ok: true });
  } catch (e) {
    console.error("Erro ao desconectar:", e.message);
    res.status(502).json({ error: "não foi possível desconectar" });
  }
});

// ---- excluir uma instância de vez (delete) ----
app.delete("/api/wa/instance/:nome", requireAuth, async (req, res) => {
  if (!req.isAdmin && !can(req, "gerir_whatsapp")) return res.status(403).json({ error: "sem permissão" });
  const c = db.waConfig || {};
  if (!c.url || !c.apiKey) return res.status(400).json({ error: "não configurado" });
  const nome = req.params.nome;
  try {
    // tenta logout antes (algumas versões exigem desconectar antes de excluir)
    try {
      await fetch(`${c.url}/instance/logout/${nome}`, { method: "DELETE", headers: { "apikey": c.apiKey } });
    } catch {}
    const r = await fetch(`${c.url}/instance/delete/${nome}`, {
      method: "DELETE", headers: { "apikey": c.apiKey },
    });
    await r.json().catch(() => ({}));
    // remove a instância da config do sistema também
    if (db.waConfig?.instancias) {
      db.waConfig.instancias = db.waConfig.instancias.filter((i) => i.instance !== nome);
      saveDB(db);
    }
    res.json({ ok: true });
  } catch (e) {
    console.error("Erro ao excluir instância:", e.message);
    res.status(502).json({ error: "não foi possível excluir" });
  }
});

// ---- listar TODAS as instâncias que existem na Evolution (não só as da config) ----
app.get("/api/wa/instancias-evolution", requireAuth, async (req, res) => {
  if (!req.isAdmin && !can(req, "gerir_whatsapp")) return res.status(403).json({ error: "sem permissão" });
  const c = db.waConfig || {};
  if (!c.url || !c.apiKey) return res.json({ instancias: [] });
  try {
    const r = await fetch(`${c.url}/instance/fetchInstances`, {
      method: "GET", headers: { "apikey": c.apiKey },
    });
    const data = await r.json().catch(() => []);
    // a Evolution pode devolver formatos diferentes; normaliza
    const lista = (Array.isArray(data) ? data : (data?.instances || [])).map((it) => {
      const inst = it.instance || it;
      const nome = inst.instanceName || inst.name || it.name || "";
      const estado = inst.state || inst.connectionStatus || it.connectionStatus || "unknown";
      return { instance: nome, state: estado };
    }).filter((i) => i.instance);
    res.json({ instancias: lista });
  } catch (e) {
    console.error("Erro ao listar instâncias da Evolution:", e.message);
    res.json({ instancias: [] });
  }
});

// ---- apagar TODAS as conversas do sistema (não mexe na Evolution) ----
app.post("/api/wa/limpar-conversas", requireAuth, (req, res) => {
  if (!req.isAdmin && !can(req, "gerir_whatsapp")) return res.status(403).json({ error: "sem permissão" });
  db.waChats = {};
  saveDB(db);
  res.json({ ok: true });
});

// ---- enviar mensagem (pela Evolution) ----
app.post("/api/wa/send", requireAuth, async (req, res) => {
  const { id, numero, texto } = req.body;
  const c = db.waConfig || {};
  if (!c.url || !c.apiKey) return res.status(400).json({ error: "WhatsApp não configurado" });
  if (!texto?.trim()) return res.status(400).json({ error: "texto obrigatório" });
  // localiza a conversa pela chave id (instancia::numero)
  const chatExistente = id ? db.waChats?.[id] : null;
  const numeroDestino = chatExistente?.numero || numero;
  const instance = chatExistente?.instance || (c.instancias?.[0]?.instance) || "";
  if (!numeroDestino) return res.status(400).json({ error: "número não encontrado" });
  if (!instance) return res.status(400).json({ error: "nenhuma instância configurada" });
  // PRIVACIDADE: colaboradora só pode enviar por instância dela
  const permitidas = instanciasVisiveis(req);
  if (permitidas !== null && !permitidas.includes(instance)) {
    return res.status(403).json({ error: "sem acesso a esta conversa" });
  }
  // para grupos, o "número" precisa do sufixo @g.us
  const ehGrupo = chatExistente?.ehGrupo;
  const destinoFinal = ehGrupo ? `${numeroDestino}@g.us` : numeroDestino;
  try {
    const r = await fetch(`${c.url}/message/sendText/${instance}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": c.apiKey },
      body: JSON.stringify({ number: destinoFinal, text: texto.trim() }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: data?.message || "falha ao enviar" });
    // registra na conversa
    if (chatExistente) {
      chatExistente.mensagens.push({ id: Date.now() + "-out", fromMe: true, texto: texto.trim(), ts: Date.now() });
      chatExistente.atualizadoEm = Date.now();
      saveDB(db);
    }
    res.json({ ok: true });
  } catch (e) {
    console.error("Erro ao enviar WA:", e.message);
    res.status(502).json({ error: "não foi possível enviar agora" });
  }
});

// ---- enviar mídia (imagem / documento / vídeo) em base64 ----
app.post("/api/wa/send-media", requireAuth, async (req, res) => {
  const { id, base64, mediatype, mimetype, filename, caption } = req.body;
  const c = db.waConfig || {};
  if (!c.url || !c.apiKey) return res.status(400).json({ error: "WhatsApp não configurado" });
  const chatExistente = id ? db.waChats?.[id] : null;
  if (!chatExistente) return res.status(400).json({ error: "conversa não encontrada" });
  const instance = chatExistente.instance;
  const permitidas = instanciasVisiveis(req);
  if (permitidas !== null && !permitidas.includes(instance)) {
    return res.status(403).json({ error: "sem acesso a esta conversa" });
  }
  const destino = chatExistente.ehGrupo ? `${chatExistente.numero}@g.us` : chatExistente.numero;
  // base64 pode vir como "data:image/png;base64,XXXX" — tira o prefixo
  const b64 = String(base64 || "").includes(",") ? String(base64).split(",")[1] : base64;
  try {
    const r = await fetch(`${c.url}/message/sendMedia/${instance}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": c.apiKey },
      body: JSON.stringify({
        number: destino,
        mediatype: mediatype || "document",   // image | video | document
        mimetype: mimetype || "application/octet-stream",
        media: b64,
        fileName: filename || "arquivo",
        caption: caption || "",
      }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: data?.message || "falha ao enviar arquivo" });
    const rotulo = mediatype === "image" ? "📷 Imagem" : mediatype === "video" ? "🎥 Vídeo" : "📄 " + (filename || "Documento");
    chatExistente.mensagens.push({ id: Date.now() + "-media", fromMe: true, texto: caption ? `${rotulo} — ${caption}` : rotulo, ts: Date.now() });
    chatExistente.atualizadoEm = Date.now();
    saveDB(db);
    res.json({ ok: true });
  } catch (e) {
    console.error("Erro ao enviar mídia:", e.message);
    res.status(502).json({ error: "não foi possível enviar o arquivo" });
  }
});

// ---- enviar áudio (gravação) em base64 ----
app.post("/api/wa/send-audio", requireAuth, async (req, res) => {
  const { id, base64 } = req.body;
  const c = db.waConfig || {};
  if (!c.url || !c.apiKey) return res.status(400).json({ error: "WhatsApp não configurado" });
  const chatExistente = id ? db.waChats?.[id] : null;
  if (!chatExistente) return res.status(400).json({ error: "conversa não encontrada" });
  const instance = chatExistente.instance;
  const permitidas = instanciasVisiveis(req);
  if (permitidas !== null && !permitidas.includes(instance)) {
    return res.status(403).json({ error: "sem acesso a esta conversa" });
  }
  const destino = chatExistente.ehGrupo ? `${chatExistente.numero}@g.us` : chatExistente.numero;
  const b64 = String(base64 || "").includes(",") ? String(base64).split(",")[1] : base64;
  try {
    const r = await fetch(`${c.url}/message/sendWhatsAppAudio/${instance}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": c.apiKey },
      body: JSON.stringify({ number: destino, audio: b64 }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: data?.message || "falha ao enviar áudio" });
    chatExistente.mensagens.push({ id: Date.now() + "-audio", fromMe: true, texto: "🎤 Áudio", ts: Date.now() });
    chatExistente.atualizadoEm = Date.now();
    saveDB(db);
    res.json({ ok: true });
  } catch (e) {
    console.error("Erro ao enviar áudio:", e.message);
    res.status(502).json({ error: "não foi possível enviar o áudio" });
  }
});

// ---------------------------------------------------------------------------
// Servir o frontend buildado
// ---------------------------------------------------------------------------
const distPath = join(ROOT, "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) return res.status(404).json({ error: "rota não encontrada" });
    res.sendFile(join(distPath, "index.html"));
  });
}

// inicia tudo (espera volume → carrega banco → cria admin → sobe servidor)
iniciar();
