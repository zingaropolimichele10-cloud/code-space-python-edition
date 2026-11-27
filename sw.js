const version = '2.1.2';
const scope = new URL(self.registration.scope);
const cachePrefix = 'code-space:' + scope.pathname + ':';
const cacheName = cachePrefix + version;
const start = new URL('index.html', scope);
const classroom = new URL('classroom.html', scope);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch(new URL('release-manifest.json', scope), { cache: 'reload' });
    if (!response.ok) throw Error('Manifest del rilascio indisponibile');
    const release = await response.json();
    if (release.version !== version) throw Error('Versione del manifest incompatibile');
    const urls = release.runtime.map(path => {
      const url = new URL(path, scope);
      if (!url.href.startsWith(scope.href)) throw Error('Risorsa fuori dal sito');
      return new Request(url, { cache: 'reload' });
    });
    if (self.registration.active && await caches.has(cacheName)) throw Error('Incrementa la versione della cache');
    const cache = await caches.open(cacheName);
    try {
      await cache.addAll(urls);
    } catch (error) {
      await caches.delete(cacheName);
      throw error;
    }
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(cachePrefix) && name !== cacheName)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;

  let key = request;
  if (request.mode === 'navigate') {
    if (url.pathname === scope.pathname || url.pathname === start.pathname) key = start.href;
    else if (url.pathname === classroom.pathname) key = classroom.href;
    else return;
  }

  event.respondWith(caches.match(key, { cacheName }).then(response => response ?? fetch(request)));
});
