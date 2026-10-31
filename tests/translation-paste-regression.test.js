import test from 'node:test';
import assert from 'node:assert/strict';
import {wholeList,stripWordPrefix,MAX_PASTE} from '../dist/core/translation-paste.js';
const words=[{id:'a',word:'hola'},{id:'b',word:'agua'},{id:'c',word:'perro'}];
test('Windows and old Mac newlines retain all entries; a real blank line stops',()=>{
  for(const delimiter of ['\r\n','\r','\n'])assert.deepEqual(wholeList(['Hallo','Wasser','Hund'].join(delimiter),words).values,{a:'Hallo',b:'Wasser',c:'Hund'});
  assert.deepEqual(wholeList('Hallo\r\n\r\nHund',words).values,{a:'Hallo'});
  assert.deepEqual(wholeList('Hallo;\r\nWasser;\r\nHund',words).values,{a:'Hallo',b:'Wasser',c:'Hund'});
});
test('existing drafts survive sequential and labelled pastes',()=>{
  const result=wholeList('Hallo\nHund',words,0,{b:'mein Wasser'});
  assert.deepEqual(result.values,{a:'Hallo',c:'Hund'});assert.equal(result.emptyFields,0);
  const conflict=wholeList('agua: neu\nperro: Hund',words,2,{b:'mein Wasser'});
  assert.deepEqual(conflict.values,{c:'Hund'});assert.deepEqual(conflict.left,['neu']);
});
test('labelled entries remain assignable in arbitrary order even after the final field',()=>{
  assert.deepEqual(wholeList('perro: Hund\nagua: Wasser\nhola: Hallo',words).values,{c:'Hund',b:'Wasser',a:'Hallo'});
});
test('localized stop markers and an oversized paste are handled explicitly',()=>{
  for(const marker of ['listo','pronto','fertig','done'])assert.deepEqual(wholeList(`Hallo\n${marker}\nHund`,words).values,{a:'Hallo'});
  const oversized=wholeList('x'.repeat(MAX_PASTE+1),words);assert.equal(oversized.oversized,true);assert.deepEqual(oversized.values,{});
});
test('prefix comparison handles decomposed accents and literal punctuation',()=>{
  assert.equal(stripWordPrefix('ME GUSTARI\u0301A gefallen','me gustaría'),'gefallen');
  assert.equal(stripWordPrefix('¿qué? was','¿qué?'),'was');
  assert.equal(stripWordPrefix('[test] Bedeutung','[test]'),'Bedeutung');
});
