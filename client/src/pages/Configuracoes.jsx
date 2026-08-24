import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { usarSessao } from '../App.jsx';
import CampoSenha from '../components/CampoSenha.jsx';
import { Avatar } from '../components/Comuns.jsx';

export default function Configuracoes() {
  const { usuario, setUsuario, gestor, config, setConfig } = usarSessao();
  const [pessoas, setPessoas] = useState([]);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [senhas, setSenhas] = useState({ senhaAtual: '', senhaNova: '', confirmar: '' });
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const arquivoRef = useRef(null);

  useEffect(() => {
    api.get('/usuarios').then((u) => setPessoas(u.filter((x) => x.ativo !== false))).catch(() => {});
  }, []);

  function avisar(mensagem) {
    setOk(mensagem);
    setErro('');
    setTimeout(() => setOk(''), 4000);
  }

  async function mudarConfig(campos) {
    try {
      const novo = await api.patch('/config', campos);
      setConfig(novo);
      avisar('Configuracao salva.');
    } catch (e) { setErro(e.message); }
  }

  async function trocarSenha() {
    if (senhas.senhaNova.length < 6) { setErro('A nova senha precisa de pelo menos 6 caracteres.'); return; }
    if (senhas.senhaNova !== senhas.confirmar) { setErro('As duas senhas novas nao batem.'); return; }
    try {
      await api.post('/auth/senha', { senhaAtual: senhas.senhaAtual, senhaNova: senhas.senhaNova });
      setSenhas({ senhaAtual: '', senhaNova: '', confirmar: '' });
      avisar('Senha alterada.');
    } catch (e) { setErro(e.message); }
  }

  function escolherFoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErro('Selecione um arquivo de imagem.'); return; }
    setEnviandoFoto(true);
    const img = new Image();
    const leitor = new FileReader();
    leitor.onload = () => { img.src = leitor.result; };
    leitor.onerror = () => { setErro('Nao consegui ler a imagem.'); setEnviandoFoto(false); };
    img.onload = async () => {
      // recorta no centro em um quadrado e reduz para 256px
      const L = 256;
      const lado = Math.min(img.width, img.height);
      const sx = (img.width - lado) / 2;
      const sy = (img.height - lado) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = L; canvas.height = L;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, sx, sy, lado, lado, 0, 0, L, L);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      try {
        const { usuario: u } = await api.post('/auth/foto', { foto: dataUrl });
        setUsuario(u);
        avisar('Foto atualizada.');
      } catch (err) { setErro(err.message); }
      finally { setEnviandoFoto(false); }
    };
    leitor.readAsDataURL(file);
  }

  async function removerFoto() {
    setEnviandoFoto(true);
    try {
      const { usuario: u } = await api.del('/auth/foto');
      setUsuario(u);
      avisar('Foto removida.');
    } catch (e) { setErro(e.message); }
    finally { setEnviandoFoto(false); }
  }

  const gestores = pessoas.filter((p) => p.papel === 'gestor' || p.papel === 'admin');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 720 }}>
      {erro && <div className="aviso aviso-erro">{erro}</div>}
      {ok && <div className="aviso aviso-ok">{ok}</div>}

      <div className="cartao">
        <div className="cartao-cabeca"><h2>Foto de perfil</h2></div>
        <div className="cartao-corpo">
          <div className="linha-flex" style={{ gap: 18 }}>
            <Avatar nome={usuario.nome} foto={usuario.foto} tam={84} />
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 600 }}>{usuario.nome}</div>
              <div className="pequeno silencioso" style={{ marginBottom: 12 }}>
                {usuario.cargo || usuario.papel}{usuario.setor ? ` \u00B7 ${usuario.setor}` : ''}
              </div>
              <div className="linha-flex">
                <button className="btn btn-principal btn-p" disabled={enviandoFoto} onClick={() => arquivoRef.current?.click()}>
                  {enviandoFoto ? 'Enviando...' : usuario.foto ? 'Trocar foto' : 'Enviar foto'}
                </button>
                {usuario.foto && (
                  <button className="btn btn-perigo btn-p" disabled={enviandoFoto} onClick={removerFoto}>
                    Remover
                  </button>
                )}
              </div>
              <div className="dica">JPG ou PNG. A imagem e recortada num quadrado e reduzida automaticamente.</div>
              <input ref={arquivoRef} type="file" accept="image/*" onChange={escolherFoto} style={{ display: 'none' }} />
            </div>
          </div>
        </div>
      </div>

      {gestor && (
        <div className="cartao">
          <div className="cartao-cabeca"><h2>Como as tarefas sao distribuidas</h2></div>
          <div className="cartao-corpo">
            <label className="linha-flex" style={{ alignItems: 'flex-start', cursor: 'pointer', gap: 12 }}>
              <input
                type="checkbox"
                style={{ marginTop: 3 }}
                checked={Boolean(config.validarTudo)}
                onChange={(e) => mudarConfig({ validarTudo: e.target.checked })}
              />
              <span>
                <span style={{ fontWeight: 600 }}>Passar tudo pela triagem antes</span>
                <span className="dica" style={{ display: 'block', marginTop: 3 }}>
                  Ligado: nenhuma tarefa vai direto para a equipe &mdash; voce confere e distribui tudo.
                  Desligado: quando o documento cita o nome de alguem cadastrado, a tarefa vai direto para essa pessoa
                  e so o resto cai na triagem.
                </span>
              </span>
            </label>

            <label className="campo" style={{ marginTop: 20 }}>
              <span className="campo-rotulo">Quem recebe os avisos de triagem</span>
              <select
                className="selecao"
                value={config.gestorPadraoId || ''}
                onChange={(e) => mudarConfig({ gestorPadraoId: e.target.value || null })}
              >
                <option value="">Nenhum</option>
                {gestores.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
              <span className="dica">
                Esta pessoa e avisada sempre que um documento gerar tarefas sem dono.
              </span>
            </label>

            <div className="linha-flex" style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--linha)' }}>
              <span className="pequeno silencioso" style={{ flex: 1 }}>Leitura por IA</span>
              <span className={`etq ${config.iaAtiva ? 'etq-verde' : 'etq-cinza'}`}>
                {config.iaAtiva ? `Ativa \u2014 ${config.modeloIA}` : 'Desligada (sem OPENAI_API_KEY)'}
              </span>
            </div>
            {!config.iaAtiva && (
              <p className="dica" style={{ marginTop: 8 }}>
                Sem a chave da OpenAI, o sistema extrai tarefas por regras simples de texto. A qualidade cai bastante.
                Adicione a variavel OPENAI_API_KEY no Railway para ligar.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="cartao">
        <div className="cartao-cabeca"><h2>Sua conta</h2></div>
        <div className="cartao-corpo">
          <div className="tarefa-meta" style={{ marginTop: 0, marginBottom: 18 }}>
            <span style={{ fontWeight: 600, color: 'var(--tinta)' }}>{usuario.nome}</span>
            <span>&#9679; {usuario.email}</span>
            <span className={`etq ${usuario.papel === 'colaborador' ? 'etq-cinza' : 'etq-teal'}`}>{usuario.papel}</span>
            {usuario.setor && <span>&#9679; {usuario.setor}</span>}
          </div>

          <h3 style={{ marginBottom: 12 }}>Trocar senha</h3>
          <label className="campo">
            <span className="campo-rotulo">Senha atual</span>
            <CampoSenha value={senhas.senhaAtual} onChange={(e) => setSenhas({ ...senhas, senhaAtual: e.target.value })} />
          </label>
          <div className="grade grade-2">
            <label className="campo">
              <span className="campo-rotulo">Nova senha</span>
              <CampoSenha value={senhas.senhaNova} onChange={(e) => setSenhas({ ...senhas, senhaNova: e.target.value })} />
            </label>
            <label className="campo">
              <span className="campo-rotulo">Repita a nova senha</span>
              <CampoSenha value={senhas.confirmar} onChange={(e) => setSenhas({ ...senhas, confirmar: e.target.value })} />
            </label>
          </div>
          <button className="btn btn-principal" onClick={trocarSenha}>Salvar nova senha</button>
        </div>
      </div>
    </div>
  );
}
