import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { UPLOADS_DIR, ler } from './src/db.js';
import publico from './src/routes/publico.js';
import admin from './src/routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));

app.get('/api/saude', (req, res) => res.json({ ok: true, hora: new Date().toISOString() }));
app.use('/api', publico);
app.use('/api/admin', admin);

app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '30d' }));

const DIST = path.join(__dirname, 'dist');
app.use(express.static(DIST, { maxAge: '1h', index: false }));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ erro: 'Rota não encontrada.' });
  const indexPath = path.join(DIST, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return res.status(503).send('<h1>Build não encontrado</h1><p>Rode <code>npm run build</code> antes de iniciar o servidor.</p>');
  }
  res.sendFile(indexPath);
});

app.listen(PORT, () => {
  ler('config');
  ler('cardapio');
  ler('pedidos');
  console.log(`Marmitaria delivery rodando na porta ${PORT}`);
});
