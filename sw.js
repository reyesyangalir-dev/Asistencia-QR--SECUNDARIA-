// ══════════════════════════════════════════════════════════════════
// Service Worker — AsistenciaQR IE N.° 0162 SAN JOSÉ OBRERO
// Este archivo debe estar en la RAÍZ del repositorio/servidor,
// al mismo nivel que index.html, para que ./sw.js pueda registrarse.
// ══════════════════════════════════════════════════════════════════

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

// 🔔 Notificaciones push cuando la app está cerrada o en segundo plano
messaging.onBackgroundMessage((payload) => {
  const titulo = payload.data?.titulo || payload.notification?.title || '🔔 AsistenciaQR';
  const cuerpo = payload.data?.cuerpo || payload.notification?.body || '';
  self.registration.showNotification(titulo, {
    body: cuerpo,
    icon: './badge-96.png',
    badge: './badge-96.png'
  });
});

// 📌 Instalación: activa esta versión de inmediato, sin esperar a que
// se cierren las demás pestañas abiertas.
self.addEventListener('install', () => {
  self.skipWaiting();
});

// 📌 Activación: toma control de las páginas abiertas de inmediato.
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 👆 Al hacer clic en una notificación, abre/enfoca la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
