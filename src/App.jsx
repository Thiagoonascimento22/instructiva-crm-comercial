import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { api, getToken, setToken } from "./api.js";
import { LOGO_FULL, LOGO_LIGHT } from "./logos.js";

const AGX_CSS = `
.agx-overlay{position:fixed;inset:0;background:rgba(20,20,30,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:24px}
.agx-modal{width:min(1180px,96vw);height:min(860px,94vh);background:var(--card,#fff);border-radius:18px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.35)}
.agx-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border,#ececf0)}
.agx-head-l{display:flex;align-items:center;gap:12px}
.agx-avatar{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#7c5cf0,#6347e8);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px}
.agx-title{font-size:18px;font-weight:700;color:var(--text,#1a1a1a)}
.agx-sub{font-size:12.5px;color:var(--muted,#8a8a92);margin-top:1px}
.agx-head-r{display:flex;align-items:center;gap:10px}
.agx-btn-ghost{background:var(--bg2,#f4f4f6);border:1px solid var(--border,#e6e6ea);color:var(--text,#333);padding:9px 14px;border-radius:10px;font-size:13.5px;font-weight:600;cursor:pointer}
.agx-btn-ghost:hover{background:var(--bg3,#ececef)}
.agx-btn-primary{background:#6347e8;border:none;color:#fff;padding:9px 16px;border-radius:10px;font-size:13.5px;font-weight:600;cursor:pointer}
.agx-btn-primary:hover{background:#5638d8}
.agx-btn-primary:disabled,.agx-btn-ghost:disabled{opacity:.6;cursor:default}
.agx-x{width:36px;height:36px;border-radius:9px;border:1px solid var(--border,#e6e6ea);background:var(--card,#fff);font-size:18px;color:var(--muted,#888);cursor:pointer;display:flex;align-items:center;justify-content:center}
.agx-x:hover{background:var(--bg2,#f4f4f6)}
.agx-progress{display:flex;align-items:center;gap:12px;padding:11px 20px;border-bottom:1px solid var(--border,#ececf0)}
.agx-progress-lb{font-size:13px;color:var(--muted,#8a8a92);min-width:80px}
.agx-progress-bar{flex:1;height:7px;background:var(--bg3,#ededf0);border-radius:99px;overflow:hidden}
.agx-progress-fill{height:100%;background:#6347e8;border-radius:99px;transition:width .3s}
.agx-progress-pct{font-size:13px;font-weight:700;color:#6347e8;min-width:38px;text-align:right}
.agx-body{flex:1;display:grid;grid-template-columns:212px 1fr 300px;min-height:0}
.agx-side{border-right:1px solid var(--border,#ececf0);padding:14px 12px;overflow-y:auto;background:var(--bg1,#fafafb)}
.agx-side-grupo{margin-bottom:14px}
.agx-side-g{font-size:11px;font-weight:700;letter-spacing:.04em;color:var(--muted,#a0a0a8);padding:6px 10px 4px}
.agx-side-item{display:flex;align-items:center;gap:9px;width:100%;padding:9px 10px;border:none;background:transparent;border-radius:10px;cursor:pointer;color:var(--text,#3a3a3a);font-size:14px;text-align:left;margin-bottom:2px}
.agx-side-item:hover{background:var(--bg2,#f0f0f3)}
.agx-side-item.on{background:#fff;color:#6347e8;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.agx-side-ico{width:17px;height:17px;flex-shrink:0}
.agx-side-lb{flex:1}
.agx-dot{width:20px;height:20px;border-radius:50%;background:var(--bg3,#e8e8ec);color:var(--muted,#a8a8b0);font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.agx-dot.ok{background:#d9f5e4;color:#1a9d54}
.agx-main{padding:22px 26px;overflow-y:auto;min-width:0}
.agx-preview{border-left:1px solid var(--border,#ececf0);display:flex;flex-direction:column;background:var(--bg1,#fafafb);min-width:0}
.agx-preview-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--border,#ececf0);font-size:14px;font-weight:600;color:var(--text,#333)}
.agx-reset{background:var(--bg2,#f0f0f3);border:1px solid var(--border,#e6e6ea);color:var(--muted,#888);font-size:12px;padding:5px 10px;border-radius:8px;cursor:default}
.agx-preview-body{flex:1;padding:18px 16px;overflow-y:auto}
.agx-preview-empty{font-size:13px;color:var(--muted,#9a9aa2);text-align:center;margin-top:30px;line-height:1.6}
.agx-preview-input{display:flex;gap:8px;padding:12px;border-top:1px solid var(--border,#ececf0)}
.agx-preview-input .agx-input{flex:1;margin:0}
.agx-send{width:40px;background:#6347e8;border:none;border-radius:10px;color:#fff;cursor:default;opacity:.6}
.agx-h{font-size:16px;font-weight:700;color:var(--text,#1a1a1a);margin:0 0 4px}
.agx-psub{font-size:13px;color:var(--muted,#8a8a92);margin:0 0 14px}
.agx-field{margin-bottom:14px}
.agx-field label{display:block;font-size:13px;font-weight:600;color:var(--text2,#555);margin-bottom:5px}
.agx-input{width:100%;border:1px solid var(--border,#e2e2e8);background:var(--bg1,#fafafb);border-radius:10px;padding:10px 12px;font-size:14px;color:var(--text,#222);font-family:inherit;box-sizing:border-box;resize:vertical}
.agx-input:focus{outline:none;border-color:#6347e8;background:var(--card,#fff)}
.agx-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.agx-sep{height:1px;background:var(--border,#ececf0);margin:18px 0}
.agx-up{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:1.5px dashed var(--border2,#d2d2da);border-radius:14px;padding:26px;cursor:pointer;background:var(--bg1,#fafafb);transition:.15s}
.agx-up:hover{border-color:#6347e8;background:#f5f3ff}
.agx-up-ic{width:30px;height:30px;color:var(--muted,#7a7a82);margin-bottom:4px}
.agx-up-t{font-size:15px;font-weight:700;color:var(--text,#333)}
.agx-up-s{font-size:12.5px;color:var(--muted,#9a9aa2)}
.agx-ou{text-align:center;font-size:11.5px;font-weight:700;letter-spacing:.05em;color:var(--muted,#a8a8b0);margin:20px 0;position:relative}
.agx-ou::before,.agx-ou::after{content:"";position:absolute;top:50%;width:30%;height:1px;background:var(--border,#ececf0)}
.agx-ou::before{left:0}.agx-ou::after{right:0}
.agx-card{border:1px solid var(--border,#e6e6ea);border-radius:14px;padding:16px;margin-bottom:14px;background:var(--bg1,#fbfbfc)}
.agx-card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.agx-card-tag{font-size:11px;font-weight:700;letter-spacing:.04em;color:#6347e8;background:#efeaff;padding:4px 10px;border-radius:7px}
.agx-card-x{width:28px;height:28px;border-radius:8px;border:1px solid var(--border,#e6e6ea);background:var(--card,#fff);font-size:16px;color:var(--muted,#999);cursor:pointer}
.agx-card-x:hover{background:#fdecec;color:#d04545;border-color:#f3caca}
.agx-add{width:100%;border:1.5px dashed var(--border2,#cdcdd6);background:transparent;color:#6347e8;font-size:14px;font-weight:600;padding:13px;border-radius:12px;cursor:pointer}
.agx-add:hover{background:#f5f3ff;border-color:#6347e8}
.agx-ofertas-tit{font-size:11.5px;font-weight:700;letter-spacing:.04em;color:#1a9d54;border-left:3px solid #1a9d54;padding-left:8px;margin:16px 0 10px}
.agx-oferta{border:1px solid var(--border,#eaeaee);border-radius:10px;padding:12px;margin-bottom:10px;background:var(--card,#fff)}
.agx-add-oferta{width:100%;border:1.5px dashed #aee3c4;background:#f3fbf6;color:#1a9d54;font-size:13.5px;font-weight:600;padding:11px;border-radius:10px;cursor:pointer}
.agx-add-oferta:hover{background:#e9f7ef}
.agx-rem-link{background:none;border:none;color:#d04545;font-size:12px;cursor:pointer;padding:4px 0;margin-top:2px}
.agx-kb-list{margin-top:12px;display:flex;flex-direction:column;gap:8px}
.agx-kb-item{display:flex;align-items:center;gap:10px;border:1px solid var(--border,#e6e6ea);border-radius:10px;padding:10px 12px;background:var(--card,#fff)}
.agx-kb-ic{width:18px;height:18px;color:#6347e8;flex-shrink:0}
.agx-kb-info{flex:1;min-width:0}
.agx-kb-info b{display:block;font-size:13.5px;color:var(--text,#333);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.agx-kb-info span{font-size:12px;color:var(--muted,#9a9aa2)}
.agx-kb-x{width:26px;height:26px;border-radius:7px;border:1px solid var(--border,#e6e6ea);background:var(--card,#fff);font-size:15px;color:var(--muted,#999);cursor:pointer}
.agx-kb-x:hover{background:#fdecec;color:#d04545}
@media (prefers-color-scheme:dark){
.agx-modal{--card:#1c1c22;--bg1:#222228;--bg2:#26262e;--bg3:#2e2e36;--border:#33333d;--border2:#3d3d47;--text:#e8e8ec;--text2:#c2c2ca;--muted:#8a8a94}
.agx-side-item.on{background:#2a2a33;color:#a899f5}
.agx-card-tag{background:#2e2747;color:#a899f5}
.agx-up:hover,.agx-add:hover{background:#26213d}
}
`;


/* Portal: renderiza no <body> pra modais cobrirem a tela toda (sem ficar presos a containers com overflow) */
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
};

/* ============================ HELPERS ============================ */
const ETAPAS = [
  { id: "lead", nome: "Lead Novo", cor: "var(--lead)" },
  { id: "contato", nome: "Em Contato", cor: "var(--contato)" },
  { id: "sem_resposta", nome: "Sem Resposta", cor: "#aab2c7" },
  { id: "negociando", nome: "Negociando", cor: "var(--negociando)" },
  { id: "fechou", nome: "Fechou", cor: "var(--fechou)" },
  { id: "perdeu", nome: "Perdeu", cor: "var(--perdeu)" },
];
const corEtapa = (id) => (ETAPAS.find((e) => e.id === id) || ETAPAS[0]).cor;

