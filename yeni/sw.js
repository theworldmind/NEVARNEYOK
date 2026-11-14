/* Eski adres: bildirim service worker'ı artık /sw.js. Bu dosya kendini kaldırır. */
self.addEventListener("install",()=>self.skipWaiting());self.addEventListener("activate",e=>e.waitUntil(self.registration.unregister()));
