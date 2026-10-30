import { renderScriptURL } from './trusted-types.js';
export function getStorage() { try { return window.localStorage; } catch { return {getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}; } }
export function download(profile) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(profile,null,2)], {type:'application/json'}));
  const link = document.createElement('a'); link.href = url; link.download = 'sprachinseln-fortschritt.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function registerOffline(onError=()=>{}) {
  if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register(renderScriptURL('./sw.js')).catch(() => {
    onError();
  });
}