function fmtMoney(n) {
  return "R$ " + (Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function iniciais(nome) {
  const p = (nome || "?").trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
}
const soDigitos = (s) => (s || "").replace(/\D/g, "");
const limpaInst = (s) => (s || "").trim();

// hora estilo WhatsApp: hoje -> HH:MM, ontem -> "ontem", senão -> DD/MM
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
function dataInputHoje() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
// tempo de espera curto: 45s, 12min, 2h10, 3d
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
  const [view, setView] = useState("painel");
  const [waTarget, setWaTarget] = useState(null);
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

  useEffect(() => {
    if (!getToken()) { setBooting(false); return; }
    api.me().then(setUser).catch(() => setToken("")).finally(() => setBooting(false));
  }, []);

  const vistaInicial = useRef(false);
  useEffect(() => {
    if (!user || vistaInicial.current) return;
    vistaInicial.current = true;
    if (user.role === "suporte") setView("solicitacoes");
  }, [user]);

  useEffect(() => {
    if (!user || user.role === "gerente" || user.role === "suporte") return;
    carregarMinhasSol();
    const t = setInterval(carregarMinhasSol, 8000);
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
    setView("painel");
  }

  if (booting) return <div className="login-wrap"><div className="spin" /></div>;
  if (!user) return <Login onDone={(u) => setUser(u)} />;
  if (user.precisaOnboarding) return <Onboarding user={user} onDone={setUser} />;

  const isGer = user.role === "gerente";
  const isSuporte = user.role === "suporte";
  const isVend = !isGer && !isSuporte;
  const badgeSol = minhasSol.filter((s) => s.status === "resolvida" && !s.resolvidoVisto).length;
  const titulos = {
    painel: { t: "Sistema Comercial", s: "Acompanhe a produtividade e a agilidade do time" },
    whatsapp: { t: "WhatsApp", s: "Acompanhe as conversas dos atendentes" },
    oficial: { t: "Disparo Oficial", s: "Disparo em massa e distribuição automática de leads" },
    minhasSolicitacoes: { t: "Minhas solicitações", s: "Acompanhe seus pedidos ao suporte" },
    ia: { t: "Análise Inteligente", s: "A IA avalia a qualidade do atendimento" },
    nps: { t: "NPS / Satisfação", s: "Notas da pesquisa, por vendedor e período" },
    solicitacoes: { t: "Solicitações de suporte", s: "Pedidos de ajuda dos vendedores e análise" },
    equipe: { t: "Equipe & Acessos", s: "Gerencie os atendentes e seus acessos" },
    config: { t: "Configurações", s: "Seus dados de acesso" },
  };
  const hora = new Date().getHours();
  const saud = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className={"shell" + (isVend ? " tema-v" : "")}>
      <aside className="sidebar">
        <div className="brand">
          <img src={(theme === "dark" || isVend) ? LOGO_LIGHT : LOGO_FULL} alt="Instructiva" />
          <div className="tag">Sistema Comercial</div>
        </div>
        <nav className="nav">
          {!isSuporte && <NavBtn ic={I.dash} label={isGer ? "Monitoria" : "Meu Painel"} active={view === "painel"} onClick={() => setView("painel")} />}
          {!isSuporte && <NavBtn ic={I.wa} label="WhatsApp" active={view === "whatsapp"} onClick={() => setView("whatsapp")} />}
          {isGer && <NavBtn ic={I.send} label="Disparo Oficial" active={view === "oficial"} onClick={() => setView("oficial")} />}
          {!isGer && !isSuporte && <NavBtn ic={I.suporte} label="Minhas solicitações" active={view === "minhasSolicitacoes"} badge={badgeSol} onClick={() => setView("minhasSolicitacoes")} />}
          {isGer && <NavBtn ic={I.spark} label="Análise IA" active={view === "ia"} onClick={() => setView("ia")} />}
          {isGer && <NavBtn ic={I.estrela} label="NPS" active={view === "nps"} onClick={() => setView("nps")} />}
          {(isGer || isSuporte) && <NavBtn ic={I.suporte} label="Solicitações" active={view === "solicitacoes"} onClick={() => setView("solicitacoes")} />}
          {isGer && <NavBtn ic={I.team} label="Equipe & Acessos" active={view === "equipe"} onClick={() => setView("equipe")} />}
          <NavBtn ic={I.cog} label="Configurações" active={view === "config"} onClick={() => setView("config")} />
        </nav>
        <div className="side-foot">
          <div className="side-user">
            <div className="avatar">{iniciais(user.nome)}</div>
            <div>
              <div className="nm">{user.nome}</div>
              <div className="rl">{isGer ? "Gerente comercial" : isSuporte ? "Suporte" : "Vendedor"}</div>
            </div>
          </div>
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === "dark" ? <I.sun className="ico" /> : <I.moon className="ico" />}
            <span>{theme === "dark" ? "Modo claro" : "Modo escuro"}</span>
          </button>
          <button className="logout" onClick={logout}>Sair</button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <div className="greet">{view === "painel" ? `${saud}, ${user.nome.split(" ")[0]} 👋` : titulos[view].t}</div>
            <div className="sub">{titulos[view].s}</div>
          </div>
        </div>
        <div className="content">
          {view === "painel" && !isSuporte && <Monitoria user={user} showToast={showToast} />}
          {view === "whatsapp" && !isSuporte && <WhatsApp user={user} showToast={showToast} target={waTarget} onTargetUsed={() => setWaTarget(null)} recarregarSol={carregarMinhasSol} />}
          {view === "oficial" && isGer && <PaginaOficial showToast={showToast} />}
          {view === "minhasSolicitacoes" && !isGer && !isSuporte && <PaginaMinhasSolicitacoes itens={minhasSol} recarregar={carregarMinhasSol} showToast={showToast} />}
          {view === "ia" && isGer && <PaginaIA user={user} showToast={showToast} />}
          {view === "nps" && isGer && <PaginaNPS showToast={showToast} />}
          {view === "solicitacoes" && (isGer || isSuporte) && <PaginaSolicitacoes showToast={showToast} readonly={isGer} />}
          {view === "equipe" && isGer && <Equipe showToast={showToast} meId={user.id} />}
          {view === "config" && <Config user={user} setUser={setUser} showToast={showToast} />}
        </div>
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function NavBtn({ ic: Ico, label, active, onClick, badge }) {
  return (
    <button className={active ? "active" : ""} onClick={onClick}>
      <Ico className="ico" />
      <span>{label}</span>
      {badge > 0 && <span className="nav-badge">{badge}</span>}
    </button>
  );
}

/* ============================ LOGIN ============================ */
function Login({ onDone }) {
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
    <div className="login-wrap">
      <form className="login-card" onSubmit={entrar}>
        <img className="logo" src={dark ? LOGO_LIGHT : LOGO_FULL} alt="Instructiva" />
        <div className="ttl">Sistema Comercial</div>
        <h2>Entrar</h2>
        <p className="hi">Acesse com seu usuário e senha.</p>
        {err && <div className="err">{err}</div>}
        <div className="field">
          <label>Usuário</label>
          <input className="input" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="seu usuário" autoFocus />
        </div>
        <div className="field">
          <label>Senha</label>
          <input className="input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" />
        </div>
        <button className="btn btn-primary full" disabled={loading} style={{ marginTop: 6 }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

/* ============================ ONBOARDING ============================ */
function Onboarding({ user, onDone }) {
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
    <div className="login-wrap">
      <form className="login-card" onSubmit={salvar}>
        <img className="logo" src={dark ? LOGO_LIGHT : LOGO_FULL} alt="Instructiva" />
        <div className="ttl">Primeiro acesso</div>
        <h2>Seja bem-vindo(a)! 🎉</h2>
        <p className="hi">Confirme seu nome e defina uma senha sua.</p>
        <div className="field">
          <label>Seu nome</label>
          <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Maria Souza" required autoFocus />
        </div>
        <div className="field">
          <label>Nova senha</label>
          <input className="input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="mínimo 3 caracteres" />
        </div>
        <button className="btn btn-primary full" disabled={loading || !nome.trim()}>
          {loading ? "Salvando..." : "Começar"}
        </button>
      </form>
    </div>
  );
}

/* ============================ PIPELINE (KANBAN) ============================ */
function Pipeline({ user, showToast, irParaWhatsApp }) {
  const isGer = user.role === "gerente";
  const [cards, setCards] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todos");
  const [overCol, setOverCol] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [sel, setSel] = useState(null); // card aberto no drawer
  const [novo, setNovo] = useState(false); // modal novo lead
  const [importar, setImportar] = useState(false); // modal importar lista
  const [fechar, setFechar] = useState(null); // { card } -> modal valor final
  const [modoSel, setModoSel] = useState(false); // seleção em massa
  const [selSet, setSelSet] = useState(() => new Set());

  const usersMap = useMemo(() => {
    const m = {};
    users.forEach((u) => (m[u.id] = u));
    m[user.id] = m[user.id] || user;
    return m;
  }, [users, user]);

  async function carregar() {
    setLoading(true);
    try {
      const cs = await api.listCards(isGer ? filtro : null);
      setCards(cs);
      if (users.length === 0) setUsers(await api.listVendedores());
    } catch (e) {
      showToast("✗ " + e.message);
    } finally { setLoading(false); }
  }
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [filtro]);

  function nomeResp(id) {
    return usersMap[id]?.nome || "—";
  }

  async function moverPara(card, etapa) {
    if (card.etapa === etapa) return;
    if (etapa === "fechou") { setFechar({ card }); return; }
    try {
      await api.updateCard(card.id, { etapa });
      setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, etapa } : c)));
    } catch (e) { showToast("✗ " + e.message); }
  }

  // ---- drag handlers ----
  function onDrop(e, etapa) {
    e.preventDefault();
    setOverCol(null);
    const id = e.dataTransfer.getData("id") || dragId;
    const card = cards.find((c) => c.id === id);
    if (card) moverPara(card, etapa);
    setDragId(null);
  }

  // ---- seleção em massa ----
  const toggleSel = (id) => setSelSet((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const limparSel = () => setSelSet(new Set());
  const sairSel = () => { setModoSel(false); setSelSet(new Set()); };
  const allSel = cards.length > 0 && selSet.size === cards.length;
  const toggleTodos = () => setSelSet(allSel ? new Set() : new Set(cards.map((c) => c.id)));
  function toggleColuna(etapaId) {
    const ids = cards.filter((c) => c.etapa === etapaId).map((c) => c.id);
    setSelSet((s) => {
      const n = new Set(s);
      const todos = ids.length > 0 && ids.every((id) => n.has(id));
      ids.forEach((id) => (todos ? n.delete(id) : n.add(id)));
      return n;
    });
  }
  async function bulk(acao, extra) {
    if (selSet.size === 0) return;
    if (acao === "excluir" && !confirm(`Excluir ${selSet.size} lead(s)? Eles serão arquivados.`)) return;
    try {
      const r = await api.bulkCards({ ids: [...selSet], acao, ...(extra || {}) });
      showToast(`✓ ${r.afetados} lead(s) atualizado(s)`);
      setSelSet(new Set());
      carregar();
    } catch (e) { showToast("✗ " + e.message); }
  }

  const stats = useMemo(() => {
    const ativos = cards.filter((c) => !["fechou", "perdeu"].includes(c.etapa));
    const fechados = cards.filter((c) => c.etapa === "fechou");
    const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
    const fechadosMes = fechados.filter((c) => (c.atualizadoEm || 0) >= inicioMes.getTime());
    const totalMes = fechadosMes.reduce((s, c) => s + (c.valorFinal || 0), 0);
    const totalNeg = cards.filter((c) => c.etapa === "negociando").reduce((s, c) => s + (c.valorEstimado || 0), 0);
    return { abertos: ativos.length, fechadosMes: fechadosMes.length, totalMes, totalNeg };
  }, [cards]);

  if (loading) return <div className="spin" />;

  return (
    <>
      {/* AÇÕES */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        {isGer ? (
          <select className="select" style={{ width: 230 }} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="todos">Todos os vendedores</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.nome}</option>
            ))}
          </select>
        ) : <div />}
        <div style={{ display: "flex", gap: 8 }}>
          <button className={"btn" + (modoSel ? " btn-primary" : "")} onClick={() => (modoSel ? sairSel() : setModoSel(true))}>
            <I.check style={{ width: 16, height: 16 }} /> {modoSel ? "Cancelar seleção" : "Selecionar"}
          </button>
          <button className="btn" onClick={() => setImportar(true)}>
            <I.out style={{ width: 16, height: 16, transform: "rotate(180deg)" }} /> Importar lista
          </button>
          <button className="btn btn-primary" onClick={() => setNovo(true)}>
            <I.plus style={{ width: 16, height: 16 }} /> Novo lead
          </button>
        </div>
      </div>

      {modoSel && (
        <div className="bulk-bar">
          <label className="bulk-all">
            <input type="checkbox" checked={allSel} onChange={toggleTodos} /> Todos ({cards.length})
          </label>
          <span className="bulk-count">{selSet.size} selecionado{selSet.size === 1 ? "" : "s"}</span>
          <div className="bulk-actions">
            <select className="select bulk-sel" value="" disabled={selSet.size === 0} onChange={(e) => { if (e.target.value) bulk("mover", { etapa: e.target.value }); }}>
              <option value="">Mover para…</option>
              {ETAPAS.map((et) => <option key={et.id} value={et.id}>{et.nome}</option>)}
            </select>
            <select className="select bulk-sel" value="" disabled={selSet.size === 0} onChange={(e) => { if (e.target.value) bulk("atribuir", { responsavelId: e.target.value }); }}>
              <option value="">Atribuir a…</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
            <button className="btn btn-danger btn-sm" disabled={selSet.size === 0} onClick={() => bulk("excluir")}><I.trash style={{ width: 14, height: 14 }} /> Excluir</button>
          </div>
        </div>
      )}

      {/* STATS */}
      <div className="stats">
        <div className="stat">
          <div className="lab"><span className="dot" style={{ background: "var(--contato)" }} /> Em aberto</div>
          <div className="val">{stats.abertos}</div>
        </div>
        <div className="stat">
          <div className="lab"><span className="dot" style={{ background: "var(--negociando)" }} /> Em negociação</div>
          <div className="val money">{fmtMoney(stats.totalNeg)}</div>
        </div>
        <div className="stat">
          <div className="lab"><span className="dot" style={{ background: "var(--fechou)" }} /> Fechados no mês</div>
          <div className="val">{stats.fechadosMes}</div>
        </div>
        <div className="stat">
          <div className="lab"><span className="dot" style={{ background: "var(--fechou)" }} /> Vendido no mês</div>
          <div className="val money">{fmtMoney(stats.totalMes)}</div>
        </div>
      </div>

      {/* KANBAN */}
      <div className="board">
        {ETAPAS.map((et) => {
          const lista = cards.filter((c) => c.etapa === et.id);
          return (
            <div
              key={et.id}
              className={"col" + (overCol === et.id ? " over" : "")}
              onDragOver={(e) => { e.preventDefault(); setOverCol(et.id); }}
              onDragLeave={(e) => { if (e.currentTarget === e.target) setOverCol(null); }}
              onDrop={(e) => onDrop(e, et.id)}
            >
              <div className="col-h">
                <div className="nm">
                  {modoSel && <input type="checkbox" className="col-check" checked={lista.length > 0 && lista.every((c) => selSet.has(c.id))} onChange={() => toggleColuna(et.id)} />}
                  <span className="bar" style={{ background: et.cor }} /> {et.nome}
                </div>
                <span className="cnt">{lista.length}</span>
              </div>
              <div className="col-body">
                {lista.length === 0 && <div className="col-empty">Arraste cards pra cá</div>}
                {lista.map((c) => (
                  <div
                    key={c.id}
                    className={"kcard" + (dragId === c.id ? " dragging" : "") + (modoSel && selSet.has(c.id) ? " sel" : "")}
                    style={{ borderLeftColor: et.cor }}
                    draggable={!modoSel}
                    onDragStart={(e) => { e.dataTransfer.setData("id", c.id); setDragId(c.id); }}
                    onDragEnd={() => { setDragId(null); setOverCol(null); }}
                    onClick={() => (modoSel ? toggleSel(c.id) : setSel(c))}
                  >
                    {modoSel && <span className={"kcheck" + (selSet.has(c.id) ? " on" : "")}>{selSet.has(c.id) ? "✓" : ""}</span>}
                    <div className="nm">{c.cliente}</div>
                    {c.curso && <div className="kcurso">{c.curso}</div>}
                    <div className={"val" + (c.etapa === "fechou" ? " win" : "")}>
                      {c.etapa === "fechou" ? fmtMoney(c.valorFinal) : fmtMoney(c.valorEstimado)}
                    </div>
                    {c.origem && <span className="origem-tag">{c.origem}</span>}
                    <div className="meta">
                      {isGer && (
                        <span className="seller"><span className="mini-av">{iniciais(nomeResp(c.responsavelId))}</span>{nomeResp(c.responsavelId).split(" ")[0]}</span>
                      )}
                      {c.telefone && !modoSel && (
                        <button className="wa-btn" title="Abrir conversa no sistema" onClick={(e) => { e.stopPropagation(); irParaWhatsApp && irParaWhatsApp(c.telefone, c.cliente); }}>
                          <I.wa style={{ width: 16, height: 16 }} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {sel && (
        <CardDrawer
          card={sel}
          isGer={isGer}
          users={users}
          nomeResp={nomeResp}
          onClose={() => setSel(null)}
          onSaved={(c) => { setCards((cs) => cs.map((x) => (x.id === c.id ? c : x))); setSel(null); showToast("✓ Card atualizado"); }}
          onDeleted={(id) => { setCards((cs) => cs.filter((x) => x.id !== id)); setSel(null); showToast("✓ Card removido"); }}
        />
      )}

      {novo && (
        <NovoLead
          isGer={isGer}
          users={users}
          meId={user.id}
          onClose={() => setNovo(false)}
          onCreated={(c) => { setCards((cs) => [...cs, c]); setNovo(false); showToast("✓ Lead criado"); }}
        />
      )}

      {importar && (
        <ImportarLeads
          isGer={isGer}
          users={users}
          meId={user.id}
          onClose={() => setImportar(false)}
          onImported={(n) => { setImportar(false); carregar(); showToast(`✓ ${n} lead${n === 1 ? "" : "s"} importado${n === 1 ? "" : "s"}`); }}
        />
      )}

      {fechar && (
        <FecharModal
          card={fechar.card}
          onClose={() => setFechar(null)}
          onDone={(c) => { setCards((cs) => cs.map((x) => (x.id === c.id ? c : x))); setFechar(null); showToast("🎉 Venda registrada!"); }}
        />
      )}
    </>
  );
}

/* ---------- DRAWER DO CARD ---------- */
function CardDrawer({ card, isGer, users, nomeResp, onClose, onSaved, onDeleted }) {
  const [f, setF] = useState({
    cliente: card.cliente, telefone: card.telefone, valorEstimado: card.valorEstimado,
    valorFinal: card.valorFinal, etapa: card.etapa, obs: card.obs, responsavelId: card.responsavelId,
    curso: card.curso || "", origem: card.origem || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function salvar() {
    setSaving(true);
    try {
      const c = await api.updateCard(card.id, f);
      onSaved(c);
    } catch (e) { alert(e.message); setSaving(false); }
  }
  async function excluir() {
    if (!confirm(`Remover o card de "${card.cliente}"?`)) return;
    try { await api.deleteCard(card.id); onDeleted(card.id); } catch (e) { alert(e.message); }
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-h">
          <h3>Detalhes do lead</h3>
          <button className="x-btn" onClick={onClose}><I.x style={{ width: 18, height: 18 }} /></button>
        </div>
        <div className="drawer-body">
          <div className="field">
            <label>Cliente</label>
            <input className="input" value={f.cliente} onChange={(e) => set("cliente", e.target.value)} />
          </div>
          <div className="field">
            <label>WhatsApp / Telefone</label>
            <input className="input" value={f.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="Ex: 55 44 99999-9999" />
          </div>
          <div className="row2">
            <div className="field">
              <label>Curso de interesse</label>
              <input className="input" value={f.curso} onChange={(e) => set("curso", e.target.value)} placeholder="Ex: Eletrônica" />
            </div>
            <div className="field">
              <label>Origem do lead</label>
              <input className="input" value={f.origem} onChange={(e) => set("origem", e.target.value)} placeholder="Ex: Lista Instagram" />
            </div>
          </div>
          <div className="row2">
            <div className="field">
              <label>Valor estimado (R$)</label>
              <input className="input mono" type="number" step="0.01" value={f.valorEstimado} onChange={(e) => set("valorEstimado", e.target.value)} />
            </div>
            <div className="field">
              <label>Etapa</label>
              <select className="select" value={f.etapa} onChange={(e) => set("etapa", e.target.value)}>
                {ETAPAS.map((et) => <option key={et.id} value={et.id}>{et.nome}</option>)}
              </select>
            </div>
          </div>
          {f.etapa === "fechou" && (
            <div className="field">
              <label>Valor final da venda (R$)</label>
              <input className="input mono" type="number" step="0.01" value={f.valorFinal} onChange={(e) => set("valorFinal", e.target.value)} />
            </div>
          )}
          <div className="field">
            <label>{isGer ? "Vendedor responsável" : "Transferir para"}</label>
            <select className="select" value={f.responsavelId} onChange={(e) => set("responsavelId", e.target.value)}>
              {users.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Observações</label>
            <textarea className="textarea" value={f.obs} onChange={(e) => set("obs", e.target.value)} placeholder="Anotações sobre a negociação..." />
          </div>
          <button className="btn btn-danger btn-sm" onClick={excluir}><I.trash style={{ width: 15, height: 15 }} /> Remover lead</button>
        </div>
        <div className="drawer-foot">
          <button className="btn full" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary full" onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</button>
        </div>
      </div>
    </>
  );
}

/* ---------- NOVO LEAD ---------- */
function NovoLead({ isGer, users, meId, prefill, onClose, onCreated }) {
  const [f, setF] = useState({
    cliente: (prefill && prefill.cliente) || "",
    telefone: (prefill && prefill.telefone) || "",
    valorEstimado: "", curso: "", origem: (prefill && prefill.origem) || "",
    responsavelId: meId,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function criar() {
    if (!f.cliente.trim()) return;
    setSaving(true);
    try {
      const c = await api.createCard(f);
      onCreated(c);
    } catch (e) { alert(e.message); setSaving(false); }
  }

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="mh">
          <h3>{prefill ? "Cadastrar lead" : "Novo lead"}</h3>
          <p>{prefill ? "Confirme os dados e escolha o curso de interesse." : "Adicione um cliente ao topo do funil."}</p>
        </div>
        <div className="mb">
          <div className="field">
            <label>Cliente *</label>
            <input className="input" value={f.cliente} onChange={(e) => set("cliente", e.target.value)} autoFocus placeholder="Nome do cliente" />
          </div>
          <div className="field">
            <label>WhatsApp / Telefone</label>
            <input className="input" value={f.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="Ex: 55 44 99999-9999" />
          </div>
          <div className="row2">
            <div className="field">
              <label>Curso de interesse</label>
              <input className="input" value={f.curso} onChange={(e) => set("curso", e.target.value)} placeholder="Ex: Eletrônica" />
            </div>
            <div className="field">
              <label>Origem</label>
              <input className="input" value={f.origem} onChange={(e) => set("origem", e.target.value)} placeholder="Ex: WhatsApp" />
            </div>
          </div>
          <div className="field">
            <label>Valor estimado (R$)</label>
            <input className="input mono" type="number" step="0.01" value={f.valorEstimado} onChange={(e) => set("valorEstimado", e.target.value)} placeholder="0,00" />
          </div>
          {isGer && (
            <div className="field">
              <label>Vendedor responsável</label>
              <select className="select" value={f.responsavelId} onChange={(e) => set("responsavelId", e.target.value)}>
                {users.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="mf">
          <button className="btn full" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary full" onClick={criar} disabled={saving || !f.cliente.trim()}>{saving ? "Criando..." : "Criar lead"}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- MODAL FECHOU (valor final) ---------- */
function FecharModal({ card, onClose, onDone }) {
  const [valor, setValor] = useState(card.valorEstimado || "");
  const [saving, setSaving] = useState(false);

  async function confirmar() {
    setSaving(true);
    try {
      const c = await api.updateCard(card.id, { etapa: "fechou", valorFinal: Number(valor) || 0 });
      onDone(c);
    } catch (e) { alert(e.message); setSaving(false); }
  }

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="mh">
          <h3>🎉 Venda fechada!</h3>
          <p>Qual foi o valor final da venda de <b>{card.cliente}</b>?</p>
        </div>
        <div className="mb">
          <div className="field">
            <label>Valor final (R$)</label>
            <input className="input mono" type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus style={{ fontSize: 18 }} />
          </div>
        </div>
        <div className="mf">
          <button className="btn full" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary full" onClick={confirmar} disabled={saving}>{saving ? "Salvando..." : "Confirmar venda"}</button>
        </div>
      </div>
    </div>
  );
}

/* ============================ EQUIPE ============================ */
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
            <div className="avatar">{iniciais(u.nome)}</div>
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

function UserForm({ user, onClose, onSaved }) {
  const novo = !user;
  const [f, setF] = useState({
    nome: user?.nome || "", login: user?.login || "", senha: "",
    role: user?.role || "vendedor", ativo: user ? user.ativo : true,
    podeResponder: user?.podeResponder || false,
  });
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
        if (f.role === "vendedor") dados.podeResponder = f.podeResponder;
        const u = await api.createUser(dados);
        onSaved(u, true);
      } else {
        const dados = { nome: f.nome, role: f.role, ativo: f.ativo };
        if (f.login.trim() && f.login.trim() !== (user.login || "")) dados.login = f.login.trim();
        if (f.senha) dados.senha = f.senha;
        if (f.role === "vendedor") dados.podeResponder = f.podeResponder;
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
function Config({ user, setUser, showToast }) {
  const [nome, setNome] = useState(user.nome);
  const [senha, setSenha] = useState("");
  const [saving, setSaving] = useState(false);
  const isGer = user.role === "gerente";
  const [h, setH] = useState(null);
  const [savingH, setSavingH] = useState(false);
  useEffect(() => { if (isGer) api.horario().then((x) => setH(normHor(x))).catch(() => {}); /* eslint-disable-next-line */ }, []);

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
function PaginaOficial({ showToast }) {
  const [aba, setAba] = useState("disparo");
  return (
    <div className="of-wrap">
      <div className="of-tabs">
        <button className={aba === "disparo" ? "of-tab on" : "of-tab"} onClick={() => setAba("disparo")}>
          <I.send className="ico" /> Disparo
        </button>
        <button className={aba === "vendedores" ? "of-tab on" : "of-tab"} onClick={() => setAba("vendedores")}>
          <I.users className="ico" /> Vendedores
        </button>
        <button className={aba === "templates" ? "of-tab on" : "of-tab"} onClick={() => setAba("templates")}>
          <I.chat className="ico" /> Templates
        </button>
        <button className={aba === "numeros" ? "of-tab on" : "of-tab"} onClick={() => setAba("numeros")}>
          <I.wa className="ico" /> Números
        </button>
        <button className={aba === "ia" ? "of-tab on" : "of-tab"} onClick={() => setAba("ia")}>
          <I.spark className="ico" /> IA
        </button>
      </div>
      <div className="of-body">
        {aba === "disparo" && <OficialDisparo showToast={showToast} />}
        {aba === "vendedores" && <OficialVendedores showToast={showToast} />}
        {aba === "templates" && <OficialTemplates showToast={showToast} />}
        {aba === "numeros" && <OficialNumeros showToast={showToast} />}
        {aba === "ia" && <OficialIAs showToast={showToast} />}
      </div>
    </div>
  );
}

/* ---------- IA: cérebro do canal oficial (Fase 1: cadastro) ---------- */
function OficialIAs({ showToast }) {
  const [ias, setIas] = useState(null);
  const [editar, setEditar] = useState(null); // objeto IA em edição, ou {} pra nova
  const [globalAtiva, setGlobalAtiva] = useState(true);

  const carregar = () => api.ofIAs().then(setIas).catch(() => setIas([]));
  useEffect(() => {
    carregar();
    api.ofIAGlobal().then((r) => setGlobalAtiva(r.ativa !== false)).catch(() => {});
  }, []);

  async function alternarGlobal() {
    const nova = !globalAtiva;
    if (!nova && !confirm("PARAR TODAS as IAs agora?\n\nNenhuma IA vai responder leads em conversa nenhuma até você religar. Os leads continuam chegando, mas ficam sem resposta automática.")) return;
    try {
      const r = await api.ofSetIAGlobal(nova);
      setGlobalAtiva(r.ativa);
      showToast(r.ativa ? "✓ IAs religadas" : "⏸ TODAS as IAs foram paradas");
    } catch (e) { showToast("✗ " + e.message); }
  }

  async function excluir(ia) {
    if (!confirm(`Excluir a IA "${ia.nome}"?`)) return;
    try { await api.ofExcluirIA(ia.id); showToast("IA excluída"); carregar(); }
    catch (e) { showToast("✗ " + e.message); }
  }
  async function alternarAtiva(ia) {
    try { await api.ofEditarIA(ia.id, { ativa: !ia.ativa }); carregar(); }
    catch (e) { showToast("✗ " + e.message); }
  }

  return (
    <div>
      <div className="panel">
        <div className="panel-h">
          <h3>Atendentes de IA<span className="panel-sub">o cérebro que conversa com os leads do disparo</span></h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="btn btn-sm"
              onClick={alternarGlobal}
              title={globalAtiva ? "Para TODAS as IAs de uma vez (botão de emergência)" : "Religa as IAs"}
              style={globalAtiva
                ? { background: "#fff0f0", color: "#c0392b", border: "1px solid #f1b0b0" }
                : { background: "#eafaf0", color: "#1a9d54", border: "1px solid #aee3c4" }}
            >
              {globalAtiva ? "⏸ Parar todas as IAs" : "▶ Religar IAs"}
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setEditar({})}><I.plus className="ico" /> Nova IA</button>
          </div>
        </div>
        {!globalAtiva && (
          <div style={{ margin: "0 18px 14px", background: "#fff0f0", color: "#c0392b", border: "1px solid #f1b0b0", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>
            ⚠️ Todas as IAs estão PARADAS. Nenhum lead recebe resposta automática até você religar.
          </div>
        )}
        <div style={{ padding: "0 18px 18px" }}>
          <div className="ia-aviso" style={{ marginBottom: 14, fontSize: 13, color: "var(--muted)", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
            Configure tudo que a IA precisa saber. No <b>Preview ao vivo</b> (direita) você testa a conversa na hora. Cada IA é ligada a um disparo na hora de criar a campanha.
          </div>
          {!ias && <div className="spin" />}
          {ias && ias.length === 0 && <div className="dash-empty">Nenhuma IA ainda. Clique em <b>Nova IA</b> pra criar a primeira.</div>}
          {(ias || []).map((ia) => (
            <div className="sol-row big" key={ia.id} style={{ alignItems: "center" }}>
              <div className="sol-info">
                <div className="sol-top">
                  <span className={"sol-st " + (ia.ativa ? "resolvida" : "aberta")}>{ia.ativa ? "ativa" : "pausada"}</span>
                  <span className="of-pill">{ia.modo === "qualifica" ? "Qualifica → vendedor" : "Fecha sozinha"}</span>
                  <b className="sol-quem">{ia.nome}</b>
                </div>
                <div className="sol-meta" style={{ marginTop: 4 }}>
                  {(ia.config && ia.config.quemEla) ? "Persona definida" : "Sem persona"} · {(ia.config && (ia.config.pbAbertura || ia.config.pbQualificacao)) ? "playbook definido" : "sem playbook"}
                  {ia.modo === "qualifica" && ((ia.config && ia.config.escQuando) ? " · gatilho definido" : " · sem gatilho de entrega")}
                  {(ia.conhecimento && ia.conhecimento.length > 0) ? ` · ${ia.conhecimento.length} arquivo(s)` : ""}
                </div>
              </div>
              <div className="sol-acoes">
                <button className="btn btn-sm" onClick={() => alternarAtiva(ia)}>{ia.ativa ? "Pausar" : "Ativar"}</button>
                <button className="btn btn-sm" onClick={() => setEditar(ia)}>Editar</button>
                <button className="btn btn-sm" onClick={() => excluir(ia)}><I.trash style={{ width: 14, height: 14 }} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {editar && <ModalIA ia={editar} showToast={showToast} onClose={() => setEditar(null)} onSaved={() => { setEditar(null); carregar(); }} />}
    </div>
  );
}

function ModalIA({ ia, showToast, onClose, onSaved }) {
  const editando = !!ia.id;
  const [secao, setSecao] = useState("identidade");
  const [saving, setSaving] = useState(false);

  const [nome, setNome] = useState(ia.nome || "");
  const [modo, setModo] = useState(ia.modo || "fecha");
  const cfg0 = ia.config || {};
  const [c, setC] = useState({
    tomVoz: cfg0.tomVoz || "amigavel", objetivo: cfg0.objetivo || "",
    agentePadrao: !!cfg0.agentePadrao, autoResponder: !!cfg0.autoResponder,
    quemEla: cfg0.quemEla || "", comoEscreve: cfg0.comoEscreve || "",
    sempreFaz: cfg0.sempreFaz || "", nuncaFaz: cfg0.nuncaFaz || "",
    cursos: Array.isArray(cfg0.cursos) ? cfg0.cursos : [],
    objecoes: Array.isArray(cfg0.objecoes) ? cfg0.objecoes : [],
    faq: Array.isArray(cfg0.faq) ? cfg0.faq : [],
    pbAbertura: cfg0.pbAbertura || "", pbQualificacao: cfg0.pbQualificacao || "",
    pbApresentacao: cfg0.pbApresentacao || "", pbPreco: cfg0.pbPreco || "",
    pbFechamento: cfg0.pbFechamento || "", pbRecuperacao: cfg0.pbRecuperacao || "",
    escQuando: cfg0.escQuando || "", escFrase: cfg0.escFrase || "",
    escNome: cfg0.escNome || "", escTelefone: cfg0.escTelefone || "",
    encerrarCriterios: cfg0.encerrarCriterios || "",
  });
  const [kb, setKb] = useState(ia.conhecimento ? ia.conhecimento.map((k) => ({ ...k, texto: "" })) : []);
  const set = (k, v) => setC((s) => ({ ...s, [k]: v }));

  // preview ao vivo
  const [pvMsgs, setPvMsgs] = useState([]);
  const [pvInput, setPvInput] = useState("");
  const [pvLoad, setPvLoad] = useState(false);
  const pvFimRef = useRef(null);
  useEffect(() => { if (pvFimRef.current) pvFimRef.current.scrollIntoView({ behavior: "smooth" }); }, [pvMsgs, pvLoad]);

  async function pvEnviar() {
    const txt = pvInput.trim();
    if (!txt || pvLoad) return;
    const novas = [...pvMsgs, { role: "them", content: txt }];
    setPvMsgs(novas); setPvInput(""); setPvLoad(true);
    try {
      const r = await api.ofPreviewIA({
        nome: nome.trim(), modo, config: c,
        conhecimento: kb.filter((x) => x.texto).map((x) => ({ id: x.id, secao: x.secao, nome: x.nome, texto: x.texto })),
        historico: novas,
      });
      const add = [];
      if (r.resposta) add.push({ role: "me", content: r.resposta });
      if (r.passar) add.push({ role: "sys", content: "→ Aqui a IA passaria a conversa pro vendedor." });
      setPvMsgs([...novas, ...add]);
    } catch (e) {
      setPvMsgs([...novas, { role: "sys", content: "Erro: " + e.message }]);
    } finally { setPvLoad(false); }
  }

  const SECOES = [
    { g: "GERAL", itens: [
      { k: "identidade", lb: "Identidade", ic: I.estrela },
      { k: "persona", lb: "Persona", ic: I.users },
    ]},
    { g: "CONHECIMENTO", itens: [
      { k: "cursos", lb: "Cursos", ic: I.pipe },
      { k: "objecoes", lb: "Objeções", ic: I.suporte },
      { k: "faq", lb: "FAQ", ic: I.chat },
    ]},
    { g: "FLUXO", itens: [
      { k: "playbook", lb: "Playbook", ic: I.send },
      { k: "escalacao", lb: "Escalação", ic: I.out },
    ]},
  ];

  function secaoPreenchida(k) {
    if (k === "identidade") return !!(nome.trim() && c.objetivo.trim());
    if (k === "persona") return !!(c.quemEla.trim() || c.comoEscreve.trim());
    if (k === "cursos") return c.cursos.length > 0 || kb.some((x) => x.secao === "cursos");
    if (k === "objecoes") return c.objecoes.length > 0 || kb.some((x) => x.secao === "objecoes");
    if (k === "faq") return c.faq.length > 0 || kb.some((x) => x.secao === "faq");
    if (k === "playbook") return !!(c.pbAbertura.trim() || c.pbQualificacao.trim() || kb.some((x) => x.secao === "playbook"));
    if (k === "escalacao") return !!(c.escQuando.trim() || c.encerrarCriterios.trim());
    return false;
  }
  const totalSecoes = 7;
  const feitas = ["identidade", "persona", "cursos", "objecoes", "faq", "playbook", "escalacao"].filter(secaoPreenchida).length;
  const pct = Math.round((feitas / totalSecoes) * 100);

  async function anexar(secaoKey, fileList) {
    const arr = Array.from(fileList || []);
    for (const file of arr) {
      if (file.size > 6 * 1024 * 1024) { alert(`"${file.name}" passa de 6MB.`); continue; }
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = String(reader.result).split(",")[1] || "";
        try {
          const r = await api.ofExtrairArquivo(file.name, base64);
          setKb((k) => [...k, { id: "kb_" + Date.now() + Math.random().toString(36).slice(2, 6), secao: secaoKey, nome: r.nome, texto: r.texto, chars: (r.texto || "").length, criadoEm: Date.now() }]);
          showToast("✓ " + file.name + " adicionado ao conhecimento");
        } catch (e) { alert(e.message); }
      };
      reader.readAsDataURL(file);
    }
  }
  const removerKb = (id) => setKb((k) => k.filter((x) => x.id !== id));

  async function salvar() {
    if (!nome.trim()) { alert("Dê um nome pra IA"); setSecao("identidade"); return; }
    setSaving(true);
    const conhecimentoNovo = kb.filter((x) => x.texto).map((x) => ({ id: x.id, secao: x.secao, nome: x.nome, texto: x.texto, criadoEm: x.criadoEm }));
    const conhecimentoExistente = (ia.conhecimento || []).filter((old) => kb.some((x) => x.id === old.id && !x.texto));
    const dados = { nome: nome.trim(), modo, config: c, conhecimento: [...conhecimentoExistente, ...conhecimentoNovo] };
    try {
      if (editando) await api.ofEditarIA(ia.id, dados);
      else await api.ofCriarIA(dados);
      showToast(editando ? "✓ Agente salvo" : "✓ Agente criado");
      onSaved();
    } catch (e) { alert(e.message); setSaving(false); }
  }

  const kbDaSecao = (s) => kb.filter((x) => x.secao === s);

  const Upload = ({ sec, titulo, sub }) => (
    <label className="agx-up">
      <input type="file" accept=".txt,.md,.csv,.pdf,.doc,.docx" multiple style={{ display: "none" }} onChange={(e) => { anexar(sec, e.target.files); e.target.value = ""; }} />
      <I.out className="agx-up-ic" />
      <div className="agx-up-t">{titulo || "Anexar PDF, DOC ou TXT"}</div>
      <div className="agx-up-s">{sub || "Clique para selecionar"}</div>
    </label>
  );

  const ListaKb = ({ sec }) => (
    kbDaSecao(sec).length > 0 ? (
      <div className="agx-kb-list">
        {kbDaSecao(sec).map((k) => (
          <div className="agx-kb-item" key={k.id}>
            <I.pipe className="agx-kb-ic" />
            <div className="agx-kb-info"><b>{k.nome}</b><span>{(k.chars || 0).toLocaleString("pt-BR")} caracteres lidos</span></div>
            <button className="agx-kb-x" onClick={() => removerKb(k.id)} aria-label="Remover">×</button>
          </div>
        ))}
      </div>
    ) : null
  );

  return createPortal(
    <div className="agx-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <style>{AGX_CSS}</style>
      <div className="agx-modal">
        <div className="agx-head">
          <div className="agx-head-l">
            <div className="agx-avatar">IA</div>
            <div>
              <div className="agx-title">{editando ? "Editar Agente" : "Criar Agente"}</div>
              <div className="agx-sub">{feitas}/{totalSecoes} seções preenchidas</div>
            </div>
          </div>
          <div className="agx-head-r">
            <button className="agx-btn-ghost" onClick={salvar} disabled={saving} title="Salva no sistema">⤓ Exportar</button>
            <button className="agx-btn-primary" onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "✓ Salvar agente"}</button>
            <button className="agx-x" onClick={onClose} aria-label="Fechar">×</button>
          </div>
        </div>

        <div className="agx-progress">
          <span className="agx-progress-lb">Completude</span>
          <div className="agx-progress-bar"><div className="agx-progress-fill" style={{ width: pct + "%" }} /></div>
          <span className="agx-progress-pct">{pct}%</span>
        </div>

        <div className="agx-body">
          <aside className="agx-side">
            {SECOES.map((grupo) => (
              <div key={grupo.g} className="agx-side-grupo">
                <div className="agx-side-g">{grupo.g}</div>
                {grupo.itens.map((it) => {
                  const Ico = it.ic;
                  const on = secao === it.k;
                  const ok = secaoPreenchida(it.k);
                  return (
                    <button key={it.k} className={"agx-side-item" + (on ? " on" : "")} onClick={() => setSecao(it.k)}>
                      <Ico className="agx-side-ico" />
                      <span className="agx-side-lb">{it.lb}</span>
                      <span className={"agx-dot" + (ok ? " ok" : "")}>{ok ? "✓" : "−"}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </aside>

          <main className="agx-main">
            {secao === "identidade" && (
              <div>
                <h4 className="agx-h">Identificação</h4>
                <div className="agx-grid2">
                  <div className="agx-field">
                    <label>Nome do agente *</label>
                    <input className="agx-input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Clara — Inversor Solar" />
                  </div>
                  <div className="agx-field">
                    <label>Tom de voz</label>
                    <select className="agx-input" value={c.tomVoz} onChange={(e) => set("tomVoz", e.target.value)}>
                      <option value="amigavel">Amigável e próximo</option>
                      <option value="profissional">Profissional</option>
                      <option value="descontraido">Descontraído</option>
                      <option value="consultivo">Consultivo</option>
                      <option value="direto">Direto e objetivo</option>
                    </select>
                  </div>
                </div>
                <div className="agx-field">
                  <label>Objetivo principal *</label>
                  <input className="agx-input" value={c.objetivo} onChange={(e) => set("objetivo", e.target.value)} placeholder="Ex: Conduzir o lead até a matrícula no curso de Reparo de Inversor" />
                </div>
                <div className="agx-sep" />
                <h4 className="agx-h">O que ela faz</h4>
                <div className="agx-field">
                  <select className="agx-input" value={modo} onChange={(e) => setModo(e.target.value)}>
                    <option value="fecha">Fecha a venda sozinha (não passa pro vendedor)</option>
                    <option value="qualifica">Qualifica e passa pro vendedor quando o lead esquenta</option>
                  </select>
                </div>
              </div>
            )}

            {secao === "persona" && (
              <div>
                <h4 className="agx-h">Personalidade</h4>
                <div className="agx-field">
                  <label>Quem ela é</label>
                  <textarea className="agx-input" rows={4} value={c.quemEla} onChange={(e) => set("quemEla", e.target.value)} placeholder="Ex: Você é a Clara, consultora de vendas da Escola Instructiva..." />
                </div>
                <div className="agx-field">
                  <label>Como escreve</label>
                  <textarea className="agx-input" rows={3} value={c.comoEscreve} onChange={(e) => set("comoEscreve", e.target.value)} placeholder="Ex: Mensagens curtas, máx 3 linhas. Usa você. Sem formalidade." />
                </div>
                <div className="agx-sep" />
                <h4 className="agx-h">Regras</h4>
                <div className="agx-grid2">
                  <div className="agx-field">
                    <label>SEMPRE faz</label>
                    <textarea className="agx-input" rows={5} value={c.sempreFaz} onChange={(e) => set("sempreFaz", e.target.value)} placeholder="- Pergunta o nome no começo&#10;- Confirma interesse antes do preço" />
                  </div>
                  <div className="agx-field">
                    <label>NUNCA faz</label>
                    <textarea className="agx-input" rows={5} value={c.nuncaFaz} onChange={(e) => set("nuncaFaz", e.target.value)} placeholder="- Inventa CPF ou e-mail&#10;- Promete o que não está no material" />
                  </div>
                </div>
              </div>
            )}

            {secao === "cursos" && (
              <div>
                <h4 className="agx-h">Cursos e ofertas</h4>
                <p className="agx-psub">Anexe materiais (PDF, DOC, TXT) ou cadastre manualmente.</p>
                <Upload sec="cursos" />
                <ListaKb sec="cursos" />
                <div className="agx-ou">OU CADASTRE MANUALMENTE</div>
                {c.cursos.map((cur, i) => (
                  <div className="agx-card" key={i}>
                    <div className="agx-card-top"><span className="agx-card-tag">CURSO #{i + 1}</span>
                      <button className="agx-card-x" onClick={() => set("cursos", c.cursos.filter((_, idx) => idx !== i))} aria-label="Remover">×</button>
                    </div>
                    {[["nome", "Nome do curso"], ["carga", "Carga horária"], ["garantia", "Garantia"], ["certificado", "Certificado"]].reduce((rows, _, idx, a) => { if (idx % 2 === 0) rows.push(a.slice(idx, idx + 2)); return rows; }, []).map((par, ri) => (
                      <div className="agx-grid2" key={ri}>
                        {par.map(([f, lb]) => (
                          <div className="agx-field" key={f}><label>{lb}</label>
                            <input className="agx-input" value={cur[f] || ""} onChange={(e) => set("cursos", c.cursos.map((x, idx) => idx === i ? { ...x, [f]: e.target.value } : x))} />
                          </div>
                        ))}
                      </div>
                    ))}
                    <div className="agx-field"><label>Para quem é</label>
                      <input className="agx-input" value={cur.paraQuem || ""} onChange={(e) => set("cursos", c.cursos.map((x, idx) => idx === i ? { ...x, paraQuem: e.target.value } : x))} />
                    </div>
                    <div className="agx-field"><label>Diferencial</label>
                      <input className="agx-input" value={cur.diferencial || ""} onChange={(e) => set("cursos", c.cursos.map((x, idx) => idx === i ? { ...x, diferencial: e.target.value } : x))} />
                    </div>
                    <div className="agx-field"><label>Descrição completa</label>
                      <textarea className="agx-input" rows={3} value={cur.descricao || ""} onChange={(e) => set("cursos", c.cursos.map((x, idx) => idx === i ? { ...x, descricao: e.target.value } : x))} />
                    </div>
                    <div className="agx-ofertas-tit">OFERTAS DISPONÍVEIS</div>
                    {(cur.ofertas || []).map((of, oi) => (
                      <div className="agx-oferta" key={oi}>
                        <div className="agx-grid2">
                          <div className="agx-field"><label>Nome da oferta</label><input className="agx-input" value={of.nome || ""} onChange={(e) => set("cursos", c.cursos.map((x, idx) => idx === i ? { ...x, ofertas: x.ofertas.map((y, yi) => yi === oi ? { ...y, nome: e.target.value } : y) } : x))} placeholder="Ex: À vista PIX" /></div>
                          <div className="agx-field"><label>Valor</label><input className="agx-input" value={of.valor || ""} onChange={(e) => set("cursos", c.cursos.map((x, idx) => idx === i ? { ...x, ofertas: x.ofertas.map((y, yi) => yi === oi ? { ...y, valor: e.target.value } : y) } : x))} placeholder="Ex: R$ 1.497" /></div>
                        </div>
                        <div className="agx-field"><label>Link de pagamento</label><input className="agx-input" value={of.link || ""} onChange={(e) => set("cursos", c.cursos.map((x, idx) => idx === i ? { ...x, ofertas: x.ofertas.map((y, yi) => yi === oi ? { ...y, link: e.target.value } : y) } : x))} placeholder="https://..." /></div>
                        <div className="agx-field"><label>Observação (parcelas, condições)</label><input className="agx-input" value={of.obs || ""} onChange={(e) => set("cursos", c.cursos.map((x, idx) => idx === i ? { ...x, ofertas: x.ofertas.map((y, yi) => yi === oi ? { ...y, obs: e.target.value } : y) } : x))} placeholder="Ex: ou 18x R$ 107,93" /></div>
                        <button className="agx-rem-link" onClick={() => set("cursos", c.cursos.map((x, idx) => idx === i ? { ...x, ofertas: x.ofertas.filter((_, yi) => yi !== oi) } : x))}>remover oferta</button>
                      </div>
                    ))}
                    <button className="agx-add-oferta" onClick={() => set("cursos", c.cursos.map((x, idx) => idx === i ? { ...x, ofertas: [...(x.ofertas || []), {}] } : x))}>+ Adicionar Oferta</button>
                  </div>
                ))}
                <button className="agx-add" onClick={() => set("cursos", [...c.cursos, { ofertas: [] }])}>+ Adicionar Curso</button>
              </div>
            )}

            {secao === "objecoes" && (
              <div>
                <h4 className="agx-h">Contorno de objeções</h4>
                <p className="agx-psub">Ensine a IA a responder as objeções mais comuns.</p>
                <Upload sec="objecoes" />
                <ListaKb sec="objecoes" />
                <div className="agx-ou">OU ADICIONE MANUALMENTE</div>
                {c.objecoes.map((o, i) => (
                  <div className="agx-card" key={i}>
                    <div className="agx-card-top"><span className="agx-card-tag">OBJEÇÃO #{i + 1}</span>
                      <button className="agx-card-x" onClick={() => set("objecoes", c.objecoes.filter((_, idx) => idx !== i))} aria-label="Remover">×</button>
                    </div>
                    <div className="agx-field"><label>O que o lead diz</label><input className="agx-input" value={o.objecao || ""} onChange={(e) => set("objecoes", c.objecoes.map((x, idx) => idx === i ? { ...x, objecao: e.target.value } : x))} placeholder='Ex: "Tá caro"' /></div>
                    <div className="agx-field"><label>Como a IA responde</label><textarea className="agx-input" rows={3} value={o.resposta || ""} onChange={(e) => set("objecoes", c.objecoes.map((x, idx) => idx === i ? { ...x, resposta: e.target.value } : x))} /></div>
                  </div>
                ))}
                <button className="agx-add" onClick={() => set("objecoes", [...c.objecoes, {}])}>+ Adicionar Objeção</button>
              </div>
            )}

            {secao === "faq" && (
              <div>
                <h4 className="agx-h">Perguntas frequentes</h4>
                <p className="agx-psub">Perguntas que sempre aparecem nos atendimentos.</p>
                <Upload sec="faq" />
                <ListaKb sec="faq" />
                <div className="agx-ou">OU ADICIONE MANUALMENTE</div>
                {c.faq.map((q, i) => (
                  <div className="agx-card" key={i}>
                    <div className="agx-card-top"><span className="agx-card-tag">PERGUNTA #{i + 1}</span>
                      <button className="agx-card-x" onClick={() => set("faq", c.faq.filter((_, idx) => idx !== i))} aria-label="Remover">×</button>
                    </div>
                    <div className="agx-field"><label>Pergunta</label><input className="agx-input" value={q.pergunta || ""} onChange={(e) => set("faq", c.faq.map((x, idx) => idx === i ? { ...x, pergunta: e.target.value } : x))} /></div>
                    <div className="agx-field"><label>Resposta</label><textarea className="agx-input" rows={3} value={q.resposta || ""} onChange={(e) => set("faq", c.faq.map((x, idx) => idx === i ? { ...x, resposta: e.target.value } : x))} /></div>
                  </div>
                ))}
                <button className="agx-add" onClick={() => set("faq", [...c.faq, {}])}>+ Adicionar Pergunta</button>
              </div>
            )}

            {secao === "playbook" && (
              <div>
                <h4 className="agx-h">Script de vendas</h4>
                <p className="agx-psub">Como conduzir a venda do começo ao fim.</p>
                <Upload sec="playbook" titulo="Anexar PDF, DOC ou TXT" />
                <ListaKb sec="playbook" />
                <div className="agx-ou">OU PREENCHA AS ETAPAS</div>
                {[["pbAbertura", "1. Primeira mensagem (abertura)"], ["pbQualificacao", "2. Qualificação (perguntas-chave)"], ["pbApresentacao", "3. Apresentação do curso"], ["pbPreco", "4. Quando soltar o preço"], ["pbFechamento", "5. Fechamento"], ["pbRecuperacao", "6. Recuperação (se ele sumir)"]].map(([f, lb]) => (
                  <div className="agx-field" key={f}><label>{lb}</label>
                    <textarea className="agx-input" rows={3} value={c[f]} onChange={(e) => set(f, e.target.value)} />
                  </div>
                ))}
              </div>
            )}

            {secao === "escalacao" && (
              <div>
                <h4 className="agx-h">Escalação e encerramento</h4>
                <p className="agx-psub">Quando a IA deve passar para um humano ou encerrar.</p>
                {modo === "qualifica" && (
                  <>
                    <div className="agx-field"><label>Quando passar pra humano</label>
                      <textarea className="agx-input" rows={4} value={c.escQuando} onChange={(e) => set("escQuando", e.target.value)} placeholder="Ex: quando o lead pedir preço/link, demonstrar que quer comprar, ou pedir pra falar com um humano." />
                    </div>
                    <div className="agx-field"><label>Como passar (frase padrão)</label>
                      <textarea className="agx-input" rows={2} value={c.escFrase} onChange={(e) => set("escFrase", e.target.value)} placeholder="Ex: Vou te passar agora pro nosso especialista, só um instante 😊" />
                    </div>
                    <div className="agx-grid2">
                      <div className="agx-field"><label>Nome do humano</label><input className="agx-input" value={c.escNome} onChange={(e) => set("escNome", e.target.value)} /></div>
                      <div className="agx-field"><label>Telefone/WhatsApp</label><input className="agx-input" value={c.escTelefone} onChange={(e) => set("escTelefone", e.target.value)} /></div>
                    </div>
                    <div className="agx-sep" />
                  </>
                )}
                <h4 className="agx-h">Encerramento</h4>
                <div className="agx-field"><label>Critérios de encerramento</label>
                  <textarea className="agx-input" rows={4} value={c.encerrarCriterios} onChange={(e) => set("encerrarCriterios", e.target.value)} placeholder="Ex: encerra quando o lead comprar, dizer que não tem interesse, ou ficar 2 dias sem responder após o follow-up." />
                </div>
              </div>
            )}
          </main>

          <aside className="agx-preview">
            <div className="agx-preview-head">
              <span>▷ Preview ao vivo</span>
              <button className="agx-reset" onClick={() => setPvMsgs([])} style={{ cursor: "pointer" }}>↻ Resetar</button>
            </div>
            <div className="agx-preview-body">
              {pvMsgs.length === 0 && (
                <div className="agx-preview-empty">
                  Mande uma mensagem como se fosse o lead e veja a {nome.trim() || "IA"} responder em tempo real, usando tudo que você configurou.
                </div>
              )}
              {pvMsgs.map((m, i) => (
                m.role === "sys" ? (
                  <div key={i} style={{ textAlign: "center", fontSize: 12, color: "var(--muted,#999)", margin: "10px 0" }}>{m.content}</div>
                ) : (
                  <div key={i} style={{ display: "flex", justifyContent: m.role === "them" ? "flex-end" : "flex-start", marginBottom: 8 }}>
                    <div style={{ maxWidth: "82%", padding: "8px 11px", borderRadius: 12, fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap", background: m.role === "them" ? "#6347e8" : "var(--bg3,#ececf0)", color: m.role === "them" ? "#fff" : "var(--text,#222)" }}>{m.content}</div>
                  </div>
                )
              ))}
              {pvLoad && <div style={{ fontSize: 12.5, color: "var(--muted,#999)", padding: "4px 2px" }}>{(nome.trim() || "IA")} digitando…</div>}
              <div ref={pvFimRef} />
            </div>
            <div className="agx-preview-input">
              <input className="agx-input" placeholder="Digite como o lead..." value={pvInput} onChange={(e) => setPvInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") pvEnviar(); }} disabled={pvLoad} />
              <button className="agx-send" onClick={pvEnviar} disabled={pvLoad || !pvInput.trim()} style={{ cursor: "pointer", opacity: pvLoad || !pvInput.trim() ? 0.5 : 1 }}>➤</button>
            </div>
          </aside>
        </div>
      </div>
    </div>,
    document.body
  );
}


/* ---------- DISPARO EM MASSA ---------- */
/* ---------- DISPARO EM MASSA (assistente em etapas) ---------- */
/* ---------- DISPARO (aba de abertura + modal moderno) ---------- */
function OficialDisparo({ showToast }) {
  const [campanhas, setCampanhas] = useState([]);
  const [campSel, setCampSel] = useState(null);
  const [abrir, setAbrir] = useState(false);
  const [numeros, setNumeros] = useState([]);

  const carregarCampanhas = () => api.ofCampanhas().then(setCampanhas).catch(() => {});
  useEffect(() => {
    carregarCampanhas();
    api.ofNumeros().then((ns) => setNumeros(ns.filter((n) => n.ativo))).catch(() => {});
  }, []);

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
      {/* hero / abertura */}
      <div className="disp-hero">
        <div className="disp-hero-l">
          <div className="disp-hero-eyebrow">CANAL OFICIAL · META</div>
          <h2 className="disp-hero-titulo">Dispare e distribua leads no automático</h2>
          <p className="disp-hero-sub">Envie um template aprovado para sua lista. Quem responder cai direto na fila dos vendedores ativos.</p>
          <button className="disp-cta" onClick={() => { if (!numeros.length) return showToast("Cadastre um número na aba Números primeiro"); setAbrir(true); }}>
            <I.send className="ico" /> Novo disparo
          </button>
        </div>
      </div>

      {/* campanhas */}
      <div className="disp-camps">
        <div className="disp-camps-head">
          <h3>Campanhas</h3>
          <button className="btn btn-sm" onClick={async () => { try { await api.ofRecontar(); } catch (e) {} carregarCampanhas(); }}><I.refresh className="ico" /> Atualizar</button>
        </div>
        {campanhas.length === 0 ? (
          <div className="disp-vazio">
            <I.send className="ico-empty" />
            <p>Nenhuma campanha ainda. Clique em <b>Novo disparo</b> para começar.</p>
          </div>
        ) : (
          <div className="disp-camp-grid">
            {campanhas.map((c) => {
              const pctResp = c.enviados ? Math.round((c.responderam || 0) / c.enviados * 100) : 0;
              return (
                <div key={c.id} className="disp-camp-card" onClick={() => setCampSel(c)}>
                  <div className="disp-camp-card-top">
                    <div className="disp-camp-nome">
                      <b>{c.nome}</b>
                      <span>{new Date(c.criadoEm).toLocaleDateString("pt-BR")} · {c.template}</span>
                    </div>
                    <button className="disp-camp-x" title="Excluir" onClick={(e) => { e.stopPropagation(); excluirCampanha(c); }}><I.trash className="ico" /></button>
                  </div>
                  <div className="disp-camp-nums">
                    <div><span className="disp-camp-n">{c.enviados || 0}</span><span className="disp-camp-l">enviados</span></div>
                    <div><span className="disp-camp-n ok">{c.entregues || 0}</span><span className="disp-camp-l">entregues</span></div>
                    <div><span className="disp-camp-n resp">{c.responderam || 0}</span><span className="disp-camp-l">resp.</span></div>
                    {c.falhas > 0 && <div><span className="disp-camp-n err">{c.falhas}</span><span className="disp-camp-l">erros</span></div>}
                  </div>
                  <div className="disp-camp-bar"><div style={{ width: pctResp + "%" }} /></div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {abrir && <ModalDisparo numeros={numeros} showToast={showToast} onClose={() => setAbrir(false)} onDone={() => { setAbrir(false); setTimeout(carregarCampanhas, 1500); }} />}
      {campSel && <ModalMetricas camp={campSel} onClose={() => setCampSel(null)} />}
    </div>
  );
}

/* ---------- MODAL DE DISPARO (passo a passo moderno) ---------- */
function ModalDisparo({ numeros, showToast, onClose, onDone }) {
  const [passo, setPasso] = useState(1);
  const [numeroId, setNumeroId] = useState(numeros[0] ? numeros[0].id : "");
  const [templates, setTemplates] = useState([]);
  const [carregandoTpl, setCarregandoTpl] = useState(false);
  const [template, setTemplate] = useState(null);
  const [modoContato, setModoContato] = useState("manual");
  const [contatos, setContatos] = useState([]);
  const [textoManual, setTextoManual] = useState("");
  const [nomeCampanha, setNomeCampanha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [ias, setIas] = useState([]);
  const [iaId, setIaId] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    api.ofIAs().then((lista) => setIas((lista || []).filter((x) => x.ativa))).catch(() => setIas([]));
  }, []);

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
    setEnviando(true);
    try {
      const r = await api.ofDisparar({
        numeroId, template: template.name, idioma: template.language,
        nomeCampanha: nomeCampanha || template.name, contatos, iaId: iaId || null,
      });
      showToast(`Disparo iniciado para ${r.total} contato(s)!`);
      onDone();
    } catch (e) { showToast(e.message); }
    finally { setEnviando(false); }
  }

  const numeroSel = numeros.find((n) => n.id === numeroId);
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
              </div>
              <div className="dispm-campo">
                <label>Nome da campanha (opcional)</label>
                <input className="input" placeholder="Ex: Disparo Inversor Solar" value={nomeCampanha} onChange={(e) => setNomeCampanha(e.target.value)} />
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
              {enviando ? <><span className="spin" /> Disparando…</> : <>🚀 Disparar para {contatos.length}</>}
            </button>
          )}
        </div>
      </div>
    </div>
    </Portal>
  );
}

function ModalMetricas({ camp, onClose }) {
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
  return (
    <Portal>
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="mh"><b>{camp.nome}</b><button className="x-btn" onClick={onClose}><I.x /></button></div>
        <div className="mb">
          <div className="panel-sub" style={{ marginBottom: 14 }}>
            Template <b>{camp.template}</b> · {new Date(camp.criadoEm).toLocaleString("pt-BR")} · total {camp.total} contato(s)
          </div>
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

  const ativos = vends.filter((v) => v.oficialAtivo);
  const somaPct = ativos.reduce((s, v) => s + (Number(v.oficialPercentual) || 0), 0);

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
      <div className="panel-h"><I.users className="ico" /> Distribuição de leads</div>
      <div className="panel-sub">
        Ligue quem está atendendo agora e defina o percentual de cada um. Os leads que responderem ao disparo
        são distribuídos automaticamente só entre os <b>ativos</b>, respeitando o percentual.
      </div>

      {ativos.length > 0 && somaPct !== 100 && somaPct !== 0 && (
        <div className="of-aviso">
          ⚠️ A soma dos percentuais dos ativos é {somaPct}% (não 100%). Funciona mesmo assim — o sistema
          ajusta proporcionalmente — mas o ideal é somar 100%.
        </div>
      )}

      <div className="of-vend-list">
        {vends.map((v) => (
          <div key={v.id} className={v.oficialAtivo ? "of-vend on" : "of-vend"}>
            <button className={v.oficialAtivo ? "of-switch on" : "of-switch"} onClick={() => toggle(v)} title={v.oficialAtivo ? "Ativo — clique para pausar" : "Pausado — clique para ativar"}>
              <span className="of-switch-dot" />
            </button>
            <div className="of-vend-nome">
              <b>{v.nome}</b>
              <span className="of-vend-sub">{v.oficialLeadsRecebidos || 0} leads recebidos</span>
            </div>
            <div className="of-vend-pct">
              <input
                type="number" min="0" max="100" className="input of-pct-input"
                value={v.oficialPercentual || 0}
                onChange={(e) => setPct(v, Number(e.target.value))}
                disabled={!v.oficialAtivo}
              />
              <span>%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="of-vend-foot">
        <div className="panel-sub"><b>{ativos.length}</b> ativo(s) · soma {somaPct}%</div>
        <button className="btn btn-sm" onClick={zerar}><I.refresh className="ico" /> Zerar contadores</button>
      </div>
    </div>
  );
}

/* ---------- NÚMEROS (pool da Cloud API) ---------- */
/* ---------- TEMPLATES (listar + criar) ---------- */
function OficialTemplates({ showToast }) {
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
        <p>Cadastre um número primeiro (aba Números).</p>
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


function OficialNumeros({ showToast }) {
  const [numeros, setNumeros] = useState([]);
  const [form, setForm] = useState(null);
  const [webhook, setWebhook] = useState(null);
  const [verWebhook, setVerWebhook] = useState(false);
  const [testando, setTestando] = useState(null);

  const carregar = () => api.ofNumeros().then(setNumeros).catch((e) => showToast(e.message));
  useEffect(() => {
    carregar();
    api.ofWebhookInfo(window.location.origin).then(setWebhook).catch(() => {});
  }, []);

  async function salvar() {
    if (!form.apelido || !form.phoneNumberId || !form.token) {
      return showToast("Preencha apelido, Phone Number ID e Token");
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
      const d = await api.ofDiagnostico();
      let txt = "DIAGNÓSTICO DO WEBHOOK\n\n";
      txt += "Inscrição de cada número (recebe respostas?):\n";
      for (const n of d.numeros) {
        const st = n.inscrito === true ? "✅ SIM" : n.inscrito === false ? "❌ NÃO" : "⚠️ " + (n.erro || "?");
        txt += `• ${n.apelido}: ${st}\n`;
      }
      txt += "\nÚltimas chamadas recebidas da Meta:\n";
      if (!d.log.length) {
        txt += "(nenhuma chamada recebida ainda)\n";
      } else {
        for (const l of d.log.slice(0, 8)) {
          const hora = new Date(l.ts).toLocaleTimeString("pt-BR");
          txt += `• ${hora} — ${l.resumo}\n`;
        }
      }
      alert(txt);
    } catch (e) { showToast("❌ " + e.message); }
  }
  function copiar(txt, label) {
    navigator.clipboard?.writeText(txt).then(() => showToast(`${label} copiado!`)).catch(() => {});
  }

  return (
    <div className="onum">
      {/* cabeçalho */}
      <div className="onum-head">
        <div>
          <h3 className="onum-titulo">Números oficiais</h3>
          <p className="onum-sub">WhatsApp Cloud API conectados à sua conta Meta</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="onum-btn-ghost" onClick={diagnostico} title="Verificar se as respostas estão chegando">🔍 Diagnóstico</button>
          <button className="onum-add" onClick={() => setForm({ apelido: "", numero: "", phoneNumberId: "", wabaId: "", token: "" })}>
            <I.plus className="ico" /> Adicionar número
          </button>
        </div>
      </div>

      {/* lista de números */}
      {numeros.length === 0 ? (
        <div className="onum-vazio">
          <div className="onum-vazio-ico"><I.wa className="ico" /></div>
          <b>Nenhum número conectado ainda</b>
          <p>Conecte um número da sua conta Meta para começar a disparar.</p>
          <button className="onum-add" onClick={() => setForm({ apelido: "", numero: "", phoneNumberId: "", wabaId: "", token: "" })}>
            <I.plus className="ico" /> Adicionar número
          </button>
        </div>
      ) : (
        <div className="onum-cards">
          {numeros.map((n) => (
            <div key={n.id} className="onum-card">
              <div className="onum-card-ico"><I.wa className="ico" /></div>
              <div className="onum-card-info">
                <div className="onum-card-top">
                  <b>{n.apelido}</b>
                  <span className={n.ativo ? "onum-status on" : "onum-status off"}>
                    <i /> {n.ativo ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <span className="onum-card-num">{n.numero || "número não informado"}</span>
                <span className="onum-card-id">ID {n.phoneNumberId}</span>
              </div>
              <div className="onum-card-acoes">
                <button className="onum-acao" onClick={() => assinarWebhook(n)} title="Ativar recebimento de respostas (webhook)"><I.link className="ico" /></button>
                <button className="onum-acao" onClick={() => registrar(n)} title="Registrar número na Cloud API (use se aparecer erro de envio)"><I.key className="ico" /></button>
                <button className="onum-acao" onClick={() => testar(n)} title="Testar conexão" disabled={testando === n.id}>
                  {testando === n.id ? <span className="spin" /> : <I.check className="ico" />}
                </button>
                <button className="onum-acao" onClick={() => setForm({ ...n, token: "" })} title="Editar"><I.cog className="ico" /></button>
                <button className="onum-acao danger" onClick={() => excluir(n)} title="Excluir"><I.trash className="ico" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* webhook colapsável */}
      {webhook && (
        <div className="onum-webhook">
          <button className="onum-webhook-h" onClick={() => setVerWebhook((v) => !v)}>
            <I.link className="ico" />
            <span>Configuração do Webhook na Meta</span>
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

              <div className="onum-divisor"><span>Credenciais da Meta</span></div>
              <div className="onum-dica">
                💡 Você encontra esses dados no <b>Meta for Developers</b> → seu app → <b>WhatsApp → Configuração da API</b>. Use sempre o botão de copiar (não digite à mão).
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
                <label>Access Token {form.id && <i>(deixe vazio pra manter o atual)</i>}</label>
                <input className="mono" placeholder="EAA..." value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} />
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
function InboxOficial({ isGer, showToast, onIrParaEvolution }) {
  const [chats, setChats] = useState([]);
  const [sel, setSel] = useState(null);
  const [conversa, setConversa] = useState(null);
  const [texto, setTexto] = useState("");
  const [busca, setBusca] = useState("");
  const [vendedores, setVendedores] = useState([]);
  const [showTransfer, setShowTransfer] = useState(false);
  const [pedindoSuporte, setPedindoSuporte] = useState(false);
  const fimRef = useRef(null);

  const carregarLista = () => api.ofChats(busca).then(setChats).catch(() => {});
  useEffect(() => {
    carregarLista();
    const t = setInterval(carregarLista, 5000);
    // todos (gerente e vendedor) podem ver a lista pra transferir
    api.ofVendedoresLista().then(setVendedores).catch(() => {});
    return () => clearInterval(t);
  }, [busca]);

  useEffect(() => {
    if (!sel) { setConversa(null); return; }
    const carregar = () => api.ofChat(sel).then(setConversa).catch(() => {});
    carregar();
    const t = setInterval(carregar, 4000);
    return () => clearInterval(t);
  }, [sel]);

  useEffect(() => { if (fimRef.current) fimRef.current.scrollIntoView(); }, [conversa]);

  async function enviar() {
    if (!texto.trim() || !sel) return;
    const t = texto;
    setTexto("");
    try {
      await api.ofEnviar(sel, t);
      api.ofChat(sel).then(setConversa).catch(() => {});
    } catch (e) { showToast(e.message); setTexto(t); }
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
    (conversa.mensagens || []).forEach((m) => timeline.push({ tipo: "msg", ts: m.ts, m }));
    (conversa.notas || []).forEach((n) => timeline.push({ tipo: "nota", ts: n.ts, n }));
    timeline.sort((a, b) => (a.ts || 0) - (b.ts || 0));
  }

  return (
    <div className="of-inbox">
      <div className="of-inbox-list">
        <div className="of-inbox-search">
          <I.search className="ico" />
          <input placeholder="Buscar por nome ou número" value={busca} onChange={(e) => setBusca(e.target.value)} />
          {isGer && <button className="of-limpar-btn" title="Limpar conversas" onClick={limpar}><I.trash className="ico" /></button>}
        </div>
        {chats.length === 0 ? (
          <div className="of-inbox-empty">
            <I.chat className="ico-empty" />
            <p>Nenhuma conversa ainda.</p>
            <p className="panel-sub">Quando um lead responder ao disparo, ele aparece aqui.</p>
          </div>
        ) : chats.map((c) => (
          <button key={c.id} className={sel === c.id ? "of-chat-item on" : "of-chat-item"} onClick={() => setSel(c.id)}>
            <div className="of-chat-av">{iniciais(c.nome)}</div>
            <div className="of-chat-mid">
              <div className="of-chat-nm">
                {c.nome}
                {c.comIA && <span className="of-pill" style={{ background: "#ede9fe", color: "#6d28d9", borderColor: "#ddd6fe" }}>🤖 IA atendendo</span>}
                {c.iaPassou && <span className="of-pill" style={{ background: "#eafaf0", color: "#1a9d54", borderColor: "#aee3c4" }}>✓ IA passou</span>}
                {c.origemDisparo && <span className="of-pill">{c.campanha || "Disparo"}</span>}
              </div>
              <div className="of-chat-last">{c.ultima ? (c.ultima.role === "me" ? "Você: " : "") + c.ultima.content : "—"}</div>
              {isGer && c.vendedorNome && <div className="of-chat-vend">→ {c.vendedorNome}</div>}
              {isGer && !c.vendedorId && <div className="of-chat-vend sem">→ aguardando distribuição</div>}
            </div>
            <div className="of-chat-right">
              <span className="of-chat-hora">{c.atualizadoEm ? horaCurta(c.atualizadoEm) : ""}</span>
              {c.naoLidas > 0 && <span className="of-chat-badge">{c.naoLidas}</span>}
            </div>
          </button>
        ))}
      </div>

      <div className="of-inbox-conv">
        {!conversa ? (
          <div className="of-inbox-empty big">
            <I.chat className="ico-empty" />
            <p>Selecione uma conversa</p>
          </div>
        ) : (
          <>
            <div className="of-conv-head">
              <div className="of-chat-av">{iniciais(conversa.nome)}</div>
              <div className="of-conv-info">
                <b>{conversa.nome}</b>
                <span>{conversa.numero}{conversa.vendedorNome ? " · com " + conversa.vendedorNome : ""}</span>
              </div>
              {conversa.origemDisparo && conversa.campanha && <span className="of-pill">{conversa.campanha}</span>}
              <div className="of-conv-acoes">
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
                {!isGer && (
                  <button className="of-acao-btn" title="Abrir conversa com este lead pelo seu WhatsApp" onClick={() => chamarPeloMeu()}>
                    <I.wa className="ico" /> Meu número
                  </button>
                )}
                <button className="of-acao-btn" title="Transferir para outro vendedor" onClick={() => setShowTransfer((v) => !v)}>
                  <I.users className="ico" /> Transferir
                </button>
                <button className="of-acao-btn sup" title="Pedir ajuda ao suporte" onClick={() => setPedindoSuporte(true)}>
                  <I.suporte className="ico" /> Suporte
                </button>
                <button className="of-acao-btn fim" title="Encerrar atendimento" onClick={() => encerrar()}>
                  <I.check className="ico" /> Encerrar
                </button>
              </div>
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
            <div className="of-conv-msgs">
              {timeline.map((item, i) => (
                item.tipo === "nota" ? (
                  <div key={i} className="of-nota">
                    <I.refresh className="ico" /> {item.n.texto}
                    <span className="of-nota-hora">{horaCurta(item.n.ts)}</span>
                  </div>
                ) : (
                  <div key={i} className={"of-msg " + (item.m.role === "me" ? "me" : "them")}>
                    <div className="of-msg-bubble">
                      {item.m.template && <span className="of-msg-tpl">📤 Template (disparo)</span>}
                      {item.m.content}
                      <span className="of-msg-hora">{horaCurta(item.m.ts)}</span>
                    </div>
                  </div>
                )
              ))}
              <div ref={fimRef} />
            </div>
            {conversa.temIA && !conversa.iaPausada ? (
              <div className="of-conv-input" style={{ justifyContent: "center", gap: 10, background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 12 }}>
                <span style={{ color: "#6d28d9", fontSize: 13.5, fontWeight: 600 }}>🤖 A IA está atendendo este lead.</span>
                {isGer && (
                  <button className="btn btn-sm" style={{ background: "#6d28d9", color: "#fff", border: "none" }} onClick={() => alternarIAConversa()}>
                    Pausar IA e assumir
                  </button>
                )}
              </div>
            ) : (
              <div className="of-conv-input">
                <input
                  placeholder="Escreva uma mensagem…"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enviar()}
                />
                <button className="btn btn-primary" onClick={enviar}><I.send className="ico" /></button>
              </div>
            )}
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
    </div>
  );
}

function WhatsApp({ user, showToast, target, onTargetUsed, recarregarSol }) {
  const isGer = user.role === "gerente";
  const [canalAba, setCanalAba] = useState("evolution"); // evolution | oficial
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
  const [novoLead, setNovoLead] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [pedindoSuporte, setPedindoSuporte] = useState(false);
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
      await carregarChats(true);
      if (selRef.current) {
        try { setChat(await api.waChat(selRef.current)); } catch (_) {}
      }
    }, 6000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, []);

  useEffect(() => { if (msgsEnd.current) msgsEnd.current.scrollIntoView({ block: "end" }); }, [chat]);
  // busca no servidor (nome, número ou conteúdo das mensagens) com debounce
  useEffect(() => {
    const t = setTimeout(() => { carregarChats(true); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [busca]);

  async function abrir(id) {
    setSel(id); selRef.current = id;
    try {
      setChat(await api.waChat(id));
      setChats((cs) => cs.map((x) => (x.id === id ? { ...x, naoLidas: 0 } : x)));
    } catch (e) { showToast("✗ " + e.message); }
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
        const r = await api.waSendMidia(alvo, { tipo: "audio", base64: dataUrl, mimetype: blob.type || "audio/webm", filename: "audio.ogg" });
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
    if (alvoRef.current === target.numero) return;
    if (loading) return;
    alvoRef.current = target.numero;
    const num = soDigitos(target.numero);
    const achado = chats.find((c) => soDigitos(c.numero) === num);
    if (achado) { abrir(achado.id); }
    else { setNovaNum(num); setNova(true); }
    onTargetUsed && onTargetUsed();
    // eslint-disable-next-line
  }, [target, loading, chats]);

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
          <I.wa className="ico" /> {isGer ? "WhatsApp dos vendedores" : "Meu WhatsApp"}
        </button>
        <button className={canalAba === "oficial" ? "canal-aba on oficial" : "canal-aba oficial"} onClick={() => setCanalAba("oficial")}>
          <I.send className="ico" /> Oficial · Disparo
        </button>
      </div>

      {canalAba === "oficial" ? (
        <InboxOficial isGer={isGer} showToast={showToast} onIrParaEvolution={() => setCanalAba("evolution")} />
      ) : semEvolution ? (
        <div className="wa-grid"><div className="wa-none">
          <I.wa className="ico" />
          <div><b>Seu WhatsApp (Evolution) ainda não foi vinculado.</b><br />Peça pra gerente cadastrar o seu número, ou use a aba <b>Oficial · Disparo</b> acima.</div>
        </div></div>
      ) : (
      <>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isGer && (
            <select className="select" style={{ width: 230 }} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
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
          <div className="wa-filtros">
            <button type="button" className={"wa-filtro" + (filtroAtivo === "ativas" ? " on" : "")} onClick={() => escolherFiltro("ativas")}>Ativas</button>
            <button type="button" className={"wa-filtro" + (filtroAtivo === "aguardando" ? " on" : "")} onClick={() => escolherFiltro("aguardando")}>
              Aguardando{aguardandoCount ? <span className="wa-filtro-cnt">{aguardandoCount}</span> : null}
            </button>
            <button type="button" className={"wa-filtro" + (filtroAtivo === "arquivadas" ? " on" : "")} onClick={() => escolherFiltro("arquivadas")}>
              <I.arquivar style={{ width: 13, height: 13 }} /> Arquivadas
            </button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isGer && <button className="btn" onClick={() => setShowCfg(true)}><I.cog style={{ width: 15, height: 15 }} /> Configurar conexão</button>}
        </div>
      </div>

      <div className="wa-grid">
        <div className="wa-list">
          <div className="wa-list-h">
            <div className="wa-search"><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar lead por nome ou número..." /></div>
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

        {!chat ? (
          <div className="wa-chat"><div className="wa-none"><I.chat className="ico" /><div>Selecione uma conversa pra começar</div></div></div>
        ) : (
          <div className="wa-chat">
            <div className="wa-chat-h">
              <div className="av">{iniciais(chat.nome)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="nm">{chat.nome}</div>
                <div className="num">{chat.numero}</div>
              </div>
              {chat.nota != null && <span className="nota-badge" title="Nota da pesquisa de satisfação">⭐ {chat.nota}/5</span>}
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
            <div className="wa-msgs">
              {chat.mensagens.map((m, i) => (
                <div key={i} className={"wa-bubble " + (m.role === "me" ? "me" : "them") + (m.tipo && m.tipo !== "text" ? " com-midia" : "")}>
                  {m.tipo && m.tipo !== "text" ? (
                    <>
                      <MidiaMsg chatId={chat.id} m={m} />
                      {m.caption ? <div className="midia-cap">{m.caption}</div> : null}
                    </>
                  ) : m.content}
                  <span className="t">{new Date(m.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
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
                  <input
                    className="wa-comp-input"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); enviar(); setShowEmoji(false); } }}
                    placeholder={enviandoMidia ? "Enviando…" : "Escreva uma mensagem..."}
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
      </div>

      {qrInst && <QrModal instance={qrInst} onClose={() => setQrInst(null)} onConnected={() => { setQrInst(null); initVendedor(); showToast("🎉 WhatsApp conectado!"); }} />}
      {pedindoSuporte && chat && (
        <SolicitacaoForm
          defaults={{ cliente: chat.nome, numero: chat.numero }}
          onClose={() => setPedindoSuporte(false)}
          onSaved={() => { setPedindoSuporte(false); showToast("✓ Encaminhado para o suporte"); recarregarSol && recarregarSol(); }}
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
function NovaConversa({ isGer, instancias, minha, numeroInicial, onClose, onCriada }) {
  const [instance, setInstance] = useState(isGer ? (instancias[0]?.instance || "") : (minha?.instance || ""));
  const [numero, setNumero] = useState(numeroInicial || "");
  const [texto, setTexto] = useState("");
  const [saving, setSaving] = useState(false);

  async function enviar() {
    if (!numero.trim() || !texto.trim()) return;
    setSaving(true);
    try { const r = await api.waIniciar({ instance, numero, texto }); onCriada(r.id); }
    catch (e) { alert(e.message); setSaving(false); }
  }

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="mh"><h3>Nova conversa</h3><p>Envie a primeira mensagem pra um número.</p></div>
        <div className="mb">
          {isGer && (
            <div className="field">
              <label>Enviar pelo WhatsApp de</label>
              <select className="select" value={instance} onChange={(e) => setInstance(e.target.value)}>
                {instancias.map((i) => <option key={i.instance} value={i.instance}>{i.instance}</option>)}
              </select>
            </div>
          )}
          <div className="field">
            <label>Número (com DDD)</label>
            <input className="input" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ex: 5544999990000" autoFocus />
          </div>
          <div className="field">
            <label>Mensagem</label>
            <textarea className="textarea" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Olá! Tudo bem?" />
          </div>
        </div>
        <div className="mf">
          <button className="btn full" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary full" onClick={enviar} disabled={saving || !numero.trim() || !texto.trim()}>{saving ? "Enviando..." : "Enviar"}</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   DASHBOARD / PAINEL
   ============================================================ */
function intervaloPeriodo(preset, de, ate) {
  const agora = Date.now();
  const d = new Date();
  if (preset === "hoje") { d.setHours(0, 0, 0, 0); return [d.getTime(), agora]; }
  if (preset === "semana") { return [agora - 7 * 86400000, agora]; }
  if (preset === "mes") { return [new Date(d.getFullYear(), d.getMonth(), 1).getTime(), agora]; }
  if (preset === "custom") {
    const ini = de ? new Date(de + "T00:00:00").getTime() : 0;
    const fim = ate ? new Date(ate + "T23:59:59").getTime() : agora;
    return [ini, fim];
  }
  return [0, agora];
}
function inicioDoMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

function Dashboard({ user, showToast, irParaPipeline }) {
  const isGer = user.role === "gerente";
  const [cards, setCards] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState("mes");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  async function carregar() {
    setLoading(true);
    try {
      const cs = await api.listCards();
      setCards(cs);
      if (isGer) setUsers(await api.listUsers());
    } catch (e) { showToast("✗ " + e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, []);

  if (loading) return <div className="spin" />;

  const [ini, fim] = intervaloPeriodo(preset, de, ate);
  const dataFech = (c) => c.fechadoEm || c.atualizadoEm || 0;
  const noPeriodoVenda = (c) => c.etapa === "fechou" && dataFech(c) >= ini && dataFech(c) <= fim;
  const noPeriodoLead = (c) => (c.criadoEm || 0) >= ini && (c.criadoEm || 0) <= fim;

  const vendas = cards.filter(noPeriodoVenda);
  const totalVendido = vendas.reduce((s, c) => s + (Number(c.valorFinal) || 0), 0);
  const nVendas = vendas.length;
  const ticket = nVendas ? totalVendido / nVendas : 0;
  const leadsPeriodo = cards.filter(noPeriodoLead);
  const ganhosDoCohort = leadsPeriodo.filter((c) => c.etapa === "fechou").length;
  const conversao = leadsPeriodo.length ? (ganhosDoCohort / leadsPeriodo.length) * 100 : 0;

  const nomePeriodo = { hoje: "hoje", semana: "nos últimos 7 dias", mes: "neste mês", tudo: "no total", custom: "no período" }[preset];

  const segBtns = (
    <div className="seg">
      {[["hoje", "Hoje"], ["semana", "7 dias"], ["mes", "Este mês"], ["tudo", "Tudo"], ["custom", "Personalizado"]].map(([k, lbl]) => (
        <button key={k} className={preset === k ? "on" : ""} onClick={() => setPreset(k)}>{lbl}</button>
      ))}
    </div>
  );

  const kpis = (
    <div className="stats">
      <div className="stat"><div className="lab"><span className="dot" style={{ background: "var(--fechou)" }} />Total vendido</div><div className="val money">{fmtMoney(totalVendido)}</div></div>
      <div className="stat"><div className="lab"><span className="dot" style={{ background: "var(--indigo)" }} />Vendas fechadas</div><div className="val">{nVendas}</div></div>
      <div className="stat"><div className="lab"><span className="dot" style={{ background: "var(--negociando)" }} />Ticket médio</div><div className="val money">{fmtMoney(ticket)}</div></div>
      <div className="stat"><div className="lab"><span className="dot" style={{ background: "var(--violet)" }} />Conversão</div><div className="val">{conversao.toFixed(0)}%</div></div>
    </div>
  );

  /* ---------- VISÃO DO VENDEDOR ---------- */
  if (!isGer) {
    const vendidoMes = cards.filter((c) => c.etapa === "fechou" && dataFech(c) >= inicioDoMes()).reduce((s, c) => s + (Number(c.valorFinal) || 0), 0);
    const meta = Number(user.meta) || 0;
    const pct = meta > 0 ? Math.min(100, (vendidoMes / meta) * 100) : 0;
    const bateu = meta > 0 && vendidoMes >= meta;
    const ultimas = [...vendas].sort((a, b) => dataFech(b) - dataFech(a)).slice(0, 8);

    return (
      <div>
        <div className="dash-top">{segBtns}</div>
        {preset === "custom" && (
          <div className="custom-range">De <input type="date" value={de} onChange={(e) => setDe(e.target.value)} /> até <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
        )}
        {kpis}
        <div className="dash-grid">
          <div className="panel">
            <div className="panel-h"><h3>Minha meta do mês</h3></div>
            <div className="big-meta">
              {meta > 0 ? (
                <>
                  <div className={"pct" + (bateu ? " done" : "")}>{pct.toFixed(0)}%</div>
                  <div className="sub">{fmtMoney(vendidoMes)} de {fmtMoney(meta)}{bateu ? " — meta batida! 🎉" : ""}</div>
                  <div className="pbar"><div className={"pfill" + (bateu ? " done" : "")} style={{ width: pct + "%" }} /></div>
                </>
              ) : (
                <div className="sub">Você ainda não tem uma meta definida. Peça pra gerência cadastrar em Equipe & Acessos.</div>
              )}
            </div>
          </div>
          <div className="panel">
            <div className="panel-h"><h3>Minhas últimas vendas</h3></div>
            {ultimas.length === 0 ? (
              <div className="dash-empty">Nenhuma venda fechada {nomePeriodo}.<br />Arraste um card pra "Fechou" no Pipeline. 🎯</div>
            ) : ultimas.map((c) => (
              <div className="deal-row" key={c.id}>
                <div><div className="nm">{c.cliente}</div><div className="dt">{new Date(dataFech(c)).toLocaleDateString("pt-BR")}</div></div>
                <div className="vl">{fmtMoney(c.valorFinal)}</div>
              </div>
            ))}
          </div>
        </div>
        <AnaliseIA user={user} showToast={showToast} />
      </div>
    );
  }

  /* ---------- VISÃO DO GERENTE ---------- */
  const vendedores = users.filter((u) => u.role === "vendedor");
  const ranking = vendedores.map((v) => {
    const vs = vendas.filter((c) => c.responsavelId === v.id);
    return { ...v, total: vs.reduce((s, c) => s + (Number(c.valorFinal) || 0), 0), qtd: vs.length };
  }).sort((a, b) => b.total - a.total);
  const maxRank = Math.max(1, ...ranking.map((r) => r.total));

  const mesIni = inicioDoMes();
  const metas = vendedores.map((v) => {
    const vendidoMes = cards.filter((c) => c.etapa === "fechou" && c.responsavelId === v.id && dataFech(c) >= mesIni).reduce((s, c) => s + (Number(c.valorFinal) || 0), 0);
    const meta = Number(v.meta) || 0;
    return { ...v, vendidoMes, meta, pct: meta > 0 ? Math.min(100, (vendidoMes / meta) * 100) : 0, bateu: meta > 0 && vendidoMes >= meta };
  });
  const comMeta = metas.filter((m) => m.meta > 0);
  const bateram = comMeta.filter((m) => m.bateu).length;
  const medalhas = ["🥇", "🥈", "🥉"];

  return (
    <div>
      <div className="dash-top">{segBtns}</div>
      {preset === "custom" && (
        <div className="custom-range">De <input type="date" value={de} onChange={(e) => setDe(e.target.value)} /> até <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
      )}
      {kpis}

      {cards.length === 0 ? (
        <div className="panel"><div className="dash-empty">Ainda não há dados pra mostrar.<br /><button className="btn btn-primary" style={{ marginTop: 14 }} onClick={irParaPipeline}>Ir pro Pipeline criar leads</button></div></div>
      ) : (
        <div className="dash-grid">
          <div className="panel">
            <div className="panel-h"><h3>Ranking de vendedores</h3><span style={{ fontSize: 12, color: "var(--muted)" }}>{nomePeriodo}</span></div>
            {ranking.length === 0 ? (
              <div className="dash-empty">Nenhum vendedor cadastrado.</div>
            ) : ranking.map((r, i) => (
              <div className="rank-row" key={r.id}>
                <div className="rank-fill" style={{ width: (r.total / maxRank) * 100 + "%" }} />
                <div className={"rank-pos" + (i < 3 ? " medal" : "")}>{i < 3 && r.total > 0 ? medalhas[i] : i + 1}</div>
                <div className="rank-av">{iniciais(r.nome)}</div>
                <div className="rank-mid"><div className="nm">{r.nome}</div><div className="sub">{r.qtd} venda{r.qtd === 1 ? "" : "s"}</div></div>
                <div className="rank-val">{fmtMoney(r.total)}</div>
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="panel-h"><h3>Metas do mês</h3></div>
            {comMeta.length > 0 && (
              <div className="metas-resumo"><b>{bateram}</b> de <b>{comMeta.length}</b> {comMeta.length === 1 ? "vendedor bateu" : "vendedores bateram"} a meta este mês 🎯</div>
            )}
            {metas.length === 0 ? (
              <div className="dash-empty">Nenhum vendedor cadastrado.</div>
            ) : metas.map((m) => (
              <div className="meta-row" key={m.id}>
                <div className="meta-head">
                  <div className="nm">{iniciais(m.nome) && <span className="rank-av" style={{ width: 24, height: 24, fontSize: 10 }}>{iniciais(m.nome)}</span>}{m.nome}{m.bateu && <span className="bateu">✓ bateu</span>}</div>
                  <div className="vals">{m.meta > 0 ? `${fmtMoney(m.vendidoMes)} / ${fmtMoney(m.meta)}` : "sem meta"}</div>
                </div>
                {m.meta > 0 && <div className="pbar"><div className={"pfill" + (m.bateu ? " done" : "")} style={{ width: m.pct + "%" }} /></div>}
              </div>
            ))}
          </div>
        </div>
      )}
      <AnaliseIA user={user} vendedores={vendedores} showToast={showToast} />
    </div>
  );
}

/* ============================================================
   ANÁLISE POR IA
   ============================================================ */
function IAResultado({ res }) {
  if (!res) return null;
  return (
    <div className="ia-res">
      {res.resumo && <p className="ia-resumo">{res.resumo}</p>}
      {res.pontosFortes && res.pontosFortes.length > 0 && (
        <div className="ia-bloco">
          <div className="ia-bloco-h pos">✓ Pontos fortes</div>
          <ul>{res.pontosFortes.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
      )}
      {res.pontosMelhorar && res.pontosMelhorar.length > 0 && (
        <div className="ia-bloco">
          <div className="ia-bloco-h warn">▲ Pontos a melhorar</div>
          <ul>{res.pontosMelhorar.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
      )}
      {res.sugestoes && res.sugestoes.length > 0 && (
        <div className="ia-bloco">
          <div className="ia-bloco-h sug">💡 Sugestões</div>
          <ul>{res.sugestoes.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

function AnaliseIA({ user, vendedores, showToast }) {
  const isGer = user.role === "gerente";
  const [eqLoading, setEqLoading] = useState(false);
  const [eq, setEq] = useState(null);
  const [eqErro, setEqErro] = useState("");
  const [vState, setVState] = useState({}); // { [id]: {loading, res, erro, aberto} }
  const [meu, setMeu] = useState({ loading: false, res: null, erro: "" });

  async function analisarEquipe() {
    setEqLoading(true); setEqErro("");
    try { setEq(await api.iaEquipe()); }
    catch (e) { setEqErro(e.message); }
    finally { setEqLoading(false); }
  }
  async function analisarVendedor(id) {
    setVState((s) => ({ ...s, [id]: { ...(s[id] || {}), loading: true, erro: "", aberto: true } }));
    try {
      const r = await api.iaVendedor(id);
      setVState((s) => ({ ...s, [id]: { loading: false, res: r, erro: "", aberto: true } }));
    } catch (e) {
      setVState((s) => ({ ...s, [id]: { loading: false, res: null, erro: e.message, aberto: true } }));
    }
  }
  async function analisarMeu() {
    setMeu({ loading: true, res: null, erro: "" });
    try { setMeu({ loading: false, res: await api.iaVendedor(user.id), erro: "" }); }
    catch (e) { setMeu({ loading: false, res: null, erro: e.message }); }
  }
  function toggle(id) {
    const st = vState[id];
    if (st && (st.res || st.erro)) setVState((s) => ({ ...s, [id]: { ...st, aberto: !st.aberto } }));
    else analisarVendedor(id);
  }

  // VENDEDOR
  if (!isGer) {
    return (
      <div className="panel ia-panel" style={{ marginTop: 18 }}>
        <div className="panel-h"><h3>🤖 Minha análise</h3>
          <button className="btn btn-sm btn-primary" onClick={analisarMeu} disabled={meu.loading}>{meu.loading ? "Analisando..." : "Analisar meu atendimento"}</button>
        </div>
        <div style={{ padding: "18px 22px" }}>
          {meu.loading && <div className="ia-loading">A IA está lendo seus números e conversas... ✨</div>}
          {meu.erro && <IAErro msg={meu.erro} />}
          {!meu.loading && !meu.res && !meu.erro && <p className="ia-hint">Clique em "Analisar meu atendimento" pra receber uma avaliação dos seus resultados e do seu jeito de atender, com sugestões pra vender mais.</p>}
          <IAResultado res={meu.res} />
        </div>
      </div>
    );
  }

  // GERENTE
  return (
    <div className="panel ia-panel" style={{ marginTop: 18 }}>
      <div className="panel-h"><h3>🤖 Análise inteligente</h3>
        <button className="btn btn-sm btn-primary" onClick={analisarEquipe} disabled={eqLoading}>{eqLoading ? "Analisando..." : "Analisar equipe"}</button>
      </div>
      <div style={{ padding: "18px 22px" }}>
        {eqLoading && <div className="ia-loading">A IA está analisando o desempenho do time... ✨</div>}
        {eqErro && <IAErro msg={eqErro} />}
        {!eqLoading && !eq && !eqErro && <p className="ia-hint">Clique em "Analisar equipe" pra uma visão geral do time com sugestões. Abaixo, você pode analisar cada vendedor individualmente.</p>}
        {eq && (<><div className="ia-tag-time">Visão da equipe</div><IAResultado res={eq} /></>)}

        {vendedores && vendedores.length > 0 && (
          <div className="ia-individual">
            <div className="ia-sub-titulo">Análise individual</div>
            {vendedores.map((v) => {
              const st = vState[v.id] || {};
              return (
                <div className="ia-vend" key={v.id}>
                  <div className="ia-vend-h" onClick={() => toggle(v.id)}>
                    <div className="ia-vend-nm"><span className="rank-av" style={{ width: 28, height: 28, fontSize: 11 }}>{iniciais(v.nome)}</span>{v.nome}</div>
                    <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); analisarVendedor(v.id); }} disabled={st.loading}>
                      {st.loading ? "Analisando..." : (st.res || st.erro) ? "Atualizar" : "Analisar"}
                    </button>
                  </div>
                  {st.aberto && (
                    <div className="ia-vend-body">
                      {st.loading && <div className="ia-loading">Lendo números e conversas... ✨</div>}
                      {st.erro && <IAErro msg={st.erro} />}
                      <IAResultado res={st.res} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function IAErro({ msg }) {
  const semChave = /ANTHROPIC_API_KEY/i.test(msg || "");
  return (
    <div className="ia-erro">
      <b>Não foi possível gerar a análise.</b>
      <div style={{ marginTop: 6 }}>{msg}</div>
      {semChave && <div style={{ marginTop: 8, fontSize: 12.5 }}>👉 No Railway, em Variables, adicione <b>ANTHROPIC_API_KEY</b> com a mesma chave do Claude que você já usa no suporte.</div>}
    </div>
  );
}

/* ============================================================
   GRÁFICOS (SVG, sem dependências)
   ============================================================ */
function GraficoBarras({ dados }) {
  const max = Math.max(1, ...dados.map((d) => d.valor));
  const W = 560, H = 240, padT = 16, padB = 34, axisW = 36, gap = 18;
  const n = dados.length || 1;
  const chartH = H - padT - padB;
  const areaW = W - axisW - 10;
  const bw = Math.min(70, (areaW - gap * (n - 1)) / n);
  const ticks = 4;
  const tem = dados.some((d) => d.valor > 0);
  if (!tem) return <div className="chart-empty">Sem vendas no período pra mostrar.</div>;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="xMidYMid meet">
      <defs><linearGradient id="gradBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c08bff" /><stop offset="100%" stopColor="#8b7bff" /></linearGradient></defs>
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const y = padT + (chartH / ticks) * i;
        return <g key={i}><line x1={axisW} y1={y} x2={W - 6} y2={y} stroke="var(--line)" strokeDasharray="3 4" /><text x={axisW - 6} y={y + 3} className="chart-axis" textAnchor="end">{Math.round(max - (max / ticks) * i)}</text></g>;
      })}
      {dados.map((d, i) => {
        const h = (d.valor / max) * chartH;
        const x = axisW + 6 + i * (bw + gap);
        const y = padT + chartH - h;
        return <g key={i}>
          <rect x={x} y={y} width={bw} height={Math.max(2, h)} rx="6" fill={d.cor || "url(#gradBar)"} />
          {d.valor > 0 && <text x={x + bw / 2} y={y - 6} className="chart-val" textAnchor="middle">{d.rotulo || d.valor}</text>}
          <text x={x + bw / 2} y={H - 12} className="chart-label" textAnchor="middle">{(d.label || "").slice(0, 9)}</text>
        </g>;
      })}
    </svg>
  );
}

function GraficoRosca({ dados }) {
  const total = dados.reduce((s, d) => s + d.valor, 0);
  const r = 66, sw = 26, cx = 90, cy = 90, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 180 180" className="donut-svg">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line-2)" strokeWidth={sw} />
        {total > 0 && dados.map((d, i) => {
          if (d.valor <= 0) return null;
          const len = (d.valor / total) * c;
          const el = <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.cor} strokeWidth={sw} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc} transform={`rotate(-90 ${cx} ${cy})`} />;
          acc += len;
          return el;
        })}
        <text x={cx} y={cy - 2} textAnchor="middle" className="donut-center-n">{total}</text>
        <text x={cx} y={cy + 15} textAnchor="middle" className="donut-center-l">leads</text>
      </svg>
      <div className="donut-leg">
        {dados.map((d, i) => <div className="leg-item" key={i}><span className="leg-dot" style={{ background: d.cor }} />{d.label} <b>{d.valor}</b></div>)}
      </div>
    </div>
  );
}

function GraficoLinha({ dados }) {
  const W = 600, H = 200, padL = 38, padR = 10, padT = 14, padB = 26;
  const max = Math.max(1, ...dados.map((d) => d.valor));
  const n = dados.length;
  const innerW = W - padL - padR, innerH = H - padT - padB, ticks = 4;
  const x = (i) => padL + (n <= 1 ? innerW / 2 : (innerW / (n - 1)) * i);
  const y = (v) => padT + innerH - (v / max) * innerH;
  const pts = dados.map((d, i) => `${x(i)},${y(d.valor)}`).join(" ");
  const passo = Math.max(1, Math.ceil(n / 7));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="xMidYMid meet">
      <defs><linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b7bff" stopOpacity="0.32" /><stop offset="100%" stopColor="#8b7bff" stopOpacity="0" /></linearGradient></defs>
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const yy = padT + (innerH / ticks) * i;
        return <g key={i}><line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="var(--line)" strokeDasharray="3 4" /><text x={padL - 6} y={yy + 3} className="chart-axis" textAnchor="end">{Math.round(max - (max / ticks) * i)}</text></g>;
      })}
      {n > 1 && <polygon points={`${padL},${padT + innerH} ${pts} ${x(n - 1)},${padT + innerH}`} fill="url(#gradArea)" />}
      {n > 1 && <polyline points={pts} fill="none" stroke="#8b7bff" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      {dados.map((d, i) => <circle key={i} cx={x(i)} cy={y(d.valor)} r="3.4" fill="#fff" stroke="#8b7bff" strokeWidth="2" />)}
      {dados.map((d, i) => (i % passo === 0 || i === n - 1) ? <text key={i} x={x(i)} y={H - 8} className="chart-label" textAnchor="middle">{d.label}</text> : null)}
    </svg>
  );
}

function nice1(v) {
  const p = Math.pow(10, Math.floor(Math.log10(v || 1)));
  const f = (v || 1) / p;
  const n = f <= 1 ? 1 : f <= 1.5 ? 1.5 : f <= 2 ? 2 : f <= 3 ? 3 : f <= 4 ? 4 : f <= 5 ? 5 : f <= 6 ? 6 : f <= 8 ? 8 : 10;
  return n * p;
}
function escalaEvo(dados, fmtY) {
  const max = Math.max(1, ...dados.map((d) => d.valor));
  if (!fmtY && dados.every((d) => Number.isInteger(d.valor))) {
    const step = Math.max(1, Math.ceil(max / 4));
    return { niceMax: step * 4, step, ticks: 4 };
  }
  const nm = nice1(max);
  return { niceMax: nm, step: nm / 4, ticks: 4 };
}
function pathMonotone(pts) {
  const n = pts.length;
  if (n < 2) return n ? `M ${pts[0][0]},${pts[0][1]}` : "";
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const dx = [], dy = [], m = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = xs[i + 1] - xs[i]; dy[i] = ys[i + 1] - ys[i]; m[i] = dy[i] / (dx[i] || 1); }
  const s = []; s[0] = m[0]; s[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) s[i] = 0;
    else { const c = Math.min(Math.abs(m[i - 1]), Math.abs(m[i])); s[i] = Math.sign(m[i - 1]) * Math.min(Math.abs((m[i - 1] + m[i]) / 2), 3 * c); }
  }
  let d = `M ${xs[0]},${ys[0]}`;
  for (let i = 0; i < n - 1; i++)
    d += ` C ${xs[i] + dx[i] / 3},${ys[i] + s[i] * dx[i] / 3} ${xs[i + 1] - dx[i] / 3},${ys[i + 1] - s[i + 1] * dx[i] / 3} ${xs[i + 1]},${ys[i + 1]}`;
  return d;
}

function GraficoEvolucao({ dados, fmtY }) {
  const fmt = fmtY || ((v) => String(Math.round(v)));
  const W = 920, H = 300, padL = 58, padR = 30, padT = 24, padB = 42;
  const n = dados.length;
  const { niceMax, step, ticks } = escalaEvo(dados, fmtY);
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const X = (i) => padL + (n <= 1 ? innerW / 2 : (innerW / (n - 1)) * i);
  const Y = (v) => padT + innerH - (v / niceMax) * innerH;
  const pts = dados.map((d, i) => [X(i), Y(d.valor)]);
  const line = pathMonotone(pts);
  const area = n >= 2 ? `${line} L ${X(n - 1)},${padT + innerH} L ${X(0)},${padT + innerH} Z` : "";
  const passo = Math.max(1, Math.ceil(n / 8));
  const last = n - 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="evo-svg" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="evoFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b7bff" stopOpacity="0.26" /><stop offset="100%" stopColor="#8b7bff" stopOpacity="0" /></linearGradient>
        <linearGradient id="evoLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#8b7bff" /><stop offset="100%" stopColor="#c08bff" /></linearGradient>
      </defs>
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const yy = padT + (innerH / ticks) * i;
        const v = niceMax - step * i;
        return <g key={i}><line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="var(--line)" strokeWidth="1" strokeDasharray={i === ticks ? "0" : "2 7"} opacity={i === ticks ? 1 : 0.7} /><text x={padL - 12} y={yy + 4} className="evo-ylabel" textAnchor="end">{Math.abs(v) < 1e-9 ? "0" : fmt(v)}</text></g>;
      })}
      {area && <path d={area} fill="url(#evoFill)" />}
      {n >= 2 && <path d={line} fill="none" stroke="url(#evoLine)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
      {pts.map(([px, py], i) => (
        <g key={i}>
          <title>{dados[i].label}: {fmt(dados[i].valor)}</title>
          {i === last && <circle cx={px} cy={py} r="11" fill="#8b7bff" opacity="0.16" />}
          <circle cx={px} cy={py} r={i === last ? 6 : 4} fill="#fff" stroke="#8b7bff" strokeWidth={i === last ? 3 : 2.4} />
        </g>
      ))}
      {n >= 1 && (() => {
        const [px, py] = pts[last]; const txt = fmt(dados[last].valor);
        const w = Math.max(34, txt.length * 8.5 + 16);
        const bx = Math.min(W - padR - w, Math.max(padL, px - w / 2)); const by = Math.max(4, py - 34);
        return <g><rect x={bx} y={by} width={w} height={22} rx={7} fill="#8b7bff" /><text x={bx + w / 2} y={by + 15} className="evo-badge" textAnchor="middle">{txt}</text></g>;
      })()}
      {dados.map((d, i) => (i % passo === 0 || i === last) ? <text key={i} x={X(i)} y={H - 12} className="evo-xlabel" textAnchor={i === last ? "end" : i === 0 ? "start" : "middle"}>{d.label}</text> : null)}
    </svg>
  );
}

/* ============================================================
   PAINEL v2
   ============================================================ */
const ETAPA_INFO = [
  { k: "lead", label: "Lead", cor: "#64748b" },
  { k: "contato", label: "Em contato", cor: "#8b7bff" },
  { k: "sem_resposta", label: "Sem resposta", cor: "#aab2c7" },
  { k: "negociando", label: "Negociando", cor: "#ffb547" },
  { k: "fechou", label: "Fechou", cor: "#34e3b0" },
  { k: "perdeu", label: "Perdeu", cor: "#ff5d73" },
];

function Painel({ user, showToast, irParaPipeline }) {
  const isGer = user.role === "gerente";
  const [cards, setCards] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState("mes");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  async function carregar() {
    setLoading(true);
    try {
      setCards(await api.listCards());
      if (isGer) setUsers(await api.listUsers());
    } catch (e) { showToast("✗ " + e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, []);

  // sincroniza as datas com o preset escolhido
  useEffect(() => {
    if (preset === "custom") return;
    const [i, f] = intervaloPeriodo(preset, "", "");
    const iso = (t) => new Date(t).toISOString().slice(0, 10);
    setDe(iso(preset === "tudo" ? Date.now() : i));
    setAte(iso(f));
    // eslint-disable-next-line
  }, [preset]);

  if (loading) return <div className="spin" />;

  const [ini, fim] = intervaloPeriodo(preset, de, ate);
  const dataFech = (c) => c.fechadoEm || c.atualizadoEm || 0;
  const ativos = cards.filter((c) => !c.arquivado);
  const noPeriodoVenda = (c) => c.etapa === "fechou" && dataFech(c) >= ini && dataFech(c) <= fim;
  const noPeriodoLead = (c) => (c.criadoEm || 0) >= ini && (c.criadoEm || 0) <= fim;

  const vendas = ativos.filter(noPeriodoVenda);
  const totalVendido = vendas.reduce((s, c) => s + (Number(c.valorFinal) || 0), 0);
  const nVendas = vendas.length;
  const ticket = nVendas ? totalVendido / nVendas : 0;
  const leadsPeriodo = ativos.filter(noPeriodoLead);
  const conversao = leadsPeriodo.length ? Math.round((leadsPeriodo.filter((c) => c.etapa === "fechou").length / leadsPeriodo.length) * 100) : 0;

  // gráfico de linha: vendas por dia (período, máx ~14 pontos)
  const dias = Math.min(14, Math.max(1, Math.ceil((fim - ini) / 86400000)));
  const serie = [];
  for (let d = dias - 1; d >= 0; d--) {
    const dia = new Date(fim - d * 86400000); dia.setHours(0, 0, 0, 0);
    const ini2 = dia.getTime(), fim2 = ini2 + 86400000;
    const v = vendas.filter((c) => dataFech(c) >= ini2 && dataFech(c) < fim2).reduce((s, c) => s + (Number(c.valorFinal) || 0), 0);
    serie.push({ label: dia.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), valor: Math.round(v) });
  }

  // rosca: distribuição do funil (snapshot atual)
  const rosca = ETAPA_INFO.map((e) => ({ label: e.label, cor: e.cor, valor: ativos.filter((c) => c.etapa === e.k).length }));

  const filtroBar = (
    <div className="filtro-bar">
      <div className="seg">
        {[["hoje", "Hoje"], ["semana", "Semana"], ["mes", "Mês"], ["tudo", "Tudo"]].map(([k, lbl]) => (
          <button key={k} className={preset === k ? "on" : ""} onClick={() => setPreset(k)}>{lbl}</button>
        ))}
      </div>
      <div className="filtro-datas">
        <input type="date" value={de} onChange={(e) => { setDe(e.target.value); setPreset("custom"); }} />
        até
        <input type="date" value={ate} onChange={(e) => { setAte(e.target.value); setPreset("custom"); }} />
      </div>
      <button className="filtro-hoje" onClick={() => setPreset("hoje")}>Hoje</button>
    </div>
  );

  /* ---------- VENDEDOR ---------- */
  if (!isGer) {
    const vendidoMes = ativos.filter((c) => c.etapa === "fechou" && dataFech(c) >= inicioDoMes()).reduce((s, c) => s + (Number(c.valorFinal) || 0), 0);
    const meta = Number(user.meta) || 0;
    const pct = meta > 0 ? Math.min(100, Math.round((vendidoMes / meta) * 100)) : 0;
    const bateu = meta > 0 && vendidoMes >= meta;
    const ultimas = [...vendas].sort((a, b) => dataFech(b) - dataFech(a)).slice(0, 8);
    const roscaV = ETAPA_INFO.map((e) => ({ label: e.label, cor: e.cor, valor: ativos.filter((c) => c.etapa === e.k).length }));
    return (
      <div>
        {filtroBar}
        <div className="stats">
          <StatIco ico={I.cash} cor="#34e3b0" val={fmtMoney(totalVendido)} money lab="Vendido no período" />
          <StatIco ico={I.check} cor="#8b7bff" val={nVendas} lab="Vendas fechadas" />
          <StatIco ico={I.cash} cor="#ffb547" val={fmtMoney(ticket)} money lab="Ticket médio" />
          <StatIco ico={I.target} cor="#c08bff" val={conversao + "%"} lab="Conversão" />
        </div>
        <div className="comp-card">
          <div className="comp-info"><div className="lab">Minha meta do mês</div><div className="num">{fmtMoney(vendidoMes)} / {meta > 0 ? fmtMoney(meta) : "—"}</div></div>
          <div className="comp-bar-wrap"><div className="comp-bar"><div className={"fill" + (bateu ? " done" : "")} style={{ width: pct + "%" }} /></div><div className="comp-pct">{pct}%</div></div>
        </div>
        <div className="charts-2">
          <div className="panel"><div className="panel-h"><h3>Minha evolução<span className="panel-sub">vendas por dia</span></h3></div><div className="chart-body"><GraficoLinha dados={serie} /></div></div>
          <div className="panel"><div className="panel-h"><h3>Meu funil<span className="panel-sub">situação atual</span></h3></div><div className="chart-body"><GraficoRosca dados={roscaV} /></div></div>
        </div>
        <div className="panel">
          <div className="panel-h"><h3>Minhas últimas vendas</h3></div>
          {ultimas.length === 0 ? <div className="dash-empty">Nenhuma venda fechada no período. 🎯</div> : ultimas.map((c) => (
            <div className="deal-row" key={c.id}><div><div className="nm">{c.cliente}</div><div className="dt">{new Date(dataFech(c)).toLocaleDateString("pt-BR")}</div></div><div className="vl">{fmtMoney(c.valorFinal)}</div></div>
          ))}
        </div>
      </div>
    );
  }

  /* ---------- GERENTE ---------- */
  const vendedores = users.filter((u) => u.role === "vendedor");
  const ranking = vendedores.map((v) => {
    const vs = vendas.filter((c) => c.responsavelId === v.id);
    return { ...v, total: vs.reduce((s, c) => s + (Number(c.valorFinal) || 0), 0), qtd: vs.length };
  }).sort((a, b) => b.total - a.total);
  const maxRank = Math.max(1, ...ranking.map((r) => r.total));
  const barras = ranking.slice(0, 7).map((r) => ({ label: r.nome.split(" ")[0], valor: Math.round(r.total), rotulo: r.total >= 1000 ? "R$" + (r.total / 1000).toFixed(1) + "k" : "R$" + r.total }));

  const mesIni = inicioDoMes();
  const metas = vendedores.map((v) => {
    const vendidoMes = ativos.filter((c) => c.etapa === "fechou" && c.responsavelId === v.id && dataFech(c) >= mesIni).reduce((s, c) => s + (Number(c.valorFinal) || 0), 0);
    const meta = Number(v.meta) || 0;
    return { ...v, vendidoMes, meta, pct: meta > 0 ? Math.min(100, Math.round((vendidoMes / meta) * 100)) : 0, bateu: meta > 0 && vendidoMes >= meta };
  });
  const comMeta = metas.filter((m) => m.meta > 0);
  const bateram = comMeta.filter((m) => m.bateu).length;
  const somaMetas = comMeta.reduce((s, m) => s + m.meta, 0);
  const somaVendidoMes = metas.reduce((s, m) => s + m.vendidoMes, 0);
  const pctMeta = somaMetas > 0 ? Math.min(100, Math.round((somaVendidoMes / somaMetas) * 100)) : 0;
  const medalhas = ["🥇", "🥈", "🥉"];

  return (
    <div>
      {filtroBar}
      <div className="stats">
        <StatIco ico={I.cash} cor="#34e3b0" val={fmtMoney(totalVendido)} money lab="Total vendido" />
        <StatIco ico={I.check} cor="#8b7bff" val={nVendas} lab="Vendas fechadas" />
        <StatIco ico={I.cash} cor="#ffb547" val={fmtMoney(ticket)} money lab="Ticket médio" />
        <StatIco ico={I.target} cor="#c08bff" val={conversao + "%"} lab="Conversão" />
      </div>

      {somaMetas > 0 && (
        <div className="comp-card">
          <div className="comp-info"><div className="lab">Meta do time este mês — {bateram}/{comMeta.length} bateram</div><div className="num">{fmtMoney(somaVendidoMes)} / {fmtMoney(somaMetas)}</div></div>
          <div className="comp-bar-wrap"><div className="comp-bar"><div className={"fill" + (pctMeta >= 100 ? " done" : "")} style={{ width: pctMeta + "%" }} /></div><div className="comp-pct">{pctMeta}%</div></div>
        </div>
      )}

      <div className="charts-2">
        <div className="panel"><div className="panel-h"><h3>Vendas por vendedor<span className="panel-sub">no período</span></h3></div><div className="chart-body"><GraficoBarras dados={barras} /></div></div>
        <div className="panel"><div className="panel-h"><h3>Distribuição do funil<span className="panel-sub">situação atual</span></h3></div><div className="chart-body"><GraficoRosca dados={rosca} /></div></div>
      </div>

      <div className="panel" style={{ marginBottom: 18 }}><div className="panel-h"><h3>Evolução de vendas<span className="panel-sub">últimos dias</span></h3></div><div className="chart-body"><GraficoLinha dados={serie} /></div></div>

      <div className="charts-2">
        <div className="panel">
          <div className="panel-h"><h3>Ranking de vendedores</h3></div>
          {ranking.length === 0 ? <div className="dash-empty">Nenhum vendedor cadastrado.</div> : ranking.map((r, i) => (
            <div className="rank-row" key={r.id}>
              <div className="rank-fill" style={{ width: (r.total / maxRank) * 100 + "%" }} />
              <div className={"rank-pos" + (i < 3 ? " medal" : "")}>{i < 3 && r.total > 0 ? medalhas[i] : i + 1}</div>
              <div className="rank-av">{iniciais(r.nome)}</div>
              <div className="rank-mid"><div className="nm">{r.nome}</div><div className="sub">{r.qtd} venda{r.qtd === 1 ? "" : "s"}</div></div>
              <div className="rank-val">{fmtMoney(r.total)}</div>
            </div>
          ))}
        </div>
        <div className="panel">
          <div className="panel-h"><h3>Metas do mês</h3></div>
          {metas.length === 0 ? <div className="dash-empty">Nenhum vendedor cadastrado.</div> : metas.map((m) => (
            <div className="meta-row" key={m.id}>
              <div className="meta-head"><div className="nm"><span className="rank-av" style={{ width: 24, height: 24, fontSize: 10 }}>{iniciais(m.nome)}</span>{m.nome}{m.bateu && <span className="bateu">✓ bateu</span>}</div><div className="vals">{m.meta > 0 ? `${fmtMoney(m.vendidoMes)} / ${fmtMoney(m.meta)}` : "sem meta"}</div></div>
              {m.meta > 0 && <div className="pbar"><div className={"pfill" + (m.bateu ? " done" : "")} style={{ width: m.pct + "%" }} /></div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatIco({ ico: Ico, cor, val, money, lab }) {
  return (
    <div className="stat stat-ico">
      <div className="badge" style={{ background: cor + "1f", color: cor }}><Ico /></div>
      <div className="info"><div className={"val" + (money ? " money" : "")}>{val}</div><div className="lab">{lab}</div></div>
    </div>
  );
}

/* ============================================================
   PÁGINA ANÁLISE IA
   ============================================================ */
/* ============================================================
   NPS / SATISFAÇÃO
   ============================================================ */
function Estrelas({ n }) {
  const cheias = Math.round(n || 0);
  return <span className="estrelas">{[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= cheias ? "on" : ""}>★</span>)}</span>;
}
function DistBar({ dist }) {
  const max = Math.max(1, ...[1, 2, 3, 4, 5].map((k) => dist[k] || 0));
  return (
    <div className="dist">
      {[5, 4, 3, 2, 1].map((k) => {
        const v = dist[k] || 0;
        return (
          <div key={k} className="dist-row">
            <span className="dist-lbl">{k}★</span>
            <div className="dist-track"><div className={"dist-fill n" + k} style={{ width: (v / max * 100) + "%" }} /></div>
            <span className="dist-n">{v}</span>
          </div>
        );
      })}
    </div>
  );
}
function fmtDataHora(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function PaginaNPS({ showToast }) {
  const agoraInit = Date.now();
  const ini30 = inicioDoDia(new Date(agoraInit)); ini30.setDate(ini30.getDate() - 29);
  const [periodo, setPeriodo] = useState({ desde: ini30.getTime(), ate: agoraInit, key: "30d", label: "últimos 30 dias" });
  const [dataEsp, setDataEsp] = useState("");
  const [vendId, setVendId] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  function aplicarPreset(key) {
    const now = Date.now(); setDataEsp("");
    if (key === "hoje") setPeriodo({ desde: inicioDoDia(now).getTime(), ate: now, key, label: "hoje" });
    else if (key === "7d") { const ini = inicioDoDia(now); ini.setDate(ini.getDate() - 6); setPeriodo({ desde: ini.getTime(), ate: now, key, label: "últimos 7 dias" }); }
    else if (key === "30d") { const ini = inicioDoDia(now); ini.setDate(ini.getDate() - 29); setPeriodo({ desde: ini.getTime(), ate: now, key, label: "últimos 30 dias" }); }
    else setPeriodo({ desde: 0, ate: now, key: "tudo", label: "todo o histórico" });
  }
  function aplicarData(str) {
    setDataEsp(str); if (!str) return;
    const [y, mo, da] = str.split("-").map(Number);
    setPeriodo({ desde: new Date(y, mo - 1, da, 0, 0, 0, 0).getTime(), ate: new Date(y, mo - 1, da, 23, 59, 59, 999).getTime(), key: "data", label: str.split("-").reverse().join("/") });
  }
  useEffect(() => {
    let vivo = true; setLoading(true);
    api.nps(periodo.desde, periodo.ate, vendId)
      .then((d) => { if (vivo) { setData(d); setLoading(false); } })
      .catch((e) => { if (vivo) { setLoading(false); showToast("✗ " + e.message); } });
    return () => { vivo = false; };
    // eslint-disable-next-line
  }, [periodo.desde, periodo.ate, vendId]);

  const periodoBar = (
    <div className="ia-periodo">
      <span className="lbl">Período:</span>
      {[["hoje", "Hoje"], ["7d", "7 dias"], ["30d", "30 dias"], ["tudo", "Tudo"]].map(([k, l]) => (
        <button key={k} className={"chip" + (periodo.key === k ? " on" : "")} onClick={() => aplicarPreset(k)}>{l}</button>
      ))}
      <input type="date" className="input-date" value={dataEsp} max={dataInputHoje()} onChange={(e) => aplicarData(e.target.value)} />
      <select className="nps-vsel" value={vendId} onChange={(e) => setVendId(e.target.value)}>
        <option value="">Todos os vendedores</option>
        {(data && data.vendedoresLista ? data.vendedoresLista : []).map((v) => (
          <option key={v.id} value={v.id}>{v.nome}</option>
        ))}
      </select>
    </div>
  );
  const vendNome = vendId && data && data.vendedoresLista ? (data.vendedoresLista.find((v) => v.id === vendId) || {}).nome : "";

  const g = data && data.geral;
  const positivas = g && g.respostas ? Math.round(((g.dist[4] + g.dist[5]) / g.respostas) * 100) : 0;

  return (
    <div className="nps-page">
      {periodoBar}
      {loading && <div className="nps-card"><div className="ia-loading">Carregando avaliações... ⭐</div></div>}
      {!loading && data && g.respostas === 0 && (
        <div className="nps-card nps-vazio">
          <div className="big">⭐</div>
          <h3>Nenhuma avaliação{vendNome ? " de " + vendNome : ""} em {periodo.label}</h3>
          <p>As notas aparecem aqui quando os leads respondem à pesquisa de satisfação que o vendedor envia no fim do atendimento.</p>
        </div>
      )}
      {!loading && data && g.respostas > 0 && (
        <>
          <div className="nps-top">
            <div className="nps-card nps-geral">
              <span className="nps-cap">Nota média — {vendNome ? vendNome + " · " : ""}{periodo.label}</span>
              <div className="nps-media">{g.media.toFixed(1)}<small>/5</small></div>
              <Estrelas n={g.media} />
              <div className="nps-sub">{g.respostas} {g.respostas === 1 ? "avaliação" : "avaliações"} · {positivas}% positivas (4-5)</div>
            </div>
            <div className="nps-card nps-dist">
              <span className="nps-cap">Distribuição das notas</span>
              <DistBar dist={g.dist} />
            </div>
          </div>

          {!vendId && (
          <div className="nps-card">
            <div className="panel-h"><h3>Por vendedor</h3></div>
            <div className="nps-vends">
              {data.vendedores.map((v, i) => {
                const pos = v.respostas ? Math.round(((v.dist[4] + v.dist[5]) / v.respostas) * 100) : 0;
                return (
                  <div key={v.id} className="nps-vend">
                    <div className="nps-vend-rank">{i + 1}</div>
                    <div className="nps-vend-info">
                      <div className="nps-vend-nome">{v.nome}</div>
                      <div className="nps-vend-meta"><Estrelas n={v.media} /> <b>{v.media.toFixed(1)}</b> · {v.respostas} {v.respostas === 1 ? "nota" : "notas"} · {pos}% positivas</div>
                    </div>
                    <div className="nps-vend-mini"><DistBar dist={v.dist} /></div>
                  </div>
                );
              })}
            </div>
          </div>
          )}

          <div className="nps-card">
            <div className="panel-h"><h3>Últimas avaliações</h3></div>
            <div className="nps-aval">
              {data.avaliacoes.map((a) => (
                <div key={a.id + a.notaEm} className="nps-aval-row">
                  <span className={"nps-nota n" + Math.round(a.nota)}>⭐ {a.nota}</span>
                  <div className="nps-aval-info">
                    <div className="nps-aval-top"><b>{a.nome}</b> <span className="nps-aval-vend">· {a.vendedorNome}</span></div>
                    {a.notaTexto && <div className="nps-aval-txt">"{a.notaTexto}"</div>}
                  </div>
                  <span className="nps-aval-data">{fmtDataHora(a.notaEm)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PaginaIA({ user, showToast }) {
  const isGer = user.role === "gerente";
  const [aba, setAba] = useState("equipe");
  const [users, setUsers] = useState([]);
  const [mon, setMon] = useState(null);
  const [selVend, setSelVend] = useState("");
  const [eq, setEq] = useState({ loading: false, res: null, erro: "" });
  const [ind, setInd] = useState({ loading: false, res: null, erro: "" });
  const [periodo, setPeriodo] = useState({ desde: 0, ate: Date.now(), key: "tudo", label: "todo o histórico" });
  const [dataEsp, setDataEsp] = useState(dataInputHoje());

  async function carregarUsers() {
    if (!isGer) return;
    try { const us = await api.listVendedores(); setUsers(us); if (us[0]) setSelVend(us[0].id); } catch (_) {}
  }
  useEffect(() => { carregarUsers(); /* eslint-disable-next-line */ }, []);
  // recarrega as métricas e limpa análises antigas quando muda o período
  useEffect(() => {
    (async () => { try { setMon(await api.monitoria(periodo.desde, periodo.ate)); } catch (_) {} })();
    setEq({ loading: false, res: null, erro: "" });
    setInd({ loading: false, res: null, erro: "" });
    // eslint-disable-next-line
  }, [periodo.desde, periodo.ate]);

  function aplicarPreset(key) {
    const now = Date.now();
    if (key === "hoje") setPeriodo({ desde: inicioDoDia(now).getTime(), ate: now, key, label: "hoje" });
    else if (key === "ontem") { const ini = inicioDoDia(now); ini.setDate(ini.getDate() - 1); setPeriodo({ desde: ini.getTime(), ate: inicioDoDia(now).getTime() - 1, key, label: "ontem" }); }
    else if (key === "7d") { const ini = inicioDoDia(now); ini.setDate(ini.getDate() - 6); setPeriodo({ desde: ini.getTime(), ate: now, key, label: "últimos 7 dias" }); }
    else if (key === "30d") { const ini = inicioDoDia(now); ini.setDate(ini.getDate() - 29); setPeriodo({ desde: ini.getTime(), ate: now, key, label: "últimos 30 dias" }); }
    else setPeriodo({ desde: 0, ate: now, key: "tudo", label: "todo o histórico" });
  }
  function aplicarData(str) {
    setDataEsp(str);
    if (!str) return;
    const [y, mo, da] = str.split("-").map(Number);
    const ini = new Date(y, mo - 1, da, 0, 0, 0, 0);
    const fim = new Date(y, mo - 1, da, 23, 59, 59, 999);
    setPeriodo({ desde: ini.getTime(), ate: fim.getTime(), key: "data", label: str.split("-").reverse().join("/") });
  }
  const periodoBar = (
    <div className="ia-periodo">
      <span className="lbl">Período:</span>
      {[["hoje", "Hoje"], ["ontem", "Ontem"], ["7d", "7 dias"], ["30d", "30 dias"], ["tudo", "Tudo"]].map(([k, l]) => (
        <button key={k} className={"chip" + (periodo.key === k ? " on" : "")} onClick={() => aplicarPreset(k)}>{l}</button>
      ))}
      <input type="date" className="input-date" value={dataEsp} max={dataInputHoje()} onChange={(e) => aplicarData(e.target.value)} />
    </div>
  );

  const m = (mon && mon.time) || {};

  async function gerarEquipe() {
    setEq({ loading: true, res: null, erro: "" });
    try { setEq({ loading: false, res: await api.iaEquipe(periodo.desde, periodo.ate), erro: "" }); }
    catch (e) { setEq({ loading: false, res: null, erro: e.message }); }
  }
  async function gerarIndividual(id) {
    setInd({ loading: true, res: null, erro: "" });
    try { setInd({ loading: false, res: await api.iaVendedor(id, periodo.desde, periodo.ate), erro: "" }); }
    catch (e) { setInd({ loading: false, res: null, erro: e.message }); }
  }

  // VENDEDOR: só a própria análise
  if (!isGer) {
    return (
      <div className="ia-page">
        {periodoBar}
        <div className="ia-hero">
          <span className="ia-hero-badge"><I.spark style={{ width: 14, height: 14 }} /> Inteligência Artificial</span>
          <h2>Análise do meu atendimento</h2>
          <p>A IA olha o seu atendimento no WhatsApp — rapidez nas respostas, clientes sem retorno, tom e educação — e te dá uma leitura honesta com sugestões pra melhorar. <b>Período: {periodo.label}.</b></p>
          <div className="ia-hero-stats"><span><b>{m.conversas || 0}</b> atendimentos</span><span className="sep">•</span><span><b>{m.semResposta || 0}</b> sem resposta</span><span className="sep">•</span><span><b>{m.taxaResposta || 0}%</b> taxa de resposta</span></div>
          <button className="btn-hero" onClick={() => gerarIndividual(user.id)} disabled={ind.loading}><I.spark style={{ width: 17, height: 17 }} /> {ind.loading ? "Analisando..." : "Gerar minha análise"}</button>
        </div>
        {ind.loading && <div className="ia-resultado-card"><div className="ia-loading">A IA está lendo seus números e conversas... ✨</div></div>}
        {ind.erro && <div className="ia-resultado-card"><IAErro msg={ind.erro} /></div>}
        {ind.res && <div className="ia-resultado-card"><div className="rc-h"><span className="rank-av">{iniciais(user.nome)}</span>{user.nome}</div><IAResultado res={ind.res} /></div>}
      </div>
    );
  }

  // GERENTE
  return (
    <div className="ia-page">
      <div className="ia-tabs">
        <button className={aba === "equipe" ? "on" : ""} onClick={() => setAba("equipe")}><I.users /> Equipe inteira</button>
        <button className={aba === "individual" ? "on" : ""} onClick={() => setAba("individual")}><I.team /> Vendedor específico</button>
      </div>

      {periodoBar}

      {aba === "equipe" && (
        <>
          <div className="ia-hero">
            <span className="ia-hero-badge"><I.spark style={{ width: 14, height: 14 }} /> Inteligência Artificial</span>
            <h2>Relatório de atendimento da equipe</h2>
            <p>A IA analisa a velocidade das respostas, os clientes deixados sem retorno, o volume e o tom de cada atendente, gerando uma leitura geral e recomendações pra apresentar à diretoria. <b>Período: {periodo.label}.</b></p>
            <div className="ia-hero-stats"><span><b>{m.conversas || 0}</b> atendimentos</span><span className="sep">•</span><span><b>{users.length}</b> vendedores</span><span className="sep">•</span><span><b>{m.taxaResposta || 0}%</b> taxa de resposta</span></div>
            <button className="btn-hero" onClick={gerarEquipe} disabled={eq.loading}><I.spark style={{ width: 17, height: 17 }} /> {eq.loading ? "Analisando..." : "Gerar análise da equipe"}</button>
          </div>
          {eq.loading && <div className="ia-resultado-card"><div className="ia-loading">A IA está analisando o time... ✨</div></div>}
          {eq.erro && <div className="ia-resultado-card"><IAErro msg={eq.erro} /></div>}
          {eq.res && <div className="ia-resultado-card"><div className="rc-h">📊 Visão geral da equipe</div><IAResultado res={eq.res} /></div>}
        </>
      )}

      {aba === "individual" && (
        <>
          <div className="ia-pick">
            <label>Escolha o vendedor</label>
            <select className="select" style={{ maxWidth: 320 }} value={selVend} onChange={(e) => { setSelVend(e.target.value); setInd({ loading: false, res: null, erro: "" }); }}>
              {users.length === 0 && <option value="">Nenhum vendedor cadastrado</option>}
              {users.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
          {selVend && (
            <div className="ia-hero">
              <span className="ia-hero-badge"><I.spark style={{ width: 14, height: 14 }} /> Inteligência Artificial</span>
              <h2>Avaliação individual</h2>
              <p>Análise dos resultados e da qualidade do atendimento de <b>{(users.find((u) => u.id === selVend) || {}).nome}</b>, com pontos fortes, pontos a melhorar e sugestões específicas. <b>Período: {periodo.label}.</b></p>
              <button className="btn-hero" onClick={() => gerarIndividual(selVend)} disabled={ind.loading}><I.spark style={{ width: 17, height: 17 }} /> {ind.loading ? "Analisando..." : "Gerar análise do vendedor"}</button>
            </div>
          )}
          {ind.loading && <div className="ia-resultado-card"><div className="ia-loading">Lendo números e conversas... ✨</div></div>}
          {ind.erro && <div className="ia-resultado-card"><IAErro msg={ind.erro} /></div>}
          {ind.res && <div className="ia-resultado-card"><div className="rc-h"><span className="rank-av">{iniciais(ind.res.vendedor || "")}</span>{ind.res.vendedor}</div><IAResultado res={ind.res} /></div>}
        </>
      )}
    </div>
  );
}

/* ============================================================
   IMPORTAR LISTA DE LEADS
   ============================================================ */
function parseLeads(texto) {
  const linhas = (texto || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out = [];
  linhas.forEach((l, idx) => {
    const temNumero = /\d{8,}/.test(l.replace(/\D/g, ""));
    if (idx === 0 && !temNumero && /(nome|telefone|phone|whats|numero|n[uú]mero|celular|contato)/i.test(l)) return;
    const partes = l.split(/[,;\t]+/).map((p) => p.trim()).filter(Boolean);
    let tel = "", nome = "";
    partes.forEach((p) => {
      const dig = p.replace(/\D/g, "");
      if (dig.length >= 8 && !tel) tel = dig;
      else if (!nome && dig.length < 8) nome = p;
    });
    if (tel || nome) out.push({ cliente: nome, telefone: tel });
  });
  return out;
}

function ImportarLeads({ isGer, users, meId, onClose, onImported }) {
  const [origem, setOrigem] = useState("");
  const [curso, setCurso] = useState("");
  const [responsavelId, setResponsavelId] = useState(meId);
  const [texto, setTexto] = useState("");
  const [saving, setSaving] = useState(false);

  function lerArquivo(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setTexto((t) => (t ? t + "\n" : "") + String(reader.result));
    reader.readAsText(file);
    e.target.value = "";
  }

  const leads = parseLeads(texto);

  async function importar() {
    if (leads.length === 0 || !origem.trim()) return;
    setSaving(true);
    try {
      const r = await api.importCards({ leads, origem, curso, responsavelId });
      onImported(r.criados);
    } catch (e) { alert(e.message); setSaving(false); }
  }

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 540 }}>
        <div className="mh"><h3>Importar lista de leads</h3><p>Cole os números (um por linha) ou suba um CSV. Cada linha vira um lead novo no funil.</p></div>
        <div className="mb">
          <div className="row2">
            <div className="field"><label>Origem / Tag *</label><input className="input" value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="Ex: Lista Instagram Junho" autoFocus /></div>
            <div className="field"><label>Curso (opcional)</label><input className="input" value={curso} onChange={(e) => setCurso(e.target.value)} placeholder="Ex: Eletrônica" /></div>
          </div>
          {isGer && (
            <div className="field"><label>Atribuir a</label>
              <select className="select" value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)}>
                {users.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
          )}
          <div className="field">
            <label>Números (um por linha — pode ser "Nome, telefone")</label>
            <textarea className="textarea" style={{ minHeight: 130, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={"João, 5544999998888\n5544988887777\nMaria; 44 90000-0000"} />
          </div>
          <label className="import-file">
            <I.out style={{ width: 15, height: 15, transform: "rotate(180deg)" }} /> Subir arquivo CSV
            <input type="file" accept=".csv,text/csv,text/plain" onChange={lerArquivo} hidden />
          </label>
          {leads.length > 0 && <div className="import-count">✓ {leads.length} número{leads.length === 1 ? "" : "s"} detectado{leads.length === 1 ? "" : "s"}</div>}
        </div>
        <div className="mf">
          <button className="btn full" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary full" onClick={importar} disabled={saving || leads.length === 0 || !origem.trim()}>{saving ? "Importando..." : `Importar ${leads.length || ""} leads`}</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MONITORIA DE ATENDIMENTO
   ============================================================ */
function fmtTempo(seg) {
  if (!seg || seg <= 0) return "—";
  if (seg < 60) return seg + "s";
  if (seg < 3600) return Math.floor(seg / 60) + "min" + (seg % 60 ? " " + (seg % 60) + "s" : "");
  return Math.floor(seg / 3600) + "h " + Math.floor((seg % 3600) / 60) + "min";
}

function Monitoria({ user, showToast }) {
  const isGer = user.role === "gerente";
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState("mes");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [vendFiltro, setVendFiltro] = useState(isGer ? "" : user.id);
  const [det, setDet] = useState(null);

  const alvo = isGer ? vendFiltro : user.id;

  async function carregar(silencioso) {
    if (!silencioso) setLoading(true);
    const [ini, fim] = intervaloPeriodo(preset, de, ate);
    try { setDados(await api.monitoria(ini, fim)); }
    catch (e) { if (!silencioso) showToast("✗ " + e.message); }
    finally { if (!silencioso) setLoading(false); }
  }
  useEffect(() => { carregar(false); /* eslint-disable-next-line */ }, [preset, de, ate]);
  useEffect(() => {
    if (preset === "custom") return;
    const [i, f] = intervaloPeriodo(preset, "", "");
    const iso = (t) => new Date(t).toISOString().slice(0, 10);
    setDe(iso(preset === "tudo" ? Date.now() : i)); setAte(iso(f));
    // eslint-disable-next-line
  }, [preset]);
  useEffect(() => {
    if (!alvo) { setDet(null); return; }
    let cancel = false;
    (async () => {
      const [ini, fim] = intervaloPeriodo(preset, de, ate);
      try {
        const [info, ev, nps] = await Promise.all([
          api.monitoriaVendedor(alvo, ini, fim),
          api.monitoriaEvolucao(ini, fim, alvo),
          api.nps(ini, fim, alvo).catch(() => null),
        ]);
        if (!cancel) setDet({ info, evo: ev.dias || [], nps });
      } catch (e) { if (!cancel) showToast("✗ " + e.message); }
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line
  }, [alvo, preset, de, ate]);

  if (loading) return <div className="spin" />;
  const time = (dados && dados.time) || {};
  const vendedores = (dados && dados.vendedores) || [];
  const ranked = [...vendedores].sort((a, b) => b.mensagensEnviadas - a.mensagensEnviadas);
  const barrasMsg = ranked.slice(0, 8).map((v) => ({ label: (v.nome || "").split(" ")[0], valor: v.mensagensEnviadas }));
  const barrasTmr = [...vendedores].filter((v) => v.tmrSeg > 0).sort((a, b) => a.tmrSeg - b.tmrSeg).slice(0, 8)
    .map((v) => ({ label: (v.nome || "").split(" ")[0], valor: Math.round(v.tmrSeg / 60) || 1, rotulo: fmtTempo(v.tmrSeg), cor: "#ffb547" }));

  const topo = (
    <div className="mon-topo">
      <div className="filtro-bar">
        <div className="seg">
          {[["hoje", "Hoje"], ["semana", "Semana"], ["mes", "Mês"], ["tudo", "Tudo"]].map(([k, lbl]) => (
            <button key={k} className={preset === k ? "on" : ""} onClick={() => setPreset(k)}>{lbl}</button>
          ))}
        </div>
        <div className="filtro-datas">
          <input type="date" value={de} onChange={(e) => { setDe(e.target.value); setPreset("custom"); }} />
          até
          <input type="date" value={ate} onChange={(e) => { setAte(e.target.value); setPreset("custom"); }} />
        </div>
      </div>
      {isGer && (
        <select className="select mon-vend-sel" value={vendFiltro} onChange={(e) => setVendFiltro(e.target.value)}>
          <option value="">Todos os vendedores</option>
          {[...vendedores].sort((a, b) => a.nome.localeCompare(b.nome)).map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
        </select>
      )}
    </div>
  );

  // ===== VISÃO INDIVIDUAL (um vendedor) =====
  if (alvo) {
    return (
      <div>
        {topo}
        {det ? <PainelIndividual info={det.info} evo={det.evo} nps={det.nps} isGer={isGer} onVoltar={() => setVendFiltro("")} /> : <div className="spin" />}
      </div>
    );
  }

  // ===== VISÃO DO TIME (todos) =====
  const vazio = time.conversas === 0;
  return (
    <div>
      {topo}
      <div className="stats">
        <StatIco ico={I.refresh} cor="#8b7bff" val={fmtTempo(time.tmrSeg)} lab="Tempo médio de resposta (TMA)" />
        <StatIco ico={I.wa} cor="#ff5d73" val={time.semResposta || 0} lab="Conversas sem resposta" />
        <StatIco ico={I.chat} cor="#34e3b0" val={time.conversas || 0} lab="Atendimentos no período" />
        <StatIco ico={I.send} cor="#c08bff" val={time.mensagensEnviadas || 0} lab="Mensagens enviadas" />
      </div>
      <div className="mon-strip">
        <div className="mon-mini"><div className="lab">1ª resposta (média)</div><div className="num">{fmtTempo(time.primeiraSeg)}</div></div>
        <div className="mon-mini"><div className="lab">Taxa de resposta</div><div className="num">{time.taxaResposta || 0}%</div></div>
        <div className="mon-mini"><div className="lab">Conversas atendidas</div><div className="num">{time.atendidas || 0} de {time.conversas || 0}</div></div>
      </div>

      {vazio ? (
        <div className="panel"><div className="dash-empty">
          Ainda não há conversas registradas neste período.<br />
          Os números vão aparecer conforme os vendedores forem conectados em <b>WhatsApp → Configurar conexão</b> e começarem a atender.
        </div></div>
      ) : (
        <>
          {isGer && (
            <div className="charts-2">
              <div className="panel"><div className="panel-h"><h3>Produtividade<span className="panel-sub">mensagens enviadas por vendedor</span></h3></div><div className="chart-body"><GraficoBarras dados={barrasMsg} /></div></div>
              <div className="panel"><div className="panel-h"><h3>Tempo de resposta<span className="panel-sub">média por vendedor (min) — menor é melhor</span></h3></div><div className="chart-body"><GraficoBarras dados={barrasTmr} /></div></div>
            </div>
          )}

          <div className="panel">
            <div className="panel-h"><h3>Desempenho por vendedor<span className="panel-sub">clique num vendedor pra ver só ele</span></h3></div>
            <div className="mon-tabela-wrap">
              <table className="mon-tabela">
                <thead>
                  <tr>
                    <th>Vendedor</th><th>Atend.</th><th>Atendidas</th><th>S/ resposta</th>
                    <th>Msgs</th><th>TMA resposta</th><th>1ª resp.</th><th>Taxa</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((v) => (
                    <tr key={v.id} className="clicavel" onClick={() => isGer && setVendFiltro(v.id)}>
                      <td className="vend"><span className="rank-av" style={{ width: 26, height: 26, fontSize: 11 }}>{iniciais(v.nome)}</span>{v.nome}</td>
                      <td>{v.conversas}</td>
                      <td>{v.atendidas}</td>
                      <td>{v.semResposta > 0 ? <span className="alerta">{v.semResposta}</span> : "0"}</td>
                      <td>{v.mensagensEnviadas}</td>
                      <td>{fmtTempo(v.tmrSeg)}</td>
                      <td>{fmtTempo(v.primeiraSeg)}</td>
                      <td>{v.taxaResposta}%</td>
                      <td className="chev">›</td>
                    </tr>
                  ))}
                  {ranked.length === 0 && <tr><td colSpan={9} style={{ textAlign: "center", color: "var(--faint)", padding: 24 }}>Nenhum vendedor com atendimentos.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PainelIndividual({ info: d, evo, nps, isGer, onVoltar }) {
  const ativos = (evo || []).filter((x) => x.atendimentos > 0 || x.mensagens > 0);
  return (
    <div>
      <div className="ind-head">
        {isGer && <button className="btn btn-sm" onClick={onVoltar}>← Todos os vendedores</button>}
        <div className="ind-nome"><span className="rank-av" style={{ width: 30, height: 30, fontSize: 12 }}>{iniciais(d.nome)}</span>{d.nome}</div>
      </div>

      <div className="stats">
        <StatIco ico={I.refresh} cor="#8b7bff" val={fmtTempo(d.tmrSeg)} lab="Tempo médio de resposta (TMA)" />
        <StatIco ico={I.wa} cor="#ff5d73" val={d.semResposta || 0} lab="Conversas sem resposta" />
        <StatIco ico={I.chat} cor="#34e3b0" val={d.conversas || 0} lab="Atendimentos no período" />
        <StatIco ico={I.send} cor="#c08bff" val={d.mensagensEnviadas || 0} lab="Mensagens enviadas" />
      </div>
      <div className="mon-strip">
        <div className="mon-mini"><div className="lab">1ª resposta (média)</div><div className="num">{fmtTempo(d.primeiraSeg)}</div></div>
        <div className="mon-mini"><div className="lab">Taxa de resposta</div><div className="num">{d.taxaResposta || 0}%</div></div>
        <div className="mon-mini"><div className="lab">Conversas atendidas</div><div className="num">{d.atendidas || 0} de {d.conversas || 0}</div></div>
      </div>

      {nps && nps.geral && nps.geral.respostas > 0 && (
        <div className="panel">
          <div className="panel-h"><h3>Satisfação (NPS)<span className="panel-sub">notas da pesquisa no período</span></h3></div>
          <div className="ind-nps">
            <div className="ind-nps-media">
              <div className="nps-media">{nps.geral.media.toFixed(1)}<small>/5</small></div>
              <Estrelas n={nps.geral.media} />
              <div className="nps-sub">{nps.geral.respostas} {nps.geral.respostas === 1 ? "avaliação" : "avaliações"}</div>
            </div>
            <div className="ind-nps-dist"><DistBar dist={nps.geral.dist} /></div>
          </div>
          {nps.avaliacoes && nps.avaliacoes.length > 0 && (
            <div className="ind-nps-aval">
              {nps.avaliacoes.slice(0, 6).map((a) => (
                <div key={a.id + a.notaEm} className="nps-aval-row">
                  <span className={"nps-nota n" + Math.round(a.nota)}>⭐ {a.nota}</span>
                  <div className="nps-aval-info">
                    <div className="nps-aval-top"><b>{a.nome}</b></div>
                    {a.notaTexto && <div className="nps-aval-txt">"{a.notaTexto}"</div>}
                  </div>
                  <span className="nps-aval-data">{fmtDataHora(a.notaEm)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {ativos.length > 0 && (
        <div className="panel">
          <div className="panel-h"><h3>Números por dia</h3></div>
          <div className="mon-tabela-wrap">
            <table className="mon-tabela">
              <thead><tr><th>Dia</th><th>Atend.</th><th>Atendidas</th><th>Msgs</th><th>TMA resposta</th><th>1ª resp.</th></tr></thead>
              <tbody>
                {[...ativos].reverse().map((x) => (
                  <tr key={x.label}>
                    <td>{x.label}</td><td>{x.atendimentos}</td><td>{x.atendidas}</td><td>{x.mensagens}</td><td>{fmtTempo(x.tmrSeg)}</td><td>{fmtTempo(x.primeiraSeg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-h"><h3>Conversas<span className="panel-sub">{d.conversas} no período</span></h3></div>
        <div className="det-conv" style={{ padding: 18, maxHeight: "none" }}>
          {(!d.lista || d.lista.length === 0) && <div className="dash-empty" style={{ padding: 18 }}>Nenhuma conversa no período.</div>}
          {(d.lista || []).map((c) => (
            <div className="det-conv-row" key={c.id}>
              <span className="rank-av" style={{ width: 30, height: 30, fontSize: 11, flexShrink: 0 }}>{iniciais(c.nome)}</span>
              <div className="cc">
                <div className="nm">{c.nome} <span className="num">{c.numero}</span></div>
                <div className="last">{c.ultimaDe === "me" ? "Você: " : ""}{c.ultimaMsg || "—"}</div>
              </div>
              <div className="cc-meta">
                {c.semResposta ? <span className="badge red">sem resposta</span> : c.atendida ? <span className="badge green">respondida</span> : <span className="badge">só recebida</span>}
                {c.tmrSeg > 0 && <span className="t">resp. {fmtTempo(c.tmrSeg)}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================ SOLICITAÇÕES DE SUPORTE ============================ */
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
  const perBtn = (v, txt) => (
    <button className={"chip" + (periodo === v ? " on" : "")} onClick={() => setPeriodo(v)}>{txt}</button>
  );
  const filBtn = (v, txt) => (
    <button className={"chip" + (filtro === v ? " on" : "")} onClick={() => setFiltro(v)}>{txt}</button>
  );

  return (
    <div>
      <div className="panel">
        <div className="panel-h"><h3>Visão geral<span className="panel-sub">situação das solicitações no período</span></h3></div>
        <div className="ia-periodo" style={{ padding: "0 18px 14px" }}>
          <span className="lbl">Período:</span>
          {perBtn("hoje", "Hoje")}{perBtn("7", "7 dias")}{perBtn("30", "30 dias")}{perBtn("tudo", "Tudo")}
        </div>
        {!sit && <div className="spin" />}
        {sit && (
          <>
            <div className="mon-strip" style={{ margin: "0 18px 16px" }}>
              <div className="mon-mini"><div className="lab">Total</div><div className="num">{sit.total}</div></div>
              <div className="mon-mini"><div className="lab">Abertas</div><div className="num">{sit.aberta}</div></div>
              <div className="mon-mini"><div className="lab">Em andamento</div><div className="num">{sit.andamento}</div></div>
              <div className="mon-mini"><div className="lab">Resolvidas</div><div className="num">{sit.resolvida}</div></div>
              <div className="mon-mini"><div className="lab">Taxa de resolução</div><div className="num">{sit.taxaResolucao}%</div></div>
              <div className="mon-mini"><div className="lab">Tempo médio p/ resolver</div><div className="num">{sit.tempoMedioResolverSeg ? fmtTempo(sit.tempoMedioResolverSeg) : "—"}</div></div>
            </div>
            {rel.porVendedor.length > 0 && (
              <div style={{ padding: "0 18px 18px" }}>
                <div className="sol-rank-t">Quem mais abriu chamado</div>
                {rel.porVendedor.map((v, i) => (
                  <div className="sol-rank-row" key={v.vendedorId}>
                    <span className="sol-rank-pos">{i + 1}</span>
                    <span className="sol-rank-nome">{v.nome}</span>
                    <span className="sol-rank-val">{v.total} {v.total === 1 ? "pedido" : "pedidos"} · {v.resolvidas} resolvido{v.resolvidas === 1 ? "" : "s"}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="panel">
        <div className="panel-h">
          <h3>Análise da IA<span className="panel-sub">temas recorrentes e sugestões</span></h3>
          <button className="btn btn-primary btn-sm" onClick={gerarIA} disabled={iaLoad}>{iaLoad ? "Analisando..." : "Gerar análise"}</button>
        </div>
        <div style={{ padding: 18 }}>
          {!ia && !iaErr && !iaLoad && <div className="dash-empty">Clique em "Gerar análise" para a IA avaliar as solicitações do período.</div>}
          {iaLoad && <div className="spin" />}
          {iaErr && <div className="ia-erro">{iaErr}</div>}
          {ia && <div className="ia-resumo" style={{ whiteSpace: "pre-wrap" }}>{ia}</div>}
        </div>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h3>Fila de solicitações<span className="panel-sub">trabalhe os pedidos e atualize o status</span></h3>
          {readonly && <button className="btn btn-primary btn-sm" onClick={() => setNovoChamado(true)}><I.suporte className="ico" /> Abrir chamado</button>}
        </div>
        <div className="ia-periodo" style={{ padding: "0 18px 14px" }}>
          <span className="lbl">Status:</span>
          {filBtn("todas", "Todas")}{filBtn("aberta", "Abertas")}{filBtn("andamento", "Em andamento")}{filBtn("resolvida", "Resolvidas")}
        </div>
        <div className="sol-list" style={{ padding: "0 6px 8px" }}>
          {!lista && <div className="spin" />}
          {lista && lista.length === 0 && <div className="dash-empty" style={{ padding: 18 }}>Nenhuma solicitação por aqui.</div>}
          {(lista || []).map((s) => <SolicitacaoRow key={s.id} s={s} onMudar={mudar} readonly={readonly} />)}
        </div>
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
    <div className="sol-row big">
      <div className="sol-info">
        <div className="sol-top">
          <span className={"sol-st " + s.status}>{rotuloStatus(s.status)}</span>
          <span className={"sol-urg " + s.urgencia}>{s.urgencia}</span>
          <b className="sol-quem">{s.vendedorNome}</b>
        </div>
        <div className="sol-desc">{s.descricao}</div>
        <div className="sol-meta">
          {s.cliente ? "Cliente: " + s.cliente + (s.numero ? " (" + s.numero + ")" : "") + " · " : (s.numero ? s.numero + " · " : "")}
          {fmtDataHora(s.criadoEm)}
        </div>
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
    const t = setInterval(tick, 6000);
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
