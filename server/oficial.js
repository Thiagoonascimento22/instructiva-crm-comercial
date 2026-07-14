/* ============================================================
   CANAL OFICIAL (WhatsApp Cloud API / Meta) + DISTRIBUIÇÃO
   ------------------------------------------------------------
   Módulo isolado: recebe { app, db, saveDB, proximoId, auth,
   gerenteOnly } do index.js e registra suas próprias rotas.
   Não altera nada do fluxo Evolution já existente.
   ============================================================ */

const GRAPH = "https://graph.facebook.com/v21.0";

export function instalarCanalOficial({ app, getDb, saveDB, proximoId, auth, gerenteOnly, MEDIA_DIR, fs, path }) {
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
    // numeros: [{ id, apelido, numero, phoneNumberId, wabaId, token, vendedorId, ativo }]
    //   vendedorId: dono do número (vendedor). Quando setado, os leads que
    //   responderem caem DIRETO nele e ele pode disparar/criar templates nesse número.
    // token GLOBAL da Meta (mesma BM/conta da empresa) — cada número usa este token
    // se não tiver um token próprio. Assim não precisa colar o token em cada número.
    if (typeof db.oficial.tokenGlobal !== "string") db.oficial.tokenGlobal = "";
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
  // token efetivo do número: o próprio (se tiver) ou o token global da empresa
  function tokenDe(n) {
    return (n && n.token) || (db.oficial && db.oficial.tokenGlobal) || "";
  }
  function numeroPublico(n) {
    const dono = n.vendedorId ? (db.users || []).find((u) => u.id === n.vendedorId) : null;
    return {
      id: n.id, apelido: n.apelido, numero: n.numero,
      phoneNumberId: n.phoneNumberId, wabaId: n.wabaId, ativo: n.ativo,
      temToken: !!tokenDe(n),
      vendedorId: n.vendedorId || null,
      vendedorNome: dono ? dono.nome : "",
    };
  }
  // número que o usuário logado pode ver/usar:
  //  - gerente: qualquer número
  //  - vendedor: só os números vinculados a ele (n.vendedorId === user.id)
  function numeroPermitido(req, id) {
    const n = acharNumero(id);
    if (!n) return null;
    if (req.user.role === "gerente") return n;
    if (req.user.role === "vendedor" && n.vendedorId === req.user.id) return n;
    return null;
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
    // MODELO "1 número por vendedor": se o número tem dono, o lead vai DIRETO pra ele
    const numeroCfg = acharNumero(chat.numeroOficialId);
    if (numeroCfg && numeroCfg.vendedorId) {
      const dono = db.users.find(
        (u) => u.id === numeroCfg.vendedorId && u.role === "vendedor" && u.ativo
      );
      if (dono) {
        chat.vendedorId = dono.id;
        chat.vendedorNome = dono.nome;
        chat.atribuidoEm = Date.now();
        dono.oficialLeadsRecebidos = (dono.oficialLeadsRecebidos || 0) + 1;
        return dono.id;
      }
    }
    // número sem dono (pool antigo) -> cai na distribuição ponderada de sempre
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
        Authorization: "Bearer " + tokenDe(numeroCfg),
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
      headers: { Authorization: "Bearer " + tokenDe(numeroCfg) },
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

  // extensão a partir do mime (pra salvar com nome certo)
  function extPorMime(mime) {
    const map = {
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
      "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/amr": "amr", "audio/wav": "wav",
      "video/mp4": "mp4", "video/3gpp": "3gp",
      "application/pdf": "pdf",
    };
    return map[String(mime || "").toLowerCase().split(";")[0]] || "bin";
  }

  // baixa a mídia recebida do Meta (2 passos: pega a URL pelo id, depois baixa os bytes)
  async function baixarMidiaMeta(numeroCfg, mediaId) {
    if (!MEDIA_DIR || !fs || !path || !mediaId) return null;
    try {
      // passo 1: pega a URL temporária do arquivo
      const r1 = await fetch(`${GRAPH}/${mediaId}`, {
        headers: { Authorization: "Bearer " + tokenDe(numeroCfg) },
      });
      if (!r1.ok) return null;
      const meta = await r1.json();
      if (!meta || !meta.url) return null;
      // passo 2: baixa os bytes (precisa do token também)
      const r2 = await fetch(meta.url, {
        headers: { Authorization: "Bearer " + tokenDe(numeroCfg) },
      });
      if (!r2.ok) return null;
      const ab = await r2.arrayBuffer();
      const buf = Buffer.from(ab);
      const mime = meta.mime_type || "application/octet-stream";
      const ext = extPorMime(mime);
      const fname = "of_" + mediaId + "." + ext;
      fs.writeFileSync(path.join(MEDIA_DIR, fname), buf);
      return { arquivo: fname, mimetype: mime, buffer: buf, tamanho: buf.length };
    } catch (e) {
      console.log("[oficial] erro ao baixar mídia:", e.message);
      return null;
    }
  }

  // transcreve áudio com Groq Whisper (pra IA "ouvir"); retorna o texto ou null
  async function transcreverAudio(buffer, mimetype) {
    const key = process.env.GROQ_API_KEY;
    if (!key || !buffer) return null;
    try {
      const ext = extPorMime(mimetype) || "ogg";
      const fd = new FormData();
      const blob = new Blob([buffer], { type: mimetype || "audio/ogg" });
      fd.append("file", blob, "audio." + ext);
      fd.append("model", "whisper-large-v3-turbo");
      fd.append("language", "pt");
      fd.append("response_format", "text");
      const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: "Bearer " + key },
        body: fd,
      });
      if (!r.ok) {
        console.log("[oficial] Groq transcrição falhou:", r.status);
        return null;
      }
      const txt = await r.text();
      return (txt || "").trim() || null;
    } catch (e) {
      console.log("[oficial] erro ao transcrever:", e.message);
      return null;
    }
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
  app.get("/api/oficial/numeros", auth, (req, res) => {
    let lista = db.oficial.numeros || [];
    // vendedor só enxerga os números vinculados a ele
    if (req.user.role !== "gerente") {
      lista = lista.filter((n) => n.vendedorId === req.user.id);
    }
    res.json(lista.map(numeroPublico));
  });

  /* ---- TOKEN GLOBAL da Meta (mesma BM da empresa) — só gerente ---- */
  // devolve só se está definido (nunca devolve o token em si)
  app.get("/api/oficial/token-global", auth, gerenteOnly, (req, res) => {
    res.json({ definido: !!db.oficial.tokenGlobal });
  });
  app.post("/api/oficial/token-global", auth, gerenteOnly, async (req, res) => {
    const t = String((req.body && req.body.token) || "").trim();
    if (!t) return res.status(400).json({ error: "Cole o token permanente da Meta" });
    db.oficial.tokenGlobal = t;
    salvar();
    // com o token novo, re-assina todas as WABAs no webhook (silencioso)
    for (const n of db.oficial.numeros || []) { try { await assinarWebhook(n); } catch (_) {} }
    res.json({ ok: true, definido: true });
  });

  /* assina a WABA no webhook (silencioso, não quebra se falhar) */
  async function assinarWebhook(n) {
    if (!n || !n.wabaId || !tokenDe(n)) return false;
    try {
      const r = await fetch(`${GRAPH}/${n.wabaId}/subscribed_apps`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenDe(n)}`, "Content-Type": "application/json" },
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
    const vendedorId = String(b.vendedorId || "").trim() || null;
    if (!apelido || !phoneNumberId) {
      return res.status(400).json({ error: "Informe apelido e Phone Number ID" });
    }
    // token pode vir vazio SE já houver token global configurado
    if (!token && !db.oficial.tokenGlobal) {
      return res.status(400).json({ error: "Configure o Token da Meta (botão no topo) ou informe um token para este número" });
    }
    if (vendedorId && !db.users.some((u) => u.id === vendedorId && u.role === "vendedor")) {
      return res.status(400).json({ error: "Vendedor inválido" });
    }
    const novo = {
      id: proximoId("num"),
      apelido, numero, phoneNumberId, wabaId, token,
      vendedorId,
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
    if (b.vendedorId !== undefined) {
      const vid = String(b.vendedorId || "").trim() || null;
      if (vid && !db.users.some((u) => u.id === vid && u.role === "vendedor")) {
        return res.status(400).json({ error: "Vendedor inválido" });
      }
      n.vendedorId = vid;
    }
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
    if (!tokenDe(n)) return res.status(400).json({ error: "Sem token: configure o Token da Meta (topo) ou o token deste número" });
    try {
      const r = await fetch(`${GRAPH}/${n.wabaId}/subscribed_apps`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenDe(n)}`, "Content-Type": "application/json" },
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
    if (!tokenDe(n)) return res.status(400).json({ error: "Sem token: configure o Token da Meta (topo) ou o token deste número" });
    try {
      const r = await fetch(`${GRAPH}/${n.phoneNumberId}/register`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenDe(n)}`, "Content-Type": "application/json" },
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
  app.get("/api/oficial/numeros/:id/templates", auth, async (req, res) => {
    const n = numeroPermitido(req, req.params.id);
    if (!n) return res.status(404).json({ error: "Número não encontrado" });
    if (!n.wabaId) return res.status(400).json({ error: "Esse número não tem WABA ID configurado" });
    try {
      const r = await fetch(
        `${GRAPH}/${n.wabaId}/message_templates?fields=name,status,category,language,components&limit=100`,
        { headers: { Authorization: "Bearer " + tokenDe(n) } }
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
  app.post("/api/oficial/numeros/:id/templates", auth, async (req, res) => {
    const n = numeroPermitido(req, req.params.id);
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
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + tokenDe(n) },
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
      P.push(`\nIMPORTANTE — VOCÊ QUALIFICA E PASSA PRA UM HUMANO DE FORMA INVISÍVEL:`);
      if (c.escQuando) P.push(`Passe para um vendedor humano quando: ${c.escQuando}`);
      else P.push(`Passe para um vendedor humano ASSIM QUE o lead demonstrar QUALQUER interesse num curso (ex.: "tenho interesse", "quero saber sobre o curso X", "quero o curso", "me interessa"). Não fique fazendo muitas perguntas nem tente vender — o seu papel é só identificar o interesse e passar. No máximo uma pergunta rápida, e se ele confirmar interesse, passe na hora.`);
      P.push(`\nSINAIS DE INTERESSE QUE OBRIGAM A PASSAR JÁ (não espere ele dizer "quero comprar"): pergunta sobre preço/valor; pergunta sobre forma de pagamento, parcelas, cartão, boleto ou PIX; pergunta como faz pra entrar/se matricular; diz que vai pensar mas demonstra que quer; pede o link; diz que tem interesse; pergunta sobre o conteúdo do curso com intenção de fazer; ou qualquer pergunta que mostre que ele está considerando adquirir. Em TODOS esses casos, dê uma resposta calorosa curta E passe (coloque a tag no final). NÃO continue conduzindo sozinha, NÃO tente fechar você mesma, NÃO fique dando voltas — o vendedor humano assume daqui.`);
      P.push(`REGRA CRÍTICA DA PASSAGEM: NUNCA diga que vai passar, transferir, encaminhar, chamar outra pessoa, um especialista, um vendedor ou a equipe. O lead NÃO PODE perceber que houve troca de atendente. Sua última mensagem deve ser uma resposta NATURAL que dá continuidade à conversa (ex.: uma pergunta sobre o que ele procura, ou uma confirmação calorosa), como se VOCÊ mesma fosse continuar atendendo. ${c.escFrase ? 'Pode usar algo como: "' + c.escFrase + '"' : 'Exemplos bons: "Perfeito! Me conta, você já tem alguma experiência na área ou tá começando agora?" ou "Que ótimo! 😊 Esse curso é super completo. Posso te explicar como funciona a matrícula?"'}`);
      P.push(`Depois dessa mensagem natural, coloque a tag [PASSAR_HUMANO] no FINAL (o sistema detecta e transfere por trás, sem o lead ver). A tag nunca aparece pro lead.`);
    } else {
      P.push(`\nVocê conduz a venda sozinho(a) até o fechamento, mandando o link de pagamento quando o lead quiser comprar. Não invente que vai passar pra outra pessoa.`);
    }
    if (c.encerrarCriterios) P.push(`\nEncerre/pare de insistir quando: ${c.encerrarCriterios}`);

    P.push(`\nREGRAS GERAIS: Responda como mensagem de WhatsApp (curto, natural, humano). Uma ideia por mensagem. Nunca diga que é uma IA ou robô. Nunca invente preços, links ou informações que não estão acima.`);
    P.push(`\nNOME DO LEAD — REGRA CRÍTICA: só use o nome do lead se ele REALMENTE disse o nome dele nesta conversa. Se ele ainda não disse o nome, NÃO invente, NÃO chute, NÃO use nenhum nome — fale sem nome. NUNCA use nomes de exemplo. Se não tem certeza do nome, não use nome nenhum. Usar um nome errado é um erro grave.`);
    P.push(`\nEMOJIS PROIBIDOS (NUNCA use, em hipótese nenhuma): 🚀 🔥 💪 💯 😎 🤩 ❤️ 👏 ⚡. Use no máximo emojis simples e calorosos como 🙂 😊 👍, e só de vez em quando — nunca em toda mensagem.`);
    P.push(`\nSE O LEAD MANDAR FIGURINHA/STICKER (aparece como "[sticker]"), GIF ou reação: NÃO diga que "adorou o sticker" nem comente a figurinha como se a tivesse visto (você não vê o conteúdo dela). Apenas responda de forma leve e natural dando continuidade à conversa (ex.: "Hahah 😊" ou retome o assunto de antes). Não invente que viu imagem, figurinha ou vídeo.`);
    P.push(`\nNÃO encerre a conversa cedo demais nem fique se despedindo ("tenha um ótimo dia", "até a próxima") enquanto houver qualquer chance de interesse. Só se despeça se o lead claramente encerrar ou pedir pra parar.`);
    P.push(`\n⚡ LEAD QUE JÁ CHEGA QUENTE — REGRA PRIORITÁRIA: se o lead PEDIR O LINK ("manda o link", "quero o link"), disser que QUER COMPRAR ("quero comprar", "quero fechar", "como pago", "quero me inscrever") ou pedir o preço direto, você ATENDE NA HORA o que ele pediu. NÃO fique perguntando se ele viu as aulas, NÃO enrole com conversa de qualificação, NÃO adie. Mande o link / responda o preço / conduza o pagamento IMEDIATAMENTE, de forma calorosa e curta. A conversa de "criar conexão" é só pra lead que chega frio ou curioso — quem já chega pedindo pra comprar, você vai direto ao ponto e fecha. Fazer o lead quente esperar é o pior erro que você pode cometer.`);
    return P.join("\n");
  }

  // chama a API da Anthropic e devolve o texto da resposta
  async function chamarClaude(systemPrompt, historico) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY não configurada");
    // monta as mensagens no formato da OpenAI (system + histórico)
    const msgsHist = historico.map((m) => ({
      role: m.role === "them" ? "user" : "assistant",
      // se for áudio do lead, usa a transcrição (a IA "ouve" o áudio)
      content: (m.role === "them" && m.transcricao) ? m.transcricao : (m.content || ""),
    })).filter((m) => m.content);
    // garante que começa com user
    while (msgsHist.length && msgsHist[0].role !== "user") msgsHist.shift();
    if (!msgsHist.length) return "";
    const messages = [{ role: "system", content: systemPrompt }, ...msgsHist];
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + key,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 1024,
        messages,
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((data.error && data.error.message) || "Erro OpenAI " + r.status);
    const txt = ((data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "").trim();
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

      // REFORÇO (modo qualifica): se o lead deu sinal claro de compra e a IA não passou sozinha,
      // o sistema força a passagem pro vendedor humano (GPT-4o-mini às vezes esquece a tag)
      if (!passar && ia.modo === "qualifica") {
        const ultLead = [...(chat.mensagens || [])].reverse().find((m) => m.role === "them");
        const txtLead = ((ultLead && (ultLead.transcricao || ultLead.content)) || "").toLowerCase();
        const sinaisCompra = [
          "quero comprar", "quero o curso", "vou comprar", "como pago", "como faço pra pagar",
          "forma de pagamento", "formas de pagamento", "parcel", "cartão", "cartao", "boleto",
          "pix", "no débito", "debito", "à vista", "a vista", "quanto custa", "qual o valor",
          "qual valor", "preço", "preco", "me manda o link", "manda o link", "quero entrar",
          "quero me inscrever", "quero fazer", "tenho interesse", "me interessei", "fechar",
          "dinheiro", "pode dividir", "quantas vezes",
        ];
        if (sinaisCompra.some((s) => txtLead.includes(s))) passar = true;
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

  // duplica uma IA existente (copia toda a base, só muda o nome)
  app.post("/api/oficial/ias/:id/duplicar", auth, gerenteOnly, (req, res) => {
    const orig = (db.oficial.ias || []).find((x) => x.id === req.params.id);
    if (!orig) return res.status(404).json({ error: "IA não encontrada" });
    const b = req.body || {};
    const novoNome = String(b.nome || (orig.nome + " (cópia)")).trim().slice(0, 80);
    const copia = {
      id: proximoId("ia"),
      nome: novoNome,
      ativa: orig.ativa !== false,
      modo: orig.modo,
      // cópia profunda da config e do conhecimento (mesma base, nome diferente)
      config: JSON.parse(JSON.stringify(orig.config || {})),
      conhecimento: JSON.parse(JSON.stringify(orig.conhecimento || {})),
      criadoEm: Date.now(),
    };
    db.oficial.ias.unshift(copia);
    salvar();
    res.json(iaPublica(copia));
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

  // quantos leads estão esperando resposta da IA (última msg foi do lead, IA ativa)
  function chatsPendentesIA() {
    return Object.values(db.waChats).filter((chat) => {
      if (chat.canal !== "oficial") return false;
      if (!chat.iaId || chat.iaPausada) return false;       // IA precisa estar ativa nessa conversa
      if (db.oficial.iaGlobalAtiva === false) return false;  // IA geral ligada
      const msgs = chat.mensagens || [];
      if (!msgs.length) return false;
      // última mensagem foi do lead (them) = está esperando resposta
      const ult = msgs[msgs.length - 1];
      return ult && ult.role === "them";
    });
  }

  app.get("/api/oficial/ia-pendentes", auth, gerenteOnly, (req, res) => {
    res.json({ total: chatsPendentesIA().length });
  });

  // dispara a IA pra TODOS os leads pendentes (ex: depois que o crédito acabou e voltou)
  app.post("/api/oficial/ia-responder-pendentes", auth, gerenteOnly, async (req, res) => {
    const pendentes = chatsPendentesIA();
    res.json({ ok: true, total: pendentes.length, mensagem: pendentes.length + " conversa(s) sendo respondida(s) pela IA" });
    // processa em segundo plano, com pausa entre cada (não trava e não estoura rate limit)
    (async () => {
      let respondidos = 0, semNumero = 0;
      for (const chat of pendentes) {
        try {
          // o número do chat fica em numeroOficialId (fallback p/ numeroId por garantia)
          const numeroCfg = acharNumero(chat.numeroOficialId) || acharNumero(chat.numeroId);
          if (!numeroCfg) { semNumero++; continue; }
          await rodarIA(chat, numeroCfg);
          respondidos++;
          salvar();
          await new Promise((r) => setTimeout(r, 1500)); // respira entre uma e outra
        } catch (e) {
          console.error("Erro ao responder pendente:", e.message);
        }
      }
      console.log(`[oficial] IA pendentes: ${respondidos} respondidos, ${semNumero} sem número (de ${pendentes.length})`);
    })();
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

  // pausar a IA em TODAS as conversas que já existem agora (de uma vez).
  // Útil antes de um disparo novo: as conversas antigas ficam congeladas
  // (a IA não responde mais nelas), mas as NOVAS conversas do disparo
  // continuam com a IA respondendo normalmente.
  app.post("/api/oficial/chats/pausar-todas-atuais", auth, gerenteOnly, (req, res) => {
    let total = 0;
    for (const chat of Object.values(db.waChats || {})) {
      if (!chat || chat.canal !== "oficial") continue;
      if (chat.iaPausada) continue; // já estava pausada, pula
      chat.iaPausada = true;
      total++;
      if (!Array.isArray(chat.notas)) chat.notas = [];
      chat.notas.push({
        tipo: "ia_pausada",
        texto: `${req.user.nome} pausou a IA em massa (antes de novo disparo)`,
        ts: Date.now(), por: req.user.nome,
      });
      if (chat.notas.length > 100) chat.notas = chat.notas.slice(-100);
    }
    salvar();
    res.json({ ok: true, pausadas: total });
  });

  // EXPORTAR a base de conhecimento de uma IA (backup do treinamento).
  // Baixa um arquivo .json com toda a configuração da agente (persona,
  // cursos, objeções, FAQ, playbook, escalação). Serve de backup e pra
  // recriar a IA depois se precisar. Token via query pra funcionar no download.
  app.get("/api/oficial/ias/:id/exportar", (req, res) => {
    const t = String(req.query.token || (req.headers.authorization || "").replace("Bearer ", "")).trim();
    const user = (db.users || []).find((u) => u.token && u.token === t);
    if (!user || !user.ativo || user.role !== "gerente") {
      return res.status(401).send("Não autorizado");
    }
    const ia = (db.oficial.ias || []).find((x) => x.id === req.params.id);
    if (!ia) return res.status(404).send("IA não encontrada");
    const exportData = {
      _tipo: "base-conhecimento-instructiva",
      _versao: 1,
      _exportadoEm: new Date().toISOString(),
      nome: ia.nome,
      modo: ia.modo,
      config: ia.config || {},
    };
    const nomeArq = "base-conhecimento-" + String(ia.nome || "ia").toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".json";
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="' + nomeArq + '"');
    res.send(JSON.stringify(exportData, null, 2));
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




  app.post("/api/oficial/disparar", auth, async (req, res) => {
    const b = req.body || {};
    const numeroCfg = numeroPermitido(req, b.numeroId);
    if (!numeroCfg) return res.status(400).json({ error: "Escolha um número válido (ou você não tem acesso a ele)" });
    if (!numeroCfg.ativo) return res.status(400).json({ error: "Esse número está inativo" });
    const templateName = String(b.template || "").trim();
    if (!templateName) return res.status(400).json({ error: "Escolha um template" });
    const idioma = String(b.idioma || "pt_BR").trim();
    const contatos = Array.isArray(b.contatos) ? b.contatos : [];
    if (contatos.length === 0) return res.status(400).json({ error: "Nenhum contato na lista" });
    if (contatos.length > 5000) return res.status(400).json({ error: "Máximo de 5000 por disparo" });

    // IA opcional pra essa campanha (só o gerente pode acoplar IA; vendedor dispara "puro")
    const iaId = req.user.role === "gerente" ? String(b.iaId || "").trim() : "";
    const iaCampanha = iaId ? (db.oficial.ias || []).find((x) => x.id === iaId && x.ativa) : null;
    if (iaId && !iaCampanha) return res.status(400).json({ error: "IA selecionada não existe ou está pausada" });

    const campanha = {
      id: proximoId("camp"),
      nome: String(b.nomeCampanha || templateName).trim(),
      numeroId: numeroCfg.id,
      criadoPor: req.user.id,        // quem disparou (pro vendedor ver só as dele)
      criadoPorNome: req.user.nome,
      template: templateName,
      idioma,
      iaId: iaCampanha ? iaCampanha.id : null,
      iaNome: iaCampanha ? iaCampanha.nome : null,
      enviados: 0,    // aceitos pela Meta (sent)
      entregues: 0,   // delivered (via webhook de status)
      lidos: 0,       // read (via webhook de status)
      responderam: 0, // leads que mandaram msg de volta
      falhas: 0,
      total: contatos.length,
      // fila salva no banco: lista de quem ainda falta enviar (sobrevive a reinício)
      pendentes: contatos.map((c) => ({ telefone: c.telefone, nome: c.nome || "", variaveis: c.variaveis || [] })),
      status: "rodando", // rodando | concluida | parada
      criadoEm: Date.now(),
    };
    db.oficial.campanhas.unshift(campanha);
    salvar();

    // responde já e dispara em background (não trava a tela)
    res.json({ ok: true, campanhaId: campanha.id, total: contatos.length });

    // OPÇÃO "pular quem já recebeu": remove da fila quem já recebeu esse disparo nesse número
    const pularRecebidos = b.pularRecebidos === true;
    if (pularRecebidos) {
      const jaReceberam = new Set();
      for (const ch of Object.values(db.waChats || {})) {
        if (ch && ch.canal === "oficial" && ch.numeroOficialId === numeroCfg.id && ch.origemDisparo) {
          const tel = normalizaTelefone(ch.numero);
          if (tel && (ch.mensagens || []).some((m) => m.role === "me" && m.template)) jaReceberam.add(tel);
        }
      }
      const antes = campanha.pendentes.length;
      campanha.pendentes = campanha.pendentes.filter((c) => {
        const tel = normalizaTelefone(c.telefone);
        return tel && !jaReceberam.has(tel);
      });
      campanha.total = campanha.pendentes.length;
      console.log(`[oficial] ${campanha.nome}: ${antes - campanha.pendentes.length} pulados (já receberam)`);
      salvar();
    }

    // processa a fila salva (sobrevive a reinício -> dá pra retomar)
    processarFilaCampanha(campanha.id, numeroCfg);
  });

  // ---- processa os pendentes de uma campanha (consome a fila salva no banco) ----
  // Como vai removendo cada contato da lista 'pendentes' conforme envia e salva,
  // se o servidor reiniciar no meio, os que sobraram continuam no banco e dá pra retomar.
  async function processarFilaCampanha(campanhaId, numeroCfg) {
    const campanha = (db.oficial.campanhas || []).find((x) => x.id === campanhaId);
    if (!campanha) return;
    if (campanha._rodando) return; // evita rodar a mesma fila duas vezes ao mesmo tempo
    campanha._rodando = true;
    campanha.status = "rodando";
    const templateName = campanha.template;
    const idioma = campanha.idioma || "pt_BR";

    while (campanha.pendentes && campanha.pendentes.length > 0) {
      const c = campanha.pendentes[0]; // pega o primeiro
      const telefone = normalizaTelefone(c.telefone);
      if (!telefone) {
        campanha.falhas++;
        campanha.pendentes.shift();
        salvar();
        continue;
      }
      const nome = (c.nome || "").trim() || telefone;
      try {
        const resp = await enviarTemplate(numeroCfg, telefone, templateName, idioma, c.variaveis || []);
        campanha.enviados++;
        const mid = resp && resp.messages && resp.messages[0] && resp.messages[0].id;
        if (mid) {
          if (!db.oficial.msgCampanha) db.oficial.msgCampanha = {};
          db.oficial.msgCampanha[mid] = campanha.id;
        }
        const chat = acharOuCriarChat(numeroCfg.id, telefone, nome);
        chat.origemDisparo = true;
        chat.campanha = campanha.nome;
        chat.campanhaId = campanha.id;
        chat.iaId = campanha.iaId || null;
        chat.iaPausada = false;
        if (chat.respondeu === undefined) chat.respondeu = false;
        const ts = Date.now();
        chat.mensagens.push({ role: "me", content: `[disparo] ${templateName}`, ts, template: true });
        chat.atualizadoEm = ts;
      } catch (e) {
        campanha.falhas++;
        campanha.ultimoErro = (e && e.message) || String(e);
        campanha.ultimoErroEm = Date.now();
        console.error("Falha disparo p/", telefone, ":", e.message);
      }
      campanha.pendentes.shift(); // remove o que acabou de processar (enviado ou falho)
      salvar();
      await new Promise((r) => setTimeout(r, 120)); // ritmo pra proteger o número
    }
    campanha.status = "concluida";
    campanha._rodando = false;
    delete campanha.pendentes; // limpa a fila vazia
    console.log(`Campanha ${campanha.nome}: ${campanha.enviados} enviados, ${campanha.falhas} falhas — concluída`);
    salvar();
  }

  /* retomar uma campanha que parou no meio (ex: servidor reiniciou) */
  app.post("/api/oficial/campanhas/:id/retomar", auth, (req, res) => {
    const campanha = (db.oficial.campanhas || []).find((x) => x.id === req.params.id);
    if (!campanha) return res.status(404).json({ error: "Campanha não encontrada" });
    if (!campanhaDoUsuario(req, campanha)) return res.status(403).json({ error: "Essa campanha não é sua" });
    if (!campanha.pendentes || campanha.pendentes.length === 0) {
      return res.status(400).json({ error: "Essa campanha não tem envios pendentes (já terminou)" });
    }
    const numeroCfg = acharNumero(campanha.numeroId);
    if (!numeroCfg) return res.status(400).json({ error: "Número da campanha não encontrado" });
    if (!numeroCfg.ativo) return res.status(400).json({ error: "O número dessa campanha está inativo" });
    const faltam = campanha.pendentes.length;
    processarFilaCampanha(campanha.id, numeroCfg); // continua de onde parou
    res.json({ ok: true, faltam, mensagem: `Retomando: ${faltam} envio(s) pendente(s)` });
  });

  /* RE-DISPARAR: reenvia o template pra quem recebeu essa campanha mas NÃO respondeu.
     Reconstrói a lista a partir das conversas salvas (não precisa colar nada de novo). */
  app.post("/api/oficial/campanhas/:id/redisparar", auth, (req, res) => {
    const campanha = (db.oficial.campanhas || []).find((x) => x.id === req.params.id);
    if (!campanha) return res.status(404).json({ error: "Campanha não encontrada" });
    if (!campanhaDoUsuario(req, campanha)) return res.status(403).json({ error: "Essa campanha não é sua" });
    const numeroCfg = acharNumero(campanha.numeroId);
    if (!numeroCfg) return res.status(400).json({ error: "Número da campanha não encontrado" });
    if (!numeroCfg.ativo) return res.status(400).json({ error: "O número dessa campanha está inativo" });

    // reconstrói a lista: todos os chats dessa campanha que NÃO responderam
    const alvo = [];
    for (const ch of Object.values(db.waChats || {})) {
      if (ch && ch.canal === "oficial" && ch.campanhaId === campanha.id && !ch.respondeu) {
        const tel = normalizaTelefone(ch.numero);
        if (tel) alvo.push({ telefone: tel, nome: ch.nome || "", variaveis: [] });
      }
    }
    if (alvo.length === 0) {
      return res.status(400).json({ error: "Ninguém pra re-disparar (todos já responderam ou não há registros)" });
    }

    // cria a fila de pendentes na própria campanha e processa (com retomar automático)
    campanha.pendentes = alvo;
    campanha.total = (campanha.total || 0) + alvo.length;
    campanha.status = "rodando";
    salvar();
    processarFilaCampanha(campanha.id, numeroCfg);
    res.json({ ok: true, total: alvo.length, mensagem: `Re-disparando pra ${alvo.length} contato(s) que não responderam` });
  });

  /* EXPORTAR: baixa um .txt com TODOS os números que já receberam algum disparo
     (de todas as campanhas). Serve pra cruzar com a planilha e achar quem falta.
     Aceita token via query (?token=) porque é aberto via window.open (sem header). */
  app.get("/api/oficial/export-recebidos", (req, res) => {
    const t = String(req.query.token || (req.headers.authorization || "").replace("Bearer ", "")).trim();
    const user = (db.users || []).find((u) => u.token && u.token === t);
    if (!user || !user.ativo || user.role !== "gerente") {
      return res.status(401).send("Não autorizado");
    }
    const recebidos = new Set();
    for (const ch of Object.values(db.waChats || {})) {
      if (ch && ch.canal === "oficial" && ch.origemDisparo) {
        const tel = normalizaTelefone(ch.numero);
        if (tel) recebidos.add(tel);
      }
    }
    const linhas = Array.from(recebidos).join("\n");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="ja_receberam.txt"');
    res.send(linhas);
  });

  /* histórico de campanhas */
  // um vendedor só pode mexer numa campanha que é dele (criou) OU que saiu do número dele
  function campanhaDoUsuario(req, campanha) {
    if (req.user.role === "gerente") return true;
    if (campanha.criadoPor === req.user.id) return true;
    const n = acharNumero(campanha.numeroId);
    return !!(n && n.vendedorId === req.user.id);
  }
  app.get("/api/oficial/campanhas", auth, (req, res) => {
    let campanhas = db.oficial.campanhas || [];
    if (req.user.role !== "gerente") {
      campanhas = campanhas.filter((c) => campanhaDoUsuario(req, c));
    }
    // não manda a lista enorme de pendentes pro front — só a contagem, pra mostrar o botão Retomar
    const lista = campanhas.slice(0, 50).map((c) => {
      const { pendentes, _rodando, ...resto } = c;
      return { ...resto, pendentes: pendentes && pendentes.length ? pendentes.length : 0, rodando: !!_rodando };
    });
    res.json(lista);
  });

  /* recalcula "responderam" de todas as campanhas com base nas conversas atuais.
     Conserta campanhas antigas onde a resposta caiu numa conversa separada. */
  app.post("/api/oficial/campanhas/recontar", auth, (req, res) => {
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
  app.delete("/api/oficial/campanhas/:id", auth, (req, res) => {
    const i = (db.oficial.campanhas || []).findIndex((c) => c.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: "Campanha não encontrada" });
    const camp = db.oficial.campanhas[i];
    if (!campanhaDoUsuario(req, camp)) return res.status(403).json({ error: "Essa campanha não é sua" });
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

  /* serve a mídia recebida do lead (foto, áudio, vídeo, documento) pro frontend */
  app.get("/api/oficial/chats/:id/midia/:mid", auth, (req, res) => {
    if (!MEDIA_DIR || !fs || !path) return res.status(404).end();
    const db = getDb();
    const chat = db.waChats[req.params.id];
    if (!chat || chat.canal !== "oficial") return res.status(404).json({ error: "Conversa não encontrada" });
    const m = (chat.mensagens || []).find((x) => x.mid === req.params.mid);
    if (!m || !m.arquivo) return res.status(404).json({ error: "Mídia não encontrada" });
    const fp = path.join(MEDIA_DIR, m.arquivo);
    if (!fs.existsSync(fp)) return res.status(404).json({ error: "Arquivo não encontrado" });
    res.setHeader("Content-Type", m.mimetype || "application/octet-stream");
    res.setHeader("Cache-Control", "private, max-age=86400");
    if (m.tipo === "document" && m.filename)
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(m.filename)}"`);
    fs.createReadStream(fp).pipe(res);
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
      if (n.wabaId && tokenDe(n)) {
        try {
          const r = await fetch(`${GRAPH}/${n.wabaId}/subscribed_apps`, {
            headers: { Authorization: `Bearer ${tokenDe(n)}` },
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

  app.post("/api/oficial/webhook", async (req, res) => {
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
            let midiaTipo = "text";   // text | image | audio | video | document
            let midiaArquivo = null;  // nome do arquivo salvo no volume
            let midiaMime = null;
            let midiaFilename = null; // nome original (documentos)
            let transcricao = null;   // texto do áudio (pra IA e pra exibir)
            let mediaIdMeta = null;

            if (m.type === "text") content = (m.text && m.text.body) || "";
            else if (m.type === "button") content = (m.button && m.button.text) || "";
            else if (m.type === "interactive") {
              const it = m.interactive || {};
              content = (it.button_reply && it.button_reply.title) ||
                        (it.list_reply && it.list_reply.title) || "";
            }
            else if (m.type === "image") {
              content = (m.image && m.image.caption) ? m.image.caption : "📷 Foto";
              midiaTipo = "image"; mediaIdMeta = m.image && m.image.id;
            }
            else if (m.type === "audio") {
              content = "🎤 Áudio";
              midiaTipo = "audio"; mediaIdMeta = m.audio && m.audio.id;
            }
            else if (m.type === "video") {
              content = (m.video && m.video.caption) ? m.video.caption : "🎬 Vídeo";
              midiaTipo = "video"; mediaIdMeta = m.video && m.video.id;
            }
            else if (m.type === "document") {
              midiaFilename = (m.document && m.document.filename) || "Documento";
              content = "📄 " + midiaFilename;
              midiaTipo = "document"; mediaIdMeta = m.document && m.document.id;
            }
            else if (m.type === "sticker") content = "[figurinha]";
            else content = "[" + m.type + "]";

            // baixa o arquivo de mídia (foto, áudio, vídeo, documento) pro volume
            if (mediaIdMeta && midiaTipo !== "text") {
              try {
                const baixado = await baixarMidiaMeta(numeroCfg, mediaIdMeta);
                if (baixado) {
                  midiaArquivo = baixado.arquivo;
                  midiaMime = baixado.mimetype;
                  // áudio -> transcreve pra IA "ouvir" e pra exibir
                  if (midiaTipo === "audio") {
                    transcricao = await transcreverAudio(baixado.buffer, baixado.mimetype);
                  }
                }
              } catch (_) {}
            }

            const ts = m.timestamp ? Number(m.timestamp) * 1000 : Date.now();
            // mensagem rica (texto + mídia + transcrição)
            const msgObj = { role: "them", content, ts };
            if (midiaTipo !== "text") {
              msgObj.tipo = midiaTipo;
              if (midiaArquivo) msgObj.arquivo = midiaArquivo;
              if (midiaMime) msgObj.mimetype = midiaMime;
              if (midiaFilename) msgObj.filename = midiaFilename;
              msgObj.mid = m.id || ("of" + ts);
            }
            if (transcricao) msgObj.transcricao = transcricao;
            chat.mensagens.push(msgObj);
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
              // captura o MOTIVO da falha de entrega (vem em st.errors) — antes a gente jogava fora
              const err = (st.errors && st.errors[0]) || {};
              const motivo = err.message || err.title
                || (err.error_data && err.error_data.details)
                || ("erro " + (err.code || "?"));
              camp.ultimoErro = (err.code ? "(#" + err.code + ") " : "") + motivo;
              camp.ultimoErroEm = Date.now();
              console.error("Falha ENTREGA camp '" + camp.nome + "' p/ " + (st.recipient_id || "?") + " : " + camp.ultimoErro);
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

  // RETOMAR AUTOMÁTICO: se o servidor reiniciou com campanhas que tinham envios
  // pendentes, continua de onde parou sozinho (espera 5s pra tudo carregar).
  setTimeout(() => {
    const pendentes = (db.oficial.campanhas || []).filter((c) => c.pendentes && c.pendentes.length > 0 && c.status !== "parada");
    if (pendentes.length > 0) {
      console.log(`[oficial] Retomando ${pendentes.length} campanha(s) com envios pendentes após reinício...`);
      for (const camp of pendentes) {
        const numeroCfg = acharNumero(camp.numeroId);
        if (numeroCfg && numeroCfg.ativo) {
          processarFilaCampanha(camp.id, numeroCfg);
        } else {
          console.log(`[oficial] Campanha ${camp.nome}: número inativo, não retomou`);
        }
      }
    }
  }, 5000);

  // devolve a função de init pro index chamar DEPOIS do loadDB()
  return { garantirEstrutura };
}
