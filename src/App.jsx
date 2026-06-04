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

/* ============================ APP ============================ */
export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);
  const [view, setView] = useState("pipeline");
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
    setView("pipeline");
  }

  if (booting) return <div className="login-wrap"><div className="spin" /></div>;
  if (!user) return <Login onDone={(u) => setUser(u)} />;
  if (user.precisaOnboarding) return <Onboarding user={user} onDone={setUser} />;

  const isGer = user.role === "gerente";
  const titulos = {
    pipeline: { t: "Pipeline de Vendas", s: "Arraste os cards conforme a negociação avança" },
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
          <NavBtn ic={I.pipe} label="Pipeline" active={view === "pipeline"} onClick={() => setView("pipeline")} />
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
          {view === "pipeline" && <Pipeline user={user} showToast={showToast} />}
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
