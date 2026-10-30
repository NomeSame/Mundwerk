import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../dist/state/store.js';
import {createRepository} from '../dist/data/progress.js';
import {wordReview} from '../dist/ui/word-review.js';
const store=()=>createStore(createRepository({getItem:()=>null,setItem:()=>{}}));
test('second and later correction rounds retain editable pending words and recognized entries',()=>{
  const s=store();s.words('hola, trabacho, quanto');
  s.correctWords('trabajo, quanto');
  assert.equal(s.state.round,2);
  let html=wordReview(s.state);
  assert.match(html,/<textarea[^>]*id="corrected"[^>]*>quanto<\/textarea>/);
  assert.ok(html.includes('Offene Eingaben erneut prüfen'));
  assert.equal(s.acceptWords(),false);
  s.correctWords('quanto');
  assert.equal(s.state.round,3);
  assert.match(wordReview(s.state),/<textarea[^>]*id="corrected"[^>]*>quanto<\/textarea>/);
  s.correctWords('cuánto');
  assert.equal(s.state.round,4);
  assert.deepEqual(s.state.words.map(item=>item.entry.id),['hola','trabajo','cuanto']);
  assert.deepEqual(s.state.profile.known,[]);
  assert.ok(!wordReview(s.state).includes('id="corrected"'));
  assert.equal(s.acceptWords(),true);assert.equal(s.state.page,'translations');
});
test('repeated corrections remain available and localized for every interface language',()=>{
  for(const base of ['de','es','pt-BR']){
    const s=store();if(base!=='de')s.languages(base,base==='es'?'de':'es');
    s.words('xyzxyzxyz');s.correctWords('xyzxyzxyz');s.correctWords('xyzxyzxyz');
    const html=wordReview(s.state);
    assert.ok(html.includes('data-form="correction"'),base);
    assert.ok(!html.includes('von 2')&&!html.includes('de 2'),base);
    assert.equal(s.state.round,3);
    s.correctWords('');
    assert.equal(s.state.words.length,0);assert.deepEqual(s.state.profile.known,[]);
  }
});
