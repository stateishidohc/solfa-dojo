// ソルフェ道場 service worker — アプリ本体はネット優先(更新をすぐ反映)、音源・アイコンはキャッシュ優先(オフライン対応)
const VERSION = 'v2';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open('core-' + VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => !k.endsWith(VERSION)).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const isAsset = /\/(samples|icons)\//.test(req.url);
  if(isAsset){
    e.respondWith(caches.open('assets-' + VERSION).then(async c => {
      const hit = await c.match(req);
      if(hit) return hit;
      const res = await fetch(req);
      if(res.ok) c.put(req, res.clone());
      return res;
    }));
  }else{
    e.respondWith(fetch(req).then(res => {
      if(res.ok){ const copy = res.clone(); caches.open('core-' + VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
  }
});
