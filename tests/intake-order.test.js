import test from 'node:test';
import assert from 'node:assert/strict';
import {matchWords,mergeCorrections,correctionReport} from '../dist/core/matching.js';
import {directedContent} from '../dist/core/content-direction.js';
import {createStore} from '../dist/state/store.js';
import {createRepository} from '../dist/data/progress.js';
import {wordReview} from '../dist/ui/word-review.js';
import {translationView} from '../dist/ui/meaning-review.js';

const memory=()=>{const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};};
const open=storage=>{const store=createStore(createRepository(storage));store.subscribe(()=>{});return store;};
const labels=html=>[...html.matchAll(/<label for="t-[^"]+">([^*<]+)/g)].map(match=>match[1]);

const {vocabulary} = directedContent('de', 'es');
// Prompt 2026-11-01: the translation round must follow the position the user typed.
const userList = 'hola, me gustaria, agua, perro, pero, muy, bien, tardes, noches, dia, salida, cuanto, cuesta, tambien, amor, puta, te qierro, mas, menos, manos, lavate, gracias, caballo, trabajo, gusto, bebe, por, favor, pagar, uno, dos, tres, cuatro, sinque, seis, ocho, nueve, diez, que, porque, grande, adventura, aproximadamente, como, nombre, hombre, mujer, creo, creo que, no, si, hablo, espanol, poco, ayuda, disculpe, esta, calle, queso, loco, pollo, hermanos, leche, tarjeta, manzana, dinero, amigo';

test('intake keeps the typed position of every word, whatever the separator', () => {
  const items = matchWords('hola; agua\nperro, pero ; muy', vocabulary);
  assert.deepEqual(items.map(item => [item.word, item.slot]),
    [['hola', 1], ['agua', 2], ['perro', 3], ['pero', 4], ['muy', 5]]);
  assert.deepEqual(matchWords('hola, hola, hola', vocabulary).map(item => item.slot), [1]);
  assert.deepEqual(matchWords('', vocabulary), []);
});

test('a correction refills the original slot instead of appending at the end', () => {
  const previous = matchWords('hola, trabacho, dia', vocabulary);
  const merged = mergeCorrections(previous, 'trabajo', vocabulary);
  assert.deepEqual(merged.map(item => [item.word, item.entry?.word, item.slot]),
    [['hola', 'hola', 1], ['trabajo', 'trabajo', 2], ['dia', 'día', 3]]);
});

test('the real 67 word list keeps all 67 positions through a correction round', () => {
  const first = matchWords(userList, vocabulary);
  assert.equal(first.length, 67);
  assert.deepEqual(first.map(item => item.slot), Array.from({ length: 67 }, (_, i) => i + 1));
  assert.deepEqual(first.filter(item => !item.entry).map(item => item.slot), [17, 21, 34, 42]);

  const fixed = mergeCorrections(first, 'te quiero, lavarte, cinco, aventura', vocabulary);
  assert.equal(fixed.length, 67);
  assert.deepEqual(fixed.filter(item => !item.entry), [], 'nothing may stay open');
  for (const [word, slot] of [['te quiero', 17], ['lavarte', 21], ['cinco', 34], ['aventura', 42]]) {
    const item = fixed.find(entry => entry.word === word);
    assert.ok(item, word);
    assert.equal(item.slot, slot, word + ' keeps its intake position');
    assert.ok(item.entry, word + ' is resolved');
  }
  const order = fixed.map(item => item.entry.word);
  assert.deepEqual(order.slice(15, 19), ['puta', 'te quiero', 'mas', 'menos']);
  assert.deepEqual(order.slice(32, 36), ['cuatro', 'cinco', 'seis', 'ocho']);
  assert.equal(order.at(-1), 'amigo', 'the last typed word stays last');
});

test('later rounds keep the slot, a corrected word never jumps to the end', () => {
  let items = matchWords('perro, sinque, queso', vocabulary);
  items = mergeCorrections(items, 'sinque', vocabulary);
  assert.equal(items.length, 3);
  assert.equal(items.filter(item => !item.entry).length, 1, 'an unchanged word stays pending in its slot');
  assert.equal(items[1].word, 'sinque');
  assert.equal(items[1].slot, 2);
  items = mergeCorrections(items, 'doscientos', vocabulary);
  assert.deepEqual(items.map(item => [item.word, item.slot]), [['perro', 1], ['doscientos', 2], ['queso', 3]]);
});

test('out of order corrections keep their own slots, unchanged words stay pending there', () => {
  const previous = matchWords('lavate, sinque, adventura, te qierro', vocabulary);
  const merged = mergeCorrections(previous, 'lavarte, adventura', vocabulary);
  assert.deepEqual(merged.map(item => [item.word, item.entry?.word ?? null, item.slot]),
    [['lavarte', 'lavarte', 1], ['adventura', null, 3]]);
  assert.deepEqual(correctionReport(previous, merged), { added: [], dropped: ['sinque', 'te qierro'] }, 'lines that were not submitted are reported as dropped');
});

test('additions beyond the open words get a fresh slot and are reported', () => {
  const previous = matchWords('hola, sinque, perro', vocabulary);
  const merged = mergeCorrections(previous, 'cinco, novio', vocabulary);
  assert.deepEqual(merged.map(item => [item.entry?.word ?? item.word, item.slot]),
    [['hola', 1], ['cinco', 2], ['perro', 3], ['novio', 4]]);
  const report = correctionReport(previous, merged);
  assert.deepEqual(report.added, ['novio'], 'the extra word was not silently merged into a pending slot');
  assert.deepEqual(report.dropped, []);
  assert.equal(new Set(merged.map(item => item.slot)).size, merged.length, 'slots stay unique');
});

test('open words left out of the correction are dropped and reported, never silently kept', () => {
  const previous = matchWords('hola, sinque, lavate, perro', vocabulary);
  const merged = mergeCorrections(previous, 'cinco', vocabulary);
  assert.deepEqual(merged.map(item => [item.entry?.word ?? item.word, item.slot]),
    [['hola', 1], ['cinco', 2], ['perro', 4]]);
  assert.deepEqual(correctionReport(previous, merged), { added: [], dropped: ['lavate'] });
});

test('already recognized words may be retyped without stealing a pending slot or duplicating', () => {
  const previous = matchWords('hola, agua, trabacho', vocabulary);
  const merged = mergeCorrections(previous, '', vocabulary);
  assert.deepEqual(merged.map(item => item.entry.id), ['hola', 'agua']);
  assert.deepEqual(correctionReport(previous, merged).dropped, ['trabacho']);
  const again = mergeCorrections(previous, 'hola, trabajo', vocabulary);
  assert.deepEqual(again.map(item => item.word), ['hola', 'agua', 'trabajo']);
  assert.deepEqual(correctionReport(previous, again), { added: [], dropped: [] });
});

test('decomposed accents and single element lists behave the same', () => {
  const composed = matchWords('perro, dia', vocabulary);
  assert.equal(mergeCorrections(composed, 'perro, día'.normalize('NFD'), vocabulary).length, 2);
  const single = matchWords('sinque', vocabulary);
  assert.equal(single.length, 1);
  assert.equal(single[0].slot, 1);
  assert.deepEqual(mergeCorrections(single, 'cinco', vocabulary).map(item => [item.word, item.slot]), [['cinco', 1]]);
});

test('position keeping behaves identically in all six language directions', () => {
  for (const [base, target] of [['de', 'es'], ['es', 'de'], ['de', 'pt-BR'], ['pt-BR', 'de'], ['es', 'pt-BR'], ['pt-BR', 'es']]) {
    const content = directedContent(base, target);
    const [first, third] = [content.vocabulary[0].word, content.vocabulary[2].word];
    const items = matchWords(`querwortxyz, ${first}`, content.vocabulary);
    assert.equal(items.length, 2, `${base}->${target}`);
    assert.equal(items[0].entry, null, `${base}->${target}: first position is open`);
    const fixed = mergeCorrections(items, third, content.vocabulary);
    assert.deepEqual(fixed.map(item => [item.entry?.word, item.slot]), [[third, 1], [first, 2]], `${base}->${target}: refill happens where the open word stood`);
    assert.ok(fixed.every(item => item.entry), `${base}->${target}`);
  }
});


test('the meaning round asks for translations in the typed order, without visible numbers', () => {
  const store=open(memory());
  store.words(userList);
  store.correctWords('te quiero, lavarte, cinco, aventura');
  assert.equal(store.state.correctionDraft,'');
  assert.equal(store.acceptWords(),true);
  assert.equal(store.state.page,'translations');
  const html=translationView(store.state);
  const asked=labels(html);
  assert.equal(asked.length,67,'every recognized word is asked for');
  assert.deepEqual([asked[0],asked[16],asked[33],asked[66]],['hola','te quiero','cinco','amigo']);
  assert.ok(asked.every(label=>!/^\s*\d/.test(label)),'positions are never printed');
  assert.ok(!html.includes('data-slot'),'slots stay internal');
});

test('the pending list and the pre-filled correction draft follow the typed order', () => {
  const store=open(memory());
  store.words('hola, sinque, perro, adventura, lavate');
  assert.deepEqual(store.state.words.map(item=>item.slot),[1,2,3,4,5]);
  assert.equal(store.state.correctionDraft,'sinque\nadventura\nlavate');
  const html=wordReview(store.state);
  const pending=[...html.matchAll(/<li class="unrecognized[^>]*>[\s\S]*?<strong>([^<]+)<\/strong>/g)].map(match=>match[1]);
  assert.deepEqual(pending,['sinque','adventura','lavate']);
  assert.ok(!html.includes('data-slot'));
});

test('a correction reports additions in the interface language', () => {
  for (const [locale,target,phrase] of [['de','es','Neu aufgenommen'],['es','de','Añadido'],['pt-BR','es','Adicionado']]) {
    const store=open(memory());
    store.languages(locale,target);
    const content=directedContent(locale,target);
    // The rewrite stays unrecognized, so the extra line must be reported as an addition.
    store.words(`${content.vocabulary[0].word}, querwortxyz`);
    store.correctWords('querwortxyzq, '+content.vocabulary[1].word);
    assert.deepEqual(store.state.mergeReport,{added:[content.vocabulary[1].word],dropped:[]},locale);
    const html=wordReview(store.state);
    assert.ok(html.includes('data-merge-report'),locale);
    assert.ok(html.includes(phrase),locale);
    assert.deepEqual(html.match(/data-merge-report[^>]*>([^<]*)/)[1],`${phrase}: ${content.vocabulary[1].word}.`,locale);
  }
});

test('positions survive a reload, including the gap left by a dropped word', () => {
  const storage=memory();
  let store=open(storage);
  store.words('hola, lavate, sinque, perro, adventura');
  store.correctWords('lavarte, adventura');
  assert.deepEqual(store.state.words.map(item=>[item.word,item.slot]),[['hola',1],['lavarte',2],['perro',4],['adventura',5]]);
  assert.deepEqual(store.state.mergeReport,{added:[],dropped:['sinque']});
  store=open(storage);
  assert.equal(store.state.page,'word-check');
  assert.equal(store.state.round,2);
  assert.deepEqual(store.state.words.map(item=>[item.word,item.entry?.word??null,item.slot]),
    [['hola','hola',1],['lavarte','lavarte',2],['perro','perro',4],['adventura',null,5]]);
  assert.equal(store.state.correctionDraft,'adventura','the still open word is offered again at its place');
  assert.equal(store.state.mergeReport,null,'one-shot feedback is not replayed after reload');
});

test('a reopened session keeps filling the old positions instead of appending again', () => {
  const storage=memory();
  let store=open(storage);
  store.words('hola, trabacho, dia');
  store=open(storage);
  assert.deepEqual(store.state.words.map(item=>item.slot),[1,2,3]);
  store.correctWords('trabajo');
  assert.deepEqual(store.state.words.map(item=>[item.entry?.word,item.slot]),[['hola',1],['trabajo',2],['día',3]]);
});
