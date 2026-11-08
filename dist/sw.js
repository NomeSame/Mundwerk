const CACHE = 'sprachinseln-static-v27';
const FILES = ['./','./index.html','./styles.css','./main.js','./model/content.js','./model/practice.js','./data/vocabulary.js','./data/market-content.js','./data/topics.js','./data/lexicon.js','./data/sentences.js','./data/replies.js','./data/progress.js','./data/pt-vocabulary.js','./data/pt-sentences.js','./data/reply-locales.js','./data/topic-locales.js','./core/content-direction.js','./core/learning.js','./core/matching.js','./core/meaning-search.js','./core/meaning-assessment.js','./core/meaning-policy.js','./core/translation-paste.js','./data/language-forms.js','./data/meaning-rules.js','./ui/meaning-review.js','./core/reply-assessment.js','./core/session.js','./state/store.js','./state/checkpoint.js','./ui/view.js','./ui/components.js','./ui/context.js','./ui/messages.js','./ui/assessment.js','./ui/word-review.js','./ui/practice.js','./ui/events.js','./infrastructure/platform.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('sprachinseln-static-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Cache only the explicit app assets, never authentication or unknown responses.
  const known = FILES.some(file => new URL(file, self.registration.scope).pathname === url.pathname);
  if (!known) return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok && !response.redirected){
      const copy=response.clone();
      event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));
    }
    return response;
  }).catch(()=>caches.match(event.request,{ignoreSearch:true}).then(hit=>hit||new Response('Offline-Datei nicht verfügbar.',{status:503}))));
});
