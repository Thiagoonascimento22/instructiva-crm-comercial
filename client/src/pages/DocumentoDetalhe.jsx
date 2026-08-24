import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, dataHoraBR, tamanhoArquivo, pegarToken } from '../api.js';
import { usarSessao } from '../App.jsx';
import { Vazio, ItemTarefa } from '../components/Comuns.jsx';
import DetalheTarefa from '../components/DetalheTarefa.jsx';

export default function DocumentoDetalhe() {
  const { id } = useParams();
  const navegar = useNavigate();
  const { gestor, atualizarContadores } = usarSessao();
  const [doc, setDoc] = useState(null);
  const [erro, setErro] = useState('');
  const [aba, setAba] = useState('tarefas');
  const [aberta, setAberta] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  async function carregar() {
    try { setDoc(await api.get(`/documentos/${id}`)); }
    catch (e) { setErro(e.message); }
  }

  useEffect(() => { carregar(); }, [id]);

  useEffect(() => {
    if (doc?.status !== 'processando') return;
    const t = setInterval(() => { carregar(); atualizarContadores(); }, 3000);
    return () => clearInterval(t);
  }, [doc?.status]);

  async function reprocessar() {
    if (!confirm('Ler o documento de novo? As tarefas ainda nao iniciadas serao substituidas.')) return;
    setOcupado(true);
    try { await api.post(`/documentos/${id}/reprocessar`, {}); setTimeout(carregar, 1200); }
    catch (e) { setErro(e.message); }
    finally { setOcupado(false); }
  }

  async function excluir() {
    const comTarefas = confirm('Excluir tambem as tarefas geradas por este documento?\n\nOK = apaga tudo. Cancelar = mantem as tarefas.');
    try {
      await api.del(`/documentos/${id}?comTarefas=${comTarefas}`);
      navegar('/documentos');
    } catch (e) { setErro(e.message); }
  }

  function baixar() {
    fetch(`/api/documentos/${id}/arquivo`, { headers: { Authorization: `Bearer ${pegarToken()}` } })
      .then((r) => r.blob())
      .then((b) => {
        const url = URL.createObjectURL(b);
        const a = document.createElement('a');
        a.href = url; a.download = doc.nome; a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => setErro('Nao foi possivel baixar o arquivo.'));
  }

  if (erro) return <div className="aviso aviso-erro">{erro}</div>;
  if (!doc) return <div className="silencioso"><span className="girando">&#9696;</span> Carregando...</div>;

  const triagem = doc.tarefas.filter((t) => t.status === 'triagem');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Link to="/documentos" className="pequeno silencioso">&#8592; Voltar para documentos</Link>

      <div className="cartao">
        <div className="cartao-corpo">
          <div className="linha-flex" style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <h2>{doc.nome}</h2>
              <div className="tarefa-meta">
                <span>{dataHoraBR(doc.criadoEm)}</span>
                <span>&#9679; {doc.enviadoPorNome}</span>
                <span>&#9679; {tamanhoArquivo(doc.tamanho)}</span>
                {doc.caracteres && <span>&#9679; {doc.caracteres.toLocaleString('pt-BR')} caracteres</span>}
              </div>
              {doc.resumo && <p className="tarefa-fonte" style={{ marginTop: 11 }}>{doc.resumo}</p>}
            </div>
            <div className="linha-flex">
              <button className="btn btn-p" onClick={baixar}>Baixar</button>
              {gestor && <button className="btn btn-p" onClick={reprocessar} disabled={ocupado}>Ler de novo</button>}
              {gestor && <button className="btn btn-p btn-perigo" onClick={excluir}>Excluir</button>}
            </div>
          </div>

          {doc.status === 'processando' && (
            <div className="aviso aviso-info" style={{ marginTop: 14, marginBottom: 0 }}>
              <span className="girando">&#9696;</span> Lendo o documento e montando as tarefas. Isso leva alguns segundos.
            </div>
          )}
          {doc.status === 'erro' && (
            <div className="aviso aviso-erro" style={{ marginTop: 14, marginBottom: 0 }}>{doc.erro}</div>
          )}
        </div>
      </div>

      {triagem.length > 0 && gestor && (
        <div className="cartao" style={{ borderColor: 'var(--aviso-linha)', background: 'var(--aviso-fundo)' }}>
          <div className="cartao-corpo linha-flex">
            <div style={{ flex: 1, minWidth: 200 }}>
              <h3>{triagem.length} tarefa{triagem.length > 1 ? 's' : ''} deste documento sem dono</h3>
              <p className="pequeno silencioso" style={{ marginTop: 3 }}>
                Distribua na triagem para a equipe receber.
              </p>
            </div>
            <Link to="/triagem" className="btn btn-principal">Distribuir agora</Link>
          </div>
        </div>
      )}

      <div>
        <div className="abas">
          <button className={`aba${aba === 'tarefas' ? ' ativa' : ''}`} onClick={() => setAba('tarefas')}>
            Tarefas geradas ({doc.tarefas.length})
          </button>
          <button className={`aba${aba === 'texto' ? ' ativa' : ''}`} onClick={() => setAba('texto')}>
            Texto lido
          </button>
        </div>

        {aba === 'tarefas' ? (
          doc.tarefas.length === 0 ? (
            <div className="cartao"><div className="cartao-corpo">
              <Vazio
                icone="&#9675;"
                titulo="Nenhuma tarefa saiu deste documento"
                texto="Pode ser um material so de contexto, sem acoes claras. Voce pode ler de novo ou criar as tarefas na mao."
              />
            </div></div>
          ) : (
            <div className="lista-tarefas">
              {doc.tarefas.map((t) => (
                <ItemTarefa key={t.id} tarefa={t} mostrarFonte={false} aoAbrir={(x) => setAberta(x.id)} />
              ))}
            </div>
          )
        ) : (
          <div className="cartao"><div className="cartao-corpo">
            <pre style={{
              whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13,
              color: 'var(--tinta-media)', margin: 0, maxHeight: 540, overflowY: 'auto'
            }}>
              {doc.texto || 'Texto nao disponivel.'}
            </pre>
          </div></div>
        )}
      </div>

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
