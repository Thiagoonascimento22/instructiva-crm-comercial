import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { api, getToken, setToken } from "./api.js";
import { LOGO_FULL, LOGO_LIGHT } from "./logos.js";

function Portal({ children }) {
  return createPortal(children, document.body);
}

/* ============================ ÍCONES ============================ */
const I = {
  sun: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/></svg>),
  moon: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>),
  eye: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>),
  pipe: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="6" height="14" rx="1"/><rect x="9.5" y="3" width="6" height="9" rx="1"/><rect x="16" y="3" width="5" height="6" rx="1"/></svg>
  ),
  team: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  cog: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  ),
  plus: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>),
  wa: (p) => (<svg {...p} viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.02c-1.52 0-3-.41-4.29-1.18l-.31-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.39c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.24-8.24 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.98-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.16 1.75 2.67 4.25 3.74.59.26 1.06.41 1.42.52.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z"/></svg>),
  x: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>),
  trash: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>),
  out: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>),
  empty: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>),
  send: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>),
  search: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>),
  chat: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>),
  power: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v10M18.4 6.6a9 9 0 1 1-12.8 0"/></svg>),
  refresh: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></svg>),
  link: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5"/></svg>),
  chevron: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>),
  copy: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>),
  key: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.778-7.778zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>),
  dash: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6" rx="1"/><rect x="12" y="7" width="3" height="10" rx="1"/><rect x="17" y="13" width="3" height="4" rx="1"/></svg>),
  medal: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="15" r="6"/><path d="M9 9 6.5 2M15 9l2.5-7M9.5 2h5"/></svg>),
  target: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></svg>),
  cash: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></svg>),
  check: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.8 10A10 10 0 1 1 17 3.3"/><path d="m9 11 3 3L22 4"/></svg>),
  trend: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/></svg>),
  users: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>),
  spark: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>),
  estrela: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 18.9 6.1 21l1.2-6.5L2.5 9.9l6.6-.9z"/></svg>),
  suporte: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.6"/><path d="M5.6 5.6l3.9 3.9M14.5 14.5l3.9 3.9M18.4 5.6l-3.9 3.9M9.5 14.5l-3.9 3.9"/></svg>),
  clip: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21.4 11.05 12.25 20.2a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.49-8.49"/></svg>),
  mic: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4"/></svg>),
  arquivar: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/></svg>),
  funnel: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h18l-7 8v7l-4-2v-5z"/></svg>),
  clock: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>),
  lock: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>),
  calendar: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="4.5" width="17" height="16" rx="2"/><path d="M3.5 9h17M8 3v3M16 3v3"/></svg>),
  download: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11m0 0l-4-4m4 4l4-4M4 19h16"/></svg>),
  image: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M4 17l5-4 4 3 3-2 4 3"/></svg>),
  play: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 5l12 7-12 7z"/></svg>),
  megaphone: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10v4a1 1 0 0 0 1 1h2l8 4V5L7 9H5a1 1 0 0 0-1 1zM18 9a3 3 0 0 1 0 6"/></svg>),
  alert: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l9 16H3z"/><path d="M12 9v5M12 17.5v.5"/></svg>),
  gauge: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20a8 8 0 1 1 16 0"/><path d="M12 20l4-6"/></svg>),
  user: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>),
  list: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>),
  seta: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>),
  painelLado: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/></svg>),
  olho: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>),
  olhoFechado: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.6 5.1A10.5 10.5 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-2.4 3.3M6.2 6.2C3.6 7.9 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.8-1.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3 3l18 18"/></svg>),
  brilho: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c.5 4 2 5.5 6 6-4 .5-5.5 2-6 6-.5-4-2-5.5-6-6 4-.5 5.5-2 6-6z"/><path d="M19 15c.2 1.6.9 2.3 2.5 2.5-1.6.2-2.3.9-2.5 2.5-.2-1.6-.9-2.3-2.5-2.5 1.6-.2 2.3-.9 2.5-2.5z"/></svg>),
  celular: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2.5"/><path d="M11 18h2"/></svg>),
  repetir: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>),
  raio: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9z"/></svg>),
  fone: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>),
  nota: (p) => (<svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>),
};

/* ============================ HELPERS ============================ */
function infoTarefa(t) {
  if (!t || t.feito || !t.quando) return null;
  const d = new Date(t.quando);
  const ehHoje = d.toDateString() === new Date().toDateString();
  const venceu = t.quando < Date.now();
  const hhmm = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const data = ehHoje ? "hoje " + hhmm : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " + hhmm;
  return { texto: t.texto || "", data, classe: venceu ? "venceu" : ehHoje ? "hoje" : "futuro" };
}
// timestamp -> valor pro input datetime-local (hora local)
function tsParaInput(ts) {
  if (!ts) return "";
  const d = new Date(ts), p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function iniciais(nome) {
  const p = (nome || "?").trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
}
// Avatar reutilizável: mostra a foto do usuário se tiver, senão as iniciais
function Avatar({ nome, foto, size = 28 }) {
  const s = { width: size, height: size, minWidth: size, fontSize: Math.round(size * 0.4) };
  if (foto) return <img className="uav" style={s} src={foto} alt={nome || ""} />;
  return <span className="uav uav-ini" style={s}>{iniciais(nome || "?")}</span>;
}
// Redimensiona a imagem no navegador antes de enviar (mantém o banco leve)
function redimensionarImg(file, max) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * escala), h = Math.round(img.height * escala);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("erro")); };
    img.src = url;
  });
}
const soDigitos = (s) => (s || "").replace(/\D/g, "");
// compara dois telefones ignorando o DDI 55 (o Evolution guarda com 55, o lead às vezes sem)
function numIgual(a, b) {
  const norm = (x) => { x = soDigitos(x); return x.length > 11 && x.startsWith("55") ? x.slice(2) : x; };
  return norm(a) === norm(b);
}

// Parser de CSV simples: lida com aspas, separador ; ou , e BOM
function parseCSV(texto) {
  texto = String(texto || "").replace(/^\uFEFF/, "");
  const linhas = texto.split(/\r\n|\n|\r/).filter((l) => l.trim() !== "");
  if (!linhas.length) return { headers: [], rows: [] };
  const sep = (linhas[0].match(/;/g) || []).length >= (linhas[0].match(/,/g) || []).length ? ";" : ",";
  const parseLinha = (linha) => {
    const out = []; let cur = "", dentro = false;
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i];
      if (c === '"') { if (dentro && linha[i + 1] === '"') { cur += '"'; i++; } else dentro = !dentro; }
      else if (c === sep && !dentro) { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  return { headers: parseLinha(linhas[0]).map((h) => h.toLowerCase()), rows: linhas.slice(1).map(parseLinha) };
}

// Lembrete no topo: avisa o vendedor que ele pode adicionar a foto de perfil (e já deixa adicionar)
function LembreteFoto({ user, setUser, showToast }) {
  const [dispensado, setDispensado] = useState(false);
  const ref = useRef(null);
  if (user.foto || dispensado) return null;
  async function escolher(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const dataUrl = await redimensionarImg(file, 160);
      const u = await api.updateMe({ foto: dataUrl });
      setUser((prev) => ({ ...prev, ...u }));
      showToast("✓ Foto adicionada!");
    } catch (err) { showToast("✗ Não deu pra carregar a foto"); }
  }
  return (
    <div className="lembrete-foto">
      <div className="lembrete-foto-ic"><I.image className="ico" /></div>
      <div className="lembrete-foto-txt">
        <b>Novidade: você já pode colocar sua foto de perfil</b>
        <span>Ela aparece nos seus leads no Pipeline. Leva 5 segundos.</span>
      </div>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={escolher} />
      <button className="btn btn-on btn-sm" onClick={() => ref.current && ref.current.click()}>Adicionar foto</button>
      <button className="lembrete-foto-x" onClick={() => setDispensado(true)} title="Agora não" aria-label="Agora não"><I.x className="ico" /></button>
    </div>
  );
}
function horaCurta(ts) {
  if (!ts) return "";
  const d = new Date(ts), now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const ontem = new Date(now); ontem.setDate(now.getDate() - 1);
  if (d.toDateString() === ontem.toDateString()) return "ontem";
  const mesmoAno = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("pt-BR", mesmoAno ? { day: "2-digit", month: "2-digit" } : { day: "2-digit", month: "2-digit", year: "2-digit" });
}
function inicioDoDia(t) { const x = new Date(t); x.setHours(0, 0, 0, 0); return x; }
function dentroPeriodo(criadoEm, periodo, cde, cate) {
  const t = typeof criadoEm === "number" ? criadoEm : new Date(criadoEm).getTime();
  if (!t) return true;
  const agora = new Date();
  if (periodo === "hoje") return t >= inicioDoDia(agora).getTime();
  if (periodo === "semana") { const d = new Date(agora); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return t >= inicioDoDia(d).getTime(); }
  if (periodo === "mes") return t >= inicioDoDia(new Date(agora.getFullYear(), agora.getMonth(), 1)).getTime();
  if (periodo === "custom") {
    const ini = cde ? inicioDoDia(new Date(cde + "T00:00:00")).getTime() : 0;
    const fim = cate ? inicioDoDia(new Date(cate + "T00:00:00")).getTime() + 86400000 - 1 : Infinity;
    return t >= ini && t <= fim;
  }
  return true;
}
const PERIODOS = [["tudo", "Tudo"], ["hoje", "Hoje"], ["semana", "Essa semana"], ["mes", "Esse mês"], ["custom", "Personalizado"]];
function fmtEspera(seg) {
  seg = Math.max(0, Math.round(seg || 0));
  if (seg < 60) return seg + "s";
  if (seg < 3600) return Math.floor(seg / 60) + "min";
  if (seg < 86400) { const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60); return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`; }
  return Math.floor(seg / 86400) + "d";
}

/* ============================ APP ============================ */
export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);
  const [modulos, setModulos] = useState(null);
  const [ehDono, setEhDono] = useState(false);
  const [acessoVend, setAcessoVend] = useState({});
  const [aviso, setAviso] = useState(null);
  const carregarModulos = () => api.getModulos().then((r) => { setModulos(r.modulos); setEhDono(!!r.dono); }).catch(() => {});
  const carregarAcessoVend = () => api.ofAcessoVend().then((r) => setAcessoVend(r.acessoVend || {})).catch(() => {});
  useEffect(() => { if (user) api.aviso().then(setAviso).catch(() => {}); }, [user]);
  const [view, setView] = useState(() => {
    try { return localStorage.getItem("instructiva_view") || "whatsapp"; } catch (e) { return "whatsapp"; }
  });
  useEffect(() => { try { localStorage.setItem("instructiva_view", view); } catch (e) {} }, [view]);
  const [waTarget, setWaTarget] = useState(null);
  const [disparoPreset, setDisparoPreset] = useState(null); // leads levados do Pipeline pro Disparo
  const [crmAbrir, setCrmAbrir] = useState(null); // v2.1: lead pra abrir direto no Pipeline (vindo da ficha ou da busca)
  const [minhasSol, setMinhasSol] = useState([]);
  const carregarMinhasSol = () => { api.solicitacoes().then(setMinhasSol).catch(() => {}); };
  const [toast, setToast] = useState(null);
  const toastT = useRef(null);
  const [theme, setTheme] = useState(() =>
    (typeof document !== "undefined" && document.documentElement.getAttribute("data-theme")) || "light"
  );
  function toggleTheme() {
    setTheme((t) => {
      const n = t === "dark" ? "light" : "dark";
      if (typeof document !== "undefined") document.documentElement.setAttribute("data-theme", n);
      try { localStorage.setItem("instructiva_theme", n); } catch (e) {}
      return n;
    });
  }

  // v2.2: menu lateral recolhível (só ícones) — lembra a escolha neste navegador
  const [menuRecolhido, setMenuRecolhido] = useState(() => { try { return localStorage.getItem("instructiva_menu") === "recolhido"; } catch (e) { return false; } });
  useEffect(() => { try { localStorage.setItem("instructiva_menu", menuRecolhido ? "recolhido" : "aberto"); } catch (e) {} }, [menuRecolhido]);

  // v2.1: busca rápida — Ctrl+K (⌘K no Mac) abre de qualquer tela
  const [buscaAberta, setBuscaAberta] = useState(false);
  useEffect(() => {
    if (!user) return;
    const aoTeclar = (e) => {
      if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === "k") { e.preventDefault(); setBuscaAberta((v) => !v); }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [user]);
  const ehMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");

  // qual unidade é este sistema (Toledo, Jesuítas...) — vem da variável UNIDADE do servidor
  const [unidade, setUnidade] = useState("");
  useEffect(() => {
    fetch("/api/versao").then((r) => r.json()).then((j) => setUnidade(String(j.unidade || ""))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!getToken()) { setBooting(false); return; }
    api.me().then(setUser).catch(() => setToken("")).finally(() => setBooting(false));
  }, []);
  useEffect(() => {
    if (!user) return;
    carregarModulos(); carregarAcessoVend();
    // Reconsulta ao vivo: quando o dono libera/tira um acesso, aparece pra todo mundo
    // em poucos segundos, SEM precisar deslogar. Também atualiza ao voltar pra aba.
    const t = setInterval(() => { if (document.hidden) return; carregarModulos(); carregarAcessoVend(); }, 15000);
    const aoVoltar = () => { if (!document.hidden) { carregarModulos(); carregarAcessoVend(); } };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", aoVoltar); };
  }, [user]);

  const vistaInicial = useRef(false);
  useEffect(() => {
    if (!user || vistaInicial.current) return;
    vistaInicial.current = true;
    // valida a aba restaurada: se não for permitida pro perfil, cai numa aba segura
    const porRole = {
      gerente: ["whatsapp", "disparo", "numeros", "crm", "vendas", "desempenho", "analiseia", "solicitacoes", "config"],
      suporte: ["solicitacoes", "config"],
    };
    const permitidas = porRole[user.role] || ["whatsapp", "disparo", "minhasSolicitacoes", "config", "crm", "vendas", "desempenho", "analiseia"];
    if (!permitidas.includes(view)) setView(user.role === "suporte" ? "solicitacoes" : "whatsapp");
  }, [user]);

  useEffect(() => {
    if (!user || user.role === "gerente" || user.role === "suporte") return;
    carregarMinhasSol();
    const t = setInterval(() => { if (!document.hidden) carregarMinhasSol(); }, 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [user]);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), 2600);
  }
  function logout() {
    setToken("");
    setUser(null);
    setView("whatsapp");
  }

  if (booting) return <div className="login-wrap"><div className="spin" /></div>;
  if (!user) return <Login onDone={(u) => setUser(u)} unidade={unidade} />;
  if (user.precisaOnboarding) return <Onboarding user={user} onDone={setUser} unidade={unidade} />;

  const isGer = user.role === "gerente";
  const isSuporte = user.role === "suporte";
  const isVend = !isGer && !isSuporte;
  const ehLider = isVend && Array.isArray(user.lideradosIds) && user.lideradosIds.length > 0; // vendedor que lidera outros
  const mod = (k) => !modulos || modulos[k] !== false; // módulo ligado? (default ligado enquanto carrega)
  const vendPode = (k) => !!(acessoVend && acessoVend[k] === true); // dono liberou essa tela pro vendedor?
  const badgeSol = minhasSol.filter((s) => s.status === "resolvida" && !s.resolvidoVisto).length;
  const titulos = {
    whatsapp: { t: "Caixa de entrada", s: "Suas conversas — não oficial e oficial, num só lugar" },
    disparo: { t: "Disparo", s: "Disparo em massa pelo número oficial" },
    templates: { t: "Templates", s: "Modelos de mensagem aprovados pela Meta" },
    numeros: { t: "Números", s: "Números oficiais conectados à sua conta Meta" },
    analiseia: { t: "Análise IA", s: "A IA lê as conversas e aponta o que está bom, o que melhorar e alertas" },
    crm: { t: "Pipeline", s: "Funil de leads — arraste entre as etapas, atribua e acompanhe" },
    vendas: { t: "Vendas", s: "Metas, ranking e todas as vendas do time" },
    desempenho: { t: "Desempenho", s: "Métricas, cargo, faixa e progresso de cada vendedor" },
    sistema: { t: "Sistema", s: "Controle dos módulos entregues — visível só pra você (dono)" },
    minhasSolicitacoes: { t: "Minhas solicitações", s: "Acompanhe seus pedidos ao suporte" },
    solicitacoes: { t: "Solicitações de suporte", s: "Pedidos de ajuda dos vendedores e análise" },
    equipe: { t: "Equipe & Acessos", s: "Gerencie os atendentes e seus acessos" },
    config: { t: "Configurações", s: "Seus dados de acesso" },
  };

  // menu em grupos (só aparece o grupo que tiver pelo menos uma aba liberada pro perfil)
  const grupos = [
    { t: "Comercial", itens: [
      (isGer || vendPode("crm")) && mod("crm") && { k: "crm", ic: I.pipe, label: "Pipeline" },
      (isGer || vendPode("vendas")) && mod("vendas") && { k: "vendas", ic: I.trend, label: "Vendas" },
      (isGer || (isVend && !(acessoVend && acessoVend.desempenhoOculto))) && mod("desempenho") && { k: "desempenho", ic: I.medal, label: "Desempenho" },
    ] },
    { t: "Atendimento", itens: [
      !isSuporte && mod("caixa") && { k: "whatsapp", ic: I.wa, label: "Caixa de entrada" },
      (isGer || isVend) && mod("disparo") && { k: "disparo", ic: I.send, label: "Disparo" },
      (isGer || isVend) && mod("caixa") && { k: "analiseia", ic: I.brilho, label: "Análise IA" },
    ] },
    { t: "Gestão", itens: [
      isGer && mod("numeros") && { k: "numeros", ic: I.celular, label: "Números" },
      !isGer && !isSuporte && { k: "minhasSolicitacoes", ic: I.suporte, label: "Minhas solicitações", badge: badgeSol },
      (isGer || isSuporte) && mod("solicitacoes") && { k: "solicitacoes", ic: I.suporte, label: "Solicitações" },
      { k: "config", ic: I.cog, label: "Configurações" },
    ] },
  ].map((g) => ({ ...g, itens: g.itens.filter(Boolean) })).filter((g) => g.itens.length);
  const grupoAtual = (grupos.find((g) => g.itens.some((it) => it.k === view)) || {}).t || "";
  const tit = titulos[view] || { t: "", s: "" };
  const nomeUnidade = unidade && unidade !== "nao-configurada"
    ? ({ toledo: "Toledo", jesuitas: "Jesuítas" }[unidade] || unidade.charAt(0).toUpperCase() + unidade.slice(1))
    : "";

  return (
    <div className={"shell" + (menuRecolhido ? " menu-recolhido" : "")}>
      <RecadoDoDia />
      <aside className="sidebar">
        <div className="side-topo">
          <div className="brand"><img src={theme === "dark" ? LOGO_LIGHT : LOGO_FULL} alt="Instructiva" /></div>
          <button type="button" className="side-recolher" onClick={() => setMenuRecolhido((v) => !v)} title={menuRecolhido ? "Abrir menu" : "Recolher menu"} aria-label={menuRecolhido ? "Abrir menu" : "Recolher menu"}>
            <I.painelLado className="ico" />
          </button>
        </div>
        <div className="brand-unidade">
          {nomeUnidade && (
            <div className="unidade-chip">
              <span className="unidade-dot" />
              <div>
                <div className="unidade-nm">Unidade {nomeUnidade}</div>
                <div className="unidade-s">Sistema comercial</div>
              </div>
            </div>
          )}
        </div>
        <button type="button" className="side-busca" onClick={() => setBuscaAberta(true)}>
          <I.search className="ico" /><span>Buscar</span><kbd>{ehMac ? "⌘K" : "Ctrl K"}</kbd>
        </button>
        <nav className="nav" aria-label="Menu principal">
          {grupos.map((g) => (
            <div key={g.t} className="nav-grupo">
              <div className="nav-grupo-t">{g.t}</div>
              {g.itens.map((it) => <NavBtn key={it.k} ic={it.ic} label={it.label} badge={it.badge} active={view === it.k} onClick={() => setView(it.k)} />)}
            </div>
          ))}
        </nav>
        <div className="side-foot">
          <div className="tema-seg" role="group" aria-label="Tema">
            <button type="button" className={theme !== "dark" ? "on" : ""} onClick={() => theme === "dark" && toggleTheme()} title="Tema claro"><I.sun className="ico" /><span>Claro</span></button>
            <button type="button" className={theme === "dark" ? "on" : ""} onClick={() => theme !== "dark" && toggleTheme()} title="Tema escuro"><I.moon className="ico" /><span>Escuro</span></button>
          </div>
          <div className="side-user">
            <Avatar nome={user.nome} foto={user.foto} size={36} />
            <div style={{ minWidth: 0 }}>
              <div className="nm">{user.nome}</div>
              <div className="rl">{isGer ? "Gerente comercial" : isSuporte ? "Suporte" : "Vendedor"}</div>
            </div>
            <button className="side-sair" onClick={logout} title="Sair" aria-label="Sair"><I.out className="ico" /></button>
          </div>
          <div className="side-versao">v2.2</div>
        </div>
      </aside>

      <main className="main">
        {aviso && aviso.ativo && (
          <div className="aviso-manut">
            <span className="aviso-ic">⚠</span>
            <span className="aviso-txt">{aviso.texto}</span>
            {isGer && (
              <button className="aviso-off" title="Tirar este aviso"
                onClick={async () => { try { const a = await api.salvarAviso({ ativo: false }); setAviso(a); } catch (e) { showToast(e.message); } }}>
                tirar aviso
              </button>
            )}
          </div>
        )}
        <div className="topbar">
          <div>
            {grupoAtual && <div className="crumb">{grupoAtual}</div>}
            <div className="greet">{tit.t}</div>
            <div className="sub">{tit.s}</div>
          </div>
        </div>
        <div className={"content" + (view === "whatsapp" ? " cheia" : "")}>
          {view !== "whatsapp" && <LembreteFoto user={user} setUser={setUser} showToast={showToast} />}
          {view === "whatsapp" && !isSuporte && mod("caixa") && <WhatsApp user={user} showToast={showToast} target={waTarget} onTargetUsed={() => setWaTarget(null)} recarregarSol={carregarMinhasSol} onAbrirLead={(isGer || vendPode("crm")) && mod("crm") ? (id) => { setCrmAbrir(id); setView("crm"); } : null} />}
          {view === "disparo" && (isGer || isVend) && mod("disparo") && <OficialDisparo isGer={isGer} showToast={showToast} preset={disparoPreset} onPresetUsado={() => setDisparoPreset(null)} />}
          {view === "numeros" && isGer && mod("numeros") && <OficialNumeros showToast={showToast} />}
          {view === "vendas" && (isGer || vendPode("vendas")) && mod("vendas") && <PainelVendas showToast={showToast} isGer={isGer} ehLider={ehLider} />}
          {view === "crm" && (isGer || vendPode("crm")) && mod("crm") && <OficialCRM showToast={showToast} isGer={isGer} abrirLeadId={crmAbrir} onLeadAberto={() => setCrmAbrir(null)} onAbrirWhats={(tel, canal, nome) => { setWaTarget({ numero: tel, canal, nome }); setView("whatsapp"); }} onDisparar={(preset) => { setDisparoPreset(preset); setView("disparo"); }} />}
          {view === "desempenho" && (isGer || (isVend && !(acessoVend && acessoVend.desempenhoOculto))) && mod("desempenho") && <Desempenho showToast={showToast} isGer={isGer} ehLider={ehLider} />}
          {view === "analiseia" && (isGer || isVend) && mod("caixa") && <AnaliseIAVendedor showToast={showToast} isGer={isGer} />}
          {view === "minhasSolicitacoes" && !isGer && !isSuporte && <PaginaMinhasSolicitacoes itens={minhasSol} recarregar={carregarMinhasSol} showToast={showToast} />}
          {view === "solicitacoes" && (isGer || isSuporte) && <PaginaSolicitacoes showToast={showToast} readonly={isGer} />}
          {view === "config" && <Config user={user} setUser={setUser} showToast={showToast} isGer={isGer} ehDono={ehDono} modulos={modulos} onModulosSalvo={carregarModulos} />}
        </div>
      </main>

      {buscaAberta && (
        <BuscaRapida
          telas={grupos.flatMap((g) => g.itens.map((it) => ({ ...it, grupo: g.t })))}
          podeCRM={(isGer || vendPode("crm")) && mod("crm")}
          podeCaixa={!isSuporte && mod("caixa")}
          onClose={() => setBuscaAberta(false)}
          onIrTela={(k) => setView(k)}
          onAbrirLead={(id) => { setCrmAbrir(id); setView("crm"); }}
          onAbrirConversa={(t) => { setWaTarget(t); setView("whatsapp"); }}
        />
      )}
      {toast && (() => {
        // v2.1: aviso com ícone e cor (✓ deu certo, ✗ deu errado, resto = informação)
        const txt = String(toast);
        const tipo = /^\s*✓/.test(txt) ? "ok" : /^\s*(✗|⚠)/.test(txt) ? "erro" : "info";
        const limpo = txt.replace(/^\s*(✓|✗|⚠️?)\s*/, "");
        const Ico = tipo === "ok" ? I.check : tipo === "erro" ? I.alert : I.brilho;
        return <div className={"toast toast-" + tipo} role="status"><span className="toast-ic"><Ico className="ico" /></span><span>{limpo}</span></div>;
      })()}
    </div>
  );
}

/* ============================ BUSCA RÁPIDA — Ctrl+K (v2.1) ============================ */
// Acha qualquer lead, conversa ou tela digitando um pedaço do nome ou do telefone.
const semAcento = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
function BuscaRapida({ telas, podeCRM, podeCaixa, onClose, onIrTela, onAbrirLead, onAbrirConversa }) {
  const [q, setQ] = useState("");
  const [leads, setLeads] = useState(null);
  const [etapas, setEtapas] = useState([]);
  const [conversas, setConversas] = useState([]);
  const [buscandoConv, setBuscandoConv] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const inputRef = useRef(null);
  const listaRef = useRef(null);

  useEffect(() => { inputRef.current && inputRef.current.focus(); }, []);
  useEffect(() => {
    if (!podeCRM) { setLeads([]); return; }
    api.ofCRM().then((d) => { setLeads(d.leads || []); setEtapas(d.etapas || []); }).catch(() => setLeads([]));
  }, [podeCRM]);
  // conversas: busca no servidor (com uma pausa curta enquanto a pessoa digita)
  useEffect(() => {
    const termo = q.trim();
    if (!podeCaixa || termo.length < 2) { setConversas([]); return; }
    setBuscandoConv(true);
    const t = setTimeout(async () => {
      const lista = (r) => (Array.isArray(r) ? r : (r && (r.chats || r.conversas)) || []);
      const [of, evo] = await Promise.all([
        api.ofChats(termo).then(lista).catch(() => []),
        api.waChats(undefined, termo).then(lista).catch(() => []),
      ]);
      const vistos = new Set();
      const juntas = [...of.map((c) => ({ ...c, canal: "oficial" })), ...evo.map((c) => ({ ...c, canal: "evolution" }))]
        .filter((c) => { const k = c.canal + (c.numero || c.id); if (vistos.has(k)) return false; vistos.add(k); return true; })
        .slice(0, 6);
      setConversas(juntas); setBuscandoConv(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q, podeCaixa]);

  const termo = semAcento(q.trim());
  const dig = q.replace(/\D/g, "");
  const etapaDe = (k) => etapas.find((e) => e.k === k);
  const achadosTelas = telas.filter((t) => !termo || semAcento(t.label).includes(termo)).slice(0, termo ? 4 : 9);
  const achadosLeads = !termo ? [] : (leads || []).filter((l) =>
    semAcento(l.nome).includes(termo) || (dig.length >= 3 && String(l.telefone || "").replace(/\D/g, "").includes(dig)) ||
    semAcento(l.curso).includes(termo) || (l.tags || []).some((t) => semAcento(t).includes(termo))
  ).slice(0, 6);
  const itens = [
    ...achadosLeads.map((l) => ({ tipo: "lead", id: "l" + l.id, l })),
    ...conversas.map((c) => ({ tipo: "conv", id: "c" + c.canal + c.id, c })),
    ...achadosTelas.map((t) => ({ tipo: "tela", id: "t" + t.k, t })),
  ];
  useEffect(() => { setAtivo(0); }, [q, conversas.length, leads && leads.length]);
  useEffect(() => {
    const el = listaRef.current && listaRef.current.querySelector('[data-ativo="1"]');
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [ativo]);

  function escolher(it) {
    if (!it) return;
    if (it.tipo === "lead") onAbrirLead(it.l.id);
    else if (it.tipo === "conv") onAbrirConversa({ numero: it.c.numero, canal: it.c.canal, nome: it.c.nome });
    else onIrTela(it.t.k);
    onClose();
  }
  function teclas(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setAtivo((a) => Math.min(itens.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAtivo((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); escolher(itens[ativo]); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  }
  let idx = -1;
  const linha = (it, conteudo) => { idx++; const meu = idx; return (
    <button type="button" key={it.id} className={"busca-item" + (meu === ativo ? " on" : "")} data-ativo={meu === ativo ? "1" : "0"}
      onMouseMove={() => setAtivo(meu)} onClick={() => escolher(it)}>{conteudo}</button>
  ); };

  return (
    <Portal>
      <div className="busca-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className="busca-caixa" role="dialog" aria-label="Busca rápida">
          <div className="busca-campo">
            <I.search className="ico" />
            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={teclas}
              placeholder={podeCRM ? "Buscar lead, conversa ou tela…" : "Buscar conversa ou tela…"} aria-label="Buscar" />
            <kbd>Esc</kbd>
          </div>
          <div className="busca-lista" ref={listaRef}>
            {achadosLeads.length > 0 && <div className="busca-grupo">Leads</div>}
            {achadosLeads.map((l) => {
              const et = etapaDe(l.etapa);
              return linha({ tipo: "lead", id: "l" + l.id, l }, <>
                <span className="busca-av">{iniciais(l.nome)}</span>
                <span className="busca-txt"><b>{l.nome}</b><small>{l.telefone}{l.curso ? " · " + l.curso : ""}</small></span>
                {et && <span className="busca-etapa" style={{ "--c": et.cor }}><i />{et.lb}</span>}
                {l.vendedorNome && <span className="busca-dono">{l.vendedorNome.split(" ")[0]}</span>}
              </>);
            })}
            {(conversas.length > 0 || buscandoConv) && <div className="busca-grupo">Conversas {buscandoConv && <span className="spin" style={{ width: 12, height: 12, marginLeft: 6 }} />}</div>}
            {conversas.map((c) => linha({ tipo: "conv", id: "c" + c.canal + c.id, c }, <>
              <span className="busca-av conv"><I.wa className="ico" /></span>
              <span className="busca-txt"><b>{c.nome || c.numero}</b><small>{c.numero} · {c.canal === "oficial" ? "Oficial" : "Não oficial"}{c.vendedorNome ? " · " + c.vendedorNome : ""}</small></span>
            </>))}
            {achadosTelas.length > 0 && <div className="busca-grupo">{termo ? "Telas" : "Ir para"}</div>}
            {achadosTelas.map((t) => linha({ tipo: "tela", id: "t" + t.k, t }, <>
              <span className="busca-av tela"><t.ic className="ico" /></span>
              <span className="busca-txt"><b>{t.label}</b><small>{t.grupo}</small></span>
            </>))}
            {termo && itens.length === 0 && !buscandoConv && (
              <div className="busca-vazio">Nada encontrado para “{q.trim()}”. Tente outro pedaço do nome ou os últimos dígitos do telefone.</div>
            )}
            {podeCRM && leads === null && termo && <div className="busca-vazio">Carregando leads…</div>}
          </div>
          <div className="busca-rodape"><span><kbd>↑</kbd><kbd>↓</kbd> navegar</span><span><kbd>Enter</kbd> abrir</span><span><kbd>Esc</kbd> fechar</span></div>
        </div>
      </div>
    </Portal>
  );
}

function NavBtn({ ic: Ico, label, active, onClick, badge }) {
  return (
    <button className={active ? "active" : ""} onClick={onClick} title={label}>
      <Ico className="ico" />
      <span>{label}</span>
      {badge > 0 && <span className="nav-badge">{badge}</span>}
    </button>
  );
}

/* ============================ LOGIN (v2.2) ============================ */
// Tela inteira: a marca de um lado (sem caixa atrás da logo) e o formulário do outro.
function TelaAcesso({ unidade, children }) {
  const nome = unidade && unidade !== "nao-configurada" ? ({ toledo: "Toledo", jesuitas: "Jesuítas" }[unidade] || unidade.charAt(0).toUpperCase() + unidade.slice(1)) : "";
  return (
    <div className="acesso">
      <section className="acesso-marca">
        <img className="acesso-logo" src={LOGO_LIGHT} alt="Instructiva" />
        <div className="acesso-meio">
          <h1>Todo o comercial da Instructiva num só lugar.</h1>
          <p>Conversas do WhatsApp, funil de leads, metas e análise do atendimento. Tudo para você vender mais com menos esforço.</p>
          <ul className="acesso-lista">
            <li><span><I.wa className="ico" /></span>Conversas oficiais e dos vendedores</li>
            <li><span><I.pipe className="ico" /></span>Pipeline com tarefas e lembretes</li>
            <li><span><I.trend className="ico" /></span>Metas, ranking e comissões ao vivo</li>
          </ul>
        </div>
        <div className="acesso-bolhas" aria-hidden="true">
          <div className="ab ab-them">Oi! Quero saber mais sobre o curso.</div>
          <div className="ab ab-me">Claro! Já te mando as condições.<i>✓✓</i></div>
          <div className="ab-card"><span className="ab-card-ic"><I.check className="ico" /></span><div><b>Lead movido para Matriculado</b><small>agora mesmo</small></div></div>
        </div>
        <div className="acesso-rodape">
          {nome ? <span className="acesso-unidade"><i />Unidade {nome}</span> : <span />}
          <span>Escola Instructiva · Sistema comercial</span>
        </div>
      </section>
      <section className="acesso-form">
        <div className="acesso-form-in">{children}</div>
      </section>
    </div>
  );
}
function CampoSenha({ value, onChange, placeholder, autoComplete }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="acesso-input">
      <I.lock className="ico" />
      <input type={ver ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete} />
      <button type="button" className="acesso-olho" onClick={() => setVer((v) => !v)} aria-label={ver ? "Esconder senha" : "Mostrar senha"} title={ver ? "Esconder senha" : "Mostrar senha"}>
        {ver ? <I.olhoFechado className="ico" /> : <I.olho className="ico" />}
      </button>
    </div>
  );
}
function Login({ onDone, unidade }) {
  const dark = typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark";
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const r = await api.login(login, senha);
      setToken(r.token);
      onDone(r.user);
    } catch (e) {
      setErr(e.message);
    } finally { setLoading(false); }
  }

  return (
    <TelaAcesso unidade={unidade}>
      <form className="acesso-caixa" onSubmit={entrar}>
        <img className="acesso-logo-mob" src={dark ? LOGO_LIGHT : LOGO_FULL} alt="Instructiva" />
        <h2>Bem-vindo de volta</h2>
        <p className="acesso-sub">Entre com seu usuário e senha para continuar.</p>
        {err && <div className="acesso-erro"><I.alert className="ico" />{err}</div>}
        <label className="acesso-campo">
          <span>Usuário</span>
          <div className="acesso-input"><I.user className="ico" /><input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="seu usuário" autoComplete="username" autoFocus /></div>
        </label>
        <label className="acesso-campo">
          <span>Senha</span>
          <CampoSenha value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="sua senha" autoComplete="current-password" />
        </label>
        <button className="acesso-entrar" disabled={loading}>{loading ? "Entrando…" : <>Entrar <I.seta className="ico" /></>}</button>
        <p className="acesso-ajuda">Esqueceu a senha? Fale com o gerente comercial.</p>
      </form>
    </TelaAcesso>
  );
}

/* ============================ ONBOARDING ============================ */
function Onboarding({ user, onDone, unidade }) {
  const dark = typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark";
  const [nome, setNome] = useState(user.nome === "Gerente Comercial" ? "" : user.nome);
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const dados = { nome };
      if (senha) dados.senha = senha;
      const u = await api.updateMe(dados);
      onDone(u);
    } finally { setLoading(false); }
  }

  return (
    <TelaAcesso unidade={unidade}>
      <form className="acesso-caixa" onSubmit={salvar}>
        <img className="acesso-logo-mob" src={dark ? LOGO_LIGHT : LOGO_FULL} alt="Instructiva" />
        <div className="acesso-eyebrow">Primeiro acesso</div>
        <h2>Seja bem-vindo(a)!</h2>
        <p className="acesso-sub">Confirme seu nome e crie uma senha só sua.</p>
        <label className="acesso-campo">
          <span>Seu nome</span>
          <div className="acesso-input"><I.user className="ico" /><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Maria Souza" required autoFocus /></div>
        </label>
        <label className="acesso-campo">
          <span>Nova senha</span>
          <CampoSenha value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="mínimo 3 caracteres" autoComplete="new-password" />
        </label>
        <button className="acesso-entrar" disabled={loading || !nome.trim()}>{loading ? "Salvando…" : <>Começar <I.seta className="ico" /></>}</button>
      </form>
    </TelaAcesso>
  );
}

function Equipe({ showToast, meId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // user ou {} (novo)

  async function carregar() {
    setLoading(true);
    try { setUsers(await api.listUsers()); } catch (e) { showToast("✗ " + e.message); } finally { setLoading(false); }
  }
  useEffect(() => { carregar(); }, []);

  async function excluir(u) {
    if (!confirm(`Excluir o acesso de "${u.nome}"?`)) return;
    try { await api.deleteUser(u.id); setUsers((l) => l.filter((x) => x.id !== u.id)); showToast("✓ Acesso removido"); }
    catch (e) { showToast("✗ " + e.message); }
  }

  if (loading) return <div className="spin" />;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => setEditing({})}><I.plus style={{ width: 16, height: 16 }} /> Adicionar</button>
      </div>
      <div className="panel">
        <div className="panel-h"><h3>Equipe ({users.length})<span className="panel-sub">vendedores são monitorados; gerentes acessam o sistema</span></h3></div>
        {users.map((u) => (
          <div className="urow" key={u.id}>
            <label className="av-troca" title="Clique pra colocar a foto">
              <Avatar nome={u.nome} foto={u.foto} size={44} />
              <span className="av-lupa">📷</span>
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
                const f = e.target.files && e.target.files[0]; e.target.value = "";
                if (!f || !f.type.startsWith("image/")) return;
                try {
                  const dataUrl = await redimensionarImg(f, 160);
                  const at = await api.updateUser(u.id, { foto: dataUrl });
                  setUsers((l) => l.map((x) => (x.id === u.id ? at : x)));
                  showToast("✓ Foto de " + u.nome.split(" ")[0] + " atualizada");
                } catch (err) { showToast("✗ " + err.message); }
              }} />
            </label>
            <div className="info">
              <div className="nm">{u.nome} {!u.ativo && <span className="tag-off">• desativado</span>}</div>
              <div className="sub">{u.role === "vendedor" ? "vendedor monitorado no WhatsApp" : "@" + u.login + " · acessa o sistema"}</div>
            </div>
            <span className={"tag-role " + (u.role === "vendedor" ? "ven" : u.role === "suporte" ? "sup" : "ger")}>{u.role === "gerente" ? "Gerente" : u.role === "suporte" ? "Suporte" : "Vendedor"}</span>
            <button className="btn btn-sm" onClick={() => setEditing(u)}>Editar</button>
            {u.id !== meId && <button className="x-btn" onClick={() => excluir(u)} title="Excluir"><I.trash style={{ width: 16, height: 16 }} /></button>}
          </div>
        ))}
      </div>

      {editing && (
        <UserForm
          user={editing.id ? editing : null}
          todosUsuarios={users}
          onClose={() => setEditing(null)}
          onSaved={(u, novo) => {
            setUsers((l) => (novo ? [...l, u] : l.map((x) => (x.id === u.id ? u : x))));
            setEditing(null);
            showToast(novo ? "✓ Cadastrado" : "✓ Atualizado");
          }}
        />
      )}
    </>
  );
}

function UserForm({ user, todosUsuarios, onClose, onSaved }) {
  const novo = !user;
  const [f, setF] = useState({
    nome: user?.nome || "", login: user?.login || "", senha: "",
    role: user?.role || "vendedor", ativo: user ? user.ativo : true,
    podeResponder: user?.podeResponder || false,
    lideradosIds: Array.isArray(user?.lideradosIds) ? user.lideradosIds : [],
  });
  // outros vendedores (que não o próprio) pra escolher quem ele lidera
  const outrosVend = (todosUsuarios || []).filter((u) => u.role === "vendedor" && (!user || u.id !== user.id));
  const toggleLiderado = (id) => setF((s) => ({ ...s, lideradosIds: s.lideradosIds.includes(id) ? s.lideradosIds.filter((x) => x !== id) : [...s.lideradosIds, id] }));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const precisaAcesso = f.role !== "vendedor";

  async function salvar() {
    if (!f.nome.trim()) { alert("Informe o nome."); return; }
    if (novo && precisaAcesso && (!f.login.trim() || !f.senha)) { alert("Esse perfil precisa de login e senha."); return; }
    setSaving(true);
    try {
      if (novo) {
        const dados = { nome: f.nome, role: f.role };
        if (f.login.trim()) dados.login = f.login.trim();
        if (f.senha) dados.senha = f.senha;
        if (f.role === "vendedor") { dados.podeResponder = f.podeResponder; dados.lideradosIds = f.lideradosIds; }
        const u = await api.createUser(dados);
        onSaved(u, true);
      } else {
        const dados = { nome: f.nome, role: f.role, ativo: f.ativo };
        if (f.login.trim() && f.login.trim() !== (user.login || "")) dados.login = f.login.trim();
        if (f.senha) dados.senha = f.senha;
        if (f.role === "vendedor") { dados.podeResponder = f.podeResponder; dados.lideradosIds = f.lideradosIds; }
        const u = await api.updateUser(user.id, dados);
        onSaved(u, false);
      }
    } catch (e) { alert(e.message); setSaving(false); }
  }

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="mh">
          <h3>{novo ? "Adicionar pessoa" : "Editar"}</h3>
          <p>{f.role === "gerente" ? "Gerentes veem tudo (e só visualizam as solicitações)." : f.role === "suporte" ? "O suporte recebe, responde e resolve as solicitações dos vendedores." : "Vendedores veem só os próprios números. Defina login e senha pra liberar o acesso dele."}</p>
        </div>
        <div className="mb">
          <div className="field">
            <label>Perfil</label>
            <select className="select" value={f.role} onChange={(e) => set("role", e.target.value)}>
              <option value="vendedor">Vendedor (vê os próprios números)</option>
              <option value="suporte">Suporte (resolve as solicitações)</option>
              <option value="gerente">Gerente (vê tudo)</option>
            </select>
          </div>
          <div className="field">
            <label>Nome</label>
            <input className="input" value={f.nome} onChange={(e) => set("nome", e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>Login (usuário){!precisaAcesso && <span style={{ color: "var(--faint)", fontWeight: 400 }}> — pra ele acessar</span>}</label>
            <input className="input" value={f.login} onChange={(e) => set("login", e.target.value)} placeholder={precisaAcesso ? "ex: leticia" : "ex: joao (deixe vazio se não for liberar acesso)"} />
          </div>
          <div className="field">
            <label>{novo ? (precisaAcesso ? "Senha" : "Senha de acesso") : "Nova senha (vazio = manter)"}</label>
            <input className="input" type="password" value={f.senha} onChange={(e) => set("senha", e.target.value)} placeholder="mínimo 3 caracteres" />
          </div>
          {f.role === "vendedor" && (
            <label style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 14, cursor: "pointer", padding: "4px 0" }}>
              <input type="checkbox" checked={f.podeResponder} onChange={(e) => set("podeResponder", e.target.checked)} style={{ width: 17, height: 17, marginTop: 2, flexShrink: 0 }} />
              <span>Pode responder pelo painel <span style={{ color: "var(--faint)", fontWeight: 400 }}>— libera ele a enviar mensagens pelo sistema (senão, fica só monitoria)</span></span>
            </label>
          )}
          {f.role === "vendedor" && outrosVend.length > 0 && (
            <div className="field" style={{ marginTop: 4 }}>
              <label>Líder de equipe <span style={{ color: "var(--faint)", fontWeight: 400 }}>— escolha os vendedores que ele também cuida (vê e mexe nas conversas, vendas e pipeline deles)</span></label>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 190, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 10, padding: 8, marginTop: 4 }}>
                {outrosVend.map((v) => (
                  <label key={v.id} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14, cursor: "pointer", padding: "5px 6px", borderRadius: 8, background: f.lideradosIds.includes(v.id) ? "rgba(37,160,107,.08)" : "transparent" }}>
                    <input type="checkbox" checked={f.lideradosIds.includes(v.id)} onChange={() => toggleLiderado(v.id)} style={{ width: 16, height: 16 }} />
                    <span>{v.nome}</span>
                  </label>
                ))}
              </div>
              {f.lideradosIds.length > 0 && (
                <div style={{ fontSize: 12.5, color: "var(--of-green-d, #16a34a)", marginTop: 6, fontWeight: 600 }}>
                  Cuida de {f.lideradosIds.length} vendedor{f.lideradosIds.length > 1 ? "es" : ""}.
                </div>
              )}
            </div>
          )}
          {!novo && (
            <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={f.ativo} onChange={(e) => set("ativo", e.target.checked)} style={{ width: 17, height: 17 }} />
              Ativo
            </label>
          )}
        </div>
        <div className="mf">
          <button className="btn full" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary full" onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</button>
        </div>
      </div>
    </div>
  );
}

/* ============================ CONFIG ============================ */
function ConfigDados({ user, setUser, showToast }) {
  const [nome, setNome] = useState(user.nome);
  const [senha, setSenha] = useState("");
  const [saving, setSaving] = useState(false);
  const [foto, setFoto] = useState(user.foto || "");
  const fotoRef = useRef(null);
  const isGer = user.role === "gerente";
  const [h, setH] = useState(null);
  const [savingH, setSavingH] = useState(false);
  useEffect(() => { if (isGer) api.horario().then((x) => setH(normHor(x))).catch(() => {}); /* eslint-disable-next-line */ }, []);

  async function escolherFoto(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { showToast("Escolha uma imagem"); return; }
    try {
      const dataUrl = await redimensionarImg(file, 160);
      setFoto(dataUrl);
      const u = await api.updateMe({ foto: dataUrl });
      setUser((prev) => ({ ...prev, ...u }));
      showToast("✓ Foto atualizada");
    } catch (err) { showToast("✗ Não deu pra carregar a foto"); }
  }
  async function removerFoto() {
    setFoto("");
    try { const u = await api.updateMe({ foto: "" }); setUser((prev) => ({ ...prev, ...u })); showToast("✓ Foto removida"); } catch (e) { showToast("✗ " + e.message); }
  }

  async function salvar() {
    setSaving(true);
    try {
      const dados = { nome };
      if (senha) dados.senha = senha;
      const u = await api.updateMe(dados);
      setUser((prev) => ({ ...prev, ...u }));
      setSenha("");
      showToast("✓ Dados atualizados");
    } catch (e) { showToast("✗ " + e.message); } finally { setSaving(false); }
  }
  // garante formato por dia mesmo se vier algo antigo/incompleto
  function normHor(x) {
    x = x || {};
    const dias = {};
    const velho = x.dias && !Array.isArray(x.dias) ? null : (Array.isArray(x.dias) ? x.dias.map(Number) : [1, 2, 3, 4, 5]);
    for (let d = 0; d <= 6; d++) {
      const c = (x.dias && !Array.isArray(x.dias)) ? (x.dias[d] || x.dias[String(d)] || {}) : {};
      dias[d] = velho
        ? { on: velho.includes(d), inicio: x.inicio || "08:00", fim: x.fim || "18:00", almocoIni: x.almocoIni || "", almocoFim: x.almocoFim || "" }
        : { on: !!c.on, inicio: c.inicio || "08:00", fim: c.fim || "18:00", almocoIni: c.almocoIni || "", almocoFim: c.almocoFim || "" };
    }
    return { enabled: !!x.enabled, dias };
  }
  function setDia(d, k, v) { setH((x) => ({ ...x, dias: { ...x.dias, [d]: { ...x.dias[d], [k]: v } } })); }
  function copiarPraTodos(src) {
    setH((x) => {
      const b = x.dias[src];
      const dias = {};
      for (let d = 0; d <= 6; d++) dias[d] = { ...x.dias[d], inicio: b.inicio, fim: b.fim, almocoIni: b.almocoIni, almocoFim: b.almocoFim };
      return { ...x, dias };
    });
    showToast("✓ Horário copiado pra todos os dias");
  }
  async function salvarHorario() {
    setSavingH(true);
    try { const r = await api.setHorario(h); setH(normHor(r.horario)); showToast("✓ Horário de atendimento salvo"); }
    catch (e) { showToast("✗ " + e.message); } finally { setSavingH(false); }
  }
  // ordem comercial: Seg primeiro, Dom por último
  const DIAS = [["Segunda", 1], ["Terça", 2], ["Quarta", 3], ["Quinta", 4], ["Sexta", 5], ["Sábado", 6], ["Domingo", 0]];

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-h"><h3>Meus dados</h3></div>
        <div style={{ padding: 22 }}>
          <div className="foto-row">
            <Avatar nome={nome} foto={foto} size={72} />
            <div className="foto-acoes">
              <input ref={fotoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={escolherFoto} />
              <button className="btn" onClick={() => fotoRef.current && fotoRef.current.click()}>{foto ? "Trocar foto" : "Adicionar foto"}</button>
              {foto && <button className="foto-del" onClick={removerFoto}>remover</button>}
              <div className="foto-dica">Aparece nos leads que são seus.</div>
            </div>
          </div>
          <div className="field">
            <label>Nome</label>
            <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="field">
            <label>Nova senha (deixe vazio pra manter)</label>
            <input className="input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn btn-primary" onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</button>
        </div>
      </div>

      {isGer && h && (
        <div className="panel">
          <div className="panel-h"><h3>Horário de atendimento</h3></div>
          <div style={{ padding: 22 }}>
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 0 }}>
              Quando ligado, o tempo de resposta (TMA e 1ª resposta) conta <b>só o horário comercial</b> — madrugada, almoço e fim de semana deixam de inflar os números.
            </p>
            <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              <input type="checkbox" checked={h.enabled} onChange={(e) => setH({ ...h, enabled: e.target.checked })} style={{ width: 17, height: 17 }} />
              Contar só o horário de atendimento
            </label>

            <div style={{ opacity: h.enabled ? 1 : 0.45, pointerEvents: h.enabled ? "auto" : "none", marginTop: 16 }}>
              <div className="hr-head">
                <span className="hr-head-day">Dia</span>
                <span>Abre</span><span>Fecha</span>
                <span>Almoço início <i>(opcional)</i></span><span>Almoço fim</span>
                <span></span>
              </div>
              {DIAS.map(([lbl, d]) => {
                const cfg = h.dias[d];
                const on = cfg.on;
                return (
                  <div key={d} className={"hr-row" + (on ? "" : " off")}>
                    <label className="hr-day">
                      <input type="checkbox" checked={on} onChange={(e) => setDia(d, "on", e.target.checked)} />
                      <span>{lbl}</span>
                    </label>
                    <input className="input" type="time" value={cfg.inicio} disabled={!on} onChange={(e) => setDia(d, "inicio", e.target.value)} />
                    <input className="input" type="time" value={cfg.fim} disabled={!on} onChange={(e) => setDia(d, "fim", e.target.value)} />
                    <input className="input" type="time" value={cfg.almocoIni} disabled={!on} onChange={(e) => setDia(d, "almocoIni", e.target.value)} />
                    <input className="input" type="time" value={cfg.almocoFim} disabled={!on} onChange={(e) => setDia(d, "almocoFim", e.target.value)} />
                    <button type="button" className="hr-copy" disabled={!on} title="Copiar estes horários pra todos os dias" onClick={() => copiarPraTodos(d)}>copiar p/ todos</button>
                  </div>
                );
              })}
              <p style={{ fontSize: 12, color: "var(--faint)", marginTop: 10 }}>
                Desmarque um dia pra não contar nele (ex.: domingo). Deixe o almoço vazio se não quiser descontar.
              </p>
            </div>
            <button className="btn btn-primary" onClick={salvarHorario} disabled={savingH} style={{ marginTop: 6 }}>{savingH ? "Salvando..." : "Salvar horário"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Configurações vira uma página com abas: Meus dados + Equipe & Acessos + Sistema
// (Equipe e Sistema saíram do menu lateral pra deixar ele menos poluído).
function Config({ user, setUser, showToast, isGer, ehDono, modulos, onModulosSalvo }) {
  const abas = [["dados", "Meus dados"]];
  if (isGer) abas.push(["equipe", "Equipe & Acessos"]);
  if (ehDono) abas.push(["sistema", "Sistema"]);
  const [aba, setAba] = useState("dados");
  return (
    <div>
      {abas.length > 1 && (
        <div className="of-tabs" style={{ marginBottom: 18 }}>
          {abas.map(([k, lb]) => (
            <button key={k} className={aba === k ? "of-tab on" : "of-tab"} onClick={() => setAba(k)}>{lb}</button>
          ))}
        </div>
      )}
      {aba === "dados" && <ConfigDados user={user} setUser={setUser} showToast={showToast} />}
      {aba === "equipe" && isGer && <Equipe showToast={showToast} meId={user.id} />}
      {aba === "sistema" && ehDono && <PainelSistema modulos={modulos} onSalvo={onModulosSalvo} showToast={showToast} />}
    </div>
  );
}

/* ============================================================
   MÍDIA (áudio / imagem / vídeo / documento dentro da conversa)
   ============================================================ */
function rotuloMidia(t) { return t === "audio" ? "áudio" : t === "image" ? "foto" : t === "video" ? "vídeo" : t === "sticker" ? "figurinha" : "arquivo"; }
function MidiaMsg({ chatId, m }) {
  const [url, setUrl] = useState(null);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [tent, setTent] = useState(0);
  useEffect(() => {
    let vivo = true, local = null;
    setCarregando(true); setErro(false);
    api.midiaBlob(chatId, m.mid)
      .then((u) => { if (!vivo) { URL.revokeObjectURL(u); return; } local = u; setUrl(u); setCarregando(false); })
      .catch(() => { if (vivo) { setErro(true); setCarregando(false); } });
    return () => { vivo = false; if (local) URL.revokeObjectURL(local); };
  }, [chatId, m.mid, tent]);

  if (carregando) return <div className="midia-load">⏳ carregando {rotuloMidia(m.tipo)}…</div>;
  if (erro || !url) return <button type="button" className="midia-erro" onClick={() => setTent((x) => x + 1)}>⚠️ não consegui carregar — tentar de novo</button>;
  if (m.tipo === "audio") return <audio className="midia-audio" controls preload="metadata" src={url} />;
  if (m.tipo === "image") return <a href={url} target="_blank" rel="noreferrer"><img className="midia-img" src={url} alt="imagem" /></a>;
  if (m.tipo === "sticker") return <img className="midia-sticker" src={url} alt="figurinha" />;
  if (m.tipo === "video") return <video className="midia-video" controls preload="metadata" src={url} />;
  if (m.tipo === "document") return (
    <a className="midia-doc" href={url} download={m.filename || "documento"}>
      <span className="midia-doc-ic">📄</span>
      <span className="midia-doc-nome">{m.filename || "documento"}</span>
      <span className="midia-doc-baixar">baixar</span>
    </a>
  );
  return null;
}

/* ============================================================
   WHATSAPP
   ============================================================ */
const EMOJIS = ["😀","😅","😂","🙂","😉","😍","😎","🤝","👍","👏","🙏","🔥","✅","❌","⚠️","💰","📌","📎","🎉","❤️","🤔","😅","😢","😡","👋","💪","📞","📲","🕐","🙌","✨","😊"];

/* ============================================================
   CANAL OFICIAL — TELAS (gerente: disparo/vendedores/números)
   ============================================================ */
function explicaErroMeta(msg) {
  const m = String(msg || "");
  if (/131030|not in allowed list|allowed recipient|recipient.*not.*list/i.test(m))
    return "Número em MODO DE TESTE: a Meta só entrega pra números que você adicionou na lista de teste (painel Meta → WhatsApp → API Setup → campo \"To\"). Adicione o seu número lá — ou saia do modo de teste (verificar o negócio + adicionar forma de pagamento).";
  if (/131042|payment|billing|method.*payment/i.test(m))
    return "Sem forma de pagamento válida na conta da Meta (erro de pagamento / 131042). Adicione ou valide o método de pagamento no nível da WABA / Business Manager.";
  if (/133010|not registered|register.*number/i.test(m))
    return "Número não registrado na Cloud API. No número, clique no botão 🔑 (Registrar) e informe o PIN de 6 dígitos da verificação em 2 etapas.";
  if (/132001|template.*(not exist|does not exist)|does not exist/i.test(m))
    return "Esse template não existe nessa WABA (ou o nome/idioma está diferente). Confira na aba Templates.";
  if (/132000|number of parameters|parameter.*mismatch|expected.*parameters/i.test(m))
    return "As variáveis do template não batem (a quantidade de {{ }} é diferente do que foi enviado).";
  if (/access token|oauth|expired|session has expired|token.*invalid/i.test(m))
    return "Token da Meta inválido ou expirado. Atualize o Token da Meta (botão 🔑 no topo da aba Números).";
  if (/131049|healthy ecosystem|ecosystem engagement/i.test(m))
    return "A Meta ACEITOU mas NÃO entregou, pra \"manter o engajamento saudável\" (131049) — é bloqueio de qualidade/frequência de MARKETING. Muito comum em número novo + template de marketing. Saídas: testar com um template UTILITY (não marketing), esperar o número ganhar reputação, ou espaçar os envios.";
  if (/131026|message undeliverable|undeliverable/i.test(m))
    return "Mensagem não entregue (131026): o número de destino não consegue receber — WhatsApp não instalado nesse número, número inválido, ou não aceita mensagem de empresa. Testa com outro celular que tenha WhatsApp ativo.";
  if (/131047|re-?engagement|more than 24/i.test(m))
    return "Fora da janela de 24h (131047): só template aprovado entrega. Confere o template.";
  if (/131056|pair rate limit|too many messages/i.test(m))
    return "Muitas mensagens pro mesmo número em pouco tempo (131056). Espera um pouco e tenta de novo.";
  if (/131052|media download error|download.*media/i.test(m))
    return "A Meta não conseguiu baixar/processar o arquivo (131052). Em áudio isso costuma ser formato: o servidor precisa do ffmpeg pra converter a gravação do navegador em OGG/Opus. Confira o deploy (nixpacks.toml com ffmpeg).";
  if (/131053|media upload error/i.test(m))
    return "Falha ao subir a mídia (131053). Tenta gravar de novo; se repetir, o arquivo pode estar num formato que a Meta não aceita.";
  if (/131051|unsupported message type/i.test(m))
    return "Tipo de mensagem não suportado (131051).";
  if (/470|131050|message failed to send because/i.test(m))
    return "A Meta bloqueou a entrega (qualidade/limite do número). Número novo tem limite baixo e reputação sendo formada — tende a melhorar conforme entrega mais. Se for teste, tente template UTILITY.";
  return "A Meta recusou o envio. Erro: " + m;
}

/* ============================================================
   PASSAR LEADS PROS VENDEDORES
   Conserta disparos feitos pela conta do gerente: devolve cada
   conversa pro vendedor dono do número que enviou (ou pro que
   você escolher na mão, campanha por campanha).
   ============================================================ */
function ModalRepasse({ onClose, showToast, onFeito }) {
  const [dados, setDados] = useState(null);
  const [escolhas, setEscolhas] = useState({});
  const [rodando, setRodando] = useState("");
  const [feito, setFeito] = useState(null);

  const carregar = () => api.ofRepassePrevia().then((d) => {
    setDados(d);
    // já deixa marcado o dono do número de cada campanha
    const pre = {};
    (d.grupos || []).forEach((g) => { if (g.donoNumeroId) pre[g.chave] = g.donoNumeroId; });
    setEscolhas((e) => ({ ...pre, ...e }));
  }).catch((e) => showToast(e.message));
  useEffect(() => { carregar(); }, []);

  const nomeDe = (id) => ((dados && dados.vendedores) || []).find((v) => v.id === id)?.nome || "";

  // passa UMA campanha (o clique direto que o Celso pediu)
  async function passarUma(g) {
    const dest = escolhas[g.chave];
    if (!dest) return showToast("Escolha o vendedor dessa campanha");
    if (!window.confirm(`Passar ${g.aRepassar} conversa(s) do número ${g.numeroApelido} para ${nomeDe(dest)}?`)) return;
    setRodando(g.chave);
    try {
      const r = await api.ofRepasse({ porNumero: { [g.chave]: dest } });
      showToast(`✓ ${r.movidas} conversa(s) para ${nomeDe(dest)}`);
      await carregar();
      onFeito && onFeito();
    } catch (e) { showToast("✗ " + e.message); }
    setRodando("");
  }

  // passa TODAS de uma vez
  async function passarTudo() {
    const mapa = {};
    (dados.grupos || []).forEach((g) => { if (escolhas[g.chave]) mapa[g.chave] = escolhas[g.chave]; });
    const total = (dados.grupos || []).filter((g) => escolhas[g.chave]).reduce((s2, g) => s2 + g.aRepassar, 0);
    if (!total) return showToast("Escolha o vendedor de pelo menos uma campanha");
    if (!window.confirm(`Passar ${total} conversa(s) para os vendedores?`)) return;
    setRodando("tudo");
    try {
      const r = await api.ofRepasse({ porNumero: mapa });
      setFeito(r);
      showToast(`✓ ${r.movidas} conversa(s) repassadas`);
      onFeito && onFeito();
    } catch (e) { showToast("✗ " + e.message); }
    setRodando("");
  }

  const totalSel = dados ? (dados.grupos || []).filter((g) => escolhas[g.chave]).reduce((s2, g) => s2 + g.aRepassar, 0) : 0;

  return (
    <Portal>
      <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal-box grande">
          <div className="modal-head">
            <b>Passar leads pros vendedores</b>
            <button className="crm-x" onClick={onClose}>✕</button>
          </div>

          {!dados && <div className="panel-sub" style={{ padding: 20 }}><span className="spin" /> Lendo as conversas…</div>}

          {dados && !feito && (
            <>
              <div className="panel-sub" style={{ padding: "0 4px 12px" }}>
                {dados.totalARepassar > 0
                  ? <><b>{dados.totalARepassar} conversa(s)</b> de disparo estão sem vendedor. Cada linha é um <b>número</b> — passe todos os leads dele pro dono num clique.</>
                  : "Tudo certo — todas as conversas de disparo já estão com vendedores."}
              </div>

              {dados.grupos.length === 0 && <div className="crm-col-vazio">Nada pra repassar.</div>}

              <div className="rep-lista">
                {dados.grupos.map((g) => {
                  const dest = escolhas[g.chave] || "";
                  const presos = Object.entries(g.presosCom || {}).map(([n, q]) => `${n}: ${q}`).join(" · ");
                  return (
                    <div key={g.chave} className={"rep-linha" + (dest ? "" : " sem")}>
                      <div className="rep-id">
                        <b>{g.numeroApelido}</b>
                        <span>
                          <b className="rep-qtd">{g.aRepassar}</b> pra passar
                          {g.jaOk > 0 ? ` · ${g.jaOk} já com vendedor` : ""}
                          {g.responderam > 0 ? ` · ${g.responderam} responderam` : ""}
                          {g.campanhas && g.campanhas.length ? ` · ${g.campanhas.length} campanha(s)` : ""}
                        </span>
                        {presos && <span className="rep-presos">hoje com {presos}</span>}
                      </div>
                      <select className="select" value={dest}
                        onChange={(e) => setEscolhas({ ...escolhas, [g.chave]: e.target.value })}>
                        <option value="">— escolher vendedor —</option>
                        {(dados.vendedores || []).map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
                      </select>
                      <button className="btn btn-primary btn-sm" disabled={!dest || rodando} onClick={() => passarUma(g)}>
                        {rodando === g.chave ? "…" : "Passar"}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="modal-foot">
                <span className="panel-sub">{totalSel} conversa(s) selecionadas</span>
                <button className="btn" onClick={onClose}>Fechar</button>
                <button className="btn btn-primary" disabled={!totalSel || !!rodando} onClick={passarTudo}>
                  {rodando === "tudo" ? "Passando…" : `Passar todas (${totalSel})`}
                </button>
              </div>
            </>
          )}

          {feito && (
            <div className="rep-final">
              <div className="rep-final-tit">✓ {feito.movidas} conversa(s) repassadas</div>
              <div className="rep-final-lista">
                {Object.entries(feito.porVendedor || {}).map(([nome, qtd]) => (
                  <div key={nome} className="rep-final-item"><b>{nome}</b><span>{qtd} conversa(s)</span></div>
                ))}
              </div>
              <button className="btn btn-primary" style={{ marginTop: 16, width: "100%", justifyContent: "center" }} onClick={onClose}>Fechar</button>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}


function MetricasDisparo({ isGer = true, showToast, onClose, onLimpou }) {
  const [dados, setDados] = useState(null);
  const [periodo, setPeriodo] = useState("30");
  const [carregando, setCarregando] = useState(true);
  const [limpando, setLimpando] = useState(false);

  const carregar = (p) => {
    setCarregando(true);
    let de = 0;
    const pp = p || periodo;
    if (pp !== "tudo") { const d = new Date(); d.setDate(d.getDate() - (pp === "hoje" ? 0 : Number(pp))); if (pp === "hoje") d.setHours(0, 0, 0, 0); de = d.getTime(); }
    api.ofDisparoMetricas(de, 0).then((r) => { setDados(r); setCarregando(false); }).catch((e) => { showToast(e.message); setCarregando(false); });
  };
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, []);

  async function limpar() {
    if (!confirm("Isso remove da caixa de entrada as conversas de disparo que NUNCA responderam (e limpa rastros técnicos antigos), pra deixar o sistema leve e rápido.\n\nNÃO apaga: leads do Pipeline, vendas, usuários, nem conversas que responderam.\n\nDeseja limpar agora?")) return;
    setLimpando(true);
    try { const r = await api.ofLimparDisparos(); showToast("✓ Limpo: " + r.conversas + " conversas + rastros"); onLimpou && onLimpou(); }
    catch (e) { showToast("✗ " + e.message); } finally { setLimpando(false); }
  }

  const pct = (v) => (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
  const nMil = (v) => (Number(v) || 0).toLocaleString("pt-BR");
  const g = dados && dados.geral;

  return (
    <div>
      <div style={{ padding: "20px 24px", borderBottom: "1px solid " + DES.line, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "var(--card)", zIndex: 2, borderRadius: "14px 14px 0 0", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: DES.ink }}>Métricas de disparo</div>
          <div style={{ fontSize: 12.5, color: DES.mut, marginTop: 2 }}>Entrega, leitura e resposta — direto da Meta</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select className="input" value={periodo} onChange={(e) => { setPeriodo(e.target.value); carregar(e.target.value); }} style={{ minWidth: 120 }}>
            <option value="hoje">Hoje</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="tudo">Tudo</option>
          </select>
          <button className="crm-x" onClick={onClose}>✕</button>
        </div>
      </div>

      <div style={{ padding: 24 }}>
        {carregando || !g ? <div style={{ padding: 30, color: DES.mut }}>Carregando…</div> : (
          <>
            {/* números gerais */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12, marginBottom: 20 }}>
              {[["Enviados", nMil(g.enviados), DES.ink], ["Entregues", nMil(g.entregues), DES.green], ["Lidos", nMil(g.lidos), "#2563eb"], ["Responderam", nMil(g.responderam), DES.purple], ["Falhas", nMil(g.falhas), "#dc2626"]].map(([lb, v, cor], i) => (
                <div key={i} style={{ background: DES.bg, borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11.5, color: DES.mut2, marginBottom: 4 }}>{lb}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: cor }}>{v}</div>
                </div>
              ))}
            </div>

            {/* taxas (o que o Celso quer ver claro) */}
            <div style={{ border: "1px solid " + DES.line, borderRadius: 14, padding: 18, marginBottom: 20 }}>
              {[["Taxa de entrega", g.txEntrega, DES.green, "entregues ÷ enviados"], ["Taxa de leitura", g.txLeitura, "#2563eb", "lidos ÷ entregues"], ["Taxa de resposta", g.txResposta, DES.purple, "responderam ÷ entregues"]].map(([lb, v, cor, exp], i) => (
                <div key={i} style={{ marginBottom: i < 2 ? 16 : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: DES.ink }}>{lb} <span style={{ fontSize: 11, color: DES.mut2, fontWeight: 400 }}>({exp})</span></span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: cor }}>{pct(v)}</span>
                  </div>
                  <BarraProg pct={v} cor={cor} alt={9} />
                </div>
              ))}
              <div style={{ fontSize: 11.5, color: DES.mut2, marginTop: 12, lineHeight: 1.5 }}>💡 A <b>taxa de leitura</b> depende de a pessoa ter a confirmação de leitura ligada no WhatsApp — muita gente desliga, então esse número costuma parecer mais baixo que o real. Não é erro do sistema, é limitação do WhatsApp.</div>
            </div>

            {/* por número (identifica número com entrega ruim) */}
            {(dados.porNumero || []).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: DES.mut2, marginBottom: 8 }}>Por número</div>
                <div style={{ border: "1px solid " + DES.line, borderRadius: 12, overflow: "hidden", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 480 }}>
                    <thead><tr style={{ background: DES.bg, color: DES.mut, textAlign: "right" }}><th style={{ padding: "9px 12px", textAlign: "left" }}>Número</th><th>Enviados</th><th>Entrega</th><th>Leitura</th><th>Resposta</th></tr></thead>
                    <tbody>{dados.porNumero.map((n, i) => (
                      <tr key={i} style={{ borderTop: "1px solid " + DES.line, textAlign: "right" }}>
                        <td style={{ padding: "9px 12px", textAlign: "left", fontWeight: 600, color: DES.ink }}>{n.nome}</td>
                        <td>{nMil(n.enviados)}</td>
                        <td style={{ color: n.txEntrega < 60 ? "#dc2626" : DES.green, fontWeight: 600 }}>{pct(n.txEntrega)}</td>
                        <td>{pct(n.txLeitura)}</td>
                        <td style={{ color: DES.purple, fontWeight: 600 }}>{pct(n.txResposta)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}

            {/* por template (qual converte mais) */}
            {(dados.porTemplate || []).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: DES.mut2, marginBottom: 8 }}>Por template</div>
                <div style={{ border: "1px solid " + DES.line, borderRadius: 12, overflow: "hidden", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 480 }}>
                    <thead><tr style={{ background: DES.bg, color: DES.mut, textAlign: "right" }}><th style={{ padding: "9px 12px", textAlign: "left" }}>Template</th><th>Enviados</th><th>Entrega</th><th>Resposta</th></tr></thead>
                    <tbody>{dados.porTemplate.map((tp, i) => (
                      <tr key={i} style={{ borderTop: "1px solid " + DES.line, textAlign: "right" }}>
                        <td style={{ padding: "9px 12px", textAlign: "left", fontWeight: 600, color: DES.ink }}>{tp.nome}</td>
                        <td>{nMil(tp.enviados)}</td>
                        <td style={{ color: DES.green, fontWeight: 600 }}>{pct(tp.txEntrega)}</td>
                        <td style={{ color: DES.purple, fontWeight: 600 }}>{pct(tp.txResposta)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}

            {/* campanhas recentes */}
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: DES.mut2, marginBottom: 8 }}>Campanhas ({(dados.campanhas || []).length})</div>
            <div style={{ border: "1px solid " + DES.line, borderRadius: 12, overflow: "hidden", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 560 }}>
                <thead><tr style={{ background: DES.bg, color: DES.mut, textAlign: "right" }}><th style={{ padding: "9px 12px", textAlign: "left" }}>Campanha</th><th>Env.</th><th>Entr.</th><th>Lidos</th><th>Resp.</th><th>Falhas</th><th>Tx resp.</th></tr></thead>
                <tbody>{(dados.campanhas || []).map((c) => (
                  <tr key={c.id} style={{ borderTop: "1px solid " + DES.line, textAlign: "right" }}>
                    <td style={{ padding: "9px 12px", textAlign: "left" }}><div style={{ fontWeight: 600, color: DES.ink }}>{c.nome}</div><div style={{ fontSize: 10.5, color: DES.mut2 }}>{c.numero}{c.criadoEm ? " · " + new Date(c.criadoEm).toLocaleDateString("pt-BR") : ""}</div></td>
                    <td>{nMil(c.enviados)}</td><td style={{ color: DES.green }}>{nMil(c.entregues)}</td><td>{nMil(c.lidos)}</td><td style={{ color: DES.purple }}>{nMil(c.responderam)}</td><td style={{ color: c.falhas ? "#dc2626" : DES.mut2 }}>{nMil(c.falhas)}</td>
                    <td style={{ fontWeight: 700, color: DES.purple }}>{pct(c.txResposta)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>

            {isGer && (
              <div style={{ marginTop: 22, borderTop: "1px dashed " + DES.line, paddingTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div style={{ fontSize: 12, color: DES.mut, maxWidth: 480 }}>Sistema lento? Limpe as conversas de disparo que <b>nunca responderam</b> (ficam só ocupando espaço). Os leads seguem no Pipeline; vendas e conversas que responderam não são tocadas.</div>
                <button className="btn" onClick={limpar} disabled={limpando} style={{ background: "var(--card)", border: "1px solid var(--line)", color: "#dc2626", fontWeight: 600, whiteSpace: "nowrap" }}>{limpando ? "Limpando…" : "🧹 Limpar disparos sem resposta"}</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function OficialDisparo({ isGer = true, showToast, preset = null, onPresetUsado }) {
  const [repasse, setRepasse] = useState(false);
  const [campanhas, setCampanhas] = useState([]);
  const [campSel, setCampSel] = useState(null);
  const [abrir, setAbrir] = useState(false);
  const [numeros, setNumeros] = useState([]);
  const hojeStr = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const [dataFiltro, setDataFiltro] = useState(hojeStr()); // "" = todas as datas
  const dataRef = useRef(dataFiltro);
  useEffect(() => { dataRef.current = dataFiltro; }, [dataFiltro]);
  const [meuLimite, setMeuLimite] = useState(null); // só vendedor
  const [showResumo, setShowResumo] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showDistrib, setShowDistrib] = useState(false);
  const [showMetricas, setShowMetricas] = useState(false);
  // quando chega uma lista de leads do Pipeline, abre o wizard já com eles
  const [presetAtivo, setPresetAtivo] = useState(null);
  useEffect(() => {
    if (!preset || !preset.contatos || !preset.contatos.length) return;
    if (!numeros.length) return; // espera os números carregarem — o efeito re-roda quando a lista mudar
    setPresetAtivo(preset);
    setAbrir(true);
    onPresetUsado && onPresetUsado();
    // eslint-disable-next-line
  }, [preset, numeros.length]);

  const rangeDe = (d) => {
    if (!d) return [0, 0];
    const [y, m, dd] = d.split("-").map(Number);
    return [new Date(y, m - 1, dd, 0, 0, 0, 0).getTime(), new Date(y, m - 1, dd, 23, 59, 59, 999).getTime()];
  };
  const carregarCampanhas = () => {
    const [de, ate] = rangeDe(dataRef.current);
    return api.ofCampanhas(de, ate).then(setCampanhas).catch(() => {});
  };
  useEffect(() => {
    carregarCampanhas();
    api.ofNumeros().then((ns) => setNumeros(ns.filter((n) => n.ativo))).catch(() => {});
    if (!isGer) api.ofMeuLimite().then(setMeuLimite).catch(() => {});
    // atualiza os números do disparo automaticamente a cada 10s (recontando do servidor)
    const t = setInterval(async () => {
      if (document.hidden) return; // não atualiza se a aba estiver em segundo plano
      try { await api.ofRecontar(); } catch (e) {}
      carregarCampanhas();
      if (!isGer) api.ofMeuLimite().then(setMeuLimite).catch(() => {});
    }, 10000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { carregarCampanhas(); }, [dataFiltro]); // recarrega ao trocar a data

  // resumo: quantos disparos e quantos enviados por pessoa (no filtro atual)
  const resumoPessoas = useMemo(() => {
    const map = {};
    for (const c of campanhas) {
      const nome = c.criadoPorNome || "—";
      if (!map[nome]) map[nome] = { disparos: 0, enviados: 0 };
      map[nome].disparos += 1;
      map[nome].enviados += c.enviados || 0;
    }
    return Object.entries(map).map(([nome, v]) => ({ nome, ...v })).sort((a, b) => b.disparos - a.disparos);
  }, [campanhas]);

  async function redispararCampanha(c) {
    if (!confirm(`Re-disparar a campanha "${c.nome}"?\n\nVai reenviar o template pra TODO MUNDO que recebeu mas ainda não respondeu (não manda pra quem já respondeu).`)) return;
    try {
      const r = await api.ofRedispararCampanha(c.id);
      showToast(`↻ ${r.mensagem || "Re-disparando"}`);
      setTimeout(carregarCampanhas, 1500);
    } catch (e) { showToast("✗ " + e.message); }
  }
  async function retomarCampanha(c) {
    try {
      const r = await api.ofRetomarCampanha(c.id);
      showToast(`▶ ${r.mensagem || "Retomando disparo"}`);
      setTimeout(carregarCampanhas, 1500);
    } catch (e) { showToast("✗ " + e.message); }
  }
  async function excluirCampanha(c) {
    const apagar = confirm(
      `Excluir a campanha "${c.nome}"?\n\nOK = exclui TAMBÉM as conversas dela.\nCancelar = mantém as conversas.`
    );
    if (!apagar) {
      const soReg = confirm(`Remover só o registro da campanha "${c.nome}" da lista?`);
      if (!soReg) return;
      try { await api.ofExcluirCampanha(c.id, false); showToast("Campanha removida da lista"); carregarCampanhas(); }
      catch (e) { showToast(e.message); }
      return;
    }
    try {
      const r = await api.ofExcluirCampanha(c.id, true);
      showToast(`Campanha excluída (${r.conversasRemovidas || 0} conversa(s))`);
      carregarCampanhas();
    } catch (e) { showToast(e.message); }
  }

  return (
    <div className="disp-page">
      {/* ação principal + status */}
      <div className="disp-actions">
        <div className="disp-actions-l">
          <button className="disp-cta" onClick={() => { if (!numeros.length) return showToast(isGer ? "Cadastre um número na aba Números primeiro" : "Você ainda não tem um número vinculado. Peça pro gerente vincular o seu número oficial."); setAbrir(true); }}>
            <I.send className="ico" /> Novo disparo
          </button>
          <button className="onum-btn-ghost" onClick={() => setShowTemplates(true)}><I.chat className="ico" /> Templates</button>
          <button className="onum-btn-ghost" onClick={() => setShowMetricas(true)}><I.gauge className="ico" /> Métricas</button>
          {isGer && <button className="onum-btn-ghost" onClick={() => setShowDistrib(true)}><I.users className="ico" /> Quem recebe os leads</button>}
          {!isGer && meuLimite && !meuLimite.ilimitado && (
            <span className="disp-limite-chip" style={{ color: meuLimite.restante > 0 ? "var(--muted)" : "#dc2626", background: meuLimite.restante > 0 ? "var(--surface-2, #f1f3f8)" : "#fef2f2" }}>
              {meuLimite.restante > 0
                ? <>Usou <b>{meuLimite.usado}</b>/<b>{meuLimite.limite}</b> hoje · restam <b style={{ color: "var(--brand,#4f46e5)" }}>{meuLimite.restante}</b></>
                : <>🚫 Limite de <b>{meuLimite.limite}</b>/dia — peça pro gerente liberar</>}
            </span>
          )}
        </div>
        <div className="disp-actions-r">
          <span className="disp-live"><span className="disp-live-dot" /> atualizando sozinho</span>
          <button className="btn btn-sm" onClick={async () => { try { await api.ofRecontar(); } catch (e) {} carregarCampanhas(); }}><I.refresh className="ico" /> Atualizar</button>
        </div>
      </div>

      {/* filtro por dia */}
      <div className="disp-filtro">
        <span className="disp-filtro-lbl">Filtrar por dia</span>
        <input type="date" value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)} className="disp-date" />
        <button className={"disp-fchip" + (dataFiltro === hojeStr() ? " on" : "")} onClick={() => setDataFiltro(hojeStr())}>Hoje</button>
        <button className={"disp-fchip" + (dataFiltro === "" ? " on" : "")} onClick={() => setDataFiltro("")}>Tudo</button>
      </div>

      {/* v2.2: números do período (somados das campanhas da lista) */}
      {campanhas.length > 0 && (() => {
        const soma = (k) => campanhas.reduce((t, c) => t + (Number(c[k]) || 0), 0);
        const env = soma("enviados"), ent = soma("entregues"), lid = soma("lidos"), resp = soma("responderam"), fal = soma("falhas");
        const pct = (a) => (env ? Math.round((a / env) * 100) : 0);
        const ativas = campanhas.filter((c) => c.pendentes > 0 || c.status === "agendada").length;
        return (
          <div className="dsx-kpis">
            <div className="dsx-kpi"><span><I.send className="ico" /> Enviados</span><b>{env.toLocaleString("pt-BR")}</b><small>{campanhas.length} campanha{campanhas.length > 1 ? "s" : ""}{ativas ? " · " + ativas + " em andamento" : ""}</small></div>
            <div className="dsx-kpi"><span><I.check className="ico" /> Entregues</span><b>{pct(ent)}%</b><small>{ent.toLocaleString("pt-BR")} mensagens</small></div>
            <div className="dsx-kpi"><span><I.olho className="ico" /> Lidas</span><b>{pct(lid)}%</b><small>{lid.toLocaleString("pt-BR")} mensagens</small></div>
            <div className="dsx-kpi destaque"><span><I.chat className="ico" /> Responderam</span><b>{pct(resp)}%</b><small>{resp.toLocaleString("pt-BR")} pessoas responderam</small></div>
            <div className={"dsx-kpi" + (fal ? " ruim" : "")}><span><I.alert className="ico" /> Falhas</span><b>{fal.toLocaleString("pt-BR")}</b><small>{fal ? pct(fal) + "% do envio" : "nenhuma falha"}</small></div>
          </div>
        );
      })()}

      {/* resumo por pessoa (gerente) — agrupado e colapsável */}
      {isGer && campanhas.length > 0 && (
        <div className="disp-box">
          <button className="disp-box-head" onClick={() => setShowResumo((v) => !v)}>
            <span className="disp-box-tit">Disparos por pessoa {dataFiltro ? "no dia" : ""} <em>· {campanhas.length} campanha{campanhas.length > 1 ? "s" : ""}</em></span>
            <span className="disp-box-tog">{showResumo ? "esconder ▲" : "mostrar ▼"}</span>
          </button>
          {showResumo && (
            <div className="disp-pessoas">
              {resumoPessoas.map((p) => (
                <div key={p.nome} className="disp-pessoa">
                  <span className="disp-pessoa-nome">{p.nome}</span>
                  <span className="disp-pessoa-num"><b>{p.disparos}</b> disparo{p.disparos > 1 ? "s" : ""} · {p.enviados} enviados</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* limite por vendedor (gerente) */}
      {isGer && <LimitesVendedores showToast={showToast} />}

      {/* campanhas */}
      <div className="disp-camps">
        <div className="disp-camps-head">
          <h3>Campanhas <span className="disp-count">{campanhas.length}</span></h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn btn-sm" title="Baixa uma planilha (CSV) com os leads dos seus disparos: telefone, nome, se respondeu e a campanha" onClick={() => { window.open("/api/oficial/meus-leads?token=" + encodeURIComponent(getToken()), "_blank"); }}><I.download className="ico-inline" /> Exportar leads</button>
            {isGer && <button className="btn btn-sm" title="Baixa um arquivo só com os números que já receberam disparo" onClick={() => { window.open("/api/oficial/export-recebidos?token=" + encodeURIComponent(getToken()), "_blank"); }}>Números que receberam</button>}
            {isGer && <button className="btn btn-sm" title="Passa as conversas dos disparos para o vendedor dono de cada número" onClick={() => setRepasse(true)}><I.users className="ico-inline" /> Passar leads pros vendedores</button>}
            {repasse && <ModalRepasse onClose={() => setRepasse(false)} showToast={showToast} onFeito={carregarCampanhas} />}
          </div>
        </div>
        {campanhas.length === 0 ? (
          <div className="disp-vazio">
            <I.send className="ico-empty" />
            <p>{dataFiltro ? "Nenhuma campanha nesse dia." : "Nenhuma campanha ainda."} Clique em <b>Novo disparo</b> para começar{dataFiltro ? ", ou veja outro dia / Tudo" : ""}.</p>
          </div>
        ) : (
          <div className="disp-lista">
            {campanhas.map((c) => {
              const pctResp = c.enviados ? Math.round((c.responderam || 0) / c.enviados * 100) : 0;
              const rodando = c.pendentes > 0 && c.rodando;
              const agendada = c.status === "agendada";
              const cls = agendada ? "sched" : c.pendentes > 0 ? "run" : "ok";
              return (
                <button key={c.id} className="disp-row" onClick={() => setCampSel(c)}>
                  <span className={"disp-row-dot " + cls} />
                  <span className="disp-row-main">
                    <span className="disp-row-nome">{c.nome}</span>
                    <span className="disp-row-meta">{c.template}{c.criadoPorNome ? " · " + c.criadoPorNome : ""}</span>
                  </span>
                  {!agendada && (
                    <span className="dsx-envio" title={(c.enviados || 0) + " de " + (c.total || c.enviados || 0) + " enviados"}>
                      <span className="dsx-envio-trilho"><i style={{ width: Math.min(100, c.total ? ((c.enviados || 0) / c.total) * 100 : 100) + "%" }} /></span>
                      <small>{(c.enviados || 0).toLocaleString("pt-BR")} de {(c.total || c.enviados || 0).toLocaleString("pt-BR")}</small>
                    </span>
                  )}
                  {!agendada && (
                    <span className="dsx-taxas">
                      <span title="Entregues"><em>{c.enviados ? Math.round(((c.entregues || 0) / c.enviados) * 100) : 0}%</em>entregues</span>
                      <span title="Lidas"><em>{c.enviados ? Math.round(((c.lidos || 0) / c.enviados) * 100) : 0}%</em>lidas</span>
                    </span>
                  )}
                  <span className="disp-row-info">
                    {agendada
                      ? <span className="disp-row-sched">⏰ {new Date(c.agendadoPara).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                      : <><b className="disp-row-resp">{c.responderam || 0}</b><span className="disp-row-resp-l">resp · {pctResp}%</span></>}
                    {!agendada && c.falhas > 0 && <span className="disp-row-err">{c.falhas} erro{c.falhas > 1 ? "s" : ""}</span>}
                  </span>
                  <span className={"disp-row-pill " + cls}>{agendada ? "Agendada" : c.pendentes > 0 ? (rodando ? "Enviando" : "Pausada") : "Concluída"}</span>
                  <I.chevron className="disp-row-arrow" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {abrir && <ModalDisparo isGer={isGer} numeros={numeros} showToast={showToast} preset={presetAtivo} onClose={() => { setAbrir(false); setPresetAtivo(null); }} onDone={() => { setAbrir(false); setPresetAtivo(null); setTimeout(carregarCampanhas, 1500); if (!isGer) setTimeout(() => api.ofMeuLimite().then(setMeuLimite).catch(() => {}), 1500); }} />}
      {campSel && <ModalMetricas camp={campSel} isGer={isGer} showToast={showToast} onRepassou={carregarCampanhas} onClose={() => setCampSel(null)} onRetomar={retomarCampanha} onRedisparar={redispararCampanha} onExcluir={excluirCampanha} />}

      {showTemplates && (
        <div className="pop-bg" onClick={(e) => e.target === e.currentTarget && setShowTemplates(false)}>
          <div className="pop-sheet">
            <div className="pop-head"><b>Templates</b><button className="crm-x" onClick={() => setShowTemplates(false)}>✕</button></div>
            <div className="pop-body"><OficialTemplates isGer={isGer} showToast={showToast} /></div>
          </div>
        </div>
      )}
      {showMetricas && (
        <div className="pop-bg" onClick={(e) => e.target === e.currentTarget && setShowMetricas(false)}>
          <div className="pop-sheet" style={{ maxWidth: 860, width: "96%", maxHeight: "92vh", overflowY: "auto", padding: 0 }}>
            <MetricasDisparo isGer={isGer} showToast={showToast} onClose={() => setShowMetricas(false)} onLimpou={() => { setShowMetricas(false); setTimeout(carregarCampanhas, 800); }} />
          </div>
        </div>
      )}
      {showDistrib && isGer && (
        <div className="pop-bg" onClick={(e) => e.target === e.currentTarget && setShowDistrib(false)}>
          <div className="pop-sheet">
            <div className="pop-head"><b>Quem recebe os leads</b><button className="crm-x" onClick={() => setShowDistrib(false)}>✕</button></div>
            <div className="pop-body"><OficialVendedores showToast={showToast} /></div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Painel do gerente: limite de disparos por vendedor ---------- */
function LimitesVendedores({ showToast }) {
  const [lista, setLista] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [edit, setEdit] = useState({}); // { [id]: limiteDia }

  const carregar = () => api.ofLimites().then((l) => {
    setLista(l || []);
    const e = {}; for (const v of (l || [])) e[v.id] = v.base;
    setEdit(e);
  }).catch(() => {});
  useEffect(() => { if (aberto) carregar(); }, [aberto]);

  async function salvarLimite(id) {
    try { await api.ofSetLimite(id, { limiteDia: parseInt(edit[id]) || 0 }); showToast("Limite salvo"); carregar(); }
    catch (e) { showToast(e.message); }
  }
  async function liberarHoje(id, nome) {
    const q = prompt(`Liberar QUANTOS disparos a mais pra ${nome}, só hoje?`, "50");
    if (q === null) return;
    const n = parseInt(q); if (!n || n < 1) return;
    try { const r = await api.ofSetLimite(id, { bonusHoje: n }); showToast(`Liberado +${n} pra ${nome} (limite hoje: ${r.limite})`); carregar(); }
    catch (e) { showToast(e.message); }
  }

  return (
    <div style={{ marginBottom: 14, background: "var(--card,#fff)", border: "1px solid var(--line,#eef0f4)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", padding: "13px 16px" }} onClick={() => setAberto((v) => !v)}>
        <div>
          <b style={{ fontSize: 15 }}><I.funnel className="ico-inline" /> Limite de disparos por vendedor</b>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>Padrão: 100 por dia. Vendedor não dispara além do limite — só você libera.</div>
        </div>
        <span style={{ fontSize: 13, color: "var(--brand,#4f46e5)" }}>{aberto ? "▲ fechar" : "▼ abrir"}</span>
      </div>
      {aberto && (
        <div style={{ padding: "2px 16px 16px" }}>
          {lista.length === 0 ? <div className="panel-sub">Nenhum vendedor ativo.</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lista.map((v) => {
                const noLimite = v.restante <= 0;
                return (
                  <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 12px", border: "1px solid var(--linha,#eef0f4)", borderRadius: 10, background: noLimite ? "#fef2f2" : "transparent" }}>
                    <div style={{ minWidth: 150, fontWeight: 600 }}>👤 {v.nome}</div>
                    <div style={{ fontSize: 13, color: noLimite ? "#dc2626" : "var(--muted)" }}>
                      Hoje: <b style={{ color: noLimite ? "#dc2626" : "var(--txt,#111)" }}>{v.usado}</b> / {v.limite}
                      {v.bonus > 0 && <span style={{ color: "#16a34a" }}> (inclui +{v.bonus} liberado)</span>}
                      {noLimite && <b> · no limite</b>}
                    </div>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>Limite/dia:</span>
                      <input type="number" value={edit[v.id] ?? v.base}
                        onChange={(e) => setEdit({ ...edit, [v.id]: e.target.value })}
                        style={{ width: 70, padding: "6px 8px", border: "1px solid var(--linha,#e2e6ee)", borderRadius: 8, fontSize: 13, fontFamily: "inherit" }} />
                      <button className="btn btn-sm" onClick={() => salvarLimite(v.id)}>Salvar</button>
                      <button className="btn btn-sm" style={{ background: "var(--brand,#4f46e5)", color: "#fff", borderColor: "transparent" }} onClick={() => liberarHoje(v.id, v.nome)}>+ Liberar hoje</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- MODAL DE DISPARO (passo a passo moderno) ---------- */
function ModalDisparo({ isGer = true, numeros, showToast, onClose, onDone, preset = null }) {
  const [passo, setPasso] = useState(1);
  const [numeroId, setNumeroId] = useState(numeros[0] ? numeros[0].id : "");
  const [templates, setTemplates] = useState([]);
  const [carregandoTpl, setCarregandoTpl] = useState(false);
  const [template, setTemplate] = useState(null);
  const [modoContato, setModoContato] = useState("manual");
  const [contatos, setContatos] = useState([]);
  const [textoManual, setTextoManual] = useState("");
  const [nomeCampanha, setNomeCampanha] = useState("");
  const [pularRecebidos, setPularRecebidos] = useState(false);
  const [destinoLeads, setDestinoLeads] = useState("eu"); // "eu" = fica com quem disparou | "time" = distribui | "vendedor" = fica com um escolhido
  const [vendedorDestino, setVendedorDestino] = useState("");
  const [vendedores, setVendedores] = useState([]);
  useEffect(() => { if (isGer) api.ofVendedoresLista().then((d) => setVendedores((d && d.vendedores) || d || [])).catch(() => setVendedores([])); }, [isGer]);
  // leads trazidos do Pipeline: já preenche os contatos e o dono
  useEffect(() => {
    if (!preset || !preset.contatos || !preset.contatos.length) return;
    const cs = preset.contatos.map((c) => ({ telefone: String(c.telefone || "").replace(/\D/g, ""), nome: c.nome || "" })).filter((c) => c.telefone);
    setContatos(cs);
    setModoContato("manual");
    setTextoManual(cs.map((c) => (c.nome ? c.nome + ", " : "") + c.telefone).join("\n"));
    if (preset.vendedorDestino) { setDestinoLeads("vendedor"); setVendedorDestino(preset.vendedorDestino); }
    // eslint-disable-next-line
  }, []);
  const [agendar, setAgendar] = useState(false);
  const [dataHora, setDataHora] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [ias, setIas] = useState([]);
  const [iaId, setIaId] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    if (!isGer) { setIas([]); return; }
    api.ofIAs().then((lista) => setIas((lista || []).filter((x) => x.ativa))).catch(() => setIas([]));
  }, [isGer]);

  useEffect(() => {
    if (!numeroId) return;
    setCarregandoTpl(true);
    api.ofTemplates(numeroId)
      .then((r) => setTemplates(r.templates || []))
      .catch((e) => { showToast(e.message); setTemplates([]); })
      .finally(() => setCarregandoTpl(false));
    setTemplate(null);
  }, [numeroId]);

  function parseContatos(txt) {
    const linhas = String(txt).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const out = [];
    for (const l of linhas) {
      const partes = l.split(/[,;\t]/).map((p) => p.trim());
      let telefone = "", nome = "";
      for (const p of partes) {
        const dig = p.replace(/\D/g, "");
        if (dig.length >= 10 && !telefone) telefone = dig;
        else if (p && !/^\d+$/.test(p) && !nome) nome = p;
      }
      if (telefone) out.push({ telefone, nome });
    }
    return out;
  }
  function lerCSV(file) {
    const r = new FileReader();
    r.onload = () => {
      const out = parseContatos(r.result || "");
      setContatos(out);
      showToast(out.length ? `${out.length} contato(s) carregado(s)` : "Nenhum telefone válido");
    };
    r.readAsText(file);
  }
  function processarManual() {
    const out = parseContatos(textoManual);
    setContatos(out);
    showToast(out.length ? `${out.length} número(s) reconhecido(s)` : "Nenhum número válido");
  }

  async function disparar() {
    let agendarPara = 0;
    if (agendar) {
      if (!dataHora) { showToast("Escolha a data e a hora do agendamento"); return; }
      agendarPara = new Date(dataHora).getTime();
      if (!agendarPara || agendarPara < Date.now() + 60000) { showToast("O horário do agendamento precisa ser no futuro"); return; }
    }
    setEnviando(true);
    try {
      const r = await api.ofDisparar({
        numeroId, template: template.name, idioma: template.language,
        nomeCampanha: nomeCampanha || template.name, contatos, iaId: iaId || null,
        pularRecebidos, agendarPara: agendarPara || undefined, destinoLeads,
        vendedorDestino: destinoLeads === "vendedor" ? (vendedorDestino || null) : null,
      });
      if (r.agendadoPara) showToast(`Disparo agendado para ${new Date(r.agendadoPara).toLocaleString("pt-BR")} · ${r.total} contato(s)`);
      else showToast(`Disparo iniciado para ${r.total} contato(s)!`);
      onDone();
    } catch (e) { showToast(e.message); }
    finally { setEnviando(false); }
  }

  const numeroSel = numeros.find((n) => n.id === numeroId);
  const minDataHora = () => { const d = new Date(Date.now() + 120000); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  const PASSOS = ["Número", "Mensagem", "Contatos", "Revisar"];
  const podeAvancar = passo === 1 ? !!numeroId : passo === 2 ? !!template : passo === 3 ? contatos.length > 0 : true;

  return (
    <Portal>
    <div className="dispm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dispm">
        <button className="dispm-close" onClick={onClose}><I.x /></button>

        {/* trilha de passos */}
        <div className="dispm-trilha">
          {PASSOS.map((nome, i) => {
            const n = i + 1;
            return (
              <div key={n} className={"dispm-passo" + (passo === n ? " on" : "") + (passo > n ? " done" : "")}>
                <div className="dispm-bola">{passo > n ? "✓" : n}</div>
                <span>{nome}</span>
              </div>
            );
          })}
          <div className="dispm-trilha-bg"><div className="dispm-trilha-fill" style={{ width: ((passo - 1) / (PASSOS.length - 1) * 100) + "%" }} /></div>
        </div>

        <div className="dispm-conteudo">
          {passo === 1 && (
            <div className="dispm-fade">
              <h3 className="dispm-titulo">De qual número vai sair?</h3>
              <p className="dispm-sub">Escolha o WhatsApp oficial que vai enviar as mensagens.</p>
              <div className="dispm-num-grid">
                {numeros.map((n) => (
                  <button key={n.id} className={numeroId === n.id ? "dispm-num on" : "dispm-num"} onClick={() => setNumeroId(n.id)}>
                    <div className="dispm-num-ico"><I.wa className="ico" /></div>
                    <b>{n.apelido}</b>
                    <span>{n.numero || "—"}</span>
                    {numeroId === n.id && <div className="dispm-num-check">✓</div>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {passo === 2 && (
            <div className="dispm-fade">
              <h3 className="dispm-titulo">Qual mensagem enviar?</h3>
              <p className="dispm-sub">Só templates aprovados pela Meta aparecem aqui.</p>
              {carregandoTpl ? (
                <div className="dispm-load"><span className="spin" /> Carregando templates…</div>
              ) : templates.length === 0 ? (
                <div className="dispm-load">Nenhum template aprovado. Crie um na aba Templates.</div>
              ) : (
                <div className="dispm-tpl-grid">
                  {templates.map((t) => (
                    <button key={t.name + t.language} className={template && template.name === t.name ? "dispm-tpl on" : "dispm-tpl"} onClick={() => setTemplate(t)}>
                      <div className="dispm-tpl-head"><b>{t.name}</b><span className="of-tag">{t.language}</span></div>
                      <div className="dispm-tpl-txt">{t.texto || "(sem corpo)"}</div>
                      {t.vars > 0 && <div className="dispm-tpl-var">usa {t.vars} variável(eis)</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {passo === 3 && (
            <div className="dispm-fade">
              <h3 className="dispm-titulo">Para quem vai enviar?</h3>
              <p className="dispm-sub">Cole os números ou suba um arquivo. O DDI 55 entra sozinho.</p>
              <div className="dispm-modo">
                <button className={modoContato === "manual" ? "dispm-modo-btn on" : "dispm-modo-btn"} onClick={() => setModoContato("manual")}>✍️ Colar números</button>
                <button className={modoContato === "arquivo" ? "dispm-modo-btn on" : "dispm-modo-btn"} onClick={() => setModoContato("arquivo")}>📄 Subir arquivo</button>
              </div>
              {modoContato === "manual" ? (
                <>
                  <textarea className="dispm-textarea" rows={6} placeholder={"44999887766\n11988776655, João\n21997654321"} value={textoManual} onChange={(e) => setTextoManual(e.target.value)} onBlur={processarManual} />
                  <button className="btn btn-sm" onClick={processarManual}>Reconhecer números</button>
                </>
              ) : (
                <input ref={fileRef} className="input" type="file" accept=".csv,.txt" onChange={(e) => e.target.files[0] && lerCSV(e.target.files[0])} />
              )}
              {contatos.length > 0 && <div className="dispm-count">✅ {contatos.length} contato(s) prontos</div>}
            </div>
          )}

          {passo === 4 && (
            <div className="dispm-fade">
              <h3 className="dispm-titulo">Tudo pronto?</h3>
              <p className="dispm-sub">Confira e dispare.</p>
              <div className="dispm-review">
                <div className="dispm-rev"><span>📱 Número</span><b>{numeroSel ? numeroSel.apelido : "—"}</b></div>
                <div className="dispm-rev"><span>💬 Template</span><b>{template ? template.name : "—"}</b></div>
                <div className="dispm-rev"><span>👥 Contatos</span><b>{contatos.length}</b></div>
              </div>
              <div className="dispm-campo">
                <label>Quem atende quem responder?</label>
                {isGer ? (
                  <>
                    <select className="input" value={iaId} onChange={(e) => setIaId(e.target.value)}>
                      <option value="">👤 Vendedores (distribuição normal)</option>
                      {ias.map((ia) => (
                        <option key={ia.id} value={ia.id}>🤖 {ia.nome} {ia.modo === "qualifica" ? "(qualifica e passa)" : "(fecha sozinha)"}</option>
                      ))}
                    </select>
                    {iaId ? (
                      <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>
                        A IA vai responder automaticamente quem responder a esse disparo. Os vendedores não recebem (a não ser que a IA passe).
                      </div>
                    ) : (
                      <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>
                        Quem responder cai direto pros vendedores, como sempre.
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2, padding: "10px 12px", background: "var(--of-soft, #f1f5f9)", borderRadius: 8 }}>
                    👤 Quem responder cai <b>direto pra você</b>, na <b>Caixa de entrada</b> (aba Oficial).
                  </div>
                )}
              </div>
              <div className="dispm-campo">
                <label>Quem responder, vai pra quem?</label>
                <select className="input" value={destinoLeads} onChange={(e) => setDestinoLeads(e.target.value)}>
                  <option value="eu">Fica comigo (só eu atendo esses leads)</option>
                  {isGer && <option value="vendedor">Fica com um vendedor (escolher)</option>}
                  <option value="time">Distribuir pro time (rodízio de "Quem recebe os leads")</option>
                </select>
                {destinoLeads === "vendedor" && isGer && (
                  <select className="input" style={{ marginTop: 8 }} value={vendedorDestino} onChange={(e) => setVendedorDestino(e.target.value)}>
                    <option value="">Escolha o vendedor…</option>
                    {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}{v.ehGerente ? " (gerente)" : ""}</option>)}
                  </select>
                )}
                <span style={{ fontSize: 12, color: "var(--muted)", marginTop: 5, display: "block" }}>
                  {destinoLeads === "eu"
                    ? "Todo mundo que responder esse disparo cai na SUA caixa de entrada e fica no seu nome."
                    : destinoLeads === "vendedor"
                    ? "Quem responder cai direto na caixa do vendedor escolhido e fica no nome dele."
                    : "Quem responder é dividido entre os vendedores ligados em \"Quem recebe os leads\", em rodízio."}
                </span>
              </div>
              <div className="dispm-campo">
                <label>Nome da campanha (opcional)</label>
                <input className="input" placeholder="Ex: Disparo Inversor Solar" value={nomeCampanha} onChange={(e) => setNomeCampanha(e.target.value)} />
              </div>
              <div className="dispm-campo">
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600 }}>
                  <input type="checkbox" checked={agendar} onChange={(e) => setAgendar(e.target.checked)} style={{ width: 17, height: 17, cursor: "pointer" }} />
                  ⏰ Agendar disparo (enviar depois, na data e hora que eu escolher)
                </label>
                {agendar && (
                  <div style={{ marginTop: 8 }}>
                    <input type="datetime-local" className="input" value={dataHora} min={minDataHora()} onChange={(e) => setDataHora(e.target.value)} style={{ maxWidth: 280 }} />
                    <span style={{ fontSize: 12, color: "var(--muted)", marginTop: 5, display: "block" }}>
                      O disparo fica guardado e sai <b>sozinho na hora marcada</b> (horário do Brasil). Não precisa deixar nada aberto — o servidor dispara automaticamente.
                    </span>
                  </div>
                )}
              </div>
              <div className="dispm-previa">
                <span className="dispm-previa-lab">Prévia</span>
                <div className="dispm-previa-bolha">{template ? template.texto : ""}</div>
              </div>
            </div>
          )}
        </div>

        {/* rodapé com navegação */}
        <div className="dispm-foot">
          {passo > 1 ? <button className="btn" onClick={() => setPasso(passo - 1)}>← Voltar</button> : <button className="btn" onClick={onClose}>Cancelar</button>}
          {passo < 4 ? (
            <button className="dispm-next" disabled={!podeAvancar} onClick={() => setPasso(passo + 1)}>Continuar →</button>
          ) : (
            <button className="dispm-next disparar" disabled={enviando} onClick={disparar}>
              {enviando ? <><span className="spin" /> {agendar ? "Agendando…" : "Disparando…"}</> : (agendar ? <>⏰ Agendar para {contatos.length}</> : <>🚀 Disparar para {contatos.length}</>)}
            </button>
          )}
        </div>
      </div>
    </div>
    </Portal>
  );
}

function ModalMetricas({ camp, isGer = true, onClose, onRetomar, onRedisparar, onExcluir, showToast, onRepassou }) {
  // transferir a campanha inteira pro vendedor
  const [rep, setRep] = useState(null);
  const [destino, setDestino] = useState("");
  const [passando, setPassando] = useState(false);
  const carregarRep = () => {
    if (!isGer) return;
    api.ofCampDonos(camp.id).then((d) => {
      setRep(d);
      if (d.sugeridoId) setDestino((a) => a || d.sugeridoId);
    }).catch(() => setRep(null));
  };
  useEffect(() => { carregarRep(); }, [camp.id]);
  async function transferirCampanha() {
    if (!destino) return showToast && showToast("Escolha o vendedor");
    const nome = (rep.vendedores.find((v) => v.id === destino) || {}).nome || "";
    if (!window.confirm(`Transferir as ${rep.total} conversa(s) dessa campanha para ${nome}?`)) return;
    setPassando(true);
    try {
      const r = await api.ofCampTransferir(camp.id, destino, false);
      showToast && showToast(`✓ ${r.movidas} conversa(s) para ${nome}`);
      carregarRep();
      onRepassou && onRepassou();
    } catch (e) { showToast && showToast("✗ " + e.message); }
    setPassando(false);
  }
  const enviados = camp.enviados || 0;
  const linha = (lab, val, cor) => {
    const pct = enviados ? Math.round((val / enviados) * 100) : 0;
    return (
      <div className="mm-linha">
        <div className="mm-linha-top"><span>{lab}</span><b>{val} <small>({pct}%)</small></b></div>
        <div className="mm-bar"><div className="mm-bar-fill" style={{ width: pct + "%", background: cor }} /></div>
      </div>
    );
  };
  const agendada = camp.status === "agendada";
  return (
    <Portal>
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="mh"><b>{camp.nome}</b><button className="x-btn" onClick={onClose}><I.x /></button></div>
        <div className="mb">
          <div className="panel-sub" style={{ marginBottom: 14 }}>
            Template <b>{camp.template}</b> · {new Date(camp.criadoEm).toLocaleString("pt-BR")} · total {camp.total} contato(s)
            {camp.criadoPorNome ? <> · disparado por <b>{camp.criadoPorNome}</b></> : null}
          </div>

          {agendada ? (
            <div className="disp-sched-info" style={{ marginTop: 0 }}>
              <div className="disp-sched-when">⏰ {new Date(camp.agendadoPara).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
              <div className="disp-sched-sub">{camp.total} contato(s) na fila · o servidor dispara sozinho na hora marcada</div>
            </div>
          ) : (
            <>
              {camp.falhas > 0 && camp.ultimoErro && (
                <div style={{ marginBottom: 14, fontSize: 13, lineHeight: 1.5, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠️ Por que {camp.falhas} falhou</div>
                  {explicaErroMeta(camp.ultimoErro)}
                  <div style={{ marginTop: 6, fontSize: 11.5, opacity: .8 }}>Erro cru da Meta: {camp.ultimoErro}</div>
                </div>
              )}
              <div className="mm-big">
                <div className="mm-big-card"><span className="mm-big-n">{enviados}</span><span>Enviados</span></div>
                <div className="mm-big-card"><span className="mm-big-n ok">{camp.entregues || 0}</span><span>Entregues</span></div>
                <div className="mm-big-card"><span className="mm-big-n resp">{camp.responderam || 0}</span><span>Responderam</span></div>
                <div className="mm-big-card"><span className="mm-big-n err">{camp.falhas || 0}</span><span>Erros</span></div>
              </div>
              <div className="mm-linhas">
                {linha("Entregues", camp.entregues || 0, "var(--of-green)")}
                {linha("Lidos", camp.lidos || 0, "var(--cyan)")}
                {linha("Responderam", camp.responderam || 0, "var(--brand)")}
                {linha("Erros", camp.falhas || 0, "var(--coral)")}
              </div>
              <div className="panel-sub" style={{ marginTop: 12, fontSize: 11.5 }}>
                Entregues e lidos são atualizados pela Meta em tempo real conforme as mensagens chegam.
              </div>
            </>
          )}

          {isGer && rep && rep.total > 0 && (
            <div className="mm-repasse">
              <div className="mm-repasse-tit">
                Transferir <b>as {rep.total} conversa(s)</b> dessa campanha para:
              </div>
              {(rep.donos || []).length > 0 && (
                <div className="mm-repasse-donos">
                  {rep.donos.map((d) => <span key={d.nome} className="mm-dono"><b>{d.qtd}</b> {d.nome}</span>)}
                </div>
              )}
              <div className="mm-repasse-linha">
                <select className="select" value={destino} onChange={(e) => setDestino(e.target.value)}>
                  <option value="">— escolher vendedor —</option>
                  {(rep.vendedores || []).map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
                </select>
                <button className="btn btn-primary" disabled={!destino || passando} onClick={transferirCampanha}>
                  {passando ? "Transferindo…" : `Transferir ${rep.total}`}
                </button>
              </div>
            </div>
          )}
          {isGer && rep && rep.total === 0 && (
            <div className="mm-repasse ok">Nenhuma conversa registrada nessa campanha.</div>
          )}

          <div className="mm-acoes">
            {!agendada && (
              <button className="disp-camp-acao" style={{ background: "var(--surface-2)", color: "var(--text)", borderColor: "var(--line)" }}
                onClick={() => { window.open("/api/oficial/campanhas/" + camp.id + "/leads?token=" + encodeURIComponent(getToken()), "_blank"); }}
                title="Baixa a planilha (CSV) com os leads dessa campanha: telefone, nome, se respondeu">
                <I.download className="ico-inline" /> Exportar leads dessa campanha
              </button>
            )}
            {!agendada && camp.pendentes > 0 && (
              <button className="disp-camp-acao retomar" onClick={() => { onRetomar && onRetomar(camp); onClose(); }}><I.play className="ico-inline" /> Retomar disparo · {camp.pendentes} faltando</button>
            )}
            {!agendada && !camp.pendentes && camp.enviados > 0 && (
              <button className="disp-camp-acao redisp" onClick={() => { onRedisparar && onRedisparar(camp); onClose(); }}><I.refresh className="ico-inline" /> Re-disparar pra quem não respondeu</button>
            )}
            {isGer && (
              <button className="mm-excluir" onClick={() => { onExcluir && onExcluir(camp); onClose(); }}>
                <I.trash className="ico" /> {agendada ? "Cancelar agendamento" : "Excluir campanha"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
    </Portal>
  );
}

function OficialVendedores({ showToast }) {
  const [vends, setVends] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = () => {
    setCarregando(true);
    api.ofVendedores().then(setVends).catch((e) => showToast(e.message)).finally(() => setCarregando(false));
  };
  useEffect(carregar, []);

  async function toggle(v) {
    try {
      const r = await api.ofEditarVendedor(v.id, { oficialAtivo: !v.oficialAtivo });
      setVends((xs) => xs.map((x) => x.id === v.id ? { ...x, ...r } : x));
    } catch (e) { showToast(e.message); }
  }
  async function setPct(v, pct) {
    try {
      const r = await api.ofEditarVendedor(v.id, { oficialPercentual: pct });
      setVends((xs) => xs.map((x) => x.id === v.id ? { ...x, ...r } : x));
    } catch (e) { showToast(e.message); }
  }
  async function zerar() {
    if (!confirm("Zerar todos os contadores de leads recebidos? A distribuição recomeça do zero.")) return;
    try { await api.ofZerarContadores(); carregar(); showToast("Contadores zerados"); }
    catch (e) { showToast(e.message); }
  }
  const pesoDe = (v) => (Number(v.oficialPercentual) > 0 ? Number(v.oficialPercentual) : 1);
  async function stepPeso(v, delta) {
    const novo = Math.max(1, pesoDe(v) + delta);
    try { const r = await api.ofEditarVendedor(v.id, { oficialPercentual: novo }); setVends((xs) => xs.map((x) => x.id === v.id ? { ...x, ...r } : x)); }
    catch (e) { showToast(e.message); }
  }
  async function igualar() {
    try { await Promise.all(vends.filter((v) => v.oficialAtivo).map((v) => api.ofEditarVendedor(v.id, { oficialPercentual: 1 }))); carregar(); showToast("✓ Todos recebem igual — 1 lead pra cada"); }
    catch (e) { showToast(e.message); }
  }

  const ativos = vends.filter((v) => v.oficialAtivo);
  const somaPeso = ativos.reduce((s, v) => s + pesoDe(v), 0);
  const todosIgual = ativos.length > 0 && ativos.every((v) => pesoDe(v) === 1);

  if (carregando) return <div className="dash-empty"><span className="spin" /> Carregando…</div>;
  if (vends.length === 0) {
    return (
      <div className="dash-empty">
        <I.users className="ico-empty" />
        <p>Nenhum vendedor cadastrado.</p>
        <p className="panel-sub">Vá em <b>Equipe & Acessos</b> e crie os vendedores primeiro.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-h"><I.users className="ico" /> Quem recebe os leads</div>
      <div className="panel-sub">
        <b>Desligue quem não vai trabalhar</b> — os leads caem só entre os ligados, e vale <b>na hora</b> (já pros próximos). Cada ligado recebe <b>1 lead por vez</b>, em rodízio. Se quiser que alguém receba mais, aumente os <b>leads por rodada</b> dele (2 = o dobro, e assim por diante).
      </div>

      <div className="of-vend-top">
        <button className={"btn btn-sm" + (todosIgual ? " btn-on" : "")} onClick={igualar}><I.refresh className="ico" /> 1 lead pra cada (igual)</button>
        <span className="of-vend-resumo">{ativos.length} ligado(s){!todosIgual && somaPeso ? ` · rodada de ${somaPeso} leads` : ""}</span>
      </div>

      <div className="of-vend-list">
        {vends.map((v) => (
          <div key={v.id} className={v.oficialAtivo ? "of-vend on" : "of-vend"}>
            <button className={v.oficialAtivo ? "of-switch on" : "of-switch"} onClick={() => toggle(v)} title={v.oficialAtivo ? "Trabalhando — clique pra desligar" : "Desligado — clique pra ligar"}>
              <span className="of-switch-dot" />
            </button>
            <div className="of-vend-nome">
              <b>{v.nome}{v.proximo && <span className="of-vez">← próximo</span>}</b>
              <span className="of-vend-sub">{v.oficialLeadsRecebidos || 0} leads recebidos{v.oficialAtivo ? "" : " · desligado"}</span>
            </div>
            {v.oficialAtivo && (
              <div className="of-peso">
                <span className="of-peso-lbl">leads/rodada</span>
                <div className="of-stepper">
                  <button onClick={() => stepPeso(v, -1)} disabled={pesoDe(v) <= 1} aria-label="menos">−</button>
                  <span className="of-peso-n">{pesoDe(v)}</span>
                  <button onClick={() => stepPeso(v, +1)} aria-label="mais">+</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="of-vend-foot">
        <div className="panel-sub">Muda quando quiser — vale na hora pros próximos leads.</div>
        <button className="btn btn-sm" onClick={zerar}><I.refresh className="ico" /> Zerar contadores</button>
      </div>
    </div>
  );
}

/* ---------- NÚMEROS (pool da Cloud API) ---------- */
/* ---------- TEMPLATES (listar + criar) ---------- */
function OficialTemplates({ isGer = true, showToast }) {
  const [numeros, setNumeros] = useState([]);
  const [numeroId, setNumeroId] = useState("");
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [form, setForm] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api.ofNumeros().then((ns) => {
      setNumeros(ns);
      if (ns[0]) setNumeroId(ns[0].id);
    }).catch(() => {});
  }, []);

  const carregar = () => {
    if (!numeroId) return;
    setCarregando(true);
    api.ofTemplates(numeroId)
      .then((r) => setLista(r.todos || []))
      .catch((e) => { showToast(e.message); setLista([]); })
      .finally(() => setCarregando(false));
  };
  useEffect(carregar, [numeroId]);

  async function criar() {
    if (!form.nome || !form.corpo) return showToast("Preencha nome e texto");
    setSalvando(true);
    try {
      const r = await api.ofCriarTemplate(numeroId, form);
      showToast(`Template enviado! Status: ${r.status === "APPROVED" ? "aprovado" : "aguardando aprovação da Meta"}`);
      setForm(null);
      setTimeout(carregar, 1500);
    } catch (e) { showToast(e.message); }
    finally { setSalvando(false); }
  }

  if (numeros.length === 0) {
    return (
      <div className="dash-empty">
        <I.chat className="ico-empty" />
        <p>{isGer ? "Cadastre um número primeiro (aba Números)." : "Você ainda não tem um número vinculado. Peça pro gerente vincular o seu número oficial."}</p>
      </div>
    );
  }

  const rotuloStatus = (s) => s === "APPROVED" ? "Aprovado" : s === "PENDING" ? "Pendente" : s === "REJECTED" ? "Rejeitado" : s;
  const rotuloCat = (c) => c === "UTILITY" ? "Utilidade" : c === "MARKETING" ? "Marketing" : c;

  return (
    <div className="panel">
      <div className="panel-h">
        <I.chat className="ico" /> Templates
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {numeros.length > 1 && (
            <select className="select" style={{ width: 160 }} value={numeroId} onChange={(e) => setNumeroId(e.target.value)}>
              {numeros.map((n) => <option key={n.id} value={n.id}>{n.apelido}</option>)}
            </select>
          )}
          <button className="btn btn-sm" onClick={carregar}><I.refresh className="ico" /></button>
          <button className="btn btn-primary btn-sm" onClick={() => setForm({ nome: "", corpo: "", categoria: "MARKETING", idioma: "pt_BR" })}>
            <I.plus className="ico" /> Novo template
          </button>
        </div>
      </div>

      {carregando ? (
        <div className="panel-sub"><span className="spin" /> Carregando…</div>
      ) : lista.length === 0 ? (
        <div className="panel-sub">Nenhum template nesse número ainda.</div>
      ) : (
        <div className="of-tpl-manage">
          {lista.map((t) => (
            <div key={t.name + t.language} className="of-tpl-row">
              <div className="of-tpl-row-info">
                <b>{t.name}</b>
                <div className="of-tpl-row-txt">{t.texto || "(sem corpo)"}</div>
              </div>
              <span className={"of-cat " + t.category}>{rotuloCat(t.category)}</span>
              <span className={"of-status " + t.status}>{rotuloStatus(t.status)}</span>
            </div>
          ))}
        </div>
      )}

      {form && (
        <Portal>
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setForm(null)}>
          <div className="modal-box">
            <div className="mh"><b>Novo template</b><button className="x-btn" onClick={() => setForm(null)}><I.x /></button></div>
            <div className="mb">
              <div className="panel-sub" style={{ marginBottom: 12 }}>
                A Meta precisa aprovar o template antes de poder usar (geralmente de minutos a algumas horas).
              </div>
              <div className="field">
                <label className="lab">Nome (sem espaços, minúsculo)</label>
                <input className="input mono" placeholder="ex: promocao_setembro" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="field">
                <label className="lab">Categoria</label>
                <div className="wz-modo">
                  <button className={form.categoria === "MARKETING" ? "wz-modo-btn on" : "wz-modo-btn"} onClick={() => setForm({ ...form, categoria: "MARKETING" })}>📣 Marketing</button>
                  <button className={form.categoria === "UTILITY" ? "wz-modo-btn on" : "wz-modo-btn"} onClick={() => setForm({ ...form, categoria: "UTILITY" })}>🔧 Utilidade</button>
                </div>
                <div className="panel-sub" style={{ fontSize: 11.5, marginTop: 6 }}>
                  Utilidade (~R$0,07) é mais barato, mas é só pra avisos/transações. Marketing (~R$0,35) é pra promoções e ofertas.
                </div>
              </div>
              <div className="field">
                <label className="lab">Texto da mensagem</label>
                <textarea className="textarea" rows={5} placeholder="Olá! Tudo bem? Aqui é da Escola Instructiva…" value={form.corpo} onChange={(e) => setForm({ ...form, corpo: e.target.value })} />
                <div className="panel-sub" style={{ fontSize: 11.5, marginTop: 6 }}>
                  Para personalizar com o nome, use <code>{"{{1}}"}</code> (ex: "Olá {"{{1}}"}!"). Aí no disparo você preenche pelo CSV.
                </div>
              </div>
            </div>
            <div className="mf">
              <button className="btn" onClick={() => setForm(null)}>Cancelar</button>
              <button className="btn btn-primary" disabled={salvando} onClick={criar}>{salvando ? <><span className="spin" /> Enviando…</> : "Enviar para aprovação"}</button>
            </div>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}


/* ============================================================
   RECADOS DO TIME (só o dono enxerga)
   Escolhe quem recebe e em que tom. O texto muda todo dia
   e usa os números reais da pessoa.
   ============================================================ */
function RecadoDoDia() {
  const [recado, setRecado] = useState(null);
  const [saindo, setSaindo] = useState(false);
  useEffect(() => {
    let vivo = true;
    api.recadoMeu()
      .then((r) => { if (vivo && r && r.recado) setTimeout(() => setRecado(r.recado), 700); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);
  if (!recado) return null;
  function fechar() {
    setSaindo(true);
    api.recadoVisto().catch(() => {});
    setTimeout(() => setRecado(null), 220);
  }
  return (
    <Portal>
      <div className={"rec-bg" + (saindo ? " saindo" : "")} onClick={(e) => e.target === e.currentTarget && fechar()}>
        <div className="rec-pop">
          <div className="rec-pop-luz" />
          <div className="rec-pop-foto">
            <Avatar nome={recado.nome || "?"} foto={recado.foto} size={96} />
          </div>
          {recado.titulo && <div className="rec-pop-tit">{recado.titulo}</div>}
          <p className={"rec-pop-txt" + (recado.titulo ? "" : " solo")}>{recado.corpo}</p>
          {recado.assinatura && <div className="rec-pop-ass">— {recado.assinatura}</div>}
          <button className="btn btn-primary rec-pop-btn" onClick={fechar}>Bora! 🚀</button>
        </div>
      </div>
    </Portal>
  );
}


/* ============================================================
   ANÁLISE IA DO ATENDIMENTO (só o dono vê)
   Números reais + leitura das conversas pela IA.
   ============================================================ */
function PainelSistema({ modulos, onSalvo, showToast }) {
  const LISTA = [
    ["caixa", "Caixa de entrada", "Todas as conversas de WhatsApp num só lugar (oficial e vendedores)."],
    ["disparo", "Disparo", "Campanhas de mensagem em massa por WhatsApp."],
    ["templates", "Templates", "Modelos de mensagem aprovados pela Meta."],
    ["numeros", "Números", "Números oficiais conectados e qualidade de cada um."],
    ["crm", "Pipeline", "Funil de vendas visual (Kanban) com etapas e distribuição."],
    ["solicitacoes", "Solicitações", "Pedidos de suporte dos vendedores."],
    ["equipe", "Equipe & Acessos", "Gestão de usuários e permissões da equipe."],
  ];
  const [flags, setFlags] = useState(() => { const o = {}; LISTA.forEach(([k]) => { o[k] = !modulos || modulos[k] !== false; }); return o; });
  const [saving, setSaving] = useState(false);
  const [baixandoBk, setBaixandoBk] = useState(false);
  async function baixarBackup() {
    setBaixandoBk(true);
    try {
      const tk = localStorage.getItem("instructiva_crm_token") || "";
      const r = await fetch("/api/sistema/backup-download", { headers: tk ? { Authorization: "Bearer " + tk } : {} });
      if (!r.ok) throw new Error("Falha ao baixar (código " + r.status + ")");
      const blob = await r.blob();
      const dispo = r.headers.get("Content-Disposition") || "";
      const m = dispo.match(/filename="?([^"]+)"?/);
      const nome = (m && m[1]) || ("backup-crm-" + new Date().toISOString().slice(0, 10) + ".json");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = nome; document.body.appendChild(a); a.click();
      a.remove(); URL.revokeObjectURL(url);
      showToast("✅ Backup baixado! Guarde num lugar seguro.");
    } catch (e) { showToast("❌ " + e.message); }
    finally { setBaixandoBk(false); }
  }
  const toggle = (k) => setFlags((f) => ({ ...f, [k]: !f[k] }));
  async function salvar() {
    setSaving(true);
    try { await api.setModulos(flags); onSalvo && onSalvo(); showToast("Módulos atualizados"); }
    catch (e) { showToast(e.message); }
    finally { setSaving(false); }
  }
  const ligados = LISTA.filter(([k]) => flags[k]).length;

  // Acesso dos vendedores: o dono liga/desliga o que o vendedor pode ver.
  // [chave, nome, descrição, sensível?, emBreve?]
  const AC_VEND_LISTA = [
    ["crm", "Pipeline", "Vê e move leads no funil — mas só os que são dele.", false, false],
    ["vendas", "Vendas", "Lança as próprias vendas e vê o ranking do time. Não importa planilha nem mexe em venda dos outros.", false, false],
    ["numeros", "Números", "Mostra os tokens da Meta e permite excluir números.", true, true],
  ];
  const [acVend, setAcVend] = useState({});
  const [savingAV, setSavingAV] = useState(false);
  useEffect(() => { api.ofAcessoVend().then((r) => setAcVend(r.acessoVend || {})).catch(() => {}); }, []);
  const toggleAV = (k) => setAcVend((a) => ({ ...a, [k]: !a[k] }));
  async function salvarAV() {
    setSavingAV(true);
    try { await api.ofSetAcessoVend({ crm: !!acVend.crm, temperatura: !!acVend.temperatura, vendas: !!acVend.vendas }); onSalvo && onSalvo(); showToast("Acessos dos vendedores atualizados"); }
    catch (e) { showToast(e.message); }
    finally { setSavingAV(false); }
  }

  return (
    <div className="sist-wrap">
      <div className="sist-alerta">
        <b>Controle do dono.</b> Aqui você escolhe quais partes do sistema ficam ativas nesta cópia. Desligue o que não quer entregar — o menu e o acesso somem pra todo mundo, e nenhum outro admin consegue religar. Ideal pra entregar/vender o sistema com só os módulos combinados.
      </div>
      <div className="sist-box">
        <div className="sist-head">
          <div>
            <h3>Módulos do sistema</h3>
            <p>{ligados} de {LISTA.length} ativos</p>
          </div>
          <button className="onum-add" disabled={saving} onClick={salvar}>{saving ? <span className="spin" /> : <I.check className="ico" />} Salvar</button>
        </div>
        <div className="sist-list">
          {LISTA.map(([k, nome, desc]) => (
            <div className={"sist-item" + (flags[k] ? "" : " off")} key={k}>
              <div className="sist-info">
                <div className="sist-nome">{nome}</div>
                <div className="sist-desc">{desc}</div>
              </div>
              <button className={"sw" + (flags[k] ? " on" : "")} onClick={() => toggle(k)} aria-label={nome}><span className="sw-dot" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="sist-box">
        <div className="sist-head">
          <div>
            <h3>Acesso dos vendedores</h3>
            <p>O que cada vendedor pode ver, além do padrão</p>
          </div>
          <button className="onum-add" disabled={savingAV} onClick={salvarAV}>{savingAV ? <span className="spin" /> : <I.check className="ico" />} Salvar</button>
        </div>
        <div className="sist-dica" style={{ margin: "2px 0 10px" }}>
          No Pipeline, o vendedor enxerga <b>só os leads dele</b>. As opções marcadas como <b>sensível</b> expõem dados delicados — pense bem antes de ligar. As em cinza chegam em breve.
        </div>
        <div className="sist-list">
          {AC_VEND_LISTA.map(([k, nome, desc, sensivel, emBreve]) => (
            <div className={"sist-item" + ((acVend[k] && !emBreve) ? "" : " off")} key={k}>
              <div className="sist-info">
                <div className="sist-nome">
                  {nome}
                  {sensivel && <span style={{ color: "#e0483d", fontWeight: 700, fontSize: 11, marginLeft: 6 }}>· sensível</span>}
                  {emBreve && <span style={{ opacity: .6, fontSize: 11, marginLeft: 6 }}>· em breve</span>}
                </div>
                <div className="sist-desc">{desc}</div>
              </div>
              <button className={"sw" + (acVend[k] && !emBreve ? " on" : "")} onClick={() => { if (!emBreve) toggleAV(k); }} aria-label={nome} disabled={emBreve} style={emBreve ? { opacity: .4, cursor: "not-allowed" } : undefined}><span className="sw-dot" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="sist-dica">Configurações continua sempre disponível (é onde ficam os dados de acesso). A cópia entregue usa as próprias chaves de API do cliente, configuradas no ambiente de hospedagem dele.</div>

      <div className="onum-card" style={{ marginTop: 18 }}>
        <div className="onum-card-h" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <b>Backup do banco</b>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Baixa uma cópia de tudo (conversas, vendas, leads, config) pro seu computador. Guarde num lugar seguro — é a sua rede de segurança.</div>
          </div>
          <button className="onum-add" disabled={baixandoBk} onClick={baixarBackup} style={{ whiteSpace: "nowrap" }}>
            {baixandoBk ? <span className="spin" /> : "⬇"} Baixar backup agora
          </button>
        </div>
      </div>
    </div>
  );
}

// Exportar leads escolhendo por tag OU por etapa do Kanban
function ModalExportar({ leads, etapas, onClose, showToast }) {
  const [modo, setModo] = useState("tag");   // "tag" | "etapa"
  const [sel, setSel] = useState({});        // tags marcadas
  const [selEt, setSelEt] = useState({});    // etapas marcadas
  const [busca, setBusca] = useState("");
  const tags = useMemo(() => {
    const m = {};
    (leads || []).forEach((l) => (l.tags || []).forEach((t) => { const k = String(t).trim(); if (k) m[k] = (m[k] || 0) + 1; }));
    return Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"));
  }, [leads]);
  // contagem de leads por etapa do Kanban
  const etapasCont = useMemo(() => {
    const m = {};
    (leads || []).forEach((l) => { const k = l.etapa || "novo"; m[k] = (m[k] || 0) + 1; });
    return (etapas || []).map((e) => ({ k: e.k, lb: e.lb || e.k, n: m[e.k] || 0 }));
  }, [leads, etapas]);

  const escolhidas = Object.keys(sel).filter((k) => sel[k]);
  const escolhidasEt = Object.keys(selEt).filter((k) => selEt[k]);
  const filtrados = modo === "etapa"
    ? (escolhidasEt.length ? (leads || []).filter((l) => escolhidasEt.includes(l.etapa || "novo")) : (leads || []))
    : (escolhidas.length ? (leads || []).filter((l) => (l.tags || []).some((t) => escolhidas.includes(String(t).trim()))) : (leads || []));
  const semTag = (leads || []).filter((l) => !(l.tags || []).length).length;
  const visiveis = tags.filter(([t]) => t.toLowerCase().includes(busca.trim().toLowerCase()));

  function baixar() {
    if (!filtrados.length) { showToast("Nenhum lead pra exportar"); return; }
    const nomeEt = (k) => (etapas.find((e) => e.k === k) || {}).lb || k;
    const cab = ["Nome", "Telefone", "E-mail", "Valor", "Forma de pagamento", "Curso", "Etapa", "Vendedor", "Tags", "Criado em"];
    const linhas = filtrados.map((l) => [
      l.nome || "", l.telefone || "", l.email || "",
      l.valor ? Number(l.valor).toFixed(2).replace(".", ",") : "",
      l.formaPagamento || "",
      l.curso || "", nomeEt(l.etapa), l.vendedorNome || "",
      (l.tags || []).join(" | "),
      l.criadoEm ? new Date(l.criadoEm).toLocaleString("pt-BR") : "",
    ]);
    const esc = (v) => { const s = String(v == null ? "" : v); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = "\uFEFF" + [cab, ...linhas].map((r) => r.map(esc).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    let sufixo;
    if (modo === "etapa") {
      sufixo = escolhidasEt.length === 1 ? "-etapa-" + nomeEt(escolhidasEt[0]).replace(/[^\w\-]+/g, "_") : escolhidasEt.length ? "-" + escolhidasEt.length + "etapas" : "-todos";
    } else {
      sufixo = escolhidas.length === 1 ? "-" + escolhidas[0].replace(/[^\w\-]+/g, "_") : escolhidas.length ? "-" + escolhidas.length + "tags" : "-todos";
    }
    a.href = url; a.download = "leads" + sufixo + ".csv"; a.click();
    URL.revokeObjectURL(url);
    showToast(`✓ ${filtrados.length} lead(s) exportado(s)`);
    onClose();
  }

  return (
    <div className="pop-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pop-sheet" style={{ maxWidth: 560 }}>
        <div className="pop-head"><b>Exportar leads</b><button className="crm-x" onClick={onClose}>✕</button></div>
        <div className="pop-body">
          {/* seletor: por tag ou por etapa do Kanban */}
          <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
            <button className={"exp-modo" + (modo === "tag" ? " on" : "")} onClick={() => setModo("tag")}
              style={{ flex: 1, padding: "9px 12px", borderRadius: 10, fontWeight: 700, fontSize: 13.5, cursor: "pointer", border: "1px solid " + (modo === "tag" ? "#F26522" : "var(--line)"), background: modo === "tag" ? "rgba(242,101,34,.08)" : "var(--card)", color: modo === "tag" ? "#F26522" : "var(--muted)" }}>
              Por tag
            </button>
            <button className={"exp-modo" + (modo === "etapa" ? " on" : "")} onClick={() => setModo("etapa")}
              style={{ flex: 1, padding: "9px 12px", borderRadius: 10, fontWeight: 700, fontSize: 13.5, cursor: "pointer", border: "1px solid " + (modo === "etapa" ? "#F26522" : "var(--line)"), background: modo === "etapa" ? "rgba(242,101,34,.08)" : "var(--card)", color: modo === "etapa" ? "#F26522" : "var(--muted)" }}>
              Por etapa do Kanban
            </button>
          </div>

          <div className="rsv-hint" style={{ marginTop: 10 }}>
            {modo === "etapa"
              ? <>Escolha as <b>etapas do Kanban</b> que quer exportar. Sem escolher nenhuma, sai <b>tudo</b>.</>
              : <>Escolha as <b>tags</b> que quer exportar. Sem escolher nenhuma, sai <b>tudo</b>.</>}
            {" "}O arquivo vem com nome, telefone, e-mail, valor e a forma de pagamento.
          </div>

          {modo === "etapa" ? (
            <div className="exp-tags">
              {etapasCont.map((e) => (
                <label key={e.k} className={"exp-tag" + (selEt[e.k] ? " on" : "")}>
                  <input type="checkbox" checked={!!selEt[e.k]} onChange={() => setSelEt((s) => ({ ...s, [e.k]: !s[e.k] }))} />
                  <span className="exp-tag-nm">{e.lb}</span>
                  <span className="exp-tag-n">{e.n}</span>
                </label>
              ))}
              {escolhidasEt.length > 0 && (
                <button className="foto-del" style={{ marginTop: 8 }} onClick={() => setSelEt({})}>limpar seleção</button>
              )}
            </div>
          ) : (
            tags.length === 0 ? (
              <div className="of-nova-semtpl" style={{ marginTop: 14 }}>Nenhum lead tem tag ainda — dá pra exportar todos mesmo assim.</div>
            ) : (
              <>
                {tags.length > 8 && (
                  <input className="input" style={{ marginTop: 14 }} placeholder="Buscar tag…" value={busca} onChange={(e) => setBusca(e.target.value)} />
                )}
                <div className="exp-tags">
                  {visiveis.map(([t, n]) => (
                    <label key={t} className={"exp-tag" + (sel[t] ? " on" : "")}>
                      <input type="checkbox" checked={!!sel[t]} onChange={() => setSel((s) => ({ ...s, [t]: !s[t] }))} />
                      <span className="exp-tag-nm">{t}</span>
                      <span className="exp-tag-n">{n}</span>
                    </label>
                  ))}
                  {visiveis.length === 0 && <div className="imp-mais">Nenhuma tag com esse nome.</div>}
                </div>
                {escolhidas.length > 0 && (
                  <button className="foto-del" style={{ marginTop: 8 }} onClick={() => setSel({})}>limpar seleção</button>
                )}
              </>
            )
          )}

          <div className="exp-resumo">
            Vão ser exportados <b>{filtrados.length}</b> lead(s)
            {modo === "etapa"
              ? (escolhidasEt.length ? <> {escolhidasEt.length === 1 ? "da etapa" : "das etapas"} <b>{escolhidasEt.map((k) => (etapas.find((e) => e.k === k) || {}).lb || k).join(", ")}</b></> : <> (todas as etapas)</>)
              : (escolhidas.length ? <> com {escolhidas.length === 1 ? "a tag" : "as tags"} <b>{escolhidas.join(", ")}</b></> : <> (todos)</>)}
            {modo === "tag" && !escolhidas.length && semTag > 0 && <span className="exp-obs"> · {semTag} sem tag nenhuma</span>}
          </div>

          <button className="onum-add" style={{ marginTop: 14, display: "block" }} disabled={!filtrados.length} onClick={baixar}>
            <I.download className="ico" /> Baixar planilha ({filtrados.length})
          </button>
        </div>
      </div>
    </div>
  );
}

// Importar leads de uma planilha CSV
function ModalImportar({ etapas, onClose, onDone, showToast }) {
  const [dados, setDados] = useState(null);
  const [destino, setDestino] = useState((etapas[0] || {}).k || "novo");
  const [distribuir, setDistribuir] = useState("auto");
  const [tag, setTag] = useState("");
  const [importando, setImportando] = useState(false);
  const ref = useRef(null);
  const cols = etapas.length ? etapas : [{ k: "novo", lb: "Novo lead" }];
  const digOk = (t) => { const d = String(t).replace(/\D/g, ""); return d.length >= 10 && d.length <= 13; };

  function lerArquivo(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const { headers, rows } = parseCSV(String(fr.result || ""));
        const acha = (ops) => {
          // procura na ORDEM das opções (a mais específica primeiro), não na ordem das colunas.
          // senão "valor" casaria com "VALOR RECEBIDO" antes de achar "VALOR VENDIDO".
          for (const o of ops) { const i = headers.findIndex((h) => h === o); if (i >= 0) return i; }
          for (const o of ops) { const i = headers.findIndex((h) => h.includes(o)); if (i >= 0) return i; }
          return -1;
        };
        const iNome = acha(["nome", "name"]);
        const iTel = acha(["whatsapp", "telefone", "celular", "fone", "tel", "numero", "número", "phone"]);
        const iEmail = acha(["email", "e-mail", "mail"]);
        const iCurso = acha(["curso", "produto"]);
        const iValor = acha(["valor", "preço", "preco", "price"]);
        if (iNome < 0 && iTel < 0) { showToast("Não achei colunas de nome/telefone no arquivo"); return; }
        const leads = rows.map((r) => ({
          nome: iNome >= 0 ? (r[iNome] || "") : "",
          telefone: iTel >= 0 ? (r[iTel] || "") : "",
          email: iEmail >= 0 ? (r[iEmail] || "") : "",
          curso: iCurso >= 0 ? (r[iCurso] || "") : "",
          valor: iValor >= 0 ? (r[iValor] || "") : "",
        }));
        const validos = leads.filter((l) => digOk(l.telefone)).length;
        setDados({ leads, total: leads.length, validos });
      } catch (err) { showToast("Não consegui ler o arquivo. Confira se é um CSV."); }
    };
    fr.readAsText(file, "utf-8");
  }

  async function importar() {
    if (!dados || !dados.validos) { showToast("Nenhum lead válido pra importar"); return; }
    setImportando(true);
    try {
      const r = await api.ofCrmImportar({ leads: dados.leads, destino, distribuir, tag });
      showToast(`✓ ${r.criados} importados${r.pulados ? " · " + r.pulados + " pulados" : ""}`);
      onDone(); onClose();
    } catch (e) { showToast("✗ " + e.message); } finally { setImportando(false); }
  }

  return (
    <div className="pop-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pop-sheet" style={{ maxWidth: 620 }}>
        <div className="pop-head"><b>Importar leads de planilha</b><button className="crm-x" onClick={onClose}>✕</button></div>
        <div className="pop-body">
          <div className="rsv-hint" style={{ marginTop: 0 }}>Suba um <b>CSV</b> com colunas de <b>nome</b> e <b>telefone</b> (e, se quiser, e-mail, curso, valor). O sistema reconhece as colunas pelo nome. Telefones repetidos são pulados.</div>
          <input ref={ref} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={lerArquivo} />
          <button className="btn btn-on" style={{ marginTop: 12 }} onClick={() => ref.current && ref.current.click()}><I.download className="ico" /> Escolher arquivo CSV</button>

          {dados && (
            <>
              <div className="imp-resumo"><b>{dados.total}</b> linhas · <b style={{ color: "var(--brand)" }}>{dados.validos}</b> válidas{dados.total - dados.validos > 0 ? ` · ${dados.total - dados.validos} sem nome/telefone` : ""}</div>
              <div className="imp-preview">
                {dados.leads.slice(0, 3).map((l, i) => <div key={i} className="imp-row"><b>{l.nome || "—"}</b> · {l.telefone || "—"}{l.curso ? " · " + l.curso : ""}</div>)}
                {dados.total > 3 && <div className="imp-mais">…e mais {dados.total - 3} linha(s)</div>}
              </div>
              <div className="rsv-f2" style={{ marginTop: 14 }}>
                <div><label className="lbl-mini">Cai na coluna</label><select className="input" value={destino} onChange={(e) => setDestino(e.target.value)}>{cols.map((e) => <option key={e.k} value={e.k}>{e.lb}</option>)}</select></div>
                <div><label className="lbl-mini">Distribuição</label><select className="input" value={distribuir} onChange={(e) => setDistribuir(e.target.value)}><option value="auto">Automática (entre os vendedores)</option><option value="manual">Sem dono</option></select></div>
              </div>
              <div style={{ marginTop: 10 }}><label className="lbl-mini">Tag (opcional)</label><input className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Ex.: Lista antiga" /></div>
              <button className="onum-add" style={{ marginTop: 16, display: "block" }} disabled={importando || !dados.validos} onClick={importar}>{importando ? "Importando…" : `Importar ${dados.validos} leads`}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Gerenciador de colunas do Pipeline (criar, renomear, mudar cor, apagar)
// v2.1 — editor de colunas do Pipeline: arrastar pra ordenar, cores prontas, renomear na hora,
// contagem de leads e escolha de pra onde vão os leads quando uma coluna é apagada.
const CORES_COLUNA = ["#8b5cf6", "#6366f1", "#3b82f6", "#0ea5e9", "#14b8a6", "#22c55e", "#84cc16", "#eab308", "#f59e0b", "#f97316", "#ef4444", "#ec4899", "#64748b"];
function ModalColunas({ etapas, leads = [], onClose, onChanged, showToast }) {
  const [lista, setLista] = useState(etapas);
  const [novoNome, setNovoNome] = useState("");
  const [novaCor, setNovaCor] = useState(CORES_COLUNA[2]);
  const [busy, setBusy] = useState(false);
  const [corAberta, setCorAberta] = useState(null);
  const [apagando, setApagando] = useState(null); // { k, destino }
  const [arrastando, setArrastando] = useState(null);
  const [nomes, setNomes] = useState({});
  useEffect(() => { setLista(etapas); }, [etapas]);
  const qtd = useMemo(() => { const m = {}; leads.forEach((l) => { m[l.etapa] = (m[l.etapa] || 0) + 1; }); return m; }, [leads]);

  async function add() {
    if (!novoNome.trim()) { showToast("Dê um nome à coluna"); return; }
    setBusy(true);
    try { await api.ofCrmEtapaCriar({ lb: novoNome.trim(), cor: novaCor }); setNovoNome(""); showToast("✓ Coluna criada"); onChanged(); }
    catch (e) { showToast("✗ " + e.message); } finally { setBusy(false); }
  }
  async function salvar(k, campo, valor) {
    setLista((l) => l.map((e) => (e.k === k ? { ...e, [campo]: valor } : e)));
    try { await api.ofCrmEtapaEditar(k, { [campo]: valor }); onChanged(); } catch (e) { showToast("✗ " + e.message); onChanged(); }
  }
  function salvarNome(e) {
    const v = (nomes[e.k] !== undefined ? nomes[e.k] : e.lb).trim();
    if (v && v !== e.lb) { salvar(e.k, "lb", v); showToast("✓ Coluna renomeada"); }
    setNomes((n) => { const x = { ...n }; delete x[e.k]; return x; });
  }
  async function gravarOrdem(nova) {
    setLista(nova);
    try { await api.ofReordenarEtapas(nova.map((e) => e.k)); onChanged(); } catch (e) { showToast("✗ " + e.message); onChanged(); }
  }
  function mover(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= lista.length) return;
    const nova = lista.slice(); const t = nova[i]; nova[i] = nova[j]; nova[j] = t;
    gravarOrdem(nova);
  }
  function aoArrastarSobre(ev, i) {
    ev.preventDefault();
    if (arrastando === null || arrastando === i) return;
    const nova = lista.slice(); const [item] = nova.splice(arrastando, 1); nova.splice(i, 0, item);
    setLista(nova); setArrastando(i);
  }
  async function confirmarApagar(e) {
    const n = qtd[e.k] || 0;
    const destino = apagando && apagando.destino;
    setBusy(true);
    try {
      if (n > 0 && destino) {
        const ids = leads.filter((l) => l.etapa === e.k).map((l) => l.id);
        await api.ofCrmLoteEtapa({ ids, etapa: destino });
      }
      await api.ofCrmEtapaExcluir(e.k);
      showToast("✓ Coluna apagada" + (n ? " e " + n + " lead(s) movido(s)" : ""));
      setApagando(null); onChanged();
    } catch (er) { showToast("✗ " + er.message); } finally { setBusy(false); }
  }

  return (
    <div className="pop-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pop-sheet cols-sheet">
        <div className="cols-head">
          <div>
            <b>Colunas do Pipeline</b>
            <span>Arraste para mudar a ordem. Clique no nome para renomear e na bolinha para trocar a cor.</span>
          </div>
          <button className="crm-x" onClick={onClose} aria-label="Fechar"><I.x className="ico" /></button>
        </div>
        <div className="cols-body">
          <ol className="cols-lista">
            {lista.map((e, i) => {
              const n = qtd[e.k] || 0;
              const emApagar = apagando && apagando.k === e.k;
              return (
                <li key={e.k} className={"cols-item" + (arrastando === i ? " arrastando" : "")}
                  draggable={!emApagar} onDragStart={() => setArrastando(i)} onDragOver={(ev) => aoArrastarSobre(ev, i)}
                  onDragEnd={() => { if (arrastando !== null) gravarOrdem(lista); setArrastando(null); }}>
                  <div className="cols-linha">
                    <span className="cols-alca" title="Arraste para mudar a ordem" aria-hidden="true">⋮⋮</span>
                    <button type="button" className="cols-cor" style={{ background: e.cor }} onClick={() => setCorAberta(corAberta === e.k ? null : e.k)} title="Trocar a cor" aria-label={"Trocar a cor de " + e.lb} />
                    <input className="cols-nome" value={nomes[e.k] !== undefined ? nomes[e.k] : e.lb} aria-label="Nome da coluna"
                      onChange={(ev) => setNomes({ ...nomes, [e.k]: ev.target.value })} onBlur={() => salvarNome(e)}
                      onKeyDown={(ev) => { if (ev.key === "Enter") ev.currentTarget.blur(); }} />
                    <span className="cols-qtd" title="Leads nesta coluna">{n} {n === 1 ? "lead" : "leads"}</span>
                    <div className="cols-btns">
                      <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} title="Subir" aria-label="Subir"><I.chevron className="ico" style={{ transform: "rotate(180deg)" }} /></button>
                      <button type="button" onClick={() => mover(i, 1)} disabled={i === lista.length - 1} title="Descer" aria-label="Descer"><I.chevron className="ico" /></button>
                      <button type="button" className="del" disabled={lista.length <= 1} onClick={() => setApagando(emApagar ? null : { k: e.k, destino: (lista.find((x) => x.k !== e.k) || {}).k })} title="Apagar coluna" aria-label="Apagar coluna"><I.trash className="ico" /></button>
                    </div>
                  </div>
                  {corAberta === e.k && (
                    <div className="cols-paleta">
                      {CORES_COLUNA.map((c) => (
                        <button type="button" key={c} className={"cols-sw" + (c.toLowerCase() === String(e.cor).toLowerCase() ? " on" : "")} style={{ background: c }} onClick={() => { salvar(e.k, "cor", c); setCorAberta(null); }} aria-label={"Cor " + c} />
                      ))}
                      <label className="cols-sw outra" title="Outra cor"><input type="color" defaultValue={e.cor} onBlur={(ev) => { if (ev.target.value !== e.cor) salvar(e.k, "cor", ev.target.value); setCorAberta(null); }} />+</label>
                    </div>
                  )}
                  {emApagar && (
                    <div className="cols-apagar">
                      {n > 0 ? (
                        <>
                          <span>Os <b>{n} {n === 1 ? "lead" : "leads"}</b> desta coluna vão para:</span>
                          <select className="input" value={apagando.destino || ""} onChange={(ev) => setApagando({ ...apagando, destino: ev.target.value })}>
                            {lista.filter((x) => x.k !== e.k).map((x) => <option key={x.k} value={x.k}>{x.lb}</option>)}
                          </select>
                        </>
                      ) : <span>Esta coluna está vazia. Pode apagar sem medo.</span>}
                      <div className="cols-apagar-btns">
                        <button type="button" className="btn btn-sm" onClick={() => setApagando(null)}>Cancelar</button>
                        <button type="button" className="btn btn-sm btn-danger" disabled={busy} onClick={() => confirmarApagar(e)}>Apagar coluna</button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          <div className="cols-nova">
            <div className="cols-nova-t">Nova coluna</div>
            <div className="cols-linha">
              <span className="cols-cor fixa" style={{ background: novaCor }} />
              <input className="cols-nome" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex.: Proposta enviada" onKeyDown={(e) => e.key === "Enter" && add()} />
              <button className="btn btn-primary btn-sm" disabled={busy || !novoNome.trim()} onClick={add}><I.plus className="ico" style={{ width: 14, height: 14 }} /> Criar</button>
            </div>
            <div className="cols-paleta">
              {CORES_COLUNA.map((c) => <button type="button" key={c} className={"cols-sw" + (c === novaCor ? " on" : "")} style={{ background: c }} onClick={() => setNovaCor(c)} aria-label={"Cor " + c} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Gerenciador de Listas de Reserva (captação). Cada lista = um lançamento (curso+valor)
// com um link público /r/<slug> pra mandar pra galera. Os leads caem no Pipeline distribuídos.
function ModalReservaListas({ onClose, showToast, etapas = [], vendedores = [] }) {
  const [listas, setListas] = useState(null);
  const [nome, setNome] = useState("");
  const [curso, setCurso] = useState("");
  const [tag, setTag] = useState("");
  const [destino, setDestino] = useState("reserva");
  const [distribuir, setDistribuir] = useState("auto");
  const [vendedorFixo, setVendedorFixo] = useState("");
  const [recebedores, setRecebedores] = useState([]); // ids selecionados (modo equipe)
  const [responsavel, setResponsavel] = useState("");
  const [editando, setEditando] = useState(null); // lista sendo editada
  const [histLista, setHistLista] = useState(null); // lista do "ver histórico"
  const toggleRec = (id) => setRecebedores((a) => a.includes(id) ? a.filter((x) => x !== id) : [...a, id]);
  const [opcoes, setOpcoes] = useState([{ forma: "", preco: "" }]);
  const [criando, setCriando] = useState(false);
  const setOpc = (i, k, v) => setOpcoes((a) => a.map((o, j) => (j === i ? { ...o, [k]: v } : o)));
  const addOpc = () => setOpcoes((a) => (a.length < 3 ? [...a, { forma: "", preco: "" }] : a));
  const delOpc = (i) => setOpcoes((a) => (a.length > 1 ? a.filter((_, j) => j !== i) : a));
  const cols = etapas.length ? etapas : [{ k: "reserva", lb: "Lista de reserva" }, { k: "novo", lb: "Novo lead" }];
  const nomeCol = (k) => (cols.find((e) => e.k === k) || {}).lb || k;
  const carregar = () => api.ofReservaListas().then((r) => setListas(r.listas || [])).catch((e) => showToast("✗ " + e.message));
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, []);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function criar() {
    if (!nome.trim()) { showToast("Dê um nome à lista"); return; }
    if (distribuir === "fixo" && !vendedorFixo) { showToast("Escolha o vendedor que vai receber os leads desta lista"); return; }
    if (distribuir === "equipe" && recebedores.length === 0) { showToast("Escolha pelo menos uma pessoa para a equipe desta lista"); return; }
    const ops = opcoes.map((o) => ({ forma: o.forma.trim(), preco: parseFloat(o.preco) || 0 })).filter((o) => o.forma || o.preco > 0);
    setCriando(true);
    try { await api.ofReservaCriar({ nome, curso, tag, opcoes: ops, destino, distribuir, vendedorFixoId: vendedorFixo, recebedoresIds: recebedores, responsavelId: responsavel }); setNome(""); setCurso(""); setTag(""); setOpcoes([{ forma: "", preco: "" }]); setDestino("reserva"); setDistribuir("auto"); setVendedorFixo(""); setRecebedores([]); setResponsavel(""); showToast("✓ Lista criada"); carregar(); }
    catch (e) { showToast("✗ " + e.message); } finally { setCriando(false); }
  }
  async function toggle(l) { try { await api.ofReservaEditar(l.id, { ativa: !l.ativa }); carregar(); } catch (e) { showToast("✗ " + e.message); } }
  async function excluir(l) { if (!window.confirm('Excluir a lista "' + l.nome + '"? Os leads que já entraram continuam no Pipeline.')) return; try { await api.ofReservaExcluir(l.id); carregar(); } catch (e) { showToast("✗ " + e.message); } }
  function copiarUrl(url, oque) { if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => showToast("✓ " + (oque || "Link") + " copiado")).catch(() => showToast(url)); else showToast(url); }

  return (
    <div className="pop-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pop-sheet" style={{ maxWidth: 720 }}>
        <div className="pop-head"><b>Listas de reserva</b><button className="crm-x" onClick={onClose}>✕</button></div>
        <div className="pop-body">
          <div className="rsv-nova">
            <div className="rsv-nova-tit">Nova lista — um lançamento</div>
            <div className="rsv-f3">
              <div><label className="lbl-mini">Nome da lista</label><input className="input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Turma de Março" /></div>
              <div><label className="lbl-mini">Curso</label><input className="input" value={curso} onChange={(e) => setCurso(e.target.value)} placeholder="Nome do curso" /></div>
              <div><label className="lbl-mini">Tag do lead</label><input className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Ex: Reserva Março" /></div>
            </div>
            <label className="lbl-mini" style={{ marginTop: 14, display: "block" }}>Opções de pagamento — o lead escolhe uma (até 3)</label>
            {opcoes.map((o, i) => (
              <div className="rsv-opc-row" key={i}>
                <input className="input" value={o.forma} onChange={(e) => setOpc(i, "forma", e.target.value)} placeholder="Forma (ex: 12x no cartão)" />
                <input className="input" value={o.preco} onChange={(e) => setOpc(i, "preco", e.target.value)} placeholder="Preço" style={{ maxWidth: 130 }} />
                {opcoes.length > 1 && <button className="rsv-opc-del" onClick={() => delOpc(i)} title="Remover opção">✕</button>}
              </div>
            ))}
            {opcoes.length < 3 && <button className="rsv-opc-add" onClick={addOpc}>+ adicionar opção</button>}
            <div className="rsv-f2" style={{ marginTop: 14 }}>
              <div>
                <label className="lbl-mini">Cai na coluna do Pipeline</label>
                <select className="input" value={destino} onChange={(e) => setDestino(e.target.value)}>
                  {cols.map((e) => <option key={e.k} value={e.k}>{e.lb}</option>)}
                </select>
              </div>
              <div>
                <label className="lbl-mini">Distribuição</label>
                <select className="input" value={distribuir} onChange={(e) => setDistribuir(e.target.value)}>
                  <option value="auto">Automática (divide entre os vendedores)</option>
                  <option value="fixo">Vendedor específico (só ele recebe)</option>
                  <option value="equipe">Equipe da lista (rodízio entre os escolhidos)</option>
                  <option value="manual">Sem dono (eu distribuo na mão)</option>
                </select>
              </div>
            </div>
            {distribuir === "equipe" && (
              <div className="rsv-campo">
                <label>Quem recebe (rodízio só entre eles)</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 6, maxHeight: 160, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 10, padding: 8 }}>
                  {vendedores.filter((v) => v.ativo !== false).map((v) => {
                    const on = recebedores.includes(v.id);
                    return (
                      <label key={v.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, border: "1px solid " + (on ? "var(--brand)" : "var(--line)"), background: on ? "var(--nav-hover)" : "var(--card)", cursor: "pointer", fontSize: 13 }}>
                        <input type="checkbox" checked={on} onChange={() => toggleRec(v.id)} style={{ accentColor: "var(--brand)" }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.nome}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            {distribuir === "fixo" && (
              <div style={{ marginTop: 10 }}>
                <label className="lbl-mini">Vendedor que vai receber TODOS os leads desta lista</label>
                <select className="input" value={vendedorFixo} onChange={(e) => setVendedorFixo(e.target.value)}>
                  <option value="">Escolha o vendedor…</option>
                  {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}{v.ehGerente ? " (gerente)" : ""}</option>)}
                </select>
              </div>
            )}
            <div className="rsv-hint">{distribuir === "auto" ? 'Automática: divide entre os vendedores. QUEM recebe e QUANTO cada um você define em "Quem recebe os leads" (botão no topo do Pipeline) — vale pra todas as listas automáticas e muda na hora. Aqui você só gera o link.' : distribuir === "fixo" ? "Vendedor específico: TODO lead que entrar por esta lista cai direto pra pessoa escolhida — não passa pelo rodízio. Perfeito quando cada produto/formulário do Meta é de um vendedor. O rodízio das outras listas continua igual." : "Sem dono: todo lead cai sem vendedor e você escolhe pra quem vai, um por um, dentro do Pipeline."}</div>
            <button className="onum-add" style={{ marginTop: 14, display: "block" }} disabled={criando} onClick={criar}><I.plus className="ico" /> Criar lista e gerar link</button>
          </div>

          {listas === null ? <div className="rsv-vazio">Carregando…</div> : listas.length === 0 ? (
            <div className="rsv-vazio">Nenhuma lista ainda. Crie a primeira acima — ela gera um link pra você mandar pra galera.</div>
          ) : (
            <div className="rsv-list">
              {listas.map((l) => (
                <div className={"rsv-item" + (l.ativa ? "" : " off")} key={l.id}>
                  <div className="rsv-info">
                    <div className="rsv-nome">{l.nome} {!l.ativa && <span className="rsv-off-tag">pausada</span>}</div>
                    <div className="rsv-meta">{l.curso || "sem curso"}{l.tag ? " · 🏷 " + l.tag : ""} · <b>{l.leads}</b> {l.leads === 1 ? "lead" : "leads"}</div>
                    {(l.opcoes || []).length > 0 && <div className="rsv-opcs-mini">{l.opcoes.map((o, i) => <span key={i} className="rsv-opc-chip">{o.forma} · R$ {Number(o.preco || 0).toLocaleString("pt-BR")}</span>)}</div>}
                    <div className="rsv-dest">→ cai em <b>{nomeCol(l.destino)}</b> · {l.distribuir === "manual" ? "sem dono (você distribui)" : l.distribuir === "fixo" ? <>só pra <b>{l.vendedorFixoNome || "vendedor"}</b></> : l.distribuir === "equipe" ? <>rodízio entre <b>{(l.recebedores || []).map((r) => r.nome).join(", ") || "equipe"}</b></> : "distribuição automática"}{l.responsavelNome ? <> · resp.: {l.responsavelNome}</> : null}</div>
                    <div className="rsv-link api" onClick={() => copiarUrl(origin + "/api/reserva/" + l.slug, "Endpoint")} title="Clique pra copiar — é o endpoint que o time usa pra cair lead no CRM">
                      <span className="rsv-link-tag">Endpoint · POST</span>
                      <span className="rsv-link-url">{origin}/api/reserva/{l.slug}</span>
                      <span className="rsv-copy">copiar</span>
                    </div>
                  </div>
                  <div className="rsv-acoes">
                    <button className={"sw" + (l.ativa ? " on" : "")} onClick={() => toggle(l)} title={l.ativa ? "Pausar (fecha o link)" : "Reabrir a lista"}><span className="sw-dot" /></button>
                    <button className="onum-acao" onClick={() => setEditando(l)} title="Editar lista"><I.cog className="ico" /></button>
                    <button className="onum-acao" onClick={() => setHistLista(l)} title="Ver histórico de alterações"><I.clock className="ico" /></button>
                    <button className="onum-acao del" onClick={() => excluir(l)} title="Arquivar lista"><I.trash className="ico" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {editando && <EditarListaModal lista={editando} etapas={cols} vendedores={vendedores} onClose={() => setEditando(null)} onSaved={() => { setEditando(null); carregar(); }} showToast={showToast} />}
      {histLista && <HistoricoListaModal lista={histLista} onClose={() => setHistLista(null)} showToast={showToast} />}
    </div>
  );
}

// Modal de EDITAR lista de captação (reusa os mesmos campos da criação + equipe/responsável)
function EditarListaModal({ lista, etapas = [], vendedores = [], onClose, onSaved, showToast }) {
  const [nome, setNome] = useState(lista.nome || "");
  const [curso, setCurso] = useState(lista.curso || "");
  const [tag, setTag] = useState(lista.tag || "");
  const [destino, setDestino] = useState(lista.destino || "reserva");
  const [distribuir, setDistribuir] = useState(lista.distribuir || "auto");
  const [vendedorFixo, setVendedorFixo] = useState(lista.vendedorFixoId || "");
  const [recebedores, setRecebedores] = useState(Array.isArray(lista.recebedoresIds) ? lista.recebedoresIds : []);
  const [responsavel, setResponsavel] = useState(lista.responsavelId || "");
  const [opcoes, setOpcoes] = useState((lista.opcoes && lista.opcoes.length) ? lista.opcoes.map((o) => ({ forma: o.forma || "", preco: String(o.preco || "") })) : [{ forma: "", preco: "" }]);
  const [salvando, setSalvando] = useState(false);
  const cols = etapas.length ? etapas : [{ k: "reserva", lb: "Lista de reserva" }];
  const setOpc = (i, k, v) => setOpcoes((a) => a.map((o, j) => (j === i ? { ...o, [k]: v } : o)));
  const addOpc = () => setOpcoes((a) => (a.length < 3 ? [...a, { forma: "", preco: "" }] : a));
  const delOpc = (i) => setOpcoes((a) => (a.length > 1 ? a.filter((_, j) => j !== i) : a));
  const toggleRec = (id) => setRecebedores((a) => a.includes(id) ? a.filter((x) => x !== id) : [...a, id]);

  async function salvar() {
    if (!nome.trim()) { showToast("O nome não pode ficar vazio"); return; }
    if (distribuir === "fixo" && !vendedorFixo) { showToast("Escolha o vendedor fixo"); return; }
    if (distribuir === "equipe" && recebedores.length === 0) { showToast("Escolha pelo menos uma pessoa para a equipe"); return; }
    // avisa que só vale pros próximos leads quando muda algo que afeta distribuição/tag/coluna
    const mudouSensivel = tag !== (lista.tag || "") || destino !== (lista.destino || "reserva") || distribuir !== (lista.distribuir || "auto") || vendedorFixo !== (lista.vendedorFixoId || "") || JSON.stringify(recebedores) !== JSON.stringify(lista.recebedoresIds || []);
    if (mudouSensivel && !window.confirm("As alterações serão aplicadas somente aos PRÓXIMOS leads. Os leads que já entraram no Pipeline não serão modificados.\n\nConfirmar?")) return;
    const ops = opcoes.map((o) => ({ forma: (o.forma || "").trim(), preco: parseFloat(o.preco) || 0 })).filter((o) => o.forma || o.preco > 0);
    setSalvando(true);
    try {
      const r = await api.ofReservaEditar(lista.id, { nome, curso, tag, opcoes: ops, destino, distribuir, vendedorFixoId: vendedorFixo, recebedoresIds: recebedores, responsavelId: responsavel, atualizadoEm: lista.atualizadoEm });
      showToast(r && r.semMudanca ? "Nada mudou" : "✓ Lista atualizada");
      onSaved();
    } catch (e) {
      if (String(e.message || "").includes("alterada por outra")) showToast("⚠ " + e.message);
      else showToast("✗ " + e.message);
      setSalvando(false);
    }
  }

  return (
    <div className="pop-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pop-sheet" style={{ maxWidth: 560 }}>
        <div className="pop-head"><b>Editar lista</b><button className="crm-x" onClick={onClose}>✕</button></div>
        <div style={{ padding: 18, overflowY: "auto" }}>
          <div className="rsv-campo"><label>Nome da lista</label><input className="input" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} /></div>
          <div className="rsv-campo"><label>Curso / interesse</label><input className="input" value={curso} onChange={(e) => setCurso(e.target.value)} maxLength={120} /></div>
          <div className="rsv-campo"><label>Tag aplicada aos novos leads</label><input className="input" value={tag} onChange={(e) => setTag(e.target.value)} maxLength={40} /></div>
          <div className="rsv-campo"><label>Coluna de destino no Pipeline</label>
            <select className="input" value={destino} onChange={(e) => setDestino(e.target.value)}>{cols.map((e) => <option key={e.k} value={e.k}>{e.lb}</option>)}</select>
          </div>
          <div className="rsv-campo"><label>Opções de pagamento</label>
            {opcoes.map((o, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input className="input" placeholder="Forma (ex: à vista)" value={o.forma} onChange={(e) => setOpc(i, "forma", e.target.value)} style={{ flex: 2 }} />
                <input className="input" placeholder="Preço" value={o.preco} onChange={(e) => setOpc(i, "preco", e.target.value)} style={{ flex: 1 }} />
                {opcoes.length > 1 && <button className="onum-acao del" onClick={() => delOpc(i)}><I.trash className="ico" /></button>}
              </div>
            ))}
            {opcoes.length < 3 && <button className="btn btn-sm" onClick={addOpc}>+ opção</button>}
          </div>
          <div className="rsv-campo"><label>Distribuição</label>
            <select className="input" value={distribuir} onChange={(e) => setDistribuir(e.target.value)}>
              <option value="auto">Automática (divide entre os vendedores)</option>
              <option value="fixo">Vendedor específico (só ele recebe)</option>
              <option value="equipe">Equipe da lista (rodízio entre os escolhidos)</option>
              <option value="manual">Sem dono (eu distribuo na mão)</option>
            </select>
          </div>
          {distribuir === "fixo" && (
            <div className="rsv-campo"><label>Vendedor que recebe TODOS os leads</label>
              <select className="input" value={vendedorFixo} onChange={(e) => setVendedorFixo(e.target.value)}>
                <option value="">Escolha…</option>
                {vendedores.filter((v) => v.ativo !== false).map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
              </select>
            </div>
          )}
          {distribuir === "equipe" && (
            <div className="rsv-campo"><label>Quem recebe (rodízio só entre eles)</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 6, maxHeight: 160, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 10, padding: 8 }}>
                {vendedores.filter((v) => v.ativo !== false).map((v) => {
                  const on = recebedores.includes(v.id);
                  return (
                    <label key={v.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, border: "1px solid " + (on ? "var(--brand)" : "var(--line)"), background: on ? "var(--nav-hover)" : "var(--card)", cursor: "pointer", fontSize: 13 }}>
                      <input type="checkbox" checked={on} onChange={() => toggleRec(v.id)} style={{ accentColor: "var(--brand)" }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.nome}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <div className="rsv-campo"><label>Responsável pela lista (opcional, só administrativo)</label>
            <select className="input" value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
              <option value="">Ninguém</option>
              {vendedores.filter((v) => v.ativo !== false).map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
            <button className="btn" onClick={onClose} disabled={salvando}>Cancelar</button>
            <button className="btn btn-primary" onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar alterações"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal do HISTÓRICO de alterações da lista (só leitura)
function HistoricoListaModal({ lista, onClose, showToast }) {
  const [hist, setHist] = useState(null);
  useEffect(() => { api.ofReservaHistorico(lista.id).then((r) => setHist(r.historico || [])).catch((e) => { showToast("✗ " + e.message); setHist([]); }); /* eslint-disable-next-line */ }, []);
  const rotAcao = (a) => ({ lista_criada: "Lista criada", lista_editada: "Editada", lista_pausada: "Pausada", lista_reativada: "Reativada", lista_arquivada: "Arquivada" }[a] || a);
  const quando = (ts) => { try { return new Date(ts).toLocaleString("pt-BR"); } catch (_) { return ""; } };
  return (
    <div className="pop-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pop-sheet" style={{ maxWidth: 560 }}>
        <div className="pop-head"><b>Histórico — {lista.nome}</b><button className="crm-x" onClick={onClose}>✕</button></div>
        <div style={{ padding: 18, overflowY: "auto", maxHeight: "70vh" }}>
          {hist === null ? <div style={{ color: "var(--muted)", textAlign: "center", padding: 20 }}>Carregando…</div>
            : hist.length === 0 ? <div style={{ color: "var(--muted)", textAlign: "center", padding: 20 }}>Nenhuma alteração registrada.</div>
              : hist.map((h) => (
                <div key={h.id} style={{ borderLeft: "3px solid var(--brand)", background: "var(--surface-2)", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <b style={{ fontSize: 13.5 }}>{rotAcao(h.acao)}</b>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{quando(h.ts)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>por {h.usuarioNome || "—"}</div>
                  {h.alteracoes && Object.keys(h.alteracoes).length > 0 && (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                      {Object.entries(h.alteracoes).map(([campo, v]) => (
                        <div key={campo} style={{ fontSize: 12.5, color: "var(--ink)" }}>
                          <b>{({ nome: "Nome", curso: "Curso", tag: "Tag", destino: "Coluna", distribuir: "Distribuição", vendedorFixoId: "Vendedor fixo", recebedoresIds: "Equipe", responsavelId: "Responsável", ativa: "Status", opcoes: "Pagamento" }[campo]) || campo}:</b> <span style={{ color: "var(--muted)", textDecoration: "line-through" }}>{String(v.antes)}</span> → <span style={{ color: "var(--brand)", fontWeight: 600 }}>{String(v.depois)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}

// Modal reutilizável: cadastra um lead direto no Pipeline a partir de uma conversa
// (usado tanto na caixa Oficial quanto na Não oficial). Só o gerente enxerga o botão,
// porque o Pipeline é gerente-only no servidor.
function ModalCadastrarPipeline({ prefill, onClose, showToast }) {
  const [etapas, setEtapas] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    nome: (prefill && prefill.nome) || "",
    telefone: (prefill && prefill.telefone) || "",
    email: "",
    curso: "",
    valor: "",
    etapa: "novo",
    vendedorId: "",
  });

  useEffect(() => {
    api.ofCRM()
      .then((d) => { setEtapas(d.etapas || []); setVendedores(d.vendedores || []); })
      .catch((e) => showToast("✗ " + e.message))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line
  }, []);

  async function salvar() {
    if (!form.nome.trim()) { showToast("Dê um nome ao lead"); return; }
    setSalvando(true);
    try {
      await api.ofCrmCriar(form);
      showToast("✓ Lead cadastrado no Pipeline");
      onClose();
    } catch (e) { showToast("✗ " + e.message); }
    finally { setSalvando(false); }
  }

  return (
    <Portal>
      <div className="crm-modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="crm-modal" style={{ maxWidth: 440 }}>
          <div className="crm-modal-head"><b>Cadastrar no Pipeline</b><button className="crm-x" onClick={onClose}>✕</button></div>
          <div className="crm-modal-body">
            <label className="lbl-mini">Nome *</label>
            <input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome do lead" autoFocus />
            <div className="crm-f2" style={{ marginTop: 10 }}>
              <div><label className="lbl-mini">Telefone</label><input className="input mono" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="44 99999-9999" /></div>
              <div><label className="lbl-mini">Valor (R$)</label><input className="input" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="0" /></div>
            </div>
            <div className="crm-f2" style={{ marginTop: 10 }}>
              <div><label className="lbl-mini">E-mail</label><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" /></div>
              <div><label className="lbl-mini">Curso</label><input className="input" value={form.curso} onChange={(e) => setForm({ ...form, curso: e.target.value })} placeholder="Nome do curso" /></div>
            </div>
            <div className="crm-f2" style={{ marginTop: 10 }}>
              <div><label className="lbl-mini">Etapa</label>
                <select className="input" value={form.etapa} onChange={(e) => setForm({ ...form, etapa: e.target.value })}>{etapas.map((et) => <option key={et.k} value={et.k}>{et.lb}</option>)}</select>
              </div>
              <div><label className="lbl-mini">Vendedor</label>
                <select className="input" value={form.vendedorId} onChange={(e) => setForm({ ...form, vendedorId: e.target.value })}><option value="">Sem dono</option>{vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}{v.ehGerente ? " (gerente)" : ""}</option>)}</select>
              </div>
            </div>
            <button className="onum-add" style={{ marginTop: 16, width: "100%", justifyContent: "center" }} onClick={salvar} disabled={salvando || carregando}>{salvando ? "Cadastrando…" : "Cadastrar no Pipeline"}</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ---- Comemoração ao mover o lead pra Ganho / Perdido ----
// Descobre pelo nome da coluna se é vitória ou perda (funciona com as colunas que já existem)
function tipoDaColuna(lb) {
  const t = (lb || "").toLowerCase();
  if (/ganho|ganha|vendid|venda|matricul|fechad|fechou|convertid|sucesso/.test(t)) return "ganho";
  if (/perdid|perda|perdeu|descartad|sem interesse|desistiu|não quis|nao quis/.test(t)) return "perda";
  return null;
}
// Frases que aparecem na comemoração (sorteia uma a cada venda)
const CURSOS = [
  "AMPLIFICADORES",
  "ANÁLISE DC AVANÇADA",
  "ELETRÔNICA DE POTÊNCIA",
  "ELETRÔNICA DIGITAL",
  "ELETRÔNICA INICIAL",
  "EMAC",
  "EMAC 3.0",
  "EMAC 4.0",
  "ESTEIRAS",
  "FONTE DE GAME",
  "FONTES CHAVEADAS",
  "IMERSÃO EM ANÁLISE DE DEFEITOS",
  "INTELIGÊNCIA ARTIFICIAL",
  "INVERTER",
  "LIVRO ANÁLISE DE CIRCUITOS",
  "LIVRO FONTES FLYBACK",
  "LIVRO FONTES RETIFICADOR PFC",
  "LIVRO POTÊNCIA CONVERSORES CC-CC",
  "LIVRO POTÊNCIA RETIFICADORES",
  "LIVRO POTÊNCIA SEMICONDUTORES",
  "MANUSEIO DE OSCILOSCÓPIO",
  "NOBREAK",
  "ODONTO",
  "PROGRAMAÇÃO",
  "SOFT-STARTER",
  "SOLAR",
  "TELEVISORES",
  "TMTD",
];
const PLATAFORMAS = ["Hotmart", "Greenn", "Guru", "TMB", "Assiny", "Cademi", "Pix direto", "Outra"];
const FORMAS_PG = ["Pix", "Cartão", "Boleto", "Recorrência", "Dinheiro", "Outro"];
const dinheiro = (n) => "R$ " + Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dinheiroCurto = (n) => {
  const v = Number(n || 0);
  if (v >= 1000000) return "R$ " + (v / 1000000).toFixed(1).replace(".", ",") + "M";
  if (v >= 1000) return "R$ " + (v / 1000).toFixed(1).replace(".", ",") + "k";
  return dinheiro(v);
};
const mesLegivel = (m) => {
  if (!m) return "";
  const [a, mm] = m.split("-");
  const nomes = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return (nomes[Number(mm) - 1] || "") + " de " + a;
};

// Importar vendas de uma planilha (CSV)
function ModalImportarVendas({ onClose, onDone, showToast, mesAtual }) {
  const [dados, setDados] = useState(null);
  const [limpando, setLimpando] = useState(false);
  async function limparMes() {
    if (!window.confirm(`Apagar TODAS as vendas lançadas em ${mesLegivel(mesAtual)}? Não dá pra desfazer.`)) return;
    setLimpando(true);
    try { const r = await api.vdLimparMes(mesAtual); showToast(`✓ ${r.excluidas} venda(s) apagada(s)`); onDone(); }
    catch (e) { showToast("✗ " + e.message); } finally { setLimpando(false); }
  }
  const [grupoPadrao, setGrupoPadrao] = useState("Time de vendas");
  const [importando, setImportando] = useState(false);
  const ref = useRef(null);

  function lerArquivo(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const { headers, rows } = parseCSV(String(fr.result || ""));
        const acha = (ops) => {
          // procura na ORDEM das opções (a mais específica primeiro), não na ordem das colunas.
          // senão "valor" casaria com "VALOR RECEBIDO" antes de achar "VALOR VENDIDO".
          for (const o of ops) { const i = headers.findIndex((h) => h === o); if (i >= 0) return i; }
          for (const o of ops) { const i = headers.findIndex((h) => h.includes(o)); if (i >= 0) return i; }
          return -1;
        };
        const iVend = acha(["vendedor", "equipe", "responsavel", "responsável"]);
        const iData = acha(["data"]);
        const iNome = acha(["nome", "cliente"]);
        const iMail = acha(["email", "e-mail"]);
        const iTel = acha(["telefone", "whatsapp", "celular", "fone"]);
        const iCurso = acha(["curso", "produto"]);
        const iForma = acha(["forma", "pagto", "pagamento"]);
        const iPlat = acha(["plataforma"]);
        const iCod = acha(["codigo", "código", "cod venda", "transacao", "transação"]);
        const iParc = acha(["parcela"]);
        const iRec = acha(["recebido"]);
        const iVal = acha(["vendido", "valor venda", "valor total", "valor"]);
        if (iVend < 0 || iVal < 0) { showToast("O arquivo precisa ter as colunas VENDEDOR e VALOR VENDIDO"); return; }
        const pega = (r, i) => (i >= 0 ? (r[i] || "") : "");
        const vendas = rows.map((r) => ({
          pessoaNome: pega(r, iVend), data: pega(r, iData), cliente: pega(r, iNome),
          email: pega(r, iMail), telefone: pega(r, iTel), curso: pega(r, iCurso),
          forma: pega(r, iForma), plataforma: pega(r, iPlat), codigo: pega(r, iCod),
          parcelas: pega(r, iParc), recebido: pega(r, iRec), valor: pega(r, iVal),
        })).filter((v) => v.pessoaNome.trim() && v.valor);
        const pessoas = Array.from(new Set(vendas.map((v) => v.pessoaNome.trim())));
        setDados({ vendas, pessoas });
      } catch (err) { showToast("Não consegui ler o arquivo. Confira se é um CSV."); }
    };
    fr.readAsText(file, "utf-8");
  }

  async function importar() {
    if (!dados || !dados.vendas.length) return;
    setImportando(true);
    try {
      const r = await api.vdImportar({ vendas: dados.vendas, criarPessoas: true, grupoPadrao });
      showToast(`✓ ${r.criados} venda(s) importada(s)` + (r.novasPessoas ? ` · ${r.novasPessoas} pessoa(s) criada(s)` : "") + (r.pulados ? ` · ${r.pulados} pulada(s)` : ""));
      onDone(); onClose();
    } catch (e) { showToast("✗ " + e.message); } finally { setImportando(false); }
  }

  return (
    <Portal>
    <div className="pop-bg centro" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pop-sheet" style={{ maxWidth: 620 }}>
        <div className="pop-head"><b>Importar vendas da planilha</b><button className="crm-x" onClick={onClose}>✕</button></div>
        <div className="pop-body">
          <div className="rsv-hint" style={{ marginTop: 0 }}>
            Suba um <b>CSV</b> com as colunas <b>VENDEDOR</b>, DATA, NOME, EMAIL, TELEFONE, CURSO, FORMA DE PAGTO,
            PLATAFORMA, CÓDIGO VENDA, QUANTIDADE DE PARCELAS, VALOR RECEBIDO e <b>VALOR VENDIDO</b>.
            Quem não estiver cadastrado é criado automaticamente. Venda repetida (mesmo código) é pulada.
          </div>
          <input ref={ref} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={lerArquivo} />
          <button className="btn btn-on" style={{ marginTop: 12 }} onClick={() => ref.current && ref.current.click()}>Escolher arquivo CSV</button>
          <div className="vd-limpar">
            <b>Importou errado?</b> Dá pra apagar tudo que já foi lançado no mês <b>{mesLegivel(mesAtual)}</b> e importar de novo do zero.
            <button className="crm-lote-del" style={{ marginTop: 8 }} disabled={limpando} onClick={limparMes}>
              <I.trash className="ico" /> {limpando ? "Apagando…" : "Apagar as vendas de " + mesLegivel(mesAtual)}
            </button>
          </div>
          {dados && (
            <>
              <div className="imp-resumo"><b>{dados.vendas.length}</b> venda(s) · <b>{dados.pessoas.length}</b> pessoa(s): {dados.pessoas.join(", ")}</div>
              <div className="imp-preview">
                {dados.vendas.slice(0, 4).map((v, i) => (
                  <div key={i} className="imp-row"><b>{v.pessoaNome}</b> · {v.cliente || "—"} · R$ {v.valor}{v.data ? " · " + v.data : ""}</div>
                ))}
                {dados.vendas.length > 4 && <div className="imp-mais">…e mais {dados.vendas.length - 4}</div>}
              </div>
              <div style={{ marginTop: 12 }}>
                <label className="lbl-mini">Equipe pra quem for criado agora</label>
                <input className="input" value={grupoPadrao} onChange={(e) => setGrupoPadrao(e.target.value)} />
              </div>
              <button className="onum-add" style={{ marginTop: 16, display: "block" }} disabled={importando} onClick={importar}>
                {importando ? "Importando…" : `Importar ${dados.vendas.length} vendas`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
    </Portal>
  );
}

// Acha pessoas repetidas: "Dalit" x "Dalit Castro" (uma é o começo da outra).
// O destino é sempre o nome MAIS COMPLETO (normalmente o cadastrado no sistema).
function acharDuplicadas(pessoas) {
  const limpa = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
  const pares = [];
  for (let i = 0; i < pessoas.length; i++) {
    for (let j = 0; j < pessoas.length; j++) {
      if (i === j) continue;
      const a = pessoas[i], b = pessoas[j];
      const na = limpa(a.nome), nb = limpa(b.nome);
      if (nb.length <= na.length) continue;
      if (!nb.startsWith(na + " ")) continue;      // "dalit castro" começa com "dalit "
      pares.push({ de: a, para: b });               // leva do curto pro completo
    }
  }
  // se a mesma pessoa aparecer em vários pares, fica só o primeiro
  const vistos = new Set();
  return pares.filter((p) => {
    if (vistos.has(p.de.id)) return false;
    vistos.add(p.de.id); return true;
  });
}

// Clicou no nome no ranking: define a equipe e a meta dessa pessoa
/* busca simples em vendas: nome do cliente, curso, plataforma, código */
function casaBusca(v, termo) {
  const t = String(termo || "").trim().toLowerCase();
  if (!t) return true;
  const alvo = [v.cliente, v.curso, v.plataforma, v.codigo, v.formaLabel || v.forma, v.pessoaNome]
    .filter(Boolean).join(" ")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/).every((p) => alvo.includes(p));
}


/* ============================================================
   MÉTRICAS — tela cheia, dentro de Vendas
   Busca curso por curso e abre o detalhe: quantas vendas, quanto
   faturou, como o cliente pagou e em qual plataforma.
   ============================================================ */
function TelaMetricas({ mes, onVoltar, showToast }) {
  const [d, setD] = useState(null);
  const [aba, setAba] = useState("cursos");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(null);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const temPeriodo = !!(de && ate);

  useEffect(() => {
    setD(null);
    api.vdAnalise(mes, de, ate).then(setD).catch((e) => showToast(e.message));
  }, [mes, de, ate]);

  // atalhos de período
  const iso = (dt) => dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
  function atalho(dias) {
    const fim = new Date();
    const ini = new Date(); ini.setDate(ini.getDate() - (dias - 1));
    setDe(iso(ini)); setAte(iso(fim)); setAberto(null);
  }
  function esteMes() {
    const hj = new Date();
    setDe(iso(new Date(hj.getFullYear(), hj.getMonth(), 1)));
    setAte(iso(hj)); setAberto(null);
  }
  function limparPeriodo() { setDe(""); setAte(""); setAberto(null); }

  const ABAS = [["cursos", "Por curso"], ["formas", "Como pagou"], ["plataformas", "Plataforma"], ["parcelas", "Parcelamento"]];
  const nrm = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const lista = (d ? (d[aba] || []) : []).filter((x) => !busca.trim() || nrm(x.nome).includes(nrm(busca)));
  const maior = lista.reduce((m, x) => Math.max(m, x.valor), 0) || 1;
  const pct = (v) => (d && d.total > 0 ? Math.round((v / d.total) * 100) : 0);

  return (
    <div className="mt-tela">
      <div className="mt-topo">
        <button className="btn btn-sm" onClick={onVoltar}>← Voltar</button>
        <div className="mt-tit">
          {temPeriodo
            ? `Métricas de ${de.split("-").reverse().join("/")} a ${ate.split("-").reverse().join("/")}`
            : `Métricas de ${mesLegivel(mes)}`}
        </div>
      </div>

      <div className="mt-periodo">
        <span className="mt-periodo-lb">Período</span>
        <div className="mt-atalhos">
          <button className={!temPeriodo ? "on" : ""} onClick={limparPeriodo}>Mês todo</button>
          <button onClick={() => atalho(1)}>Hoje</button>
          <button onClick={() => atalho(7)}>7 dias</button>
          <button onClick={() => atalho(15)}>15 dias</button>
          <button onClick={() => atalho(30)}>30 dias</button>
          <button onClick={esteMes}>Do dia 1 até hoje</button>
        </div>
        <div className="mt-datas">
          <input type="date" className="vd-data" value={de} onChange={(e) => { setDe(e.target.value); if (!ate) setAte(iso(new Date())); }} />
          <span>até</span>
          <input type="date" className="vd-data" value={ate} onChange={(e) => setAte(e.target.value)} />
          {temPeriodo && <button className="mt-limpar" onClick={limparPeriodo}>✕ limpar</button>}
        </div>
      </div>

      {!d ? (
        <div className="panel-sub" style={{ padding: 30 }}><span className="spin" /> Somando as vendas…</div>
      ) : (
        <>
          <div className="mt-cards">
            <div><span>Vendido</span><b>{dinheiro(d.total)}</b></div>
            <div><span>Recebido</span><b className="verde">{dinheiro(d.recebido)}</b></div>
            <div><span>Vendas</span><b>{d.qtd}</b></div>
            <div><span>Ticket médio</span><b>{dinheiro(d.ticket)}</b></div>
            <div><span>Cursos vendidos</span><b>{(d.cursos || []).length}</b></div>
          </div>

          <div className="mt-barra">
            <div className="of-tabs">
              {ABAS.map(([k, lb]) => (
                <button key={k} className={aba === k ? "of-tab on" : "of-tab"}
                  onClick={() => { setAba(k); setAberto(null); }}>{lb}</button>
              ))}
            </div>
            <div className="vd-busca" style={{ margin: 0, flex: 1, maxWidth: 380 }}>
              <I.search className="ico" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)}
                placeholder={aba === "cursos" ? "Buscar curso…" : "Buscar…"} />
              {busca && <button className="vd-busca-x" onClick={() => setBusca("")}>✕</button>}
            </div>
          </div>

          {lista.length === 0 ? (
            <div className="crm-col-vazio">
              {busca ? `Nada encontrado para "${busca}".` : "Nenhuma venda neste mês."}
            </div>
          ) : (
            <div className="mt-lista">
              {lista.map((x, i) => {
                const abre = aba === "cursos";
                const on = aberto === x.nome;
                return (
                  <div key={x.nome} className={"mt-card" + (on ? " on" : "")}>
                    <div className={"mt-linha" + (abre ? " clicavel" : "")}
                      onClick={() => abre && setAberto(on ? null : x.nome)}>
                      <span className="mt-pos">{i + 1}</span>
                      <div className="mt-info">
                        <div className="mt-nome">
                          {x.nome}
                          {abre && <span className="mt-abrir">{on ? "▲ fechar" : "▼ ver detalhe"}</span>}
                        </div>
                        <div className="mt-barra-prog"><i style={{ width: Math.max(2, (x.valor / maior) * 100) + "%" }} /></div>
                        <div className="mt-sub">{x.qtd} venda(s) · ticket {dinheiroCurto(x.ticket)} · recebido {dinheiroCurto(x.recebido)}</div>
                      </div>
                      <div className="mt-vl"><b>{dinheiro(x.valor)}</b><span>{pct(x.valor)}% do mês</span></div>
                    </div>

                    {on && (
                      <div className="mt-detalhe">
                        {[["Como o cliente pagou", x.formas], ["Plataforma", x.plataformas], ["Quem vendeu", x.vendedores]].map(([tit, arr]) => (
                          <div key={tit} className="mt-bloco">
                            <span className="mt-bloco-tit">{tit}</span>
                            {(arr || []).length === 0 ? <span className="mt-vazio">—</span> : (arr || []).map((y) => (
                              <div key={y.nome} className="mt-mini">
                                <span className="mt-mini-nome">{y.nome}</span>
                                <span className="mt-mini-qtd">{y.qtd}x</span>
                                <span className="mt-mini-vl">{dinheiroCurto(y.valor)}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ModalPessoaRapida({ pessoa, pessoas, mes, isGer = true, onVerPainel, onClose, onSalvo, showToast }) {
  const [grupo, setGrupo] = useState(pessoa.grupo || "");
  const [meta, setMeta] = useState(String(pessoa.meta || ""));
  const [fora, setFora] = useState(!!pessoa.foraDoPodio);
  const [salvando, setSalvando] = useState(false);
  const [aba, setAba] = useState("vendas");
  const [minhas, setMinhas] = useState(null);
  const [foto, setFoto] = useState(pessoa.foto || "");
  const fotoRef = useRef(null);
  const grupos = Array.from(new Set((pessoas || []).map((p) => p.grupo).filter(Boolean)));
  async function trocarFoto(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      const dataUrl = await redimensionarImg(f, 160);
      await api.vdPessoaEditar(pessoa.pessoaId, { foto: dataUrl });
      setFoto(dataUrl);
      showToast("✓ Foto atualizada");
      onSalvo({ silencioso: true });
    } catch (err) { showToast("✗ Não deu pra carregar a foto"); }
  }
  useEffect(() => {
    api.vdLista(mes, pessoa.pessoaId).then((d) => setMinhas(d.vendas || [])).catch(() => setMinhas([]));
    // eslint-disable-next-line
  }, []);
  const [buscaV, setBuscaV] = useState("");
  // agrupa as vendas por dia, do mais recente pro mais antigo
  const dias = useMemo(() => {
    const m = {};
    (minhas || []).filter((v) => casaBusca(v, buscaV)).forEach((v) => {
      const d = new Date(v.data);
      const k = d.toISOString().slice(0, 10);
      if (!m[k]) m[k] = { k, data: d, vendas: [], total: 0, recebido: 0 };
      m[k].vendas.push(v); m[k].total += Number(v.valor) || 0; m[k].recebido += Number(v.recebido) || 0;
    });
    return Object.values(m).sort((a, b) => b.k.localeCompare(a.k));
  }, [minhas, buscaV]);
  const maxDia = dias.reduce((mx, d) => Math.max(mx, d.total), 0);
  async function salvar() {
    setSalvando(true);
    try {
      await api.vdPessoaEditar(pessoa.pessoaId, { grupo, metaMensal: meta, foraDoPodio: fora });
      showToast("✓ Salvo");
      onSalvo(); onClose();
    } catch (e) { showToast("✗ " + e.message); } finally { setSalvando(false); }
  }
  return (
    <Portal>
    <div className="pop-bg centro" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pop-sheet" style={{ maxWidth: 640 }}>
        <div className="pop-head">
          <div className="vd-mp-cab">
            {isGer ? (
              <button className="vd-pessoa-foto" onClick={() => fotoRef.current && fotoRef.current.click()} title={foto ? "Trocar a foto" : "Colocar uma foto"}>
                <Avatar nome={pessoa.nome} foto={foto} size={36} />
                <span className="vd-pessoa-foto-ic">📷</span>
              </button>
            ) : (
              <Avatar nome={pessoa.nome} foto={foto} size={36} />
            )}
            <b>{pessoa.nome}</b>
          </div>
          <input ref={fotoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={trocarFoto} />
          <button className="crm-x" onClick={onClose}>✕</button>
        </div>
        <div className="pop-body">
          <div className="vd-abas">
            <button className={aba === "vendas" ? "on" : ""} onClick={() => setAba("vendas")}>Vendas dia a dia{minhas ? ` (${minhas.length})` : ""}</button>
            {isGer && <button className={aba === "config" ? "on" : ""} onClick={() => setAba("config")}>Equipe & meta</button>}
            {isGer && onVerPainel && <button onClick={() => { onVerPainel(pessoa.pessoaId); onClose(); }}>Painel completo →</button>}
          </div>

          {aba === "vendas" ? (
            <>
              <div className="vd-resumo-pessoa">
                <div><span>Vendido</span><b>{dinheiro(pessoa.venda)}</b></div>
                <div><span>Recebido</span><b>{dinheiro(pessoa.recebido)}</b></div>
                <div><span>Vendas</span><b>{minhas ? minhas.length : "…"}</b></div>
                <div><span>Dias com venda</span><b>{dias.length}</b></div>
              </div>
              {minhas && minhas.length > 0 && (
                <div className="vd-busca">
                  <I.search className="ico" />
                  <input value={buscaV} onChange={(e) => setBuscaV(e.target.value)}
                    placeholder="Buscar por nome do cliente, curso ou código…" />
                  {buscaV && <button className="vd-busca-x" onClick={() => setBuscaV("")}>✕</button>}
                </div>
              )}
              {minhas === null ? (
                <div className="dash-empty"><span className="spin" /> Carregando…</div>
              ) : dias.length === 0 ? (
                <div className="crm-col-vazio">{buscaV ? `Nenhuma venda encontrada para "${buscaV}".` : "Nenhuma venda neste mês."}</div>
              ) : (
                <div className="vd-dias">
                  {dias.map((d) => (
                    <div key={d.k} className="vd-dia">
                      <div className="vd-dia-cab">
                        <span className="vd-dia-data">{d.data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                          <small>{d.data.toLocaleDateString("pt-BR", { weekday: "short" })}</small></span>
                        <div className="vd-dia-barra"><div style={{ width: (maxDia ? (d.total / maxDia) * 100 : 0) + "%" }} /></div>
                        <span className="vd-dia-tot">{dinheiro(d.total)}<small>{d.vendas.length} venda(s)</small></span>
                      </div>
                      {d.vendas.map((v) => (
                        <div key={v.id} className="vd-dia-item">
                          <div className="vd-dia-cli">{v.cliente || "—"}
                            <small>{[v.curso, v.formaLabel || v.forma, v.parcelas ? v.parcelas + "x" : "", v.plataforma].filter(Boolean).join(" · ")}</small>
                          </div>
                          <div className="vd-dia-vals">{dinheiro(v.valor)}<small>recebido {dinheiro(v.recebido)}</small></div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
          <>
          <label className="lbl-mini">Equipe</label>
          <input className="input" value={grupo} onChange={(e) => setGrupo(e.target.value)} list="vd-grupos-rapido" placeholder="Ex.: Time de vendas" />
          <datalist id="vd-grupos-rapido">{grupos.map((g) => <option key={g} value={g} />)}</datalist>
          {grupos.length > 0 && (
            <div className="vd-chips">
              {grupos.map((g) => <button key={g} className={"vd-chip" + (grupo === g ? " on" : "")} onClick={() => setGrupo(g)}>{g}</button>)}
            </div>
          )}
          <label className="vd-check">
            <input type="checkbox" checked={!!fora} onChange={(e) => setFora(e.target.checked)} />
            <span><b>Não concorre no pódio</b><small>marque pra venda direta (Escola, live, site). Continua no ranking e nos totais.</small></span>
          </label>
          <label className="lbl-mini" style={{ marginTop: 14, display: "block" }}>Meta do mês</label>
          <input className="input" value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="Ex.: 150.000,00" />
          <div className="vd-dica">Vendido neste mês: <b>{dinheiro(pessoa.venda)}</b> · recebido {dinheiro(pessoa.recebido)}</div>
          <div className="vd-rodape">
            <button className="btn" onClick={onClose}>Cancelar</button>
            <button className="onum-add" disabled={salvando} onClick={salvar}>{salvando ? "Salvando…" : "Salvar"}</button>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
    </Portal>
  );
}

// Anel de progresso da meta
// Conferir vendas repetidas (a mesma venda veio da planilha e do outro sistema)
function ModalDuplicadas({ mes, onClose, onMudou, showToast }) {
  const [dados, setDados] = useState(null);
  const [apagando, setApagando] = useState("");
  const carregar = () => api.vdDuplicadas(mes).then(setDados).catch((e) => showToast(e.message));
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, []);
  async function apagar(v) {
    if (!window.confirm(`Excluir esta venda?\n\n${v.cliente || "—"} · ${dinheiro(v.valor)} · ${v.pessoaNome}`)) return;
    setApagando(v.id);
    try { await api.vdExcluir(v.id); showToast("✓ Venda excluída"); await carregar(); onMudou(); }
    catch (e) { showToast("✗ " + e.message); } finally { setApagando(""); }
  }
  return (
    <Portal>
    <div className="pop-bg centro" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pop-sheet" style={{ maxWidth: 720 }}>
        <div className="pop-head"><b>Vendas repetidas — {mesLegivel(mes)}</b><button className="crm-x" onClick={onClose}>✕</button></div>
        <div className="pop-body">
          {!dados ? <div className="dash-empty"><span className="spin" /> Procurando…</div>
          : dados.quantos === 0 ? (
            <div className="vd-ok-dup">✓ Nenhuma venda repetida encontrada neste mês.</div>
          ) : (
            <>
              <div className="rsv-hint" style={{ marginTop: 0 }}>
                Achei <b>{dados.quantos}</b> caso(s) suspeito(s), somando <b>{dinheiro(dados.totalRepetido)}</b> que pode estar
                contado a mais. Confira cada um e apague o que for repetido — <b>não apago nada sozinho</b>.
              </div>
              {dados.grupos.map((g, i) => (
                <div key={i} className={"vd-dupgrupo" + (g.forte ? " forte" : "")}>
                  <div className="vd-dupgrupo-cab">
                    {g.forte ? "⚠ " : ""}{g.motivo}
                    <span>{g.chave}</span>
                  </div>
                  {g.vendas.map((v) => (
                    <div key={v.id} className="vd-dupvenda">
                      <div>
                        <b>{v.cliente || "—"}</b>
                        <small>{new Date(v.data).toLocaleDateString("pt-BR")} · {v.pessoaNome}{v.curso ? " · " + v.curso : ""}{v.plataforma ? " · " + v.plataforma : ""}</small>
                      </div>
                      <span className="vd-dupvalor">{dinheiro(v.valor)}</span>
                      <button className="crm-lote-del" disabled={apagando === v.id} onClick={() => apagar(v)}>
                        {apagando === v.id ? "…" : "Excluir"}
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
    </Portal>
  );
}

// Integração: outro sistema (ex.: suporte) manda a venda pra cá
function ModalIntegracao({ onClose, showToast }) {
  const [dados, setDados] = useState(null);
  const [apelidos, setApelidos] = useState([]);
  const [pessoas, setPessoas] = useState([]);
  const [novoApelido, setNovoApelido] = useState("");
  const [novoDestino, setNovoDestino] = useState("");
  const carregarApelidos = () => api.vdApelidos().then((d) => setApelidos(d.apelidos || [])).catch(() => {});
  useEffect(() => { carregarApelidos(); api.vdPessoas().then((d) => setPessoas(d.pessoas || [])).catch(() => {}); }, []);
  async function salvarApelido() {
    try {
      const r = await api.vdSalvarApelido(novoApelido, novoDestino);
      showToast(r.movidas ? `✓ Ligado · ${r.movidas} venda(s) movida(s)` : "✓ Ligado");
      setNovoApelido(""); setNovoDestino(""); carregarApelidos();
    } catch (e) { showToast("✗ " + e.message); }
  }
  async function removerApelido(nome) {
    try { await api.vdSalvarApelido(nome, ""); carregarApelidos(); showToast("✓ Desfeito"); }
    catch (e) { showToast(e.message); }
  }
  const origin = typeof window !== "undefined" ? window.location.origin : "https://SEU-DOMINIO";
  useEffect(() => { api.vdIntegracao().then(setDados).catch((e) => showToast(e.message)); /* eslint-disable-next-line */ }, []);
  const copiar = (txt, oque) => {
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => showToast("✓ " + oque + " copiado")).catch(() => showToast(txt));
    else showToast(txt);
  };
  async function novaChave() {
    if (!window.confirm("Gerar uma chave nova? A antiga para de funcionar na hora — quem estiver usando precisa atualizar.")) return;
    try { const r = await api.vdNovaChave(); setDados((d) => ({ ...d, chave: r.chave })); showToast("✓ Chave nova gerada"); }
    catch (e) { showToast(e.message); }
  }
  const url = origin + "/api/vendas/externa";
  const exemplo = `curl -X POST ${url} \\
  -H "x-api-key: ${dados ? dados.chave : "SUA-CHAVE"}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "vendedor": "Nome de quem vendeu",
    "data": "2026-07-23",
    "cliente": "Nome do cliente",
    "email": "cliente@email.com",
    "telefone": "44999999999",
    "curso": "Especialista em Inversores",
    "forma": "Cartão de crédito",
    "plataforma": "Hotmart",
    "codigo": "HP123456",
    "parcelas": 12,
    "valor": 2497.00,
    "recebido": 208.08
  }'`;
  return (
    <Portal>
    <div className="pop-bg centro" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pop-sheet" style={{ maxWidth: 680 }}>
        <div className="pop-head"><b>Integrar outro sistema</b><button className="crm-x" onClick={onClose}>✕</button></div>
        <div className="pop-body">
          <div className="rsv-hint" style={{ marginTop: 0 }}>
            Passe estes dados pro time que cuida do outro sistema. Quando eles registrarem uma venda lá,
            ela cai aqui na hora — no ranking, no painel e nos totais.
          </div>
          <label className="lbl-mini" style={{ marginTop: 14, display: "block" }}>Endereço (POST)</label>
          <div className="rsv-link api" onClick={() => copiar(url, "Endereço")}>
            <span className="rsv-link-tag">Endpoint</span><span className="rsv-link-url">{url}</span><span className="rsv-copy">copiar</span>
          </div>
          <label className="lbl-mini" style={{ marginTop: 12, display: "block" }}>Chave de acesso (cabeçalho <code>x-api-key</code>)</label>
          <div className="rsv-link api" onClick={() => dados && copiar(dados.chave, "Chave")}>
            <span className="rsv-link-tag">Chave</span><span className="rsv-link-url">{dados ? dados.chave : "carregando…"}</span><span className="rsv-copy">copiar</span>
          </div>
          <label className="lbl-mini" style={{ marginTop: 14, display: "block" }}>Exemplo pronto</label>
          <pre className="vd-code">{exemplo}</pre>
          <div className="vd-dica">
            Obrigatórios: <b>vendedor</b> e <b>valor</b>. O resto é opcional. Se o vendedor ainda não existir aqui,
            ele é criado. Venda com o mesmo <b>código</b> não entra duas vezes.
          </div>
          <div className="vd-sec" style={{ marginTop: 22 }}>Painel de TV</div>
          <div className="vd-dica" style={{ marginTop: 0 }}>
            Abra este link na TV ou num monitor e deixe rodando: ele passa sozinho pelas telas
            (visão geral, formas de pagamento, top 3, cursos e ranking) e se atualiza em tempo real.
            Dica: aperte <b>F</b> pra tela cheia.
          </div>
          <div className="rsv-link api" onClick={() => copiar(origin + "/tv?k=" + (dados ? dados.tvCodigo : ""), "Link da TV")}>
            <span className="rsv-link-tag">TV</span>
            <span className="rsv-link-url">{origin}/tv?k={dados ? dados.tvCodigo : "…"}</span>
            <span className="rsv-copy">copiar</span>
          </div>
          <a className="btn btn-on" style={{ marginTop: 10, display: "inline-flex" }} target="_blank" rel="noreferrer"
            href={origin + "/tv?k=" + (dados ? dados.tvCodigo : "")}>Abrir o painel de TV</a>

          <div className="vd-sec" style={{ marginTop: 22 }}>Nomes diferentes entre os sistemas</div>
          <div className="vd-dica" style={{ marginTop: 0 }}>
            Se lá o vendedor é <b>Cris</b> e aqui é <b>Cristiane Alves</b>, faça a ligação uma vez —
            daí em diante toda venda dele cai na pessoa certa sozinha. (Juntar duas pessoas em
            <b> Equipe &amp; metas</b> também cria essa ligação automaticamente.)
          </div>
          <div className="vd-apelido-novo">
            <input className="input" placeholder="Nome como vem de lá (ex.: Cris)" value={novoApelido} onChange={(e) => setNovoApelido(e.target.value)} />
            <span>→</span>
            <select className="input" value={novoDestino} onChange={(e) => setNovoDestino(e.target.value)}>
              <option value="">Pessoa daqui…</option>
              {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <button className="onum-add" disabled={!novoApelido.trim() || !novoDestino} onClick={salvarApelido}>Ligar</button>
          </div>
          {apelidos.length > 0 && (
            <div className="vd-apelidos">
              {apelidos.map((a) => (
                <div key={a.nomeFora} className="vd-apelido">
                  <b>{a.nomeFora}</b><span>→</span><b>{a.pessoaNome}</b>
                  <button className="crm-tarefa-del" title="Desfazer" onClick={() => removerApelido(a.nomeFora)}>✕</button>
                </div>
              ))}
            </div>
          )}
          <div className="vd-rodape">
            <button className="foto-del" onClick={novaChave}>gerar chave nova</button>
            <button className="onum-add" onClick={onClose}>Fechar</button>
          </div>
        </div>
      </div>
    </div>
    </Portal>
  );
}

// Lista de vendas agrupada por dia (usada no "Minhas vendas" e no popup do vendedor)
function DiaADia({ vendas, onEditar, onExcluir }) {
  const dias = useMemo(() => {
    const m = {};
    (vendas || []).forEach((v) => {
      // data inválida não pode derrubar a tela (toISOString estoura): cai no criadoEm ou hoje
      let d = new Date(v.data);
      if (isNaN(d.getTime())) d = new Date(v.criadoEm || Date.now());
      if (isNaN(d.getTime())) d = new Date();
      const k = d.toISOString().slice(0, 10);
      if (!m[k]) m[k] = { k, data: d, vendas: [], total: 0, recebido: 0 };
      m[k].vendas.push(v); m[k].total += Number(v.valor) || 0; m[k].recebido += Number(v.recebido) || 0;
    });
    return Object.values(m).sort((a, b) => b.k.localeCompare(a.k));
  }, [vendas]);
  const maxDia = dias.reduce((mx, d) => Math.max(mx, d.total), 0);
  if (!dias.length) return <div className="crm-col-vazio">Nenhuma venda neste mês ainda.</div>;
  return (
    <div className="vd-dias">
      {dias.map((d) => (
        <div key={d.k} className="vd-dia">
          <div className="vd-dia-cab">
            <span className="vd-dia-data">{d.data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
              <small>{d.data.toLocaleDateString("pt-BR", { weekday: "short" })}</small></span>
            <div className="vd-dia-barra"><div style={{ width: (maxDia ? (d.total / maxDia) * 100 : 0) + "%" }} /></div>
            <span className="vd-dia-tot">{dinheiro(d.total)}<small>{d.vendas.length} venda(s)</small></span>
          </div>
          {d.vendas.map((v) => (
            <div key={v.id} className="vd-dia-item">
              <div className="vd-dia-cli">{v.cliente || "—"}
                <small>{[v.curso, v.formaLabel || v.forma, v.parcelas ? v.parcelas + "x" : "", v.plataforma].filter(Boolean).join(" · ")}</small>
              </div>
              <div className="vd-dia-vals">{dinheiro(v.valor)}<small>recebido {dinheiro(v.recebido)}</small></div>
              {(onEditar || onExcluir) && (
                <div className="vd-dia-acoes">
                  {onEditar && <button className="btn btn-sm" onClick={() => onEditar(v)}>Editar</button>}
                  {onExcluir && <button className="crm-tarefa-del" onClick={() => onExcluir(v)} title="Excluir">✕</button>}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Registrar venda direto da conversa (já vem com nome e telefone do cliente)
function ModalRegistrarVenda({ prefill, isGer, onClose, showToast }) {
  const [pessoas, setPessoas] = useState([]);
  const [form, setForm] = useState({
    pessoaId: "", cliente: prefill.nome || "", email: "", telefone: prefill.telefone || "",
    curso: "", forma: "Pix", plataforma: "Hotmart", codigo: "", parcelas: "",
    valor: "", recebido: "", data: new Date().toISOString().slice(0, 10),
  });
  useEffect(() => {
    if (!isGer) return;
    api.vdPessoas().then((d) => {
      const ps = d.pessoas || [];
      setPessoas(ps);
      setForm((f) => ({ ...f, pessoaId: ps[0] ? ps[0].id : "" }));
    }).catch(() => {});
  }, [isGer]);
  return <FormVenda form={form} setForm={(f) => { const nv = typeof f === "function" ? f(form) : f; if (nv === null) { onClose(); return; } setForm(nv); }}
    pessoas={pessoas} isGer={isGer} onSalvo={() => { showToast("🎉 Venda registrada!"); onClose(); }} showToast={showToast} />;
}

function ModalVendasPeriodo({ isGer = true, onClose, showToast }) {
  const [ini, setIni] = useState("");
  const [fim, setFim] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [res, setRes] = useState(null);
  const [rotulo, setRotulo] = useState("");

  function fmtBR(d) { return d.toLocaleDateString("pt-BR"); }
  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

  async function buscar(deMs, ateMs, lbl) {
    setCarregando(true); setRes(null); setRotulo(lbl || "");
    try { const r = await api.vdPorPeriodo(deMs, ateMs); setRes(r); }
    catch (e) { showToast("✗ " + e.message); }
    setCarregando(false);
  }
  function semana(offset) {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const dia = (hoje.getDay() + 6) % 7; // segunda = 0
    const seg = new Date(hoje); seg.setDate(hoje.getDate() - dia - offset * 7);
    const dom = new Date(seg); dom.setDate(seg.getDate() + 6); dom.setHours(23, 59, 59, 999);
    setIni(iso(seg)); setFim(iso(dom));
    buscar(seg.getTime(), dom.getTime(), (offset === 0 ? "Esta semana" : "Semana passada") + " · " + fmtBR(seg) + " a " + fmtBR(dom));
  }
  function ultimos(dias) {
    const ate = new Date(); ate.setHours(23, 59, 59, 999);
    const de = new Date(); de.setDate(de.getDate() - (dias - 1)); de.setHours(0, 0, 0, 0);
    setIni(iso(de)); setFim(iso(ate));
    buscar(de.getTime(), ate.getTime(), "Últimos " + dias + " dias");
  }
  function buscarCustom() {
    if (!ini || !fim) { showToast("Escolha as duas datas"); return; }
    const [y1, m1, d1] = ini.split("-").map(Number);
    const [y2, m2, d2] = fim.split("-").map(Number);
    const de = new Date(y1, m1 - 1, d1, 0, 0, 0).getTime();
    const ate = new Date(y2, m2 - 1, d2, 23, 59, 59).getTime();
    if (ate < de) { showToast("A data final está antes da inicial"); return; }
    buscar(de, ate, fmtBR(new Date(de)) + " a " + fmtBR(new Date(ate)));
  }
  const money = (n) => "R$ " + (Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  return (
    <div className="pop-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pop-sheet" style={{ maxWidth: 640, width: "94%", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>Vendas por período</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--muted)" }}>×</button>
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>Quanto cada vendedor vendeu {isGer ? "" : "(suas vendas) "}numa semana ou num intervalo que você escolher.</div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <button className="btn btn-sm" onClick={() => semana(0)}>Esta semana</button>
          <button className="btn btn-sm" onClick={() => semana(1)}>Semana passada</button>
          <button className="btn btn-sm" onClick={() => ultimos(7)}>Últimos 7 dias</button>
          <button className="btn btn-sm" onClick={() => ultimos(30)}>Últimos 30 dias</button>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", padding: 14, background: "var(--surface-2)", borderRadius: 12, marginBottom: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--faint)", fontWeight: 700, textTransform: "uppercase" }}>De</span>
            <input type="date" className="input" value={ini} onChange={(e) => setIni(e.target.value)} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--faint)", fontWeight: 700, textTransform: "uppercase" }}>Até</span>
            <input type="date" className="input" value={fim} min={ini || undefined} onChange={(e) => setFim(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={buscarCustom} style={{ height: 38 }}>Buscar</button>
        </div>

        {rotulo && <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>{rotulo}</div>}
        {carregando && <div style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>Carregando…</div>}

        {res && !carregando && (
          res.linhas.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", background: "var(--surface-2)", borderRadius: 12 }}>Nenhuma venda nesse período.</div>
          ) : (
            <div>
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1, background: "var(--surface-2)", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, color: "var(--faint)", fontWeight: 700, textTransform: "uppercase" }}>Total de vendas</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}>{res.totalQtd}</div>
                </div>
                <div style={{ flex: 1, background: "var(--surface-2)", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, color: "var(--faint)", fontWeight: 700, textTransform: "uppercase" }}>Receita total</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#16a34a" }}>{money(res.totalReceita)}</div>
                </div>
              </div>
              <div style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "flex", padding: "9px 14px", background: "var(--surface-2)", fontSize: 11, fontWeight: 700, color: "var(--faint)", textTransform: "uppercase" }}>
                  <span style={{ flex: 1 }}>Vendedor</span>
                  <span style={{ width: 90, textAlign: "center" }}>Nº vendas</span>
                  <span style={{ width: 130, textAlign: "right" }}>Receita</span>
                </div>
                {res.linhas.map((l, i) => (
                  <div key={l.pessoaId} style={{ display: "flex", alignItems: "center", padding: "11px 14px", borderTop: "1px solid var(--line)", background: "var(--card)" }}>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--faint)", width: 18 }}>{i + 1}º</span>{l.nome}
                    </span>
                    <span style={{ width: 90, textAlign: "center", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{l.qtd}</span>
                    <span style={{ width: 130, textAlign: "right", fontSize: 14, fontWeight: 700, color: "#16a34a" }}>{money(l.receita)}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ============================ PAINEL DE VENDAS (v2.2) ============================ */
// Gráfico do mês: vendido acumulado x ritmo da meta (um eixo só, em reais).
// Passe o mouse num dia pra ver os números; clique pra abrir as vendas do dia.
function GraficoMes({ porDia, diasNoMes, diaHoje, meta, diaSel, onDia, ehMesCorrente }) {
  const [hov, setHov] = useState(null);
  const N = Math.max(1, diasNoMes || 30);
  const W = 760, H = 250, pl = 58, pr = 16, pt = 16, pb = 30;
  const porNum = {}; (porDia || []).forEach((d) => { porNum[d.dia] = d.venda || 0; });
  const ate = ehMesCorrente ? Math.max(1, diaHoje || 1) : N;
  let acc = 0; const acum = [];
  for (let d = 1; d <= N; d++) { acc += porNum[d] || 0; acum.push(acc); }
  const maxY = Math.max(meta || 0, acum[ate - 1] || 0, 1) * 1.08;
  const x = (d) => pl + ((d - 1) / Math.max(1, N - 1)) * (W - pl - pr);
  const y = (v) => pt + (1 - v / maxY) * (H - pt - pb);
  const pontos = acum.slice(0, ate).map((v, i) => [x(i + 1), y(v)]);
  const linha = pontos.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = pontos.length ? linha + " L" + pontos[pontos.length - 1][0].toFixed(1) + " " + y(0) + " L" + pontos[0][0].toFixed(1) + " " + y(0) + " Z" : "";
  const ticksY = [0, 0.25, 0.5, 0.75, 1].map((f) => maxY / 1.08 * f);
  const ticksX = [1, 5, 10, 15, 20, 25, N].filter((d, i, a) => d <= N && a.indexOf(d) === i);
  const h = hov ? { d: hov, dia: porNum[hov] || 0, acum: acum[hov - 1] || 0, meta: meta ? (meta * hov) / N : 0 } : null;
  return (
    <div className="vdx-graf">
      <div className="vdx-legenda">
        <span><i className="l-vendido" />Vendido (acumulado)</span>
        {meta > 0 && <span><i className="l-meta" />Ritmo da meta</span>}
      </div>
      <div className="vdx-graf-area">
        <svg viewBox={"0 0 " + W + " " + H} role="img" aria-label="Vendido acumulado no mês comparado com o ritmo da meta">
          <defs>
            <linearGradient id="vdxArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand-2)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--brand-2)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticksY.map((v, i) => (
            <g key={i}>
              <line x1={pl} x2={W - pr} y1={y(v)} y2={y(v)} className="vdx-grade" />
              <text x={pl - 10} y={y(v) + 4} className="vdx-eixo" textAnchor="end">{dinheiroCurto(v)}</text>
            </g>
          ))}
          {ticksX.map((d) => <text key={d} x={x(d)} y={H - 8} className="vdx-eixo" textAnchor="middle">{d}</text>)}
          {meta > 0 && <line x1={x(1)} y1={y(meta / N)} x2={x(N)} y2={y(meta)} className="vdx-meta" />}
          {area && <path d={area} fill="url(#vdxArea)" />}
          {linha && <path d={linha} className="vdx-linha" />}
          {pontos.length > 0 && <circle cx={pontos[pontos.length - 1][0]} cy={pontos[pontos.length - 1][1]} r="5" className="vdx-ponto-fim" />}
          {diaSel && diaSel <= ate && <line x1={x(diaSel)} x2={x(diaSel)} y1={pt} y2={H - pb} className="vdx-sel" />}
          {h && (
            <g>
              <line x1={x(h.d)} x2={x(h.d)} y1={pt} y2={H - pb} className="vdx-guia" />
              {h.d <= ate && <circle cx={x(h.d)} cy={y(h.acum)} r="5" className="vdx-ponto" />}
              {meta > 0 && <circle cx={x(h.d)} cy={y(h.meta)} r="4" className="vdx-ponto-meta" />}
            </g>
          )}
          {Array.from({ length: N }, (_, i) => i + 1).map((d) => (
            <rect key={d} x={x(d) - (W - pl - pr) / N / 2} y={pt} width={(W - pl - pr) / N} height={H - pt - pb} fill="transparent"
              style={{ cursor: d <= ate ? "pointer" : "default" }}
              onMouseEnter={() => setHov(d)} onMouseLeave={() => setHov(null)} onClick={() => d <= ate && onDia && onDia(d)} />
          ))}
        </svg>
        {h && (
          <div className="vdx-tip" style={{ left: (x(h.d) / W) * 100 + "%" }}>
            <b>Dia {h.d}</b>
            {h.d <= ate ? <>
              <span>No dia <em>{dinheiro(h.dia)}</em></span>
              <span>Acumulado <em>{dinheiro(h.acum)}</em></span>
            </> : <span>ainda não chegou</span>}
            {meta > 0 && <span className="m">Meta até aqui <em>{dinheiroCurto(h.meta)}</em></span>}
          </div>
        )}
      </div>
    </div>
  );
}
// Ritmo da meta: compara o vendido com o que a meta pedia até hoje (como se o mês fosse parelho).
// Um pouquinho abaixo ainda conta como "no ritmo"; qualquer valor acima já aparece como "acima do ritmo".
function ritmoDoMes(venda, meta, diaHoje, diasNoMes, ehMesCorrente) {
  if (!(meta > 0)) return null;
  if (!ehMesCorrente) return venda >= meta ? { cls: "acima", txt: "Meta batida", dif: venda - meta } : { cls: "atras", txt: "Meta não batida", dif: venda - meta };
  const esperado = (meta * Math.max(1, diaHoje || 1)) / Math.max(1, diasNoMes || 30);
  const dif = venda - esperado;
  if (dif > 0) return { cls: "acima", txt: "Acima do ritmo", dif, esperado };
  if (dif >= -meta * 0.005) return { cls: "ok", txt: "No ritmo", dif, esperado };
  return { cls: "atras", txt: "Atrás do ritmo", dif, esperado };
}
function ChipRitmo({ r, peq }) {
  if (!r) return null;
  return (
    <span className={"vdx-ritmo " + r.cls + (peq ? " peq" : "")}>
      <I.seta className="ico" />{r.txt}
    </span>
  );
}
function AnelMeta({ pct, ritmo }) {
  const r = 50, c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct || 0));
  const pr = ritmo != null ? Math.max(0, Math.min(100, ritmo)) : 0;   // onde a meta pedia estar hoje (arco clarinho)
  return (
    <svg viewBox="0 0 128 128" className="vdx-anel" role="img" aria-label={pct + "% da meta"}>
      <circle cx="64" cy="64" r={r} className="vdx-anel-trilho" />
      {pr > p && <circle cx="64" cy="64" r={r} className="vdx-anel-esperado" strokeDasharray={c} strokeDashoffset={c * (1 - pr / 100)} transform="rotate(-90 64 64)"><title>{"Até hoje a meta pedia " + pr + "%"}</title></circle>}
      {p > 0 && <circle cx="64" cy="64" r={r} className="vdx-anel-arco" strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} transform="rotate(-90 64 64)" />}
      <text x="64" y="66" textAnchor="middle" className="vdx-anel-pct">{pct || 0}%</text>
      <text x="64" y="84" textAnchor="middle" className="vdx-anel-rot">da meta</text>
    </svg>
  );
}
// Vendas de cada dia, com a linha da meta por dia: barra escura = bateu a meta do dia.
function BarrasDias({ porDia, diasNoMes, diaHoje, metaDia, ehMesCorrente, diaSel, onDia }) {
  const [hov, setHov] = useState(null);
  const N = Math.max(1, diasNoMes || (porDia || []).length || 30);
  const W = 460, H = 250, pl = 50, pr = 6, pt = 16, pb = 30;
  const val = {}, qtd = {};
  (porDia || []).forEach((d) => { val[d.dia] = d.venda || 0; qtd[d.dia] = d.qtd || 0; });
  const maxV = Math.max(metaDia || 0, ...Object.values(val), 1) * 1.12;
  const bw = (W - pl - pr) / N, gap = Math.min(2, bw * 0.18);
  const x = (d) => pl + (d - 1) * bw;
  const y = (v) => pt + (1 - v / maxV) * (H - pt - pb);
  const base = y(0);
  const ticks = [0, 0.5, 1].map((f) => (maxV / 1.12) * f);
  const ultimo = ehMesCorrente ? diaHoje : N;
  const barra = (d) => {
    const v = val[d] || 0; if (!v) return null;
    const bx = x(d) + gap, w = Math.max(1, bw - gap * 2), top = y(v), h = base - top, rr = Math.min(3, w / 2, h);
    const cls = "vdx-bd" + (!(metaDia > 0) || v >= metaDia ? " bom" : "") + (d === diaSel ? " sel" : "") + (hov === d ? " hov" : "");
    return <path key={d} className={cls} d={`M${bx} ${base}V${top + rr}Q${bx} ${top} ${bx + rr} ${top}H${bx + w - rr}Q${bx + w} ${top} ${bx + w} ${top + rr}V${base}Z`} />;
  };
  const h = hov ? { d: hov, v: val[hov] || 0, q: qtd[hov] || 0 } : null;
  return (
    <div className="vdx-graf">
      <div className="vdx-legenda">
        {metaDia > 0 ? <>
          <span><i className="q bom" />Bateu a meta</span>
          <span><i className="q" />Abaixo</span>
          <span><i className="l-meta" />Meta/dia</span>
        </> : <span><i className="q bom" />Vendido no dia</span>}
      </div>
      <div className="vdx-graf-area">
        <svg viewBox={"0 0 " + W + " " + H} role="img" aria-label="Vendas de cada dia do mês">
          {ticks.map((v, i) => (
            <g key={i}>
              <line x1={pl} x2={W - pr} y1={y(v)} y2={y(v)} className="vdx-grade" />
              <text x={pl - 8} y={y(v) + 4} className="vdx-eixo" textAnchor="end">{dinheiroCurto(v)}</text>
            </g>
          ))}
          {Array.from({ length: N }, (_, i) => i + 1).map((d) => (d === 1 || d % 5 === 0) && (
            <text key={"t" + d} x={x(d) + bw / 2} y={H - 8} className={"vdx-eixo" + (ehMesCorrente && d === diaHoje ? " hoje" : "")} textAnchor="middle">{d}</text>
          ))}
          {Array.from({ length: N }, (_, i) => barra(i + 1))}
          {ehMesCorrente && diaHoje <= N && <circle cx={x(diaHoje) + bw / 2} cy={base + 5} r="2.5" className="vdx-bd-hoje" />}
          {metaDia > 0 && <line x1={pl} x2={W - pr} y1={y(metaDia)} y2={y(metaDia)} className="vdx-meta" />}
          {Array.from({ length: N }, (_, i) => i + 1).map((d) => (
            <rect key={"h" + d} x={x(d)} y={pt} width={bw} height={H - pt - pb} fill="transparent"
              style={{ cursor: d <= ultimo ? "pointer" : "default" }}
              onMouseEnter={() => setHov(d)} onMouseLeave={() => setHov(null)} onClick={() => d <= ultimo && onDia && onDia(d)} />
          ))}
        </svg>
        {h && (
          <div className="vdx-tip" style={{ left: Math.min(84, Math.max(16, ((x(h.d) + bw / 2) / W) * 100)) + "%" }}>
            <b>Dia {h.d}{ehMesCorrente && h.d === diaHoje ? " · hoje" : ""}</b>
            {h.d <= ultimo ? <>
              <span>Vendido <em>{dinheiro(h.v)}</em></span>
              <span>Vendas <em>{h.q}</em></span>
              {metaDia > 0 && <span className="m">{h.v >= metaDia ? "Bateu a meta do dia" : "Meta do dia " + dinheiroCurto(metaDia)}</span>}
            </> : <span>ainda não chegou</span>}
          </div>
        )}
      </div>
    </div>
  );
}
function BarrasVendas({ titulo, itens, total, vazio }) {
  const max = Math.max(1, ...itens.map((i) => i.valor));
  return (
    <div className="vdx-card">
      <div className="vdx-card-h"><b>{titulo}</b></div>
      {itens.length === 0 ? <div className="vdx-vazio">{vazio}</div> : (
        <div className="vdx-barras">
          {itens.map((it, i) => (
            <div key={it.nome} className={"vdx-barra" + (i === 0 ? " top" : "")}>
              <div className="vdx-barra-t"><span>{it.nome}</span><b>{dinheiroCurto(it.valor)}</b></div>
              <div className="vdx-barra-trilho"><i style={{ width: Math.max(2, (it.valor / max) * 100) + "%" }} /></div>
              <div className="vdx-barra-s">{it.qtd} venda{it.qtd === 1 ? "" : "s"} · {total ? Math.round((it.valor / total) * 100) : 0}% do total</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
const DIAS_SEMANA = [["Seg", 1], ["Ter", 2], ["Qua", 3], ["Qui", 4], ["Sex", 5], ["Sáb", 6], ["Dom", 0]];
const NOME_DIA = { 0: "domingo", 1: "segunda", 2: "terça", 3: "quarta", 4: "quinta", 5: "sexta", 6: "sábado" };
function SemanaVendas({ vendas }) {
  const soma = {}, qtd = {};
  (vendas || []).forEach((v) => { const w = new Date(v.data).getDay(); soma[w] = (soma[w] || 0) + (Number(v.valor) || 0); qtd[w] = (qtd[w] || 0) + 1; });
  const max = Math.max(1, ...Object.values(soma));
  const melhor = Object.keys(soma).sort((a, b) => soma[b] - soma[a])[0];
  return (
    <div className="vdx-card">
      <div className="vdx-card-h"><b>Dias da semana que mais vendem</b></div>
      {!vendas || !vendas.length ? <div className="vdx-vazio">Nenhuma venda no período.</div> : (
        <>
          <div className="vdx-semana">
            {DIAS_SEMANA.map(([rot, w]) => {
              const v = soma[w] || 0;
              return (
                <div key={w} className={"vdx-sem-col" + (String(w) === melhor ? " top" : "")} title={`${rot}: ${qtd[w] || 0} venda(s) · ${dinheiro(v)}`}>
                  <span className="vdx-sem-v">{v ? dinheiroCurto(v).replace("R$ ", "") : ""}</span>
                  <div className="vdx-sem-trilho"><i style={{ height: Math.max(v ? 4 : 0, (v / max) * 100) + "%" }} /></div>
                  <span className="vdx-sem-d">{rot}</span>
                </div>
              );
            })}
          </div>
          {melhor != null && <div className="vdx-sem-dica"><I.brilho className="ico" /><span>O melhor dia é <b>{NOME_DIA[melhor]}</b>: {qtd[melhor]} venda{qtd[melhor] === 1 ? "" : "s"}, {dinheiroCurto(soma[melhor])}.</span></div>}
        </>
      )}
    </div>
  );
}
function DashVendas({ dados, vendas, mes, ehMesCorrente, diaSel, setDiaSel, vendidoHoje, escopo }) {
  const g = dados.geral;
  const qtdHoje = (vendas || []).filter((v) => new Date(v.data).getDate() === dados.diaHoje).length;
  const pctMeta = g.meta > 0 ? Math.round((g.venda / g.meta) * 100) : 0;
  const pctRitmo = dados.diasNoMes ? Math.round((dados.diaHoje / dados.diasNoMes) * 100) : 0;
  const pctRecebido = g.venda > 0 ? Math.round((g.recebido / g.venda) * 100) : 0;
  const ritmo = ritmoDoMes(g.venda, g.meta, dados.diaHoje, dados.diasNoMes, ehMesCorrente);
  const metaDia = g.meta > 0 && dados.diasNoMes ? g.meta / dados.diasNoMes : 0;
  const vsMedia = dados.mediaDia > 0 && vendidoHoje > 0 ? Math.round((vendidoHoje / dados.mediaDia) * 100 - 100) : null;
  const difProj = g.meta > 0 ? dados.projecao - g.meta : 0;
  const quem = escopo === "time" ? "Vendido pelo time" : escopo === "minhas" ? "Você vendeu" : "Vendido por " + primeiroNome(dados.nomeEscopo || "");
  const agrupar = (chave) => {
    const m = {};
    (vendas || []).forEach((v) => {
      const k = String(chave(v) || "").trim() || "Sem informação";
      if (!m[k]) m[k] = { nome: k, valor: 0, qtd: 0 };
      m[k].valor += Number(v.valor) || 0; m[k].qtd += 1;
    });
    return Object.values(m).sort((a, b) => b.valor - a.valor);
  };
  const porForma = agrupar((v) => v.formaLabel || v.forma).slice(0, 5);
  const porCurso = agrupar((v) => v.curso).slice(0, 5);
  const totalLista = (vendas || []).reduce((s, v) => s + (Number(v.valor) || 0), 0);
  let fraseRitmo = null;
  if (ritmo && ehMesCorrente) {
    fraseRitmo = ritmo.cls === "acima" ? <><b>{dinheiroCurto(ritmo.dif)}</b> acima do esperado pra hoje. Bora manter!</>
      : ritmo.cls === "ok" ? <>Bem no ritmo da meta. Mais uma venda e já passa!</>
      : <>Faltam <b>{dinheiroCurto(-ritmo.dif)}</b> pra alcançar o ritmo de hoje.</>;
  } else if (ritmo) {
    fraseRitmo = ritmo.cls === "acima" ? <>Fechou o mês com <b>{pctMeta}%</b> da meta. Parabéns!</> : <>Fechou o mês com <b>{pctMeta}%</b> da meta.</>;
  }
  return (
    <div className="vdx">
      <div className="vdx-topo">
        <div className="vdx-hero">
          <div className="vdx-hero-h">
            <span className="vdx-kpi-ic"><I.cash className="ico" /></span>
            <span>{quem} em {mesLegivel(mes)}</span>
            <ChipRitmo r={ritmo} />
          </div>
          <div className="vdx-hero-corpo">
            <div className="vdx-hero-num">
              <div className="vdx-hero-v">{dinheiro(g.venda)}</div>
              {g.meta > 0 ? (
                <>
                  <div className="vdx-hero-s">{pctMeta}% da meta de <b>{dinheiro(g.meta)}</b></div>
                  {fraseRitmo && <div className={"vdx-hero-frase " + ritmo.cls}>{fraseRitmo}</div>}
                </>
              ) : <div className="vdx-hero-s">Defina as metas em <b>Gerenciar › Equipe e metas</b> pra ver o ritmo.</div>}
            </div>
            {g.meta > 0 && <AnelMeta pct={pctMeta} ritmo={ehMesCorrente ? pctRitmo : null} />}
          </div>
          {g.meta > 0 && (
            <div className="vdx-hero-pe">
              {ehMesCorrente && <div><span>Esperado hoje</span><b>{dinheiroCurto(ritmo.esperado)}</b></div>}
              <div><span>Falta pra meta</span><b>{g.falta > 0 ? dinheiroCurto(g.falta) : "Meta batida"}</b></div>
              {dados.diasRestantes > 0 && <div><span>Precisa/dia</span><b>{g.falta > 0 ? dinheiroCurto(dados.precisaPorDia) : "—"}</b></div>}
              <div><span>{dados.diasRestantes > 0 ? "Dias restantes" : "Dias no mês"}</span><b>{dados.diasRestantes > 0 ? dados.diasRestantes : dados.diasNoMes}</b></div>
            </div>
          )}
        </div>

        <div className="vdx-tiles">
          <div className="vdx-kpi">
            <div className="vdx-kpi-h"><span className="vdx-kpi-ic azul"><I.clock className="ico" /></span><span>{ehMesCorrente ? "Hoje" : "Último dia"}</span>
              {vsMedia !== null && <span className={"vdx-delta " + (vsMedia >= 0 ? "sobe" : "desce")}>{vsMedia >= 0 ? "▲" : "▼"} {Math.abs(vsMedia)}%</span>}
            </div>
            <div className="vdx-kpi-v" title={dinheiro(vendidoHoje)}>{dinheiroCurto(vendidoHoje)}</div>
            <div className="vdx-kpi-s">{qtdHoje ? <>{qtdHoje} venda{qtdHoje === 1 ? "" : "s"} · média {dinheiroCurto(dados.mediaDia)}/dia</> : ehMesCorrente ? <>Nenhuma venda ainda · média {dinheiroCurto(dados.mediaDia)}/dia</> : "Nenhuma venda nesse dia"}</div>
          </div>
          <div className="vdx-kpi">
            <div className="vdx-kpi-h"><span className="vdx-kpi-ic verde"><I.check className="ico" /></span><span>Recebido</span><span className="vdx-delta neutro">{pctRecebido}%</span></div>
            <div className="vdx-kpi-v" title={dinheiro(g.recebido)}>{dinheiroCurto(g.recebido)}</div>
            <div className="vdx-mini-trilho"><i style={{ width: Math.min(100, pctRecebido) + "%" }} /></div>
            <div className="vdx-kpi-s">a receber {dinheiroCurto(Math.max(0, g.venda - g.recebido))}</div>
          </div>
          <div className="vdx-kpi">
            <div className="vdx-kpi-h"><span className="vdx-kpi-ic roxo"><I.list className="ico" /></span><span>Vendas no mês</span></div>
            <div className="vdx-kpi-v">{g.qtd}</div>
            <div className="vdx-kpi-s">ticket médio <b>{g.qtd ? dinheiroCurto(g.venda / g.qtd) : "—"}</b></div>
          </div>
          <div className="vdx-kpi">
            <div className="vdx-kpi-h"><span className="vdx-kpi-ic ambar"><I.trend className="ico" /></span><span>{dados.diasRestantes > 0 ? "Projeção" : "Média por dia"}</span>
              {dados.diasRestantes > 0 && g.meta > 0 && difProj >= 0 && <span className="vdx-delta sobe">bate a meta</span>}
            </div>
            <div className="vdx-kpi-v" title={dinheiro(dados.diasRestantes > 0 ? dados.projecao : dados.mediaDia)}>{dinheiroCurto(dados.diasRestantes > 0 ? dados.projecao : dados.mediaDia)}</div>
            <div className="vdx-kpi-s">{dados.diasRestantes > 0 ? (g.meta > 0 ? (difProj >= 0 ? <>no ritmo atual, passa a meta em <b>{dinheiroCurto(difProj)}</b></> : <>no ritmo atual, ficam faltando <b>{dinheiroCurto(-difProj)}</b></>) : "se continuar no ritmo atual") : "no mês fechado"}</div>
          </div>
        </div>
      </div>

      <div className="vdx-grade-2">
        <div className="vdx-card">
          <div className="vdx-card-h">
            <b>Evolução do mês</b>
            <input type="date" className="vdx-data" aria-label="Ver as vendas de um dia" value={diaSel ? mes + "-" + String(diaSel).padStart(2, "0") : ""}
              min={mes + "-01"} max={mes + "-" + String(dados.diasNoMes).padStart(2, "0")}
              onChange={(e) => setDiaSel(e.target.value ? Number(e.target.value.slice(8, 10)) : null)} />
          </div>
          <GraficoMes porDia={dados.porDia || []} diasNoMes={dados.diasNoMes} diaHoje={dados.diaHoje} meta={g.meta} ehMesCorrente={ehMesCorrente}
            diaSel={diaSel} onDia={(d) => setDiaSel(diaSel === d ? null : d)} />
        </div>
        <div className="vdx-card">
          <div className="vdx-card-h"><b>Vendas por dia</b>{dados.melhorDia ? <span>melhor dia: <b>{dados.melhorDia.dia}</b> · {dinheiroCurto(dados.melhorDia.venda)}</span> : <span>clique num dia</span>}</div>
          <BarrasDias porDia={dados.porDia || []} diasNoMes={dados.diasNoMes} diaHoje={dados.diaHoje} metaDia={metaDia} ehMesCorrente={ehMesCorrente}
            diaSel={diaSel} onDia={(d) => setDiaSel(diaSel === d ? null : d)} />
        </div>
      </div>

      <div className="vdx-grade-3">
        <BarrasVendas titulo="Formas de pagamento" itens={porForma} total={totalLista} vazio="Nenhuma venda no período." />
        <BarrasVendas titulo="Cursos que mais vendem" itens={porCurso} total={totalLista} vazio="Nenhuma venda no período." />
        <SemanaVendas vendas={vendas} />
      </div>
    </div>
  );
}

function PainelVendas({ showToast, isGer = true, ehLider = false }) {
  const [mes, setMes] = useState("");
  const [dados, setDados] = useState(null);
  const [vendas, setVendas] = useState([]);
  const [pessoas, setPessoas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [form, setForm] = useState(null);
  const [showPessoas, setShowPessoas] = useState(false);
  const [verLista, setVerLista] = useState(false);
  const [escopo, setEscopo] = useState(isGer ? "time" : "minhas");   // "time" | "minhas"
  const [diaSel, setDiaSel] = useState(null);   // dia do mês escolhido (número) ou null
  const [showImportarV, setShowImportarV] = useState(false);
  const [showInteg, setShowInteg] = useState(false);
  const [showPeriodo, setShowPeriodo] = useState(false);
  const [showDup, setShowDup] = useState(false);
  const [pessoaRapida, setPessoaRapida] = useState(null);
  const [porEquipe, setPorEquipe] = useState(true);   // ranking separado por time
  const [buscaVenda, setBuscaVenda] = useState("");
  const [menuAberto, setMenuAberto] = useState(false);
  const [showAnalise, setShowAnalise] = useState(false);

  const carregar = (m, esc) => {
    const e = esc || escopo;
    // "time" = todo mundo | "minhas" = eu | qualquer outro valor = id da pessoa escolhida
    const alvo = e === "time" ? "" : e === "minhas" ? ((dados && dados.souEu) || "eu") : e;
    setCarregando(true);
    return Promise.all([
      api.vdPainel(m || mes, alvo).then((d) => { setDados(d); if (!mes) setMes(d.mes); return d; }),
      api.vdLista(m || mes, alvo && alvo !== "eu" ? alvo : "").then((d) => setVendas(d.vendas || [])),
      api.vdPessoas().then((d) => setPessoas(d.pessoas || [])).catch(() => {}),
    ]).catch((e) => showToast(e.message)).finally(() => setCarregando(false));
  };
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, []);
  function trocarMes(m) { setMes(m); carregar(m); }
  function trocarEscopo(e) { setEscopo(e); setVerLista(false); carregar(mes, e); }

  // lista de vendas filtrada pela busca (cliente, curso, plataforma, código, vendedor)
  const vendasFiltradas = useMemo(() => {
    const q = (buscaVenda || "").trim().toLowerCase();
    if (!q) return vendas;
    return (vendas || []).filter((v) =>
      [v.cliente, v.curso, v.plataforma, v.codigo, v.pessoaNome, v.email, v.telefone]
        .some((c) => String(c || "").toLowerCase().includes(q))
    );
  }, [vendas, buscaVenda]);

  const [exportandoV, setExportandoV] = useState(false);
  const [expDe, setExpDe] = useState("");
  const [expAte, setExpAte] = useState("");
  async function exportarVendasPDF() {
    let lista = vendasFiltradas || [];
    // filtro por período escolhido (De / Até) — opcional
    const tsDe = expDe ? new Date(expDe + "T00:00:00").getTime() : 0;
    const tsAte = expAte ? new Date(expAte + "T23:59:59").getTime() : 0;
    if (tsDe || tsAte) lista = lista.filter((v) => { const t = new Date(v.data).getTime(); return (!tsDe || t >= tsDe) && (!tsAte || t <= tsAte); });
    if (!lista.length) { showToast("Nenhuma venda no período pra exportar"); return; }
    const periodoTxt = (expDe || expAte)
      ? ((expDe ? new Date(expDe + "T00:00:00").toLocaleDateString("pt-BR") : "início") + " até " + (expAte ? new Date(expAte + "T00:00:00").toLocaleDateString("pt-BR") : "hoje"))
      : mesLegivel(mes);
    setExportandoV(true); showToast("Gerando PDF…");
    try {
      const dinBR = (v) => "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const dataBR = (d) => { try { return new Date(d).toLocaleDateString("pt-BR"); } catch (_) { return "—"; } };
      const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      // agrupa por vendedor
      const porVend = {};
      for (const v of lista) { const nome = v.pessoaNome || "— sem vendedor —"; (porVend[nome] = porVend[nome] || []).push(v); }
      const nomes = Object.keys(porVend).sort((a, b) => (porVend[b].reduce((s, v) => s + Number(v.valor || 0), 0)) - (porVend[a].reduce((s, v) => s + Number(v.valor || 0), 0)));
      const totalGeral = lista.reduce((s, v) => s + Number(v.valor || 0), 0);
      const recebidoGeral = lista.reduce((s, v) => s + Number(v.recebido || 0), 0);

      let html = '<div style="font-family:\'Segoe UI\',Roboto,Arial,sans-serif; color:#1f2430; padding:0; background:#fff; width:760px;">';
      // Cabeçalho
      html += '<div style="background:linear-gradient(135deg,#0f5132,#25A06B); border-radius:14px; padding:22px 26px; color:#fff; margin-bottom:20px;">';
      html += '<div style="display:flex; align-items:center; justify-content:space-between;">';
      html += '<div style="font-size:24px; font-weight:800; letter-spacing:-.02em;">instructiva</div>';
      html += '<div style="font-size:11px; opacity:.85;">Emitido em ' + esc(new Date().toLocaleString("pt-BR")) + '</div></div>';
      html += '<div style="font-size:19px; font-weight:700; margin-top:14px;">Relatório de Vendas</div>';
      html += '<div style="font-size:13px; opacity:.9; margin-top:2px;">' + esc(periodoTxt) + '</div>';
      html += '</div>';
      // KPIs
      const kpi = (rot, val) => '<div style="flex:1; min-width:150px; background:#f6f8fa; border:1px solid #e6eaef; border-radius:12px; padding:13px 16px; box-sizing:border-box;"><div style="font-size:10.5px; color:#67707e; font-weight:600; text-transform:uppercase; letter-spacing:.04em;">' + rot + '</div><div style="font-size:16px; font-weight:800; color:#1f2430; margin-top:3px; white-space:nowrap;">' + val + '</div></div>';
      html += '<div style="display:flex; gap:12px; margin-bottom:22px; flex-wrap:wrap;">' + kpi("Vendas", String(lista.length)) + kpi("Total vendido", dinBR(totalGeral)) + kpi("Recebido", dinBR(recebidoGeral)) + kpi("Ticket médio", dinBR(lista.length ? totalGeral / lista.length : 0)) + '</div>';
      // Resumo por vendedor (barras)
      html += '<div style="font-size:15px; font-weight:800; color:#1f2430; margin:0 0 12px;">Resumo por vendedor</div>';
      const maxV = Math.max(...nomes.map((n) => porVend[n].reduce((s, v) => s + Number(v.valor || 0), 0)), 1);
      for (const nome of nomes) {
        const vs = porVend[nome];
        const tot = vs.reduce((s, v) => s + Number(v.valor || 0), 0);
        const pct = Math.round((tot / maxV) * 100);
        html += '<div style="margin-bottom:10px;">';
        html += '<div style="display:flex; justify-content:space-between; font-size:12.5px; margin-bottom:4px;"><span style="font-weight:700; color:#1f2430;">' + esc(nome) + '</span><span style="color:#67707e;">' + vs.length + ' venda(s) · <b style="color:#1f2430;">' + dinBR(tot) + '</b></span></div>';
        html += '<div style="height:8px; background:#eef1f4; border-radius:6px; overflow:hidden;"><div style="height:100%; width:' + pct + '%; background:linear-gradient(90deg,#25A06B,#34c47f); border-radius:6px;"></div></div>';
        html += '</div>';
      }
      // Detalhe por vendedor — cada venda num cartão (mostra tudo, sem cortar)
      for (const nome of nomes) {
        const vs = porVend[nome].slice().sort((a, b) => new Date(b.data) - new Date(a.data));
        const tot = vs.reduce((s, v) => s + Number(v.valor || 0), 0);
        html += '<div style="margin-top:26px; padding-bottom:8px; border-bottom:2px solid #25A06B; page-break-after:avoid;"><span style="font-size:16px; font-weight:800; color:#0f5132;">' + esc(nome) + '</span> <span style="font-size:12.5px; color:#67707e;">· ' + vs.length + ' venda(s) · ' + dinBR(tot) + '</span></div>';
        for (const v of vs) {
          html += '<div style="border:1px solid #e6eaef; border-radius:12px; padding:12px 15px; margin-top:10px; page-break-inside:avoid;">';
          html += '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">';
          html += '<div style="font-size:14px; font-weight:700; color:#1f2430;">' + esc(v.cliente || "—") + '</div>';
          html += '<div style="text-align:right; white-space:nowrap;"><div style="font-size:15px; font-weight:800; color:#0f5132;">' + dinBR(v.valor) + '</div><div style="font-size:11px; color:#67707e;">recebido ' + dinBR(v.recebido) + '</div></div>';
          html += '</div>';
          // linha de infos (curso, plataforma, data, código)
          const chip = (t) => t ? '<span style="display:inline-block; background:#f0fdf4; color:#166534; border:1px solid #bbf7d0; border-radius:20px; padding:2px 10px; font-size:11px; font-weight:600; margin:6px 6px 0 0;">' + esc(t) + '</span>' : '';
          html += '<div style="margin-top:2px;">' + chip(v.curso) + chip(v.plataforma) + chip(v.parcelas ? v.parcelas + "x" : "") + chip(dataBR(v.data)) + (v.codigo ? '<span style="display:inline-block; color:#67707e; font-size:11px; margin:6px 0 0 2px;">cód ' + esc(v.codigo) + '</span>' : '') + '</div>';
          // contato (email + telefone)
          if (v.email || v.telefone) {
            html += '<div style="margin-top:9px; padding-top:9px; border-top:1px dashed #e6eaef; font-size:12px; color:#4a5361;">';
            if (v.email) html += '<span style="margin-right:16px;">✉️ ' + esc(v.email) + '</span>';
            if (v.telefone) html += '<span>📞 ' + esc(v.telefone) + '</span>';
            html += '</div>';
          }
          html += '</div>';
        }
      }
      html += '</div>';
      const holder = document.createElement("div");
      holder.style.position = "fixed"; holder.style.left = "-9999px"; holder.style.top = "0";
      holder.innerHTML = html;
      document.body.appendChild(holder);
      try {
        const html2pdf = (await import("html2pdf.js")).default;
        const nomeArq = "vendas-" + mesLegivel(mes).replace(/\s+/g, "-").toLowerCase() + ".pdf";
        await html2pdf().set({
          margin: [12, 12, 14, 12], filename: nomeArq,
          image: { type: "jpeg", quality: 0.97 },
          html2canvas: { scale: 2, backgroundColor: "#ffffff", logging: false, windowWidth: 800 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        }).from(holder.firstElementChild).save();
        showToast("✅ PDF baixado!");
      } finally { document.body.removeChild(holder); }
    } catch (e) { showToast("✗ " + (e.message || "Falha ao gerar PDF")); }
    finally { setExportandoV(false); }
  }

  if (carregando && !dados) return <div className="dash-empty"><span className="spin" /> Carregando…</div>;
  if (!dados) return null;

  const g = dados.geral;
  const linhas = dados.linhas || [];
  const concorrem = linhas.filter((l) => l.venda > 0 && !l.foraDoPodio);
  const foraPodio = linhas.filter((l) => l.venda > 0 && l.foraDoPodio);
  const comVenda = concorrem;
  const podio = concorrem.slice(0, 3);
  const semVenda = linhas.filter((l) => l.venda <= 0);
  const hojeReal = new Date();
  const ehMesCorrente = mes === hojeReal.getFullYear() + "-" + String(hojeReal.getMonth() + 1).padStart(2, "0");
  const vendidoHoje = ((dados.porDia || []).find((d) => d.dia === dados.diaHoje) || {}).venda || 0;
  // vendas do dia escolhido (clicando no gráfico ou pelo calendário)
  const doDia = diaSel ? (vendas || []).filter((v) => new Date(v.data).getDate() === diaSel) : [];
  const totalDia = doDia.reduce((s2, v) => s2 + (Number(v.valor) || 0), 0);
  const recebidoDia = doDia.reduce((s2, v) => s2 + (Number(v.recebido) || 0), 0);
  // ranking separado por time: cada equipe vira um bloco com o próprio subtotal
  const times = (() => {
    const m = {};
    comVenda.forEach((l) => {
      const k = (l.grupo || "").trim() || "Sem equipe";
      if (!m[k]) m[k] = { nome: k, venda: 0, recebido: 0, meta: 0, qtd: 0, gente: [] };
      m[k].venda += l.venda; m[k].recebido += l.recebido; m[k].meta += l.meta || 0; m[k].qtd += l.qtd || 0;
      m[k].gente.push(l);
    });
    return Object.values(m).map((t) => ({
      ...t,
      pct: t.meta > 0 ? Math.round((t.venda / t.meta) * 100) : 0,
      gente: t.gente.sort((a, b) => b.venda - a.venda),
    })).sort((a, b) => b.venda - a.venda);
  })();
  const hoje = dados.hoje || {};
  const destHoje = hoje.destaque || null;
  // ritmo: onde a meta deveria estar hoje se o mês fosse parelho
  // ritmo de cada vendedor no ranking (só no mês corrente e pra quem tem meta)
  const ritmoDe = (l) => (ehMesCorrente ? ritmoDoMes(l.venda, l.meta, dados.diaHoje, dados.diasNoMes, true) : null);

  if (showAnalise) {
    return (
      <div className="vd">
        <TelaMetricas mes={mes} onVoltar={() => setShowAnalise(false)} showToast={showToast} />
      </div>
    );
  }

  return (
    <div className="vd">
      {/* topo */}
      <div className="vd-top">
        <select className="vd-mes" value={mes} onChange={(e) => trocarMes(e.target.value)}>
          {(dados.meses || []).map((m) => <option key={m} value={m}>{mesLegivel(m).charAt(0).toUpperCase() + mesLegivel(m).slice(1)}</option>)}
        </select>
        <div className="vd-switch">
          <button className={escopo === "time" ? "on" : ""} onClick={() => trocarEscopo("time")}>Time</button>
          {dados && (dados.souEu || !isGer) && (
            <button className={escopo === "minhas" ? "on" : ""} onClick={() => trocarEscopo("minhas")}>Minhas vendas</button>
          )}
          {(isGer || ehLider) && (
            <select className={"vd-switch-sel" + (escopo !== "time" && escopo !== "minhas" ? " on" : "")}
              value={escopo !== "time" && escopo !== "minhas" ? escopo : ""}
              onChange={(e) => trocarEscopo(e.target.value || "time")}>
              <option value="">Ver de um vendedor…</option>
              {(dados ? dados.linhas : []).map((l) => <option key={l.pessoaId} value={l.pessoaId}>{l.nome}</option>)}
            </select>
          )}
        </div>
        <div className="vd-top-acoes">
          <button className="onum-add" onClick={() => setForm({
            pessoaId: pessoas[0] ? pessoas[0].id : "", cliente: "", email: "", telefone: "", curso: "",
            forma: "Pix", plataforma: "Hotmart", codigo: "", parcelas: "", valor: "", recebido: "",
            data: new Date().toISOString().slice(0, 10),
          })}><I.plus className="ico" /> Lançar venda</button>
          <button className="onum-btn-ghost" onClick={() => setShowAnalise(true)}><I.trend className="ico" /> Métricas</button>
          {isGer && <button className="onum-btn-ghost" onClick={() => setVerLista((v) => !v)}><I.chat className="ico" /> {verLista ? "Ver ranking" : `Vendas do mês (${vendas.length})`}</button>}
          {isGer && (
            <div className="vd-menu-wrap">
              <button className="onum-btn-ghost" onClick={() => setMenuAberto((v) => !v)}>
                <I.cog className="ico" /> Gerenciar <span className="vd-menu-seta">▾</span>
              </button>
              {menuAberto && (
                <>
                  <div className="vd-menu-fora" onClick={() => setMenuAberto(false)} />
                  <div className="vd-menu">
                    <button onClick={() => { setShowPeriodo(true); setMenuAberto(false); }}><I.gauge className="ico" /> Vendas por período</button>
                    <button onClick={() => { setShowPessoas(true); setMenuAberto(false); }}><I.users className="ico" /> Equipe &amp; metas</button>
                    <button onClick={() => { setShowImportarV(true); setMenuAberto(false); }}><I.clip className="ico" /> Importar planilha</button>
                    <button onClick={() => { setShowInteg(true); setMenuAberto(false); }}><I.link className="ico" /> Integrar sistema</button>
                    <button onClick={() => { setShowDup(true); setMenuAberto(false); }}><I.search className="ico" /> Conferir repetidas</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PAINEL DO MÊS (v2.2) */}
      <DashVendas dados={dados} vendas={vendas} mes={mes} ehMesCorrente={ehMesCorrente} diaSel={diaSel} setDiaSel={setDiaSel}
        vendidoHoje={vendidoHoje} escopo={escopo} />

      {diaSel && (
        <div className="vd-dodia">
          <div className="vd-dodia-cab">
            <div>
              <b>{String(diaSel).padStart(2, "0")}/{mes.slice(5)} </b>
              <span>{doDia.length} venda(s) · recebido {dinheiro(recebidoDia)}</span>
            </div>
            <span className="vd-dodia-tot">{dinheiro(totalDia)}</span>
            <button className="crm-x" onClick={() => setDiaSel(null)} title="Fechar">✕</button>
          </div>
          {doDia.length === 0 ? (
            <div className="crm-col-vazio">Nenhuma venda nesse dia.</div>
          ) : (
            <div className="vd-dodia-lista">
              {doDia.slice().sort((a, b) => b.valor - a.valor).map((v) => (
                <div key={v.id} className="vd-dodia-item">
                  <span className="vd-dodia-vend">{v.pessoaNome}</span>
                  <div className="vd-dodia-cli">{v.cliente || "—"}
                    <small>{[v.curso, v.formaLabel || v.forma, v.parcelas ? v.parcelas + "x" : "", v.plataforma].filter(Boolean).join(" · ")}</small>
                  </div>
                  <div className="vd-dodia-vals">{dinheiro(v.valor)}<small>recebido {dinheiro(v.recebido)}</small></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {escopo !== "time" && !verLista ? (
        <>
          {escopo !== "minhas" && dados.nomeEscopo && (
            <div className="vd-vendo">
              <Avatar nome={dados.nomeEscopo} foto={(dados.linhas.find((l) => l.pessoaId === escopo) || {}).foto} size={34} />
              <div><b>Painel de {dados.nomeEscopo}</b><span>você está vendo os números de uma pessoa</span></div>
              <button className="btn btn-sm" onClick={() => trocarEscopo("time")}>← Voltar pro time</button>
            </div>
          )}
          {dados.posicao > 0 && (
            <div className="vd-posicao">
              <span className="vd-pos-medal">{dados.posicao === 1 ? "🥇" : dados.posicao === 2 ? "🥈" : dados.posicao === 3 ? "🥉" : "🏅"}</span>
              <div>
                <b>{dados.posicao}º lugar</b>
                <span>de {dados.totalNoRanking} que venderam em {mesLegivel(mes)}</span>
              </div>
              <button className="btn btn-sm" onClick={() => trocarEscopo("time")}>Ver o ranking do time</button>
            </div>
          )}
          <div className="vd-sec">{escopo === "minhas" ? "Suas vendas" : "Vendas de " + (dados.nomeEscopo || "")}, dia a dia ({vendas.length})</div>
          <DiaADia vendas={vendas}
            onEditar={(v) => setForm({ ...v, data: new Date(v.data).toISOString().slice(0, 10),
              valor: String(v.valor), recebido: String(v.recebido), parcelas: String(v.parcelas || "") })}
            onExcluir={async (v) => {
              if (!window.confirm(`Excluir a venda de ${v.cliente || "—"} (${dinheiro(v.valor)})?`)) return;
              try { await api.vdExcluir(v.id); showToast("✓ Venda excluída"); carregar(); } catch (e) { showToast("✗ " + e.message); }
            }} />
        </>
      ) : verLista ? (
        <>
        <div className="vd-busca">
          <I.search className="ico" />
          <input value={buscaVenda} onChange={(e) => setBuscaVenda(e.target.value)}
            placeholder="Buscar por nome do cliente, curso, plataforma ou código…" />
          {buscaVenda && <button className="vd-busca-x" onClick={() => setBuscaVenda("")}>✕</button>}
        </div>
        <div className="vd-lista-top">
          <span>
            <b>{vendasFiltradas.length}</b>{buscaVenda ? ` de ${vendas.length}` : ""} {isGer ? "venda(s) lançada(s)" : "venda(s) sua(s)"} em {mesLegivel(mes)}
          </span>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Exportar de</span>
            <input type="date" className="vd-data" value={expDe} onChange={(e) => setExpDe(e.target.value)} style={{ padding: "5px 8px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 12.5 }} />
            <span style={{ fontSize: 12, color: "var(--muted)" }}>até</span>
            <input type="date" className="vd-data" value={expAte} onChange={(e) => setExpAte(e.target.value)} style={{ padding: "5px 8px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 12.5 }} />
            {(expDe || expAte) && <button className="vd-busca-x" title="Limpar período" onClick={() => { setExpDe(""); setExpAte(""); }}>✕</button>}
            <button className="crm-lote-del" style={{ background: "var(--card)", color: "var(--ink, #111418)", border: "1px solid var(--line)" }} onClick={exportarVendasPDF} disabled={exportandoV}>
              {exportandoV ? "Gerando…" : "⬇ Exportar PDF"}
            </button>
            {isGer && <button className="crm-lote-del" onClick={async () => {
            if (!window.confirm(`Apagar TODAS as ${vendas.length} vendas de ${mesLegivel(mes)}? Isso não dá pra desfazer.`)) return;
            try { const r = await api.vdLimparMes(mes); showToast(`✓ ${r.excluidas} venda(s) apagada(s)`); carregar(); }
            catch (e) { showToast("✗ " + e.message); }
          }}><I.trash className="ico" /> Limpar o mês</button>}
          </div>
        </div>
        <ListaVendas vendas={vendasFiltradas} onEditar={(v) => setForm({
          ...v, data: new Date(v.data).toISOString().slice(0, 10),
          valor: String(v.valor), recebido: String(v.recebido), parcelas: String(v.parcelas || ""),
        })} onExcluir={async (v) => {
          if (!window.confirm(`Excluir a venda de ${v.cliente || v.pessoaNome}?`)) return;
          try { await api.vdExcluir(v.id); showToast("✓ Venda excluída"); carregar(); } catch (e) { showToast(e.message); }
        }} />
        </>
      ) : (
        <>
          {/* PÓDIO */}
          {podio.length > 0 && (
            <div className="vd-podio">
              {[1, 0, 2].map((i) => {
                const p = podio[i]; if (!p) return <div key={i} className="vd-lug vazio" />;
                const lugar = i + 1;
                return (
                  <div key={p.pessoaId} className={"vd-lug l" + lugar}>
                    <div className="vd-medalha">{lugar === 1 ? "🥇" : lugar === 2 ? "🥈" : "🥉"}</div>
                    <Avatar nome={p.nome} foto={p.foto} size={lugar === 1 ? 74 : 58} />
                    <div className="vd-lug-nome">{p.nome}</div>
                    <div className="vd-lug-vl">{dinheiro(p.venda)}</div>
                    <ChipRitmo r={ritmoDe(p)} peq />
                    <div className="vd-lug-meta">
                      <div className="vd-barra fina"><div className="vd-barra-in" style={{ width: Math.min(100, p.pct) + "%" }} /></div>
                      <span>{p.pct}% da meta</span>
                    </div>
                    <div className="vd-degrau" />
                  </div>
                );
              })}
            </div>
          )}

          {/* RANKING DO MÊS + DESTAQUE DO DIA */}
          <div className="vd-sec-linha">
            <div className="vd-sec">Ranking do mês</div>
            <div className="vd-toggle">
              <button className={porEquipe ? "on" : ""} onClick={() => setPorEquipe(true)}>Por equipe</button>
              <button className={!porEquipe ? "on" : ""} onClick={() => setPorEquipe(false)}>Geral</button>
            </div>
          </div>

          <div className="vd-rank-wrap">
            <div className="vd-rank-col">
              {porEquipe ? (
                times.map((t) => (
                  <section key={t.nome} className="vd-time">
                    <header className="vd-time-cab">
                      <div className="vd-time-id">
                        <span className="vd-time-nome">{t.nome}</span>
                        <span className="vd-time-gente">{t.gente.length} pessoa(s) · {t.qtd} venda(s)</span>
                      </div>
                      <div className="vd-time-num">
                        <span className="vd-time-vl">{dinheiro(t.venda)}</span>
                        <span className="vd-time-pe">{t.meta > 0 ? `${t.pct}% de ${dinheiroCurto(t.meta)}` : "sem meta definida"}</span>
                      </div>
                    </header>
                    <div className="vd-time-barra"><i style={{ width: Math.min(100, t.pct) + "%" }} /></div>
                    <div className="vd-rank">
                      {t.gente.map((l, i) => (
                        <div key={l.pessoaId} className={"vd-linha clicavel" + (i === 0 ? " lider" : "")} onClick={() => setPessoaRapida(l)} title="Clique pra definir a equipe e a meta">
                          <span className="vd-pos">{i + 1}º</span>
                          <Avatar nome={l.nome} foto={l.foto} size={34} />
                          <div className="vd-linha-info">
                            <div className="vd-linha-nome">{l.nome}<ChipRitmo r={ritmoDe(l)} peq /></div>
                            <div className="vd-barra fina"><div className="vd-barra-in" style={{ width: Math.min(100, l.pct) + "%" }} /></div>
                          </div>
                          <div className="vd-linha-nums">
                            <span className="vd-vendido">{dinheiro(l.venda)}</span>
                            <span className="vd-detalhe">{l.meta > 0 ? `${l.pct}% de ${dinheiroCurto(l.meta)} · ` : ""}recebido {dinheiroCurto(l.recebido)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))
              ) : (
                <div className="vd-rank">
                  {comVenda.map((l, i) => (
                    <div key={l.pessoaId} className={"vd-linha clicavel" + (i < 3 ? " top" : "")} onClick={() => setPessoaRapida(l)} title="Clique pra definir a equipe e a meta">
                      <span className="vd-pos">{i + 1}º</span>
                      <Avatar nome={l.nome} foto={l.foto} size={34} />
                      <div className="vd-linha-info">
                        <div className="vd-linha-nome">{l.nome}{l.grupo && <span className="vd-grupo">{l.grupo}</span>}<ChipRitmo r={ritmoDe(l)} peq /></div>
                        <div className="vd-barra fina"><div className="vd-barra-in" style={{ width: Math.min(100, l.pct) + "%" }} /></div>
                      </div>
                      <div className="vd-linha-nums">
                        <span className="vd-vendido">{dinheiro(l.venda)}</span>
                        <span className="vd-detalhe">{l.meta > 0 ? `${l.pct}% de ${dinheiroCurto(l.meta)} · ` : ""}recebido {dinheiroCurto(l.recebido)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {foraPodio.length > 0 && (
                <section className="vd-time direta">
                  <header className="vd-time-cab">
                    <div className="vd-time-id">
                      <span className="vd-time-nome">Venda direta</span>
                      <span className="vd-time-gente">não concorre no pódio</span>
                    </div>
                    <div className="vd-time-num">
                      <span className="vd-time-vl">{dinheiro(foraPodio.reduce((s, l) => s + l.venda, 0))}</span>
                      <span className="vd-time-pe">{foraPodio.reduce((s, l) => s + (l.qtd || 0), 0)} venda(s)</span>
                    </div>
                  </header>
                  <div className="vd-rank">
                    {foraPodio.map((l) => (
                      <div key={l.pessoaId} className="vd-linha clicavel fora" onClick={() => setPessoaRapida(l)} title="Venda direta — não concorre no pódio">
                        <span className="vd-pos">—</span>
                        <Avatar nome={l.nome} foto={l.foto} size={34} />
                        <div className="vd-linha-info">
                          <div className="vd-linha-nome">{l.nome}</div>
                          <div className="vd-barra fina"><div className="vd-barra-in" style={{ width: Math.min(100, l.pct) + "%" }} /></div>
                        </div>
                        <div className="vd-linha-nums">
                          <span className="vd-vendido">{dinheiro(l.venda)}</span>
                          <span className="vd-detalhe">recebido {dinheiroCurto(l.recebido)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {comVenda.length === 0 && foraPodio.length === 0 && <div className="crm-col-vazio">Nenhuma venda lançada neste mês ainda.</div>}
              {semVenda.length > 0 && (
                <div className="vd-zerados">
                  <span>Ainda sem venda no mês:</span>
                  {semVenda.map((l) => <span key={l.pessoaId} className="vd-zerado">{l.nome}</span>)}
                </div>
              )}
            </div>

            {/* DESTAQUE DO DIA — colado no ranking do mês */}
            <aside className="vd-hoje">
              <div className="vd-hoje-cab">
                <span className="vd-eyebrow">Destaque do dia</span>
                <span className="vd-hoje-data">{String(hoje.dia || dados.diaHoje).padStart(2, "0")}/{mes.slice(5)}</span>
              </div>
              {destHoje ? (
                <>
                  <div className="vd-hoje-card">
                    <div className="vd-hoje-coroa">👑</div>
                    <Avatar nome={destHoje.nome} foto={destHoje.foto} size={76} />
                    <div className="vd-hoje-nome">{destHoje.nome}</div>
                    {destHoje.grupo && <div className="vd-hoje-eq">{destHoje.grupo}</div>}
                    <div className="vd-hoje-vl">{dinheiro(destHoje.valor)}</div>
                    <div className="vd-hoje-pe">
                      {destHoje.qtd} venda(s) hoje{destHoje.cursoTop ? " · " + destHoje.cursoTop : ""}
                    </div>
                  </div>
                  {(hoje.atras || []).length > 0 && (
                    <div className="vd-hoje-atras">
                      <span className="vd-eyebrow">Logo atrás</span>
                      {hoje.atras.map((r, i) => (
                        <div key={r.pessoaId} className="vd-hoje-item">
                          <span className="vd-hoje-pos">{i + 2}º</span>
                          <Avatar nome={r.nome} foto={r.foto} size={26} />
                          <b>{r.nome.split(" ").slice(0, 2).join(" ")}</b>
                          <span>{dinheiroCurto(r.valor)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="vd-hoje-tot">O time fez <b>{dinheiro(hoje.total || 0)}</b> hoje em {hoje.qtd || 0} venda(s)</div>
                </>
              ) : (
                <div className="vd-hoje-vazio">
                  <span>🚀</span>
                  Ninguém abriu o dia ainda.<br />A primeira venda de hoje aparece aqui.
                </div>
              )}
            </aside>
          </div>
        </>
      )}

      {form && <FormVenda form={form} setForm={setForm} pessoas={pessoas} isGer={isGer} onSalvo={() => { setForm(null); carregar(); }} showToast={showToast} />}
      {showPeriodo && <ModalVendasPeriodo isGer={isGer} onClose={() => setShowPeriodo(false)} showToast={showToast} />}
      {pessoaRapida && <ModalPessoaRapida pessoa={pessoaRapida} pessoas={pessoas} mes={mes} isGer={isGer} onVerPainel={(id) => trocarEscopo(id)} onClose={() => setPessoaRapida(null)} onSalvo={carregar} showToast={showToast} />}
      {showDup && <ModalDuplicadas mes={mes} onClose={() => setShowDup(false)} onMudou={carregar} showToast={showToast} />}
      {showInteg && <ModalIntegracao onClose={() => setShowInteg(false)} showToast={showToast} />}
      {showImportarV && <ModalImportarVendas mesAtual={mes} onClose={() => setShowImportarV(false)} onDone={carregar} showToast={showToast} />}
      {showPessoas && <ModalPessoas pessoas={pessoas} onClose={() => setShowPessoas(false)} onMudou={carregar} showToast={showToast} />}
    </div>
  );
}

function ListaVendas({ vendas, onEditar, onExcluir }) {
  if (!vendas.length) return <div className="crm-col-vazio" style={{ marginTop: 18 }}>Nenhuma venda lançada neste mês.</div>;
  return (
    <div className="vd-lista">
      {vendas.map((v) => (
        <div key={v.id} className="vd-item">
          <div className="vd-item-esq">
            <div className="vd-item-cli">{v.cliente || "—"}<span className="vd-item-vend">{v.pessoaNome}</span></div>
            <div className="vd-item-sub">
              {new Date(v.data).toLocaleDateString("pt-BR")}
              {v.curso ? " · " + v.curso : ""}
              {(v.formaLabel || v.forma) ? " · " + (v.formaLabel || v.forma) : ""}
              {v.parcelas ? " " + v.parcelas + "x" : ""}
              {v.plataforma ? " · " + v.plataforma : ""}
              {v.codigo ? " · cód " + v.codigo : ""}
            </div>
          </div>
          <div className="vd-item-vals">
            <span className="vd-item-vl">{dinheiro(v.valor)}</span>
            <span className="vd-item-rec">recebido {dinheiro(v.recebido)}</span>
          </div>
          <div className="vd-item-acoes">
            <button className="btn btn-sm" onClick={() => onEditar(v)}>Editar</button>
            <button className="crm-tarefa-del" onClick={() => onExcluir(v)} title="Excluir">✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function FormVenda({ form, setForm, pessoas, isGer = true, onSalvo, showToast }) {
  const [salvando, setSalvando] = useState(false);
  const [repetida, setRepetida] = useState(null);   // aviso de código já usado
  const [outroCurso, setOutroCurso] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function salvar(confirmar) {
    if (isGer && !form.pessoaId) { showToast("Escolha de quem é a venda"); return; }
    if (!(Number(String(form.valor).replace(",", ".")) > 0)) { showToast("Informe o valor vendido"); return; }
    setSalvando(true);
    const dados = {
      pessoaId: form.pessoaId, cliente: form.cliente, email: form.email, telefone: form.telefone,
      curso: form.curso, forma: form.forma, plataforma: form.plataforma, codigo: form.codigo,
      parcelas: form.parcelas, valor: form.valor, recebido: form.recebido,
      data: form.data, confirmar: !!confirmar,
    };
    try {
      if (form.id) await api.vdEditar(form.id, dados); else await api.vdCriar(dados);
      showToast(form.id ? "✓ Venda atualizada" : "🎉 Venda lançada!");
      setRepetida(null);
      onSalvo();
    } catch (e) {
      if (e.status === 409 && e.dados && e.dados.jaExiste) setRepetida(e.dados);
      else showToast("✗ " + e.message);
    } finally { setSalvando(false); }
  }

  return (
    <Portal>
    <div className="pop-bg centro" onClick={(e) => e.target === e.currentTarget && setForm(null)}>
      <div className="pop-sheet" style={{ maxWidth: 720 }}>
        <div className="pop-head"><b>{form.id ? "Editar venda" : "Lançar venda"}</b><button className="crm-x" onClick={() => setForm(null)}>✕</button></div>
        <div className="pop-body">
          {isGer && pessoas.length === 0 && (
            <div className="of-nova-semtpl" style={{ marginBottom: 14 }}>
              Nenhuma pessoa cadastrada ainda. Feche aqui e clique em <b>Equipe & metas</b> pra cadastrar o time (dá pra puxar todo mundo do sistema de uma vez).
            </div>
          )}
          <div className="vd-form">
            <div><label className="lbl-mini">Data</label><input className="input" type="date" value={form.data} onChange={(e) => set("data", e.target.value)} /></div>
            {isGer ? (
              <div><label className="lbl-mini">Vendedor(a)</label>
                <select className="input" value={form.pessoaId} onChange={(e) => set("pessoaId", e.target.value)}>
                  <option value="">Escolher…</option>
                  {pessoas.filter((p) => p.ativo).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
            ) : (
              <div><label className="lbl-mini">Vendedor(a)</label>
                <input className="input" value="Você" disabled />
              </div>
            )}
            <div className="vd-full"><label className="lbl-mini">Nome do cliente</label><input className="input" value={form.cliente} onChange={(e) => set("cliente", e.target.value)} placeholder="Quem comprou" /></div>
            <div><label className="lbl-mini">E-mail</label><input className="input" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="cliente@email.com" /></div>
            <div><label className="lbl-mini">Telefone</label><input className="input" value={form.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="44 99999-9999" /></div>
            <div className="vd-full"><label className="lbl-mini">Curso vendido</label>
              {outroCurso ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="input" autoFocus value={form.curso} onChange={(e) => set("curso", e.target.value)} placeholder="Digite o nome do curso" />
                  <button className="btn btn-sm" onClick={() => { setOutroCurso(false); set("curso", ""); }}>Ver lista</button>
                </div>
              ) : (
                <select className="input" value={CURSOS.includes(form.curso) ? form.curso : (form.curso ? "__manter" : "")}
                  onChange={(e) => { if (e.target.value === "__outro") { setOutroCurso(true); set("curso", ""); } else if (e.target.value !== "__manter") set("curso", e.target.value); }}>
                  <option value="">Escolher curso…</option>
                  {form.curso && !CURSOS.includes(form.curso) && <option value="__manter">{form.curso} (como estava)</option>}
                  {CURSOS.map((c) => <option key={c} value={c}>{c}</option>)}
                  <option value="__outro">Outro — digitar…</option>
                </select>
              )}
            </div>
            <div><label className="lbl-mini">Forma de pagamento</label>
              <select className="input" value={form.forma} onChange={(e) => set("forma", e.target.value)}>
                {FORMAS_PG.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div><label className="lbl-mini">Plataforma</label>
              <select className="input" value={form.plataforma} onChange={(e) => set("plataforma", e.target.value)}>
                {PLATAFORMAS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div><label className="lbl-mini">Código da venda</label><input className="input" value={form.codigo} onChange={(e) => set("codigo", e.target.value)} placeholder="Código da plataforma" /></div>
            <div><label className="lbl-mini">Quantidade de parcelas</label><input className="input" type="number" min="0" max="60" value={form.parcelas} onChange={(e) => set("parcelas", e.target.value)} placeholder="Ex.: 12" /></div>
            <div><label className="lbl-mini">Valor vendido</label><input className="input" value={form.valor} onChange={(e) => set("valor", e.target.value)} placeholder="2497,00" /></div>
            <div><label className="lbl-mini">Valor recebido</label><input className="input" value={form.recebido} onChange={(e) => set("recebido", e.target.value)} placeholder="quanto já caiu" /></div>
          </div>
          {repetida && (
            <div className="vd-repetida">
              <b>⚠ Já existe venda com o código {repetida.codigo}</b>
              {repetida.vendas.map((v) => (
                <div key={v.id} className="vd-repetida-item">
                  <span><b>{v.pessoaNome}</b> · {v.cliente || "—"}</span>
                  <span>{new Date(v.data).toLocaleDateString("pt-BR")} · {dinheiro(v.valor)}</span>
                </div>
              ))}
              <span className="vd-repetida-p">Quer lançar mesmo assim? (às vezes a mesma venda é dividida entre dois vendedores)</span>
            </div>
          )}
          <div className="vd-rodape">
            <button className="btn" onClick={() => setForm(null)}>Cancelar</button>
            {repetida ? (
              <>
                <button className="btn" onClick={() => setRepetida(null)}>Voltar e revisar</button>
                <button className="onum-add" disabled={salvando} onClick={() => salvar(true)}>
                  {salvando ? "Lançando…" : "Lançar mesmo assim"}
                </button>
              </>
            ) : (
              <button className="onum-add" disabled={salvando} onClick={() => salvar(false)}>
                {salvando ? "Salvando…" : form.id ? "Salvar alterações" : "Lançar venda"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
    </Portal>
  );
}

// Uma linha da lista de Equipe & metas. Guarda o que você digita AQUI e só manda
// pro servidor quando você sai do campo (ou aperta Enter) — sem travar nem apagar letra.
function LinhaPessoa({ p, onSalvar, onJuntar, onExcluir, onToggle, onFoto }) {
  const [nome, setNome] = useState(p.nome);
  const [grupo, setGrupo] = useState(p.grupo || "");
  const [meta, setMeta] = useState(String(p.metaMensal ?? ""));
  const fotoRef = useRef(null);
  useEffect(() => { setNome(p.nome); setGrupo(p.grupo || ""); setMeta(String(p.metaMensal ?? "")); }, [p.id]);
  const salvarSeMudou = (campo, valor, original) => {
    if (String(valor) === String(original ?? "")) return;   // não mudou: nem chama o servidor
    onSalvar(p, campo, valor);
  };
  const aoTeclar = (e) => { if (e.key === "Enter") e.currentTarget.blur(); };
  return (
    <div className={"vd-pessoa" + (p.ativo ? "" : " off")}>
      <button className={p.ativo ? "of-switch on" : "of-switch"} onClick={() => onToggle(p)} title={p.ativo ? "No painel" : "Fora do painel"}><span className="of-switch-dot" /></button>
      <button className="vd-pessoa-foto" onClick={() => fotoRef.current && fotoRef.current.click()}
        title={p.foto ? "Trocar a foto" : "Colocar uma foto"}>
        <Avatar nome={p.nome} foto={p.foto} size={30} />
        <span className="vd-pessoa-foto-ic">📷</span>
      </button>
      <input ref={fotoRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) onFoto(p, f); }} />
      <input className="vd-pessoa-nome" value={nome} onChange={(e) => setNome(e.target.value)}
        onBlur={() => salvarSeMudou("nome", nome.trim() || p.nome, p.nome)} onKeyDown={aoTeclar} />
      <input className="vd-pessoa-grupo" value={grupo} placeholder="equipe" list="vd-grupos"
        onChange={(e) => setGrupo(e.target.value)} onBlur={() => salvarSeMudou("grupo", grupo, p.grupo)} onKeyDown={aoTeclar} />
      <input className="vd-pessoa-meta" value={meta} placeholder="meta" title="Meta do mês"
        onChange={(e) => setMeta(e.target.value)} onBlur={() => salvarSeMudou("metaMensal", meta, p.metaMensal)} onKeyDown={aoTeclar} />
      <span className="vd-pessoa-qtd" title="vendas lançadas">{p.vendas || 0}</span>
      <button className="btn btn-sm" onClick={() => onJuntar(p)} title="Juntar com outra pessoa">⇄</button>
      <button className="crm-tarefa-del" onClick={() => onExcluir(p)} title="Remover">✕</button>
    </div>
  );
}

function ModalPessoas({ pessoas, onClose, onMudou, showToast }) {
  const [nome, setNome] = useState("");
  const [grupo, setGrupo] = useState("");
  const [meta, setMeta] = useState("");
  const [users, setUsers] = useState([]);
  const [puxando, setPuxando] = useState(false);
  const [juntando, setJuntando] = useState(null);   // id da pessoa que vai ser juntada
  const [destino, setDestino] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const duplicadas = acharDuplicadas(pessoas);

  async function juntar(deId, paraId) {
    if (!deId || !paraId) return;
    setOcupado(true);
    try {
      const r = await api.vdJuntarPessoas(deId, paraId);
      showToast(`✓ ${r.movidas} venda(s) de ${r.de} foram pra ${r.para}`);
      setJuntando(null); setDestino(""); onMudou();
    } catch (e) { showToast("✗ " + e.message); } finally { setOcupado(false); }
  }
  async function juntarTodas() {
    setOcupado(true);
    try {
      let n = 0;
      for (const d of duplicadas) { const r = await api.vdJuntarPessoas(d.de.id, d.para.id); n += r.movidas; }
      showToast(`✓ ${duplicadas.length} duplicada(s) juntada(s) · ${n} venda(s) movida(s)`);
      onMudou();
    } catch (e) { showToast("✗ " + e.message); } finally { setOcupado(false); }
  }
  const gruposExistentes = Array.from(new Set(pessoas.map((p) => p.grupo).filter(Boolean)));
  useEffect(() => { api.listUsers().then(setUsers).catch(() => {}); }, []);
  const norm = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
  const jaNoPainel = (u) => pessoas.some((p) => norm(p.nome) === norm(u.nome) || (p.userId && p.userId === u.id));
  const faltando = users.filter((u) => u.ativo && !jaNoPainel(u));
  // gente do sistema que está DESATIVADA e por isso não aparece pra trazer
  const inativosFora = users.filter((u) => !u.ativo && !jaNoPainel(u));
  const [buscaP, setBuscaP] = useState("");
  const pessoasFiltradas = pessoas.filter((p) => !buscaP.trim() || norm(p.nome).includes(norm(buscaP)) || norm(p.grupo).includes(norm(buscaP)));

  async function puxarDoSistema() {
    if (!faltando.length) return;
    setPuxando(true);
    // um erro numa pessoa NÃO pode impedir as outras de entrar
    let ok = 0;
    const falhas = [];
    for (const u of faltando) {
      const nomeU = String(u.nome || "").trim();
      if (!nomeU) { falhas.push("(usuário sem nome)"); continue; }
      try {
        await api.vdPessoaCriar({ nome: nomeU, grupo: u.role === "vendedor" ? "Time de vendas" : "", metaMensal: 0, userId: u.id });
        ok++;
      } catch (e) { falhas.push(`${nomeU}: ${e.message}`); }
    }
    onMudou();
    setPuxando(false);
    if (ok && !falhas.length) showToast(`✓ ${ok} pessoa(s) adicionada(s) — agora é só pôr a meta`);
    else if (ok) showToast(`✓ ${ok} adicionada(s) · ${falhas.length} não deu: ${falhas[0]}`);
    else showToast(`✗ Não deu pra adicionar: ${falhas[0] || "erro desconhecido"}`);
  }

  async function criar() {
    if (!nome.trim()) { showToast("Informe o nome"); return; }
    try { await api.vdPessoaCriar({ nome, grupo, metaMensal: meta }); setNome(""); setMeta(""); onMudou(); showToast("✓ Adicionado"); }
    catch (e) { showToast("✗ " + e.message); }
  }
  async function editar(p, campo, valor) {
    try {
      await api.vdPessoaEditar(p.id, { [campo]: valor });
      // atualiza a tela sem recarregar tudo (evita o campo "piscar" enquanto digita)
      onMudou({ silencioso: true });
    } catch (e) { showToast("✗ " + e.message); }
  }
  async function excluir(p) {
    if (!window.confirm(`Remover ${p.nome} do painel?`)) return;
    try { await api.vdPessoaExcluir(p.id); onMudou(); showToast("✓ Removido"); }
    catch (e) { showToast(e.message); }
  }
  // foto de perfil de quem não tem login no sistema (professor, parceiro, etc.)
  async function trocarFoto(p, file) {
    try {
      const dataUrl = await redimensionarImg(file, 160);
      await api.vdPessoaEditar(p.id, { foto: dataUrl });
      showToast(`✓ Foto de ${p.nome.split(" ")[0]} atualizada`);
      onMudou();
    } catch (e) { showToast("✗ " + (e.message || "não deu pra carregar a foto")); }
  }

  return (
    <Portal>
    <div className="pop-bg centro" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pop-sheet" style={{ maxWidth: 640 }}>
        <div className="pop-head"><b>Equipe & metas</b><button className="crm-x" onClick={onClose}>✕</button></div>
        <div className="pop-body">
          <div className="rsv-hint" style={{ marginTop: 0 }}>Quem aparece no painel e quanto é a meta de cada um por mês. Pode ser vendedor, marketing, professor — qualquer pessoa que gera venda.</div>
          {duplicadas.length > 0 && (
            <div className="vd-dup">
              <div className="vd-dup-cab">
                <b>⚠ {duplicadas.length} pessoa(s) repetida(s)</b>
                <button className="btn btn-on btn-sm" disabled={ocupado} onClick={juntarTodas}>Juntar todas</button>
              </div>
              <div className="vd-dup-txt">As vendas vão pro nome completo (o do sistema) e a repetida some. Nada se perde.</div>
              {duplicadas.map((d) => (
                <div key={d.de.id} className="vd-dup-item">
                  <span><b>{d.de.nome}</b> <small>{d.de.vendas || 0} venda(s) · {dinheiro(d.de.total || 0)}</small></span>
                  <span className="vd-dup-seta">→</span>
                  <span><b>{d.para.nome}</b> <small>{d.para.vendas || 0} venda(s)</small></span>
                  <button className="btn btn-sm" disabled={ocupado} onClick={() => juntar(d.de.id, d.para.id)}>Juntar</button>
                </div>
              ))}
            </div>
          )}
          {faltando.length > 0 && (
            <div className="vd-trazer">
              <button className="btn btn-on" disabled={puxando} onClick={puxarDoSistema}>
                <I.users className="ico" /> {puxando ? "Trazendo…" : `Trazer os ${faltando.length} do sistema`}
              </button>
              <span className="vd-trazer-nomes">{faltando.map((u) => String(u.nome || "").trim() || `(sem nome · ${u.login || u.id})`).join(", ")}</span>
            </div>
          )}
          {inativosFora.length > 0 && (
            <div className="vd-inativos">
              <b>{inativosFora.length} pessoa(s) desativada(s) no sistema</b> não entram no painel:
              {" "}{inativosFora.map((u) => u.nome).join(", ")}.
              <br />Ative em <b>Configurações → Equipe &amp; Acessos</b> e volte aqui, ou cadastre pelo campo abaixo.
            </div>
          )}
          {pessoas.length > 6 && (
            <div className="vd-busca" style={{ marginTop: 12 }}>
              <I.search className="ico" />
              <input value={buscaP} onChange={(e) => setBuscaP(e.target.value)} placeholder="Buscar pessoa ou equipe…" />
              {buscaP && <button className="vd-busca-x" onClick={() => setBuscaP("")}>✕</button>}
            </div>
          )}
          <div className="vd-nova-pessoa">
            <input className="input" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            <input className="input" placeholder="Equipe (ex.: Time de vendas)" value={grupo} onChange={(e) => setGrupo(e.target.value)} list="vd-grupos" />
            <datalist id="vd-grupos">{gruposExistentes.map((g) => <option key={g} value={g} />)}</datalist>
            <input className="input" placeholder="Meta do mês" value={meta} onChange={(e) => setMeta(e.target.value)} />
            <button className="onum-add" onClick={criar}><I.plus className="ico" /></button>
          </div>
          <div className="vd-pessoas">
            {pessoasFiltradas.map((p) => (
              <LinhaPessoa key={p.id} p={p}
                onSalvar={editar}
                onFoto={trocarFoto}
                onToggle={(x) => editar(x, "ativo", !x.ativo)}
                onJuntar={(x) => { setJuntando(x.id); setDestino(""); }}
                onExcluir={excluir} />
            ))}
            {pessoas.length === 0 && <div className="crm-col-vazio">Ninguém cadastrado ainda.</div>}
          </div>

          {juntando && (() => {
            const p = pessoas.find((x) => x.id === juntando);
            if (!p) return null;
            return (
              <Portal>
                <div className="pop-bg centro" style={{ zIndex: 200 }} onClick={(e) => e.target === e.currentTarget && setJuntando(null)}>
                  <div className="pop-sheet" style={{ maxWidth: 460 }}>
                    <div className="pop-head"><b>Juntar {p.nome}</b><button className="crm-x" onClick={() => setJuntando(null)}>✕</button></div>
                    <div className="pop-body">
                      <div className="rsv-hint" style={{ marginTop: 0 }}>
                        As <b>{p.vendas || 0} venda(s)</b> de <b>{p.nome}</b> ({dinheiro(p.total || 0)}) vão pra pessoa que você escolher,
                        e <b>{p.nome}</b> some da lista. Nada se perde — e o sistema passa a entender que
                        “{p.nome}” é essa pessoa nas próximas vendas que vierem de fora.
                      </div>
                      <label className="lbl-mini" style={{ marginTop: 14, display: "block" }}>Levar as vendas para</label>
                      <select className="input" value={destino} onChange={(e) => setDestino(e.target.value)}>
                        <option value="">Escolher pessoa…</option>
                        {pessoas.filter((x) => x.id !== p.id).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                          .map((x) => <option key={x.id} value={x.id}>{x.nome}{x.vendas ? ` (${x.vendas} venda${x.vendas > 1 ? "s" : ""})` : ""}</option>)}
                      </select>
                      <div className="vd-rodape">
                        <button className="btn" onClick={() => setJuntando(null)}>Cancelar</button>
                        <button className="onum-add" disabled={!destino || ocupado} onClick={() => juntar(p.id, destino)}>
                          {ocupado ? "Juntando…" : "Juntar"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Portal>
            );
          })()}
        </div>
      </div>
    </div>
    </Portal>
  );
}

/* Há quanto tempo o lead entrou — usado nos cards do Pipeline */
function tempoDesde(ts) {
  if (!ts) return "";
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return "agora há pouco";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return h === 1 ? "há 1 hora" : `há ${h} horas`;
  const d = Math.floor(h / 24);
  if (d < 30) return d === 1 ? "há 1 dia" : `há ${d} dias`;
  const me = Math.floor(d / 30);
  return me === 1 ? "há 1 mês" : `há ${me} meses`;
}
/* cor do selo: quanto mais parado, mais chama atenção */
function idadeClasse(ts) {
  if (!ts) return "";
  const h = (Date.now() - ts) / 3600000;
  if (h < 1) return " novo";
  if (h < 24) return "";
  if (h < 72) return " morno";
  return " frio";
}


/* Formato de gravação que o navegador realmente suporta.
   Chrome/Android gravam WebM; Safari grava MP4. Antes o código
   dizia "audio/ogg" pra tudo, e a Meta recusava o arquivo. */
function formatoGravacao() {
  const opcoes = ["audio/ogg;codecs=opus", "audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const t of opcoes) {
    try { if (window.MediaRecorder && MediaRecorder.isTypeSupported(t)) return t; } catch (_) {}
  }
  return "";
}
function extDeAudio(mime) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("mp4")) return "m4a";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("mpeg")) return "mp3";
  return "webm";
}


const fmtMoneyD = (v) => "R$ " + (Number(v) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const fmtPctD = (v) => (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
const DES = { ink: "var(--text)", mut: "var(--muted)", mut2: "var(--faint)", line: "var(--line)", bg: "var(--surface-2)", card: "var(--card)", orange: "var(--brand)", green: "var(--mint)", purple: "#8b5cf6", gold: "#f59e0b" };

// cinturão (faixa) desenhado, com graus/estrelas = meses seguidos rumo à próxima
function Cinturao({ faixa, graus = 0, alt = 24 }) {
  const clara = faixa.k === "branca";
  return (
    <div style={{ position: "relative", height: alt, borderRadius: 6, background: faixa.cor, border: clara ? "1px solid #cbd5e1" : "1px solid rgba(0,0,0,.12)", boxShadow: "0 1px 3px rgba(0,0,0,.14), inset 0 1px 0 rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "flex-end", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, background: "rgba(0,0,0,.14)" }} />
      <div style={{ height: "100%", width: 62, background: faixa.k === "preta" ? "#dc2626" : "#0b1220", display: "flex", alignItems: "center", gap: 4, paddingLeft: 9, boxShadow: "-1px 0 3px rgba(0,0,0,.25)" }}>
        {Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ width: 5, height: 13, borderRadius: 1, background: i < graus ? "#fff" : "rgba(255,255,255,.22)" }} />)}
      </div>
    </div>
  );
}
function AnelPontos({ pct, cor, size = 108, stroke = 9, dentro }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const off = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={cor} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ transition: "stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1.05 }}>{dentro}</div>
    </div>
  );
}
function BarraProg({ pct, cor, alt = 7 }) {
  return <div style={{ height: alt, background: DES.line, borderRadius: 20, overflow: "hidden" }}><div style={{ width: Math.max(3, Math.min(100, pct)) + "%", height: "100%", background: cor, borderRadius: 20, transition: "width .5s ease" }} /></div>;
}
function Eyebrow({ children, cor }) {
  return <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: cor || DES.mut2, marginBottom: 9 }}>{children}</div>;
}
function Stat({ label, valor, cor, borda }) {
  return (
    <div style={{ padding: "0 14px", borderLeft: borda ? "1px solid " + DES.line : "none", flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10.5, color: DES.mut2, fontWeight: 500, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: cor || DES.ink, whiteSpace: "nowrap" }}>{valor}</div>
    </div>
  );
}

/* v2.1 — peças visuais do resultado da Análise IA (seguem o tema claro/escuro) */
// Semáforo do atendimento: verde = parabéns, amarelo = atenção, vermelho = precisa melhorar.
// Sempre com uma frase que puxa pra cima (o objetivo é o vendedor evoluir, não desanimar).
const FRASES_SEMAFORO = {
  verde: [
    "Você está mandando muito bem. Continue nesse ritmo: os ajustes abaixo são o que falta para chegar ao topo do ranking.",
    "Atendimento de alto nível, e o cliente sente isso. Siga assim e use as dicas abaixo para fechar ainda mais.",
    "Resultado de quem segue o processo certo. Mantenha a consistência e você vira referência no time.",
  ],
  amarelo: [
    "Já existe uma boa base. Com os ajustes abaixo, a próxima análise pode ficar verde.",
    "Falta pouco para virar o jogo. Escolha 2 pontos abaixo e foque neles nesta semana.",
    "Você já faz muita coisa certa. Agora é lapidar os detalhes que fazem a venda acontecer.",
  ],
  vermelho: [
    "Todo grande vendedor já passou por aqui. Foque nos primeiros pontos abaixo nesta semana e a evolução vem.",
    "Nota baixa hoje não define amanhã. Comece pelo básico do processo e peça ajuda ao gestor no que travar.",
    "Bora recomeçar com método: um passo de cada vez, todo dia. A próxima análise pode ser outra história.",
  ],
  verdeTime: ["O time está jogando junto e bem. Mantenham o ritmo e ataquem os pontos abaixo para bater a meta com folga."],
  amareloTime: ["O time tem base boa. Ajustando os pontos abaixo, a próxima análise fica verde."],
  vermelhoTime: ["Hora de virar o jogo juntos: escolham 2 pontos abaixo e treinem esta semana. Evolução vem com método."],
};
function NotaIA({ nota, nome, ehTime, passos, analisadas }) {
  const n = Number(nota) || 0;
  const nivel = n >= 7 ? "verde" : n >= 4 ? "amarelo" : "vermelho";
  const pNome = primeiroNome(nome);
  const titulo = nivel === "verde" ? (ehTime ? "Parabéns, time!" : "Parabéns" + (pNome ? ", " + pNome : "") + "!")
    : nivel === "amarelo" ? (ehTime ? "Atenção, time: estamos no caminho" : "Atenção: você está no caminho")
    : (ehTime ? "Time, precisamos virar o jogo" : "Precisa melhorar, e dá para virar");
  const lista = FRASES_SEMAFORO[nivel + (ehTime ? "Time" : "")];
  const frase = lista[Math.round(n * 10) % lista.length];
  const st = (p) => p.status || p.nivel;
  const bons = (passos || []).filter((p) => st(p) === "ok" || st(p) === "bom").length;
  const ajustar = (passos || []).length - bons;
  const cor = nivel === "verde" ? "#25d366" : nivel === "amarelo" ? "#f5b82e" : "#ff5a5f";
  return (
    <div className={"iax-semaforo " + nivel} style={{ "--sc": cor }}>
      <div className="iax-sinal" role="img" aria-label={"Sinal " + nivel}>
        <i className={nivel === "vermelho" ? "on vm" : "vm"} /><i className={nivel === "amarelo" ? "on am" : "am"} /><i className={nivel === "verde" ? "on vd" : "vd"} />
      </div>
      <div className="iax-sem-txt">
        <div className="iax-sem-eyebrow">{nivel === "verde" ? "Sinal verde" : nivel === "amarelo" ? "Sinal amarelo" : "Sinal vermelho"} · semáforo do atendimento</div>
        <div className="iax-sem-titulo">{titulo}</div>
        <p className="iax-sem-frase">{frase}</p>
        <div className="iax-sem-chips">
          {(passos || []).length > 0 && <span><I.check className="ico" /> {bons} de {(passos || []).length} passos bem feitos</span>}
          {ajustar > 0 && <span><I.trend className="ico" /> {ajustar} para evoluir</span>}
          {analisadas ? <span><I.chat className="ico" /> {analisadas} conversas lidas</span> : null}
        </div>
      </div>
      <div className="iax-sem-nota">
        <AnelPontos pct={n * 10} cor={cor} size={116} stroke={10} dentro={<><b className="iax-nota-n">{String(nota).replace(".", ",")}</b><span className="iax-nota-de">de 10</span></>} />
      </div>
    </div>
  );
}
function PassosIA({ passos, titulo }) {
  if (!Array.isArray(passos) || !passos.length) return null;
  const st = (p) => {
    const s = p.status || p.nivel;
    if (s === "ok" || s === "bom") return { c: "ok", lb: p.nivel ? "Bom" : "Fez", Ic: I.check };
    if (s === "parcial" || s === "medio" || s === "médio") return { c: "warn", lb: "Parcial", Ic: I.alert };
    return { c: "late", lb: p.nivel ? "Ruim" : "Não fez", Ic: I.x };
  };
  const cont = { ok: 0, warn: 0, late: 0 };
  passos.forEach((p) => { cont[st(p).c]++; });
  return (
    <div className="iax-card">
      <div className="iax-card-h"><b>{titulo}</b><span>{cont.ok} bons · {cont.warn} parciais · {cont.late} a corrigir</span></div>
      <div className="iax-passos">
        {passos.map((p, i) => { const x = st(p); return (
          <div key={i} className="iax-passo">
            <span className="iax-passo-n">{p.n || i + 1}</span>
            <div className="iax-passo-txt"><b>{p.nome}</b>{p.comentario && <span>{p.comentario}</span>}</div>
            <span className={"iax-selo " + x.c}><x.Ic className="ico" />{x.lb}</span>
          </div>
        ); })}
      </div>
    </div>
  );
}

function AnaliseIAVendedor({ showToast, isGer = true }) {
  const [vendedores, setVendedores] = useState([]);
  const [vendedorId, setVendedorId] = useState("");
  const [periodo, setPeriodo] = useState("7");
  const [dataEsp, setDataEsp] = useState("");
  const [dataEspAte, setDataEspAte] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [res, setRes] = useState(null);
  const [modo, setModo] = useState("vendedor"); // gerente: vendedor | objecoes | abordagem | geral
  const [incluirVend, setIncluirVend] = useState(null); // Set de ids incluídos no relatório geral (null = ainda não definido)
  const [verUso, setVerUso] = useState(false); // painel "quem se autoavaliou" (gerente)
  const [uso, setUso] = useState(null);
  const [usoCarreg, setUsoCarreg] = useState(false);
  async function carregarUso() {
    setUsoCarreg(true);
    try { const r = await api.ofAutoavaliacoes(); setUso(r || { linhas: [], totais: {} }); } catch (_) { setUso({ linhas: [], totais: {} }); }
    finally { setUsoCarreg(false); }
  }
  function toggleUso() { const n = !verUso; setVerUso(n); if (n && !uso) carregarUso(); }

  useEffect(() => { if (isGer) api.ofVendedoresLista().then((r) => setVendedores((r && r.vendedores) || r || [])).catch(() => {}); }, [isGer]);

  // inicializa a seleção do relatório geral (lembra a última escolha; default = todos)
  useEffect(() => {
    if (!isGer || !vendedores.length || incluirVend !== null) return;
    let salvos = null;
    try { const raw = localStorage.getItem("instructiva_relatorio_geral_vend"); if (raw) salvos = JSON.parse(raw); } catch (_) {}
    const ids = vendedores.map((v) => v.id);
    if (Array.isArray(salvos)) setIncluirVend(new Set(salvos.filter((id) => ids.includes(id))));
    else setIncluirVend(new Set(ids)); // primeira vez: todos marcados
  }, [isGer, vendedores, incluirVend]);

  function toggleIncluir(id) {
    setIncluirVend((prev) => {
      const n = new Set(prev || []);
      if (n.has(id)) n.delete(id); else n.add(id);
      try { localStorage.setItem("instructiva_relatorio_geral_vend", JSON.stringify(Array.from(n))); } catch (_) {}
      return n;
    });
  }
  function marcarTodosIncluir(marcar) {
    const n = marcar ? new Set(vendedores.map((v) => v.id)) : new Set();
    try { localStorage.setItem("instructiva_relatorio_geral_vend", JSON.stringify(Array.from(n))); } catch (_) {}
    setIncluirVend(n);
  }

  function periodoParaDatas() {
    const agora = Date.now();
    if (periodo === "data") {
      if (!dataEsp) return null;
      const [y, m, d] = dataEsp.split("-").map(Number);
      const ini = new Date(y, m - 1, d, 0, 0, 0).getTime();
      let fimBase = dataEsp;
      if (dataEspAte && dataEspAte >= dataEsp) fimBase = dataEspAte;
      const [fy, fm, fd] = fimBase.split("-").map(Number);
      const fim = new Date(fy, fm - 1, fd, 23, 59, 59).getTime();
      return { de: ini, ate: fim };
    }
    if (periodo === "hoje") { const dt = new Date(); dt.setHours(0, 0, 0, 0); return { de: dt.getTime(), ate: agora }; }
    const dias = Number(periodo);
    return { de: agora - dias * 86400000, ate: agora };
  }

  async function analisar() {
    if (periodo === "data" && !dataEsp) { showToast("Escolha uma data"); return; }
    if (isGer && modo === "geral" && incluirVend && incluirVend.size === 0) { showToast("Marque pelo menos uma pessoa pro relatório geral"); return; }
    const dt = periodoParaDatas();
    setCarregando(true); setRes(null);
    try {
      const ehRelatorio = isGer && (modo === "objecoes" || modo === "abordagem" || modo === "geral");
      const idsGeral = (modo === "geral" && incluirVend) ? Array.from(incluirVend) : undefined;
      const r = ehRelatorio
        ? await api.ofRelatorioIA(modo, dt.de, dt.ate, vendedorId || undefined, idsGeral)
        : await api.ofAnaliseIA(isGer ? (vendedorId || undefined) : undefined, dt.de, dt.ate);
      setRes({ ...r, _modo: ehRelatorio ? modo : "vendedor" });
      if (r.vazio) showToast("Nenhuma conversa nesse período");
    } catch (e) { showToast("✗ " + e.message); }
    setCarregando(false);
  }

  const A = res && res._modo === "vendedor" && res.analise;
  const GERAL = res && res._modo === "geral" && res.relatorio;
  const REL = res && res._modo && res._modo !== "vendedor" && res._modo !== "geral" && res.relatorio;
  async function exportarPDF() {
    const el = document.getElementById("relatorio-ia-print");
    if (!el) { try { window.print(); } catch (_) {} return; }
    if (showToast) showToast("Gerando PDF…");
    // mostra o cabeçalho da marca (fica escondido na tela) e força tema claro na captura
    const cab = el.querySelector(".pdf-cabecalho");
    const cabAntes = cab ? cab.style.display : null;
    if (cab) cab.style.display = "block";
    const varsLight = { "--card": "#ffffff", "--surface-2": "#f7f8fa", "--line": "#e6e8ee", "--ink": "#111418", "--muted": "#5b6472" };
    const antigos = {};
    for (const k in varsLight) { antigos[k] = el.style.getPropertyValue(k); el.style.setProperty(k, varsLight[k]); }
    const bgAntes = el.style.background, padAntes = el.style.padding;
    el.style.background = "#ffffff"; el.style.padding = "24px";
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const nome = "relatorio-ia-" + (res && res._modo === "geral" ? "geral-time" : res && res._modo && res._modo !== "vendedor" ? res._modo : ("vendedor" + (res && res.vendedor ? "-" + res.vendedor.split(" ")[0] : ""))) + "-" + new Date().toISOString().slice(0, 10) + ".pdf";
      await html2pdf().set({
        margin: [10, 10, 12, 10],
        filename: nome,
        image: { type: "jpeg", quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      }).from(el).save();
      if (showToast) showToast("✅ PDF baixado!");
    } catch (e) {
      try { window.print(); } catch (_) {} // fallback: impressão nativa (Salvar como PDF)
    } finally {
      if (cab) cab.style.display = cabAntes || "";
      el.style.background = bgAntes || ""; el.style.padding = padAntes || "";
      for (const k in varsLight) { if (antigos[k]) el.style.setProperty(k, antigos[k]); else el.style.removeProperty(k); }
    }
  }
  function periodoLegivel() {
    if (periodo === "hoje") return "Hoje";
    if (periodo === "7") return "Últimos 7 dias";
    if (periodo === "30") return "Últimos 30 dias";
    if (periodo === "data") return dataEsp ? (dataEsp.split("-").reverse().join("/") + (dataEspAte && dataEspAte !== dataEsp ? " até " + dataEspAte.split("-").reverse().join("/") : "")) : "Data específica";
    return "";
  }
  function escopoLegivel() {
    if (!isGer) return "Minhas conversas";
    if (modo !== "vendedor") return vendedorId ? ((vendedores.find((v) => v.id === vendedorId) || {}).nome || "Time") : "Time todo";
    return vendedorId ? ((vendedores.find((v) => v.id === vendedorId) || {}).nome || "Vendedor") : "Eu (gerente)";
  }
  const nivelCor = (n) => { const s = String(n || "").toLowerCase(); if (s === "alta" || s === "ruim") return "#dc2626"; if (s === "média" || s === "media" || s === "regular") return DES.orange; if (s === "baixa" || s === "bom") return DES.green; return DES.mut; };
  // v2.1: o tom do bloco sai do título (verde = bom, âmbar = melhorar, vermelho = crítico, azul = informação)
  const tomDoBloco = (t) => /bem|fortes/i.test(t) ? "ok" : /melhorar|crescer|ajustar|gargalo|fracos/i.test(t) ? "warn" : /atenção|crític|problema|alerta/i.test(t) ? "late" : "info";
  const Bloco = ({ titulo, itens }) => {
    if (!itens || !itens.length) return null;
    const tom = tomDoBloco(titulo);
    const Ic = tom === "ok" ? I.check : tom === "warn" ? I.trend : tom === "late" ? I.alert : I.brilho;
    return (
      <div className={"iax-bloco " + tom}>
        <div className="iax-bloco-h"><span className="iax-bloco-ic"><Ic className="ico" /></span><b>{titulo}</b></div>
        <ul>{itens.map((t, i) => <li key={i}>{t}</li>)}</ul>
      </div>
    );
  };
  // Recomendação final de coaching: Comece / Pare / Continue
  const BlocoCPC = ({ cpc }) => {
    if (!cpc || (!cpc.comece && !cpc.pare && !cpc.continue)) return null;
    const cols = [
      { k: "comece", tit: "Comece", tom: "info", Ic: I.play, itens: cpc.comece },
      { k: "pare", tit: "Pare", tom: "late", Ic: I.x, itens: cpc.pare },
      { k: "continue", tit: "Continue", tom: "ok", Ic: I.check, itens: cpc.continue },
    ];
    return (
      <div className="iax-card">
        <div className="iax-card-h"><b>Recomendação final</b><span>o resumo prático para evoluir a partir de agora</span></div>
        <div className="iax-cpc">
          {cols.map((c) => (
            <div key={c.k} className={"iax-cpc-col " + c.tom}>
              <div className="iax-cpc-t"><span className="iax-bloco-ic"><c.Ic className="ico" /></span>{c.tit}</div>
              {Array.isArray(c.itens) && c.itens.length > 0 ? <ul>{c.itens.map((t, i) => <li key={i}>{t}</li>)}</ul> : <div className="iax-vazio">—</div>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <div style={{ marginBottom: 14, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {isGer && (
          <button className="btn" onClick={toggleUso} style={{ height: 38, whiteSpace: "nowrap", fontWeight: 600, border: "1px solid " + (verUso ? DES.green : DES.line), background: verUso ? "rgba(37,160,107,.08)" : "var(--card)", color: verUso ? DES.green : DES.ink }}>
            <I.users className="ico" style={{ width: 15, height: 15 }} /> Quem se autoavaliou
          </button>
        )}
      </div>

      {isGer && verUso && (
        <div style={{ background: "var(--card)", border: "1px solid " + DES.line, borderRadius: 16, padding: 18, marginBottom: 20, boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: DES.ink }}>Uso da autoavaliação pela equipe</div>
              <div style={{ fontSize: 12, color: DES.mut, marginTop: 2 }}>Quantas vezes cada vendedor rodou a análise das próprias conversas.</div>
            </div>
            <button className="btn" onClick={carregarUso} disabled={usoCarreg} style={{ fontSize: 12, padding: "6px 11px", border: "1px solid " + DES.line, background: "var(--surface-2)", color: DES.ink }}>{usoCarreg ? "Atualizando…" : "↻ Atualizar"}</button>
          </div>
          {uso && uso.totais && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              {[["Hoje", uso.totais.hoje], ["7 dias", uso.totais.semana], ["30 dias", uso.totais.mes], ["Total", uso.totais.total]].map(([lb, n], i) => (
                <div key={i} style={{ flex: "1 1 90px", background: "var(--surface-2)", border: "1px solid " + DES.line, borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: DES.ink }}>{n || 0}</div>
                  <div style={{ fontSize: 11, color: DES.mut2, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>{lb}</div>
                </div>
              ))}
            </div>
          )}
          {usoCarreg && !uso ? (
            <div style={{ padding: 20, textAlign: "center", color: DES.mut }}>Carregando…</div>
          ) : uso && uso.linhas && uso.linhas.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid " + DES.line }}>
                    <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, color: DES.mut2, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>Vendedor</th>
                    <th style={{ textAlign: "center", padding: "8px 10px", fontSize: 11, color: DES.mut2, fontWeight: 700 }}>Hoje</th>
                    <th style={{ textAlign: "center", padding: "8px 10px", fontSize: 11, color: DES.mut2, fontWeight: 700 }}>7 dias</th>
                    <th style={{ textAlign: "center", padding: "8px 10px", fontSize: 11, color: DES.mut2, fontWeight: 700 }}>30 dias</th>
                    <th style={{ textAlign: "center", padding: "8px 10px", fontSize: 11, color: DES.mut2, fontWeight: 700 }}>Total</th>
                    <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 11, color: DES.mut2, fontWeight: 700 }}>Última vez</th>
                  </tr>
                </thead>
                <tbody>
                  {uso.linhas.map((l) => (
                    <tr key={l.vendedorId} style={{ borderBottom: "1px solid " + DES.line, opacity: l.total === 0 ? .55 : 1 }}>
                      <td style={{ padding: "9px 10px", display: "flex", alignItems: "center", gap: 8 }}><Avatar nome={l.nome} foto={l.foto} size={26} /><span style={{ fontWeight: 600, color: DES.ink }}>{l.nome}</span></td>
                      <td style={{ textAlign: "center", padding: "9px 10px", fontWeight: 700, color: l.hoje > 0 ? DES.green : DES.mut2 }}>{l.hoje}</td>
                      <td style={{ textAlign: "center", padding: "9px 10px", color: DES.ink }}>{l.semana}</td>
                      <td style={{ textAlign: "center", padding: "9px 10px", color: DES.ink }}>{l.mes}</td>
                      <td style={{ textAlign: "center", padding: "9px 10px", fontWeight: 700, color: DES.ink }}>{l.total}</td>
                      <td style={{ textAlign: "right", padding: "9px 10px", color: DES.mut, fontSize: 12 }}>{l.ultima ? tempoDesde(l.ultima) : "nunca"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ fontSize: 11.5, color: DES.mut2, marginTop: 10 }}>Conta só quando o próprio vendedor analisa as conversas dele. Quem aparece esmaecido ainda não se autoavaliou.</div>
            </div>
          ) : (
            <div style={{ padding: 20, textAlign: "center", color: DES.mut }}>Ninguém se autoavaliou ainda.</div>
          )}
        </div>
      )}

      <div style={{ background: "var(--card)", border: "1px solid " + DES.line, borderRadius: 16, padding: 18, marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}>
        {isGer && (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10.5, color: DES.mut2, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>Tipo</span>
            <select className="input" value={modo} onChange={(e) => { setModo(e.target.value); setRes(null); }} style={{ minWidth: 180 }}>
              <option value="vendedor">Análise por vendedor</option>
              <option value="geral">Relatório geral do time</option>
              <option value="objecoes">Relatório de objeções (time)</option>
              <option value="abordagem">Relatório de abordagem (time)</option>
            </select>
          </div>
        )}
        {isGer && modo !== "geral" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10.5, color: DES.mut2, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>{modo === "vendedor" ? "Vendedor" : "Vendedor (opcional)"}</span>
            <select className="input" value={vendedorId} onChange={(e) => setVendedorId(e.target.value)} style={{ minWidth: 180 }}>
              <option value="">{modo === "vendedor" ? "Eu (gerente)" : "Time todo"}</option>
              {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
            </select>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontSize: 10.5, color: DES.mut2, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>Período</span>
          <select className="input" value={periodo} onChange={(e) => setPeriodo(e.target.value)} style={{ minWidth: 150 }}>
            <option value="hoje">Hoje</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="data">Data específica</option>
          </select>
        </div>
        {periodo === "data" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontSize: 10.5, color: DES.mut2, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>De</span>
              <input type="date" className="input" value={dataEsp} onChange={(e) => setDataEsp(e.target.value)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontSize: 10.5, color: DES.mut2, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>Até (opcional)</span>
              <input type="date" className="input" value={dataEspAte} min={dataEsp || undefined} onChange={(e) => setDataEspAte(e.target.value)} />
            </div>
          </>
        )}
        <button className="btn btn-primary" onClick={analisar} disabled={carregando} style={{ height: 40 }}>
          {carregando ? "Analisando…" : <><I.brilho className="ico" style={{ width: 15, height: 15 }} /> Analisar</>}
        </button>
      </div>

      {isGer && modo === "geral" && (
        <div className="no-print" style={{ background: "var(--card)", border: "1px solid " + DES.line, borderRadius: 16, padding: 18, marginBottom: 20, boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: DES.ink }}>Quem entra no relatório</div>
              <div style={{ fontSize: 12, color: DES.mut, marginTop: 2 }}>Marque só quem é do time de vendas. Quem estiver desmarcado não entra na análise.</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={() => marcarTodosIncluir(true)} style={{ fontSize: 12, padding: "5px 10px", border: "1px solid " + DES.line, background: "var(--surface-2)", color: DES.ink }}>Marcar todos</button>
              <button className="btn" onClick={() => marcarTodosIncluir(false)} style={{ fontSize: 12, padding: "5px 10px", border: "1px solid " + DES.line, background: "var(--surface-2)", color: DES.ink }}>Desmarcar todos</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
            {vendedores.map((v) => {
              const on = incluirVend ? incluirVend.has(v.id) : true;
              return (
                <label key={v.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 11px", borderRadius: 10, border: "1px solid " + (on ? DES.green : DES.line), background: on ? "rgba(37,160,107,.06)" : "var(--surface-2)", cursor: "pointer", fontSize: 13.5, color: DES.ink }}>
                  <input type="checkbox" checked={on} onChange={() => toggleIncluir(v.id)} style={{ width: 16, height: 16, accentColor: "#25A06B", flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.nome}</span>
                </label>
              );
            })}
          </div>
          <div style={{ fontSize: 12, color: DES.mut2, marginTop: 10 }}>{incluirVend ? incluirVend.size : vendedores.length} de {vendedores.length} selecionado(s) · sua escolha fica salva pra próxima.</div>
        </div>
      )}

      {carregando && <div style={{ padding: 40, textAlign: "center", color: DES.mut, background: "var(--card)", borderRadius: 16, border: "1px solid " + DES.line }}>A IA está lendo as conversas… isso leva alguns segundos.</div>}

      {res && res.vazio && !carregando && (
        <div style={{ padding: 30, color: DES.mut, background: "var(--card)", borderRadius: 16, border: "1px solid " + DES.line, textAlign: "center" }}>Nenhuma conversa {isGer ? "desse vendedor" : "sua"} nesse período.</div>
      )}

      {res && !res.vazio && !carregando && (REL || A || GERAL) && (
        <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button className="btn" onClick={exportarPDF} style={{ height: 38, display: "flex", alignItems: "center", gap: 7, fontWeight: 600, border: "1px solid " + DES.line, background: "var(--card)", color: DES.ink }}>
            ⬇ Exportar PDF
          </button>
        </div>
      )}

      <div id="relatorio-ia-print">
        <div className="pdf-cabecalho" style={{ marginBottom: 18, paddingBottom: 14, borderBottom: "2px solid #25A06B" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.02em" }}><span style={{ color: "#111418" }}>instruct</span><span style={{ color: "#25A06B" }}>iva</span></div>
            <div style={{ fontSize: 11, color: "#5b6472" }}>Emitido em {new Date().toLocaleString("pt-BR")}</div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111418", marginTop: 10 }}>Relatório da Análise IA{res && res._modo === "geral" ? " — Geral do time" : res && res._modo === "objecoes" ? " — Objeções (time)" : res && res._modo === "abordagem" ? " — Abordagem (time)" : " — Por vendedor"}</div>
          <div style={{ fontSize: 12.5, color: "#5b6472", marginTop: 3 }}>{escopoLegivel()} · Período: {periodoLegivel()}</div>
        </div>

      {res && !res.vazio && !carregando && GERAL && (
        <div>
          <div style={{ fontSize: 12, color: DES.mut2, marginBottom: 14 }}>Relatório geral do time · {res.analisadas} conversa(s) analisada(s){res.totalConversas > res.analisadas ? " (as com mais troca, de " + res.totalConversas + ")" : ""}.</div>
          {(GERAL.notaTime !== undefined && GERAL.notaTime !== null) && (
            <NotaIA nota={GERAL.notaTime} ehTime passos={GERAL.porPasso} analisadas={res.analisadas} />
          )}
          {GERAL.resumo && <div style={{ background: "var(--surface-2)", border: "1px solid " + DES.line, borderLeft: "3px solid " + DES.orange, borderRadius: 16, padding: 20, marginBottom: 16, fontSize: 14.5, fontWeight: 500, color: DES.ink, lineHeight: 1.6 }}>{GERAL.resumo}</div>}
          {GERAL.saudeComercial && (
            <div style={{ background: "var(--card)", border: "1px solid " + DES.line, borderRadius: 14, padding: 18, marginBottom: 14 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: DES.ink, marginBottom: 8, display: "flex", alignItems: "center", gap: 7 }}>🩺 Saúde comercial</div>
              <div style={{ fontSize: 13.5, color: DES.ink, lineHeight: 1.6 }}>{GERAL.saudeComercial}</div>
            </div>
          )}
          <PassosIA passos={GERAL.porPasso} titulo="Os 7 passos — desempenho do time" />
          <Bloco titulo="O que o time faz bem" itens={GERAL.oQueVaiBem} cor={DES.green} ico="✅" />
          <Bloco titulo="Pontos de atenção do time" itens={GERAL.problemas} />
          <Bloco titulo="Gargalos — onde o time perde venda" itens={GERAL.gargalos} cor={DES.orange} ico="⛔" />
          {Array.isArray(GERAL.objecoesComuns) && GERAL.objecoesComuns.length > 0 && (
            <div style={{ background: "var(--card)", border: "1px solid " + DES.line, borderRadius: 16, padding: 18, marginBottom: 14 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: DES.ink, marginBottom: 12, display: "flex", alignItems: "center", gap: 7 }}>🛡️ Objeções mais comuns</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {GERAL.objecoesComuns.map((o, i) => (
                  <div key={i} style={{ background: "var(--surface-2)", border: "1px solid " + DES.line, borderRadius: 11, padding: "11px 13px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: DES.ink }}>{o.objecao}</span>
                      {o.nivel && <span style={{ fontSize: 11, fontWeight: 700, color: nivelCor(o.nivel), background: "var(--card)", borderRadius: 20, padding: "2px 10px", textTransform: "uppercase" }}>{o.nivel}</span>}
                    </div>
                    {o.comoLidam && <div style={{ fontSize: 12.5, color: DES.mut, marginTop: 5, lineHeight: 1.5 }}>{o.comoLidam}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {GERAL.followupTime && (
            <div style={{ background: "var(--surface-2)", border: "1px solid " + DES.line, borderLeft: "3px solid #2563eb", borderRadius: 14, padding: 18, marginBottom: 14 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#2563eb", marginBottom: 8, display: "flex", alignItems: "center", gap: 7 }}>🔄 Follow-up do time</div>
              <div style={{ fontSize: 13.5, color: DES.ink, lineHeight: 1.6 }}>{GERAL.followupTime}</div>
            </div>
          )}
          <Bloco titulo="Destaques do período (bons e ruins)" itens={GERAL.destaques} cor="#2563eb" ico="⭐" />
          {Array.isArray(GERAL.recomendacoes) && GERAL.recomendacoes.length > 0 && (
            <div style={{ background: "var(--surface-2)", border: "1px solid " + DES.line, borderLeft: "3px solid " + DES.green, borderRadius: 14, padding: 18, marginBottom: 14 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: DES.green, marginBottom: 10, display: "flex", alignItems: "center", gap: 7 }}>✅ Recomendações pro time</div>
              <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                {GERAL.recomendacoes.map((t, i) => <li key={i} style={{ fontSize: 13.5, color: DES.ink, lineHeight: 1.55 }}>{t}</li>)}
              </ul>
            </div>
          )}
          {Array.isArray(GERAL.focoProximo) && GERAL.focoProximo.length > 0 && (
            <div style={{ background: "linear-gradient(135deg, rgba(37,160,107,.08), rgba(242,101,34,.06))", border: "1px solid " + DES.line, borderRadius: 14, padding: 18, marginBottom: 14 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: DES.ink, marginBottom: 10, display: "flex", alignItems: "center", gap: 7 }}>🎯 Foco pro próximo período</div>
              <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                {GERAL.focoProximo.map((t, i) => <li key={i} style={{ fontSize: 13.5, color: DES.ink, lineHeight: 1.55, fontWeight: 500 }}>{t}</li>)}
              </ul>
            </div>
          )}
          <BlocoCPC cpc={GERAL.cpc} />
          {!GERAL && res.bruto && <div style={{ background: "var(--card)", border: "1px solid " + DES.line, borderRadius: 16, padding: 20, fontSize: 14, color: DES.ink, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{res.bruto}</div>}
        </div>
      )}

      {res && !res.vazio && !carregando && REL && (
        <div>
          <div style={{ fontSize: 12, color: DES.mut2, marginBottom: 14 }}>Relatório de {res._modo === "objecoes" ? "objeções" : "abordagem"} · {res.analisadas} conversa(s) do time analisada(s){res.totalConversas > res.analisadas ? " (as com mais troca, de " + res.totalConversas + ")" : ""}.</div>
          {REL.resumo && <div style={{ background: "var(--surface-2)", border: "1px solid " + DES.line, borderLeft: "3px solid " + DES.orange, borderRadius: 16, padding: 20, marginBottom: 16, fontSize: 14.5, fontWeight: 500, color: DES.ink, lineHeight: 1.6 }}>{REL.resumo}</div>}
          {Array.isArray(REL.itens) && REL.itens.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              {REL.itens.map((it, i) => (
                <div key={i} style={{ background: "var(--card)", border: "1px solid " + DES.line, borderLeft: "3px solid " + nivelCor(it.nivel), borderRadius: 14, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: DES.ink }}>{it.titulo}</span>
                    {it.nivel && <span style={{ fontSize: 11, fontWeight: 700, color: nivelCor(it.nivel), background: "var(--surface-2)", borderRadius: 20, padding: "2px 10px", textTransform: "uppercase", letterSpacing: ".04em" }}>{it.nivel}</span>}
                  </div>
                  {it.detalhe && <div style={{ fontSize: 13, color: DES.mut, marginTop: 6, lineHeight: 1.55 }}>{it.detalhe}</div>}
                  {it.exemplo && <div style={{ fontSize: 12.5, color: DES.mut2, marginTop: 8, padding: "8px 11px", background: "var(--surface-2)", borderRadius: 9, fontStyle: "italic" }}>Ex.: {it.exemplo}</div>}
                  {it.recomendacao && <div style={{ fontSize: 13, color: DES.ink, marginTop: 8, display: "flex", gap: 6 }}><span>💡</span><span>{it.recomendacao}</span></div>}
                </div>
              ))}
            </div>
          )}
          <Bloco titulo="Destaques" itens={REL.destaques} cor="#2563eb" ico="⭐" />
          {Array.isArray(REL.recomendacoes) && REL.recomendacoes.length > 0 && (
            <div style={{ background: "var(--surface-2)", border: "1px solid " + DES.line, borderLeft: "3px solid " + DES.green, borderRadius: 14, padding: 18, marginBottom: 14 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: DES.green, marginBottom: 10, display: "flex", alignItems: "center", gap: 7 }}>✅ Recomendações pro time</div>
              <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                {REL.recomendacoes.map((t, i) => <li key={i} style={{ fontSize: 13.5, color: DES.ink, lineHeight: 1.55 }}>{t}</li>)}
              </ul>
            </div>
          )}
          {!REL && res.bruto && <div style={{ background: "var(--card)", border: "1px solid " + DES.line, borderRadius: 16, padding: 20, fontSize: 14, color: DES.ink, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{res.bruto}</div>}
        </div>
      )}

      {res && !res.vazio && !carregando && res._modo === "vendedor" && (
        <div>
          <div style={{ fontSize: 12, color: DES.mut2, marginBottom: 14 }}>Analisadas {res.analisadas} conversa(s){res.totalOficial != null && res.totalNaoOficial != null ? " (" + res.totalOficial + " oficiais + " + res.totalNaoOficial + " não-oficiais)" : ""}{res.totalConversas > res.analisadas ? " · as " + res.analisadas + " mais recentes de " + res.totalConversas : ""}{isGer && res.vendedor ? " · " + res.vendedor : ""}.</div>
          {A ? <>
            {(A.nota !== undefined && A.nota !== null) && (
              <NotaIA nota={A.nota} nome={res.vendedor || ""} passos={A.passos} analisadas={res.analisadas} />
            )}
            {res.ligTotal != null && res.ligTotal > 0 && (
              <div className="iax-stats">
                <div className="iax-stat info"><span><I.fone className="ico" /> Ligações feitas</span><b>{res.ligTotal}</b></div>
                <div className="iax-stat ok"><span><I.check className="ico" /> Atendidas</span><b>{res.ligAtendidas}</b></div>
                <div className="iax-stat late"><span><I.x className="ico" /> Não atendidas</span><b>{res.ligNaoAtendidas}</b></div>
              </div>
            )}
            {A.resumo && <div className="iax-resumo"><div className="iax-resumo-t"><I.brilho className="ico" /> Resumo</div>{A.resumo}</div>}
            <PassosIA passos={A.passos} titulo="Os 7 passos da venda" />
            {A.followup && A.followup.comentario && (() => {
              const tom = A.followup.status === "ok" ? "ok" : A.followup.status === "parcial" ? "warn" : "late";
              const lb = tom === "ok" ? "Bom" : tom === "warn" ? "Precisa melhorar" : "Não faz";
              return (
                <div className={"iax-bloco " + tom}>
                  <div className="iax-bloco-h"><span className="iax-bloco-ic"><I.clock className="ico" /></span><b>Follow-up</b><span className={"iax-selo " + tom}>{lb}</span></div>
                  <p>{A.followup.comentario}</p>
                </div>
              );
            })()}
            {A.porCanal && (A.porCanal.oficial || A.porCanal.naoOficial) && (
              <div className="iax-canais">
                {A.porCanal.oficial && <div className="iax-canal"><div className="iax-canal-t"><I.send className="ico" /> WhatsApp oficial{res.totalOficial != null ? " · " + res.totalOficial + " conversa(s)" : ""}</div><p>{A.porCanal.oficial}</p></div>}
                {A.porCanal.naoOficial && <div className="iax-canal"><div className="iax-canal-t"><I.wa className="ico" /> WhatsApp do vendedor{res.totalNaoOficial != null ? " · " + res.totalNaoOficial + " conversa(s)" : ""}</div><p>{A.porCanal.naoOficial}</p></div>}
              </div>
            )}
            <Bloco titulo="O que está indo bem" itens={A.bem} />
            <Bloco titulo="Seus pontos fortes" itens={A.fortes} />
            <Bloco titulo="Onde dá para crescer" itens={A.melhorar} />
            <Bloco titulo="Para ajustar" itens={A.fracos} />
            <Bloco titulo="Atenção agora" itens={A.criticos} />
            <Bloco titulo="Sugestões" itens={A.sugestoes} />
            <BlocoCPC cpc={A.cpc} />
          </> : (
            <div style={{ background: "var(--card)", border: "1px solid " + DES.line, borderRadius: 16, padding: 20, fontSize: 14, color: DES.ink, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{res.bruto}</div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

function Desempenho({ showToast, isGer = true, ehLider = false }) {
  const [dados, setDados] = useState(null);
  const [mes, setMes] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [verOcultos, setVerOcultos] = useState(false);
  const [detalheId, setDetalheId] = useState(null);
  const [pdfId, setPdfId] = useState(null); // vendedor sendo exportado
  async function exportarVendedorPDF(v, cargoNome, faixaNome) {
    setPdfId(v.id);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const money = (n) => "R$ " + (Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const pct = (n) => (Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
      const mesLabel = (dados && dados.mes) ? dados.mes.split("-").reverse().join("/") : "";
      const com = v.comissao || { pct: 0, valor: 0, regra: "vendedor" };
      const linha = (rot, val) => `<tr><td style="padding:9px 4px;color:#5f6b7a;font-size:13px;border-bottom:1px solid #eef1f3">${rot}</td><td style="padding:9px 4px;text-align:right;font-weight:700;color:#0b1220;font-size:13px;border-bottom:1px solid #eef1f3">${val}</td></tr>`;
      const html = `<div style="width:720px;padding:30px;font-family:Inter,Arial,sans-serif;background:#fff;color:#0b1220">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #F26522;padding-bottom:14px;margin-bottom:18px">
          <div><div style="font-size:22px;font-weight:800;letter-spacing:-.02em">instruct<span style="color:#16a34a">iva</span></div>
          <div style="font-size:15px;font-weight:700;margin-top:8px">Relatório de Desempenho</div></div>
          <div style="font-size:11px;color:#5f6b7a;text-align:right">Mês ${esc(mesLabel)}<br>Emitido em ${esc(new Date().toLocaleString("pt-BR"))}</div></div>
        <div style="background:#f4f6f8;border:1px solid #e6e8ee;border-radius:12px;padding:14px 16px;margin-bottom:18px">
          <div style="font-weight:700;font-size:17px">${esc(v.nome)}</div>
          <div style="color:#5f6b7a;margin-top:3px;font-size:13px">${esc(cargoNome || "")}${faixaNome ? " · Faixa " + esc(faixaNome) : ""}</div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
          ${linha("Faturamento (receita)", money(v.receita))}
          ${linha("Taxa de conversão", pct(v.conversao))}
          ${linha("Vendas no mês", String(v.vendas || 0))}
          ${linha("Ticket médio", money(v.ticket))}
          ${linha("Pontos no mês", String(v.pontos || 0))}
        </table>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:18px 20px;display:flex;justify-content:space-between;align-items:center">
          <div><div style="font-size:12px;color:#5f6b7a;font-weight:700;text-transform:uppercase;letter-spacing:.04em">Comissão a receber</div>
          <div style="font-size:12px;color:#5f6b7a;margin-top:3px">${pct(com.pct)} sobre ${money(v.receita)}${com.regra === "gerente" ? " · gerente (1% fixo)" : ""}</div></div>
          <div style="font-size:30px;font-weight:850;color:#16a34a;letter-spacing:-.02em">${money(com.valor)}</div>
        </div>
        <div style="text-align:center;color:#aab2bd;font-size:10px;margin-top:24px;border-top:1px solid #eee;padding-top:10px">Instructiva · Sistema Comercial — comissão calculada pela Política Comercial (faturamento + conversão)</div>
      </div>`;
      const holder = document.createElement("div");
      holder.style.position = "fixed"; holder.style.left = "-9999px"; holder.style.top = "0";
      holder.innerHTML = html; document.body.appendChild(holder);
      const nomeArq = "desempenho-" + String(v.nome || "vendedor").replace(/[^\w]+/g, "_").slice(0, 30) + "-" + ((dados && dados.mes) || "") + ".pdf";
      await html2pdf().set({ margin: [8, 8, 10, 8], filename: nomeArq, image: { type: "jpeg", quality: 0.96 }, html2canvas: { scale: 2, backgroundColor: "#ffffff", logging: false }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" } }).from(holder.firstElementChild).save();
      holder.remove();
      showToast("✅ PDF de " + v.nome + " baixado!");
    } catch (e) { showToast("❌ Erro ao gerar PDF: " + e.message); }
    finally { setPdfId(null); }
  }
  async function exportarTodosPDF(lista) {
    setPdfId("__todos__");
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const money = (n) => "R$ " + (Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const pctf = (n) => (Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
      const mesLabel = (dados && dados.mes) ? dados.mes.split("-").reverse().join("/") : "";
      const totReceita = lista.reduce((s, v) => s + (v.receita || 0), 0);
      const totComissao = lista.reduce((s, v) => s + ((v.comissao && v.comissao.valor) || 0), 0);
      const totVendas = lista.reduce((s, v) => s + (v.vendas || 0), 0);
      const gestao = dados && dados.gestao ? dados.gestao : null;
      const th = (t, r) => `<th style="padding:9px 8px;text-align:${r ? "right" : "left"};font-size:11px;color:#5f6b7a;text-transform:uppercase;letter-spacing:.03em;border-bottom:2px solid #e6e8ee">${t}</th>`;
      const td = (t, r, b) => `<td style="padding:9px 8px;text-align:${r ? "right" : "left"};font-size:12.5px;color:#0b1220;${b ? "font-weight:700;" : ""}border-bottom:1px solid #eef1f3">${t}</td>`;
      const linhas = lista.map((v) => {
        const c = v.comissao || { pct: 0, valor: 0 };
        return `<tr>${td(esc(v.nome))}${td(money(v.receita), true)}${td(pctf(v.conversao), true)}${td(String(v.vendas || 0), true)}${td(pctf(c.pct), true)}${td(money(c.valor), true, true)}</tr>`;
      }).join("");
      const html = `<div style="width:760px;padding:30px;font-family:Inter,Arial,sans-serif;background:#fff;color:#0b1220">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #F26522;padding-bottom:14px;margin-bottom:18px">
          <div><div style="font-size:22px;font-weight:800;letter-spacing:-.02em">instruct<span style="color:#16a34a">iva</span></div>
          <div style="font-size:15px;font-weight:700;margin-top:8px">Desempenho e comissões do time${gestao && gestao.unidade ? " · " + esc(gestao.unidade.charAt(0).toUpperCase() + gestao.unidade.slice(1)) : ""}</div></div>
          <div style="font-size:11px;color:#5f6b7a;text-align:right">Mês ${esc(mesLabel)}<br>Emitido em ${esc(new Date().toLocaleString("pt-BR"))}</div></div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <thead><tr>${th("Vendedor")}${th("Receita", true)}${th("Conversão", true)}${th("Vendas", true)}${th("Comissão %", true)}${th("A receber", true)}</tr></thead>
          <tbody>${linhas}</tbody>
          <tfoot><tr style="border-top:2px solid #e6e8ee">${td("<b>TOTAL</b>")}${td("<b>" + money(totReceita) + "</b>", true)}${td("", true)}${td("<b>" + totVendas + "</b>", true)}${td("", true)}${td("<b style='color:#16a34a'>" + money(totComissao) + "</b>", true)}</tr></tfoot>
        </table>
        ${gestao ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:18px 20px;display:flex;justify-content:space-between;align-items:center;text-transform:uppercase">
          <div style="font-weight:800;font-size:15px;letter-spacing:.02em;color:#0b1220">${esc(gestao.nome)} · 1% DAS VENDAS DA UNIDADE<div style="font-size:11px;font-weight:600;color:#5f6b7a;text-transform:none;margin-top:3px">1% de ${money(gestao.baseVendas)} vendidos${gestao.unidade ? " em " + esc(gestao.unidade.charAt(0).toUpperCase() + gestao.unidade.slice(1)) : ""}</div></div>
          <div style="font-weight:850;font-size:24px;color:#16a34a;letter-spacing:-.01em">${money(gestao.valor)}</div>
        </div>` : ""}
        <div style="text-align:center;color:#aab2bd;font-size:10px;margin-top:20px;border-top:1px solid #eee;padding-top:10px">Instructiva · Sistema Comercial — comissão pela Política Comercial (faturamento + conversão)${gestao ? " · gestão = 1% do total vendido pela unidade" : ""}</div>
      </div>`;
      const holder = document.createElement("div");
      holder.style.position = "fixed"; holder.style.left = "-9999px"; holder.style.top = "0";
      holder.innerHTML = html; document.body.appendChild(holder);
      const nomeArq = "desempenho-time-" + ((dados && dados.mes) || "") + ".pdf";
      await html2pdf().set({ margin: [8, 8, 10, 8], filename: nomeArq, image: { type: "jpeg", quality: 0.96 }, html2canvas: { scale: 2, backgroundColor: "#ffffff", logging: false }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }, pagebreak: { mode: ["css", "legacy"] } }).from(holder.firstElementChild).save();
      holder.remove();
      showToast("✅ PDF de todos baixado!");
    } catch (e) { showToast("❌ Erro ao gerar PDF: " + e.message); }
    finally { setPdfId(null); }
  }
  const [vendVe, setVendVe] = useState(true); // vendedores veem o desempenho?
  useEffect(() => { api.ofAcessoVend().then((r) => setVendVe(!(r.acessoVend && r.acessoVend.desempenhoOculto))).catch(() => {}); }, []);
  async function alternarVendVe(ve) {
    setVendVe(ve);
    try { const r = await api.ofAcessoVend(); await api.ofSetAcessoVend({ ...(r.acessoVend || {}), desempenhoOculto: !ve }); showToast(ve ? "Vendedores agora veem o desempenho" : "Desempenho escondido dos vendedores"); }
    catch (e) { showToast("✗ " + e.message); setVendVe(!ve); }
  }

  const carregar = (m, inclui) => {
    setCarregando(true);
    const mm = m !== undefined ? m : mes;
    const inc = inclui !== undefined ? inclui : verOcultos;
    api.ofDesempenho(mm, inc).then((d) => { setDados(d); setMes(d.mes); setCarregando(false); }).catch((e) => { showToast(e.message); setCarregando(false); });
  };
  useEffect(() => { carregar(); }, []);
  const nomeMes = (m) => { const p = String(m).split("-"); const nomes = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]; return (nomes[+p[1] - 1] || "?") + " " + p[0]; };

  if (carregando || !dados) return <div style={{ padding: 48, color: DES.mut }}>Carregando desempenho…</div>;

  const cargos = dados.cargos || [], faixas = dados.faixas || [];
  const cargoDe = (k) => cargos.find((c) => c.k === k) || { nome: k, salario: 0 };
  const faixaDe = (k) => faixas.find((f) => f.k === k) || { k, nome: k, cor: "#e5e7eb", texto: "#374151" };
  const vends = dados.vendedores || [];
  // ranking mostra só os vendedores; o gerente fica FORA do Desempenho (removido da visão e dos totais)
  const rankVends = vends.filter((v) => v.role !== "gerente");
  const totReceita = rankVends.reduce((s, v) => s + v.receita, 0);
  const totVendas = rankVends.reduce((s, v) => s + v.vendas, 0);
  const totLeads = rankVends.reduce((s, v) => s + v.leads, 0);
  const convMedia = totLeads ? (totVendas / totLeads) * 100 : 0;
  const ticketMedio = totVendas ? totReceita / totVendas : 0;

  const mesesOpcoes = [];
  { const now = new Date(); for (let i = 0; i < 6; i++) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); mesesOpcoes.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0")); } }
  if (mes && !mesesOpcoes.includes(mes)) mesesOpcoes.unshift(mes);
  const vendDetalhe = detalheId ? vends.find((v) => v.id === detalheId) : null;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: DES.ink, letterSpacing: "-.01em" }}>Desempenho do time</div>
          <div style={{ fontSize: 13, color: DES.mut, marginTop: 2 }}>Meta de 10 pontos por semana · bônus do mês ao passar de 28, 36 e 40 pontos</div>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          {dados.souGerente && (
            <label style={{ fontSize: 12.5, color: DES.mut, display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }} title="Se desligar, os vendedores não veem a aba Desempenho">
              <input type="checkbox" checked={vendVe} onChange={(e) => alternarVendVe(e.target.checked)} /> Vendedores veem
            </label>
          )}
          {dados.souGerente && dados.qtdOcultos > 0 && (
            <label style={{ fontSize: 12.5, color: DES.mut, display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
              <input type="checkbox" checked={verOcultos} onChange={(e) => { setVerOcultos(e.target.checked); carregar(mes, e.target.checked); }} /> Ver ocultos ({dados.qtdOcultos})
            </label>
          )}
          <select className="input" value={mes} onChange={(e) => carregar(e.target.value)} style={{ minWidth: 150, fontWeight: 600 }}>
            {mesesOpcoes.map((m) => <option key={m} value={m}>{nomeMes(m)}</option>)}
          </select>
          {dados.souGerente && rankVends.length > 0 && (
            <button onClick={() => exportarTodosPDF(rankVends)} disabled={pdfId === "__todos__"}
              style={{ border: "1px solid " + DES.line, background: "var(--card)", color: DES.ink, borderRadius: 10, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
              {pdfId === "__todos__" ? "Gerando…" : "⬇ Exportar todos"}
            </button>
          )}
        </div>
      </div>

      {dados.souGerente && (
        <div style={{ background: "var(--card)", border: "1px solid " + DES.line, borderRadius: 16, padding: "18px 8px", marginBottom: 22, display: "flex", boxShadow: "0 1px 2px rgba(15,23,42,.04)" }}>
          <Stat label="Receita do time" valor={fmtMoneyD(totReceita)} />
          <Stat label="Vendas" valor={String(totVendas)} borda />
          <Stat label="Leads recebidos" valor={String(totLeads)} borda />
          <Stat label="Conversão média" valor={fmtPctD(convMedia)} cor={DES.green} borda />
          <Stat label="Ticket médio" valor={fmtMoneyD(ticketMedio)} borda />
        </div>
      )}

      {rankVends.length === 0 ? (
        <div style={{ padding: 40, color: DES.mut, background: "var(--card)", borderRadius: 16, border: "1px solid " + DES.line, textAlign: "center" }}>Nenhum vendedor pra mostrar neste mês.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: dados.souGerente ? "repeat(auto-fill,minmax(410px,1fr))" : "minmax(0,560px)", gap: 18 }}>
          {rankVends.map((v, idx) => {
            const cargo = cargoDe(v.cargo), faixa = faixaDe(v.faixa), fm = v.faixaMeta;
            const prox = fm ? faixaDe(fm.proxima) : null;
            const anelPct = fm ? (v.pontos / fm.pontos) * 100 : 100;
            const anelCor = prox ? prox.cor : DES.gold;
            const top = idx === 0 && dados.souGerente;
            return (
              <div key={v.id} onClick={() => setDetalheId(v.id)} style={{ background: "var(--card)", border: top ? "1px solid var(--line)" : "1px solid " + DES.line, borderRadius: 20, padding: 24, cursor: "pointer", opacity: v.oculto ? 0.5 : 1, boxShadow: top ? "0 3px 16px rgba(245,158,11,.14)" : "0 1px 2px rgba(15,23,42,.04)", transition: "box-shadow .18s, transform .18s", position: "relative", overflow: "hidden" }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 12px 30px rgba(15,23,42,.11)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = top ? "0 3px 16px rgba(245,158,11,.14)" : "0 1px 2px rgba(15,23,42,.04)"; e.currentTarget.style.transform = "none"; }}>
                {top && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg,#f59e0b,#F26522)" }} />}

                <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 18 }}>
                  {v.foto ? <img src={v.foto} alt="" style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg,#F26522,#16a34a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18 }}>{(v.nome || "?").slice(0, 1).toUpperCase()}</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 16.5, color: DES.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.nome}{v.oculto ? " · oculto" : ""}</div>
                    <div style={{ fontSize: 12.5, color: DES.mut, marginTop: 2 }}>{cargo.nome}</div>
                  </div>
                  {dados.souGerente && <div style={{ fontSize: 12, fontWeight: 800, color: top ? "#fff" : DES.mut, background: top ? "linear-gradient(135deg,#f59e0b,#F26522)" : DES.bg, border: top ? "none" : "1px solid " + DES.line, borderRadius: 20, padding: "3px 11px", whiteSpace: "nowrap" }}>{top ? "🏆 1º" : idx + 1 + "º"}</div>}
                </div>

                {/* HERO: anel de pontos + cinturão */}
                <div style={{ display: "flex", alignItems: "center", gap: 18, background: top ? "var(--surface-2)" : DES.bg, borderRadius: 16, padding: "18px 20px", marginBottom: 18 }}>
                  <AnelPontos pct={anelPct} cor={anelCor} dentro={<><span style={{ fontSize: 27, fontWeight: 800, color: DES.ink, letterSpacing: "-.02em" }}>{v.pontos}</span><span style={{ fontSize: 11, color: DES.mut2, marginTop: 2 }}>{fm ? "de " + fm.pontos : "pts"}</span></>} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Cinturao faixa={faixa} graus={fm ? fm.mesesSeguidos : 4} />
                    <div style={{ marginTop: 10, fontSize: 14.5, fontWeight: 700, color: DES.ink }}>Faixa {faixa.nome}</div>
                    {fm ? <div style={{ fontSize: 12.5, color: DES.mut, marginTop: 1 }}>{v.pontos}/{fm.pontos} pts rumo à <b style={{ color: DES.ink }}>{prox.nome}</b> · mês {fm.mesesSeguidos}/{fm.meses}</div>
                        : <div style={{ fontSize: 12.5, color: DES.gold, marginTop: 1, fontWeight: 600 }}>Topo da carreira 🏆</div>}
                    {v.bonus.dinheiro > 0 && <div style={{ marginTop: 9, fontSize: 11.5, fontWeight: 700, color: DES.green, background: "var(--surface-2)", borderRadius: 20, padding: "3px 10px", display: "inline-block" }}>bônus +{v.bonus.adicional.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}% · {fmtMoneyD(v.bonus.dinheiro)}</div>}
                  </div>
                </div>

                <div style={{ display: "flex", borderTop: "1px solid " + DES.line, paddingTop: 16 }}>
                  <Stat label="Receita" valor={fmtMoneyD(v.receita)} />
                  <Stat label="Conversão" valor={fmtPctD(v.conversao)} cor={DES.green} borda />
                  <Stat label="Vendas" valor={String(v.vendas)} borda />
                  <Stat label="Ticket" valor={fmtMoneyD(v.ticket)} borda />
                </div>

                {v.comissao && (
                  <div style={{ marginTop: 16, background: "var(--surface-2)", border: "1px solid " + DES.line, borderRadius: 14, padding: "13px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 12, color: DES.mut2, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>Comissão a receber</div>
                      <div style={{ fontSize: 12, color: DES.mut, marginTop: 2 }}>{fmtPctD(v.comissao.pct)} sobre {fmtMoneyD(v.receita)}{v.comissao.regra === "gerente" ? " · gerente (1% fixo)" : ""}</div>
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 850, color: DES.green, letterSpacing: "-.02em" }}>{fmtMoneyD(v.comissao.valor)}</div>
                  </div>
                )}

                <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={(e) => { e.stopPropagation(); exportarVendedorPDF(v, cargo.nome, faixa.nome); }} disabled={pdfId === v.id}
                    style={{ flex: "0 0 auto", border: "1px solid " + DES.line, background: "var(--card)", color: DES.ink, borderRadius: 10, padding: "8px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    {pdfId === v.id ? "Gerando…" : "⬇ Exportar PDF"}
                  </button>
                  <div style={{ flex: 1, fontSize: 12.5, color: DES.orange, fontWeight: 600, textAlign: "right" }}>Ver desempenho completo →</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {vendDetalhe && <DetalheVendedor v={vendDetalhe} dados={dados} mes={mes} isGer={dados.souGerente} showToast={showToast} onClose={() => setDetalheId(null)} onMudou={() => carregar(mes)} cargoDe={cargoDe} faixaDe={faixaDe} />}
    </div>
  );
}

function DetalheVendedor({ v, dados, mes, isGer, showToast, onClose, onMudou, cargoDe, faixaDe }) {
  const cargo = cargoDe(v.cargo);
  const cargos = dados.cargos || [], faixas = dados.faixas || [];
  const prox = dados.proxCargo && dados.proxCargo[v.cargo];
  const fm = v.faixaMeta, proxF = fm ? faixaDe(fm.proxima) : null, faixa = faixaDe(v.faixa);

  async function mudarCargoFaixa(campo, valor) { try { await api.ofSetCargoFaixa(v.id, { [campo]: valor }); onMudou(); showToast("Atualizado"); } catch (e) { showToast("❌ " + e.message); } }
  async function salvarSemana(semana, campo, valor) {
    const s = (v.semanas || []).find((x) => x.n === semana) || { crm: 0, cultura: 0, pontualidade: 0, indicacao: 0 };
    const corpo = { mes, semana, crm: s.crm, cultura: s.cultura, pontualidade: s.pontualidade, indicacao: s.indicacao || 0 };
    corpo[campo] = Number(valor);
    try { await api.ofSetPontos(v.id, corpo); onMudou(); } catch (e) { showToast("❌ " + e.message); }
  }
  async function ocultar() { const novo = !v.oculto; try { await api.ofOcultarVend(v.id, novo); onMudou(); showToast(novo ? "Ocultado do dashboard" : "Mostrando de novo"); if (novo) onClose(); } catch (e) { showToast("❌ " + e.message); } }
  async function ligarPessoa(pid) { try { await api.ofLigarPessoa(v.id, pid); onMudou(); showToast(pid ? "Vendas vinculadas" : "Vínculo removido"); } catch (e) { showToast("❌ " + e.message); } }
  const sel = { padding: "3px 5px", width: 50, fontWeight: 600 };
  const anelPct = fm ? (v.pontos / fm.pontos) * 100 : 100;

  return (
    <div className="pop-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pop-sheet" style={{ maxWidth: 720, width: "94%", maxHeight: "92vh", overflowY: "auto", padding: 0 }}>
        <div style={{ padding: "22px 26px", borderBottom: "1px solid " + DES.line, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "var(--card)", zIndex: 2, borderRadius: "14px 14px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {v.foto ? <img src={v.foto} alt="" style={{ width: 54, height: 54, borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ width: 54, height: 54, borderRadius: "50%", background: "linear-gradient(135deg,#F26522,#16a34a)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 21 }}>{(v.nome || "?").slice(0, 1).toUpperCase()}</div>}
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: DES.ink }}>{v.nome}</div>
              <div style={{ fontSize: 12.5, color: DES.mut, marginTop: 2 }}>{cargo.nome} · base {fmtMoneyD(cargo.salario)}/mês</div>
            </div>
          </div>
          <button className="crm-x" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: 26 }}>
          {isGer && (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24, alignItems: "flex-end" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 10, color: DES.mut2, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>Cargo</span>
                <select className="input" value={v.cargo} onChange={(e) => mudarCargoFaixa("cargo", e.target.value)} style={{ minWidth: 190 }}>{cargos.map((c) => <option key={c.k} value={c.k}>{c.nome}</option>)}</select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 10, color: DES.mut2, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>Faixa</span>
                <select className="input" value={v.faixa} onChange={(e) => mudarCargoFaixa("faixa", e.target.value)} style={{ minWidth: 150 }}>{faixas.map((f) => <option key={f.k} value={f.k}>Faixa {f.nome}</option>)}</select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 10, color: DES.mut2, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>Vendas registradas como</span>
                <select className="input" value={v.pessoaId || ""} onChange={(e) => ligarPessoa(e.target.value)} style={{ minWidth: 175 }}>
                  <option value="">— escolher —</option>
                  {(dados.pessoasVendas || []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }} />
              <button className="crm-x" onClick={ocultar} style={{ fontSize: 12.5, color: v.oculto ? DES.green : "#ef4444", width: "auto", padding: "8px 12px" }}>{v.oculto ? "Mostrar no dashboard" : "Ocultar do dashboard"}</button>
            </div>
          )}
          {isGer && !v.pessoaId && (dados.pessoasVendas || []).length > 0 && (
            <div style={{ fontSize: 12.5, color: "#F26522", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", marginBottom: 20, marginTop: -8 }}>
              As vendas deste vendedor não estão aparecendo? No campo <b>"Vendas registradas como"</b> acima, escolha qual pessoa do painel de Vendas é ela — aí a receita e a conversão passam a contar aqui.
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 22, background: DES.bg, borderRadius: 16, padding: "20px 22px", marginBottom: 24, flexWrap: "wrap" }}>
            <AnelPontos pct={anelPct} cor={proxF ? proxF.cor : DES.gold} size={118} stroke={10} dentro={<><span style={{ fontSize: 30, fontWeight: 800, color: DES.ink }}>{v.pontos}</span><span style={{ fontSize: 12, color: DES.mut2, marginTop: 2 }}>{fm ? "de " + fm.pontos : "pontos"}</span></>} />
            <div style={{ flex: 1, minWidth: 220 }}>
              <Cinturao faixa={faixa} graus={fm ? fm.mesesSeguidos : 4} alt={26} />
              <div style={{ marginTop: 12 }}>
                {fm ? <>
                  <div style={{ fontSize: 16, fontWeight: 700, color: DES.ink, marginBottom: 3 }}>Faixa {faixa.nome} → <span style={{ color: DES.purple }}>{proxF.nome}</span></div>
                  <div style={{ fontSize: 13, color: DES.mut, lineHeight: 1.5 }}>Passar de <b>{fm.pontos} pontos</b> por <b>{fm.meses} meses seguidos</b>. Está no <b>mês {fm.mesesSeguidos} de {fm.meses}</b>{v.pontos > fm.pontos ? <span style={{ color: DES.green, fontWeight: 600 }}> — este mês bateu ✓</span> : ""}.</div>
                </> : <div style={{ fontSize: 16, fontWeight: 700, color: DES.gold }}>Faixa Preta 🏆 — o topo da carreira</div>}
                {v.bonus.dinheiro > 0 && <div style={{ marginTop: 12, fontSize: 13, color: DES.green, background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 10, padding: "9px 12px" }}>💰 Bônus deste mês: <b>+{v.bonus.adicional.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%</b> na comissão + <b>{fmtMoneyD(v.bonus.dinheiro)}</b></div>}
              </div>
            </div>
          </div>

          <Eyebrow>Métricas do mês</Eyebrow>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(112px,1fr))", gap: 12, marginBottom: 26 }}>
            {[["Receita", fmtMoneyD(v.receita), DES.ink], ["Vendas", String(v.vendas), DES.ink], ["Ticket médio", fmtMoneyD(v.ticket), DES.ink], ["Leads recebidos", String(v.leads), DES.ink], ["Conversão", fmtPctD(v.conversao), DES.green], ["Meta", v.meta ? fmtMoneyD(v.meta) : "—", DES.ink]].map(([lb, val, cor], i) => (
              <div key={i} style={{ background: DES.bg, borderRadius: 12, padding: "13px 15px" }}>
                <div style={{ fontSize: 11, color: DES.mut2, marginBottom: 4 }}>{lb}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: cor }}>{val}</div>
              </div>
            ))}
          </div>

          <Eyebrow>Pontuação semanal</Eyebrow>
          <div style={{ border: "1px solid " + DES.line, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 540 }}>
              <thead><tr style={{ background: DES.bg, color: DES.mut, textAlign: "center", fontSize: 11.5 }}>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600 }}>Semana</th>
                <th style={{ fontWeight: 600 }}>Conversão<div style={{ fontSize: 9, color: DES.mut2, fontWeight: 400 }}>automático</div></th>
                <th style={{ fontWeight: 600 }}>CRM</th><th style={{ fontWeight: 600 }}>Cultura</th><th style={{ fontWeight: 600 }}>Pontual.</th><th style={{ fontWeight: 600 }}>Indicação</th><th style={{ fontWeight: 600 }}>Total</th>
              </tr></thead>
              <tbody>
                {(v.semanas || []).map((s) => (
                  <tr key={s.n} style={{ borderTop: "1px solid " + DES.line, textAlign: "center", opacity: s.jaComecou ? 1 : 0.4 }}>
                    <td style={{ padding: "9px 14px", textAlign: "left", color: DES.ink, fontWeight: 500 }}>Semana {s.n}</td>
                    <td><b style={{ color: DES.green, fontSize: 14 }}>{s.conversaoPts}</b> <span style={{ color: DES.mut2, fontSize: 10.5 }}>{fmtPctD(s.conversao)}</span></td>
                    <td>{isGer ? <select className="input" value={s.crm} onChange={(e) => salvarSemana(s.n, "crm", e.target.value)} style={sel}><option value={0}>0</option><option value={1}>1</option></select> : <b>{s.crm}</b>}</td>
                    <td>{isGer ? <select className="input" value={s.cultura} onChange={(e) => salvarSemana(s.n, "cultura", e.target.value)} style={sel}><option value={0}>0</option><option value={1}>1</option><option value={2}>2</option></select> : <b>{s.cultura}</b>}</td>
                    <td>{isGer ? <select className="input" value={s.pontualidade} onChange={(e) => salvarSemana(s.n, "pontualidade", e.target.value)} style={sel}><option value={0}>0</option><option value={1}>1</option></select> : <b>{s.pontualidade}</b>}</td>
                    <td>{isGer ? <select className="input" value={s.indicacao || 0} onChange={(e) => salvarSemana(s.n, "indicacao", e.target.value)} style={sel}><option value={0}>0</option><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option><option value={5}>5</option></select> : <b>{s.indicacao || 0}</b>}</td>
                    <td><b style={{ fontSize: 14, color: DES.ink }}>{s.total}</b></td>
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid " + DES.line, textAlign: "center", fontWeight: 700, background: DES.bg }}>
                  <td style={{ padding: "11px 14px", textAlign: "left" }}>Total do mês</td><td colSpan={5} style={{ color: DES.mut2, fontSize: 11, fontWeight: 400 }}>conversão + CRM + cultura + pontualidade + indicação</td><td style={{ color: DES.green, fontSize: 16 }}>{v.pontos}</td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 12.5, color: DES.mut }}>{v.bonus.dinheiro ? "" : <>Faltam <b style={{ color: DES.ink }}>{Math.max(0, 29 - v.pontos)}</b> pontos pro primeiro bônus (passar de 28 no mês).</>}</div>

          <div style={{ marginTop: 24, border: "1px solid " + DES.line, borderRadius: 14, padding: 18 }}>
            <Eyebrow cor={DES.orange}>Progresso de cargo</Eyebrow>
            {prox ? <>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 7 }}><span style={{ color: DES.ink, fontWeight: 600 }}>Faturamento</span><span style={{ color: DES.mut }}>{fmtMoneyD(v.receita)} / {fmtMoneyD(prox.faturamento)}</span></div>
              <BarraProg pct={Math.min(100, (v.receita / prox.faturamento) * 100)} cor={DES.orange} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, margin: "13px 0 7px" }}><span style={{ color: DES.ink, fontWeight: 600 }}>Conversão</span><span style={{ color: DES.mut }}>{fmtPctD(v.conversao)} / {prox.conversao}%</span></div>
              <BarraProg pct={Math.min(100, (v.conversao / prox.conversao) * 100)} cor={DES.green} />
              <div style={{ fontSize: 12.5, color: DES.mut, marginTop: 12, lineHeight: 1.5 }}>Vira <b>{cargoDe(prox.proximo).nome}</b> mantendo isso por <b>{prox.meses} meses seguidos</b>{v.receita >= prox.faturamento && v.conversao >= prox.conversao ? <span style={{ color: DES.green, fontWeight: 600 }}> — este mês bateu ✓</span> : ""}.</div>
            </> : <div style={{ fontSize: 12.5, color: DES.mut, lineHeight: 1.5 }}>Cargo de liderança — a evolução é avaliada pela diretoria.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// v2.1 — ao mandar um lead pra "Perdido", pergunta o motivo (vira nota no lead).
// Serve pra entender por que se perde venda e pra montar campanhas de reativação depois.
const MOTIVOS_PERDA = ["Achou caro / sem dinheiro agora", "Sem tempo agora", "Escolheu outro curso ou escola", "Parou de responder", "Sem interesse no curso", "Já fez o curso"];
function ModalMotivoPerda({ nome, onEscolher, onPular }) {
  const [outro, setOutro] = useState("");
  return (
    <Portal>
      <div className="modal" onClick={(e) => e.target === e.currentTarget && onPular()}>
        <div className="onum-modal perda-modal">
          <div className="perda-ic"><I.alert className="ico" /></div>
          <b className="perda-t">Por que {nome ? nome.split(" ")[0] : "o lead"} não fechou?</b>
          <span className="perda-s">Leva 2 segundos e ajuda a entender onde a venda escapa.</span>
          <div className="perda-lista">
            {MOTIVOS_PERDA.map((m) => <button type="button" key={m} onClick={() => onEscolher(m)}>{m}</button>)}
          </div>
          <div className="perda-outro">
            <input className="input" placeholder="Outro motivo…" value={outro} onChange={(e) => setOutro(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && outro.trim()) onEscolher(outro.trim()); }} />
            <button type="button" className="btn btn-primary btn-sm" disabled={!outro.trim()} onClick={() => onEscolher(outro.trim())}>Salvar</button>
          </div>
          <button type="button" className="perda-pular" onClick={onPular}>Agora não</button>
        </div>
      </div>
    </Portal>
  );
}
function diasDesde(ts) { return ts ? Math.floor((Date.now() - ts) / 86400000) : 0; }
function tarefaUrgente(t) {
  if (!t || t.feito || !t.quando) return false;
  const fim = new Date(); fim.setHours(23, 59, 59, 999);
  return t.quando <= fim.getTime();
}

function OficialCRM({ showToast, isGer = true, onAbrirWhats, onDisparar, abrirLeadId, onLeadAberto }) {
  // relógio vivo: o "entrou há X min" dos cards se atualiza sozinho
  const [, setTique] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTique((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);
  const [etapas, setEtapas] = useState([]);
  const [leads, setLeads] = useState([]);
  const [verTudoCol, setVerTudoCol] = useState({}); // colunas que o usuário pediu "ver mais"
  const LIMITE_COL_CRM = 60; // desenha só os 60 mais recentes por coluna (deixa o Pipeline leve)
  // ao abrir um lead, busca o completo (histórico/notas não vêm na lista, pra ela ser leve)
  async function abrirLead(id) {
    try {
      const r = await api.ofCrmLead(id);
      if (r && r.lead) setLeads((ls) => ls.map((x) => x.id === id ? { ...x, historico: r.lead.historico, notas: r.lead.notas, respostasFormulario: r.lead.respostasFormulario, email: r.lead.email } : x));
    } catch (_) {}
  }
  const [vendedores, setVendedores] = useState([]);
  const [crmVend, setCrmVend] = useState([]);
  const [sel, setSel] = useState(null);
  const [criar, setCriar] = useState(null);
  const [waMenu, setWaMenu] = useState(null);
  const [busca, setBusca] = useState("");
  const [comemora, setComemora] = useState(null);
  const boardRef = useRef(null);
  const autoScrollRef = useRef(0);
  const [marcados, setMarcados] = useState({});
  const [selN, setSelN] = useState({}); // quantidade digitada por coluna, pra selecionar os N primeiros
  const [perda, setPerda] = useState(null); // v2.1: lead que acabou de ir pra "Perdido" (pergunta o motivo)
  const [soTarefas, setSoTarefas] = useState(false); // v2.1: mostrar só leads com tarefa atrasada ou de hoje
  const [tarefaTexto, setTarefaTexto] = useState("");
  const [tarefaQuando, setTarefaQuando] = useState("");
  useEffect(() => {
    const l = leads.find((x) => x.id === sel);
    const t = l && l.tarefa && !l.tarefa.feito ? l.tarefa : null;
    setTarefaTexto(t ? t.texto : "");
    setTarefaQuando(t && t.quando ? tsParaInput(t.quando) : "");
    // eslint-disable-next-line
  }, [sel]);
  async function salvarTarefa() {
    if (!sel) return;
    if (!tarefaTexto.trim() && !tarefaQuando) { showToast("Escreva a tarefa e/ou escolha a data"); return; }
    const quando = tarefaQuando ? new Date(tarefaQuando).getTime() : 0;
    await salvarCampo(sel, "tarefa", { texto: tarefaTexto.trim(), quando, feito: false });
    showToast("✓ Tarefa agendada");
  }
  const [config, setConfig] = useState(false);
  const [showReserva, setShowReserva] = useState(false);
  const [showColunas, setShowColunas] = useState(false);
  const [showImportar, setShowImportar] = useState(false);
  const [showExportar, setShowExportar] = useState(false);
  const [showDistrib, setShowDistrib] = useState(false);
  const [filtroVend, setFiltroVend] = useState("");
  const [filtroDia, setFiltroDia] = useState("");
  const [dragId, setDragId] = useState(null);
  const [novaNota, setNovaNota] = useState("");
  const mesmoDia = (ts, diaStr) => { if (!ts || !diaStr) return false; const d = new Date(ts); const dd = String(d.getFullYear()) + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); return dd === diaStr; };

  const carregar = () => api.ofCRM().then((d) => { setEtapas(d.etapas || []); setLeads(d.leads || []); setVendedores(d.vendedores || []); setCrmVend(d.crmVendedores || []); }).catch((e) => showToast(e.message));
  const versaoCrmRef = useRef("");
  useEffect(() => {
    let vivo = true;
    carregar();
    // baseline do "carimbo" (não recarrega à toa na 1ª vez)
    api.ofCrmVersao().then((r) => { if (r && vivo) versaoCrmRef.current = r.v; }).catch(() => {});
    // a cada 10s pergunta só o carimbo leve; só recarrega a lista se MUDOU (lead novo/movido/editado)
    const t = setInterval(async () => {
      if (document.hidden) return; // v2.0: aba escondida não fica consultando o servidor
      try { const r = await api.ofCrmVersao(); if (vivo && r && r.v !== versaoCrmRef.current) { versaoCrmRef.current = r.v; carregar(); } } catch (_) {}
    }, 10000);
    return () => { vivo = false; clearInterval(t); };
  }, []);
  async function moverEtapa(k, dir) {
    const arr = etapas.map((e) => e.k);
    const i = arr.indexOf(k), j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    try { await api.ofReordenarEtapas(arr); carregar(); } catch (e) { showToast(e.message); }
  }
  useEffect(() => {
    if (!waMenu) return;
    const fechar = () => setWaMenu(null);
    document.addEventListener("click", fechar);
    return () => document.removeEventListener("click", fechar);
  }, [waMenu]);

  const leadSel = sel ? leads.find((l) => l.id === sel) : null;
  // v2.1: chegou pedindo pra abrir um lead (da ficha da conversa ou da busca rápida)
  useEffect(() => {
    if (!abrirLeadId || !leads.length) return;
    if (leads.some((l) => l.id === abrirLeadId)) { setSel(abrirLeadId); abrirLead(abrirLeadId); }
    else showToast("Esse lead não aparece no seu Pipeline");
    onLeadAberto && onLeadAberto();
    // eslint-disable-next-line
  }, [abrirLeadId, leads.length]);

  async function mover(id, etapa) {
    const l = leads.find((x) => x.id === id); if (!l || l.etapa === etapa) return;
    setLeads((ls) => ls.map((x) => x.id === id ? { ...x, etapa } : x));
    // ganhou ou perdeu? mostra a comemoração (ou o consolo)
    const col = etapas.find((e) => e.k === etapa);
    const tipo = tipoDaColuna(col && col.lb);
    if (tipo) setComemora({ tipo, nome: l.nome, valor: l.valor || 0, vendedor: l.vendedorNome || "", foto: l.vendedorFoto || "" });
    if (tipo === "perda") setPerda({ id, nome: l.nome });
    try { await api.ofCrmEditar(id, { etapa }); } catch (e) { showToast(e.message); carregar(); }
  }
  async function salvarCampo(id, campo, valor) {
    try { const r = await api.ofCrmEditar(id, { [campo]: valor }); setLeads((ls) => ls.map((x) => x.id === id ? r.lead : x)); } catch (e) { showToast(e.message); }
  }
  async function transferir(vid) {
    if (!sel) return;
    try { await api.ofCrmEditar(sel, { vendedorId: vid }); setSel(null); showToast("✓ Lead transferido"); carregar(); }
    catch (e) { showToast("✗ " + e.message); }
  }
  const matchBusca = (l) => {
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    return [l.nome, l.telefone, l.curso, l.formaPagamento, (l.tags || []).join(" ")].some((x) => String(x || "").toLowerCase().includes(q));
  };
  function exportarCSV() {
    const nomeEt = (k) => (etapas.find((e) => e.k === k) || {}).lb || k;
    const cab = ["Nome", "Telefone", "Email", "Curso", "Valor", "Forma pagamento", "Etapa", "Vendedor", "Tags", "Origem", "Criado em"];
    const linhas = leads.map((l) => [l.nome, l.telefone, l.email, l.curso, l.valor, l.formaPagamento, nomeEt(l.etapa), l.vendedorNome, (l.tags || []).join(" | "), l.origem, new Date(l.criadoEm).toLocaleString("pt-BR")]);
    const esc = (v) => { const s = String(v == null ? "" : v); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = "\uFEFF" + [cab, ...linhas].map((r) => r.map(esc).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "leads-pipeline.csv"; a.click();
    URL.revokeObjectURL(url);
  }
  // ---- Mobilidade do quadro ----
  // 1) enquanto arrasta um card, se chegar perto da borda o quadro anda sozinho
  useEffect(() => {
    if (!dragId) { autoScrollRef.current = 0; return; }
    let raf = 0;
    const passo = () => {
      const el = boardRef.current;
      if (el && autoScrollRef.current) el.scrollLeft += autoScrollRef.current;
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => { cancelAnimationFrame(raf); autoScrollRef.current = 0; };
  }, [dragId]);
  function aoArrastarSobreQuadro(e) {
    e.preventDefault();
    const el = boardRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const margem = 110; // zona sensível nas laterais
    const x = e.clientX;
    if (x < r.left + margem) autoScrollRef.current = -Math.ceil((r.left + margem - x) / 6);
    else if (x > r.right - margem) autoScrollRef.current = Math.ceil((x - (r.right - margem)) / 6);
    else autoScrollRef.current = 0;
  }
  // 2) segurar no fundo do quadro e puxar pro lado (como um mapa)
  const panRef = useRef(null);
  function aoPressionarQuadro(e) {
    if (e.button !== 0) return;
    const alvo = e.target;
    // só se clicou no "fundo" (não em card, botão, input…)
    if (alvo.closest(".crm-card, button, input, select, textarea, a, label")) return;
    const el = boardRef.current; if (!el) return;
    panRef.current = { x: e.clientX, scroll: el.scrollLeft };
    el.classList.add("arrastando");
  }
  useEffect(() => {
    const mover = (e) => {
      const p = panRef.current, el = boardRef.current;
      if (!p || !el) return;
      el.scrollLeft = p.scroll - (e.clientX - p.x);
    };
    const soltar = () => {
      panRef.current = null;
      if (boardRef.current) boardRef.current.classList.remove("arrastando");
    };
    window.addEventListener("mousemove", mover);
    window.addEventListener("mouseup", soltar);
    return () => { window.removeEventListener("mousemove", mover); window.removeEventListener("mouseup", soltar); };
  }, []);
  // 3) roda do mouse anda pro lado quando não há o que rolar pra baixo
  useEffect(() => {
    const el = boardRef.current; if (!el) return;
    const aoRolar = (e) => {
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // já é horizontal
      const cb = e.target.closest && e.target.closest(".crm-col-body");
      if (cb) {
        const podeDescer = cb.scrollHeight > cb.clientHeight && cb.scrollTop + cb.clientHeight < cb.scrollHeight - 1;
        const podeSubir = cb.scrollTop > 0;
        if ((e.deltaY > 0 && podeDescer) || (e.deltaY < 0 && podeSubir)) return; // deixa a coluna rolar
      }
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    };
    el.addEventListener("wheel", aoRolar, { passive: false });
    return () => el.removeEventListener("wheel", aoRolar);
  }, []);

  const qtdMarcados = Object.keys(marcados).length;
  const toggleMarcado = (id) => setMarcados((m) => { const n = { ...m }; if (n[id]) delete n[id]; else n[id] = true; return n; });
  const marcarColuna = (ids, on) => setMarcados((m) => { const n = { ...m }; ids.forEach((id) => { if (on) n[id] = true; else delete n[id]; }); return n; });
  // marca os N primeiros leads de uma coluna (na ordem que aparece na tela)
  const marcarPrimeirosN = (ids, n) => {
    const qtd = Math.max(0, Math.min(parseInt(n, 10) || 0, ids.length));
    if (!qtd) return;
    setMarcados((m) => { const x = { ...m }; ids.slice(0, qtd).forEach((id) => { x[id] = true; }); return x; });
  };
  async function atribuirLote(vid) {
    const ids = Object.keys(marcados); if (!ids.length) return;
    try { const r = await api.ofCrmLoteAtribuir({ ids, vendedorId: vid }); showToast(`✓ ${r.alterados} lead(s) atribuído(s)`); setMarcados({}); carregar(); }
    catch (e) { showToast("✗ " + e.message); }
  }
  async function moverLoteEtapa(k) {
    const ids = Object.keys(marcados); if (!ids.length || !k) return;
    try { const r = await api.ofCrmLoteEtapa({ ids, etapa: k }); showToast(`✓ ${r.alterados} lead(s) movido(s)`); setMarcados({}); carregar(); }
    catch (e) { showToast("✗ " + e.message); }
  }
  async function excluirLote() {
    const ids = Object.keys(marcados); if (!ids.length) return;
    if (!window.confirm(`Excluir ${ids.length} lead(s) selecionado(s)? Não dá pra desfazer.`)) return;
    try { const r = await api.ofCrmLoteExcluir({ ids }); showToast(`✓ ${r.excluidos} lead(s) excluído(s)`); setMarcados({}); carregar(); }
    catch (e) { showToast("✗ " + e.message); }
  }
  async function addNota() {
    if (!novaNota.trim() || !sel) return;
    try { const r = await api.ofCrmNota(sel, novaNota.trim()); setLeads((ls) => ls.map((x) => x.id === sel ? r.lead : x)); setNovaNota(""); } catch (e) { showToast(e.message); }
  }
  async function excluir(id) {
    if (!confirm("Excluir este lead do CRM? Não dá pra desfazer.")) return;
    try { await api.ofCrmExcluir(id); setLeads((ls) => ls.filter((x) => x.id !== id)); setSel(null); showToast("Lead excluído"); } catch (e) { showToast(e.message); }
  }
  async function criarLead() {
    if (!criar.nome.trim()) { showToast("Dê um nome ao lead"); return; }
    try { const r = await api.ofCrmCriar(criar); setLeads((ls) => [r.lead, ...ls]); setCriar(null); showToast("Lead criado"); } catch (e) { showToast(e.message); }
  }
  async function toggleVend(id) {
    const novo = crmVend.includes(id) ? crmVend.filter((x) => x !== id) : [...crmVend, id];
    setCrmVend(novo);
    try { await api.ofCrmVendedores(novo); } catch (e) { showToast(e.message); }
  }
  const etapaDe = (k) => etapas.find((e) => e.k === k) || { lb: k, cor: "#64748b" };
  const fmtData = (ts) => new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  // v2.1: tarefas atrasadas e de hoje (dos leads que a pessoa está vendo)
  const leadsDoFiltro = leads.filter((l) => !filtroVend || (filtroVend === "__sem" ? !l.vendedorId : l.vendedorId === filtroVend));
  const tarefasAtrasadas = leadsDoFiltro.filter((l) => l.tarefa && !l.tarefa.feito && l.tarefa.quando && l.tarefa.quando < Date.now()).length;
  const tarefasHoje = leadsDoFiltro.filter((l) => tarefaUrgente(l.tarefa)).length - tarefasAtrasadas;
  async function salvarMotivoPerda(motivo) {
    const alvo = perda; setPerda(null);
    if (!alvo) return;
    try { const r = await api.ofCrmNota(alvo.id, "Motivo da perda: " + motivo); if (r && r.lead) setLeads((ls) => ls.map((x) => x.id === alvo.id ? { ...x, notas: r.lead.notas } : x)); showToast("✓ Motivo registrado"); }
    catch (e) { showToast("✗ " + e.message); }
  }

  return (
    <div className="crm-wrap">
      <div className="crm-top">
        <button className="onum-add" onClick={() => setCriar({ nome: "", telefone: "", email: "", curso: "", etapa: (etapas[0] || {}).k || "novo", vendedorId: "", valor: "" })}><I.plus className="ico" /> Novo lead</button>
        {isGer && <button className="onum-btn-ghost" onClick={() => setShowDistrib(true)}><I.users className="ico" /> Quem recebe os leads</button>}
        {isGer && <button className="onum-btn-ghost" onClick={() => setShowReserva(true)}><I.chat className="ico" /> Listas de reserva</button>}
        {isGer && <button className="onum-btn-ghost" onClick={() => setShowColunas(true)}><I.cog className="ico" /> Colunas</button>}
        {isGer && <button className="onum-btn-ghost" onClick={() => setShowImportar(true)} title="Importar leads de uma planilha CSV"><I.clip className="ico" /> Importar</button>}
        <button className="onum-btn-ghost" onClick={() => setShowExportar(true)} title="Exportar seus leads (dá pra escolher por tag)"><I.download className="ico" /> Exportar</button>
        <div className="crm-top-right">
          <button type="button" className={"crm-tarefas" + (soTarefas ? " on" : "") + (tarefasAtrasadas ? " tem-atraso" : "")} onClick={() => setSoTarefas((v) => !v)}
            title={soTarefas ? "Mostrar todos os leads" : "Mostrar só quem tem tarefa atrasada ou para hoje"}>
            <I.clock className="ico" />
            {tarefasAtrasadas + tarefasHoje === 0 ? "Sem tarefas para hoje" : <>{tarefasAtrasadas > 0 && <b>{tarefasAtrasadas} atrasada{tarefasAtrasadas > 1 ? "s" : ""}</b>}{tarefasAtrasadas > 0 && tarefasHoje > 0 && " · "}{tarefasHoje > 0 && <span>{tarefasHoje} para hoje</span>}</>}
          </button>
          <div className="crm-busca"><I.search className="ico" /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, telefone, curso, tag..." /></div>
          {isGer && vendedores.length > 0 && (
            <select className="crm-filtro-vend" value={filtroVend} onChange={(e) => setFiltroVend(e.target.value)}>
              <option value="">Todos os vendedores</option>
              {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}{v.ehGerente ? " (gerente)" : ""}</option>)}
              <option value="__sem">Sem dono</option>
            </select>
          )}
          <input type="date" className="crm-filtro-vend" value={filtroDia} onChange={(e) => setFiltroDia(e.target.value)} title="Ver só os leads que entraram neste dia" style={{ width: "auto" }} />
          {filtroDia && <button className="onum-btn-ghost" onClick={() => setFiltroDia("")} title="Limpar o filtro de dia">✕ dia</button>}
        </div>
      </div>
      {filtroDia && (() => {
        const n = leads.filter((l) => mesmoDia(l.criadoEm, filtroDia) && (!filtroVend || (filtroVend === "__sem" ? !l.vendedorId : l.vendedorId === filtroVend)) && matchBusca(l)).length;
        const [a, mes, d] = filtroDia.split("-");
        return <div className="crm-faixa-dia"><I.calendar className="ico-inline" /> {d}/{mes}/{a} — <b>{n} lead(s)</b> entraram neste dia{filtroVend && filtroVend !== "__sem" ? " (deste vendedor)" : ""}.</div>;
      })()}

      <div className="crm-board" ref={boardRef} onDragOver={aoArrastarSobreQuadro} onMouseDown={aoPressionarQuadro}>
        {etapas.map((et) => {
          const doEt = leads.filter((l) => l.etapa === et.k && (!filtroVend || (filtroVend === "__sem" ? !l.vendedorId : l.vendedorId === filtroVend)) && (!filtroDia || mesmoDia(l.criadoEm, filtroDia)) && (!soTarefas || tarefaUrgente(l.tarefa)) && matchBusca(l));
          const colunaFinal = tipoDaColuna(et.lb) !== null; // ganho/perdido: não cobra tarefa nem acusa "parado"
          const totalCol = doEt.reduce((s, l) => s + (Number(l.valor) || 0), 0);
          return (
            <div key={et.k} className="crm-col" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (dragId) mover(dragId, et.k); setDragId(null); }}>
              <div className="crm-col-bar" style={{ background: et.cor }} />
              <div className="crm-col-head">
                <div className="crm-col-head-l">
                  {doEt.length > 0 && <input type="checkbox" className="crm-check-col" checked={doEt.every((l) => marcados[l.id])} onChange={(e) => marcarColuna(doEt.map((l) => l.id), e.target.checked)} title="Selecionar todos desta coluna" />}
                  <span className="crm-col-dot" style={{ background: et.cor }} />
                  <span className="crm-col-nome">{et.lb}</span>
                  <span className="crm-col-n">{doEt.length}</span>
                  {isGer && (
                    <span onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex", gap: 1, marginLeft: 2 }}>
                      <button type="button" className="crm-col-seta" title="Mover coluna para a esquerda" onClick={() => moverEtapa(et.k, -1)}>‹</button>
                      <button type="button" className="crm-col-seta" title="Mover coluna para a direita" onClick={() => moverEtapa(et.k, 1)}>›</button>
                    </span>
                  )}
                </div>
                {totalCol > 0 && <span className="crm-col-total">R$ {totalCol.toLocaleString("pt-BR")}</span>}
              </div>
              {doEt.length > 1 && (
                <div className="crm-selN" onClick={(e) => e.stopPropagation()} title={"Selecionar os primeiros N de " + et.lb}>
                  <input type="number" min="1" max={doEt.length} value={selN[et.k] || ""} placeholder="qtd" className="input"
                    onChange={(e) => setSelN({ ...selN, [et.k]: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") marcarPrimeirosN(doEt.map((l) => l.id), selN[et.k]); }} />
                  <button type="button" className="btn btn-sm" onClick={() => marcarPrimeirosN(doEt.map((l) => l.id), selN[et.k])}>Selecionar</button>
                </div>
              )}
              <div className="crm-col-body">
                {(verTudoCol[et.k] ? doEt : doEt.slice(0, LIMITE_COL_CRM)).map((l) => (
                  <div key={l.id} className={"crm-card" + (marcados[l.id] ? " marcado" : "")} draggable onDragStart={() => setDragId(l.id)} onDragEnd={() => setDragId(null)} onClick={() => { setSel(l.id); setNovaNota(""); abrirLead(l.id); }}>
                    <div className="crm-card-top">
                      <label className="crm-check" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={!!marcados[l.id]} onChange={() => toggleMarcado(l.id)} /></label>
                      <span className="crm-card-av">{iniciais(l.nome)}</span>
                      <div className="crm-card-id">
                        <div className="crm-card-nome">{l.nome}</div>
                        {l.telefone && <div className="crm-card-tel">{l.telefone}</div>}
                      </div>
                      {l.telefone && (
                        <button className="crm-wa" onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setWaMenu(waMenu && waMenu.id === l.id ? null : { id: l.id, tel: l.telefone, nome: l.nome, x: r.right, y: r.bottom, yt: r.top }); }} title="Chamar no WhatsApp"><I.wa className="ico" /></button>
                      )}
                    </div>
                    {l.curso && <div className="crm-card-curso">{l.curso}</div>}
                    {(l.valor > 0 || l.formaPagamento) && (
                      <div className="crm-card-pay">
                        {l.valor > 0 && <span className="crm-card-valor">R$ {Number(l.valor).toLocaleString("pt-BR")}</span>}
                        {l.formaPagamento && <span className="crm-card-forma">{l.formaPagamento}</span>}
                      </div>
                    )}
                    {(l.tags || []).length > 0 && <div className="crm-card-tags">{l.tags.map((t, i) => <span key={i} className="crm-tag">{t}</span>)}</div>}
                    {infoTarefa(l.tarefa) && (
                      <div className={"crm-card-tarefa " + infoTarefa(l.tarefa).classe}>
                        <I.clock className="ico-inline" /> {infoTarefa(l.tarefa).texto ? infoTarefa(l.tarefa).texto + " · " : ""}{infoTarefa(l.tarefa).data}
                      </div>
                    )}
                    <div className="crm-card-foot">
                      {!colunaFinal && diasDesde(l.atualizadoEm || l.criadoEm) >= 3 ? (
                        <span className="crm-card-parado" title={"Sem movimentação desde " + new Date(l.atualizadoEm || l.criadoEm).toLocaleString("pt-BR")}>
                          <I.alert className="ico-inline" /> parado há {diasDesde(l.atualizadoEm || l.criadoEm)}d
                        </span>
                      ) : l.criadoEm && (
                        <span className={"crm-card-idade" + idadeClasse(l.criadoEm)}
                          title={"Lead entrou em " + new Date(l.criadoEm).toLocaleString("pt-BR")}>
                          <I.clock className="ico-inline" /> entrou {tempoDesde(l.criadoEm)}
                        </span>
                      )}
                      {!colunaFinal && !infoTarefa(l.tarefa) && <span className="crm-card-semtarefa" title="Sem próxima tarefa — abra o lead para agendar"><I.calendar className="ico-inline" /></span>}
                      {l.origem === "ligacao" && <span className="crm-tag-lig"><I.suporte className="ico-inline" /> Ligação</span>}
                      {l.recorrente && <span className="crm-tag-lig crm-tag-recorrente" title="Este contato voltou a se cadastrar por uma nova captação"><I.repetir className="ico-inline" /> Lead atualizado</span>}
                      <div className="crm-card-vend">
                        {l.vendedorNome
                          ? <><Avatar nome={l.vendedorNome} foto={l.vendedorFoto} size={22} /><span className="crm-card-vend-nm">{l.vendedorNome.split(" ").slice(0, 2).join(" ")}</span></>
                          : <span className="crm-card-semvend">sem dono</span>}
                      </div>
                      {(l.notas || []).length > 0 && <span className="crm-card-notas" title="Notas"><I.nota className="ico-inline" /> {l.notas.length}</span>}
                    </div>
                  </div>
                ))}
                {!verTudoCol[et.k] && doEt.length > LIMITE_COL_CRM && (
                  <button type="button" className="crm-vermais" onClick={() => setVerTudoCol((v) => ({ ...v, [et.k]: true }))}>
                    ↓ Ver mais {doEt.length - LIMITE_COL_CRM} {doEt.length - LIMITE_COL_CRM === 1 ? "lead" : "leads"}
                  </button>
                )}
                {doEt.length === 0 && <div className="crm-col-vazio">Nenhum lead aqui</div>}
              </div>
            </div>
          );
        })}
      </div>

      {leadSel && (
        <div className="crm-modal-bg" onClick={(e) => e.target === e.currentTarget && setSel(null)}>
          <div className="crm-modal">
            <div className="crm-modal-head">
              <input className="crm-modal-nome" value={leadSel.nome} onChange={(e) => setLeads((ls) => ls.map((x) => x.id === sel ? { ...x, nome: e.target.value } : x))} onBlur={(e) => salvarCampo(sel, "nome", e.target.value)} />
              <button className="crm-x" onClick={() => setSel(null)}><I.trash className="ico" style={{ display: "none" }} />✕</button>
            </div>
            <div className="crm-modal-body">
              <div className="crm-f2">
                <div><label className="lbl-mini">Telefone</label><input className="input mono" value={leadSel.telefone} onChange={(e) => setLeads((ls) => ls.map((x) => x.id === sel ? { ...x, telefone: e.target.value } : x))} onBlur={(e) => salvarCampo(sel, "telefone", e.target.value)} /></div>
                <div><label className="lbl-mini">Valor (R$)</label><input className="input" value={leadSel.valor || ""} onChange={(e) => setLeads((ls) => ls.map((x) => x.id === sel ? { ...x, valor: e.target.value } : x))} onBlur={(e) => salvarCampo(sel, "valor", e.target.value)} /></div>
              </div>
              <div className="crm-f2">
                <div><label className="lbl-mini">E-mail</label><input className="input" value={leadSel.email || ""} onChange={(e) => setLeads((ls) => ls.map((x) => x.id === sel ? { ...x, email: e.target.value } : x))} onBlur={(e) => salvarCampo(sel, "email", e.target.value)} placeholder="email@exemplo.com" /></div>
                <div><label className="lbl-mini">Curso</label><input className="input" value={leadSel.curso || ""} onChange={(e) => setLeads((ls) => ls.map((x) => x.id === sel ? { ...x, curso: e.target.value } : x))} onBlur={(e) => salvarCampo(sel, "curso", e.target.value)} placeholder="Nome do curso" /></div>
              </div>
              <div className="crm-f2">
                <div><label className="lbl-mini">Etapa</label>
                  <select className="input" value={leadSel.etapa} onChange={(e) => { const k = e.target.value; salvarCampo(sel, "etapa", k); const c = etapas.find((x) => x.k === k); if (tipoDaColuna(c && c.lb) === "perda") setPerda({ id: sel, nome: leadSel.nome }); }}>
                    {etapas.map((e) => <option key={e.k} value={e.k}>{e.lb}</option>)}
                  </select>
                </div>
                {isGer ? (
                  <div><label className="lbl-mini">Vendedor responsável</label>
                    <select className="input" value={leadSel.vendedorId || ""} onChange={(e) => salvarCampo(sel, "vendedorId", e.target.value)}>
                      <option value="">Sem dono</option>
                      {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}{v.ehGerente ? " (gerente)" : ""}</option>)}
                    </select>
                  </div>
                ) : (
                  <div><label className="lbl-mini">Responsável</label>
                    <select className="input" value={leadSel.vendedorId || ""} onChange={(e) => { const vid = e.target.value; if (vid && vid !== (leadSel.vendedorId || "")) transferir(vid); }}>
                      {!leadSel.vendedorId && <option value="">Escolher vendedor…</option>}
                      {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}{v.ehGerente ? " (gerente)" : ""}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {leadSel.respostasFormulario && Object.keys(leadSel.respostasFormulario).length > 0 && (
                <>
                  <div className="crm-sec-t"><I.chat className="ico-inline" /> Informações da captação (formulário)</div>
                  <div style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 9, marginBottom: 4 }}>
                    {Object.entries(leadSel.respostasFormulario).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <span style={{ fontSize: 11, color: "var(--faint)", fontWeight: 600 }}>{k}</span>
                        <span style={{ fontSize: 13.5, color: "var(--text)", wordBreak: "break-word" }}>{Array.isArray(v) ? v.join(", ") : String(v)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="crm-sec-t"><I.clock className="ico-inline" /> Próxima tarefa (follow-up)</div>
              <div className="crm-tarefa-box">
                {leadSel.tarefa && !leadSel.tarefa.feito && (
                  <div className={"crm-tarefa-atual " + (infoTarefa(leadSel.tarefa) ? infoTarefa(leadSel.tarefa).classe : "")}>
                    <span><b>{leadSel.tarefa.texto || "Tarefa"}</b>{infoTarefa(leadSel.tarefa) ? " · " + infoTarefa(leadSel.tarefa).data : ""}</span>
                    <button className="crm-tarefa-ok" onClick={() => salvarCampo(sel, "tarefa", { ...leadSel.tarefa, feito: true })} title="Concluir"><I.check className="ico" /></button>
                    <button className="crm-tarefa-del" onClick={() => salvarCampo(sel, "tarefa", null)} title="Remover">✕</button>
                  </div>
                )}
                <div className="crm-tarefa-form">
                  <input className="input" placeholder="O que fazer (ex.: Ligar, Mandar proposta)" value={tarefaTexto} onChange={(e) => setTarefaTexto(e.target.value)} />
                  <input className="input" type="datetime-local" value={tarefaQuando} onChange={(e) => setTarefaQuando(e.target.value)} />
                  <button className="btn btn-on btn-sm" onClick={salvarTarefa}>{leadSel.tarefa && !leadSel.tarefa.feito ? "Atualizar" : "Agendar"}</button>
                </div>
              </div>

              <div className="crm-sec-t">Notas</div>
              <div className="crm-nota-add">
                <input className="input" placeholder="Escrever uma nota…" value={novaNota} onChange={(e) => setNovaNota(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNota()} />
                <button className="btn btn-sm" onClick={addNota}>Add</button>
              </div>
              <div className="crm-notas">
                {(leadSel.notas || []).slice().reverse().map((n, i) => (
                  <div key={i} className="crm-nota"><div className="crm-nota-txt">{n.texto}</div><div className="crm-nota-meta">{n.por} · {fmtData(n.ts)}</div></div>
                ))}
                {(leadSel.notas || []).length === 0 && <div className="crm-vazio-mini">Nenhuma nota ainda.</div>}
              </div>

              <div className="crm-sec-t">Histórico</div>
              <div className="crm-hist">
                {(leadSel.historico || []).slice().reverse().map((h, i) => (
                  <div key={i} className="crm-hist-row"><span>{h.texto}</span><span className="crm-hist-ts">{fmtData(h.ts)}</span></div>
                ))}
              </div>

              {isGer && <button className="crm-excluir" onClick={() => excluir(sel)}><I.trash className="ico-inline" /> Excluir lead</button>}
            </div>
          </div>
        </div>
      )}

      {criar && (
        <div className="crm-modal-bg" onClick={(e) => e.target === e.currentTarget && setCriar(null)}>
          <div className="crm-modal" style={{ maxWidth: 440 }}>
            <div className="crm-modal-head"><b>Novo lead</b><button className="crm-x" onClick={() => setCriar(null)}>✕</button></div>
            <div className="crm-modal-body">
              <label className="lbl-mini">Nome *</label>
              <input className="input" value={criar.nome} onChange={(e) => setCriar({ ...criar, nome: e.target.value })} placeholder="Nome do lead" />
              <div className="crm-f2" style={{ marginTop: 10 }}>
                <div><label className="lbl-mini">Telefone</label><input className="input mono" value={criar.telefone} onChange={(e) => setCriar({ ...criar, telefone: e.target.value })} placeholder="44 99999-9999" /></div>
                <div><label className="lbl-mini">Valor (R$)</label><input className="input" value={criar.valor} onChange={(e) => setCriar({ ...criar, valor: e.target.value })} placeholder="0" /></div>
              </div>
              <div className="crm-f2" style={{ marginTop: 10 }}>
                <div><label className="lbl-mini">E-mail</label><input className="input" value={criar.email} onChange={(e) => setCriar({ ...criar, email: e.target.value })} placeholder="email@exemplo.com" /></div>
                <div><label className="lbl-mini">Curso</label><input className="input" value={criar.curso} onChange={(e) => setCriar({ ...criar, curso: e.target.value })} placeholder="Nome do curso" /></div>
              </div>
              <div className="crm-f2" style={{ marginTop: 10 }}>
                <div><label className="lbl-mini">Etapa</label>
                  <select className="input" value={criar.etapa} onChange={(e) => setCriar({ ...criar, etapa: e.target.value })}>{etapas.map((e) => <option key={e.k} value={e.k}>{e.lb}</option>)}</select>
                </div>
                {isGer && <div><label className="lbl-mini">Vendedor</label>
                  <select className="input" value={criar.vendedorId} onChange={(e) => setCriar({ ...criar, vendedorId: e.target.value })}><option value="">Sem dono</option>{vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}{v.ehGerente ? " (gerente)" : ""}</option>)}</select>
                </div>}
              </div>
              <button className="onum-add" style={{ marginTop: 16, width: "100%", justifyContent: "center" }} onClick={criarLead}>Criar lead</button>
            </div>
          </div>
        </div>
      )}

      {config && (
        <div className="crm-modal-bg" onClick={(e) => e.target === e.currentTarget && setConfig(false)}>
          <div className="crm-modal" style={{ maxWidth: 440 }}>
            <div className="crm-modal-head"><b>Quem recebe os leads das ligações</b><button className="crm-x" onClick={() => setConfig(false)}>✕</button></div>
            <div className="crm-modal-body">
              <p className="onum-dica" style={{ marginBottom: 12 }}>Marque os vendedores que vão receber (em rodízio) os leads qualificados pela IA de ligação. Se não marcar nenhum, distribui entre todos os ativos.</p>
              {vendedores.map((v) => (
                <label key={v.id} className="crm-vend-check">
                  <input type="checkbox" checked={crmVend.includes(v.id)} onChange={() => toggleVend(v.id)} /> {v.nome}{v.ehGerente ? " (gerente)" : ""}
                </label>
              ))}
              {vendedores.length === 0 && <div className="crm-vazio-mini">Nenhum vendedor ativo.</div>}
            </div>
          </div>
        </div>
      )}

      {showReserva && <ModalReservaListas etapas={etapas} vendedores={vendedores} onClose={() => setShowReserva(false)} showToast={showToast} />}
      {waMenu && (
        <Portal>
          <div className="crm-wa-menu" style={{ top: (waMenu.y + 104 > window.innerHeight ? waMenu.yt - 100 : waMenu.y + 4), left: Math.max(8, Math.min(waMenu.x - 214, window.innerWidth - 224)) }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { const t = waMenu.tel, nm = waMenu.nome; setWaMenu(null); onAbrirWhats && onAbrirWhats(t, "evolution", nm); }}><span className="crm-wa-dot nao" /><span><b>Não oficial</b><small>abre a conversa direto</small></span></button>
            <button onClick={() => { const t = waMenu.tel, nm = waMenu.nome; setWaMenu(null); onAbrirWhats && onAbrirWhats(t, "oficial", nm); }}><span className="crm-wa-dot ofi" /><span><b>Oficial</b><small>abre a conversa + template</small></span></button>
          </div>
        </Portal>
      )}

      {qtdMarcados > 0 && (
        <Portal>
          <div className="crm-lote-bar">
            <span className="crm-lote-n">{qtdMarcados} selecionado{qtdMarcados > 1 ? "s" : ""}</span>
            <select className="crm-lote-sel" value="" onChange={(e) => { if (e.target.value) atribuirLote(e.target.value === "__sem" ? "" : e.target.value); }}>
              <option value="">Atribuir dono…</option>
              <option value="__sem">Sem dono</option>
              {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}{v.ehGerente ? " (gerente)" : ""}</option>)}
            </select>
            <select className="crm-lote-sel" value="" onChange={(e) => { if (e.target.value) moverLoteEtapa(e.target.value); }} title="Mover os selecionados para outra etapa do funil">
              <option value="">Mover para…</option>
              {etapas.map((e) => <option key={e.k} value={e.k}>{e.lb}</option>)}
            </select>
            {onDisparar && (
              <button className="crm-lote-del" style={{ background: "#25A06B", color: "#fff", borderColor: "#25A06B" }} title="Disparar um template pros leads selecionados"
                onClick={() => {
                  const sel = leads.filter((l) => marcados[l.id] && String(l.telefone || "").replace(/\D/g, "").length >= 10);
                  if (!sel.length) { showToast("Nenhum selecionado tem telefone válido"); return; }
                  const vd = (isGer && filtroVend && filtroVend !== "__sem") ? filtroVend : null;
                  onDisparar({ contatos: sel.map((l) => ({ telefone: l.telefone, nome: l.nome || "" })), vendedorDestino: vd });
                }}>
                <I.send className="ico" /> Disparar ({leads.filter((l) => marcados[l.id]).length})
              </button>
            )}
            {isGer && <button className="crm-lote-del" onClick={excluirLote}><I.trash className="ico" /> Excluir</button>}
            <button className="crm-lote-limpar" onClick={() => setMarcados({})}>Limpar</button>
          </div>
        </Portal>
      )}

      {/* comemoração (confete/som/popup de ganho e perdido) desativada a pedido */}

      {perda && <ModalMotivoPerda nome={perda.nome} onEscolher={salvarMotivoPerda} onPular={() => setPerda(null)} />}
      {showColunas && <ModalColunas etapas={etapas} leads={leads} onClose={() => setShowColunas(false)} onChanged={carregar} showToast={showToast} />}
      {showExportar && <ModalExportar leads={leads} etapas={etapas} onClose={() => setShowExportar(false)} showToast={showToast} />}
      {showImportar && <ModalImportar etapas={etapas} onClose={() => setShowImportar(false)} onDone={carregar} showToast={showToast} />}
      {showDistrib && (
        <div className="pop-bg" onClick={(e) => e.target === e.currentTarget && setShowDistrib(false)}>
          <div className="pop-sheet" style={{ maxWidth: 640 }}>
            <div className="pop-head"><b>Quem recebe os leads</b><button className="crm-x" onClick={() => setShowDistrib(false)}>✕</button></div>
            <div className="pop-body"><OficialVendedores showToast={showToast} /></div>
          </div>
        </div>
      )}
    </div>
  );
}

function badgeQualidade(q) {
  if (!q || !q.rating || q.rating === "UNKNOWN") {
    return <span style={{ fontSize: 11.5, color: "var(--faint)" }}>⚪ Qualidade: sem dado ainda</span>;
  }
  const map = {
    GREEN: { l: "Alta", c: "#059669", bg: "rgba(16,185,129,.13)", d: "#10b981" },
    YELLOW: { l: "Média", c: "#b45309", bg: "rgba(245,158,11,.15)", d: "#f59e0b" },
    RED: { l: "Baixa", c: "#dc2626", bg: "rgba(244,63,94,.12)", d: "#f43f5e" },
  };
  const m = map[q.rating] || map.RED;
  const tierMap = { TIER_50: "50/dia", TIER_250: "250/dia", TIER_1K: "1 mil/dia", TIER_10K: "10 mil/dia", TIER_100K: "100 mil/dia", TIER_UNLIMITED: "ilimitado" };
  const tier = tierMap[q.tier] || (q.tier ? String(q.tier).replace("TIER_", "") : "");
  const rank = (r) => ({ GREEN: 3, YELLOW: 2, RED: 1 }[r] || 0);
  const dir = q.anterior && q.anterior !== q.rating ? (rank(q.rating) > rank(q.anterior) ? { t: "subiu", c: "#059669" } : { t: "caiu", c: "#dc2626" }) : null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 12 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: m.bg, color: m.c, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: m.d }} /> Qualidade: {m.l}
      </span>
      {tier && <span style={{ color: "var(--muted)" }}>· limite {tier}</span>}
      {dir && <span style={{ color: dir.c, fontWeight: 700 }}>· {dir.t === "subiu" ? "▲" : "▼"} {dir.t}</span>}
    </span>
  );
}

// Painel de configuração da integração Atende Simples (ligações)
function PainelAtende({ showToast }) {
  const [cfg, setCfg] = useState(null);
  const [form, setForm] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [diag, setDiag] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);
  async function rodarDiagnostico() {
    setDiagLoading(true); setDiag(null);
    try { const r = await api.ofAtendeDiagnostico(); setDiag(r); }
    catch (e) { setDiag({ ok: false, erro: e.message }); }
    finally { setDiagLoading(false); }
  }
  const [diagLead, setDiagLead] = useState(null);
  const [diagLeadLoading, setDiagLeadLoading] = useState(false);
  async function rodarDiagnosticoLeads() {
    setDiagLeadLoading(true); setDiagLead(null);
    try { const r = await api.ofDiagnosticoLeads(); setDiagLead(r); }
    catch (e) { setDiagLead({ ok: false, erro: e.message }); }
    finally { setDiagLeadLoading(false); }
  }
  const [testeTel, setTesteTel] = useState("");
  const [testando, setTestando] = useState(false);
  const [testeRes, setTesteRes] = useState(null);
  const carregar = () => api.ofAtendeCfg().then(setCfg).catch(() => {});
  useEffect(() => { carregar(); }, []);
  const configurado = cfg && cfg.dialerToken && cfg.ativo;
  async function salvar() {
    setSalvando(true);
    try { await api.ofAtendeSalvar(form); showToast("✓ Atende Simples salvo"); setForm(null); carregar(); }
    catch (e) { showToast("✗ " + e.message); } finally { setSalvando(false); }
  }
  async function testarLigacao() {
    // usa o e-mail/ramal do PRIMEIRO vendedor preenchido na modal (ou pede pra preencher)
    const v = (form.vendedores || []).find((x) => (x.atendeEmail || "").trim() || (x.atendeRamal || "").trim());
    if (!v) { setTesteRes({ ok: false, diagnostico: "Preencha o e-mail e/ou ramal de pelo menos um vendedor acima (o do atendente que vai receber a ligação de teste)." }); return; }
    if (soDigitos(testeTel).length < 10) { setTesteRes({ ok: false, diagnostico: "Digite um telefone de teste com DDD (ex.: seu celular)." }); return; }
    setTestando(true); setTesteRes(null);
    try {
      const r = await api.ofAtendeTestar({ dialerToken: form.dialerToken, email: v.atendeEmail, ramal: v.atendeRamal, telefone: testeTel });
      setTesteRes(r);
    } catch (e) { setTesteRes({ ok: false, diagnostico: "Erro: " + e.message }); }
    finally { setTestando(false); }
  }
  async function sincronizar() {
    setSincronizando(true);
    try { const r = await api.ofAtendeSincronizar(null); showToast("✓ " + (r.gravadas || 0) + " ligação(ões) registrada(s) de " + (r.total || 0) + " no período"); carregar(); }
    catch (e) { showToast("✗ " + e.message); } finally { setSincronizando(false); }
  }
  return (
    <div className="onum-webhook" style={{ marginTop: 12 }}>
      <div className="onum-webhook-body">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
          <b>📞 Atende Simples (ligações)</b>
          <span style={{ background: cfg && cfg.ativo && configurado ? "#25A06B" : "#e5e7eb", color: cfg && cfg.ativo && configurado ? "#fff" : "#6b7280", borderRadius: 20, padding: "2px 12px", fontSize: 12, fontWeight: 700 }}>
            {cfg && cfg.ativo && configurado ? "Ativo" : "Desligado"}
          </span>
        </div>
        {configurado
          ? <p className="onum-webhook-intro">Integração ativa ✅ — o botão <b>📞 Ligar</b> aparece nas conversas e as ligações entram no <b>histórico do lead</b>.</p>
          : <p className="onum-webhook-intro">Conecte o Atende Simples pra <b>ligar de dentro da conversa</b> e registrar as ligações no histórico do lead.</p>}
        {cfg && !configurado && (cfg.dialerToken || cfg.ativo) && (
          <p style={{ fontSize: 12, color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "6px 10px", margin: "6px 0" }}>
            {!cfg.dialerToken ? "⚠️ Falta colar o token do discador (clique em Configurar e salve)." : !cfg.ativo ? "⚠️ Falta marcar \"Integração ativa\" (clique em Configurar, marque e salve)." : ""}
          </p>
        )}
        <p className="onum-webhook-fim">Cole o <b>token do discador</b> (peça ao suporte do Atende: token da <b>API Discador</b>, endpoint dialer.atendesimples.com) e preencha o <b>e-mail/ramal</b> de cada vendedor. O vendedor precisa estar <b>logado e disponível</b> no voip.atendesimples.com pra ligar.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="onum-btn-save" onClick={() => setForm({ apiKey: (cfg && cfg.apiKey) || "", dialerToken: (cfg && cfg.dialerToken) || "", userId: (cfg && cfg.userId) || "", queueId: (cfg && cfg.queueId) || "", queueToken: (cfg && cfg.queueToken) || "", voipToken: (cfg && cfg.voipToken) || "", audioToken: (cfg && cfg.audioToken) || "", ativo: cfg ? !!cfg.ativo : true, vendedores: (cfg && cfg.vendedores) ? cfg.vendedores.map((v) => ({ ...v })) : [] })}>
            {configurado ? "Editar Atende Simples" : "Configurar Atende Simples"}
          </button>
          {cfg && cfg.dialerToken && <button className="btn" onClick={sincronizar} disabled={sincronizando}>{sincronizando ? "Sincronizando…" : "↻ Sincronizar ligações agora"}</button>}
          {cfg && cfg.apiKey && <button className="btn" onClick={rodarDiagnostico} disabled={diagLoading}>{diagLoading ? "Verificando…" : "🔍 Diagnóstico"}</button>}
          <button className="btn" onClick={rodarDiagnosticoLeads} disabled={diagLeadLoading}>{diagLeadLoading ? "Analisando…" : "📊 Diagnóstico de Leads"}</button>
        </div>
        {diagLead && (
          <div style={{ marginTop: 12, padding: 14, borderRadius: 10, background: "#0f172a", color: "#e2e8f0", fontSize: 12, fontFamily: "monospace", maxHeight: 460, overflow: "auto" }}>
            <div style={{ marginBottom: 8, fontWeight: 700, color: "#38bdf8" }}>Diagnóstico de Leads</div>
            {!diagLead.ok ? <div style={{ color: "#fca5a5" }}>Erro: {diagLead.erro}</div> : (
              <div style={{ lineHeight: 1.7 }}>
                <div>Total de leads no sistema: <b style={{ color: "#fbbf24" }}>{diagLead.totalLeads}</b></div>
                <div>Com data de criação: <b style={{ color: "#4ade80" }}>{diagLead.comCriadoEm}</b> · SEM data: <b style={{ color: "#fca5a5" }}>{diagLead.semCriadoEm}</b></div>
                <div>Mês atual: <b>{diagLead.mesAtual}</b></div>
                <div style={{ marginTop: 8, color: "#38bdf8", fontWeight: 700 }}>Campos de data que os leads têm:</div>
                <div>{Object.entries(diagLead.camposDeDataExistentes || {}).map(([k, v]) => k + ": " + v).join(" · ") || "nenhum"}</div>
                <div style={{ marginTop: 8, color: "#38bdf8", fontWeight: 700 }}>Leads por mês (pela data de criação):</div>
                {Object.entries(diagLead.porMes || {}).sort().reverse().map(([m, n]) => <div key={m}>{m}: <b>{n}</b></div>)}
                {diagLead.amostraLeadsSemData && diagLead.amostraLeadsSemData.length > 0 && (
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ cursor: "pointer", color: "#94a3b8" }}>Amostra de leads SEM data (que campos de data têm?)</summary>
                    {diagLead.amostraLeadsSemData.map((l, i) => <div key={i} style={{ marginTop: 4 }}>#{i + 1} {l.nome || l.id} → campos: {(l.temCampos || []).join(", ") || "NENHUM campo de data"}</div>)}
                  </details>
                )}
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: "pointer", color: "#94a3b8" }}>Por vendedor (total · este mês · sem data)</summary>
                  {Object.entries(diagLead.porVendedor || {}).map(([v, o]) => <div key={v} style={{ marginTop: 3 }}>{v}: total {o.total} · este mês {o.comDataEsteMes} · sem data {o.semData}</div>)}
                </details>
              </div>
            )}
          </div>
        )}
        {diag && (
          <div style={{ marginTop: 12, padding: 14, borderRadius: 10, background: "#0f172a", color: "#e2e8f0", fontSize: 12, fontFamily: "monospace", maxHeight: 400, overflow: "auto" }}>
            <div style={{ marginBottom: 8, fontWeight: 700, color: "#38bdf8" }}>Diagnóstico Atende Simples</div>
            {!diag.ok ? (
              <div style={{ color: "#fca5a5" }}>Erro: {diag.erro || diag.motivo || "desconhecido"}</div>
            ) : (
              <div style={{ lineHeight: 1.7 }}>
                <div>Integração ativa: <b style={{ color: diag.ativo ? "#4ade80" : "#fca5a5" }}>{String(diag.ativo)}</b> · token discador: <b>{String(diag.temDialerToken)}</b></div>
                <div>Conexão com Atende (HTTP): <b style={{ color: diag.httpAtende === 200 ? "#4ade80" : "#fca5a5" }}>{diag.httpAtende}</b></div>
                <div>Ligações encontradas (24h): <b style={{ color: diag.totalCDRs > 0 ? "#4ade80" : "#fca5a5" }}>{diag.totalCDRs}</b></div>
                {diag.testeGravacao && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #334155" }}>
                    <div style={{ color: "#38bdf8", fontWeight: 700 }}>Teste da gravação (callid {diag.testeGravacao.callid}):</div>
                    <div>has_audio: <b style={{ color: diag.testeGravacao.has_audio ? "#4ade80" : "#fca5a5" }}>{String(diag.testeGravacao.has_audio)}</b> · estado: <b>{String(diag.testeGravacao.audio_state)}</b></div>
                    <div>tem URL pública: <b>{diag.testeGravacao.public_audio_url ? "sim" : "não"}</b></div>
                    {diag.testeGravacao.urlPublica_http && <div>baixar URL pública → HTTP <b>{diag.testeGravacao.urlPublica_http}</b>, tipo: <b>{diag.testeGravacao.urlPublica_contentType || "?"}</b></div>}
                    <div>API download → HTTP <b>{diag.testeGravacao.downloadApi_http}</b>, link: <b>{diag.testeGravacao.downloadApi_location || "não veio"}</b></div>
                    {diag.testeGravacao.erro && <div style={{ color: "#fca5a5" }}>erro: {diag.testeGravacao.erro}</div>}
                  </div>
                )}
                {!diag.testeGravacao && diag.totalCDRs > 0 && <div style={{ marginTop: 8, color: "#fbbf24" }}>Nenhuma ligação com gravação encontrada — provável que a gravação de chamadas não esteja ativada na conta do Atende.</div>}
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #334155" }}>
                  <div style={{ color: "#38bdf8", fontWeight: 700 }}>Webhooks recebidos (últimos):</div>
                  {(!diag.webhooksRecebidos || !diag.webhooksRecebidos.length)
                    ? <div style={{ color: "#fca5a5" }}>⚠️ Nenhum webhook recebido ainda. O Atende não está mandando os eventos pra este sistema (verificar a URL do webhook no Atende).</div>
                    : diag.webhooksRecebidos.map((w, i) => <div key={i} style={{ marginTop: 3, color: w.casouChat ? "#4ade80" : "#fca5a5" }}>{new Date(w.ts).toLocaleTimeString("pt-BR")} · <b>{w.evento}</b> · callid {w.callid || "—"} · {w.dur}s · tel:{(w.nums || []).join("/") || "—"} · vend:{w.vendedor || "?"} · casou:<b>{String(w.casouChat)}</b>{w.fwd ? " · (repassado)" : ""}</div>)}
                </div>
                {diag.amostraCDRs && diag.amostraCDRs.length > 0 && (
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ cursor: "pointer", color: "#94a3b8" }}>Ver telefones das ligações (comparar com as conversas)</summary>
                    <div style={{ marginTop: 6 }}>
                      <div style={{ color: "#94a3b8" }}>Telefones das conversas: {(diag.telefonesDasConversas || []).join(", ") || "nenhuma"}</div>
                      {diag.amostraCDRs.map((c, i) => <div key={i} style={{ marginTop: 4 }}>#{i + 1} dir:{c.direction} dur:{c.dur}s · ani:{c.ani} dnis:{c.dnis} alt:{c.alt_dnis} client:{c.client_number || "—"} · audio:{String(c.has_audio)}</div>)}
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {form && (
        <Portal>
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setForm(null)}>
          <div className="onum-modal" style={{ maxWidth: 560 }}>
            <button className="onum-modal-x" onClick={() => setForm(null)}><I.x /></button>
            <h3>📞 Atende Simples</h3>
            <p className="onum-webhook-intro" style={{ marginTop: 4 }}>Cole as credenciais da API do Atende Simples.</p>
            <label className="lbl-mini">x-api-key (chave da API de Clientes)</label>
            <input className="input" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="token da API de Clientes" />
            <label className="lbl-mini">token do discador (pro botão "Ligar agora")</label>
            <input className="input" value={form.dialerToken} onChange={(e) => setForm({ ...form, dialerToken: e.target.value })} placeholder="token do discador (API Discador)" />
            <label className="lbl-mini" style={{ marginTop: 10 }}>token da API de Áudio (pra transcrição — opcional)</label>
            <input className="input" value={form.audioToken || ""} onChange={(e) => setForm({ ...form, audioToken: e.target.value })} placeholder="Opções da conta → Config. de Acesso à API de Áudio" />
            <details style={{ margin: "10px 0" }}>
              <summary style={{ cursor: "pointer", fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>Campos avançados (discador por fila — opcional)</summary>
              <div style={{ marginTop: 8 }}>
                <label className="lbl-mini">user-id (Id da conta)</label>
                <input className="input" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} placeholder="ex: 10551" />
                <label className="lbl-mini">queue-id (Id do discador por fila)</label>
                <input className="input" value={form.queueId} onChange={(e) => setForm({ ...form, queueId: e.target.value })} placeholder="queue|..." />
                <label className="lbl-mini">token do discador por fila</label>
                <input className="input" value={form.queueToken} onChange={(e) => setForm({ ...form, queueToken: e.target.value })} placeholder="token do discador por fila" />
                <label className="lbl-mini">token do VoIP (opcional)</label>
                <input className="input" value={form.voipToken} onChange={(e) => setForm({ ...form, voipToken: e.target.value })} placeholder="token do VoIP" />
              </div>
            </details>
            <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0", fontSize: 14 }}>
              <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /> Integração ativa
            </label>
            {form.vendedores && form.vendedores.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <label className="lbl-mini" style={{ fontWeight: 700 }}>Ramal / e-mail de cada vendedor no Atende</label>
                <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "2px 0 8px" }}>Use o mesmo e-mail com que o vendedor faz login no Atende. Só quem tiver e-mail/ramal aqui consegue ligar.</p>
                <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingRight: 4 }}>
                  {form.vendedores.map((v, i) => (
                    <div key={v.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "8px 10px", background: "var(--card2, #f9fafb)" }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: "var(--txt)" }}>{v.nome}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <input className="input" style={{ flex: "1 1 200px", minWidth: 0, padding: "8px 10px", fontSize: 13 }} value={v.atendeEmail} placeholder="e-mail no Atende" onChange={(e) => { const arr = form.vendedores.slice(); arr[i] = { ...v, atendeEmail: e.target.value }; setForm({ ...form, vendedores: arr }); }} />
                        <input className="input" style={{ flex: "0 0 90px", width: 90, padding: "8px 10px", fontSize: 13, textAlign: "center" }} value={v.atendeRamal} placeholder="ramal" onChange={(e) => { const arr = form.vendedores.slice(); arr[i] = { ...v, atendeRamal: e.target.value }; setForm({ ...form, vendedores: arr }); }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginTop: 14, padding: 12, border: "1px dashed var(--line)", borderRadius: 10, background: "var(--card2, #f9fafb)" }}>
              <label className="lbl-mini" style={{ fontWeight: 700 }}>🧪 Testar ligação</label>
              <p style={{ fontSize: 12, color: "var(--muted)", margin: "2px 0 8px" }}>
                Dispara uma chamada de teste com o token e o 1º vendedor preenchido acima. Faça login no <b>voip.atendesimples.com</b> com o e-mail desse vendedor antes de testar.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="input" style={{ flex: 1 }} value={testeTel} placeholder="telefone de teste (com DDD)" onChange={(e) => setTesteTel(e.target.value)} />
                <button className="btn" onClick={testarLigacao} disabled={testando}>{testando ? "Testando…" : "Testar"}</button>
              </div>
              {testeRes && (
                <div style={{ marginTop: 10, padding: 10, borderRadius: 8, fontSize: 12.5, background: testeRes.ok ? "#ecfdf5" : "#fef2f2", border: "1px solid " + (testeRes.ok ? "#a7f3d0" : "#fecaca"), color: testeRes.ok ? "#065f46" : "#991b1b" }}>
                  <div style={{ fontWeight: 700, marginBottom: testeRes.resposta || testeRes.status ? 6 : 0 }}>{testeRes.diagnostico}</div>
                  {(testeRes.status || testeRes.resposta) && (
                    <details>
                      <summary style={{ cursor: "pointer", fontSize: 12 }}>Detalhes técnicos</summary>
                      <div style={{ marginTop: 6, fontFamily: "monospace", fontSize: 11.5, wordBreak: "break-all" }}>
                        {testeRes.status != null && <div>HTTP {testeRes.status}</div>}
                        {testeRes.resposta && <div>Resposta: {testeRes.resposta}</div>}
                        {testeRes.enviado && <div>Enviado: {JSON.stringify(testeRes.enviado)}</div>}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button className="btn" onClick={() => setForm(null)} disabled={salvando}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
            </div>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}

function OficialNumeros({ showToast }) {
  const [numeros, setNumeros] = useState([]);
  const [form, setForm] = useState(null);
  const [webhook, setWebhook] = useState(null);
  const [igCfg, setIgCfg] = useState(null);   // { igId, usuario, ativo, temToken }
  const [igForm, setIgForm] = useState(null); // form aberto pra editar Instagram
  const [salvandoIg, setSalvandoIg] = useState(false);
  const [verWebhook, setVerWebhook] = useState(false);
  const [reenvio, setReenvio] = useState("");
  const [verReenvio, setVerReenvio] = useState(false);
  const [testando, setTestando] = useState(null);
  const [vendedores, setVendedores] = useState([]);
  const [tokenDef, setTokenDef] = useState(false);
  const [tokenForm, setTokenForm] = useState(null); // { token: "" } quando abre o modal do token global
  const [salvandoToken, setSalvandoToken] = useState(false);
  const [puxandoQ, setPuxandoQ] = useState(null);

  async function puxarQualidade(n) {
    setPuxandoQ(n.id);
    try {
      const r = await api.ofPuxarQualidade(n.id);
      carregar();
      if (r && r.fotoErro) showToast("Qualidade atualizada. Foto: " + r.fotoErro);
      else showToast("Qualidade e foto atualizadas");
    }
    catch (e) { showToast("Não deu pra puxar: " + e.message); }
    finally { setPuxandoQ(null); }
  }
  async function puxarQualidadeTodos() {
    setPuxandoQ("todos");
    try { await api.ofQualidadeTodos(); carregar(); showToast("Qualidade de todos atualizada"); }
    catch (e) { showToast(e.message); }
    finally { setPuxandoQ(null); }
  }

  const [carregando, setCarregando] = useState(true);
  const [iasNum, setIasNum] = useState([]);
  const carregar = () => api.ofNumeros().then((ns) => { setNumeros(ns); setCarregando(false); }).catch((e) => { showToast(e.message); setCarregando(false); });
  useEffect(() => {
    carregar();
    api.ofIAs().then((l) => setIasNum((l || []).filter((x) => x.ativa))).catch(() => {});
    api.ofWebhookInfo(window.location.origin).then(setWebhook).catch(() => {});
    api.ofGetReenvio().then((r) => setReenvio((r.urls || []).join("\n"))).catch(() => {});
    api.ofInstagram().then(setIgCfg).catch(() => {});
    api.ofVendedoresLista().then(setVendedores).catch(() => {});
    api.ofTokenGlobalStatus().then((r) => setTokenDef(!!r.definido)).catch(() => {});
  }, []);

  async function salvarTokenGlobal() {
    if (!tokenForm.token.trim()) return showToast("Cole o token permanente da Meta");
    setSalvandoToken(true);
    try {
      await api.ofSetTokenGlobal(tokenForm.token.trim());
      setTokenDef(true);
      setTokenForm(null);
      carregar();
      showToast("✅ Token da Meta salvo! Vale pra todos os números.");
    } catch (e) { showToast("❌ " + e.message); }
    finally { setSalvandoToken(false); }
  }

  async function salvarIg() {
    if (!igForm.igId || !igForm.igId.trim()) return showToast("Informe o ID da conta do Instagram");
    setSalvandoIg(true);
    try {
      const dados = { igId: igForm.igId.trim(), usuario: igForm.usuario || "", ativo: !!igForm.ativo, vendedorId: igForm.vendedorId || null };
      if (igForm.token && igForm.token.trim()) dados.token = igForm.token.trim();
      const r = await api.ofSalvarInstagram(dados);
      setIgCfg({ igId: r.igId, usuario: r.usuario, ativo: r.ativo, vendedorId: r.vendedorId || null, temToken: r.temToken });
      setIgForm(null);
      showToast("✅ Instagram salvo!");
    } catch (e) { showToast("❌ " + e.message); }
    finally { setSalvandoIg(false); }
  }

  async function salvar() {
    if (!form.apelido || !form.phoneNumberId) {
      return showToast("Preencha apelido e Phone Number ID");
    }
    if (!form.id && !form.token && !tokenDef) {
      return showToast("Configure o Token da Meta (botão no topo) ou informe um token pra este número");
    }
    try {
      if (form.id) await api.ofEditarNumero(form.id, form);
      else await api.ofCriarNumero(form);
      setForm(null); carregar(); showToast("Número salvo!");
    } catch (e) { showToast(e.message); }
  }
  async function excluir(n) {
    if (!confirm(`Excluir o número "${n.apelido}"?`)) return;
    try { await api.ofExcluirNumero(n.id); carregar(); showToast("Número excluído"); }
    catch (e) { showToast(e.message); }
  }
  async function testar(n) {
    setTestando(n.id);
    try {
      const r = await api.ofTemplates(n.id);
      showToast(`✅ Conexão OK! ${(r.templates || []).length} template(s) aprovado(s).`);
    } catch (e) { showToast("❌ " + e.message); }
    finally { setTestando(null); }
  }
  async function registrar(n) {
    const pin = prompt(`Registrar o número "${n.apelido}" na Cloud API.\n\nDigite o PIN de 6 dígitos da verificação em duas etapas (Meta → número → Confirmação em duas etapas):`);
    if (pin == null) return;
    if (String(pin).replace(/\D/g, "").length !== 6) return showToast("O PIN precisa ter 6 dígitos");
    showToast("Registrando número…");
    try {
      await api.ofRegistrarNumero(n.id, pin);
      showToast("✅ Número registrado! Agora teste a conexão.");
      carregar();
    } catch (e) { showToast("❌ " + e.message); }
  }
  async function assinarWebhook(n) {
    showToast("Ativando recebimento de respostas…");
    try {
      await api.ofAssinarWebhook(n.id);
      showToast("✅ Pronto! As respostas desse número agora chegam no sistema.");
      carregar();
    } catch (e) { showToast("❌ " + e.message); }
  }
  async function diagnostico() {
    showToast("Verificando…");
    try {
      const d = (await api.ofDiagnostico()) || {};
      const nums = Array.isArray(d.numeros) ? d.numeros : [];
      const logs = Array.isArray(d.log) ? d.log : [];
      let txt = "DIAGNÓSTICO DO WEBHOOK (recebimento de respostas)\n";
      txt += "══════════════════════════════════════\n\n";
      // 1) chegou ALGUMA coisa da Meta?
      const ultimo = logs.length ? logs[0].ts : 0;
      if (!ultimo) {
        txt += "⚠️ NENHUMA resposta chegou da Meta até agora.\n";
        txt += "Quando o cliente responde e não aparece aqui, é UMA destas causas:\n\n";
        txt += "  1) O webhook não está configurado (ou aponta pra outro lugar) no\n";
        txt += "     painel da Meta. Vá em WhatsApp → Configuração → Webhook e cole a\n";
        txt += "     URL e o Token da seção \"Configuração do Webhook na Meta\" (aqui embaixo).\n";
        txt += "  2) A WABA do número não está inscrita (veja a lista abaixo — o botão 🔗).\n";
        txt += "  3) Se este sistema usa o MESMO app da Meta de outro sistema, as respostas\n";
        txt += "     podem estar caindo no OUTRO sistema. Cada sistema precisa do seu próprio\n";
        txt += "     app da Meta apontando pra própria URL de webhook.\n\n";
      } else {
        txt += "✅ Última chamada recebida da Meta: " + new Date(ultimo).toLocaleString("pt-BR") + "\n";
        txt += "   (se as respostas ainda não aparecem, confira o número certo abaixo)\n\n";
      }
      // 2) inscrição + veredito de cada número
      txt += "Cada número está pronto pra receber respostas?\n";
      for (const n of nums) {
        let veredito;
        if (!n.wabaId) veredito = "❌ SEM WABA ID — edite o número, cole o WABA ID e clique no 🔗 (Assinar webhook).";
        else if (n.inscrito === true) veredito = "✅ inscrita na Meta";
        else if (n.inscrito === false) veredito = "❌ NÃO inscrita — clique no 🔗 (Assinar webhook).";
        else veredito = "⚠️ " + (n.erro || "não deu pra verificar");
        txt += `• ${n.apelido} (id ${n.phoneNumberId || "?"}): ${veredito}\n`;
      }
      // 3) log cru (mostra o phone_id de quem chegou — útil se o número estiver trocado)
      txt += "\nÚltimas chamadas recebidas da Meta:\n";
      if (!logs.length) {
        txt += "(nenhuma ainda)\n";
      } else {
        for (const l of logs.slice(0, 8)) {
          const hora = new Date(l.ts).toLocaleTimeString("pt-BR");
          txt += `• ${hora} — ${l.resumo}\n`;
        }
      }
      alert(txt);
    } catch (e) { showToast("❌ " + e.message); }
  }
  async function assinarTodos() {
    showToast("Assinando o webhook de todos os números…");
    try {
      const r = await api.ofAssinarTodos();
      const falhas = (r.resultados || []).filter((x) => !x.ok);
      let txt = `WEBHOOK — assinatura em massa\n\n✅ ${r.ok} de ${r.total} número(s) assinados com sucesso.\n`;
      if (falhas.length) {
        txt += "\n❌ Não deu certo em:\n";
        for (const f of falhas) txt += `• ${f.apelido}: ${f.erro || "falha"}\n`;
        txt += "\n(Se for \"sem WABA ID\", edite o número e cole o WABA ID; depois assine de novo.)";
      } else {
        txt += "\nTodos prontos! As respostas agora chegam no sistema.\n\nSe mesmo assim não chegar, confira a URL do webhook no painel da Meta (seção \"Configuração do Webhook na Meta\").";
      }
      alert(txt);
      carregar();
    } catch (e) { showToast("❌ " + e.message); }
  }
  async function salvarReenvio() {
    try {
      const urls = reenvio.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
      const r = await api.ofSetReenvio(urls);
      setReenvio((r.urls || []).join("\n"));
      showToast(r.urls && r.urls.length ? "✅ Reenvio ativo pra: " + r.urls.join(", ") : "Reenvio desligado");
    } catch (e) { showToast("❌ " + e.message); }
  }
  function copiar(txt, label) {
    navigator.clipboard?.writeText(txt).then(() => showToast(`${label} copiado!`)).catch(() => {});
  }

  const ativos = numeros.filter((n) => n.ativo).length;
  const qAlta = numeros.filter((n) => n.quality && n.quality.rating === "GREEN").length;
  const qAtencao = numeros.filter((n) => n.quality && (n.quality.rating === "YELLOW" || n.quality.rating === "RED")).length;
  const comIA = numeros.filter((n) => n.iaId && iasNum.some((x) => x.id === n.iaId)).length;
  const semDono = numeros.filter((n) => !n.vendedorId).length;
  const novoNumero = () => setForm({ apelido: "", numero: "", phoneNumberId: "", wabaId: "", token: "", vendedorId: "" });
  const igAtivo = !!(igCfg && igCfg.ativo && igCfg.temToken);

  return (
    <div className="onum onx">
      {/* cabeçalho */}
      <div className="onx-topo">
        <div>
          <h3 className="onum-titulo">Números oficiais</h3>
          <p className="onum-sub">WhatsApp Cloud API conectados à sua conta Meta</p>
        </div>
        <div className="onx-topo-acoes">
          <button className={"onx-token" + (tokenDef ? " ok" : "")} onClick={() => setTokenForm({ token: "" })} title="Token permanente da Meta (mesma conta da empresa). Vale pra todos os números.">
            <I.key className="ico" /> {tokenDef ? "Token da Meta ativo" : "Configurar token da Meta"}
          </button>
          <button className="onum-add" onClick={novoNumero}><I.plus className="ico" /> Adicionar número</button>
        </div>
      </div>

      <div className="onx-barra">
        <button className="onx-btn" onClick={diagnostico} title="Verificar se as respostas estão chegando"><I.search className="ico" /> Diagnóstico</button>
        <button className="onx-btn" onClick={assinarTodos} title="Ativa o recebimento de respostas (webhook) em TODOS os números de uma vez"><I.link className="ico" /> Assinar webhook (todos)</button>
        <button className="onx-btn" onClick={puxarQualidadeTodos} disabled={puxandoQ === "todos"} title="Puxar da Meta a qualidade, o limite e a foto de perfil de todos os números">
          {puxandoQ === "todos" ? <><span className="spin" /> Atualizando…</> : <><I.gauge className="ico" /> Atualizar qualidade e fotos</>}
        </button>
      </div>

      {numeros.length > 0 && (
        <div className="onx-kpis">
          <div className="onx-kpi"><span><I.wa className="ico" /> Conectados</span><b>{ativos}<small> de {numeros.length}</small></b><em>{ativos === numeros.length ? "todos ativos" : (numeros.length - ativos) + " inativo(s)"}</em></div>
          <div className="onx-kpi bom"><span><I.check className="ico" /> Qualidade alta</span><b>{qAlta}</b><em>prontos pra disparar</em></div>
          <div className={"onx-kpi" + (qAtencao ? " alerta" : "")}><span><I.alert className="ico" /> Pedem atenção</span><b>{qAtencao}</b><em>{qAtencao ? "qualidade média ou baixa" : "nenhum com problema"}</em></div>
          <div className="onx-kpi"><span><I.spark className="ico" /> Atendidos por IA</span><b>{comIA}</b><em>{semDono} sem dono (distribuição)</em></div>
        </div>
      )}

      {/* alerta de queda de qualidade */}
      {(() => {
        const rank = (r) => ({ GREEN: 3, YELLOW: 2, RED: 1 }[r] || 0);
        const lab = (r) => ({ GREEN: "Alta", YELLOW: "Média", RED: "Baixa" }[r] || r);
        const caidos = (numeros || []).filter((n) => n.quality && n.quality.anterior && rank(n.quality.rating) < rank(n.quality.anterior));
        if (!caidos.length) return null;
        return (
          <div className="onum-alerta">
            <div className="onum-alerta-tit"><I.alert className="ico-inline" /> Atenção: {caidos.length} número{caidos.length > 1 ? "s caíram" : " caiu"} de qualidade</div>
            <div className="onum-alerta-lista">
              {caidos.map((n) => (
                <span key={n.id} className="onum-alerta-item"><b>{n.apelido}</b>: {lab(n.quality.anterior)} → <b className={n.quality.rating === "RED" ? "onx-q-baixa" : "onx-q-media"}>{lab(n.quality.rating)}</b></span>
              ))}
            </div>
            <div className="onum-alerta-dica">Segure o ritmo de disparo desse(s) número(s) e use templates UTILITY até a qualidade voltar, pra não ser restringido pela Meta.</div>
          </div>
        );
      })()}

      {/* lista de números */}
      {carregando && !numeros.length ? (
        <div className="onx-cards">
          {[0, 1, 2].map((i) => <div key={i} className="skel skel-card" />)}
        </div>
      ) : numeros.length === 0 ? (
        <div className="onum-vazio">
          <div className="onum-vazio-ico"><I.wa className="ico" /></div>
          <b>Nenhum número conectado ainda</b>
          <p>Conecte um número da sua conta Meta para começar a disparar.</p>
          <button className="onum-add" onClick={novoNumero}><I.plus className="ico" /> Adicionar número</button>
        </div>
      ) : (
        <div className="onx-cards">
          {numeros.map((n) => {
            const ia = n.iaId ? iasNum.find((x) => x.id === n.iaId) : null;
            return (
              <div key={n.id} className={"onx-card" + (n.ativo ? "" : " off")}>
                <div className="onx-card-topo">
                  <div className="onx-foto">
                    {n.temFoto
                      ? <img src={"/api/oficial/numeros/" + n.id + "/foto?v=" + (n.fotoAtualizadaEm || 0)} alt="" onError={(e) => { e.target.style.display = "none"; }} />
                      : <I.wa className="ico" />}
                    <i className={n.ativo ? "on" : ""} title={n.ativo ? "Ativo" : "Inativo"} />
                  </div>
                  <div className="onx-card-nome">
                    <b>{n.apelido}</b>
                    <span>{n.numero || "número não informado"}</span>
                  </div>
                  <span className={n.ativo ? "onum-status on" : "onum-status off"}><i /> {n.ativo ? "Ativo" : "Inativo"}</span>
                </div>
                <div className="onx-q">{badgeQualidade(n.quality)}</div>
                <div className="onx-chips">
                  {n.vendedorId
                    ? <span className="onx-chip dono"><I.user className="ico" /> {n.vendedorNome || "—"}</span>
                    : <span className="onx-chip"><I.funnel className="ico" /> Sem dono · distribuição por %</span>}
                  {n.iaId && <span className="onx-chip ia"><I.spark className="ico" /> IA: {ia ? ia.nome : "atende este número"}</span>}
                </div>
                <div className="onx-pid">Phone ID <span className="mono">{n.phoneNumberId}</span></div>
                <div className="onx-card-acoes">
                  <button className="onum-acao" onClick={() => puxarQualidade(n)} title="Puxar da Meta a qualidade e a foto de perfil do número" disabled={puxandoQ === n.id}>
                    {puxandoQ === n.id ? <span className="spin" /> : <I.gauge className="ico" />}
                  </button>
                  <button className="onum-acao" onClick={() => assinarWebhook(n)} title="Ativar recebimento de respostas (webhook)"><I.link className="ico" /></button>
                  <button className="onum-acao" onClick={() => registrar(n)} title="Registrar número na Cloud API (use se aparecer erro de envio)"><I.key className="ico" /></button>
                  <button className="onum-acao" onClick={() => testar(n)} title="Testar conexão" disabled={testando === n.id}>
                    {testando === n.id ? <span className="spin" /> : <I.check className="ico" />}
                  </button>
                  <button className="onum-acao danger" onClick={() => excluir(n)} title="Excluir"><I.trash className="ico" /></button>
                  <button className="onx-editar" onClick={() => setForm({ ...n, token: "", iaId: (n.iaId && iasNum.some((x) => x.id === n.iaId)) ? n.iaId : "" })}><I.cog className="ico" /> Editar</button>
                </div>
              </div>
            );
          })}
          <button className="onx-card onx-novo" onClick={novoNumero}>
            <span><I.plus className="ico" /></span>
            <b>Adicionar número</b>
            <small>Conecte outro número da sua conta Meta</small>
          </button>
        </div>
      )}

      <div className="onx-sec">Integrações</div>
      <div className="onx-integ">
        {/* webhook colapsável */}
        {webhook && (
          <div className="onum-webhook">
            <button className="onum-webhook-h" onClick={() => setVerWebhook((v) => !v)}>
              <span className="onx-integ-ic"><I.link className="ico" /></span>
              <span className="onx-integ-t"><b>Webhook na Meta</b><small>URL e token pra receber as respostas</small></span>
              <I.chevron className={"ico chev" + (verWebhook ? " open" : "")} />
            </button>
            {verWebhook && (
              <div className="onum-webhook-body">
                <p className="onum-webhook-intro">No painel da Meta, vá em <b>WhatsApp → Configuração → Webhook</b> e cole estes dois valores:</p>
                <div className="onum-copy">
                  <label>URL de callback</label>
                  <div className="onum-copy-row">
                    <input className="mono" readOnly value={webhook.url} onFocus={(e) => e.target.select()} />
                    <button onClick={() => copiar(webhook.url, "URL")} title="Copiar"><I.copy className="ico" /></button>
                  </div>
                </div>
                <div className="onum-copy">
                  <label>Token de verificação</label>
                  <div className="onum-copy-row">
                    <input className="mono" readOnly value={webhook.verifyToken} onFocus={(e) => e.target.select()} />
                    <button onClick={() => copiar(webhook.verifyToken, "Token")} title="Copiar"><I.copy className="ico" /></button>
                  </div>
                </div>
                <p className="onum-webhook-fim">Depois de verificar, ative o campo <b>messages</b> nos webhooks.</p>
              </div>
            )}
          </div>
        )}

        {/* Reenvio pra outro sistema (mesmo app da Meta) */}
        <div className="onum-webhook">
          <button className="onum-webhook-h" onClick={() => setVerReenvio((v) => !v)}>
            <span className="onx-integ-ic"><I.repetir className="ico" /></span>
            <span className="onx-integ-t"><b>2 sistemas no mesmo app da Meta</b><small>{reenvio.trim() ? "reenvio ligado" : "reenvio desligado"}</small></span>
            <I.chevron className={"ico chev" + (verReenvio ? " open" : "")} />
          </button>
          {verReenvio && (
            <div className="onum-webhook-body">
              <p className="onum-webhook-intro">A Meta só manda pra <b>uma</b> URL. Se você tem <b>outro CRM no MESMO app da Meta</b>, configure isto <b>no sistema pra onde a Meta aponta hoje</b> (o que já funciona): cole a URL <b>base</b> do sistema irmão (ex.: <span className="mono">https://xxx.up.railway.app</span>) que este aqui <b>repassa</b> os eventos pra ele. Cada sistema processa só os números dele. Deixe vazio pra desligar.</p>
              <textarea className="mono onx-textarea" rows={2} placeholder="https://outro-sistema.up.railway.app" value={reenvio} onChange={(e) => setReenvio(e.target.value)} />
              <button className="onum-btn-save" onClick={salvarReenvio}>Salvar reenvio</button>
              <p className="onum-webhook-fim">Uma URL por linha se tiver mais de um sistema. Pode colar a URL completa do webhook que ele guarda só a base.</p>
            </div>
          )}
        </div>

        {/* Instagram (Direct) — cai na mesma Caixa de entrada */}
        <div className="onum-webhook onx-ig">
          <div className="onx-ig-h">
            <span className="onx-integ-ic ig"><I.image className="ico" /></span>
            <span className="onx-integ-t"><b>Instagram (Direct)</b><small>{igCfg && igCfg.igId ? (igCfg.usuario ? "@" + igCfg.usuario : igCfg.igId) : "nenhuma conta ligada"}</small></span>
            <span className={"onx-pill" + (igAtivo ? " on" : "")}>{igAtivo ? "Ativo" : "Desligado"}</span>
          </div>
          <div className="onum-webhook-body">
            {igCfg && igCfg.igId
              ? <p className="onum-webhook-intro">Token {igCfg.temToken ? "salvo ✅" : "faltando ⚠️"}{igCfg.vendedorId && vendedores.find((v) => v.id === igCfg.vendedorId) ? <> · Atende: <b>{vendedores.find((v) => v.id === igCfg.vendedorId).nome}</b></> : null} — os DMs caem aqui na <b>Caixa de entrada</b>.</p>
              : <p className="onum-webhook-intro">Ligue uma conta Instagram profissional pra <b>receber e responder DMs</b> aqui na Caixa de entrada.</p>}
            <p className="onum-webhook-fim">Usa o <b>mesmo webhook do WhatsApp</b>. No app da Meta, adicione o produto <b>Instagram</b>, assine o webhook e ative o campo <b>messages</b>.</p>
            <button className="onum-btn-save" onClick={() => setIgForm({ igId: (igCfg && igCfg.igId) || "", usuario: (igCfg && igCfg.usuario) || "", token: "", ativo: igCfg ? !!igCfg.ativo : true, vendedorId: (igCfg && igCfg.vendedorId) || null })}>
              {igCfg && igCfg.igId ? "Editar Instagram" : "Configurar Instagram"}
            </button>
          </div>
        </div>
      </div>

      <PainelAtende showToast={showToast} />

      {/* modal: token global da Meta */}
      {tokenForm && (
        <Portal>
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setTokenForm(null)}>
          <div className="onum-modal">
            <button className="onum-modal-x" onClick={() => setTokenForm(null)}><I.x /></button>
            <div className="onum-modal-head">
              <div className="onum-modal-ico">🔑</div>
              <div>
                <h3>Token da Meta (global)</h3>
                <p>Um token permanente da conta da empresa (mesma BM). Vale pra todos os números — não precisa colar em cada um.</p>
              </div>
            </div>
            <div className="onum-modal-body">
              <div className="onum-dica" style={{ marginBottom: 12 }}>
                Use um <b>token permanente de Usuário do Sistema</b> (Business Manager → Configurações → Usuários do sistema), com as permissões <b>whatsapp_business_messaging</b> e <b>whatsapp_business_management</b>. Não use o token temporário de 24h do painel de teste.
              </div>
              <div className="onum-f">
                <label>Access Token {tokenDef && <i>(já existe um salvo — colar aqui substitui)</i>}</label>
                <input className="mono" placeholder="EAA..." value={tokenForm.token} onChange={(e) => setTokenForm({ token: e.target.value })} autoFocus />
              </div>
            </div>
            <div className="onum-modal-foot">
              <button className="onum-btn-ghost" onClick={() => setTokenForm(null)}>Cancelar</button>
              <button className="onum-btn-save" onClick={salvarTokenGlobal} disabled={salvandoToken}>{salvandoToken ? "Salvando…" : "Salvar token"}</button>
            </div>
          </div>
        </div>
        </Portal>
      )}

      {/* modal: Instagram (Direct) */}
      {igForm && (
        <Portal>
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setIgForm(null)}>
          <div className="onum-modal">
            <button className="onum-modal-x" onClick={() => setIgForm(null)}><I.x /></button>
            <div className="onum-modal-head">
              <div className="onum-modal-ico">📸</div>
              <div>
                <h3>Instagram (Direct)</h3>
                <p>Ligue a conta pra receber os DMs aqui na Caixa de entrada e responder na mão.</p>
              </div>
            </div>
            <div className="onum-modal-body">
              <div className="onum-dica" style={{ marginBottom: 12 }}>
                Precisa de uma conta <b>Instagram profissional</b> (Comercial/Criador) ligada a uma <b>Página do Facebook</b>, e do produto <b>Instagram</b> adicionado no mesmo app da Meta do WhatsApp, com a permissão <b>instagram_manage_messages</b>.
              </div>
              <div className="onum-f">
                <label>@ do perfil <i>(opcional, só pra identificar aqui)</i></label>
                <input placeholder="escolainstructiva" value={igForm.usuario} onChange={(e) => setIgForm({ ...igForm, usuario: e.target.value })} />
              </div>
              <div className="onum-f">
                <label>ID da conta Instagram <i>(ID da conta profissional)</i></label>
                <input className="mono" placeholder="Ex: 17841400000000000" value={igForm.igId} onChange={(e) => setIgForm({ ...igForm, igId: e.target.value })} autoFocus />
              </div>
              <div className="onum-f">
                <label>Access Token {igCfg && igCfg.temToken ? <i>(deixe vazio pra manter o atual)</i> : <i>(Page token com instagram_manage_messages)</i>}</label>
                <input className="mono" placeholder={igCfg && igCfg.temToken ? "deixe vazio pra manter" : "EAA..."} value={igForm.token} onChange={(e) => setIgForm({ ...igForm, token: e.target.value })} />
              </div>
              <div className="onum-f">
                <label>Vendedor responsável <i>(quem atende as DMs do Instagram)</i></label>
                <select value={igForm.vendedorId || ""} onChange={(e) => setIgForm({ ...igForm, vendedorId: e.target.value || null })}>
                  <option value="">— Ninguém (cai na caixa geral) —</option>
                  {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
                </select>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 5 }}>As conversas do Instagram vão direto pra esse vendedor.</div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontWeight: 600 }}>
                <input type="checkbox" checked={!!igForm.ativo} onChange={(e) => setIgForm({ ...igForm, ativo: e.target.checked })} /> Ativo
              </label>
            </div>
            <div className="onum-modal-foot">
              <button className="onum-btn-ghost" onClick={() => setIgForm(null)}>Cancelar</button>
              <button className="onum-btn-save" onClick={salvarIg} disabled={salvandoIg}>{salvandoIg ? "Salvando…" : "Salvar Instagram"}</button>
            </div>
          </div>
        </div>
        </Portal>
      )}

      {/* modal adicionar/editar */}
      {form && (
        <Portal>
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setForm(null)}>
          <div className="onum-modal">
            <button className="onum-modal-x" onClick={() => setForm(null)}><I.x /></button>
            <div className="onum-modal-head">
              <div className="onum-modal-ico"><I.wa className="ico" /></div>
              <div>
                <h3>{form.id ? "Editar número" : "Conectar número da Meta"}</h3>
                <p>Cole as credenciais do número que já existe na sua conta Meta.</p>
              </div>
            </div>

            <div className="onum-modal-body">
              <div className="onum-f">
                <label>Apelido <i>(como vai aparecer aqui no sistema)</i></label>
                <input placeholder="Ex: Thalia, Comercial, Vendas..." value={form.apelido} onChange={(e) => setForm({ ...form, apelido: e.target.value })} />
              </div>
              <div className="onum-f">
                <label>Número de telefone <i>(opcional, só pra você identificar)</i></label>
                <input placeholder="+55 44 99755-0996" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
              </div>

              <div className="onum-f">
                <label>Vendedor dono deste número <i>(quem dispara e atende por ele)</i></label>
                <select className="input" value={form.vendedorId || ""} onChange={(e) => setForm({ ...form, vendedorId: e.target.value })}>
                  <option value="">🔀 Nenhum — distribuição automática por % (modelo antigo)</option>
                  {vendedores.map((v) => <option key={v.id} value={v.id}>👤 {v.nome}</option>)}
                </select>
                <div className="onum-dica" style={{ marginTop: 8 }}>
                  Ao vincular um vendedor, <b>só ele</b> vê este número, cria os templates dele e dispara por ele — e todo lead que responder cai <b>direto pra ele</b>.
                </div>
              </div>

              <div className="onum-f">
                <label>Atendente IA deste número <i>(a IA atende os leads que entram por ele)</i></label>
                <select className="input" value={form.iaId || ""} onChange={(e) => setForm({ ...form, iaId: e.target.value })}>
                  <option value="">Sem IA — o vendedor atende manualmente</option>
                  {iasNum.map((ia) => <option key={ia.id} value={ia.id}>{ia.nome} · {ia.modo === "qualifica" ? "qualifica → vendedor" : "fecha sozinha"}</option>)}
                </select>
                <div className="onum-dica" style={{ marginTop: 8 }}>
                  {iasNum.length === 0
                    ? <>Você ainda não tem nenhuma IA ativa. Crie uma na aba <b>Atendente IA</b> pra poder escolher aqui.</>
                    : <>Escolhendo uma IA, <b>todo lead novo que responder neste número é atendido pela IA automaticamente</b>. Os outros números ficam sem IA. Você pode assumir qualquer conversa a qualquer momento.</>}
                </div>
              </div>

              <div className="onum-divisor"><span>Credenciais da Meta</span></div>
              <div className="onum-dica">
                💡 Você encontra esses dados no <b>Meta for Developers</b> → seu app → <b>WhatsApp → Configuração da API</b>. Use sempre o botão de copiar (não digite à mão).{tokenDef && " O Token já está configurado no topo e vale pra todos os números — só preencha o Access Token abaixo se este número usar um token diferente."}
              </div>

              <div className="onum-f">
                <label>Phone Number ID</label>
                <input className="mono" placeholder="Ex: 1115209651681858" value={form.phoneNumberId} onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })} />
              </div>
              <div className="onum-f">
                <label>WABA ID <i>(ID da conta do WhatsApp Business)</i></label>
                <input className="mono" placeholder="Ex: 751745137996849" value={form.wabaId} onChange={(e) => setForm({ ...form, wabaId: e.target.value })} />
              </div>
              <div className="onum-f">
                <label>Access Token {tokenDef ? <i>(opcional — usa o Token da Meta global se vazio)</i> : (form.id && <i>(deixe vazio pra manter o atual)</i>)}</label>
                <input className="mono" placeholder={tokenDef ? "deixe vazio pra usar o token global" : "EAA..."} value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} />
              </div>
            </div>

            <div className="onum-modal-foot">
              <button className="onum-btn-ghost" onClick={() => setForm(null)}>Cancelar</button>
              <button className="onum-btn-save" onClick={salvar}>{form.id ? "Salvar alterações" : "Conectar número"}</button>
            </div>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}

/* ============================================================
   INBOX OFICIAL — usado tanto pelo gerente quanto pelo vendedor
   ============================================================ */
// renderiza mídia recebida do lead no oficial (áudio, imagem, vídeo, documento)
// janela de atendimento de 24h do WhatsApp: conta 24h a partir da última msg do LEAD
// (renova quando ele responde). Fora dela, só template entrega.
function janela24h(ultimaEntradaTs) {
  if (!ultimaEntradaTs) return null; // lead ainda não respondeu -> não há janela aberta
  const fim = ultimaEntradaTs + 24 * 3600000;
  const resta = fim - Date.now();
  if (resta <= 0) return { aberta: false, urgente: false, texto: "fechada", fim };
  const h = Math.floor(resta / 3600000);
  const m = Math.floor((resta % 3600000) / 60000);
  return { aberta: true, urgente: resta < 2 * 3600000, resta, texto: h > 0 ? `${h}h ${m}min` : `${m}min`, fim };
}

function Ticks({ status, texto, erro, erroCodigo, lidoEm }) {
  if (!status) return null;
  if (status === "failed") {
    const cru = [erroCodigo ? "(#" + erroCodigo + ")" : "", erro || ""].filter(Boolean).join(" ");
    const explicado = cru ? explicaErroMeta(cru) : "A Meta não entregou essa mensagem.";
    return (
      <span className="msg-falhou" title="Clique pra ver o motivo"
        onClick={(e) => { e.stopPropagation(); window.alert("Por que não entregou:\n\n" + explicado + (cru ? "\n\nErro da Meta: " + cru : "")); }}>
        ! não entregue · por quê?
      </span>
    );
  }
  const lida = status === "read";
  const dois = status === "delivered" || lida;
  const cor = lida ? "#53bdeb" : "rgba(0,0,0,.42)";
  const horaLida = lida && lidoEm ? new Date(lidoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
  const titulo = lida ? ("O lead abriu e leu" + (horaLida ? " às " + horaLida : "")) : status === "delivered" ? "Chegou no celular do lead" : "Aceita pelo WhatsApp, ainda não confirmou a entrega";
  const palavra = lida ? (horaLida ? "lida " + horaLida : "lida") : status === "delivered" ? "entregue" : "enviada";
  return (
    <span title={titulo} style={{ display: "inline-flex", alignItems: "center", gap: 3, marginLeft: 4, verticalAlign: "middle", color: cor }}>
      <svg width={dois ? 17 : 11} height="11" viewBox={dois ? "0 0 17 11" : "0 0 11 11"} fill="none">
        <path d="M1 6 L4 9 L9.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {dois && <path d="M6.5 6 L9.5 9 L15 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      {texto && <span style={{ fontSize: 10.5, fontWeight: 600 }}>{palavra}</span>}
    </span>
  );
}

function OfMidia({ chatId, m }) {
  const [url, setUrl] = useState(null);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function carregar() {
    if (url || carregando) return;
    setCarregando(true);
    try { setUrl(await api.ofMidiaBlob(chatId, m.mid)); }
    catch (_) { setErro(true); }
    finally { setCarregando(false); }
  }

  // imagem e áudio carregam sozinhos; documento/vídeo por clique
  useEffect(() => {
    if (m.tipo === "image" || m.tipo === "audio") carregar();
    // eslint-disable-next-line
  }, []);

  if (erro) return <div className="of-midia-erro">⚠️ Não foi possível carregar a mídia</div>;

  if (m.tipo === "image") {
    return url
      ? <img className="of-midia-img" src={url} alt="Foto do lead" onClick={() => window.open(url, "_blank")} />
      : <div className="of-midia-load">📷 Carregando foto…</div>;
  }
  if (m.tipo === "audio") {
    return (
      <div className="of-midia-audio">
        {url ? <audio controls src={url} style={{ width: "100%" }} /> : <div className="of-midia-load">🎤 Carregando áudio…</div>}
        {m.transcricao && <div className="of-midia-transc">"{m.transcricao}"</div>}
      </div>
    );
  }
  if (m.tipo === "video") {
    return url
      ? <video className="of-midia-video" controls src={url} style={{ maxWidth: "100%", borderRadius: 8 }} />
      : <button className="of-midia-btn" onClick={carregar}>{carregando ? "Carregando…" : "🎬 Carregar vídeo"}</button>;
  }
  // documento
  return url
    ? <a className="of-midia-doc" href={url} target="_blank" rel="noreferrer" download={m.filename || "documento"}>📄 {m.filename || "Abrir documento"}</a>
    : <button className="of-midia-btn" onClick={carregar}>{carregando ? "Carregando…" : "📄 " + (m.filename || "Baixar documento")}</button>;
}

/* ============================ RESPOSTAS RÁPIDAS (v2.1) ============================ */
// Na caixa de digitar, "/" abre os textos prontos da equipe. {nome} vira o primeiro nome do contato
// e {vendedor} o primeiro nome de quem está atendendo.
let _cacheRespostas = null;
function carregarRespostas(forcar) {
  if (_cacheRespostas && !forcar) return Promise.resolve(_cacheRespostas);
  return api.ofRespostasRapidas().then((r) => { _cacheRespostas = (r && r.lista) || []; return _cacheRespostas; }).catch(() => []);
}
const primeiroNome = (n) => { const p = String(n || "").trim().split(/\s+/)[0] || ""; return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : ""; };
function preencherResposta(texto, contato, vendedor) {
  return String(texto || "").replace(/\{nome\}/gi, primeiroNome(contato) || "tudo bem").replace(/\{vendedor\}/gi, primeiroNome(vendedor) || "");
}
function useRespostasRapidas({ texto, setTexto, contatoNome, meuNome, taRef, isGer, showToast }) {
  const [lista, setLista] = useState(_cacheRespostas || []);
  const [ativo, setAtivo] = useState(0);
  const [gerenciar, setGerenciar] = useState(false);
  const [fechadoPara, setFechadoPara] = useState(null);
  useEffect(() => { carregarRespostas().then(setLista); }, []);
  const m = /^\/([\w-]*)$/.exec(texto || "");
  const termo = m ? semAcento(m[1]) : null;
  const achadas = termo === null ? [] : lista.filter((r) => !termo || r.atalho.includes(termo) || semAcento(r.texto).includes(termo)).slice(0, 7);
  const aberto = termo !== null && fechadoPara !== texto;
  useEffect(() => { setAtivo(0); }, [termo]);
  function escolher(r) {
    if (!r) return;
    const final = preencherResposta(r.texto, contatoNome, meuNome);
    setTexto(final);
    setTimeout(() => { const ta = taRef && taRef.current; if (ta) { ta.focus(); ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 140) + "px"; ta.setSelectionRange(final.length, final.length); } }, 0);
  }
  // devolve true quando a tecla foi usada pelo menu (aí a caixa de texto não envia a mensagem)
  function teclado(e) {
    if (!aberto) return false;
    if (e.key === "ArrowDown") { e.preventDefault(); setAtivo((a) => Math.min(achadas.length - 1, a + 1)); return true; }
    if (e.key === "ArrowUp") { e.preventDefault(); setAtivo((a) => Math.max(0, a - 1)); return true; }
    if ((e.key === "Enter" || e.key === "Tab") && achadas.length) { e.preventDefault(); escolher(achadas[ativo]); return true; }
    if (e.key === "Escape") { e.preventDefault(); setFechadoPara(texto); return true; }
    return false;
  }
  function abrir() { setFechadoPara(null); setTexto("/"); setTimeout(() => taRef && taRef.current && taRef.current.focus(), 0); }
  const popup = (
    <>
      {aberto && (
        <div className="rr-pop" role="listbox" aria-label="Respostas rápidas">
          <div className="rr-pop-h"><I.raio className="ico" /> Respostas rápidas <span>{termo ? "/" + termo : "digite para filtrar"}</span></div>
          {achadas.length === 0 ? (
            <div className="rr-vazio">{lista.length ? "Nenhuma resposta com esse atalho." : "Nenhuma resposta cadastrada ainda."}</div>
          ) : achadas.map((r, i) => (
            <button type="button" key={r.id} className={"rr-item" + (i === ativo ? " on" : "")} onMouseDown={(e) => { e.preventDefault(); escolher(r); }} onMouseMove={() => setAtivo(i)}>
              <b>/{r.atalho}</b><span>{preencherResposta(r.texto, contatoNome, meuNome)}</span>
            </button>
          ))}
          <div className="rr-pop-f">
            <span><kbd>↑</kbd><kbd>↓</kbd> escolher · <kbd>Enter</kbd> inserir · <kbd>Esc</kbd> fechar</span>
            {isGer && <button type="button" onMouseDown={(e) => { e.preventDefault(); setGerenciar(true); }}>Gerenciar respostas</button>}
          </div>
        </div>
      )}
      {gerenciar && <ModalRespostas onClose={() => setGerenciar(false)} onSalvo={(l) => { setLista(l); setGerenciar(false); }} showToast={showToast} />}
    </>
  );
  return { teclado, popup, abrir };
}
function ModalRespostas({ onClose, onSalvo, showToast }) {
  const [itens, setItens] = useState(null);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => { carregarRespostas(true).then((l) => setItens(l.map((r) => ({ ...r })))); }, []);
  const mudar = (i, campo, v) => setItens((xs) => xs.map((x, j) => (j === i ? { ...x, [campo]: v } : x)));
  async function salvar() {
    setSalvando(true);
    try { const r = await api.ofSalvarRespostasRapidas(itens); _cacheRespostas = r.lista || []; showToast("✓ Respostas rápidas salvas"); onSalvo(_cacheRespostas); }
    catch (e) { showToast("✗ " + e.message); } finally { setSalvando(false); }
  }
  return (
    <Portal>
      <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="onum-modal rr-modal">
          <div className="cols-head">
            <div><b>Respostas rápidas da equipe</b><span>Na conversa, digite <kbd>/</kbd> e o atalho. Use {"{nome}"} para o nome do contato e {"{vendedor}"} para o seu.</span></div>
            <button className="crm-x" onClick={onClose} aria-label="Fechar"><I.x className="ico" /></button>
          </div>
          <div className="rr-modal-corpo">
            {itens === null ? <div className="ficha-carregando"><span className="skel" /><span className="skel" /></div> : (
              <>
                {itens.map((r, i) => (
                  <div className="rr-linha" key={r.id || i}>
                    <div className="rr-atalho"><span>/</span><input value={r.atalho} placeholder="atalho" aria-label="Atalho" onChange={(e) => mudar(i, "atalho", e.target.value.toLowerCase().replace(/\s+/g, "-"))} /></div>
                    <textarea rows={2} value={r.texto} placeholder="Texto da resposta" aria-label="Texto da resposta" onChange={(e) => mudar(i, "texto", e.target.value)} />
                    <button type="button" className="rr-del" onClick={() => setItens((xs) => xs.filter((_, j) => j !== i))} title="Apagar" aria-label="Apagar resposta"><I.trash className="ico" /></button>
                  </div>
                ))}
                <button type="button" className="rr-add" onClick={() => setItens((xs) => [...xs, { id: "rr_" + Date.now().toString(36), atalho: "", texto: "" }])}><I.plus className="ico" /> Nova resposta</button>
              </>
            )}
          </div>
          <div className="rr-modal-pe">
            <button className="btn" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" disabled={salvando || itens === null} onClick={salvar}>{salvando ? "Salvando…" : "Salvar respostas"}</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/* ============================ FICHA DO LEAD (v2.1) ============================ */
// Painel ao lado da conversa — tudo do lead num lugar só, como os "dados do contato" do WhatsApp.
// Abre clicando na foto ou no nome do lead. Observações escritas aqui ficam na conversa (a IA lê).
const FICHA_ICONE_HIST = { ligacao: "fone", etapa: "pipe", atribuido: "user", captacao: "repetir", criado: "plus", lista: "chat" };
function quandoAmigavel(ts) {
  if (!ts) return "";
  const d = new Date(ts), hoje = new Date();
  const amanha = new Date(); amanha.setDate(hoje.getDate() + 1);
  const ontem = new Date(); ontem.setDate(hoje.getDate() - 1);
  const hh = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === hoje.toDateString()) return "hoje, " + hh;
  if (d.toDateString() === amanha.toDateString()) return "amanhã, " + hh;
  if (d.toDateString() === ontem.toDateString()) return "ontem, " + hh;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + ", " + hh;
}
function presetTarefa(tipo) {
  const d = new Date();
  if (tipo === "hoje") { d.setHours(18, 0, 0, 0); if (d.getTime() < Date.now()) d.setTime(Date.now() + 3600000); }
  if (tipo === "amanha") { d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); }
  if (tipo === "2dias") { d.setDate(d.getDate() + 2); d.setHours(9, 0, 0, 0); }
  if (tipo === "semana") { d.setDate(d.getDate() + 7); d.setHours(9, 0, 0, 0); }
  return d.getTime();
}

function FichaLead({ chatId, telefone, nome, isGer, foco, onFechar, onRegistrarVenda, onLigar, onCadastrar, onAbrirPipeline, showToast }) {
  const [carregando, setCarregando] = useState(true);
  const [lead, setLead] = useState(null);
  const [etapas, setEtapas] = useState([]);
  const [semAcesso, setSemAcesso] = useState(false);
  const [vendedores, setVendedores] = useState([]);
  const [obs, setObs] = useState([]);
  const [obsTexto, setObsTexto] = useState("");
  const [salvandoObs, setSalvandoObs] = useState(false);
  const [tarefaTexto, setTarefaTexto] = useState("");
  const [tarefaData, setTarefaData] = useState("");
  const [rascunho, setRascunho] = useState({});
  const obsRef = useRef(null);

  async function carregar() {
    setCarregando(true);
    try {
      const r = await api.ofLeadPorTelefone(telefone);
      setLead(r.lead || null); setEtapas(r.etapas || []); setSemAcesso(!!r.semAcesso);
    } catch (e) { setLead(null); if (e.status === 403) setSemAcesso("crm"); }
    try { const o = await api.ofChatObsList(chatId); setObs(((o && o.notas) || []).filter((n) => n.tipo === "obs")); } catch (_) { setObs([]); }
    setRascunho({});
    setCarregando(false);
  }
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [chatId, telefone]);
  useEffect(() => { if (isGer) api.ofVendedoresLista().then((l) => setVendedores(Array.isArray(l) ? l : [])).catch(() => {}); }, [isGer]);
  useEffect(() => { if (!carregando && foco === "obs" && obsRef.current) obsRef.current.focus(); }, [foco, carregando]);

  async function salvar(campos, aviso) {
    if (!lead) return;
    try { const r = await api.ofCrmEditar(lead.id, campos); if (r && r.lead) setLead(r.lead); if (aviso) showToast("✓ " + aviso); }
    catch (e) { showToast("✗ " + e.message); }
  }
  function campoTexto(k) { return rascunho[k] !== undefined ? rascunho[k] : (lead && lead[k] != null ? String(lead[k]) : ""); }
  function aoSairDoCampo(k) {
    if (rascunho[k] === undefined || !lead) return;
    const novo = rascunho[k];
    if (String(lead[k] == null ? "" : lead[k]) === novo) return;
    salvar({ [k]: k === "valor" ? (Number(String(novo).replace(/\./g, "").replace(",", ".")) || 0) : novo }, "Salvo");
  }
  async function salvarObs() {
    const t = obsTexto.trim();
    if (!t) return;
    setSalvandoObs(true);
    try { const r = await api.ofChatObsAdd(chatId, t); setObs(((r && r.notas) || []).filter((n) => n.tipo === "obs")); setObsTexto(""); showToast("✓ Observação salva"); }
    catch (e) { showToast("✗ " + e.message); } finally { setSalvandoObs(false); }
  }
  function agendar(quando) {
    if (!quando) return;
    salvar({ tarefa: { texto: tarefaTexto.trim() || "Retornar contato", quando, feito: false } }, "Tarefa agendada");
    setTarefaTexto(""); setTarefaData("");
  }

  const etapaAtual = lead ? etapas.find((e) => e.k === lead.etapa) : null;
  const tarefa = lead && lead.tarefa && !lead.tarefa.feito ? lead.tarefa : null;
  const tInfo = tarefa ? infoTarefa(tarefa) : null;
  const linhaTempo = [
    ...obs.map((n) => ({ texto: n.texto, por: n.por, ts: n.ts, origem: "Conversa" })),
    ...((lead && lead.notas) || []).map((n) => ({ texto: n.texto, por: n.por, ts: n.ts, origem: "Pipeline" })),
  ].sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const historico = ((lead && lead.historico) || []).slice().reverse().slice(0, 8);

  return (
    <aside className="ficha" aria-label="Ficha do lead">
      <div className="ficha-topo">
        <button type="button" className="ficha-x" onClick={onFechar} title="Fechar ficha" aria-label="Fechar ficha"><I.x className="ico" /></button>
        <div className="ficha-av">{iniciais((lead && lead.nome) || nome)}</div>
        <div className="ficha-nome">{(lead && lead.nome) || nome || "Contato"}</div>
        <div className="ficha-tel">{(lead && lead.telefone) || telefone}</div>
        <div className="ficha-chips">
          {etapaAtual && <span className="ficha-chip" style={{ "--c": etapaAtual.cor }}><i />{etapaAtual.lb}</span>}
          {lead && lead.recorrente && <span className="ficha-chip info"><I.repetir className="ico-inline" /> Lead atualizado</span>}
          {lead && (lead.tags || []).slice(0, 2).map((t, i) => <span key={i} className="ficha-chip neutro">{t}</span>)}
        </div>
        <div className="ficha-acoes">
          {onLigar && <button type="button" className="ficha-acao" onClick={onLigar}><I.fone className="ico" /><span>Ligar</span></button>}
          {onRegistrarVenda && <button type="button" className="ficha-acao" onClick={onRegistrarVenda}><I.cash className="ico" /><span>Venda</span></button>}
          {lead && onAbrirPipeline && <button type="button" className="ficha-acao" onClick={() => onAbrirPipeline(lead.id)}><I.pipe className="ico" /><span>Pipeline</span></button>}
        </div>
      </div>

      <div className="ficha-corpo">
        {carregando ? (
          <div className="ficha-carregando"><span className="skel" /><span className="skel" /><span className="skel curto" /></div>
        ) : !lead ? (
          <div className="ficha-vazio">
            <I.pipe className="ico" />
            <b>{semAcesso === "crm" ? "Sua conta não tem acesso ao Pipeline" : semAcesso ? "Este lead é de outro vendedor" : "Ainda não está no Pipeline"}</b>
            <span>{semAcesso === "crm" ? "Peça para o gerente liberar o Pipeline para você ver a ficha completa." : semAcesso ? "Você vê a conversa, mas a ficha completa fica com o responsável." : "Cadastre o contato para acompanhar etapa, tarefas e histórico."}</span>
            {!semAcesso && onCadastrar && <button type="button" className="btn btn-primary btn-sm" onClick={onCadastrar}><I.plus className="ico" style={{ width: 14, height: 14 }} /> Cadastrar no Pipeline</button>}
          </div>
        ) : (
          <>
            <section className="ficha-sec">
              <div className="ficha-sec-t">Etapa do funil</div>
              <div className="ficha-etapas">
                {etapas.map((e) => (
                  <button type="button" key={e.k} className={"ficha-etapa" + (lead.etapa === e.k ? " on" : "")} style={{ "--c": e.cor }}
                    onClick={() => lead.etapa !== e.k && salvar({ etapa: e.k }, "Movido para " + e.lb)}>
                    <i />{e.lb}
                  </button>
                ))}
              </div>
            </section>

            <section className="ficha-sec">
              <div className="ficha-sec-t">Próxima tarefa</div>
              {tarefa ? (
                <div className={"ficha-tarefa " + (tInfo ? tInfo.classe : "")}>
                  <span className="ficha-tarefa-ic"><I.clock className="ico" /></span>
                  <div className="ficha-tarefa-txt"><b>{tarefa.texto || "Tarefa"}</b><span>{quandoAmigavel(tarefa.quando)}</span></div>
                  <button type="button" className="ficha-mini ok" title="Concluir" aria-label="Concluir tarefa" onClick={() => salvar({ tarefa: { ...tarefa, feito: true } }, "Tarefa concluída")}><I.check className="ico" /></button>
                  <button type="button" className="ficha-mini" title="Remover" aria-label="Remover tarefa" onClick={() => salvar({ tarefa: null }, "Tarefa removida")}><I.x className="ico" /></button>
                </div>
              ) : (
                <div className="ficha-tarefa-nova">
                  <input className="input" placeholder="O que fazer? Ex.: Retornar com a proposta" value={tarefaTexto} onChange={(e) => setTarefaTexto(e.target.value)} />
                  <div className="ficha-presets">
                    <button type="button" onClick={() => agendar(presetTarefa("hoje"))}>Hoje 18h</button>
                    <button type="button" onClick={() => agendar(presetTarefa("amanha"))}>Amanhã 9h</button>
                    <button type="button" onClick={() => agendar(presetTarefa("2dias"))}>Em 2 dias</button>
                    <button type="button" onClick={() => agendar(presetTarefa("semana"))}>Próx. semana</button>
                  </div>
                  <div className="ficha-data">
                    <input className="input" type="datetime-local" value={tarefaData} onChange={(e) => setTarefaData(e.target.value)} aria-label="Data e hora da tarefa" />
                    <button type="button" className="btn btn-sm" disabled={!tarefaData} onClick={() => agendar(new Date(tarefaData).getTime())}>Agendar</button>
                  </div>
                </div>
              )}
            </section>

            <section className="ficha-sec">
              <div className="ficha-sec-t">Dados do lead</div>
              <div className="ficha-campos">
                <label className="ficha-campo"><span>Responsável</span>
                  {isGer ? (
                    <select className="input" value={lead.vendedorId || ""} onChange={(e) => salvar({ vendedorId: e.target.value }, "Responsável alterado")}>
                      <option value="">Sem dono</option>
                      {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
                      {lead.vendedorId && !vendedores.some((v) => v.id === lead.vendedorId) && <option value={lead.vendedorId}>{lead.vendedorNome || "Atual"}</option>}
                    </select>
                  ) : <b>{lead.vendedorNome || "Sem dono"}</b>}
                </label>
                <label className="ficha-campo"><span>Curso</span>
                  <input className="input" value={campoTexto("curso")} placeholder="Qual curso?" onChange={(e) => setRascunho({ ...rascunho, curso: e.target.value })} onBlur={() => aoSairDoCampo("curso")} />
                </label>
                <div className="ficha-campo-duplo">
                  <label className="ficha-campo"><span>Valor (R$)</span>
                    <input className="input" inputMode="decimal" value={campoTexto("valor") === "0" ? "" : campoTexto("valor")} placeholder="0" onChange={(e) => setRascunho({ ...rascunho, valor: e.target.value })} onBlur={() => aoSairDoCampo("valor")} />
                  </label>
                  <label className="ficha-campo"><span>Pagamento</span>
                    <input className="input" value={campoTexto("formaPagamento")} placeholder="Pix, cartão…" onChange={(e) => setRascunho({ ...rascunho, formaPagamento: e.target.value })} onBlur={() => aoSairDoCampo("formaPagamento")} />
                  </label>
                </div>
                <label className="ficha-campo"><span>E-mail</span>
                  <input className="input" type="email" value={campoTexto("email")} placeholder="email@exemplo.com" onChange={(e) => setRascunho({ ...rascunho, email: e.target.value })} onBlur={() => aoSairDoCampo("email")} />
                </label>
                <div className="ficha-info">
                  <div><span>Origem</span><b>{lead.reservaNome || lead.origem || "—"}</b></div>
                  <div><span>Entrou</span><b>{lead.criadoEm ? quandoAmigavel(lead.criadoEm) : "—"}</b></div>
                </div>
              </div>
            </section>
          </>
        )}

        <section className="ficha-sec">
          <div className="ficha-sec-t">Observações <small>a IA lê e considera na análise</small></div>
          <div className="ficha-obs-nova">
            <textarea ref={obsRef} rows={2} value={obsTexto} placeholder="Registre o que rolou fora do chat: ligou, fechou presencial, pediu pra chamar depois…"
              onChange={(e) => setObsTexto(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); salvarObs(); } }} />
            <button type="button" className="btn btn-primary btn-sm" disabled={salvandoObs || !obsTexto.trim()} onClick={salvarObs}>{salvandoObs ? "Salvando…" : "Salvar"}</button>
          </div>
          {linhaTempo.length === 0 ? (
            <div className="ficha-dica">Nenhuma observação ainda.</div>
          ) : (
            <ul className="ficha-linha">
              {linhaTempo.map((n, i) => (
                <li key={i}>
                  <span className="ficha-ponto" />
                  <div>
                    <div className="ficha-linha-txt">{n.texto}</div>
                    <div className="ficha-linha-meta">{n.por || ""}{n.ts ? " · " + quandoAmigavel(n.ts) : ""} · {n.origem}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {lead && historico.length > 0 && (
          <section className="ficha-sec">
            <div className="ficha-sec-t">Histórico</div>
            <ul className="ficha-hist">
              {historico.map((h, i) => {
                const Ico = I[FICHA_ICONE_HIST[h.tipo]] || I.clock;
                return (
                  <li key={i}>
                    <span className="ficha-hist-ic"><Ico className="ico" /></span>
                    <div><div className="ficha-linha-txt">{h.texto}</div><div className="ficha-linha-meta">{quandoAmigavel(h.ts)}</div></div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </aside>
  );
}

function InboxOficial({ isGer, ehLider, showToast, onIrParaEvolution, target, onTargetUsed, onAbrirLead, meuNome }) {
  const [chats, setChats] = useState([]);
  const [carregou, setCarregou] = useState(false);
  const [regVenda, setRegVenda] = useState(false);
  const [novaConv, setNovaConv] = useState(null); // { telefone } quando iniciando conversa nova
  const [numerosOf, setNumerosOf] = useState([]);
  const [numSel, setNumSel] = useState("");
  const [tpls, setTpls] = useState([]);
  const [tplSel, setTplSel] = useState("");
  const [vars, setVars] = useState([]);
  const [carregandoTpl, setCarregandoTpl] = useState(false);
  const [erroNova, setErroNova] = useState("");
  const [enviandoTpl, setEnviandoTpl] = useState(false);
  const [sel, setSel] = useState(null);
  const [conversa, setConversa] = useState(null);
  const conversaRef = useRef(null);
  useEffect(() => { conversaRef.current = conversa; }, [conversa]);
  const [baixandoConvPdf, setBaixandoConvPdf] = useState(false);
  const [ligando, setLigando] = useState(false);
  const [obsAberta, setObsAberta] = useState(false);
  const [obsTexto, setObsTexto] = useState("");
  const [obsLista, setObsLista] = useState([]);
  const [obsSalvando, setObsSalvando] = useState(false);
  function abrirObs() { setFicha("obs"); } // v2.1: observações ficam na ficha do lead
  async function salvarObs() {
    if (!obsTexto.trim()) return;
    setObsSalvando(true);
    try { const r = await api.ofChatObsAdd(conversa.id, obsTexto.trim()); setObsLista(((r && r.notas) || []).filter((n) => n.tipo === "obs")); setObsTexto(""); showToast("✓ Observação salva"); }
    catch (e) { showToast("✗ " + e.message); } finally { setObsSalvando(false); }
  }
  const [chamada, setChamada] = useState(null); // {nome, numero, inicio} quando o Atende aceitou
  const [cronometro, setCronometro] = useState(0);
  const [ligDetalhe, setLigDetalhe] = useState(null); // ligação aberta no painel de resumo
  const [ligResumoLoading, setLigResumoLoading] = useState(false);
  async function abrirResumoLigacao(lig) {
    setLigDetalhe(lig);
    if (lig && lig.callid && !lig.resumoPronto) {
      setLigResumoLoading(true);
      try {
        const r = await api.ofAtendeResumoLigacao(conversa.id, lig.callid);
        if (r && r.ok) setLigDetalhe({ ...lig, resumo: r.resumo, transcricao: r.transcricao, resumoPronto: true });
        else setLigDetalhe({ ...lig, _erro: (r && r.erro) || "não deu pra gerar o resumo agora" });
      } catch (e) { setLigDetalhe({ ...lig, _erro: e.message }); }
      finally { setLigResumoLoading(false); }
    }
  }
  useEffect(() => {
    if (!chamada) return;
    setCronometro(0);
    const t = setInterval(() => setCronometro((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [chamada]);
  const fmtTempo = (s) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  const [confirmarLig, setConfirmarLig] = useState(false); // popup de confirmação (estilo Vekta)
  const [voipStatus, setVoipStatus] = useState(null); // {disponivel, tela, motivo}
  const [checandoVoip, setChecandoVoip] = useState(false);
  async function abrirConfirmacaoLigar() {
    if (!conversa) return;
    setConfirmarLig(true); setVoipStatus(null); setChecandoVoip(true);
    try { const s = await api.ofAtendeVoipStatus(); setVoipStatus(s); } catch (_) { setVoipStatus({ disponivel: null }); }
    finally { setChecandoVoip(false); }
  }
  async function ligarAtende() {
    if (!conversa || ligando) return;
    setConfirmarLig(false);
    setLigando(true);
    try {
      const r = await api.ofAtendeLigar({ telefone: conversa.numero, nome: conversa.nome, leadId: conversa.leadId || conversa.id, chatId: conversa.id });
      // Atende aceitou a chamada — abre a tela de "chamando" com cronômetro
      setChamada({ nome: conversa.nome || conversa.numero, numero: conversa.numero, mensagem: r.mensagem || "" });
    } catch (e) {
      showToast("✗ " + e.message);
    } finally { setLigando(false); }
  }
  function encerrarChamada() {
    setChamada(null);
    // sem webhook, o Atende leva alguns minutos pra gerar o registro. Tentamos algumas vezes
    // (15s, 40s, 90s) pra a ligação aparecer mais rápido no chat; o robô do servidor cobre o resto.
    [15000, 40000, 90000].forEach((ms) => setTimeout(async () => { try { await api.ofAtendeSincronizarAuto(); } catch (_) {} }, ms));
  }
  async function exportarConversaPDF() {
    if (!conversa) return;
    setBaixandoConvPdf(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const msgs = conversa.mensagens || [];
      const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const fData = (ts) => { try { return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch (_) { return ""; } };
      const fDia = (ts) => { try { return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }); } catch (_) { return ""; } };
      const rotMidia = (t) => t === "image" ? "🖼️ Imagem" : t === "audio" ? "🎧 Áudio" : t === "video" ? "🎬 Vídeo" : t === "document" ? "📎 Documento" : t === "sticker" ? "Figurinha" : "Mídia";
      let corpo = "", diaAtual = "";
      msgs.forEach((m) => {
        const dia = fDia(m.ts);
        if (dia && dia !== diaAtual) { diaAtual = dia; corpo += `<div style="text-align:center;margin:18px 0 10px"><span style="background:#e7ebef;color:#5f6b7a;font-size:11px;font-weight:600;padding:4px 13px;border-radius:20px">${esc(dia)}</span></div>`; }
        const eu = m.role === "me";
        let txt;
        if (m.tipo && m.tipo !== "text" && m.arquivo) txt = `<i style="opacity:.7">${rotMidia(m.tipo)}</i>` + (m.content ? "<br>" + esc(m.content) : "");
        else txt = esc(m.content) || `<i style="opacity:.55">(sem texto)</i>`;
        const tpl = m.template ? `<div style="font-size:10px;font-weight:700;color:${eu ? "#0a6b4a" : "#5f6b7a"};margin-bottom:3px">📤 Template</div>` : "";
        corpo += `<div style="display:flex;justify-content:${eu ? "flex-end" : "flex-start"};margin:5px 0">
          <div style="max-width:74%;background:${eu ? "#d7f5e6" : "#ffffff"};border:1px solid ${eu ? "#b6ead2" : "#e6e8ee"};border-radius:14px;${eu ? "border-top-right-radius:4px" : "border-top-left-radius:4px"};padding:9px 13px;font-size:13px;color:#0b1220;line-height:1.5">
            ${tpl}${txt}<div style="font-size:9.5px;color:#8a94a2;margin-top:5px;text-align:right">${esc(fData(m.ts))}</div>
          </div></div>`;
      });
      if (!msgs.length) corpo = `<div style="text-align:center;color:#8a94a2;padding:34px">Nenhuma mensagem nesta conversa.</div>`;
      const canal = conversa.canal === "instagram" ? "Instagram Direct" : "WhatsApp";
      const html = `<div style="width:720px;padding:28px;font-family:Inter,Arial,sans-serif;background:#fff;color:#0b1220">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0d9f6e;padding-bottom:14px;margin-bottom:16px">
          <div><div style="font-size:22px;font-weight:800;letter-spacing:-.02em">instruct<span style="color:#0d9f6e">iva</span></div>
          <div style="font-size:15px;font-weight:700;margin-top:8px">Conversa de atendimento</div></div>
          <div style="font-size:11px;color:#5f6b7a;text-align:right">Exportado em<br>${esc(new Date().toLocaleString("pt-BR"))}</div></div>
        <div style="background:#f4f6f8;border:1px solid #e6e8ee;border-radius:12px;padding:13px 16px;margin-bottom:16px">
          <div style="font-weight:700;font-size:15px">${esc(conversa.nome || "Contato")}</div>
          <div style="color:#5f6b7a;margin-top:3px;font-size:12.5px">${esc(conversa.numero || "")} · ${canal}${conversa.vendedorNome ? " · Atendente: " + esc(conversa.vendedorNome) : ""} · ${msgs.length} mensagem(ns)</div></div>
        ${corpo}
        <div style="text-align:center;color:#aab2bd;font-size:10px;margin-top:22px;border-top:1px solid #eee;padding-top:10px">Instructiva · Sistema Comercial — documento gerado automaticamente</div></div>`;
      const holder = document.createElement("div");
      holder.style.position = "fixed"; holder.style.left = "-9999px"; holder.style.top = "0";
      holder.innerHTML = html; document.body.appendChild(holder);
      const nomeArq = "conversa-" + String(conversa.nome || "contato").replace(/[^\w]+/g, "_").slice(0, 30) + "-" + new Date().toISOString().slice(0, 10) + ".pdf";
      await html2pdf().set({ margin: [8, 8, 10, 8], filename: nomeArq, image: { type: "jpeg", quality: 0.96 }, html2canvas: { scale: 2, backgroundColor: "#ffffff", logging: false }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }, pagebreak: { mode: ["css", "legacy"] } }).from(holder.firstElementChild).save();
      holder.remove();
      showToast("✅ Conversa exportada em PDF!");
    } catch (e) { showToast("❌ Não consegui gerar o PDF: " + e.message); }
    finally { setBaixandoConvPdf(false); }
  }
  const [etapas, setEtapas] = useState([]);
  const [texto, setTexto] = useState("");
  const [busca, setBusca] = useState("");
  const [vendedores, setVendedores] = useState([]);
  const [filtroVend, setFiltroVend] = useState("todos");
  const [campanhas, setCampanhas] = useState([]);
  const [campanhaFiltro, setCampanhaFiltro] = useState("todas");
  const [showTransfer, setShowTransfer] = useState(false);
  const [pedindoSuporte, setPedindoSuporte] = useState(false);
  const [cadPipeline, setCadPipeline] = useState(false);
  const [ficha, setFicha] = useState(null); // v2.1: ficha do lead aberta ao lado da conversa ("info" | "obs")
  const [showEmojiOf, setShowEmojiOf] = useState(false);
  const [gravandoOf, setGravandoOf] = useState(false);
  const [pausadoOf, setPausadoOf] = useState(false);
  const cancelarOfRef = useRef(false);
  const [enviandoMidiaOf, setEnviandoMidiaOf] = useState(false);
  const fileRefOf = useRef(null);
  const mediaRecOf = useRef(null);
  const chunksOf = useRef([]);
  const fimRef = useRef(null);
  const msgsBoxRef = useRef(null);   // container rolável das mensagens
  const taOfRef = useRef(null);      // campo de digitação (textarea multi-linha)
  const rapidasOf = useRespostasRapidas({ texto, setTexto, contatoNome: conversa && conversa.nome, meuNome, taRef: taOfRef, isGer, showToast });
  useEffect(() => { const el = taOfRef.current; if (el && !texto) el.style.height = "auto"; }, [texto]);
  const [, forcarTick] = useState(0); // faz a contagem de 24h atualizar sozinha
  useEffect(() => { const t = setInterval(() => forcarTick((x) => x + 1), 30000); return () => clearInterval(t); }, []);
  const [iasDisp, setIasDisp] = useState([]);
  useEffect(() => { if (isGer) api.ofIAs().then((l) => setIasDisp((l || []).filter((x) => x.ativa))).catch(() => {}); }, [isGer]);
  async function ativarIANaConversa(iaId) {
    if (!sel || !iaId) return;
    try {
      const r = await api.ofAtribuirIAChat(sel, iaId);
      api.ofChat(sel).then(setConversa);
      showToast(r.temIA ? `IA "${r.iaNome}" ativada nesta conversa` : "IA desligada");
    } catch (e) { showToast(e.message); }
  }
  const nearBottomRef = useRef(true); // usuário está perto do fim?
  const convIdRef = useRef(null);     // qual conversa está aberta
  const msgCountRef = useRef(0);      // qtd de mensagens da última vez
  const carregarLista = () => api.ofChats(busca, null, campanhaFiltro === "todas" ? null : campanhaFiltro).then((cs) => { setChats(cs); setCarregou(true); }).catch(() => {});
  const versaoRef = useRef("");
  useEffect(() => {
    carregarLista();
    versaoRef.current = ""; // ao trocar busca/campanha, força a próxima checagem a baixar
    // a cada 6s pergunta só o "carimbo" (barato). Se mudou, aí sim baixa a lista pesada.
    const t = setInterval(async () => {
      if (document.hidden) return; // v2.0: aba escondida não fica consultando o servidor
      try {
        // durante uma busca, mantém o comportamento simples (recarrega direto)
        if (busca && busca.trim()) { carregarLista(); return; }
        const r = await api.ofChatsVersao();
        if (r && r.v !== versaoRef.current) { versaoRef.current = r.v; carregarLista(); }
      } catch (_) {}
    }, 6000);
    // todos (gerente e vendedor) podem ver a lista pra transferir
    api.ofVendedoresLista().then(setVendedores).catch(() => {});
    // campanhas pro filtro (o gerente vê todas; o vendedor, as dele)
    api.ofCampanhas().then((cs) => setCampanhas(cs || [])).catch(() => {});
    return () => clearInterval(t);
  }, [busca, campanhaFiltro]);

  // Alvo vindo do Pipeline (canal oficial): abre a conversa existente ou inicia uma nova
  const alvoOfRef = useRef(null);
  useEffect(() => {
    if (!target || !target.numero || !carregou) return;
    if (alvoOfRef.current === target.numero) return;
    alvoOfRef.current = target.numero;
    const num = soDigitos(target.numero);
    const achado = chats.find((c) => numIgual(c.numero, target.numero));
    if (achado) { setSel(achado.id); setNovaConv(null); }
    else { setSel(null); setNovaConv({ telefone: num, nome: target.nome || "" }); }
    onTargetUsed && onTargetUsed();
    // eslint-disable-next-line
  }, [target, carregou, chats]);

  // Ao iniciar uma conversa nova: carrega os números que ESTE usuário pode usar
  useEffect(() => {
    if (!novaConv) { setTpls([]); setTplSel(""); setErroNova(""); return; }
    setErroNova("");
    api.ofMeusNumeros().then((r) => {
      const ns = r.numeros || [];
      setNumerosOf(ns);
      setNumSel(ns.length ? ns[0].id : "");
      if (!ns.length) setErroNova("Você não tem nenhum número oficial liberado. Peça pro gerente vincular um número a você em Números.");
    }).catch((e) => setErroNova(e.message));
  }, [novaConv]);
  // Ao escolher o número: carrega os templates aprovados dele
  useEffect(() => {
    if (!novaConv || !numSel) { setTpls([]); return; }
    setCarregandoTpl(true);
    api.ofTemplates(numSel).then((r) => {
      const ts = r.templates || [];
      setTpls(ts);
      setTplSel(ts.length ? ts[0].name : "");
      if (!ts.length) setErroNova("Esse número não tem template aprovado. Crie um em Disparo › Templates.");
    }).catch((e) => { setTpls([]); setErroNova(e.message); }).finally(() => setCarregandoTpl(false));
  }, [numSel, novaConv]);
  // template escolhido (objeto completo: tem idioma, nº de variáveis e o texto)
  const tplObj = tpls.find((t) => t.name === tplSel) || null;
  // quando troca de template, prepara os campos das variáveis (1ª já vem com o nome do lead)
  useEffect(() => {
    if (!tplObj) { setVars([]); return; }
    const n = tplObj.vars || 0;
    setVars(Array.from({ length: n }, (_, i) => (i === 0 ? (novaConv && novaConv.nome) || "" : "")));
    // eslint-disable-next-line
  }, [tplSel, tpls]);

  async function enviarNovaConv() {
    if (!novaConv || !numSel || !tplObj) { showToast("Escolha o número e o template"); return; }
    if ((tplObj.vars || 0) > 0 && vars.some((v) => !String(v || "").trim())) {
      showToast("Preencha as informações do template"); return;
    }
    setEnviandoTpl(true);
    try {
      const r = await api.ofEnviarTemplate({
        numeroId: numSel,
        telefone: novaConv.telefone,
        nome: novaConv.nome || "",
        template: tplObj.name,
        idioma: tplObj.language || "pt_BR", // idioma REAL do template (não chutar pt_BR)
        variaveis: vars,
      });
      showToast("✓ Conversa iniciada");
      setNovaConv(null);
      await carregarLista();
      if (r.chatId) setSel(r.chatId);
    } catch (e) { showToast("✗ " + e.message); } finally { setEnviandoTpl(false); }
  }

  useEffect(() => {
    if (!sel) { setConversa(null); return; }
    const carregar = () => api.ofChat(sel).then(setConversa).catch(() => {});
    carregar();
    const t = setInterval(() => { if (!document.hidden) carregar(); }, 6000); // v2.0: pausa com a aba escondida
    return () => clearInterval(t);
  }, [sel]);

  useEffect(() => { api.ofEtapas().then((d) => setEtapas(d.etapas || [])).catch(() => {}); }, []);
  async function mudarEtapa(k) {
    if (!sel) return;
    try {
      await api.ofSetEtapaChat(sel, k);
      setConversa((c) => (c && c.id === sel ? { ...c, etapaLead: k } : c));
      showToast("Etapa atualizada");
    } catch (e) { showToast("✗ " + e.message); }
  }

  // rola pro fim SÓ quando: abre a conversa, OU chega msg nova e a pessoa já estava no fim.
  // se a pessoa rolou pra cima pra ler, NÃO puxa mais pra baixo.
  useEffect(() => {
    if (!conversa) { convIdRef.current = null; msgCountRef.current = 0; return; }
    const count = (conversa.mensagens || []).length + (conversa.notas || []).length;
    const abriuOutra = convIdRef.current !== conversa.id;
    const chegouNova = count > msgCountRef.current;
    convIdRef.current = conversa.id;
    msgCountRef.current = count;
    if (abriuOutra) {
      // abriu outra conversa -> vai direto pro fim, sem animação
      nearBottomRef.current = true;
      if (fimRef.current) fimRef.current.scrollIntoView();
    } else if (chegouNova && nearBottomRef.current) {
      // msg nova e a pessoa estava no fim -> acompanha suave
      if (fimRef.current) fimRef.current.scrollIntoView({ behavior: "smooth" });
    }
    // senão (poll sem novidade, ou a pessoa rolou pra cima): não mexe no scroll
  }, [conversa]);

  // acompanha se o usuário está perto do fim (pra decidir se pode auto-rolar)
  function onScrollMsgs() {
    const el = msgsBoxRef.current;
    if (!el) return;
    nearBottomRef.current = (el.scrollHeight - el.scrollTop - el.clientHeight) < 120;
  }

  async function enviar() {
    if (!texto.trim() || !sel) return;
    const t = texto;
    setTexto("");
    // mostra a mensagem NA HORA (não espera o servidor/refresh)
    const idAtual = sel;
    setConversa((c) => (c && c.id === idAtual)
      ? { ...c, mensagens: [...(c.mensagens || []), { role: "me", content: t, ts: Date.now(), _pendente: true }] }
      : c);
    try {
      await api.ofEnviar(sel, t);
      // reconcilia com o servidor (troca a otimista pela real)
      api.ofChat(sel).then(setConversa).catch(() => {});
      carregarLista();
    } catch (e) {
      showToast(e.message);
      setTexto(t);
      // desfaz a mensagem otimista se o envio falhou
      setConversa((c) => (c && c.id === idAtual)
        ? { ...c, mensagens: (c.mensagens || []).filter((m) => !(m._pendente && m.content === t)) }
        : c);
    }
  }
  // enviar um arquivo (imagem/vídeo/doc) escolhido
  async function onArquivoOf(file) {
    if (!file || !sel) return;
    if (file.size > 16 * 1024 * 1024) { showToast("✗ Arquivo passa de 16MB"); return; }
    setEnviandoMidiaOf(true);
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      await api.ofEnviarMidia(sel, { base64, mime: file.type || "application/octet-stream", filename: file.name || "arquivo" });
      api.ofChat(sel).then(setConversa).catch(() => {});
    } catch (e) { showToast(e.message || "Não consegui enviar o arquivo"); }
    setEnviandoMidiaOf(false);
  }
  // gravar e enviar áudio
  async function toggleGravarOf() {
    if (gravandoOf) {
      try { mediaRecOf.current && mediaRecOf.current.stop(); } catch (_) {}
      return;
    }
    if (!navigator.mediaDevices || !window.MediaRecorder) { showToast("✗ Seu navegador não permite gravar áudio aqui"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const fmt = formatoGravacao();
      const mr = new MediaRecorder(stream, fmt ? { mimeType: fmt } : undefined);
      chunksOf.current = [];
      cancelarOfRef.current = false;
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksOf.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setGravandoOf(false);
        setPausadoOf(false);
        // cancelado: descarta o áudio, não envia
        if (cancelarOfRef.current) { cancelarOfRef.current = false; chunksOf.current = []; return; }
        const tipoReal = (mr.mimeType || "audio/webm").split(";")[0];
        const blob = new Blob(chunksOf.current, { type: tipoReal });
        if (blob.size < 800) return; // muito curto, ignora
        setEnviandoMidiaOf(true);
        try {
          const base64 = await new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(String(r.result).split(",")[1]);
            r.onerror = rej;
            r.readAsDataURL(blob);
          });
          await api.ofEnviarMidia(sel, { base64, mime: tipoReal, filename: "audio." + extDeAudio(tipoReal) });
          api.ofChat(sel).then(setConversa).catch(() => {});
        } catch (e) { showToast(e.message || "Não consegui enviar o áudio"); }
        setEnviandoMidiaOf(false);
      };
      mediaRecOf.current = mr;
      mr.start();
      setGravandoOf(true);
      setPausadoOf(false);
    } catch (e) { showToast("✗ Não consegui acessar o microfone"); }
  }
  // pausar / retomar a gravação
  function pausarGravarOf() {
    const mr = mediaRecOf.current; if (!mr) return;
    try {
      if (mr.state === "recording") { mr.pause(); setPausadoOf(true); }
      else if (mr.state === "paused") { mr.resume(); setPausadoOf(false); }
    } catch (_) {}
  }
  // cancelar: para e descarta (não envia)
  function cancelarGravarOf() {
    cancelarOfRef.current = true;
    try { mediaRecOf.current && mediaRecOf.current.stop(); } catch (_) {}
    setGravandoOf(false); setPausadoOf(false);
  }
  async function transferir(vendedorId) {
    if (!sel || !vendedorId) return;
    try {
      await api.ofAtribuir(sel, vendedorId);
      api.ofChat(sel).then(setConversa);
      carregarLista();
      setShowTransfer(false);
      showToast("Conversa transferida");
    } catch (e) { showToast(e.message); }
  }

  async function alternarIAConversa() {
    if (!sel || !conversa) return;
    const pausar = !conversa.iaPausada;
    try {
      await api.ofPausarIAChat(sel, pausar);
      api.ofChat(sel).then(setConversa);
      showToast(pausar ? "IA pausada — você assumiu o atendimento" : "IA retomada");
    } catch (e) { showToast(e.message); }
  }

  async function chamarPeloMeu() {
    if (!conversa) return;
    if (!confirm(`Abrir uma conversa NOVA com ${conversa.nome} pelo seu WhatsApp?\n\nIsso inicia um atendimento do zero no seu número (não continua o oficial).`)) return;
    try {
      await api.waIniciar({ numero: conversa.numero, texto: "Olá! Tudo bem?" });
      showToast("Conversa aberta no seu WhatsApp!");
      if (onIrParaEvolution) onIrParaEvolution();
    } catch (e) {
      showToast(e.message || "Não foi possível abrir. Verifique se seu WhatsApp está conectado.");
    }
  }

  async function encerrar() {
    if (!sel) return;
    if (!confirm("Encerrar este atendimento? Ele sai da sua lista de conversas ativas.")) return;
    try {
      await api.ofEncerrar(sel);
      showToast("Atendimento encerrado");
      setSel(null);
      carregarLista();
    } catch (e) { showToast(e.message); }
  }

  async function limpar() {
    const op = prompt(
      "Limpar conversas oficiais. Digite uma opção:\n\n" +
      "1 = remover disparos sem resposta\n" +
      "2 = remover conversas sem dono\n" +
      "3 = remover TODAS as conversas oficiais\n\n" +
      "(deixe vazio para cancelar)"
    );
    const mapa = { "1": "sem_resposta", "2": "sem_dono", "3": "todas" };
    const modo = mapa[(op || "").trim()];
    if (!modo) return;
    if (modo === "todas" && !confirm("Tem certeza? Isso apaga TODAS as conversas oficiais.")) return;
    try {
      const r = await api.ofLimparChats(modo);
      showToast(`${r.removidas} conversa(s) removida(s)`);
      setSel(null);
      carregarLista();
    } catch (e) { showToast(e.message); }
  }

  // monta uma timeline juntando mensagens + notas, ordenada por tempo
  const timeline = [];
  if (conversa) {
    (conversa.mensagens || []).forEach((m, i) => timeline.push({ tipo: "msg", ts: m.ts, ordem: i, m }));
    (conversa.notas || []).forEach((n, i) => timeline.push({ tipo: "nota", ts: n.ts, ordem: 100000 + i, n }));
    // mesmo segundo? mantém a ordem em que chegou (o horário da Meta só tem segundos)
    timeline.sort((a, b) => ((a.ts || 0) - (b.ts || 0)) || (a.ordem - b.ordem));
  }

  return (
    <div className={"of-inbox" + (sel || novaConv ? " tem-conversa" : "") + (ficha && conversa && !novaConv ? " com-ficha" : "")}>
      <div className="of-inbox-list">
        <div className="of-inbox-search">
          <I.search className="ico" />
          <input placeholder="Buscar por nome ou número" value={busca} onChange={(e) => setBusca(e.target.value)} />
          {isGer && <button className="of-limpar-btn" title="Limpar conversas" onClick={limpar}><I.trash className="ico" /></button>}
        </div>
        {(isGer || ehLider) && vendedores.length > 0 && (
          <div style={{ padding: "0 12px 10px" }}>
            <select className="select" style={{ width: "100%" }} value={filtroVend} onChange={(e) => setFiltroVend(e.target.value)}>
              <option value="todos">{ehLider && !isGer ? "Minha equipe (todos)" : "Todos os vendedores"}</option>
              {isGer && <option value="ia">🤖 Em atendimento por IA</option>}
              {isGer && <option value="sem">Aguardando distribuição</option>}
              {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}{v.ehGerente ? " (gerente)" : ""}</option>)}
            </select>
          </div>
        )}
        {campanhas.length > 0 && (
          <div style={{ padding: "0 12px 10px" }}>
            <select className="select" style={{ width: "100%" }} value={campanhaFiltro} onChange={(e) => setCampanhaFiltro(e.target.value)} title="Ver só as conversas de um disparo específico">
              <option value="todas">Todas as campanhas</option>
              {campanhas.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}{c.criadoPorNome ? " · " + c.criadoPorNome : ""}</option>
              ))}
            </select>
          </div>
        )}
        <div className="of-inbox-items">
        {(() => {
          const lista = chats.filter((c) => {
            if (filtroVend === "todos") return true;
            if (filtroVend === "ia") return c.comIA;
            if (filtroVend === "sem") return !c.vendedorId && !c.comIA;
            return c.vendedorId === filtroVend;
          });
          return lista.length === 0 ? (
            <div className="of-inbox-empty">
              <I.chat className="ico-empty" />
              <p>Nenhuma conversa {filtroVend !== "todos" ? "nesse filtro" : "ainda"}.</p>
              {filtroVend === "todos" && <p className="panel-sub">Quando um lead responder ao disparo, ele aparece aqui.</p>}
            </div>
          ) : lista.map((c) => (
          <button key={c.id} className={sel === c.id ? "of-chat-item on" : "of-chat-item"} onClick={() => setSel(c.id)}>
            <div className="of-chat-av">{iniciais(c.nome)}</div>
            <div className="of-chat-mid">
              <div className="of-chat-nm">
                {c.nome}
                {c.canal === "instagram" && <span className="of-pill" style={{ background: "linear-gradient(45deg,#F58529,#DD2A7B,#8134AF)", color: "#fff", borderColor: "transparent" }}>📸 Instagram</span>}
                {c.comIA && <span className="of-pill" style={{ background: "var(--surface-2)", color: "var(--brand)", borderColor: "var(--line)" }}>🤖 IA atendendo</span>}
                {c.iaPassou && <span className="of-pill" style={{ background: "#eafaf0", color: "#1a9d54", borderColor: "#aee3c4" }}>✓ IA passou</span>}
                {c.origemDisparo && <span className="of-pill">{c.campanha || "Disparo"}</span>}
              </div>
              <div className="of-chat-last">{c.ultima ? (c.ultima.role === "me" ? "Você: " : "") + c.ultima.content : "—"}</div>
              {isGer && c.vendedorNome && <div className="of-chat-vend">→ {c.vendedorNome}</div>}
              {isGer && !c.vendedorId && <div className="of-chat-vend sem">→ {c.canal === "instagram" ? "sem responsável" : "aguardando distribuição"}</div>}
            </div>
            <div className="of-chat-right">
              <span className="of-chat-hora">{c.atualizadoEm ? horaCurta(c.atualizadoEm) : ""}</span>
              {c.naoLidas > 0 && <span className="of-chat-badge">{c.naoLidas}</span>}
              {(() => {
                const jan = janela24h(c.ultimaEntrada);
                if (!jan) return null;
                if (!jan.aberta) return <span className="of-jan-mini fechada" title="Janela de 24h fechada — só template"><I.lock className="ico-inline" /></span>;
                if (jan.urgente) return <span className="of-jan-mini urg" title={"Janela fecha em " + jan.texto}><I.clock className="ico-inline" /> {jan.texto}</span>;
                return null;
              })()}
            </div>
          </button>
          ));
        })()}
        </div>
      </div>

      <div className="of-inbox-conv">
        {novaConv ? (
          <div className="of-nova">
            <div className="of-nova-head">
              <b>Nova conversa · oficial</b>
              <button className="crm-x" onClick={() => setNovaConv(null)}>✕</button>
            </div>
            <div className="of-nova-body">
              <div className="of-nova-num">Para: <b>{novaConv.telefone}</b></div>
              <p className="of-nova-info">No WhatsApp oficial, a <b>primeira</b> mensagem precisa ser um <b>template aprovado</b>. Escolha um e envie — a conversa abre em seguida e aí você fala livre.</p>
              {numerosOf.length > 1 && (
                <div style={{ marginBottom: 10 }}><label className="lbl-mini">Enviar pelo número</label>
                  <select className="input" value={numSel} onChange={(e) => setNumSel(e.target.value)}>
                    {numerosOf.map((n) => <option key={n.id} value={n.id}>{n.apelido || n.numero || n.id}</option>)}
                  </select>
                </div>
              )}
              <label className="lbl-mini">Template</label>
              {carregandoTpl ? (
                <div className="of-nova-semtpl">Carregando templates…</div>
              ) : tpls.length === 0 ? (
                <div className="of-nova-semtpl">{erroNova || "Nenhum template aprovado nesse número."}</div>
              ) : (
                <select className="input" value={tplSel} onChange={(e) => setTplSel(e.target.value)}>
                  {tpls.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
              )}

              {tplObj && tplObj.texto && (
                <div className="of-nova-preview">
                  {tplObj.texto.split(/(\{\{\d+\}\})/).map((p, i) => {
                    const m = p.match(/^\{\{(\d+)\}\}$/);
                    if (!m) return <span key={i}>{p}</span>;
                    const val = vars[Number(m[1]) - 1];
                    return <b key={i} className="of-nova-var">{val && val.trim() ? val : p}</b>;
                  })}
                </div>
              )}

              {tplObj && (tplObj.vars || 0) > 0 && (
                <div className="of-nova-vars">
                  <label className="lbl-mini">Preencha o que vai no lugar dos espaços</label>
                  {vars.map((v, i) => (
                    <input key={i} className="input" style={{ marginTop: 6 }} placeholder={`Informação ${i + 1} (aparece no lugar de {{${i + 1}}})`}
                      value={v} onChange={(e) => setVars((xs) => xs.map((x, j) => (j === i ? e.target.value : x)))} />
                  ))}
                </div>
              )}

              {erroNova && tpls.length > 0 && <div className="of-nova-erro">{erroNova}</div>}
            </div>
            <div className="of-nova-pe">
              <button className="btn" onClick={() => setNovaConv(null)}>Cancelar</button>
              <button className="btn btn-primary" disabled={enviandoTpl || !tplSel} onClick={enviarNovaConv}>{enviandoTpl ? "Enviando…" : "Enviar template e abrir conversa"}</button>
            </div>
          </div>
        ) : !conversa ? (
          <div className="of-inbox-empty big">
            <I.chat className="ico-empty" />
            <p>Selecione uma conversa</p>
          </div>
        ) : (
          <>
            <div className="of-conv-head">
              <button className="of-conv-voltar" onClick={() => { setSel(null); setNovaConv(null); }} title="Voltar para a lista" aria-label="Voltar">‹</button>
              <button type="button" className="conv-quem" onClick={() => setFicha(ficha ? null : "info")} title="Ver ficha do lead">
              <div className="of-chat-av">{iniciais(conversa.nome)}</div>
              <div className="of-conv-info">
                <b>{conversa.nome}</b>
                <span>
                  {conversa.canal === "instagram"
                    ? ("📸 Instagram" + (conversa.igUsuario ? " · @" + conversa.igUsuario : "") + (conversa.vendedorNome ? " · com " + conversa.vendedorNome : ""))
                    : (conversa.numero + (conversa.vendedorNome ? " · com " + conversa.vendedorNome : ""))}
                </span>
              </div>
              </button>
              {conversa.canal === "instagram" && <span className="of-pill" style={{ background: "linear-gradient(45deg,#F58529,#DD2A7B,#8134AF)", color: "#fff", borderColor: "transparent" }}>📸 Instagram</span>}
              {conversa.origemDisparo && conversa.campanha && <span className="of-pill">{conversa.campanha}</span>}
              {(() => {
                const ms = conversa.mensagens || [];
                let ue = 0; for (let i = ms.length - 1; i >= 0; i--) { if (ms[i].role === "them") { ue = ms[i].ts || 0; break; } }
                const jan = janela24h(ue);
                const ig = conversa.canal === "instagram";
                if (!jan) return <span className="of-janela fechada" title={ig ? "O cliente ainda não te mandou DM. No Instagram você só responde depois que ele te escreve." : "O lead ainda não te respondeu. No WhatsApp oficial, até ele responder, só template aprovado é entregue."}><I.lock className="ico-inline" /> {ig ? "Aguardando o 1º DM" : "Ainda não respondeu · só template"}</span>;
                return jan.aberta
                  ? <span className={"of-janela" + (jan.urgente ? " urg" : "")} title={ig ? "Tempo restante da janela de 24h do Instagram. Ela renova toda vez que o cliente te manda um DM." : "Tempo restante da janela de 24h do WhatsApp. Ela renova toda vez que o lead te responde. Dentro dela você manda mensagem livre; fora, só template."}><I.clock className="ico-inline" /> {jan.texto} de janela</span>
                  : <span className="of-janela fechada" title={ig ? "Passou 24h desde o último DM do cliente. No Instagram só dá pra responder dentro dessa janela." : "Passou 24h desde a última mensagem do lead. Agora só template aprovado é entregue — a mensagem livre não chega."}><I.lock className="ico-inline" /> {ig ? "Janela de 24h fechada" : "Janela fechada · só template"}</span>;
              })()}
              <div className="of-conv-acoes">
                {etapas.length > 0 && conversa && (
                  <select
                    value={conversa.etapaLead || ""}
                    onChange={(e) => mudarEtapa(e.target.value)}
                    title="Mover este lead no funil (Pipeline)"
                    style={{ height: 34, padding: "0 10px", borderRadius: 9, border: "1px solid var(--line)", fontSize: 13, fontWeight: 600, color: "var(--text)", background: "var(--card)", cursor: "pointer", maxWidth: 175 }}
                  >
                    <option value="">Etapa do funil…</option>
                    {etapas.map((e) => <option key={e.k} value={e.k}>{e.lb}</option>)}
                  </select>
                )}
                {isGer && conversa.temIA && (
                  <button
                    className="of-acao-btn"
                    title={conversa.iaPausada ? "A IA está pausada nesta conversa. Clique para devolver o atendimento pra ela." : "A IA está atendendo. Clique para pausar e assumir manualmente."}
                    style={conversa.iaPausada ? { color: "#1a9d54", borderColor: "#aee3c4" } : { color: "#b07a00", borderColor: "#f0d68a" }}
                    onClick={() => alternarIAConversa()}
                  >
                    <I.spark className="ico" /> {conversa.iaPausada ? "Retomar IA" : "Pausar IA"}
                  </button>
                )}
                <button className="of-acao-btn" title="Transferir para outro vendedor" onClick={() => setShowTransfer((v) => !v)}>
                  <I.users className="ico" /> Transferir
                </button>
                <button className="of-acao-btn sup" title="Pedir ajuda ao suporte" onClick={() => setPedindoSuporte(true)}>
                  <I.suporte className="ico" /> Suporte
                </button>
                {isGer && (
                  <button className="of-acao-btn" title="Cadastrar este lead no Pipeline" onClick={() => setCadPipeline(true)}>
                    <I.pipe className="ico" /> Pipeline
                  </button>
                )}
                <button className="of-acao-btn" title="Ligar para este lead pelo Atende Simples" disabled={ligando} onClick={abrirConfirmacaoLigar}>
                  {ligando ? <span className="spin" /> : <I.fone className="ico" />} Ligar
                </button>
                {confirmarLig && (
                  <Portal>
                    <div className="modal" onClick={(e) => e.target === e.currentTarget && setConfirmarLig(false)}>
                      <div className="onum-modal" style={{ maxWidth: 460, padding: 24 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                          <b style={{ fontSize: 18 }}>Realizar ligação</b>
                          <button className="crm-x" onClick={() => setConfirmarLig(false)}>✕</button>
                        </div>
                        <p style={{ fontSize: 13.5, color: "var(--txt)", lineHeight: 1.55, margin: "0 0 14px" }}>
                          Antes de ligar, confirme que você está logado no <a href="https://voip.atendesimples.com" target="_blank" rel="noreferrer" style={{ color: "var(--brand)", fontWeight: 600 }}>voip.atendesimples.com ↗</a> e disponível.
                        </p>
                        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 6 }}>
                          {voipStatus && voipStatus.disponivel === true
                            ? <span style={{ color: "#059669", fontWeight: 600 }}>✓ Seu VoIP está disponível.</span>
                            : <>💡 Confira se você está logado e disponível no VoIP.</>}
                        </p>
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                          <button className="btn" onClick={() => setConfirmarLig(false)}>Cancelar</button>
                          <button className="btn btn-primary" disabled={ligando} onClick={ligarAtende}>{ligando ? "Ligando…" : "📞 Realizar ligação"}</button>
                        </div>
                      </div>
                    </div>
                  </Portal>
                )}
                {chamada && (
                  <Portal>
                    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, width: 300, background: "var(--card, #fff)", borderRadius: 16, boxShadow: "0 12px 40px rgba(0,0,0,0.25)", border: "1px solid var(--line)", overflow: "hidden", animation: "slideUp 0.25s ease" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#25A06B", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, animation: "callPulse 1.4s ease-in-out infinite" }}>
                          <span style={{ fontSize: 20 }}>📞</span>
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 11, color: "#25A06B", fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>Em ligação</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--txt)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{chamada.nome}</div>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "var(--txt)", flexShrink: 0 }}>{fmtTempo(cronometro)}</div>
                      </div>
                      <button onClick={() => encerrarChamada()} style={{ width: "100%", border: "none", borderTop: "1px solid var(--line)", background: "transparent", color: "var(--muted)", fontWeight: 600, fontSize: 13, padding: "10px", cursor: "pointer" }}>
                        Fechar (a ligação continua no seu ramal)
                      </button>
                    </div>
                  </Portal>
                )}
                {ligDetalhe && (
                  <Portal>
                    <div className="modal" onClick={(e) => e.target === e.currentTarget && setLigDetalhe(null)}>
                      <div className="onum-modal" style={{ maxWidth: 440, maxHeight: "85vh", overflowY: "auto", padding: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
                          <b style={{ fontSize: 15 }}>Informações da ligação</b>
                          <button className="crm-x" onClick={() => setLigDetalhe(null)}>✕</button>
                        </div>
                        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                          {ligDetalhe.vendedorNome && (
                            <div style={{ background: "#eff6ff", borderRadius: 12, padding: "12px 14px" }}>
                              <div style={{ fontSize: 11.5, color: "#2563eb", fontWeight: 600 }}>Realizada por</div>
                              <div style={{ fontSize: 15, fontWeight: 700, color: "#1e3a8a" }}>{ligDetalhe.vendedorNome}</div>
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 12 }}>
                            <div style={{ flex: 1, background: "var(--surface-2)", borderRadius: 12, padding: "12px 14px" }}>
                              <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>Direção</div>
                              <div style={{ fontSize: 14, fontWeight: 700 }}>{ligDetalhe.direcao === "entrante" ? "Recebida" : "Realizada"}</div>
                            </div>
                            <div style={{ flex: 1, background: "var(--surface-2)", borderRadius: 12, padding: "12px 14px" }}>
                              <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>Duração</div>
                              <div style={{ fontSize: 14, fontWeight: 700 }}>{ligDetalhe.duracao ? fmtTempo(ligDetalhe.duracao) : "—"}</div>
                            </div>
                          </div>
                          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>📝 Resumo da chamada</div>
                            {ligResumoLoading ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 13 }}><span className="spin" /> Transcrevendo e resumindo a gravação…</div>
                            ) : ligDetalhe.resumo ? (
                              <div style={{ fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap", color: "var(--txt)" }}>{ligDetalhe.resumo}</div>
                            ) : ligDetalhe._erro ? (
                              <div style={{ fontSize: 13, color: "var(--muted)", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 12px" }}>
                                {ligDetalhe._erro}. A gravação do Atende pode levar alguns minutos pra ficar pronta — feche e abra de novo mais tarde.
                              </div>
                            ) : (
                              <div style={{ fontSize: 13, color: "var(--muted)" }}>Sem gravação disponível pra esta ligação.</div>
                            )}
                            {ligDetalhe.transcricao && (
                              <details style={{ marginTop: 12 }}>
                                <summary style={{ cursor: "pointer", fontSize: 12.5, color: "var(--brand)" }}>Ver transcrição completa</summary>
                                <div style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.6, whiteSpace: "pre-wrap", color: "var(--muted)" }}>{ligDetalhe.transcricao}</div>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Portal>
                )}
                <button className="of-acao-btn venda" title="Registrar uma venda deste cliente" onClick={() => setRegVenda(true)}>
                  <I.gauge className="ico" /> Registrar venda
                </button>
                <button className="of-acao-btn" title="Exportar esta conversa em PDF" disabled={baixandoConvPdf} onClick={exportarConversaPDF}>
                  {baixandoConvPdf ? <span className="spin" /> : <I.download className="ico" />} Exportar PDF
                </button>
                <button className="of-acao-btn" title="Adicionar observação (a IA lê e considera na análise)" onClick={abrirObs}>
                  <I.nota className="ico" /> Observação
                </button>
                <button className="of-acao-btn fim" title="Encerrar atendimento" onClick={() => encerrar()}>
                  <I.check className="ico" /> Encerrar
                </button>
              </div>
              {obsAberta && (
                <Portal>
                  <div className="modal" onClick={(e) => e.target === e.currentTarget && setObsAberta(false)}>
                    <div className="onum-modal" style={{ maxWidth: 480, padding: 22 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <b style={{ fontSize: 16 }}>📝 Observações do lead</b>
                        <button className="crm-x" onClick={() => setObsAberta(false)}>✕</button>
                      </div>
                      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 12px", lineHeight: 1.5 }}>
                        Registre o que rolou por fora do chat (ligou e resolveu, fechou presencial, cliente pediu pra chamar depois...). <b>A IA lê essas observações</b> e considera na análise — assim não trata como lead abandonado.
                      </p>
                      <textarea value={obsTexto} onChange={(e) => setObsTexto(e.target.value)} placeholder="Ex: Liguei pro cliente e ele fechou por telefone. / Resolvido presencialmente." rows={3} style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13.5, resize: "vertical", fontFamily: "inherit" }} />
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                        <button className="btn" onClick={() => setObsAberta(false)}>Fechar</button>
                        <button className="btn btn-primary" disabled={obsSalvando || !obsTexto.trim()} onClick={salvarObs}>{obsSalvando ? "Salvando…" : "Salvar observação"}</button>
                      </div>
                      {obsLista.length > 0 && (
                        <div style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 8 }}>Observações anteriores</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto" }}>
                            {obsLista.slice().reverse().map((n, i) => (
                              <div key={i} style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 10, padding: "8px 12px" }}>
                                <div style={{ fontSize: 13, color: "var(--txt)", lineHeight: 1.45 }}>{n.texto}</div>
                                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{n.por || ""}{n.ts ? " · " + new Date(n.ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Portal>
              )}
              {showTransfer && (
                <div className="of-transfer-pop">
                  <div className="of-transfer-tit">Transferir conversa para:</div>
                  {vendedores.length === 0 ? (
                    <div className="panel-sub">Nenhum vendedor disponível.</div>
                  ) : vendedores.map((v) => (
                    <button key={v.id} className="of-transfer-item" onClick={() => transferir(v.id)} disabled={v.id === conversa.vendedorId}>
                      <span className="of-transfer-av">{iniciais(v.nome)}</span>
                      {v.nome}
                      {v.id === conversa.vendedorId && <span className="of-transfer-atual">atual</span>}
                      {v.oficialAtivo && v.id !== conversa.vendedorId && <span className="of-transfer-on">● ativo</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {(() => {
              const camp = conversa.origemDisparo && conversa.campanha ? conversa.campanha : "";
              const orig = conversa.origemLead && !["manual", "ligacao"].includes(conversa.origemLead) && conversa.origemLead !== camp ? conversa.origemLead : "";
              const curso = conversa.cursoLead || "";
              const tags = Array.isArray(conversa.tagsLead) ? conversa.tagsLead : [];
              if (!camp && !orig && !curso && !tags.length && !conversa.recorrenteLead) return null;
              return (
                <div className="of-origem-bar">
                  <span className="of-origem-lb">De onde veio:</span>
                  {camp && <span className="of-origem-tag" title="Campanha de disparo">📣 {camp}</span>}
                  {orig && <span className="of-origem-tag" title="Lista / origem de captação">🎯 {orig}</span>}
                  {curso && <span className="of-origem-tag" title="Curso/treinamento de interesse">📘 {curso}</span>}
                  {tags.map((t, i) => <span key={i} className="of-origem-tag tag" title="Tag do lead">🏷️ {t}</span>)}
                  {conversa.recorrenteLead && <span className="of-origem-tag" style={{ background: "#25A06B", color: "#fff", borderColor: "#25A06B" }} title="Este contato voltou por uma nova captação">🔁 Lead recorrente</span>}
                </div>
              );
            })()}
            <div className="of-conv-msgs" ref={msgsBoxRef} onScroll={onScrollMsgs}>
              {timeline.map((item, i) => (
                item.tipo === "nota" ? (
                  <div key={i} className="of-nota">
                    <I.refresh className="ico" /> {item.n.texto}
                    <span className="of-nota-hora">{horaCurta(item.n.ts)}</span>
                  </div>
                ) : item.m.tipo === "ligacao" && item.m.ligacao ? (
                  <div key={i} className={"of-msg " + (item.m.role === "me" ? "me" : "them")}>
                    {(() => { const naoAtend = item.m.ligacao.atendida === false && !item.m.ligacao.pendente; return (
                    <button onClick={() => abrirResumoLigacao(item.m.ligacao)} title="Ver detalhes da ligação" style={{ display: "flex", alignItems: "center", gap: 10, background: naoAtend ? "#fef2f2" : "#ecfdf3", border: "1px solid " + (naoAtend ? "#fecaca" : "#b7e4c7"), borderRadius: 12, padding: "10px 14px", cursor: "pointer", textAlign: "left", maxWidth: 300 }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: naoAtend ? "#fee2e2" : "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 16 }}>{naoAtend ? "📵" : "📞"}</span>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: naoAtend ? "#991b1b" : "#065f46" }}>Ligação de voz {item.m.ligacao.direcao === "entrante" ? "recebida" : ""}</div>
                        <div style={{ fontSize: 12, color: naoAtend ? "#b91c1c" : "#047857" }}>
                          {item.m.ligacao.pendente
                            ? ((Date.now() - (item.m.ligacao.ts || item.m.ts || 0)) > 10 * 60 * 1000 ? "Sem registro de duração" : "Chamando… (o resumo aparece depois)")
                            : naoAtend ? "Não atendida — tentativa de ligação"
                            : item.m.ligacao.duracao ? "Duração: " + fmtTempo(item.m.ligacao.duracao)
                            : "—"}
                          {" · "}{horaCurta(item.m.ts)}
                          {item.m.ligacao.resumoPronto ? " · 📝 resumo" : (!item.m.ligacao.pendente && !naoAtend && item.m.ligacao.audioUrl ? " · toque p/ resumo" : "")}
                        </div>
                      </div>
                    </button>
                    ); })()}
                  </div>
                ) : (
                  <div key={i} className={"of-msg " + (item.m.role === "me" ? "me" : "them")}>
                    <div className="of-msg-bubble">
                      {item.m.template && <span className="of-msg-tpl">📤 Template (disparo)</span>}
                      {item.m.tipo && item.m.tipo !== "text" && item.m.mid && item.m.arquivo && (
                        <OfMidia chatId={conversa.id} m={item.m} />
                      )}
                      {(!item.m.tipo || item.m.tipo === "text" || !item.m.arquivo) && item.m.content}
                      <span className="of-msg-hora">{horaCurta(item.m.ts)}{item.m.role === "me" && <Ticks status={item.m.status} erro={item.m.erro} erroCodigo={item.m.erroCodigo} lidoEm={item.m.lidoEm} texto={!!item.m.template || item.m.status === "read"} />}</span>
                    </div>
                  </div>
                )
              ))}
              <div ref={fimRef} />
            </div>
            {/* barra "Deixar a IA atender este lead?" removida a pedido */}
            {conversa.iaUltimoErro && (
              <div style={{ margin: "10px 14px 0", padding: "11px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 11, color: "#b91c1c", fontSize: 12.5, display: "flex", alignItems: "flex-start", gap: 8 }}>
                <I.alert className="ico" style={{ flexShrink: 0, marginTop: 1 }} />
                <span><b>A IA não respondeu.</b> {conversa.iaUltimoErro.motivo}</span>
              </div>
            )}
            {conversa.temIA && !conversa.iaPausada ? (
              <div className="of-conv-input" style={{ justifyContent: "center", gap: 10, background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 12 }}>
                <span style={{ color: "var(--brand)", fontSize: 13.5, fontWeight: 600 }}>🤖 A IA está atendendo este lead.</span>
                {isGer && (
                  <button className="btn btn-sm" style={{ background: "var(--brand)", color: "#fff", border: "none" }} onClick={() => alternarIAConversa()}>
                    Pausar IA e assumir
                  </button>
                )}
              </div>
            ) : (() => {
              // Regra do WhatsApp oficial: só dá pra mandar mensagem livre DEPOIS que o lead
              // responde, e só por 24h. Fora disso a Meta recusa (aquele "!" vermelho).
              // Então em vez de deixar digitar e falhar, avisamos e oferecemos o template.
              const ms = conversa.mensagens || [];
              let ue = 0; for (let i = ms.length - 1; i >= 0; i--) { if (ms[i].role === "them") { ue = ms[i].ts || 0; break; } }
              const jan = janela24h(ue);
              const podeTextoLivre = !!(jan && jan.aberta);
              if (!podeTextoLivre) {
                const ig = conversa.canal === "instagram";
                if (ig) {
                  return (
                    <div className="of-bloq">
                      <div className="of-bloq-txt">
                        <b><I.lock className="ico-inline" /> {ue ? "Passou das 24h desde o último DM" : "Esse contato ainda não te mandou DM"}</b>
                        <span>No Instagram você só responde dentro de <b>24h</b> da última mensagem do cliente. {ue ? "É esperar ele te chamar de novo." : "Assim que ele te mandar um DM, a conversa libera aqui."}</span>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="of-bloq">
                    <div className="of-bloq-txt">
                      <b><I.lock className="ico-inline" /> {ue ? "Passou das 24h desde a última resposta" : "Esse contato ainda não te respondeu"}</b>
                      <span>{ue
                        ? "Fora da janela de 24h o WhatsApp só entrega template aprovado — mensagem escrita na mão não chega."
                        : "No WhatsApp oficial, enquanto ele não responder, só chega template aprovado. Mensagem escrita na mão é recusada."}</span>
                    </div>
                    <button className="btn btn-primary" onClick={() => { setSel(null); setNovaConv({ telefone: conversa.numero, nome: conversa.nome || "" }); }}>Enviar template</button>
                  </div>
                );
              }
              return (
              <div className="of-conv-input" style={{ position: "relative" }}>
                {showEmojiOf && (
                  <div className="wa-emoji-pop" style={{ bottom: "100%", marginBottom: 8 }}>
                    {EMOJIS.map((e, i) => (
                      <button type="button" key={e + i} className="wa-emoji" onClick={() => setTexto((t) => t + e)}>{e}</button>
                    ))}
                  </div>
                )}
                <input ref={fileRefOf} type="file" hidden onChange={(e) => { onArquivoOf(e.target.files[0]); e.target.value = ""; }} accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip" />
                {conversa.canal !== "instagram" && <button type="button" className="of-comp-ico" onClick={() => fileRefOf.current && fileRefOf.current.click()} disabled={enviandoMidiaOf} title="Anexar arquivo"><I.clip className="ico" /></button>}
                <button type="button" className="of-comp-ico" onClick={() => setShowEmojiOf((v) => !v)} title="Emojis">😊</button>
                <button type="button" className="of-comp-ico rr-btn" onClick={rapidasOf.abrir} title="Respostas rápidas (digite /)"><I.raio className="ico" /></button>
                {rapidasOf.popup}
                <textarea
                  ref={taOfRef}
                  className="of-conv-ta"
                  rows={1}
                  placeholder={enviandoMidiaOf ? "Enviando…" : gravandoOf ? (pausadoOf ? "Áudio pausado — retome ou cancele" : "Gravando áudio…") : "Escreva uma mensagem…  (Shift+Enter pula linha)"}
                  value={texto}
                  onChange={(e) => { setTexto(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px"; }}
                  onKeyDown={(e) => {
                    if (rapidasOf.teclado(e)) return;
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); setShowEmojiOf(false); if (taOfRef.current) taOfRef.current.style.height = "auto"; }
                    // Shift+Enter -> quebra de linha (padrão do textarea)
                  }}
                  disabled={gravandoOf}
                />
                {texto.trim() ? (
                  <button className="btn btn-primary" onClick={() => { enviar(); setShowEmojiOf(false); }}><I.send className="ico" /></button>
                ) : conversa.canal === "instagram" ? (
                  <button className="btn btn-primary" disabled style={{ opacity: 0.45 }} title="Escreva uma mensagem"><I.send className="ico" /></button>
                ) : gravandoOf ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <button type="button" className="of-comp-ico" onClick={cancelarGravarOf} disabled={enviandoMidiaOf} title="Cancelar (descartar áudio)" style={{ color: "#dc2626" }}><I.trash className="ico" /></button>
                    <button type="button" className="of-comp-ico" onClick={pausarGravarOf} disabled={enviandoMidiaOf} title={pausadoOf ? "Retomar" : "Pausar"} style={{ fontSize: 15, fontWeight: 700 }}>{pausadoOf ? "▶" : "⏸"}</button>
                    <button type="button" className="of-comp-ico grav" onClick={toggleGravarOf} disabled={enviandoMidiaOf} title="Parar e enviar"><I.send className="ico" /></button>
                  </span>
                ) : (
                  <button type="button" className="of-comp-ico" onClick={toggleGravarOf} disabled={enviandoMidiaOf} title="Gravar áudio">
                    <I.mic className="ico" />
                  </button>
                )}
              </div>
              );
            })()}
          </>
        )}
      </div>

      {pedindoSuporte && conversa && (
        <SolicitacaoForm
          defaults={{ cliente: conversa.nome, numero: conversa.numero }}
          onClose={() => setPedindoSuporte(false)}
          onSaved={() => { setPedindoSuporte(false); showToast("✓ Encaminhado para o suporte"); }}
        />
      )}

      {ficha && conversa && !novaConv && (
        <FichaLead chatId={conversa.id} telefone={conversa.numero} nome={conversa.nome} isGer={isGer} foco={ficha}
          onFechar={() => setFicha(null)} showToast={showToast}
          onLigar={conversa.canal !== "instagram" ? abrirConfirmacaoLigar : null}
          onRegistrarVenda={() => setRegVenda(true)}
          onCadastrar={() => setCadPipeline(true)}
          onAbrirPipeline={onAbrirLead} />
      )}
      {regVenda && conversa && (
        <ModalRegistrarVenda prefill={{ nome: conversa.nome, telefone: conversa.numero }} isGer={isGer}
          onClose={() => setRegVenda(false)} showToast={showToast} />
      )}

      {cadPipeline && conversa && (
        <ModalCadastrarPipeline
          prefill={{ nome: conversa.nome, telefone: conversa.numero }}
          showToast={showToast}
          onClose={() => setCadPipeline(false)}
        />
      )}
    </div>
  );
}

function WhatsApp({ user, showToast, target, onTargetUsed, recarregarSol, onAbrirLead }) {
  const isGer = user.role === "gerente";
  const ehLider = user.role === "vendedor" && Array.isArray(user.lideradosIds) && user.lideradosIds.length > 0;
  const podeFiltrar = isGer || ehLider;
  const [canalAba, setCanalAba] = useState(user.role === "gerente" ? "evolution" : "oficial"); // evolution | oficial
  const [chats, setChats] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [usersArr, setUsersArr] = useState([]);
  const [instancias, setInstancias] = useState([]);
  const [minha, setMinha] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(null);
  const [chat, setChat] = useState(null);
  const [texto, setTexto] = useState("");
  const [busca, setBusca] = useState("");
  const [soAguardando, setSoAguardando] = useState(false);
  const [filtro, setFiltro] = useState("todas");
  const [showCfg, setShowCfg] = useState(false);
  const [qrInst, setQrInst] = useState(null);
  const [nova, setNova] = useState(false);
  const [novaNum, setNovaNum] = useState("");
  const [novaTexto, setNovaTexto] = useState("");
  const [novaEnviando, setNovaEnviando] = useState(false);
  const [novoLead, setNovoLead] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [pedindoSuporte, setPedindoSuporte] = useState(false);
  const [regVenda, setRegVenda] = useState(false);
  const [cadPipeline, setCadPipeline] = useState(false);
  const [ficha, setFicha] = useState(null); // v2.1: ficha do lead aberta ao lado da conversa ("info" | "obs")
  const [obsAberta, setObsAberta] = useState(false);
  const [obsTexto, setObsTexto] = useState("");
  const [obsLista, setObsLista] = useState([]);
  const [obsSalvando, setObsSalvando] = useState(false);
  function abrirObs() { setFicha("obs"); } // v2.1: observações ficam na ficha do lead
  async function salvarObs() {
    if (!obsTexto.trim() || !sel) return;
    setObsSalvando(true);
    try { const r = await api.ofChatObsAdd(sel, obsTexto.trim()); setObsLista(((r && r.notas) || []).filter((n) => n.tipo === "obs")); setObsTexto(""); showToast("✓ Observação salva"); }
    catch (e) { showToast("✗ " + e.message); } finally { setObsSalvando(false); }
  }
  // ===== Ligação (Atende Simples) na caixa não-oficial =====
  const [ligando, setLigando] = useState(false);
  const [chamada, setChamada] = useState(null);
  const [cronometro, setCronometro] = useState(0);
  const [confirmarLig, setConfirmarLig] = useState(false);
  const [voipStatus, setVoipStatus] = useState(null);
  const [ligDetalhe, setLigDetalhe] = useState(null);
  const [ligResumoLoading, setLigResumoLoading] = useState(false);
  const fmtTempo = (s) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  useEffect(() => { if (!chamada) return; setCronometro(0); const t = setInterval(() => setCronometro((s) => s + 1), 1000); return () => clearInterval(t); }, [chamada]);
  async function abrirConfirmacaoLigar() {
    if (!chat) return;
    setConfirmarLig(true); setVoipStatus(null);
    try { const s = await api.ofAtendeVoipStatus(); setVoipStatus(s); } catch (_) { setVoipStatus({ disponivel: null }); }
  }
  async function ligarAtende() {
    if (!chat || ligando) return;
    setConfirmarLig(false); setLigando(true);
    try { const r = await api.ofAtendeLigar({ telefone: chat.numero, nome: chat.nome, leadId: chat.leadId || chat.id, chatId: chat.id }); setChamada({ nome: chat.nome || chat.numero, numero: chat.numero }); }
    catch (e) { showToast("✗ " + e.message); } finally { setLigando(false); }
  }
  function encerrarChamada() { setChamada(null); [15000, 40000, 90000].forEach((ms) => setTimeout(async () => { try { await api.ofAtendeSincronizarAuto(); } catch (_) {} }, ms)); }
  async function abrirResumoLigacao(lig) {
    setLigDetalhe(lig);
    if (lig && lig.callid && !lig.resumoPronto) {
      setLigResumoLoading(true);
      try { const r = await api.ofAtendeResumoLigacao(chat.id, lig.callid); if (r && r.ok) setLigDetalhe({ ...lig, resumo: r.resumo, transcricao: r.transcricao, resumoPronto: true }); else setLigDetalhe({ ...lig, _erro: (r && r.erro) || "não deu pra gerar o resumo agora" }); }
      catch (e) { setLigDetalhe({ ...lig, _erro: e.message }); } finally { setLigResumoLoading(false); }
    }
  }
  const [showEmoji, setShowEmoji] = useState(false);
  const [verArquivadas, setVerArquivadas] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [gravSeg, setGravSeg] = useState(0);
  const [enviandoMidia, setEnviandoMidia] = useState(false);
  const arqRef = useRef(false);
  const fileRef = useRef(null);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const gravTimerRef = useRef(null);
  useEffect(() => { arqRef.current = verArquivadas; }, [verArquivadas]);
  const msgsEnd = useRef(null);
  const waBoxRef = useRef(null);
  const taWaRef = useRef(null);
  const rapidasWa = useRespostasRapidas({ texto, setTexto, contatoNome: chat && chat.nome, meuNome: user.nome, taRef: taWaRef, isGer, showToast });
  useEffect(() => { const el = taWaRef.current; if (el && !texto) el.style.height = "auto"; }, [texto]);
  const waNearBottom = useRef(true);
  const waConvId = useRef(null);
  const waCount = useRef(0);
  const selRef = useRef(null);
  const filtroRef = useRef("todas");
  const alvoRef = useRef(null);
  const buscaRef = useRef("");
  useEffect(() => { selRef.current = sel; }, [sel]);
  useEffect(() => { filtroRef.current = filtro; }, [filtro]);
  useEffect(() => { buscaRef.current = busca; }, [busca]);

  async function carregarChats(silencioso) {
    if (!silencioso) setLoading(true);
    try {
      const cs = await api.waChats(null, buscaRef.current.trim(), arqRef.current);
      setChats(cs);
    } catch (e) { if (!silencioso) showToast("✗ " + e.message); }
    finally { if (!silencioso) setLoading(false); }
  }
  async function initGerente() {
    try {
      const [cfg, us] = await Promise.all([api.waConfig(), api.listUsers()]);
      setInstancias(cfg.instancias || []);
      const m = {}; us.forEach((u) => (m[u.id] = u)); setUsersMap(m);
      setUsersArr(us.filter((u) => u.role === "vendedor" && u.ativo).map((u) => ({ id: u.id, nome: u.nome })));
    } catch (_) {}
  }
  async function initVendedor() {
    try { setMinha(await api.waMinha()); } catch (_) {}
  }

  useEffect(() => {
    (async () => {
      if (isGer) await initGerente(); else await initVendedor();
      await carregarChats(false);
    })();
    const t = setInterval(async () => {
      if (document.hidden) return; // v2.0: aba escondida não fica consultando o servidor
      await carregarChats(true);
      if (selRef.current) {
        try { setChat(await api.waChat(selRef.current)); } catch (_) {}
      }
    }, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!chat) { waConvId.current = null; waCount.current = 0; return; }
    const count = (chat.mensagens || []).length;
    const abriuOutra = waConvId.current !== (chat.id || sel);
    const chegouNova = count > waCount.current;
    waConvId.current = chat.id || sel;
    waCount.current = count;
    if (abriuOutra) { waNearBottom.current = true; if (msgsEnd.current) msgsEnd.current.scrollIntoView({ block: "end" }); }
    else if (chegouNova && waNearBottom.current) { if (msgsEnd.current) msgsEnd.current.scrollIntoView({ block: "end", behavior: "smooth" }); }
  }, [chat]);
  function onScrollWaMsgs() {
    const el = waBoxRef.current;
    if (!el) return;
    waNearBottom.current = (el.scrollHeight - el.scrollTop - el.clientHeight) < 120;
  }
  // busca no servidor (nome, número ou conteúdo das mensagens) com debounce
  useEffect(() => {
    const t = setTimeout(() => { carregarChats(true); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [busca]);

  async function abrir(id) {
    setSel(id); selRef.current = id; setNova(false);
    try {
      setChat(await api.waChat(id));
      setChats((cs) => cs.map((x) => (x.id === id ? { ...x, naoLidas: 0 } : x)));
    } catch (e) { showToast("✗ " + e.message); }
  }
  async function enviarNovaEvo() {
    if (!novaNum || !novaTexto.trim()) return;
    setNovaEnviando(true);
    try {
      const r = await api.waIniciar({ numero: novaNum, texto: novaTexto.trim() });
      setNovaTexto(""); setNova(false);
      await carregarChats(true);
      if (r.id) abrir(r.id);
    } catch (e) { showToast("✗ " + e.message); } finally { setNovaEnviando(false); }
  }
  async function enviar() {
    const t = texto.trim();
    if (!t || !sel) return;
    setTexto(""); setEnviando(true);
    try {
      await api.waSend(sel, t);
      setChat((c) => (c ? { ...c, mensagens: [...c.mensagens, { role: "me", content: t, ts: Date.now() }] } : c));
      carregarChats(true);
    } catch (e) { showToast("✗ " + e.message); setTexto(t); }
    finally { setEnviando(false); }
  }
  function virarCard() {
    if (!chat) return;
    setNovoLead({ cliente: chat.nome, telefone: chat.numero });
  }
  async function encerrarAtual(encerrar) {
    if (!sel) return;
    try {
      await api.waEncerrar(sel, encerrar);
      setChat((c) => (c ? { ...c, encerrado: encerrar } : c));
      setChats((cs) => cs.map((x) => (x.id === sel ? { ...x, encerrado: encerrar, aguardando: encerrar ? false : x.aguardando } : x)));
      showToast(encerrar ? "✓ Atendimento encerrado" : "✓ Atendimento reaberto");
    } catch (e) { showToast("✗ " + e.message); }
  }

  function fecharConversa() { setSel(null); setChat(null); selRef.current = null; setShowEmoji(false); }

  function toggleArquivadas() {
    const novo = !verArquivadas;
    setVerArquivadas(novo); arqRef.current = novo;
    fecharConversa();
    setLoading(true);
    api.waChats(null, buscaRef.current.trim(), novo)
      .then((cs) => setChats(cs))
      .catch((e) => showToast("✗ " + e.message))
      .finally(() => setLoading(false));
  }

  function escolherFiltro(f) {
    if (f === "arquivadas") {
      setSoAguardando(false);
      if (!verArquivadas) toggleArquivadas();
    } else {
      setSoAguardando(f === "aguardando");
      if (verArquivadas) toggleArquivadas();
    }
  }

  async function arquivarConversa() {
    if (!sel) return;
    const arquivar = !verArquivadas; // lista normal arquiva; lista de arquivadas desarquiva
    try {
      await api.waArquivar(sel, arquivar);
      setChats((cs) => cs.filter((x) => x.id !== sel));
      fecharConversa();
      showToast(arquivar ? "✓ Conversa arquivada" : "✓ Conversa desarquivada");
    } catch (e) { showToast("✗ " + e.message); }
  }

  function lerBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error("Não consegui ler o arquivo"));
      r.readAsDataURL(file);
    });
  }

  async function onArquivoSelecionado(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file || !sel) return;
    if (file.size > 16 * 1024 * 1024) { showToast("✗ Arquivo muito grande (máx. 16MB)"); return; }
    const tipo = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "document";
    setEnviandoMidia(true);
    try {
      const dataUrl = await lerBase64(file);
      const r = await api.waSendMidia(sel, { tipo, base64: dataUrl, mimetype: file.type, filename: file.name });
      if (r && r.msg) setChat((c) => (c ? { ...c, mensagens: [...c.mensagens, r.msg] } : c));
      carregarChats(true);
    } catch (err) { showToast("✗ " + err.message); }
    finally { setEnviandoMidia(false); }
  }

  function pararStream() {
    if (gravTimerRef.current) { clearInterval(gravTimerRef.current); gravTimerRef.current = null; }
    if (streamRef.current) { try { streamRef.current.getTracks().forEach((t) => t.stop()); } catch (_) {} streamRef.current = null; }
  }

  async function iniciarGravacao() {
    if (!sel) return;
    if (!navigator.mediaDevices || !window.MediaRecorder) { showToast("✗ Seu navegador não permite gravar áudio aqui"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunksRef.current.push(ev.data); };
      recRef.current = mr;
      mr.start();
      setGravando(true); setGravSeg(0);
      gravTimerRef.current = setInterval(() => setGravSeg((s) => s + 1), 1000);
    } catch (_) { showToast("✗ Não consegui acessar o microfone"); pararStream(); }
  }

  function cancelarGravacao() {
    const mr = recRef.current;
    if (mr && mr.state !== "inactive") { mr.onstop = null; try { mr.stop(); } catch (_) {} }
    recRef.current = null; chunksRef.current = [];
    pararStream(); setGravando(false); setGravSeg(0);
  }

  function pararEnviarGravacao() {
    const mr = recRef.current;
    if (!mr) { setGravando(false); return; }
    const alvo = sel;
    mr.onstop = async () => {
      pararStream(); setGravando(false);
      const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
      chunksRef.current = []; recRef.current = null;
      if (!blob.size || !alvo) { setGravSeg(0); return; }
      setEnviandoMidia(true);
      try {
        const dataUrl = await lerBase64(blob);
        const tipoReal = (blob.type || "audio/webm").split(";")[0];
        const r = await api.waSendMidia(alvo, { tipo: "audio", base64: dataUrl, mimetype: tipoReal, filename: "audio." + extDeAudio(tipoReal) });
        if (r && r.msg) setChat((c) => (c ? { ...c, mensagens: [...c.mensagens, r.msg] } : c));
        carregarChats(true);
      } catch (err) { showToast("✗ " + err.message); }
      finally { setEnviandoMidia(false); setGravSeg(0); }
    };
    try { mr.stop(); } catch (_) { setGravando(false); }
  }

  // ESC fecha a conversa (igual WhatsApp)
  useEffect(() => {
    function onKey(e) {
      if (e.key !== "Escape") return;
      if (showEmoji) { setShowEmoji(false); return; }
      if (gravando) { cancelarGravacao(); return; }
      if (selRef.current) fecharConversa();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line
  }, [showEmoji, gravando]);

  // alvo vindo do botão de WhatsApp no card do pipeline
  useEffect(() => {
    if (!target || !target.numero) return;
    if (loading) return;
    // veio do Pipeline pedindo um canal específico (oficial/não oficial)? troca de aba primeiro
    if (target.canal && target.canal !== canalAba) { setCanalAba(target.canal); return; }
    if (canalAba === "oficial") return; // o alvo oficial é tratado pelo InboxOficial
    if (alvoRef.current === target.numero) return;
    alvoRef.current = target.numero;
    const num = soDigitos(target.numero);
    const achado = chats.find((c) => numIgual(c.numero, target.numero));
    if (achado) { abrir(achado.id); }
    else { setNovaNum(num); setNova(true); }
    onTargetUsed && onTargetUsed();
    // eslint-disable-next-line
  }, [target, loading, chats, canalAba]);

  // vendedores vêm de quem está CADASTRADO no Monitoria (Equipe & Acessos),
  // não das instâncias do Evolution (que é compartilhado com outros sistemas)
  const vendedoresWA = useMemo(
    () => [...usersArr].sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR")),
    [usersArr]
  );

  const buscando = busca.trim().length > 0;
  const aguardandoCount = chats.filter((c) => c.aguardando).length;
  const filtroAtivo = verArquivadas ? "arquivadas" : soAguardando ? "aguardando" : "ativas";
  const podeResponder = !isGer && !!user.podeResponder;
  let filtrados = chats.filter((c) => {
    if (soAguardando && !c.aguardando) return false;
    // a busca já vem filtrada do servidor; o filtro de vendedor só vale fora da busca
    if (!buscando && isGer && filtro !== "todas" && c.vendedorId !== filtro) return false;
    return true;
  });
  if (soAguardando) filtrados = [...filtrados].sort((a, b) => (b.esperaSeg || 0) - (a.esperaSeg || 0));

  if (loading) return <div className="spin" />;

  if (showCfg) return <WhatsAppConfig onVoltar={() => { setShowCfg(false); initGerente(); }} showToast={showToast} />;

  // vendedor sem Evolution vinculado: NÃO bloqueia a tela toda — só o conteúdo Evolution.
  // a aba "Oficial · Disparo" continua acessível.
  const semEvolution = !isGer && (!minha || !minha.instance);

  return (
    <div className="wa-page">
      <div className="canal-abas">
        <button className={canalAba === "evolution" ? "canal-aba on" : "canal-aba"} onClick={() => setCanalAba("evolution")}>
          <I.wa className="ico" /> {isGer ? "Não oficial (vendedores)" : "Não oficial"}
        </button>
        <button className={canalAba === "oficial" ? "canal-aba on oficial" : "canal-aba oficial"} onClick={() => setCanalAba("oficial")}>
          <I.send className="ico" /> Oficial
        </button>
        {canalAba !== "oficial" && !semEvolution && (
          <div className="wa-toolbar">
            <div className="wa-toolbar-left">
              {isGer && (
                <select className="select" style={{ minWidth: 200 }} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
                  <option value="todas">Todos os vendedores</option>
                  {vendedoresWA.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
                </select>
              )}
              {!isGer && minha && minha.estado !== "open" && (
                <button className="btn btn-primary" onClick={() => setQrInst(minha.instance)}><I.link style={{ width: 15, height: 15 }} /> Conectar meu WhatsApp</button>
              )}
              {!isGer && minha && minha.estado === "open" && (
                <span style={{ fontSize: 13, color: "var(--fechou)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><span className="wa-dot on" /> WhatsApp conectado</span>
              )}
            </div>
            {isGer && <button className="btn" onClick={() => setShowCfg(true)}><I.cog style={{ width: 15, height: 15 }} /> Configurar conexão</button>}
          </div>
        )}
      </div>

      {canalAba === "oficial" ? (
        <InboxOficial isGer={isGer} ehLider={ehLider} showToast={showToast} onAbrirLead={onAbrirLead} meuNome={user.nome} onIrParaEvolution={() => setCanalAba("evolution")} target={target && target.canal === "oficial" ? target : null} onTargetUsed={onTargetUsed} />
      ) : semEvolution ? (
        <div className="wa-grid"><div className="wa-none">
          <I.wa className="ico" />
          <div><b>Seu WhatsApp (não oficial) ainda não foi vinculado.</b><br />Peça pra gerente cadastrar o seu número, ou use a aba <b>Oficial</b> aqui em cima.</div>
        </div></div>
      ) : (
      <>
      <div className="wa-grid">
        <div className="wa-list">
          <div className="wa-list-h">
            <div className="wa-search"><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar lead por nome ou número..." /></div>
            <div className="wa-filtros wa-filtros-row">
              <button type="button" className={"wa-filtro" + (filtroAtivo === "ativas" ? " on" : "")} onClick={() => escolherFiltro("ativas")}>Ativas</button>
              <button type="button" className={"wa-filtro" + (filtroAtivo === "aguardando" ? " on" : "")} onClick={() => escolherFiltro("aguardando")}>
                Aguardando{aguardandoCount ? <span className="wa-filtro-cnt">{aguardandoCount}</span> : null}
              </button>
              <button type="button" className={"wa-filtro" + (filtroAtivo === "arquivadas" ? " on" : "")} onClick={() => escolherFiltro("arquivadas")}>
                <I.arquivar style={{ width: 13, height: 13 }} /> Arquivadas
              </button>
            </div>
          </div>
          <div className="wa-list-scroll">
            {filtrados.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "var(--faint)", fontSize: 13 }}>Nenhuma conversa ainda.</div>}
            {filtrados.map((c) => (
              <div key={c.id} className={"wa-conv" + (sel === c.id ? " active" : "")} onClick={() => abrir(c.id)}>
                <div className="av">{iniciais(c.nome)}</div>
                <div className="mid">
                  <div className="nm">{c.nome}</div>
                  <div className="last">{c.trecho ? <>🔎 {c.trecho}</> : c.ultima}</div>
                  <div className="conv-tags">
                    {isGer && c.vendedorId && <span className="seller-tag">{usersMap[c.vendedorId]?.nome || ""}</span>}
                    {c.aguardando && <span className="wait-tag">⏳ aguardando há {fmtEspera(c.esperaSeg)}</span>}
                    {c.encerrado && <span className="enc-tag-sm">✓ encerrado</span>}
                    {c.nota != null && <span className="nota-tag-sm">⭐ {c.nota}</span>}
                  </div>
                </div>
                <div className="wa-meta">
                  <div className="wa-time">{horaCurta(c.atualizadoEm)}</div>
                  {c.naoLidas > 0 && <div className="wa-badge">{c.naoLidas}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {nova ? (
          <div className="wa-chat wa-nova">
            <div className="of-nova-head"><b>Nova conversa</b><button className="crm-x" onClick={() => { setNova(false); setNovaNum(""); setNovaTexto(""); }}>✕</button></div>
            <div className="of-nova-body">
              <div className="of-nova-num">Para: <b>{novaNum}</b></div>
              <p className="of-nova-info">No WhatsApp não oficial você fala livre. Escreva a primeira mensagem e envie — a conversa abre em seguida.</p>
              <textarea className="input" rows={3} placeholder="Escreva a primeira mensagem…" value={novaTexto} onChange={(e) => setNovaTexto(e.target.value)} style={{ resize: "vertical" }} />
              <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={novaEnviando || !novaTexto.trim()} onClick={enviarNovaEvo}>{novaEnviando ? "Enviando…" : "Enviar e abrir conversa"}</button>
            </div>
          </div>
        ) : !chat ? (
          <div className="wa-chat"><div className="wa-none"><I.chat className="ico" /><div>Selecione uma conversa pra começar</div></div></div>
        ) : (
          <div className="wa-chat">
            <div className="wa-chat-h">
              <button type="button" className="conv-quem" onClick={() => setFicha(ficha ? null : "info")} title="Ver ficha do lead">
                <div className="av">{iniciais(chat.nome)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="nm">{chat.nome}</div>
                  <div className="num">{chat.numero}</div>
                </div>
              </button>
              {chat.nota != null && <span className="nota-badge" title="Nota da pesquisa de satisfação">⭐ {chat.nota}/5</span>}
              {isGer && <button type="button" className="btn-pipe" onClick={() => setCadPipeline(true)} title="Cadastrar este lead no Pipeline"><I.pipe style={{ width: 14, height: 14 }} /> Pipeline</button>}
              <button type="button" className="btn-venda" onClick={() => setRegVenda(true)} title="Registrar uma venda deste cliente"><I.gauge style={{ width: 14, height: 14 }} /> Registrar venda</button>
              <button type="button" className="btn-pipe" onClick={abrirConfirmacaoLigar} disabled={ligando} title="Ligar para este lead pelo Atende Simples"><I.fone style={{ width: 14, height: 14 }} /> Ligar</button>
              <button type="button" className="btn-pipe" onClick={abrirObs} title="Adicionar observação (a IA lê e considera na análise)"><I.nota style={{ width: 14, height: 14 }} /> Observação</button>
              {!isGer && <button type="button" className="btn-suporte" onClick={() => setPedindoSuporte(true)} title="Encaminhar este atendimento para a equipe de suporte"><I.suporte style={{ width: 14, height: 14 }} /> Encaminhar pro suporte</button>}
              {chat.encerrado ? (
                <div className="enc-acao">
                  <span className="enc-tag">✓ Encerrado</span>
                  <button type="button" className="btn-link" onClick={() => encerrarAtual(false)}>Reabrir</button>
                </div>
              ) : (
                <button type="button" className="btn-encerrar" onClick={() => encerrarAtual(true)}>Encerrar atendimento</button>
              )}
              <button type="button" className="wa-ico-btn" onClick={arquivarConversa} title={verArquivadas ? "Desarquivar conversa" : "Arquivar conversa"}>
                <I.arquivar style={{ width: 18, height: 18 }} />
              </button>
              <button type="button" className="wa-ico-btn" onClick={fecharConversa} title="Fechar (Esc)">
                <I.x style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <div className="wa-msgs" ref={waBoxRef} onScroll={onScrollWaMsgs}>
              {chat.mensagens.map((m, i) => (
                m.tipo === "ligacao" && m.ligacao ? (
                  (() => { const naoAtend = m.ligacao.atendida === false && !m.ligacao.pendente; return (
                  <div key={i} className={"wa-bubble " + (m.role === "me" ? "me" : "them")} style={{ background: "transparent", boxShadow: "none", padding: 0 }}>
                    <button onClick={() => abrirResumoLigacao(m.ligacao)} title="Ver detalhes da ligação" style={{ display: "flex", alignItems: "center", gap: 10, background: naoAtend ? "#fef2f2" : "#ecfdf3", border: "1px solid " + (naoAtend ? "#fecaca" : "#b7e4c7"), borderRadius: 12, padding: "10px 14px", cursor: "pointer", textAlign: "left", maxWidth: 300 }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: naoAtend ? "#fee2e2" : "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ fontSize: 16 }}>{naoAtend ? "📵" : "📞"}</span></div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: naoAtend ? "#991b1b" : "#065f46" }}>Ligação de voz {m.ligacao.direcao === "entrante" ? "recebida" : ""}</div>
                        <div style={{ fontSize: 12, color: naoAtend ? "#b91c1c" : "#047857" }}>
                          {m.ligacao.pendente ? "Chamando…" : naoAtend ? "Não atendida — tentativa de ligação" : m.ligacao.duracao ? "Duração: " + fmtTempo(m.ligacao.duracao) : "—"}
                          {" · "}{new Date(m.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          {m.ligacao.resumoPronto ? " · 📝 resumo" : (!m.ligacao.pendente && !naoAtend && m.ligacao.audioUrl ? " · toque p/ resumo" : "")}
                        </div>
                      </div>
                    </button>
                  </div>
                  ); })()
                ) : (
                <div key={i} className={"wa-bubble " + (m.role === "me" ? "me" : "them") + (m.tipo && m.tipo !== "text" ? " com-midia" : "")}>
                  {m.tipo && m.tipo !== "text" ? (
                    <>
                      <MidiaMsg chatId={chat.id} m={m} />
                      {m.caption ? <div className="midia-cap">{m.caption}</div> : null}
                    </>
                  ) : m.content}
                  <span className="t">{new Date(m.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                )
              ))}
              <div ref={msgsEnd} />
            </div>
            {podeResponder ? (
              gravando ? (
                <div className="wa-compose wa-gravando">
                  <button type="button" className="wa-grav-cancel" onClick={cancelarGravacao} title="Cancelar gravação"><I.trash style={{ width: 18, height: 18 }} /></button>
                  <span className="wa-grav-dot" />
                  <span className="wa-grav-time">Gravando… {Math.floor(gravSeg / 60)}:{String(gravSeg % 60).padStart(2, "0")}</span>
                  <div style={{ flex: 1 }} />
                  <button type="button" className="wa-comp-send" onClick={pararEnviarGravacao} title="Enviar áudio"><I.send style={{ width: 17, height: 17 }} /></button>
                </div>
              ) : (
                <div className="wa-compose">
                  {showEmoji && (
                    <div className="wa-emoji-pop">
                      {EMOJIS.map((e, i) => (
                        <button type="button" key={e + i} className="wa-emoji" onClick={() => setTexto((t) => t + e)}>{e}</button>
                      ))}
                    </div>
                  )}
                  <input ref={fileRef} type="file" hidden onChange={onArquivoSelecionado} accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip" />
                  <button type="button" className="wa-comp-ico" onClick={() => fileRef.current && fileRef.current.click()} disabled={enviandoMidia} title="Anexar arquivo"><I.clip style={{ width: 20, height: 20 }} /></button>
                  <button type="button" className="wa-comp-ico" onClick={() => setShowEmoji((v) => !v)} title="Emojis">😊</button>
                  <button type="button" className="wa-comp-ico rr-btn" onClick={rapidasWa.abrir} title="Respostas rápidas (digite /)"><I.raio style={{ width: 19, height: 19 }} /></button>
                  {rapidasWa.popup}
                  <textarea
                    ref={taWaRef}
                    className="wa-comp-input wa-comp-ta"
                    rows={1}
                    value={texto}
                    onChange={(e) => { setTexto(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px"; }}
                    onKeyDown={(e) => { if (rapidasWa.teclado(e)) return; if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); setShowEmoji(false); if (taWaRef.current) taWaRef.current.style.height = "auto"; } }}
                    placeholder={enviandoMidia ? "Enviando…" : "Escreva uma mensagem...  (Shift+Enter pula linha)"}
                    disabled={enviandoMidia}
                  />
                  {texto.trim() ? (
                    <button type="button" className="wa-comp-send" onClick={() => { enviar(); setShowEmoji(false); }} disabled={enviando} title="Enviar"><I.send style={{ width: 17, height: 17 }} /></button>
                  ) : (
                    <button type="button" className="wa-comp-send wa-comp-mic" onClick={iniciarGravacao} disabled={enviandoMidia} title="Gravar áudio"><I.mic style={{ width: 18, height: 18 }} /></button>
                  )}
                </div>
              )
            ) : (
              <div className="wa-readonly">
                <I.eye style={{ width: 15, height: 15 }} /> Monitoria — somente leitura. Quem responde é o vendedor, pelo WhatsApp dele.
              </div>
            )}
          </div>
        )}
        {chat && !nova && ficha && (
          <FichaLead chatId={chat.id} telefone={chat.numero} nome={chat.nome} isGer={isGer} foco={ficha}
            onFechar={() => setFicha(null)} showToast={showToast}
            onLigar={abrirConfirmacaoLigar}
            onRegistrarVenda={() => setRegVenda(true)}
            onCadastrar={() => setCadPipeline(true)}
            onAbrirPipeline={onAbrirLead} />
        )}
      </div>

      {qrInst && <QrModal instance={qrInst} onClose={() => setQrInst(null)} onConnected={() => { setQrInst(null); initVendedor(); showToast("🎉 WhatsApp conectado!"); }} />}
      {pedindoSuporte && chat && (
        <SolicitacaoForm
          defaults={{ cliente: chat.nome, numero: chat.numero }}
          onClose={() => setPedindoSuporte(false)}
          onSaved={() => { setPedindoSuporte(false); showToast("✓ Encaminhado para o suporte"); recarregarSol && recarregarSol(); }}
        />
      )}
      {regVenda && chat && (
        <ModalRegistrarVenda prefill={{ nome: chat.nome, telefone: chat.numero }} isGer={isGer}
          onClose={() => setRegVenda(false)} showToast={showToast} />
      )}
      {obsAberta && chat && (
        <Portal>
          <div className="modal" onClick={(e) => e.target === e.currentTarget && setObsAberta(false)}>
            <div className="onum-modal" style={{ maxWidth: 480, padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <b style={{ fontSize: 16 }}>📝 Observações do lead</b>
                <button className="crm-x" onClick={() => setObsAberta(false)}>✕</button>
              </div>
              <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 12px", lineHeight: 1.5 }}>
                Registre o que rolou por fora do chat (ligou e resolveu, fechou presencial, cliente pediu pra chamar depois...). <b>A IA lê essas observações</b> e considera na análise — assim não trata como lead abandonado.
              </p>
              <textarea value={obsTexto} onChange={(e) => setObsTexto(e.target.value)} placeholder="Ex: Liguei pro cliente e ele fechou por telefone. / Resolvido presencialmente." rows={3} style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13.5, resize: "vertical", fontFamily: "inherit" }} />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                <button className="btn" onClick={() => setObsAberta(false)}>Fechar</button>
                <button className="btn btn-primary" disabled={obsSalvando || !obsTexto.trim()} onClick={salvarObs}>{obsSalvando ? "Salvando…" : "Salvar observação"}</button>
              </div>
              {obsLista.length > 0 && (
                <div style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 8 }}>Observações anteriores</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto" }}>
                    {obsLista.slice().reverse().map((n, i) => (
                      <div key={i} style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 10, padding: "8px 12px" }}>
                        <div style={{ fontSize: 13, color: "var(--txt)", lineHeight: 1.45 }}>{n.texto}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{n.por || ""}{n.ts ? " · " + new Date(n.ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}
      {confirmarLig && chat && (
        <Portal>
          <div className="modal" onClick={(e) => e.target === e.currentTarget && setConfirmarLig(false)}>
            <div className="onum-modal" style={{ maxWidth: 460, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <b style={{ fontSize: 18 }}>Realizar ligação</b>
                <button className="crm-x" onClick={() => setConfirmarLig(false)}>✕</button>
              </div>
              <p style={{ fontSize: 13.5, color: "var(--txt)", lineHeight: 1.55, margin: "0 0 14px" }}>
                Antes de ligar, confirme que você está logado no <a href="https://voip.atendesimples.com" target="_blank" rel="noreferrer" style={{ color: "var(--brand)", fontWeight: 600 }}>voip.atendesimples.com ↗</a> e disponível.
              </p>
              <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 6 }}>
                {voipStatus && voipStatus.disponivel === true ? <span style={{ color: "#059669", fontWeight: 600 }}>✓ Seu VoIP está disponível.</span> : <>💡 Confira se você está logado e disponível no VoIP.</>}
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button className="btn" onClick={() => setConfirmarLig(false)}>Cancelar</button>
                <button className="btn btn-primary" disabled={ligando} onClick={ligarAtende}>{ligando ? "Ligando…" : "📞 Realizar ligação"}</button>
              </div>
            </div>
          </div>
        </Portal>
      )}
      {chamada && (
        <Portal>
          <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, width: 300, background: "var(--card, #fff)", borderRadius: 16, boxShadow: "0 12px 40px rgba(0,0,0,0.25)", border: "1px solid var(--line)", overflow: "hidden", animation: "slideUp 0.25s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#25A06B", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, animation: "callPulse 1.4s ease-in-out infinite" }}><span style={{ fontSize: 20 }}>📞</span></div>
              <div style={{ minWidth: 0, flex: 1 }}><div style={{ fontSize: 11, color: "#25A06B", fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>Em ligação</div><div style={{ fontSize: 14, fontWeight: 700, color: "var(--txt)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{chamada.nome}</div></div>
              <div style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "var(--txt)", flexShrink: 0 }}>{fmtTempo(cronometro)}</div>
            </div>
            <button onClick={() => encerrarChamada()} style={{ width: "100%", border: "none", borderTop: "1px solid var(--line)", background: "transparent", color: "var(--muted)", fontWeight: 600, fontSize: 13, padding: "10px", cursor: "pointer" }}>Fechar (a ligação continua no seu ramal)</button>
          </div>
        </Portal>
      )}
      {ligDetalhe && (
        <Portal>
          <div className="modal" onClick={(e) => e.target === e.currentTarget && setLigDetalhe(null)}>
            <div className="onum-modal" style={{ maxWidth: 440, maxHeight: "85vh", overflowY: "auto", padding: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
                <b style={{ fontSize: 15 }}>Informações da ligação</b>
                <button className="crm-x" onClick={() => setLigDetalhe(null)}>✕</button>
              </div>
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                {ligDetalhe.vendedorNome && (<div style={{ background: "#eff6ff", borderRadius: 12, padding: "12px 14px" }}><div style={{ fontSize: 11.5, color: "#2563eb", fontWeight: 600 }}>Realizada por</div><div style={{ fontSize: 15, fontWeight: 700, color: "#1e3a8a" }}>{ligDetalhe.vendedorNome}</div></div>)}
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1, background: "var(--surface-2)", borderRadius: 12, padding: "12px 14px" }}><div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>Direção</div><div style={{ fontSize: 14, fontWeight: 700 }}>{ligDetalhe.direcao === "entrante" ? "Recebida" : "Realizada"}</div></div>
                  <div style={{ flex: 1, background: "var(--surface-2)", borderRadius: 12, padding: "12px 14px" }}><div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>Duração</div><div style={{ fontSize: 14, fontWeight: 700 }}>{ligDetalhe.atendida === false ? "Não atendida" : ligDetalhe.duracao ? fmtTempo(ligDetalhe.duracao) : "—"}</div></div>
                </div>
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>📝 Resumo da chamada</div>
                  {ligResumoLoading ? (<div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 13 }}><span className="spin" /> Transcrevendo e resumindo a gravação…</div>)
                    : ligDetalhe.resumo ? (<div style={{ fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap", color: "var(--txt)" }}>{ligDetalhe.resumo}</div>)
                    : ligDetalhe._erro ? (<div style={{ fontSize: 13, color: "var(--muted)", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 12px" }}>{ligDetalhe._erro}. A gravação do Atende pode levar alguns minutos pra ficar pronta — feche e abra de novo mais tarde.</div>)
                    : (<div style={{ fontSize: 13, color: "var(--muted)" }}>Sem gravação disponível pra esta ligação.</div>)}
                  {ligDetalhe.transcricao && (<details style={{ marginTop: 12 }}><summary style={{ cursor: "pointer", fontSize: 12.5, color: "var(--brand)" }}>Ver transcrição completa</summary><div style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.6, whiteSpace: "pre-wrap", color: "var(--muted)" }}>{ligDetalhe.transcricao}</div></details>)}
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
      {cadPipeline && chat && (
        <ModalCadastrarPipeline
          prefill={{ nome: chat.nome, telefone: chat.numero }}
          showToast={showToast}
          onClose={() => setCadPipeline(false)}
        />
      )}
      </>
      )}
    </div>
  );
}

/* ---------- CONFIG WHATSAPP (gerente) ---------- */
function WhatsAppConfig({ onVoltar, showToast }) {
  const [cfg, setCfg] = useState(null);
  const [users, setUsers] = useState([]);
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [rows, setRows] = useState([]); // [{instance, vendedorId, numero, profileName, estado, descoberta}]
  const [saving, setSaving] = useState(false);
  const [carregandoEvo, setCarregandoEvo] = useState(true);
  const [erroEvo, setErroEvo] = useState("");
  const [qrInst, setQrInst] = useState(null);

  async function carregar() {
    const [c, us] = await Promise.all([api.waConfig(), api.listUsers()]);
    setCfg(c); setUrl(c.url || "");
    setUsers(us.filter((u) => u.ativo));
    await montar(c.instancias || []);
  }
  async function montar(salvas) {
    const mapV = {}; salvas.forEach((i) => { mapV[i.instance] = i.vendedorId || ""; });
    setCarregandoEvo(true); setErroEvo("");
    let desc = [];
    try { desc = await api.waInstanciasEvolution(); }
    catch (e) { setErroEvo(e.message || "Não consegui buscar os WhatsApps do Evolution."); }
    setCarregandoEvo(false);
    const linhas = desc.map((d) => ({
      instance: d.instance, vendedorId: mapV[d.instance] || "",
      numero: d.numero || "", profileName: d.profileName || "", estado: d.estado || "close", descoberta: true,
    }));
    const nomes = new Set(desc.map((d) => d.instance));
    salvas.forEach((i) => { if (!nomes.has(i.instance)) linhas.push({ instance: i.instance, vendedorId: i.vendedorId || "", numero: "", profileName: "", estado: "close", descoberta: false }); });
    setRows(linhas);
  }
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, []);

  const setRow = (idx, k, v) => setRows((r) => r.map((x, j) => (j === idx ? { ...x, [k]: v } : x)));
  const addManual = () => setRows((r) => [...r, { instance: "", vendedorId: "", numero: "", profileName: "", estado: "close", descoberta: false }]);

  async function excluir(r, idx) {
    const inst = (r.instance || "").trim();
    if (!inst || !r.descoberta) { setRows((rs) => rs.filter((_, j) => j !== idx)); return; }
    if (!confirm(`Excluir a instância "${inst}" do Evolution?\n\nIsso desconecta e apaga esse WhatsApp de vez. Se ele for usado por outro sistema, vai parar de funcionar lá também.`)) return;
    try {
      await api.waDeleteInstance(inst);
      setRows((rs) => rs.filter((_, j) => j !== idx));
      showToast("✓ Instância excluída");
    } catch (e) { showToast("✗ " + e.message); }
  }

  async function salvar() {
    const monit = rows.filter((r) => (r.instance || "").trim() && r.vendedorId);
    const nomes = monit.map((r) => r.instance.trim());
    if (new Set(nomes).size !== nomes.length) { showToast("✗ Tem instâncias repetidas."); return; }
    setSaving(true);
    try {
      const dados = { url, publicUrl: window.location.origin, instancias: monit.map((r) => ({ instance: r.instance.trim(), vendedorId: r.vendedorId })) };
      if (apiKey) dados.apiKey = apiKey;
      await api.waSetConfig(dados);
      setApiKey("");
      showToast(`✓ Salvo! ${monit.length} WhatsApp(s) sendo monitorado(s).`);
      carregar();
    } catch (e) { showToast("✗ " + e.message); } finally { setSaving(false); }
  }

  if (!cfg) return <div className="spin" />;
  const monitCount = rows.filter((r) => r.vendedorId).length;

  return (
    <div style={{ maxWidth: 820 }}>
      <button className="btn btn-sm" onClick={onVoltar} style={{ marginBottom: 16 }}>← Voltar pras conversas</button>

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-h"><h3>Servidor Evolution</h3></div>
        <div style={{ padding: 22 }}>
          <div className="field">
            <label>Endereço da Evolution (URL)</label>
            <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://sua-evolution.up.railway.app" />
          </div>
          <div className="field">
            <label>Chave da API (apikey){cfg.temApiKey ? " — já salva, preencha só pra trocar" : ""}</label>
            <input className="input" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={cfg.temApiKey ? "•••••••• (mantém a atual)" : "cole a AUTHENTICATION_API_KEY"} />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h3>WhatsApps dos vendedores</h3>
          <button className="btn btn-sm" onClick={() => montar(cfg.instancias || [])} disabled={carregandoEvo}><I.refresh style={{ width: 14, height: 14 }} /> {carregandoEvo ? "Buscando..." : "Recarregar"}</button>
        </div>
        <div style={{ padding: "6px 22px 18px" }}>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0 14px" }}>
            Aqui aparecem os WhatsApps que a equipe já conectou. Escolha o <b>vendedor</b> de cada um pra ele ser monitorado. Os de outros sistemas, deixe em <b>"— não monitorar —"</b>.
          </p>

          {erroEvo && <div className="info-box" style={{ borderColor: "var(--coral)" }}>⚠️ {erroEvo} Confira a URL e a chave aí em cima.</div>}
          {carregandoEvo && <div className="spin" />}
          {!carregandoEvo && rows.length === 0 && !erroEvo && <p style={{ color: "var(--muted)", fontSize: 13, padding: "14px 0" }}>Nenhum WhatsApp encontrado no Evolution.</p>}

          {!carregandoEvo && rows.map((r, i) => {
            const on = r.estado === "open";
            const conn = r.estado === "connecting";
            return (
              <div className="wa-inst-row" key={r.instance || ("m" + i)}>
                <span className={"wa-dot " + (on ? "on" : "off")} title={on ? "conectado" : conn ? "conectando" : "desconectado"} />
                <div style={{ flex: "1 1 210px", minWidth: 0 }}>
                  {r.descoberta ? (
                    <>
                      <div style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.profileName || r.instance}</div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{r.instance}{r.numero ? " · " + r.numero : ""} · {on ? "conectado" : conn ? "conectando" : "desconectado"}</div>
                    </>
                  ) : (
                    <input className="input" value={r.instance} onChange={(e) => setRow(i, "instance", e.target.value)} placeholder="nome do número novo (ex: lucas-2)" />
                  )}
                </div>
                <select className="select" style={{ flex: "1 1 160px" }} value={r.vendedorId || ""} onChange={(e) => setRow(i, "vendedorId", e.target.value)}>
                  <option value="">— não monitorar —</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
                {!on && <button className="btn btn-sm" onClick={() => setQrInst((r.instance || "").trim())} disabled={!(r.instance || "").trim()}>Conectar</button>}
                <button className="x-btn" onClick={() => excluir(r, i)} title="Excluir do Evolution"><I.trash style={{ width: 15, height: 15 }} /></button>
              </div>
            );
          })}

          {!carregandoEvo && (
            <button className="btn" onClick={addManual} style={{ marginTop: 12 }}>
              <I.plus style={{ width: 15, height: 15 }} /> Conectar outro número (gera QR)
            </button>
          )}

          <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={salvar} disabled={saving}>{saving ? "Salvando..." : `Salvar (${monitCount} monitorado${monitCount === 1 ? "" : "s"})`}</button>
            <span style={{ fontSize: 12.5, color: "var(--muted)" }}>Eu religo o webhook de cada um automaticamente ao salvar.</span>
          </div>
          <div className="info-box">
            💡 <b>Mesmo vendedor com 2 números?</b> Não precisa criar outro usuário. Se o número <b>já está na lista</b> acima, é só escolher o <b>mesmo vendedor</b> nele. Se for um número <b>novo</b>, clique em <b>"Conectar outro número"</b>, dê um nome (ex: <code>lucas-2</code>), escolha o <b>mesmo vendedor</b> e conecte pelo QR. Os atendimentos dos dois números somam no painel daquele vendedor.
          </div>
        </div>
      </div>

      {qrInst && <QrModal instance={qrInst} onClose={() => setQrInst(null)} onConnected={() => {
        const inst = qrInst;
        setQrInst(null);
        showToast("🎉 Conectado! Confira o vendedor e clique em Salvar.");
        setRows((rs) => rs.map((r) => (r.instance === inst ? { ...r, estado: "open", descoberta: true } : r)));
      }} />}
    </div>
  );
}

/* ---------- QR MODAL ---------- */
function QrModal({ instance, onClose, onConnected }) {
  const [qr, setQr] = useState(null);
  const [erro, setErro] = useState("");
  const [estado, setEstado] = useState("connecting");
  const [carregando, setCarregando] = useState(true);

  async function gerar() {
    setErro(""); setQr(null); setCarregando(true);
    try {
      const r = await api.waConnect(instance);
      setQr(r.qr);
      if (!r.qr) setErro("A Evolution não retornou o QR. Tente gerar de novo.");
    } catch (e) { setErro(e.message); } finally { setCarregando(false); }
  }
  useEffect(() => {
    gerar();
    const t = setInterval(async () => {
      try {
        const s = await api.waStatus(instance);
        setEstado(s.estado);
        if (s.estado === "open") { clearInterval(t); onConnected && onConnected(); }
      } catch (_) {}
    }, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [instance]);

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="mh"><h3>Conectar WhatsApp</h3><p>Instância <b>{instance}</b></p></div>
        <div className="mb">
          {estado === "open" ? (
            <div className="qr-box"><div style={{ fontSize: 46 }}>✅</div><b style={{ fontSize: 17 }}>Conectado!</b></div>
          ) : (
            <div className="qr-box">
              {erro && <div className="err">{erro}</div>}
              {qr ? <img src={qr} alt="QR Code" /> : <div className="qr-wait">{carregando ? "Gerando QR..." : "Sem QR"}</div>}
              <div className="qr-steps">
                1. Abra o WhatsApp do vendedor no celular<br />
                2. Toque em <b>Aparelhos conectados</b><br />
                3. <b>Conectar um aparelho</b> e aponte a câmera pro QR
              </div>
            </div>
          )}
        </div>
        <div className="mf">
          <button className="btn full" onClick={onClose}>Fechar</button>
          {estado !== "open" && <button className="btn btn-primary full" onClick={gerar} disabled={carregando}><I.refresh style={{ width: 15, height: 15 }} /> Gerar novo QR</button>}
        </div>
      </div>
    </div>
  );
}

/* ---------- NOVA CONVERSA ---------- */
function fmtDataHora(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function fmtTempo(seg) {
  if (!seg || seg <= 0) return "—";
  if (seg < 60) return seg + "s";
  if (seg < 3600) return Math.floor(seg / 60) + "min" + (seg % 60 ? " " + (seg % 60) + "s" : "");
  return Math.floor(seg / 3600) + "h " + Math.floor((seg % 3600) / 60) + "min";
}

function rotuloStatus(s) {
  return s === "aberta" ? "Aberta" : s === "andamento" ? "Em andamento" : "Resolvida";
}

const SOLIC_TIPOS = [
  { v: "liberacao_curso", label: "Liberação de curso" },
  { v: "outras", label: "Outras solicitações" },
];
const CAMPOS_LIB = [
  { k: "nome", label: "Nome do aluno", req: true },
  { k: "cpf", label: "CPF", req: true },
  { k: "email", label: "E-mail", req: true },
  { k: "telefone", label: "Telefone", req: true },
  { k: "endereco", label: "Endereço", area: true, req: true },
  { k: "dataCompra", label: "Data da compra", type: "date", req: true },
  { k: "codigoVenda", label: "Código da venda", req: true },
  { k: "vendedor", label: "Vendedor", req: true },
  { k: "formaVenda", label: "Forma da venda", opc: ["Guru", "Greenn", "Hotmart", "TMB", "PIX CNPJ"], req: true },
  { k: "curso", label: "Curso", req: true },
  { k: "valorTotal", label: "Valor total", req: true },
  { k: "observacoes", label: "Observações da negociação", area: true },
  { k: "anexos", label: "Anexar comprovantes", file: true },
];
const CAMPOS_OUTRAS = [
  { k: "nome", label: "Nome do aluno", req: true },
  { k: "email", label: "E-mail", req: true },
  { k: "cpf", label: "CPF", req: true },
  { k: "telefone", label: "Telefone", req: true },
  { k: "curso", label: "Curso", req: true },
  { k: "solicitacao", label: "Qual a solicitação", area: true, req: true },
  { k: "anexos", label: "Anexar comprovantes", file: true },
];

function SolicitacaoForm({ onClose, onSaved, defaults }) {
  const [tipo, setTipo] = useState("liberacao_curso");
  const [f, setF] = useState({ nome: (defaults && defaults.cliente) || "", telefone: (defaults && defaults.numero) || "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const [anexos, setAnexos] = useState([]);
  function onPickFiles(fileList) {
    const arr = Array.from(fileList || []);
    for (const file of arr) {
      if (file.size > 8 * 1024 * 1024) { alert(`"${file.name}" passa de 8MB e não foi anexado.`); continue; }
      const reader = new FileReader();
      reader.onload = () => {
        const dados = String(reader.result).split(",")[1] || "";
        setAnexos((a) => (a.length >= 5 ? a : [...a, { nome: file.name, mime: file.type || "application/octet-stream", dados }]));
      };
      reader.readAsDataURL(file);
    }
  }
  const removerAnexo = (i) => setAnexos((a) => a.filter((_, idx) => idx !== i));
  const [urg, setUrg] = useState("media");
  const defs = tipo === "liberacao_curso" ? CAMPOS_LIB : CAMPOS_OUTRAS;

  async function salvar() {
    for (const c of defs) {
      if (c.req && !c.file && !String(f[c.k] || "").trim()) { alert("Preencha: " + c.label); return; }
    }
    const campos = defs
      .filter((c) => !c.file && String(f[c.k] || "").trim())
      .map((c) => ({ label: c.label, valor: String(f[c.k]).trim() }));
    const nome = String(f.nome || "").trim();
    const telefone = String(f.telefone || "").trim();
    const tipoLabel = (SOLIC_TIPOS.find((t) => t.v === tipo) || {}).label || "Solicitação";
    const descricao = tipo === "liberacao_curso"
      ? tipoLabel + (f.curso ? " — " + String(f.curso).trim() : "")
      : String(f.solicitacao || "").trim();
    setSaving(true);
    try { const nova = await api.criarSolicitacao({ tipo, tipoLabel, urgencia: urg, cliente: nome, numero: telefone, descricao, campos, anexos }); onSaved(nova); }
    catch (e) { alert(e.message); setSaving(false); }
  }

  const renderCampo = (c) => {
    if (c.file) {
      return (
        <div className="field" key={c.k}>
          <label>{c.label}<span style={{ color: "var(--faint)", fontWeight: 400 }}> — opcional (até 5, máx 8MB cada)</span></label>
          <label className="anexo-btn">
            <I.clip style={{ width: 15, height: 15 }} /> Escolher arquivos
            <input type="file" multiple accept="image/*,application/pdf" style={{ display: "none" }} onChange={(e) => { onPickFiles(e.target.files); e.target.value = ""; }} />
          </label>
          {anexos.length > 0 && (
            <div className="anexo-list">
              {anexos.map((a, i) => (
                <div className="anexo-item" key={i}>
                  <span className="anexo-nome">{a.nome}</span>
                  <button type="button" className="anexo-x" onClick={() => removerAnexo(i)} aria-label="Remover">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    const val = f[c.k] || "";
    return (
      <div className="field" key={c.k}>
        <label>{c.label}{c.req ? " *" : <span style={{ color: "var(--faint)", fontWeight: 400 }}> — opcional</span>}</label>
        {c.opc ? (
          <select className="select" value={val} onChange={(e) => set(c.k, e.target.value)}>
            <option value="">Escolher…</option>
            {c.opc.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : c.area ? (
          <textarea className="input" rows={3} value={val} onChange={(e) => set(c.k, e.target.value)} placeholder={c.label} />
        ) : (
          <input className="input" type={c.type || "text"} value={val} onChange={(e) => set(c.k, e.target.value)} placeholder={c.label} />
        )}
      </div>
    );
  };

  return createPortal(
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="mh">
          <h3>Encaminhar pro suporte</h3>
          <p>Escolha o tipo e preencha o que tiver. O suporte recebe na hora.</p>
        </div>
        <div className="mb">
          <div className="field">
            <label>Tipo de solicitação *</label>
            <select className="select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {SOLIC_TIPOS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Nível de urgência *</label>
            <select className="select" value={urg} onChange={(e) => setUrg(e.target.value)}>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </select>
          </div>
          {defs.map(renderCampo)}
        </div>
        <div className="mf">
          <button className="btn full" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary full" onClick={salvar} disabled={saving}>{saving ? "Enviando..." : "Encaminhar pro suporte"}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PaginaSolicitacoes({ showToast, readonly }) {
  const [lista, setLista] = useState(null);
  const [rel, setRel] = useState(null);
  const [novoChamado, setNovoChamado] = useState(false);
  const [filtro, setFiltro] = useState("todas");
  const [periodo, setPeriodo] = useState("30");
  const [ia, setIa] = useState(null);
  const [iaLoad, setIaLoad] = useState(false);
  const [iaErr, setIaErr] = useState("");

  function intervalo() {
    const ate = Date.now();
    if (periodo === "tudo") return [0, ate];
    if (periodo === "hoje") return [inicioDoDia(new Date()), ate];
    const dias = Number(periodo);
    return [inicioDoDia(new Date(Date.now() - (dias - 1) * 86400000)), ate];
  }

  async function carregarLista() {
    try { setLista(await api.solicitacoes(filtro === "todas" ? "" : filtro)); }
    catch (e) { showToast("✗ " + e.message); setLista([]); }
  }
  async function carregarRel() {
    const [ini, fim] = intervalo();
    try { setRel(await api.solicitacoesRelatorio(ini, fim)); } catch (_) { setRel(null); }
  }
  useEffect(() => { carregarLista(); /* eslint-disable-next-line */ }, [filtro]);
  useEffect(() => { carregarRel(); setIa(null); setIaErr(""); /* eslint-disable-next-line */ }, [periodo]);

  async function mudar(id, status, resposta) {
    try {
      const u = await api.statusSolicitacao(id, status, resposta);
      setLista((l) => (l || []).map((x) => (x.id === u.id ? u : x)));
      carregarRel();
    } catch (e) { showToast("✗ " + e.message); }
  }
  async function gerarIA() {
    setIaLoad(true); setIaErr(""); setIa(null);
    const [ini, fim] = intervalo();
    try { const r = await api.solicitacoesIA(ini, fim); setIa(r.texto); }
    catch (e) { setIaErr(e.message); }
    finally { setIaLoad(false); }
  }

  const sit = rel && rel.situacao;
  const quemAbriu = (rel && rel.porVendedor) || [];
  const PERIODOS = [["hoje", "Hoje"], ["7", "7 dias"], ["30", "30 dias"], ["tudo", "Tudo"]];
  const FILTROS = [["todas", "Todas"], ["aberta", "Abertas"], ["andamento", "Em andamento"], ["resolvida", "Resolvidas"]];

  return (
    <div className="solx">
      <div className="solx-topo">
        <div className="solx-seg" role="group" aria-label="Período">
          {PERIODOS.map(([v, t]) => <button key={v} className={periodo === v ? "on" : ""} onClick={() => setPeriodo(v)}>{t}</button>)}
        </div>
        {readonly && <button className="onum-add" onClick={() => setNovoChamado(true)}><I.suporte className="ico" /> Abrir chamado</button>}
      </div>

      {!sit ? (
        <div className="solx-kpis">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="skel skel-card" />)}</div>
      ) : (
        <div className="solx-kpis">
          <div className="solx-kpi"><span><I.list className="ico" /> Total</span><b>{sit.total}</b><em>pedidos no período</em></div>
          <div className="solx-kpi aberta"><span><I.alert className="ico" /> Abertas</span><b>{sit.aberta}</b><em>{sit.aberta ? "esperando alguém pegar" : "nenhuma esperando"}</em></div>
          <div className="solx-kpi andamento"><span><I.clock className="ico" /> Em andamento</span><b>{sit.andamento}</b><em>sendo resolvidas</em></div>
          <div className="solx-kpi resolvida"><span><I.check className="ico" /> Resolvidas</span><b>{sit.resolvida}</b><em>{sit.taxaResolucao}% de resolução</em>
            <div className="vdx-mini-trilho"><i style={{ width: Math.min(100, sit.taxaResolucao || 0) + "%" }} /></div>
          </div>
          <div className="solx-kpi"><span><I.gauge className="ico" /> Tempo médio</span><b>{sit.tempoMedioResolverSeg ? fmtTempo(sit.tempoMedioResolverSeg) : "—"}</b><em>pra resolver um pedido</em></div>
        </div>
      )}

      <div className="solx-grade">
        <div className="solx-fila">
          <div className="solx-fila-h">
            <div><b>Fila de solicitações</b><span>{readonly ? "acompanhe os pedidos do time" : "trabalhe os pedidos e atualize o status"}</span></div>
            <div className="solx-tabs" role="group" aria-label="Status">
              {FILTROS.map(([v, t]) => <button key={v} className={filtro === v ? "on" : ""} onClick={() => setFiltro(v)}>{t}</button>)}
            </div>
          </div>
          <div className="solx-lista">
            {!lista && [0, 1, 2].map((i) => <div key={i} className="skel solx-skel" />)}
            {lista && lista.length === 0 && (
              <div className="solx-vazio"><span><I.check className="ico" /></span><b>Tudo em dia por aqui</b><small>{filtro === "todas" ? "Nenhuma solicitação ainda." : "Nenhuma solicitação com esse status."}</small></div>
            )}
            {(lista || []).map((s) => <SolicitacaoRow key={s.id} s={s} onMudar={mudar} readonly={readonly} />)}
          </div>
        </div>

        <aside className="solx-lado">
          <div className="solx-card">
            <div className="solx-card-h"><b>Quem mais abriu chamado</b></div>
            {quemAbriu.length === 0 ? <div className="solx-mini-vazio">Ninguém abriu chamado no período.</div> : quemAbriu.slice(0, 8).map((v, i) => (
              <div className="solx-rank" key={v.vendedorId}>
                <span className="solx-rank-pos">{i + 1}</span>
                <Avatar nome={v.nome} size={30} />
                <div className="solx-rank-nome"><b>{v.nome}</b><small>{v.resolvidas} de {v.total} resolvido{v.total === 1 ? "" : "s"}</small></div>
                <span className="solx-rank-n">{v.total}</span>
              </div>
            ))}
          </div>
          <div className="solx-card">
            <div className="solx-card-h">
              <b><I.brilho className="ico" /> Análise da IA</b>
              <button className="btn btn-primary btn-sm" onClick={gerarIA} disabled={iaLoad}>{iaLoad ? "Analisando…" : ia ? "Gerar de novo" : "Gerar análise"}</button>
            </div>
            {!ia && !iaErr && !iaLoad && <p className="solx-ia-dica">A IA lê os pedidos do período e mostra os assuntos que mais se repetem, com sugestões pra diminuir os chamados.</p>}
            {iaLoad && <div className="ficha-carregando"><span className="skel" /><span className="skel" /><span className="skel" /></div>}
            {iaErr && <div className="ia-erro">{iaErr}</div>}
            {ia && <div className="solx-ia-txt">{ia}</div>}
          </div>
        </aside>
      </div>

      {novoChamado && (
        <SolicitacaoForm
          onClose={() => setNovoChamado(false)}
          onSaved={() => { setNovoChamado(false); showToast("✓ Chamado enviado pro suporte"); carregarLista(); carregarRel(); }}
        />
      )}
    </div>
  );
}

function SolicitacaoRow({ s, onMudar, readonly }) {
  const [resp, setResp] = useState(s.resposta || "");
  const resolvida = s.status === "resolvida";
  return (
    <div className={"solx-item u-" + (s.urgencia || "normal") + (resolvida ? " feita" : "")}>
      <Avatar nome={s.vendedorNome} size={38} />
      <div className="solx-item-corpo">
        <div className="solx-item-topo">
          <b>{s.vendedorNome}</b>
          <span className={"sol-st " + s.status}>{rotuloStatus(s.status)}</span>
          {s.urgencia && <span className={"sol-urg " + s.urgencia}>{({ baixa: "Baixa", media: "Média", normal: "Normal", alta: "Urgente" })[s.urgencia] || s.urgencia}</span>}
          <span className="solx-quando"><I.clock className="ico" /> {fmtDataHora(s.criadoEm)}</span>
        </div>
        {s.tipoLabel && <div className="solx-tipo">{s.tipoLabel}</div>}
        <div className="sol-desc">{s.descricao}</div>
        {(s.cliente || s.numero) && (
          <div className="solx-cliente"><I.user className="ico" /> {s.cliente || "Cliente"}{s.numero ? <span className="mono">{s.numero}</span> : null}</div>
        )}
        {resolvida && s.resposta && <div className="sol-resp"><b>Resposta:</b> {s.resposta}</div>}
        {!readonly && !resolvida && (
          <input className="input sol-resp-input" value={resp} onChange={(e) => setResp(e.target.value)} placeholder="Resposta pro vendedor (opcional)" />
        )}
      </div>
      {!readonly && (
        <div className="sol-acoes">
          {s.status === "aberta" && <button className="btn btn-sm" onClick={() => onMudar(s.id, "andamento", resp)}>Em andamento</button>}
          {!resolvida && <button className="btn btn-sm btn-ok" onClick={() => onMudar(s.id, "resolvida", resp)}>Resolver</button>}
          {resolvida && <button className="btn btn-sm" onClick={() => onMudar(s.id, "aberta", "")}>Reabrir</button>}
        </div>
      )}
    </div>
  );
}

function PaginaMinhasSolicitacoes({ itens, recarregar, showToast }) {
  const [nova, setNova] = useState(false);
  const [aberta, setAberta] = useState(null);
  const [excluindo, setExcluindo] = useState(null);
  const [msg, setMsg] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [anexoChat, setAnexoChat] = useState(null);
  const threadRef = useRef(null);
  const [periodo, setPeriodo] = useState("tudo");
  const [cde, setCde] = useState("");
  const [cate, setCate] = useState("");
  const [busca, setBusca] = useState("");
  useEffect(() => {
    api.marcarSolicitacoesVistas().then(recarregar).catch(() => {});
    // eslint-disable-next-line
  }, []);
  const todas = itens || [];
  const combinaBusca = (s, q) => {
    if (!q || !q.trim()) return true;
    const termo = q.trim().toLowerCase();
    const digitos = termo.replace(/\D/g, "");
    const campos = (s.campos || []).map((c) => String(c.valor || "")).join(" ");
    const alvo = [s.cliente, s.numero, s.descricao, campos].join(" ").toLowerCase();
    if (alvo.includes(termo)) return true;
    if (digitos.length >= 3 && alvo.replace(/\D/g, "").includes(digitos)) return true;
    return false;
  };
  const lista = todas.filter((s) => dentroPeriodo(s.criadoEm, periodo, cde, cate) && combinaBusca(s, busca));
  const ativas = lista.filter((s) => s.status !== "resolvida");
  const resolvidas = lista.filter((s) => s.status === "resolvida");

  const stInfo = (st) =>
    st === "resolvida" ? { txt: "Resolvida", cls: "ok" } :
    st === "andamento" ? { txt: "Em atendimento", cls: "and" } :
    { txt: "Aguardando", cls: "ab" };
  const urgLabel = (u) => ({ baixa: "Baixa", media: "Média", alta: "Alta" })[u] || "";

  async function excluir(s) {
    if (!window.confirm("Excluir esta solicitação? Ela também será removida do suporte.")) return;
    setExcluindo(s.id);
    try { await api.excluirSolicitacao(s.id); setAberta(null); await recarregar(); showToast && showToast("✓ Solicitação excluída"); }
    catch (e) { alert(e.message); }
    setExcluindo(null);
  }

  const abertaLive = aberta ? (todas.find((x) => x.id === aberta.id) || aberta) : null;

  // enquanto o chamado está aberto, puxa novidades do suporte a cada 6s
  useEffect(() => {
    if (!aberta) { setMsg(""); setAnexoChat(null); return; }
    let vivo = true;
    const tick = () => api.sincronizarSolic(aberta.id).then((r) => { if (!vivo) return; if (r && r.removida) { setAberta(null); alert("Esse chamado foi resolvido e removido pelo suporte."); } recarregar(); }).catch(() => {});
    tick();
    const t = setInterval(() => { if (!document.hidden) tick(); }, 6000);
    return () => { vivo = false; clearInterval(t); };
    // eslint-disable-next-line
  }, [aberta && aberta.id]);

  // rola o chat pro fim quando chega mensagem nova
  const nMsgs = abertaLive && Array.isArray(abertaLive.mensagens) ? abertaLive.mensagens.length : 0;
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [nMsgs, aberta && aberta.id]);

  // marca o chat como visto ao abrir o chamado e quando chega mensagem nova com ele aberto
  useEffect(() => {
    if (!aberta) return;
    api.marcarChatVisto(aberta.id).then(() => recarregar()).catch(() => {});
    // eslint-disable-next-line
  }, [aberta && aberta.id, nMsgs]);

  function onPickChatFile(fileList) {
    const file = (fileList || [])[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { alert(`"${file.name}" passa de 8MB e não pode ser anexado.`); return; }
    const reader = new FileReader();
    reader.onload = () => setAnexoChat({ nome: file.name, mime: file.type || "application/octet-stream", dados: String(reader.result).split(",")[1] || "" });
    reader.readAsDataURL(file);
  }

  async function enviar() {
    const t = msg.trim();
    if ((!t && !anexoChat) || enviando || !aberta) return;
    setEnviando(true);
    try { await api.enviarMensagemSolic(aberta.id, t, anexoChat); setMsg(""); setAnexoChat(null); await recarregar(); }
    catch (e) { alert(e.message); }
    setEnviando(false);
  }

  const row = (s) => {
    const st = stInfo(s.status);
    const nAnexos = Array.isArray(s.anexos) ? s.anexos.length : 0;
    const naoLidas = (s.mensagens || []).filter((m) => m.autor === "suporte" && (m.ts || 0) > (s.vendedorViu || 0)).length;
    return (
      <button className="sol-row" key={s.id} onClick={() => setAberta(s)}>
        <div className="sol-row-l">
          <div className="sol-row-titulo" style={naoLidas > 0 ? { fontWeight: 800 } : undefined}>{s.descricao}</div>
          <div className="sol-row-meta">
            {s.tipoLabel ? <span>{s.tipoLabel}</span> : null}
            <span className="sol-row-dot">·</span>
            <span>{fmtDataHora(s.criadoEm)}</span>
            {nAnexos > 0 ? <><span className="sol-row-dot">·</span><span className="sol-row-clip"><I.clip style={{ width: 12, height: 12 }} /> {nAnexos}</span></> : null}
          </div>
        </div>
        <div className="sol-row-r">
          {naoLidas > 0 ? <span className="sol-row-novas"><I.chat style={{ width: 12, height: 12 }} /> {naoLidas}</span> : null}
          {s.urgencia ? <span className={"msol-urg " + s.urgencia}>{urgLabel(s.urgencia)}</span> : null}
          <span className={"msol-st " + st.cls}>{st.txt}</span>
        </div>
      </button>
    );
  };

  const detalhe = (s) => {
    const st = stInfo(s.status);
    const nAnexos = Array.isArray(s.anexos) ? s.anexos.length : 0;
    return createPortal(
      <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) setAberta(null); }}>
        <div className="modal-box sol-det">
          <div className="sol-det-top">
            <div className="sol-det-badges">
              {s.tipoLabel ? <span className="msol-tipo">{s.tipoLabel}</span> : null}
              {s.urgencia ? <span className={"msol-urg " + s.urgencia}>{urgLabel(s.urgencia)}</span> : null}
              <span className={"msol-st " + st.cls}>{st.txt}</span>
            </div>
            <button className="sol-det-x" onClick={() => setAberta(null)} title="Fechar"><I.x style={{ width: 18, height: 18 }} /></button>
          </div>
          <div className="mb sol-det-body">
            <div className="sol-det-titulo">{s.descricao}</div>
            <div className="sol-det-data">{fmtDataHora(s.criadoEm)}</div>
            {Array.isArray(s.campos) && s.campos.length > 0 && (
              <div className="sol-det-campos">
                {s.campos.map((c, i) => (
                  <div className="sol-det-campo" key={i}><span>{c.label}</span><b>{c.valor}</b></div>
                ))}
              </div>
            )}
            {nAnexos > 0 && (
              <div className="sol-det-sec">
                <div className="sol-det-sec-t">Anexos enviados</div>
                <div className="sol-det-anexos">
                  {s.anexos.map((a, i) => (
                    <div className="sol-det-anexo" key={i}><I.clip style={{ width: 13, height: 13 }} /> {a.nome}</div>
                  ))}
                </div>
              </div>
            )}
            {s.status === "resolvida" && (
              <div className="sol-det-resp">{s.resposta ? <><b>Resposta do suporte</b><p>{s.resposta}</p></> : <b>✓ Resolvido pelo suporte</b>}</div>
            )}
            <div className="sol-chat">
              <div className="sol-det-sec-t">Conversa com o suporte</div>
              <div className="sol-chat-thread" ref={threadRef}>
                {(s.mensagens || []).length === 0 ? (
                  <div className="sol-chat-vazio">Nenhuma mensagem ainda. Precisa adicionar uma informação ou tirar uma dúvida? Fale com o suporte aqui.</div>
                ) : (s.mensagens || []).map((m) => (
                  <div key={m.id} className={"sol-msg " + (m.autor === "vendedor" ? "mine" : "theirs")}>
                    <div className="sol-msg-b">
                      {m.texto ? <span>{m.texto}</span> : null}
                      {m.anexo ? <button className="sol-msg-anexo" onClick={() => api.abrirChatAnexo(s.id, m.anexo.id).catch((e) => alert(e.message))}><I.clip style={{ width: 13, height: 13 }} /> {m.anexo.nome}</button> : null}
                    </div>
                    <div className="sol-msg-m">{m.autor === "vendedor" ? "Você" : (m.autorNome || "Suporte")} · {new Date(m.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                ))}
              </div>
              {anexoChat && (
                <div className="sol-chat-anexo-pre"><I.clip style={{ width: 13, height: 13 }} /> <span>{anexoChat.nome}</span><button onClick={() => setAnexoChat(null)} title="Remover">×</button></div>
              )}
              <div className="sol-chat-comp">
                <label className="sol-chat-clip" title="Anexar arquivo">
                  <I.clip style={{ width: 17, height: 17 }} />
                  <input type="file" style={{ display: "none" }} onChange={(e) => { onPickChatFile(e.target.files); e.target.value = ""; }} />
                </label>
                <input className="sol-chat-in" value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); enviar(); } }} placeholder="Escreva uma mensagem..." />
                <button className="sol-chat-send" disabled={enviando || (!msg.trim() && !anexoChat)} onClick={enviar} title="Enviar"><I.send style={{ width: 16, height: 16 }} /></button>
              </div>
            </div>
          </div>
          <div className="sol-det-foot">
            <button className="btn sol-det-del" disabled={excluindo === s.id} onClick={() => excluir(s)}><I.trash style={{ width: 15, height: 15 }} /> Excluir</button>
            <button className="btn btn-primary" onClick={() => setAberta(null)}>Fechar</button>
          </div>
        </div>
      </div>, document.body);
  };

  return (
    <div className="msol-page">
      <div className="msol-head">
        {todas.length > 0 ? (
          <div className="sol-periodo">
            {PERIODOS.map(([v, l]) => (
              <button key={v} className={"sol-per-btn" + (periodo === v ? " on" : "")} onClick={() => setPeriodo(v)}>{l}</button>
            ))}
          </div>
        ) : <span />}
        <button className="btn btn-primary" onClick={() => setNova(true)}><I.suporte style={{ width: 15, height: 15 }} /> Nova solicitação</button>
      </div>
      {todas.length > 0 && (
        <div className="sol-busca">
          <I.search style={{ width: 16, height: 16, flexShrink: 0 }} />
          <input className="sol-busca-in" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, e-mail ou CPF do aluno..." />
          {busca ? <button className="sol-busca-x" onClick={() => setBusca("")} title="Limpar"><I.x style={{ width: 14, height: 14 }} /></button> : null}
        </div>
      )}
      {periodo === "custom" && todas.length > 0 && (
        <div className="sol-custom">
          <input type="date" className="input" value={cde} onChange={(e) => setCde(e.target.value)} />
          <span>até</span>
          <input type="date" className="input" value={cate} onChange={(e) => setCate(e.target.value)} />
        </div>
      )}
      {todas.length === 0 ? (
        <div className="msol-vazio">
          <I.suporte style={{ width: 42, height: 42, opacity: 0.35 }} />
          <div className="msol-vazio-t">Você ainda não encaminhou nenhuma solicitação</div>
          <div className="msol-vazio-s">Clique em <b>"Nova solicitação"</b> aqui em cima, ou abra uma conversa no WhatsApp e use <b>"Encaminhar pro suporte"</b>.</div>
        </div>
      ) : lista.length === 0 ? (
        <div className="msol-vazio">
          <I.suporte style={{ width: 42, height: 42, opacity: 0.35 }} />
          <div className="msol-vazio-t">Nenhuma solicitação nesse período</div>
          <div className="msol-vazio-s">Selecione outro período ou <b>"Tudo"</b>.</div>
        </div>
      ) : (
        <>
          {ativas.length > 0 && (
            <div className="msol-sec">
              <div className="msol-sec-tit">Em aberto <span className="msol-sec-n">{ativas.length}</span></div>
              {ativas.map(row)}
            </div>
          )}
          {resolvidas.length > 0 && (
            <div className="msol-sec">
              <div className="msol-sec-tit">Resolvidas <span className="msol-sec-n">{resolvidas.length}</span></div>
              {resolvidas.map(row)}
            </div>
          )}
        </>
      )}
      {nova && (
        <SolicitacaoForm
          onClose={() => setNova(false)}
          onSaved={() => { setNova(false); showToast && showToast("✓ Encaminhado para o suporte"); recarregar(); }}
        />
      )}
      {abertaLive && detalhe(abertaLive)}
    </div>
  );
}
