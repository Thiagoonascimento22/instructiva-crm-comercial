// Service Worker do Instructiva — habilita a instalação como app.
// Estratégia "network-first" simples: sempre tenta a rede primeiro (pra pegar
// dados sempre atualizados — importante num sistema de CRM/disparo), e só usa
// cache como fallback se estiver offline. Não faz cache agressivo pra não
// servir telas velhas depois de um deploy.

const CACHE = "instructiva-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting(); // ativa a nova versão na hora
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // só lida com GET (não mexe em POST/PUT do sistema)
  if (req.method !== "GET") return;
  // não intercepta chamadas de API — elas devem sempre ir à rede
  if (req.url.includes("/api/")) return;

  event.respondWith(
    fetch(req)
      .then((resp) => {
        // guarda uma cópia no cache pra usar offline
        const copia = resp.clone();
        caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
        return resp;
      })
      .catch(() => caches.match(req)) // offline → tenta o cache
  );
});
