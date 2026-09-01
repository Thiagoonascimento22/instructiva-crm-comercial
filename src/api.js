const TOKEN_KEY = "instructiva_crm_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

async function req(method, url, body) {
  const headers = { "Content-Type": "application/json" };
  const t = getToken();
  if (t) headers.Authorization = "Bearer " + t;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (_) {}
  if (!res.ok) {
    const msg = (data && data.error) || "Erro " + res.status;
    const err = new Error(msg);
    err.status = res.status;
    err.dados = data;          // corpo da resposta (ex.: aviso de venda repetida)
    throw err;
  }
  return data;
}

export const api = {
  login: (login, senha) => req("POST", "/api/login", { login, senha }),
  me: () => req("GET", "/api/me"),
  getModulos: () => req("GET", "/api/modulos"),
  setModulos: (modulos) => req("PUT", "/api/modulos", { modulos }),
  updateMe: (dados) => req("PUT", "/api/me", dados),

  listUsers: () => req("GET", "/api/users"),
  createUser: (dados) => req("POST", "/api/users", dados),
  updateUser: (id, dados) => req("PUT", "/api/users/" + id, dados),
  deleteUser: (id) => req("DELETE", "/api/users/" + id),

  listCards: (responsavel) =>
    req("GET", "/api/cards" + (responsavel ? "?responsavel=" + responsavel : "")),
  createCard: (dados) => req("POST", "/api/cards", dados),
  updateCard: (id, dados) => req("PUT", "/api/cards/" + id, dados),
  deleteCard: (id) => req("DELETE", "/api/cards/" + id),
  importCards: (dados) => req("POST", "/api/cards/import", dados),
  bulkCards: (dados) => req("POST", "/api/cards/bulk", dados),
  listVendedores: () => req("GET", "/api/vendedores"),

  // WhatsApp
  waConfig: () => req("GET", "/api/wa/config"),
  waSetConfig: (dados) => req("PUT", "/api/wa/config", dados),
  waMinha: () => req("GET", "/api/wa/minha"),
  waChats: (instance, q, arquivadas) =>
    req("GET", "/api/wa/chats" + (() => {
      const p = [instance ? "instance=" + encodeURIComponent(instance) : "", q ? "q=" + encodeURIComponent(q) : "", arquivadas ? "arquivadas=1" : ""].filter(Boolean);
      return p.length ? "?" + p.join("&") : "";
    })()),
  waChat: (id) => req("GET", "/api/wa/chats/" + id),
  waSendMidia: (id, dados) => req("POST", "/api/wa/chats/" + id + "/send-midia", dados),
  waArquivar: (id, arquivar) => req("POST", "/api/wa/chats/" + id + "/arquivar", { arquivar }),
  midiaUrl: (chatId, mid) => "/api/wa/midia/" + encodeURIComponent(chatId) + "/" + encodeURIComponent(mid),
  midiaBlob: async (chatId, mid) => {
    const t = getToken();
    const res = await fetch(api.midiaUrl(chatId, mid), { headers: t ? { Authorization: "Bearer " + t } : {} });
    if (!res.ok) { let e = "Erro " + res.status; try { const j = await res.json(); e = j.error || e; } catch (_) {} throw new Error(e); }
    return URL.createObjectURL(await res.blob());
  },
  waSend: (id, texto) => req("POST", "/api/wa/chats/" + id + "/send", { texto }),
  waEncerrar: (id, encerrar) => req("POST", "/api/wa/chats/" + id + "/encerrar", { encerrar }),
  nps: (desde, ate, vendedorId) => req("GET", `/api/nps?desde=${desde || 0}&ate=${ate || Date.now()}` + (vendedorId ? `&vendedorId=${encodeURIComponent(vendedorId)}` : "")),
  waIniciar: (dados) => req("POST", "/api/wa/iniciar", dados),
  waConnect: (instance) =>
    req("POST", "/api/wa/connect", { instance, publicUrl: window.location.origin }),
  waStatus: (instance) => req("GET", "/api/wa/status/" + instance),
  waInstanciasEvolution: () => req("GET", "/api/wa/instancias-evolution"),
  waLogout: (instance) => req("POST", "/api/wa/logout/" + instance),
  waDeleteInstance: (instance) => req("DELETE", "/api/wa/instance/" + instance),

  // IA
  iaEquipe: (desde, ate) => req("POST", "/api/ia/equipe", { desde: desde || 0, ate: ate || Date.now() }),
  iaVendedor: (id, desde, ate) => req("POST", "/api/ia/vendedor/" + id, { desde: desde || 0, ate: ate || Date.now() }),

  // Canal Oficial (WhatsApp Cloud API)
  ofNumeros: () => req("GET", "/api/oficial/numeros"),
  ofTokenGlobalStatus: () => req("GET", "/api/oficial/token-global"),
  ofSetTokenGlobal: (token) => req("POST", "/api/oficial/token-global", { token }),
  ofMetricas: (dias) => req("GET", "/api/oficial/metricas" + (dias ? "?dias=" + dias : "")),
  ofSalvarMetricas: (id, dados) => req("POST", "/api/oficial/numeros/" + id + "/metricas", dados),
  ofPuxarGastoMeta: (id, dias) => req("POST", "/api/oficial/numeros/" + id + "/gasto-meta", { dias }),
  ofLimites: () => req("GET", "/api/oficial/limites"),
  ofSetLimite: (id, dados) => req("POST", "/api/oficial/vendedores/" + id + "/limite", dados),
  ofMeuLimite: () => req("GET", "/api/oficial/meu-limite"),
  ofTemperatura: (dias) => req("GET", "/api/oficial/temperatura" + (dias ? "?dias=" + dias : "")),
  ofPuxarQualidade: (id) => req("POST", "/api/oficial/numeros/" + id + "/qualidade"),
  ofQualidadeTodos: () => req("POST", "/api/oficial/qualidade-todos"),
  ofCriarNumero: (dados) => req("POST", "/api/oficial/numeros", dados),
  ofEditarNumero: (id, dados) => req("PUT", "/api/oficial/numeros/" + id, dados),
  ofExcluirNumero: (id) => req("DELETE", "/api/oficial/numeros/" + id),
  ofRegistrarNumero: (id, pin) => req("POST", "/api/oficial/numeros/" + id + "/registrar", { pin }),
  ofAssinarWebhook: (id) => req("POST", "/api/oficial/numeros/" + id + "/assinar-webhook"),
  ofAssinarTodos: () => req("POST", "/api/oficial/assinar-todos"),
  ofDiagnostico: () => req("GET", "/api/oficial/diagnostico"),
  ofTemplates: (id) => req("GET", "/api/oficial/numeros/" + id + "/templates"),
  ofEnviarTemplate: (dados) => req("POST", "/api/oficial/enviar-template", dados),
  ofMeusNumeros: () => req("GET", "/api/oficial/meus-numeros"),
  // ---- Vendas (metas e lançamentos) ----
  vdPainel: (mes, pessoaId) => req("GET", "/api/vendas/painel?mes=" + (mes || "") + (pessoaId ? "&pessoaId=" + pessoaId : "")),
  vdLista: (mes, pessoaId) => req("GET", "/api/vendas?mes=" + (mes || "") + (pessoaId ? "&pessoaId=" + pessoaId : "")),
  vdPorPeriodo: (de, ate) => req("GET", "/api/vendas/por-periodo?de=" + de + "&ate=" + ate),
  vdCriar: (d) => req("POST", "/api/vendas", d),
  vdEditar: (id, d) => req("PUT", "/api/vendas/" + id, d),
  vdExcluir: (id) => req("DELETE", "/api/vendas/" + id),
  vdPessoas: () => req("GET", "/api/vendas/pessoas"),
  vdPessoaCriar: (d) => req("POST", "/api/vendas/pessoas", d),
  vdPessoaEditar: (id, d) => req("PUT", "/api/vendas/pessoas/" + id, d),
  vdPessoaExcluir: (id) => req("DELETE", "/api/vendas/pessoas/" + id),
  vdImportar: (d) => req("POST", "/api/vendas/importar", d),
  vdJuntarPessoas: (deId, paraId) => req("POST", "/api/vendas/pessoas/juntar", { deId, paraId }),
  vdIntegracao: () => req("GET", "/api/vendas/integracao"),
  vdNovaChave: () => req("POST", "/api/vendas/integracao/nova-chave"),
  aviso: () => req("GET", "/api/aviso"),
  salvarAviso: (d) => req("PUT", "/api/aviso", d),
  vdDuplicadas: (mes) => req("GET", "/api/vendas/duplicadas" + (mes ? "?mes=" + mes : "")),
  vdApelidos: () => req("GET", "/api/vendas/apelidos"),
  vdSalvarApelido: (nomeFora, pessoaId) => req("POST", "/api/vendas/apelidos", { nomeFora, pessoaId }),
  vdLimparMes: (mes) => req("POST", "/api/vendas/limpar-mes", { mes }),
  vdLimparMes: (mes) => req("POST", "/api/vendas/limpar-mes", { mes }),
  ofCriarTemplate: (id, dados) => req("POST", "/api/oficial/numeros/" + id + "/templates", dados),
  ofVendedoresLista: () => req("GET", "/api/oficial/vendedores-lista"),
  ofLimparChats: (modo) => req("POST", "/api/oficial/chats/limpar", { modo }),
  ofVendedores: () => req("GET", "/api/oficial/vendedores"),
  ofEditarVendedor: (id, dados) => req("PUT", "/api/oficial/vendedores/" + id, dados),
  ofZerarContadores: () => req("POST", "/api/oficial/vendedores/zerar"),
  ofDisparar: (dados) => req("POST", "/api/oficial/disparar", dados),
  ofCampanhas: (de, ate) => req("GET", "/api/oficial/campanhas" + ((de || ate) ? ("?de=" + (de || 0) + "&ate=" + (ate || 0)) : "")),
  ofRecontar: () => req("POST", "/api/oficial/campanhas/recontar"),
  ofExcluirCampanha: (id, apagarConversas) => req("DELETE", "/api/oficial/campanhas/" + id + (apagarConversas ? "?conversas=1" : "")),
  ofChats: (q, numeroId, campanhaId, vendedorId) =>
    req("GET", "/api/oficial/chats" + (() => {
      const p = [q ? "q=" + encodeURIComponent(q) : "", numeroId ? "numeroId=" + encodeURIComponent(numeroId) : "", campanhaId ? "campanhaId=" + encodeURIComponent(campanhaId) : "", vendedorId ? "vendedorId=" + encodeURIComponent(vendedorId) : ""].filter(Boolean);
      return p.length ? "?" + p.join("&") : "";
    })()),
  ofChatsVersao: () => req("GET", "/api/oficial/chats-versao"),
  ofChat: (id) => req("GET", "/api/oficial/chats/" + encodeURIComponent(id)),
  ofEnviar: (id, texto) => req("POST", "/api/oficial/chats/" + encodeURIComponent(id) + "/send", { texto }),
  ofEnviarMidia: (id, dados) => req("POST", "/api/oficial/chats/" + encodeURIComponent(id) + "/midia", dados),
  ofStats: (desde, ate) => req("GET", "/api/oficial/stats?desde=" + (desde || 0) + "&ate=" + (ate || Date.now())),
  ofIAPendentes: () => req("GET", "/api/oficial/ia-pendentes"),
  ofResponderPendentes: () => req("POST", "/api/oficial/ia-responder-pendentes", {}),
  ofMidiaUrl: (chatId, mid) => "/api/oficial/chats/" + encodeURIComponent(chatId) + "/midia/" + encodeURIComponent(mid),
  ofMidiaBlob: async (chatId, mid) => {
    const t = getToken();
    const res = await fetch(api.ofMidiaUrl(chatId, mid), { headers: t ? { Authorization: "Bearer " + t } : {} });
    if (!res.ok) { let e = "Erro " + res.status; try { const j = await res.json(); e = j.error || e; } catch (_) {} throw new Error(e); }
    return URL.createObjectURL(await res.blob());
  },
  ofAtribuir: (id, vendedorId) => req("POST", "/api/oficial/chats/" + encodeURIComponent(id) + "/atribuir", { vendedorId }),
  ofEncerrar: (id) => req("POST", "/api/oficial/chats/" + encodeURIComponent(id) + "/encerrar", { encerrar: true }),
  ofWebhookInfo: (base) => req("GET", "/api/oficial/webhook-info?base=" + encodeURIComponent(base || "")),
  ofGetReenvio: () => req("GET", "/api/oficial/webhook-reenvio"),
  ofSetReenvio: (urls) => req("PUT", "/api/oficial/webhook-reenvio", { urls }),
  ofInstagram: () => req("GET", "/api/oficial/instagram"),
  ofSalvarInstagram: (dados) => req("PUT", "/api/oficial/instagram", dados),

  // IAs do Canal Oficial (cérebro)
  ofIAs: () => req("GET", "/api/oficial/ias"),
  ofCriarIA: (dados) => req("POST", "/api/oficial/ias", dados),
  ofDuplicarIA: (id, nome) => req("POST", "/api/oficial/ias/" + id + "/duplicar", { nome }),
  ofRetomarCampanha: (id) => req("POST", "/api/oficial/campanhas/" + id + "/retomar"),
  ofRedispararCampanha: (id) => req("POST", "/api/oficial/campanhas/" + id + "/redisparar"),
  ofEditarIA: (id, dados) => req("PUT", "/api/oficial/ias/" + id, dados),
  ofDocsIA: (id) => req("GET", "/api/oficial/ias/" + id + "/docs"),
  ofUploadDocIA: (id, dados) => req("POST", "/api/oficial/ias/" + id + "/docs", dados),
  ofDelDocIA: (id, docId) => req("DELETE", "/api/oficial/ias/" + id + "/docs/" + docId),
  ofAtribuirIAChat: (chatId, iaId) => req("POST", "/api/oficial/chats/" + chatId + "/atribuir-ia", { iaId }),
  ofLigacoes: () => req("GET", "/api/oficial/ligacoes"),
  ofIniciarLigacao: (dados) => req("POST", "/api/oficial/ligacao/iniciar", dados),
  ofCampLigacoes: () => req("GET", "/api/oficial/ligacao/campanhas"),
  ofCampLigacaoCriar: (dados) => req("POST", "/api/oficial/ligacao/campanha", dados),
  ofCampLigacaoPausar: (id) => req("POST", "/api/oficial/ligacao/campanha/" + id + "/pausar"),
  ofCustoLigacoes: () => req("GET", "/api/oficial/ligacao/custo"),
  ofSetCustoLigacoes: (custoPorMin) => req("POST", "/api/oficial/ligacao/custo", { custoPorMin }),
  ofVozes: () => req("GET", "/api/oficial/vozes"),
  ofCRM: () => req("GET", "/api/oficial/crm"),
  ofCrmCriar: (dados) => req("POST", "/api/oficial/crm/lead", dados),
  ofCrmEditar: (id, dados) => req("PUT", "/api/oficial/crm/lead/" + id, dados),
  ofCrmLead: (id) => req("GET", "/api/oficial/crm/lead/" + id),
  ofCrmNota: (id, texto) => req("POST", "/api/oficial/crm/lead/" + id + "/nota", { texto }),
  ofCrmExcluir: (id) => req("DELETE", "/api/oficial/crm/lead/" + id),
  ofCrmVendedores: (ids) => req("POST", "/api/oficial/crm/vendedores", { ids }),
  ofAcessoVend: () => req("GET", "/api/oficial/acesso-vendedor"),
  ofSetAcessoVend: (acessoVend) => req("PUT", "/api/oficial/acesso-vendedor", { acessoVend }),
  ofReservaListas: () => req("GET", "/api/oficial/reserva"),
  ofReservaCriar: (dados) => req("POST", "/api/oficial/reserva", dados),
  ofReservaEditar: (id, dados) => req("PUT", "/api/oficial/reserva/" + id, dados),
  ofReservaExcluir: (id) => req("DELETE", "/api/oficial/reserva/" + id),
  ofCrmEtapaCriar: (dados) => req("POST", "/api/oficial/crm/etapa", dados),
  ofCrmEtapaEditar: (k, dados) => req("PUT", "/api/oficial/crm/etapa/" + k, dados),
  ofCrmEtapaExcluir: (k) => req("DELETE", "/api/oficial/crm/etapa/" + k),
  ofCrmImportar: (dados) => req("POST", "/api/oficial/crm/importar", dados),
  ofCrmLoteAtribuir: (dados) => req("POST", "/api/oficial/crm/lote/atribuir", dados),
  ofCrmLoteEtapa: (dados) => req("POST", "/api/oficial/crm/lote/etapa", dados),
  ofCrmLoteExcluir: (dados) => req("POST", "/api/oficial/crm/lote/excluir", dados),
  ofDesempenho: (mes, inclui) => req("GET", "/api/oficial/desempenho?" + (mes ? "mes=" + mes : "") + (inclui ? "&incluirOcultos=1" : "")),
  ofSetCargoFaixa: (id, dados) => req("PUT", "/api/oficial/desempenho/" + id + "/cargo-faixa", dados),
  ofSetPontos: (id, dados) => req("PUT", "/api/oficial/desempenho/" + id + "/pontos", dados),
  ofOcultarVend: (id, oculto) => req("PUT", "/api/oficial/desempenho/" + id + "/ocultar", { oculto }),
  ofLigarPessoa: (id, pessoaId) => req("PUT", "/api/oficial/desempenho/" + id + "/pessoa", { pessoaId }),
  ofEtapas: () => req("GET", "/api/oficial/etapas"),
  ofSetEtapaChat: (id, etapa) => req("POST", "/api/oficial/chats/" + id + "/etapa", { etapa }),
  ofReordenarEtapas: (ordem) => req("POST", "/api/oficial/crm/etapas/ordem", { ordem }),
  ofDisparoMetricas: (de, ate) => req("GET", "/api/oficial/disparo-metricas" + (de || ate ? "?de=" + (de || 0) + "&ate=" + (ate || 0) : "")),
  ofLimparDisparos: () => req("POST", "/api/oficial/limpar-disparos", {}),
  ofAnaliseIA: (vendedorId, de, ate) => req("POST", "/api/oficial/analise-ia", { vendedorId, de, ate }),
  ofRelatorioIA: (tipo, de, ate, vendedorId, vendedorIds) => req("POST", "/api/oficial/relatorio-ia", { tipo, de, ate, vendedorId, vendedorIds }),
  ofAutoavaliacoes: () => req("GET", "/api/oficial/autoavaliacoes"),
  ofExcluirIA: (id) => req("DELETE", "/api/oficial/ias/" + id),
  ofExtrairArquivo: (nome, base64) => req("POST", "/api/oficial/ias/extrair", { nome, base64 }),
  ofPreviewIA: (dados) => req("POST", "/api/oficial/ias/preview", dados),
  ofIAGlobal: () => req("GET", "/api/oficial/ia-global"),
  ofSetIAGlobal: (ativa) => req("POST", "/api/oficial/ia-global", { ativa }),
  ofPausarIAChat: (id, pausar) => req("POST", "/api/oficial/chats/" + encodeURIComponent(id) + "/ia", { pausar }),
  ofPausarTodasAtuais: () => req("POST", "/api/oficial/chats/pausar-todas-atuais"),
  // monta a URL de download da base de conhecimento (token vai na query)
  ofUrlExportarIA: (id) => "/api/oficial/ias/" + encodeURIComponent(id) + "/exportar?token=" + encodeURIComponent(getToken()),

  // Monitoria
  horario: () => req("GET", "/api/horario"),
  setHorario: (h) => req("PUT", "/api/horario", h),
  monitoria: (desde, ate) => req("GET", `/api/monitoria?desde=${desde || 0}&ate=${ate || Date.now()}`),
  monitoriaVendedor: (id, desde, ate) => req("GET", `/api/monitoria/vendedor/${id}?desde=${desde || 0}&ate=${ate || Date.now()}`),
  monitoriaEvolucao: (desde, ate, vendedorId) => req("GET", `/api/monitoria/evolucao?desde=${desde || 0}&ate=${ate || Date.now()}${vendedorId ? "&vendedorId=" + vendedorId : ""}`),

  // Solicitações de suporte
  solicitacoes: (status) => req("GET", "/api/solicitacoes" + (status ? "?status=" + encodeURIComponent(status) : "")),
  criarSolicitacao: (dados) => req("POST", "/api/solicitacoes", dados),
  enviarMensagemSolic: (id, texto, anexo) => req("POST", "/api/solicitacoes/" + id + "/mensagem", { texto, anexo }),
  abrirChatAnexo: async (id, anexoId) => {
    const win = window.open("", "_blank");
    try {
      const t = getToken();
      const r = await fetch("/api/solicitacoes/" + id + "/chat-anexo/" + anexoId, { headers: t ? { Authorization: "Bearer " + t } : {} });
      if (!r.ok) { let msg = ""; try { const j = await r.json(); if (j && j.error) msg = j.error; } catch (_) {} if (!msg) msg = "não foi possível abrir o anexo (erro " + r.status + ")"; throw new Error(msg); }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      if (win) { win.location.href = url; }
      else {
        const cd = r.headers.get("content-disposition") || "";
        const mm = cd.match(/filename="?([^"]+)"?/);
        const a = document.createElement("a");
        a.href = url; a.download = mm ? mm[1] : "arquivo";
        document.body.appendChild(a); a.click(); a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { if (win) win.close(); throw e; }
  },
  marcarChatVisto: (id) => req("POST", "/api/solicitacoes/" + id + "/visto"),
  sincronizarSolic: (id) => req("GET", "/api/solicitacoes/" + id + "/sync"),
  excluirSolicitacao: (id) => req("DELETE", "/api/solicitacoes/" + id),
  statusSolicitacao: (id, status, resposta) => req("PATCH", "/api/solicitacoes/" + id, { status, resposta }),
  marcarSolicitacoesVistas: () => req("POST", "/api/solicitacoes/marcar-vistas"),
  solicitacoesRelatorio: (desde, ate) => req("GET", `/api/solicitacoes/relatorio?desde=${desde || 0}&ate=${ate || Date.now()}`),
  solicitacoesIA: (desde, ate) => req("GET", `/api/solicitacoes/ia?desde=${desde || 0}&ate=${ate || Date.now()}`),

  vdAnalise: (mes, de, ate) => req("GET", "/api/vendas/analise?mes=" + encodeURIComponent(mes || "") +
    (de && ate ? "&de=" + de + "&ate=" + ate : "")),

  /* Repasse de leads em massa */
  ofRepassePrevia: (todos) => req("GET", "/api/oficial/repasse/previa" + (todos ? "?todos=1" : "")),
  ofRepasse: (dados) => req("POST", "/api/oficial/repasse", dados),
  ofCampDonos: (id) => req("GET", "/api/oficial/campanhas/" + id + "/donos"),
  ofCampTransferir: (id, vendedorId, soSemDono) => req("POST", "/api/oficial/campanhas/" + id + "/transferir", { vendedorId, soSemDono }),

  /* Análise de atendimento (só dono) */
  atdMetricas: (dias, de, ate) => req("GET", "/api/atendimento/metricas?dias=" + dias + (de && ate ? "&de=" + de + "&ate=" + ate : "")),
  atdAnalisar: (id, dias, de, ate) => req("POST", "/api/atendimento/analisar/" + id + "?dias=" + dias + (de && ate ? "&de=" + de + "&ate=" + ate : "")),
  atdAnalises: () => req("GET", "/api/atendimento/analises"),
  atdAnalisarEquipe: (dias, de, ate) => req("POST", "/api/atendimento/analisar-equipe?dias=" + dias + (de && ate ? "&de=" + de + "&ate=" + ate : "")),

  /* Recados do time */
  recadoMeu: () => req("GET", "/api/recados/meu"),
  recadoVisto: () => req("POST", "/api/recados/visto"),
  recadosConfig: () => req("GET", "/api/recados/config"),
  recadoSalvar: (userId, dados) => req("PUT", "/api/recados/config/" + userId, dados),
  recadosAtivo: (ativo) => req("PUT", "/api/recados/ativo", { ativo }),
  recadoReenviar: (userId) => req("POST", "/api/recados/reenviar", { userId }),
};
