import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { usesWholeList, wholeList, foldWord, stripWordPrefix, MAX_ANSWER, pasteSummary } from '../dist/core/translation-paste.js';
import { bindEvents } from '../dist/ui/events.js';
import { assetPaths } from '../server/asset-list.mjs';
const WORDS=[{id:'hola',word:'hola'},{id:'gustaria',word:'me gustaría'},{id:'agua',word:'agua'},
  {id:'perro',word:'perro'},{id:'pero',word:'pero'},{id:'muy',word:'muy'}];
const t=(key,vars={})=>`${key}:${Object.values(vars).filter(value=>value!=='').join('/')}`;

test('ein Eintrag pro Zeile: die Liste füllt die Felder in Reihenfolge',()=>{
  const list=wholeList('hallo\ngefällt mir\nWasser\nHund\naber\nsehr',WORDS);
  assert.deepEqual(list.assigned.map(item=>[item.word,item.answer]),
    [['hola','hallo'],['me gustaría','gefällt mir'],['agua','Wasser'],['perro','Hund'],['pero','aber'],['muy','sehr']]);
  assert.equal(list.emptyFields,0);assert.equal(list.left.length,0);assert.equal(list.stopped,false);
});
test('das Ende wird erkannt: eine Leerzeile beendet die Eingabe für diese Felder',()=>{
  const list=wholeList('hallo\ngefällt mir\n\nWasser\nHund',WORDS);
  assert.deepEqual(list.values,{hola:'hallo',gustaria:'gefällt mir'});
  assert.deepEqual(list.left,['Wasser','Hund']);assert.equal(list.blank,true);assert.equal(list.stopped,true);
});
test('Abbruchmarkierungen beenden die Liste und melden den Rest',()=>{
  const list=wholeList('hallo\nfertig\nnicht mehr',WORDS);
  assert.equal(list.values.hola,'hallo');assert.equal(list.marker,'fertig');assert.deepEqual(list.left,['nicht mehr']);
  assert.deepEqual(wholeList('hallo\n---\nWasser',WORDS).left,['Wasser']);
  assert.equal(wholeList('ok',WORDS).stopped,true);assert.equal(wholeList('ok',WORDS).assigned.length,0);
  assert.equal(list.values.gustaria,undefined,'nach dem Ende wird nichts mehr verteilt');
});
test('Komma bleibt im Feld, Semikolon springt ins nächste Feld',()=>{
  const zeilen=wholeList('hallo, hi\nWasser, Gewässer\nHund, Rüde',WORDS);
  assert.deepEqual(zeilen.values,{hola:'hallo, hi',gustaria:'Wasser, Gewässer',agua:'Hund, Rüde'});
  assert.equal(zeilen.assigned.length,3);assert.equal(zeilen.emptyFields,3);
  const liste=wholeList('hallo, hi; Wasser, Gewässer; Hund, Rüde; aber; sehr',WORDS);
  assert.deepEqual(liste.values,{hola:'hallo, hi',gustaria:'Wasser, Gewässer',agua:'Hund, Rüde',
    perro:'aber',pero:'sehr'},'eine Zeile mit Semikolata füllt alle Felder von oben nach unten');
  assert.equal(liste.stopped,false);assert.equal(liste.left.length,0);
  assert.equal(usesWholeList('hallo, hi'),false,'nur Kommas sind keine Liste');
  assert.equal(usesWholeList('hallo; hi'),true,'ein Semikolon ist eine Liste');
});
test('ein Semikolon am Listenende ist kein Abbruch, ein doppelt gesetztes schon',()=>{
  const ende=wholeList('hallo; Wasser;',WORDS);
  assert.deepEqual(ende.values,{hola:'hallo',gustaria:'Wasser'});
  assert.equal(ende.stopped,false);assert.equal(ende.left.length,0,'das leere Stück am Ende wird nicht gemeldet');
  const lücke=wholeList('hallo;; Wasser',WORDS);
  assert.deepEqual(lücke.values,{hola:'hallo'});assert.deepEqual(lücke.left,['Wasser']);
  assert.equal(lücke.blank,true);
});
test('senkrechte Striche trennen die Liste, wenn der Rechner Zeilenumbrüche schluckt',()=>{
  assert.deepEqual(wholeList('hallo | gefällig | Wasser',WORDS).values,{hola:'hallo',gustaria:'gefällig',agua:'Wasser'});
});
test('Wortvorgabe ordnet das Feld selbst ein, ohne Akzente und Großschreibung',()=>{
  assert.deepEqual(wholeList('PERO: aber',WORDS).values,{pero:'aber'});
  assert.deepEqual(wholeList('ME GUSTARÍA gefällt mir',WORDS).values,{gustaria:'gefällt mir'});
  assert.deepEqual(wholeList('perro Hund',WORDS).values,{perro:'Hund'},'perro gewinnt vor pero');
  assert.deepEqual(wholeList('hola: pero: aber',WORDS).values,{hola:'pero: aber'},'zweite Übersetzung bleibt Text');
  assert.deepEqual(wholeList('aber',WORDS).values,{hola:'aber'},'unbekannte Vorgabe wird nicht zerschnitten');
  assert.equal(stripWordPrefix('muy muy','muy'),'muy');assert.equal(stripWordPrefix('muy','muy'),null);
});
test('Einfügen in einem mittleren Feld füllt von dort an, nicht von vorn',()=>{
  assert.deepEqual(wholeList('Wasser\nHund\naber\nsehr',WORDS,2).values,{agua:'Wasser',perro:'Hund',pero:'aber',muy:'sehr'});
  assert.deepEqual(wholeList('hallo',WORDS,3).values,{perro:'hallo'});
});
test('zu viele Angaben werden gemeldet, nicht über verdeckte Felder verteilt',()=>{
  const list=wholeList('eins\ndrei\nfünf\nsieben\nneun',WORDS,4);
  assert.deepEqual(list.values,{pero:'eins',muy:'drei'});assert.deepEqual(list.left,['fünf','sieben','neun']);
});
test('dasselbe Wort zweimal in der Liste überschreibt sein Feld nicht',()=>{
  const list=wholeList('hola: aber\nhola: sondern',WORDS);
  assert.deepEqual(list.values,{hola:'aber'});assert.deepEqual(list.left,['sondern']);
});
test('zu lange Angaben passieren das Feld nicht und die Liste bleibt ausgerichtet',()=>{
  const list=wholeList(`${'a'.repeat(MAX_ANSWER+1)}\nWasser`,WORDS);
  assert.deepEqual(list.values,{gustaria:'Wasser'});assert.deepEqual(list.tooLong,['hola']);
  assert.equal(MAX_ANSWER,300);
});
test('gewöhnliches Einfügen bleibt auf dem alten Weg',()=>{
  assert.equal(usesWholeList('hallo'),false);assert.equal(usesWholeList('hallo, hi'),false);
  assert.equal(usesWholeList(''),false);assert.equal(usesWholeList('hallo\nhi'),true);assert.equal(usesWholeList('fertig'),true);
});
test('die Rückmeldung zählt sichtbar: gefüllt, Ende, übrig, zu lang',()=>{
  const list=wholeList(`hallo\n${'x'.repeat(MAX_ANSWER+1)}\n\nWasser`,WORDS);
  assert.equal(pasteSummary(list,WORDS.length,t),'pasteFilled:1/6 pasteBlank:1 pasteCut:1');
  assert.equal(pasteSummary(wholeList('a\nb\nc',WORDS,5),WORDS.length,t),'pasteFilled:1/6 pasteLeft:2');
  assert.equal(pasteSummary(wholeList('hallo\nfertig\nx',WORDS),WORDS.length,t),'pasteFilled:1/6 pasteStopped:fertig/1');
});
test('Wortvergleich ignoriert Akzente und Großschreibung',()=>{
  assert.equal(foldWord('  ME GUSTARÍA  '),'me gustaria');assert.equal(foldWord('PERÓ'),foldWord('pero'));
});
test('die Einfügeaktion schreibt in die Felder, merkt die Werte und sagt, was offen bleibt',()=>{
  const handlers={};let prevented=false;const focused=[];const drafts=[];const status={textContent:''};
  const inputs=WORDS.map(item=>({name:item.id,value:'',
    closest:selector=>selector==='.meaning-input'?inputs.find(entry=>entry.name===item.id):null,
    focus(){focused.push(this.name);}}));
  const form={dataset:{form:'translations'},
    queryAll:0,querySelectorAll:selector=>selector==='.meaning-input'?inputs:[],
    querySelector:selector=>selector.startsWith('[name=')?inputs.find(entry=>selector===`[name="${entry.name}"]`):null};
  for(const item of inputs)Object.defineProperty(item,'form',{value:form});
  const root={addEventListener:(name,handler)=>handlers[name]=handler,
    querySelector:selector=>selector.includes('paste-status')?status:null};
  bindEvents(root,{state:{profile:{},words:WORDS.map(item=>({entry:item}))},translationDraft:(id,value)=>drafts.push([id,value])},{});
  handlers.paste({target:inputs[0],preventDefault(){prevented=true;},clipboardData:{getData:()=>'hallo\ngefällt mir\nWasser'}});
  assert.equal(prevented,true,'das rohe Mehrfach-Einfügen darf nicht ins erste Feld fallen');
  assert.deepEqual(drafts,[['hola','hallo'],['gustaria','gefällt mir'],['agua','Wasser']]);
  assert.deepEqual([inputs[0].value,inputs[1].value,inputs[2].value,inputs[3].value],['hallo','gefällt mir','Wasser','']);
  assert.match(status.textContent,/3 von 6/);
  assert.deepEqual(focused,['perro'],'das nächste leere Feld bekommt den Fokus');
  prevented=false;
  handlers.paste({target:inputs[0],preventDefault(){prevented=true;},clipboardData:{getData:()=>'nur ein Wort'}});
  assert.equal(prevented,false,'gewöhnliches Einfügen bleibt dem Browser überlassen');
  assert.match(status.textContent,/nur dieses eine Feld/,'nach einer einzelnen Zeile steht der Hinweis, nicht die alte Zahl');
  handlers.paste({target:{closest:()=>null},preventDefault(){prevented=true;},clipboardData:{getData:()=>'hallo\nhi'}});
  assert.equal(prevented,false,'andere Felder bleiben unberührt');
});
test('das neue Modul ist ausgeliefert, offline vorgeladen und maxlength bleibt gekoppelt',async()=>{
  assert.ok(assetPaths.includes('/core/translation-paste.js'));
  const worker=await readFile(new URL('../dist/sw.js',import.meta.url),'utf8');
  assert.match(worker,/'\.\/core\/translation-paste\.js'/);
  assert.match(worker,/sprachinseln-static-v1[6-9]/);
  assert.match(await readFile(new URL('../dist/ui/meaning-review.js',import.meta.url),'utf8'),/maxlength="\$\{MAX_ANSWER\}"/);
});
