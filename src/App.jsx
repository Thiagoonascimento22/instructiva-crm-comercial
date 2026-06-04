import React, { useState, useEffect, useMemo, useRef } from "react";
import { api, getToken, setToken } from "./api.js";
import { LOGO_FULL, LOGO_LIGHT } from "./logos.js";

/* ============================ ÍCONES ============================ */
const I = {
  pipe: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="6" height="14" rx="1"/><rect x="9.5" y="3" width="6" height="9" rx="1"/><rect x="16" y="3" width="5" height="6" rx="1"/></svg>
  ),
  team: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  cog: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  ),
  plus: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>),
  wa: (p) => (<svg {...p} viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.02c-1.52 0-3-.41-4.29-1.18l-.31-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.39c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.24-8.24 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.98-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.16 1.75 2.67 4.25 3.74.59.26 1.06.41 1.42.52.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z"/></svg>),
  x: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>),
  trash: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>),
  out: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>),
  empty: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>),
  send: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>),
  search: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>),
  chat: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>),
  power: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v10M18.4 6.6a9 9 0 1 1-12.8 0"/></svg>),
  refresh: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></svg>),
  link: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5"/></svg>),
  dash: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6" rx="1"/><rect x="12" y="7" width="3" height="10" rx="1"/><rect x="17" y="13" width="3" height="4" rx="1"/></svg>),
  medal: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="15" r="6"/><path d="M9 9 6.5 2M15 9l2.5-7M9.5 2h5"/></svg>),
  target: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></svg>),
};

/* ============================ HELPERS ============================ */
const ETAPAS = [
  { id: "lead", nome: "Lead Novo", cor: "var(--lead)" },
  { id: "contato", nome: "Em Contato", cor: "var(--contato)" },
  { id: "negociando", nome: "Negociando", cor: "var(--negociando)" },
  { id: "fechou", nome: "Fechou", cor: "var(--fechou)" },
  { id: "perdeu", nome: "Perdeu", cor: "var(--perdeu)" },
];
const corEtapa = (id) => (ETAPAS.find((e) => e.id === id) || ETAPAS[0]).cor;

function fmtMoney(n) {
  return "R$ " + (Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function iniciais(nome) {
  const p = (nome || "?").trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
}
const soDigitos = (s) => (s || "").replace(/\D/g, "");
const limpaInst = (s) =>
  (s || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, "");

/* ============================ APP ============================ */
export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);
  const [view, setView] = useState("painel");
  const [toast, setToast] = useState(null);
  const toastT = useRef(null);

  useEffect(() => {
    if (!getToken()) { setBooting(false); return; }
    api.me().then(setUser).catch(() => setToken("")).finally(() => setBooting(false));
  }, []);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), 2600);
  }
  function logout() {
    setToken("");
    setUser(null);
    setView("painel");
  }

  if (booting) return <div className="login-wrap"><div className="spin" /></div>;
  if (!user) return <Login onDone={(u) => setUser(u)} />;
  if (user.precisaOnboarding) return <Onboarding user={user} onDone={setUser} />;

  const isGer = user.role === "gerente";
  const titulos = {
    painel: { t: "Painel Comercial", s: "Visão geral das vendas e metas" },
    pipeline: { t: "Pipeline de Vendas", s: "Arraste os cards conforme a negociação avança" },
    whatsapp: { t: "WhatsApp", s: "Atenda seus leads sem sair do sistema" },
    equipe: { t: "Equipe & Acessos", s: "Gerencie os vendedores e suas metas" },
    config: { t: "Configurações", s: "Seus dados de acesso" },
  };
  const hora = new Date().getHours();
  const saud = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img src={LOGO_LIGHT} alt="Instructiva" />
          <div className="tag">CRM Comercial</div>
        </div>
        <nav className="nav">
          <NavBtn ic={I.dash} label="Painel" active={view === "painel"} onClick={() => setView("painel")} />
          <NavBtn ic={I.pipe} label="Pipeline" active={view === "pipeline"} onClick={() => setView("pipeline")} />
          <NavBtn ic={I.wa} label="WhatsApp" active={view === "whatsapp"} onClick={() => setView("whatsapp")} />
          {isGer && <NavBtn ic={I.team} label="Equipe & Acessos" active={view === "equipe"} onClick={() => setView("equipe")} />}
          <NavBtn ic={I.cog} label="Configurações" active={view === "config"} onClick={() => setView("config")} />
        </nav>
        <div className="side-foot">
          <div className="side-user">
            <div className="avatar">{iniciais(user.nome)}</div>
            <div>
              <div className="nm">{user.nome}</div>
              <div className="rl">{isGer ? "Gerente comercial" : "Vendedor"}</div>
            </div>
          </div>
          <button className="logout" onClick={logout}>Sair</button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <div className="greet">{view === "pipeline" ? `${saud}, ${user.nome.split(" ")[0]} 👋` : titulos[view].t}</div>
            <div className="sub">{titulos[view].s}</div>
          </div>
        </div>
        <div className="content">
          {view === "painel" && <Dashboard user={user} showToast={showToast} irParaPipeline={() => setView("pipeline")} />}
          {view === "pipeline" && <Pipeline user={user} showToast={showToast} />}
          {view === "whatsapp" && <WhatsApp user={user} showToast={showToast} />}
          {view === "equipe" && isGer && <Equipe showToast={showToast} meId={user.id} />}
          {view === "config" && <Config user={user} setUser={setUser} showToast={showToast} />}
        </div>
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function NavBtn({ ic: Ico, label, active, onClick }) {
  return (
    <button className={active ? "active" : ""} onClick={onClick}>
      <Ico className="ico" />
      <span>{label}</span>
    </button>
  );
}

