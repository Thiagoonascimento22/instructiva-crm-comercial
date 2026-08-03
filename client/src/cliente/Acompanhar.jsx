import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, reais, hora, dataHora, Ico, usarAviso, aplicarTema } from '../comum/uteis.jsx';
import { Topo } from './Carrinho.jsx';

const ETAPAS = [
  { chave: 'novo', nome: 'Pedido recebido', desc: 'Estamos conferindo seu pedido' },
  { chave: 'aceito', nome: 'Confirmado', desc: 'A cozinha já foi avisada' },
  { chave: 'preparando', nome: 'Em preparo', desc: 'Sua marmita está sendo montada' },
  { chave: 'saiu', nome: 'Saiu para entrega', desc: 'Já está a caminho' },
  { chave: 'entregue', nome: 'Entregue', desc: 'Bom apetite!' },
];

export default function Acompanhar() {
  const { token } = useParams();
  const navegar = useNavigate();
  const aviso = usarAviso();
  const [pedido, setPedido] = useState(null);
  const [erro, setErro] = useState('');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const fimChat = useRef(null);
  const ultimoStatus = useRef(null);

  async function carregar(silencioso = false) {
    try {
      const d = await api(`/api/pedidos/${token}`);
      setPedido(d);
      aplicarTema(d.loja);
      if (silencioso && ultimoStatus.current && ultimoStatus.current !== d.status) {
        aviso(d.statusLabel);
      }
      ultimoStatus.current = d.status;
    } catch (e) { setErro(e.message); }
  }

  useEffect(() => {
    carregar();
    const t = setInterval(() => carregar(true), 8000);
    return () => clearInterval(t);
  }, [token]);

  useEffect(() => { fimChat.current?.scrollIntoView({ behavior: 'smooth' }); }, [pedido?.chat?.length]);

  async function enviar(e) {
    e?.preventDefault();
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    setTexto('');
    try {
      const r = await api(`/api/pedidos/${token}/chat`, { method: 'POST', body: { texto: t } });
      setPedido((p) => ({ ...p, chat: r.chat }));
    } catch (err) { aviso(err.message, 'erro'); setTexto(t); }
    finally { setEnviando(false); }
  }

  function copiarPix() {
    const chave = pedido?.pix?.chave;
    if (!chave) return;
    navigator.clipboard?.writeText(chave).then(
      () => aviso('Chave PIX copiada'),
      () => aviso('Copie a chave manualmente', 'erro')
    );
  }

  if (erro) return (
    <div className="coluna-unica"><div className="tela-vazia"><div className="simbolo">🔍</div><h2>Pedido não encontrado</h2><p>{erro}</p>
      <button className="btn btn-primario" style={{ marginTop: 18, maxWidth: 260 }} onClick={() => navegar('/')}>Ir para o cardápio</button></div></div>
  );
  if (!pedido) return <div className="tela-carga"><div className="roda" /></div>;

  const cancelado = pedido.status === 'cancelado';
  const indiceAtual = ETAPAS.findIndex((e) => e.chave === pedido.status);
  const etapaAtual = ETAPAS[indiceAtual];

  return (
    <div className="coluna-unica">
      <Topo titulo={`Pedido #${pedido.codigo}`} aoVoltar={() => navegar('/')} />

      <div className="painel-status" style={cancelado ? { background: 'linear-gradient(160deg,#8E2B20,#5F1A12)' } : undefined}>
        <div className="cod">PEDIDO #{pedido.codigo} · {dataHora(pedido.criadoEm)}</div>
        <h2>{cancelado ? 'Pedido cancelado' : etapaAtual?.nome || pedido.statusLabel}</h2>
        <p className="msg">
          {cancelado ? 'Se tiver dúvida, fale com a gente pelo chat abaixo.' : etapaAtual?.desc}
          {!cancelado && pedido.status !== 'entregue' && pedido.tempoPreparo ? ` · previsão de ${pedido.tempoPreparo}` : ''}
        </p>
      </div>

      {!cancelado && (
        <div className="cartao">
          <div className="passos">
            {ETAPAS.map((e, i) => {
              const registro = pedido.historico.find((h) => h.status === e.chave);
              const feita = i < indiceAtual;
              const atual = i === indiceAtual;
              return (
                <div className={`passo ${feita ? 'ok' : atual ? 'agora' : 'espera'}`} key={e.chave}>
                  <div className="passo-bola">{feita ? <Ico.Check /> : atual ? '•' : i + 1}</div>
                  <div>
                    <div className="passo-nome">{e.nome}</div>
                    {registro && <div className="passo-hora">{hora(registro.em)}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pedido.pagamento.forma === 'pix' && pedido.pix?.chave && pedido.status !== 'entregue' && !cancelado && (
        <div className="cartao">
          <div className="cartao-rot">Pague com PIX</div>
          <div className="pix-area">
            <div className="pix-linha">
              <code>{pedido.pix.chave}</code>
              <button className="btn btn-ouro btn-p" onClick={copiarPix}><Ico.Copiar /> Copiar</button>
            </div>
            {pedido.pix.titular && <p style={{ fontSize: 12.5, color: 'var(--tinta-media)', marginTop: 9 }}>Titular: {pedido.pix.titular}</p>}
            <p style={{ fontSize: 13, color: 'var(--tinta-media)', marginTop: 9, lineHeight: 1.55 }}>
              Valor: <b style={{ color: 'var(--verde)' }}>{reais(pedido.total)}</b>. Depois de pagar, envie o comprovante no chat abaixo.
            </p>
          </div>
        </div>
      )}

      <div className="cartao">
        <div className="cartao-rot">Seu pedido</div>
        {pedido.itens.map((i, k) => (
          <div className="item-lista" key={k}>
            <span className="pastilha-qtd">{i.qtd}×</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{i.nome}</div>
              {i.grupos?.map((g, n) => (
                <div className="sub" key={n}><b style={{ color: 'var(--tinta)', fontWeight: 600 }}>{g.nome}:</b> {g.itens.map((x) => x.nome).join(', ')}</div>
              ))}
              {i.obs && <div className="anotacao">📝 {i.obs}</div>}
            </div>
            <div style={{ fontWeight: 800, fontFamily: 'var(--display)', whiteSpace: 'nowrap' }}>{reais(i.subtotal)}</div>
          </div>
        ))}
        <div className="linha-valor" style={{ borderTop: '1px solid var(--linha-forte)' }}><span>Subtotal</span><span>{reais(pedido.subtotal)}</span></div>
        <div className="linha-valor"><span>{pedido.tipo === 'entrega' ? 'Entrega' : 'Retirada no local'}</span><span>{pedido.taxaEntrega > 0 ? reais(pedido.taxaEntrega) : 'Grátis'}</span></div>
        <div className="linha-valor somatoria"><span>Total</span><span className="valor">{reais(pedido.total)}</span></div>
        <div className="linha-valor" style={{ borderTop: '1px solid var(--linha-forte)', color: 'var(--tinta-media)', fontSize: 13.5 }}>
          <span>Pagamento</span>
          <span style={{ fontWeight: 600, color: 'var(--tinta)' }}>
            {{ pix: 'PIX', dinheiro: 'Dinheiro', cartao: 'Cartão na entrega' }[pedido.pagamento.forma]}
            {pedido.pagamento.troco ? ` · troco ${reais(pedido.pagamento.troco)}` : ''}
          </span>
        </div>
        {pedido.tipo === 'entrega' && pedido.endereco && (
          <div className="linha-valor" style={{ color: 'var(--tinta-media)', fontSize: 13.5, alignItems: 'flex-start' }}>
            <span>Entregar em</span>
            <span style={{ textAlign: 'right', color: 'var(--tinta)', fontWeight: 500, maxWidth: '62%' }}>
              {pedido.endereco.rua}, {pedido.endereco.numero} — {pedido.endereco.bairro}
              {pedido.endereco.complemento ? `, ${pedido.endereco.complemento}` : ''}
            </span>
          </div>
        )}
      </div>

      <div className="cartao" style={{ marginBottom: 0 }}>
        <div className="cartao-rot" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Ico.Chat style={{ width: 15, height: 15 }} /> Falar com a cozinha
        </div>
        <div className="conversa">
          {pedido.chat.length === 0 && (
            <div className="conversa-vazia">
              Precisa avisar algo sobre o pedido?<br />Escreva aqui que a gente responde na hora.
            </div>
          )}
          {pedido.chat.map((m) => (
            <div className={`fala ${m.de}`} key={m.id}>
              {m.texto}
              {m.de !== 'sistema' && <span className="quando">{hora(m.em)}</span>}
            </div>
          ))}
          <div ref={fimChat} />
        </div>
      </div>

      <form className="escrever" onSubmit={enviar} style={{ position: 'sticky', bottom: 0 }}>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva sua mensagem…" maxLength={800} />
        <button className="enviar-bolha" type="submit" disabled={!texto.trim() || enviando} aria-label="Enviar"><Ico.Enviar /></button>
      </form>

      <div style={{ padding: '16px 16px calc(24px + var(--base))', display: 'flex', gap: 10 }}>
        <button className="btn btn-marca" onClick={() => navegar('/')}>Pedir de novo</button>
        {pedido.loja?.whatsapp && (
          <a className="btn btn-zap" href={`https://wa.me/${pedido.loja.whatsapp}?text=${encodeURIComponent(`Olá! Sobre o pedido #${pedido.codigo}`)}`} target="_blank" rel="noreferrer">WhatsApp</a>
        )}
      </div>
    </div>
  );
}
