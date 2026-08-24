import { useState } from 'react';
import { api } from '../api.js';
import { usarTema } from '../App.jsx';
import CampoSenha from '../components/CampoSenha.jsx';

export default function Entrar({ aoEntrar }) {
  const { tema, alternarTema } = usarTema();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setErro(''); setCarregando(true);
    try {
      const { token, usuario } = await api.post('/auth/login', { email, senha });
      aoEntrar(token, usuario);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="login">
      <div className="login-form">
        <div className="login-topo">
          <button className="tema-botao" onClick={alternarTema} aria-label="Alternar tema" title="Alternar tema">
            {tema === 'escuro' ? '\u2600' : '\u263D'}
          </button>
        </div>

        <div className="login-centro">
          <img src="/logo.png" alt="Escola Instructiva" className="login-logo" />
          <h1>Bem-vindo de volta</h1>
          <p className="login-sub">Entre para acessar seus projetos e tarefas.</p>

          <form onSubmit={enviar}>
            {erro && <div className="aviso aviso-erro">{erro}</div>}

            <label className="campo">
              <span className="campo-rotulo">E-mail</span>
              <input
                className="entrada"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                placeholder="voce@escolainstructiva.com.br"
                required
              />
            </label>

            <label className="campo">
              <span className="campo-rotulo">Senha</span>
              <CampoSenha
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
                placeholder="Sua senha"
                required
              />
            </label>

            <button className="btn btn-principal" style={{ width: '100%', marginTop: 6, padding: '11px' }} disabled={carregando}>
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="login-rodape">Esqueceu a senha? Fale com o gestor para redefinir.</p>
        </div>
      </div>

      <div className="login-marca">
        <div className="login-bolha login-bolha-1" />
        <div className="login-bolha login-bolha-2" />
        <div className="login-marca-selo">
          <img src="/logo.png" alt="" />
        </div>
        <h2>Projetos Instructiva</h2>
      </div>
    </div>
  );
}
