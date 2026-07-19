const CACHE_NAME = 'asistencia-qr-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.jpeg'
];

// ══════════════════════════════════════════════════════════════════
// 🔔 NOTIFICACIONES PUSH (Firebase Cloud Messaging) — segundo plano
// ══════════════════════════════════════════════════════════════════
// El Service Worker no puede usar el SDK modular (import), por eso
// se usa la versión "compat" cargada con importScripts. Esto NO afecta
// ni reemplaza la lógica de caché offline de arriba/abajo.
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCw95QQLDVxKOPxweR5k1MsbF5G3_M5MOs",
  authDomain: "asistencia-qr-secundaria.firebaseapp.com",
  projectId: "asistencia-qr-secundaria",
  storageBucket: "asistencia-qr-secundaria.firebasestorage.app",
  messagingSenderId: "303610678115",
  appId: "1:303610678115:web:258b225838ec6d1845e156"
});

const messaging = firebase.messaging();

// Se dispara cuando la notificación llega con la app cerrada o en 2do plano
messaging.onBackgroundMessage((payload) => {
  const titulo = payload.data?.titulo || 'AsistenciaQR';
  const opciones = {
    body: payload.data?.cuerpo || '',
    icon: './logo.jpeg',
    badge: './badge-96.png',
    tag: 'asist-' + (payload.data?.estudianteId || '') + '-' + (payload.data?.fecha || Date.now()),
    data: payload.data || {}
  };

  // 🔴 Numerito rojo encima del ícono de la app (Badging API)
  // Se dispara en paralelo, ANTES del return, para no quedar fuera del evento
  if ('setAppBadge' in self.navigator) {
    self.navigator.setAppBadge(1).catch(() => {});
  }

  // ⚠️ FIX-NOTIF-DUP-3: retornar la promesa mantiene vivo el evento push
  // hasta que la notificación esté visible. Sin este return, Chrome a veces
  // cree que el push terminó sin mostrar nada y dispara su aviso genérico
  // "Este sitio se actualizó en segundo plano" como notificación duplicada.
  return self.registration.showNotification(titulo, opciones);
});

// Al tocar la notificación, abrir (o enfocar) la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientsArr => {
      const hadWindow = clientsArr.find(c => 'focus' in c);
      if (hadWindow) return hadWindow.focus();
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});

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
