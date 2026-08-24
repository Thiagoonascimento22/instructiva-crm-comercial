import { useEffect, useState } from 'react';
import { api, dataHoraBR, dataBR } from '../api.js';
import { usarSessao } from '../App.jsx';
import { Modal, EtqStatus } from './Comuns.jsx';

export default function DetalheTarefa({ tarefaId, aoFechar, aoMudar }) {
  const { usuario, gestor } = usarSessao();
  const [tarefa, setTarefa] = useState(null);
  const [pessoas, setPessoas] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [comentario, setComentario] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      api.get(`/tarefas/${tarefaId}`),
      api.get('/usuarios'),
      api.get('/projetos')
    ])
      .then(([t, u, p]) => {
        if (!vivo) return;
        setTarefa(t);
        setPessoas(u.filter((x) => x.ativo !== false));
        setProjetos(p);
      })
      .catch((e) => setErro(e.message));
    return () => { vivo = false; };
  }, [tarefaId]);

  async function aplicar(campos) {
    setSalvando(true); setErro('');
    try {
      const atualizada = await api.patch(`/tarefas/${tarefaId}`, campos);
      setTarefa(atualizada);
      aoMudar?.();
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  }

  async function comentar() {
    const texto = comentario.trim();
    if (!texto) return;
    try {
      await api.post(`/tarefas/${tarefaId}/comentarios`, { texto });
      setComentario('');
      setTarefa(await api.get(`/tarefas/${tarefaId}`));
      aoMudar?.();
    } catch (e) { setErro(e.message); }
  }

  async function excluir() {
    if (!confirm('Excluir esta tarefa? Nao da para desfazer.')) return;
    try {
      await api.del(`/tarefas/${tarefaId}`);
      aoMudar?.();
      aoFechar();
    } catch (e) { setErro(e.message); }
  }

  if (!tarefa) {
    return (
      <Modal titulo="Carregando..." aoFechar={aoFechar}>
        {erro ? <div className="aviso aviso-erro">{erro}</div> : <span className="girando">&#9696;</span>}
      </Modal>
    );
  }

  const podeEditar = gestor || tarefa.responsavelId === usuario.id;

  return (
    <Modal
      titulo={tarefa.titulo}
      subtitulo={tarefa.documentoNome ? `Origem: ${tarefa.documentoNome}` : 'Tarefa criada manualmente'}
      aoFechar={aoFechar}
      largura={680}
      rodape={
        <>
          {gestor && <button className="btn btn-perigo btn-p" onClick={excluir}>Excluir</button>}
          <div className="espaco" />
          <button className="btn" onClick={aoFechar}>Fechar</button>
        </>
      }
    >
      {erro && <div className="aviso aviso-erro">{erro}</div>}

      {tarefa.trechoOrigem && (
        <div className="tarefa-fonte" style={{ marginBottom: 16, fontSize: 13 }}>
          &ldquo;{tarefa.trechoOrigem}&rdquo;
        </div>
      )}

      <div className="linha-flex" style={{ marginBottom: 16 }}>
        <EtqStatus status={tarefa.status} />
        {tarefa.responsavelSugerido && !tarefa.responsavelId && (
          <span className="etq etq-ambar">Nome citado: {tarefa.responsavelSugerido}</span>
        )}
        <span className="pequeno silencioso">Criada em {dataBR(tarefa.criadoEm)}</span>
      </div>

      <div className="grade grade-2" style={{ marginBottom: 4 }}>
        <label className="campo">
          <span className="campo-rotulo">Status</span>
          <select
            className="selecao"
            value={tarefa.status}
            disabled={!podeEditar || salvando}
            onChange={(e) => aplicar({ status: e.target.value })}
          >
            {gestor && <option value="triagem">Na triagem</option>}
            <option value="pendente">A fazer</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluida">Concluida</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </label>

        <label className="campo">
          <span className="campo-rotulo">Responsavel</span>
          <select
            className="selecao"
            value={tarefa.responsavelId || ''}
            disabled={!gestor || salvando}
            onChange={(e) => aplicar({ responsavelId: e.target.value || null })}
          >
            <option value="">Sem responsavel (volta para triagem)</option>
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}{p.setor ? ` \u2014 ${p.setor}` : ''}</option>
            ))}
          </select>
        </label>

        <label className="campo">
          <span className="campo-rotulo">Prioridade</span>
          <select
            className="selecao"
            value={tarefa.prioridade}
            disabled={!gestor || salvando}
            onChange={(e) => aplicar({ prioridade: e.target.value })}
          >
            <option value="urgente">Urgente</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baixa">Baixa</option>
          </select>
        </label>

        <label className="campo">
          <span className="campo-rotulo">Prazo</span>
          <input
            className="entrada"
            type="date"
            value={tarefa.prazo || ''}
            disabled={!gestor || salvando}
            onChange={(e) => aplicar({ prazo: e.target.value || null })}
          />
          {tarefa.prazoTexto && <span className="dica">No documento: &ldquo;{tarefa.prazoTexto}&rdquo;</span>}
        </label>
      </div>

      {gestor && (
        <label className="campo">
          <span className="campo-rotulo">Projeto</span>
          <select
            className="selecao"
            value={tarefa.projetoId || ''}
            disabled={salvando}
            onChange={(e) => aplicar({ projetoId: e.target.value || null })}
          >
            <option value="">Sem projeto</option>
            {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </label>
      )}

      <label className="campo">
        <span className="campo-rotulo">Descricao</span>
        <textarea
          className="area"
          defaultValue={tarefa.descricao}
          disabled={!podeEditar}
          onBlur={(e) => {
            if (e.target.value !== tarefa.descricao) aplicar({ descricao: e.target.value });
          }}
          placeholder="Detalhe o que precisa ser feito."
        />
        <span className="dica">Sai do campo e a alteracao e salva.</span>
      </label>

      <div style={{ marginTop: 22 }}>
        <h3 style={{ marginBottom: 10 }}>Comentarios</h3>
        {tarefa.comentarios?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 12 }}>
            {tarefa.comentarios.map((c) => (
              <div key={c.id} style={{ background: 'var(--creme)', padding: '9px 12px', borderRadius: 'var(--raio-p)' }}>
                <div className="pequeno" style={{ fontWeight: 600 }}>
                  {c.autorNome} <span className="silencioso" style={{ fontWeight: 400 }}>&middot; {dataHoraBR(c.criadoEm)}</span>
                </div>
                <div style={{ marginTop: 3, fontSize: 13 }}>{c.texto}</div>
              </div>
            ))}
          </div>
        )}
        <div className="linha-flex" style={{ flexWrap: 'nowrap' }}>
          <input
            className="entrada"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') comentar(); }}
            placeholder="Escreva um comentario"
          />
          <button className="btn btn-principal" onClick={comentar} disabled={!comentario.trim()}>Enviar</button>
        </div>
      </div>

      <details style={{ marginTop: 20 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          Historico ({tarefa.historico?.length || 0})
        </summary>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {(tarefa.historico || []).map((h, i) => (
            <div key={i} className="pequeno" style={{ paddingLeft: 11, borderLeft: '2px solid var(--linha)' }}>
              <div>{h.acao}</div>
              <div className="silencioso">{h.porNome ? `${h.porNome} \u00b7 ` : ''}{dataHoraBR(h.em)}</div>
            </div>
          ))}
        </div>
      </details>
    </Modal>
  );
}
