/* ============================================================
   SINCRONIZAÇÃO COM O SISTEMA COMERCIAL (Instructiva CRM)
   ------------------------------------------------------------
   Toda venda registrada aqui é enviada pro CRM, que soma no
   painel de metas/ranking de lá.

   Como ligar (variáveis de ambiente):
     CRM_URL   = https://instructiva-crm-comercial-production.up.railway.app
     CRM_KEY   = a chave que aparece em Vendas › Integrar sistema

   Se qualquer uma faltar, a sincronização fica DESLIGADA e o
   sistema funciona normalmente (não quebra nada).

   Se o CRM estiver fora do ar, a venda entra numa fila e é
   reenviada sozinha depois — nenhuma venda se perde.
   ============================================================ */

// Aceita tanto o endereço base quanto o endereço completo do endpoint:
//   https://meucrm.app                      -> vira https://meucrm.app
//   https://meucrm.app/api/vendas/externa   -> vira https://meucrm.app  (tira o caminho)
const CRM_URL = (process.env.CRM_URL || "")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api\/vendas\/externa$/i, "")
  .replace(/\/+$/, "");
const CRM_KEY = process.env.CRM_KEY || "";
const LIGADO = !!(CRM_URL && CRM_KEY);

let _getDb = null, _save = null;
// o index.js reatribui o objeto "db" depois que o volume fica pronto,
// então buscamos ele na hora do uso (senão pegamos um banco vazio)
const bd = () => _getDb();

function garantirFila() {
  const d = bd();
  if (!d.crmFila || !Array.isArray(d.crmFila)) d.crmFila = [];
  return d.crmFila;
}

// monta o pacote no formato que o CRM espera
function montar(venda, nomeVendedor) {
  return {
    vendedor: nomeVendedor || "Suporte",
    equipe: "Suporte",
    data: venda.data || new Date().toISOString().slice(0, 10),
    cliente: venda.nome || "",
    email: venda.email || "",
    telefone: venda.telefone || "",
    curso: venda.curso || "",
    codigo: venda.codigoVenda || "",
    valor: Number(venda.valorVendido) || 0,
    recebido: Number(venda.valorRecebido) || 0,
    obs: venda.obs || "",
    origem: "Sistema de Suporte",
    // referência da venda aqui — o CRM usa pra não duplicar
    refExterna: venda.id,
  };
}

async function mandar(pacote) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(CRM_URL + "/api/vendas/externa", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": CRM_KEY },
      body: JSON.stringify(pacote),
      signal: ctrl.signal,
    });
    const txt = await r.text();
    if (!r.ok) throw new Error("CRM respondeu " + r.status + ": " + txt.slice(0, 160));
    return true;
  } finally { clearTimeout(t); }
}

/* Envia a venda. Se falhar, guarda na fila pra tentar de novo. */
async function enviarVenda(venda, nomeVendedor) {
  if (!LIGADO) return;
  const pacote = montar(venda, nomeVendedor);
  try {
    await mandar(pacote);
    console.log("[CRM] venda enviada:", pacote.cliente, "R$", pacote.valor);
  } catch (e) {
    console.error("[CRM] falhou, vai pra fila:", e.message);
    const fila = garantirFila();
    // se já tiver essa venda na fila, atualiza em vez de duplicar
    const i = fila.findIndex((x) => x.pacote && x.pacote.refExterna === pacote.refExterna);
    if (i >= 0) fila[i] = { pacote, tentativas: fila[i].tentativas || 0, ultimoErro: e.message };
    else fila.push({ pacote, tentativas: 0, ultimoErro: e.message, criadoEm: Date.now() });
    _save(bd());
  }
}

/* Tenta reenviar o que ficou na fila. Roda sozinho de tempos em tempos. */
async function tentarFila() {
  if (!LIGADO) return;
  const fila = garantirFila();
  if (!fila.length) return;
  const restantes = [];
  for (const item of fila) {
    try {
      await mandar(item.pacote);
      console.log("[CRM] fila: venda reenviada com sucesso:", item.pacote.cliente);
    } catch (e) {
      item.tentativas = (item.tentativas || 0) + 1;
      item.ultimoErro = e.message;
      // depois de 200 tentativas (~7 dias) para de tentar, mas NÃO apaga:
      // fica registrado pra alguém olhar
      restantes.push(item);
    }
  }
  bd().crmFila = restantes;
  _save(bd());
}

export function instalarSincronizacaoCRM({ app, getDb, saveDB, requireAuth }) {
  _getDb = getDb;
  _save = saveDB;

  if (!LIGADO) {
    console.log("[CRM] sincronização DESLIGADA (defina CRM_URL e CRM_KEY para ligar)");
  } else {
    console.log("[CRM] sincronização ligada ->", CRM_URL + "/api/vendas/externa");
    // tenta a fila a cada 2 minutos
    setInterval(() => { tentarFila().catch(() => {}); }, 120000);
    // e uma vez logo depois de subir
    setTimeout(() => { tentarFila().catch(() => {}); }, 15000);
  }

  // status da integração (pra ver se está tudo certo)
  app.get("/api/crm/status", requireAuth, (req, res) => {
    const fila = garantirFila();
    res.json({
      ligado: LIGADO,
      url: CRM_URL || null,
      pendentes: fila.length,
      ultimoErro: fila.length ? fila[fila.length - 1].ultimoErro : null,
    });
  });

  // força o reenvio da fila na hora
  app.post("/api/crm/reenviar", requireAuth, async (req, res) => {
    if (!LIGADO) return res.status(400).json({ error: "Sincronização desligada" });
    await tentarFila();
    res.json({ ok: true, pendentes: garantirFila().length });
  });

  // manda TODAS as vendas que já existem aqui (usar uma vez, pra levar o histórico)
  app.post("/api/crm/enviar-tudo", requireAuth, async (req, res) => {
    if (!LIGADO) return res.status(400).json({ error: "Sincronização desligada" });
    if (!req.isAdmin) return res.status(403).json({ error: "Só admin" });
    const d = bd();
    const nomeDe = (id) => { const u = (d.users || []).find((x) => x.id === id) || {}; return (u.nome || "").trim() || (u.login || "").trim() || "Suporte"; };
    let ok = 0, erro = 0;
    for (const v of d.vendas || []) {
      try { await mandar(montar(v, nomeDe(v.vendedorId))); ok++; }
      catch (e) { erro++; }
      await new Promise((r) => setTimeout(r, 60)); // respira entre os envios
    }
    res.json({ ok: true, enviadas: ok, falharam: erro });
  });

  return { enviarVenda, tentarFila, LIGADO };
}
