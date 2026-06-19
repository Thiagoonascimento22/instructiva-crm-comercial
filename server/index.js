import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { instalarCanalOficial } from "./oficial.js";

// horário comercial / dias da semana são calculados no fuso de Brasília
process.env.TZ = process.env.TZ || "America/Sao_Paulo";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "40mb" }));

/* ============================================================
   BANCO EM ARQUIVO JSON (com espera do volume do Railway)
   ============================================================ */
const DB_PATH = process.env.DB_PATH || "/data/crm.json";
const MEDIA_DIR = path.join(path.dirname(DB_PATH), "media");
function garantirPastaMidia() {
  try { fs.mkdirSync(MEDIA_DIR, { recursive: true }); } catch (_) {}
}
// nome de arquivo seguro a partir do id da mensagem
function nomeArquivo(mid) { return String(mid || "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120); }
function extDeMime(m) {
  m = String(m || "").toLowerCase();
  if (m.includes("ogg")) return "ogg";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("mp4") || m.includes("m4a")) return m.includes("audio") ? "m4a" : "mp4";
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("pdf")) return "pdf";
  return "bin";
}

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

// Horário de atendimento por dia da semana (0=Dom ... 6=Sáb)
function horarioPadrao() {
  const dias = {};
  for (let d = 0; d <= 6; d++) {
    dias[d] = {
      on: d >= 1 && d <= 5, // Seg-Sex ligados por padrão
      inicio: "08:00",
      fim: "18:00",
      almocoIni: "",
      almocoFim: "",
    };
  }
  return { enabled: false, dias };
}
// Converte qualquer formato (antigo array, ou faltando dias) pro formato por dia
function normalizaHorario(h) {
  const base = horarioPadrao();
  if (!h || typeof h !== "object") return base;
  base.enabled = !!h.enabled;
  if (h.dias && !Array.isArray(h.dias) && typeof h.dias === "object") {
    for (let d = 0; d <= 6; d++) {
      const x = h.dias[d] || h.dias[String(d)] || {};
      base.dias[d] = {
        on: !!x.on,
        inicio: typeof x.inicio === "string" && x.inicio ? x.inicio : "08:00",
        fim: typeof x.fim === "string" && x.fim ? x.fim : "18:00",
        almocoIni: typeof x.almocoIni === "string" ? x.almocoIni : "",
        almocoFim: typeof x.almocoFim === "string" ? x.almocoFim : "",
      };
    }
  } else {
    // formato antigo: { dias:[1,2,3,4,5], inicio, fim, almocoIni, almocoFim }
    const ativos = Array.isArray(h.dias) ? h.dias.map(Number) : [1, 2, 3, 4, 5];
    for (let d = 0; d <= 6; d++) {
      base.dias[d] = {
        on: ativos.includes(d),
        inicio: typeof h.inicio === "string" && h.inicio ? h.inicio : "08:00",
        fim: typeof h.fim === "string" && h.fim ? h.fim : "18:00",
        almocoIni: typeof h.almocoIni === "string" ? h.almocoIni : "",
        almocoFim: typeof h.almocoFim === "string" ? h.almocoFim : "",
      };
    }
  }
  return base;
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
      horario: horarioPadrao(),
    },
    waChats: {}, // { "instance::numero": { ...conversa } }
    solicitacoes: [], // [{ id, vendedorId, vendedorNome, descricao, cliente, numero, urgencia, status, criadoEm, resolvidoEm }]
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
      if (!db.waConfig.horario) db.waConfig.horario = horarioPadrao();
      else db.waConfig.horario = normalizaHorario(db.waConfig.horario);
      if (!db.waChats || typeof db.waChats !== "object") db.waChats = {};
      if (!Array.isArray(db.solicitacoes)) db.solicitacoes = [];
      db.solicitacoes.forEach((s) => {
        if (typeof s.resposta !== "string") s.resposta = "";
        if (typeof s.resolvidoVisto !== "boolean") s.resolvidoVisto = true;
        if (typeof s.suporteEnviado !== "boolean") s.suporteEnviado = false;
      });
      // migração: chats que só têm mensagem enviada (sem resposta do lead) tinham o
      // nome do vendedor por engano — troca pelo número até o lead responder
      Object.values(db.waChats).forEach((c) => {
        if (!c || !Array.isArray(c.mensagens)) return;
        const temEntrada = c.mensagens.some((m) => m.role === "them");
        if (!temEntrada && c.nome !== c.numero) c.nome = c.numero;
      });
      db.users.forEach((u) => {
        if (typeof u.meta !== "number") u.meta = 0;
        if (typeof u.ativo !== "boolean") u.ativo = true;
        if (typeof u.podeResponder !== "boolean") u.podeResponder = false;
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
    console.error("Erro ao ler banco:", e.message);
    // PROTEÇÃO CRÍTICA: se o arquivo existe mas deu erro de leitura (ex: JSON
    // corrompido), NÃO sobrescreve com vazio — isso apagaria tudo. Em vez disso:
    // 1) salva uma cópia do arquivo problemático pra recuperação manual
    // 2) tenta restaurar do último backup automático
    // 3) só usa banco vazio em memória, SEM gravar por cima do arquivo real.
    try {
      if (fs.existsSync(DB_PATH)) {
        const corrompido = DB_PATH + ".corrompido." + Date.now();
        fs.copyFileSync(DB_PATH, corrompido);
        console.error("Arquivo problemático salvo em:", corrompido);
      }
      // tenta restaurar do backup mais recente
      const dir = path.dirname(DB_PATH);
      const backups = fs.readdirSync(dir)
        .filter((f) => f.startsWith("crm.backup."))
        .sort()
        .reverse();
      for (const bkp of backups) {
        try {
          const raw = fs.readFileSync(path.join(dir, bkp), "utf8");
          db = JSON.parse(raw); // se parsear, é um backup bom
          console.log("✓ Banco restaurado do backup:", bkp);
          saveDB(); // grava o backup restaurado como banco atual
          return;
        } catch (_) { /* esse backup também tá ruim, tenta o próximo */ }
      }
    } catch (e2) {
      console.error("Falha na recuperação:", e2.message);
    }
    // se chegou aqui, não tinha backup bom — usa vazio SÓ na memória, NÃO grava
    console.error("ATENÇÃO: usando banco vazio em memória. Arquivo NÃO foi sobrescrito.");
    db = dbVazio();
  }
}

