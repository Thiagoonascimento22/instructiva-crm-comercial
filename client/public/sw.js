/*
  Cache do aplicativo.
  Regra de ouro: nunca devolver HTML no lugar de um script ou de uma folha de estilo.
  Fazer isso quebra a página inteira — ela carrega bonita e não responde a nada.
*/
const CACHE = 'sabor-brasil-v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const chaves = await caches.keys();
    await Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'atualizar') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Scripts e estilos: sempre direto da rede, sem interceptar.
  // Se falhar, o navegador mostra o erro de verdade em vez de receber HTML.
  if (/\.(js|mjs|css)$/.test(url.pathname)) return;

  // Abertura de página: rede primeiro; o cache só socorre quem está sem internet.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const r = await fetch(req);
        if (r.ok) caches.open(CACHE).then((c) => c.put('/', r.clone()));
        return r;
      } catch {
        return (await caches.match('/')) || Response.error();
      }
    })());
    return;
  }

  // Imagens, ícones e fontes: usa o cache e atualiza por trás.
  if (/\.(png|jpe?g|webp|gif|svg|ico|woff2?)$/.test(url.pathname) || url.pathname === '/manifest.json') {
    e.respondWith((async () => {
      const guardado = await caches.match(req);
      const daRede = fetch(req)
        .then((r) => {
          if (r.ok) caches.open(CACHE).then((c) => c.put(req, r.clone()));
          return r;
        })
        .catch(() => guardado);
      return guardado || daRede;
    })());
  }
});
