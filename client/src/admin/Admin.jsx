import React, { useEffect, useState } from 'react';
import { api, usarAviso, BotaoTema } from '../comum/uteis.jsx';
import PainelPedidos from './PainelPedidos.jsx';
import PainelCardapio from './PainelCardapio.jsx';
import PainelConfig, { PainelRelatorio } from './PainelConfig.jsx';

const ABAS = [
  { chave: 'pedidos', rotulo: 'Pedidos', ico: '🧾' },
  { chave: 'cardapio', rotulo: 'Cardápio', ico: '🍛' },
  { chave: 'relatorio', rotulo: 'Vendas', ico: '📈' },
  { chave: 'config', rotulo: 'Ajustes', ico: '⚙️' },
];

export default function Admin() {
  const [autenticado, setAutenticado] = useState(!!localStorage.getItem('admin_token'));
  const [verificando, setVerificando] = useState(true);
  const [aba, setAba] = useState('pedidos');
  const [resumo, setResumo] = useState(null);

  useEffect(() => {
    if (!autenticado) { setVerificando(false); return; }
    api('/api/admin/sessao').then(() => setVerificando(false)).catch(() => { setAutenticado(false); setVerificando(false); });
  }, [autenticado]);

  useEffect(() => { document.title = 'Painel · Marmitaria'; }, []);

  if (verificando) return <div className="tela-carga"><div className="roda" /></div>;
  if (!autenticado) return <Login aoEntrar={() => setAutenticado(true)} />;

  return (
    <div className="admin">
      <div className="admin-topo">
        <h1>{ABAS.find((a) => a.chave === aba)?.rotulo}</h1>
        <BotaoTema />
        <a className="btn-mini" href="/" target="_blank" rel="noreferrer">Ver cardápio</a>
        <button className="btn-mini" onClick={() => { localStorage.removeItem('admin_token'); location.reload(); }}>Sair</button>
      </div>

      <nav className="admin-abas">
        {ABAS.map((a) => (
          <button key={a.chave} className={`admin-aba ${aba === a.chave ? 'ativa' : ''}`} onClick={() => setAba(a.chave)}>
            <span className="ico">{a.ico}</span>
            {a.rotulo}
            {a.chave === 'pedidos' && resumo?.novos > 0 && <span className="bolinha">{resumo.novos}</span>}
          </button>
        ))}
      </nav>

      {aba === 'pedidos' && <PainelPedidos aoAtualizarResumo={setResumo} />}
      {aba === 'cardapio' && <PainelCardapio />}
      {aba === 'relatorio' && <PainelRelatorio />}
      {aba === 'config' && <PainelConfig />}

    </div>
  );
}

function Login({ aoEntrar }) {
  const aviso = usarAviso();
  const [senha, setSenha] = useState('');
  const [entrando, setEntrando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setEntrando(true);
    try {
      const r = await api('/api/admin/login', { method: 'POST', body: { senha } });
      localStorage.setItem('admin_token', r.token);
      aoEntrar();
    } catch (err) { aviso(err.message, 'erro'); }
    finally { setEntrando(false); }
  }

  return (
    <div className="layout">
      <form className="login-caixa" onSubmit={entrar}>
        <img className="login-logo" src="/logo.png" alt="" />
        <h1 style={{ textAlign: 'center', fontSize: 22 }}>Painel da loja</h1>
        <p style={{ textAlign: 'center', color: 'var(--tinta-media)', fontSize: 14, marginTop: 8, marginBottom: 24 }}>
          Acompanhe pedidos, edite o cardápio e converse com os clientes.
        </p>
        <div className="campo" style={{ padding: 0, marginBottom: 16 }}>
          <label>Senha de acesso</label>
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoFocus placeholder="Digite a senha" />
        </div>
        <button className="btn btn-primario" type="submit" disabled={entrando || !senha}>{entrando ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  );
}
