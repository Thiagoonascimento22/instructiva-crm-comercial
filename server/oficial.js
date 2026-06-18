/* ============================================================
   CANAL OFICIAL (WhatsApp Cloud API / Meta) + DISTRIBUIÇÃO
   ------------------------------------------------------------
   Módulo isolado: recebe { app, db, saveDB, proximoId, auth,
   gerenteOnly } do index.js e registra suas próprias rotas.
   Não altera nada do fluxo Evolution já existente.
   ============================================================ */

const GRAPH = "https://graph.facebook.com/v21.0";

export function instalarCanalOficial({ app, getDb, saveDB, proximoId, auth, gerenteOnly }) {
  // O index.js REATRIBUI o objeto db dentro de loadDB(). Por isso resolvemos
  // o db dinamicamente via Proxy: todo acesso db.x lê/escreve no objeto atual.
  const db = new Proxy({}, {
    get: (_t, k) => getDb()[k],
    set: (_t, k, v) => { getDb()[k] = v; return true; },
    has: (_t, k) => k in getDb(),
  });

  /* ---- estrutura no banco (criada sob demanda) ---- */
  function garantirEstrutura() {
    if (!db.oficial || typeof db.oficial !== "object") db.oficial = {};
    if (!Array.isArray(db.oficial.numeros)) db.oficial.numeros = [];
    // numeros: [{ id, apelido, numero, phoneNumberId, wabaId, token, ativo }]
    if (!Array.isArray(db.oficial.campanhas)) db.oficial.campanhas = [];
    // campanhas: [{ id, nome, numeroId, template, enviados, falhas, total, criadoEm }]
    if (typeof db.oficial.rrCursor !== "number") db.oficial.rrCursor = 0;
    if (!Array.isArray(db.oficial.ias)) db.oficial.ias = [];
    // ias: [{ id, nome, ativa, modo, persona, playbook, gatilhoHandoff, criadoEm }]
    //   modo: "fecha" (IA vende sozinha) | "qualifica" (IA conversa e passa pro vendedor)
    if (db.oficial.iaGlobalAtiva === undefined) db.oficial.iaGlobalAtiva = true; // botão de pânico geral
    if (!db.oficial.verifyToken) {
      db.oficial.verifyToken = "instructiva_" + Math.random().toString(36).slice(2, 10);
    }
  }

  function salvar() { saveDB(); }

  /* ---- helpers de número do pool ---- */
  function acharNumero(id) {
    return (db.oficial.numeros || []).find((n) => n.id === id) || null;
  }
  function numeroPublico(n) {
    return { id: n.id, apelido: n.apelido, numero: n.numero, phoneNumberId: n.phoneNumberId, wabaId: n.wabaId, ativo: n.ativo, temToken: !!n.token };
  }

  /* ---- só dígitos no telefone ---- */
  function soDigitos(s) { return String(s || "").replace(/\D/g, ""); }
  // normaliza pra padrão BR com 55 na frente
  function normalizaTelefone(s) {
    let d = soDigitos(s);
    if (!d) return "";
    if (!d.startsWith("55")) d = "55" + d;
    return d;
  }

  /* ============================================================
     MOTOR DE DISTRIBUIÇÃO PONDERADA (só vendedores ATIVOS)
     ------------------------------------------------------------
     Lê db.users (role=vendedor). Usa flag .oficialAtivo e o peso
     .oficialPercentual. Distribui respeitando o percentual entre
     os ativos, dando o lead a quem está mais abaixo da própria
     cota (déficit). Empate -> menor contador absoluto.
     ============================================================ */
  function vendedoresElegiveis() {
    return db.users.filter(
      (u) => u.role === "vendedor" && u.ativo && u.oficialAtivo
    );
  }

  function escolherVendedor() {
    const ativos = vendedoresElegiveis();
    if (ativos.length === 0) return null;

    // total de leads já distribuídos entre os ativos (pra calcular a cota)
    const totalDistribuido = ativos.reduce(
      (s, v) => s + (v.oficialLeadsRecebidos || 0), 0
    );

    // soma dos pesos dos ativos (renormaliza só entre quem está ativo agora)
    let somaPesos = ativos.reduce((s, v) => s + (Number(v.oficialPercentual) || 0), 0);
    // se ninguém tem peso configurado, trata como igual pra todos
    const usarIgual = somaPesos <= 0;
    if (usarIgual) somaPesos = ativos.length;

    // próximo lead -> escolhe quem tem MAIOR déficit (cota esperada - recebido)
    let escolhido = null;
    let melhorDeficit = -Infinity;
    for (const v of ativos) {
      const peso = usarIgual ? 1 : (Number(v.oficialPercentual) || 0);
      const cotaEsperada = ((totalDistribuido + 1) * peso) / somaPesos;
      const recebido = v.oficialLeadsRecebidos || 0;
      const deficit = cotaEsperada - recebido;
      if (
        deficit > melhorDeficit ||
        (deficit === melhorDeficit && recebido < (escolhido.oficialLeadsRecebidos || 0))
      ) {
        melhorDeficit = deficit;
        escolhido = v;
      }
    }
    return escolhido;
  }

  function atribuirLead(chat) {
    // já tem dono? mantém
    if (chat.vendedorId) return chat.vendedorId;
    const v = escolherVendedor();
    if (!v) return null; // ninguém ativo -> fica na fila sem dono
    chat.vendedorId = v.id;
    chat.vendedorNome = v.nome;
    chat.atribuidoEm = Date.now();
    v.oficialLeadsRecebidos = (v.oficialLeadsRecebidos || 0) + 1;
    return v.id;
  }

  /* ============================================================
     CHAVE / CHAT do canal oficial
     ============================================================ */
  function chaveChat(numeroId, telefone) {
    return `oficial::${numeroId}::${telefone}`;
  }
  function acharOuCriarChat(numeroId, telefone, nome) {
    const id = chaveChat(numeroId, telefone);
    let chat = db.waChats[id];
    if (!chat) {
      chat = {
        id,
        canal: "oficial",
        numeroOficialId: numeroId,
        instance: id, // mantém compat com telas que leem .instance
        numero: telefone,
        nome: nome || telefone,
        mensagens: [],
        naoLidas: 0,
        atualizadoEm: Date.now(),
        vendedorId: null,
      };
      db.waChats[id] = chat;
    }
    return chat;
  }

  /* tenta achar um chat existente do mesmo lead, tolerando variação do 9º dígito */
  function acharChatTolerante(numeroId, telefone) {
    const exato = db.waChats[chaveChat(numeroId, telefone)];
    if (exato) return exato;
    // normaliza pra comparar só os últimos 8 dígitos (núcleo do número)
    const nucleo = (t) => String(t || "").replace(/\D/g, "").slice(-8);
    const alvo = nucleo(telefone);
    if (!alvo) return null;
    for (const c of Object.values(db.waChats)) {
      if (c.canal !== "oficial" || c.numeroOficialId !== numeroId) continue;
      if (nucleo(c.numero) === alvo) return c;
    }
    return null;
  }
  async function graphPost(numeroCfg, payload) {
    const r = await fetch(`${GRAPH}/${numeroCfg.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + numeroCfg.token,
      },
      body: JSON.stringify(payload),
    });
    let data = null;
    try { data = await r.json(); } catch (_) {}
    if (!r.ok) {
      const msg = (data && data.error && data.error.message) || ("Erro Graph " + r.status);
      throw new Error(msg);
    }
    return data;
  }

  async function enviarTextoOficial(numeroCfg, telefone, texto) {
    return graphPost(numeroCfg, {
      messaging_product: "whatsapp",
      to: telefone,
      type: "text",
      text: { body: texto },
    });
  }

  // faz upload de um arquivo (Buffer) pro Meta e devolve o media_id
  async function uploadMidiaMeta(numeroCfg, buffer, mimeType, filename) {
    const form = new FormData();
    form.append("messaging_product", "whatsapp");
    const blob = new Blob([buffer], { type: mimeType });
    form.append("file", blob, filename || "arquivo");
    const r = await fetch(`${GRAPH}/${numeroCfg.phoneNumberId}/media`, {
      method: "POST",
      headers: { Authorization: "Bearer " + numeroCfg.token },
      body: form,
    });
    let data = null;
    try { data = await r.json(); } catch (_) {}
    if (!r.ok || !data || !data.id) {
      const msg = (data && data.error && data.error.message) || ("Erro upload mídia " + r.status);
      throw new Error(msg);
    }
    return data.id;
  }

  // envia mídia (imagem/áudio/vídeo/documento) já com media_id
  async function enviarMidiaOficial(numeroCfg, telefone, tipo, mediaId, caption, filename) {
    const payload = { messaging_product: "whatsapp", to: telefone, type: tipo };
    const obj = { id: mediaId };
    if (caption && (tipo === "image" || tipo === "video" || tipo === "document")) obj.caption = caption;
    if (tipo === "document" && filename) obj.filename = filename;
    payload[tipo] = obj;
    return graphPost(numeroCfg, payload);
  }

  // descobre o "type" do WhatsApp a partir do mime
  function tipoPorMime(mime) {
    const m = String(mime || "").toLowerCase();
    if (m.startsWith("image/")) return "image";
    if (m.startsWith("video/")) return "video";
    if (m.startsWith("audio/")) return "audio";
    return "document";
  }

  /* monta os components do template a partir das variáveis do lead */
  function montarComponents(template, variaveis) {
    // variaveis: array de strings pro corpo ({{1}}, {{2}}...)
    if (!variaveis || !variaveis.length) return undefined;
    return [
      {
        type: "body",
        parameters: variaveis.map((v) => ({ type: "text", text: String(v) })),
      },
    ];
  }

  async function enviarTemplate(numeroCfg, telefone, templateName, idioma, variaveis) {
    const template = {
      name: templateName,
      language: { code: idioma || "pt_BR" },
    };
    const comps = montarComponents(templateName, variaveis);
    if (comps) template.components = comps;
    return graphPost(numeroCfg, {
      messaging_product: "whatsapp",
      to: telefone,
      type: "template",
      template,
    });
  }

  /* ============================================================
     ROTAS — POOL DE NÚMEROS (gerente)
     ============================================================ */
  app.get("/api/oficial/numeros", auth, gerenteOnly, (req, res) => {
    res.json((db.oficial.numeros || []).map(numeroPublico));
  });

  /* assina a WABA no webhook (silencioso, não quebra se falhar) */
  async function assinarWebhook(n) {
    if (!n || !n.wabaId || !n.token) return false;
    try {
      const r = await fetch(`${GRAPH}/${n.wabaId}/subscribed_apps`, {
        method: "POST",
        headers: { Authorization: `Bearer ${n.token}`, "Content-Type": "application/json" },
      });
      if (r.ok) { n.webhookAssinado = true; n.webhookAssinadoEm = Date.now(); return true; }
    } catch (e) {}
    return false;
  }

  app.post("/api/oficial/numeros", auth, gerenteOnly, async (req, res) => {
    const b = req.body || {};
    const apelido = String(b.apelido || "").trim();
    const numero = String(b.numero || "").trim();
    const phoneNumberId = String(b.phoneNumberId || "").trim();
    const wabaId = String(b.wabaId || "").trim();
    const token = String(b.token || "").trim();
    if (!apelido || !phoneNumberId || !token) {
      return res.status(400).json({ error: "Informe apelido, Phone Number ID e Token" });
    }
    const novo = {
      id: proximoId("num"),
      apelido, numero, phoneNumberId, wabaId, token,
      ativo: true,
    };
    db.oficial.numeros.push(novo);
    await assinarWebhook(novo); // já deixa o webhook recebendo respostas
    salvar();
    res.json(numeroPublico(novo));
  });

  app.put("/api/oficial/numeros/:id", auth, gerenteOnly, async (req, res) => {
    const n = acharNumero(req.params.id);
    if (!n) return res.status(404).json({ error: "Número não encontrado" });
    const b = req.body || {};
    if (b.apelido !== undefined) n.apelido = String(b.apelido).trim();
    if (b.numero !== undefined) n.numero = String(b.numero).trim();
    if (b.phoneNumberId !== undefined) n.phoneNumberId = String(b.phoneNumberId).trim();
    if (b.wabaId !== undefined) n.wabaId = String(b.wabaId).trim();
    if (b.token !== undefined && b.token) n.token = String(b.token).trim();
    if (b.ativo !== undefined) n.ativo = !!b.ativo;
    await assinarWebhook(n); // re-assina ao editar (caso token tenha mudado)
    salvar();
    res.json(numeroPublico(n));
  });

  app.delete("/api/oficial/numeros/:id", auth, gerenteOnly, (req, res) => {
    const i = (db.oficial.numeros || []).findIndex((n) => n.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: "Número não encontrado" });
    db.oficial.numeros.splice(i, 1);
    salvar();
    res.json({ ok: true });
  });

  /* ---- inscreve a WABA no webhook (faz a Meta enviar as respostas desse número) ---- */
  app.post("/api/oficial/numeros/:id/assinar-webhook", auth, gerenteOnly, async (req, res) => {
    const n = acharNumero(req.params.id);
    if (!n) return res.status(404).json({ error: "Número não encontrado" });
    if (!n.wabaId) return res.status(400).json({ error: "Esse número não tem WABA ID configurado" });
    if (!n.token) return res.status(400).json({ error: "Esse número não tem token configurado" });
    try {
      const r = await fetch(`${GRAPH}/${n.wabaId}/subscribed_apps`, {
        method: "POST",
        headers: { Authorization: `Bearer ${n.token}`, "Content-Type": "application/json" },
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = (data && data.error && data.error.message) || "Falha ao assinar webhook";
        return res.status(400).json({ error: msg });
      }
      n.webhookAssinado = true;
      n.webhookAssinadoEm = Date.now();
      salvar();
      res.json({ ok: true, resultado: data });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /* ---- registra o número na Cloud API (necessário quando a verificação em 2 etapas está ativa) ---- */
  app.post("/api/oficial/numeros/:id/registrar", auth, gerenteOnly, async (req, res) => {
    const n = acharNumero(req.params.id);
    if (!n) return res.status(404).json({ error: "Número não encontrado" });
    const pin = String((req.body && req.body.pin) || "").replace(/\D/g, "");
    if (pin.length !== 6) return res.status(400).json({ error: "O PIN precisa ter 6 dígitos" });
    if (!n.token) return res.status(400).json({ error: "Esse número não tem token configurado" });
    try {
      const r = await fetch(`${GRAPH}/${n.phoneNumberId}/register`, {
        method: "POST",
        headers: { Authorization: `Bearer ${n.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", pin }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = (data && data.error && data.error.message) || "Falha ao registrar";
        // erro comum: PIN errado
        if (/pin/i.test(msg) || (data.error && data.error.code === 100)) {
          return res.status(400).json({ error: "Não foi possível registrar. Confira se o PIN de 6 dígitos está correto (você pode redefinir em 'Alterar PIN' no painel da Meta)." });
        }
        return res.status(400).json({ error: msg });
      }
      n.registrado = true;
      n.registradoEm = Date.now();
      salvar();
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /* ---- testa um número: lê os templates aprovados da WABA ---- */
  app.get("/api/oficial/numeros/:id/templates", auth, gerenteOnly, async (req, res) => {
    const n = acharNumero(req.params.id);
    if (!n) return res.status(404).json({ error: "Número não encontrado" });
    if (!n.wabaId) return res.status(400).json({ error: "Esse número não tem WABA ID configurado" });
    try {
      const r = await fetch(
        `${GRAPH}/${n.wabaId}/message_templates?fields=name,status,category,language,components&limit=100`,
        { headers: { Authorization: "Bearer " + n.token } }
      );
      const data = await r.json();
      if (!r.ok) {
        const msg = (data && data.error && data.error.message) || ("Erro Graph " + r.status);
        return res.status(400).json({ error: msg });
      }
      const todos = (data.data || []).map((t) => {
        const body = (t.components || []).find((c) => c.type === "BODY");
        const texto = body ? body.text || "" : "";
        const vars = (texto.match(/\{\{\d+\}\}/g) || []).length;
        return { name: t.name, language: t.language, category: t.category, status: t.status, vars, texto };
      });
      const aprovados = todos.filter((t) => t.status === "APPROVED");
      res.json({ templates: aprovados, todos });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /* ---- criar um template novo na Meta (fica pendente até a Meta aprovar) ---- */
  app.post("/api/oficial/numeros/:id/templates", auth, gerenteOnly, async (req, res) => {
    const n = acharNumero(req.params.id);
    if (!n) return res.status(404).json({ error: "Número não encontrado" });
    if (!n.wabaId) return res.status(400).json({ error: "Esse número não tem WABA ID configurado" });
    const b = req.body || {};
    const nome = String(b.nome || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const corpo = String(b.corpo || "").trim();
    const categoria = String(b.categoria || "MARKETING").toUpperCase(); // MARKETING | UTILITY
    const idioma = String(b.idioma || "pt_BR").trim();
    if (!nome || !corpo) return res.status(400).json({ error: "Informe o nome e o texto do template" });
    try {
      const r = await fetch(`${GRAPH}/${n.wabaId}/message_templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + n.token },
        body: JSON.stringify({
          name: nome,
          language: idioma,
          category: categoria === "UTILITY" ? "UTILITY" : "MARKETING",
          components: [{ type: "BODY", text: corpo }],
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        const msg = (data && data.error && data.error.message) || ("Erro Graph " + r.status);
        return res.status(400).json({ error: msg });
      }
      res.json({ ok: true, id: data.id, status: data.status || "PENDING", category: data.category || categoria });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  // estatísticas gerais do canal oficial (pra Monitoria): disparos, IA, atendimento
  app.get("/api/oficial/stats", auth, gerenteOnly, (req, res) => {
    const desde = req.query.desde ? Number(req.query.desde) : 0;
    const ate = req.query.ate ? Number(req.query.ate) : Date.now();
    const campanhas = (db.oficial.campanhas || []).filter((c) => {
      const t = c.criadoEm || 0;
      return t >= desde && t <= ate;
    });
    // disparos
    let enviados = 0, entregues = 0, lidos = 0, responderam = 0, falhas = 0;
    campanhas.forEach((c) => {
      enviados += c.enviados || 0;
      entregues += c.entregues || 0;
      lidos += c.lidos || 0;
      responderam += c.responderam || 0;
      falhas += c.falhas || 0;
    });
    // chats do oficial no período
    const chats = Object.values(db.waChats).filter((c) => c.canal === "oficial");
    let iaAtendendo = 0, iaPassou = 0, comVendedor = 0, semDono = 0, msgsIA = 0;
    chats.forEach((c) => {
      const ult = c.atualizadoEm || 0;
      if (ult < desde || ult > ate) return;
      if (c.iaId && !c.iaPausada) iaAtendendo++;
      // IA passou = tem nota de handoff
      const passou = (c.notas || []).some((n) => n.tipo === "ia_handoff" && (n.ts || 0) >= desde && (n.ts || 0) <= ate);
      if (passou) iaPassou++;
      if (c.vendedorId) comVendedor++;
      else if (!c.iaId || c.iaPausada) semDono++;
      msgsIA += (c.mensagens || []).filter((m) => m.porIA && m.ts >= desde && m.ts <= ate).length;
    });
    // desempenho por IA
    const iasMap = {};
    (db.oficial.ias || []).forEach((ia) => { iasMap[ia.id] = { id: ia.id, nome: ia.nome, modo: ia.modo, atendendo: 0, passou: 0, msgs: 0 }; });
    chats.forEach((c) => {
      if (!c.iaId || !iasMap[c.iaId]) return;
      const ult = c.atualizadoEm || 0;
      if (ult < desde || ult > ate) return;
      if (c.iaId && !c.iaPausada) iasMap[c.iaId].atendendo++;
      if ((c.notas || []).some((n) => n.tipo === "ia_handoff")) iasMap[c.iaId].passou++;
      iasMap[c.iaId].msgs += (c.mensagens || []).filter((m) => m.porIA).length;
    });
    const taxaResp = enviados ? Math.round((responderam / enviados) * 100) : 0;
    res.json({
      disparos: { enviados, entregues, lidos, responderam, falhas, taxaResp, campanhas: campanhas.length },
      atendimento: { iaAtendendo, iaPassou, comVendedor, semDono, msgsIA },
      ias: Object.values(iasMap),
      desde, ate,
    });
  });

  app.get("/api/oficial/vendedores", auth, gerenteOnly, (req, res) => {
    const lista = db.users
      .filter((u) => u.role === "vendedor" && u.ativo)
      .map((u) => ({
        id: u.id,
        nome: u.nome,
        oficialAtivo: !!u.oficialAtivo,
        oficialPercentual: Number(u.oficialPercentual) || 0,
        oficialLeadsRecebidos: u.oficialLeadsRecebidos || 0,
      }));
    res.json(lista);
  });

  app.put("/api/oficial/vendedores/:id", auth, gerenteOnly, (req, res) => {
    const u = db.users.find((x) => x.id === req.params.id && x.role === "vendedor");
    if (!u) return res.status(404).json({ error: "Vendedor não encontrado" });
    const b = req.body || {};
    if (b.oficialAtivo !== undefined) u.oficialAtivo = !!b.oficialAtivo;
    if (b.oficialPercentual !== undefined) {
      let p = Number(b.oficialPercentual);
      if (isNaN(p) || p < 0) p = 0;
      if (p > 100) p = 100;
      u.oficialPercentual = p;
    }
    salvar();
    res.json({
      id: u.id, nome: u.nome,
      oficialAtivo: !!u.oficialAtivo,
      oficialPercentual: Number(u.oficialPercentual) || 0,
      oficialLeadsRecebidos: u.oficialLeadsRecebidos || 0,
    });
  });

  // zera os contadores (recomeça a distribuição do zero)
  app.post("/api/oficial/vendedores/zerar", auth, gerenteOnly, (req, res) => {
    db.users.forEach((u) => { if (u.role === "vendedor") u.oficialLeadsRecebidos = 0; });
    salvar();
    res.json({ ok: true });
  });

  /* ============================================================
     DISPARO EM MASSA
     body: { numeroId, template, idioma, contatos:[{telefone,nome,variaveis:[...]}], nomeCampanha }
     ============================================================ */
  /* ============================================================
     IAs DO CANAL OFICIAL (cérebro) — config rica + base de conhecimento
     ============================================================ */
  function lim(s, n) { return String(s == null ? "" : s).slice(0, n); }

  const TOM_LABEL = {
    amigavel: "amigável e próximo", profissional: "profissional",
    descontraido: "descontraído", consultivo: "consultivo", direto: "direto e objetivo",
  };

  // monta o prompt-sistema da IA a partir de toda a config + base de conhecimento
  function montarSystemPrompt(ia, nomeLead) {
    const c = ia.config || {};
    const P = [];
    P.push(`Você é ${ia.nome}, um(a) atendente de vendas que conversa com leads pelo WhatsApp.`);
    P.push(`Seu tom de voz é ${TOM_LABEL[c.tomVoz] || "amigável e próximo"}.`);
    if (nomeLead) P.push(`O nome do lead com quem você fala é: ${nomeLead}.`);
    if (c.objetivo) P.push(`SEU OBJETIVO PRINCIPAL: ${c.objetivo}`);

    if (c.quemEla) P.push(`\nQUEM VOCÊ É:\n${c.quemEla}`);
    if (c.comoEscreve) P.push(`\nCOMO VOCÊ ESCREVE:\n${c.comoEscreve}`);
    if (c.sempreFaz) P.push(`\nVOCÊ SEMPRE:\n${c.sempreFaz}`);
    if (c.nuncaFaz) P.push(`\nVOCÊ NUNCA:\n${c.nuncaFaz}`);

    if (Array.isArray(c.cursos) && c.cursos.length) {
      P.push(`\nCURSOS E OFERTAS QUE VOCÊ VENDE:`);
      c.cursos.forEach((cur) => {
        const linhas = [];
        if (cur.nome) linhas.push(`Curso: ${cur.nome}`);
        if (cur.carga) linhas.push(`Carga horária: ${cur.carga}`);
        if (cur.garantia) linhas.push(`Garantia: ${cur.garantia}`);
        if (cur.certificado) linhas.push(`Certificado: ${cur.certificado}`);
        if (cur.paraQuem) linhas.push(`Para quem é: ${cur.paraQuem}`);
        if (cur.diferencial) linhas.push(`Diferencial: ${cur.diferencial}`);
        if (cur.descricao) linhas.push(`Descrição: ${cur.descricao}`);
        (cur.ofertas || []).forEach((o) => {
          const partes = [o.nome, o.valor, o.obs].filter(Boolean).join(" — ");
          linhas.push(`Oferta: ${partes}${o.link ? " | Link: " + o.link : ""}`);
        });
        P.push("- " + linhas.join("\n  "));
      });
    }

    if (Array.isArray(c.objecoes) && c.objecoes.length) {
      P.push(`\nCOMO RESPONDER OBJEÇÕES:`);
      c.objecoes.forEach((o) => { if (o.objecao) P.push(`- Se disser "${o.objecao}": ${o.resposta || ""}`); });
    }

    if (Array.isArray(c.faq) && c.faq.length) {
      P.push(`\nPERGUNTAS FREQUENTES:`);
      c.faq.forEach((q) => { if (q.pergunta) P.push(`- P: ${q.pergunta}\n  R: ${q.resposta || ""}`); });
    }

    const etapas = [
      ["Abertura (primeira mensagem)", c.pbAbertura],
      ["Qualificação", c.pbQualificacao],
      ["Apresentação do curso", c.pbApresentacao],
      ["Quando soltar o preço", c.pbPreco],
      ["Fechamento", c.pbFechamento],
      ["Recuperação (se sumir)", c.pbRecuperacao],
    ].filter(([, v]) => v);
    if (etapas.length) {
      P.push(`\nROTEIRO DA CONVERSA (siga essa ordem):`);
      etapas.forEach(([t, v], i) => P.push(`${i + 1}. ${t}: ${v}`));
    }

    // base de conhecimento dos arquivos anexados
    const kb = (ia.conhecimento || []).filter((k) => k.texto);
    if (kb.length) {
      P.push(`\nBASE DE CONHECIMENTO (material de referência — use para responder com precisão, não invente):`);
      kb.forEach((k) => { P.push(`\n--- ${k.nome} ---\n${lim(k.texto, 40000)}`); });
    }

    if (ia.modo === "qualifica") {
      P.push(`\nIMPORTANTE — VOCÊ QUALIFICA E PASSA PRA UM HUMANO RÁPIDO:`);
      if (c.escQuando) P.push(`Passe para um vendedor humano quando: ${c.escQuando}`);
      else P.push(`Passe para um vendedor humano ASSIM QUE o lead demonstrar QUALQUER interesse num curso (ex.: "tenho interesse", "quero saber sobre o curso X", "quero o curso", "me interessa"). Não fique fazendo muitas perguntas nem tente vender — o seu papel é só identificar o interesse e passar pro vendedor. No máximo uma pergunta rápida, e se ele confirmar interesse, passe na hora.`);
      P.push(`Quando for a hora de passar, responda EXATAMENTE com a tag [PASSAR_HUMANO] no FINAL da sua mensagem (o sistema detecta e faz a transferência). ${c.escFrase ? 'Use uma frase tipo: "' + c.escFrase + '"' : 'Use uma frase curta tipo: "Que ótimo! Vou te passar agora pra um especialista da nossa equipe que vai te ajudar com tudo, tá bem?"'}`);
    } else {
      P.push(`\nVocê conduz a venda sozinho(a) até o fechamento, mandando o link de pagamento quando o lead quiser comprar. Não invente que vai passar pra outra pessoa.`);
    }
    if (c.encerrarCriterios) P.push(`\nEncerre/pare de insistir quando: ${c.encerrarCriterios}`);

    P.push(`\nREGRAS GERAIS: Responda como mensagem de WhatsApp (curto, natural, humano). Uma ideia por mensagem. Nunca diga que é uma IA ou robô. Nunca invente preços, links ou informações que não estão acima.`);
    return P.join("\n");
  }

  // chama a API da Anthropic e devolve o texto da resposta
  async function chamarClaude(systemPrompt, historico) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY não configurada");
    const messages = historico.map((m) => ({
      role: m.role === "them" ? "user" : "assistant",
      content: m.content || "",
    })).filter((m) => m.content);
    // garante que começa com user
    while (messages.length && messages[0].role !== "user") messages.shift();
    if (!messages.length) return "";
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((data.error && data.error.message) || "Erro Claude " + r.status);
    const txt = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    return txt;
  }

  // processa a resposta da IA pra um chat (chamado pelo webhook quando o lead responde)
  // mostra "digitando..." no WhatsApp do lead (e marca a última msg como lida)
  async function mostrarDigitando(numeroCfg, ultimaMsgId) {
    if (!ultimaMsgId) return;
    try {
      await graphPost(numeroCfg, {
        messaging_product: "whatsapp",
        status: "read",
        message_id: ultimaMsgId,
        typing_indicator: { type: "text" },
      });
    } catch (e) { /* se a Meta não aceitar, segue sem travar */ }
  }

  // calcula um tempo "humano" de digitação pelo tamanho da resposta
  // curta (~até 120 chars) ~8s; longa (~400+ chars) ~14s; escala no meio
  function tempoDigitacao(texto) {
    const n = (texto || "").length;
    const min = 8000, max = 14000;
    const baixo = 120, alto = 400;
    if (n <= baixo) return min;
    if (n >= alto) return max;
    const frac = (n - baixo) / (alto - baixo);
    return Math.round(min + frac * (max - min));
  }

  async function rodarIA(chat, numeroCfg) {
    try {
      if (db.oficial.iaGlobalAtiva === false) return; // botão de pânico: IA geral desligada
      const ia = (db.oficial.ias || []).find((x) => x.id === chat.iaId);
      if (!ia || !ia.ativa) return;
      const system = montarSystemPrompt(ia, chat.nome);
      const histDireto = (chat.mensagens || []).slice(-24);
      let resposta = await chamarClaude(system, histDireto);
      if (!resposta) return;

      // detecta handoff
      let passar = false;
      if (resposta.includes("[PASSAR_HUMANO]")) {
        passar = true;
        resposta = resposta.replace(/\[PASSAR_HUMANO\]/g, "").trim();
      }

      if (resposta) {
        // efeito humano: mostra "digitando..." e espera um tempo proporcional ao tamanho
        const espera = tempoDigitacao(resposta);
        await mostrarDigitando(numeroCfg, chat.ultimaMsgLeadId);
        await new Promise((r) => setTimeout(r, espera));
        await enviarTextoOficial(numeroCfg, chat.numero, resposta);
        const ts = Date.now();
        chat.mensagens.push({ role: "me", content: resposta, ts, porIA: true });
        if (chat.mensagens.length > 300) chat.mensagens = chat.mensagens.slice(-300);
        chat.atualizadoEm = ts;
      }

      if (passar) {
        chat.iaPausada = true; // IA para de responder
        atribuirLead(chat);     // distribui pra um vendedor humano
        chat.respondeu = true;  // garante visibilidade pro vendedor
        chat.naoLidas = (chat.naoLidas || 0) + 1; // aparece como novo pra ele
        chat.atualizadoEm = Date.now(); // sobe pro topo da lista
        if (!Array.isArray(chat.notas)) chat.notas = [];
        chat.notas.push({ tipo: "ia_handoff", texto: `${ia.nome} (IA) qualificou e passou pro vendedor${chat.vendedorNome ? " " + chat.vendedorNome : ""}`, ts: Date.now(), por: ia.nome });
      }
      salvar();
    } catch (e) {
      console.error("Erro rodarIA:", e.message);
    }
  }

  function configVazia() {
    return {
      // GERAL
      tomVoz: "amigavel", objetivo: "", agentePadrao: false, autoResponder: false,
      // PERSONA
      quemEla: "", comoEscreve: "", sempreFaz: "", nuncaFaz: "",
      // CONHECIMENTO
      cursos: [],        // [{ nome, carga, garantia, certificado, paraQuem, diferencial, descricao, ofertas:[{nome,valor,link,obs}] }]
      objecoes: [],      // [{ objecao, resposta }]
      faq: [],           // [{ pergunta, resposta }]
      // FLUXO (playbook por etapas)
      pbAbertura: "", pbQualificacao: "", pbApresentacao: "", pbPreco: "", pbFechamento: "", pbRecuperacao: "",
      // ESCALAÇÃO / ENCERRAMENTO
      escQuando: "", escFrase: "", escNome: "", escTelefone: "", encerrarCriterios: "",
    };
  }

  function sanitizaConfig(raw) {
    const c = configVazia();
    const b = raw || {};
    c.tomVoz = lim(b.tomVoz || "amigavel", 40);
    c.objetivo = lim(b.objetivo, 2000);
    c.agentePadrao = !!b.agentePadrao;
    c.autoResponder = !!b.autoResponder;
    c.quemEla = lim(b.quemEla, 6000);
    c.comoEscreve = lim(b.comoEscreve, 3000);
    c.sempreFaz = lim(b.sempreFaz, 4000);
    c.nuncaFaz = lim(b.nuncaFaz, 4000);
    c.cursos = Array.isArray(b.cursos) ? b.cursos.slice(0, 30).map((x) => ({
      nome: lim(x.nome, 200), carga: lim(x.carga, 100), garantia: lim(x.garantia, 200),
      certificado: lim(x.certificado, 200), paraQuem: lim(x.paraQuem, 600),
      diferencial: lim(x.diferencial, 600), descricao: lim(x.descricao, 4000),
      ofertas: Array.isArray(x.ofertas) ? x.ofertas.slice(0, 20).map((o) => ({
        nome: lim(o.nome, 200), valor: lim(o.valor, 100), link: lim(o.link, 500), obs: lim(o.obs, 300),
      })) : [],
    })) : [];
    c.objecoes = Array.isArray(b.objecoes) ? b.objecoes.slice(0, 50).map((x) => ({
      objecao: lim(x.objecao, 300), resposta: lim(x.resposta, 2000),
    })) : [];
    c.faq = Array.isArray(b.faq) ? b.faq.slice(0, 80).map((x) => ({
      pergunta: lim(x.pergunta, 300), resposta: lim(x.resposta, 2000),
    })) : [];
    c.pbAbertura = lim(b.pbAbertura, 3000);
    c.pbQualificacao = lim(b.pbQualificacao, 3000);
    c.pbApresentacao = lim(b.pbApresentacao, 3000);
    c.pbPreco = lim(b.pbPreco, 3000);
    c.pbFechamento = lim(b.pbFechamento, 3000);
    c.pbRecuperacao = lim(b.pbRecuperacao, 3000);
    c.escQuando = lim(b.escQuando, 3000);
    c.escFrase = lim(b.escFrase, 1000);
    c.escNome = lim(b.escNome, 120);
    c.escTelefone = lim(b.escTelefone, 40);
    c.encerrarCriterios = lim(b.encerrarCriterios, 2000);
    return c;
  }

  // base de conhecimento extraída de arquivos: [{ id, secao, nome, texto, criadoEm }]
  function sanitizaConhecimento(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, 60).map((k) => ({
      id: k.id || proximoId("kb"),
      secao: lim(k.secao || "cursos", 30),
      nome: lim(k.nome, 200),
      texto: lim(k.texto, 200000),
      criadoEm: k.criadoEm || Date.now(),
    }));
  }

  function iaPublica(ia) {
    return {
      id: ia.id, nome: ia.nome, ativa: !!ia.ativa, modo: ia.modo,
      config: ia.config || configVazia(),
      conhecimento: (ia.conhecimento || []).map((k) => ({ id: k.id, secao: k.secao, nome: k.nome, chars: (k.texto || "").length, criadoEm: k.criadoEm })),
      criadoEm: ia.criadoEm,
    };
  }

  app.get("/api/oficial/ias", auth, gerenteOnly, (req, res) => {
    res.json((db.oficial.ias || []).map(iaPublica));
  });

  app.post("/api/oficial/ias", auth, gerenteOnly, (req, res) => {
    const b = req.body || {};
    const nome = String(b.nome || "").trim();
    if (!nome) return res.status(400).json({ error: "Dê um nome pra IA" });
    const ia = {
      id: proximoId("ia"),
      nome: nome.slice(0, 80),
      ativa: b.ativa !== false,
      modo: b.modo === "qualifica" ? "qualifica" : "fecha",
      config: sanitizaConfig(b.config),
      conhecimento: sanitizaConhecimento(b.conhecimento),
      criadoEm: Date.now(),
    };
    db.oficial.ias.unshift(ia);
    salvar();
    res.json(iaPublica(ia));
  });

  app.put("/api/oficial/ias/:id", auth, gerenteOnly, (req, res) => {
    const ia = (db.oficial.ias || []).find((x) => x.id === req.params.id);
    if (!ia) return res.status(404).json({ error: "IA não encontrada" });
    const b = req.body || {};
    if (b.nome !== undefined) { const n = String(b.nome).trim(); if (n) ia.nome = n.slice(0, 80); }
    if (b.modo !== undefined) ia.modo = b.modo === "qualifica" ? "qualifica" : "fecha";
    if (b.ativa !== undefined) ia.ativa = !!b.ativa;
    if (b.config !== undefined) ia.config = sanitizaConfig(b.config);
    if (b.conhecimento !== undefined) ia.conhecimento = sanitizaConhecimento(b.conhecimento);
    salvar();
    res.json(iaPublica(ia));
  });

  app.delete("/api/oficial/ias/:id", auth, gerenteOnly, (req, res) => {
    const antes = (db.oficial.ias || []).length;
    db.oficial.ias = (db.oficial.ias || []).filter((x) => x.id !== req.params.id);
    salvar();
    res.json({ ok: true, removida: antes !== db.oficial.ias.length });
  });

  // estado e controle GLOBAL da IA (botão de pânico)
  app.get("/api/oficial/ia-global", auth, gerenteOnly, (req, res) => {
    res.json({ ativa: db.oficial.iaGlobalAtiva !== false });
  });
  app.post("/api/oficial/ia-global", auth, gerenteOnly, (req, res) => {
    const b = req.body || {};
    db.oficial.iaGlobalAtiva = !!b.ativa;
    salvar();
    res.json({ ok: true, ativa: db.oficial.iaGlobalAtiva });
  });

  // pausar/retomar a IA de UMA conversa (gerente assume manual / devolve pra IA)
  app.post("/api/oficial/chats/:id/ia", auth, gerenteOnly, (req, res) => {
    const chat = db.waChats[req.params.id];
    if (!chat || chat.canal !== "oficial") return res.status(404).json({ error: "Conversa não encontrada" });
    const b = req.body || {};
    const pausar = !!b.pausar;
    chat.iaPausada = pausar;
    if (!Array.isArray(chat.notas)) chat.notas = [];
    chat.notas.push({
      tipo: pausar ? "ia_pausada" : "ia_retomada",
      texto: `${req.user.nome} ${pausar ? "pausou a IA e assumiu o atendimento" : "devolveu o atendimento pra IA"}`,
      ts: Date.now(), por: req.user.nome,
    });
    if (chat.notas.length > 100) chat.notas = chat.notas.slice(-100);
    salvar();
    res.json({ ok: true, iaPausada: chat.iaPausada });
  });

  // PREVIEW: testa a IA com a config atual (sem salvar, sem WhatsApp)
  app.post("/api/oficial/ias/preview", auth, gerenteOnly, async (req, res) => {
    const b = req.body || {};
    const iaFake = {
      nome: String(b.nome || "IA").trim() || "IA",
      modo: b.modo === "qualifica" ? "qualifica" : "fecha",
      config: sanitizaConfig(b.config),
      conhecimento: sanitizaConhecimento(b.conhecimento),
    };
    const historico = Array.isArray(b.historico) ? b.historico.slice(-24) : [];
    if (!historico.length) return res.status(400).json({ error: "Sem mensagens" });
    try {
      const system = montarSystemPrompt(iaFake, b.nomeLead || "");
      let resposta = await chamarClaude(system, historico);
      let passar = false;
      if (resposta.includes("[PASSAR_HUMANO]")) { passar = true; resposta = resposta.replace(/\[PASSAR_HUMANO\]/g, "").trim(); }
      res.json({ ok: true, resposta, passar });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // extrai texto de um arquivo enviado (base64): TXT/MD/CSV nativo, PDF via pdfjs, DOCX via mammoth
  app.post("/api/oficial/ias/extrair", auth, gerenteOnly, async (req, res) => {
    const b = req.body || {};
    const nome = String(b.nome || "arquivo").trim();
    const base64 = String(b.base64 || "");
    if (!base64) return res.status(400).json({ error: "Arquivo vazio" });
    const lower = nome.toLowerCase();
    let buf;
    try { buf = Buffer.from(base64, "base64"); }
    catch (_) { return res.status(400).json({ error: "Arquivo inválido" }); }
    if (buf.length > 6 * 1024 * 1024) return res.status(400).json({ error: "Arquivo passa de 6MB" });

    try {
      // TXT / MD / CSV
      if (lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".csv") || lower.endsWith(".text")) {
        const texto = buf.toString("utf8").slice(0, 200000);
        if (!texto.trim()) return res.status(422).json({ error: "Arquivo de texto vazio" });
        return res.json({ ok: true, nome, texto, tipo: "texto" });
      }

      // PDF
      if (lower.endsWith(".pdf")) {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        const data = new Uint8Array(buf);
        const doc = await pdfjs.getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise;
        let texto = "";
        const maxPag = Math.min(doc.numPages, 200);
        for (let i = 1; i <= maxPag; i++) {
          const page = await doc.getPage(i);
          const content = await page.getTextContent();
          texto += content.items.map((it) => it.str).join(" ") + "\n";
          if (texto.length > 200000) break;
        }
        texto = texto.slice(0, 200000).trim();
        if (!texto) return res.status(422).json({ error: "Não consegui ler texto desse PDF (pode ser um PDF de imagem/escaneado)." });
        return res.json({ ok: true, nome, texto, tipo: "pdf" });
      }

      // DOC / DOCX
      if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
        const { createRequire } = await import("module");
        const require2 = createRequire(import.meta.url);
        const mammoth = require2("mammoth");
        const r = await mammoth.extractRawText({ buffer: buf });
        const texto = String(r.value || "").slice(0, 200000).trim();
        if (!texto) return res.status(422).json({ error: "Não consegui ler texto desse documento." });
        return res.json({ ok: true, nome, texto, tipo: "docx" });
      }

      return res.status(415).json({ error: "Formato não suportado. Use PDF, DOC, DOCX, TXT, MD ou CSV." });
    } catch (e) {
      console.error("Erro extrair arquivo:", e.message);
      return res.status(500).json({ error: "Não consegui processar o arquivo: " + e.message });
    }
  });




  app.post("/api/oficial/disparar", auth, gerenteOnly, async (req, res) => {
    const b = req.body || {};
    const numeroCfg = acharNumero(b.numeroId);
    if (!numeroCfg) return res.status(400).json({ error: "Escolha um número válido" });
    if (!numeroCfg.ativo) return res.status(400).json({ error: "Esse número está inativo" });
    const templateName = String(b.template || "").trim();
    if (!templateName) return res.status(400).json({ error: "Escolha um template" });
    const idioma = String(b.idioma || "pt_BR").trim();
    const contatos = Array.isArray(b.contatos) ? b.contatos : [];
    if (contatos.length === 0) return res.status(400).json({ error: "Nenhum contato na lista" });
    if (contatos.length > 5000) return res.status(400).json({ error: "Máximo de 5000 por disparo" });

    // IA opcional pra essa campanha (se vier, os leads que responderem caem pra IA)
    const iaId = String(b.iaId || "").trim();
    const iaCampanha = iaId ? (db.oficial.ias || []).find((x) => x.id === iaId && x.ativa) : null;
    if (iaId && !iaCampanha) return res.status(400).json({ error: "IA selecionada não existe ou está pausada" });

    const campanha = {
      id: proximoId("camp"),
      nome: String(b.nomeCampanha || templateName).trim(),
      numeroId: numeroCfg.id,
      template: templateName,
      iaId: iaCampanha ? iaCampanha.id : null,
      iaNome: iaCampanha ? iaCampanha.nome : null,
      enviados: 0,    // aceitos pela Meta (sent)
      entregues: 0,   // delivered (via webhook de status)
      lidos: 0,       // read (via webhook de status)
      responderam: 0, // leads que mandaram msg de volta
      falhas: 0,
      total: contatos.length,
      criadoEm: Date.now(),
    };
    db.oficial.campanhas.unshift(campanha);
    salvar();

    // responde já e dispara em background (não trava a tela)
    res.json({ ok: true, campanhaId: campanha.id, total: contatos.length });

    (async () => {
      for (const c of contatos) {
        const telefone = normalizaTelefone(c.telefone);
        if (!telefone) { campanha.falhas++; continue; }
        const nome = (c.nome || "").trim() || telefone;
        try {
          const resp = await enviarTemplate(numeroCfg, telefone, templateName, idioma, c.variaveis || []);
          campanha.enviados++;
          // guarda o messageId -> campanha, pra contar delivered/read no webhook de status
          const mid = resp && resp.messages && resp.messages[0] && resp.messages[0].id;
          if (mid) {
            if (!db.oficial.msgCampanha) db.oficial.msgCampanha = {};
            db.oficial.msgCampanha[mid] = campanha.id;
          }
          // cria o chat já (marcado como veio de disparo) — sem dono ainda;
          // o dono é definido quando o lead RESPONDER (no webhook)
          const chat = acharOuCriarChat(numeroCfg.id, telefone, nome);
          chat.origemDisparo = true;
          chat.campanha = campanha.nome;
          chat.campanhaId = campanha.id;
          // etiqueta de IA da campanha: última campanha vence (manual reseta IA)
          chat.iaId = campanha.iaId || null;
          chat.iaPausada = false;
          if (chat.respondeu === undefined) chat.respondeu = false;
          const ts = Date.now();
          chat.mensagens.push({ role: "me", content: `[disparo] ${templateName}`, ts, template: true });
          chat.atualizadoEm = ts;
        } catch (e) {
          campanha.falhas++;
          console.error("Falha disparo p/", telefone, ":", e.message);
        }
        salvar();
        // ritmo: pequena pausa pra proteger a reputação do número
        await new Promise((r) => setTimeout(r, 120));
      }
      console.log(`Campanha ${campanha.nome}: ${campanha.enviados} enviados, ${campanha.falhas} falhas`);
      salvar();
    })();
  });

  /* histórico de campanhas */
  app.get("/api/oficial/campanhas", auth, gerenteOnly, (req, res) => {
    res.json((db.oficial.campanhas || []).slice(0, 50));
  });

  /* recalcula "responderam" de todas as campanhas com base nas conversas atuais.
     Conserta campanhas antigas onde a resposta caiu numa conversa separada. */
  app.post("/api/oficial/campanhas/recontar", auth, gerenteOnly, (req, res) => {
    const nucleo = (t) => String(t || "").replace(/\D/g, "").slice(-8);
    // mapa: para cada campanha, conjunto de núcleos que receberam disparo
    const porCampanha = {}; // campId -> Set(nucleos disparados)
    const respondeuNucleo = {}; // numeroId -> Set(nucleos que responderam)

    for (const c of Object.values(db.waChats)) {
      if (c.canal !== "oficial") continue;
      const nuc = nucleo(c.numero);
      if (!nuc) continue;
      // quem respondeu? (tem alguma mensagem role=them)
      const temResposta = (c.mensagens || []).some((m) => m.role === "them");
      if (temResposta) {
        if (!respondeuNucleo[c.numeroOficialId]) respondeuNucleo[c.numeroOficialId] = new Set();
        respondeuNucleo[c.numeroOficialId].add(nuc);
      }
      // de qual campanha veio
      if (c.origemDisparo && c.campanhaId) {
        if (!porCampanha[c.campanhaId]) porCampanha[c.campanhaId] = { numeroId: c.numeroOficialId, nucs: new Set() };
        porCampanha[c.campanhaId].nucs.add(nuc);
      }
    }

    let ajustadas = 0;
    for (const camp of db.oficial.campanhas || []) {
      const info = porCampanha[camp.id];
      if (!info) continue;
      const respSet = respondeuNucleo[info.numeroId] || new Set();
      let n = 0;
      for (const nuc of info.nucs) if (respSet.has(nuc)) n++;
      if (n !== (camp.responderam || 0)) { camp.responderam = n; ajustadas++; }
    }
    salvar();
    res.json({ ok: true, ajustadas });
  });

  /* excluir uma campanha (e, opcionalmente, as conversas que vieram dela) */
  app.delete("/api/oficial/campanhas/:id", auth, gerenteOnly, (req, res) => {
    const i = (db.oficial.campanhas || []).findIndex((c) => c.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: "Campanha não encontrada" });
    const camp = db.oficial.campanhas[i];
    const apagarConversas = String(req.query.conversas || "") === "1";
    let conversasRemovidas = 0;
    if (apagarConversas) {
      for (const [id, chat] of Object.entries(db.waChats)) {
        if (chat.canal === "oficial" && chat.campanhaId === camp.id) {
          delete db.waChats[id];
          conversasRemovidas++;
        }
      }
    }
    db.oficial.campanhas.splice(i, 1);
    salvar();
    res.json({ ok: true, conversasRemovidas });
  });

  /* ============================================================
     INBOX OFICIAL — lista de chats
     gerente vê todos; vendedor vê só os atribuídos a ele
     ============================================================ */
  app.get("/api/oficial/chats", auth, (req, res) => {
    const q = String(req.query.q || "").trim().toLowerCase();
    let chats = Object.values(db.waChats).filter((c) => c.canal === "oficial");
    const incluirEncerrados = String(req.query.encerrados || "") === "1";
    if (!incluirEncerrados) chats = chats.filter((c) => !c.encerrado);
    if (req.user.role !== "gerente") {
      // vendedor só vê conversas:
      //  - atribuídas a ele
      //  - que o lead já respondeu (disparo sem resposta fica invisível)
      //  - e que NÃO estejam sob comando de uma IA ativa
      //    (enquanto a IA atende, é privado do gestor; ao passar pro vendedor,
      //     a IA pausa e atribui, então a conversa aparece JÁ com todo o histórico)
      chats = chats.filter((c) =>
        c.vendedorId === req.user.id &&
        (!c.origemDisparo || c.respondeu) &&
        !(c.iaId && !c.iaPausada)
      );
    } else if (req.query.numeroId && req.query.numeroId !== "todos") {
      chats = chats.filter((c) => c.numeroOficialId === req.query.numeroId);
    }
    if (q) {
      chats = chats.filter(
        (c) => (c.nome || "").toLowerCase().includes(q) || (c.numero || "").includes(q)
      );
    }
    const lista = chats
      .sort((a, b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0))
      .slice(0, 500)
      .map((c) => {
        const ultima = c.mensagens && c.mensagens.length ? c.mensagens[c.mensagens.length - 1] : null;
        const v = c.vendedorId ? db.users.find((u) => u.id === c.vendedorId) : null;
        return {
          id: c.id,
          numero: c.numero,
          nome: c.nome,
          naoLidas: c.naoLidas || 0,
          atualizadoEm: c.atualizadoEm || 0,
          origemDisparo: !!c.origemDisparo,
          campanha: c.campanha || "",
          vendedorId: c.vendedorId || null,
          vendedorNome: v ? v.nome : "",
          numeroOficialId: c.numeroOficialId,
          comIA: !!(c.iaId && !c.iaPausada),
          iaPassou: !!(c.iaId && c.iaPausada && c.vendedorId),
          ultima: ultima ? { role: ultima.role, content: String(ultima.content || "").slice(0, 80), ts: ultima.ts } : null,
        };
      });
    res.json(lista);
  });

  /* abrir uma conversa */
  app.get("/api/oficial/chats/:id", auth, (req, res) => {
    const chat = db.waChats[req.params.id];
    if (!chat || chat.canal !== "oficial") return res.status(404).json({ error: "Conversa não encontrada" });
    if (req.user.role !== "gerente" && chat.vendedorId !== req.user.id) {
      return res.status(403).json({ error: "Sem acesso a essa conversa" });
    }
    // enquanto a IA está no comando, o VENDEDOR não vê (gestor acompanha)
    if (req.user.role !== "gerente" && chat.iaId && !chat.iaPausada) {
      return res.status(403).json({ error: "Conversa em atendimento automático" });
    }
    chat.naoLidas = 0;
    salvar();
    const v = chat.vendedorId ? db.users.find((u) => u.id === chat.vendedorId) : null;
    res.json({
      id: chat.id,
      numero: chat.numero,
      nome: chat.nome,
      origemDisparo: !!chat.origemDisparo,
      campanha: chat.campanha || "",
      vendedorId: chat.vendedorId || null,
      vendedorNome: v ? v.nome : "",
      temIA: !!chat.iaId,
      iaPausada: !!chat.iaPausada,
      mensagens: chat.mensagens || [],
      notas: chat.notas || [], // notas internas (transferências etc) — lead não vê
    });
  });

  /* enviar mensagem do vendedor/gerente nessa conversa */
  app.post("/api/oficial/chats/:id/send", auth, async (req, res) => {
    const chat = db.waChats[req.params.id];
    if (!chat || chat.canal !== "oficial") return res.status(404).json({ error: "Conversa não encontrada" });
    if (req.user.role !== "gerente" && chat.vendedorId !== req.user.id) {
      return res.status(403).json({ error: "Sem acesso a essa conversa" });
    }
    // enquanto a IA está atendendo, ninguém digita — precisa pausar a IA antes
    if (chat.iaId && !chat.iaPausada) {
      return res.status(409).json({ error: "Pause a IA para assumir esta conversa." });
    }
    const texto = String((req.body && req.body.texto) || "").trim();
    if (!texto) return res.status(400).json({ error: "Mensagem vazia" });
    const numeroCfg = acharNumero(chat.numeroOficialId);
    if (!numeroCfg) return res.status(400).json({ error: "Número de origem não encontrado" });
    try {
      await enviarTextoOficial(numeroCfg, chat.numero, texto);
      const ts = Date.now();
      chat.mensagens.push({ role: "me", content: texto, ts });
      if (chat.iaId && !chat.iaPausada) chat.iaPausada = true; // humano assumiu -> IA pausa sozinha
      if (chat.mensagens.length > 300) chat.mensagens = chat.mensagens.slice(-300);
      chat.atualizadoEm = ts;
      salvar();
      res.json({ ok: true });
    } catch (e) {
      // erro típico: janela de 24h fechada (precisa de template)
      res.status(400).json({ error: e.message });
    }
  });

  /* enviar mídia (áudio/imagem/vídeo/arquivo) numa conversa do oficial.
     Recebe o arquivo em base64; faz upload pro Meta e envia. */
  app.post("/api/oficial/chats/:id/midia", auth, async (req, res) => {
    const chat = db.waChats[req.params.id];
    if (!chat || chat.canal !== "oficial") return res.status(404).json({ error: "Conversa não encontrada" });
    if (req.user.role !== "gerente" && chat.vendedorId !== req.user.id) {
      return res.status(403).json({ error: "Sem acesso a essa conversa" });
    }
    if (chat.iaId && !chat.iaPausada) {
      return res.status(409).json({ error: "Pause a IA para assumir esta conversa." });
    }
    const b = req.body || {};
    const base64 = String(b.base64 || "");
    const mime = String(b.mime || "application/octet-stream");
    const filename = String(b.filename || "arquivo");
    const caption = String(b.caption || "").trim();
    if (!base64) return res.status(400).json({ error: "Arquivo vazio" });

    let buffer;
    try { buffer = Buffer.from(base64, "base64"); }
    catch (_) { return res.status(400).json({ error: "Arquivo inválido" }); }
    if (buffer.length > 16 * 1024 * 1024) return res.status(400).json({ error: "Arquivo passa de 16MB" });

    const numeroCfg = acharNumero(chat.numeroOficialId);
    if (!numeroCfg) return res.status(400).json({ error: "Número de origem não encontrado" });

    try {
      const tipo = tipoPorMime(mime);
      const mediaId = await uploadMidiaMeta(numeroCfg, buffer, mime, filename);
      await enviarMidiaOficial(numeroCfg, chat.numero, tipo, mediaId, caption, filename);
      const ts = Date.now();
      const rotulo = tipo === "image" ? "📷 Foto" : tipo === "audio" ? "🎤 Áudio" : tipo === "video" ? "🎬 Vídeo" : "📄 " + filename;
      chat.mensagens.push({ role: "me", content: caption ? rotulo + ": " + caption : rotulo, ts, midia: { tipo, mediaId, filename, mime } });
      if (chat.iaId && !chat.iaPausada) chat.iaPausada = true;
      if (chat.mensagens.length > 300) chat.mensagens = chat.mensagens.slice(-300);
      chat.atualizadoEm = ts;
      salvar();
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  /* reatribuir: gerente sempre; vendedor pode passar pra um colega.
     Grava uma NOTA interna visível a todos os colaboradores (o lead não vê). */
  app.post("/api/oficial/chats/:id/atribuir", auth, (req, res) => {
    const chat = db.waChats[req.params.id];
    if (!chat || chat.canal !== "oficial") return res.status(404).json({ error: "Conversa não encontrada" });
    // vendedor só pode reatribuir se a conversa for dele
    if (req.user.role !== "gerente" && chat.vendedorId !== req.user.id) {
      return res.status(403).json({ error: "Você só pode transferir conversas suas" });
    }
    const vendedorId = String((req.body && req.body.vendedorId) || "");
    const v = db.users.find((u) => u.id === vendedorId && u.role === "vendedor");
    if (!v) return res.status(400).json({ error: "Vendedor inválido" });

    const de = chat.vendedorNome || (chat.vendedorId ? "" : "ninguém");
    chat.vendedorId = v.id;
    chat.vendedorNome = v.nome;
    chat.atribuidoEm = Date.now();

    // nota interna de transferência
    if (!Array.isArray(chat.notas)) chat.notas = [];
    chat.notas.push({
      tipo: "transferencia",
      texto: `${req.user.nome} transferiu ${de ? "de " + de + " " : ""}para ${v.nome}`,
      ts: Date.now(),
      por: req.user.nome,
    });
    if (chat.notas.length > 100) chat.notas = chat.notas.slice(-100);
    salvar();
    res.json({ ok: true, vendedorId: v.id, vendedorNome: v.nome });
  });

  /* lista de vendedores pra reatribuição (qualquer colaborador logado pode ver) */
  app.get("/api/oficial/vendedores-lista", auth, (req, res) => {
    res.json(
      db.users
        .filter((u) => u.role === "vendedor" && u.ativo)
        .map((u) => ({ id: u.id, nome: u.nome, oficialAtivo: !!u.oficialAtivo }))
    );
  });

  /* encerrar atendimento (some da lista ativa do vendedor) */
  app.post("/api/oficial/chats/:id/encerrar", auth, (req, res) => {
    const chat = db.waChats[req.params.id];
    if (!chat || chat.canal !== "oficial") return res.status(404).json({ error: "Conversa não encontrada" });
    if (req.user.role !== "gerente" && chat.vendedorId !== req.user.id) {
      return res.status(403).json({ error: "Sem acesso a essa conversa" });
    }
    const encerrar = req.body && req.body.encerrar !== false; // default true
    chat.encerrado = !!encerrar;
    if (encerrar) {
      chat.encerradoEm = Date.now();
      if (!Array.isArray(chat.notas)) chat.notas = [];
      chat.notas.push({ tipo: "encerrado", texto: `${req.user.nome} encerrou o atendimento`, ts: Date.now(), por: req.user.nome });
    }
    salvar();
    res.json({ ok: true, encerrado: chat.encerrado });
  });

  /* diagnóstico: últimas chamadas recebidas no webhook + status de inscrição de cada WABA */
  app.get("/api/oficial/diagnostico", auth, gerenteOnly, async (req, res) => {
    const log = (db.oficial.webhookLog || []).slice(0, 20);
    const numeros = [];
    for (const n of db.oficial.numeros || []) {
      let inscrito = null, erro = null;
      if (n.wabaId && n.token) {
        try {
          const r = await fetch(`${GRAPH}/${n.wabaId}/subscribed_apps`, {
            headers: { Authorization: `Bearer ${n.token}` },
          });
          const data = await r.json().catch(() => ({}));
          if (r.ok) inscrito = (data.data || []).length > 0;
          else erro = (data.error && data.error.message) || "erro";
        } catch (e) { erro = e.message; }
      }
      numeros.push({ apelido: n.apelido, phoneNumberId: n.phoneNumberId, wabaId: n.wabaId, inscrito, erro });
    }
    res.json({ verifyToken: db.oficial.verifyToken, numeros, log });
  });

  /* limpar conversas de teste/órfãs (gerente) */
  app.post("/api/oficial/chats/limpar", auth, gerenteOnly, (req, res) => {
    const modo = String((req.body && req.body.modo) || "");
    let removidas = 0;
    for (const [id, chat] of Object.entries(db.waChats)) {
      if (chat.canal !== "oficial") continue;
      let apaga = false;
      if (modo === "todas") apaga = true;
      else if (modo === "sem_resposta") apaga = chat.origemDisparo && !chat.respondeu;
      else if (modo === "sem_dono") apaga = !chat.vendedorId;
      if (apaga) { delete db.waChats[id]; removidas++; }
    }
    salvar();
    res.json({ ok: true, removidas });
  });

  /* ============================================================
     WEBHOOK OFICIAL (Meta chama aqui)
     GET = verificação | POST = mensagens recebidas
     URL: /api/oficial/webhook
     ============================================================ */
  app.get("/api/oficial/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === db.oficial.verifyToken) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  });

  app.post("/api/oficial/webhook", (req, res) => {
    // responde 200 sempre e rápido (a Meta exige)
    res.sendStatus(200);
    try {
      const body = req.body || {};
      // === diagnóstico: guarda as últimas chamadas recebidas (pra depurar) ===
      if (!db.oficial.webhookLog) db.oficial.webhookLog = [];
      db.oficial.webhookLog.unshift({
        ts: Date.now(),
        object: body.object,
        resumo: (() => {
          try {
            const ch = body.entry && body.entry[0] && body.entry[0].changes && body.entry[0].changes[0];
            const val = (ch && ch.value) || {};
            const pid = (val.metadata && val.metadata.phone_number_id) || "?";
            const msgs = (val.messages || []).length;
            const statuses = (val.statuses || []).length;
            const from = val.messages && val.messages[0] && val.messages[0].from;
            return `phone_id=${pid} msgs=${msgs} status=${statuses}${from ? " from=" + from : ""}`;
          } catch (e) { return "erro ao resumir"; }
        })(),
      });
      if (db.oficial.webhookLog.length > 30) db.oficial.webhookLog = db.oficial.webhookLog.slice(0, 30);
      salvar();

      if (body.object !== "whatsapp_business_account") return;
      for (const entry of body.entry || []) {
        for (const ch of entry.changes || []) {
          const val = ch.value || {};
          const phoneNumberId = (val.metadata && val.metadata.phone_number_id) || "";
          // acha qual número do pool recebeu
          const numeroCfg = (db.oficial.numeros || []).find((n) => n.phoneNumberId === phoneNumberId);
          if (!numeroCfg) continue;

          // mapa de nomes (pushName) que a Meta manda em contacts
          const nomes = {};
          (val.contacts || []).forEach((c) => {
            if (c.wa_id) nomes[c.wa_id] = (c.profile && c.profile.name) || "";
          });

          for (const m of val.messages || []) {
            const telefone = m.from; // já vem com DDI
            const nome = nomes[telefone] || telefone;
            // tenta casar com uma conversa de disparo já existente (tolera 9º dígito)
            let chat = acharChatTolerante(numeroCfg.id, telefone);
            if (!chat) chat = acharOuCriarChat(numeroCfg.id, telefone, nome);
            if (nome && nome !== telefone) chat.nome = nome;

            // extrai o conteúdo por tipo
            let content = "";
            if (m.type === "text") content = (m.text && m.text.body) || "";
            else if (m.type === "button") content = (m.button && m.button.text) || "";
            else if (m.type === "interactive") {
              const it = m.interactive || {};
              content = (it.button_reply && it.button_reply.title) ||
                        (it.list_reply && it.list_reply.title) || "";
            }
            else if (m.type === "image") content = "📷 Foto" + ((m.image && m.image.caption) ? ": " + m.image.caption : "");
            else if (m.type === "audio") content = "🎤 Áudio";
            else if (m.type === "video") content = "🎬 Vídeo" + ((m.video && m.video.caption) ? ": " + m.video.caption : "");
            else if (m.type === "document") content = "📄 " + ((m.document && (m.document.filename || "Documento")) || "Documento");
            else content = "[" + m.type + "]";

            const ts = m.timestamp ? Number(m.timestamp) * 1000 : Date.now();
            chat.mensagens.push({ role: "them", content, ts });
            chat.ultimaMsgLeadId = m.id || null; // pro indicador "digitando"
            if (chat.mensagens.length > 300) chat.mensagens = chat.mensagens.slice(-300);
            chat.naoLidas = (chat.naoLidas || 0) + 1;
            chat.atualizadoEm = ts;

            // conta "responderam" na campanha (só a 1ª resposta de cada lead daquela campanha)
            if (chat.origemDisparo && chat.campanhaId && !chat.jaContouResposta) {
              chat.jaContouResposta = true;
              chat.respondeu = true;
              const camp = (db.oficial.campanhas || []).find((x) => x.id === chat.campanhaId);
              if (camp) camp.responderam = (camp.responderam || 0) + 1;
            } else if (chat.origemDisparo) {
              // garante que conversas de disparo fiquem visíveis ao vendedor após responder
              chat.respondeu = true;
            }

            // ===== IA por campanha OU distribuição pro vendedor =====
            const temIA = chat.iaId && !chat.iaPausada;
            if (temIA) {
              // responde de forma assíncrona (não trava o webhook; a Meta espera 200 rápido)
              rodarIA(chat, numeroCfg);
            } else if (!chat.vendedorId) {
              atribuirLead(chat);
            }
          }

          // ===== STATUS de entrega (delivered/read) das mensagens de disparo =====
          for (const st of val.statuses || []) {
            const mid = st.id;
            const campId = db.oficial.msgCampanha && db.oficial.msgCampanha[mid];
            if (!campId) continue;
            const camp = (db.oficial.campanhas || []).find((x) => x.id === campId);
            if (!camp) continue;
            // dedup: não conta o mesmo (mensagem + status) duas vezes
            if (!db.oficial.statusVistos) db.oficial.statusVistos = {};
            const chave = mid + ":" + st.status;
            if (db.oficial.statusVistos[chave]) continue;
            db.oficial.statusVistos[chave] = 1;

            if (st.status === "delivered") {
              camp.entregues = (camp.entregues || 0) + 1;
            } else if (st.status === "read") {
              camp.lidos = (camp.lidos || 0) + 1;
            } else if (st.status === "failed") {
              camp.falhas = (camp.falhas || 0) + 1;
              if (camp.enviados > 0) camp.enviados--;
            }
          }
        }
      }
      salvar();
    } catch (e) {
      console.error("Erro no webhook oficial:", e.message);
    }
  });

  /* expõe a config do webhook pro painel (URL + verify token) */
  app.get("/api/oficial/webhook-info", auth, gerenteOnly, (req, res) => {
    const base = String(req.query.base || "").replace(/\/+$/, "");
    res.json({
      url: base ? base + "/api/oficial/webhook" : "/api/oficial/webhook",
      verifyToken: db.oficial.verifyToken,
    });
  });

  console.log("✓ Canal Oficial (Cloud API) instalado");

  // devolve a função de init pro index chamar DEPOIS do loadDB()
  return { garantirEstrutura };
}
