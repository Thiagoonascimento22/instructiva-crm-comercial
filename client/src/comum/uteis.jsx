import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

/* Camadas (modal, aviso) moram fora da árvore da página.
   Assim nenhum estilo de layout consegue empurrá-las para trás ou para fora da tela. */
let camadasAbertas = 0;

export function Camada({ children, travarFundo = false }) {
  const [alvo] = useState(() => {
    if (typeof document === 'undefined') return null;
    let el = document.getElementById('camadas');
    if (!el) {
      el = document.createElement('div');
      el.id = 'camadas';
      document.body.appendChild(el);
    }
    return el;
  });

  // Uma contagem única cuida da rolagem do fundo. Com dois modais abertos,
  // fechar um não pode destravar a página enquanto o outro continua aberto.
  useEffect(() => {
    if (!travarFundo) return;
    camadasAbertas += 1;
    document.body.classList.add('travado');
    return () => {
      camadasAbertas = Math.max(0, camadasAbertas - 1);
      if (camadasAbertas === 0) document.body.classList.remove('travado');
    };
  }, [travarFundo]);

  if (!alvo) return null;
  return createPortal(children, alvo);
}

/* ---------------- API ---------------- */
export async function api(caminho, opcoes = {}) {
  const cabecalhos = { ...(opcoes.headers || {}) };
  if (opcoes.body && !(opcoes.body instanceof FormData)) cabecalhos['Content-Type'] = 'application/json';
  const t = localStorage.getItem('admin_token');
  if (t && caminho.startsWith('/api/admin')) cabecalhos.Authorization = `Bearer ${t}`;

  const r = await fetch(caminho, {
    ...opcoes,
    headers: cabecalhos,
    body: opcoes.body instanceof FormData ? opcoes.body : opcoes.body ? JSON.stringify(opcoes.body) : undefined,
  });
  let dados = null;
  try { dados = await r.json(); } catch { dados = {}; }
  if (!r.ok) {
    if (r.status === 401 && caminho.startsWith('/api/admin')) {
      localStorage.removeItem('admin_token');
      if (!location.pathname.startsWith('/admin')) location.href = '/admin';
    }
    throw new Error(dados.erro || 'Não foi possível concluir. Tente novamente.');
  }
  return dados;
}

/* ---------------- Formatação ---------------- */
export const reais = (n) => `R$ ${Number(n || 0).toFixed(2).replace('.', ',')}`;

export const hora = (iso) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

export const dataHora = (iso) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

