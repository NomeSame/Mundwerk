import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, matchWords, matchMeanings, learningCards, recordAttempt } from '../dist/core/learning.js';
import { vocabulary } from '../dist/data/vocabulary.js';
import { createRepository, emptyProfile } from '../dist/data/progress.js';
import { createStore } from '../dist/state/store.js';
const entry = id => vocabulary.find(v => v.id === id);
function memory() { const map = new Map(); return { getItem:k=>map.get(k) ?? null, setItem:(k,v)=>map.set(k,v) }; }
test('Unicode, spaces and case normalize; meaningful accents remain', () => {
  assert.equal(normalize('  CAFE\u0301 '), 'café');
  assert.notEqual(normalize('si'), normalize('sí'));
  assert.equal(normalize(null), '');
});
test('word input handles empty, duplicate, unknown and long input', () => {
  assert.deepEqual(matchWords('', vocabulary), []);
  const result = matchWords('HOLA, hola\nagua;inventado', vocabulary);
  assert.equal(result.length, 3); assert.equal(result[0].entry.id,'hola'); assert.equal(result[2].entry,null);
  assert.equal(matchWords(Array(10000).fill('hola').join(','),vocabulary).length,1);
});
test('meanings are checked individually with comma-separated variants', () => {
  assert.deepEqual(matchMeanings('Rechnung',entry('cuenta')),['bill']);
  assert.deepEqual(matchMeanings('rechnung, Konto',entry('cuenta')),['bill','account']);
  assert.deepEqual(matchMeanings('falsch',entry('cuenta')),[]);
  assert.deepEqual(matchMeanings(null,entry('agua')),[]);
});
test('cards have unique meaning-specific keys and exclude other topics', () => {
  const cards = learningCards('cafe',vocabulary);
  assert.equal(new Set(cards.map(c=>c.key)).size,cards.length);
  assert.equal(cards.filter(c=>c.entry.id==='cuenta').length,1);
  assert.equal(cards.filter(c=>c.entry.id==='cafe').length,2);
  assert.ok(!cards.some(c=>c.key==='cuenta:account'));
  assert.ok(learningCards('alltag',vocabulary).some(c=>c.key==='cuenta:account'));
  assert.ok(!cards.some(c=>c.entry.id==='puerta'));
  assert.deepEqual(learningCards('unknown',vocabulary),[]);
});
test('attempt history is immutable and tracks errors', () => {
  const original = {};
  const progress = recordAttempt(recordAttempt(original,'agua:water',true),'agua:water',false);
  assert.deepEqual(original,{});
  assert.deepEqual(progress['agua:water'],{attempts:2,correct:1,lastCorrect:false});
});
test('storage roundtrips, rejects broken data and surfaces permission failures', () => {
  const storage = memory(); const repo = createRepository(storage); const profile = emptyProfile();
  assert.deepEqual(repo.load().profile,profile);
  assert.equal(repo.save(profile),''); assert.deepEqual(repo.load().profile,profile);
  storage.setItem('sprachinseln.v1','{'); assert.ok(repo.load().error);
  storage.setItem('sprachinseln.v1',JSON.stringify({...profile,progress:{x:{attempts:1,correct:5}}})); assert.ok(repo.load().error);
  const blocked = createRepository({getItem(){throw Error();},setItem(){throw Error();}});
  assert.ok(blocked.load().error); assert.ok(blocked.save(profile));
});
test('onboarding warns before skip and never promotes unknown words', () => {
  const store = createStore(createRepository(memory()));
  store.words('hola, invented'); assert.equal(store.acceptWords(),false);
  store.correctWords('hola, invented'); assert.equal(store.state.round,2);
  assert.equal(store.acceptWords(true),true);
  assert.equal(store.state.words.length,1);
  assert.equal(store.translations({hola:'falsch'}),false);
  store.translations({hola:'falsch'},true);
  assert.deepEqual(store.state.profile.known,[]);
});
test('only confirmed meanings transfer and persist after topic choice', () => {
  const storage = memory(); const store = createStore(createRepository(storage));
  store.words('cuenta, agua'); store.acceptWords();
  store.translations({cuenta:'Rechnung',agua:'Wasser'});
  assert.deepEqual(store.state.profile.known,['cuenta:bill','agua:water']);
  assert.equal(store.state.page,'insight');
  store.chooseTopic('cafe');
  assert.equal(createStore(createRepository(storage)).state.page,'home');
  assert.ok(!store.state.profile.known.includes('cuenta:account'));
});
test('session accepts Spanish answers, rejects German and records once per question', () => {
  const store = createStore(createRepository(memory())); store.chooseTopic('alltag'); store.start();
  store.check(' HALLO '); assert.equal(store.state.correct,false);
  store.check('hola'); assert.equal(store.state.profile.progress['hola:hello'].attempts,1);
  store.next(); store.check(store.state.cards[store.state.index].entry.word.toUpperCase());
  assert.equal(store.state.correct,true);
  while(store.state.page === 'lesson') {store.next(); if(store.state.page==='lesson') store.check('');}
  assert.equal(store.state.page,'done'); assert.equal(store.state.sessionCorrect,1);
});
