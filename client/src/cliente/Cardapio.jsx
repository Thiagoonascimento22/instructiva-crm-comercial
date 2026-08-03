import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, reais, Ico, usarCarrinho, aplicarTema, BotaoTema } from '../comum/uteis.jsx';
import ModalProduto from './ModalProduto.jsx';

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

function proximaAbertura(config) {
  if (!config?.horarios?.length) return null;
  const agora = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(agora.getTime() + i * 86400000);
    const faixa = config.horarios.find((h) => h.dia === d.getDay());
    if (!faixa?.ativo) continue;
    if (i === 0) {
      const [h, m] = faixa.abre.split(':').map(Number);
      if (agora.getHours() * 60 + agora.getMinutes() < h * 60 + m) return `hoje às ${faixa.abre}`;
      continue;
    }
    return `${i === 1 ? 'amanhã' : DIAS[d.getDay()]} às ${faixa.abre}`;
  }
  return null;
}

// grupo de tamanho, quando o produto tiver
const grupoTamanho = (p) => (p.grupos || []).find((g) => /tamanho/i.test(g.nome));

function letraDoItem(nome = '') {
  if (/grande|\(g\)/i.test(nome)) return 'G';
  if (/m[ée]di/i.test(nome)) return 'M';
  return 'P';
}

