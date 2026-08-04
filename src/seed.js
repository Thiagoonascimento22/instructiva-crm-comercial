// Dados iniciais reais da Marmitaria Sabor Brasil (Toledo/PR).
// Tudo aqui é editável pelo painel administrativo depois do primeiro deploy.

const TURBINE = {
  id: 'g_turbine',
  nome: 'Turbine seu prato',
  tipo: 'multiplo',
  obrigatorio: false,
  min: 0,
  max: 8,
  itens: [
    { id: 'i_bife', nome: 'Bife bovino', preco: 8.99 },
    { id: 'i_peito', nome: 'Peito de frango', preco: 7.0 },
    { id: 'i_fcarioca_x', nome: 'Feijão carioca (porção extra)', preco: 8.0 },
    { id: 'i_arroz_x', nome: 'Arroz branco (porção extra)', preco: 7.0 },
    { id: 'i_fpreto_x', nome: 'Feijão preto (porção extra)', preco: 8.0 },
    { id: 'i_batata_x', nome: 'Batata frita (porção extra)', preco: 9.0 },
    { id: 'i_farofa_x', nome: 'Farofa (porção extra)', preco: 8.0 },
    { id: 'i_ovo_x', nome: 'Ovo frito', preco: 2.5 },
  ],
};

const TAMANHO = {
  id: 'g_tamanho',
  nome: 'Tamanho da marmita',
  tipo: 'unico',
  obrigatorio: true,
  min: 1,
  max: 1,
  itens: [
    { id: 'i_p', nome: 'Pequena (P)', preco: 0 },
    { id: 'i_m', nome: 'Média (M)', preco: 3.0 },
    { id: 'i_g', nome: 'Grande (G)', preco: 7.0 },
  ],
};

const FEIJAO = {
  id: 'g_feijao',
  nome: 'Feijão',
  tipo: 'unico',
  obrigatorio: true,
  min: 1,
  max: 1,
  itens: [
    { id: 'i_carioca', nome: 'Carioca', preco: 0 },
    { id: 'i_preto', nome: 'Preto', preco: 0 },
    { id: 'i_sem_feijao', nome: 'Sem feijão', preco: 0 },
  ],
};

const TALHER = {
  id: 'g_talher',
  nome: 'Talheres',
  tipo: 'unico',
  obrigatorio: true,
  min: 1,
  max: 1,
  itens: [
    { id: 'i_com_talher', nome: 'Com talher', preco: 0 },
    { id: 'i_sem_talher', nome: 'Sem talher', preco: 0 },
  ],
};

const clonar = (o) => JSON.parse(JSON.stringify(o));

function marmita(id, nome, proteina, composicao, ordem, semFeijao = false, imagem = '') {
  return {
    id,
    categoriaId: 'cat_marmitex',
    nome,
    descricao: composicao.join(' · '),
    composicao,
    proteina,
    preco: 18.99,
    precoPromo: null,
    imagem,
    ativo: true,
    destaque: ordem <= 3,
    esgotado: false,
    ordem,
    grupos: semFeijao
      ? [clonar(TAMANHO), clonar(TALHER), clonar(TURBINE)]
      : [clonar(TAMANHO), clonar(FEIJAO), clonar(TALHER), clonar(TURBINE)],
  };
}

function simples(id, categoriaId, nome, preco, ordem, descricao = '') {
  return {
    id, categoriaId, nome, descricao, composicao: [], proteina: '',
    preco, precoPromo: null, imagem: '', ativo: true, destaque: false,
    esgotado: false, ordem, grupos: [],
  };
}

