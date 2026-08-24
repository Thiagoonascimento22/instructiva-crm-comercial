import { db } from './db.js';
import { fatiar } from './extrator.js';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

function temChave() {
  return Boolean(process.env.OPENAI_API_KEY);
}

const SISTEMA = `Voce e um analista de projetos da Escola Instructiva, uma empresa brasileira de educacao tecnica.
Voce recebe documentos internos criados pela diretoria: playbooks, estrategias, atas de reuniao, planos de acao e roteiros comerciais.
Sua funcao e transformar esses documentos em TAREFAS EXECUTAVEIS.

REGRAS:
1. Extraia apenas acoes concretas que alguem precisa executar. Ignore texto puramente descritivo, teoria, contexto historico ou justificativas.
2. Cada tarefa deve ter um titulo curto no INFINITIVO (ex.: "Gravar video de apresentacao do curso de inversores").
3. Se o documento citar explicitamente o NOME de uma pessoa como responsavel por aquela acao, coloque esse nome exatamente como aparece no campo "responsavel". Se nao houver nome, deixe "responsavel" como null. NUNCA invente ou deduza um responsavel.
4. Se houver prazo, data ou referencia temporal ("ate sexta", "ate 30/09", "na proxima semana"), preencha "prazoTexto" com o trecho literal.
5. Prioridade: "urgente", "alta", "media" ou "baixa". Use "media" quando o documento nao indicar.
6. "trecho" deve conter a frase original do documento que originou a tarefa (maximo 200 caracteres), para o gestor conferir a fonte.
7. "categoria": uma palavra que agrupe a tarefa (ex.: comercial, marketing, producao, suporte, financeiro, pedagogico, ti).
8. Nao repita a mesma tarefa. Nao crie tarefas genericas do tipo "ler o documento" ou "acompanhar resultados" sem acao concreta.

Responda APENAS com JSON valido no formato:
{"resumo":"resumo do documento em 1-2 frases","tarefas":[{"titulo":"","descricao":"","responsavel":null,"prazoTexto":null,"prioridade":"media","categoria":"","trecho":""}]}`;

async function chamarOpenAI(bloco, contexto) {
  const modelo = db.config.modeloIA || 'gpt-4o-mini';
  const resposta = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: modelo,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SISTEMA },
        {
          role: 'user',
          content: `${contexto}\n\n--- CONTEUDO DO DOCUMENTO ---\n${bloco}`
        }
      ]
    })
  });

  if (!resposta.ok) {
    const texto = await resposta.text();
    throw new Error(`OpenAI ${resposta.status}: ${texto.slice(0, 300)}`);
  }

  const dados = await resposta.json();
  const conteudo = dados?.choices?.[0]?.message?.content || '{}';
  const limpo = conteudo.replace(/^```json/i, '').replace(/```$/g, '').trim();
  try {
    return JSON.parse(limpo);
  } catch {
    return { resumo: '', tarefas: [] };
  }
}

/**
 * Analisa o texto do documento e devolve { resumo, tarefas[] }.
 * Cai no modo heuristico se nao houver OPENAI_API_KEY configurada.
 */
export async function analisarDocumento(texto, meta = {}) {
  if (!texto || texto.trim().length < 40) {
    return { resumo: '', tarefas: [], modo: 'vazio' };
  }

  const nomesEquipe = db.usuarios
    .filter((u) => u.ativo !== false)
    .map((u) => u.nome)
    .join(', ');

  const contexto = [
    meta.nomeArquivo ? `Arquivo: ${meta.nomeArquivo}` : '',
    meta.projeto ? `Projeto: ${meta.projeto}` : '',
    nomesEquipe ? `Pessoas cadastradas na equipe (use para reconhecer nomes citados): ${nomesEquipe}` : ''
  ]
    .filter(Boolean)
    .join('\n');

  if (!temChave()) {
    return { ...heuristico(texto), modo: 'heuristico' };
  }

  const blocos = fatiar(texto);
  const todas = [];
  let resumo = '';

  for (let i = 0; i < blocos.length; i++) {
    const marcador = blocos.length > 1 ? `\n(Parte ${i + 1} de ${blocos.length})` : '';
    try {
      const r = await chamarOpenAI(blocos[i], contexto + marcador);
      if (!resumo && r.resumo) resumo = r.resumo;
      if (Array.isArray(r.tarefas)) todas.push(...r.tarefas);
    } catch (e) {
      console.error(`[ia] bloco ${i + 1} falhou:`, e.message);
      if (i === 0 && blocos.length === 1) throw e;
    }
  }

  return { resumo, tarefas: deduplicar(todas), modo: 'ia' };
}

