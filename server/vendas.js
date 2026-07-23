/* ============================================================
   MÓDULO VENDAS — substitui a planilha de metas
   Guarda: pessoas (com meta mensal e grupo) e as vendas lançadas.
   Entrega o painel igual ao da planilha:
     EQUIPE/NOME | META | VENDA | FALTA | % META | RECEBIDO
   ============================================================ */
export function instalarVendas({ app, getDb, saveDB, proximoId, auth, gerenteOnly, permiteVend }) {
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
  // "2026-07-01" tem que virar 1º de julho NO NOSSO FUSO. Se usar new Date() direto,
  // o JS entende como UTC e no Brasil (UTC-3) volta pro dia 30/06 -> a venda cai no mês errado.
  function paraData(v) {
    if (v == null || v === "") return Date.now();
    const s = String(v).trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], 12, 0, 0).getTime();
    m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); // 01/07/2026 (dia/mês/ano)
    if (m) return new Date(+m[3], +m[2] - 1, +m[1], 12, 0, 0).getTime();
    const t = new Date(s).getTime();
    return isFinite(t) ? t : Date.now();
  }
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

  // Liga o usuário logado à pessoa do painel: primeiro pelo vínculo, depois pelo nome.
  // Se achar pelo nome, grava o vínculo pra ficar rápido nas próximas.
  function pessoaDoUser(u) {
    if (!u) return null;
    let p = db.vendas.pessoas.find((x) => x.userId === u.id);
    if (p) return p;
    const n = String(u.nome || "").trim().toLowerCase();
    p = db.vendas.pessoas.find((x) => x.nome.trim().toLowerCase() === n);
    if (p) { p.userId = u.id; salvar(); }
    return p || null;
  }
  // cria a pessoa do vendedor na hora, se ele ainda não existir no painel
  function garantirPessoaDoUser(u) {
    let p = pessoaDoUser(u);
    if (p) return p;
    p = {
      id: proximoId ? proximoId("pes") : "pes_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      nome: String(u.nome || "Sem nome").trim().slice(0, 60),
      grupo: "", metaMensal: 0, userId: u.id, ativo: true, criadoEm: Date.now(),
    };
    db.vendas.pessoas.push(p); salvar();
    return p;
  }
  const ehVend = (u) => u && u.role === "vendedor";

  function pessoaPublica(p) {
    return { id: p.id, nome: p.nome, grupo: p.grupo || "", metaMensal: num(p.metaMensal), ativo: p.ativo !== false, userId: p.userId || null, foraDoPodio: !!p.foraDoPodio };
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
  app.get("/api/vendas/pessoas", auth, permiteVend("vendas"), (req, res) => {
    garantir();
    const cont = {}, soma = {};
    db.vendas.lista.forEach((v) => { cont[v.pessoaId] = (cont[v.pessoaId] || 0) + 1; soma[v.pessoaId] = (soma[v.pessoaId] || 0) + num(v.valor); });
    res.json({ pessoas: db.vendas.pessoas.map((p) => ({ ...pessoaPublica(p), vendas: cont[p.id] || 0, total: soma[p.id] || 0 })) });
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
      // "Escola" e afins são venda direta (live), não concorrem no pódio dos vendedores
      foraDoPodio: b.foraDoPodio !== undefined ? !!b.foraDoPodio : /^(escola|instructiva|loja|site|geral)$/i.test(nome),
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
    if (b.foraDoPodio !== undefined) p.foraDoPodio = !!b.foraDoPodio;
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
  app.get("/api/vendas", auth, permiteVend("vendas"), (req, res) => {
    garantir();
    const mes = mesValido(req.query.mes) ? req.query.mes : mesDe(Date.now());
    let pessoaId = req.query.pessoaId || "";
    if (ehVend(req.user)) {                       // vendedor só enxerga as vendas dele
      const minha = pessoaDoUser(req.user);
      pessoaId = minha ? minha.id : "__nenhuma__";
    }
    let lista = db.vendas.lista.filter((v) => mesDe(v.data) === mes);
    if (pessoaId) lista = lista.filter((v) => v.pessoaId === pessoaId);
    lista = lista.sort((a, b) => b.data - a.data);
    res.json({ mes, vendas: lista.map(vendaPublica) });
  });

  app.post("/api/vendas", auth, permiteVend("vendas"), (req, res) => {
    garantir();
    const b = req.body || {};
    let p;
    if (ehVend(req.user)) p = garantirPessoaDoUser(req.user);   // sempre no próprio nome
    else p = db.vendas.pessoas.find((x) => x.id === b.pessoaId);
    if (!p) return res.status(400).json({ error: "Escolha de quem é a venda" });
    const valor = num(b.valor);
    if (valor <= 0) return res.status(400).json({ error: "Informe o valor da venda" });
    const data = paraData(b.data);
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

  app.put("/api/vendas/:id", auth, permiteVend("vendas"), (req, res) => {
    garantir();
    const v = db.vendas.lista.find((x) => x.id === req.params.id);
    if (!v) return res.status(404).json({ error: "Venda não encontrada" });
    if (ehVend(req.user)) {
      const minha = pessoaDoUser(req.user);
      if (!minha || v.pessoaId !== minha.id) return res.status(403).json({ error: "Essa venda não é sua" });
    }
    const b = req.body || {};
    if (b.pessoaId !== undefined && !ehVend(req.user)) {
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
    if (b.data !== undefined) v.data = paraData(b.data);
    salvar();
    res.json({ ok: true, venda: vendaPublica(v) });
  });

  app.delete("/api/vendas/:id", auth, permiteVend("vendas"), (req, res) => {
    garantir();
    if (ehVend(req.user)) {                        // vendedor só apaga as próprias
      const minha = pessoaDoUser(req.user);
      const v = db.vendas.lista.find((x) => x.id === req.params.id);
      if (!v) return res.status(404).json({ error: "Venda não encontrada" });
      if (!minha || v.pessoaId !== minha.id) return res.status(403).json({ error: "Essa venda não é sua" });
    }
    db.vendas.lista = db.vendas.lista.filter((x) => x.id !== req.params.id);
    salvar();
    res.json({ ok: true });
  });

  /* Juntar duas pessoas: leva TODAS as vendas de uma pra outra e apaga a duplicada.
     Serve pra quando o mesmo vendedor entrou duas vezes (ex.: "Dalit" da planilha
     e "Dalit Castro" do sistema). Nenhuma venda se perde. */
  app.post("/api/vendas/pessoas/juntar", auth, gerenteOnly, (req, res) => {
    garantir();
    const b = req.body || {};
    const de = db.vendas.pessoas.find((p) => p.id === b.deId);
    const para = db.vendas.pessoas.find((p) => p.id === b.paraId);
    if (!de || !para) return res.status(404).json({ error: "Pessoa não encontrada" });
    if (de.id === para.id) return res.status(400).json({ error: "Escolha duas pessoas diferentes" });
    let movidas = 0;
    db.vendas.lista.forEach((v) => {
      if (v.pessoaId === de.id) { v.pessoaId = para.id; v.pessoaNome = para.nome; movidas++; }
    });
    // o destino herda o que estiver faltando nele
    if (!para.grupo && de.grupo) para.grupo = de.grupo;
    if (!num(para.metaMensal) && num(de.metaMensal)) para.metaMensal = num(de.metaMensal);
    if (!para.userId && de.userId) para.userId = de.userId;
    // metas por mês da duplicada passam pro destino (se o destino não tiver)
    Object.keys(db.vendas.metasMes || {}).forEach((m) => {
      const mm = db.vendas.metasMes[m];
      if (mm && mm[de.id] !== undefined) {
        if (mm[para.id] === undefined) mm[para.id] = mm[de.id];
        delete mm[de.id];
      }
    });
    db.vendas.pessoas = db.vendas.pessoas.filter((p) => p.id !== de.id);
    salvar();
    res.json({ ok: true, movidas, de: de.nome, para: para.nome });
  });

  /* ---------------- IMPORTAR VENDAS EM LOTE ---------------- */
  app.post("/api/vendas/importar", auth, gerenteOnly, (req, res) => {
    garantir();
    const b = req.body || {};
    const linhas = Array.isArray(b.vendas) ? b.vendas.slice(0, 5000) : [];
    const criarPessoas = b.criarPessoas !== false;
    const grupoPadrao = String(b.grupoPadrao || "").trim().slice(0, 40);
    let criados = 0, pulados = 0, novasPessoas = 0;
    const achaPessoa = (nome) => {
      const n = String(nome || "").trim().toLowerCase();
      if (!n) return null;
      return db.vendas.pessoas.find((p) => p.nome.trim().toLowerCase() === n) || null;
    };
    // Anti-duplicata que NÃO come venda legítima:
    // a chave é a linha inteira (pessoa+cliente+valor+recebido+dia+código). Contamos quantas
    // iguais já existem no banco e quantas já vieram neste arquivo. Se o arquivo tem 2 linhas
    // iguais e o banco tem 0, entram as 2. Se subir o mesmo arquivo de novo, aí sim pula tudo.
    const chaveDe = (pessoaId, cliente, valor, recebido, data, codigo) =>
      [pessoaId, String(cliente || "").trim().toLowerCase(), Number(valor).toFixed(2),
       Number(recebido).toFixed(2), new Date(data).toDateString(), String(codigo || "").trim()].join("|");
    const jaNoBanco = {};
    for (const v of db.vendas.lista) {
      const k = chaveDe(v.pessoaId, v.cliente, num(v.valor), num(v.recebido), v.data, v.codigo);
      jaNoBanco[k] = (jaNoBanco[k] || 0) + 1;
    }
    const nesteArquivo = {};
    for (const r of linhas) {
      const valor = num(r.valor);
      let p = r.pessoaId ? db.vendas.pessoas.find((x) => x.id === r.pessoaId) : achaPessoa(r.pessoaNome);
      if (!p && criarPessoas && String(r.pessoaNome || "").trim()) {
        p = {
          id: proximoId ? proximoId("pes") : "pes_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
          nome: String(r.pessoaNome).trim().slice(0, 60),
          grupo: grupoPadrao, metaMensal: 0, userId: null, ativo: true, criadoEm: Date.now(),
          foraDoPodio: /^(escola|instructiva|loja|site|geral)$/i.test(String(r.pessoaNome).trim()),
        };
        db.vendas.pessoas.push(p); novasPessoas++;
      }
      if (!p || valor <= 0) { pulados++; continue; }
      const data = paraData(r.data);
      const codigo = String(r.codigo || "").trim().slice(0, 60);
      const recebido = num(r.recebido);
      const k = chaveDe(p.id, r.cliente, valor, recebido, data, codigo);
      nesteArquivo[k] = (nesteArquivo[k] || 0) + 1;
      if ((jaNoBanco[k] || 0) >= nesteArquivo[k]) { pulados++; continue; } // já tinha essa mesma linha
      db.vendas.lista.unshift({
        id: proximoId ? proximoId("vnd") : "vnd_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        pessoaId: p.id, pessoaNome: p.nome,
        cliente: String(r.cliente || "").trim().slice(0, 90),
        email: String(r.email || "").trim().slice(0, 120),
        telefone: String(r.telefone || "").replace(/\D/g, "").slice(0, 15),
        curso: String(r.curso || "").trim().slice(0, 90),
        valor, recebido,
        aGerar: Math.max(0, valor - recebido),
        forma: String(r.forma || "").trim().slice(0, 30),
        plataforma: String(r.plataforma || "").trim().slice(0, 40),
        codigo,
        parcelas: Math.max(0, Math.min(60, parseInt(r.parcelas, 10) || 0)),
        obs: "",
        data,
        criadoPor: req.user.id, criadoPorNome: req.user.nome, criadoEm: Date.now(),
      });
      criados++;
    }
    salvar();
    res.json({ ok: true, criados, pulados, novasPessoas });
  });

  /* apaga TODAS as vendas de um mês (pra reimportar do zero) */
  app.post("/api/vendas/limpar-mes", auth, gerenteOnly, (req, res) => {
    garantir();
    const mes = (req.body || {}).mes;
    if (!mesValido(mes)) return res.status(400).json({ error: "Mês inválido" });
    const antes = db.vendas.lista.length;
    db.vendas.lista = db.vendas.lista.filter((v) => mesDe(v.data) !== mes);
    salvar();
    res.json({ ok: true, excluidas: antes - db.vendas.lista.length });
  });

  /* ---------------- PAINEL (a planilha) ---------------- */
  app.get("/api/vendas/painel", auth, permiteVend("vendas"), (req, res) => {
    garantir();
    const mes = mesValido(req.query.mes) ? req.query.mes : mesDe(Date.now());
    // ?pessoaId= -> painel individual ("Minhas vendas"). Vendedor só pode ver o próprio.
    let soDe = req.query.pessoaId || "";
    if (soDe && ehVend(req.user)) {
      const minha = pessoaDoUser(req.user);
      soDe = minha ? minha.id : "__nenhuma__";
    }
    const todasDoMes = db.vendas.lista.filter((v) => mesDe(v.data) === mes);
    const doMes = soDe ? todasDoMes.filter((v) => v.pessoaId === soDe) : todasDoMes;

    const linhas = db.vendas.pessoas
      .filter((p) => p.ativo !== false)
      .map((p) => {
        const minhas = todasDoMes.filter((v) => v.pessoaId === p.id);
        const venda = minhas.reduce((s, v) => s + num(v.valor), 0);
        const recebido = minhas.reduce((s, v) => s + num(v.recebido), 0);
        const aGerar = minhas.reduce((s, v) => s + num(v.aGerar), 0);
        const meta = metaDaPessoa(p, mes);
        const u = p.userId ? (db.users || []).find((x) => x.id === p.userId) : null;
        return {
          pessoaId: p.id, nome: p.nome, grupo: p.grupo || "", foto: u ? (u.foto || "") : "", foraDoPodio: !!p.foraDoPodio,
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

    const base = soDe ? linhas.filter((l) => l.pessoaId === soDe) : linhas;
    const geral = base.reduce((s, l) => ({
      meta: s.meta + l.meta, venda: s.venda + l.venda, recebido: s.recebido + l.recebido, aGerar: s.aGerar + (l.aGerar || 0),
    }), { meta: 0, venda: 0, recebido: 0, aGerar: 0 });
    geral.falta = Math.max(0, geral.meta - geral.venda);
    geral.pct = geral.meta > 0 ? Math.round((geral.venda / geral.meta) * 100) : 0;
    geral.qtd = doMes.length;
    // posição da pessoa no ranking do time (só faz sentido no modo individual)
    const comVenda = linhas.filter((l) => l.venda > 0 && !l.foraDoPodio);
    const posicao = soDe ? comVenda.findIndex((l) => l.pessoaId === soDe) + 1 : 0;

    // meses que já têm venda lançada (pro seletor)
    const meses = Array.from(new Set(db.vendas.lista.map((v) => mesDe(v.data)))).sort().reverse();
    if (!meses.includes(mes)) meses.unshift(mes);

    // evolução dia a dia do mês (pro gráfico) + projeção de fechamento
    const [ano, mm] = mes.split("-").map(Number);
    const diasNoMes = new Date(ano, mm, 0).getDate();
    const hoje = new Date();
    const ehMesAtual = hoje.getFullYear() === ano && hoje.getMonth() + 1 === mm;
    const diaHoje = ehMesAtual ? hoje.getDate() : diasNoMes;
    const porDia = Array.from({ length: diasNoMes }, (_, i) => ({ dia: i + 1, venda: 0, recebido: 0, qtd: 0 }));
    doMes.forEach((v) => {
      const d = new Date(v.data).getDate();
      if (porDia[d - 1]) { porDia[d - 1].venda += num(v.valor); porDia[d - 1].recebido += num(v.recebido); porDia[d - 1].qtd++; }
    });
    const diasCorridos = Math.max(1, diaHoje);
    const mediaDia = geral.venda / diasCorridos;
    const projecao = Math.round(mediaDia * diasNoMes);
    const diasRestantes = Math.max(0, diasNoMes - diaHoje);
    const precisaPorDia = diasRestantes > 0 ? Math.max(0, geral.falta / diasRestantes) : 0;
    const melhorDia = porDia.reduce((mx, d) => (d.venda > (mx ? mx.venda : 0) ? d : mx), null);

    res.json({
      mes, meses, geral, grupos: listaGrupos, linhas,
      porDia, diasNoMes, diaHoje, diasRestantes, mediaDia, projecao, precisaPorDia,
      melhorDia: melhorDia && melhorDia.venda > 0 ? melhorDia : null,
      souEu: (pessoaDoUser(req.user) || {}).id || null, ehVendedor: ehVend(req.user),
      escopoPessoa: soDe || null, posicao, totalNoRanking: comVenda.length,
      nomeEscopo: soDe ? ((db.vendas.pessoas.find((p) => p.id === soDe) || {}).nome || "") : "",
    });
  });
}
