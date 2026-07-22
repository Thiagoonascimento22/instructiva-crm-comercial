/**
 * Escola Instructiva — Vagas
 * Landing page de vaga + painel /admin de candidaturas.
 *
 * Dados e currículos são gravados em DATA_DIR (no Railway: um Volume montado em /data).
 * Nada é destrutivo: o arquivo de candidaturas é só criado se não existir e cresce por append.
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// ----- caminhos de dados (persistência) -----
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const CV_DIR = path.join(DATA_DIR, 'curriculos');
const DB_FILE = path.join(DATA_DIR, 'candidaturas.json');

// ----- senha do painel (TROQUE em produção) -----
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'instructiva2026';

// ----- notificação WhatsApp via Evolution API (opcional) -----
const EVOLUTION_URL = process.env.EVOLUTION_URL || '';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || '';
const NOTIFY_NUMBER = process.env.NOTIFY_NUMBER || ''; // ex: 5544997042737

// garante que as pastas e o arquivo existem
fs.mkdirSync(CV_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// arquivos públicos (landing page). NÃO servimos a pasta de dados aqui.
app.use(express.static(path.join(__dirname, 'public')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ---------- helpers de banco (fila de escrita p/ evitar corrida) ----------
let writeChain = Promise.resolve();
function readDB() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch (e) { return []; }
}
function appendDB(rec) {
  writeChain = writeChain.then(() => new Promise((resolve) => {
    const list = readDB();
    list.unshift(rec); // mais recente primeiro
    fs.writeFile(DB_FILE, JSON.stringify(list, null, 2), () => resolve());
  }));
  return writeChain;
}
function updateDB(id, patch) {
  writeChain = writeChain.then(() => new Promise((resolve) => {
    const list = readDB();
    const i = list.findIndex((r) => r.id === id);
    if (i >= 0) list[i] = Object.assign({}, list[i], patch);
    fs.writeFile(DB_FILE, JSON.stringify(list, null, 2), () => resolve(i >= 0));
  }));
  return writeChain;
}
function deleteDB(id) {
  let removed = null;
  writeChain = writeChain.then(() => new Promise((resolve) => {
    const list = readDB();
    const i = list.findIndex((r) => r.id === id);
    if (i >= 0) removed = list.splice(i, 1)[0];
    fs.writeFile(DB_FILE, JSON.stringify(list, null, 2), () => resolve());
  }));
  return writeChain.then(() => removed);
}

// ---------- upload de currículo ----------
const ALLOWED = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CV_DIR),
  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname || '').toLowerCase().replace(/[^.\w]/g, '').slice(0, 12);
    const base = 'cv_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    cb(null, base + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) return cb(null, true);
    const err = new Error('Formato não suportado. Envie uma imagem, PDF ou DOC.');
    err.status = 400;
    cb(err);
  }
});

// ---------- notificação WhatsApp (não bloqueante) ----------
async function notifyWhatsApp(rec) {
  if (!EVOLUTION_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE || !NOTIFY_NUMBER) return;
  const msg =
    '🟠 Nova candidatura — Vendedor(a) Toledo-PR\n\n' +
    'Nome: ' + rec.nome + '\n' +
    'WhatsApp: ' + rec.whatsapp + '\n' +
    'Cidade: ' + rec.cidade + '\n' +
    'Experiência: ' + rec.experiencia + '\n' +
    'Recebido: ' + new Date(rec.createdAt).toLocaleString('pt-BR') + '\n\n' +
    'Veja no painel: /admin';
  try {
    const url = EVOLUTION_URL.replace(/\/$/, '') + '/message/sendText/' + EVOLUTION_INSTANCE;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
      body: JSON.stringify({ number: NOTIFY_NUMBER, text: msg })
    });
  } catch (e) {
    console.error('Falha ao notificar no WhatsApp:', e.message);
  }
}

// ---------- receber candidatura ----------
app.post('/api/candidaturas', upload.single('curriculo'), async (req, res) => {
  try {
    const { nome, whatsapp, cidade, experiencia, website } = req.body || {};

    // honeypot anti-bot: se veio preenchido, finge que deu certo e ignora
    if (website) return res.json({ ok: true });

    const digits = (whatsapp || '').replace(/\D/g, '');
    if (!nome || nome.trim().length < 2) return res.status(400).json({ ok: false, error: 'Informe seu nome.' });
    if (digits.length < 10) return res.status(400).json({ ok: false, error: 'Informe um WhatsApp válido.' });
    if (!cidade || cidade.trim().length < 2) return res.status(400).json({ ok: false, error: 'Informe sua cidade.' });
    if (!req.file) return res.status(400).json({ ok: false, error: 'Anexe seu currículo.' });

    const rec = {
      id: Date.now().toString(36) + crypto.randomBytes(3).toString('hex'),
      nome: nome.trim(),
      whatsapp: whatsapp.trim(),
      cidade: cidade.trim(),
      experiencia: (experiencia || '').trim() || 'Não informado',
      curriculo: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      },
      createdAt: new Date().toISOString()
    };

    await appendDB(rec);
    notifyWhatsApp(rec); // dispara sem travar a resposta
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'Erro ao salvar candidatura. Tente novamente.' });
  }
});

// ---------- autenticação simples do painel ----------
function passwordOk(candidate) {
  const a = Buffer.from(String(candidate || ''));
  const b = Buffer.from(ADMIN_PASSWORD);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (passwordOk(token)) return next();
  res.status(401).json({ ok: false, error: 'Não autorizado.' });
}

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (passwordOk(password)) return res.json({ ok: true, token: ADMIN_PASSWORD });
  res.status(401).json({ ok: false, error: 'Senha incorreta.' });
});

app.get('/api/admin/candidaturas', requireAuth, (req, res) => {
  res.json({ ok: true, candidaturas: readDB() });
});

// marcar / desmarcar candidatura como vista
app.post('/api/admin/candidaturas/:id/visto', requireAuth, async (req, res) => {
  const visto = !!(req.body && req.body.visto);
  const found = await updateDB(req.params.id, { visto, vistoAt: visto ? new Date().toISOString() : null });
  if (!found) return res.status(404).json({ ok: false, error: 'Candidatura não encontrada.' });
  res.json({ ok: true, visto });
});

// excluir candidatura (e apagar o currículo do disco)
app.delete('/api/admin/candidaturas/:id', requireAuth, async (req, res) => {
  const removed = await deleteDB(req.params.id);
  if (!removed) return res.status(404).json({ ok: false, error: 'Candidatura não encontrada.' });
  try {
    if (removed.curriculo && removed.curriculo.filename) {
      const fp = path.join(CV_DIR, removed.curriculo.filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
  } catch (e) {
    console.error('Falha ao apagar currículo:', e.message);
  }
  res.json({ ok: true });
});

app.get('/api/admin/curriculo/:id', requireAuth, (req, res) => {
  const rec = readDB().find((r) => r.id === req.params.id);
  if (!rec) return res.status(404).json({ ok: false, error: 'Candidatura não encontrada.' });
  const fp = path.join(CV_DIR, rec.curriculo.filename);
  if (!fs.existsSync(fp)) return res.status(404).json({ ok: false, error: 'Arquivo não encontrado.' });
  res.download(fp, rec.curriculo.originalName || rec.curriculo.filename);
});

app.get('/api/admin/export.csv', requireAuth, (req, res) => {
  const list = readDB();
  const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const rows = [['Nome', 'WhatsApp', 'Cidade', 'Experiência', 'Data', 'Arquivo'].map(esc).join(',')];
  list.forEach((r) => rows.push([
    r.nome, r.whatsapp, r.cidade, r.experiencia,
    new Date(r.createdAt).toLocaleString('pt-BR'), r.curriculo.originalName
  ].map(esc).join(',')));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="candidaturas.csv"');
  res.send('\uFEFF' + rows.join('\n')); // BOM p/ acentos no Excel
});

// ---------- tratamento de erros de upload ----------
app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ ok: false, error: 'Arquivo muito grande (máximo 8 MB).' });
  }
  if (err) {
    return res.status(err.status || 400).json({ ok: false, error: err.message || 'Não foi possível enviar o arquivo.' });
  }
  next();
});

app.listen(PORT, () => {
  console.log('Instructiva Vagas rodando na porta ' + PORT);
  console.log('Dados em: ' + DATA_DIR);
});
