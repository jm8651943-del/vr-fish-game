const VERSION='fish-arena-2d-pwa-v2';
const SHELL=['/','/index.html','/arcade2d.css','/arcade2d-art.js','/topdown-art.js','/arcade2d.js','/install-app.js','/arcade2d.webmanifest','/icons/fish-192.png','/icons/fish-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('fish-arena-2d-pwa-')&&k!==VERSION).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch',e=>{
 const req=e.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==location.origin||url.pathname.startsWith('/api/'))return;
 if(req.mode==='navigate'){
  e.respondWith(fetch(req).then(res=>{if(res.ok){const clone=res.clone();caches.open(VERSION).then(c=>c.put('/',clone)).catch(()=>{})}return res}).catch(async()=>await caches.match('/')||Response.error()));
 }else{
  e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{if(res.ok){const clone=res.clone();caches.open(VERSION).then(c=>c.put(req,clone)).catch(()=>{})}return res})));
 }
});