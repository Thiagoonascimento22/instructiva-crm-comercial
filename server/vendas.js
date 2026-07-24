/* ============================================================
   MÓDULO VENDAS — substitui a planilha de metas
   Guarda: pessoas (com meta mensal e grupo) e as vendas lançadas.
   Entrega o painel igual ao da planilha:
     EQUIPE/NOME | META | VENDA | FALTA | % META | RECEBIDO
   ============================================================ */
import fs from "fs";
import path from "path";

export function instalarVendas({ app, getDb, saveDB, proximoId, auth, gerenteOnly, permiteVend, dbPath }) {
  /* ============================================================
     ARQUIVO PRÓPRIO PRA VENDAS
     ------------------------------------------------------------
     As vendas ficam em /data/vendas.json, separado do crm.json.
     Motivo: o banco principal é gravado inteiro de uma vez, e num
     deploy dois containers rodam juntos por alguns segundos — se o
     antigo grava a memória dele por cima, leva junto o que ele não
     conhece. Com arquivo próprio, isso não alcança as vendas.
     ============================================================ */
  const VENDAS_PATH = path.join(path.dirname(dbPath || "/data/crm.json"), "vendas.json");
  let _v = null;

  function lerArquivo() {
    try {
      if (fs.existsSync(VENDAS_PATH)) {
        const j = JSON.parse(fs.readFileSync(VENDAS_PATH, "utf8"));
        if (j && typeof j === "object") return j;
      }
    } catch (e) { console.error("[vendas] erro ao ler", VENDAS_PATH, e.message); }
    return null;
  }
  function gravarArquivo() {
    try {
      const dir = path.dirname(VENDAS_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tmp = VENDAS_PATH + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(_v, null, 2));
      fs.renameSync(tmp, VENDAS_PATH);
      // cópia extra de segurança a cada gravação (fica sempre a penúltima versão)
      try { fs.copyFileSync(VENDAS_PATH, VENDAS_PATH + ".bak"); } catch (_) {}
    } catch (e) { console.error("[vendas] erro ao gravar:", e.message); }
  }
  function carregar() {
    if (_v) return _v;
    _v = lerArquivo();
    if (!_v) {
      // tenta a cópia de segurança
      try {
        if (fs.existsSync(VENDAS_PATH + ".bak")) {
          _v = JSON.parse(fs.readFileSync(VENDAS_PATH + ".bak", "utf8"));
          console.log("[vendas] recuperado da cópia .bak");
        }
      } catch (_) {}
    }
    if (!_v) {
      // primeira vez: migra o que estiver no banco principal
      const antigo = (getDb() || {}).vendas;
      _v = antigo && typeof antigo === "object"
        ? { pessoas: antigo.pessoas || [], lista: antigo.lista || [], metasMes: antigo.metasMes || {}, apelidos: antigo.apelidos || {}, chaveApi: antigo.chaveApi || null }
        : { pessoas: [], lista: [], metasMes: {}, apelidos: {}, chaveApi: null };
      if (antigo) console.log("[vendas] migrado do banco principal:", (_v.lista || []).length, "venda(s)");
      gravarArquivo();
    }
    return _v;
  }
  // mesmo padrão do canal oficial: o index.js reatribui o db, então resolvemos por Proxy
  // db.users, db.oficial etc. continuam vindo do banco principal;
  // db.vendas passa a vir do arquivo próprio.
  const db = new Proxy({}, {
    get: (_t, k) => (k === "vendas" ? carregar() : getDb()[k]),
    set: (_t, k, v) => { if (k === "vendas") { _v = v; gravarArquivo(); } else getDb()[k] = v; return true; },
    has: (_t, k) => (k === "vendas" ? true : k in getDb()),
  });
  // salvar() agora grava o arquivo de vendas (e o banco principal, pro resto)
  const salvar = () => { gravarArquivo(); try { saveDB(); } catch (_) {} };

  function garantir() {
    if (!db.vendas) db.vendas = { pessoas: [], lista: [], metasMes: {} };
    if (!Array.isArray(db.vendas.pessoas)) db.vendas.pessoas = [];
    if (!Array.isArray(db.vendas.lista)) db.vendas.lista = [];
    if (!db.vendas.metasMes) db.vendas.metasMes = {}; // { "2026-07": { pessoaId: meta } }
    // de-para de nomes que vêm de fora: { "cris": "pes_123" }
    // serve pra "Cris" do sistema do suporte cair na "Cristiane Alves" daqui
    if (!db.vendas.apelidos || typeof db.vendas.apelidos !== "object") db.vendas.apelidos = {};
    // quem foi criado antes dessa regra existir ainda não tem o marcador:
    // define uma vez pelo nome (Escola, Loja, Site... = venda direta, fora do pódio)
    let mudou = false;
    db.vendas.pessoas.forEach((p) => {
      if (p.foraDoPodio === undefined) {
        p.foraDoPodio = /^(escola|instructiva|loja|site|geral|live)$/i.test(String(p.nome || "").trim());
        mudou = true;
      }
    });
    if (mudou) salvar();
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
  const chaveNome = (n) => String(n || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  // acha a pessoa por nome exato OU pelo de-para aprendido
  function acharPessoaPorNome(nome) {
    const k = chaveNome(nome);
    if (!k) return null;
    const viaApelido = db.vendas.apelidos[k];
    if (viaApelido) {
      const p = db.vendas.pessoas.find((x) => x.id === viaApelido);
      if (p) return p;
      delete db.vendas.apelidos[k]; // apontava pra alguém que não existe mais
    }
    return db.vendas.pessoas.find((x) => chaveNome(x.nome) === k) || null;
  }

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

  /* Foto que aparece no painel/TV.
     Prioridade: a foto colocada direto na pessoa (serve pra quem NÃO tem login
     no sistema, tipo professor ou parceiro) e, se não tiver, a do usuário. */
  function fotoDe(p) {
    if (!p) return "";
    if (p.foto) return p.foto;
    const u = p.userId ? (db.users || []).find((x) => x.id === p.userId) : null;
    return (u && u.foto) || "";
  }
  function pessoaPublica(p) {
    return {
      id: p.id, nome: p.nome, grupo: p.grupo || "", metaMensal: num(p.metaMensal),
      ativo: p.ativo !== false, userId: p.userId || null, foraDoPodio: !!p.foraDoPodio,
      foto: fotoDe(p), fotoPropria: !!p.foto,
    };
  }
  function vendaPublica(v) {
    const p = db.vendas.pessoas.find((x) => x.id === v.pessoaId);
    return {
      id: v.id, pessoaId: v.pessoaId, pessoaNome: p ? p.nome : (v.pessoaNome || ""),
      cliente: v.cliente || "", email: v.email || "", telefone: v.telefone || "",
      curso: v.curso || "", forma: v.forma || "", formaLabel: formaCanonica(v), plataforma: v.plataforma || "",
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
    // foto de perfil da pessoa (funciona pra quem não tem usuário no sistema)
    if (b.foto !== undefined) {
      if (!b.foto) delete p.foto;
      else if (typeof b.foto === "string" && b.foto.startsWith("data:image/") && b.foto.length < 400000) p.foto = b.foto;
      else return res.status(400).json({ error: "Imagem inválida ou grande demais" });
    }
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
    // AVISO (não bloqueia): já existe venda com esse mesmo código de venda?
    // Devolve quem já tem, e a tela pergunta se quer lançar mesmo assim.
    const cod = String(b.codigo || "").trim();
    if (cod && !b.confirmar) {
      const iguais = (db.vendas.lista || []).filter((v) => String(v.codigo || "").trim() === cod);
      if (iguais.length) {
        return res.status(409).json({ jaExiste: true, codigo: cod, vendas: iguais.map(vendaPublica) });
      }
    }
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
    // APRENDE: daqui pra frente, quem chegar de fora com o nome antigo
    // (ex.: "Cris" vindo do sistema do suporte) cai direto na pessoa certa.
    db.vendas.apelidos[chaveNome(de.nome)] = para.id;
    // se a que sumiu já era destino de outros apelidos, redireciona todos
    Object.keys(db.vendas.apelidos).forEach((k) => {
      if (db.vendas.apelidos[k] === de.id) db.vendas.apelidos[k] = para.id;
    });
    db.vendas.pessoas = db.vendas.pessoas.filter((p) => p.id !== de.id);
    salvar();
    res.json({ ok: true, movidas, de: de.nome, para: para.nome, apelidoCriado: de.nome });
  });

  /* ---------------- IMPORTAR VENDAS EM LOTE ---------------- */
  app.post("/api/vendas/importar", auth, gerenteOnly, (req, res) => {
    garantir();
    const b = req.body || {};
    const linhas = Array.isArray(b.vendas) ? b.vendas.slice(0, 5000) : [];
    const criarPessoas = b.criarPessoas !== false;
    const grupoPadrao = String(b.grupoPadrao || "").trim().slice(0, 40);
    let criados = 0, pulados = 0, novasPessoas = 0;
    const achaPessoa = (nome) => acharPessoaPorNome(nome);
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

  /* ============================================================
     ENTRADA EXTERNA DE VENDA (outro sistema manda pra cá)
     Ex.: o time de suporte registra a venda no sistema deles e ela
     cai aqui automaticamente. Protegido por uma chave.
     ============================================================ */
  function chaveIntegracao() {
    if (!db.vendas.chaveApi) {
      db.vendas.chaveApi = "vnd_" + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
      salvar();
    }
    return db.vendas.chaveApi;
  }
  app.get("/api/vendas/integracao", auth, gerenteOnly, (req, res) => {
    garantir();
    res.json({ chave: chaveIntegracao(), rota: "/api/vendas/externa" });
  });
  app.post("/api/vendas/integracao/nova-chave", auth, gerenteOnly, (req, res) => {
    garantir();
    db.vendas.chaveApi = null; salvar();
    res.json({ ok: true, chave: chaveIntegracao() });
  });

  app.post("/api/vendas/externa", (req, res) => {
    garantir();
    const enviada = String(req.headers["x-api-key"] || (req.headers.authorization || "").replace(/^Bearer\s+/i, "")).trim();
    if (!enviada || enviada !== chaveIntegracao()) return res.status(401).json({ error: "Chave inválida" });
    const b = req.body || {};
    const valor = num(b.valor !== undefined ? b.valor : b.valorVendido);
    if (valor <= 0) return res.status(400).json({ error: "Informe o valor vendido" });
    const nomeVend = String(b.vendedor || b.pessoaNome || "").trim();
    if (!nomeVend) return res.status(400).json({ error: "Informe o vendedor" });
    let p = acharPessoaPorNome(nomeVend);
    if (!p) {
      p = {
        id: proximoId ? proximoId("pes") : "pes_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        nome: nomeVend.slice(0, 60), grupo: String(b.equipe || "Suporte").trim().slice(0, 40),
        metaMensal: 0, userId: null, ativo: true, foraDoPodio: false, criadoEm: Date.now(),
      };
      db.vendas.pessoas.push(p);
    }
    const codigo = String(b.codigo || b.codigoVenda || "").trim().slice(0, 60);
    const data = paraData(b.data);
    const recebido = num(b.recebido !== undefined ? b.recebido : b.valorRecebido);
    const cliente = String(b.cliente || b.nome || "").trim().slice(0, 90);
    const ref = String(b.refExterna || "").trim().slice(0, 60);

    // Se o outro sistema mandar a referência dele (refExterna), a gente ATUALIZA a venda
    // quando ele editar lá — em vez de criar outra. É o que mantém os dois iguais.
    if (ref) {
      const atual = db.vendas.lista.find((v) => v.refExterna === ref);
      if (atual) {
        Object.assign(atual, {
          pessoaId: p.id, pessoaNome: p.nome, cliente,
          email: String(b.email || "").trim().slice(0, 120),
          telefone: String(b.telefone || "").replace(/\D/g, "").slice(0, 15),
          curso: String(b.curso || "").trim().slice(0, 90),
          valor, recebido, aGerar: Math.max(0, valor - recebido),
          forma: String(b.forma || b.formaPagamento || atual.forma || "").trim().slice(0, 30),
          plataforma: String(b.plataforma || atual.plataforma || "").trim().slice(0, 40),
          codigo, parcelas: Math.max(0, Math.min(60, parseInt(b.parcelas, 10) || atual.parcelas || 0)),
          data, atualizadoEm: Date.now(),
        });
        salvar();
        return res.json({ ok: true, atualizada: true, id: atual.id });
      }
    }

    // sem referência: evita duplicar por código ou por linha igual no mesmo dia
    const dia = new Date(data).toDateString();
    const repetida = db.vendas.lista.some((v) =>
      (codigo && String(v.codigo || "").trim() === codigo) ||
      (v.pessoaId === p.id && num(v.valor) === valor &&
        String(v.cliente || "").trim().toLowerCase() === cliente.toLowerCase() &&
        new Date(v.data).toDateString() === dia));
    if (repetida) { salvar(); return res.json({ ok: true, jaExistia: true }); }
    const venda = {
      id: proximoId ? proximoId("vnd") : "vnd_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      pessoaId: p.id, pessoaNome: p.nome,
      cliente, email: String(b.email || "").trim().slice(0, 120),
      telefone: String(b.telefone || "").replace(/\D/g, "").slice(0, 15),
      curso: String(b.curso || "").trim().slice(0, 90),
      valor, recebido, aGerar: Math.max(0, valor - recebido),
      forma: String(b.forma || b.formaPagamento || "").trim().slice(0, 30),
      plataforma: String(b.plataforma || "").trim().slice(0, 40),
      codigo, parcelas: Math.max(0, Math.min(60, parseInt(b.parcelas, 10) || 0)),
      obs: String(b.obs || "").trim().slice(0, 200),
      data, origem: "externa", refExterna: ref || null,
      criadoPorNome: String(b.origem || "Sistema externo").slice(0, 40), criadoEm: Date.now(),
    };
    db.vendas.lista.unshift(venda);
    salvar();
    res.json({ ok: true, id: venda.id, vendedor: p.nome });
  });

  /* ---- de-para de nomes que vêm de outro sistema ---- */
  app.get("/api/vendas/apelidos", auth, gerenteOnly, (req, res) => {
    garantir();
    const lista = Object.entries(db.vendas.apelidos).map(([nomeFora, pessoaId]) => ({
      nomeFora, pessoaId, pessoaNome: (db.vendas.pessoas.find((p) => p.id === pessoaId) || {}).nome || "(removida)",
    }));
    res.json({ apelidos: lista });
  });
  app.post("/api/vendas/apelidos", auth, gerenteOnly, (req, res) => {
    garantir();
    const b = req.body || {};
    const nomeFora = chaveNome(b.nomeFora);
    if (!nomeFora) return res.status(400).json({ error: "Informe o nome que vem de fora" });
    if (b.pessoaId === null || b.pessoaId === "") { delete db.vendas.apelidos[nomeFora]; salvar(); return res.json({ ok: true, removido: true }); }
    const p = db.vendas.pessoas.find((x) => x.id === b.pessoaId);
    if (!p) return res.status(404).json({ error: "Pessoa não encontrada" });
    db.vendas.apelidos[nomeFora] = p.id;
    // já leva as vendas que entraram com esse nome pra pessoa certa
    let movidas = 0;
    const dup = db.vendas.pessoas.find((x) => x.id !== p.id && chaveNome(x.nome) === nomeFora);
    if (dup) {
      db.vendas.lista.forEach((v) => { if (v.pessoaId === dup.id) { v.pessoaId = p.id; v.pessoaNome = p.nome; movidas++; } });
      db.vendas.pessoas = db.vendas.pessoas.filter((x) => x.id !== dup.id);
    }
    salvar();
    res.json({ ok: true, movidas, para: p.nome });
  });

  /* Procura vendas repetidas (ex.: a mesma venda veio da planilha E do outro sistema) */
  app.get("/api/vendas/duplicadas", auth, gerenteOnly, (req, res) => {
    garantir();
    const mes = mesValido(req.query.mes) ? req.query.mes : null;
    const lista = (db.vendas.lista || []).filter((v) => !mes || mesDe(v.data) === mes);
    const limpa = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
    const grupos = [];
    const usados = new Set();

    // 1) mesmo CÓDIGO DE VENDA = praticamente certeza de duplicata
    const porCodigo = {};
    lista.forEach((v) => {
      const c = String(v.codigo || "").trim();
      if (!c) return;
      (porCodigo[c] = porCodigo[c] || []).push(v);
    });
    Object.entries(porCodigo).forEach(([c, vs]) => {
      if (vs.length > 1) {
        vs.forEach((v) => usados.add(v.id));
        grupos.push({ motivo: "mesmo código de venda", chave: c, forte: true, vendas: vs.map(vendaPublica) });
      }
    });

    // 2) mesmo cliente + mesmo valor com até 7 dias de diferença
    const porCliente = {};
    lista.forEach((v) => {
      const k = limpa(v.cliente) + "|" + Number(v.valor).toFixed(2);
      if (!limpa(v.cliente)) return;
      (porCliente[k] = porCliente[k] || []).push(v);
    });
    Object.values(porCliente).forEach((vs) => {
      if (vs.length < 2) return;
      const ord = vs.slice().sort((a, b) => a.data - b.data);
      const perto = ord.filter((v, i) => i === 0 || v.data - ord[i - 1].data <= 7 * 86400000);
      if (perto.length > 1 && perto.some((v) => !usados.has(v.id))) {
        perto.forEach((v) => usados.add(v.id));
        grupos.push({ motivo: "mesmo cliente e mesmo valor", chave: perto[0].cliente, forte: false, vendas: perto.map(vendaPublica) });
      }
    });

    // 3) mesmo telefone + mesmo valor com até 7 dias
    const porTel = {};
    lista.forEach((v) => {
      const t = String(v.telefone || "").replace(/\D/g, "").slice(-9);
      if (t.length < 8) return;
      const k = t + "|" + Number(v.valor).toFixed(2);
      (porTel[k] = porTel[k] || []).push(v);
    });
    Object.values(porTel).forEach((vs) => {
      if (vs.length < 2) return;
      if (vs.every((v) => usados.has(v.id))) return;
      const ord = vs.slice().sort((a, b) => a.data - b.data);
      const perto = ord.filter((v, i) => i === 0 || v.data - ord[i - 1].data <= 7 * 86400000);
      if (perto.length > 1) {
        perto.forEach((v) => usados.add(v.id));
        grupos.push({ motivo: "mesmo telefone e mesmo valor", chave: perto[0].telefone, forte: false, vendas: perto.map(vendaPublica) });
      }
    });

    const totalRepetido = grupos.reduce((s, g) => s + g.vendas.slice(1).reduce((x, v) => x + num(v.valor), 0), 0);
    res.json({ grupos, quantos: grupos.length, totalRepetido });
  });

  /* O outro sistema apagou a venda lá -> apaga aqui também */
  app.post("/api/vendas/externa/excluir", (req, res) => {
    garantir();
    const enviada = String(req.headers["x-api-key"] || (req.headers.authorization || "").replace(/^Bearer\s+/i, "")).trim();
    if (!enviada || enviada !== chaveIntegracao()) return res.status(401).json({ error: "Chave inválida" });
    const ref = String((req.body || {}).refExterna || "").trim();
    const codigo = String((req.body || {}).codigo || "").trim();
    if (!ref && !codigo) return res.status(400).json({ error: "Informe a referência da venda" });
    const antes = db.vendas.lista.length;
    db.vendas.lista = db.vendas.lista.filter((v) => {
      if (ref && v.refExterna === ref) return false;
      // sem referência (venda antiga), cai pro código — mas só se veio de fora
      if (!ref && codigo && v.origem === "externa" && String(v.codigo || "").trim() === codigo) return false;
      return true;
    });
    const n = antes - db.vendas.lista.length;
    salvar();
    res.json({ ok: true, excluidas: n });
  });

  /* ============================================================
     PAINEL DE TV — tudo somado, sem login (usa a chave na URL)
     ============================================================ */
  /* ============================================================
     FORMA DE PAGAMENTO
     ------------------------------------------------------------
     Junta as variações que chegam de fora (Hotmart, planilha, digitação
     na mão) num nome só. E quando a venda vem SEM forma preenchida, o
     sistema deduz pelo jeito que ela foi paga — parcelas e quanto já caiu.
     Nada fica como "Não informado".
     ============================================================ */
  const semAcento = (t) => String(t == null ? "" : t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  function formaPeloTexto(txt) {
    const t = semAcento(txt);
    if (!t) return "";
    // texto que não diz nada: trata como vazio pra cair na dedução
    if (/^(-+|\.+|na|n\/a|nd|nda|outro|outros|nao informad[oa]|sem informacao|sem forma|indefinid[oa]|null|undefined|0)$/.test(t)) return "";
    const temCart = /(cart[ao]|credit|cred\b|\bcc\b|visa|master|elo\b|amex|hipercard)/.test(t);
    const temPix = /pix/.test(t);
    if (temCart && temPix) return "Cartão + Pix";
    if (/recorr|assinatur|mensalidad|subscription/.test(t)) return "Recorrência";
    if (temPix) return "Pix";
    if (/boleto|carne|bank.?slip/.test(t)) return "Boleto";
    if (/debito|debit/.test(t) && !/credit/.test(t)) return "Cartão de débito";
    if (temCart) return "Cartão";
    if (/transfer|\bted\b|\bdoc\b|deposit/.test(t)) return "Transferência";
    if (/dinheiro|especie|cash/.test(t)) return "Dinheiro";
    if (/paypal|pic ?pay|mercado ?pago|pag ?seguro|nubank|stripe|apple ?pay|google ?pay/.test(t)) return "Carteira digital";
    if (/cortesia|gratis|gratuit|bolsa|permuta|brinde|troca/.test(t)) return "Cortesia";
    if (/link/.test(t)) return "Link de pagamento";
    return String(txt).trim();
  }

  // sem forma preenchida: deduz pelo comportamento do pagamento
  function formaDeduzida(v) {
    const parc = Number(v.parcelas) || 0;
    const valor = num(v.valor), rec = num(v.recebido), falta = num(v.aGerar);
    if (parc >= 2) return "Cartão";                          // parcelou = cartão
    if (rec > 0 && rec >= valor * 0.97) return "Pix";         // entrou tudo de uma vez
    if (rec <= 0 && (falta > 0 || valor > 0)) return "Boleto"; // gerado e ainda não caiu
    if (rec > 0) return "Cartão";                            // entrou só uma parte
    return "Pix";
  }

  // { forma, deduzida } — deduzida = true quando o sistema decidiu pelo padrão da venda
  function classificarForma(v) {
    const o = (v && typeof v === "object") ? v : { forma: v };
    const direto = formaPeloTexto(o.forma);
    if (direto) return { forma: direto, deduzida: false };
    // às vezes a forma vem escrita no campo da plataforma ou na observação
    for (const campo of ["plataforma", "obs"]) {
      const bruto = String(o[campo] || "").trim();
      const achou = formaPeloTexto(bruto);
      if (achou && achou !== bruto) return { forma: achou, deduzida: false };
    }
    return { forma: formaDeduzida(o), deduzida: true };
  }
  const formaCanonica = (v) => classificarForma(v).forma;

  /* Junta as variações do mesmo curso: "Odonto, Estetico, Fisio", "odontomedico",
     "ODONTOLÓGICOS" -> tudo vira ODONTO. Sem isso a métrica por curso não presta. */
  function cursoCanonico(txt) {
    const t = String(txt || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    if (!t) return "Sem curso";
    const tem = (...ps) => ps.some((x) => t.includes(x));
    if (tem("odonto", "odontolog")) return "ODONTO";
    if (tem("esteira")) return "ESTEIRAS";
    if (tem("soft", "soft start")) return "SOFT-STARTER";
    if (tem("solar")) return "SOLAR";
    if (tem("inverter", "inversor")) return "INVERTER";
    if (tem("flyback")) return "LIVRO FONTES FLYBACK";
    if (tem("retificador pfc", "pfc")) return "LIVRO FONTES RETIFICADOR PFC";
    if (tem("analise de circuitos", "análise de circuitos")) return "LIVRO ANÁLISE DE CIRCUITOS";
    if (tem("livro") && tem("fontes")) return "LIVRO FONTES CHAVEADAS";
    if (tem("combo") && tem("livro")) return "COMBO DE LIVROS";
    if (t === "livro" || t === "livros") return "LIVROS";
    if (tem("fontes chaveadas", "fonte chaveada")) return "FONTES CHAVEADAS";
    if (tem("osciloscop")) return "MANUSEIO DE OSCILOSCÓPIO";
    if (tem("solda")) return "MÁQUINA DE SOLDA";
    if (tem("microondas", "micro-ondas")) return "MICROONDAS";
    if (tem("televisor", "tv ")) return "TELEVISORES";
    if (tem("amplificador")) return "AMPLIFICADORES";
    if (tem("emac")) return t.includes("4") ? "EMAC 4.0" : t.includes("3") ? "EMAC 3.0" : "EMAC";
    if (tem("analise dc", "análise dc")) return "ANÁLISE DC AVANÇADA";
    if (tem("eletronica inicial", "eletrônica inicial")) return "ELETRÔNICA INICIAL";
    if (tem("eletronica digital")) return "ELETRÔNICA DIGITAL";
    if (tem("eletronica de potencia")) return "ELETRÔNICA DE POTÊNCIA";
    if (tem("nobreak")) return "NOBREAK";
    if (tem("programa")) return "PROGRAMAÇÃO";
    if (tem("inteligencia artificial")) return "INTELIGÊNCIA ARTIFICIAL";
    if (tem("low ticket")) return "LOW TICKET";
    if (tem("fonte de game")) return "FONTE DE GAME";
    if (tem("imersao", "imersão")) return "IMERSÃO EM ANÁLISE DE DEFEITOS";
    return String(txt).trim().toUpperCase();
  }

  app.get("/api/vendas/tv", (req, res) => {
    garantir();
    const k = String(req.query.k || "").trim();
    if (!k || k !== chaveIntegracao()) return res.status(401).json({ error: "Chave inválida" });
    const mes = mesValido(req.query.mes) ? req.query.mes : mesDe(Date.now());
    const doMes = (db.vendas.lista || []).filter((v) => mesDe(v.data) === mes);

    // ---- geral ----
    const venda = doMes.reduce((s, v) => s + num(v.valor), 0);
    const recebido = doMes.reduce((s, v) => s + num(v.recebido), 0);
    const pessoasAtivas = db.vendas.pessoas.filter((p) => p.ativo !== false);
    const metaTotal = pessoasAtivas.reduce((s, p) => s + metaDaPessoa(p, mes), 0);

    // ---- por forma de pagamento ----
    const formas = {};
    doMes.forEach((v) => {
      const { forma: g, deduzida } = classificarForma(v);
      if (!formas[g]) formas[g] = { forma: g, qtd: 0, valor: 0, recebido: 0, deduzidas: 0 };
      formas[g].qtd++; formas[g].valor += num(v.valor); formas[g].recebido += num(v.recebido);
      if (deduzida) formas[g].deduzidas++;
    });

    // ---- por curso ----
    const cursos = {};
    doMes.forEach((v) => {
      const c = cursoCanonico(v.curso);
      if (!cursos[c]) cursos[c] = { curso: c, qtd: 0, valor: 0 };
      cursos[c].qtd++; cursos[c].valor += num(v.valor);
    });

    // ---- por plataforma ----
    const plataformas = {};
    doMes.forEach((v) => {
      const p = String(v.plataforma || "").trim() || "Direto";
      if (!plataformas[p]) plataformas[p] = { plataforma: p, qtd: 0, valor: 0 };
      plataformas[p].qtd++; plataformas[p].valor += num(v.valor);
    });

    // ---- ranking (sem quem é venda direta, ex.: Escola) ----
    const porPessoa = {};
    doMes.forEach((v) => {
      if (!porPessoa[v.pessoaId]) porPessoa[v.pessoaId] = { pessoaId: v.pessoaId, qtd: 0, valor: 0, recebido: 0 };
      porPessoa[v.pessoaId].qtd++; porPessoa[v.pessoaId].valor += num(v.valor); porPessoa[v.pessoaId].recebido += num(v.recebido);
    });
    const ranking = Object.values(porPessoa).map((x) => {
      const p = db.vendas.pessoas.find((y) => y.id === x.pessoaId) || {};
      const meta = p.id ? metaDaPessoa(p, mes) : 0;
      return { ...x, nome: p.nome || "—", foto: fotoDe(p), foraDoPodio: !!p.foraDoPodio,
               equipe: (p.grupo || "").trim(), meta, pct: meta > 0 ? Math.round((x.valor / meta) * 100) : 0 };
    }).sort((a, b) => b.valor - a.valor);

    // ---- dia a dia ----
    const [ano, mm] = mes.split("-").map(Number);
    const diasNoMes = new Date(ano, mm, 0).getDate();
    const hoje = new Date();
    const ehMesAtual = hoje.getFullYear() === ano && hoje.getMonth() + 1 === mm;
    const diaHoje = ehMesAtual ? hoje.getDate() : diasNoMes;
    const porDia = Array.from({ length: diasNoMes }, (_, i) => ({ dia: i + 1, valor: 0, qtd: 0 }));
    doMes.forEach((v) => { const d = new Date(v.data).getDate(); if (porDia[d - 1]) { porDia[d - 1].valor += num(v.valor); porDia[d - 1].qtd++; } });
    const vendidoHoje = (porDia[diaHoje - 1] || {}).valor || 0;
    const qtdHoje = (porDia[diaHoje - 1] || {}).qtd || 0;
    // ---- semana (domingo a sábado) ----
    const ref = ehMesAtual ? new Date() : new Date(ano, mm - 1, diasNoMes);
    const ini = new Date(ref); ini.setHours(0, 0, 0, 0); ini.setDate(ini.getDate() - ini.getDay());
    const fim = new Date(ini); fim.setDate(fim.getDate() + 7);
    const daSemana = (db.vendas.lista || []).filter((v) => v.data >= ini.getTime() && v.data < fim.getTime());
    const semana = {
      valor: daSemana.reduce((s2, v) => s2 + num(v.valor), 0),
      recebido: daSemana.reduce((s2, v) => s2 + num(v.recebido), 0),
      qtd: daSemana.length,
    };
    const ontem = (porDia[diaHoje - 2] || {}).valor || 0;
    // ---- dias úteis do mês (pra meta diária, como vocês usavam) ----
    let diasUteis = 0;
    for (let d = 1; d <= diasNoMes; d++) { const w = new Date(ano, mm - 1, d).getDay(); if (w !== 0 && w !== 6) diasUteis++; }
    const metaDia = metaTotal > 0 ? metaTotal / diasUteis : 0;
    // ---- faturamento por semana do mês ----
    const semanas = [];
    let ini2 = new Date(ano, mm - 1, 1);
    while (ini2.getMonth() === mm - 1) {
      const fim2 = new Date(ini2); fim2.setDate(fim2.getDate() + 6);
      const ate = fim2.getMonth() === mm - 1 ? fim2.getDate() : diasNoMes;
      const dias = porDia.slice(ini2.getDate() - 1, ate);
      semanas.push({
        rot: String(ini2.getDate()).padStart(2, "0") + "/" + String(mm).padStart(2, "0") + " a " + String(ate).padStart(2, "0") + "/" + String(mm).padStart(2, "0"),
        valor: dias.reduce((s2, x) => s2 + x.valor, 0),
        qtd: dias.reduce((s2, x) => s2 + x.qtd, 0),
        atual: diaHoje >= ini2.getDate() && diaHoje <= ate,
      });
      ini2 = new Date(ano, mm - 1, ate + 1);
    }

    // ---- DESTAQUE DO DIA: quem mais vendeu hoje ----
    const inicioHoje = new Date(ano, mm - 1, diaHoje, 0, 0, 0).getTime();
    const fimHoje = inicioHoje + 86400000;
    const vendasHoje = (db.vendas.lista || []).filter((v) => v.data >= inicioHoje && v.data < fimHoje);
    const hojePorPessoa = {};
    vendasHoje.forEach((v) => {
      if (!hojePorPessoa[v.pessoaId]) hojePorPessoa[v.pessoaId] = { pessoaId: v.pessoaId, valor: 0, qtd: 0, cursos: {} };
      hojePorPessoa[v.pessoaId].valor += num(v.valor);
      hojePorPessoa[v.pessoaId].qtd++;
      const c = cursoCanonico(v.curso);
      hojePorPessoa[v.pessoaId].cursos[c] = (hojePorPessoa[v.pessoaId].cursos[c] || 0) + 1;
    });
    const listaHoje = Object.values(hojePorPessoa).map((x) => {
      const p = db.vendas.pessoas.find((y) => y.id === x.pessoaId) || {};
      const top = Object.entries(x.cursos).sort((a, b) => b[1] - a[1])[0];
      return { ...x, nome: p.nome || "—", foto: fotoDe(p), foraDoPodio: !!p.foraDoPodio,
               equipe: p.grupo || "", cursoTop: top ? top[0] : "", cursosQtd: Object.keys(x.cursos).length };
    }).sort((a, b) => b.valor - a.valor);
    const destaque = listaHoje.filter((x) => !x.foraDoPodio)[0] || null;
    const perseguidores = listaHoje.filter((x) => !x.foraDoPodio).slice(1, 4);

    // ---- ranking por equipe (sem quem é venda direta) ----
    const eq = {};
    ranking.forEach((r) => {
      // venda direta (Escola, live, site) soma no Marketing — pedido do Celso
      const g2 = ((r.equipe || "").trim()) || (r.foraDoPodio ? "Marketing" : "Sem equipe");
      if (!eq[g2]) eq[g2] = { equipe: g2, valor: 0, recebido: 0, qtd: 0, pessoas: 0, meta: 0, membros: [] };
      eq[g2].valor += r.valor; eq[g2].recebido += r.recebido; eq[g2].qtd += r.qtd;
      eq[g2].pessoas++; eq[g2].meta += r.meta || 0;
      eq[g2].membros.push({ nome: r.nome, foto: r.foto, valor: r.valor, qtd: r.qtd, meta: r.meta, pct: r.pct });
    });
    const equipes = Object.values(eq).map((x) => ({
      ...x,
      membros: x.membros.sort((a, b) => b.valor - a.valor),
      pct: x.meta > 0 ? Math.round((x.valor / x.meta) * 100) : 0,
    })).sort((a, b) => b.valor - a.valor);

    res.json({
      mes, atualizadoEm: Date.now(), diasNoMes, diaHoje, equipes,
      destaque, perseguidores, vendasHojeQtd: vendasHoje.length,
      geral: {
        venda, recebido, qtd: doMes.length, meta: metaTotal,
        pct: metaTotal > 0 ? Math.round((venda / metaTotal) * 100) : 0,
        falta: Math.max(0, metaTotal - venda),
        ticket: doMes.length ? venda / doMes.length : 0,
        cursosVendidos: Object.keys(cursos).length,
        vendidoHoje, qtdHoje, ontem,
        semana: semana.valor, semanaQtd: semana.qtd, semanaRecebido: semana.recebido,
        mediaDia: diaHoje > 0 ? venda / diaHoje : 0,
        projecao: diaHoje > 0 ? Math.round((venda / diaHoje) * diasNoMes) : 0,
        diasRestantes: Math.max(0, diasNoMes - diaHoje),
        metaDia, pctDia: metaDia > 0 ? Math.round((vendidoHoje / metaDia) * 100) : 0, diasUteis,
      },
      semanas,
      formas: Object.values(formas).sort((a, b) => b.valor - a.valor),
      cursos: Object.values(cursos).sort((a, b) => b.valor - a.valor),
      plataformas: Object.values(plataformas).sort((a, b) => b.valor - a.valor),
      ranking, porDia,
    });
  });

  /* ---------------- PAINEL (a planilha) ---------------- */

  /* ============================================================
     ANÁLISE DO MÊS — cursos, formas de pagamento e plataformas
     Vendedor vê só as vendas dele; gerente vê o time todo.
     ============================================================ */
  app.get("/api/vendas/analise", auth, (req, res) => {
    garantir();
    const mes = String(req.query.mes || "").slice(0, 7) || mesDe(Date.now());
    const ehGer = req.user.role === "gerente";
    let lista = (db.vendas.vendas || []).filter((v) => mesDe(v.data) === mes);
    if (!ehGer) {
      const minha = (db.vendas.pessoas || []).find((p) => p.userId === req.user.id);
      lista = minha ? lista.filter((v) => v.pessoaId === minha.id) : [];
    }
    const soma = (chave, rotulo) => {
      const m = {};
      lista.forEach((v) => {
        const k = chave(v) || "—";
        if (!m[k]) m[k] = { nome: k, qtd: 0, valor: 0, recebido: 0 };
        m[k].qtd++; m[k].valor += num(v.valor); m[k].recebido += num(v.recebido);
      });
      return Object.values(m).sort((a, b) => b.valor - a.valor)
        .map((x) => ({ ...x, ticket: x.qtd ? x.valor / x.qtd : 0, rotulo }));
    };
    const total = lista.reduce((s2, v) => s2 + num(v.valor), 0);
    res.json({
      mes, total, qtd: lista.length,
      recebido: lista.reduce((s2, v) => s2 + num(v.recebido), 0),
      ticket: lista.length ? total / lista.length : 0,
      cursos: soma((v) => cursoCanonico(v.curso), "curso"),
      formas: soma((v) => formaCanonica(v), "forma"),
      plataformas: soma((v) => String(v.plataforma || "").trim() || "Direto", "plataforma"),
      parcelas: soma((v) => (Number(v.parcelas) > 1 ? Number(v.parcelas) + "x" : "À vista"), "parcelas"),
    });
  });

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
        return {
          pessoaId: p.id, nome: p.nome, grupo: p.grupo || "", foto: fotoDe(p), foraDoPodio: !!p.foraDoPodio,
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

    /* ---- destaque do dia: quem mais vendeu hoje ----
       Fica ao lado do ranking do mês, pra dar o pique do dia sem precisar
       abrir o painel da TV. Sempre olha o time inteiro, mesmo no modo individual. */
    const iniHoje = new Date(ano, mm - 1, diaHoje, 0, 0, 0).getTime();
    const fimHoje = iniHoje + 86400000;
    const vendasDeHoje = todasDoMes.filter((v) => v.data >= iniHoje && v.data < fimHoje);
    const porPessoaHoje = {};
    vendasDeHoje.forEach((v) => {
      if (!porPessoaHoje[v.pessoaId]) porPessoaHoje[v.pessoaId] = { pessoaId: v.pessoaId, valor: 0, recebido: 0, qtd: 0, cursos: {} };
      const r = porPessoaHoje[v.pessoaId];
      r.valor += num(v.valor); r.recebido += num(v.recebido); r.qtd++;
      const c = cursoCanonico(v.curso); r.cursos[c] = (r.cursos[c] || 0) + 1;
    });
    const rankHoje = Object.values(porPessoaHoje).map((x) => {
      const p = db.vendas.pessoas.find((y) => y.id === x.pessoaId) || {};
      const top = Object.entries(x.cursos).sort((a, b) => b[1] - a[1])[0];
      return { pessoaId: x.pessoaId, valor: x.valor, recebido: x.recebido, qtd: x.qtd,
               nome: p.nome || "—", grupo: p.grupo || "", foto: fotoDe(p),
               foraDoPodio: !!p.foraDoPodio, cursoTop: top ? top[0] : "" };
    }).filter((x) => !x.foraDoPodio).sort((a, b) => b.valor - a.valor);
    const resumoHoje = {
      dia: diaHoje, ehHoje: ehMesAtual,
      total: vendasDeHoje.reduce((s, v) => s + num(v.valor), 0),
      qtd: vendasDeHoje.length,
      destaque: rankHoje[0] || null,
      atras: rankHoje.slice(1, 4),
    };

    res.json({
      mes, meses, geral, grupos: listaGrupos, linhas, hoje: resumoHoje,
      porDia, diasNoMes, diaHoje, diasRestantes, mediaDia, projecao, precisaPorDia,
      melhorDia: melhorDia && melhorDia.venda > 0 ? melhorDia : null,
      souEu: (pessoaDoUser(req.user) || {}).id || null, ehVendedor: ehVend(req.user),
      escopoPessoa: soDe || null, posicao, totalNoRanking: comVenda.length,
      nomeEscopo: soDe ? ((db.vendas.pessoas.find((p) => p.id === soDe) || {}).nome || "") : "",
    });
  });
}
