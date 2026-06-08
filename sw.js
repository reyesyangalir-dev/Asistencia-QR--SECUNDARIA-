const CACHE_NAME = 'asistencia-qr-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.jpeg'
];

// Instalar: guardar archivos en caché
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activar: limpiar cachés viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: red primero, caché como respaldo
self.addEventListener('fetch', e => {
  // Solo interceptar peticiones GET
  if (e.request.method !== 'GET') return;
  // No interceptar peticiones a Firebase/Google (siempre necesitan red)
  const url = e.request.url;
  if (url.includes('firestore') || url.includes('firebase') || url.includes('googleapis') || url.includes('gstatic')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Guardar copia fresca en caché
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
