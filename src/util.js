import crypto from 'crypto';

export function id(prefixo = '') {
  return prefixo + crypto.randomBytes(8).toString('hex');
}

export function token() {
  return crypto.randomBytes(16).toString('hex');
}

// Normalização BR: remove DDI 55 quando length >= 12, usa DDD + 8 últimos dígitos
export function normalizarTelefone(valor = '') {
  let d = String(valor).replace(/\D/g, '');
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  if (d.length < 10) return d;
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  return ddd + resto.slice(-8);
}

export function telefoneCompleto(valor = '') {
  let d = String(valor).replace(/\D/g, '');
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  return '55' + d;
}

export function dinheiro(n) {
  return Number(n || 0).toFixed(2).replace('.', ',');
}

export function lojaAberta(config) {
  if (!config.abrirAutomatico) return !!config.aberto;
  const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const dia = agora.getDay();
  const faixa = (config.horarios || []).find((h) => h.dia === dia);
  if (!faixa || !faixa.ativo) return false;
  const minutos = agora.getHours() * 60 + agora.getMinutes();
  const [ha, ma] = String(faixa.abre || '00:00').split(':').map(Number);
  const [hf, mf] = String(faixa.fecha || '23:59').split(':').map(Number);
  return minutos >= ha * 60 + ma && minutos <= hf * 60 + mf;
}

// Recalcula o pedido no servidor a partir do cardápio real (nunca confiar no preço enviado pelo cliente)
export function montarPedido({ itens = [], tipo, bairro }, cardapio, config) {
  const erros = [];
  const itensFinal = [];

  for (const bruto of itens) {
    const produto = cardapio.produtos.find((p) => p.id === bruto.produtoId);
    if (!produto || !produto.ativo) { erros.push('Um item do carrinho não está mais disponível.'); continue; }
    if (produto.esgotado) { erros.push(`${produto.nome} está esgotado.`); continue; }

    const qtd = Math.max(1, Math.min(50, parseInt(bruto.qtd, 10) || 1));
    const base = produto.precoPromo != null && produto.precoPromo !== '' ? Number(produto.precoPromo) : Number(produto.preco);
    let unitario = base;
    const gruposEscolhidos = [];

    for (const grupo of produto.grupos || []) {
      const escolhidoBruto = (bruto.grupos || []).find((g) => g.grupoId === grupo.id);
      const idsEscolhidos = escolhidoBruto ? escolhidoBruto.itens || [] : [];
      const itensValidos = (grupo.itens || []).filter((i) => idsEscolhidos.includes(i.id));

      const min = grupo.obrigatorio ? Math.max(1, grupo.min || 1) : grupo.min || 0;
      const max = grupo.tipo === 'unico' ? 1 : grupo.max || (grupo.itens || []).length;

      if (itensValidos.length < min) { erros.push(`Escolha ${min > 1 ? min + ' opções' : 'uma opção'} em "${grupo.nome}" (${produto.nome}).`); continue; }
      if (itensValidos.length > max) { erros.push(`Máximo de ${max} em "${grupo.nome}" (${produto.nome}).`); continue; }

      for (const i of itensValidos) unitario += Number(i.preco || 0);
      if (itensValidos.length) {
        gruposEscolhidos.push({ nome: grupo.nome, itens: itensValidos.map((i) => ({ nome: i.nome, preco: Number(i.preco || 0) })) });
      }
    }

    itensFinal.push({
      produtoId: produto.id,
      nome: produto.nome,
      qtd,
      precoUnit: Number(unitario.toFixed(2)),
      grupos: gruposEscolhidos,
      obs: String(bruto.obs || '').slice(0, 240),
      subtotal: Number((unitario * qtd).toFixed(2)),
    });
  }

  if (!itensFinal.length) erros.push('Seu carrinho está vazio.');

  const subtotal = Number(itensFinal.reduce((s, i) => s + i.subtotal, 0).toFixed(2));

  let taxaEntrega = 0;
  if (tipo === 'entrega') {
    const cfgB = (config.entrega.bairros || []).find((b) => b.nome.toLowerCase() === String(bairro || '').toLowerCase());
    taxaEntrega = Number(cfgB ? cfgB.taxa : config.entrega.taxaPadrao || 0);
  }

  const minimo = Number(config.pedidoMinimo || 0);
  if (minimo > 0 && subtotal < minimo) erros.push(`O pedido mínimo é R$ ${dinheiro(minimo)}.`);

  return { itens: itensFinal, subtotal, taxaEntrega, total: Number((subtotal + taxaEntrega).toFixed(2)), erros };
}

export const STATUS = ['novo', 'aceito', 'preparando', 'saiu', 'entregue', 'cancelado'];
export const STATUS_LABEL = {
  novo: 'Pedido recebido',
  aceito: 'Pedido confirmado',
  preparando: 'Em preparo',
  saiu: 'Saiu para entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};
