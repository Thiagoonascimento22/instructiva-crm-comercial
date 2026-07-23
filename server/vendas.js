/* ============================================================
   MÓDULO VENDAS — substitui a planilha de metas
   Guarda: pessoas (com meta mensal e grupo) e as vendas lançadas.
   Entrega o painel igual ao da planilha:
     EQUIPE/NOME | META | VENDA | FALTA | % META | RECEBIDO
   ============================================================ */
export function instalarVendas({ app, getDb, saveDB, proximoId, auth, gerenteOnly }) {
  // mesmo padrão do canal oficial: o index.js reatribui o db, então resolvemos por Proxy
  const db = new Proxy({}, {
    get: (_t, k) => getDb()[k],
    set: (_t, k, v) => { getDb()[k] = v; return true; },
    has: (_t, k) => k in getDb(),
  });
  const salvar = saveDB;

  function garantir() {
    if (!db.vendas) db.vendas = { pessoas: [], lista: [], metasMes: {} };
    if (!Array.isArray(db.vendas.pessoas)) db.vendas.pessoas = [];
    if (!Array.isArray(db.vendas.lista)) db.vendas.lista = [];
    if (!db.vendas.metasMes) db.vendas.metasMes = {}; // { "2026-07": { pessoaId: meta } }
  }

  const mesDe = (ts) => {
    const d = new Date(ts);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  };
  const mesValido = (m) => /^\d{4}-\d{2}$/.test(String(m || ""));
  const num = (v) => {
    if (typeof v === "number") return isFinite(v) ? v : 0;
    const s = String(v == null ? "" : v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
  };

  // meta da pessoa naquele mês (se não tiver específica do mês, usa a padrão dela)
  function metaDaPessoa(p, mes) {
    const doMes = db.vendas.metasMes[mes];
    if (doMes && doMes[p.id] !== undefined && doMes[p.id] !== null && doMes[p.id] !== "") return num(doMes[p.id]);
    return num(p.metaMensal);
  }

  function pessoaPublica(p) {
    return { id: p.id, nome: p.nome, grupo: p.grupo || "", metaMensal: num(p.metaMensal), ativo: p.ativo !== false, userId: p.userId || null };
  }
  function vendaPublica(v) {
    const p = db.vendas.pessoas.find((x) => x.id === v.pessoaId);
    return {
      id: v.id, pessoaId: v.pessoaId, pessoaNome: p ? p.nome : (v.pessoaNome || ""),
      cliente: v.cliente || "", email: v.email || "", telefone: v.telefone || "",
      curso: v.curso || "", forma: v.forma || "", plataforma: v.plataforma || "",
      codigo: v.codigo || "", parcelas: Number(v.parcelas) || 0,
      valor: num(v.valor), recebido: num(v.recebido), aGerar: num(v.aGerar),
      obs: v.obs || "", data: v.data, mes: mesDe(v.data),
      criadoPorNome: v.criadoPorNome || "", criadoEm: v.criadoEm,
    };
  }

  /* ---------------- PESSOAS (quem aparece no painel) ---------------- */
  app.get("/api/vendas/pessoas", auth, gerenteOnly, (req, res) => {
    garantir();
    res.json({ pessoas: db.vendas.pessoas.map(pessoaPublica) });
  });

  app.post("/api/vendas/pessoas", auth, gerenteOnly, (req, res) => {
    garantir();
    const b = req.body || {};
    const nome = String(b.nome || "").trim().slice(0, 60);
    if (!nome) return res.status(400).json({ error: "Informe o nome" });
    if (db.vendas.pessoas.some((p) => p.nome.toLowerCase() === nome.toLowerCase())) {
      return res.status(400).json({ error: "Já existe alguém com esse nome" });
    }
    const p = {
      id: proximoId ? proximoId("pes") : "pes_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      nome,
      grupo: String(b.grupo || "").trim().slice(0, 40),
      metaMensal: num(b.metaMensal),
      userId: b.userId || null,
      ativo: true,
      criadoEm: Date.now(),
    };
    db.vendas.pessoas.push(p);
    salvar();
    res.json({ ok: true, pessoa: pessoaPublica(p) });
  });

  app.put("/api/vendas/pessoas/:id", auth, gerenteOnly, (req, res) => {
    garantir();
    const p = db.vendas.pessoas.find((x) => x.id === req.params.id);
    if (!p) return res.status(404).json({ error: "Pessoa não encontrada" });
    const b = req.body || {};
    if (b.nome !== undefined && String(b.nome).trim()) p.nome = String(b.nome).trim().slice(0, 60);
    if (b.grupo !== undefined) p.grupo = String(b.grupo).trim().slice(0, 40);
    if (b.metaMensal !== undefined) p.metaMensal = num(b.metaMensal);
    if (b.userId !== undefined) p.userId = b.userId || null;
    if (b.ativo !== undefined) p.ativo = !!b.ativo;
    salvar();
    res.json({ ok: true, pessoa: pessoaPublica(p) });
  });

  app.delete("/api/vendas/pessoas/:id", auth, gerenteOnly, (req, res) => {
    garantir();
    const tem = db.vendas.lista.some((v) => v.pessoaId === req.params.id);
    if (tem) return res.status(400).json({ error: "Essa pessoa já tem vendas lançadas. Desative em vez de excluir." });
    db.vendas.pessoas = db.vendas.pessoas.filter((x) => x.id !== req.params.id);
    salvar();
    res.json({ ok: true });
  });

  /* ---- meta específica de um mês (sobrescreve a padrão só naquele mês) ---- */
  app.put("/api/vendas/meta", auth, gerenteOnly, (req, res) => {
    garantir();
    const b = req.body || {};
    if (!mesValido(b.mes)) return res.status(400).json({ error: "Mês inválido" });
    const p = db.vendas.pessoas.find((x) => x.id === b.pessoaId);
    if (!p) return res.status(404).json({ error: "Pessoa não encontrada" });
    if (!db.vendas.metasMes[b.mes]) db.vendas.metasMes[b.mes] = {};
    if (b.meta === null || b.meta === "") delete db.vendas.metasMes[b.mes][p.id];
    else db.vendas.metasMes[b.mes][p.id] = num(b.meta);
    salvar();
    res.json({ ok: true });
  });

  /* ---------------- VENDAS ---------------- */
  app.get("/api/vendas", auth, gerenteOnly, (req, res) => {
    garantir();
    const mes = mesValido(req.query.mes) ? req.query.mes : mesDe(Date.now());
    const pessoaId = req.query.pessoaId || "";
    let lista = db.vendas.lista.filter((v) => mesDe(v.data) === mes);
    if (pessoaId) lista = lista.filter((v) => v.pessoaId === pessoaId);
    lista = lista.sort((a, b) => b.data - a.data);
    res.json({ mes, vendas: lista.map(vendaPublica) });
  });

  app.post("/api/vendas", auth, gerenteOnly, (req, res) => {
    garantir();
    const b = req.body || {};
    const p = db.vendas.pessoas.find((x) => x.id === b.pessoaId);
    if (!p) return res.status(400).json({ error: "Escolha de quem é a venda" });
    const valor = num(b.valor);
    if (valor <= 0) return res.status(400).json({ error: "Informe o valor da venda" });
    let data = b.data ? new Date(b.data).getTime() : Date.now();
    if (!isFinite(data)) data = Date.now();
    const v = {
      id: proximoId ? proximoId("vnd") : "vnd_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      pessoaId: p.id,
      pessoaNome: p.nome,
      cliente: String(b.cliente || "").trim().slice(0, 90),
      email: String(b.email || "").trim().slice(0, 120),
      telefone: String(b.telefone || "").replace(/\D/g, "").slice(0, 15),
      curso: String(b.curso || "").trim().slice(0, 90),
      valor,
      recebido: num(b.recebido),
      aGerar: b.aGerar !== undefined && b.aGerar !== "" ? num(b.aGerar) : Math.max(0, valor - num(b.recebido)),
      forma: String(b.forma || "").trim().slice(0, 30),
      plataforma: String(b.plataforma || "").trim().slice(0, 40),
      codigo: String(b.codigo || "").trim().slice(0, 60),
      parcelas: Math.max(0, Math.min(60, parseInt(b.parcelas, 10) || 0)),
      obs: String(b.obs || "").trim().slice(0, 200),
      data,
      criadoPor: req.user.id,
      criadoPorNome: req.user.nome,
      criadoEm: Date.now(),
    };
    db.vendas.lista.unshift(v);
    salvar();
    res.json({ ok: true, venda: vendaPublica(v) });
  });

  app.put("/api/vendas/:id", auth, gerenteOnly, (req, res) => {
    garantir();
    const v = db.vendas.lista.find((x) => x.id === req.params.id);
    if (!v) return res.status(404).json({ error: "Venda não encontrada" });
    const b = req.body || {};
    if (b.pessoaId !== undefined) {
      const p = db.vendas.pessoas.find((x) => x.id === b.pessoaId);
      if (!p) return res.status(400).json({ error: "Pessoa inválida" });
      v.pessoaId = p.id; v.pessoaNome = p.nome;
    }
    if (b.cliente !== undefined) v.cliente = String(b.cliente).trim().slice(0, 90);
    if (b.email !== undefined) v.email = String(b.email).trim().slice(0, 120);
    if (b.telefone !== undefined) v.telefone = String(b.telefone).replace(/\D/g, "").slice(0, 15);
    if (b.curso !== undefined) v.curso = String(b.curso).trim().slice(0, 90);
    if (b.valor !== undefined) v.valor = num(b.valor);
    if (b.recebido !== undefined) v.recebido = num(b.recebido);
    if (b.aGerar !== undefined) v.aGerar = num(b.aGerar);
    if (b.plataforma !== undefined) v.plataforma = String(b.plataforma).trim().slice(0, 40);
    if (b.codigo !== undefined) v.codigo = String(b.codigo).trim().slice(0, 60);
    if (b.parcelas !== undefined) v.parcelas = Math.max(0, Math.min(60, parseInt(b.parcelas, 10) || 0));
    if (b.forma !== undefined) v.forma = String(b.forma).trim().slice(0, 30);
    if (b.obs !== undefined) v.obs = String(b.obs).trim().slice(0, 200);
    if (b.data !== undefined) { const t = new Date(b.data).getTime(); if (isFinite(t)) v.data = t; }
    salvar();
    res.json({ ok: true, venda: vendaPublica(v) });
  });

  app.delete("/api/vendas/:id", auth, gerenteOnly, (req, res) => {
    garantir();
    db.vendas.lista = db.vendas.lista.filter((x) => x.id !== req.params.id);
    salvar();
    res.json({ ok: true });
  });

  /* ---------------- PAINEL (a planilha) ---------------- */
  app.get("/api/vendas/painel", auth, gerenteOnly, (req, res) => {
    garantir();
    const mes = mesValido(req.query.mes) ? req.query.mes : mesDe(Date.now());
    const doMes = db.vendas.lista.filter((v) => mesDe(v.data) === mes);

    const linhas = db.vendas.pessoas
      .filter((p) => p.ativo !== false)
      .map((p) => {
        const minhas = doMes.filter((v) => v.pessoaId === p.id);
        const venda = minhas.reduce((s, v) => s + num(v.valor), 0);
        const recebido = minhas.reduce((s, v) => s + num(v.recebido), 0);
        const aGerar = minhas.reduce((s, v) => s + num(v.aGerar), 0);
        const meta = metaDaPessoa(p, mes);
        const u = p.userId ? (db.users || []).find((x) => x.id === p.userId) : null;
        return {
          pessoaId: p.id, nome: p.nome, grupo: p.grupo || "", foto: u ? (u.foto || "") : "",
          meta, venda, recebido, aGerar,
          falta: Math.max(0, meta - venda),
          pct: meta > 0 ? Math.round((venda / meta) * 100) : 0,
          qtd: minhas.length,
        };
      })
      .sort((a, b) => b.venda - a.venda || a.nome.localeCompare(b.nome, "pt-BR"));

    // subtotais por grupo (igual às linhas TIME DE VENDAS / ESCOLA da planilha)
    const grupos = {};
    linhas.forEach((l) => {
      const g = l.grupo || "Sem grupo";
      if (!grupos[g]) grupos[g] = { grupo: g, meta: 0, venda: 0, recebido: 0, aGerar: 0, pessoas: 0 };
      grupos[g].meta += l.meta; grupos[g].venda += l.venda; grupos[g].recebido += l.recebido; grupos[g].aGerar += l.aGerar || 0; grupos[g].pessoas++;
    });
    const listaGrupos = Object.values(grupos).map((g) => ({
      ...g,
      falta: Math.max(0, g.meta - g.venda),
      pct: g.meta > 0 ? Math.round((g.venda / g.meta) * 100) : 0,
    })).sort((a, b) => b.venda - a.venda);

    const geral = linhas.reduce((s, l) => ({
      meta: s.meta + l.meta, venda: s.venda + l.venda, recebido: s.recebido + l.recebido, aGerar: s.aGerar + (l.aGerar || 0),
    }), { meta: 0, venda: 0, recebido: 0, aGerar: 0 });
    geral.falta = Math.max(0, geral.meta - geral.venda);
    geral.pct = geral.meta > 0 ? Math.round((geral.venda / geral.meta) * 100) : 0;
    geral.qtd = doMes.length;

    // meses que já têm venda lançada (pro seletor)
    const meses = Array.from(new Set(db.vendas.lista.map((v) => mesDe(v.data)))).sort().reverse();
    if (!meses.includes(mes)) meses.unshift(mes);

    res.json({ mes, meses, geral, grupos: listaGrupos, linhas });
  });
}
