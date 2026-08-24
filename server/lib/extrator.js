import fsp from 'fs/promises';
import path from 'path';

/**
 * Extrai texto puro de um arquivo enviado.
 * Suporta: PDF, DOCX, TXT, MD, CSV, JSON.
 */
export async function extrairTexto(caminho, nomeOriginal = '') {
  const ext = path.extname(nomeOriginal || caminho).toLowerCase();

  if (ext === '.pdf') {
    return await lerPdf(caminho);
  }

  if (ext === '.docx') {
    const mammoth = (await import('mammoth')).default;
    const { value } = await mammoth.extractRawText({ path: caminho });
    return limpar(value || '');
  }

  if (['.txt', '.md', '.markdown', '.csv', '.json', '.rtf'].includes(ext)) {
    const bruto = await fsp.readFile(caminho, 'utf8');
    return limpar(bruto);
  }

  if (ext === '.doc') {
    throw new Error('Formato .doc antigo nao suportado. Salve como .docx ou PDF.');
  }

  throw new Error(`Formato ${ext || 'desconhecido'} nao suportado. Use PDF, DOCX, TXT ou MD.`);
}

/**
 * Le PDF com pdfjs-dist (legacy build, roda no Node sem worker).
 * Reconstroi as quebras de linha pela coordenada Y de cada fragmento -
 * sem isso o playbook vira um paragrafo unico e a IA perde os itens de lista.
 * Se o pdfjs falhar, tenta o pdf-parse como reserva.
 */
async function lerPdf(caminho) {
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const dados = new Uint8Array(await fsp.readFile(caminho));
    const doc = await pdfjs.getDocument({
      data: dados,
      useSystemFonts: true,
      isEvalSupported: false,
      verbosity: 0
    }).promise;

    let texto = '';
    for (let n = 1; n <= doc.numPages; n++) {
      const pagina = await doc.getPage(n);
      const conteudo = await pagina.getTextContent();
      let linha = '';
      let ultimoY = null;

      for (const item of conteudo.items) {
        const y = item.transform[5];
        if (ultimoY !== null && Math.abs(y - ultimoY) > 2) {
          texto += `${linha.trim()}\n`;
          linha = '';
        }
        linha += item.str;
        ultimoY = y;
      }
      texto += `${linha.trim()}\n\n`;
    }

    const pronto = limpar(texto);
    if (pronto.length > 20) return pronto;
    throw new Error('PDF sem camada de texto');
  } catch (e) {
    try {
      const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
      const buffer = await fsp.readFile(caminho);
      const r = await pdfParse(buffer);
      const pronto = limpar(r.text || '');
      if (pronto.length > 20) return pronto;
    } catch {}
    throw new Error(
      'Nao consegui ler o texto deste PDF. Se ele for digitalizado (imagem), converta para texto antes de enviar.'
    );
  }
}

function limpar(texto) {
  return texto
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Quebra o texto em blocos respeitando paragrafos, para caber no contexto da IA. */
export function fatiar(texto, tamanho = 11000) {
  if (texto.length <= tamanho) return [texto];
  const paragrafos = texto.split(/\n\n+/);
  const blocos = [];
  let atual = '';
  for (const p of paragrafos) {
    if ((atual + '\n\n' + p).length > tamanho && atual) {
      blocos.push(atual);
      atual = p;
    } else {
      atual = atual ? `${atual}\n\n${p}` : p;
    }
  }
  if (atual) blocos.push(atual);
  return blocos;
}
