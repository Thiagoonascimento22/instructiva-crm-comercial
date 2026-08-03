import React, { useEffect, useRef, useState } from 'react';
import { api, reais, Ico, usarAviso } from '../comum/uteis.jsx';

export default function PainelCardapio() {
  const aviso = usarAviso();
  const [cardapio, setCardapio] = useState(null);
  const [editando, setEditando] = useState(null);
  const [editandoCat, setEditandoCat] = useState(null);

  const carregar = () => api('/api/admin/cardapio').then(setCardapio).catch((e) => aviso(e.message, 'erro'));
  useEffect(() => { carregar(); }, []);

  async function alternarProduto(p, campo) {
    try {
      await api(`/api/admin/produtos/${p.id}`, { method: 'PUT', body: { ...p, [campo]: !p[campo] } });
      carregar();
    } catch (e) { aviso(e.message, 'erro'); }
  }

  async function novoProduto(categoriaId) {
    try {
      const r = await api('/api/admin/produtos', { method: 'POST', body: { categoriaId } });
      setEditando(r.produto);
      carregar();
    } catch (e) { aviso(e.message, 'erro'); }
  }

  async function novaCategoria() {
    const nome = prompt('Nome da nova categoria:');
    if (!nome?.trim()) return;
    try { await api('/api/admin/categorias', { method: 'POST', body: { nome } }); carregar(); aviso('Categoria criada'); }
    catch (e) { aviso(e.message, 'erro'); }
  }

  if (!cardapio) return <div className="tela-carga"><div className="roda" /></div>;

  return (
    <>
      <div className="dica-admin">
        Toque em qualquer item para trocar foto, preço e opções. O interruptor à direita tira do ar
        sem apagar, e "esgotado" mantém no cardápio sem deixar pedir.
      </div>
      <div style={{ padding: '0 16px 12px', display: 'flex', gap: 9 }}>
        <button className="btn btn-primario btn-p" onClick={() => novoProduto(cardapio.categorias[0]?.id)}>+ Novo item</button>
        <button className="btn btn-linha btn-p" onClick={novaCategoria}>+ Categoria</button>
      </div>

      {[...cardapio.categorias].sort((a, b) => (a.ordem || 0) - (b.ordem || 0)).map((c) => {
        const itens = cardapio.produtos.filter((p) => p.categoriaId === c.id).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
        return (
          <section key={c.id} style={{ marginBottom: 20 }}>
            <div style={{ padding: '6px 16px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ fontSize: 17, flex: 1 }}>{c.icone} {c.nome} {!c.ativo && <span className="tarja fora">oculta</span>}</h3>
              <button className="btn btn-texto btn-p" onClick={() => setEditandoCat(c)}>Editar</button>
              <button className="btn btn-texto btn-p" style={{ color: 'var(--verde)' }} onClick={() => novoProduto(c.id)}>+ Item</button>
            </div>
            {itens.length === 0 && <p style={{ padding: '0 16px 12px', fontSize: 13.5, color: 'var(--tinta-media)' }}>Nenhum item nesta categoria ainda.</p>}
            {itens.map((p) => (
              <div className={`admin-item ${!p.ativo ? 'inativo' : ''}`} key={p.id}>
                {p.imagem ? <img className="foto-mini" src={p.imagem} alt="" /> : <div className="foto-mini foto-ausente" style={{ display: 'grid', placeItems: 'center' }}>🍽️</div>}
                <div className="txt" onClick={() => setEditando(p)} style={{ cursor: 'pointer' }}>
                  <div className="n">{p.nome}</div>
                  <div className="p">
                    {reais(p.precoPromo ?? p.preco)}
                    {p.grupos?.length ? <span style={{ color: 'var(--tinta-media)', fontWeight: 500 }}> · {p.grupos.length} grupo(s) de opções</span> : null}
                  </div>
                  <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                    {p.destaque && <span className="tarja">destaque</span>}
                    {p.esgotado && <span className="tarja fora">esgotado</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <button className={`interruptor ${p.ativo ? 'ligado' : ''}`} onClick={() => alternarProduto(p, 'ativo')} aria-label="Ativar item" />
                  <button className="btn btn-texto btn-p" style={{ padding: '4px 8px', fontSize: 12, color: p.esgotado ? 'var(--vermelho)' : 'var(--tinta-media)' }} onClick={() => alternarProduto(p, 'esgotado')}>
                    {p.esgotado ? 'esgotado' : 'tem estoque'}
                  </button>
                </div>
              </div>
            ))}
          </section>
        );
      })}

      {editando && <EditorProduto produto={editando} categorias={cardapio.categorias} aoFechar={() => { setEditando(null); carregar(); }} />}
      {editandoCat && <EditorCategoria categoria={editandoCat} aoFechar={() => { setEditandoCat(null); carregar(); }} />}
      <div style={{ height: 30 }} />
    </>
  );
}

/* ---------------- Editor de produto ---------------- */
function EditorProduto({ produto, categorias, aoFechar }) {
  const aviso = usarAviso();
  const [p, setP] = useState({ ...produto, composicao: produto.composicao || [], grupos: produto.grupos || [] });
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const arquivoRef = useRef();

  useEffect(() => { document.body.classList.add('travado'); return () => document.body.classList.remove('travado'); }, []);

  const set = (k, v) => setP((a) => ({ ...a, [k]: v }));

  async function enviarFoto(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setEnviandoFoto(true);
    try {
      // reduz a imagem no próprio celular antes de subir
      const reduzida = await reduzirImagem(arquivo, 1000);
      const fd = new FormData();
      fd.append('arquivo', reduzida, 'foto.jpg');
      const r = await api('/api/admin/upload', { method: 'POST', body: fd });
      set('imagem', r.url);
      aviso('Foto enviada');
    } catch (err) { aviso(err.message, 'erro'); }
    finally { setEnviandoFoto(false); }
  }

  async function salvar() {
    if (!p.nome?.trim()) return aviso('Dê um nome ao item.', 'erro');
    setSalvando(true);
    try {
      await api(`/api/admin/produtos/${p.id}`, { method: 'PUT', body: p });
      aviso('Item salvo');
      aoFechar();
    } catch (e) { aviso(e.message, 'erro'); }
    finally { setSalvando(false); }
  }

  async function excluir() {
    if (!confirm(`Excluir "${p.nome}" do cardápio?`)) return;
    try { await api(`/api/admin/produtos/${p.id}`, { method: 'DELETE' }); aviso('Item excluído'); aoFechar(); }
    catch (e) { aviso(e.message, 'erro'); }
  }

  /* grupos de opções */
  const setGrupo = (i, novo) => setP((a) => ({ ...a, grupos: a.grupos.map((g, k) => (k === i ? novo : g)) }));
  const addGrupo = () => setP((a) => ({ ...a, grupos: [...a.grupos, { id: `g_${Date.now()}`, nome: 'Novo grupo', tipo: 'unico', obrigatorio: true, min: 1, max: 1, itens: [] }] }));
  const delGrupo = (i) => setP((a) => ({ ...a, grupos: a.grupos.filter((_, k) => k !== i) }));

  return (
    <div className="cortina" onClick={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="janela">
        <div className="janela-topo">
          <button className="icone-botao" onClick={aoFechar}><Ico.Fechar /></button>
          <span className="janela-titulo">Editar item</span>
          <button className="btn btn-texto btn-p" style={{ color: 'var(--vermelho)' }} onClick={excluir}>Excluir</button>
        </div>

        <div className="janela-corpo">
          <div className="cartao" style={{ margin: '12px 16px' }}>
            <div className="campo">
              <label>Foto do item</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {p.imagem
                  ? <img src={p.imagem} alt="" style={{ width: 84, height: 84, borderRadius: 12, objectFit: 'cover' }} />
                  : <div style={{ width: 84, height: 84, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--fundo)', fontSize: 28 }}>📷</div>}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <input ref={arquivoRef} type="file" accept="image/*" hidden onChange={enviarFoto} />
                  <button className="btn btn-linha btn-p" onClick={() => arquivoRef.current?.click()} disabled={enviandoFoto}>
                    {enviandoFoto ? 'Enviando…' : p.imagem ? 'Trocar foto' : 'Escolher foto'}
                  </button>
                  {p.imagem && <button className="btn btn-texto btn-p" style={{ color: 'var(--vermelho)' }} onClick={() => set('imagem', '')}>Remover foto</button>}
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--tinta-media)', marginTop: 8 }}>Foto boa vende mais. Use luz natural e enquadre a marmita de cima.</p>
            </div>

            <div className="campo">
              <label>Nome</label>
              <input value={p.nome || ''} onChange={(e) => set('nome', e.target.value)} />
            </div>

            <div className="campo">
              <label>Categoria</label>
              <select value={p.categoriaId} onChange={(e) => set('categoriaId', e.target.value)}>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            <div className="campo">
              <label>Descrição</label>
              <textarea value={p.descricao || ''} onChange={(e) => set('descricao', e.target.value)} placeholder="O que vem no prato" style={{ minHeight: 62 }} />
            </div>

            <div className="campo">
              <label>O que acompanha (aparece como etiquetas e monta a prévia da marmita)</label>
              <textarea
                value={(p.composicao || []).join('\n')}
                onChange={(e) => set('composicao', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))}
                placeholder={'Arroz\nFeijão carioca ou preto\nMacarrão alho e óleo\nFarofa da casa\nSalada da casa'}
                style={{ minHeight: 92 }}
              />
              <p style={{ fontSize: 12, color: 'var(--tinta-media)', marginTop: 6 }}>Um item por linha.</p>
            </div>

            <div className="campo">
              <div className="par">
                <div>
                  <label>Preço (R$)</label>
                  <input type="number" step="0.01" value={p.preco ?? ''} onChange={(e) => set('preco', e.target.value)} inputMode="decimal" />
                </div>
                <div>
                  <label>Preço promocional</label>
                  <input type="number" step="0.01" value={p.precoPromo ?? ''} onChange={(e) => set('precoPromo', e.target.value)} placeholder="opcional" inputMode="decimal" />
                </div>
              </div>
            </div>

            <div className="campo">
              <label>Ordem na lista</label>
              <input type="number" value={p.ordem ?? 0} onChange={(e) => set('ordem', e.target.value)} inputMode="numeric" />
            </div>

            <Interruptor titulo="Visível no cardápio" ligado={p.ativo} aoMudar={() => set('ativo', !p.ativo)} />
            <Interruptor titulo="Marcar como destaque" descricao="Aparece em 'Os mais pedidos'" ligado={p.destaque} aoMudar={() => set('destaque', !p.destaque)} />
            <Interruptor titulo="Esgotado hoje" descricao="Continua no cardápio, mas sem poder pedir" ligado={p.esgotado} aoMudar={() => set('esgotado', !p.esgotado)} />
          </div>

          <div style={{ padding: '4px 16px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ fontSize: 16, flex: 1 }}>Opções de escolha</h3>
            <button className="btn btn-linha btn-p" onClick={addGrupo}>+ Grupo</button>
          </div>
          <p style={{ padding: '0 16px 10px', fontSize: 12.5, color: 'var(--tinta-media)', lineHeight: 1.5 }}>
            Use para tamanho, tipo de feijão, talheres e adicionais. O preço de cada opção soma no total.
          </p>

          {(p.grupos || []).map((g, i) => (
            <GrupoEditor key={g.id || i} grupo={g} aoMudar={(novo) => setGrupo(i, novo)} aoExcluir={() => delGrupo(i)} />
          ))}

          <div style={{ height: 12 }} />
        </div>

        <div className="janela-pe">
          <button className="btn btn-linha" style={{ flex: '0 0 34%' }} onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-primario" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar item'}</button>
        </div>
      </div>
    </div>
  );
}

function GrupoEditor({ grupo, aoMudar, aoExcluir }) {
  const [aberto, setAberto] = useState(false);
  const set = (k, v) => aoMudar({ ...grupo, [k]: v });
  const setItem = (i, novo) => aoMudar({ ...grupo, itens: grupo.itens.map((x, k) => (k === i ? novo : x)) });
  const addItem = () => aoMudar({ ...grupo, itens: [...(grupo.itens || []), { id: `i_${Date.now()}`, nome: '', preco: 0 }] });
  const delItem = (i) => aoMudar({ ...grupo, itens: grupo.itens.filter((_, k) => k !== i) });

  return (
    <div className="cartao" style={{ margin: '0 16px 10px' }}>
      <button style={{ width: '100%', padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }} onClick={() => setAberto(!aberto)}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{grupo.nome || 'Sem nome'}</div>
          <div style={{ fontSize: 12.5, color: 'var(--tinta-media)', marginTop: 2 }}>
            {grupo.tipo === 'unico' ? 'Escolha 1' : `Até ${grupo.max}`} · {(grupo.itens || []).length} opções · {grupo.obrigatorio ? 'obrigatório' : 'opcional'}
          </div>
        </div>
        <span style={{ color: 'var(--tinta-media)', fontSize: 18, transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>⌄</span>
      </button>

      {aberto && (
        <div style={{ borderTop: '1px solid var(--linha-forte)' }}>
          <div className="campo">
            <label>Nome do grupo</label>
            <input value={grupo.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Ex.: Tamanho da marmita" />
          </div>
          <div className="campo">
            <div className="par">
              <div>
                <label>Tipo</label>
                <select value={grupo.tipo} onChange={(e) => set('tipo', e.target.value)}>
                  <option value="unico">Escolher 1</option>
                  <option value="multiplo">Escolher vários</option>
                </select>
              </div>
              <div>
                <label>Máximo</label>
                <input type="number" value={grupo.max ?? 1} onChange={(e) => set('max', Number(e.target.value))} disabled={grupo.tipo === 'unico'} inputMode="numeric" />
              </div>
            </div>
          </div>
          <Interruptor titulo="Obrigatório" descricao="O cliente precisa escolher para adicionar" ligado={grupo.obrigatorio} aoMudar={() => set('obrigatorio', !grupo.obrigatorio)} />

          <div style={{ padding: '10px 16px 4px', fontSize: 12.5, fontWeight: 800, color: 'var(--tinta-media)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Opções</div>
          {(grupo.itens || []).map((it, i) => (
            <div key={it.id || i} style={{ display: 'flex', gap: 8, padding: '7px 16px', alignItems: 'center' }}>
              <input value={it.nome} onChange={(e) => setItem(i, { ...it, nome: e.target.value })} placeholder="Nome da opção"
                style={{ flex: 1, border: '1.5px solid var(--linha-forte)', borderRadius: 10, padding: '10px 12px', background: 'var(--fundo)' }} />
              <input type="number" step="0.01" value={it.preco} onChange={(e) => setItem(i, { ...it, preco: Number(e.target.value) })} placeholder="0,00" inputMode="decimal"
                style={{ width: 88, border: '1.5px solid var(--linha-forte)', borderRadius: 10, padding: '10px 12px', background: 'var(--fundo)' }} />
              <button onClick={() => delItem(i)} style={{ color: 'var(--vermelho)', padding: 6, fontSize: 18 }} aria-label="Remover opção">×</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 9, padding: '10px 16px 14px' }}>
            <button className="btn btn-linha btn-p" onClick={addItem}>+ Opção</button>
            <button className="btn btn-perigo btn-p" onClick={() => confirm(`Excluir o grupo "${grupo.nome}"?`) && aoExcluir()}>Excluir grupo</button>
          </div>
        </div>
      )}
    </div>
  );
}

function EditorCategoria({ categoria, aoFechar }) {
  const aviso = usarAviso();
  const [c, setC] = useState(categoria);
  const set = (k, v) => setC((a) => ({ ...a, [k]: v }));

  async function salvar() {
    try { await api(`/api/admin/categorias/${c.id}`, { method: 'PUT', body: c }); aviso('Categoria salva'); aoFechar(); }
    catch (e) { aviso(e.message, 'erro'); }
  }
  async function excluir() {
    if (!confirm(`Excluir a categoria "${c.nome}"?`)) return;
    try { await api(`/api/admin/categorias/${c.id}`, { method: 'DELETE' }); aviso('Categoria excluída'); aoFechar(); }
    catch (e) { aviso(e.message, 'erro'); }
  }

  return (
    <div className="cortina" onClick={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="janela">
        <div className="janela-topo">
          <button className="icone-botao" onClick={aoFechar}><Ico.Fechar /></button>
          <span className="janela-titulo">Editar categoria</span>
        </div>
        <div className="janela-corpo">
          <div className="cartao" style={{ margin: '12px 16px' }}>
            <div className="campo"><label>Nome</label><input value={c.nome} onChange={(e) => set('nome', e.target.value)} /></div>
            <div className="campo"><label>Descrição</label><input value={c.descricao || ''} onChange={(e) => set('descricao', e.target.value)} placeholder="opcional" /></div>
            <div className="campo">
              <div className="par">
                <div><label>Emoji</label><input value={c.icone || ''} onChange={(e) => set('icone', e.target.value)} placeholder="🍛" /></div>
                <div><label>Ordem</label><input type="number" value={c.ordem ?? 0} onChange={(e) => set('ordem', Number(e.target.value))} inputMode="numeric" /></div>
              </div>
            </div>
            <Interruptor titulo="Visível no cardápio" ligado={c.ativo} aoMudar={() => set('ativo', !c.ativo)} />
          </div>
          <div style={{ padding: '0 16px' }}>
            <button className="btn btn-perigo" onClick={excluir}>Excluir categoria</button>
          </div>
        </div>
        <div className="janela-pe">
          <button className="btn btn-linha" style={{ flex: '0 0 34%' }} onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-primario" onClick={salvar}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

export function Interruptor({ titulo, descricao, ligado, aoMudar }) {
  return (
    <div className="linha-interruptor">
      <div className="txt">
        <div className="t">{titulo}</div>
        {descricao && <div className="d">{descricao}</div>}
      </div>
      <button className={`interruptor ${ligado ? 'ligado' : ''}`} onClick={aoMudar} role="switch" aria-checked={!!ligado} aria-label={titulo} />
    </div>
  );
}

/* reduz a imagem antes do upload, economizando dados do celular */
async function reduzirImagem(arquivo, ladoMaximo = 1000) {
  const bitmap = await createImageBitmap(arquivo).catch(() => null);
  if (!bitmap) return arquivo;
  const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);
  const canvas = document.createElement('canvas');
  canvas.width = largura; canvas.height = altura;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, largura, altura);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
  return blob || arquivo;
}