function saveDB() {
  try {
    const json = JSON.stringify(db, null, 2);
    // SALVAMENTO SEGURO: grava primeiro num arquivo temporário e só depois
    // renomeia por cima do real. rename é atômico — se o servidor reiniciar no
    // meio, o arquivo real continua intacto (nunca fica pela metade/corrompido).
    const tmp = DB_PATH + ".tmp";
    fs.writeFileSync(tmp, json);
    fs.renameSync(tmp, DB_PATH);
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
function suporteOnly(req, res, next) {
  if (req.user.role !== "suporte")
    return res.status(403).json({ error: "Apenas o suporte pode atualizar solicitações" });
  next();
}
function gerenteOuSuporte(req, res, next) {
  if (req.user.role !== "gerente" && req.user.role !== "suporte")
    return res.status(403).json({ error: "Acesso restrito" });
  next();
}

app.post("/api/login", (req, res) => {
  const { login, senha } = req.body || {};
  const user = db.users.find(
    (u) => (u.login || "").toLowerCase() === String(login || "").toLowerCase()
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
  const { nome, login, senha, role } = req.body || {};
  if (!nome || !nome.trim())
    return res.status(400).json({ error: "Informe o nome" });
  const roleFinal = ["gerente", "suporte", "vendedor"].includes(role) ? role : "vendedor";
  const precisaAcesso = roleFinal !== "vendedor";
  if (precisaAcesso && (!login || !senha))
    return res.status(400).json({ error: "Esse perfil precisa de login e senha" });
  const id = proximoId("u");
  const loginFinal = precisaAcesso
    ? login.trim()
    : (login && login.trim() ? login.trim() : "vend-" + id);
  if (db.users.some((u) => (u.login || "").toLowerCase() === loginFinal.toLowerCase()))
    return res.status(400).json({ error: "Já existe alguém com esse login" });
  const novo = {
    id,
    nome: nome.trim(),
    login: loginFinal,
    senha: precisaAcesso ? senha : (senha && senha.length >= 3 ? senha : crypto.randomBytes(8).toString("hex")),
    role: roleFinal,
    ativo: true,
    podeResponder: roleFinal === "vendedor" ? !!req.body.podeResponder : false,
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
  const { nome, login, senha, role, meta, ativo, podeResponder } = req.body || {};
  if (nome && nome.trim()) u.nome = nome.trim();
  if (login && login.trim()) {
    const l = login.trim();
    if (db.users.some((x) => x.id !== u.id && (x.login || "").toLowerCase() === l.toLowerCase()))
      return res.status(400).json({ error: "Já existe alguém com esse login" });
    u.login = l;
  }
  if (senha && senha.length >= 3) u.senha = senha;
  if (role) u.role = ["gerente", "suporte", "vendedor"].includes(role) ? role : u.role;
  if (meta !== undefined) u.meta = Number(meta) || 0;
  if (ativo !== undefined) u.ativo = !!ativo;
  if (podeResponder !== undefined) u.podeResponder = !!podeResponder;
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
   SOLICITAÇÕES DE SUPORTE (vendedor pede ajuda ao suporte)
   ============================================================ */
const URGENCIAS = ["baixa", "media", "alta"];
const STATUS_SOL = ["aberta", "andamento", "resolvida"];

// lista: gerente e suporte veem todas; vendedor vê só as próprias
app.get("/api/solicitacoes", auth, (req, res) => {
  let lista = db.solicitacoes || [];
  if (req.user.role === "vendedor") lista = lista.filter((s) => s.vendedorId === req.user.id);
  const st = req.query.status;
  if (st && STATUS_SOL.includes(st)) lista = lista.filter((s) => s.status === st);
  lista = [...lista].sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
  res.json(lista);
});

// criar (qualquer usuário logado — normalmente o vendedor)
// ===== Ponte com o app do Suporte =====
const SUPORTE_URL = (process.env.SUPORTE_URL || "").replace(/\/+$/, "");
const BRIDGE_KEY = process.env.BRIDGE_KEY || "";
const STATUS_SUP_PARA_MON = { recebida: "aberta", em_atendimento: "andamento", concluida: "resolvida" };

function sanitizeCampos(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .slice(0, 40)
    .map((c) => ({ label: String((c && c.label) || "").slice(0, 60), valor: String((c && c.valor) || "").slice(0, 500) }))
    .filter((c) => c.label && c.valor);
}

function anexosParaEnviar(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .slice(0, 5)
    .map((a) => ({
      nome: String((a && a.nome) || "arquivo").slice(0, 200),
      mime: String((a && a.mime) || "application/octet-stream").slice(0, 100),
      dados: String((a && a.dados) || "").slice(0, 12 * 1024 * 1024),
    }))
    .filter((a) => a.dados);
}

async function pushSuporte(s, anexos) {
  if (!SUPORTE_URL || !BRIDGE_KEY) return false;
  try {
    const ctrl = new AbortController();
    const tm = setTimeout(() => ctrl.abort(), 12000);
    const r = await fetch(SUPORTE_URL + "/api/solic/inbound", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-bridge-key": BRIDGE_KEY },
      body: JSON.stringify({
        monitoriaId: s.id, vendedorNome: s.vendedorNome, cliente: s.cliente,
        numero: s.numero, descricao: s.descricao, urgencia: s.urgencia,
        tipo: s.tipo, tipoLabel: s.tipoLabel, campos: s.campos,
        anexos: anexos || [],
      }),
      signal: ctrl.signal,
    });
    clearTimeout(tm);
    return r.ok;
  } catch (_) { return false; }
}

async function deleteSuporte(monitoriaId) {
  if (!SUPORTE_URL || !BRIDGE_KEY) return false;
  try {
    const ctrl = new AbortController();
    const tm = setTimeout(() => ctrl.abort(), 12000);
    const r = await fetch(SUPORTE_URL + "/api/solic/inbound/" + encodeURIComponent(monitoriaId), {
      method: "DELETE",
      headers: { "x-bridge-key": BRIDGE_KEY },
      signal: ctrl.signal,
    });
    clearTimeout(tm);
    return r.ok;
  } catch (_) { return false; }
}

// encaminha uma mensagem do chat ao Suporte (fonte da verdade da thread)
async function pushMensagemSuporte(monitoriaId, autorNome, texto, anexo) {
  if (!SUPORTE_URL || !BRIDGE_KEY) return null;
  try {
    const ctrl = new AbortController();
    const tm = setTimeout(() => ctrl.abort(), 15000);
    const r = await fetch(SUPORTE_URL + "/api/solic/inbound/" + encodeURIComponent(monitoriaId) + "/mensagem", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-bridge-key": BRIDGE_KEY },
      body: JSON.stringify({ autorNome, texto, ...(anexo ? { anexo } : {}) }),
      signal: ctrl.signal,
    });
    clearTimeout(tm);
    if (!r.ok) return null;
    const data = await r.json();
    return Array.isArray(data.mensagens) ? data.mensagens : null;
  } catch (_) { return null; }
}

// sincroniza o status das solicitações com o app do Suporte (a cada 20s)
async function sincronizarSuporte() {
  if (!SUPORTE_URL || !BRIDGE_KEY) return;
  const lista = db.solicitacoes || [];
  for (const s of lista) {
    if (!s.suporteEnviado && s.status !== "resolvida") {
      if (await pushSuporte(s)) { s.suporteEnviado = true; saveSoon(); }
    }
  }
  const abertas = lista.filter((s) => s.suporteEnviado && s.status !== "resolvida");
  if (!abertas.length) return;
  try {
    const ids = abertas.map((s) => s.id).join(",");
    const ctrl = new AbortController();
    const tm = setTimeout(() => ctrl.abort(), 12000);
    const r = await fetch(SUPORTE_URL + "/api/solic/status?ids=" + encodeURIComponent(ids), {
      headers: { "x-bridge-key": BRIDGE_KEY }, signal: ctrl.signal,
    });
    clearTimeout(tm);
    if (!r.ok) return;
    const data = await r.json();
    const porId = {};
    (data.solicitacoes || []).forEach((x) => { porId[x.monitoriaId] = x; });
    let mudou = false;
    const removidos = [];
    for (const s of abertas) {
      const sup = porId[s.id];
      if (!sup) { removidos.push(s.id); continue; }
      const novoStatus = STATUS_SUP_PARA_MON[sup.status] || s.status;
      if (novoStatus !== s.status || (sup.resposta && sup.resposta !== s.resposta)) {
        s.status = novoStatus;
        if (sup.resposta) s.resposta = sup.resposta;
        if (novoStatus === "resolvida") {
          s.resolvidoVisto = false;
          if (!s.resolvidoEm) s.resolvidoEm = Date.now();
        }
        mudou = true;
      }
      if (Array.isArray(sup.mensagens) && JSON.stringify(sup.mensagens) !== JSON.stringify(s.mensagens || [])) {
        s.mensagens = sup.mensagens;
        mudou = true;
      }
    }
    if (removidos.length) {
      db.solicitacoes = db.solicitacoes.filter((s) => !removidos.includes(s.id));
      mudou = true;
    }
    if (mudou) saveSoon();
  } catch (_) {}
}
setInterval(() => { sincronizarSuporte().catch(() => {}); }, 20000);

app.post("/api/solicitacoes", auth, (req, res) => {
  const { descricao, cliente, numero, urgencia, tipo, tipoLabel, campos } = req.body || {};
  if (!descricao || !descricao.trim())
    return res.status(400).json({ error: "Descreva o que você precisa" });
  const anexosBytes = anexosParaEnviar(req.body && req.body.anexos);
  const nova = {
    id: proximoId("sol"),
    vendedorId: req.user.id,
    vendedorNome: req.user.nome,
    descricao: descricao.trim().slice(0, 2000),
    cliente: String(cliente || "").trim().slice(0, 120),
    numero: String(numero || "").trim().slice(0, 40),
    urgencia: URGENCIAS.includes(urgencia) ? urgencia : "media",
    tipo: String(tipo || "outras").trim().slice(0, 40),
    tipoLabel: String(tipoLabel || "").trim().slice(0, 60),
    campos: sanitizeCampos(campos),
    anexos: anexosBytes.map((a) => ({ nome: a.nome, mime: a.mime })),
    mensagens: [],
    vendedorViu: 0,
    status: "aberta",
    resposta: "",
    resolvidoVisto: true,
    suporteEnviado: false,
    criadoEm: Date.now(),
    resolvidoEm: null,
  };
  db.solicitacoes.push(nova);
  saveSoon();
  pushSuporte(nova, anexosBytes).then((ok) => { if (ok) { nova.suporteEnviado = true; saveSoon(); } }).catch(() => {});
  res.json(nova);
});

// marca o chat deste chamado como visto pelo vendedor (zera o selo de não-lidas)
app.post("/api/solicitacoes/:id/visto", auth, (req, res) => {
  const s = (db.solicitacoes || []).find((x) => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: "Solicitação não encontrada" });
  if (req.user.role === "vendedor" && s.vendedorId !== req.user.id)
    return res.status(403).json({ error: "Sem permissão" });
  s.vendedorViu = Date.now();
  saveSoon();
  res.json(s);
});

// vendedor (ou gerente) envia mensagem no chat do chamado → encaminha ao Suporte
app.post("/api/solicitacoes/:id/mensagem", auth, async (req, res) => {
  const s = (db.solicitacoes || []).find((x) => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: "Solicitação não encontrada" });
  if (req.user.role === "vendedor" && s.vendedorId !== req.user.id)
    return res.status(403).json({ error: "Sem permissão" });
  const texto = String((req.body && req.body.texto) || "").trim().slice(0, 2000);
  const anexoIn = req.body && req.body.anexo;
  if (anexoIn && anexoIn.dados && String(anexoIn.dados).length > 16 * 1024 * 1024)
    return res.status(413).json({ error: "Arquivo muito grande (máx 8MB)" });
  const anexo = (anexoIn && anexoIn.dados) ? { nome: String(anexoIn.nome || "arquivo").slice(0, 200), mime: String(anexoIn.mime || "application/octet-stream").slice(0, 100), dados: String(anexoIn.dados) } : null;
  if (!texto && !anexo) return res.status(400).json({ error: "Escreva uma mensagem ou anexe um arquivo" });
  if (!SUPORTE_URL || !BRIDGE_KEY) return res.status(503).json({ error: "Ponte com o suporte não configurada" });
  if (!s.suporteEnviado) { if (await pushSuporte(s)) { s.suporteEnviado = true; saveSoon(); } }
  const thread = await pushMensagemSuporte(s.id, req.user.nome || "Vendedor", texto, anexo);
  if (!thread) return res.status(502).json({ error: "Não foi possível enviar agora. Tente de novo." });
  s.mensagens = thread;
  saveSoon();
  res.json(s);
});

// proxy do download de anexo do chat (busca no Suporte com a chave da ponte)
app.get("/api/solicitacoes/:id/chat-anexo/:anexoId", auth, async (req, res) => {
  const s = (db.solicitacoes || []).find((x) => x.id === req.params.id);
  if (!s) return res.status(404).end();
  if (req.user.role === "vendedor" && s.vendedorId !== req.user.id) return res.status(403).end();
  if (!SUPORTE_URL || !BRIDGE_KEY) return res.status(503).end();
  try {
    const r = await fetch(SUPORTE_URL + "/api/solic/inbound/" + encodeURIComponent(s.id) + "/anexo/" + encodeURIComponent(req.params.anexoId), { headers: { "x-bridge-key": BRIDGE_KEY } });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      res.status(r.status).setHeader("Content-Type", r.headers.get("content-type") || "application/json");
      return res.end(body || JSON.stringify({ error: "não foi possível abrir o anexo" }));
    }
    res.setHeader("Content-Type", r.headers.get("content-type") || "application/octet-stream");
    const cd = r.headers.get("content-disposition"); if (cd) res.setHeader("Content-Disposition", cd);
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch (_) { res.status(502).end(); }
});

// puxa do Suporte o estado mais recente de UM chamado (status, resposta, mensagens)
app.get("/api/solicitacoes/:id/sync", auth, async (req, res) => {
  const s = (db.solicitacoes || []).find((x) => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: "Solicitação não encontrada" });
  if (req.user.role === "vendedor" && s.vendedorId !== req.user.id)
    return res.status(403).json({ error: "Sem permissão" });
  if (SUPORTE_URL && BRIDGE_KEY && s.suporteEnviado) {
    try {
      const ctrl = new AbortController();
      const tm = setTimeout(() => ctrl.abort(), 10000);
      const r = await fetch(SUPORTE_URL + "/api/solic/status?ids=" + encodeURIComponent(s.id), {
        headers: { "x-bridge-key": BRIDGE_KEY }, signal: ctrl.signal,
      });
      clearTimeout(tm);
      if (r.ok) {
        const data = await r.json();
        const sup = (data.solicitacoes || [])[0];
        if (sup) {
          const novoStatus = STATUS_SUP_PARA_MON[sup.status] || s.status;
          if (novoStatus !== s.status) {
            s.status = novoStatus;
            if (novoStatus === "resolvida") { s.resolvidoVisto = false; if (!s.resolvidoEm) s.resolvidoEm = Date.now(); }
          }
          if (sup.resposta) s.resposta = sup.resposta;
          if (Array.isArray(sup.mensagens)) s.mensagens = sup.mensagens;
          saveSoon();
        } else {
          // excluída no suporte → remove aqui também
          db.solicitacoes = (db.solicitacoes || []).filter((x) => x.id !== s.id);
          saveSoon();
          return res.json({ removida: true });
        }
      }
    } catch (_) {}
  }
  res.json(s);
});

app.delete("/api/solicitacoes/:id", auth, (req, res) => {
  const i = (db.solicitacoes || []).findIndex((x) => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: "Solicitação não encontrada" });
  const s = db.solicitacoes[i];
  if (req.user.role !== "gerente" && s.vendedorId !== req.user.id)
    return res.status(403).json({ error: "sem permissão" });
  db.solicitacoes.splice(i, 1);
  saveSoon();
  deleteSuporte(s.id).catch(() => {});
  res.json({ ok: true });
});

