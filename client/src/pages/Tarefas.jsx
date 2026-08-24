import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, atrasada } from '../api.js';
import { usarSessao } from '../App.jsx';
import { Vazio, ItemTarefa, Modal } from '../components/Comuns.jsx';
import DetalheTarefa from '../components/DetalheTarefa.jsx';

const COLUNAS = [
  { status: 'pendente', rotulo: 'A fazer' },
  { status: 'em_andamento', rotulo: 'Em andamento' },
  { status: 'concluida', rotulo: 'Concluidas' }
];

export default function Tarefas({ soMinhas = false }) {
  const { gestor, atualizarContadores } = usarSessao();
  const [params, setParams] = useSearchParams();
  const [tarefas, setTarefas] = useState([]);
  const [pessoas, setPessoas] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState(params.get('status') || '');
  const [responsavel, setResponsavel] = useState('');
  const [projeto, setProjeto] = useState('');
  const [soAtrasadas, setSoAtrasadas] = useState(params.get('atrasadas') === '1');
  const [visao, setVisao] = useState('quadro');
  const [aberta, setAberta] = useState(null);
  const [novaAberta, setNovaAberta] = useState(false);
  const [erro, setErro] = useState('');

  async function carregar() {
    try {
      const q = new URLSearchParams();
      if (soMinhas) q.set('minhas', 'true');
      if (status) q.set('status', status);
      if (responsavel) q.set('responsavelId', responsavel);
      if (projeto) q.set('projetoId', projeto);
      if (busca.trim()) q.set('busca', busca.trim());

      const [t, u, p] = await Promise.all([
        api.get(`/tarefas?${q}`),
        api.get('/usuarios'),
        api.get('/projetos')
      ]);
      setTarefas(t);
      setPessoas(u.filter((x) => x.ativo !== false));
      setProjetos(p);
    } catch (e) { setErro(e.message); }
  }

  useEffect(() => {
    const atraso = setTimeout(carregar, busca ? 300 : 0);
    return () => clearTimeout(atraso);
  }, [soMinhas, status, responsavel, projeto, busca]);

  const filtradas = useMemo(
    () => (soAtrasadas ? tarefas.filter(atrasada) : tarefas),
    [tarefas, soAtrasadas]
  );

  const visiveis = useMemo(
    () => filtradas.filter((t) => t.status !== 'triagem' || gestor),
    [filtradas, gestor]
  );

  function limpar() {
    setStatus(''); setResponsavel(''); setProjeto(''); setBusca(''); setSoAtrasadas(false);
    setParams({});
  }

  const temFiltro = status || responsavel || projeto || busca || soAtrasadas;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {erro && <div className="aviso aviso-erro">{erro}</div>}

      <div className="linha-flex">
        <input
          className="entrada"
          style={{ maxWidth: 260 }}
          placeholder="Buscar por titulo ou documento"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <select className="selecao" style={{ width: 'auto' }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {gestor && <option value="triagem">Na triagem</option>}
          <option value="pendente">A fazer</option>
          <option value="em_andamento">Em andamento</option>
          <option value="concluida">Concluidas</option>
          <option value="cancelada">Canceladas</option>
        </select>

        {!soMinhas && gestor && (
          <select className="selecao" style={{ width: 'auto' }} value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
            <option value="">Todas as pessoas</option>
            <option value="sem">Sem responsavel</option>
            {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        )}

        {projetos.length > 0 && (
          <select className="selecao" style={{ width: 'auto' }} value={projeto} onChange={(e) => setProjeto(e.target.value)}>
            <option value="">Todos os projetos</option>
            {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        )}

        <label className="linha-flex pequeno" style={{ gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={soAtrasadas} onChange={(e) => setSoAtrasadas(e.target.checked)} />
          So atrasadas
        </label>

        {temFiltro && <button className="btn btn-p btn-fantasma" onClick={limpar}>Limpar filtros</button>}

        <div className="espaco" />

        <div className="linha-flex" style={{ gap: 3 }}>
          <button className={`btn btn-p${visao === 'quadro' ? ' btn-principal' : ''}`} onClick={() => setVisao('quadro')}>Quadro</button>
          <button className={`btn btn-p${visao === 'lista' ? ' btn-principal' : ''}`} onClick={() => setVisao('lista')}>Lista</button>
        </div>

        <button className="btn btn-principal btn-p" onClick={() => setNovaAberta(true)}>+ Nova tarefa</button>
      </div>

      {visiveis.length === 0 ? (
        <div className="cartao"><div className="cartao-corpo">
          <Vazio
            icone="&#9675;"
            titulo={temFiltro ? 'Nada bate com esses filtros' : soMinhas ? 'Sua fila esta vazia' : 'Nenhuma tarefa por aqui'}
            texto={temFiltro
              ? 'Ajuste ou limpe os filtros para ver mais.'
              : 'Envie um documento em Documentos e o sistema cria as tarefas automaticamente.'}
          />
        </div></div>
      ) : visao === 'quadro' ? (
        <div className="grade grade-3">
          {COLUNAS.map((c) => {
            const itens = visiveis.filter((t) => t.status === c.status);
            return (
              <div key={c.status} className="cartao">
                <div className="cartao-cabeca">
                  <h3 style={{ flex: 1 }}>{c.rotulo}</h3>
                  <span className="etq etq-cinza">{itens.length}</span>
                </div>
                <div className="cartao-corpo">
                  {itens.length === 0 ? (
                    <div className="pequeno silencioso" style={{ textAlign: 'center', padding: '18px 0' }}>
                      Vazio
                    </div>
                  ) : (
                    <div className="lista-tarefas">
                      {itens.map((t) => <ItemTarefa key={t.id} tarefa={t} aoAbrir={(x) => setAberta(x.id)} />)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="lista-tarefas">
          {visiveis.map((t) => <ItemTarefa key={t.id} tarefa={t} aoAbrir={(x) => setAberta(x.id)} />)}
        </div>
      )}

      {aberta && (
        <DetalheTarefa
          tarefaId={aberta}
          aoFechar={() => setAberta(null)}
          aoMudar={() => { carregar(); atualizarContadores(); }}
        />
      )}

      {novaAberta && (
        <NovaTarefa
          pessoas={pessoas}
          projetos={projetos}
          gestor={gestor}
          aoFechar={() => setNovaAberta(false)}
          aoCriar={() => { setNovaAberta(false); carregar(); atualizarContadores(); }}
        />
      )}
    </div>
  );
}

function NovaTarefa({ pessoas, projetos, gestor, aoFechar, aoCriar }) {
  const [form, setForm] = useState({
    titulo: '', descricao: '', responsavelId: '', projetoId: '', prioridade: 'media', prazo: ''
  });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  async function salvar() {
    if (form.titulo.trim().length < 3) { setErro('Escreva um titulo com pelo menos 3 letras.'); return; }
    setSalvando(true); setErro('');
    try {
      await api.post('/tarefas', {
        ...form,
        responsavelId: form.responsavelId || null,
        projetoId: form.projetoId || null,
        prazo: form.prazo || null
      });
      aoCriar();
    } catch (e) { setErro(e.message); setSalvando(false); }
  }

  return (
    <Modal
      titulo="Nova tarefa"
      subtitulo="Para o que nao veio de um documento"
      aoFechar={aoFechar}
      rodape={
        <>
          <button className="btn" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-principal" onClick={salvar} disabled={salvando}>
            {salvando ? 'Criando...' : 'Criar tarefa'}
          </button>
        </>
      }
    >
      {erro && <div className="aviso aviso-erro">{erro}</div>}

      <label className="campo">
        <span className="campo-rotulo">O que precisa ser feito</span>
        <input className="entrada" value={form.titulo} onChange={mudar('titulo')} autoFocus placeholder="Ex.: Gravar aula 3 do curso de inversores" />
      </label>

      <label className="campo">
        <span className="campo-rotulo">Detalhes (opcional)</span>
        <textarea className="area" value={form.descricao} onChange={mudar('descricao')} />
      </label>

      <div className="grade grade-2">
        {gestor && (
          <label className="campo">
            <span className="campo-rotulo">Responsavel</span>
            <select className="selecao" value={form.responsavelId} onChange={mudar('responsavelId')}>
              <option value="">Deixar na triagem</option>
              {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </label>
        )}

        <label className="campo">
          <span className="campo-rotulo">Prioridade</span>
          <select className="selecao" value={form.prioridade} onChange={mudar('prioridade')}>
            <option value="urgente">Urgente</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baixa">Baixa</option>
          </select>
        </label>

        <label className="campo">
          <span className="campo-rotulo">Prazo</span>
          <input className="entrada" type="date" value={form.prazo} onChange={mudar('prazo')} />
        </label>

        {projetos.length > 0 && (
          <label className="campo">
            <span className="campo-rotulo">Projeto</span>
            <select className="selecao" value={form.projetoId} onChange={mudar('projetoId')}>
              <option value="">Sem projeto</option>
              {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </label>
        )}
      </div>
    </Modal>
  );
}