export const CONFIG_PADRAO = {
  nome: 'Marmitaria Sabor Brasil',
  slogan: 'Feitas com carinho para o seu dia',
  logo: '/logo.png',
  cor: '#0B5D2E',
  corSecundaria: '#F5B814',
  whatsapp: '5545999117844',
  whatsapp2: '5545998115352',
  instagram: 'marmitariasabor.brasil',
  endereco: 'Av. Senador Atilio Fontana, 3220 — Panorama, Toledo/PR',
  aberto: true,
  abrirAutomatico: true,
  horarios: [
    { dia: 0, nome: 'Domingo', ativo: false, abre: '10:30', fecha: '14:00' },
    { dia: 1, nome: 'Segunda', ativo: true, abre: '10:30', fecha: '14:00' },
    { dia: 2, nome: 'Terça', ativo: true, abre: '10:30', fecha: '14:00' },
    { dia: 3, nome: 'Quarta', ativo: true, abre: '10:30', fecha: '14:00' },
    { dia: 4, nome: 'Quinta', ativo: true, abre: '10:30', fecha: '14:00' },
    { dia: 5, nome: 'Sexta', ativo: true, abre: '10:30', fecha: '14:00' },
    { dia: 6, nome: 'Sábado', ativo: true, abre: '10:30', fecha: '14:00' },
  ],
  tempoPreparo: '30 a 45 min',
  pedidoMinimo: 0,
  avisoTopo: '',
  entrega: {
    entregaAtiva: true,
    retiradaAtiva: true,
    taxaPadrao: 6,
    bairros: [
      { nome: 'Panorama', taxa: 4, tempo: '20 a 30 min' },
      { nome: 'Centro', taxa: 6, tempo: '30 a 40 min' },
      { nome: 'Vila Industrial', taxa: 6, tempo: '30 a 40 min' },
      { nome: 'Jardim Coopagro', taxa: 7, tempo: '35 a 45 min' },
      { nome: 'Jardim Porto Alegre', taxa: 7, tempo: '35 a 45 min' },
      { nome: 'Jardim Gisela', taxa: 8, tempo: '40 a 50 min' },
    ],
  },
  pagamentos: {
    pix: { ativo: true, chave: '45999117844', titular: 'Marmitaria Sabor Brasil' },
    dinheiro: { ativo: true },
    cartaoEntrega: { ativo: true, detalhe: 'Débito e crédito na entrega' },
  },
};

