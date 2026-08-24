import express from 'express';
import { db, salvar, novoId, etapasPadrao } from '../lib/db.js';
import {
  gerarToken, hashSenha, conferirSenha, autenticar, exigirPapel, publico
} from '../lib/auth.js';

const router = express.Router();

/* ---------- Autenticacao ---------- */

router.post('/auth/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const senha = String(req.body?.senha || '');
  const usuario = db.usuarios.find((u) => u.email === email);
  if (!usuario || !conferirSenha(senha, usuario.senhaHash)) {
    return res.status(401).json({ erro: 'E-mail ou senha incorretos' });
  }
  if (usuario.ativo === false) {
    return res.status(403).json({ erro: 'Usuario desativado. Fale com o gestor.' });
  }
  usuario.ultimoAcesso = new Date().toISOString();
  salvar('usuarios');
  res.json({ token: gerarToken(usuario), usuario: publico(usuario) });
});

router.get('/auth/me', autenticar, (req, res) => {
  res.json({ usuario: publico(req.usuario) });
});

router.post('/auth/senha', autenticar, (req, res) => {
  const { senhaAtual, senhaNova } = req.body || {};
  if (!conferirSenha(String(senhaAtual || ''), req.usuario.senhaHash)) {
    return res.status(400).json({ erro: 'Senha atual incorreta' });
  }
  if (String(senhaNova || '').length < 6) {
    return res.status(400).json({ erro: 'A nova senha precisa ter ao menos 6 caracteres' });
  }
  req.usuario.senhaHash = hashSenha(senhaNova);
  salvar('usuarios');
  res.json({ ok: true });
});

// foto de perfil: recebe uma imagem ja reduzida (data URL) do cliente
router.post('/auth/foto', autenticar, (req, res) => {
  const foto = req.body?.foto;
  if (typeof foto !== 'string' || !/^data:image\/(png|jpeg|jpg|webp);base64,/.test(foto)) {
    return res.status(400).json({ erro: 'Envie uma imagem valida' });
  }
  if (foto.length > 700000) {
    return res.status(400).json({ erro: 'Imagem muito grande. Tente uma foto menor.' });
  }
  req.usuario.foto = foto;
  salvar('usuarios');
  res.json({ usuario: publico(req.usuario) });
});

router.delete('/auth/foto', autenticar, (req, res) => {
  req.usuario.foto = null;
  salvar('usuarios');
  res.json({ usuario: publico(req.usuario) });
});

/* ---------- Usuarios ---------- */

router.get('/usuarios', autenticar, (req, res) => {
  res.json(db.usuarios.map(publico));
});

router.post('/usuarios', autenticar, exigirPapel('gestor'), (req, res) => {
  const { nome, email, senha, papel, cargo, setor, apelidos } = req.body || {};
  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, e-mail e senha sao obrigatorios' });
  }
  const emailNorm = String(email).trim().toLowerCase();
  if (db.usuarios.some((u) => u.email === emailNorm)) {
    return res.status(400).json({ erro: 'Ja existe um usuario com este e-mail' });
  }
  const usuario = {
    id: novoId(),
    nome: String(nome).trim(),
    email: emailNorm,
    senhaHash: hashSenha(String(senha)),
    papel: ['admin', 'gestor', 'colaborador'].includes(papel) ? papel : 'colaborador',
    cargo: String(cargo || '').trim(),
    setor: String(setor || '').trim(),
    apelidos: Array.isArray(apelidos)
      ? apelidos.map((a) => String(a).trim()).filter(Boolean)
      : String(apelidos || '').split(',').map((a) => a.trim()).filter(Boolean),
    etapas: etapasPadrao(),
    foto: null,
    ativo: true,
    criadoEm: new Date().toISOString()
  };
  db.usuarios.push(usuario);
  salvar('usuarios');
  res.status(201).json(publico(usuario));
});

router.patch('/usuarios/:id', autenticar, (req, res) => {
  const alvo = db.usuarios.find((u) => u.id === req.params.id);
  if (!alvo) return res.status(404).json({ erro: 'Usuario nao encontrado' });

  const souEu = alvo.id === req.usuario.id;
  const souGestor = req.usuario.papel === 'admin' || req.usuario.papel === 'gestor';
  if (!souEu && !souGestor) return res.status(403).json({ erro: 'Sem permissao' });

  const { nome, email, setor, cargo, apelidos, papel, ativo, senha } = req.body || {};
  if (nome !== undefined) alvo.nome = String(nome).trim();
  if (setor !== undefined) alvo.setor = String(setor).trim();
  if (cargo !== undefined) alvo.cargo = String(cargo).trim();
  if (apelidos !== undefined) {
    alvo.apelidos = Array.isArray(apelidos)
      ? apelidos.map((a) => String(a).trim()).filter(Boolean)
      : String(apelidos).split(',').map((a) => a.trim()).filter(Boolean);
  }
  if (email !== undefined) {
    const e = String(email).trim().toLowerCase();
    if (db.usuarios.some((u) => u.email === e && u.id !== alvo.id)) {
      return res.status(400).json({ erro: 'E-mail ja usado por outro usuario' });
    }
    alvo.email = e;
  }
  if (souGestor && papel !== undefined && ['admin', 'gestor', 'colaborador'].includes(papel)) {
    alvo.papel = papel;
  }
  if (souGestor && ativo !== undefined) alvo.ativo = Boolean(ativo);
  if (souGestor && senha) alvo.senhaHash = hashSenha(String(senha));

  salvar('usuarios');
  res.json(publico(alvo));
});

router.delete('/usuarios/:id', autenticar, exigirPapel('gestor'), (req, res) => {
  const alvo = db.usuarios.find((u) => u.id === req.params.id);
  if (!alvo) return res.status(404).json({ erro: 'Usuario nao encontrado' });
  if (alvo.id === req.usuario.id) {
    return res.status(400).json({ erro: 'Voce nao pode desativar a si mesmo' });
  }
  // desativa em vez de apagar: preserva historico das tarefas
  alvo.ativo = false;
  salvar('usuarios');
  res.json({ ok: true, usuario: publico(alvo) });
});

export default router;
