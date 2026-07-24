/* ============================================================
   ANÁLISE DE ATENDIMENTO
   ------------------------------------------------------------
   Duas camadas:

   1) NÚMEROS (sempre funcionam, não dependem de IA)
      tempo até a primeira resposta, tempo médio de resposta,
      quantas conversas ficaram sem resposta, quantas o vendedor
      abandonou no meio, volume de mensagens, taxa de retorno.

   2) LEITURA POR IA (opcional, usa a OPENAI_API_KEY)
      lê amostras reais das conversas do vendedor e aponta o que
      ele faz bem, onde está pecando e o que dá pra melhorar.

   Só o DONO do sistema enxerga — é material sensível sobre
   desempenho individual, não pode circular pelo time.
   ============================================================ */

const HORA = 3600 * 1000;

export function instalarAnaliseAtendimento({ app, getDb, saveDB, auth, donoOnly }) {
  const db = new Proxy({}, {
    get: (_t, k) => getDb()[k],
    set: (_t, k, v) => { getDb()[k] = v; return true; },
  });

  const fmtMin = (ms) => {
    if (!ms || !isFinite(ms)) return null;
    const min = Math.round(ms / 60000);
    if (min < 60) return min + " min";
    const h = Math.floor(min / 60), m = min % 60;
    return h + "h" + (m ? " " + m + "min" : "");
  };

  /* ---- lê as conversas e calcula os números de cada vendedor ---- */
  function medir({ desde, ate }) {
    const chats = Object.values(db.waChats || {}).filter((c) => {
      if (!c || !c.mensagens || !c.mensagens.length) return false;
      const ult = c.atualizadoEm || 0;
      return ult >= desde && ult <= ate;
    });

    const porVend = {};
    const nomeDe = (id) => {
      const u = (db.users || []).find((x) => x.id === id);
      return u ? u.nome : null;
    };

    chats.forEach((c) => {
      const vid = c.vendedorId;
      if (!vid) return;
      const nome = c.vendedorNome || nomeDe(vid);
      if (!nome) return;
      if (!porVend[vid]) {
        porVend[vid] = {
          vendedorId: vid, nome,
          conversas: 0, respondidas: 0, semResposta: 0, abandonadas: 0,
          msgsMinhas: 0, msgsDelas: 0,
          temposResposta: [], temposPrimeira: [],
          leadsQueResponderam: 0, foraDoHorario: 0,
        };
      }
      const v = porVend[vid];
      v.conversas++;

      const msgs = (c.mensagens || []).slice().sort((a, b) => (a.ts || 0) - (b.ts || 0));
      const temDoLead = msgs.some((m) => m.role === "them");
      if (temDoLead) v.leadsQueResponderam++;

      let respondeu = false;
      let esperandoDesde = null;   // ts da mensagem do lead ainda sem resposta
      let primeiraMedida = false;

      msgs.forEach((m) => {
        if (m.role === "them") {
          v.msgsDelas++;
          if (esperandoDesde === null) esperandoDesde = m.ts || 0;
        } else {
          v.msgsMinhas++;
          if (m.template) return;                    // disparo não conta como resposta
          const h = new Date(m.ts || 0).getHours();
          if (h < 7 || h >= 21) v.foraDoHorario++;
          if (esperandoDesde !== null) {
            const dif = (m.ts || 0) - esperandoDesde;
            if (dif > 0 && dif < 48 * HORA) {
              v.temposResposta.push(dif);
              if (!primeiraMedida) { v.temposPrimeira.push(dif); primeiraMedida = true; }
            }
            esperandoDesde = null;
            respondeu = true;
          }
        }
      });

      // lead falou por último e ninguém respondeu
      const ultima = msgs[msgs.length - 1];
      if (temDoLead && ultima && ultima.role === "them") {
        if (respondeu) v.abandonadas++;              // conversou e parou no meio
        else v.semResposta++;                        // nunca respondeu
      }
    });

    const media = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0);
    const mediana = (arr) => {
      if (!arr.length) return 0;
      const o = arr.slice().sort((a, b) => a - b);
      const m = Math.floor(o.length / 2);
      return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
    };

    return Object.values(porVend).map((v) => {
      const respMedia = media(v.temposResposta);
      const respMediana = mediana(v.temposResposta);
      const primeira = mediana(v.temposPrimeira);
      const atendidas = v.leadsQueResponderam;
      return {
        ...v,
        temposResposta: undefined, temposPrimeira: undefined,
        respostasContadas: v.temposResposta.length,
        tempoRespostaMedio: respMedia, tempoRespostaMedioTxt: fmtMin(respMedia),
        tempoRespostaMediana: respMediana, tempoRespostaMedianaTxt: fmtMin(respMediana),
        tempoPrimeiraResposta: primeira, tempoPrimeiraRespostaTxt: fmtMin(primeira),
        // % dos leads que falaram e ficaram sem resposta nenhuma
        pctSemResposta: atendidas ? Math.round((v.semResposta / atendidas) * 100) : 0,
        pctAbandonadas: atendidas ? Math.round((v.abandonadas / atendidas) * 100) : 0,
        msgsPorConversa: v.conversas ? +(v.msgsMinhas / v.conversas).toFixed(1) : 0,
      };
    }).sort((a, b) => b.conversas - a.conversas);
  }

  /* ---- amostra de conversas reais pra IA ler ---- */
  function amostrar(vendedorId, { desde, ate }, quantas = 6) {
    const chats = Object.values(db.waChats || {})
      .filter((c) => c && c.vendedorId === vendedorId && (c.mensagens || []).length >= 3
        && (c.atualizadoEm || 0) >= desde && (c.atualizadoEm || 0) <= ate)
      .sort((a, b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0))
      .slice(0, quantas);

    return chats.map((c) => {
      const msgs = (c.mensagens || []).slice(-24).map((m) => {
        const quem = m.role === "them" ? "CLIENTE" : "VENDEDOR";
        const hora = new Date(m.ts || 0).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
        const txt = (m.role === "them" && m.transcricao) ? "[áudio] " + m.transcricao : (m.content || "");
        return `[${hora}] ${quem}: ${String(txt).slice(0, 400)}`;
      }).join("\n");
      return `--- Conversa com ${c.nome || c.numero} ---\n${msgs}`;
    }).join("\n\n");
  }

  async function pedirAnaliseIA(vendedor, numeros, conversas) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("Falta a OPENAI_API_KEY no Railway pra IA conseguir ler os atendimentos.");

    const system = `Você é um coach de vendas experiente analisando o atendimento por WhatsApp de uma escola técnica (cursos de eletrônica, energia solar, odontologia técnica).
Analise as conversas REAIS abaixo e devolva uma avaliação honesta, específica e útil.

REGRAS:
- Seja concreto: cite exemplos do que a pessoa escreveu, não generalidades.
- Aponte o que ela faz BEM antes do que precisa melhorar.
- Nas falhas, explique o impacto na venda e como corrigir na prática.
- Nada de bajulação nem de dureza gratuita. Fale como um gestor que quer o time crescendo.
- Português do Brasil, direto, sem jargão corporativo.

Responda SOMENTE com um JSON válido, sem markdown, neste formato:
{
  "resumo": "2 a 3 frases sobre o atendimento dessa pessoa",
  "nota": 7,
  "fortes": ["ponto forte com exemplo", "..."],
  "falhas": ["falha com exemplo e impacto", "..."],
  "melhorias": ["ação prática pra semana que vem", "..."],
  "frasesBoas": ["trecho real que funcionou bem"],
  "frasesRuins": ["trecho real que atrapalhou"]
}`;

    const user = `VENDEDOR: ${vendedor.nome}

NÚMEROS DO PERÍODO:
- Conversas atendidas: ${vendedor.conversas}
- Leads que responderam: ${vendedor.leadsQueResponderam}
- Tempo até a 1ª resposta (mediana): ${vendedor.tempoPrimeiraRespostaTxt || "sem dado"}
- Tempo médio de resposta: ${vendedor.tempoRespostaMedianaTxt || "sem dado"}
- Leads que falaram e ficaram SEM resposta: ${vendedor.semResposta} (${vendedor.pctSemResposta}%)
- Conversas abandonadas no meio: ${vendedor.abandonadas} (${vendedor.pctAbandonadas}%)
- Mensagens enviadas por conversa: ${vendedor.msgsPorConversa}

CONVERSAS REAIS:
${conversas}`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 1400,
        temperature: 0.4,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((data.error && data.error.message) || "Erro OpenAI " + r.status);
    let txt = ((data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "").trim();
    txt = txt.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    try { return JSON.parse(txt); }
    catch (_) { return { resumo: txt.slice(0, 600), nota: null, fortes: [], falhas: [], melhorias: [], frasesBoas: [], frasesRuins: [] }; }
  }

  // período: por dias (atalho) ou por datas escolhidas na mão
  function janela(req) {
    const de = String(req.query.de || "").trim();
    const ateQ = String(req.query.ate || "").trim();
    const dataOk = (x) => /^\d{4}-\d{2}-\d{2}$/.test(x);
    if (dataOk(de) && dataOk(ateQ)) {
      const [a1, a2, a3] = de.split("-").map(Number);
      const [b1, b2, b3] = ateQ.split("-").map(Number);
      const desde = new Date(a1, a2 - 1, a3, 0, 0, 0).getTime();
      const ate = new Date(b1, b2 - 1, b3, 23, 59, 59).getTime();
      const dias = Math.max(1, Math.round((ate - desde) / (24 * HORA)));
      return { desde: Math.min(desde, ate), ate: Math.max(desde, ate), dias, de, ateTxt: ateQ };
    }
    // atalhos: 0 = só hoje, -1 = só ontem
    const n = Number(req.query.dias);
    const hj = new Date();
    if (n === 0) {
      const ini = new Date(hj.getFullYear(), hj.getMonth(), hj.getDate()).getTime();
      return { desde: ini, ate: Date.now(), dias: 1, rotulo: "hoje" };
    }
    if (n === -1) {
      const ini = new Date(hj.getFullYear(), hj.getMonth(), hj.getDate() - 1).getTime();
      return { desde: ini, ate: ini + 24 * HORA - 1, dias: 1, rotulo: "ontem" };
    }
    const dias = Math.min(180, Math.max(1, n || 15));
    const ate = Date.now();
    return { desde: ate - dias * 24 * HORA, ate, dias };
  }

  /* ---- números do time (rápido, sem IA) ---- */
  app.get("/api/atendimento/metricas", auth, donoOnly, (req, res) => {
    const j = janela(req);
    const vendedores = medir(j);
    const tot = vendedores.reduce((a, v) => ({
      conversas: a.conversas + v.conversas,
      semResposta: a.semResposta + v.semResposta,
      abandonadas: a.abandonadas + v.abandonadas,
      leads: a.leads + v.leadsQueResponderam,
    }), { conversas: 0, semResposta: 0, abandonadas: 0, leads: 0 });
    const comTempo = vendedores.filter((v) => v.tempoRespostaMediana > 0);
    const medioTime = comTempo.length
      ? comTempo.reduce((s, v) => s + v.tempoRespostaMediana, 0) / comTempo.length : 0;
    res.json({
      dias: j.dias, rotulo: j.rotulo || null, de: j.de || null, ate: j.ateTxt || null,
      vendedores,
      time: {
        ...tot,
        tempoRespostaTxt: fmtMin(medioTime),
        pctSemResposta: tot.leads ? Math.round((tot.semResposta / tot.leads) * 100) : 0,
      },
      temIA: !!process.env.OPENAI_API_KEY,
    });
  });

  /* ---- leitura por IA de UM vendedor (fica salva pra não gastar toda hora) ---- */
  app.post("/api/atendimento/analisar/:vendedorId", auth, donoOnly, async (req, res) => {
    const j = janela(req);
    const vend = medir(j).find((v) => v.vendedorId === req.params.vendedorId);
    if (!vend) return res.status(404).json({ error: "Sem conversas desse vendedor no período." });

    const conversas = amostrar(req.params.vendedorId, j);
    if (!conversas.trim()) return res.status(400).json({ error: "Não há conversas com histórico suficiente pra analisar." });

    try {
      const analise = await pedirAnaliseIA(vend, {}, conversas);
      if (!db.analisesAtendimento) db.analisesAtendimento = {};
      db.analisesAtendimento[req.params.vendedorId] = {
        ...analise, numeros: vend, dias: j.dias,
        periodo: j.de ? `${j.de.split("-").reverse().join("/")} a ${j.ateTxt.split("-").reverse().join("/")}` : (j.rotulo || `últimos ${j.dias} dias`),
        em: Date.now(),
      };
      saveDB();
      res.json({ ok: true, analise: db.analisesAtendimento[req.params.vendedorId] });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /* ---- análises já feitas ---- */
  app.get("/api/atendimento/analises", auth, donoOnly, (req, res) => {
    res.json({ analises: db.analisesAtendimento || {} });
  });

  console.log("✓ Análise de atendimento instalada");
}
