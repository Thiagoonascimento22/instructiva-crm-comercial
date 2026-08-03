import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProvedorAviso, ProvedorCarrinho } from './comum/uteis.jsx';
import Cardapio from './cliente/Cardapio.jsx';
import Carrinho from './cliente/Carrinho.jsx';
import Acompanhar from './cliente/Acompanhar.jsx';
import Admin from './admin/Admin.jsx';
import './estilo.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ProvedorAviso>
        <ProvedorCarrinho>
          <Routes>
            <Route path="/" element={<Cardapio />} />
            <Route path="/carrinho" element={<Carrinho />} />
            <Route path="/pedido/:token" element={<Acompanhar />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ProvedorCarrinho>
      </ProvedorAviso>
    </BrowserRouter>
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registro = await navigator.serviceWorker.register('/sw.js');
      // quando sai uma versão nova, assume assim que estiver pronta
      registro.addEventListener('updatefound', () => {
        const novo = registro.installing;
        novo?.addEventListener('statechange', () => {
          if (novo.state === 'installed' && navigator.serviceWorker.controller) {
            novo.postMessage('atualizar');
          }
        });
      });
      let recarregou = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (recarregou) return;
        recarregou = true;
        location.reload();
      });
    } catch {}
  });
}
