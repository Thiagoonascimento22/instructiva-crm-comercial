/* ============================================================
   AGENDA + GOOGLE AGENDA (v2.6)
   ------------------------------------------------------------
   Cada pessoa marca reuniões, ligações e visitas dentro do CRM.
   Se ela conectar a conta Google dela, o agendamento vai junto pro
   Google Agenda (com link do Meet e convite pro cliente, se quiser)
   e os compromissos do Google aparecem aqui também.

   Sem Google conectado tudo continua funcionando: o agendamento
   fica salvo no CRM.

   Configuração (uma vez só, pelo dono): Client ID e Client Secret de
   um projeto do Google Cloud com a "Google Calendar API" ligada.
   Podem vir da tela (Agenda › Configurar Google) ou das variáveis
   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET do Railway.

   Guardado no banco principal, no bloco "agenda":
     google:  { clientId, clientSecret }
     contas:  { userId: { email, refreshToken, conectadoEm, precisaReconectar } }
     eventos: [{ id, userId, titulo, tipo, inicio, fim, ... googleId, meetLink }]
   As chaves de acesso (contas) NUNCA vão pra tela.
   ============================================================ */
import crypto from "crypto";

const TZ = "America/Sao_Paulo";
const ESCOPO = "openid email https://www.googleapis.com/auth/calendar.events";
const API = "https://www.googleapis.com/calendar/v3";
const TIPOS = ["reuniao", "ligacao", "visita", "aula", "outro"];
const STATUS = ["marcado", "feito", "naoveio", "cancelado"];