export default function Cardapio() {
  const [loja, setLoja] = useState(null);
  const [erro, setErro] = useState('');
  const [ativa, setAtiva] = useState('');
  const [aberto, setAberto] = useState(null);
  const [busca, setBusca] = useState('');
  const [tamanho, setTamanho] = useState(() => localStorage.getItem('tamanho_preferido') || 'P');
  const carrinho = usarCarrinho();
  const navegar = useNavigate();
  const [pulsou, setPulsou] = useState(false);
  const refs = useRef({});
  const clique = useRef(false);
  const qtdAnterior = useRef(carrinho.quantidade);

  useEffect(() => {
    api('/api/loja')
      .then((d) => { setLoja(d); aplicarTema(d.config); setAtiva(d.categorias[0]?.id || ''); })
      .catch((e) => setErro(e.message));
  }, []);

  useEffect(() => { localStorage.setItem('tamanho_preferido', tamanho); }, [tamanho]);

  useEffect(() => {
    if (carrinho.quantidade > qtdAnterior.current) {
      setPulsou(true);
      const t = setTimeout(() => setPulsou(false), 420);
      qtdAnterior.current = carrinho.quantidade;
      return () => clearTimeout(t);
    }
    qtdAnterior.current = carrinho.quantidade;
  }, [carrinho.quantidade]);

  useEffect(() => {
    if (!loja) return;
    const obs = new IntersectionObserver(
      (ent) => {
        if (clique.current) return;
        const v = ent.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (v) setAtiva(v.target.dataset.cat);
      },
      { rootMargin: '-100px 0px -68% 0px' }
    );
    Object.values(refs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [loja, busca]);

  const irPara = (id) => {
    clique.current = true;
    setAtiva(id);
    setBusca('');
    setTimeout(() => refs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
    setTimeout(() => { clique.current = false; }, 800);
  };

  // opções de tamanho: lidas do próprio cardápio, não fixas no código
  const opcoesTamanho = useMemo(() => {
    if (!loja) return [];
    const g = loja.produtos.map(grupoTamanho).find(Boolean);
    if (!g) return [];
    return g.itens.map((i) => ({ letra: letraDoItem(i.nome), nome: i.nome, extra: Number(i.preco || 0) }));
  }, [loja]);

  const precoNoTamanho = (p) => {
    const base = p.precoPromo != null && p.precoPromo !== '' ? Number(p.precoPromo) : Number(p.preco);
    const g = grupoTamanho(p);
    if (!g) return { valor: base, temTamanho: false };
    const item = g.itens.find((i) => letraDoItem(i.nome) === tamanho) || g.itens[0];
    return { valor: base + Number(item?.preco || 0), temTamanho: true };
  };

  const resultados = useMemo(() => {
    if (!busca.trim() || !loja) return null;
    const q = busca.toLowerCase();
    return loja.produtos.filter((p) => p.nome.toLowerCase().includes(q) || (p.descricao || '').toLowerCase().includes(q));
  }, [busca, loja]);

  if (erro) return (
    <div className="tela-vazia" style={{ paddingTop: 100 }}>
      <div className="simbolo">⚠️</div><h2>Não deu para abrir o cardápio</h2><p>{erro}</p>
      <button className="btn btn-linha" style={{ maxWidth: 220, margin: '18px auto 0' }} onClick={() => location.reload()}>Tentar de novo</button>
    </div>
  );
  if (!loja) return <Esqueleto />;

  const { config, categorias, produtos } = loja;
  const abertura = !config.abertoAgora ? proximaAbertura(config) : null;
  const catsComItens = categorias.filter((c) => produtos.some((p) => p.categoriaId === c.id));

  return (
    <div className="pagina">
      <div className="faixa-marca" />

      <header className="cabecalho">
        <div className="cabecalho-inner">
          {config.logo && <img className="marca-logo" src={config.logo} alt="" />}
          <div className="marca-texto">
            <h1 className="marca-nome">{config.nome}</h1>
            <div className="marca-linha">
              <span className={`selo-aberto ${config.abertoAgora ? 'on' : 'off'}`}>
                <span className="bolha" />{config.abertoAgora ? 'Aberto' : 'Fechado'}
              </span>
              {config.tempoPreparo && <span>{config.tempoPreparo}</span>}
              {config.entrega?.entregaAtiva && <span className="so-desktop">· entrega a partir de {reais(config.entrega.taxaPadrao)}</span>}
              {config.entrega?.retiradaAtiva && <span className="so-desktop">· retirada no local</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <BuscaCampo valor={busca} aoMudar={setBusca} />
            <BotaoTema />
          </div>
        </div>
      </header>

      <div className="confianca">
        <span className="confianca-item">🍳 <b>Feita na hora</b></span>
        <span className="confianca-item">🚫 <b>Sem taxa</b> de aplicativo</span>
        {config.entrega?.entregaAtiva && <span className="confianca-item">🛵 Entrega em <b>{config.tempoPreparo}</b></span>}
        {config.entrega?.retiradaAtiva && <span className="confianca-item">🏠 <b>Retirada grátis</b></span>}
        <span className="confianca-item">💬 Fale com a cozinha</span>
      </div>

      {!config.abertoAgora && (
        <div className="aviso-barra fechado">
          Estamos fechados agora{abertura ? ` — abrimos ${abertura}` : ''}. Monte seu pedido e envie quando abrirmos.
        </div>
      )}
      {config.avisoTopo && <div className="aviso-barra alerta">{config.avisoTopo}</div>}

      <div className="layout">
        <div className="corpo-grade">
          {/* coluna de navegação (só no desktop) */}
          <aside className="coluna-nav">
            <div className="nav-rotulo">Cardápio</div>
            <nav className="nav-vertical">
              {catsComItens.map((c) => (
                <button key={c.id} className={`cat-pill ${ativa === c.id && !busca ? 'ativo' : ''}`} onClick={() => irPara(c.id)}>
                  {c.icone ? `${c.icone} ` : ''}{c.nome}
                </button>
              ))}
            </nav>
            <div className="cartao-loja">
              <div className="t">Onde estamos</div>
              {config.endereco}
              {config.whatsapp && (
                <a href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noreferrer"
                   style={{ display: 'block', marginTop: 10, color: 'var(--verde)', fontWeight: 600 }}>
                  Falar no WhatsApp
                </a>
              )}
            </div>
          </aside>

          {/* coluna central */}
          <main>
            {opcoesTamanho.length > 0 && !busca && (
              <section className="tamanhos">
                <div className="tamanhos-titulo">
                  <h2>Qual o tamanho da fome hoje?</h2>
                  <span>os preços do cardápio mudam junto</span>
                </div>
                <div className="tamanhos-grade">
                  {opcoesTamanho.map((t, i) => {
                    const exemplo = produtos.find((p) => grupoTamanho(p));
                    const base = exemplo ? Number(exemplo.precoPromo ?? exemplo.preco) : 0;
                    return (
                      <button
                        key={t.letra}
                        className={`cartao-tamanho ${tamanho === t.letra ? 'ativo' : ''} ${i === 1 ? 'tem-fita' : ''}`}
                        onClick={() => setTamanho(t.letra)}
                        aria-pressed={tamanho === t.letra}
                      >
                        {i === 1 && <span className="fita">MAIS PEDIDA</span>}
                        <div className="letra">{t.letra}</div>
                        <div className="rot">{t.nome.replace(/\s*\([PMG]\)/i, '')}</div>
                        <div className="val valor-forte">{reais(base + t.extra)}</div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* barra de categorias — mobile e tablet */}
            {!busca && (
              <div className="categorias-barra">
                <div className="categorias-lista">
                  {catsComItens.map((c) => (
                    <button key={c.id} className={`cat-pill ${ativa === c.id ? 'ativo' : ''}`} onClick={() => irPara(c.id)}>
                      {c.icone ? `${c.icone} ` : ''}{c.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {resultados ? (
              <section className="secao">
                <div className="secao-topo">
                  <div>
                    <h2>Resultados</h2>
                    <p className="sub">{resultados.length} item(ns) para “{busca}”</p>
                  </div>
                  <button className="btn btn-texto btn-p" onClick={() => setBusca('')}>limpar</button>
                </div>
                {resultados.length === 0
                  ? <div className="tela-vazia"><div className="simbolo">🔍</div><h2>Nada encontrado</h2><p>Tente outro nome, ou escolha uma categoria ao lado.</p></div>
                  : <Grade itens={resultados} preco={precoNoTamanho} aoAbrir={setAberto} tamanhoAtual={tamanho} />}
              </section>
            ) : (
              catsComItens.map((c) => {
                const itens = produtos.filter((p) => p.categoriaId === c.id);
                const destaque = itens.some((p) => grupoTamanho(p)) || itens.some((p) => p.imagem);
                return (
                  <section className="secao" key={c.id} data-cat={c.id} ref={(el) => (refs.current[c.id] = el)}>
                    <div className="secao-topo">
                      <div>
                        <h2>{c.nome}</h2>
                        {c.descricao && <p className="sub">{c.descricao}</p>}
                      </div>
                      <span className="contagem">{itens.length} {itens.length === 1 ? 'opção' : 'opções'}</span>
                    </div>
                    {destaque
                      ? <Grade itens={itens} preco={precoNoTamanho} aoAbrir={setAberto} tamanhoAtual={tamanho} />
                      : <GradeCompacta itens={itens} preco={precoNoTamanho} aoAbrir={setAberto} />}
                  </section>
                );
              })
            )}

            <footer className="rodape">
              <div className="nome">{config.nome}</div>
              {config.endereco && <p style={{ marginTop: 5 }}>{config.endereco}</p>}
              <div className="rodape-atalhos">
                {config.whatsapp && <a href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a>}
                {config.instagram && <a href={`https://instagram.com/${config.instagram}`} target="_blank" rel="noreferrer">@{config.instagram}</a>}
              </div>
              <p style={{ marginTop: 16, fontSize: 11.5 }}>Pedido direto com a cozinha. Sem taxa de aplicativo.</p>
            </footer>
          </main>

          {/* coluna do pedido (só no desktop) */}
          <aside className="coluna-pedido">
            <PainelPedido aoIrParaCheckout={() => navegar('/carrinho')} aoVerCardapio={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
          </aside>
        </div>
      </div>

      {carrinho.quantidade > 0 && (
        <div className="barra-flutuante">
          <button className="botao-pedido" onClick={() => navegar('/carrinho')}>
            <span className={`cont ${pulsou ? 'mudou' : ''}`}>{carrinho.quantidade}</span>
            <span>Ver meu pedido</span>
            <span className="val">{reais(carrinho.total)}</span>
          </button>
          <p className="garantia">Você confirma tudo na próxima tela antes de enviar</p>
        </div>
      )}

      {aberto && <ModalProduto produto={aberto} tamanhoPreferido={tamanho} aoFechar={() => setAberto(null)} />}
    </div>
  );
}

function BuscaCampo({ valor, aoMudar }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {aberto || valor ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            autoFocus value={valor} onChange={(e) => aoMudar(e.target.value)}
            placeholder="Buscar no cardápio…"
            onBlur={() => !valor && setAberto(false)}
            style={{ width: 190, border: '1px solid var(--linha-forte)', borderRadius: 999, padding: '9px 15px', background: 'var(--superficie)' }}
          />
          {valor && <button className="icone-botao" onClick={() => { aoMudar(''); setAberto(false); }} aria-label="Limpar busca"><Ico.Fechar /></button>}
        </div>
      ) : (
        <button className="icone-botao" onClick={() => setAberto(true)} aria-label="Buscar no cardápio"><Ico.Lupa /></button>
      )}
    </div>
  );
}

function Grade({ itens, preco, aoAbrir, tamanhoAtual }) {
  return (
    <div className="grade-pratos">
      {itens.map((p) => {
        const { valor, temTamanho } = preco(p);
        const promo = p.precoPromo != null && p.precoPromo !== '';
        return (
          <button key={p.id} className={`prato anima ${p.esgotado ? 'esgotado-item' : ''}`} onClick={(e) => !p.esgotado && aoAbrir(p, e)}>
            {p.imagem
              ? <img className="prato-foto" src={p.imagem} alt="" loading="lazy" />
              : <div className="prato-foto foto-ausente"><Ico.Prato /></div>}
            <div className="prato-corpo">
              {(p.destaque || promo) && (
                <div className="prato-selos">
                  {promo && <span className="selo-quente">promoção</span>}
                  {p.destaque && !promo && <span className="selo-quente">mais pedida</span>}
                </div>
              )}
              <div className="prato-nome">{p.nome}</div>
              {p.composicao?.length ? (
                <div className="prato-tags">
                  {p.composicao.slice(0, 4).map((c) => <span key={c}>{c}</span>)}
                  {p.composicao.length > 4 && <span>+{p.composicao.length - 4}</span>}
                </div>
              ) : p.descricao ? <p className="prato-desc">{p.descricao}</p> : null}
              <div className="prato-pe">
                <div className="prato-preco valor-forte">
                  {temTamanho
                    ? <span className="rotulo-de">tamanho {tamanhoAtual}</span>
                    : promo && <span className="rotulo-de" style={{ textDecoration: 'line-through' }}>{reais(p.preco)}</span>}
                  <span>{reais(valor)}</span>
                </div>
                {p.esgotado
                  ? <span className="tarja fora">esgotado</span>
                  : <span className="prato-add"><span className="mais-sinal">+</span><span className="rotulo">Adicionar</span></span>}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function GradeCompacta({ itens, preco, aoAbrir }) {
  return (
    <div className="grade-compacta">
      {itens.map((p) => (
        <button key={p.id} className={`compacto anima ${p.esgotado ? 'esgotado-item' : ''}`} onClick={() => !p.esgotado && aoAbrir(p)}>
          {p.imagem
            ? <img className="compacto-foto" src={p.imagem} alt="" loading="lazy" />
            : <div className="compacto-foto foto-ausente">{/bebida|suco|refri|água|agua/i.test(p.categoriaId + p.nome) ? <Ico.Copo /> : <Ico.Prato style={{ width: 22, height: 22 }} />}</div>}
          <div className="compacto-info">
            <div className="compacto-nome">{p.nome}</div>
            {p.descricao && <div className="compacto-desc">{p.descricao}</div>}
          </div>
          {p.esgotado ? <span className="tarja fora">esgotado</span> : <span className="compacto-preco valor-forte">{reais(preco(p).valor)}</span>}
        </button>
      ))}
    </div>
  );
}

/* Painel lateral do pedido — aparece no computador */
export function PainelPedido({ aoIrParaCheckout, aoVerCardapio }) {
  const carrinho = usarCarrinho();
  return (
    <div className="painel-pedido">
      <div className="painel-pedido-topo">
        <h3>Seu pedido</h3>
        <p className="sub">{carrinho.quantidade ? `${carrinho.quantidade} ${carrinho.quantidade === 1 ? 'item' : 'itens'}` : 'ainda vazio'}</p>
      </div>

      {carrinho.itens.length === 0 ? (
        <div className="painel-vazio">
          <div className="ilustra"><Ico.Sacola /></div>
          Escolha uma marmita ao lado.<br />Ela aparece aqui e você fecha o pedido em seguida.
        </div>
      ) : (
        <>
          <div className="painel-lista">
            {carrinho.itens.map((i) => (
              <div className="item-lista" key={i.chave}>
                <span className="pastilha-qtd">{i.qtd}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{i.nome}</div>
                  {i.grupos?.filter((g) => g.nomes?.length).map((g) => (
                    <div className="sub" key={g.grupoId}>{g.nomes.join(', ')}</div>
                  ))}
                  {i.obs && <div className="anotacao">{i.obs}</div>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                    <div className="contador" style={{ padding: 2 }}>
                      <button style={{ width: 28, height: 28, fontSize: 15 }} onClick={() => carrinho.alterarQtd(i.chave, i.qtd - 1)}>−</button>
                      <span className="n" style={{ minWidth: 22, fontSize: 13 }}>{i.qtd}</span>
                      <button style={{ width: 28, height: 28, fontSize: 15 }} onClick={() => carrinho.alterarQtd(i.chave, i.qtd + 1)}>+</button>
                    </div>
                    <button className="btn btn-texto btn-p" style={{ color: 'var(--vermelho)', padding: '4px 6px' }} onClick={() => carrinho.remover(i.chave)}>remover</button>
                  </div>
                </div>
                <div className="valor-forte" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>{reais(i.precoUnit * i.qtd)}</div>
              </div>
            ))}
          </div>
          <div className="linha-valor somatoria"><span>Subtotal</span><span>{reais(carrinho.total)}</span></div>
          <div style={{ padding: '4px 16px 16px' }}>
            <button className="btn btn-primario" onClick={aoIrParaCheckout}>Fechar pedido</button>
            <button className="btn btn-texto" style={{ marginTop: 4 }} onClick={aoVerCardapio}>continuar escolhendo</button>
          </div>
        </>
      )}
    </div>
  );
}


/* Enquanto o cardápio carrega, mostramos o formato da tela em vez de um giro */
function Esqueleto() {
  return (
    <div className="pagina esqueleto-pagina">
      <div className="faixa-marca" />
      <div className="sk-cabecalho">
        <div className="sk sk-circulo" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="sk sk-linha" style={{ width: '58%' }} />
          <div className="sk sk-linha" style={{ width: '34%', height: 10 }} />
        </div>
      </div>
      <div style={{ padding: '24px 18px 14px' }}>
        <div className="sk sk-linha" style={{ width: '62%', height: 18, marginBottom: 14 }} />
      </div>
      <div className="sk-pills">
        <div className="sk sk-pill" /><div className="sk sk-pill" /><div className="sk sk-pill" />
      </div>
      <div className="sk-cartoes">
        {[0, 1, 2].map((i) => (
          <div className="sk-cartao" key={i}>
            <div className="sk sk-foto" />
            <div className="sk-corpo">
              <div className="sk sk-linha" style={{ width: '72%' }} />
              <div className="sk sk-linha" style={{ width: '46%', height: 10 }} />
              <div className="sk sk-linha" style={{ width: '30%', height: 15, marginTop: 'auto' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
