import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { usarSessao } from '../App.jsx';
import { Modal, Vazio } from '../components/Comuns.jsx';

const CORES = ['#F26522', '#25A06B', '#2F6FB8', '#C98A12', '#8B5CF6', '#D14343'];

export default function Projetos() {
  const { gestor } = usarSessao();
  const [projetos, setProjetos] = useState([]);
  const [editando, setEditando] = useState(null);
  const [erro, setErro] = useState('');

  async function carregar() {
    try { setProjetos(await api.get('/projetos')); }
    catch (e) { setErro(e.message); }
  }

  useEffect(() => { carregar(); }, []);

  async function excluir(p) {
    if (!confirm(`Excluir "${p.nome}"? As tarefas continuam, mas ficam sem projeto.`)) return;
    try { await api.del(`/projetos/${p.id}`); carregar(); }
    catch (e) { setErro(e.message); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {erro && <div className="aviso aviso-erro">{erro}</div>}

      <div className="linha-flex">
        <div className="pequeno silencioso" style={{ flex: 1 }}>
          Use projetos para separar frentes: lancamento de curso, pos-graduacao, operacao comercial.
        </div>
        {gestor && (
          <button className="btn btn-principal btn-p" onClick={() => setEditando({ nome: '', descricao: '', cor: CORES[0] })}>
            + Novo projeto
          </button>
        )}
      </div>

      {projetos.length === 0 ? (
        <div className="cartao"><div className="cartao-corpo">
          <Vazio
            icone="&#9670;"
            titulo="Nenhum projeto criado"
            texto="Projetos sao opcionais. Servem para agrupar documentos e tarefas de uma mesma frente."
          />
        </div></div>
      ) : (
        <div className="grade grade-3">
          {projetos.map((p) => {
            const pct = p.totalTarefas ? Math.round((p.concluidas / p.totalTarefas) * 100) : 0;
            return (
              <div key={p.id} className="cartao" style={{ overflow: 'hidden' }}>
                <div style={{ height: 4, background: p.cor }} />
                <div className="cartao-corpo">
                  <div className="linha-flex" style={{ alignItems: 'flex-start' }}>
                    <h3 style={{ flex: 1 }}>{p.nome}</h3>
                    {gestor && (
                      <div className="linha-flex" style={{ gap: 3 }}>
                        <button className="btn btn-p btn-fantasma" onClick={() => setEditando(p)}>Editar</button>
                        <button className="btn btn-p btn-fantasma" onClick={() => excluir(p)}>&#10005;</button>
                      </div>
                    )}
                  </div>

                  {p.descricao && <p className="pequeno silencioso" style={{ marginTop: 6 }}>{p.descricao}</p>}

                  <div className="esteira">
                    <div className="esteira-trilho">
                      <div className="esteira-parte" style={{ width: `${pct}%`, background: p.cor }} />
                    </div>
                    <span className="pequeno silencioso">{pct}%</span>
                  </div>

                  <div className="tarefa-meta">
                    <span>{p.totalTarefas} tarefa(s)</span>
                    <span>&#9679; {p.concluidas} concluida(s)</span>
                    {p.emTriagem > 0 && <span className="etq etq-ambar">{p.emTriagem} na triagem</span>}
                  </div>

                  <Link to={`/tarefas?projetoId=${p.id}`} className="btn btn-p" style={{ marginTop: 12 }}>
                    Ver tarefas
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editando && (
        <FormProjeto
          inicial={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={() => { setEditando(null); carregar(); }}
        />
      )}
    </div>
  );
}

function FormProjeto({ inicial, aoFechar, aoSalvar }) {
  const novo = !inicial.id;
  const [form, setForm] = useState({
    nome: inicial.nome || '', descricao: inicial.descricao || '', cor: inicial.cor || CORES[0]
  });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!form.nome.trim()) { setErro('Informe o nome do projeto.'); return; }
    setSalvando(true); setErro('');
    try {
      if (novo) await api.post('/projetos', form);
      else await api.patch(`/projetos/${inicial.id}`, form);
      aoSalvar();
    } catch (e) { setErro(e.message); setSalvando(false); }
  }

  return (
    <Modal
      titulo={novo ? 'Novo projeto' : 'Editar projeto'}
      aoFechar={aoFechar}
      rodape={
        <>
          <button className="btn" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-principal" onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </>
      }
    >
      {erro && <div className="aviso aviso-erro">{erro}</div>}

      <label className="campo">
        <span className="campo-rotulo">Nome</span>
        <input className="entrada" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} autoFocus />
      </label>

      <label className="campo">
        <span className="campo-rotulo">Descricao (opcional)</span>
        <textarea className="area" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
      </label>

      <div className="campo">
        <span className="campo-rotulo">Cor</span>
        <div className="linha-flex">
          {CORES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setForm({ ...form, cor: c })}
              aria-label={`Cor ${c}`}
              style={{
                width: 28, height: 28, borderRadius: 8, background: c, cursor: 'pointer',
                border: form.cor === c ? '2px solid var(--tinta)' : '2px solid transparent'
              }}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
}