export function instalarAgenda({ app, getDb, salvar, auth, donoOnly }) {
  const db = () => getDb();

  function base() {
    const d = db();
    if (!d.agenda || typeof d.agenda !== "object") d.agenda = {};
    const a = d.agenda;
    if (!a.google || typeof a.google !== "object") a.google = { clientId: "", clientSecret: "" };
    if (!a.contas || typeof a.contas !== "object") a.contas = {};
    if (!Array.isArray(a.eventos)) a.eventos = [];
    return a;
  }
  function credenciais() {
    const g = base().google;
    const clientId = String(process.env.GOOGLE_CLIENT_ID || g.clientId || "").trim();
    const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET || g.clientSecret || "").trim();
    return clientId && clientSecret ? { clientId, clientSecret, doAmbiente: !!process.env.GOOGLE_CLIENT_ID } : null;
  }
  // endereço que o Google chama de volta depois que a pessoa autoriza (tem que estar
  // cadastrado igualzinho no Google Cloud)
  function urlRetorno(req) {
    const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0].trim();
    const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
    return `${proto}://${host}/api/agenda/google/callback`;
  }
  // quem esta pessoa enxerga: gerente = todos; líder = ele + liderados; vendedor = ele
  function idsVisiveis(user) {
    if (!user || user.role === "gerente") return null;
    const ids = [user.id];
    if (Array.isArray(user.lideradosIds)) user.lideradosIds.forEach((i) => { if (i && !ids.includes(i)) ids.push(i); });
    return ids;
  }
  const podeVer = (user, userId) => { const ids = idsVisiveis(user); return ids === null || ids.includes(userId); };
  const nomeDe = (id) => { const u = (db().users || []).find((x) => x.id === id); return u ? u.nome : ""; };
  const novoId = () => "ag_" + Date.now().toString(36) + crypto.randomBytes(3).toString("hex");
  const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || "").trim());

  /* ---------------- conexão com o Google (OAuth) ---------------- */
  const _estados = new Map();   // state -> { userId, redirect, exp }
  const _acessos = new Map();   // userId -> { token, exp }
  const _cacheGoogle = new Map(); // userId|de|ate -> { em, lista }

  function contaDe(userId) { return base().contas[userId] || null; }
  function statusGoogle(userId) {
    const c = contaDe(userId);
    return {
      configurado: !!credenciais(),
      conectado: !!(c && c.refreshToken),
      email: c ? c.email || "" : "",
      precisaReconectar: !!(c && c.precisaReconectar),
    };
  }

  async function postForm(url, campos) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(campos),
      signal: AbortSignal.timeout(15000),
    });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, j };
  }

  async function tokenAcesso(userId) {
    const c = _acessos.get(userId);
    if (c && c.exp > Date.now() + 60000) return c.token;
    const conta = contaDe(userId);
    if (!conta || !conta.refreshToken) throw new Error("Conecte o seu Google Agenda primeiro.");
    const cred = credenciais();
    if (!cred) throw new Error("A integração com o Google ainda não foi configurada.");
    const r = await postForm("https://oauth2.googleapis.com/token", {
      client_id: cred.clientId, client_secret: cred.clientSecret,
      refresh_token: conta.refreshToken, grant_type: "refresh_token",
    });
    if (!r.ok) {
      if (r.j.error === "invalid_grant") {
        if (!conta.precisaReconectar) { conta.precisaReconectar = true; salvar(); }
        throw new Error("A ligação com o Google expirou ou foi removida. Clique em Reconectar Google.");
      }
      throw new Error("O Google recusou o acesso: " + (r.j.error_description || r.j.error || "erro " + r.status));
    }
    _acessos.set(userId, { token: r.j.access_token, exp: Date.now() + (Number(r.j.expires_in) || 3600) * 1000 });
    if (conta.precisaReconectar) { conta.precisaReconectar = false; salvar(); }
    return r.j.access_token;
  }

  // chamada à API do Google Agenda em nome da pessoa
  async function google(userId, method, caminho, query, corpo) {
    const token = await tokenAcesso(userId);
    const qs = query ? "?" + new URLSearchParams(query).toString() : "";
    const r = await fetch(API + caminho + qs, {
      method,
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    if (r.status === 204) return null;
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e = new Error(explicarErroGoogle(r.status, j));
      e.status = r.status;
      throw e;
    }
    return j;
  }
  function explicarErroGoogle(status, j) {
    const msg = (j && j.error && (j.error.message || j.error.status)) || "";
    if (status === 401) return "O Google pediu pra conectar de novo. Clique em Reconectar Google.";
    if (status === 403 && /has not been used|disabled/i.test(msg)) return "A Google Calendar API não está ligada no projeto do Google Cloud. Peça pro dono ligar (Agenda › Configurar Google).";
    if (status === 403) return "O Google não deixou mexer na agenda" + (msg ? ": " + msg : ".");
    if (status === 404 || status === 410) return "Esse compromisso não existe mais no Google Agenda.";
    return "O Google respondeu com erro" + (msg ? ": " + msg : " " + status);
  }

  /* ---------------- evento do CRM -> formato do Google ---------------- */
  function corpoGoogle(ev) {
    const linhas = [];
    if (ev.descricao) linhas.push(ev.descricao);
    const cliente = [ev.leadNome, ev.telefone].filter(Boolean).join(" · ");
    if (cliente) linhas.push("Cliente: " + cliente);
    linhas.push("Agendado pelo CRM Instructiva");
    const b = {
      summary: ev.titulo,
      description: linhas.join("\n\n"),
      start: { dateTime: new Date(ev.inicio).toISOString(), timeZone: TZ },
      end: { dateTime: new Date(ev.fim).toISOString(), timeZone: TZ },
      reminders: { useDefault: false, overrides: [{ method: "popup", minutes: Number.isFinite(ev.lembreteMin) ? ev.lembreteMin : 10 }] },
      extendedProperties: { private: { crmEventoId: ev.id } },
    };
    if (ev.local) b.location = ev.local;
    if (Array.isArray(ev.convidados) && ev.convidados.length) b.attendees = ev.convidados.map((email) => ({ email }));
    return b;
  }
  function guardarRespostaGoogle(ev, g) {
    if (!g) return;
    ev.googleId = g.id || ev.googleId || null;
    ev.googleLink = g.htmlLink || ev.googleLink || "";
    const meet = g.hangoutLink || (g.conferenceData && (g.conferenceData.entryPoints || []).find((p) => p.entryPointType === "video") || {}).uri || "";
    if (meet) ev.meetLink = meet;
    ev.googleErro = "";
  }
  async function enviarProGoogle(ev, { novo, querMeet }) {
    const sendUpdates = ev.convidados && ev.convidados.length ? "all" : "none";
    const corpo = corpoGoogle(ev);
    if (novo || !ev.googleId) {
      if (querMeet) corpo.conferenceData = { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } } };
      const g = await google(ev.userId, "POST", "/calendars/primary/events", { conferenceDataVersion: "1", sendUpdates }, corpo);
      guardarRespostaGoogle(ev, g);
      return;
    }
    if (querMeet && !ev.meetLink) corpo.conferenceData = { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } } };
    try {
      const g = await google(ev.userId, "PATCH", "/calendars/primary/events/" + encodeURIComponent(ev.googleId), { conferenceDataVersion: "1", sendUpdates }, corpo);
      guardarRespostaGoogle(ev, g);
    } catch (e) {
      if (e.status === 404 || e.status === 410) { // apagaram lá no Google: cria de novo
        ev.googleId = null;
        await enviarProGoogle(ev, { novo: true, querMeet: querMeet || !!ev.meetLink });
      } else throw e;
    }
  }

  /* ---------------- eventos do Google -> lista da tela ---------------- */
  function doGoogle(g) {
    const diaInteiro = !!(g.start && g.start.date && !g.start.dateTime);
    const ini = diaInteiro ? new Date(g.start.date + "T00:00:00").getTime() : Date.parse(g.start && g.start.dateTime);
    const fim = diaInteiro ? new Date(g.end.date + "T00:00:00").getTime() : Date.parse(g.end && g.end.dateTime);
    return {
      id: "g_" + g.id, origem: "google", googleId: g.id,
      titulo: g.summary || "(sem título)", tipo: "google",
      inicio: ini, fim: fim || ini + 3600000, diaInteiro,
      local: g.location || "", meetLink: g.hangoutLink || "", googleLink: g.htmlLink || "",
      crmEventoId: (g.extendedProperties && g.extendedProperties.private && g.extendedProperties.private.crmEventoId) || "",
    };
  }
  async function listarGoogle(userId, de, ate) {
    const chave = userId + "|" + de + "|" + ate;
    const c = _cacheGoogle.get(chave);
    if (c && Date.now() - c.em < 45000) return c.lista;
    const lista = [];
    let pageToken = "";
    for (let i = 0; i < 4; i++) {
      const q = { timeMin: new Date(de).toISOString(), timeMax: new Date(ate).toISOString(), singleEvents: "true", orderBy: "startTime", maxResults: "250" };
      if (pageToken) q.pageToken = pageToken;
      const j = await google(userId, "GET", "/calendars/primary/events", q);
      (j.items || []).filter((g) => g.status !== "cancelled" && g.start && g.eventType !== "workingLocation").forEach((g) => lista.push(doGoogle(g)));
      if (!j.nextPageToken) break;
      pageToken = j.nextPageToken;
    }
    _cacheGoogle.set(chave, { em: Date.now(), lista });
    if (_cacheGoogle.size > 300) _cacheGoogle.delete(_cacheGoogle.keys().next().value);
    return lista;
  }
  const limparCacheGoogle = (userId) => { for (const k of _cacheGoogle.keys()) if (k.startsWith(userId + "|")) _cacheGoogle.delete(k); };

  function publico(ev) {
    return {
      id: ev.id, origem: "crm", userId: ev.userId, donoNome: nomeDe(ev.userId),
      titulo: ev.titulo, tipo: ev.tipo, inicio: ev.inicio, fim: ev.fim,
      descricao: ev.descricao || "", local: ev.local || "",
      leadId: ev.leadId || null, leadNome: ev.leadNome || "", telefone: ev.telefone || "",
      convidados: ev.convidados || [], lembreteMin: ev.lembreteMin,
      status: ev.status || "marcado",
      noGoogle: !!ev.googleId, meetLink: ev.meetLink || "", googleLink: ev.googleLink || "", googleErro: ev.googleErro || "",
      criadoEm: ev.criadoEm,
    };
  }
  // tarefas com data do Pipeline também aparecem na agenda (só pra consultar)
  function tarefasNoPeriodo(ids, de, ate) {
    const leads = (db().oficial && db().oficial.crmLeads) || [];
    const out = [];
    for (const l of leads) {
      const t = l && l.tarefa;
      if (!t || t.feito || !t.quando || t.quando < de || t.quando >= ate) continue;
      if (ids !== null && !ids.includes(l.vendedorId)) continue;
      out.push({
        id: "t_" + l.id, origem: "tarefa", tipo: "tarefa", userId: l.vendedorId || null, donoNome: nomeDe(l.vendedorId),
        titulo: t.texto || "Tarefa", inicio: t.quando, fim: t.quando + 30 * 60000,
        leadId: l.id, leadNome: l.nome || "", telefone: l.telefone || "",
      });
      if (out.length >= 400) break;
    }
    return out;
  }

  /* ---------------- dados que vêm da tela ---------------- */
  function lerCampos(b, ev) {
    const erros = [];
    if (b.titulo !== undefined) ev.titulo = String(b.titulo || "").trim().slice(0, 200);
    if (!ev.titulo) erros.push("Dê um título ao compromisso");
    if (b.tipo !== undefined) ev.tipo = TIPOS.includes(b.tipo) ? b.tipo : "outro";
    if (b.inicio !== undefined) ev.inicio = Number(b.inicio);
    if (b.fim !== undefined) ev.fim = Number(b.fim);
    if (!Number.isFinite(ev.inicio) || ev.inicio <= 0) erros.push("Escolha a data e a hora");
    if (!Number.isFinite(ev.fim) || ev.fim <= ev.inicio) ev.fim = ev.inicio + 30 * 60000;
    if (ev.fim - ev.inicio > 24 * 3600000) ev.fim = ev.inicio + 24 * 3600000;
    if (b.descricao !== undefined) ev.descricao = String(b.descricao || "").slice(0, 3000);
    if (b.local !== undefined) ev.local = String(b.local || "").trim().slice(0, 300);
    if (b.leadId !== undefined) ev.leadId = b.leadId ? String(b.leadId) : null;
    if (b.leadNome !== undefined) ev.leadNome = String(b.leadNome || "").trim().slice(0, 120);
    if (b.telefone !== undefined) ev.telefone = String(b.telefone || "").trim().slice(0, 40);
    if (b.lembreteMin !== undefined) { const m = Number(b.lembreteMin); ev.lembreteMin = Number.isFinite(m) && m >= 0 && m <= 1440 ? m : 10; }
    if (b.convidados !== undefined) {
      const lista = (Array.isArray(b.convidados) ? b.convidados : String(b.convidados || "").split(/[,;\s]+/))
        .map((e) => String(e || "").trim().toLowerCase()).filter(Boolean);
      const ruins = lista.filter((e) => !emailOk(e));
      if (ruins.length) erros.push("E-mail inválido: " + ruins.join(", "));
      ev.convidados = Array.from(new Set(lista.filter(emailOk))).slice(0, 15);
    }
    return erros;
  }

  /* ============================ ROTAS ============================ */

  // estado da integração pra tela
  app.get("/api/agenda/config", auth, (req, res) => {
    const cred = credenciais();
    const g = base().google;
    res.json({
      ...statusGoogle(req.user.id),
      ehDono: !!req.user.dono,
      urlRetorno: urlRetorno(req),
      clientId: req.user.dono ? (cred ? cred.clientId : g.clientId || "") : undefined,
      temSegredo: req.user.dono ? !!(cred || g.clientSecret) : undefined,
      doAmbiente: req.user.dono ? !!(cred && cred.doAmbiente) : undefined,
    });
  });
  // o dono cola o Client ID e o Client Secret do Google Cloud
  app.put("/api/agenda/config", auth, donoOnly, (req, res) => {
    const b = req.body || {};
    const g = base().google;
    const id = String(b.clientId || "").trim();
    const segredo = String(b.clientSecret || "").trim();
    if (id && !/\.apps\.googleusercontent\.com$/.test(id)) return res.status(400).json({ error: "O Client ID termina com .apps.googleusercontent.com — confira se copiou o campo certo." });
    if (b.limpar) { g.clientId = ""; g.clientSecret = ""; }
    else {
      if (!id) return res.status(400).json({ error: "Cole o Client ID" });
      if (!segredo && !g.clientSecret) return res.status(400).json({ error: "Cole o Client Secret" });
      if (id !== g.clientId) _acessos.clear(); // trocou de projeto: as conexões antigas não valem mais
      g.clientId = id;
      if (segredo) g.clientSecret = segredo;
    }
    salvar();
    res.json({ ok: true, ...statusGoogle(req.user.id) });
  });

  // começa a conexão: devolve o endereço do Google pra pessoa autorizar
  app.get("/api/agenda/google/conectar", auth, (req, res) => {
    const cred = credenciais();
    if (!cred) return res.status(400).json({ error: "A integração com o Google ainda não foi configurada pelo dono do sistema." });
    const agora = Date.now();
    for (const [k, v] of _estados) if (v.exp < agora) _estados.delete(k);
    const state = crypto.randomBytes(20).toString("hex");
    const redirect = urlRetorno(req);
    _estados.set(state, { userId: req.user.id, redirect, exp: agora + 15 * 60000 });
    const p = new URLSearchParams({
      client_id: cred.clientId, redirect_uri: redirect, response_type: "code",
      scope: ESCOPO, access_type: "offline", prompt: "consent select_account",
      include_granted_scopes: "true", state,
    });
    res.json({ url: "https://accounts.google.com/o/oauth2/v2/auth?" + p.toString() });
  });

  // o Google volta pra cá depois que a pessoa autoriza
  app.get("/api/agenda/google/callback", async (req, res) => {
    const volta = (codigo) => res.redirect("/?agenda=" + codigo);
    const state = String(req.query.state || "");
    const st = _estados.get(state);
    _estados.delete(state);
    if (req.query.error) return volta(req.query.error === "access_denied" ? "negado" : "erro");
    if (!st || st.exp < Date.now()) return volta("expirou");
    const cred = credenciais();
    if (!cred) return volta("erro");
    try {
      const r = await postForm("https://oauth2.googleapis.com/token", {
        code: String(req.query.code || ""), client_id: cred.clientId, client_secret: cred.clientSecret,
        redirect_uri: st.redirect, grant_type: "authorization_code",
      });
      if (!r.ok) { console.error("[agenda] troca do código falhou:", r.j.error, r.j.error_description || ""); return volta("erro"); }
      const escopos = String(r.j.scope || "");
      if (!escopos.includes("calendar.events")) return volta("semagenda"); // desmarcou a caixinha da agenda
      let email = "";
      try { email = JSON.parse(Buffer.from(String(r.j.id_token || "").split(".")[1] || "", "base64url").toString("utf8")).email || ""; } catch (_) {}
      const contas = base().contas;
      const antiga = contas[st.userId];
      const refreshToken = r.j.refresh_token || (antiga && antiga.refreshToken) || "";
      if (!refreshToken) return volta("semtoken");
      contas[st.userId] = { email, refreshToken, conectadoEm: Date.now(), precisaReconectar: false };
      _acessos.set(st.userId, { token: r.j.access_token, exp: Date.now() + (Number(r.j.expires_in) || 3600) * 1000 });
      limparCacheGoogle(st.userId);
      salvar();
      console.log("[agenda] Google conectado:", nomeDe(st.userId), email);
      volta("conectado");
    } catch (e) {
      console.error("[agenda] erro no retorno do Google:", e.message);
      volta("erro");
    }
  });

  app.post("/api/agenda/google/desconectar", auth, async (req, res) => {
    const contas = base().contas;
    const c = contas[req.user.id];
    if (c && c.refreshToken) {
      try { await postForm("https://oauth2.googleapis.com/revoke", { token: c.refreshToken }); } catch (_) {}
    }
    delete contas[req.user.id];
    _acessos.delete(req.user.id);
    limparCacheGoogle(req.user.id);
    salvar();
    res.json({ ok: true, ...statusGoogle(req.user.id) });
  });

  // agenda do período: compromissos do CRM + do Google (da própria pessoa) + tarefas do Pipeline
  //   quem = "eu" (padrão) | id de um vendedor | "equipe"
  app.get("/api/agenda/eventos", auth, async (req, res) => {
    const a = base();
    // compromissos de UM lead (ficha do lead)
    if (req.query.leadId) {
      const lista = a.eventos
        .filter((ev) => ev.leadId === req.query.leadId && podeVer(req.user, ev.userId))
        .sort((x, y) => x.inicio - y.inicio)
        .map(publico);
      return res.json({ eventos: lista });
    }
    const de = Number(req.query.de) || Date.now() - 86400000;
    let ate = Number(req.query.ate) || de + 7 * 86400000;
    if (ate - de > 62 * 86400000) ate = de + 62 * 86400000;
    const quem = String(req.query.quem || "eu");
    let ids;
    if (quem === "eu") ids = [req.user.id];
    else if (quem === "equipe") ids = idsVisiveis(req.user);
    else ids = podeVer(req.user, quem) ? [quem] : [req.user.id];
    const noPeriodo = (ev) => ev.fim > de && ev.inicio < ate;
    const locais = a.eventos.filter((ev) => noPeriodo(ev) && (ids === null || ids.includes(ev.userId)) && ev.status !== "cancelado");
    let lista = locais.map(publico);
    // Google: só a agenda da própria pessoa
    const st = statusGoogle(req.user.id);
    let googleErro = "";
    if (st.conectado && ids !== null && ids.length === 1 && ids[0] === req.user.id) {
      try {
        const gs = await listarGoogle(req.user.id, de, ate);
        // compromisso que nasceu no CRM aparece uma vez só (a versão do CRM)
        const porGoogleId = new Map(a.eventos.filter((ev) => ev.googleId).map((ev) => [ev.googleId, ev]));
        const porId = new Map(a.eventos.map((ev) => [ev.id, ev]));
        let mudou = false;
        for (const g of gs) {
          const local = porGoogleId.get(g.googleId) || (g.crmEventoId && porId.get(g.crmEventoId));
          if (local) {
            // remarcaram lá no Google? traz o horário novo pro CRM
            if (!g.diaInteiro && local.userId === req.user.id && (local.inicio !== g.inicio || local.fim !== g.fim)) {
              local.inicio = g.inicio; local.fim = g.fim; mudou = true;
              if (!lista.some((x) => x.id === local.id) && noPeriodo(local) && local.status !== "cancelado") lista.push(publico(local));
            }
            continue;
          }
          lista.push(g);
        }
        if (mudou) { salvar(); lista = lista.map((x) => (x.origem === "crm" ? publico(a.eventos.find((ev) => ev.id === x.id) || x) : x)); }
      } catch (e) { googleErro = e.message; }
    }
    lista = lista.concat(tarefasNoPeriodo(ids, de, ate));
    lista.sort((x, y) => x.inicio - y.inicio);
    res.json({ eventos: lista, google: { ...st, erro: googleErro } });
  });

  // próximos compromissos da pessoa (pro lembrete na tela)
  app.get("/api/agenda/proximos", auth, async (req, res) => {
    const agora = Date.now();
    const de = agora - 15 * 60000, ate = agora + 90 * 60000;
    const a = base();
    let lista = a.eventos
      .filter((ev) => ev.userId === req.user.id && ev.status === "marcado" && ev.fim > de && ev.inicio < ate)
      .map(publico);
    const st = statusGoogle(req.user.id);
    if (st.conectado) {
      try {
        const ini = new Date(); ini.setHours(0, 0, 0, 0);
        const gs = await listarGoogle(req.user.id, ini.getTime(), ini.getTime() + 86400000);
        const ids = new Set(lista.map((x) => x.id));
        const gIds = new Set(a.eventos.filter((ev) => ev.googleId).map((ev) => ev.googleId));
        gs.filter((g) => !g.diaInteiro && g.fim > de && g.inicio < ate && !gIds.has(g.googleId) && !ids.has(g.crmEventoId))
          .forEach((g) => lista.push({ ...g, lembreteMin: 10 }));
      } catch (_) {}
    }
    lista.sort((x, y) => x.inicio - y.inicio);
    res.json({ eventos: lista });
  });

  // buscar lead pra ligar no compromisso
  app.get("/api/agenda/leads", auth, (req, res) => {
    const q = String(req.query.q || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const dig = q.replace(/\D/g, "");
    if (q.length < 2) return res.json({ leads: [] });
    const ids = idsVisiveis(req.user);
    const leads = (db().oficial && db().oficial.crmLeads) || [];
    const out = [];
    for (const l of leads) {
      if (ids !== null && !ids.includes(l.vendedorId)) continue;
      const nome = String(l.nome || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      const tel = String(l.telefone || "").replace(/\D/g, "");
      if (nome.includes(q) || (dig.length >= 4 && tel.includes(dig))) {
        out.push({ id: l.id, nome: l.nome || "", telefone: l.telefone || "", email: l.email || "", curso: l.curso || "" });
        if (out.length >= 8) break;
      }
    }
    res.json({ leads: out });
  });

  // criar
  app.post("/api/agenda/eventos", auth, async (req, res) => {
    const b = req.body || {};
    const ev = { id: novoId(), userId: req.user.id, status: "marcado", lembreteMin: 10, convidados: [], criadoEm: Date.now() };
    const erros = lerCampos(b, ev);
    if (erros.length) return res.status(400).json({ error: erros[0] });
    ev.atualizadoEm = Date.now();
    const a = base();
    a.eventos.push(ev);
    if (a.eventos.length > 30000) a.eventos.splice(0, a.eventos.length - 30000);
    salvar();
    let aviso = "";
    if (statusGoogle(req.user.id).conectado && b.noGoogle !== false) {
      try { await enviarProGoogle(ev, { novo: true, querMeet: !!b.meet }); }
      catch (e) { ev.googleErro = e.message; aviso = "Salvo no CRM, mas não foi pro Google: " + e.message; }
      limparCacheGoogle(req.user.id);
      salvar();
    }
    res.json({ ok: true, evento: publico(ev), aviso });
  });

  // editar (dono do compromisso ou quem enxerga a pessoa)
  app.put("/api/agenda/eventos/:id", auth, async (req, res) => {
    const ev = base().eventos.find((x) => x.id === req.params.id);
    if (!ev) return res.status(404).json({ error: "Compromisso não encontrado" });
    if (!podeVer(req.user, ev.userId)) return res.status(403).json({ error: "Sem acesso a esse compromisso" });
    const b = req.body || {};
    const novo = { ...ev };
    const erros = lerCampos(b, novo); // confere numa cópia: se tiver erro, nada muda
    if (erros.length) return res.status(400).json({ error: erros[0] });
    Object.assign(ev, novo);
    if (b.status !== undefined && STATUS.includes(b.status)) ev.status = b.status;
    ev.atualizadoEm = Date.now();
    salvar();
    let aviso = "";
    const soStatus = Object.keys(b).every((k) => k === "status");
    if (!soStatus && statusGoogle(ev.userId).conectado && (ev.googleId || b.noGoogle)) {
      try { await enviarProGoogle(ev, { novo: false, querMeet: !!b.meet }); }
      catch (e) { ev.googleErro = e.message; aviso = "Salvo no CRM, mas o Google não atualizou: " + e.message; }
      limparCacheGoogle(ev.userId);
      salvar();
    }
    res.json({ ok: true, evento: publico(ev), aviso });
  });

  // excluir (tira do Google também e avisa os convidados)
  app.delete("/api/agenda/eventos/:id", auth, async (req, res) => {
    const a = base();
    const i = a.eventos.findIndex((x) => x.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: "Compromisso não encontrado" });
    const ev = a.eventos[i];
    if (!podeVer(req.user, ev.userId)) return res.status(403).json({ error: "Sem acesso a esse compromisso" });
    let aviso = "";
    if (ev.googleId && statusGoogle(ev.userId).conectado) {
      try {
        await google(ev.userId, "DELETE", "/calendars/primary/events/" + encodeURIComponent(ev.googleId), { sendUpdates: ev.convidados && ev.convidados.length ? "all" : "none" });
      } catch (e) { if (e.status !== 404 && e.status !== 410) aviso = "Tirei do CRM, mas o Google não apagou: " + e.message; }
      limparCacheGoogle(ev.userId);
    }
    a.eventos.splice(i, 1);
    salvar();
    res.json({ ok: true, aviso });
  });
}
