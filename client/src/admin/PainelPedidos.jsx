import React, { useEffect, useRef, useState } from 'react';
import { api, reais, hora, dataHora, Ico, usarAviso, mascararTelefone, Camada } from '../comum/uteis.jsx';

const FILTROS = [
  { chave: 'novo', rotulo: 'Novos' },
  { chave: 'aceito', rotulo: 'Confirmados' },
  { chave: 'preparando', rotulo: 'Em preparo' },
  { chave: 'saiu', rotulo: 'Na rua' },
  { chave: 'entregue', rotulo: 'Entregues' },
  { chave: 'cancelado', rotulo: 'Cancelados' },
  { chave: 'todos', rotulo: 'Todos' },
];

const PROXIMO = {
  novo: { chave: 'aceito', rotulo: 'Confirmar' },
  aceito: { chave: 'preparando', rotulo: 'Iniciar preparo' },
  preparando: { chave: 'saiu', rotulo: 'Saiu para entrega' },
  saiu: { chave: 'entregue', rotulo: 'Marcar entregue' },
};

function apitar() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.18, 0.36].forEach((atraso) => {
      const osc = ctx.createOscillator();
      const ganho = ctx.createGain();
      osc.connect(ganho); ganho.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      const t = ctx.currentTime + atraso;
      ganho.gain.setValueAtTime(0.0001, t);
      ganho.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      ganho.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      osc.start(t); osc.stop(t + 0.16);
    });
  } catch {}
}

