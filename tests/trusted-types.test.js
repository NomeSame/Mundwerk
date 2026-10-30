import test from 'node:test';
import assert from 'node:assert/strict';
import { checkedMarkup, renderHTML, renderScriptURL } from '../dist/infrastructure/trusted-types.js';
const esc = (value) => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

test('die Render-Richtlinie lehnt Markup mit eigener Skript- oder Eventhandler-Stelle ab', () => {
  assert.equal(checkedMarkup('<p class="eyebrow" data-action="start">Anfang</p>'), '<p class="eyebrow" data-action="start">Anfang</p>');
  for (const dangerous of [
    '<p>Text</p><script>alert(1)</script>',
    '<b onclick="alert(1)">fett</b>',
    '<a href="javascript:alert(1)">Link</a>',
    '<IFRAME src="https://example.org"></IFRAME>',
    '<object data="x.svg"></object>'
  ]) assert.throws(() => checkedMarkup(dangerous), /Markup abgelehnt/, dangerous);
});
test('ausescapter Freitext bleibt zulässig, unverdächtiges Markup auch', () => {
  const word = 'Ampel <amp> "grün" onclick="x" on=1';
  const markup = String(renderHTML`<strong>${esc(word)}</strong>`);
  assert.equal(markup, `<strong>${esc(word)}</strong>`);
  assert.ok(markup.includes('&lt;amp&gt;') && markup.includes('onclick=&quot;x&quot;'), markup);
});
test('fremde und gefährrliche Skript-Adressen werden abgelehnt, die eigene Datei nicht', () => {
  assert.equal(String(renderScriptURL('./sw.js')),'./sw.js');
  for(const dangerous of ['javascript:import(1)','https://cdn.example.org/sw.js','//example.org/sw.js','data:text/javascript,1','blob:https://example.org/x'])
    assert.throws(()=>renderScriptURL(dangerous),/Skript-URL abgelehnt/,dangerous);
});
test('der Render-Tag fügt interpolierte Werte unverändert ein und bleibt in Node eine Zeichenkette', () => {
  const markup = renderHTML`<h1>${esc('Mehr')}${esc(' Sprache')}</h1>`;
  assert.equal(typeof markup, 'string');
  assert.equal(String(markup), '<h1>Mehr Sprache</h1>');
});