function deduplicar(tarefas) {
  const vistas = new Set();
  const saida = [];
  for (const t of tarefas) {
    if (!t || !t.titulo) continue;
    const chave = normalizar(t.titulo).slice(0, 60);
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    saida.push({
      titulo: String(t.titulo).trim().slice(0, 180),
      descricao: String(t.descricao || '').trim().slice(0, 2000),
      responsavel: t.responsavel ? String(t.responsavel).trim() : null,
      prazoTexto: t.prazoTexto ? String(t.prazoTexto).trim() : null,
      prioridade: ['baixa', 'media', 'alta', 'urgente'].includes(String(t.prioridade).toLowerCase())
        ? String(t.prioridade).toLowerCase()
        : 'media',
      categoria: String(t.categoria || '').trim().toLowerCase().slice(0, 40),
      trecho: String(t.trecho || '').trim().slice(0, 300)
    });
  }
  return saida;
}

/* ---------- Modo heuristico (sem IA) ---------- */

const GATILHOS = /^\s*(?:[-*\u2022\u25aa\u25cf]|\d+[.)])\s+/;
const VERBOS = /\b(criar|fazer|montar|gravar|enviar|revisar|atualizar|definir|entrar em contato|ligar|agendar|publicar|produzir|organizar|treinar|implementar|configurar|validar|apresentar|entregar|desenvolver|ajustar|preparar|analisar|levantar|contratar|comprar|negociar|documentar|testar|corrigir|lancar|divulgar)\b/i;

function heuristico(texto) {
  const linhas = texto.split('\n');
  const tarefas = [];
  for (const linha of linhas) {
    const limpa = linha.replace(GATILHOS, '').trim();
    if (limpa.length < 12 || limpa.length > 240) continue;
    const ehItem = GATILHOS.test(linha);
    if (!ehItem && !VERBOS.test(limpa)) continue;
    if (ehItem && !VERBOS.test(limpa)) continue;
    tarefas.push({
      titulo: limpa.slice(0, 180),
      descricao: '',
      responsavel: detectarNomeNaLinha(limpa),
      prazoTexto: null,
      prioridade: /urgente|imediato|hoje/i.test(limpa) ? 'urgente' : 'media',
      categoria: '',
      trecho: limpa.slice(0, 300)
    });
    if (tarefas.length >= 80) break;
  }
  return {
    resumo: 'Extracao automatica sem IA (OPENAI_API_KEY nao configurada).',
    tarefas: deduplicar(tarefas)
  };
}

function detectarNomeNaLinha(linha) {
  const texto = normalizar(linha);
  const ativos = db.usuarios.filter((u) => u.ativo !== false);

  // primeiros nomes repetidos (ex.: dois "Lucas") nao servem como pista sozinhos
  const contagemPrimeiro = {};
  for (const u of ativos) {
    const p = normalizar(u.nome).split(' ')[0];
    contagemPrimeiro[p] = (contagemPrimeiro[p] || 0) + 1;
  }

  for (const u of ativos) {
    // nome completo e apelidos cadastrados valem a partir de 2 letras ("Gi", "Thi")
    const alvos = [u.nome, ...(u.apelidos || [])]
      .map(normalizar)
      .filter((c) => c && c.length >= 2);

    // primeiro nome derivado exige 3+ letras e nao pode ser ambiguo
    const primeiro = normalizar(u.nome).split(' ')[0];
    if (primeiro.length >= 3 && contagemPrimeiro[primeiro] === 1) alvos.push(primeiro);

    for (const chave of alvos) {
      if (new RegExp(`\\b${escapar(chave)}\\b`).test(texto)) return u.nome;
    }
  }
  return null;
}

