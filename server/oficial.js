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
    if (!Array.isArray(db.oficial.reservaListas)) db.oficial.reservaListas = []; // listas de reserva (captação)
    if (!Array.isArray(db.oficial.ias)) db.oficial.ias = [];
    // ias: [{ id, nome, ativa, modo, persona, playbook, gatilhoHandoff, criadoEm }]
    //   modo: "fecha" (IA vende sozinha) | "qualifica" (IA conversa e passa pro vendedor)
    if (db.oficial.iaGlobalAtiva === undefined) db.oficial.iaGlobalAtiva = true; // botão de pânico geral
    // v63: pedido do dono — sobe com a IA GERAL desligada, UMA única vez.
    // Depois disso respeita o botão "Parar/Religar IAs" normalmente (não desliga de novo).
    if (!db.oficial._iaOffV63) {
      db.oficial.iaGlobalAtiva = false;
      db.oficial._iaOffV63 = true;
      saveDB();
    }
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
      quality: n.quality || null, // { rating, tier, atualizadoEm, anterior, mudouEm }
      temFoto: !!n.fotoArquivo,
      fotoAtualizadaEm: n.fotoAtualizadaEm || 0,
      iaId: n.iaId || null, // IA padrão que atende os leads desse número (null = sem IA)
    };
  }
  // busca a URL da foto de perfil do WhatsApp Business do número
  async function buscarFotoPerfilUrl(n) {
    if (!n.phoneNumberId || !tokenDe(n)) return { url: null, erro: "número sem Phone Number ID ou token" };
    try {
      const r = await fetch(`${GRAPH}/${n.phoneNumberId}/whatsapp_business_profile?fields=profile_picture_url`, {
        headers: { Authorization: "Bearer " + tokenDe(n) },
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return { url: null, erro: (d.error && d.error.message) || ("HTTP " + r.status) };
      const url = (d.data && d.data[0] && d.data[0].profile_picture_url) || null;
      return { url, erro: url ? null : "a Meta não retornou foto — esse número provavelmente não tem foto de perfil definida no WhatsApp Business" };
    } catch (e) { return { url: null, erro: e.message }; }
  }
  // baixa a foto e salva no volume (pra servir depois, sem depender da URL da Meta que expira)
  async function baixarFotoPerfil(n) {
    const { url, erro } = await buscarFotoPerfilUrl(n);
    if (!url) { if (erro) console.log(`[oficial] foto de ${n.apelido}: ${erro}`); return { ok: false, erro }; }
    try {
      const r = await fetch(url);
      if (!r.ok) return { ok: false, erro: "erro ao baixar a imagem (HTTP " + r.status + ")" };
      const buf = Buffer.from(await r.arrayBuffer());
      const mime = r.headers.get("content-type") || "image/jpeg";
      const ext = mime.includes("png") ? "png" : "jpg";
      const arquivo = `perfil_${n.id}.${ext}`;
      if (MEDIA_DIR && fs && path) fs.writeFileSync(path.join(MEDIA_DIR, arquivo), buf);
      n.fotoArquivo = arquivo;
      n.fotoAtualizadaEm = Date.now();
      return { ok: true };
    } catch (e) { return { ok: false, erro: e.message }; }
  }
  // puxa da Meta a qualidade e o limite de envio do número
  async function buscarQualidade(n) {
    if (!n.phoneNumberId || !tokenDe(n)) return null;
    try {
      const r = await fetch(`${GRAPH}/${n.phoneNumberId}?fields=quality_rating,messaging_limit_tier,display_phone_number,verified_name,name_status`, {
        headers: { Authorization: "Bearer " + tokenDe(n) },
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return null;
      return {
        rating: d.quality_rating || "UNKNOWN", // GREEN | YELLOW | RED | UNKNOWN
        tier: d.messaging_limit_tier || "",     // TIER_250 | TIER_1K | TIER_10K | ...
        nome: d.verified_name || "",
        nameStatus: d.name_status || "",
      };
    } catch (e) { return null; }
  }
  // aplica a qualidade no número, guardando a anterior (pra mostrar se subiu/caiu)
  function aplicarQualidade(n, q) {
    if (!q) return false;
    const antigo = n.quality || {};
    const mudou = !!antigo.rating && antigo.rating !== q.rating;
    n.quality = {
      rating: q.rating, tier: q.tier, nome: q.nome, nameStatus: q.nameStatus,
      atualizadoEm: Date.now(),
      anterior: mudou ? antigo.rating : (antigo.anterior || null),
      mudouEm: mudou ? Date.now() : (antigo.mudouEm || null),
    };
    if (mudou) console.log(`[oficial] QUALIDADE ${n.apelido}: ${antigo.rating} -> ${q.rating}`);
    return mudou;
  }
  async function atualizarQualidadeTodos() {
    let algum = false;
    for (const n of db.oficial.numeros || []) {
      if (!n.phoneNumberId || !tokenDe(n)) continue;
      try { const q = await buscarQualidade(n); if (q && aplicarQualidade(n, q)) algum = true; } catch (_) {}
      try { await baixarFotoPerfil(n); } catch (_) {} // aproveita e atualiza a foto de perfil
      await new Promise((r) => setTimeout(r, 400));
    }
    salvar();
    return algum;
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

  // peso = quantos leads a pessoa recebe por rodada (padrão 1)
  function pesoDe(v) { const n = Number(v.oficialPercentual); return n > 0 ? n : 1; }

  /* RODÍZIO INTERCALADO (não olha histórico!)
     Cada ligado tem um "crédito" que sobe pelo peso dele a cada lead. Quem tiver
     o maior crédito leva o lead e devolve a soma dos pesos. Resultado: numa rodada
     completa cada um recebe exatamente o peso dele, mas os leads ficam INTERCALADOS
     (todo mundo aparece logo no começo, ninguém espera a rodada inteira).
     Se alguém for ligado/desligado ou mudar de peso, o rodízio é refeito NA HORA. */
  function estadoRodada(ativos) {
    const chave = ativos.map((v) => v.id + ":" + pesoDe(v)).sort().join("|");
    let r = db.oficial.rodada;
    if (!r || r.chave !== chave || !r.credito) {
      r = db.oficial.rodada = { chave, credito: {} };
      ativos.forEach((v) => { r.credito[v.id] = 0; });
    }
    return r;
  }

  // escolhe o maior crédito; empate -> quem recebeu menos no total
  function maiorCredito(ativos, credito) {
    let escolhido = null;
    for (const v of ativos) {
      if (!escolhido) { escolhido = v; continue; }
      const a = credito[v.id] || 0, b = credito[escolhido.id] || 0;
      if (a > b || (a === b && (v.oficialLeadsRecebidos || 0) < (escolhido.oficialLeadsRecebidos || 0))) escolhido = v;
    }
    return escolhido;
  }

  // quem recebe o PRÓXIMO lead (sem consumir) — usado pra mostrar na tela
  function proximoDaVez() {
    const ativos = vendedoresElegiveis();
    if (ativos.length === 0) return null;
    const r = estadoRodada(ativos);
    const simulado = {};
    ativos.forEach((v) => { simulado[v.id] = (r.credito[v.id] || 0) + pesoDe(v); });
    return maiorCredito(ativos, simulado);
  }

  function escolherVendedor() {
    const ativos = vendedoresElegiveis();
    if (ativos.length === 0) return null;
    const r = estadoRodada(ativos);
    const total = ativos.reduce((s, v) => s + pesoDe(v), 0);
    ativos.forEach((v) => { r.credito[v.id] = (r.credito[v.id] || 0) + pesoDe(v); });
    const escolhido = maiorCredito(ativos, r.credito);
    if (!escolhido) return null;
    r.credito[escolhido.id] = (r.credito[escolhido.id] || 0) - total;
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
      iaId: String(b.iaId || "").trim() || null,
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
    if (b.iaId !== undefined) {
      const iid = String(b.iaId || "").trim() || null;
      // Se a IA não existe mais (foi excluída/desativada), LIMPA a referência em vez de
      // travar o salvamento. Antes isso devolvia "IA inválida" e bloqueava editar o número
      // (inclusive definir o vendedor dono). Agora um iaId fantasma vira "sem IA".
      n.iaId = (iid && (db.oficial.ias || []).some((x) => x.id === iid)) ? iid : null;
    }
    if (b.ativo !== undefined) n.ativo = !!b.ativo;
    if (b.vendedorId !== undefined) {
      const vid = String(b.vendedorId || "").trim() || null;
      if (vid && !db.users.some((u) => u.id === vid && u.role === "vendedor")) {
        return res.status(400).json({ error: "Vendedor inválido" });
      }
      n.vendedorId = vid;      // RELIGA conversas travadas: ao definir o dono, joga as respostas que ficaram
      // "sem dono" (aguardando distribuição) desse número direto pra esse vendedor.
      if (vid) {
        const dono = db.users.find((u) => u.id === vid);
        let religadas = 0;
        for (const ch of Object.values(db.waChats || {})) {
          if (ch && ch.canal === "oficial" && ch.numeroOficialId === n.id && !ch.vendedorId && !(ch.iaId && !ch.iaPausada)) {
            ch.vendedorId = vid;
            ch.vendedorNome = dono ? dono.nome : "";
            ch.atribuidoEm = Date.now();
            religadas++;
          }
        }
        if (religadas) console.log(`[oficial] número ${n.apelido}: ${religadas} conversa(s) sem dono religadas p/ ${dono ? dono.nome : vid}`);
      }
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

  /* ---- TEMPERATURA: em que horário os leads mais respondem ---- */
  app.get("/api/oficial/temperatura", auth, (req, res) => {
    const souGerente = req.user.role === "gerente";
    const dias = Math.max(0, parseInt(req.query.dias) || 0); // 0 = tudo
    const cutoff = dias > 0 ? Date.now() - dias * 86400000 : 0;
    // hora/dia no fuso do Brasil (-3)
    const horaBR = (ts) => { const d = new Date((ts || 0) - 3 * 3600000); return { hora: d.getUTCHours(), dia: d.getUTCDay() }; };
    const byHour = new Array(24).fill(0);
    const grid = Array.from({ length: 7 }, () => new Array(24).fill(0)); // [dia][hora]
    let total = 0;
    const chats = Object.values(db.waChats || {}).filter(
      (c) => c.canal === "oficial" && (souGerente || c.vendedorId === req.user.id)
    );
    for (const c of chats) {
      for (const m of (c.mensagens || [])) {
        if (m.role !== "them") continue; // conta só as respostas do lead
        const ts = m.ts || 0;
        if (!ts || (cutoff && ts < cutoff)) continue;
        const { hora, dia } = horaBR(ts);
        byHour[hora]++; grid[dia][hora]++; total++;
      }
    }
    let picoHora = 0; for (let h = 1; h < 24; h++) if (byHour[h] > byHour[picoHora]) picoHora = h;
    const byDia = grid.map((r) => r.reduce((a, b) => a + b, 0));
    let picoDia = 0; for (let d = 1; d < 7; d++) if (byDia[d] > byDia[picoDia]) picoDia = d;
    res.json({ byHour, grid, byDia, total, picoHora, picoDia });
  });

  /* ---- LIMITE DIÁRIO de disparos por vendedor ---- */
  // gerente vê todos os vendedores com o uso de hoje
  app.get("/api/oficial/limites", auth, gerenteOnly, (req, res) => {
    const vends = (db.users || []).filter((u) => u.role === "vendedor" && u.ativo);
    res.json(vends.map((v) => ({ id: v.id, nome: v.nome, ...limiteInfo(v) })));
  });
  // gerente define o limite diário e/ou libera um extra só pra hoje
  app.post("/api/oficial/vendedores/:id/limite", auth, gerenteOnly, (req, res) => {
    const v = (db.users || []).find((u) => u.id === req.params.id && u.role === "vendedor");
    if (!v) return res.status(404).json({ error: "Vendedor não encontrado" });
    const b = req.body || {};
    if (b.limiteDia !== undefined) v.limiteDisparoDia = Math.max(0, parseInt(b.limiteDia) || 0);
    if (b.bonusHoje !== undefined) {
      const q = Math.max(0, parseInt(b.bonusHoje) || 0);
      // soma ao bônus de hoje (se já tinha) em vez de sobrescrever
      const hoje = diaBR(Date.now());
      const atual = (v.disparoBonus && v.disparoBonus.data === hoje) ? (v.disparoBonus.qtd || 0) : 0;
      v.disparoBonus = { data: hoje, qtd: atual + q };
    }
    salvar();
    res.json({ ok: true, id: v.id, nome: v.nome, ...limiteInfo(v) });
  });
  // vendedor vê o próprio limite/uso de hoje
  app.get("/api/oficial/meu-limite", auth, (req, res) => {
    if (req.user.role !== "vendedor") return res.json({ ilimitado: true });
    res.json(limiteInfo(req.user));
  });

  /* ---- QUALIDADE do número (Alta/Média/Baixa + limite de envio, direto da Meta) ---- */
  app.post("/api/oficial/numeros/:id/qualidade", auth, async (req, res) => {
    const n = numeroPermitido(req, req.params.id);
    if (!n) return res.status(404).json({ error: "Número não encontrado (ou sem acesso)" });
    if (!n.phoneNumberId) return res.status(400).json({ error: "Número sem Phone Number ID" });
    if (!tokenDe(n)) return res.status(400).json({ error: "Número sem token (configure o Token da Meta)" });
    const q = await buscarQualidade(n);
    if (!q) return res.status(400).json({ error: "Não consegui puxar a qualidade da Meta agora — tente de novo em instantes" });
    aplicarQualidade(n, q);
    let fotoErro = null;
    try { const f = await baixarFotoPerfil(n); if (!f.ok) fotoErro = f.erro; } catch (_) {}
    salvar();
    res.json({ ok: true, quality: n.quality, temFoto: !!n.fotoArquivo, fotoErro });
  });
  // serve a foto de perfil salva (pública — é a foto pública do WhatsApp Business)
  app.get("/api/oficial/numeros/:id/foto", (req, res) => {
    const n = acharNumero(req.params.id);
    if (!n || !n.fotoArquivo || !MEDIA_DIR) return res.status(404).send("sem foto");
    const p = path.join(MEDIA_DIR, n.fotoArquivo);
    if (!fs.existsSync(p)) return res.status(404).send("sem foto");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.sendFile(p);
  });
  // puxa/atualiza a foto de perfil na hora (só a foto)
  app.post("/api/oficial/numeros/:id/foto", auth, async (req, res) => {
    const n = numeroPermitido(req, req.params.id);
    if (!n) return res.status(404).json({ error: "Número não encontrado (ou sem acesso)" });
    const f = await baixarFotoPerfil(n);
    salvar();
    if (!f.ok) return res.status(400).json({ error: f.erro || "Não consegui puxar a foto de perfil" });
    res.json({ ok: true, fotoAtualizadaEm: n.fotoAtualizadaEm });
  });
  app.post("/api/oficial/qualidade-todos", auth, gerenteOnly, async (req, res) => {
    await atualizarQualidadeTodos();
    res.json({ ok: true, numeros: (db.oficial.numeros || []).map(numeroPublico) });
  });

  // salva faturamento e/ou gasto na mão (sem re-assinar webhook, é só valor)
  app.post("/api/oficial/numeros/:id/metricas", auth, (req, res) => {
    const n = numeroPermitido(req, req.params.id);    if (!n) return res.status(404).json({ error: "Número não encontrado (ou sem acesso)" });
    const b = req.body || {};
    if (b.faturamento !== undefined) n.faturamento = Math.max(0, Number(b.faturamento) || 0);
    if (b.gasto !== undefined) n.gasto = Math.max(0, Number(b.gasto) || 0);
    salvar();
    res.json({ ok: true, faturamento: n.faturamento || 0, gasto: n.gasto || 0 });
  });

  // painel de métricas: junta o que o sistema sabe (disparos/conversas) + gasto/faturamento
  // ?dias=N filtra disparos/conversas pelo período (0 ou vazio = tudo)
  app.get("/api/oficial/metricas", auth, (req, res) => {
    const souGerente = req.user.role === "gerente";
    let numerosBase = db.oficial.numeros || [];
    if (!souGerente) numerosBase = numerosBase.filter((n) => n.vendedorId === req.user.id);
    const dias = Math.max(0, parseInt(req.query.dias) || 0); // 0 = tudo
    const cutoff = dias > 0 ? Date.now() - dias * 86400000 : 0;
    const dentro = (ts) => !cutoff || (ts || 0) >= cutoff;
    const chats = Object.values(db.waChats || {}).filter((c) => c.canal === "oficial" && dentro(c.atualizadoEm));
    const lista = numerosBase.map((n) => {
      const camps = (db.oficial.campanhas || []).filter((c) => c.numeroId === n.id && dentro(c.criadoEm));
      let enviados = 0, entregues = 0, falhas = 0;
      for (const c of camps) { enviados += c.enviados || 0; entregues += c.entregues || 0; falhas += c.falhas || 0; }
      const meus = chats.filter((c) => c.numeroOficialId === n.id);
      const conversas = meus.length;
      const responderam = meus.filter((c) => c.respondeu || c.vendedorId).length;
      const faturamento = Number(n.faturamento) || 0;
      const gasto = Number(n.gasto) || 0;
      const lucro = faturamento - gasto;
      const roi = gasto > 0 ? lucro / gasto : null; // razão: 1 = 100% de retorno
      const dono = n.vendedorId ? (db.users || []).find((u) => u.id === n.vendedorId) : null;
      return {
        id: n.id, apelido: n.apelido, numero: n.numero,
        vendedorNome: dono ? dono.nome : "",
        gasto, faturamento, lucro, roi,
        enviados, entregues, falhas, campanhas: camps.length,
        conversas, responderam,
      };
    });
    // totais
    const tot = lista.reduce((a, m) => ({
      gasto: a.gasto + m.gasto, faturamento: a.faturamento + m.faturamento,
      enviados: a.enviados + m.enviados, entregues: a.entregues + m.entregues,
      conversas: a.conversas + m.conversas, responderam: a.responderam + m.responderam,
    }), { gasto: 0, faturamento: 0, enviados: 0, entregues: 0, conversas: 0, responderam: 0 });
    tot.lucro = tot.faturamento - tot.gasto;
    tot.roi = tot.gasto > 0 ? tot.lucro / tot.gasto : null;
    res.json({ numeros: lista, total: tot });
  });

  // tenta puxar o GASTO da Meta (melhor esforço — depende da conta/plano; se falhar, digita na mão)
  app.post("/api/oficial/numeros/:id/gasto-meta", auth, async (req, res) => {
    const n = numeroPermitido(req, req.params.id);
    if (!n) return res.status(404).json({ error: "Número não encontrado (ou sem acesso)" });
    if (!n.wabaId) return res.status(400).json({ error: "Número sem WABA ID" });
    if (!tokenDe(n)) return res.status(400).json({ error: "Número sem token (configure o Token da Meta)" });
    const dias = Math.min(90, Math.max(1, parseInt((req.body && req.body.dias)) || 30));
    const end = Math.floor(Date.now() / 1000);
    const start = end - dias * 86400;
    try {
      // consulta no nível da WABA (sem filtro de telefone -> bem mais robusto).
      // se a WABA tem 1 número (teu caso), esse custo já é o custo dele.
      const fields = `conversation_analytics.start(${start}).end(${end}).granularity(DAILY).dimensions(["CONVERSATION_CATEGORY"])`;
      const r = await fetch(`${GRAPH}/${n.wabaId}?fields=${encodeURIComponent(fields)}`, {
        headers: { Authorization: "Bearer " + tokenDe(n) },
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = (data && data.error && data.error.message) || "A Meta não retornou o gasto";
        return res.status(400).json({ error: msg });
      }
      let gasto = 0, conversas = 0;
      const pts = ((((data.conversation_analytics || {}).data) || [])[0] || {}).data_points || [];
      for (const p of pts) { gasto += Number(p.cost) || 0; conversas += Number(p.conversation) || 0; }
      gasto = Math.round(gasto * 100) / 100;
      // NÃO sobrescreve um valor digitado na mão com 0
      let salvou = false;
      if (gasto > 0) { n.gasto = gasto; salvar(); salvou = true; }
      const aviso = gasto > 0 ? null : (conversas > 0
        ? `A Meta achou ${conversas} conversa(s) no período, mas devolveu custo R$ 0. O custo por API costuma atrasar 1 a 3 dias (ou essa conta não expõe custo via API). Confira no painel de cobrança e, se precisar, digite na mão.`
        : "A Meta não retornou conversas/custo nesse período — pode ser atraso de agregação (1 a 3 dias) ou a conta não libera custo por API. Digite o gasto na mão.");
      res.json({ ok: true, gasto, conversas, dias, salvou, aviso });
    } catch (e) {
      res.status(400).json({ error: "Erro ao consultar a Meta: " + (e.message || e) });
    }
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
    const prox = proximoDaVez();
    const lista = db.users
      .filter((u) => u.role === "vendedor" && u.ativo)
      .map((u) => ({
        id: u.id,
        nome: u.nome,
        oficialAtivo: !!u.oficialAtivo,
        oficialPercentual: Number(u.oficialPercentual) || 0,
        oficialLeadsRecebidos: u.oficialLeadsRecebidos || 0,
        // se é quem recebe o próximo lead
        proximo: !!(prox && prox.id === u.id),
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
    db.oficial.rodada = null; // recomeça a rodada do zero também
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
    const marcarErro = (motivo) => {
      chat.iaUltimoErro = { motivo, ts: Date.now() };
      salvar();
      console.log(`[oficial] IA NÃO respondeu (${chat.numero}): ${motivo}`);
    };
    try {
      if (db.oficial.iaGlobalAtiva === false) return marcarErro("O interruptor GERAL da IA está desligado (ligue na aba Atendente IA).");
      const ia = (db.oficial.ias || []).find((x) => x.id === chat.iaId);
      if (!ia) return marcarErro("A IA atribuída a esta conversa não existe mais.");
      if (!ia.ativa) return marcarErro(`A IA "${ia.nome}" está DESATIVADA — ative ela na aba Atendente IA.`);
      const system = montarSystemPrompt(ia, chat.nome);
      const kb = await buscarConhecimento(ia, chat);
      const systemFinal = kb
        ? system + "\n\n===== BASE DE CONHECIMENTO (materiais de treinamento) =====\nConsulte os trechos abaixo pra responder com precisão sobre cursos, preços, processo e regras. Use como fonte de verdade. Se a resposta não estiver nos trechos, responda com o que você já sabe, SEM inventar dado que não tem.\n\n" + kb
        : system;
      const histDireto = (chat.mensagens || []).slice(-24);
      let resposta = await chamarClaude(systemFinal, histDireto);
      if (!resposta) return marcarErro("A OpenAI não retornou nenhuma resposta.");

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
        chat.iaUltimoErro = null; // respondeu com sucesso -> limpa qualquer erro anterior
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
      const msg = e && e.message ? e.message : "erro desconhecido";
      // erro comum de chave: deixa claro
      if (/OPENAI_API_KEY/i.test(msg)) marcarErro("Falta configurar a OPENAI_API_KEY no Railway (a IA usa a OpenAI pra responder).");
      else if (/quota|insufficient|billing|exceeded/i.test(msg)) marcarErro("Erro de cota/crédito na OpenAI: " + msg);
      else marcarErro("Erro ao gerar resposta: " + msg);
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
      docs: (ia.docs || []).map((d) => ({ id: d.id, nome: d.nome, tamanho: d.tamanho, nChunks: d.nChunks, criadoEm: d.criadoEm })),
      voiceId: ia.voiceId || null, voiceNome: ia.voiceNome || "",
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
    if (b.voiceId !== undefined) { ia.voiceId = String(b.voiceId || "").trim() || null; ia.voiceNome = String(b.voiceNome || "").slice(0, 60); }
    salvar();
    res.json(iaPublica(ia));
  });

  app.delete("/api/oficial/ias/:id", auth, gerenteOnly, (req, res) => {
    const antes = (db.oficial.ias || []).length;
    db.oficial.ias = (db.oficial.ias || []).filter((x) => x.id !== req.params.id);
    try { const p = kbPath(req.params.id); if (p && fs.existsSync(p)) fs.unlinkSync(p); } catch (_) {}
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

  // ATIVA uma IA nesta conversa (atribui a IA ao chat). Se o lead já mandou a última
  // mensagem, a IA responde na hora — se não, responde quando o lead falar.
  app.post("/api/oficial/chats/:id/atribuir-ia", auth, gerenteOnly, async (req, res) => {
    const chat = db.waChats[req.params.id];
    if (!chat || chat.canal !== "oficial") return res.status(404).json({ error: "Conversa não encontrada" });
    const iaId = String((req.body || {}).iaId || "").trim();
    if (!Array.isArray(chat.notas)) chat.notas = [];
    if (!iaId) { // desligar a IA da conversa
      chat.iaId = null; chat.iaPausada = true; salvar();
      return res.json({ ok: true, temIA: false });
    }
    const ia = (db.oficial.ias || []).find((x) => x.id === iaId);
    if (!ia) return res.status(404).json({ error: "IA não encontrada" });
    if (!ia.ativa) return res.status(400).json({ error: `A IA "${ia.nome}" está desativada — ative ela na aba Atendente IA.` });
    chat.iaId = iaId;
    chat.iaPausada = false;
    chat.iaUltimoErro = null;
    chat.notas.push({ tipo: "ia_ativada", texto: `${req.user.nome} ativou a IA "${ia.nome}" nesta conversa`, ts: Date.now(), por: req.user.nome });
    if (chat.notas.length > 100) chat.notas = chat.notas.slice(-100);
    salvar();
    res.json({ ok: true, temIA: true, iaNome: ia.nome });
    // se a última mensagem foi do lead, já responde (não espera a próxima)
    const ult = (chat.mensagens || [])[chat.mensagens.length - 1];
    if (ult && ult.role === "them") {
      const numeroCfg = acharNumero(chat.numeroOficialId);
      if (numeroCfg) rodarIA(chat, numeroCfg);
    }
  });

  /* ================= IA DE LIGAÇÃO (voz, por turnos via Twilio) =================
     A IA liga pro lead, conversa por turnos (fala -> escuta a resposta -> responde),
     qualifica e passa pro vendedor. Reusa a MESMA agente (persona + base RAG).
     Variáveis no Railway: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_NUMERO. */
  function garantirLigacoes() { if (!Array.isArray(db.oficial.ligacoes)) db.oficial.ligacoes = []; }
  function baseUrlDe(req) {
    const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0];
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    return `${proto}://${host}`;
  }
  function escXml(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;"); }
  const VOZ_TW = 'voice="Polly.Camila-Neural" language="pt-BR"';

  // gera o áudio da fala na ElevenLabs (voz humana), salva e devolve o nome do arquivo.
  // Se não tiver chave ou falhar, devolve null (aí cai na voz da Twilio).
  async function gerarVozEleven(texto, voiceId) {
    const key = process.env.ELEVENLABS_API_KEY;
    const voice = voiceId || process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL"; // voz padrão (multilíngue)
    if (!key || !texto || !MEDIA_DIR) return null;
    try {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({ text: texto, model_id: "eleven_turbo_v2_5", voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true } }),
      });
      if (!r.ok) { console.error("[ligacao] ElevenLabs " + r.status + ":", (await r.text().catch(() => "")).slice(0, 160)); return null; }
      const buf = Buffer.from(await r.arrayBuffer());
      const nome = "voz_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + ".mp3";
      fs.writeFileSync(path.join(MEDIA_DIR, nome), buf);
      return nome;
    } catch (e) { console.error("[ligacao] ElevenLabs erro:", e.message); return null; }
  }
  // devolve a tag de fala (ElevenLabs <Play> se der certo, senão <Say> da Twilio)
  async function vozTag(base, texto, voiceId) {
    const arq = await gerarVozEleven(texto, voiceId);
    if (arq) return `<Play>${base}/api/oficial/ligacao/audio/${arq}</Play>`;
    return `<Say ${VOZ_TW}>${escXml(texto)}</Say>`;
  }

  // gera a próxima fala da IA na ligação (curta, estilo telefone) + detecta classificação
  async function falaDaIA(lig, ia) {
    const base = montarSystemPrompt(ia, lig.nome);
    const chatFake = { id: lig.id, nome: lig.nome, mensagens: lig.transcricao.map((t) => ({ role: t.role === "lead" ? "them" : "me", content: t.content })) };
    let kb = ""; try { kb = await buscarConhecimento(ia, chatFake); } catch (_) {}
    const modoVoz = "\n\n===== MODO LIGAÇÃO TELEFÔNICA =====\nVocê está FALANDO ao telefone (não escrevendo). Regras:\n- Fale CURTO e natural, como numa ligação real: no máximo 2 frases por vez, uma ideia de cada vez.\n- NUNCA use listas, emojis, links ou formatação — é voz.\n- Comece se apresentando rápido e vá qualificando com perguntas curtas.\n- Quando o lead demonstrar interesse/perfil (QUALIFICADO), encerre educado dizendo que um consultor vai continuar o atendimento, e escreva a tag [QUALIFICADO] no final.\n- Se claramente não tiver interesse/perfil, encerre educado e escreva [NAO_QUALIFICADO].\n- Se pedir pra falar depois, diga que retorna e escreva [CALLBACK].\nNunca leia as tags em voz alta.";
    const system = base + (kb ? "\n\n===== BASE DE CONHECIMENTO =====\n" + kb : "") + modoVoz;
    const hist = lig.transcricao.map((t) => ({ role: t.role === "lead" ? "them" : "me", content: t.content }));
    if (!hist.length) hist.push({ role: "them", content: "(a ligação foi atendida — comece a conversa)" });
    let resp = await chamarClaude(system, hist);
    let classe = null;
    if (/\[QUALIFICADO\]/i.test(resp)) classe = "qualificado";
    else if (/\[NAO_QUALIFICADO\]/i.test(resp)) classe = "nao_qualificado";
    else if (/\[CALLBACK\]/i.test(resp)) classe = "callback";
    resp = resp.replace(/\[(QUALIFICADO|NAO_QUALIFICADO|CALLBACK|PASSAR_HUMANO)\]/gi, "").trim();
    return { fala: resp || "Certo!", classe };
  }

  async function gatherXml(base, ligId, fala, voiceId) {
    const v = await vozTag(base, fala, voiceId);
    return `<Response>${v}<Gather input="speech" language="pt-BR" speechTimeout="auto" action="${base}/api/oficial/ligacao/resposta/${ligId}" method="POST"></Gather><Redirect method="POST">${base}/api/oficial/ligacao/resposta/${ligId}?vazio=1</Redirect></Response>`;
  }
  // serve o mp3 da ElevenLabs pro Twilio tocar (público — o Twilio precisa acessar)
  app.get("/api/oficial/ligacao/audio/:file", (req, res) => {
    const f = String(req.params.file || "").replace(/[^a-z0-9_.]/gi, "");
    const p = f && MEDIA_DIR ? path.join(MEDIA_DIR, f) : null;
    if (!p || !fs.existsSync(p)) return res.sendStatus(404);
    res.set("Content-Type", "audio/mpeg");
    res.set("Cache-Control", "public, max-age=3600");
    res.sendFile(p);
  });
  // lista as vozes da conta ElevenLabs (pra escolher no sistema)
  app.get("/api/oficial/vozes", auth, gerenteOnly, async (req, res) => {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) return res.status(400).json({ error: "Configure a ELEVENLABS_API_KEY no Railway pra listar as vozes." });
    try {
      const r = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": key } });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return res.status(400).json({ error: (d && d.detail && d.detail.message) || ("Erro ElevenLabs " + r.status) });
      const vozes = (d.voices || []).map((v) => ({
        voiceId: v.voice_id, nome: v.name,
        preview: v.preview_url || "",
        idioma: (v.labels && (v.labels.language || v.labels.accent)) || "",
        genero: (v.labels && v.labels.gender) || "",
      }));
      res.json({ vozes });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  /* ================= CRM (Kanban de leads) ================= */
  const CRM_ETAPAS_PADRAO = [
    { k: "reserva", lb: "Lista de reserva", cor: "#8b5cf6" },
    { k: "novo", lb: "Novo lead", cor: "#64748b" },
    { k: "contato", lb: "Em contato", cor: "#3b82f6" },
    { k: "qualificado", lb: "Qualificado", cor: "#059669" },
    { k: "matriculado", lb: "Matriculado", cor: "#d97706" },
    { k: "perdido", lb: "Perdido", cor: "#ef4444" },
  ];
  // Colunas do Pipeline agora são editáveis pelo gerente (guardadas no banco).
  function etapasCRM() {
    if (!Array.isArray(db.oficial.crmEtapas) || !db.oficial.crmEtapas.length) {
      db.oficial.crmEtapas = CRM_ETAPAS_PADRAO.map((e) => ({ ...e }));
    }
    return db.oficial.crmEtapas;
  }
  function garantirCRM() {
    if (!Array.isArray(db.oficial.crmLeads)) db.oficial.crmLeads = [];
    if (!Array.isArray(db.oficial.crmVendedores)) db.oficial.crmVendedores = [];
  }
  function crmLeadPublico(l) {
    const v = l.vendedorId ? (db.users || []).find((u) => u.id === l.vendedorId) : null;
    return { id: l.id, nome: l.nome, telefone: l.telefone, email: l.email || "", curso: l.curso || "", etapa: l.etapa, vendedorId: l.vendedorId || null, vendedorNome: v ? v.nome : "", vendedorFoto: v ? (v.foto || "") : "", valor: l.valor || 0, formaPagamento: l.formaPagamento || "", tags: l.tags || [], tarefa: l.tarefa || null, reservaNome: l.reservaNome || "", origem: l.origem || "manual", notas: l.notas || [], historico: l.historico || [], criadoEm: l.criadoEm, atualizadoEm: l.atualizadoEm };
  }
  function proximoVendedorCRM() {
    garantirCRM();
    let pool = (db.oficial.crmVendedores || []).filter((id) => db.users.some((u) => u.id === id && u.role === "vendedor" && u.ativo));
    if (!pool.length) pool = (db.users || []).filter((u) => u.role === "vendedor" && u.ativo).map((u) => u.id);
    if (!pool.length) return null;
    db.oficial._crmRR = ((db.oficial._crmRR || 0) + 1) % pool.length;
    return pool[db.oficial._crmRR];
  }
  // cria/atualiza um lead no CRM a partir de uma ligação qualificada
  function criarLeadDaLigacao(lig) {
    garantirCRM();
    const resumo = (lig.transcricao || []).map((t) => (t.role === "ia" ? "IA: " : "Lead: ") + t.content).join("\n");
    let l = (db.oficial.crmLeads || []).find((x) => x.telefone === lig.telefone);
    if (!l) {
      l = { id: "lead_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), nome: lig.nome || lig.telefone, telefone: lig.telefone, etapa: "qualificado", vendedorId: proximoVendedorCRM(), valor: 0, origem: "ligacao", notas: [], historico: [], criadoEm: Date.now(), atualizadoEm: Date.now() };
      db.oficial.crmLeads.unshift(l);
    } else { l.etapa = "qualificado"; if (!l.vendedorId) l.vendedorId = proximoVendedorCRM(); }
    l.notas.push({ texto: "📞 Qualificado pela IA na ligação. Resumo:\n" + resumo, por: "IA", ts: Date.now() });
    l.historico.push({ tipo: "ligacao", texto: "Qualificado por ligação da IA", ts: Date.now() });
    l.atualizadoEm = Date.now();
    salvar();
  }

  /* ---- ACESSO DOS VENDEDORES (o dono decide o que cada vendedor pode ver) ---- */
  // Mapa por tela: liga/desliga o acesso do vendedor. Default: tudo desligado
  // (mantém o comportamento antigo, em que essas telas eram só do gerente).
  const ACESSO_VEND_CHAVES = ["crm", "temperatura"];
  function acessoVend() {
    const a = (db.oficial && db.oficial.acessoVend) || {};
    const out = {};
    ACESSO_VEND_CHAVES.forEach((k) => { out[k] = a[k] === true; });
    return out;
  }
  // Middleware: libera se for gerente OU se for vendedor e o dono ligou essa tela.
  function permiteVend(chave) {
    return (req, res, next) => {
      if (req.user.role === "gerente") return next();
      if (req.user.role === "vendedor" && acessoVend()[chave]) return next();
      return res.status(403).json({ error: "Acesso restrito" });
    };
  }
  // Qualquer usuário lê (o front usa pra montar o menu). Só o DONO altera.
  app.get("/api/oficial/acesso-vendedor", auth, (req, res) => {
    res.json({ acessoVend: acessoVend() });
  });
  app.put("/api/oficial/acesso-vendedor", auth, gerenteOnly, (req, res) => {
    if (!req.user.dono) return res.status(403).json({ error: "Só o dono do sistema pode mudar os acessos." });
    const b = (req.body && req.body.acessoVend) || {};
    if (!db.oficial.acessoVend || typeof db.oficial.acessoVend !== "object") db.oficial.acessoVend = {};
    ACESSO_VEND_CHAVES.forEach((k) => { if (typeof b[k] === "boolean") db.oficial.acessoVend[k] = b[k]; });
    salvar();
    res.json({ ok: true, acessoVend: acessoVend() });
  });

  app.get("/api/oficial/crm", auth, permiteVend("crm"), (req, res) => {
    garantirCRM();
    const ehVend = req.user.role === "vendedor";
    let leads = (db.oficial.crmLeads || []);
    if (ehVend) leads = leads.filter((l) => l.vendedorId === req.user.id); // vendedor só vê os leads dele
    res.json({
      etapas: etapasCRM(),
      leads: leads.map(crmLeadPublico),
      vendedores: (db.users || []).filter((u) => u.role === "vendedor" && u.ativo).map((u) => ({ id: u.id, nome: u.nome, foto: u.foto || "" })),
      crmVendedores: ehVend ? [] : (db.oficial.crmVendedores || []),
      soMeus: ehVend, // o front usa pra esconder as partes que são só do gerente
    });
  });
  app.post("/api/oficial/crm/lead", auth, permiteVend("crm"), (req, res) => {
    garantirCRM();
    const b = req.body || {};
    if (req.user.role === "vendedor") b.vendedorId = req.user.id; // vendedor só cria lead pra si
    const lead = {
      id: "lead_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      nome: String(b.nome || "Sem nome").slice(0, 80),
      telefone: String(b.telefone || "").replace(/\D/g, ""),
      email: String(b.email || "").trim().slice(0, 120),
      curso: String(b.curso || "").trim().slice(0, 120),
      etapa: etapasCRM().some((e) => e.k === b.etapa) ? b.etapa : (etapasCRM()[0] || {}).k,
      vendedorId: (b.vendedorId && db.users.some((u) => u.id === b.vendedorId)) ? b.vendedorId : null,
      valor: parseFloat(b.valor) || 0, origem: "manual", notas: [],
      historico: [{ tipo: "criado", texto: "Lead criado manualmente", ts: Date.now() }],
      criadoEm: Date.now(), atualizadoEm: Date.now(),
    };
    db.oficial.crmLeads.unshift(lead);
    salvar();
    res.json({ ok: true, lead: crmLeadPublico(lead) });
  });
  app.put("/api/oficial/crm/lead/:id", auth, permiteVend("crm"), (req, res) => {
    garantirCRM();
    const l = (db.oficial.crmLeads || []).find((x) => x.id === req.params.id);
    if (!l) return res.status(404).json({ error: "Lead não encontrado" });
    const b = req.body || {};
    if (req.user.role === "vendedor" && l.vendedorId !== req.user.id) {
      return res.status(403).json({ error: "Esse lead não é seu" });
    }
    if (b.etapa !== undefined && etapasCRM().some((e) => e.k === b.etapa)) {
      if (l.etapa !== b.etapa) l.historico.push({ tipo: "etapa", texto: "Movido para " + etapasCRM().find((e) => e.k === b.etapa).lb, ts: Date.now() });
      l.etapa = b.etapa;
    }
    if (b.nome !== undefined) l.nome = String(b.nome).slice(0, 80);
    if (b.telefone !== undefined) l.telefone = String(b.telefone).replace(/\D/g, "");
    if (b.email !== undefined) l.email = String(b.email).trim().slice(0, 120);
    if (b.curso !== undefined) l.curso = String(b.curso).trim().slice(0, 120);
    if (b.valor !== undefined) l.valor = parseFloat(b.valor) || 0;
    if (b.vendedorId !== undefined) {
      const vid = b.vendedorId || null;
      if (vid && !db.users.some((u) => u.id === vid)) return res.status(400).json({ error: "Vendedor inválido" });
      if (l.vendedorId !== vid) { const v = vid ? db.users.find((u) => u.id === vid) : null; l.historico.push({ tipo: "atribuido", texto: v ? "Atribuído a " + v.nome : "Atribuição removida", ts: Date.now() }); }
      l.vendedorId = vid;
    }
    if (b.tarefa !== undefined) {
      if (!b.tarefa) { l.tarefa = null; }
      else {
        const tx = String(b.tarefa.texto || "").trim().slice(0, 200);
        const quando = Number(b.tarefa.quando) || 0;
        l.tarefa = (tx || quando) ? { texto: tx, quando, feito: !!b.tarefa.feito } : null;
      }
    }
    l.atualizadoEm = Date.now();
    salvar();
    res.json({ ok: true, lead: crmLeadPublico(l) });
  });
  app.post("/api/oficial/crm/lead/:id/nota", auth, permiteVend("crm"), (req, res) => {
    garantirCRM();
    const l = (db.oficial.crmLeads || []).find((x) => x.id === req.params.id);
    if (!l) return res.status(404).json({ error: "Lead não encontrado" });
    if (req.user.role === "vendedor" && l.vendedorId !== req.user.id) return res.status(403).json({ error: "Esse lead não é seu" });
    const texto = String((req.body || {}).texto || "").trim();
    if (!texto) return res.status(400).json({ error: "Nota vazia" });
    if (!Array.isArray(l.notas)) l.notas = [];
    l.notas.push({ texto: texto.slice(0, 2000), por: req.user.nome, ts: Date.now() });
    l.atualizadoEm = Date.now();
    salvar();
    res.json({ ok: true, lead: crmLeadPublico(l) });
  });
  app.delete("/api/oficial/crm/lead/:id", auth, permiteVend("crm"), (req, res) => {
    garantirCRM();
    if (req.user.role === "vendedor") return res.status(403).json({ error: "Vendedor não pode excluir leads" });
    db.oficial.crmLeads = (db.oficial.crmLeads || []).filter((x) => x.id !== req.params.id);
    salvar();
    res.json({ ok: true });
  });

  // ---- Colunas do Pipeline: criar / editar / apagar (gerente) ----
  function slugEtapa() { return "col_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  app.post("/api/oficial/crm/etapa", auth, gerenteOnly, (req, res) => {
    garantirCRM();
    const b = req.body || {};
    const lb = String(b.lb || "").trim().slice(0, 40);
    if (!lb) return res.status(400).json({ error: "Dê um nome à coluna" });
    const et = etapasCRM();
    let k; do { k = slugEtapa(); } while (et.some((e) => e.k === k));
    const cor = /^#[0-9a-fA-F]{6}$/.test(b.cor) ? b.cor : "#64748b";
    et.push({ k, lb, cor });
    salvar();
    res.json({ ok: true, etapas: etapasCRM() });
  });
  app.put("/api/oficial/crm/etapa/:k", auth, gerenteOnly, (req, res) => {
    garantirCRM();
    const e = etapasCRM().find((x) => x.k === req.params.k);
    if (!e) return res.status(404).json({ error: "Coluna não encontrada" });
    const b = req.body || {};
    if (b.lb !== undefined) { const lb = String(b.lb).trim().slice(0, 40); if (lb) e.lb = lb; }
    if (b.cor !== undefined && /^#[0-9a-fA-F]{6}$/.test(b.cor)) e.cor = b.cor;
    salvar();
    res.json({ ok: true, etapas: etapasCRM() });
  });
  app.delete("/api/oficial/crm/etapa/:k", auth, gerenteOnly, (req, res) => {
    garantirCRM();
    const et = etapasCRM();
    if (et.length <= 1) return res.status(400).json({ error: "Precisa ter pelo menos uma coluna" });
    const idx = et.findIndex((x) => x.k === req.params.k);
    if (idx < 0) return res.status(404).json({ error: "Coluna não encontrada" });
    // move os leads dessa coluna pra primeira coluna que sobrar (não perde ninguém)
    const destino = et.find((x) => x.k !== req.params.k).k;
    (db.oficial.crmLeads || []).forEach((l) => { if (l.etapa === req.params.k) l.etapa = destino; });
    db.oficial.crmEtapas = et.filter((x) => x.k !== req.params.k);
    salvar();
    res.json({ ok: true, etapas: etapasCRM(), movidosPara: destino });
  });

  // ---- Importar leads de planilha (CSV) — gerente ----
  app.post("/api/oficial/crm/importar", auth, gerenteOnly, (req, res) => {
    garantirEstrutura(); garantirCRM();
    const b = req.body || {};
    const destino = etapasCRM().some((e) => e.k === b.destino) ? b.destino : (etapasCRM()[0] || {}).k;
    const modo = b.distribuir === "manual" ? "manual" : "auto";
    const tag = String(b.tag || "").trim().slice(0, 40);
    const linhas = Array.isArray(b.leads) ? b.leads.slice(0, 5000) : [];
    let criados = 0, pulados = 0, i = 0;
    for (const row of linhas) {
      i++;
      const nome = String((row && row.nome) || "").trim().slice(0, 80);
      const telefone = String((row && row.telefone) || "").replace(/\D/g, "");
      if (!nome || telefone.length < 10 || telefone.length > 13) { pulados++; continue; }
      if ((db.oficial.crmLeads || []).some((x) => x.telefone === telefone)) { pulados++; continue; } // dedupe por telefone
      const dist = modo === "manual" ? { vendedorId: null, vendedorNome: "" } : distribuirReserva();
      const lead = {
        id: "lead_" + Date.now().toString(36) + "_" + i + Math.random().toString(36).slice(2, 5),
        nome, telefone,
        email: String((row && row.email) || "").trim().slice(0, 120),
        curso: String((row && row.curso) || "").trim().slice(0, 120),
        valor: parseFloat(row && row.valor) || 0,
        formaPagamento: "",
        etapa: destino,
        vendedorId: dist.vendedorId, vendedorNome: dist.vendedorNome,
        origem: "importado",
        tags: tag ? [tag] : [],
        notas: [],
        historico: [{ tipo: "criado", texto: "Importado de planilha", ts: Date.now() }],
        criadoEm: Date.now(), atualizadoEm: Date.now(),
      };
      db.oficial.crmLeads.unshift(lead);
      criados++;
    }
    salvar();
    res.json({ ok: true, criados, pulados });
  });

  // ---- Ações em lote (selecionar vários leads) ----
  app.post("/api/oficial/crm/lote/atribuir", auth, permiteVend("crm"), (req, res) => {
    garantirCRM();
    const b = req.body || {};
    const ids = Array.isArray(b.ids) ? b.ids : [];
    const vid = b.vendedorId || null;
    if (vid && !db.users.some((u) => u.id === vid)) return res.status(400).json({ error: "Vendedor inválido" });
    let n = 0;
    for (const l of (db.oficial.crmLeads || [])) {
      if (!ids.includes(l.id)) continue;
      if (req.user.role === "vendedor" && l.vendedorId !== req.user.id) continue; // vendedor só mexe nos seus
      l.vendedorId = vid;
      l.vendedorNome = vid ? ((db.users.find((u) => u.id === vid) || {}).nome || "") : "";
      l.atualizadoEm = Date.now();
      n++;
    }
    salvar();
    res.json({ ok: true, alterados: n });
  });
  app.post("/api/oficial/crm/lote/excluir", auth, permiteVend("crm"), (req, res) => {
    garantirCRM();
    if (req.user.role === "vendedor") return res.status(403).json({ error: "Vendedor não pode excluir leads" });
    const ids = Array.isArray((req.body || {}).ids) ? req.body.ids : [];
    const antes = (db.oficial.crmLeads || []).length;
    db.oficial.crmLeads = (db.oficial.crmLeads || []).filter((l) => !ids.includes(l.id));
    salvar();
    res.json({ ok: true, excluidos: antes - db.oficial.crmLeads.length });
  });

  /* ============ LISTAS DE RESERVA (captação de leads por lançamento) ============
     Cada lista = um lançamento (curso + valor) com um link público /r/<slug>.
     A pessoa preenche → o lead cai no Pipeline (etapa "novo"), já com curso+valor,
     distribuído pro vendedor pela regra de % que já existe. Aguenta rajada porque
     a gravação do banco é síncrona/atômica (nunca corrompe) + anti-duplicado + anti-flood. */
  function slugReserva() {
    const abc = "abcdefghjkmnpqrstuvwxyz23456789";
    let s = ""; for (let i = 0; i < 7; i++) s += abc[Math.floor(Math.random() * abc.length)];
    return s;
  }
  function reservaPublica(l) {
    const qtd = (db.oficial.crmLeads || []).filter((x) => x.reservaId === l.id).length;
    return { id: l.id, nome: l.nome, curso: l.curso, tag: l.tag || "", opcoes: Array.isArray(l.opcoes) ? l.opcoes : [], destino: l.destino || "reserva", distribuir: l.distribuir === "manual" ? "manual" : "auto", slug: l.slug, ativa: l.ativa !== false, leads: qtd, criadoEm: l.criadoEm };
  }
  // Sanitiza as opções de pagamento (forma + preço), no máx 3
  function limparOpcoes(arr) {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((o) => ({ forma: String((o && o.forma) || "").trim().slice(0, 60), preco: parseFloat(o && o.preco) || 0 }))
      .filter((o) => o.forma || o.preco > 0)
      .slice(0, 3);
  }
  function distribuirReserva() {
    const v = escolherVendedor();
    if (!v) return { vendedorId: null, vendedorNome: "" };
    v.oficialLeadsRecebidos = (v.oficialLeadsRecebidos || 0) + 1;
    return { vendedorId: v.id, vendedorNome: v.nome };
  }
  function escHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---- Admin (gerente) ----
  app.get("/api/oficial/reserva", auth, gerenteOnly, (req, res) => {
    garantirEstrutura();
    res.json({ listas: (db.oficial.reservaListas || []).map(reservaPublica) });
  });
  app.post("/api/oficial/reserva", auth, gerenteOnly, (req, res) => {
    garantirEstrutura();
    const b = req.body || {};
    const nome = String(b.nome || "").trim().slice(0, 80);
    if (!nome) return res.status(400).json({ error: "Dê um nome à lista" });
    let slug; do { slug = slugReserva(); } while ((db.oficial.reservaListas || []).some((x) => x.slug === slug));
    const destino = etapasCRM().some((e) => e.k === b.destino) ? b.destino : (etapasCRM().some((e) => e.k === "reserva") ? "reserva" : (etapasCRM()[0] || {}).k);
    const lista = { id: proximoId("rsv"), nome, curso: String(b.curso || "").trim().slice(0, 120), tag: String(b.tag || "").trim().slice(0, 40), opcoes: limparOpcoes(b.opcoes), destino, distribuir: b.distribuir === "manual" ? "manual" : "auto", slug, ativa: true, criadoEm: Date.now() };
    db.oficial.reservaListas.push(lista);
    salvar();
    res.json({ ok: true, lista: reservaPublica(lista) });
  });
  app.put("/api/oficial/reserva/:id", auth, gerenteOnly, (req, res) => {
    garantirEstrutura();
    const l = (db.oficial.reservaListas || []).find((x) => x.id === req.params.id);
    if (!l) return res.status(404).json({ error: "Lista não encontrada" });
    const b = req.body || {};
    if (b.nome !== undefined) l.nome = String(b.nome).trim().slice(0, 80);
    if (b.curso !== undefined) l.curso = String(b.curso).trim().slice(0, 120);
    if (b.tag !== undefined) l.tag = String(b.tag).trim().slice(0, 40);
    if (b.opcoes !== undefined) l.opcoes = limparOpcoes(b.opcoes);
    if (b.destino !== undefined && etapasCRM().some((e) => e.k === b.destino)) l.destino = b.destino;
    if (b.distribuir !== undefined) l.distribuir = b.distribuir === "manual" ? "manual" : "auto";
    if (b.ativa !== undefined) l.ativa = !!b.ativa;
    salvar();
    res.json({ ok: true, lista: reservaPublica(l) });
  });
  app.delete("/api/oficial/reserva/:id", auth, gerenteOnly, (req, res) => {
    garantirEstrutura();
    db.oficial.reservaListas = (db.oficial.reservaListas || []).filter((x) => x.id !== req.params.id);
    salvar();
    res.json({ ok: true });
  });

  // ---- Público: recebe o lead (SEM login) ----
  const _rsvRate = new Map();
  function rsvRateOk(ip) {
    const agora = Date.now();
    const arr = (_rsvRate.get(ip) || []).filter((t) => agora - t < 60000);
    if (arr.length >= 25) { _rsvRate.set(ip, arr); return false; } // máx 25/min por IP
    arr.push(agora); _rsvRate.set(ip, arr);
    if (_rsvRate.size > 5000) _rsvRate.clear();
    return true;
  }
  app.post("/api/reserva/:slug", (req, res) => {
    garantirEstrutura(); garantirCRM();
    const lista = (db.oficial.reservaListas || []).find((x) => x.slug === req.params.slug);
    if (!lista || lista.ativa === false) return res.status(404).json({ error: "Lista indisponível" });
    const ip = String(req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim();
    if (!rsvRateOk(ip)) return res.status(429).json({ error: "Muitas tentativas seguidas. Aguarde um instante." });
    const b = req.body || {};
    const nome = String(b.nome || "").trim().slice(0, 80);
    const telefone = String(b.telefone || "").replace(/\D/g, "");
    const email = String(b.email || "").trim().slice(0, 120);
    if (!nome) return res.status(400).json({ error: "Informe seu nome" });
    if (telefone.length < 10 || telefone.length > 13) return res.status(400).json({ error: "WhatsApp inválido" });
    const ja = (db.oficial.crmLeads || []).find((x) => x.reservaId === lista.id && x.telefone === telefone);
    if (ja) return res.json({ ok: true, jaEstava: true }); // já está na lista, não duplica
    // opção de pagamento escolhida (forma + preço)
    const opcoes = Array.isArray(lista.opcoes) ? lista.opcoes : [];
    let idx = parseInt(b.opcao, 10);
    if (!(idx >= 0 && idx < opcoes.length)) {
      if (opcoes.length === 1) idx = 0;         // só tem 1 opção -> usa ela
      else if (opcoes.length === 0) idx = -1;   // lista sem opções -> sem valor
      else return res.status(400).json({ error: "Escolha uma opção de pagamento" });
    }
    const opc = idx >= 0 ? opcoes[idx] : null;
    const etapaDestino = etapasCRM().some((e) => e.k === lista.destino) ? lista.destino : (etapasCRM()[0] || {}).k;
    const dist = (lista.distribuir === "manual") ? { vendedorId: null, vendedorNome: "" } : distribuirReserva();
    const lead = {
      id: "lead_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      nome, telefone, email,
      curso: lista.curso,
      valor: opc ? opc.preco : 0,
      formaPagamento: opc ? opc.forma : "",
      etapa: etapaDestino,
      vendedorId: dist.vendedorId, vendedorNome: dist.vendedorNome,
      origem: "reserva", reservaId: lista.id, reservaNome: lista.nome,
      tags: [lista.tag || lista.nome].filter(Boolean),
      notas: [],
      historico: [{ tipo: "criado", texto: "Entrou pela lista de reserva: " + lista.nome + (opc ? (" — " + opc.forma) : ""), ts: Date.now() }],
      criadoEm: Date.now(), atualizadoEm: Date.now(),
    };
    db.oficial.crmLeads.unshift(lead);
    salvar();
    res.json({ ok: true });
  });

  app.post("/api/oficial/crm/vendedores", auth, gerenteOnly, (req, res) => {
    garantirCRM();
    const ids = Array.isArray((req.body || {}).ids) ? req.body.ids.filter((id) => db.users.some((u) => u.id === id && u.role === "vendedor")) : [];
    db.oficial.crmVendedores = ids;
    salvar();
    res.json({ ok: true, crmVendedores: ids });
  });

  // quando qualifica (ou callback): cria/atualiza a conversa e passa pro vendedor
  function finalizarLigacao(lig, ia) {
    lig.status = "finalizada";
    if (lig.classificacao === "qualificado") { try { criarLeadDaLigacao(lig); } catch (e) { console.error("[crm] criarLeadDaLigacao:", e.message); } }
    const resumo = lig.transcricao.map((t) => (t.role === "ia" ? "IA: " : "Lead: ") + t.content).join("\n");
    if (lig.classificacao === "qualificado" || lig.classificacao === "callback") {
      const numero = (db.oficial.numeros || []).find((n) => n.ativo) || (db.oficial.numeros || [])[0];
      if (numero) {
        const chave = "oficial::" + numero.id + "::" + lig.telefone;
        let chat = db.waChats[chave];
        if (!chat) chat = db.waChats[chave] = { canal: "oficial", numeroOficialId: numero.id, numero: lig.telefone, nome: lig.nome || lig.telefone, mensagens: [], criadoEm: Date.now() };
        chat.respondeu = true; chat.origemLigacao = true;
        if (!Array.isArray(chat.notas)) chat.notas = [];
        chat.notas.push({ tipo: "ligacao_ia", texto: `Ligação da IA — ${lig.classificacao === "qualificado" ? "QUALIFICOU o lead" : "lead pediu retorno"}.\n\n${resumo}`, ts: Date.now(), por: ia ? ia.nome : "IA" });
        chat.mensagens.push({ role: "them", content: `📞 [Ligação IA · ${lig.classificacao}] Resumo da conversa:\n${resumo}`, ts: Date.now(), tipo: "ligacao" });
        chat.atualizadoEm = Date.now();
        chat.naoLidas = (chat.naoLidas || 0) + 1;
        if (!chat.vendedorId) atribuirLead(chat);
      }
    }
    salvar();
  }

  // 1) dispara a ligação
  // helper reutilizável: dispara UMA ligação (usado no disparo único e no disparo em massa)
  async function dispararLigacaoTwilio({ telefone, nome, iaId, baseUrl, campId }) {
    garantirLigacoes();
    const sid = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN, from = process.env.TWILIO_NUMERO;
    if (!sid || !token || !from) return { erro: "Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_NUMERO no Railway." };
    const tel = String(telefone || "").replace(/\D/g, "");
    const ia = (db.oficial.ias || []).find((x) => x.id === String(iaId || "").trim());
    if (tel.length < 10) return { erro: "Telefone inválido" };
    if (!ia) return { erro: "IA inválida" };
    if (!ia.ativa) return { erro: `A IA "${ia.nome}" está desativada.` };
    const lig = { id: "lig_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), telefone: tel, nome: nome || "", iaId: ia.id, campId: campId || null, status: "discando", transcricao: [], classificacao: null, criadoEm: Date.now() };
    db.oficial.ligacoes.unshift(lig);
    if (db.oficial.ligacoes.length > 800) db.oficial.ligacoes = db.oficial.ligacoes.slice(0, 800);
    salvar();
    try {
      const to = tel.startsWith("55") ? "+" + tel : "+55" + tel;
      const body = new URLSearchParams({ To: to, From: from, Url: `${baseUrl}/api/oficial/ligacao/twiml/${lig.id}`, Method: "POST", StatusCallback: `${baseUrl}/api/oficial/ligacao/status/${lig.id}`, StatusCallbackMethod: "POST" });
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, { method: "POST", headers: { Authorization: "Basic " + Buffer.from(sid + ":" + token).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" }, body });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { lig.status = "erro"; lig.erro = (d && d.message) || ("Twilio erro " + r.status); salvar(); return { erro: lig.erro, lig }; }
      lig.callSid = d.sid; salvar();
      return { lig };
    } catch (e) { lig.status = "erro"; lig.erro = e.message; salvar(); return { erro: e.message, lig }; }
  }

  app.post("/api/oficial/ligacao/iniciar", auth, gerenteOnly, async (req, res) => {
    const b = req.body || {};
    const r = await dispararLigacaoTwilio({ telefone: b.telefone, nome: b.nome, iaId: b.iaId, baseUrl: baseUrlDe(req) });
    if (r.erro) return res.status(400).json({ error: r.erro });
    res.json({ ok: true, ligacaoId: r.lig.id });
  });

  /* ---- DISPARO EM MASSA DE LIGAÇÕES ---- */
  function garantirCampLig() { if (!Array.isArray(db.oficial.campLig)) db.oficial.campLig = []; }
  app.post("/api/oficial/ligacao/campanha", auth, gerenteOnly, (req, res) => {
    garantirCampLig();
    const b = req.body || {};
    const ia = (db.oficial.ias || []).find((x) => x.id === String(b.iaId || "").trim());
    if (!ia) return res.status(400).json({ error: "Escolha uma IA válida" });
    if (!ia.ativa) return res.status(400).json({ error: `A IA "${ia.nome}" está desativada.` });
    const vistos = new Set();
    const contatos = (Array.isArray(b.contatos) ? b.contatos : [])
      .map((c) => ({ telefone: String(c.telefone || "").replace(/\D/g, ""), nome: c.nome || "", status: "pendente" }))
      .filter((c) => { if (c.telefone.length < 10 || vistos.has(c.telefone)) return false; vistos.add(c.telefone); return true; });
    if (!contatos.length) return res.status(400).json({ error: "Nenhum telefone válido na lista." });
    const intervalo = Math.max(15, parseInt(b.intervalo) || 45);
    const camp = { id: "campl_" + Date.now().toString(36), nome: b.nome || "Campanha de ligação", iaId: ia.id, intervalo, baseUrl: baseUrlDe(req), fila: contatos, status: "rodando", criadoEm: Date.now(), ultimaEm: 0 };
    db.oficial.campLig.unshift(camp);
    salvar();
    res.json({ ok: true, campanhaId: camp.id, total: contatos.length });
  });
  app.get("/api/oficial/ligacao/campanhas", auth, gerenteOnly, (req, res) => {
    garantirCampLig();
    res.json((db.oficial.campLig || []).slice(0, 50).map((c) => ({
      id: c.id, nome: c.nome, status: c.status, intervalo: c.intervalo,
      total: c.fila.length, feitas: c.fila.filter((x) => x.status !== "pendente").length,
      criadoEm: c.criadoEm,
    })));
  });
  app.post("/api/oficial/ligacao/campanha/:id/pausar", auth, gerenteOnly, (req, res) => {
    garantirCampLig();
    const c = (db.oficial.campLig || []).find((x) => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: "Campanha não encontrada" });
    c.status = c.status === "rodando" ? "pausada" : "rodando";
    salvar();
    res.json({ ok: true, status: c.status });
  });
  // agendador: dispara a próxima ligação de cada campanha rodando, respeitando o intervalo
  setInterval(async () => {
    try {
      garantirCampLig();
      const agora = Date.now();
      for (const c of (db.oficial.campLig || [])) {
        if (c.status !== "rodando") continue;
        const pend = c.fila.find((x) => x.status === "pendente");
        if (!pend) { c.status = "concluida"; salvar(); continue; }
        if (agora - (c.ultimaEm || 0) < c.intervalo * 1000) continue;
        c.ultimaEm = agora; pend.status = "ligando"; salvar();
        const r = await dispararLigacaoTwilio({ telefone: pend.telefone, nome: pend.nome, iaId: c.iaId, baseUrl: c.baseUrl, campId: c.id });
        pend.status = r.erro ? "erro" : "ligou";
        if (r.erro) pend.erro = r.erro;
        salvar();
      }
    } catch (e) { console.error("[campLig] agendador:", e.message); }
  }, 5000);

  // 2) TwiML inicial (o lead atendeu) — a IA dá a primeira fala
  app.post("/api/oficial/ligacao/twiml/:id", async (req, res) => {
    garantirLigacoes();
    res.set("Content-Type", "text/xml");
    const lig = (db.oficial.ligacoes || []).find((x) => x.id === req.params.id);
    if (!lig) return res.send(`<Response><Say ${VOZ_TW}>Desculpe, houve um erro.</Say><Hangup/></Response>`);
    const ia = (db.oficial.ias || []).find((x) => x.id === lig.iaId);
    lig.status = "em_conversa"; salvar();
    let fala = "Alô! Tudo bem?";
    try { if (ia) { const r = await falaDaIA(lig, ia); fala = r.fala || fala; if (r.classe) lig.classificacao = r.classe; } } catch (e) { console.error("[ligacao] twiml:", e.message); }
    lig.transcricao.push({ role: "ia", content: fala, ts: Date.now() }); salvar();
    res.send(await gatherXml(baseUrlDe(req), lig.id, fala, ia && ia.voiceId));
  });

  // 3) recebe a fala do lead e responde (loop)
  app.post("/api/oficial/ligacao/resposta/:id", async (req, res) => {
    garantirLigacoes();
    res.set("Content-Type", "text/xml");
    const lig = (db.oficial.ligacoes || []).find((x) => x.id === req.params.id);
    if (!lig) return res.send("<Response><Hangup/></Response>");
    const ia = (db.oficial.ias || []).find((x) => x.id === lig.iaId);
    const fala = String((req.body && req.body.SpeechResult) || "").trim();
    const base = baseUrlDe(req);
    if (fala) { lig.transcricao.push({ role: "lead", content: fala, ts: Date.now() }); lig._vazios = 0; }
    else { lig._vazios = (lig._vazios || 0) + 1; }
    if (lig._vazios >= 2) { lig.status = "sem_resposta"; salvar(); return res.send(`<Response>${await vozTag(base, "Parece que não consigo te ouvir bem. Vou encerrar e a gente se fala pelo WhatsApp. Até logo!", ia && ia.voiceId)}<Hangup/></Response>`); }
    if (!fala) { salvar(); return res.send(`<Response>${await vozTag(base, "Ainda está aí?", ia && ia.voiceId)}<Gather input="speech" language="pt-BR" speechTimeout="auto" action="${base}/api/oficial/ligacao/resposta/${lig.id}" method="POST"></Gather><Redirect method="POST">${base}/api/oficial/ligacao/resposta/${lig.id}?vazio=1</Redirect></Response>`); }
    let r;
    try { r = await falaDaIA(lig, ia); } catch (e) { r = { fala: "Tive um probleminha na conexão. Um consultor vai te chamar no WhatsApp, tá? Obrigado!", classe: "callback" }; }
    lig.transcricao.push({ role: "ia", content: r.fala, ts: Date.now() });
    if (r.classe) lig.classificacao = r.classe;
    salvar();
    if (r.classe) { finalizarLigacao(lig, ia); return res.send(`<Response>${await vozTag(base, r.fala, ia && ia.voiceId)}<Hangup/></Response>`); }
    res.send(await gatherXml(base, lig.id, r.fala, ia && ia.voiceId));
  });

  // 4) status final (Twilio avisa quando termina)
  app.post("/api/oficial/ligacao/status/:id", (req, res) => {
    garantirLigacoes();
    const lig = (db.oficial.ligacoes || []).find((x) => x.id === req.params.id);
    if (lig) {
      const st = String((req.body && req.body.CallStatus) || "");
      lig.duracao = parseInt((req.body && req.body.CallDuration) || "0") || 0;
      if (["completed", "busy", "no-answer", "failed", "canceled"].includes(st)) {
        if (st === "no-answer") lig.status = "nao_atendeu";
        else if (st === "busy") lig.status = "ocupado";
        else if (st === "failed" || st === "canceled") lig.status = st;
        else if (lig.status !== "finalizada" && lig.status !== "sem_resposta") lig.status = "finalizada";
      }
      salvar();
    }
    res.sendStatus(200);
  });

  // 5) lista as ligações (histórico + transcrição)
  app.get("/api/oficial/ligacoes", auth, gerenteOnly, (req, res) => {
    garantirLigacoes();
    res.json((db.oficial.ligacoes || []).slice(0, 100).map((l) => ({
      id: l.id, telefone: l.telefone, nome: l.nome, status: l.status,
      classificacao: l.classificacao, duracao: l.duracao || 0, criadoEm: l.criadoEm,
      transcricao: l.transcricao || [], erro: l.erro || null,
    })));
  });

  // medidor de custo estimado das ligações (duração × R$/min, ajustável)
  app.get("/api/oficial/ligacao/custo", auth, gerenteOnly, (req, res) => {
    garantirLigacoes();
    const rate = db.oficial.custoPorMin != null ? db.oficial.custoPorMin : 3;
    const agora = new Date();
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).getTime();
    const calc = (desde) => {
      const ligs = (db.oficial.ligacoes || []).filter((l) => l.criadoEm >= desde && (l.duracao || 0) > 0);
      const seg = ligs.reduce((s, l) => s + (l.duracao || 0), 0);
      const min = seg / 60;
      return { ligacoes: ligs.length, minutos: Math.round(min * 10) / 10, custo: Math.round(min * rate * 100) / 100 };
    };
    res.json({ custoPorMin: rate, hoje: calc(inicioHoje), mes: calc(inicioMes), total: calc(0) });
  });
  app.post("/api/oficial/ligacao/custo", auth, gerenteOnly, (req, res) => {
    const r = parseFloat((req.body || {}).custoPorMin);
    if (!isNaN(r) && r >= 0) { db.oficial.custoPorMin = r; salvar(); }
    res.json({ ok: true, custoPorMin: db.oficial.custoPorMin != null ? db.oficial.custoPorMin : 3 });
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

  /* ================= BASE DE CONHECIMENTO (RAG) da IA =================
     Anexa documentos (docx/pdf/txt), extrai o texto, quebra em pedaços,
     gera embeddings e guarda num arquivo separado por IA. Na hora de responder,
     a IA busca só os trechos mais relevantes daquela conversa. */
  const KB_DIR = MEDIA_DIR ? path.join(MEDIA_DIR, "ia_kb") : null;
  function kbPath(iaId) { return KB_DIR ? path.join(KB_DIR, "ia_" + iaId + ".json") : null; }
  function kbLer(iaId) {
    try { const p = kbPath(iaId); if (p && fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8")); } catch (_) {}
    return { chunks: [] };
  }
  function kbSalvar(iaId, kb) {
    try {
      if (!KB_DIR) return;
      if (!fs.existsSync(KB_DIR)) fs.mkdirSync(KB_DIR, { recursive: true });
      fs.writeFileSync(kbPath(iaId), JSON.stringify(kb));
    } catch (e) { console.error("kbSalvar:", e.message); }
  }
  async function extrairTextoDoc(nome, buf) {
    const lower = String(nome || "").toLowerCase();
    if (lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".csv") || lower.endsWith(".text")) {
      return buf.toString("utf8");
    }
    if (lower.endsWith(".pdf")) {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: true, isEvalSupported: false }).promise;
      let texto = ""; const maxPag = Math.min(doc.numPages, 400);
      for (let i = 1; i <= maxPag; i++) { const page = await doc.getPage(i); const c = await page.getTextContent(); texto += c.items.map((it) => it.str).join(" ") + "\n"; }
      return texto;
    }
    if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
      const { createRequire } = await import("module");
      const mammoth = createRequire(import.meta.url)("mammoth");
      const r = await mammoth.extractRawText({ buffer: buf });
      return String(r.value || "");
    }
    throw new Error("Formato não suportado (use PDF, DOCX, TXT, MD ou CSV)");
  }
  function chunkTexto(texto, tam = 1600, over = 200) {
    const limpo = String(texto).replace(/\r/g, "").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    const chunks = []; let i = 0;
    while (i < limpo.length) {
      let fim = Math.min(i + tam, limpo.length);
      if (fim < limpo.length) {
        const janela = limpo.slice(i, fim);
        const corte = Math.max(janela.lastIndexOf("\n"), janela.lastIndexOf(". "), janela.lastIndexOf("! "), janela.lastIndexOf("? "));
        if (corte > tam * 0.5) fim = i + corte + 1;
      }
      const pedaco = limpo.slice(i, fim).trim();
      if (pedaco.length > 30) chunks.push(pedaco);
      const prox = fim - over;
      i = prox > i ? prox : fim;
    }
    return chunks;
  }
  async function embeddar(textos) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY não configurada");
    const out = [];
    for (let i = 0; i < textos.length; i += 96) {
      const lote = textos.slice(i, i + 96);
      const r = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
        body: JSON.stringify({ model: "text-embedding-3-small", input: lote, dimensions: 512 }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((d.error && d.error.message) || ("Erro embeddings " + r.status));
      (d.data || []).forEach((x) => out.push(x.embedding));
    }
    return out;
  }
  function cosseno(a, b) {
    let dot = 0, na = 0, nb = 0;
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
  }
  // devolve os trechos mais relevantes da base pra conversa (string pronta pro prompt)
  async function buscarConhecimento(ia, chat) {
    try {
      if (!ia || !ia.docs || !ia.docs.length) return "";
      const kb = kbLer(ia.id);
      if (!kb.chunks || !kb.chunks.length) return "";
      const ultimas = (chat.mensagens || []).filter((m) => m.role === "them").slice(-3)
        .map((m) => m.transcricao || m.content || "").join("\n").trim();
      const consulta = (ultimas || (chat.mensagens || []).slice(-3).map((m) => m.content || "").join("\n")).trim();
      if (!consulta) return "";
      const [q] = await embeddar([consulta.slice(0, 2000)]);
      const rank = kb.chunks.map((c) => ({ texto: c.texto, s: cosseno(q, c.emb) }))
        .sort((a, b) => b.s - a.s).slice(0, 8);
      return rank.map((r, i) => `[Trecho ${i + 1}]\n${r.texto}`).join("\n\n");
    } catch (e) { console.error("buscarConhecimento:", e.message); return ""; }
  }

  // ---- anexa um documento à base de conhecimento da IA ----
  app.post("/api/oficial/ias/:id/docs", auth, gerenteOnly, async (req, res) => {
    const ia = (db.oficial.ias || []).find((x) => x.id === req.params.id);
    if (!ia) return res.status(404).json({ error: "IA não encontrada" });
    const b = req.body || {};
    const nome = String(b.nome || "documento").trim();
    const base64 = String(b.base64 || "");
    if (!base64) return res.status(400).json({ error: "Arquivo vazio" });
    let buf; try { buf = Buffer.from(base64, "base64"); } catch (_) { return res.status(400).json({ error: "Arquivo inválido" }); }
    if (buf.length > 20 * 1024 * 1024) return res.status(400).json({ error: "Arquivo passa de 20MB" });
    try {
      const texto = await extrairTextoDoc(nome, buf);
      if (!texto || texto.trim().length < 20) return res.status(422).json({ error: "Não consegui ler texto (pode ser PDF escaneado/imagem)." });
      const pedacos = chunkTexto(texto);
      if (!pedacos.length) return res.status(422).json({ error: "Documento sem conteúdo aproveitável." });
      const embs = await embeddar(pedacos);
      const docId = "doc_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const kb = kbLer(ia.id);
      pedacos.forEach((t, i) => kb.chunks.push({ docId, texto: t, emb: embs[i] }));
      kbSalvar(ia.id, kb);
      if (!Array.isArray(ia.docs)) ia.docs = [];
      const doc = { id: docId, nome, tamanho: buf.length, nChunks: pedacos.length, criadoEm: Date.now() };
      ia.docs.push(doc);
      salvar();
      console.log(`[oficial] IA ${ia.nome}: doc "${nome}" indexado (${pedacos.length} trechos)`);
      res.json({ ok: true, doc });
    } catch (e) {
      console.error("upload doc IA:", e.message);
      res.status(500).json({ error: "Não consegui processar: " + e.message });
    }
  });
  app.get("/api/oficial/ias/:id/docs", auth, gerenteOnly, (req, res) => {
    const ia = (db.oficial.ias || []).find((x) => x.id === req.params.id);
    if (!ia) return res.status(404).json({ error: "IA não encontrada" });
    res.json({ docs: ia.docs || [], totalChunks: (ia.docs || []).reduce((s, d) => s + (d.nChunks || 0), 0) });
  });
  app.delete("/api/oficial/ias/:id/docs/:docId", auth, gerenteOnly, (req, res) => {
    const ia = (db.oficial.ias || []).find((x) => x.id === req.params.id);
    if (!ia) return res.status(404).json({ error: "IA não encontrada" });
    const kb = kbLer(ia.id);
    kb.chunks = (kb.chunks || []).filter((c) => c.docId !== req.params.docId);
    kbSalvar(ia.id, kb);
    ia.docs = (ia.docs || []).filter((d) => d.id !== req.params.docId);
    salvar();
    res.json({ ok: true });
  });





  // dia no fuso do Brasil (-3), pra o limite virar à meia-noite daqui (não à meia-noite UTC)
  function diaBR(ts) {
    const d = new Date((ts || 0) - 3 * 3600000);
    return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
  }
  // quanto o vendedor já disparou num dia e qual o limite dele
  function limiteInfo(vendedor, diaAlvo) {
    const dia = diaAlvo || diaBR(Date.now());
    const usado = (db.oficial.campanhas || [])
      .filter((c) => c.criadoPor === vendedor.id && c.status !== "cancelada" && diaBR(c.agendadoPara || c.criadoEm || 0) === dia)
      .reduce((s, c) => s + (c.total || 0), 0);
    const base = (typeof vendedor.limiteDisparoDia === "number") ? vendedor.limiteDisparoDia : 100;
    const bonus = (vendedor.disparoBonus && vendedor.disparoBonus.data === dia) ? (vendedor.disparoBonus.qtd || 0) : 0;
    const limite = base + bonus;
    return { usado, base, bonus, limite, restante: Math.max(0, limite - usado) };
  }

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

    // AGENDAMENTO: se vier "agendarPara" (ms) no futuro, a campanha só dispara naquela hora
    let agendadoPara = parseInt(b.agendarPara) || 0;
    if (agendadoPara && agendadoPara < Date.now() + 30000) agendadoPara = 0; // no passado/agora -> dispara já
    if (agendadoPara && agendadoPara > Date.now() + 366 * 86400000) {
      return res.status(400).json({ error: "Data de agendamento muito longe (máx. 1 ano)" });
    }

    // LIMITE DIÁRIO por vendedor (gerente não tem limite). Conta no DIA em que vai disparar.
    if (req.user.role === "vendedor") {
      const diaAlvo = diaBR(agendadoPara || Date.now());
      const info = limiteInfo(req.user, diaAlvo);
      if (info.usado + contatos.length > info.limite) {
        const quando = agendadoPara ? "nesse dia" : "hoje";
        return res.status(403).json({
          error: `Limite diário atingido: você já tem ${info.usado} de ${info.limite} disparos ${quando} e tentou somar mais ${contatos.length}. Peça pro gerente liberar mais.`,
          limiteAtingido: true, usado: info.usado, limite: info.limite, restante: info.restante,
        });
      }
    }

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
      // pra onde vão os leads que responderem: "eu" (fica com quem disparou) ou "time" (distribui)
      destinoLeads: b.destinoLeads === "time" ? "time" : "eu",
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
      pularRecebidos: b.pularRecebidos === true,
      agendadoPara: agendadoPara || null,               // ms de quando vai disparar (null = agora)
      status: agendadoPara ? "agendada" : "rodando",    // agendada | rodando | concluida | parada
      criadoEm: Date.now(),
    };
    db.oficial.campanhas.unshift(campanha);
    salvar();

    // AGENDADA: não dispara agora — o agendador dispara na hora certa
    if (agendadoPara) {
      res.json({ ok: true, campanhaId: campanha.id, total: contatos.length, agendadoPara });
      console.log(`[oficial] campanha AGENDADA "${campanha.nome}" p/ ${new Date(agendadoPara).toISOString()}`);
      return;
    }

    // responde já e dispara em background (não trava a tela)
    res.json({ ok: true, campanhaId: campanha.id, total: contatos.length });
    dispararCampanhaAgora(campanha);
  });

  // ---- inicia (ou dispara na hora agendada) uma campanha: pula recebidos + consome a fila ----
  function dispararCampanhaAgora(campanha) {
    const numeroCfg = acharNumero(campanha.numeroId);
    if (!numeroCfg) { campanha.status = "erro"; campanha.ultimoErro = "Número não existe mais"; salvar(); return; }
    campanha.status = "rodando";
    campanha.iniciadoEm = Date.now();
    // OPÇÃO "pular quem já recebeu": remove da fila quem já recebeu esse disparo nesse número
    if (campanha.pularRecebidos) {
      const jaReceberam = new Set();
      for (const ch of Object.values(db.waChats || {})) {
        if (ch && ch.canal === "oficial" && ch.numeroOficialId === numeroCfg.id && ch.origemDisparo) {
          const tel = normalizaTelefone(ch.numero);
          if (tel && (ch.mensagens || []).some((m) => m.role === "me" && m.template)) jaReceberam.add(tel);
        }
      }
      const antes = (campanha.pendentes || []).length;
      campanha.pendentes = (campanha.pendentes || []).filter((c) => {
        const tel = normalizaTelefone(c.telefone);
        return tel && !jaReceberam.has(tel);
      });
      campanha.total = campanha.pendentes.length;
      console.log(`[oficial] ${campanha.nome}: ${antes - campanha.pendentes.length} pulados (já receberam)`);
    }
    salvar();
    // processa a fila salva (sobrevive a reinício -> dá pra retomar)
    processarFilaCampanha(campanha.id, numeroCfg);
  }

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
        // Se a campanha foi criada como "os leads ficam comigo", carimba o dono da conversa
        // como o remetente. Como atribuirLead() respeita dono já existente, a resposta (e um
        // eventual repasse da IA) continua com ele, sem cair na distribuição pro time.
        // Se foi "distribuir pro time", NÃO carimba: aí o rodízio decide quando a pessoa responder.
        if (campanha.destinoLeads !== "time" && !chat.vendedorId && campanha.criadoPor) {
          chat.vendedorId = campanha.criadoPor;
          chat.vendedorNome = campanha.criadoPorNome || "";
          chat.atribuidoEm = Date.now();
        }
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

  /* Números que EU posso usar pra iniciar conversa (os meus + os sem dono) */
  app.get("/api/oficial/meus-numeros", auth, (req, res) => {
    garantirEstrutura();
    const lista = (db.oficial.numeros || []).filter((n) => {
      if (n.ativo === false) return false;
      if (!tokenDe(n)) return false;
      if (req.user.role === "gerente") return true;
      return !n.vendedorId || n.vendedorId === req.user.id;
    });
    res.json({ numeros: lista.map(numeroPublico) });
  });

  /* Enviar UM template pra um número — inicia a conversa oficial a partir do lead */
  app.post("/api/oficial/enviar-template", auth, async (req, res) => {
    garantirEstrutura();
    const b = req.body || {};
    const numeroCfg = acharNumero(b.numeroId);
    if (!numeroCfg) return res.status(404).json({ error: "Número não encontrado" });
    if (req.user.role === "vendedor" && numeroCfg.vendedorId && numeroCfg.vendedorId !== req.user.id) {
      return res.status(403).json({ error: "Esse número não é seu" });
    }
    const telefone = normalizaTelefone(b.telefone);
    if (!telefone) return res.status(400).json({ error: "Telefone inválido" });
    const template = String(b.template || "").trim();
    if (!template) return res.status(400).json({ error: "Escolha um template" });
    const idioma = String(b.idioma || "pt_BR");
    const nome = String(b.nome || "").trim() || telefone;
    try {
      const resp = await enviarTemplate(numeroCfg, telefone, template, idioma, b.variaveis || []);
      const mid = resp && resp.messages && resp.messages[0] && resp.messages[0].id;
      const chat = acharOuCriarChat(numeroCfg.id, telefone, nome);
      if (!chat.vendedorId) { chat.vendedorId = req.user.id; chat.vendedorNome = req.user.nome; chat.atribuidoEm = Date.now(); }
      chat.iaPausada = true; // conversa iniciada por humano
      const ts = Date.now();
      chat.mensagens.push({ role: "me", content: `[template] ${template}`, ts, template: true });
      chat.atualizadoEm = ts;
      salvar();
      res.json({ ok: true, chatId: chat.id });
    } catch (e) {
      res.status(400).json({ error: (e && e.message) || "Falha ao enviar template" });
    }
  });

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

  // monta um CSV (pt-BR: separador ; e BOM pros acentos abrirem no Excel)
  function montarCSV(linhas) {
    return "\ufeff" + linhas.map((r) => r.map((c) => `"${String(c == null ? "" : c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  }
  function ultimaMsgTxt(ch) {
    const ult = ch.mensagens && ch.mensagens.length ? ch.mensagens[ch.mensagens.length - 1] : null;
    if (!ult) return "";
    const t = ult.content || (ult.tipo && ult.tipo !== "text" ? "[" + ult.tipo + "]" : "");
    return String(t).replace(/[\r\n;]+/g, " ").slice(0, 150);
  }

  // EXPORTA os leads de UMA campanha (dono da campanha ou gerente) — CSV
  app.get("/api/oficial/campanhas/:id/leads", (req, res) => {
    const t = String(req.query.token || (req.headers.authorization || "").replace("Bearer ", "")).trim();
    const user = (db.users || []).find((u) => u.token && u.token === t);
    if (!user || !user.ativo) return res.status(401).send("Não autorizado");
    const camp = (db.oficial.campanhas || []).find((c) => c.id === req.params.id);
    if (!camp) return res.status(404).send("Campanha não encontrada");
    if (!campanhaDoUsuario({ user }, camp)) return res.status(403).send("Sem acesso a essa campanha");
    const linhas = [["Telefone", "Nome", "Respondeu", "Ultima mensagem", "Data/hora"]];
    for (const ch of Object.values(db.waChats || {})) {
      if (ch && ch.canal === "oficial" && ch.campanhaId === camp.id) {
        const ult = ch.mensagens && ch.mensagens.length ? ch.mensagens[ch.mensagens.length - 1] : null;
        linhas.push([ch.numero || "", ch.nome || "", ch.respondeu ? "Sim" : "Não", ultimaMsgTxt(ch), ult && ult.ts ? new Date(ult.ts).toLocaleString("pt-BR") : ""]);
      }
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="leads_${String(camp.nome || "campanha").replace(/[^a-z0-9]/gi, "_").slice(0, 40)}.csv"`);
    res.send(montarCSV(linhas));
  });

  // EXPORTA todos os leads dos disparos do usuário (vendedor = os dele; gerente = todos) — CSV
  app.get("/api/oficial/meus-leads", (req, res) => {
    const t = String(req.query.token || (req.headers.authorization || "").replace("Bearer ", "")).trim();
    const user = (db.users || []).find((u) => u.token && u.token === t);
    if (!user || !user.ativo) return res.status(401).send("Não autorizado");
    const ehGerente = user.role === "gerente";
    const campById = {};
    for (const c of db.oficial.campanhas || []) campById[c.id] = c;
    const linhas = [["Telefone", "Nome", "Campanha", "Respondeu", "Ultima mensagem", "Data/hora"]];
    for (const ch of Object.values(db.waChats || {})) {
      if (!ch || ch.canal !== "oficial" || !ch.origemDisparo || !ch.campanhaId) continue;
      const camp = campById[ch.campanhaId];
      if (!camp) continue;
      const meu = ehGerente || camp.criadoPor === user.id || (acharNumero(camp.numeroId) || {}).vendedorId === user.id;
      if (!meu) continue;
      const ult = ch.mensagens && ch.mensagens.length ? ch.mensagens[ch.mensagens.length - 1] : null;
      linhas.push([ch.numero || "", ch.nome || "", camp.nome || "", ch.respondeu ? "Sim" : "Não", ultimaMsgTxt(ch), ult && ult.ts ? new Date(ult.ts).toLocaleString("pt-BR") : ""]);
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="meus_leads_disparados.csv"');
    res.send(montarCSV(linhas));
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
    // filtro por data (de/ate em ms) — pro filtro de dia da tela
    const de = parseInt(req.query.de) || 0;
    const ate = parseInt(req.query.ate) || 0;
    if (de || ate) {
      campanhas = campanhas.filter((c) => (!de || (c.criadoEm || 0) >= de) && (!ate || (c.criadoEm || 0) <= ate));
    }
    // mais recentes primeiro
    campanhas = campanhas.slice().sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
    const limite = (de || ate) ? 500 : 50;
    // não manda a lista enorme de pendentes pro front — só a contagem, pra mostrar o botão Retomar
    const lista = campanhas.slice(0, limite).map((c) => {
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
    // filtro por campanha (ex: ver só as conversas do disparo que EU fiz)
    if (req.query.campanhaId && req.query.campanhaId !== "todas") {
      chats = chats.filter((c) => c.campanhaId === req.query.campanhaId);
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
        // última mensagem do LEAD (role them) -> base da janela de 24h (renova quando ele fala)
        let ultimaEntrada = 0;
        if (c.mensagens) { for (let i = c.mensagens.length - 1; i >= 0; i--) { if (c.mensagens[i].role === "them") { ultimaEntrada = c.mensagens[i].ts || 0; break; } } }
        const v = c.vendedorId ? db.users.find((u) => u.id === c.vendedorId) : null;
        const camp = c.campanhaId ? (db.oficial.campanhas || []).find((x) => x.id === c.campanhaId) : null;
        return {
          id: c.id,
          numero: c.numero,
          nome: c.nome,
          naoLidas: c.naoLidas || 0,
          atualizadoEm: c.atualizadoEm || 0,
          ultimaEntrada, // ts da última msg do lead (pra janela de 24h)
          origemDisparo: !!c.origemDisparo,
          campanha: c.campanha || "",
          campanhaId: c.campanhaId || null,
          campanhaNome: camp ? camp.nome : "",
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
      iaUltimoErro: chat.iaUltimoErro || null,
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
      const resp = await enviarTextoOficial(numeroCfg, chat.numero, texto);
      const ts = Date.now();
      const wamid = resp && resp.messages && resp.messages[0] && resp.messages[0].id;
      chat.mensagens.push({ role: "me", content: texto, ts, wamid: wamid || null, status: "sent" });
      if (wamid) { if (!db.oficial.wamidChat) db.oficial.wamidChat = {}; db.oficial.wamidChat[wamid] = chat.id; }
      if (chat.iaId && !chat.iaPausada) chat.iaPausada = true; // humano assumiu -> IA pausa sozinha
      if (chat.mensagens.length > 300) chat.mensagens = chat.mensagens.slice(-300);
      chat.atualizadoEm = ts;
      salvar();
      res.json({ ok: true });
    } catch (e) {
      // erro típico: janela de 24h fechada (precisa de template)
      const m = String((e && e.message) || "");
      if (/131047|24 hours|24h|re-?engagement/i.test(m)) {
        return res.status(400).json({ error: "Esse contato ainda não respondeu (ou passou das 24h). O WhatsApp só entrega template aprovado agora — use o botão Enviar template." });
      }
      res.status(400).json({ error: m || "Falha ao enviar" });
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
      const respMidia = await enviarMidiaOficial(numeroCfg, chat.numero, tipo, mediaId, caption, filename);
      const wamidMidia = respMidia && respMidia.messages && respMidia.messages[0] && respMidia.messages[0].id;
      const ts = Date.now();
      // salva o arquivo enviado no volume TAMBÉM, pra conseguir EXIBIR de volta na conversa
      let arquivoSalvo = null;
      try {
        if (MEDIA_DIR && fs && path) {
          const ext = extPorMime(mime);
          arquivoSalvo = "of_out_" + ts + "_" + Math.random().toString(36).slice(2, 8) + "." + ext;
          fs.writeFileSync(path.join(MEDIA_DIR, arquivoSalvo), buffer);
        }
      } catch (_) { arquivoSalvo = null; }
      const rotulo = tipo === "image" ? "📷 Foto" : tipo === "audio" ? "🎤 Áudio" : tipo === "video" ? "🎬 Vídeo" : "📄 " + filename;
      const msgObj = { role: "me", content: caption || "", ts, wamid: wamidMidia || null, status: "sent" };
      if (arquivoSalvo) {
        // mesmo esquema da mídia recebida -> renderiza igual (imagem/vídeo/áudio/doc)
        msgObj.tipo = tipo;
        msgObj.arquivo = arquivoSalvo;
        msgObj.mimetype = mime;
        msgObj.filename = filename;
        msgObj.mid = "ofout" + ts + Math.random().toString(36).slice(2, 6);
        if (tipo === "document") msgObj.content = caption || filename;
      } else {
        // não deu pra salvar -> mantém o rótulo de texto (fallback antigo)
        msgObj.content = caption ? rotulo + ": " + caption : rotulo;
        msgObj.midia = { tipo, mediaId, filename, mime };
      }
      chat.mensagens.push(msgObj);
      if (wamidMidia) { if (!db.oficial.wamidChat) db.oficial.wamidChat = {}; db.oficial.wamidChat[wamidMidia] = chat.id; }
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
          // QUALIDADE do número mudou (a Meta avisa quando sobe/cai) -> re-puxa de todos
          if (ch.field === "phone_number_quality_update") {
            console.log("[oficial] webhook de QUALIDADE recebido:", JSON.stringify(val).slice(0, 180));
            try { await atualizarQualidadeTodos(); } catch (_) {}
            continue;
          }
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
            else if (m.type === "sticker") {
              content = "[figurinha]";
              midiaTipo = "image"; mediaIdMeta = m.sticker && m.sticker.id;
            }
            else if (m.type === "reaction") {
              const emoji = (m.reaction && m.reaction.emoji) || "";
              content = emoji ? ("reagiu com " + emoji) : "removeu a reação";
            }
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
            // se a conversa ainda não tem IA mas o NÚMERO tem uma IA padrão, atribui ela
            if (!chat.iaId && numeroCfg.iaId) {
              const iaPadrao = (db.oficial.ias || []).find((x) => x.id === numeroCfg.iaId && x.ativa);
              if (iaPadrao) { chat.iaId = numeroCfg.iaId; chat.iaPausada = false; }
            }
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
            // --- pauzinhos: atualiza o status da mensagem individual (enviado/entregue/lido) ---
            const chatIdMsg = db.oficial.wamidChat && db.oficial.wamidChat[mid];
            if (chatIdMsg && db.waChats[chatIdMsg]) {
              const msg = (db.waChats[chatIdMsg].mensagens || []).find((x) => x.wamid === mid);
              if (msg) {
                const ordem = { sent: 1, delivered: 2, read: 3 };
                if (st.status === "failed") msg.status = "failed";
                else if ((ordem[st.status] || 0) > (ordem[msg.status] || 0)) msg.status = st.status;
              }
            }
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
  // (as AGENDADAS ficam de fora — quem cuida delas é o agendador abaixo)
  setTimeout(() => {
    const pendentes = (db.oficial.campanhas || []).filter((c) => c.pendentes && c.pendentes.length > 0 && c.status !== "parada" && c.status !== "agendada");
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

  // AGENDADOR: dispara as campanhas agendadas quando a hora chega (checa a cada 20s).
  // Roda no servidor e é confiável: as campanhas ficam salvas no banco, então mesmo
  // que o servidor reinicie, elas disparam na hora certa — e se ele estava fora na
  // hora marcada, dispara assim que voltar (agendadoPara <= agora).
  setInterval(() => {
    try {
      const agora = Date.now();
      for (const camp of db.oficial.campanhas || []) {
        if (camp.status === "agendada" && !camp._rodando && camp.agendadoPara && camp.agendadoPara <= agora) {
          console.log(`[oficial] AGENDAMENTO disparando "${camp.nome}" (marcado p/ ${new Date(camp.agendadoPara).toISOString()})`);
          dispararCampanhaAgora(camp);
        }
      }
    } catch (e) { console.error("[oficial] agendador erro:", e.message); }
  }, 20000);

  // QUALIDADE dos números: atualiza de tempos em tempos (a cada 3h) e uma vez logo ao subir.
  // Assim o rating (Alta/Média/Baixa) e o limite ficam sempre atualizados no sistema,
  // mesmo sem o webhook de qualidade estar ligado.
  setTimeout(() => { atualizarQualidadeTodos().catch(() => {}); }, 15000);
  setInterval(() => { atualizarQualidadeTodos().catch(() => {}); }, 3 * 3600000);

  // devolve a função de init pro index chamar DEPOIS do loadDB()
  return { garantirEstrutura };
}
