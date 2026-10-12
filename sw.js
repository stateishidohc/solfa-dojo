// ソルフェ道場 service worker — アプリ本体はネット優先(更新をすぐ反映)、音源・アイコンはキャッシュ優先(オフライン対応)
// キャッシュが使えない環境(プライベートブラウズ等)でも、必ずネットワークにフォールバックする
const VERSION = 'v8';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open('core-' + VERSION).then(c => c.addAll(CORE)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => !k.endsWith(VERSION)).map(k => caches.delete(k))
  )).catch(() => {}).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const isAsset = /\/(samples|icons)\//.test(req.url);
  if(isAsset){
    e.respondWith((async () => {
      try{
        const c = await caches.open('assets-' + VERSION);
        const hit = await c.match(req);
        if(hit) return hit;
        const res = await fetch(req);
        if(res.ok) c.put(req, res.clone()).catch(() => {});
        return res;
      }catch(err){
        return fetch(req);
      }
    })());
  }else{
    e.respondWith(fetch(req).then(res => {
      if(res.ok){ const copy = res.clone(); caches.open('core-' + VERSION).then(c => c.put(req, copy)).catch(() => {}); }
      return res;
    }).catch(async () => {
      try{ return (await caches.match(req)) || (await caches.match('./index.html')) || Response.error(); }
      catch(err){ return Response.error(); }
    }));
  }
});
