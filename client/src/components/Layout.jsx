import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { usarSessao, usarTema } from '../App.jsx';
import { api, dataHoraBR } from '../api.js';
import { Avatar } from './Comuns.jsx';

const ITENS = [
  { para: '/', icone: '\u25EB', rotulo: 'Painel', fim: true },
  { para: '/meu-fluxo', icone: '\u25A6', rotulo: 'Meu fluxo' },
  { para: '/minhas-tarefas', icone: '\u2713', rotulo: 'Minhas tarefas', contador: 'minhas' },
  { para: '/triagem', icone: '\u2691', rotulo: 'Triagem', gestor: true, contador: 'triagem' },
  { para: '/tarefas', icone: '\u2261', rotulo: 'Todas as tarefas', gestor: true },
  { para: '/documentos', icone: '\u25A4', rotulo: 'Documentos' },
  { para: '/projetos', icone: '\u25C8', rotulo: 'Projetos' }
];

const ITENS_ADMIN = [
  { para: '/equipe', icone: '\u263A', rotulo: 'Equipe', gestor: true },
  { para: '/configuracoes', icone: '\u2699', rotulo: 'Configuracoes' }
];

export default function Layout({ children }) {
  const { usuario, sair, gestor, contadores } = usarSessao();
  const { tema, alternarTema } = usarTema();
  const [aberta, setAberta] = useState(false);
  const [notificacoes, setNotificacoes] = useState([]);
  const [verNotif, setVerNotif] = useState(false);
  const local = useLocation();

  useEffect(() => { setAberta(false); setVerNotif(false); }, [local.pathname]);

  async function abrirNotificacoes() {
    if (!verNotif) {
      try {
        const lista = await api.get('/notificacoes');
        setNotificacoes(lista);
        if (lista.some((n) => !n.lida)) api.post('/notificacoes/lidas', {}).catch(() => {});
      } catch {}
    }
    setVerNotif(!verNotif);
  }

  const links = (lista) =>
    lista
      .filter((i) => !i.gestor || gestor)
      .map((i) => (
        <NavLink
          key={i.para}
          to={i.para}
          end={i.fim}
          className={({ isActive }) => `nav-item${isActive ? ' ativo' : ''}`}
        >
          <span className="icone">{i.icone}</span>
          <span>{i.rotulo}</span>
          {i.contador && contadores[i.contador] > 0 && (
            <span className="nav-badge">{contadores[i.contador]}</span>
          )}
        </NavLink>
      ));

  return (
    <div className="app">
      <aside className={`barra${aberta ? ' aberta' : ''}`}>
        <div className="marca">
          <div className="marca-linha">
            <img src="/logo.png" alt="Instructiva" className="marca-logo" />
            <div>
              <div className="marca-nome">Projetos</div>
              <div className="marca-sub">Escola Instructiva</div>
            </div>
          </div>
        </div>

        <nav className="nav">
          <div className="nav-titulo">Trabalho</div>
          {links(ITENS)}
          <div className="nav-titulo">Administracao</div>
          {links(ITENS_ADMIN)}
        </nav>

        <div className="rodape-barra">
          <div className="usuario-linha">
            <Avatar nome={usuario.nome} foto={usuario.foto} tam={34} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="usuario-nome truncar">{usuario.nome}</div>
              <div className="usuario-papel">{usuario.cargo || usuario.papel}</div>
            </div>
            <button className="btn btn-fantasma btn-p" onClick={sair} title="Sair" aria-label="Sair">
              &#8618;
            </button>
          </div>
        </div>
      </aside>

      <div className="conteudo">
        <header className="topo">
          <button
            className="btn btn-fantasma btn-p"
            style={{ display: 'none' }}
            id="abrir-menu"
            onClick={() => setAberta(!aberta)}
            aria-label="Menu"
          >
            &#9776;
          </button>
          <div className="topo-texto">
            <h1>{titulo(local.pathname)}</h1>
            <div className="topo-sub">{subtitulo(local.pathname, gestor)}</div>
          </div>

          <button className="tema-botao" onClick={alternarTema} aria-label="Alternar tema" title="Modo claro / escuro">
            {tema === 'escuro' ? '\u2600' : '\u263D'}
          </button>

          <div style={{ position: 'relative' }}>
            <button className="btn btn-p" onClick={abrirNotificacoes}>
              &#9788; Avisos
              {contadores.naoLidas > 0 && <span className="nav-badge">{contadores.naoLidas}</span>}
            </button>
            {verNotif && (
              <div
                className="cartao"
                style={{
                  position: 'absolute', right: 0, top: 42, width: 336,
                  zIndex: 50, maxHeight: 420, overflowY: 'auto', boxShadow: 'var(--sombra-lg)'
                }}
              >
                {notificacoes.length === 0 ? (
                  <div className="vazio pequeno" style={{ padding: 26 }}>Nenhum aviso por aqui.</div>
                ) : (
                  notificacoes.map((n) => (
                    <div key={n.id} style={{ padding: '11px 14px', borderBottom: '1px solid var(--linha)' }}>
                      <div style={{ fontWeight: n.lida ? 500 : 700, fontSize: 13 }}>{n.mensagem}</div>
                      <div className="pequeno silencioso" style={{ marginTop: 3 }}>{dataHoraBR(n.criadoEm)}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </header>

        <main className="pagina">{children}</main>
      </div>

      <style>{`@media (max-width: 760px){ #abrir-menu{ display:inline-flex !important; } }`}</style>
    </div>
  );
}

function titulo(caminho) {
  if (caminho === '/') return 'Painel';
  if (caminho.startsWith('/meu-fluxo')) return 'Meu fluxo';
  if (caminho.startsWith('/minhas-tarefas')) return 'Minhas tarefas';
  if (caminho.startsWith('/triagem')) return 'Triagem';
  if (caminho.startsWith('/tarefas')) return 'Todas as tarefas';
  if (caminho.startsWith('/documentos')) return 'Documentos';
  if (caminho.startsWith('/projetos')) return 'Projetos';
  if (caminho.startsWith('/equipe')) return 'Equipe';
  if (caminho.startsWith('/configuracoes')) return 'Configuracoes';
  return 'Projetos';
}

function subtitulo(caminho, gestor) {
  if (caminho === '/') return gestor ? 'Visao geral da operacao' : 'Seu resumo do dia';
  if (caminho.startsWith('/meu-fluxo')) return 'Organize suas tarefas nas suas proprias etapas';
  if (caminho.startsWith('/minhas-tarefas')) return 'O que esta sob a sua responsabilidade';
  if (caminho.startsWith('/triagem')) return 'Tarefas sem dono definido, aguardando sua distribuicao';
  if (caminho.startsWith('/tarefas')) return 'Tudo o que foi gerado e distribuido';
  if (caminho.startsWith('/documentos')) return 'Envie um playbook e o sistema cria as tarefas';
  if (caminho.startsWith('/projetos')) return 'Agrupe documentos e tarefas por frente de trabalho';
  if (caminho.startsWith('/equipe')) return 'Pessoas, cargos, setores e apelidos reconhecidos nos documentos';
  if (caminho.startsWith('/configuracoes')) return 'Regras de distribuicao e sua conta';
  return '';
}
