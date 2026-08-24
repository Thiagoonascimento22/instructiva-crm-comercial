import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import { db, salvar, novoId, UPLOAD_DIR } from '../lib/db.js';
import { autenticar, exigirPapel } from '../lib/auth.js';
import { extrairTexto } from '../lib/extrator.js';
import { analisarDocumento, casarUsuario, interpretarPrazo } from '../lib/ia.js';
import { notificar } from '../lib/notificacoes.js';

const router = express.Router();

const EXT_OK = ['.pdf', '.docx', '.txt', '.md', '.markdown', '.csv'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${novoId()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!EXT_OK.includes(ext)) {
      return cb(new Error(`Formato ${ext} nao aceito. Use PDF, DOCX, TXT ou MD.`));
    }
    cb(null, true);
  }
});

function decodificarNome(nome) {
  // multer entrega latin1 em alguns clientes; corrige acentuacao
  try { return Buffer.from(nome, 'latin1').toString('utf8'); } catch { return nome; }
}

/** Cria as tarefas a partir do resultado da analise e aplica a regra de roteamento. */
function materializarTarefas(documento, extraidas, autorId) {
  const config = db.config;
  const gestorPadrao =
    db.usuarios.find((u) => u.id === config.gestorPadraoId && u.ativo !== false) ||
    db.usuarios.find((u) => u.papel === 'gestor' && u.ativo !== false) ||
    db.usuarios.find((u) => u.papel === 'admin');

  const criadas = [];
  const agora = new Date().toISOString();

  for (const t of extraidas) {
    const casado = t.responsavel ? casarUsuario(t.responsavel) : null;
    // Regra central:
    // - nome reconhecido e "validarTudo" desligado -> vai direto para a pessoa
    // - sem nome, nome ambiguo, ou "validarTudo" ligado -> fila de triagem do gestor
    const vaiDireto = Boolean(casado) && !config.validarTudo;

    const tarefa = {
      id: novoId(),
      titulo: t.titulo,
      descricao: t.descricao || '',
      documentoId: documento.id,
      documentoNome: documento.nome,
      projetoId: documento.projetoId || null,
      responsavelId: vaiDireto ? casado.id : null,
      etapaId: null,
      responsavelSugerido: t.responsavel || null,
      sugestaoCasada: casado ? casado.id : null,
      status: vaiDireto ? 'pendente' : 'triagem',
      prioridade: t.prioridade || 'media',
      categoria: t.categoria || '',
      prazo: interpretarPrazo(t.prazoTexto),
      prazoTexto: t.prazoTexto || null,
      trechoOrigem: t.trecho || '',
      origem: 'documento',
      criadoPor: autorId,
      criadoEm: agora,
      atualizadoEm: agora,
      concluidaEm: null,
      comentarios: [],
      historico: [
        {
          em: agora,
          por: autorId,
          acao: vaiDireto
            ? `Criada automaticamente e atribuida a ${casado.nome} (nome citado no documento)`
            : t.responsavel
              ? `Criada automaticamente. Nome "${t.responsavel}" nao bateu com um usuario unico - enviada para triagem`
              : 'Criada automaticamente sem responsavel no documento - enviada para triagem do gestor'
        }
      ]
    };

    db.tarefas.push(tarefa);
    criadas.push(tarefa);

    if (vaiDireto) {
      notificar(casado.id, 'nova_tarefa', `Nova tarefa: ${tarefa.titulo}`, tarefa.id);
    }
  }

  const emTriagem = criadas.filter((t) => t.status === 'triagem').length;
  if (emTriagem > 0 && gestorPadrao) {
    notificar(
      gestorPadrao.id,
      'triagem',
      `${emTriagem} tarefa(s) de "${documento.nome}" aguardando distribuicao`,
      null
    );
  }

  salvar('tarefas');
  salvar('notificacoes');
  return criadas;
}

