/* ============================================================
   RECADOS DO TIME
   ------------------------------------------------------------
   Só o DONO do sistema escolhe QUEM recebe e em QUE TOM
   (nem outros gerentes/admins enxergam essa configuração). Na primeira vez
   que a pessoa entra no sistema no dia, aparece um recado com
   o nome dela e os números reais do mês — e o texto muda todo
   dia, pra nunca parecer mensagem automática repetida.

   Tons: elogio | crescimento | incentivo | virada | custom | nenhum
   ============================================================ */
export function instalarRecados({ app, getDb, saveDB, auth, donoOnly }) {
  const db = () => getDb();
  const num = (v) => Number(v) || 0;
  const hoje = () => {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  };
  const mesAtual = () => hoje().slice(0, 7);
  const primeiroNome = (n) => String(n || "").trim().split(/\s+/)[0] || "";
  const dinheiro = (n) => "R$ " + num(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function base() {
    const d = db();
    if (!d.recados) d.recados = { config: {}, vistos: {}, ativo: true };
    if (!d.recados.config) d.recados.config = {};
    if (!d.recados.vistos) d.recados.vistos = {};
    if (d.recados.ativo === undefined) d.recados.ativo = true;
    return d.recados;
  }

  /* ---- números reais da pessoa no mês (pra mensagem ser verdadeira) ---- */
  function metricas(userId) {
    const d = db();
    const v = d.vendas || {};
    const pessoa = (v.pessoas || []).find((p) => p.userId === userId);
    const vazio = { temDados: false, nome: "", venda: 0, qtd: 0, meta: 0, pct: 0, posicao: 0, total: 0, ontem: 0, qtdOntem: 0 };
    if (!pessoa) return vazio;

    const mes = mesAtual();
    const doMes = (v.vendas || []).filter((x) => {
      const dt = new Date(x.data);
      const m = dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0");
      return m === mes && x.confirmada !== false;
    });

    const porPessoa = {};
    doMes.forEach((x) => {
      if (!porPessoa[x.pessoaId]) porPessoa[x.pessoaId] = { valor: 0, qtd: 0 };
      porPessoa[x.pessoaId].valor += num(x.valor);
      porPessoa[x.pessoaId].qtd++;
    });

    const rank = Object.entries(porPessoa)
      .map(([id, r]) => ({ id, valor: r.valor }))
      .filter((r) => {
        const p = (v.pessoas || []).find((y) => y.id === r.id);
        return p && !p.foraDoPodio;
      })
      .sort((a, b) => b.valor - a.valor);

    const meu = porPessoa[pessoa.id] || { valor: 0, qtd: 0 };
    const posicao = rank.findIndex((r) => r.id === pessoa.id) + 1;

    const dOntem = new Date(); dOntem.setDate(dOntem.getDate() - 1);
    const chaveOntem = dOntem.getFullYear() + "-" + String(dOntem.getMonth() + 1).padStart(2, "0") + "-" + String(dOntem.getDate()).padStart(2, "0");
    const vendasOntem = doMes.filter((x) => {
      const dt = new Date(x.data);
      const k = dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
      return k === chaveOntem && x.pessoaId === pessoa.id;
    });

    const meta = num(pessoa.metaMensal);
    return {
      temDados: true,
      nome: pessoa.nome,
      venda: meu.valor, qtd: meu.qtd, meta,
      pct: meta > 0 ? Math.round((meu.valor / meta) * 100) : 0,
      posicao, total: rank.length,
      ontem: vendasOntem.reduce((s, x) => s + num(x.valor), 0),
      qtdOntem: vendasOntem.length,
    };
  }

  /* ---- sorteio estável: mesma pessoa + mesmo dia = mesmo texto ---- */
  function semente(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  }
  const pega = (lista, s, salto) => lista[(s + salto * 7) % lista.length];

  /* ---- bancos de texto por tom ---- */
  const ABERTURAS = {
    elogio: [
      "Parabéns, {nome}!", "Muito bom, {nome}!", "Que orgulho, {nome}!",
      "{nome}, tá voando!", "Show de bola, {nome}!", "Sensacional, {nome}!",
    ],
    crescimento: [
      "{nome}, olha esse crescimento!", "Tá subindo, {nome}!", "Bonito de ver, {nome}!",
      "{nome}, cada semana melhor!", "Evolução constante, {nome}!", "Passo firme, {nome}!",
    ],
    incentivo: [
      "Bom dia, {nome}!", "Dia novo, {nome}!", "Vamos pra cima, {nome}!",
      "{nome}, começou o jogo!", "Boas vendas, {nome}!", "Tamo junto, {nome}!",
    ],
    virada: [
      "{nome}, hoje é dia de virar o jogo.", "Recomeço, {nome}!", "{nome}, a página virou.",
      "Novo dia, novas chances, {nome}.", "{nome}, bora buscar!", "Cabeça erguida, {nome}.",
    ],
  };

  const CORPOS = {
    elogio: [
      "Seu desempenho até aqui tá muito acima da média — e isso não é sorte, é trabalho.",
      "Você vem entregando com consistência, e o time todo percebe isso.",
      "Esse resultado é fruto de dedicação diária. Continua exatamente assim.",
      "Poucos conseguem manter esse ritmo. Você conseguiu.",
      "Seu número desse mês fala por si. Muito bem feito.",
    ],
    crescimento: [
      "Você vem demonstrando uma crescente muito bacana, mês a mês.",
      "Dá pra ver a evolução no seu jeito de conduzir o atendimento.",
      "Cada semana você entrega um pouco mais — e isso soma muito no fim do mês.",
      "Sua curva tá subindo, e é isso que constrói resultado grande.",
      "Você melhorou em pontos que antes travavam a venda. Isso é evolução real.",
    ],
    incentivo: [
      "Hoje é mais uma chance de fazer um dia bom acontecer.",
      "Cada conversa de hoje pode virar a venda que fecha a semana.",
      "Comece pelos leads mais quentes e o resto flui.",
      "Foco no básico bem feito: responder rápido e ouvir bem.",
      "Um dia de cada vez, uma conversa de cada vez. É assim que fecha.",
    ],
    virada: [
      "O mês ainda tem jogo e você tem tudo pra buscar.",
      "Todo mundo tem fase mais devagar — o que conta é o que você faz agora.",
      "Um bom dia hoje já muda a sua semana inteira.",
      "Vamos focar em uma coisa só: conversar com mais gente hoje que ontem.",
      "Sem peso na consciência, com foco. O resultado vem.",
    ],
  };

  const FECHOS = [
    "Boas vendas hoje e vamos pra cima! 🚀",
    "Bora fazer um belo dia! 💪",
    "Que hoje seja um daqueles dias! 🔥",
    "Tamo junto — qualquer coisa, chama. 🙌",
    "Vamos com tudo! ⚡",
    "Sucesso hoje! 🎯",
  ];

  /* ---- dado real do mês, se existir ---- */
  function tempero(m, s) {
    if (!m.temDados || m.venda <= 0) return "";
    const ops = [];
    ops.push(`Você já fez ${dinheiro(m.venda)} no mês em ${m.qtd} venda(s).`);
    if (m.meta > 0) ops.push(`Você está com ${m.pct}% da sua meta do mês.`);
    if (m.posicao > 0 && m.total > 1) ops.push(`No ranking do time você está em ${m.posicao}º de ${m.total}.`);
    if (m.qtdOntem > 0) ops.push(`Ontem você fechou ${m.qtdOntem} venda(s), ${dinheiro(m.ontem)}.`);
    return pega(ops, s, 3);
  }

  function montar(user, cfg) {
    const tom = (cfg && cfg.tom) || "incentivo";
    if (tom === "nenhum") return null;

    const m = metricas(user.id);
    const nome = primeiroNome(m.nome || user.nome);
    const s = semente(user.id + "|" + hoje());

    if (tom === "custom") {
      const txt = String((cfg && cfg.texto) || "").trim();
      if (!txt) return null;
      return {
        titulo: `Recado pra você, ${nome}`,
        corpo: txt.replace(/\{nome\}/gi, nome),
        tom, assinatura: (cfg && cfg.assinatura) || "",
      };
    }

    const banco = ABERTURAS[tom] ? tom : "incentivo";
    const abertura = pega(ABERTURAS[banco], s, 1).replace("{nome}", nome);
    const corpo = pega(CORPOS[banco], s, 2);
    const dado = tempero(m, s);
    const fecho = pega(FECHOS, s, 4);

    return {
      titulo: abertura,
      corpo: [corpo, dado].filter(Boolean).join(" ") + "\n\n" + fecho,
      tom, assinatura: (cfg && cfg.assinatura) || "",
    };
  }

  /* =========== ROTAS =========== */

  // vendedor: tem recado pendente hoje?
  app.get("/api/recados/meu", auth, (req, res) => {
    const r = base();
    if (!r.ativo) return res.json({ recado: null });
    const cfg = r.config[req.user.id];
    if (!cfg || cfg.tom === "nenhum") return res.json({ recado: null });
    if (r.vistos[req.user.id] === hoje()) return res.json({ recado: null });
    const recado = montar(req.user, cfg);
    res.json({ recado });
  });

  // vendedor: marcar como visto (só reaparece amanhã)
  app.post("/api/recados/visto", auth, (req, res) => {
    const r = base();
    r.vistos[req.user.id] = hoje();
    saveDB();
    res.json({ ok: true });
  });

  // dono: quem recebe o quê + prévia de cada um
  app.get("/api/recados/config", auth, donoOnly, (req, res) => {
    const r = base();
    const lista = (db().users || [])
      .filter((u) => u.ativo !== false && u.role !== "gerente")
      .map((u) => {
        const cfg = r.config[u.id] || { tom: "nenhum" };
        const m = metricas(u.id);
        return {
          userId: u.id, nome: u.nome, role: u.role, foto: u.foto || "",
          tom: cfg.tom || "nenhum", texto: cfg.texto || "", assinatura: cfg.assinatura || "",
          vistoHoje: r.vistos[u.id] === hoje(),
          previa: montar(u, cfg),
          resumo: m.temDados ? { venda: m.venda, pct: m.pct, posicao: m.posicao, qtd: m.qtd } : null,
        };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
    res.json({ ativo: r.ativo, pessoas: lista });
  });

  // dono: define o tom de uma pessoa (ou texto próprio)
  app.put("/api/recados/config/:userId", auth, donoOnly, (req, res) => {
    const r = base();
    const u = (db().users || []).find((x) => x.id === req.params.userId);
    if (!u) return res.status(404).json({ error: "Pessoa não encontrada" });
    const b = req.body || {};
    const tons = ["elogio", "crescimento", "incentivo", "virada", "custom", "nenhum"];
    const cfg = r.config[u.id] || {};
    if (b.tom !== undefined) {
      if (!tons.includes(b.tom)) return res.status(400).json({ error: "Tom inválido" });
      cfg.tom = b.tom;
    }
    if (b.texto !== undefined) cfg.texto = String(b.texto).slice(0, 1000);
    if (b.assinatura !== undefined) cfg.assinatura = String(b.assinatura).slice(0, 60);
    r.config[u.id] = cfg;
    saveDB();
    res.json({ ok: true, config: cfg, previa: montar(u, cfg) });
  });

  // dono: liga/desliga o mural inteiro
  app.put("/api/recados/ativo", auth, donoOnly, (req, res) => {
    const r = base();
    r.ativo = !!(req.body || {}).ativo;
    saveDB();
    res.json({ ok: true, ativo: r.ativo });
  });

  // dono: reenviar hoje (limpa o "já viu" de uma pessoa ou de todos)
  app.post("/api/recados/reenviar", auth, donoOnly, (req, res) => {
    const r = base();
    const id = (req.body || {}).userId;
    if (id) delete r.vistos[id];
    else r.vistos = {};
    saveDB();
    res.json({ ok: true });
  });

  console.log("✓ Recados do time instalados");
}
