import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { DATA_DIR, UPLOAD_DIR } from './lib/db.js';
import { semearAdmin } from './lib/auth.js';
import usuarios from './routes/usuarios.js';
import documentos from './routes/documentos.js';
import tarefas from './routes/tarefas.js';
import fluxo from './routes/fluxo.js';
import geral from './routes/geral.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(__dirname, '..');
const PORTA = process.env.PORT || 3000;

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '5mb' }));

app.get('/api/saude', (req, res) => {
  res.json({
    ok: true,
    versao: '1.0.0',
    iaAtiva: Boolean(process.env.OPENAI_API_KEY),
    dataDir: DATA_DIR,
    hora: new Date().toISOString()
  });
});

app.use('/api', usuarios);
app.use('/api', documentos);
app.use('/api', tarefas);
app.use('/api', fluxo);
app.use('/api', geral);

// erros de upload e afins
app.use('/api', (err, req, res, next) => {
  console.error('[api]', err.message);
  const codigo = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
  res.status(codigo).json({ erro: err.message || 'Erro ao processar a requisicao' });
});

// front buildado
const DIST = path.join(RAIZ, 'client', 'dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(DIST, 'index.html'));
  });
} else {
  app.get('/', (req, res) =>
    res.send('<h1>Instructiva Projetos</h1><p>Front-end nao buildado. Rode: npm run build</p>')
  );
}

semearAdmin();

app.listen(PORTA, () => {
  console.log(`\n  Instructiva Projetos v1.0.0`);
  console.log(`  Porta:     ${PORTA}`);
  console.log(`  Dados:     ${DATA_DIR}`);
  console.log(`  Uploads:   ${UPLOAD_DIR}`);
  console.log(`  IA:        ${process.env.OPENAI_API_KEY ? 'ativa (OpenAI)' : 'inativa - modo heuristico'}\n`);
});
