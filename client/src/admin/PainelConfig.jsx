import React, { useEffect, useRef, useState } from 'react';
import { api, reais, Ico, usarAviso, mascararTelefone, soDigitos } from '../comum/uteis.jsx';
import { Interruptor } from './PainelCardapio.jsx';

export default function PainelConfig() {
  const aviso = usarAviso();
  const [c, setC] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const arquivoRef = useRef();

  useEffect(() => { api('/api/admin/config').then(setC).catch((e) => aviso(e.message, 'erro')); }, []);

  const set = (k, v) => setC((a) => ({ ...a, [k]: v }));
  const setEntrega = (k, v) => setC((a) => ({ ...a, entrega: { ...a.entrega, [k]: v } }));
  const setPag = (grupo, k, v) => setC((a) => ({ ...a, pagamentos: { ...a.pagamentos, [grupo]: { ...a.pagamentos[grupo], [k]: v } } }));

  async function salvar() {
    setSalvando(true);
    try { await api('/api/admin/config', { method: 'PUT', body: c }); aviso('Configurações salvas'); }
    catch (e) { aviso(e.message, 'erro'); }
    finally { setSalvando(false); }
  }

  async function enviarLogo(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    try {
      const fd = new FormData();
      fd.append('arquivo', arquivo);
      const r = await api('/api/admin/upload', { method: 'POST', body: fd });
      set('logo', r.url);
      aviso('Logo atualizada');
    } catch (err) { aviso(err.message, 'erro'); }
  }

  function setBairro(i, novo) {
    setEntrega('bairros', c.entrega.bairros.map((b, k) => (k === i ? novo : b)));
  }

  if (!c) return <div className="tela-carga"><div className="roda" /></div>;

  return (
    <>
      <div className="cartao">
        <div className="cartao-rot">Status da loja</div>
        <Interruptor
          titulo="Abrir e fechar pelo horário"
          descricao="Segue a tabela de horários abaixo automaticamente"
          ligado={c.abrirAutomatico}
          aoMudar={() => set('abrirAutomatico', !c.abrirAutomatico)}
        />
        {!c.abrirAutomatico && (
          <Interruptor titulo="Loja aberta agora" descricao="Controle manual" ligado={c.aberto} aoMudar={() => set('aberto', !c.aberto)} />
        )}
        <div className="campo">
          <label>Aviso no topo do cardápio</label>
          <input value={c.avisoTopo || ''} onChange={(e) => set('avisoTopo', e.target.value)} placeholder="Ex.: Hoje tem costela! Peça já" />
        </div>
      </div>

      <div className="cartao">
        <div className="cartao-rot">Identidade</div>
        <div className="campo">
          <label>Logo</label>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {c.logo && <img src={c.logo} alt="" style={{ width: 68, height: 68, borderRadius: '50%', objectFit: 'cover', background: '#fff' }} />}
            <input ref={arquivoRef} type="file" accept="image/*" hidden onChange={enviarLogo} />
            <button className="btn btn-linha btn-p" onClick={() => arquivoRef.current?.click()}>Trocar logo</button>
          </div>
        </div>
        <div className="campo"><label>Nome da loja</label><input value={c.nome} onChange={(e) => set('nome', e.target.value)} /></div>
        <div className="campo"><label>Frase de apoio</label><input value={c.slogan || ''} onChange={(e) => set('slogan', e.target.value)} /></div>
        <div className="campo">
          <div className="par">
            <div>
              <label>Cor principal</label>
              <input type="color" value={c.cor} onChange={(e) => set('cor', e.target.value)} style={{ height: 46, padding: 4 }} />
            </div>
            <div>
              <label>Cor de destaque</label>
              <input type="color" value={c.corSecundaria} onChange={(e) => set('corSecundaria', e.target.value)} style={{ height: 46, padding: 4 }} />
            </div>
          </div>
        </div>
        <div className="campo"><label>Endereço</label><input value={c.endereco || ''} onChange={(e) => set('endereco', e.target.value)} /></div>
        <div className="campo">
          <label>WhatsApp principal</label>
          <input value={mascararTelefone(String(c.whatsapp || '').replace(/^55/, ''))} onChange={(e) => set('whatsapp', '55' + soDigitos(e.target.value))} inputMode="tel" />
        </div>
        <div className="campo">
          <label>WhatsApp secundário</label>
          <input value={mascararTelefone(String(c.whatsapp2 || '').replace(/^55/, ''))} onChange={(e) => set('whatsapp2', '55' + soDigitos(e.target.value))} inputMode="tel" />
        </div>
        <div className="campo"><label>Instagram (sem @)</label><input value={c.instagram || ''} onChange={(e) => set('instagram', e.target.value.replace('@', ''))} /></div>
        <div className="campo"><label>Tempo de preparo informado</label><input value={c.tempoPreparo || ''} onChange={(e) => set('tempoPreparo', e.target.value)} placeholder="30 a 45 min" /></div>
      </div>

      <div className="cartao">
        <div className="cartao-rot">Horários de funcionamento</div>
        {c.horarios.map((h, i) => (
          <div key={h.dia} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 16px', borderBottom: '1px solid rgba(11,93,46,.07)' }}>
            <button
              className={`interruptor ${h.ativo ? 'ligado' : ''}`}
              onClick={() => set('horarios', c.horarios.map((x, k) => (k === i ? { ...x, ativo: !x.ativo } : x)))}
              aria-label={h.nome}
            />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{h.nome}</span>
            <input type="time" value={h.abre} disabled={!h.ativo}
              onChange={(e) => set('horarios', c.horarios.map((x, k) => (k === i ? { ...x, abre: e.target.value } : x)))}
              style={{ width: 104, border: '1.5px solid var(--linha-forte)', borderRadius: 9, padding: '8px 9px', background: 'var(--fundo)' }} />
            <input type="time" value={h.fecha} disabled={!h.ativo}
              onChange={(e) => set('horarios', c.horarios.map((x, k) => (k === i ? { ...x, fecha: e.target.value } : x)))}
              style={{ width: 104, border: '1.5px solid var(--linha-forte)', borderRadius: 9, padding: '8px 9px', background: 'var(--fundo)' }} />
          </div>
        ))}
      </div>

      <div className="cartao">
        <div className="cartao-rot">Entrega e retirada</div>
        <Interruptor titulo="Aceitar entrega" ligado={c.entrega.entregaAtiva} aoMudar={() => setEntrega('entregaAtiva', !c.entrega.entregaAtiva)} />
        <Interruptor titulo="Aceitar retirada no local" ligado={c.entrega.retiradaAtiva} aoMudar={() => setEntrega('retiradaAtiva', !c.entrega.retiradaAtiva)} />
        <div className="campo">
          <div className="par">
            <div>
              <label>Taxa padrão (R$)</label>
              <input type="number" step="0.01" value={c.entrega.taxaPadrao} onChange={(e) => setEntrega('taxaPadrao', Number(e.target.value))} inputMode="decimal" />
            </div>
            <div>
              <label>Pedido mínimo (R$)</label>
              <input type="number" step="0.01" value={c.pedidoMinimo} onChange={(e) => set('pedidoMinimo', Number(e.target.value))} inputMode="decimal" />
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 16px 4px', fontSize: 12.5, fontWeight: 800, color: 'var(--tinta-media)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Bairros e taxas
        </div>
        {c.entrega.bairros.map((b, i) => (
          <div key={i} style={{ display: 'flex', gap: 7, padding: '6px 16px', alignItems: 'center' }}>
            <input value={b.nome} onChange={(e) => setBairro(i, { ...b, nome: e.target.value })} placeholder="Bairro"
              style={{ flex: 1, border: '1.5px solid var(--linha-forte)', borderRadius: 10, padding: '10px 11px', background: 'var(--fundo)' }} />
            <input type="number" step="0.01" value={b.taxa} onChange={(e) => setBairro(i, { ...b, taxa: Number(e.target.value) })} inputMode="decimal"
              style={{ width: 78, border: '1.5px solid var(--linha-forte)', borderRadius: 10, padding: '10px 11px', background: 'var(--fundo)' }} />
            <input value={b.tempo || ''} onChange={(e) => setBairro(i, { ...b, tempo: e.target.value })} placeholder="tempo"
              style={{ width: 92, border: '1.5px solid var(--linha-forte)', borderRadius: 10, padding: '10px 11px', background: 'var(--fundo)' }} />
            <button onClick={() => setEntrega('bairros', c.entrega.bairros.filter((_, k) => k !== i))} style={{ color: 'var(--vermelho)', fontSize: 18, padding: 4 }}>×</button>
          </div>
        ))}
        <div style={{ padding: '10px 16px 14px' }}>
          <button className="btn btn-linha btn-p" onClick={() => setEntrega('bairros', [...c.entrega.bairros, { nome: '', taxa: c.entrega.taxaPadrao, tempo: '' }])}>+ Bairro</button>
        </div>
      </div>

      <div className="cartao">
        <div className="cartao-rot">Formas de pagamento</div>
        <Interruptor titulo="PIX" ligado={c.pagamentos.pix.ativo} aoMudar={() => setPag('pix', 'ativo', !c.pagamentos.pix.ativo)} />
        {c.pagamentos.pix.ativo && (
          <>
            <div className="campo">
              <label>Chave PIX (mostrada ao cliente depois de confirmar)</label>
              <input value={c.pagamentos.pix.chave} onChange={(e) => setPag('pix', 'chave', e.target.value)} placeholder="CNPJ, telefone, e-mail ou aleatória" />
            </div>
            <div className="campo">
              <label>Titular da conta</label>
              <input value={c.pagamentos.pix.titular} onChange={(e) => setPag('pix', 'titular', e.target.value)} />
            </div>
          </>
        )}
        <Interruptor titulo="Dinheiro na entrega" ligado={c.pagamentos.dinheiro.ativo} aoMudar={() => setPag('dinheiro', 'ativo', !c.pagamentos.dinheiro.ativo)} />
        <Interruptor titulo="Cartão na entrega" ligado={c.pagamentos.cartaoEntrega.ativo} aoMudar={() => setPag('cartaoEntrega', 'ativo', !c.pagamentos.cartaoEntrega.ativo)} />
        {c.pagamentos.cartaoEntrega.ativo && (
          <div className="campo">
            <label>Detalhe do cartão</label>
            <input value={c.pagamentos.cartaoEntrega.detalhe} onChange={(e) => setPag('cartaoEntrega', 'detalhe', e.target.value)} />
          </div>
        )}
      </div>

      <div style={{ padding: '4px 16px 30px' }}>
        <button className="btn btn-primario" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar configurações'}</button>
      </div>
    </>
  );
}

