// Eine einzige Stelle erklärt HTML für die Einfüge-Senke als zulässig. Der Server verlangt
// require-trusted-types-for 'script'; der Browser lehnt damit jede andere Einfügestelle im
// Browsercode ab, statt auf die Sorgfalt jeder einzelnen Datei zu bauen.
// Die Prüfung erkennt keinen freitextlichen Inhalt: esc() macht aus Anführungszeichen &quot;,
// ausgeescapter Nutertext bleibt also zulässig. Ein echtes Eventhandler-Attribut bliebe
// unverändert stehen und wird abgelehnt.
const forbidden=[
  /<\s*(?:script|iframe|object|embed)\b/i,
  /\son[a-z]{2,}\s*=\s*["']/i,
  /(?:href|src)\s*=\s*["']?\s*javascript:/i
];
export function checkedMarkup(markup){
  for(const pattern of forbidden)if(pattern.test(markup))throw Error('Markup abgelehnt: '+pattern);
  return markup;
}
const absoluteUrl=/[a-z][a-z0-9+.-]*:|^\/\//i;
export function checkedScriptURL(url){
  if(typeof url!=='string'||absoluteUrl.test(url))throw Error('Skript-URL abgelehnt: '+url);
  return url;
}
const policy=globalThis.trustedTypes?.createPolicy?.('sprachinseln-render',{createHTML:(markup)=>markup,createScriptURL:(url)=>checkedScriptURL(url)});
// Tag-Funktion: die interpolierten Werte bleiben, wie sie sind — sie kommen in diesem Projekt
// bereits esc() durchlaufen. Der Tag bündelt sie und erklärt nur hier HTML als zulässig.
export function renderHTML(strings,...values){
  let markup=strings[0];
  for(let index=0;index<values.length;index++)markup+=String(values[index])+strings[index+1];
  const safe=checkedMarkup(markup);
  return policy?policy.createHTML(safe):safe;
}
// Eigene Skripte werden nur relativ zum eigenen Verzeichnis geladen; der Service Worker braucht dafür TrustedScriptURL.
export function renderScriptURL(url){
  const safe=checkedScriptURL(url);
  return policy?policy.createScriptURL(safe):safe;
}
