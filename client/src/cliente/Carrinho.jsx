import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, reais, Ico, usarCarrinho, usarAviso, mascararTelefone, soDigitos, aplicarTema, BotaoTema } from '../comum/uteis.jsx';

const CHAVE_CLIENTE = 'sabor_brasil_cliente';

export default function Carrinho() {
  const carrinho = usarCarrinho();
  const aviso = usarAviso();
  const navegar = useNavigate();
  const [config, setConfig] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [tentou, setTentou] = useState(false);

  const [dados, setDados] = useState(() => {
    try { return { nome: '', telefone: '', rua: '', numero: '', bairro: '', complemento: '', referencia: '', ...JSON.parse(localStorage.getItem(CHAVE_CLIENTE) || '{}') }; }
    catch { return { nome: '', telefone: '', rua: '', numero: '', bairro: '', complemento: '', referencia: '' }; }
  });
  const [tipo, setTipo] = useState('entrega');
  const [forma, setForma] = useState('');
  const [trocoPara, setTrocoPara] = useState('');
  const [obs, setObs] = useState('');

  useEffect(() => {
    api('/api/loja').then((d) => {
      setConfig(d.config);
      aplicarTema(d.config);
      if (!d.config.entrega.entregaAtiva) setTipo('retirada');
      const f = d.config.pagamentos;
      setForma(f.pix.ativo ? 'pix' : f.dinheiro.ativo ? 'dinheiro' : 'cartao');
    }).catch(() => {});
    window.scrollTo(0, 0);
  }, []);

  const campo = (k) => (e) => setDados((d) => ({ ...d, [k]: e.target.value }));

  const bairroCfg = useMemo(
    () => (config?.entrega?.bairros || []).find((b) => b.nome.toLowerCase() === dados.bairro.toLowerCase()),
    [config, dados.bairro]
  );
  const taxa = tipo === 'entrega' ? Number(bairroCfg ? bairroCfg.taxa : config?.entrega?.taxaPadrao || 0) : 0;
  const total = carrinho.total + taxa;

  const erros = {};
  if (dados.nome.trim().length < 2) erros.nome = 'Informe seu nome';
  if (soDigitos(dados.telefone).length < 10) erros.telefone = 'WhatsApp com DDD';
  if (tipo === 'entrega') {
    if (!dados.rua.trim()) erros.rua = 'Informe a rua';
    if (!dados.numero.trim()) erros.numero = 'Nº';
    if (!dados.bairro.trim()) erros.bairro = 'Informe o bairro';
  }
  if (forma === 'dinheiro' && trocoPara && Number(trocoPara) < total) erros.troco = 'O valor precisa ser maior que o total';

  async function finalizar() {
    setTentou(true);
    const chaves = Object.keys(erros);
    if (chaves.length) {
      aviso('Confira os campos destacados para continuar.', 'erro');
      document.getElementById(`c-${chaves[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setEnviando(true);
    try {
      localStorage.setItem(CHAVE_CLIENTE, JSON.stringify(dados));
      const r = await api('/api/pedidos', {
        method: 'POST',
        body: {
          nome: dados.nome.trim(),
          telefone: dados.telefone,
          tipo,
          endereco: tipo === 'entrega' ? dados : null,
          formaPagamento: forma,
          trocoPara: forma === 'dinheiro' && trocoPara ? Number(trocoPara) : null,
          obs,
          itens: carrinho.itens.map((i) => ({
            produtoId: i.produtoId,
            qtd: i.qtd,
            obs: i.obs,
            grupos: i.grupos.map((g) => ({ grupoId: g.grupoId, itens: g.itens })),
          })),
        },
      });
      carrinho.limpar();
      navegar(`/pedido/${r.token}`, { replace: true });
    } catch (e) {
      aviso(e.message, 'erro');
    } finally {
      setEnviando(false);
    }
  }

  if (!carrinho.itens.length) {
    return (
      <div className="coluna-unica">
        <Topo titulo="Meu pedido" aoVoltar={() => navegar('/')} />
        <div className="tela-vazia">
          <div className="simbolo">🍽️</div>
          <h2>Seu carrinho está vazio</h2>
          <p>Escolha uma marmita no cardápio e ela aparece aqui.</p>
          <button className="btn btn-primario" style={{ marginTop: 20, maxWidth: 260 }} onClick={() => navegar('/')}>Ver o cardápio</button>
        </div>
      </div>
    );
  }

  const pag = config?.pagamentos;

  return (
    <div className="coluna-unica">
      <Topo titulo="Meu pedido" aoVoltar={() => navegar('/')} />

      <div className="cartao">
        <div className="cartao-rot">Itens</div>
        {carrinho.itens.map((i) => (
          <div className="item-lista" key={i.chave}>
            <span className="pastilha-qtd">{i.qtd}×</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{i.nome}</div>
              {i.grupos?.filter((g) => g.nomes?.length).map((g) => (
                <div className="sub" key={g.grupoId}><b style={{ color: 'var(--tinta)', fontWeight: 600 }}>{g.nome}:</b> {g.nomes.join(', ')}</div>
              ))}
              {i.obs && <div className="anotacao">📝 {i.obs}</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                <div className="contador" style={{ background: '#F4F1E8' }}>
                  <button onClick={() => carrinho.alterarQtd(i.chave, i.qtd - 1)} aria-label="Diminuir">−</button>
                  <span className="valor">{i.qtd}</span>
                  <button onClick={() => carrinho.alterarQtd(i.chave, i.qtd + 1)} aria-label="Aumentar">+</button>
                </div>
                <button className="btn btn-texto btn-p" style={{ color: 'var(--vermelho)' }} onClick={() => carrinho.remover(i.chave)}>Remover</button>
              </div>
            </div>
            <div style={{ fontWeight: 800, fontFamily: 'var(--display)', whiteSpace: 'nowrap' }}>{reais(i.precoUnit * i.qtd)}</div>
          </div>
        ))}
        <button className="btn btn-texto" style={{ borderTop: '1px solid var(--linha-forte)', borderRadius: 0, color: 'var(--verde)' }} onClick={() => navegar('/')}>
          + Adicionar mais itens
        </button>
      </div>

      <div className="cartao">
        <div className="cartao-rot">Como você quer receber</div>
        <div className="dupla">
          {config?.entrega?.entregaAtiva && (
            <button className={`opcao-grande ${tipo === 'entrega' ? 'on' : ''}`} onClick={() => setTipo('entrega')}>
              <div className="t">🛵 Entrega</div>
              <div className="s">{bairroCfg?.tempo || config?.tempoPreparo}</div>
            </button>
          )}
          {config?.entrega?.retiradaAtiva && (
            <button className={`opcao-grande ${tipo === 'retirada' ? 'on' : ''}`} onClick={() => setTipo('retirada')}>
              <div className="t">🏠 Retirar</div>
              <div className="s">Sem taxa</div>
            </button>
          )}
        </div>
        {tipo === 'retirada' && config?.endereco && (
          <div style={{ padding: '4px 16px 14px', fontSize: 13.5, color: 'var(--tinta-media)' }}>
            Retire em: <b style={{ color: 'var(--tinta)' }}>{config.endereco}</b>
          </div>
        )}
      </div>

      <div className="cartao">
        <div className="cartao-rot">Seus dados</div>
        <div className={`campo ${tentou && erros.nome ? 'erro' : ''}`} id="c-nome">
          <label>Nome</label>
          <input value={dados.nome} onChange={campo('nome')} placeholder="Como podemos te chamar" autoComplete="name" />
          {tentou && erros.nome && <div className="erro-txt">{erros.nome}</div>}
        </div>
        <div className={`campo ${tentou && erros.telefone ? 'erro' : ''}`} id="c-telefone">
          <label>WhatsApp</label>
          <input
            value={mascararTelefone(dados.telefone)}
            onChange={(e) => setDados((d) => ({ ...d, telefone: soDigitos(e.target.value) }))}
            placeholder="(45) 99999-9999" inputMode="tel" autoComplete="tel"
          />
          {tentou && erros.telefone && <div className="erro-txt">{erros.telefone}</div>}
        </div>

        {tipo === 'entrega' && (
          <>
            <div className={`campo ${tentou && erros.bairro ? 'erro' : ''}`} id="c-bairro">
              <label>Bairro</label>
              {config?.entrega?.bairros?.length ? (
                <select value={dados.bairro} onChange={campo('bairro')}>
                  <option value="">Selecione o bairro</option>
                  {config.entrega.bairros.map((b) => (
                    <option key={b.nome} value={b.nome}>{b.nome} — {reais(b.taxa)}</option>
                  ))}
                  <option value="Outro">Outro bairro — {reais(config.entrega.taxaPadrao)}</option>
                </select>
              ) : (
                <input value={dados.bairro} onChange={campo('bairro')} placeholder="Seu bairro" />
              )}
              {tentou && erros.bairro && <div className="erro-txt">{erros.bairro}</div>}
            </div>
            <div className="campo">
              <div className="par">
                <div className={tentou && erros.rua ? 'campo-erro' : ''} id="c-rua">
                  <label>Rua</label>
                  <input value={dados.rua} onChange={campo('rua')} placeholder="Nome da rua" autoComplete="address-line1" />
                </div>
                <div className={tentou && erros.numero ? 'campo-erro' : ''} id="c-numero" style={{ maxWidth: 110 }}>
                  <label>Número</label>
                  <input value={dados.numero} onChange={campo('numero')} placeholder="123" inputMode="numeric" />
                </div>
              </div>
              {tentou && (erros.rua || erros.numero) && <div className="erro-txt">{erros.rua || erros.numero}</div>}
            </div>
            <div className="campo">
              <label>Complemento e referência</label>
              <input value={dados.complemento} onChange={campo('complemento')} placeholder="Apto, bloco, casa dos fundos…" />
              <input style={{ marginTop: 8 }} value={dados.referencia} onChange={campo('referencia')} placeholder="Ponto de referência (ajuda o entregador)" />
            </div>
          </>
        )}
      </div>

      <div className="cartao">
        <div className="cartao-rot">Pagamento</div>
        {pag?.pix?.ativo && (
          <button className={`pagamento-linha ${forma === 'pix' ? 'on' : ''}`} onClick={() => setForma('pix')}>
            <span className="simbolo">⚡</span>
            <span style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, display: 'block' }}>PIX</span>
              <span style={{ fontSize: 12.5, color: 'var(--tinta-media)' }}>A chave aparece depois de confirmar</span>
            </span>
            <span className="caixa">{forma === 'pix' && <Ico.Check />}</span>
          </button>
        )}
        {pag?.dinheiro?.ativo && (
          <button className={`pagamento-linha ${forma === 'dinheiro' ? 'on' : ''}`} onClick={() => setForma('dinheiro')}>
            <span className="simbolo">💵</span>
            <span style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, display: 'block' }}>Dinheiro</span>
              <span style={{ fontSize: 12.5, color: 'var(--tinta-media)' }}>Na entrega</span>
            </span>
            <span className="caixa">{forma === 'dinheiro' && <Ico.Check />}</span>
          </button>
        )}
        {pag?.cartaoEntrega?.ativo && (
          <button className={`pagamento-linha ${forma === 'cartao' ? 'on' : ''}`} onClick={() => setForma('cartao')}>
            <span className="simbolo">💳</span>
            <span style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, display: 'block' }}>Cartão na entrega</span>
              <span style={{ fontSize: 12.5, color: 'var(--tinta-media)' }}>{pag.cartaoEntrega.detalhe}</span>
            </span>
            <span className="caixa">{forma === 'cartao' && <Ico.Check />}</span>
          </button>
        )}
        {forma === 'dinheiro' && (
          <div className={`campo ${tentou && erros.troco ? 'erro' : ''}`} id="c-troco">
            <label>Precisa de troco para quanto?</label>
            <input value={trocoPara} onChange={(e) => setTrocoPara(e.target.value.replace(/[^\d.,]/g, '').replace(',', '.'))} placeholder="Deixe vazio se não precisar" inputMode="decimal" />
            {tentou && erros.troco && <div className="erro-txt">{erros.troco}</div>}
            {!erros.troco && trocoPara && Number(trocoPara) > total && (
              <div style={{ fontSize: 13, color: 'var(--verde)', marginTop: 6, fontWeight: 600 }}>Troco de {reais(Number(trocoPara) - total)}</div>
            )}
          </div>
        )}
      </div>

      <div className="cartao">
        <div className="campo">
          <label>Observação do pedido (opcional)</label>
          <textarea value={obs} onChange={(e) => setObs(e.target.value.slice(0, 300))} placeholder="Ex.: entregar depois das 12h, tocar o interfone…" style={{ minHeight: 66 }} />
        </div>
      </div>

      <div className="cartao">
        <div className="linha-valor"><span>Subtotal</span><span>{reais(carrinho.total)}</span></div>
        <div className="linha-valor">
          <span>{tipo === 'entrega' ? `Entrega${bairroCfg ? ` · ${bairroCfg.nome}` : ''}` : 'Retirada no local'}</span>
          <span>{taxa > 0 ? reais(taxa) : 'Grátis'}</span>
        </div>
        <div className="linha-valor somatoria"><span>Total</span><span className="valor">{reais(total)}</span></div>
      </div>

      <div style={{ padding: '4px 16px calc(30px + var(--base))' }}>
        {config?.pedidoMinimo > 0 && carrinho.total < config.pedidoMinimo && (
          <div className="falta-minimo">
            Faltam {reais(config.pedidoMinimo - carrinho.total)} para atingir o pedido mínimo
          </div>
        )}
        <button className="btn btn-primario" onClick={finalizar} disabled={enviando}>
          {enviando ? 'Enviando…' : `Confirmar pedido · ${reais(total)}`}
        </button>
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--tinta-media)', marginTop: 12, lineHeight: 1.6 }}>
          Sem cadastro e sem taxa de aplicativo. Depois de confirmar, você acompanha o preparo
          e fala direto com a cozinha por aqui.
        </p>
      </div>
    </div>
  );
}

export function Topo({ titulo, aoVoltar, direita }) {
  return (
    <div className="janela-topo" style={{ position: 'sticky', top: 0, zIndex: 40 }}>
      <button className="icone-botao" onClick={aoVoltar} aria-label="Voltar"><Ico.Voltar /></button>
      <span className="janela-titulo">{titulo}</span>
      {direita}
      <BotaoTema />
    </div>
  );
}
