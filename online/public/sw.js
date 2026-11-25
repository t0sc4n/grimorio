// Grimorio — service worker: app disponibile anche con rete lenta, notifiche "Tocca a te".
const CACHE = "grimorio-v16";
const SHELL = ["/", "/index.html", "/app.js", "/fonts.css", "/engine.js", "/manifest.webmanifest", "/icon.svg", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/") || url.pathname === "/ws") return;
  // pagina e motore: prima la rete (per avere sempre l'ultima versione), poi la copia salvata
  if (url.pathname === "/" || url.pathname.endsWith(".html") || url.pathname === "/engine.js" || url.pathname === "/app.js") {
    e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match("/index.html"))));
    return;
  }
  // dizionario, icone, font: prima la copia salvata
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
    if (r.ok && (url.pathname === "/parole.txt" || url.pathname === "/words-en.txt" || url.pathname.startsWith("/icon") || url.pathname.startsWith("/fonts"))) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  })));
});

self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Grimorio", {
    body: d.body || "Tocca a te!",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: d.tag || "grimorio",
    renotify: true,
    data: { url: d.url || "/" }
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "/", location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) if (new URL(c.url).origin === location.origin) { c.navigate(url); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