/* ============================ LOGIN ============================ */
function Login({ onDone }) {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const r = await api.login(login, senha);
      setToken(r.token);
      onDone(r.user);
    } catch (e) {
      setErr(e.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={entrar}>
        <img className="logo" src={LOGO_FULL} alt="Instructiva" />
        <div className="ttl">CRM Comercial</div>
        <h2>Entrar</h2>
        <p className="hi">Acesse com seu usuário e senha.</p>
        {err && <div className="err">{err}</div>}
        <div className="field">
          <label>Usuário</label>
          <input className="input" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="seu usuário" autoFocus />
        </div>
        <div className="field">
          <label>Senha</label>
          <input className="input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" />
        </div>
        <button className="btn btn-primary full" disabled={loading} style={{ marginTop: 6 }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

/* ============================ ONBOARDING ============================ */
function Onboarding({ user, onDone }) {
  const [nome, setNome] = useState(user.nome === "Gerente Comercial" ? "" : user.nome);
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const dados = { nome };
      if (senha) dados.senha = senha;
      const u = await api.updateMe(dados);
      onDone(u);
    } finally { setLoading(false); }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={salvar}>
        <img className="logo" src={LOGO_FULL} alt="Instructiva" />
        <div className="ttl">Primeiro acesso</div>
        <h2>Seja bem-vindo(a)! 🎉</h2>
        <p className="hi">Confirme seu nome e defina uma senha sua.</p>
        <div className="field">
          <label>Seu nome</label>
          <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Maria Souza" required autoFocus />
        </div>
        <div className="field">
          <label>Nova senha</label>
          <input className="input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="mínimo 3 caracteres" />
        </div>
        <button className="btn btn-primary full" disabled={loading || !nome.trim()}>
          {loading ? "Salvando..." : "Começar"}
        </button>
      </form>
    </div>
  );
}

/* ============================ PIPELINE (KANBAN) ============================ */
function Pipeline({ user, showToast }) {
  const isGer = user.role === "gerente";
  const [cards, setCards] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todos");
  const [overCol, setOverCol] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [sel, setSel] = useState(null); // card aberto no drawer
  const [novo, setNovo] = useState(false); // modal novo lead
  const [fechar, setFechar] = useState(null); // { card } -> modal valor final

  const usersMap = useMemo(() => {
    const m = {};
    users.forEach((u) => (m[u.id] = u));
    m[user.id] = m[user.id] || user;
    return m;
  }, [users, user]);

  async function carregar() {
    setLoading(true);
    try {
      const [cs] = await Promise.all([api.listCards(isGer ? filtro : null)]);
      setCards(cs);
      if (isGer && users.length === 0) {
        const us = await api.listUsers();
        setUsers(us);
      }
    } catch (e) {
      showToast("✗ " + e.message);
    } finally { setLoading(false); }
  }
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [filtro]);

  function nomeResp(id) {
    return usersMap[id]?.nome || "—";
  }

  async function moverPara(card, etapa) {
    if (card.etapa === etapa) return;
    if (etapa === "fechou") { setFechar({ card }); return; }
    try {
      await api.updateCard(card.id, { etapa });
      setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, etapa } : c)));
    } catch (e) { showToast("✗ " + e.message); }
  }

  // ---- drag handlers ----
  function onDrop(e, etapa) {
    e.preventDefault();
    setOverCol(null);
    const id = e.dataTransfer.getData("id") || dragId;
    const card = cards.find((c) => c.id === id);
    if (card) moverPara(card, etapa);
    setDragId(null);
  }

  const stats = useMemo(() => {
    const ativos = cards.filter((c) => !["fechou", "perdeu"].includes(c.etapa));
    const fechados = cards.filter((c) => c.etapa === "fechou");
    const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
    const fechadosMes = fechados.filter((c) => (c.atualizadoEm || 0) >= inicioMes.getTime());
    const totalMes = fechadosMes.reduce((s, c) => s + (c.valorFinal || 0), 0);
    const totalNeg = cards.filter((c) => c.etapa === "negociando").reduce((s, c) => s + (c.valorEstimado || 0), 0);
    return { abertos: ativos.length, fechadosMes: fechadosMes.length, totalMes, totalNeg };
  }, [cards]);

  if (loading) return <div className="spin" />;

  return (
    <>
      {/* AÇÕES */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        {isGer ? (
          <select className="select" style={{ width: 230 }} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="todos">Todos os vendedores</option>
            {users.filter((u) => u.ativo).map((u) => (
              <option key={u.id} value={u.id}>{u.nome}</option>
            ))}
          </select>
        ) : <div />}
        <button className="btn btn-primary" onClick={() => setNovo(true)}>
          <I.plus style={{ width: 16, height: 16 }} /> Novo lead
        </button>
      </div>

      {/* STATS */}
      <div className="stats">
        <div className="stat">
          <div className="lab"><span className="dot" style={{ background: "var(--contato)" }} /> Em aberto</div>
          <div className="val">{stats.abertos}</div>
        </div>
        <div className="stat">
          <div className="lab"><span className="dot" style={{ background: "var(--negociando)" }} /> Em negociação</div>
          <div className="val money">{fmtMoney(stats.totalNeg)}</div>
        </div>
        <div className="stat">
          <div className="lab"><span className="dot" style={{ background: "var(--fechou)" }} /> Fechados no mês</div>
          <div className="val">{stats.fechadosMes}</div>
        </div>
        <div className="stat">
          <div className="lab"><span className="dot" style={{ background: "var(--fechou)" }} /> Vendido no mês</div>
          <div className="val money">{fmtMoney(stats.totalMes)}</div>
        </div>
      </div>

      {/* KANBAN */}
      <div className="board">
        {ETAPAS.map((et) => {
          const lista = cards.filter((c) => c.etapa === et.id);
          return (
            <div
              key={et.id}
              className={"col" + (overCol === et.id ? " over" : "")}
              onDragOver={(e) => { e.preventDefault(); setOverCol(et.id); }}
              onDragLeave={(e) => { if (e.currentTarget === e.target) setOverCol(null); }}
              onDrop={(e) => onDrop(e, et.id)}
            >
              <div className="col-h">
                <div className="nm"><span className="bar" style={{ background: et.cor }} /> {et.nome}</div>
                <span className="cnt">{lista.length}</span>
              </div>
              <div className="col-body">
                {lista.length === 0 && <div className="col-empty">Arraste cards pra cá</div>}
                {lista.map((c) => (
                  <div
                    key={c.id}
                    className={"kcard" + (dragId === c.id ? " dragging" : "")}
                    style={{ borderLeftColor: et.cor }}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("id", c.id); setDragId(c.id); }}
                    onDragEnd={() => { setDragId(null); setOverCol(null); }}
                    onClick={() => setSel(c)}
                  >
                    <div className="nm">{c.cliente}</div>
                    <div className={"val" + (c.etapa === "fechou" ? " win" : "")}>
                      {c.etapa === "fechou" ? fmtMoney(c.valorFinal) : fmtMoney(c.valorEstimado)}
                    </div>
                    <div className="meta">
                      {isGer && (
                        <span className="seller"><span className="mini-av">{iniciais(nomeResp(c.responsavelId))}</span>{nomeResp(c.responsavelId).split(" ")[0]}</span>
                      )}
                      {c.telefone && (
                        <a className="wa-btn" title="Abrir no WhatsApp" href={`https://wa.me/${soDigitos(c.telefone)}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                          <I.wa style={{ width: 16, height: 16 }} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {sel && (
        <CardDrawer
          card={sel}
          isGer={isGer}
          users={users}
          nomeResp={nomeResp}
          onClose={() => setSel(null)}
          onSaved={(c) => { setCards((cs) => cs.map((x) => (x.id === c.id ? c : x))); setSel(null); showToast("✓ Card atualizado"); }}
          onDeleted={(id) => { setCards((cs) => cs.filter((x) => x.id !== id)); setSel(null); showToast("✓ Card removido"); }}
        />
      )}

      {novo && (
        <NovoLead
          isGer={isGer}
          users={users}
          meId={user.id}
          onClose={() => setNovo(false)}
          onCreated={(c) => { setCards((cs) => [...cs, c]); setNovo(false); showToast("✓ Lead criado"); }}
        />
      )}

      {fechar && (
        <FecharModal
          card={fechar.card}
          onClose={() => setFechar(null)}
          onDone={(c) => { setCards((cs) => cs.map((x) => (x.id === c.id ? c : x))); setFechar(null); showToast("🎉 Venda registrada!"); }}
        />
      )}
    </>
  );
}

/* ---------- DRAWER DO CARD ---------- */
function CardDrawer({ card, isGer, users, nomeResp, onClose, onSaved, onDeleted }) {
  const [f, setF] = useState({
    cliente: card.cliente, telefone: card.telefone, valorEstimado: card.valorEstimado,
    valorFinal: card.valorFinal, etapa: card.etapa, obs: card.obs, responsavelId: card.responsavelId,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function salvar() {
    setSaving(true);
    try {
      const c = await api.updateCard(card.id, f);
      onSaved(c);
    } catch (e) { alert(e.message); setSaving(false); }
  }
  async function excluir() {
    if (!confirm(`Remover o card de "${card.cliente}"?`)) return;
    try { await api.deleteCard(card.id); onDeleted(card.id); } catch (e) { alert(e.message); }
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-h">
          <h3>Detalhes do lead</h3>
          <button className="x-btn" onClick={onClose}><I.x style={{ width: 18, height: 18 }} /></button>
        </div>
        <div className="drawer-body">
          <div className="field">
            <label>Cliente</label>
            <input className="input" value={f.cliente} onChange={(e) => set("cliente", e.target.value)} />
          </div>
          <div className="field">
            <label>WhatsApp / Telefone</label>
            <input className="input" value={f.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="Ex: 55 44 99999-9999" />
          </div>
          <div className="row2">
            <div className="field">
              <label>Valor estimado (R$)</label>
              <input className="input mono" type="number" step="0.01" value={f.valorEstimado} onChange={(e) => set("valorEstimado", e.target.value)} />
            </div>
            <div className="field">
              <label>Etapa</label>
              <select className="select" value={f.etapa} onChange={(e) => set("etapa", e.target.value)}>
                {ETAPAS.map((et) => <option key={et.id} value={et.id}>{et.nome}</option>)}
              </select>
            </div>
          </div>
          {f.etapa === "fechou" && (
            <div className="field">
              <label>Valor final da venda (R$)</label>
              <input className="input mono" type="number" step="0.01" value={f.valorFinal} onChange={(e) => set("valorFinal", e.target.value)} />
            </div>
          )}
          {isGer && (
            <div className="field">
              <label>Vendedor responsável</label>
              <select className="select" value={f.responsavelId} onChange={(e) => set("responsavelId", e.target.value)}>
                {users.filter((u) => u.ativo).map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
          )}
          <div className="field">
            <label>Observações</label>
            <textarea className="textarea" value={f.obs} onChange={(e) => set("obs", e.target.value)} placeholder="Anotações sobre a negociação..." />
          </div>
          <button className="btn btn-danger btn-sm" onClick={excluir}><I.trash style={{ width: 15, height: 15 }} /> Remover lead</button>
        </div>
        <div className="drawer-foot">
          <button className="btn full" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary full" onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</button>
        </div>
      </div>
    </>
  );
}

/* ---------- NOVO LEAD ---------- */
function NovoLead({ isGer, users, meId, onClose, onCreated }) {
  const [f, setF] = useState({ cliente: "", telefone: "", valorEstimado: "", responsavelId: meId });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function criar() {
    if (!f.cliente.trim()) return;
    setSaving(true);
    try {
      const c = await api.createCard(f);
      onCreated(c);
    } catch (e) { alert(e.message); setSaving(false); }
  }

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="mh">
          <h3>Novo lead</h3>
          <p>Adicione um cliente ao topo do funil.</p>
        </div>
        <div className="mb">
          <div className="field">
            <label>Cliente *</label>
            <input className="input" value={f.cliente} onChange={(e) => set("cliente", e.target.value)} autoFocus placeholder="Nome do cliente" />
          </div>
          <div className="field">
            <label>WhatsApp / Telefone</label>
            <input className="input" value={f.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="Ex: 55 44 99999-9999" />
          </div>
          <div className="field">
            <label>Valor estimado (R$)</label>
            <input className="input mono" type="number" step="0.01" value={f.valorEstimado} onChange={(e) => set("valorEstimado", e.target.value)} placeholder="0,00" />
          </div>
          {isGer && (
            <div className="field">
              <label>Vendedor responsável</label>
              <select className="select" value={f.responsavelId} onChange={(e) => set("responsavelId", e.target.value)}>
                {users.filter((u) => u.ativo).map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="mf">
          <button className="btn full" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary full" onClick={criar} disabled={saving || !f.cliente.trim()}>{saving ? "Criando..." : "Criar lead"}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- MODAL FECHOU (valor final) ---------- */
function FecharModal({ card, onClose, onDone }) {
  const [valor, setValor] = useState(card.valorEstimado || "");
  const [saving, setSaving] = useState(false);

  async function confirmar() {
    setSaving(true);
    try {
      const c = await api.updateCard(card.id, { etapa: "fechou", valorFinal: Number(valor) || 0 });
      onDone(c);
    } catch (e) { alert(e.message); setSaving(false); }
  }

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="mh">
          <h3>🎉 Venda fechada!</h3>
          <p>Qual foi o valor final da venda de <b>{card.cliente}</b>?</p>
        </div>
        <div className="mb">
          <div className="field">
            <label>Valor final (R$)</label>
            <input className="input mono" type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus style={{ fontSize: 18 }} />
          </div>
        </div>
        <div className="mf">
          <button className="btn full" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary full" onClick={confirmar} disabled={saving}>{saving ? "Salvando..." : "Confirmar venda"}</button>
        </div>
      </div>
    </div>
  );
}

/* ============================ EQUIPE ============================ */
function Equipe({ showToast, meId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // user ou {} (novo)

  async function carregar() {
    setLoading(true);
    try { setUsers(await api.listUsers()); } catch (e) { showToast("✗ " + e.message); } finally { setLoading(false); }
  }
  useEffect(() => { carregar(); }, []);

  async function excluir(u) {
    if (!confirm(`Excluir o acesso de "${u.nome}"?`)) return;
    try { await api.deleteUser(u.id); setUsers((l) => l.filter((x) => x.id !== u.id)); showToast("✓ Acesso removido"); }
    catch (e) { showToast("✗ " + e.message); }
  }

  if (loading) return <div className="spin" />;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => setEditing({})}><I.plus style={{ width: 16, height: 16 }} /> Novo vendedor</button>
      </div>
      <div className="panel">
        <div className="panel-h"><h3>Equipe ({users.length})</h3></div>
        {users.map((u) => (
          <div className="urow" key={u.id}>
            <div className="avatar">{iniciais(u.nome)}</div>
            <div className="info">
              <div className="nm">{u.nome} {!u.ativo && <span className="tag-off">• desativado</span>}</div>
              <div className="sub">@{u.login}{u.role === "vendedor" && u.meta > 0 ? ` · meta ${fmtMoney(u.meta)}` : ""}</div>
            </div>
            <span className={"tag-role " + (u.role === "gerente" ? "ger" : "ven")}>{u.role === "gerente" ? "Gerente" : "Vendedor"}</span>
            <button className="btn btn-sm" onClick={() => setEditing(u)}>Editar</button>
            {u.id !== meId && <button className="x-btn" onClick={() => excluir(u)} title="Excluir"><I.trash style={{ width: 16, height: 16 }} /></button>}
          </div>
        ))}
      </div>

      {editing && (
        <UserForm
          user={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={(u, novo) => {
            setUsers((l) => (novo ? [...l, u] : l.map((x) => (x.id === u.id ? u : x))));
            setEditing(null);
            showToast(novo ? "✓ Vendedor criado" : "✓ Atualizado");
          }}
        />
      )}
    </>
  );
}

function UserForm({ user, onClose, onSaved }) {
  const novo = !user;
  const [f, setF] = useState({
    nome: user?.nome || "", login: user?.login || "", senha: "",
    role: user?.role || "vendedor", meta: user?.meta || 0, ativo: user ? user.ativo : true,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function salvar() {
    if (!f.nome.trim() || (novo && (!f.login.trim() || !f.senha))) { alert("Preencha nome, login e senha."); return; }
    setSaving(true);
    try {
      if (novo) {
        const u = await api.createUser(f);
        onSaved(u, true);
      } else {
        const dados = { nome: f.nome, role: f.role, meta: f.meta, ativo: f.ativo };
        if (f.senha) dados.senha = f.senha;
        const u = await api.updateUser(user.id, dados);
        onSaved(u, false);
      }
    } catch (e) { alert(e.message); setSaving(false); }
  }

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="mh">
          <h3>{novo ? "Novo vendedor" : "Editar acesso"}</h3>
          <p>{novo ? "Crie o login do vendedor." : "Atualize os dados do acesso."}</p>
        </div>
        <div className="mb">
          <div className="field">
            <label>Nome</label>
            <input className="input" value={f.nome} onChange={(e) => set("nome", e.target.value)} autoFocus />
          </div>
          {novo && (
            <div className="field">
              <label>Login (usuário)</label>
              <input className="input" value={f.login} onChange={(e) => set("login", e.target.value)} placeholder="ex: maria" />
            </div>
          )}
          <div className="field">
            <label>{novo ? "Senha" : "Nova senha (deixe vazio pra manter)"}</label>
            <input className="input" type="password" value={f.senha} onChange={(e) => set("senha", e.target.value)} placeholder="mínimo 3 caracteres" />
          </div>
          <div className="row2">
            <div className="field">
              <label>Perfil</label>
              <select className="select" value={f.role} onChange={(e) => set("role", e.target.value)}>
                <option value="vendedor">Vendedor</option>
                <option value="gerente">Gerente</option>
              </select>
            </div>
            <div className="field">
              <label>Meta mensal (R$)</label>
              <input className="input mono" type="number" step="0.01" value={f.meta} onChange={(e) => set("meta", e.target.value)} />
            </div>
          </div>
          {!novo && (
            <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={f.ativo} onChange={(e) => set("ativo", e.target.checked)} style={{ width: 17, height: 17 }} />
              Acesso ativo
            </label>
          )}
        </div>
        <div className="mf">
          <button className="btn full" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary full" onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</button>
        </div>
      </div>
    </div>
  );
}

/* ============================ CONFIG ============================ */
function Config({ user, setUser, showToast }) {
  const [nome, setNome] = useState(user.nome);
  const [senha, setSenha] = useState("");
  const [saving, setSaving] = useState(false);

  async function salvar() {
    setSaving(true);
    try {
      const dados = { nome };
      if (senha) dados.senha = senha;
      const u = await api.updateMe(dados);
      setUser((prev) => ({ ...prev, ...u }));
      setSenha("");
      showToast("✓ Dados atualizados");
    } catch (e) { showToast("✗ " + e.message); } finally { setSaving(false); }
  }

  return (
    <div className="panel" style={{ maxWidth: 520 }}>
      <div className="panel-h"><h3>Meus dados</h3></div>
      <div style={{ padding: 22 }}>
        <div className="field">
          <label>Nome</label>
          <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="field">
          <label>Nova senha (deixe vazio pra manter)</label>
          <input className="input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" />
        </div>
        <button className="btn btn-primary" onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</button>
      </div>
    </div>
  );
}

/* ============================================================
   WHATSAPP
   ============================================================ */
function WhatsApp({ user, showToast }) {
  const isGer = user.role === "gerente";
  const [chats, setChats] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [instancias, setInstancias] = useState([]);
  const [minha, setMinha] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(null);
  const [chat, setChat] = useState(null);
  const [texto, setTexto] = useState("");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [showCfg, setShowCfg] = useState(false);
  const [qrInst, setQrInst] = useState(null);
  const [nova, setNova] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const msgsEnd = useRef(null);
  const selRef = useRef(null);
  const filtroRef = useRef("todas");
  useEffect(() => { selRef.current = sel; }, [sel]);
  useEffect(() => { filtroRef.current = filtro; }, [filtro]);

  async function carregarChats(silencioso) {
    if (!silencioso) setLoading(true);
    try {
      const cs = await api.waChats(isGer ? filtroRef.current : null);
      setChats(cs);
    } catch (e) { if (!silencioso) showToast("✗ " + e.message); }
    finally { if (!silencioso) setLoading(false); }
  }
  async function initGerente() {
    try {
      const [cfg, us] = await Promise.all([api.waConfig(), api.listUsers()]);
      setInstancias(cfg.instancias || []);
      const m = {}; us.forEach((u) => (m[u.id] = u)); setUsersMap(m);
    } catch (_) {}
  }
  async function initVendedor() {
    try { setMinha(await api.waMinha()); } catch (_) {}
  }

  useEffect(() => {
    (async () => {
      if (isGer) await initGerente(); else await initVendedor();
      await carregarChats(false);
    })();
    const t = setInterval(async () => {
      await carregarChats(true);
      if (selRef.current) {
        try { setChat(await api.waChat(selRef.current)); } catch (_) {}
      }
    }, 6000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, []);

  useEffect(() => { if (isGer) carregarChats(true); /* eslint-disable-next-line */ }, [filtro]);
  useEffect(() => { if (msgsEnd.current) msgsEnd.current.scrollIntoView({ block: "end" }); }, [chat]);

  async function abrir(id) {
    setSel(id); selRef.current = id;
    try {
      setChat(await api.waChat(id));
      setChats((cs) => cs.map((x) => (x.id === id ? { ...x, naoLidas: 0 } : x)));
    } catch (e) { showToast("✗ " + e.message); }
  }
  async function enviar() {
    const t = texto.trim();
    if (!t || !sel) return;
    setTexto(""); setEnviando(true);
    try {
      await api.waSend(sel, t);
      setChat((c) => (c ? { ...c, mensagens: [...c.mensagens, { role: "me", content: t, ts: Date.now() }] } : c));
      carregarChats(true);
    } catch (e) { showToast("✗ " + e.message); setTexto(t); }
    finally { setEnviando(false); }
  }
  async function virarCard() {
    if (!chat) return;
    const conv = chats.find((c) => c.id === chat.id);
    const dados = { cliente: chat.nome, telefone: chat.numero };
    if (isGer && conv && conv.vendedorId) dados.responsavelId = conv.vendedorId;
    try { await api.createCard(dados); showToast("✓ Lead criado no Pipeline"); }
    catch (e) { showToast("✗ " + e.message); }
  }

  const filtrados = chats.filter((c) => {
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    return (c.nome || "").toLowerCase().includes(q) || (c.numero || "").includes(q);
  });

  if (loading) return <div className="spin" />;

  if (!isGer && (!minha || !minha.instance)) {
    return (
      <div className="wa-page">
        <div className="wa-grid"><div className="wa-none">
          <I.wa className="ico" />
          <div><b>Seu WhatsApp ainda não foi vinculado.</b><br />Peça pra gerente cadastrar o seu número em WhatsApp → Configurar conexão.</div>
        </div></div>
      </div>
    );
  }

  if (showCfg) return <WhatsAppConfig onVoltar={() => { setShowCfg(false); initGerente(); }} showToast={showToast} />;

  return (
    <div className="wa-page">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isGer && (
            <select className="select" style={{ width: 220 }} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="todas">Todos os WhatsApps</option>
              {instancias.map((i) => <option key={i.instance} value={i.instance}>{usersMap[i.vendedorId]?.nome || i.instance}</option>)}
            </select>
          )}
          {!isGer && minha && minha.estado !== "open" && (
            <button className="btn btn-primary" onClick={() => setQrInst(minha.instance)}><I.link style={{ width: 15, height: 15 }} /> Conectar meu WhatsApp</button>
          )}
          {!isGer && minha && minha.estado === "open" && (
            <span style={{ fontSize: 13, color: "var(--fechou)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><span className="wa-dot on" /> WhatsApp conectado</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => setNova(true)}><I.plus style={{ width: 15, height: 15 }} /> Nova conversa</button>
          {isGer && <button className="btn" onClick={() => setShowCfg(true)}><I.cog style={{ width: 15, height: 15 }} /> Configurar conexão</button>}
        </div>
      </div>

      <div className="wa-grid">
        <div className="wa-list">
          <div className="wa-list-h">
            <div className="wa-search"><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar conversa..." /></div>
          </div>
          <div className="wa-list-scroll">
            {filtrados.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "var(--faint)", fontSize: 13 }}>Nenhuma conversa ainda.</div>}
            {filtrados.map((c) => (
              <div key={c.id} className={"wa-conv" + (sel === c.id ? " active" : "")} onClick={() => abrir(c.id)}>
                <div className="av">{iniciais(c.nome)}</div>
                <div className="mid">
                  <div className="nm">{c.nome}</div>
                  <div className="last">{c.ultima}</div>
                  {isGer && c.vendedorId && <div className="seller-tag">{usersMap[c.vendedorId]?.nome || ""}</div>}
                </div>
                {c.naoLidas > 0 && <div className="wa-badge">{c.naoLidas}</div>}
              </div>
            ))}
          </div>
        </div>

        {!chat ? (
          <div className="wa-chat"><div className="wa-none"><I.chat className="ico" /><div>Selecione uma conversa pra começar</div></div></div>
        ) : (
          <div className="wa-chat">
            <div className="wa-chat-h">
              <div className="av">{iniciais(chat.nome)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="nm">{chat.nome}</div>
                <div className="num">{chat.numero}</div>
              </div>
              <button className="btn btn-sm" onClick={virarCard}><I.pipe style={{ width: 14, height: 14 }} /> Virar card</button>
            </div>
            <div className="wa-msgs">
              {chat.mensagens.map((m, i) => (
                <div key={i} className={"wa-bubble " + (m.role === "me" ? "me" : "them")}>
                  {m.content}
                  <span className="t">{new Date(m.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              ))}
              <div ref={msgsEnd} />
            </div>
            <div className="wa-input">
              <input value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === "Enter" && enviar()} placeholder="Escreva uma mensagem..." />
              <button className="wa-send" onClick={enviar} disabled={enviando || !texto.trim()}><I.send style={{ width: 19, height: 19 }} /></button>
            </div>
          </div>
        )}
      </div>

      {qrInst && <QrModal instance={qrInst} onClose={() => setQrInst(null)} onConnected={() => { setQrInst(null); initVendedor(); showToast("🎉 WhatsApp conectado!"); }} />}
      {nova && <NovaConversa isGer={isGer} instancias={instancias} minha={minha} onClose={() => setNova(false)} onCriada={(id) => { setNova(false); carregarChats(true).then(() => abrir(id)); }} />}
    </div>
  );
}

/* ---------- CONFIG WHATSAPP (gerente) ---------- */
function WhatsAppConfig({ onVoltar, showToast }) {
  const [cfg, setCfg] = useState(null);
  const [users, setUsers] = useState([]);
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState({});
  const [saving, setSaving] = useState(false);
  const [qrInst, setQrInst] = useState(null);

  async function carregar() {
    const [c, us] = await Promise.all([api.waConfig(), api.listUsers()]);
    setCfg(c); setUrl(c.url || "");
    setRows((c.instancias || []).map((i) => ({ ...i })));
    setUsers(us.filter((u) => u.ativo));
    (c.instancias || []).forEach(async (i) => {
      try { const s = await api.waStatus(i.instance); setStatus((st) => ({ ...st, [i.instance]: s.estado })); } catch (_) {}
    });
  }
  useEffect(() => { carregar(); }, []);

  const addRow = () => setRows((r) => [...r, { instance: "", vendedorId: users[0]?.id || null }]);
  const setRow = (i, k, v) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  async function salvar() {
    setSaving(true);
    try {
      const dados = { url, publicUrl: window.location.origin, instancias: rows.filter((r) => r.instance.trim()) };
      if (apiKey) dados.apiKey = apiKey;
      await api.waSetConfig(dados);
      setApiKey("");
      showToast("✓ Conexão salva");
      carregar();
    } catch (e) { showToast("✗ " + e.message); } finally { setSaving(false); }
  }
  async function desconectar(inst) {
    if (!confirm(`Desconectar o WhatsApp "${inst}"?`)) return;
    try { await api.waLogout(inst); setStatus((s) => ({ ...s, [inst]: "close" })); showToast("✓ Desconectado"); } catch (e) { showToast("✗ " + e.message); }
  }
  async function excluir(inst) {
    if (!confirm(`Excluir a instância "${inst}"? Isso apaga as conversas dela.`)) return;
    try { await api.waDeleteInstance(inst); setRows((r) => r.filter((x) => x.instance !== inst)); showToast("✓ Instância excluída"); } catch (e) { showToast("✗ " + e.message); }
  }

  if (!cfg) return <div className="spin" />;

  return (
    <div style={{ maxWidth: 720 }}>
      <button className="btn btn-sm" onClick={onVoltar} style={{ marginBottom: 16 }}>← Voltar pras conversas</button>

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-h"><h3>Servidor Evolution</h3></div>
        <div style={{ padding: 22 }}>
          <div className="field">
            <label>Endereço da Evolution (URL)</label>
            <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://sua-evolution.up.railway.app" />
          </div>
          <div className="field">
            <label>Chave da API (apikey){cfg.temApiKey ? " — já salva, preencha só pra trocar" : ""}</label>
            <input className="input" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={cfg.temApiKey ? "•••••••• (mantém a atual)" : "cole a AUTHENTICATION_API_KEY"} />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h3>WhatsApps dos vendedores</h3>
          <button className="btn btn-sm" onClick={addRow}><I.plus style={{ width: 14, height: 14 }} /> Adicionar</button>
        </div>
        <div style={{ padding: "6px 22px 18px" }}>
          {rows.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13, padding: "14px 0" }}>Nenhum WhatsApp cadastrado. Clique em "Adicionar".</p>}
          {rows.map((r, i) => {
            const on = status[r.instance] === "open";
            return (
              <div className="wa-inst-row" key={i}>
                <span className={"wa-dot " + (on ? "on" : "off")} title={on ? "conectado" : "desconectado"} />
                <input className="input" style={{ flex: "1 1 130px" }} value={r.instance} onChange={(e) => setRow(i, "instance", e.target.value)} placeholder="nome (ex: com-maria)" />
                <select className="select" style={{ flex: "1 1 150px" }} value={r.vendedorId || ""} onChange={(e) => setRow(i, "vendedorId", e.target.value)}>
                  <option value="">— vendedor —</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
                {on
                  ? <button className="btn btn-sm btn-danger" onClick={() => desconectar(r.instance)}><I.power style={{ width: 14, height: 14 }} /> Desconectar</button>
                  : <button className="btn btn-sm" onClick={() => setQrInst(limpaInst(r.instance))}>Conectar</button>}
                <button className="x-btn" onClick={() => excluir(r.instance)} title="Excluir"><I.trash style={{ width: 15, height: 15 }} /></button>
              </div>
            );
          })}
          <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Salvar conexão"}</button>
            <span style={{ fontSize: 12.5, color: "var(--muted)" }}>Salve antes de conectar, pra vincular cada número ao vendedor.</span>
          </div>
        </div>
      </div>

      {qrInst && <QrModal instance={qrInst} onClose={() => setQrInst(null)} onConnected={() => { setStatus((s) => ({ ...s, [qrInst]: "open" })); setQrInst(null); showToast("🎉 Conectado!"); }} />}
    </div>
  );
}

/* ---------- QR MODAL ---------- */
function QrModal({ instance, onClose, onConnected }) {
  const [qr, setQr] = useState(null);
  const [erro, setErro] = useState("");
  const [estado, setEstado] = useState("connecting");
  const [carregando, setCarregando] = useState(true);

  async function gerar() {
    setErro(""); setQr(null); setCarregando(true);
    try {
      const r = await api.waConnect(instance);
      setQr(r.qr);
      if (!r.qr) setErro("A Evolution não retornou o QR. Tente gerar de novo.");
    } catch (e) { setErro(e.message); } finally { setCarregando(false); }
  }
  useEffect(() => {
    gerar();
    const t = setInterval(async () => {
      try {
        const s = await api.waStatus(instance);
        setEstado(s.estado);
        if (s.estado === "open") { clearInterval(t); onConnected && onConnected(); }
      } catch (_) {}
    }, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [instance]);

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="mh"><h3>Conectar WhatsApp</h3><p>Instância <b>{instance}</b></p></div>
        <div className="mb">
          {estado === "open" ? (
            <div className="qr-box"><div style={{ fontSize: 46 }}>✅</div><b style={{ fontSize: 17 }}>Conectado!</b></div>
          ) : (
            <div className="qr-box">
              {erro && <div className="err">{erro}</div>}
              {qr ? <img src={qr} alt="QR Code" /> : <div className="qr-wait">{carregando ? "Gerando QR..." : "Sem QR"}</div>}
              <div className="qr-steps">
                1. Abra o WhatsApp do vendedor no celular<br />
                2. Toque em <b>Aparelhos conectados</b><br />
                3. <b>Conectar um aparelho</b> e aponte a câmera pro QR
              </div>
            </div>
          )}
        </div>
        <div className="mf">
          <button className="btn full" onClick={onClose}>Fechar</button>
          {estado !== "open" && <button className="btn btn-primary full" onClick={gerar} disabled={carregando}><I.refresh style={{ width: 15, height: 15 }} /> Gerar novo QR</button>}
        </div>
      </div>
    </div>
  );
}

/* ---------- NOVA CONVERSA ---------- */
function NovaConversa({ isGer, instancias, minha, onClose, onCriada }) {
  const [instance, setInstance] = useState(isGer ? (instancias[0]?.instance || "") : (minha?.instance || ""));
  const [numero, setNumero] = useState("");
  const [texto, setTexto] = useState("");
  const [saving, setSaving] = useState(false);

  async function enviar() {
    if (!numero.trim() || !texto.trim()) return;
    setSaving(true);
    try { const r = await api.waIniciar({ instance, numero, texto }); onCriada(r.id); }
    catch (e) { alert(e.message); setSaving(false); }
  }

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="mh"><h3>Nova conversa</h3><p>Envie a primeira mensagem pra um número.</p></div>
        <div className="mb">
          {isGer && (
            <div className="field">
              <label>Enviar pelo WhatsApp de</label>
              <select className="select" value={instance} onChange={(e) => setInstance(e.target.value)}>
                {instancias.map((i) => <option key={i.instance} value={i.instance}>{i.instance}</option>)}
              </select>
            </div>
          )}
          <div className="field">
            <label>Número (com DDD)</label>
            <input className="input" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ex: 5544999990000" autoFocus />
          </div>
          <div className="field">
            <label>Mensagem</label>
            <textarea className="textarea" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Olá! Tudo bem?" />
          </div>
        </div>
        <div className="mf">
          <button className="btn full" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary full" onClick={enviar} disabled={saving || !numero.trim() || !texto.trim()}>{saving ? "Enviando..." : "Enviar"}</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   DASHBOARD / PAINEL
   ============================================================ */
function intervaloPeriodo(preset, de, ate) {
  const agora = Date.now();
  const d = new Date();
  if (preset === "hoje") { d.setHours(0, 0, 0, 0); return [d.getTime(), agora]; }
  if (preset === "semana") { return [agora - 7 * 86400000, agora]; }
  if (preset === "mes") { return [new Date(d.getFullYear(), d.getMonth(), 1).getTime(), agora]; }
  if (preset === "custom") {
    const ini = de ? new Date(de + "T00:00:00").getTime() : 0;
    const fim = ate ? new Date(ate + "T23:59:59").getTime() : agora;
    return [ini, fim];
  }
  return [0, agora];
}
function inicioDoMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

function Dashboard({ user, showToast, irParaPipeline }) {
  const isGer = user.role === "gerente";
  const [cards, setCards] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState("mes");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  async function carregar() {
    setLoading(true);
    try {
      const cs = await api.listCards();
      setCards(cs);
      if (isGer) setUsers(await api.listUsers());
    } catch (e) { showToast("✗ " + e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, []);

  if (loading) return <div className="spin" />;

  const [ini, fim] = intervaloPeriodo(preset, de, ate);
  const dataFech = (c) => c.fechadoEm || c.atualizadoEm || 0;
  const noPeriodoVenda = (c) => c.etapa === "fechou" && dataFech(c) >= ini && dataFech(c) <= fim;
  const noPeriodoLead = (c) => (c.criadoEm || 0) >= ini && (c.criadoEm || 0) <= fim;

  const vendas = cards.filter(noPeriodoVenda);
  const totalVendido = vendas.reduce((s, c) => s + (Number(c.valorFinal) || 0), 0);
  const nVendas = vendas.length;
  const ticket = nVendas ? totalVendido / nVendas : 0;
  const leadsPeriodo = cards.filter(noPeriodoLead);
  const ganhosDoCohort = leadsPeriodo.filter((c) => c.etapa === "fechou").length;
  const conversao = leadsPeriodo.length ? (ganhosDoCohort / leadsPeriodo.length) * 100 : 0;

  const nomePeriodo = { hoje: "hoje", semana: "nos últimos 7 dias", mes: "neste mês", tudo: "no total", custom: "no período" }[preset];

  const segBtns = (
    <div className="seg">
      {[["hoje", "Hoje"], ["semana", "7 dias"], ["mes", "Este mês"], ["tudo", "Tudo"], ["custom", "Personalizado"]].map(([k, lbl]) => (
        <button key={k} className={preset === k ? "on" : ""} onClick={() => setPreset(k)}>{lbl}</button>
      ))}
    </div>
  );

  const kpis = (
    <div className="stats">
      <div className="stat"><div className="lab"><span className="dot" style={{ background: "var(--fechou)" }} />Total vendido</div><div className="val money">{fmtMoney(totalVendido)}</div></div>
      <div className="stat"><div className="lab"><span className="dot" style={{ background: "var(--indigo)" }} />Vendas fechadas</div><div className="val">{nVendas}</div></div>
      <div className="stat"><div className="lab"><span className="dot" style={{ background: "var(--negociando)" }} />Ticket médio</div><div className="val money">{fmtMoney(ticket)}</div></div>
      <div className="stat"><div className="lab"><span className="dot" style={{ background: "var(--violet)" }} />Conversão</div><div className="val">{conversao.toFixed(0)}%</div></div>
    </div>
  );

  /* ---------- VISÃO DO VENDEDOR ---------- */
  if (!isGer) {
    const vendidoMes = cards.filter((c) => c.etapa === "fechou" && dataFech(c) >= inicioDoMes()).reduce((s, c) => s + (Number(c.valorFinal) || 0), 0);
    const meta = Number(user.meta) || 0;
    const pct = meta > 0 ? Math.min(100, (vendidoMes / meta) * 100) : 0;
    const bateu = meta > 0 && vendidoMes >= meta;
    const ultimas = [...vendas].sort((a, b) => dataFech(b) - dataFech(a)).slice(0, 8);

    return (
      <div>
        <div className="dash-top">{segBtns}</div>
        {preset === "custom" && (
          <div className="custom-range">De <input type="date" value={de} onChange={(e) => setDe(e.target.value)} /> até <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
        )}
        {kpis}
        <div className="dash-grid">
          <div className="panel">
            <div className="panel-h"><h3>Minha meta do mês</h3></div>
            <div className="big-meta">
              {meta > 0 ? (
                <>
                  <div className={"pct" + (bateu ? " done" : "")}>{pct.toFixed(0)}%</div>
                  <div className="sub">{fmtMoney(vendidoMes)} de {fmtMoney(meta)}{bateu ? " — meta batida! 🎉" : ""}</div>
                  <div className="pbar"><div className={"pfill" + (bateu ? " done" : "")} style={{ width: pct + "%" }} /></div>
                </>
              ) : (
                <div className="sub">Você ainda não tem uma meta definida. Peça pra gerência cadastrar em Equipe & Acessos.</div>
              )}
            </div>
          </div>
          <div className="panel">
            <div className="panel-h"><h3>Minhas últimas vendas</h3></div>
            {ultimas.length === 0 ? (
              <div className="dash-empty">Nenhuma venda fechada {nomePeriodo}.<br />Arraste um card pra "Fechou" no Pipeline. 🎯</div>
            ) : ultimas.map((c) => (
              <div className="deal-row" key={c.id}>
                <div><div className="nm">{c.cliente}</div><div className="dt">{new Date(dataFech(c)).toLocaleDateString("pt-BR")}</div></div>
                <div className="vl">{fmtMoney(c.valorFinal)}</div>
              </div>
            ))}
          </div>
        </div>
        <AnaliseIA user={user} showToast={showToast} />
      </div>
    );
  }

  /* ---------- VISÃO DO GERENTE ---------- */
  const vendedores = users.filter((u) => u.role === "vendedor");
  const ranking = vendedores.map((v) => {
    const vs = vendas.filter((c) => c.responsavelId === v.id);
    return { ...v, total: vs.reduce((s, c) => s + (Number(c.valorFinal) || 0), 0), qtd: vs.length };
  }).sort((a, b) => b.total - a.total);
  const maxRank = Math.max(1, ...ranking.map((r) => r.total));

  const mesIni = inicioDoMes();
  const metas = vendedores.map((v) => {
    const vendidoMes = cards.filter((c) => c.etapa === "fechou" && c.responsavelId === v.id && dataFech(c) >= mesIni).reduce((s, c) => s + (Number(c.valorFinal) || 0), 0);
    const meta = Number(v.meta) || 0;
    return { ...v, vendidoMes, meta, pct: meta > 0 ? Math.min(100, (vendidoMes / meta) * 100) : 0, bateu: meta > 0 && vendidoMes >= meta };
  });
  const comMeta = metas.filter((m) => m.meta > 0);
  const bateram = comMeta.filter((m) => m.bateu).length;
  const medalhas = ["🥇", "🥈", "🥉"];

  return (
    <div>
      <div className="dash-top">{segBtns}</div>
      {preset === "custom" && (
        <div className="custom-range">De <input type="date" value={de} onChange={(e) => setDe(e.target.value)} /> até <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
      )}
      {kpis}

      {cards.length === 0 ? (
        <div className="panel"><div className="dash-empty">Ainda não há dados pra mostrar.<br /><button className="btn btn-primary" style={{ marginTop: 14 }} onClick={irParaPipeline}>Ir pro Pipeline criar leads</button></div></div>
      ) : (
        <div className="dash-grid">
          <div className="panel">
            <div className="panel-h"><h3>Ranking de vendedores</h3><span style={{ fontSize: 12, color: "var(--muted)" }}>{nomePeriodo}</span></div>
            {ranking.length === 0 ? (
              <div className="dash-empty">Nenhum vendedor cadastrado.</div>
            ) : ranking.map((r, i) => (
              <div className="rank-row" key={r.id}>
                <div className="rank-fill" style={{ width: (r.total / maxRank) * 100 + "%" }} />
                <div className={"rank-pos" + (i < 3 ? " medal" : "")}>{i < 3 && r.total > 0 ? medalhas[i] : i + 1}</div>
                <div className="rank-av">{iniciais(r.nome)}</div>
                <div className="rank-mid"><div className="nm">{r.nome}</div><div className="sub">{r.qtd} venda{r.qtd === 1 ? "" : "s"}</div></div>
                <div className="rank-val">{fmtMoney(r.total)}</div>
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="panel-h"><h3>Metas do mês</h3></div>
            {comMeta.length > 0 && (
              <div className="metas-resumo"><b>{bateram}</b> de <b>{comMeta.length}</b> {comMeta.length === 1 ? "vendedor bateu" : "vendedores bateram"} a meta este mês 🎯</div>
            )}
            {metas.length === 0 ? (
              <div className="dash-empty">Nenhum vendedor cadastrado.</div>
            ) : metas.map((m) => (
              <div className="meta-row" key={m.id}>
                <div className="meta-head">
                  <div className="nm">{iniciais(m.nome) && <span className="rank-av" style={{ width: 24, height: 24, fontSize: 10 }}>{iniciais(m.nome)}</span>}{m.nome}{m.bateu && <span className="bateu">✓ bateu</span>}</div>
                  <div className="vals">{m.meta > 0 ? `${fmtMoney(m.vendidoMes)} / ${fmtMoney(m.meta)}` : "sem meta"}</div>
                </div>
                {m.meta > 0 && <div className="pbar"><div className={"pfill" + (m.bateu ? " done" : "")} style={{ width: m.pct + "%" }} /></div>}
              </div>
            ))}
          </div>
        </div>
      )}
      <AnaliseIA user={user} vendedores={vendedores} showToast={showToast} />
    </div>
  );
}

/* ============================================================
   ANÁLISE POR IA
   ============================================================ */
function IAResultado({ res }) {
  if (!res) return null;
  return (
    <div className="ia-res">
      {res.resumo && <p className="ia-resumo">{res.resumo}</p>}
      {res.pontosFortes && res.pontosFortes.length > 0 && (
        <div className="ia-bloco">
          <div className="ia-bloco-h pos">✓ Pontos fortes</div>
          <ul>{res.pontosFortes.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
      )}
      {res.pontosMelhorar && res.pontosMelhorar.length > 0 && (
        <div className="ia-bloco">
          <div className="ia-bloco-h warn">▲ Pontos a melhorar</div>
          <ul>{res.pontosMelhorar.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
      )}
      {res.sugestoes && res.sugestoes.length > 0 && (
        <div className="ia-bloco">
          <div className="ia-bloco-h sug">💡 Sugestões</div>
          <ul>{res.sugestoes.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

function AnaliseIA({ user, vendedores, showToast }) {
  const isGer = user.role === "gerente";
  const [eqLoading, setEqLoading] = useState(false);
  const [eq, setEq] = useState(null);
  const [eqErro, setEqErro] = useState("");
  const [vState, setVState] = useState({}); // { [id]: {loading, res, erro, aberto} }
  const [meu, setMeu] = useState({ loading: false, res: null, erro: "" });

  async function analisarEquipe() {
    setEqLoading(true); setEqErro("");
    try { setEq(await api.iaEquipe()); }
    catch (e) { setEqErro(e.message); }
    finally { setEqLoading(false); }
  }
  async function analisarVendedor(id) {
    setVState((s) => ({ ...s, [id]: { ...(s[id] || {}), loading: true, erro: "", aberto: true } }));
    try {
      const r = await api.iaVendedor(id);
      setVState((s) => ({ ...s, [id]: { loading: false, res: r, erro: "", aberto: true } }));
    } catch (e) {
      setVState((s) => ({ ...s, [id]: { loading: false, res: null, erro: e.message, aberto: true } }));
    }
  }
  async function analisarMeu() {
    setMeu({ loading: true, res: null, erro: "" });
    try { setMeu({ loading: false, res: await api.iaVendedor(user.id), erro: "" }); }
    catch (e) { setMeu({ loading: false, res: null, erro: e.message }); }
  }
  function toggle(id) {
    const st = vState[id];
    if (st && (st.res || st.erro)) setVState((s) => ({ ...s, [id]: { ...st, aberto: !st.aberto } }));
    else analisarVendedor(id);
  }

  // VENDEDOR
  if (!isGer) {
    return (
      <div className="panel ia-panel" style={{ marginTop: 18 }}>
        <div className="panel-h"><h3>🤖 Minha análise</h3>
          <button className="btn btn-sm btn-primary" onClick={analisarMeu} disabled={meu.loading}>{meu.loading ? "Analisando..." : "Analisar meu atendimento"}</button>
        </div>
        <div style={{ padding: "18px 22px" }}>
          {meu.loading && <div className="ia-loading">A IA está lendo seus números e conversas... ✨</div>}
          {meu.erro && <IAErro msg={meu.erro} />}
          {!meu.loading && !meu.res && !meu.erro && <p className="ia-hint">Clique em "Analisar meu atendimento" pra receber uma avaliação dos seus resultados e do seu jeito de atender, com sugestões pra vender mais.</p>}
          <IAResultado res={meu.res} />
        </div>
      </div>
    );
  }

  // GERENTE
  return (
    <div className="panel ia-panel" style={{ marginTop: 18 }}>
      <div className="panel-h"><h3>🤖 Análise inteligente</h3>
        <button className="btn btn-sm btn-primary" onClick={analisarEquipe} disabled={eqLoading}>{eqLoading ? "Analisando..." : "Analisar equipe"}</button>
      </div>
      <div style={{ padding: "18px 22px" }}>
        {eqLoading && <div className="ia-loading">A IA está analisando o desempenho do time... ✨</div>}
        {eqErro && <IAErro msg={eqErro} />}
        {!eqLoading && !eq && !eqErro && <p className="ia-hint">Clique em "Analisar equipe" pra uma visão geral do time com sugestões. Abaixo, você pode analisar cada vendedor individualmente.</p>}
        {eq && (<><div className="ia-tag-time">Visão da equipe</div><IAResultado res={eq} /></>)}

        {vendedores && vendedores.length > 0 && (
          <div className="ia-individual">
            <div className="ia-sub-titulo">Análise individual</div>
            {vendedores.map((v) => {
              const st = vState[v.id] || {};
              return (
                <div className="ia-vend" key={v.id}>
                  <div className="ia-vend-h" onClick={() => toggle(v.id)}>
                    <div className="ia-vend-nm"><span className="rank-av" style={{ width: 28, height: 28, fontSize: 11 }}>{iniciais(v.nome)}</span>{v.nome}</div>
                    <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); analisarVendedor(v.id); }} disabled={st.loading}>
                      {st.loading ? "Analisando..." : (st.res || st.erro) ? "Atualizar" : "Analisar"}
                    </button>
                  </div>
                  {st.aberto && (
                    <div className="ia-vend-body">
                      {st.loading && <div className="ia-loading">Lendo números e conversas... ✨</div>}
                      {st.erro && <IAErro msg={st.erro} />}
                      <IAResultado res={st.res} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function IAErro({ msg }) {
  const semChave = /GEMINI_API_KEY/i.test(msg || "");
  return (
    <div className="ia-erro">
      <b>Não foi possível gerar a análise.</b>
      <div style={{ marginTop: 6 }}>{msg}</div>
      {semChave && <div style={{ marginTop: 8, fontSize: 12.5 }}>👉 No Railway, em Variables, adicione <b>GEMINI_API_KEY</b> com a sua chave do Gemini (a mesma que você usa nos outros projetos).</div>}
    </div>
  );
}
