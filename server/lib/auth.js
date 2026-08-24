import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db, salvar, novoId, etapasPadrao } from './db.js';

const SEGREDO = process.env.JWT_SEGREDO || 'instructiva-projetos-troque-isso';
const EXPIRA = '30d';

export function gerarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, papel: usuario.papel, nome: usuario.nome },
    SEGREDO,
    { expiresIn: EXPIRA }
  );
}

export function hashSenha(senha) {
  return bcrypt.hashSync(senha, 10);
}

export function conferirSenha(senha, hash) {
  try { return bcrypt.compareSync(senha, hash); } catch { return false; }
}

export function autenticar(req, res, next) {
  const cabecalho = req.headers.authorization || '';
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;
  if (!token) return res.status(401).json({ erro: 'Nao autenticado' });
  try {
    const dados = jwt.verify(token, SEGREDO);
    const usuario = db.usuarios.find((u) => u.id === dados.id && u.ativo !== false);
    if (!usuario) return res.status(401).json({ erro: 'Usuario invalido ou inativo' });
    req.usuario = usuario;
    next();
  } catch {
    return res.status(401).json({ erro: 'Sessao expirada' });
  }
}

/** Exige um dos papeis informados. admin sempre passa. */
export function exigirPapel(...papeis) {
  return (req, res, next) => {
    if (!req.usuario) return res.status(401).json({ erro: 'Nao autenticado' });
    if (req.usuario.papel === 'admin' || papeis.includes(req.usuario.papel)) return next();
    return res.status(403).json({ erro: 'Sem permissao para esta acao' });
  };
}

export const ehGestor = (u) => u && (u.papel === 'admin' || u.papel === 'gestor');

export function publico(usuario) {
  if (!usuario) return null;
  const { senhaHash, ...resto } = usuario;
  return resto;
}

/** Cria o admin inicial se o banco estiver vazio. */
export function semearAdmin() {
  if (db.usuarios.length > 0) return;
  const email = (process.env.ADMIN_EMAIL || 'admin@escolainstructiva.com.br').toLowerCase();
  const senha = process.env.ADMIN_SENHA || 'instructiva2026';
  const admin = {
    id: novoId(),
    nome: process.env.ADMIN_NOME || 'Administrador',
    email,
    senhaHash: hashSenha(senha),
    papel: 'admin',
    cargo: 'CEO',
    setor: 'Diretoria',
    apelidos: [],
    foto: null,
    etapas: etapasPadrao(),
    ativo: true,
    criadoEm: new Date().toISOString()
  };
  db.usuarios.push(admin);
  db.config.gestorPadraoId = admin.id;
  salvar('usuarios');
  salvar('config');
  console.log(`[auth] Admin inicial criado: ${email}`);
}
