import { useEffect, useMemo, useState } from 'react';
import { api, dataBR, atrasada } from '../api.js';
import { usarSessao } from '../App.jsx';
import { Modal, EtqPrioridade } from '../components/Comuns.jsx';
import DetalheTarefa from '../components/DetalheTarefa.jsx';

const CORES = ['#2F6FB8', '#F26522', '#25A06B', '#8B5CF6', '#C98A12', '#D14343', '#0EA5A5', '#6B7583'];
const TIPOS = [
  { v: 'todo', r: 'A fazer' },
  { v: 'doing', r: 'Em andamento' },
  { v: 'done', r: 'Concluida' }
];

export default function MeuFluxo() {
  const { atualizarContadores } = usarSessao();
  const [etapas, setEtapas] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [arrastando, setArrastando] = useState(null);
  const [sobre, setSobre] = useState(null);
  const [editando, setEditando] = useState(null);
  const [aberta, setAberta] = useState(null);

  async function carregar() {
    try {
      const d = await api.get('/meu-fluxo');
      setEtapas(d.etapas);
      setTarefas(d.tarefas);
    } catch (e) { setErro(e.message); }
    finally { setCarregando(false); }
  }

  useEffect(() => { carregar(); }, []);

  // agrupa cada tarefa na sua etapa; sem etapa, cai na primeira do tipo compativel
  const porEtapa = useMemo(() => {
    const mapa = {};
    etapas.forEach((e) => { mapa[e.id] = []; });
    const primeira = (tipo) => etapas.find((e) => e.tipo === tipo) || etapas[0];
    for (const t of tarefas) {
      let alvo = t.etapaId && mapa[t.etapaId] ? t.etapaId : null;
      if (!alvo) {
        const tipo = t.status === 'concluida' ? 'done' : t.status === 'em_andamento' ? 'doing' : 'todo';
        alvo = (primeira(tipo) || etapas[0])?.id;
      }
      if (alvo && mapa[alvo]) mapa[alvo].push(t);
    }
    return mapa;
  }, [etapas, tarefas]);

  async function soltar(etapaId) {
    setSobre(null);
    const t = arrastando;
    setArrastando(null);
    if (!t || t.etapaId === etapaId) return;
    // otimista
    setTarefas((lista) => lista.map((x) => (x.id === t.id ? { ...x, etapaId } : x)));
    try {
      const r = await api.patch(`/tarefas/${t.id}/etapa`, { etapaId });
      setTarefas((lista) => lista.map((x) => (x.id === t.id ? { ...x, etapaId, status: r.status } : x)));
      atualizarContadores();
    } catch (e) { setErro(e.message); carregar(); }
  }

  async function salvarEtapas(novas) {
    setEtapas(novas);
    try {
      const saved = await api.put('/meu-fluxo/etapas', { etapas: novas });
      if (saved?.etapas) setEtapas(saved.etapas);
      carregar();
    } catch (e) { setErro(e.message); carregar(); }
  }

  function moverEtapa(idx, dir) {
    const alvo = idx + dir;
    if (alvo < 0 || alvo >= etapas.length) return;
    const nova = [...etapas];
    [nova[idx], nova[alvo]] = [nova[alvo], nova[idx]];
    salvarEtapas(nova);
  }

  function removerEtapa(id) {
    if (etapas.length <= 1) { setErro('Deixe ao menos uma etapa.'); return; }
    if (!confirm('Remover esta etapa? As tarefas dela voltam para a primeira coluna.')) return;
    salvarEtapas(etapas.filter((e) => e.id !== id));
  }

  if (carregando) return <div className="silencioso"><span className="girando">&#9696;</span> Carregando seu fluxo...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {erro && <div className="aviso aviso-erro">{erro}</div>}

      <div className="linha-flex">
        <p className="pequeno silencioso" style={{ flex: 1 }}>
          Arraste os cartoes entre as colunas. As colunas sao suas &mdash; crie as etapas do seu jeito.
          Mover para uma etapa de "concluida" marca a tarefa como feita.
        </p>
        <button className="btn btn-principal btn-p" onClick={() => setEditando({ nome: '', cor: CORES[0], tipo: 'todo' })}>
          + Nova etapa
        </button>
      </div>

      <div className="kanban">
        {etapas.map((e, idx) => {
          const itens = porEtapa[e.id] || [];
          return (
            <div
              key={e.id}
              className={`coluna${sobre === e.id ? ' solta' : ''}`}
              onDragOver={(ev) => { ev.preventDefault(); setSobre(e.id); }}
              onDragLeave={() => setSobre((s) => (s === e.id ? null : s))}
              onDrop={() => soltar(e.id)}
            >
              <div className="coluna-cabeca">
                <span className="coluna-cor" style={{ background: e.cor }} />
                <span className="coluna-nome truncar">{e.nome}</span>
                <span className="coluna-conta">{itens.length}</span>
                <ColunaMenu
                  podeEsq={idx > 0}
                  podeDir={idx < etapas.length - 1}
                  aoEsq={() => moverEtapa(idx, -1)}
                  aoDir={() => moverEtapa(idx, 1)}
                  aoEditar={() => setEditando({ ...e })}
                  aoRemover={() => removerEtapa(e.id)}
                />
              </div>
              <div className="coluna-corpo">
                {itens.length === 0 ? (
                  <div className="coluna-vazia">Solte tarefas aqui</div>
                ) : (
                  itens.map((t) => (
                    <div
                      key={t.id}
                      className={`card-kanban${arrastando?.id === t.id ? ' arrastando' : ''}`}
                      draggable
                      onDragStart={() => setArrastando(t)}
                      onDragEnd={() => { setArrastando(null); setSobre(null); }}
                      onClick={() => setAberta(t.id)}
                    >
                      <div className="card-kanban-titulo">{t.titulo}</div>
                      <div className="card-kanban-meta">
                        <EtqPrioridade prioridade={t.prioridade} />
                        {t.prazo && (
                          <span style={atrasada(t) ? { color: 'var(--vermelho-txt)', fontWeight: 600 } : undefined}>
                            {atrasada(t) ? '\u26A0 ' : ''}{dataBR(t.prazo)}
                          </span>
                        )}
                        {t.projetoNome && (
                          <span className="etq etq-cinza">
                            <span className="ponto" style={{ background: t.projetoCor }} />{t.projetoNome}
                          </span>
                        )}
                        {t.comentarios > 0 && <span>&#9998; {t.comentarios}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}

        <button className="coluna-nova" onClick={() => setEditando({ nome: '', cor: CORES[0], tipo: 'todo' })}>
          + Adicionar etapa
        </button>
      </div>

      {editando && (
        <FormEtapa
          inicial={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={(dados) => {
            const existe = etapas.some((e) => e.id === dados.id);
            const novas = existe
              ? etapas.map((e) => (e.id === dados.id ? { ...e, ...dados } : e))
              : [...etapas, { ...dados, id: `tmp-${Date.now()}` }];
            setEditando(null);
            salvarEtapas(novas);
          }}
        />
      )}

      {aberta && (
        <DetalheTarefa
          tarefaId={aberta}
          aoFechar={() => setAberta(null)}
          aoMudar={() => { carregar(); atualizarContadores(); }}
        />
      )}
    </div>
  );
}

function ColunaMenu({ podeEsq, podeDir, aoEsq, aoDir, aoEditar, aoRemover }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button className="btn btn-fantasma btn-p" onClick={() => setAberto((a) => !a)} aria-label="Opcoes da etapa">
        &#8942;
      </button>
      {aberto && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setAberto(false)} />
          <div className="cartao" style={{ position: 'absolute', right: 0, top: 30, zIndex: 11, width: 180, padding: 6, boxShadow: 'var(--sombra-lg)' }}>
            <button className="nav-item" style={{ width: '100%' }} onClick={() => { setAberto(false); aoEditar(); }}>Editar etapa</button>
            {podeEsq && <button className="nav-item" style={{ width: '100%' }} onClick={() => { setAberto(false); aoEsq(); }}>&#8592; Mover para a esquerda</button>}
            {podeDir && <button className="nav-item" style={{ width: '100%' }} onClick={() => { setAberto(false); aoDir(); }}>Mover para a direita &#8594;</button>}
            <button className="nav-item" style={{ width: '100%', color: 'var(--vermelho-txt)' }} onClick={() => { setAberto(false); aoRemover(); }}>Remover</button>
          </div>
        </>
      )}
    </div>
  );
}

function FormEtapa({ inicial, aoFechar, aoSalvar }) {
  const novo = !inicial.id;
  const [nome, setNome] = useState(inicial.nome || '');
  const [cor, setCor] = useState(inicial.cor || CORES[0]);
  const [tipo, setTipo] = useState(inicial.tipo || 'todo');
  const [erro, setErro] = useState('');

  function salvar() {
    if (!nome.trim()) { setErro('De um nome para a etapa.'); return; }
    aoSalvar({ id: inicial.id, nome: nome.trim(), cor, tipo });
  }

  return (
    <Modal
      titulo={novo ? 'Nova etapa' : 'Editar etapa'}
      subtitulo="As etapas organizam o seu fluxo pessoal"
      aoFechar={aoFechar}
      largura={460}
      rodape={
        <>
          <button className="btn" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-principal" onClick={salvar}>Salvar</button>
        </>
      }
    >
      {erro && <div className="aviso aviso-erro">{erro}</div>}

      <label className="campo">
        <span className="campo-rotulo">Nome da etapa</span>
        <input className="entrada" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus placeholder="Ex.: Aguardando cliente" />
      </label>

      <div className="campo">
        <span className="campo-rotulo">Cor</span>
        <div className="linha-flex">
          {CORES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCor(c)}
              aria-label={`Cor ${c}`}
              style={{
                width: 28, height: 28, borderRadius: 8, background: c, cursor: 'pointer',
                border: cor === c ? '2px solid var(--texto)' : '2px solid transparent'
              }}
            />
          ))}
        </div>
      </div>

      <label className="campo" style={{ marginBottom: 0 }}>
        <span className="campo-rotulo">Quando eu mover um cartao para ca, a tarefa fica...</span>
        <select className="selecao" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.r}</option>)}
        </select>
        <span className="dica">Isso mantem o status certo para o gestor ver o andamento.</span>
      </label>
    </Modal>
  );
}
