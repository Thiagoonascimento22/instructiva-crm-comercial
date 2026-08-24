import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, dataHoraBR, tamanhoArquivo } from '../api.js';
import { usarSessao } from '../App.jsx';
import { Vazio } from '../components/Comuns.jsx';

const ACEITOS = '.pdf,.docx,.txt,.md,.csv';

export default function Documentos() {
  const { gestor, config, atualizarContadores } = usarSessao();
  const [docs, setDocs] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [projetoId, setProjetoId] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const entradaRef = useRef(null);

  async function carregar() {
    try {
      const [d, p] = await Promise.all([api.get('/documentos'), api.get('/projetos')]);
      setDocs(d);
      setProjetos(p);
    } catch (e) { setErro(e.message); }
  }

  useEffect(() => { carregar(); }, []);

  // atualiza sozinho enquanto houver documento sendo lido
  useEffect(() => {
    if (!docs.some((d) => d.status === 'processando')) return;
    const id = setInterval(() => { carregar(); atualizarContadores(); }, 3000);
    return () => clearInterval(id);
  }, [docs]);

  async function enviar(arquivos) {
    const lista = Array.from(arquivos || []);
    if (lista.length === 0) return;
    setErro(''); setOk(''); setEnviando(true);
    let enviados = 0;
    for (const arquivo of lista) {
      const fd = new FormData();
      fd.append('arquivo', arquivo);
      if (projetoId) fd.append('projetoId', projetoId);
      try {
        await api.enviarArquivo('/documentos', fd);
        enviados++;
      } catch (e) {
        setErro(`${arquivo.name}: ${e.message}`);
      }
    }
    setEnviando(false);
    if (enviados > 0) {
      setOk(`${enviados} documento(s) recebido(s). A leitura roda em segundo plano.`);
      carregar();
    }
    if (entradaRef.current) entradaRef.current.value = '';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {config.iaAtiva === false && (
        <div className="aviso aviso-info">
          A leitura por IA esta desligada (falta a variavel OPENAI_API_KEY no Railway).
          O sistema ainda extrai tarefas, mas por regras simples de texto.
        </div>
      )}

      {erro && <div className="aviso aviso-erro">{erro}</div>}
      {ok && <div className="aviso aviso-ok">{ok}</div>}

      <div className="cartao">
        <div className="cartao-corpo">
          {projetos.length > 0 && (
            <label className="campo" style={{ maxWidth: 340 }}>
              <span className="campo-rotulo">Vincular a um projeto (opcional)</span>
              <select className="selecao" value={projetoId} onChange={(e) => setProjetoId(e.target.value)}>
                <option value="">Sem projeto</option>
                {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </label>
          )}

          <div
            className={`zona-envio${arrastando ? ' arrastando' : ''}`}
            onClick={() => entradaRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => { e.preventDefault(); setArrastando(false); enviar(e.dataTransfer.files); }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') entradaRef.current?.click(); }}
          >
            <input
              ref={entradaRef}
              type="file"
              accept={ACEITOS}
              multiple
              style={{ display: 'none' }}
              onChange={(e) => enviar(e.target.files)}
            />
            {enviando ? (
              <>
                <div style={{ fontSize: 26, marginBottom: 8 }}><span className="girando">&#9696;</span></div>
                <div style={{ fontWeight: 600 }}>Enviando...</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 26, marginBottom: 8, opacity: .6 }}>&#8673;</div>
                <div style={{ fontWeight: 600 }}>Arraste o playbook aqui ou clique para escolher</div>
                <div className="pequeno silencioso" style={{ marginTop: 5 }}>
                  PDF, DOCX, TXT ou MD &middot; ate 25 MB por arquivo
                </div>
              </>
            )}
          </div>

          <p className="pequeno silencioso" style={{ marginTop: 12 }}>
            O sistema le o documento, separa as acoes e cria uma tarefa para cada uma.
            Quem estiver citado pelo nome recebe direto; o resto cai na triagem do gestor.
          </p>
        </div>
      </div>

      <div className="cartao">
        <div className="cartao-cabeca">
          <h2 style={{ flex: 1 }}>Documentos enviados</h2>
          <span className="pequeno silencioso">{docs.length} no total</span>
        </div>
        <div className="cartao-corpo">
          {docs.length === 0 ? (
            <Vazio
              icone="&#9634;"
              titulo="Nada aqui ainda"
              texto="Envie o primeiro playbook para o sistema comecar a gerar tarefas."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {docs.map((d) => <CartaoDoc key={d.id} doc={d} gestor={gestor} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CartaoDoc({ doc }) {
  const total = doc.totalTarefas || 0;
  const atribuidas = doc.atribuidas || 0;
  const triagem = doc.emTriagem || 0;

  return (
    <Link to={`/documentos/${doc.id}`} className="tarefa" style={{ display: 'block' }}>
      <div className="linha-flex" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="tarefa-titulo truncar">{doc.nome}</div>
          <div className="tarefa-meta">
            <span>{dataHoraBR(doc.criadoEm)}</span>
            <span>&#9679; {doc.enviadoPorNome}</span>
            <span>&#9679; {tamanhoArquivo(doc.tamanho)}</span>
            {doc.modoAnalise === 'heuristico' && <span className="etq etq-cinza">sem IA</span>}
          </div>
        </div>

        {doc.status === 'processando' && (
          <span className="etq etq-azul"><span className="girando">&#9696;</span> Lendo documento</span>
        )}
        {doc.status === 'erro' && <span className="etq etq-vermelha">Falhou</span>}
        {doc.status === 'processado' && (
          <span className="etq etq-cinza">{total} tarefa{total === 1 ? '' : 's'}</span>
        )}
      </div>

      {doc.status === 'erro' && (
        <div className="pequeno" style={{ color: 'var(--vermelho)', marginTop: 8 }}>{doc.erro}</div>
      )}

      {doc.status === 'processado' && doc.resumo && (
        <div className="tarefa-fonte" style={{ marginTop: 9 }}>{doc.resumo}</div>
      )}

      {doc.status === 'processado' && total > 0 && (
        <div className="esteira">
          <div className="esteira-trilho">
            <div className="esteira-parte" style={{ width: `${(atribuidas / total) * 100}%`, background: 'var(--esmeralda)' }} />
            <div className="esteira-parte" style={{ width: `${(triagem / total) * 100}%`, background: 'var(--ambar)' }} />
          </div>
          <span className="pequeno" style={{ color: 'var(--esmeralda)', fontWeight: 600 }}>{atribuidas} com dono</span>
          {triagem > 0 && (
            <span className="pequeno" style={{ color: 'var(--ambar)', fontWeight: 600 }}>{triagem} na triagem</span>
          )}
        </div>
      )}
    </Link>
  );
}