/* ---------- Casamento de nomes com usuarios ---------- */

export function normalizar(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapar(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Tenta casar um nome bruto vindo do documento com um usuario cadastrado.
 * Ordem: nome completo -> apelido -> primeiro nome unico -> email.
 * Retorna o usuario ou null (ambiguidade tambem retorna null: vai para triagem).
 */
export function casarUsuario(nomeBruto) {
  if (!nomeBruto) return null;
  const alvo = normalizar(nomeBruto);
  if (!alvo || alvo.length < 2) return null;

  const ativos = db.usuarios.filter((u) => u.ativo !== false);

  // 1. nome completo exato
  let achado = ativos.find((u) => normalizar(u.nome) === alvo);
  if (achado) return achado;

  // 2. apelido exato
  achado = ativos.find((u) => (u.apelidos || []).some((a) => normalizar(a) === alvo));
  if (achado) return achado;

  // 3. email / parte do email
  achado = ativos.find((u) => normalizar(u.email).split(' ')[0] === alvo);
  if (achado) return achado;

  // 4. nome do usuario contem o alvo inteiro (ex.: "Lucas Silva" contem "lucas silva")
  const contidos = ativos.filter((u) => normalizar(u.nome).includes(alvo));
  if (contidos.length === 1) return contidos[0];

  // 5. primeiro nome - so aceita se for unico entre os ativos
  const primeiro = alvo.split(' ')[0];
  const porPrimeiro = ativos.filter((u) => normalizar(u.nome).split(' ')[0] === primeiro);
  if (porPrimeiro.length === 1) return porPrimeiro[0];

  // ambiguo (ex.: dois "Lucas") -> gestor decide
  return null;
}

/** Converte "ate 30/09", "ate sexta", "em 15 dias" em ISO date, quando possivel. */
export function interpretarPrazo(texto, base = new Date()) {
  if (!texto) return null;
  const t = normalizar(texto);

  let m = t.match(/(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})(?:\s*[\/\-\.]\s*(\d{2,4}))?/);
  if (m) {
    const dia = Number(m[1]);
    const mes = Number(m[2]) - 1;
    let ano = m[3] ? Number(m[3]) : base.getFullYear();
    if (ano < 100) ano += 2000;
    const d = new Date(ano, mes, dia, 12, 0, 0);
    if (!isNaN(d) && d.getDate() === dia) {
      if (!m[3] && d < base) d.setFullYear(ano + 1);
      return d.toISOString().slice(0, 10);
    }
  }

  m = t.match(/(?:em|dentro de|daqui)\s+(\d{1,3})\s*(dia|dias|semana|semanas|mes|meses)/);
  if (m) {
    const n = Number(m[1]);
    const d = new Date(base);
    if (m[2].startsWith('dia')) d.setDate(d.getDate() + n);
    else if (m[2].startsWith('semana')) d.setDate(d.getDate() + n * 7);
    else d.setMonth(d.getMonth() + n);
    return d.toISOString().slice(0, 10);
  }

  if (/\bhoje\b/.test(t)) return new Date(base).toISOString().slice(0, 10);
  if (/\bamanha\b/.test(t)) {
    const d = new Date(base); d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  const semana = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
  for (const [nome, idx] of Object.entries(semana)) {
    if (new RegExp(`\\b${nome}`).test(t)) {
      const d = new Date(base);
      const delta = (idx - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + delta);
      return d.toISOString().slice(0, 10);
    }
  }

  return null;
}
