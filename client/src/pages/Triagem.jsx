import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { usarSessao } from '../App.jsx';
import { Vazio, ItemTarefa } from '../components/Comuns.jsx';
import DetalheTarefa from '../components/DetalheTarefa.jsx';

export default function Triagem() {
  const { atualizarContadores } = usarSessao();
  const [tarefas, setTarefas] = useState([]);
  const [pessoas, setPessoas] = useState([]);
  const [marcadas, setMarcadas] = useState([]);
  const [destino, setDestino] = useState('');
  const [prazo, setPrazo] = useState('');
  const [prioridade, setPrioridade] = useState('');
  const [porDocumento, setPorDocumento] = useState(true);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [aberta, setAberta] = useState(null);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    try {
      const [t, u] = await Promise.all([
        api.get('/tarefas?status=triagem'),
        api.get('/usuarios')
      ]);
      setTarefas(t);
      setPessoas(u.filter((x) => x.ativo !== false));
      setMarcadas((m) => m.filter((id) => t.some((x) => x.id === id)));
    } catch (e) { setErro(e.message); }
  }

  useEffect(() => { carregar(); }, []);

  const grupos = useMemo(() => {
    if (!porDocumento) return [{ chave: 'todas', nome: null, itens: tarefas }];
    const mapa = new Map();
    for (const t of tarefas) {
      const chave = t.documentoId || 'manuais';
      if (!mapa.has(chave)) {
        mapa.set(chave, { chave, nome: t.documentoNome || 'Criadas manualmente', itens: [] });
      }
      mapa.get(chave).itens.push(t);
    }
    return Array.from(mapa.values());
  }, [tarefas, porDocumento]);

  function alternar(id) {
    setMarcadas((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  }

  function marcarGrupo(itens) {
    const ids = itens.map((t) => t.id);
    const todasMarcadas = ids.every((id) => marcadas.includes(id));
    setMarcadas((m) =>
      todasMarcadas ? m.filter((id) => !ids.includes(id)) : Array.from(new Set([...m, ...ids]))
    );
  }

  async function distribuir() {
    if (!destino) { setErro('Escolha para quem vai.'); return; }
    setSalvando(true); setErro(''); setOk('');
    try {
      const r = await api.post('/tarefas/lote/atribuir', {
        ids: marcadas,
        responsavelId: destino,
        prazo: prazo || undefined,
        prioridade: prioridade || undefined
      });
      const nome = pessoas.find((p) => p.id === destino)?.nome || 'a pessoa';
      setOk(`${r.atualizadas} tarefa(s) enviada(s) para ${nome}.`);
      setMarcadas([]); setDestino(''); setPrazo(''); setPrioridade('');
      await carregar();
      atualizarContadores();
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  }

  async function descartar() {
    if (!confirm(`Cancelar ${marcadas.length} tarefa(s)? Elas saem da fila mas ficam no historico.`)) return;
    setSalvando(true);
    try {
      await api.post('/tarefas/lote/status', { ids: marcadas, status: 'cancelada' });
      setMarcadas([]);
      await carregar();
      atualizarContadores();
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  }

  const sugestoes = useMemo(() => {
    // pessoas citadas nas tarefas marcadas, para atalho de distribuicao
    const nomes = new Set();
    for (const id of marcadas) {
      const t = tarefas.find((x) => x.id === id);
      if (t?.responsavelSugerido) nomes.add(t.responsavelSugerido);
    }
    return Array.from(nomes);
  }, [marcadas, tarefas]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {erro && <div className="aviso aviso-erro">{erro}</div>}
      {ok && <div className="aviso aviso-ok">{ok}</div>}

      <div className="linha-flex">
        <div className="silencioso pequeno" style={{ flex: 1 }}>
          {tarefas.length} tarefa{tarefas.length === 1 ? '' : 's'} esperando destino
          {marcadas.length > 0 && ` \u00b7 ${marcadas.length} selecionada(s)`}
        </div>
        <label className="linha-flex pequeno" style={{ gap: 6, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={porDocumento}
            onChange={(e) => setPorDocumento(e.target.checked)}
          />
          Agrupar por documento
        </label>
      </div>

      {tarefas.length === 0 ? (
        <div className="cartao"><div className="cartao-corpo">
          <Vazio
            icone="&#10003;"
            titulo="Fila limpa"
            texto="Toda tarefa gerada ja tem responsavel. Quando um documento novo chegar sem nomes, ele aparece aqui."
          />
        </div></div>
      ) : (
        grupos.map((g) => (
          <div key={g.chave} className="cartao">
            {g.nome && (
              <div className="cartao-cabeca">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 className="truncar">{g.nome}</h3>
                  <div className="pequeno silencioso">{g.itens.length} tarefa(s)</div>
                </div>
                <button className="btn btn-p" onClick={() => marcarGrupo(g.itens)}>
                  {g.itens.every((t) => marcadas.includes(t.id)) ? 'Desmarcar' : 'Marcar tudo'}
                </button>
              </div>
            )}
            <div className="cartao-corpo">
              <div className="lista-tarefas">
                {g.itens.map((t) => (
                  <ItemTarefa
                    key={t.id}
                    tarefa={t}
                    selecionada={marcadas.includes(t.id)}
                    aoSelecionar={alternar}
                    aoAbrir={(x) => setAberta(x.id)}
                    mostrarFonte={!porDocumento}
                  />
                ))}
              </div>
            </div>
          </div>
        ))
      )}

      {marcadas.length > 0 && (
        <div className="acoes-lote">
          <strong>{marcadas.length} selecionada(s)</strong>

          <select className="selecao" value={destino} onChange={(e) => setDestino(e.target.value)}>
            <option value="">Enviar para...</option>
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}{p.setor ? ` \u2014 ${p.setor}` : ''}</option>
            ))}
          </select>

          <select className="selecao" value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
            <option value="">Manter prioridade</option>
            <option value="urgente">Urgente</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baixa">Baixa</option>
          </select>

          <input className="entrada" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} title="Prazo" />

          <button className="btn btn-verde" onClick={distribuir} disabled={salvando || !destino}>
            {salvando ? 'Enviando...' : 'Distribuir'}
          </button>
          <button className="btn btn-fantasma" style={{ color: '#fff' }} onClick={descartar} disabled={salvando}>
            Cancelar tarefas
          </button>
          <button className="btn btn-fantasma" style={{ color: '#9BA8B5' }} onClick={() => setMarcadas([])}>
            Limpar selecao
          </button>

          {sugestoes.length > 0 && (
            <div className="pequeno" style={{ width: '100%', color: '#9BA8B5' }}>
              Nomes citados nessas tarefas: {sugestoes.join(', ')} &mdash; cadastre a pessoa ou um apelido em Equipe para o sistema acertar sozinho da proxima vez.
            </div>
          )}
        </div>
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
