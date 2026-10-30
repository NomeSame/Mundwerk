import test from 'node:test';
import assert from 'node:assert/strict';
import {matchWords,assessAnswer} from '../dist/core/matching.js';
import {findByMeaning} from '../dist/core/meaning-search.js';
import {vocabulary} from '../dist/data/vocabulary.js';
import {createStore} from '../dist/state/store.js';
import {createRepository} from '../dist/data/progress.js';
import {wordReview} from '../dist/ui/word-review.js';
const store=()=>createStore(createRepository({getItem:()=>null,setItem:()=>{}}));
test('requested accent omissions are green, actual errors orange, unrecognized red',()=>{
  const s=store();s.words('dia, tambien, nino, questa, quanto, te qierro, trabacho, larvatei, nouvem');
  const expected=['orthography','orthography','orthography','suggestion','suggestion','suggestion','suggestion','unknown','unknown'];
  assert.deepEqual(s.state.words.map(w=>w.status),expected);
  assert.deepEqual(s.state.words.slice(0,3).map(w=>w.entry.word),['día','también','niño']);
  for(const word of s.state.words.slice(0,3))assert.ok(word.suggestions.length);
  const html=wordReview(s.state);
  assert.equal((html.match(/class="recognized"/g)??[]).length,3);
  assert.equal((html.match(/class="unrecognized suggested-word"/g)??[]).length,4);
  assert.equal((html.match(/class="unrecognized unknown-word"/g)??[]).length,2);
});
test('accent normalization preserves spaces and all non-diacritic letter differences',()=>{
  for(const word of ['megustaria','te qierro','quanto','trabacho'])assert.equal(matchWords(word,vocabulary)[0].entry,null,word);
  const s=store();s.words('dia, día, nino');s.acceptWords();
  assert.equal(s.state.words.length,2);
  s.translations({dia:'Tag',nino:'Junge'});
  assert.ok(s.state.profile.known.includes('dia:dia'));
  assert.ok(s.state.profile.known.includes('nino:nino'));
});
test('ambiguity from accent tolerance resolves through the users meaning, never both blindly',()=>{
  const s=store();s.words('si, bebe, mas');s.acceptWords();
  s.translations({'si-if':'ja',bebe:'Baby','mas-but':'mehr'});
  assert.ok(s.state.profile.known.includes('si:si'));
  assert.ok(s.state.profile.known.includes('bebe-baby:bebe-baby'));
  assert.ok(s.state.profile.known.includes('mas:mas'));
  assert.ok(!s.state.profile.known.includes('si-if:si-if'));
  assert.ok(!s.state.profile.known.includes('bebe:bebe'));
});
test('German meaning lookup recovers intended numbers and washing without any LLM',()=>{
  assert.ok(findByMeaning('neun',vocabulary).some(item=>item.word==='nueve'));
  assert.ok(findByMeaning('acht',vocabulary).some(item=>item.word==='ocho'));
  const washing=findByMeaning('ist das waschen gemeint',vocabulary);
  for(const word of ['lavar','lavarse','lavarte'])assert.ok(washing.some(item=>item.word===word));
  for(const explanation of ['', 'ich meine damit', 'Quantenverschränkung', 'nicht waschen'])assert.deepEqual(findByMeaning(explanation,vocabulary),[]);
});
test('meaning search does not auto-promote; confirmation is limited to displayed candidates',()=>{
  const s=store();s.words('dia, larvatei, nouvem');
  s.correctionDraft('larvatei\nnuovem');s.searchMeaning('larvatei','waschen');
  assert.equal(s.state.words[1].entry,null);
  assert.equal(s.state.correctionDraft,'larvatei\nnuovem');
  s.confirmMeaning('larvatei','nueve');assert.equal(s.state.words[1].entry,null);
  s.confirmMeaning('larvatei','lavarte');
  assert.equal(s.state.words[1].entry.id,'lavarte');assert.equal(s.state.words[1].status,'meaning');
  assert.equal(s.state.correctionDraft,'nuovem');
  assert.deepEqual(s.state.profile.known,[]);
  s.acceptWords(true);s.translations({dia:'Tag',lavarte:'dich waschen'});
  assert.ok(s.state.profile.known.includes('lavarte:lavarte'));
});
test('meaning results and explanations are escaped in rendered HTML',()=>{
  const s=store();s.words('larvatei');s.searchMeaning('larvatei','<script>alert(1)</script>');
  const html=wordReview(s.state);assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));
});
test('dedicated spelling chapter tests accents strictly without changing knowledge keys',()=>{
  const s=store();s.chooseTopic('alltag');s.configure('spelling','all');s.start();
  assert.ok(s.state.cards.length>20);assert.ok(s.state.cards.every(c=>c.kind==='spelling'));
  const card=s.state.cards[0];s.check(card.prompt);
  assert.equal(s.state.correct,false);assert.equal(s.state.spelling,true);
  assert.ok(Object.keys(s.state.profile.progress).every(key=>key.startsWith('spelling:')));
  assert.deepEqual(s.state.profile.known,[]);
  assert.equal(assessAnswer('nino',['niño']).correct,true);
  assert.equal(assessAnswer('nino',['niño'],{strictSpelling:true}).correct,false);
});