export const CARDAPIO_PADRAO = {
  categorias: [
    { id: 'cat_marmitex', nome: 'Marmitex', descricao: 'Escolha o tamanho, o feijão e turbine do seu jeito', ordem: 1, ativo: true, icone: '🍛' },
    { id: 'cat_pf', nome: 'Prato feito', descricao: 'Servido no local', ordem: 2, ativo: true, icone: '🍽️' },
    { id: 'cat_buffet', nome: 'Buffet livre', descricao: 'À vontade, no salão', ordem: 3, ativo: true, icone: '🥘' },
    { id: 'cat_torresmo', nome: 'Copo de torresmo', descricao: 'Fresquinho, feito na casa', ordem: 4, ativo: true, icone: '🥓' },
    { id: 'cat_bebidas', nome: 'Bebidas', descricao: 'Geladinhas', ordem: 5, ativo: true, icone: '🥤' },
    { id: 'cat_extras', nome: 'Extras', descricao: '', ordem: 6, ativo: true, icone: '➕' },
  ],
  produtos: [
    marmita('prod_sobrecoxa', 'Marmita com Sobrecoxa Assada', 'sobrecoxa',
      ['Arroz', 'Feijão carioca ou preto', 'Macarrão alho e óleo', 'Farofa da casa', 'Salada da casa', 'Sobrecoxa assada'], 1, false, '/pratos/sobrecoxa.jpg'),
    marmita('prod_porco', 'Marmita com Porco Frito Acebolado', 'porco',
      ['Arroz', 'Feijão carioca ou preto', 'Macarrão alho e óleo', 'Farofa da casa', 'Salada da casa', 'Porco frito acebolado'], 2, false, '/pratos/porco.jpg'),
    marmita('prod_milanesa', 'Marmita com Frango à Milanesa', 'milanesa',
      ['Arroz', 'Feijão carioca ou preto', 'Macarrão alho e óleo', 'Farofa da casa', 'Salada da casa', 'Frango à milanesa'], 3, false, '/pratos/milanesa.jpg'),
    marmita('prod_cuscuz', 'Marmita com Cuscuz Tradicional', 'cuscuz',
      ['Cuscuz', 'Calabresa', 'Ovo', 'Bacon'], 4, true, '/pratos/cuscuz.jpg'),
    marmita('prod_ovolacto', 'Marmita Ovolactovegetariana', 'ovo',
      ['Arroz', 'Feijão carioca ou preto', 'Macarrão alho e óleo', 'Farofa da casa', 'Salada da casa', '2 ovos'], 5, false, '/pratos/ovolacto.jpg'),

    simples('prod_pf_dia', 'cat_pf', 'Prato feito do dia', 35.0, 1, 'O prato do dia, montado na hora'),
    simples('prod_pf', 'cat_pf', 'Prato feito', 26.0, 2),
    simples('prod_pf_sab', 'cat_pf', 'Prato feito de sábado', 29.9, 3),
    simples('prod_pf_crianca', 'cat_pf', 'Prato feito criança', 19.9, 4),

    simples('prod_buffet', 'cat_buffet', 'Buffet livre', 32.0, 1, 'À vontade'),
    simples('prod_buffet_carne', 'cat_buffet', 'Buffet livre com carne assada', 39.0, 2),

    { ...simples('prod_torresmo', 'cat_torresmo', 'Copo de torresmo 150g', 10.0, 1, 'Torresmo fresquinho, caseiro e crocante'), imagem: '/pratos/torresmo.jpg', destaque: true },

    { ...simples('prod_coca2l', 'cat_bebidas', 'Coca-Cola 2L', 17.0, 1), imagem: '/pratos/coca2l.jpg' },
    { ...simples('prod_coca2lz', 'cat_bebidas', 'Coca-Cola 2L Zero', 17.0, 2), imagem: '/pratos/coca2lz.jpg' },
    { ...simples('prod_coca600', 'cat_bebidas', 'Coca-Cola 600ml', 9.5, 3), imagem: '/pratos/coca600.jpg' },
    { ...simples('prod_coca600z', 'cat_bebidas', 'Coca-Cola 600ml Zero', 9.5, 4), imagem: '/pratos/coca600z.jpg' },
    { ...simples('prod_coca350', 'cat_bebidas', 'Coca-Cola lata 350ml', 7.0, 5), imagem: '/pratos/coca350.jpg' },
    { ...simples('prod_coca350z', 'cat_bebidas', 'Coca-Cola Zero lata 350ml', 7.0, 6), imagem: '/pratos/coca350.jpg' },
    { ...simples('prod_guarana2l', 'cat_bebidas', 'Guaraná Antarctica 2L', 16.0, 7), imagem: '/pratos/guarana350.jpg' },
    { ...simples('prod_guarana350', 'cat_bebidas', 'Guaraná Antarctica lata 350ml', 7.0, 8), imagem: '/pratos/guarana350.jpg' },
    { ...simples('prod_guarana350z', 'cat_bebidas', 'Guaraná Zero lata 350ml', 7.0, 9), imagem: '/pratos/guarana350z.jpg' },
    simples('prod_fanta2l', 'cat_bebidas', 'Fanta Laranja 2L', 15.0, 10),
    simples('prod_fanta350', 'cat_bebidas', 'Fanta Laranja lata 350ml', 7.0, 11),
    { ...simples('prod_sprite', 'cat_bebidas', 'Sprite Lemon Fresh 510ml', 6.0, 12), imagem: '/pratos/sprite.jpg' },
    { ...simples('prod_suco_laranja', 'cat_bebidas', 'Suco de laranja natural', 8.0, 13, 'Feito na hora'), imagem: '/pratos/suco_laranja.jpg' },
    simples('prod_del_vale', 'cat_bebidas', 'Suco Del Valle', 7.0, 14),
    { ...simples('prod_agua_gas', 'cat_bebidas', 'Água mineral com gás 510ml', 4.5, 15), imagem: '/pratos/agua_gas.jpg' },

    simples('prod_trident', 'cat_extras', 'Trident', 4.0, 1),
  ],
};
