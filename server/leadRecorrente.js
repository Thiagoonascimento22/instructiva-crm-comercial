/* ============================================================
   LEAD RECORRENTE — lógica central (pura e testável)
   ------------------------------------------------------------
   Trata um contato que JÁ EXISTE e faz uma NOVA CAPTAÇÃO
   (lista / formulário / campanha). NÃO decide sozinho onde a
   captação entra — isso é o endpoint de captação (a integrar).
   Aqui ficam só as 3 decisões de negócio, sem efeito colateral:

     1) decidirResponsavel(lead, distribuir)  -> mantém vendedor ou redistribui
     2) mesclarDados(leadAtual, dadosNovos)   -> atualiza sem apagar dado válido
     3) registrarCaptacao(lead, submissao)    -> grava no histórico, preserva o passado

   Estados canônicos do CRM (server/oficial.js -> CRM_ETAPAS_PADRAO):
     ativos:      reserva, novo, contato, qualificado
     matriculado: matriculado   (ganho/cliente)
     perdido:     perdido       (única perda canônica)
   ============================================================ */

const ETAPA_PERDIDO = "perdido"; // estado canônico de PERDA no CRM

/* 1) RESPONSÁVEL -------------------------------------------------
   Regra obrigatória dos documentos:
     - lead ativo (ainda sendo trabalhado)  -> MANTÉM o vendedor atual
     - lead que estava PERDIDO              -> nova oportunidade -> REDISTRIBUI
     - lead ativo SEM responsável           -> usa a distribuição existente
   `distribuir` é a função de rodízio do próprio CRM (proximoVendedorCRM /
   distribuirReserva). NÃO criamos distribuição paralela — reutilizamos a de vocês.
*/
function decidirResponsavel(lead, distribuir) {
  const etapa = String((lead && lead.etapa) || "");
  const temVendedor = !!(lead && lead.vendedorId);

  // PERDIDO -> nova oportunidade comercial -> volta pro rodízio normal.
  // O vendedor anterior NÃO impede a nova distribuição.
  if (etapa === ETAPA_PERDIDO) {
    const novo = distribuir ? distribuir() : null;
    return { vendedorId: novo || null, redistribuido: true,
             motivo: "estava perdido → nova oportunidade, redistribuído pelo rodízio" };
  }

  // Ainda ativo E com dono -> mantém (continuidade comercial).
  // Cobre em contato / negociação / qualificado / matriculado etc.
  if (temVendedor) {
    return { vendedorId: lead.vendedorId, redistribuido: false,
             motivo: "lead ainda ativo/com dono → mantém o vendedor atual" };
  }

  // Ativo mas SEM responsável -> aplica a distribuição existente do CRM.
  const novo = distribuir ? distribuir() : null;
  return { vendedorId: novo || null, redistribuido: true,
           motivo: "ativo sem responsável → distribuído pelo rodízio existente" };
}

/* 2) MERGE SEGURO DE DADOS --------------------------------------
   Uma nova captação atualiza os dados atuais, MAS um campo vazio/ausente
   não pode apagar um dado válido anterior (ex.: lista nova não coleta e-mail
   -> não zera o e-mail bom que já existia).
   - valor "cheio" (não vazio) na submissão  -> sobrescreve
   - valor vazio/ausente na submissão         -> mantém o que já tinha
   `campos` limita quais chaves podem ser atualizadas (evita mexer em coisa
   que não é dado de captação, tipo vendedorId/etapa/id).
*/
const CAMPOS_CAPTACAO = ["nome", "email", "telefone", "curso", "origem", "respostasFormulario", "valor"];

function temValor(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return true; // número, boolean etc.
}

function mesclarDados(leadAtual, dadosNovos, campos) {
  const alvo = { ...(leadAtual || {}) };
  const permitidos = campos || CAMPOS_CAPTACAO;
  const alterados = [];
  for (const k of permitidos) {
    if (!dadosNovos || !(k in dadosNovos)) continue; // campo não enviado -> não mexe
    if (!temValor(dadosNovos[k])) continue;          // campo vazio -> não apaga o válido anterior
    if (JSON.stringify(alvo[k]) !== JSON.stringify(dadosNovos[k])) {
      alvo[k] = dadosNovos[k];
      alterados.push(k);
    }
  }
  return { lead: alvo, alterados };
}

/* 3) REGISTRAR A NOVA CAPTAÇÃO ----------------------------------
   Preserva o passado (empurra um item no historico[] que JÁ EXISTE no lead)
   e devolve o lead com estado atual atualizado. Não apaga histórico.
   `submissao` = { lista, origem, curso, respostas, campanha, utms, ... } — o que veio.
*/
function registrarCaptacao(lead, submissao, agora) {
  const ts = agora || Date.now();
  const s = submissao || {};
  const base = { ...(lead || {}) };
  if (!Array.isArray(base.historico)) base.historico = [];

  const de = s.lista || s.origem || s.campanha || "captação externa";
  const oQue = [s.curso ? ("interesse: " + s.curso) : "", s.lista ? ("lista: " + s.lista) : ""].filter(Boolean).join(" · ");
  base.historico.push({
    tipo: "captacao",                          // <- marca que foi NOVA CAPTAÇÃO (não edição admin)
    texto: "Nova captação" + (de ? " (" + de + ")" : "") + (oQue ? " — " + oQue : ""),
    ts,
    dados: {                                    // guarda os detalhes da submissão pro histórico
      lista: s.lista || null, origem: s.origem || null, campanha: s.campanha || null,
      curso: s.curso || null, respostas: s.respostas || s.respostasFormulario || null,
      utms: s.utms || null, submissionId: s.submissionId || null,
    },
  });

  base.atualizadoEm = ts; // estado atual reflete a entrada mais recente
  return base;
}

/* Ajuda: dá pra reaproveitar essa lista pra saber se uma etapa é "perda". */
function etapaEhPerdido(etapa) { return String(etapa || "") === ETAPA_PERDIDO; }

export { decidirResponsavel, mesclarDados, registrarCaptacao, etapaEhPerdido, CAMPOS_CAPTACAO, ETAPA_PERDIDO };