// mudar status / responder (só o suporte)
app.patch("/api/solicitacoes/:id", auth, suporteOnly, (req, res) => {
  const s = (db.solicitacoes || []).find((x) => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: "Solicitação não encontrada" });
  const { status, resposta } = req.body || {};
  if (typeof resposta === "string") s.resposta = resposta.trim().slice(0, 2000);
  if (status && STATUS_SOL.includes(status)) {
    s.status = status;
    if (status === "resolvida") { s.resolvidoEm = Date.now(); s.resolvidoVisto = false; }
    else { s.resolvidoEm = null; }
  }
  saveSoon();
  res.json(s);
});

// vendedor marca suas resolvidas como vistas (limpa o aviso)
app.post("/api/solicitacoes/marcar-vistas", auth, (req, res) => {
  let n = 0;
  (db.solicitacoes || []).forEach((s) => {
    if (s.vendedorId === req.user.id && s.status === "resolvida" && !s.resolvidoVisto) {
      s.resolvidoVisto = true; n++;
    }
  });
  if (n) saveSoon();
  res.json({ ok: true, vistas: n });
});

// relatório (números) — só gerente
app.get("/api/solicitacoes/relatorio", auth, gerenteOuSuporte, (req, res) => {
  const desde = Number(req.query.desde) || 0;
  const ate = Number(req.query.ate) || Date.now();
  const todas = (db.solicitacoes || []).filter((s) => s.criadoEm >= desde && s.criadoEm <= ate);
  const mapa = {};
  todas.forEach((s) => {
    const k = s.vendedorId || "?";
    if (!mapa[k]) mapa[k] = { vendedorId: k, nome: s.vendedorNome || "—", total: 0, resolvidas: 0 };
    mapa[k].total++;
    if (s.status === "resolvida") mapa[k].resolvidas++;
  });
  const porVendedor = Object.values(mapa).sort((a, b) => b.total - a.total);
  const cont = { aberta: 0, andamento: 0, resolvida: 0 };
  let somaMs = 0, nResolv = 0;
  todas.forEach((s) => {
    cont[s.status] = (cont[s.status] || 0) + 1;
    if (s.status === "resolvida" && s.resolvidoEm) { somaMs += (s.resolvidoEm - s.criadoEm); nResolv++; }
  });
  const total = todas.length;
  res.json({
    porVendedor,
    situacao: {
      total,
      aberta: cont.aberta, andamento: cont.andamento, resolvida: cont.resolvida,
      taxaResolucao: total ? Math.round((cont.resolvida / total) * 100) : 0,
      tempoMedioResolverSeg: nResolv ? Math.round(somaMs / nResolv / 1000) : 0,
    },
  });
});

