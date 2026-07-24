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

  // A IA às vezes devolve objeto dentro das listas. Isso quebrava a tela.
  // Aqui tudo vira texto puro antes de sair do servidor.
  function texto(v) {
    if (v == null) return "";
    if (typeof v === "string") return v.trim();
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (Array.isArray(v)) return v.map(texto).filter(Boolean).join(" · ");
    if (typeof v === "object") {
      const campos = ["texto", "item", "ponto", "descricao", "descrição", "titulo", "título",
                      "acao", "ação", "sugestao", "sugestão", "problema", "falha", "detalhe", "trecho", "exemplo", "impacto"];
      const partes = [];
      for (const c of campos) if (v[c]) partes.push(texto(v[c]));
      if (partes.length) return partes.join(" — ");
      return Object.values(v).map(texto).filter(Boolean).join(" — ");
    }
    return String(v);
  }
  const listaTexto = (v) => (Array.isArray(v) ? v : v ? [v] : []).map(texto).filter(Boolean);
  const numero = (v) => { const n = Number(String(v).replace(",", ".")); return isFinite(n) ? Math.max(0, Math.min(10, n)) : null; };

  async function chamarIA(system, user, maxTokens = 2200) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("Falta a OPENAI_API_KEY no Railway pra IA conseguir ler os atendimentos.");
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
      body: JSON.stringify({
        model: "gpt-4o-mini", max_tokens: maxTokens, temperature: 0.35,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((data.error && data.error.message) || "Erro OpenAI " + r.status);
    let txt = ((data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "").trim();
    txt = txt.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    try { return JSON.parse(txt); } catch (_) { return { _cru: txt }; }
  }

  const TOM = `Você é um gestor comercial experiente avaliando o atendimento por WhatsApp de uma escola técnica
(cursos de eletrônica, energia solar, odontologia técnica, manutenção).

COMO AVALIAR:
- Seja franco e direto. Se o atendimento está ruim, diga que está ruim, sem rodeio e sem amenizar.
- NÃO passe a mão na cabeça: não invente elogio pra compensar crítica, não use "mas no geral está bom"
  quando não está. Se a pessoa está deixando dinheiro na mesa, escreva isso com todas as letras.
- Toda afirmação precisa de PROVA: cite o trecho REAL da conversa (entre aspas) que sustenta o que disse.
- Ligue cada falha ao prejuízo concreto: lead perdido, venda que não fechou, cliente que desistiu.
- Seja DETALHADO. Cada item da análise deve ter 2 a 4 frases explicando o quê, por quê e o custo disso.
  Análise curta e genérica não serve pra nada — quem lê precisa saber exatamente o que aconteceu.
- Escreva como gestor falando com gestor: objetivo, sem jargão corporativo, sem enrolação.
- Português do Brasil. Critique o trabalho e o comportamento, nunca a pessoa.
- Termine sempre com o que fazer na prática, em ordem de prioridade.`;

  async function analisarVendedor(vendedor, conversas) {
    const system = TOM + `

Responda SOMENTE com JSON válido, sem markdown:
{
  "nota": 6.5,
  "notaPorque": "1 ou 2 frases diretas explicando a nota",
  "resumo": "6 a 10 frases descrevendo como essa pessoa atende de verdade: ritmo, tom, condução da venda, onde ela ganha e onde ela perde o cliente",
  "fortes": ["texto de 2 a 4 frases: o que funciona, o trecho que prova e por que isso ajuda a vender"],
  "falhas": ["texto de 2 a 4 frases: o problema, o trecho que prova, e quanto isso custou em venda perdida"],
  "padroes": ["texto de 2 a 3 frases sobre um hábito que se repete nas conversas"],
  "oportunidades": ["venda que dava pra ter fechado e não fechou, com o trecho e o que faltou fazer"],
  "frasesBoas": ["trecho real da conversa que funcionou"],
  "frasesRuins": ["trecho real da conversa que atrapalhou"],
  "sugestoes": ["ação concreta pra semana, 2 a 3 frases, começando pela mais urgente"]
}

Cada lista deve ter de 3 a 6 itens. Itens sempre em TEXTO CORRIDO, nunca objeto.`;
    const u = `VENDEDOR: ${vendedor.nome}

NÚMEROS DO PERÍODO:
- Conversas: ${vendedor.conversas} · leads que responderam: ${vendedor.leadsQueResponderam}
- Tempo até a 1ª resposta: ${vendedor.tempoPrimeiraRespostaTxt || "sem dado"}
- Tempo médio de resposta: ${vendedor.tempoRespostaMedianaTxt || "sem dado"}
- Leads que falaram e ficaram SEM resposta: ${vendedor.semResposta} (${vendedor.pctSemResposta}%)
- Conversas abandonadas no meio: ${vendedor.abandonadas} (${vendedor.pctAbandonadas}%)
- Mensagens enviadas por conversa: ${vendedor.msgsPorConversa}
- Atendimentos fora do horário comercial: ${vendedor.foraDoHorario}

CONVERSAS REAIS:
${conversas}`;
    const r = await chamarIA(system, u, 3000);
    if (r._cru) return { nota: null, resumo: r._cru.slice(0, 2500), fortes: [], falhas: [], padroes: [], sugestoes: [], frasesBoas: [], frasesRuins: [] };
    return {
      nota: numero(r.nota), notaPorque: texto(r.notaPorque), resumo: texto(r.resumo),
      fortes: listaTexto(r.fortes), falhas: listaTexto(r.falhas), padroes: listaTexto(r.padroes),
      frasesBoas: listaTexto(r.frasesBoas), frasesRuins: listaTexto(r.frasesRuins),
      sugestoes: listaTexto(r.sugestoes), oportunidades: listaTexto(r.oportunidades),
    };
  }

  async function analisarEquipe(vendedores, amostras) {
    const system = TOM + `

Você está olhando o time INTEIRO. Compare as pessoas entre si, mostre quem puxa o resultado
pra cima, quem está travando, e o que é problema de processo (que atinge todo mundo) e não
de pessoa. Responda SOMENTE com JSON válido, sem markdown:
{
  "notaTime": 6.5,
  "resumo": "8 a 12 frases sobre como o time atende hoje, com nome de quem puxa pra cima e de quem trava",
  "oQueVaiBem": ["2 a 4 frases: o ponto forte, quem faz isso bem e o exemplo real"],
  "problemas": ["2 a 4 frases: o problema, quem está envolvido, o trecho que prova e quanto custa"],
  "porPessoa": [{"nome":"Fulano","nota":7,"leitura":"4 a 6 frases francas sobre como ele atende, o que acerta e o que perde","prioridade":"a única coisa que ele precisa mudar agora"}],
  "processo": ["2 a 3 frases: falha que é do processo e atinge todo mundo, não é culpa de uma pessoa"],
  "sugestoes": ["2 a 3 frases: ação pro gestor, da mais urgente pra menos"]
}

Inclua TODOS os vendedores em "porPessoa". Itens das listas sempre em TEXTO CORRIDO, nunca objeto.`;
    const linhas = vendedores.map((v) =>
      `- ${v.nome}: ${v.conversas} conversas · 1ª resposta ${v.tempoPrimeiraRespostaTxt || "—"} · resposta média ${v.tempoRespostaMedianaTxt || "—"} · sem resposta ${v.semResposta} (${v.pctSemResposta}%) · abandonadas ${v.abandonadas} (${v.pctAbandonadas}%) · ${v.msgsPorConversa} msgs/conversa`
    ).join("\n");
    const u = `NÚMEROS DO TIME:\n${linhas}\n\nAMOSTRAS DE CONVERSA DE CADA UM:\n${amostras}`;
    const r = await chamarIA(system, u, 4000);
    if (r._cru) return { notaTime: null, resumo: r._cru.slice(0, 3000), oQueVaiBem: [], problemas: [], porPessoa: [], processo: [], sugestoes: [] };
    return {
      notaTime: numero(r.notaTime), resumo: texto(r.resumo),
      oQueVaiBem: listaTexto(r.oQueVaiBem), problemas: listaTexto(r.problemas),
      processo: listaTexto(r.processo), sugestoes: listaTexto(r.sugestoes),
      porPessoa: (Array.isArray(r.porPessoa) ? r.porPessoa : []).map((p) => ({
        nome: texto(p && p.nome), nota: numero(p && p.nota),
        leitura: texto(p && p.leitura), prioridade: texto(p && p.prioridade),
      })).filter((p) => p.nome),
    };
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
      const analise = await analisarVendedor(vend, conversas);
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

  /* ---- leitura por IA do TIME inteiro ---- */
  app.post("/api/atendimento/analisar-equipe", auth, donoOnly, async (req, res) => {
    const j = janela(req);
    const vendedores = medir(j);
    if (!vendedores.length) return res.status(400).json({ error: "Sem conversas no período." });
    // amostra menor por pessoa pra caber o time todo numa análise só
    const amostras = vendedores.slice(0, 12).map((v) => {
      const c = amostrar(v.vendedorId, j, 3);
      return c ? `===== ${v.nome} =====\n${c}` : "";
    }).filter(Boolean).join("\n\n");
    try {
      const analise = await analisarEquipe(vendedores, amostras);
      if (!db.analisesAtendimento) db.analisesAtendimento = {};
      db.analisesAtendimento.__equipe = {
        ...analise, dias: j.dias,
        periodo: j.de ? `${j.de.split("-").reverse().join("/")} a ${j.ateTxt.split("-").reverse().join("/")}` : (j.rotulo || `últimos ${j.dias} dias`),
        em: Date.now(), vendedores,
      };
      saveDB();
      res.json({ ok: true, analise: db.analisesAtendimento.__equipe });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  /* ---- análises já feitas ---- */
  app.get("/api/atendimento/analises", auth, donoOnly, (req, res) => {
    res.json({ analises: db.analisesAtendimento || {} });
  });

  console.log("✓ Análise de atendimento instalada");
}
