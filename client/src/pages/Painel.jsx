import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, dataBR } from '../api.js';
import { usarSessao } from '../App.jsx';
import { Vazio, ItemTarefa } from '../components/Comuns.jsx';
import DetalheTarefa from '../components/DetalheTarefa.jsx';

export default function Painel() {
  const { usuario, gestor, atualizarContadores } = usarSessao();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [aberta, setAberta] = useState(null);

  async function carregar() {
    try { setDados(await api.get('/dashboard')); }
    catch (e) { setErro(e.message); }
  }

  useEffect(() => { carregar(); }, []);

  if (erro) return <div className="aviso aviso-erro">{erro}</div>;
  if (!dados) return <div className="silencioso"><span className="girando">&#9696;</span> Carregando painel...</div>;

  const r = dados.resumo;
  const metricas = gestor
    ? [
        { rotulo: 'Na triagem', valor: r.triagem, cor: 'var(--ambar-txt)', bg: 'var(--ambar-bg)', icone: '\u2691', para: '/triagem' },
        { rotulo: 'A fazer', valor: r.pendentes, cor: 'var(--azul-txt)', bg: 'var(--azul-bg)', icone: '\u25CB', para: '/tarefas?status=pendente' },
        { rotulo: 'Em andamento', valor: r.emAndamento, cor: 'var(--teal-txt)', bg: 'var(--teal-bg)', icone: '\u25D0', para: '/tarefas?status=em_andamento' },
        { rotulo: 'Atrasadas', valor: r.atrasadas, cor: 'var(--vermelho-txt)', bg: 'var(--vermelho-bg)', icone: '\u26A0', para: '/tarefas?atrasadas=1' }
      ]
    : [
        { rotulo: 'A fazer', valor: r.pendentes, cor: 'var(--azul-txt)', bg: 'var(--azul-bg)', icone: '\u25CB', para: '/minhas-tarefas' },
        { rotulo: 'Em andamento', valor: r.emAndamento, cor: 'var(--teal-txt)', bg: 'var(--teal-bg)', icone: '\u25D0', para: '/minhas-tarefas' },
        { rotulo: 'Atrasadas', valor: r.atrasadas, cor: 'var(--vermelho-txt)', bg: 'var(--vermelho-bg)', icone: '\u26A0', para: '/minhas-tarefas' },
        { rotulo: 'Concluidas', valor: r.concluidas, cor: 'var(--verde-txt)', bg: 'var(--verde-bg)', icone: '\u2713', para: '/minhas-tarefas' }
      ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {gestor && r.triagem > 0 && (
        <div className="cartao" style={{ borderColor: 'var(--aviso-linha)', background: 'var(--aviso-fundo)' }}>
          <div className="cartao-corpo linha-flex">
            <div style={{ flex: 1, minWidth: 200 }}>
              <h3>{r.triagem} tarefa{r.triagem > 1 ? 's' : ''} esperando um dono</h3>
              <p className="pequeno silencioso" style={{ marginTop: 3 }}>
                Os documentos nao indicaram quem executa. Distribua para liberar a equipe.
              </p>
            </div>
            <Link to="/triagem" className="btn btn-principal">Abrir triagem</Link>
          </div>
        </div>
      )}

      <div className="grade grade-4">
        {metricas.map((m) => (
          <Link key={m.rotulo} to={m.para} className="cartao metrica">
            <div className="metrica-icone" style={{ background: m.bg, color: m.cor }}>{m.icone}</div>
            <div>
              <div className="metrica-valor" style={{ color: m.valor > 0 ? m.cor : 'var(--texto-3)' }}>
                {m.valor}
              </div>
              <div className="metrica-rotulo">{m.rotulo}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grade" style={{ gridTemplateColumns: gestor ? '1.1fr 1fr' : '1fr' }}>
        <div className="cartao">
          <div className="cartao-cabeca">
            <h2 style={{ flex: 1 }}>Seus proximos passos</h2>
            <Link to="/minhas-tarefas" className="btn btn-p">Ver tudo</Link>
          </div>
          <div className="cartao-corpo">
            {dados.minhasProximas.length === 0 ? (
              <Vazio
                icone="&#10003;"
                titulo="Nada na sua fila"
                texto="Quando o gestor distribuir uma tarefa para voce, ela aparece aqui."
              />
            ) : (
              <div className="lista-tarefas">
                {dados.minhasProximas.map((t) => (
                  <ItemTarefa key={t.id} tarefa={t} mostrarResponsavel={false} aoAbrir={(x) => setAberta(x.id)} />
                ))}
              </div>
            )}
          </div>
        </div>

        {gestor && (
          <div className="cartao">
            <div className="cartao-cabeca">
              <h2 style={{ flex: 1 }}>Carga por pessoa</h2>
              <Link to="/equipe" className="btn btn-p">Equipe</Link>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Pessoa</th>
                    <th style={{ textAlign: 'center' }}>A fazer</th>
                    <th style={{ textAlign: 'center' }}>Andamento</th>
                    <th style={{ textAlign: 'center' }}>Atraso</th>
                    <th style={{ textAlign: 'center' }}>Feitas</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.porPessoa.filter((p) => p.total > 0).length === 0 ? (
                    <tr><td colSpan={5} className="silencioso" style={{ textAlign: 'center', padding: 26 }}>
                      Nenhuma tarefa distribuida ainda.
                    </td></tr>
                  ) : (
                    dados.porPessoa.filter((p) => p.total > 0).map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{p.nome}</div>
                          {p.setor && <div className="pequeno silencioso">{p.setor}</div>}
                        </td>
                        <td style={{ textAlign: 'center' }}>{p.pendentes}</td>
                        <td style={{ textAlign: 'center' }}>{p.emAndamento}</td>
                        <td style={{ textAlign: 'center', color: p.atrasadas ? 'var(--vermelho)' : undefined, fontWeight: p.atrasadas ? 700 : 400 }}>
                          {p.atrasadas}
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--esmeralda)' }}>{p.concluidas}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {gestor && (
        <div className="cartao">
          <div className="cartao-cabeca">
            <h2 style={{ flex: 1 }}>Documentos recentes</h2>
            <Link to="/documentos" className="btn btn-p">Enviar documento</Link>
          </div>
          <div className="cartao-corpo">
            {dados.ultimosDocumentos.length === 0 ? (
              <Vazio
                icone="&#9634;"
                titulo="Nenhum documento enviado"
                texto="Suba um playbook, uma ata ou um plano de acao. O sistema le e transforma em tarefas."
                acao={<Link to="/documentos" className="btn btn-principal">Enviar o primeiro</Link>}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {dados.ultimosDocumentos.map((d) => (
                  <Link key={d.id} to={`/documentos/${d.id}`} className="tarefa">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="tarefa-titulo truncar">{d.nome}</div>
                      <div className="tarefa-meta">
                        <span>{dataBR(d.criadoEm)}</span>
                        <span>&#9679; {d.enviadoPorNome}</span>
                        {d.status === 'processando' && <span className="etq etq-azul"><span className="girando">&#9696;</span> Lendo</span>}
                        {d.status === 'erro' && <span className="etq etq-vermelha">Falhou</span>}
                        {d.status === 'processado' && (
                          <>
                            <span className="etq etq-verde">{d.atribuidas} atribuidas</span>
                            {d.emTriagem > 0 && <span className="etq etq-ambar">{d.emTriagem} na triagem</span>}
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
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