export function mascararTelefone(v = '') {
  const d = String(v).replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export const soDigitos = (v = '') => String(v).replace(/\D/g, '');

/* ---------------- Ícones (inline, sem dependência externa) ---------------- */
export const Ico = {
  Carrinho: (p) => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h3l2.6 12.4a2 2 0 0 0 2 1.6h8a2 2 0 0 0 2-1.6L21.5 7H6" /></svg>,
  Check: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 6 9 17l-5-5" /></svg>,
  Voltar: (p) => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 18l-6-6 6-6" /></svg>,
  Fechar: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>,
  Enviar: (p) => <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>,
  Local: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="2.6" /></svg>,
  Relogio: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  Moto: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="5.5" cy="17" r="3" /><circle cx="18.5" cy="17" r="3" /><path d="M8.5 17h7l-3-7h-4M12 6h4l2 4" /></svg>,
  Chat: (p) => <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.8-.8L3 21l1.9-5a8.4 8.4 0 0 1-.9-3.8 8.4 8.4 0 0 1 8.5-8.4h.5a8.4 8.4 0 0 1 8 8v.2z" /></svg>,
  Copiar: (p) => <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="9" y="9" width="12" height="12" rx="2.5" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
  Prato: (p) => <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /></svg>,
  Copo: (p) => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 4h12l-1.4 15.2a2 2 0 0 1-2 1.8H9.4a2 2 0 0 1-2-1.8z" /><path d="M6.6 10h10.8" /></svg>,
  Sacola: (p) => <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 8h14l-1 12H6z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>,
  Sol: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" /></svg>,
  Lua: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1z" /></svg>,
  Lupa: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
};

/* ---------------- Aviso flutuante ---------------- */
const AvisoCtx = createContext(() => {});
export const usarAviso = () => useContext(AvisoCtx);

export function ProvedorAviso({ children }) {
  const [aviso, setAviso] = useState(null);
  const mostrar = useCallback((texto, tipo = 'ok') => {
    setAviso({ texto, tipo });
    setTimeout(() => setAviso(null), 3200);
  }, []);
  return (
    <AvisoCtx.Provider value={mostrar}>
      {children}
      {aviso && (
        <Camada>
          <div className={`nota-flutuante ${aviso.tipo === 'erro' ? 'erro' : ''}`}>{aviso.texto}</div>
        </Camada>
      )}
    </AvisoCtx.Provider>
  );
}

/* ---------------- Carrinho ---------------- */
const CarrinhoCtx = createContext(null);
export const usarCarrinho = () => useContext(CarrinhoCtx);
const CHAVE = 'sabor_brasil_carrinho';

export function ProvedorCarrinho({ children }) {
  const [itens, setItens] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CHAVE) || '[]'); } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(CHAVE, JSON.stringify(itens)); } catch {}
  }, [itens]);

  const adicionar = (item) => setItens((a) => [...a, { ...item, chave: Math.random().toString(36).slice(2) }]);
  const remover = (chave) => setItens((a) => a.filter((i) => i.chave !== chave));
  const alterarQtd = (chave, qtd) =>
    setItens((a) => (qtd <= 0 ? a.filter((i) => i.chave !== chave) : a.map((i) => (i.chave === chave ? { ...i, qtd } : i))));
  const limpar = () => setItens([]);

  const total = itens.reduce((s, i) => s + i.precoUnit * i.qtd, 0);
  const quantidade = itens.reduce((s, i) => s + i.qtd, 0);

  return (
    <CarrinhoCtx.Provider value={{ itens, adicionar, remover, alterarQtd, limpar, total, quantidade }}>
      {children}
    </CarrinhoCtx.Provider>
  );
}

/* ---------------- Claro / escuro ---------------- */
const CHAVE_TEMA = 'sabor_brasil_tema';

export function usarTema() {
  const [tema, setTema] = useState(() => {
    const salvo = localStorage.getItem(CHAVE_TEMA);
    // a loja abre sempre no claro; o escuro é uma escolha de quem visita
    return salvo === 'escuro' ? 'escuro' : 'claro';
  });

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    localStorage.setItem(CHAVE_TEMA, tema);
    const cor = tema === 'escuro' ? '#0D1310' : '#FFFFFF';
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', cor);
  }, [tema]);

  return [tema, () => setTema((t) => (t === 'escuro' ? 'claro' : 'escuro'))];
}

export function BotaoTema() {
  const [tema, alternar] = usarTema();
  return (
    <button
      className="troca-tema"
      onClick={alternar}
      aria-label={tema === 'escuro' ? 'Usar tema claro' : 'Usar tema escuro'}
      title={tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}
    >
      {tema === 'escuro' ? <Ico.Sol /> : <Ico.Lua />}
    </button>
  );
}

/* ---------------- Tema da loja ---------------- */
export function aplicarTema(config) {
  if (!config) return;
  // no escuro mantemos a paleta desenhada para o contraste ficar legível
  if (document.documentElement.dataset.tema !== 'escuro') {
    const raiz = document.documentElement;
    if (config.cor) raiz.style.setProperty('--verde', config.cor);
    if (config.corSecundaria) raiz.style.setProperty('--ouro', config.corSecundaria);
  }
  if (config.nome) document.title = `${config.nome} — Peça pelo cardápio`;
}