async function processar(documento, autorId) {
  try {
    documento.status = 'processando';
    documento.erro = null;
    salvar('documentos');

    const texto = await extrairTexto(documento.caminho, documento.nome);
    documento.texto = texto.slice(0, 400000);
    documento.caracteres = texto.length;

    const projeto = db.projetos.find((p) => p.id === documento.projetoId);
    const analise = await analisarDocumento(texto, {
      nomeArquivo: documento.nome,
      projeto: projeto?.nome
    });

    documento.resumo = analise.resumo || '';
    documento.modoAnalise = analise.modo;

    const criadas = materializarTarefas(documento, analise.tarefas, autorId);
    documento.totalTarefas = criadas.length;
    documento.emTriagem = criadas.filter((t) => t.status === 'triagem').length;
    documento.atribuidas = criadas.length - documento.emTriagem;
    documento.status = 'processado';
    documento.processadoEm = new Date().toISOString();
  } catch (e) {
    console.error('[documentos] falha no processamento:', e);
    documento.status = 'erro';
    documento.erro = e.message || 'Falha desconhecida ao processar o documento';
  } finally {
    salvar('documentos');
  }
}

/* ---------- Rotas ---------- */

router.get('/documentos', autenticar, (req, res) => {
  const lista = db.documentos
    .map(({ texto, caminho, ...resto }) => resto)
    .sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));
  res.json(lista);
});

router.get('/documentos/:id', autenticar, (req, res) => {
  const doc = db.documentos.find((d) => d.id === req.params.id);
  if (!doc) return res.status(404).json({ erro: 'Documento nao encontrado' });
  const { caminho, ...resto } = doc;
  res.json({
    ...resto,
    tarefas: db.tarefas.filter((t) => t.documentoId === doc.id)
  });
});

router.get('/documentos/:id/arquivo', autenticar, (req, res) => {
  const doc = db.documentos.find((d) => d.id === req.params.id);
  if (!doc || !fs.existsSync(doc.caminho)) {
    return res.status(404).json({ erro: 'Arquivo nao encontrado no servidor' });
  }
  res.download(doc.caminho, doc.nome);
});

router.post(
  '/documentos',
  autenticar,
  exigirPapel('gestor', 'colaborador'),
  upload.single('arquivo'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado' });

    const documento = {
      id: novoId(),
      nome: decodificarNome(req.file.originalname),
      caminho: req.file.path,
      arquivo: req.file.filename,
      mime: req.file.mimetype,
      tamanho: req.file.size,
      projetoId: req.body?.projetoId || null,
      observacao: String(req.body?.observacao || '').slice(0, 1000),
      enviadoPor: req.usuario.id,
      enviadoPorNome: req.usuario.nome,
      status: 'processando',
      resumo: '',
      totalTarefas: 0,
      emTriagem: 0,
      atribuidas: 0,
      criadoEm: new Date().toISOString(),
      processadoEm: null,
      erro: null
    };

    db.documentos.push(documento);
    salvar('documentos');

    // responde na hora; o processamento continua em background
    res.status(202).json({ id: documento.id, status: 'processando' });
    processar(documento, req.usuario.id);
  }
);

router.post('/documentos/:id/reprocessar', autenticar, exigirPapel('gestor'), async (req, res) => {
  const doc = db.documentos.find((d) => d.id === req.params.id);
  if (!doc) return res.status(404).json({ erro: 'Documento nao encontrado' });

  // remove tarefas geradas antes que ainda nao foram tocadas
  const antes = db.tarefas.length;
  const preservadas = db.tarefas.filter(
    (t) => t.documentoId !== doc.id || t.status === 'concluida' || t.status === 'em_andamento'
  );
  db.tarefas.length = 0;
  db.tarefas.push(...preservadas);
  salvar('tarefas');

  res.status(202).json({ ok: true, removidas: antes - preservadas.length });
  processar(doc, req.usuario.id);
});

router.delete('/documentos/:id', autenticar, exigirPapel('gestor'), async (req, res) => {
  const idx = db.documentos.findIndex((d) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ erro: 'Documento nao encontrado' });
  const [doc] = db.documentos.splice(idx, 1);
  salvar('documentos');

  if (req.query.comTarefas === 'true') {
    const restantes = db.tarefas.filter((t) => t.documentoId !== doc.id);
    db.tarefas.length = 0;
    db.tarefas.push(...restantes);
    salvar('tarefas');
  }

  try { await fsp.unlink(doc.caminho); } catch {}
  res.json({ ok: true });
});

export default router;
