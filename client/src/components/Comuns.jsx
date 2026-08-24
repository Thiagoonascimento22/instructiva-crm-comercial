import { ROTULO_STATUS, CLASSE_STATUS, ROTULO_PRIORIDADE, CLASSE_PRIORIDADE, dataBR, atrasada, iniciais } from '../api.js';

export function Avatar({ nome = '', foto = null, tam = 32 }) {
  const estilo = { width: tam, height: tam, fontSize: Math.max(10, Math.round(tam * 0.38)) };
  return (
    <div className="avatar" style={estilo} title={nome}>
      {foto ? <img src={foto} alt={nome} /> : iniciais(nome)}
    </div>
  );
}

export function EtqStatus({ status }) {
  return (
    <span className={`etq ${CLASSE_STATUS[status] || 'etq-cinza'}`}>
      <span className="ponto" />
      {ROTULO_STATUS[status] || status}
    </span>
  );
}

export function EtqPrioridade({ prioridade }) {
  if (prioridade === 'media' || prioridade === 'baixa') {
    return <span className="pequeno silencioso">{ROTULO_PRIORIDADE[prioridade]}</span>;
  }
  return (
    <span className={`etq ${CLASSE_PRIORIDADE[prioridade] || 'etq-cinza'}`}>
      {ROTULO_PRIORIDADE[prioridade] || prioridade}
    </span>
  );
}

export function Vazio({ icone = '\u25CB', titulo, texto, acao }) {
  return (
    <div className="vazio">
      <div className="vazio-icone">{icone}</div>
      <div style={{ fontWeight: 600, color: 'var(--tinta)' }}>{titulo}</div>
      {texto && <div className="pequeno" style={{ marginTop: 5, maxWidth: 420, marginInline: 'auto' }}>{texto}</div>}
      {acao && <div style={{ marginTop: 16 }}>{acao}</div>}
    </div>
  );
}

export function ItemTarefa({ tarefa, selecionada, aoSelecionar, aoAbrir, mostrarFonte = true, mostrarResponsavel = true }) {
  const venceu = atrasada(tarefa);
  return (
    <div
      className={`tarefa${selecionada ? ' selecionada' : ''}`}
      onClick={() => aoAbrir?.(tarefa)}
    >
      {aoSelecionar && (
        <div
          className={`caixa${selecionada ? ' marcada' : ''}`}
          onClick={(e) => { e.stopPropagation(); aoSelecionar(tarefa.id); }}
          role="checkbox"
          aria-checked={selecionada}
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); aoSelecionar(tarefa.id); } }}
        >
          {selecionada ? '\u2713' : ''}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="tarefa-titulo">{tarefa.titulo}</div>

        <div className="tarefa-meta">
          <EtqStatus status={tarefa.status} />
          <EtqPrioridade prioridade={tarefa.prioridade} />

          {mostrarResponsavel && (
            tarefa.responsavelNome ? (
              <span>&#9679; {tarefa.responsavelNome}</span>
            ) : tarefa.responsavelSugerido ? (
              <span className="etq etq-ambar">Citado: {tarefa.responsavelSugerido}</span>
            ) : (
              <span className="etq etq-cinza">Sem responsavel</span>
            )
          )}

          {tarefa.prazo && (
            <span style={venceu ? { color: 'var(--vermelho)', fontWeight: 600 } : undefined}>
              {venceu ? '\u26A0 Venceu em ' : 'Prazo '}{dataBR(tarefa.prazo)}
            </span>
          )}

          {tarefa.projetoNome && (
            <span className="etq etq-cinza">
              <span className="ponto" style={{ background: tarefa.projetoCor }} />
              {tarefa.projetoNome}
            </span>
          )}

          {tarefa.categoria && <span className="etq etq-cinza">{tarefa.categoria}</span>}

          {tarefa.comentarios?.length > 0 && <span>&#9998; {tarefa.comentarios.length}</span>}
        </div>

        {mostrarFonte && tarefa.documentoNome && (
          <div className="tarefa-fonte truncar">
            {tarefa.documentoNome}
            {tarefa.trechoOrigem ? ` \u2014 "${tarefa.trechoOrigem}"` : ''}
          </div>
        )}
      </div>
    </div>
  );
}

export function Modal({ titulo, subtitulo, aoFechar, children, rodape, largura }) {
  return (
    <div className="fundo-modal" onClick={(e) => { if (e.target === e.currentTarget) aoFechar(); }}>
      <div className="modal" style={largura ? { maxWidth: largura } : undefined}>
        <div className="modal-cabeca">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2>{titulo}</h2>
            {subtitulo && <div className="pequeno silencioso" style={{ marginTop: 3 }}>{subtitulo}</div>}
          </div>
          <button className="btn btn-fantasma btn-p" onClick={aoFechar} aria-label="Fechar">&#10005;</button>
        </div>
        <div className="modal-corpo">{children}</div>
        {rodape && <div className="modal-pe">{rodape}</div>}
      </div>
    </div>
  );
}
