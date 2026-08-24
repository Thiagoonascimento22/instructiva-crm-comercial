import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Avatar } from '../components/Comuns.jsx';
import { Modal, Vazio } from '../components/Comuns.jsx';

const VAZIO = { nome: '', email: '', senha: '', papel: 'colaborador', cargo: '', setor: '', apelidos: '' };

export default function Equipe() {
  const [pessoas, setPessoas] = useState([]);
  const [editando, setEditando] = useState(null);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [mostrarInativos, setMostrarInativos] = useState(false);

  async function carregar() {
    try { setPessoas(await api.get('/usuarios')); }
    catch (e) { setErro(e.message); }
  }

  useEffect(() => { carregar(); }, []);

  async function alternarAtivo(p) {
    try {
      await api.patch(`/usuarios/${p.id}`, { ativo: p.ativo === false });
      carregar();
    } catch (e) { setErro(e.message); }
  }

  const lista = pessoas.filter((p) => mostrarInativos || p.ativo !== false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {erro && <div className="aviso aviso-erro">{erro}</div>}
      {ok && <div className="aviso aviso-ok">{ok}</div>}

      <div className="aviso aviso-info">
        O sistema procura estes nomes dentro dos documentos. Cadastre tambem os apelidos que o CEO costuma
        escrever (ex.: &ldquo;Thi&rdquo;, &ldquo;Gi&rdquo;, &ldquo;Lucas S.&rdquo;) para a tarefa ir direto para a pessoa certa.
      </div>

      <div className="linha-flex">
        <div className="pequeno silencioso" style={{ flex: 1 }}>{lista.length} pessoa(s)</div>
        <label className="linha-flex pequeno" style={{ gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={mostrarInativos} onChange={(e) => setMostrarInativos(e.target.checked)} />
          Mostrar desativados
        </label>
        <button className="btn btn-principal btn-p" onClick={() => setEditando(VAZIO)}>+ Adicionar pessoa</button>
      </div>

      <div className="cartao">
        {lista.length === 0 ? (
          <div className="cartao-corpo"><Vazio icone="&#9786;" titulo="Ninguem cadastrado" /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Pessoa</th>
                  <th>Papel</th>
                  <th>Cargo</th>
                  <th>Setor</th>
                  <th>Apelidos reconhecidos</th>
                  <th style={{ width: 150 }}></th>
                </tr>
              </thead>
              <tbody>
                {lista.map((p) => (
                  <tr key={p.id} style={p.ativo === false ? { opacity: .5 } : undefined}>
                    <td>
                      <div className="linha-flex" style={{ flexWrap: 'nowrap' }}>
                        <Avatar nome={p.nome} foto={p.foto} tam={32} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600 }}>{p.nome}</div>
                          <div className="pequeno silencioso truncar">{p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`etq ${p.papel === 'colaborador' ? 'etq-cinza' : 'etq-teal'}`}>
                        {p.papel}
                      </span>
                    </td>
                    <td className="pequeno">{p.cargo || '--'}</td>
                    <td className="pequeno">{p.setor || '--'}</td>
                    <td className="pequeno silencioso">
                      {p.apelidos?.length ? p.apelidos.join(', ') : '--'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-p" onClick={() => setEditando(p)}>Editar</button>{' '}
                      <button className="btn btn-p btn-fantasma" onClick={() => alternarAtivo(p)}>
                        {p.ativo === false ? 'Reativar' : 'Desativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editando && (
        <FormPessoa
          inicial={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={(msg) => { setEditando(null); setOk(msg); carregar(); setTimeout(() => setOk(''), 4000); }}
        />
      )}
    </div>
  );
}

function FormPessoa({ inicial, aoFechar, aoSalvar }) {
  const novo = !inicial.id;
  const [form, setForm] = useState({
    nome: inicial.nome || '',
    email: inicial.email || '',
    senha: '',
    papel: inicial.papel || 'colaborador',
    cargo: inicial.cargo || '',
    setor: inicial.setor || '',
    apelidos: Array.isArray(inicial.apelidos) ? inicial.apelidos.join(', ') : (inicial.apelidos || '')
  });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const mudar = (c) => (e) => setForm({ ...form, [c]: e.target.value });

  async function salvar() {
    if (!form.nome.trim() || !form.email.trim()) { setErro('Nome e e-mail sao obrigatorios.'); return; }
    if (novo && form.senha.length < 6) { setErro('Defina uma senha de pelo menos 6 caracteres.'); return; }
    setSalvando(true); setErro('');
    try {
      const corpo = { ...form, apelidos: form.apelidos };
      if (!novo && !form.senha) delete corpo.senha;
      if (novo) await api.post('/usuarios', corpo);
      else await api.patch(`/usuarios/${inicial.id}`, corpo);
      aoSalvar(novo ? `${form.nome} foi adicionado a equipe.` : 'Cadastro atualizado.');
    } catch (e) { setErro(e.message); setSalvando(false); }
  }

  return (
    <Modal
      titulo={novo ? 'Adicionar pessoa' : `Editar ${inicial.nome}`}
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

      <div className="grade grade-2">
        <label className="campo">
          <span className="campo-rotulo">Nome completo</span>
          <input className="entrada" value={form.nome} onChange={mudar('nome')} autoFocus />
        </label>

        <label className="campo">
          <span className="campo-rotulo">E-mail (login)</span>
          <input className="entrada" type="email" value={form.email} onChange={mudar('email')} />
        </label>

        <label className="campo">
          <span className="campo-rotulo">Papel</span>
          <select className="selecao" value={form.papel} onChange={mudar('papel')}>
            <option value="colaborador">Colaborador &mdash; ve so o que e dele</option>
            <option value="gestor">Gestor &mdash; distribui as tarefas</option>
            <option value="admin">Admin &mdash; acesso total</option>
          </select>
        </label>

        <label className="campo">
          <span className="campo-rotulo">Cargo</span>
          <input className="entrada" value={form.cargo} onChange={mudar('cargo')} placeholder="Vendedor, Suporte, Dev..." />
        </label>

        <label className="campo">
          <span className="campo-rotulo">Setor</span>
          <input className="entrada" value={form.setor} onChange={mudar('setor')} placeholder="Comercial, Suporte, Producao..." />
        </label>
      </div>

      <label className="campo">
        <span className="campo-rotulo">Apelidos reconhecidos nos documentos</span>
        <input
          className="entrada"
          value={form.apelidos}
          onChange={mudar('apelidos')}
          placeholder="Separe por virgula: Thi, Thiago N, Nascimento"
        />
        <span className="dica">
          Quando um desses aparecer no documento, a tarefa vai direto para esta pessoa.
        </span>
      </label>

      <label className="campo">
        <span className="campo-rotulo">{novo ? 'Senha inicial' : 'Nova senha (deixe em branco para manter)'}</span>
        <input className="entrada" type="text" value={form.senha} onChange={mudar('senha')} />
        <span className="dica">Passe a senha para a pessoa. Ela pode trocar em Configuracoes.</span>
      </label>
    </Modal>
  );
}