// análise da IA das solicitações — só gerente
app.get("/api/solicitacoes/ia", auth, gerenteOuSuporte, async (req, res) => {
  const desde = Number(req.query.desde) || 0;
  const ate = Number(req.query.ate) || Date.now();
  const todas = (db.solicitacoes || []).filter((s) => s.criadoEm >= desde && s.criadoEm <= ate);
  if (!todas.length) return res.json({ texto: "Nenhuma solicitação no período para analisar." });
  const linhas = todas.slice(0, 80).map((s) =>
    `- [${s.urgencia}/${s.status}] ${s.vendedorNome}: ${s.descricao}${s.cliente ? " (cliente: " + s.cliente + ")" : ""}`
  ).join("\n");
  const prompt = `Você é analista de operações de uma escola técnica de eletrônica. Abaixo estão solicitações de ajuda que os vendedores abriram para o suporte interno. Analise e aponte de forma objetiva, em português do Brasil e no máximo 3 parágrafos curtos: (1) os temas/motivos mais recorrentes; (2) gargalos ou problemas que se repetem; (3) sugestões práticas para reduzir o volume de solicitações. Não invente dados que não estejam na lista.\n\nSolicitações:\n${linhas}`;
  try {
    const out = await chamarIA(prompt);
    res.json({ texto: out.trim() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
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
    // gerente vê só os WhatsApps vinculados a um vendedor (os monitorados de propósito)
    return insts.filter((i) => i.vendedorId).map((i) => i.instance);
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
  const ctrl = new AbortController();
  const tm = setTimeout(() => ctrl.abort(), 15000);
  let res;
  try {
    res = await fetch(base + caminho, {
      method,
      headers: { "Content-Type": "application/json", apikey: cfg.apiKey },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
  } catch (e) {
    throw new Error(e.name === "AbortError" ? "Evolution não respondeu (timeout)" : "Não consegui falar com a Evolution: " + e.message);
  } finally {
    clearTimeout(tm);
  }
  let data = null;
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) {
    let msg;
    if (data && data.response && data.response.message) {
      msg = data.response.message; // Evolution põe a mensagem real aqui (ex: "name already in use")
    } else {
      msg = (data && (data.message || data.error)) || "Erro Evolution " + res.status;
    }
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

/* ===== Pesquisa de satisfação / encerramento automático ===== */
const MARCADOR_PESQUISA = "pesquisa de satisfacao"; // detecta a pesquisa que o vendedor envia
const TEXTO_ENCERRAMENTO =
  "Seu atendimento está sendo finalizado neste momento.\n" +
  "Agradecemos pelo contato e pela confiança. Caso tenha alguma dúvida ou precise de novo suporte, nossa equipe estará à disposição para ajudar.\n" +
  "Tenha um excelente dia!";
function semAcento(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
// lê a nota (1 a 5) por número OU palavra; null se não der pra classificar com segurança
function parseNota(texto) {
  const t = semAcento(texto);
  const num = t.match(/\b([1-5])\b/);
  if (num) return Number(num[1]);
  const mapa = [
    [/(\b10\b|\bdez\b|muito ?bo[ma]|excelent|otim|perfeit|maravilh|adorei|super ?bo[ma])/, 5],
    [/(muito ?ruim|pessim|horrivel|terrivel|horroros|detestei|odiei)/, 1],
    [/(bo[ma]|gostei|legal|massa|show|satisfeit|aprovad|recomend)/, 4],
    [/(ruim|frac[ao]|insatisfeit|decepcion|reprovad)/, 2],
    [/(regular|normal|medi[ao]|mais ?ou ?menos|razoavel|aceitavel|\bok\b)/, 3],
  ];
  for (const [re, nota] of mapa) if (re.test(t)) return nota;
  return null;
}
// envia texto pelo número do vendedor (fire-and-forget; o eco do webhook é deduplicado)
async function enviarTexto(instance, numero, texto) {
  try { await evo("POST", `/message/sendText/${instance}`, { number: numero, text: texto }); }
  catch (e) { console.error("Falha ao enviar texto automático:", e.message); }
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
    // ---- detecta tipo de mídia ----
    let tipo = "text", mimetype = "", filename = "", caption = "", label = "";
    let docMsg = msg.documentMessage;
    if (!docMsg && msg.documentWithCaptionMessage && msg.documentWithCaptionMessage.message)
      docMsg = msg.documentWithCaptionMessage.message.documentMessage;
    if (msg.audioMessage) { tipo = "audio"; mimetype = msg.audioMessage.mimetype || "audio/ogg"; label = "🎤 Áudio"; }
    else if (msg.imageMessage) { tipo = "image"; mimetype = msg.imageMessage.mimetype || "image/jpeg"; caption = msg.imageMessage.caption || ""; label = "📷 Foto"; }
    else if (msg.videoMessage) { tipo = "video"; mimetype = msg.videoMessage.mimetype || "video/mp4"; caption = msg.videoMessage.caption || ""; label = "🎬 Vídeo"; }
    else if (docMsg) { tipo = "document"; mimetype = docMsg.mimetype || "application/octet-stream"; filename = docMsg.fileName || "documento"; caption = docMsg.caption || ""; label = "📄 " + filename; }
    else if (msg.stickerMessage) { tipo = "sticker"; mimetype = msg.stickerMessage.mimetype || "image/webp"; label = "Figurinha"; }

    const textoSimples = msg.conversation || (msg.extendedTextMessage && msg.extendedTextMessage.text) || "";
    const content = tipo === "text" ? textoSimples : (caption || label);
    if (tipo === "text" && !textoSimples) return res.json({ ok: true }); // nada aproveitável

    const id = `${instance}::${numero}`;
    // hora REAL da mensagem (Evolution manda em segundos); cai pra agora se faltar
    let ts = Number(data.messageTimestamp || (data.key && data.key.timestamp) || 0) * 1000;
    if (!ts || isNaN(ts) || ts > Date.now() + 60000) ts = Date.now();
    let chat = db.waChats[id];
    if (!chat) {
      chat = {
        id, instance, numero,
        nome: (!fromMe && data.pushName) ? data.pushName : numero,
        mensagens: [], naoLidas: 0, atualizadoEm: ts,
      };
      db.waChats[id] = chat;
    }
    if (!fromMe && data.pushName) chat.nome = data.pushName;

    const novaMsg = { role: fromMe ? "me" : "them", content, ts };
    if (tipo !== "text") {
      const mid = key.id || crypto.randomBytes(8).toString("hex");
      novaMsg.tipo = tipo;
      novaMsg.mimetype = mimetype;
      novaMsg.mid = mid;
      novaMsg.keyMidia = { remoteJid: jid, id: key.id || "", fromMe };
      if (filename) novaMsg.filename = filename;
      if (caption) novaMsg.caption = caption;
      // tenta achar o base64 já no webhook (webhookBase64:true)
      const inline = (data.message && data.message.base64) || b.base64 || data.base64 ||
        (msg.audioMessage && msg.audioMessage.base64) || (msg.imageMessage && msg.imageMessage.base64) ||
        (msg.videoMessage && msg.videoMessage.base64) || (docMsg && docMsg.base64) || "";
      if (inline) {
        try {
          const fname = nomeArquivo(mid) + "." + extDeMime(mimetype);
          fs.writeFileSync(path.join(MEDIA_DIR, fname), Buffer.from(String(inline), "base64"));
          novaMsg.arquivo = fname;
        } catch (e) { console.error("Falha ao salvar mídia inline:", e.message); }
      }
    }
    // dedup: eco da própria mensagem que enviamos (mesmo texto "me" empurrado há poucos segundos)
    if (fromMe && tipo === "text") {
      const agora = Date.now();
      const dup = chat.mensagens.slice(-6).some(
        (x) => x.role === "me" && x.content === content && Math.abs((x.ts || 0) - agora) < 15000
      );
      if (dup) { chat.atualizadoEm = ts; saveSoon(); return res.json({ ok: true }); }
    }

    chat.mensagens.push(novaMsg);
    if (chat.mensagens.length > 300) chat.mensagens = chat.mensagens.slice(-300);
    if (!fromMe) chat.naoLidas = (chat.naoLidas || 0) + 1;
    chat.atualizadoEm = ts;

    // ----- Pesquisa de satisfação / encerramento automático -----
    if (fromMe && tipo === "text" && semAcento(textoSimples).includes(MARCADOR_PESQUISA)) {
      // vendedor enviou a pesquisa -> arma a espera da nota
      chat.aguardandoNota = true;
      chat.encerrado = false;
    } else if (!fromMe && chat.aguardandoNota) {
      // lead respondeu a pesquisa -> registra nota, encerra e dispara o agradecimento
      chat.nota = parseNota(textoSimples); // 1..5 ou null
      chat.notaTexto = textoSimples;
      chat.notaEm = ts;
      chat.aguardandoNota = false;
      chat.encerrado = true;
      chat.encerradoEm = ts;
      chat.encerradoMotivo = "pesquisa";
      chat.naoLidas = 0;
      // empurra o agradecimento já (síncrono) e dispara o envio real em background
      const fecho = { role: "me", content: TEXTO_ENCERRAMENTO, ts: Date.now(), auto: true };
      chat.mensagens.push(fecho);
      if (chat.mensagens.length > 300) chat.mensagens = chat.mensagens.slice(-300);
      chat.atualizadoEm = fecho.ts;
      enviarTexto(chat.instance, chat.numero, TEXTO_ENCERRAMENTO);
    } else if (!fromMe && chat.encerrado) {
      // lead voltou a escrever depois de encerrado -> reabre
      chat.encerrado = false;
    }

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
app.put("/api/wa/config", auth, gerenteOnly, async (req, res) => {
  const { url, apiKey, publicUrl, instancias } = req.body || {};
  if (url !== undefined) db.waConfig.url = String(url).trim();
  if (apiKey) db.waConfig.apiKey = String(apiKey).trim();
  if (publicUrl) db.waConfig.publicUrl = String(publicUrl).trim();
  if (Array.isArray(instancias)) {
    db.waConfig.instancias = instancias
      .filter((i) => i && i.instance)
      .map((i) => ({ instance: String(i.instance).trim(), vendedorId: i.vendedorId || null }));
  }
  saveSoon();
  // religa o webhook de cada monitorado em background (não trava o salvar)
  (db.waConfig.instancias || []).forEach((i) => { configurarWebhook(i.instance).catch(() => {}); });
  res.json({ ok: true, webhookUrl: webhookUrl() });
});

app.get("/api/horario", auth, (req, res) => res.json(normalizaHorario(db.waConfig.horario)));
app.put("/api/horario", auth, gerenteOnly, (req, res) => {
  db.waConfig.horario = normalizaHorario(req.body || {});
  saveSoon();
  res.json({ ok: true, horario: db.waConfig.horario });
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
  const verArquivadas = req.query.arquivadas === "1";
  let chats = Object.values(db.waChats).filter((c) => permitidas.has(c.instance) && (verArquivadas ? !!c.arquivada : !c.arquivada));
  if (req.user.role === "gerente" && req.query.instance && req.query.instance !== "todas") {
    chats = chats.filter((c) => c.instance === req.query.instance);
  }
  const q = String(req.query.q || "").trim().toLowerCase();
  const qDig = q.replace(/\D/g, "");
  const agora = Date.now();
  let itens = chats.map((c) => {
    const ult = c.mensagens.length ? c.mensagens[c.mensagens.length - 1] : null;
    const aguardando = !!(ult && ult.role === "them") && !c.encerrado;
    let trecho = "";
    if (q) {
      const nomeOk = (c.nome || "").toLowerCase().includes(q);
      const numOk = qDig && (c.numero || "").replace(/\D/g, "").includes(qDig);
      if (!nomeOk && !numOk) {
        const m = [...c.mensagens].reverse().find((mm) => String(mm.content || "").toLowerCase().includes(q));
        if (!m) return null; // não bate em nome, número nem mensagem
        trecho = String(m.content).slice(0, 120);
      }
    }
    return {
      id: c.id, instance: c.instance, numero: c.numero, nome: c.nome,
      naoLidas: c.naoLidas || 0, atualizadoEm: c.atualizadoEm,
      ultima: ult ? ult.content : "",
      ultimaDe: ult ? ult.role : "",
      aguardando,
      esperaSeg: aguardando ? Math.round(decorridoUtilMs(ult.ts, agora) / 1000) : 0,
      vendedorId: vendedorDaInstancia(c.instance),
      trecho,
      encerrado: !!c.encerrado,
      arquivada: !!c.arquivada,
      nota: c.nota != null ? c.nota : null,
    };
  }).filter(Boolean);
  itens.sort((a, b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0));
  res.json(itens);
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

/* ---- servir mídia (áudio / imagem / vídeo / documento) ---- */
app.get("/api/wa/midia/:chatId/:mid", auth, async (req, res) => {
  const chat = db.waChats[req.params.chatId];
  if (!chat) return res.status(404).json({ error: "Conversa não encontrada" });
  const permitidas = new Set(instanciasDoUser(req.user));
  if (!permitidas.has(chat.instance)) return res.status(403).json({ error: "Sem acesso" });
  const m = (chat.mensagens || []).find((x) => x.mid === req.params.mid);
  if (!m || !m.tipo || m.tipo === "text") return res.status(404).json({ error: "Mídia não encontrada" });

  function enviarArquivo() {
    const fp = path.join(MEDIA_DIR, m.arquivo);
    if (!fs.existsSync(fp)) return false;
    res.setHeader("Content-Type", m.mimetype || "application/octet-stream");
    res.setHeader("Cache-Control", "private, max-age=86400");
    if (m.tipo === "document" && m.filename)
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(m.filename)}"`);
    fs.createReadStream(fp).pipe(res);
    return true;
  }
  // já baixado antes?
  if (m.arquivo && enviarArquivo()) return;
  // senão, busca o base64 na Evolution sob demanda e guarda em disco
  try {
    // formatos de body variam entre versões da Evolution — tenta os dois
    let r = null, ultimoErro = "";
    for (const body of [{ message: { key: m.keyMidia } }, { key: m.keyMidia }]) {
      try {
        const resp = await evo("POST", `/chat/getBase64FromMediaMessage/${chat.instance}`, body);
        if (resp && (resp.base64 || (resp.media && resp.media.base64))) { r = resp; break; }
      } catch (e) { ultimoErro = e.message; }
    }
    const base64 = r && (r.base64 || (r.media && r.media.base64));
    if (!base64) return res.status(502).json({ error: ultimoErro || "Evolution não retornou a mídia" });
    const mime = (r && r.mimetype) || m.mimetype || "application/octet-stream";
    const buf = Buffer.from(String(base64), "base64");
    const fname = nomeArquivo(m.mid) + "." + extDeMime(mime);
    try { fs.writeFileSync(path.join(MEDIA_DIR, fname), buf); m.arquivo = fname; m.mimetype = mime; saveSoon(); } catch (_) {}
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "private, max-age=86400");
    if (m.tipo === "document" && m.filename)
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(m.filename)}"`);
    return res.end(buf);
  } catch (e) {
    return res.status(502).json({ error: "Não consegui baixar a mídia: " + e.message });
  }
});

/* ---- enviar mensagem ---- */
app.post("/api/wa/chats/:id/send", auth, async (req, res) => {
  const chat = db.waChats[req.params.id];
  if (!chat) return res.status(404).json({ error: "Conversa não encontrada" });
  const permitidas = new Set(instanciasDoUser(req.user));
  if (!permitidas.has(chat.instance))
    return res.status(403).json({ error: "Sem acesso a essa conversa" });
  if (req.user.role === "vendedor" && !req.user.podeResponder)
    return res.status(403).json({ error: "Você não tem permissão para responder pelo painel" });
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

/* ---- enviar mídia (imagem / documento / vídeo / áudio) ---- */
app.post("/api/wa/chats/:id/send-midia", auth, async (req, res) => {
  const chat = db.waChats[req.params.id];
  if (!chat) return res.status(404).json({ error: "Conversa não encontrada" });
  const permitidas = new Set(instanciasDoUser(req.user));
  if (!permitidas.has(chat.instance))
    return res.status(403).json({ error: "Sem acesso a essa conversa" });
  if (req.user.role === "vendedor" && !req.user.podeResponder)
    return res.status(403).json({ error: "Você não tem permissão para responder pelo painel" });
  const { tipo, base64, mimetype, filename, caption } = req.body || {};
  if (!["image", "video", "document", "audio"].includes(tipo))
    return res.status(400).json({ error: "Tipo de mídia inválido" });
  const b64 = String(base64 || "").replace(/^data:[^;]+;base64,/, "");
  if (!b64) return res.status(400).json({ error: "Arquivo vazio" });
  try {
    if (tipo === "audio") {
      await evo("POST", `/message/sendWhatsAppAudio/${chat.instance}`, {
        number: chat.numero,
        audio: b64,
      });
    } else {
      await evo("POST", `/message/sendMedia/${chat.instance}`, {
        number: chat.numero,
        mediatype: tipo,
        mimetype: mimetype || "application/octet-stream",
        media: b64,
        fileName: filename || "arquivo." + extDeMime(mimetype),
        caption: caption || "",
      });
    }
    const mid = "snd_" + crypto.randomBytes(6).toString("hex");
    const ext = extDeMime(mimetype || (tipo === "audio" ? "audio/ogg" : ""));
    const fname = nomeArquivo(mid) + "." + ext;
    try { fs.writeFileSync(path.join(MEDIA_DIR, fname), Buffer.from(b64, "base64")); } catch (_) {}
    const msg = {
      role: "me", tipo, mid, arquivo: fname,
      mimetype: mimetype || "", filename: filename || "",
      caption: caption || "", ts: Date.now(),
    };
    chat.mensagens.push(msg);
    chat.atualizadoEm = Date.now();
    saveSoon();
    res.json({ ok: true, msg });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ---- arquivar / desarquivar conversa ---- */
app.post("/api/wa/chats/:id/arquivar", auth, (req, res) => {
  const chat = db.waChats[req.params.id];
  if (!chat) return res.status(404).json({ error: "Conversa não encontrada" });
  const permitidas = new Set(instanciasDoUser(req.user));
  if (!permitidas.has(chat.instance))
    return res.status(403).json({ error: "Sem acesso a essa conversa" });
  chat.arquivada = !!(req.body && req.body.arquivar);
  saveSoon();
  res.json({ ok: true, arquivada: chat.arquivada });
});

/* ---- encerrar / reabrir atendimento (manual, pelo gerente) ---- */
app.post("/api/wa/chats/:id/encerrar", auth, (req, res) => {
  const chat = db.waChats[req.params.id];
  if (!chat) return res.status(404).json({ error: "Conversa não encontrada" });
  const permitidas = new Set(instanciasDoUser(req.user));
  if (!permitidas.has(chat.instance)) return res.status(403).json({ error: "Sem acesso a essa conversa" });
  const encerrar = req.body && req.body.encerrar !== false; // default true
  chat.encerrado = !!encerrar;
  chat.aguardandoNota = false;
  if (encerrar) { chat.encerradoEm = Date.now(); chat.encerradoMotivo = "manual"; }
  saveSoon();
  res.json({ ok: true, encerrado: chat.encerrado });
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
  instance = String(instance || "").trim();
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

// lista TODAS as instâncias que existem no Evolution (pra gerente escolher quais monitorar)
app.get("/api/wa/instancias-evolution", auth, gerenteOnly, async (req, res) => {
  try {
    const r = await evo("GET", `/instance/fetchInstances`);
    const arr = Array.isArray(r) ? r : (r && Array.isArray(r.instances) ? r.instances : []);
    const lista = arr
      .map((it) => {
        const inst = it.instance || it;
        const instance = it.name || inst.instanceName || inst.name || "";
        const estado = it.connectionStatus || inst.connectionStatus || inst.status || inst.state || "close";
        const ownerJid = it.ownerJid || inst.ownerJid || inst.owner || "";
        const numero = it.number || (ownerJid ? String(ownerJid).split("@")[0] : "");
        const profileName = it.profileName || inst.profileName || "";
        return { instance, estado, numero, profileName };
      })
      .filter((x) => x.instance);
    // conectados primeiro, depois ordem alfabética
    lista.sort((a, b) => (b.estado === "open") - (a.estado === "open") || a.instance.localeCompare(b.instance));
    res.json(lista);
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
  return Object.values(db.waChats).filter((c) => {
    // chats do Evolution (por instância) OU chats do canal oficial atribuídos ao vendedor
    if (c.canal === "oficial") return c.vendedorId === vendedorId;
    return insts.includes(c.instance);
  });
}
function mediaSeg(arr) {
  return arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length / 1000) : 0;
}

/* ===== NPS / Satisfação (notas 1 a 5 da pesquisa) ===== */
function statsNotas(chats, desde, ate) {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let soma = 0, n = 0;
  chats.forEach((c) => {
    if (c.nota != null && c.notaEm >= desde && c.notaEm <= ate) {
      const nt = Math.round(c.nota);
      if (nt >= 1 && nt <= 5) { dist[nt]++; soma += nt; n++; }
    }
  });
  return { respostas: n, media: n ? Math.round((soma / n) * 10) / 10 : 0, dist };
}
// resumo de satisfação de um vendedor (pra alimentar a IA)
function textoNPS(vendedorId, desde, ate) {
  const s = statsNotas(chatsDoVendedor(vendedorId), desde, ate);
  if (!s.respostas) return "sem respostas de pesquisa de satisfação nesse período";
  const d = s.dist;
  return `nota média ${s.media}/5 em ${s.respostas} ${s.respostas === 1 ? "resposta" : "respostas"} (5★:${d[5]} 4★:${d[4]} 3★:${d[3]} 2★:${d[2]} 1★:${d[1]})`;
}
function comentariosNPS(vendedorId, desde, ate, max = 6) {
  return chatsDoVendedor(vendedorId)
    .filter((c) => c.nota != null && c.notaEm >= desde && c.notaEm <= ate && String(c.notaTexto || "").trim())
    .sort((a, b) => (b.notaEm || 0) - (a.notaEm || 0))
    .slice(0, max)
    .map((c) => `nota ${c.nota}: "${String(c.notaTexto).slice(0, 120)}"`);
}
app.get("/api/nps", auth, (req, res) => {
  const desde = req.query.desde ? Number(req.query.desde) : 0;
  const ate = req.query.ate ? Number(req.query.ate) : Date.now();
  const vendedores = db.users.filter((u) => u.role === "vendedor" && u.ativo);
  let filtroId = req.query.vendedorId || "";
  if (req.user.role !== "gerente") filtroId = req.user.id; // vendedor só vê o próprio NPS
  const alvo = filtroId ? vendedores.filter((v) => v.id === filtroId) : vendedores;
  // instâncias consideradas: todas mapeadas, ou só as do vendedor filtrado
  const mapeadas = new Set();
  (db.waConfig.instancias || []).forEach((i) => {
    if (!i.vendedorId) return;
    if (filtroId && i.vendedorId !== filtroId) return;
    mapeadas.add(i.instance);
  });

  const porVendedor = alvo
    .map((v) => ({ id: v.id, nome: v.nome, ...statsNotas(chatsDoVendedor(v.id), desde, ate) }))
    .filter((v) => v.respostas > 0)
    .sort((a, b) => b.media - a.media || b.respostas - a.respostas);

  const distGeral = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let somaG = 0, nG = 0;
  const avaliacoes = [];
  Object.values(db.waChats).forEach((c) => {
    if (!mapeadas.has(c.instance)) return;
    if (c.nota == null || !(c.notaEm >= desde && c.notaEm <= ate)) return;
    const nt = Math.round(c.nota);
    if (!(nt >= 1 && nt <= 5)) return;
    distGeral[nt]++; somaG += nt; nG++;
    const vId = vendedorDaInstancia(c.instance);
    const v = vendedores.find((x) => x.id === vId);
    avaliacoes.push({
      id: c.id, numero: c.numero, nome: c.nome,
      vendedorId: vId, vendedorNome: v ? v.nome : "—",
      nota: c.nota, notaEm: c.notaEm, notaTexto: String(c.notaTexto || "").slice(0, 160),
    });
  });
  avaliacoes.sort((a, b) => (b.notaEm || 0) - (a.notaEm || 0));

  res.json({
    desde, ate, filtroId,
    geral: { respostas: nG, media: nG ? Math.round((somaG / nG) * 10) / 10 : 0, dist: distGeral },
    vendedores: porVendedor,
    avaliacoes: avaliacoes.slice(0, 100),
    vendedoresLista: req.user.role === "gerente" ? vendedores.map((v) => ({ id: v.id, nome: v.nome })) : [],
  });
});
// tempo (em ms) entre dois instantes contando SÓ o horário de atendimento configurado
function decorridoUtilMs(de, ate) {
  const h = (db.waConfig && db.waConfig.horario) || null;
  if (!h || !h.enabled || !h.dias || ate <= de) return Math.max(0, ate - de);
  const hm = (s) => { const [a, b] = String(s || "0:0").split(":").map(Number); return (a || 0) * 60 + (b || 0); };
  let total = 0;
  const cur = new Date(de);
  while (cur.getTime() < ate) {
    const cfg = h.dias[cur.getDay()] || h.dias[String(cur.getDay())];
    if (cfg && cfg.on) {
      const ini = hm(cfg.inicio), fim = hm(cfg.fim);
      if (fim > ini) {
        const base = new Date(cur); base.setHours(0, 0, 0, 0);
        const a = Math.max(de, base.getTime() + ini * 60000);
        const b = Math.min(ate, base.getTime() + fim * 60000);
        if (b > a) {
          let dur = b - a;
          if (cfg.almocoIni && cfg.almocoFim) {
            const aIni = hm(cfg.almocoIni), aFim = hm(cfg.almocoFim);
            if (aFim > aIni) {
              const la = Math.max(a, base.getTime() + aIni * 60000);
              const lb = Math.min(b, base.getTime() + aFim * 60000);
              if (lb > la) dur -= (lb - la);
            }
          }
          total += dur;
        }
      }
    }
    cur.setHours(24, 0, 0, 0); // pula pro próximo dia 00:00
  }
  return total;
}
function metricasChat(chat, desde, ate) {
  const msgs = (chat.mensagens || [])
    .filter((m) => m.ts >= desde && m.ts <= ate)
    .sort((a, b) => a.ts - b.ts);
  if (msgs.length === 0) return null;
  let resp = [], primeira = null, pend = null, temMe = false, temThem = false;
  msgs.forEach((m) => {
    if (m.role === "them") { temThem = true; if (pend === null) pend = m.ts; }
    else { temMe = true; if (pend !== null) { const d = decorridoUtilMs(pend, m.ts); resp.push(d); if (primeira === null) primeira = d; pend = null; } }
  });
  return {
    enviadas: msgs.filter((m) => m.role === "me").length,
    resp, primeira,
    dur: msgs.length >= 2 ? msgs[msgs.length - 1].ts - msgs[0].ts : 0,
    atendida: temMe,
    semResposta: temThem && msgs[msgs.length - 1].role === "them" && !chat.encerrado,
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
          const delta = decorridoUtilMs(pend, m.ts);
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

function conversasVendedor(vendedorId, maxChats = 6, maxMsgs = 12, desde = 0, ate = Date.now()) {
  return chatsDoVendedor(vendedorId)
    .map((c) => {
      const msgs = (c.mensagens || []).filter((m) => m.ts >= desde && m.ts <= ate);
      return { c, msgs, ultimo: msgs.length ? msgs[msgs.length - 1].ts : 0 };
    })
    .filter((x) => x.msgs.length > 0)
    .sort((a, b) => b.ultimo - a.ultimo)
    .slice(0, maxChats)
    .map(({ c, msgs }) => {
      const txt = msgs.slice(-maxMsgs)
        .map((m) => (m.role === "me" ? "Vendedor" : "Cliente") + ": " + String(m.content).slice(0, 200))
        .join("\n");
      return `Conversa com ${c.nome}:\n${txt}`;
    });
}
function textoPeriodo(desde, ate) {
  if (!desde || desde <= 0) return "todo o histórico";
  const fmt = (t) => new Date(t).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const di = fmt(desde), df = fmt(ate);
  return di === df ? `o dia ${di}` : `${di} até ${df}`;
}
function fmtSegBR(seg) {
  if (!seg) return "—";
  if (seg < 60) return seg + "s";
  if (seg < 3600) return Math.floor(seg / 60) + "min " + (seg % 60) + "s";
  return Math.floor(seg / 3600) + "h " + Math.floor((seg % 3600) / 60) + "min";
}

app.post("/api/ia/equipe", auth, gerenteOnly, async (req, res) => {
  try {
    const desde = req.body && req.body.desde ? Number(req.body.desde) : 0;
    const ate = req.body && req.body.ate ? Number(req.body.ate) : Date.now();
    const periodoTxt = textoPeriodo(desde, ate);
    const vendedores = db.users.filter((u) => u.role === "vendedor" && u.ativo);
    const linhas = vendedores.map((v) => {
      const s = agregaVendedor(v.id, desde, ate);
      return `- ${v.nome}: ${s.conversas} conversas, ${s.atendidas} atendidas, ${s.semResposta} sem resposta, ${s.mensagensEnviadas} mensagens enviadas, tempo médio de resposta ${fmtSegBR(s.tmrSeg)}, 1ª resposta ${fmtSegBR(s.primeiraSeg)}, taxa de resposta ${s.taxaResposta}% | satisfação: ${textoNPS(v.id, desde, ate)}`;
    }).join("\n");
    const amostras = [];
    vendedores.slice(0, 6).forEach((v) => {
      const cv = conversasVendedor(v.id, 1, 8, desde, ate);
      if (cv[0]) amostras.push(`[${v.nome}] ${cv[0]}`);
    });
    const prompt = `Você é um supervisor de atendimento sênior monitorando a equipe da Escola Instructiva (cursos técnicos de eletrônica) que atende clientes pelo WhatsApp. Avalie a QUALIDADE E A PRODUTIVIDADE DO ATENDIMENTO da equipe (rapidez nas respostas, clientes deixados sem resposta, volume, tom e educação) e também a SATISFAÇÃO DOS CLIENTES (notas da pesquisa, de 1 a 5).

PERÍODO ANALISADO: ${periodoTxt}.

DESEMPENHO DE ATENDIMENTO DOS VENDEDORES (somente nesse período):
${linhas || "Nenhum vendedor cadastrado."}

AMOSTRA DE CONVERSAS NO WHATSAPP (desse período):
${amostras.join("\n\n") || "Sem conversas registradas nesse período."}

Responda SOMENTE em JSON puro, sem markdown, neste formato:
{"resumo":"2 a 4 frases sobre o atendimento da equipe nesse período","pontos_fortes":["..."],"pontos_a_melhorar":["..."],"sugestoes":["3 a 5 sugestões práticas pra melhorar a velocidade, a cobertura e a qualidade do atendimento"]}
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
    const desde = req.body && req.body.desde ? Number(req.body.desde) : 0;
    const ate = req.body && req.body.ate ? Number(req.body.ate) : Date.now();
    const periodoTxt = textoPeriodo(desde, ate);
    const s = agregaVendedor(v.id, desde, ate);
    const conv = conversasVendedor(v.id, 6, 12, desde, ate);
    const coment = comentariosNPS(v.id, desde, ate);
    const prompt = `Você é um supervisor de atendimento sênior avaliando UM atendente da Escola Instructiva (cursos técnicos de eletrônica) que atende clientes pelo WhatsApp. Avalie a QUALIDADE e a PRODUTIVIDADE do atendimento (rapidez de resposta, clientes sem resposta, volume, tom, educação, clareza, follow-up) e também a SATISFAÇÃO DOS CLIENTES (notas da pesquisa, de 1 a 5, e o que escreveram).

PERÍODO ANALISADO: ${periodoTxt}.
ATENDENTE: ${v.nome}
NÚMEROS (somente nesse período): ${s.conversas} conversas, ${s.atendidas} atendidas, ${s.semResposta} sem resposta, ${s.mensagensEnviadas} mensagens enviadas, tempo médio de resposta ${fmtSegBR(s.tmrSeg)}, tempo da 1ª resposta ${fmtSegBR(s.primeiraSeg)}, taxa de resposta ${s.taxaResposta}%.
SATISFAÇÃO (pesquisa de 1 a 5 nesse período): ${textoNPS(v.id, desde, ate)}.${coment.length ? "\nComentários dos clientes na pesquisa:\n" + coment.join("\n") : ""}

CONVERSAS NO WHATSAPP (desse período):
${conv.join("\n\n") || "Poucas conversas registradas nesse período pra avaliar o atendimento."}

Responda SOMENTE em JSON puro, sem markdown, neste formato:
{"resumo":"2 a 4 frases avaliando o atendimento dessa pessoa nesse período, levando em conta também a satisfação dos clientes","pontos_fortes":["..."],"pontos_a_melhorar":["..."],"sugestoes":["3 a 5 sugestões práticas e específicas pra essa pessoa melhorar o atendimento e a satisfação"]}
Escreva em português brasileiro, tom direto e construtivo, sem ser ofensivo.`;
    const out = parseIA(await chamarIA(prompt));
    out.vendedor = v.nome;
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ============================================================
   CANAL OFICIAL (WhatsApp Cloud API) — rotas /api/oficial/*
   ============================================================ */
const canalOficial = instalarCanalOficial({
  app,
  getDb: () => db,
  saveDB,
  proximoId,
  auth,
  gerenteOnly,
  MEDIA_DIR,
  fs,
  path,
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
  garantirPastaMidia();
  loadDB();
  canalOficial.garantirEstrutura(); // cria db.oficial depois de carregar o banco
  resetAdminSeNecessario();
  app.listen(PORT, () => console.log("✓ CRM Comercial rodando na porta", PORT));

  // BACKUP AUTOMÁTICO: a cada 10 min salva uma cópia do banco e mantém as
  // últimas 12 (≈2h de histórico). Se o banco corromper, o loadDB restaura daqui.
  function fazerBackup() {
    try {
      if (!db || !db.users) return; // não faz backup de banco vazio/sem carregar
      const dir = path.dirname(DB_PATH);
      const nome = "crm.backup." + new Date().toISOString().replace(/[:.]/g, "-") + ".json";
      fs.writeFileSync(path.join(dir, nome), JSON.stringify(db, null, 2));
      // limpa backups antigos (mantém os 12 mais recentes)
      const backups = fs.readdirSync(dir).filter((f) => f.startsWith("crm.backup.")).sort();
      while (backups.length > 12) {
        const velho = backups.shift();
        try { fs.unlinkSync(path.join(dir, velho)); } catch (_) {}
      }
    } catch (e) {
      console.error("Erro no backup automático:", e.message);
    }
  }
  fazerBackup(); // um backup logo ao subir
  setInterval(fazerBackup, 10 * 60 * 1000); // e a cada 10 minutos
});