export default function PainelPedidos({ aoAtualizarResumo }) {
  const aviso = usarAviso();
  const [dados, setDados] = useState(null);
  const [filtro, setFiltro] = useState('novo');
  const [busca, setBusca] = useState('');
  const [dia, setDia] = useState('');
  const [chatAberto, setChatAberto] = useState(null);
  const [somLigado, setSomLigado] = useState(() => localStorage.getItem('admin_som') !== '0');
  const contagemAnterior = useRef(null);

  async function carregar() {
    try {
      const params = new URLSearchParams();
      if (filtro !== 'todos') params.set('status', filtro);
      if (busca) params.set('busca', busca);
      if (dia) params.set('dia', dia);
      const d = await api(`/api/admin/pedidos?${params}`);
      setDados(d);
      aoAtualizarResumo?.(d.resumo);
      if (contagemAnterior.current !== null && d.resumo.novos > contagemAnterior.current) {
        if (somLigado) apitar();
        aviso(`Pedido novo chegou! (${d.resumo.novos} aguardando)`);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }
      contagemAnterior.current = d.resumo.novos;
    } catch (e) { /* silencioso durante polling */ }
  }

  useEffect(() => { carregar(); }, [filtro, busca, dia]);
  useEffect(() => {
    const t = setInterval(carregar, 12000);
    return () => clearInterval(t);
  }, [filtro, busca, dia, somLigado]);

  async function mudarStatus(pedido, status) {
    try {
      await api(`/api/admin/pedidos/${pedido.id}/status`, { method: 'PUT', body: { status } });
      carregar();
    } catch (e) { aviso(e.message, 'erro'); }
  }

  function alternarSom() {
    const novo = !somLigado;
    setSomLigado(novo);
    localStorage.setItem('admin_som', novo ? '1' : '0');
    if (novo) apitar();
  }

  if (!dados) return <div className="tela-carga"><div className="roda" /></div>;
  const { pedidos, resumo } = dados;

  return (
    <>
      <div className="metricas">
        <div className="metrica destaque">
          <div className="rot">Faturamento hoje</div>
          <div className="num">{reais(resumo.faturamentoHoje)}</div>
        </div>
        <div className="metrica"><div className="rot">Pedidos hoje</div><div className="num">{resumo.hoje}</div></div>
        <div className={`metrica ${resumo.novos > 0 ? 'alerta' : ''}`}>
          <div className="rot">{resumo.novos > 0 ? 'Aguardando você' : 'Em aberto'}</div>
          <div className="num">{resumo.novos > 0 ? resumo.novos : resumo.abertos}</div>
        </div>
        <div className="metrica"><div className="rot">Ticket médio</div><div className="num">{reais(resumo.ticketMedio)}</div></div>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por código, nome ou telefone"
            style={{ width: '100%', border: '1.5px solid var(--linha-forte)', borderRadius: 11, padding: '11px 13px', background: '#fff' }}
          />
        </div>
        <input
          type="date"
          value={dia}
          onChange={(e) => setDia(e.target.value)}
          title="Ver os pedidos de um dia"
          style={{ flexShrink: 0, width: 150, border: '1px solid var(--linha-forte)', borderRadius: 'var(--r-p)', padding: '11px 10px', background: 'var(--superficie)', color: 'var(--tinta)' }}
        />
        <button className="btn btn-linha btn-p" onClick={alternarSom} title="Alerta sonoro de pedido novo" style={{ flexShrink: 0 }}>
          {somLigado ? '🔔' : '🔕'}
        </button>
      </div>

      {dia && (
        <div style={{ margin: '0 16px 12px', padding: '11px 14px', borderRadius: 'var(--r-m)', background: 'var(--verde-luz)',
                      border: '1px solid var(--verde-linha)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13.5, color: 'var(--verde)', fontWeight: 600, flex: 1 }}>
            {dia.split('-').reverse().join('/')} · {resumo.recorteQtd} pedido(s) · {reais(resumo.recorteTotal)}
          </span>
          <button className="btn btn-texto btn-p" onClick={() => setDia('')}>ver todos</button>
        </div>
      )}

      <div className="filtros">
        {FILTROS.map((f) => (
          <button key={f.chave} className={`filtro ${filtro === f.chave ? 'ativo' : ''}`} onClick={() => setFiltro(f.chave)}>
            {f.rotulo}{f.chave === 'novo' && resumo.novos > 0 ? ` (${resumo.novos})` : ''}
          </button>
        ))}
      </div>

      {pedidos.length === 0 && (
        <div className="vazio-admin">
          <div className="simbolo">📋</div>
          <div style={{ fontWeight: 700, color: 'var(--tinta)', marginBottom: 5 }}>Nada nesse filtro</div>
          <p style={{ fontSize: 13.5, lineHeight: 1.55 }}>
            Pedidos novos aparecem aqui sozinhos, com aviso sonoro.<br />
            Deixe esta tela aberta durante o atendimento.
          </p>
        </div>
      )}

      {pedidos.map((p) => {
        const proximo = PROXIMO[p.status];
        return (
          <div className={`pedido-card ${p.status}`} key={p.id}>
            <div className="pedido-cabeca">
              <span className="pedido-codigo">#{p.codigo}</span>
              <span className={`chip-status ${p.status}`}>{p.statusLabel}</span>
              <div className="pedido-total">
                {reais(p.total)}
                <div className="pedido-quando" style={{ fontWeight: 400 }}>{hora(p.criadoEm)}</div>
              </div>
            </div>

            <div className="pedido-cliente">
              <div className="pedido-dado">
                <span className="marcador">👤</span>
                <span><b>{p.cliente.nome}</b> · {mascararTelefone(p.cliente.telefone)}</span>
              </div>
              <div className="pedido-dado">
                <span className="marcador">{p.tipo === 'entrega' ? '🛵' : '🏠'}</span>
                <span>
                  {p.tipo === 'entrega'
                    ? <>{p.endereco.rua}, {p.endereco.numero} — {p.endereco.bairro}
                        {p.endereco.complemento ? `, ${p.endereco.complemento}` : ''}
                        {p.endereco.referencia && <><br /><span style={{ fontSize: 12.5, color: 'var(--tinta-suave)' }}>Referência: {p.endereco.referencia}</span></>}</>
                    : 'Retirada no local'}
                </span>
              </div>
              <div className="pedido-dado">
                <span className="marcador">{{ pix: '⚡', dinheiro: '💵', cartao: '💳' }[p.pagamento.forma]}</span>
                <span>
                  {{ pix: 'PIX', dinheiro: 'Dinheiro', cartao: 'Cartão na entrega' }[p.pagamento.forma]}
                  {p.pagamento.troco ? ` · troco para ${reais(p.pagamento.trocoPara)} — levar ${reais(p.pagamento.troco)}` : ''}
                </span>
              </div>
              {p.obs && (
                <div className="pedido-dado">
                  <span className="marcador">📝</span>
                  <span style={{ color: 'var(--ouro-tinta)', fontWeight: 600 }}>{p.obs}</span>
                </div>
              )}
            </div>

            <div className="pedido-itens">
              {p.itens.map((i, k) => (
                <div className="li" key={k}>
                  <b>{i.qtd}×</b>
                  <div>
                    {i.nome}
                    {i.grupos?.map((g, n) => (
                      <div className="op" key={n}>{g.nome}: {g.itens.map((x) => x.nome).join(', ')}</div>
                    ))}
                    {i.obs && <div className="op" style={{ color: '#8A6A00', fontWeight: 600 }}>📝 {i.obs}</div>}
                  </div>
                </div>
              ))}
            </div>

            <div className="pedido-acoes">
              {proximo && (
                <button className="btn btn-primario btn-p" onClick={() => mudarStatus(p, proximo.chave)}>{proximo.rotulo}</button>
              )}
              <button className="btn btn-linha btn-p" onClick={() => setChatAberto(p)}>
                💬 Chat{p.naoLidasLoja > 0 ? ` (${p.naoLidasLoja})` : ''}
              </button>
              <a className="btn btn-zap btn-p" href={`https://wa.me/${p.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a>
              <button className="btn btn-linha btn-p" onClick={() => window.print()}>🖨️</button>
              {!['entregue', 'cancelado'].includes(p.status) && (
                <button className="btn btn-perigo btn-p" onClick={() => confirm(`Cancelar o pedido #${p.codigo}?`) && mudarStatus(p, 'cancelado')}>Cancelar</button>
              )}
            </div>
          </div>
        );
      })}

      {chatAberto && <ChatPedido pedido={chatAberto} aoFechar={() => { setChatAberto(null); carregar(); }} />}
      <div style={{ height: 20 }} />
    </>
  );
}

function ChatPedido({ pedido, aoFechar }) {
  const aviso = usarAviso();
  const [chat, setChat] = useState(pedido.chat || []);
  const [texto, setTexto] = useState('');
  const fim = useRef(null);

  useEffect(() => {
    api(`/api/admin/pedidos/${pedido.id}/lido`, { method: 'POST' }).catch(() => {});
    const t = setInterval(async () => {
      try {
        const d = await api(`/api/admin/pedidos?busca=${pedido.codigo}`);
        const atual = d.pedidos.find((x) => x.id === pedido.id);
        if (atual) setChat(atual.chat);
      } catch {}
    }, 6000);
    return () => clearInterval(t);
  }, [pedido.id]);

  useEffect(() => { fim.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat.length]);

  async function enviar(e) {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    setTexto('');
    try {
      const r = await api(`/api/admin/pedidos/${pedido.id}/chat`, { method: 'POST', body: { texto: t } });
      setChat(r.chat);
    } catch (err) { aviso(err.message, 'erro'); setTexto(t); }
  }

  const rapidas = ['Pedido confirmado! Já vamos preparar.', 'Seu pedido sai em cerca de 20 minutos.', 'O entregador já está a caminho.', 'Recebemos seu PIX, obrigado!'];

  return (
    <Camada travarFundo>

    <div className="cortina" onClick={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="janela">
        <div className="janela-topo">
          <button className="icone-botao" onClick={aoFechar}><Ico.Fechar /></button>
          <div style={{ flex: 1 }}>
            <div className="janela-titulo">#{pedido.codigo} · {pedido.cliente.nome}</div>
            <div style={{ fontSize: 12, color: 'var(--tinta-media)' }}>{pedido.cliente.telefone}</div>
          </div>
        </div>
        <div className="janela-corpo">
          <div className="conversa">
            {chat.length === 0 && <div className="conversa-vazia">Nenhuma mensagem ainda. Escreva para o cliente.</div>}
            {chat.map((m) => (
              <div className={`fala ${m.de === 'loja' ? 'cliente' : m.de === 'sistema' ? 'sistema' : 'loja'}`} key={m.id}>
                {m.texto}
                {m.de !== 'sistema' && <span className="quando">{m.de === 'loja' ? 'Você' : pedido.cliente.nome} · {hora(m.em)}</span>}
              </div>
            ))}
            <div ref={fim} />
          </div>
          <div style={{ display: 'flex', gap: 7, overflowX: 'auto', padding: '0 16px 12px' }}>
            {rapidas.map((r) => (
              <button key={r} className="filtro" style={{ flexShrink: 0 }} onClick={() => setTexto(r)}>{r}</button>
            ))}
          </div>
        </div>
        <form className="escrever" onSubmit={enviar}>
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Responder ao cliente…" autoFocus />
          <button className="enviar-bolha" type="submit" disabled={!texto.trim()}><Ico.Enviar /></button>
        </form>
      </div>
      </div>
    </Camada>
  );
}
