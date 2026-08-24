import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { api, pegarToken, guardarToken } from './api.js';
import Layout from './components/Layout.jsx';
import Entrar from './pages/Entrar.jsx';
import Painel from './pages/Painel.jsx';
import MeuFluxo from './pages/MeuFluxo.jsx';
import Documentos from './pages/Documentos.jsx';
import DocumentoDetalhe from './pages/DocumentoDetalhe.jsx';
import Triagem from './pages/Triagem.jsx';
import Tarefas from './pages/Tarefas.jsx';
import Equipe from './pages/Equipe.jsx';
import Projetos from './pages/Projetos.jsx';
import Configuracoes from './pages/Configuracoes.jsx';

const Sessao = createContext(null);
export const usarSessao = () => useContext(Sessao);

const Tema = createContext(null);
export const usarTema = () => useContext(Tema);

function ProvedorTema({ children }) {
  const [tema, setTema] = useState(() => {
    try { return localStorage.getItem('instructiva.tema') || 'claro'; } catch { return 'claro'; }
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema);
    try { localStorage.setItem('instructiva.tema', tema); } catch {}
  }, [tema]);
  const alternarTema = useCallback(() => setTema((t) => (t === 'claro' ? 'escuro' : 'claro')), []);
  return <Tema.Provider value={{ tema, alternarTema }}>{children}</Tema.Provider>;
}

export default function App() {
  return (
    <ProvedorTema>
      <Conteudo />
    </ProvedorTema>
  );
}

function Conteudo() {
  const [usuario, setUsuario] = useState(null);
  const [config, setConfig] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [contadores, setContadores] = useState({ triagem: 0, minhas: 0, naoLidas: 0 });
  const local = useLocation();

  const carregarSessao = useCallback(async () => {
    if (!pegarToken()) { setCarregando(false); return; }
    try {
      const [{ usuario: u }, c] = await Promise.all([api.get('/auth/me'), api.get('/config')]);
      setUsuario(u);
      setConfig(c);
    } catch {
      guardarToken(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregarSessao(); }, [carregarSessao]);

  const atualizarContadores = useCallback(async () => {
    if (!pegarToken()) return;
    try {
      const [painel, notificacoes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/notificacoes')
      ]);
      setContadores({
        triagem: painel.resumo.triagem || 0,
        minhas: painel.minhasProximas?.length || 0,
        naoLidas: notificacoes.filter((n) => !n.lida).length
      });
    } catch {}
  }, []);

  useEffect(() => { if (usuario) atualizarContadores(); }, [usuario, local.pathname, atualizarContadores]);

  function entrar(token, u) {
    guardarToken(token);
    setUsuario(u);
    api.get('/config').then(setConfig).catch(() => {});
  }

  function sair() {
    guardarToken(null);
    setUsuario(null);
  }

  if (carregando) {
    return (
      <div className="login" style={{ gridTemplateColumns: '1fr' }}>
        <div style={{ display: 'grid', placeItems: 'center' }}>
          <div className="silencioso"><span className="girando">&#9696;</span> Carregando...</div>
        </div>
      </div>
    );
  }

  if (!usuario) {
    return (
      <Routes>
        <Route path="/entrar" element={<Entrar aoEntrar={entrar} />} />
        <Route path="*" element={<Navigate to="/entrar" replace />} />
      </Routes>
    );
  }

  const gestor = usuario.papel === 'admin' || usuario.papel === 'gestor';

  return (
    <Sessao.Provider value={{ usuario, setUsuario, config, setConfig, sair, gestor, contadores, atualizarContadores }}>
      <Layout>
        <Routes>
          <Route path="/" element={<Painel />} />
          <Route path="/meu-fluxo" element={<MeuFluxo />} />
          <Route path="/minhas-tarefas" element={<Tarefas soMinhas />} />
          <Route path="/tarefas" element={gestor ? <Tarefas /> : <Navigate to="/minhas-tarefas" replace />} />
          <Route path="/triagem" element={gestor ? <Triagem /> : <Navigate to="/" replace />} />
          <Route path="/documentos" element={<Documentos />} />
          <Route path="/documentos/:id" element={<DocumentoDetalhe />} />
          <Route path="/projetos" element={<Projetos />} />
          <Route path="/equipe" element={gestor ? <Equipe /> : <Navigate to="/" replace />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/entrar" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Sessao.Provider>
  );
}
