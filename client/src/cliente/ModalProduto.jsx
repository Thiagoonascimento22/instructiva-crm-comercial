import React, { useEffect, useMemo, useState } from 'react';
import { reais, Ico, usarCarrinho, usarAviso, Camada } from '../comum/uteis.jsx';

export default function ModalProduto({ produto, tamanhoPreferido = 'P', aoFechar }) {
  const carrinho = usarCarrinho();
  const aviso = usarAviso();
  const [selecao, setSelecao] = useState({});
  const [qtd, setQtd] = useState(1);
  const [obs, setObs] = useState('');
  const [tentou, setTentou] = useState(false);

  useEffect(() => {
    // pré-seleciona a primeira opção dos grupos obrigatórios de escolha única
    const inicial = {};
    for (const g of produto.grupos || []) {
      if (g.obrigatorio && g.tipo === 'unico' && g.itens?.length) {
        const ehTamanho = /tamanho/i.test(g.nome);
        const preferido = ehTamanho
          ? g.itens.find((i) => {
              const n = i.nome;
              const letra = /grande|\(g\)/i.test(n) ? 'G' : /m[ée]di/i.test(n) ? 'M' : 'P';
              return letra === tamanhoPreferido;
            })
          : null;
        inicial[g.id] = [(preferido || g.itens[0]).id];
      }
      else inicial[g.id] = [];
    }
    setSelecao(inicial);
    setQtd(1);
    setObs('');
    setTentou(false);
  }, [produto.id, tamanhoPreferido]);

  const alternar = (grupo, item) => {
    setSelecao((atual) => {
      const marcados = atual[grupo.id] || [];
      if (grupo.tipo === 'unico') {
        if (marcados[0] === item.id && !grupo.obrigatorio) return { ...atual, [grupo.id]: [] };
        return { ...atual, [grupo.id]: [item.id] };
      }
      if (marcados.includes(item.id)) return { ...atual, [grupo.id]: marcados.filter((x) => x !== item.id) };
      const max = grupo.max || 99;
      if (marcados.length >= max) {
        aviso(`Você pode escolher até ${max} ${max === 1 ? 'item' : 'itens'} em ${grupo.nome}.`, 'erro');
        return atual;
      }
      return { ...atual, [grupo.id]: [...marcados, item.id] };
    });
  };

  const escolhidos = useMemo(() => {
    return (produto.grupos || []).map((g) => ({
      grupo: g,
      itens: (g.itens || []).filter((i) => (selecao[g.id] || []).includes(i.id)),
    })).filter((x) => x.itens.length);
  }, [selecao, produto]);

  const precoBase = produto.precoPromo != null && produto.precoPromo !== '' ? Number(produto.precoPromo) : Number(produto.preco);
  const adicionais = escolhidos.reduce((s, e) => s + e.itens.reduce((x, i) => x + Number(i.preco || 0), 0), 0);
  const precoUnit = precoBase + adicionais;

  const faltando = (produto.grupos || []).filter((g) => {
    const n = (selecao[g.id] || []).length;
    const min = g.obrigatorio ? Math.max(1, g.min || 1) : 0;
    return n < min;
  });

  const tamanho = useMemo(() => {
    const g = escolhidos.find((e) => /tamanho/i.test(e.grupo.nome));
    const nome = g?.itens[0]?.nome || '';
    if (/grande|\(g\)/i.test(nome)) return 'G';
    if (/m[ée]dia|m[ée]dio|\(m\)/i.test(nome)) return 'M';
    return 'P';
  }, [escolhidos]);

  const ehMarmita = (produto.grupos || []).some((g) => /tamanho/i.test(g.nome));

  function adicionar() {
    setTentou(true);
    if (faltando.length) {
      aviso(`Escolha ${faltando[0].nome.toLowerCase()} para continuar.`, 'erro');
      document.getElementById(`grupo-${faltando[0].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    carrinho.adicionar({
      produtoId: produto.id,
      nome: produto.nome,
      qtd,
      precoUnit,
      obs: obs.trim(),
      grupos: escolhidos.map((e) => ({ grupoId: e.grupo.id, nome: e.grupo.nome, itens: e.itens.map((i) => i.id), nomes: e.itens.map((i) => i.nome) })),
    });
    aviso(`${qtd}× ${produto.nome} no carrinho`);
    aoFechar();
  }

  return (
    <Camada travarFundo>

    <div className="cortina" onClick={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="janela" role="dialog" aria-label={produto.nome}>
        <div className="janela-topo">
          <button className="icone-botao" onClick={aoFechar} aria-label="Fechar"><Ico.Fechar /></button>
          <span className="janela-titulo">{produto.nome}</span>
        </div>

        <div className="janela-corpo">
          {produto.imagem && (
            <div className="detalhe-midia">
              <img className="desfoque" src={produto.imagem} alt="" aria-hidden />
              <img className="nitida" src={produto.imagem} alt={produto.nome} />
            </div>
          )}

          <div className="detalhe-topo">
            <h2 className="detalhe-nome">{produto.nome}</h2>
            {produto.composicao?.length > 0 ? (
              <div className="leva">
                {produto.composicao.map((c) => <span key={c}>{c}</span>)}
              </div>
            ) : produto.descricao ? (
              <p className="detalhe-desc">{produto.descricao}</p>
            ) : null}
            <div className="detalhe-preco">
              {reais(precoUnit)}
              {adicionais > 0 && (
                <span style={{ fontSize: 13, color: 'var(--tinta-media)', fontFamily: 'var(--corpo)', fontWeight: 600 }}>
                  {' '}· {reais(precoBase)} + {reais(adicionais)} em opções
                </span>
              )}
            </div>
          </div>

          {(produto.grupos || []).map((g) => {
            const marcados = selecao[g.id] || [];
            const min = g.obrigatorio ? Math.max(1, g.min || 1) : 0;
            const completo = marcados.length >= min;
            const regra = g.tipo === 'unico'
              ? 'Escolha 1 opção'
              : `Escolha até ${g.max || (g.itens || []).length}${marcados.length ? ` · ${marcados.length} selecionado${marcados.length > 1 ? 's' : ''}` : ''}`;
            return (
              <div className="bloco-opcao" key={g.id} id={`grupo-${g.id}`}>
                <div className="bloco-opcao-topo">
                  <div>
                    <div className="bloco-opcao-nome">{g.nome}</div>
                    <div className="bloco-opcao-regra">{regra}</div>
                  </div>
                  {g.obrigatorio
                    ? <span className={`marca-regra ${completo ? 'ok' : ''}`}>{completo ? 'pronto' : tentou ? 'falta' : 'obrigatório'}</span>
                    : <span className="marca-regra livre">opcional</span>}
                </div>
                {(g.itens || []).map((i) => {
                  const marcado = marcados.includes(i.id);
                  return (
                    <button key={i.id} className={`escolha-linha ${marcado ? 'on' : ''}`} onClick={() => alternar(g, i)}>
                      <span className={`caixa ${g.tipo === 'multiplo' ? 'quadra' : ''}`}>{marcado && <Ico.Check />}</span>
                      <span className="escolha-info">
                        <span className="nome">{i.nome}</span>
                        {Number(i.preco) > 0 && <span className="mais">+ {reais(i.preco)}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}

          <div className="bloco-opcao">
            <div className="bloco-opcao-topo">
              <div>
                <div className="bloco-opcao-nome">Alguma observação?</div>
                <div className="bloco-opcao-regra">Ex.: sem cebola, ponto da carne, deixar na portaria</div>
              </div>
            </div>
            <div className="campo">
              <textarea
                value={obs}
                onChange={(e) => setObs(e.target.value.slice(0, 240))}
                placeholder="Escreva aqui se precisar de algo diferente"
              />
            </div>
          </div>
          <div style={{ height: 8 }} />
        </div>

        <div className="janela-pe">
          <div className="contador">
            <button onClick={() => setQtd((q) => Math.max(1, q - 1))} disabled={qtd <= 1} aria-label="Diminuir">−</button>
            <span className="valor">{qtd}</span>
            <button onClick={() => setQtd((q) => Math.min(30, q + 1))} aria-label="Aumentar">+</button>
          </div>
          <button className="btn btn-primario" onClick={adicionar}>
            <span>Adicionar</span>
            <span style={{ fontFamily: 'var(--display)', fontSize: 16 }}>{reais(precoUnit * qtd)}</span>
          </button>
        </div>
      </div>
      </div>
    </Camada>
  );
}