export function PainelRelatorio() {
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const [periodo, setPeriodo] = useState('7');
  const [de, setDe] = useState(hoje);
  const [ate, setAte] = useState(hoje);
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);

  function faixaDoAtalho(chave) {
    const d = new Date(hoje + 'T12:00:00Z');
    const iso = (x) => x.toISOString().slice(0, 10);
    const menos = (n) => iso(new Date(d.getTime() - n * 86400000));
    if (chave === 'hoje') return { de: hoje, ate: hoje };
    if (chave === 'ontem') return { de: menos(1), ate: menos(1) };
    if (chave === 'mes') return { de: hoje.slice(0, 8) + '01', ate: hoje };
    if (chave === 'mesPassado') {
      const p = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const fim = new Date(d.getFullYear(), d.getMonth(), 0);
      const fmt = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
      return { de: fmt(p), ate: fmt(fim) };
    }
    return { de: menos(Number(chave) - 1), ate: hoje };
  }

  const faixa = periodo === 'livre' ? { de, ate } : faixaDoAtalho(periodo);

  useEffect(() => {
    setCarregando(true);
    api(`/api/admin/relatorio?de=${faixa.de}&ate=${faixa.ate}`)
      .then(setDados).catch(() => {}).finally(() => setCarregando(false));
  }, [periodo, de, ate]);

  function baixarPlanilha() {
    const t = localStorage.getItem('admin_token');
    fetch(`/api/admin/relatorio.csv?de=${faixa.de}&ate=${faixa.ate}`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.blob())
      .then((b) => {
        const url = URL.createObjectURL(b);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vendas_${faixa.de}_a_${faixa.ate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  const ATALHOS = [
    { chave: 'hoje', rotulo: 'Hoje' },
    { chave: 'ontem', rotulo: 'Ontem' },
    { chave: '7', rotulo: '7 dias' },
    { chave: '30', rotulo: '30 dias' },
    { chave: 'mes', rotulo: 'Este mês' },
    { chave: 'mesPassado', rotulo: 'Mês passado' },
    { chave: 'livre', rotulo: 'Escolher data' },
  ];

  const dataBonita = (d) => d.split('-').reverse().join('/');

  return (
    <>
      <div className="filtros" style={{ paddingTop: 14 }}>
        {ATALHOS.map((a) => (
          <button key={a.chave} className={`filtro ${periodo === a.chave ? 'ativo' : ''}`} onClick={() => setPeriodo(a.chave)}>
            {a.rotulo}
          </button>
        ))}
      </div>

      {periodo === 'livre' && (
        <div className="cartao" style={{ marginLeft: 16, marginRight: 16 }}>
          <div className="campo">
            <div className="par" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label>De</label>
                <input type="date" value={de} max={ate} onChange={(e) => setDe(e.target.value)} />
              </div>
              <div>
                <label>Até</label>
                <input type="date" value={ate} min={de} max={hoje} onChange={(e) => setAte(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '0 16px 10px', fontSize: 12.5, color: 'var(--tinta-suave)', fontWeight: 600 }}>
        {faixa.de === faixa.ate
          ? `Dia ${dataBonita(faixa.de)}`
          : `De ${dataBonita(faixa.de)} até ${dataBonita(faixa.ate)}`}
      </div>

      {carregando || !dados ? (
        <div className="tela-carga" style={{ minHeight: 220 }}><div className="roda" /></div>
      ) : (
        <>
          <div className="metricas">
            <div className="metrica destaque"><div className="rot">Faturamento</div><div className="num">{reais(dados.total)}</div></div>
            <div className="metrica"><div className="rot">Pedidos</div><div className="num">{dados.pedidos}</div></div>
            <div className="metrica"><div className="rot">Ticket médio</div><div className="num">{reais(dados.ticketMedio)}</div></div>
            <div className="metrica"><div className="rot">Média por dia</div><div className="num">{reais(dados.mediaDiaria)}</div></div>
          </div>

          {dados.pedidos === 0 ? (
            <div className="vazio-admin">
              <div className="simbolo">📆</div>
              <div style={{ fontWeight: 700, color: 'var(--tinta)', marginBottom: 5 }}>Nenhuma venda nesse período</div>
              <p style={{ fontSize: 13.5 }}>Escolha outra data acima para ver os números.</p>
            </div>
          ) : (
            <>
              <div className="cartao" style={{ marginLeft: 16, marginRight: 16 }}>
                <div className="cartao-rot">Faturamento por dia</div>
                <div style={{ padding: '10px 16px 16px', display: 'flex', alignItems: 'flex-end', gap: 4, height: 150, overflowX: 'auto' }}>
                  {dados.porDia.map((d) => {
                    const maximo = Math.max(1, ...dados.porDia.map((x) => x.total));
                    return (
                      <div key={d.dia} style={{ flex: '1 0 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}
                           title={`${dataBonita(d.dia)}: ${reais(d.total)} em ${d.pedidos} pedido(s)`}>
                        <span style={{ fontSize: 9.5, color: 'var(--tinta-suave)', fontWeight: 700 }}>{d.pedidos}</span>
                        <div style={{ width: '100%', maxWidth: 44, background: 'var(--verde)', borderRadius: '5px 5px 0 0',
                                      height: `${(d.total / maximo) * 96}px`, minHeight: 4 }} />
                        <span style={{ fontSize: 9.5, color: 'var(--tinta-suave)', whiteSpace: 'nowrap' }}>
                          {d.dia.slice(8)}/{d.dia.slice(5, 7)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="cartao" style={{ marginLeft: 16, marginRight: 16 }}>
                <div className="cartao-rot">Mais vendidos</div>
                <table className="tabela-simples">
                  <tbody>
                    {dados.ranking.map((r, i) => (
                      <tr key={r.nome}>
                        <td>
                          <span style={{ color: 'var(--tinta-suave)', fontWeight: 700, marginRight: 7 }}>{i + 1}º</span>
                          {r.nome}
                          <div style={{ fontSize: 12, color: 'var(--tinta-suave)', marginLeft: 24 }}>{r.qtd} unidade(s)</div>
                        </td>
                        <td>{reais(r.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {dados.bairros.length > 0 && (
                <div className="cartao" style={{ marginLeft: 16, marginRight: 16 }}>
                  <div className="cartao-rot">Entregas por bairro</div>
                  <table className="tabela-simples">
                    <tbody>
                      {dados.bairros.map((b) => (
                        <tr key={b.nome}>
                          <td>{b.nome}<div style={{ fontSize: 12, color: 'var(--tinta-suave)' }}>{b.pedidos} entrega(s)</div></td>
                          <td>{reais(b.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="cartao" style={{ marginLeft: 16, marginRight: 16 }}>
                <div className="cartao-rot">Resumo do período</div>
                <table className="tabela-simples">
                  <tbody>
                    {Object.entries(dados.formas).map(([f, n]) => (
                      <tr key={f}>
                        <td>{{ pix: 'PIX', dinheiro: 'Dinheiro', cartao: 'Cartão na entrega' }[f] || f}</td>
                        <td>{n} pedido(s)</td>
                      </tr>
                    ))}
                    <tr><td>Entregas</td><td>{dados.entregas}</td></tr>
                    <tr><td>Retiradas no local</td><td>{dados.retiradas}</td></tr>
                    <tr><td>Recebido em taxa de entrega</td><td>{reais(dados.taxasEntrega)}</td></tr>
                    <tr><td>Dias com venda</td><td>{dados.diasComVenda}</td></tr>
                  </tbody>
                </table>
              </div>

              <div style={{ padding: '4px 16px 30px' }}>
                <button className="btn btn-linha" onClick={baixarPlanilha}>Baixar planilha do período</button>
                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--tinta-suave)', marginTop: 9 }}>
                  Abre no Excel e no Google Planilhas, com um pedido por linha.
                </p>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
