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

  /* ============================================================
     ENVIO via Cloud API
     ============================================================ */
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

  app.post("/api/oficial/numeros", auth, gerenteOnly, (req, res) => {
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
    salvar();
    res.json(numeroPublico(novo));
  });

  app.put("/api/oficial/numeros/:id", auth, gerenteOnly, (req, res) => {
    const n = acharNumero(req.params.id);
    if (!n) return res.status(404).json({ error: "Número não encontrado" });
    const b = req.body || {};
    if (b.apelido !== undefined) n.apelido = String(b.apelido).trim();
    if (b.numero !== undefined) n.numero = String(b.numero).trim();
    if (b.phoneNumberId !== undefined) n.phoneNumberId = String(b.phoneNumberId).trim();
    if (b.wabaId !== undefined) n.wabaId = String(b.wabaId).trim();
    if (b.token !== undefined && b.token) n.token = String(b.token).trim();
    if (b.ativo !== undefined) n.ativo = !!b.ativo;
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

    const campanha = {
      id: proximoId("camp"),
      nome: String(b.nomeCampanha || templateName).trim(),
      numeroId: numeroCfg.id,
      template: templateName,
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
          chat.respondeu = false; // ainda não respondeu
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
    if (req.user.role !== "gerente") {
      // vendedor: só os atribuídos a ele E que o lead já respondeu
      // (conversa de disparo sem resposta fica invisível pro vendedor)
      chats = chats.filter((c) => c.vendedorId === req.user.id && (!c.origemDisparo || c.respondeu));
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
    const texto = String((req.body && req.body.texto) || "").trim();
    if (!texto) return res.status(400).json({ error: "Mensagem vazia" });
    const numeroCfg = acharNumero(chat.numeroOficialId);
    if (!numeroCfg) return res.status(400).json({ error: "Número de origem não encontrado" });
    try {
      await enviarTextoOficial(numeroCfg, chat.numero, texto);
      const ts = Date.now();
      chat.mensagens.push({ role: "me", content: texto, ts });
      if (chat.mensagens.length > 300) chat.mensagens = chat.mensagens.slice(-300);
      chat.atualizadoEm = ts;
      salvar();
      res.json({ ok: true });
    } catch (e) {
      // erro típico: janela de 24h fechada (precisa de template)
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
            const chat = acharOuCriarChat(numeroCfg.id, telefone, nome);
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
            if (chat.mensagens.length > 300) chat.mensagens = chat.mensagens.slice(-300);
            chat.naoLidas = (chat.naoLidas || 0) + 1;
            chat.atualizadoEm = ts;

            // conta "responderam" na campanha (só a 1ª resposta de cada lead)
            if (chat.origemDisparo && chat.campanhaId && !chat.respondeu) {
              chat.respondeu = true;
              const camp = (db.oficial.campanhas || []).find((x) => x.id === chat.campanhaId);
              if (camp) camp.responderam = (camp.responderam || 0) + 1;
            }

            // ===== DISTRIBUIÇÃO: lead respondeu -> dá pra um vendedor ativo =====
            if (!chat.vendedorId) {
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
