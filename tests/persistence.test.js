import test from 'node:test';
import assert from 'node:assert/strict';
import {createRepository,emptyProfile} from '../dist/data/progress.js';
import {createStore} from '../dist/state/store.js';
const memory=()=>{const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};};
const open=storage=>{const store=createStore(createRepository(storage));store.subscribe(()=>{});return store;};
test('word intake, unknown corrections and all meaning drafts survive reload before onboarding completes',()=>{
  const storage=memory();let s=open(storage);s.beginAssessment();s.wordDraft('hola, agua, erfunden');
  s=open(storage);assert.equal(s.state.page,'known');assert.equal(s.state.wordDraft,'hola, agua, erfunden');
  s.words(s.state.wordDraft);s.correctionDraft('unbekannt');s=open(storage);
  assert.equal(s.state.page,'word-check');assert.equal(s.state.correctionDraft,'unbekannt');
  s.acceptWords(true);s.translationDraft('hola','hallo');s.translationDraft('agua','noch offen');
  s=open(storage);assert.equal(s.state.page,'translations');assert.deepEqual(s.state.translationAnswers,{hola:'hallo',agua:'noch offen'});
  assert.deepEqual(s.state.profile.known,[],'drafts must not count as confirmed knowledge');
  s.translations(s.state.translationAnswers);s=open(storage);
  assert.equal(s.state.meaningReviews.hola.status,'accepted');assert.equal(s.state.meaningReviews.agua.status,'unrecognized');
  s.translationDraft('agua','Wasser');s.translations(s.state.translationAnswers);s=open(storage);
  assert.deepEqual(s.state.profile.known,['hola:hello','agua:water']);assert.equal(s.state.page,'topics');
});
test('lesson order, unsubmitted answer, failed check, correction and next position survive reload without recounting',()=>{
  const storage=memory();let s=open(storage);s.chooseTopic('zahlen');s.configure('reply','all');s.start();
  const keys=s.state.cards.map(card=>card.key);s.answerDraft('mein Versuch');s=open(storage);
  assert.equal(s.state.page,'lesson');assert.equal(s.state.answer,'mein Versuch');assert.equal(s.state.index,0);
  assert.deepEqual(s.state.cards.map(card=>card.key),keys);
  s.check('falsch');s=open(storage);assert.equal(s.state.checked,true);assert.equal(s.state.correct,false);
  const key=s.state.cards[0].key;assert.equal(s.state.profile.progress[key].attempts,1);
  s.check('falsch');assert.equal(s.state.profile.progress[key].attempts,1);
  s.retryAnswer();s.answerDraft(s.state.cards[0].answers[0]);s=open(storage);
  assert.equal(s.state.retrying,true);s.check(s.state.answer);s=open(storage);
  assert.equal(s.state.correct,true);assert.equal(s.state.sessionCorrect,1);assert.equal(s.state.profile.progress[key].attempts,2);
  s.next();s=open(storage);assert.equal(s.state.index,1);assert.equal(s.state.checked,false);assert.equal(s.state.answer,'');
});
test('language changes keep separate in-progress workspaces in all six directions',()=>{
  const storage=memory();let s=open(storage);const locales=['de','es','pt-BR'];
  for(const base of locales)for(const target of locales){if(base===target)continue;s.languages(base,target);s.beginAssessment();s.wordDraft(base+'>'+target);}
  s=open(storage);
  for(const base of locales)for(const target of locales){if(base===target)continue;s.languages(base,target);assert.equal(s.state.wordDraft,base+'>'+target);assert.equal(s.state.page,'known');}
});
test('only reset removes profile and all drafts; failed reset keeps both',()=>{
  const storage=memory();let s=open(storage);s.chooseTopic('cafe');s.start();s.check('');
  s.reset();assert.equal(storage.getItem('sprachinseln.v1'),null);s=open(storage);
  assert.equal(s.state.page,'welcome');assert.deepEqual(s.state.profile.progress,{});assert.deepEqual(s.state.profile.workspaces,{});
  s.beginAssessment();s.wordDraft('hola');storage.removeItem=()=>{throw Error('blocked');};
  assert.equal(s.reset(),false);assert.equal(open(storage).state.wordDraft,'hola');
});
test('legacy profile upgrades without clearing knowledge; invalid session cannot destroy progress',()=>{
  const storage=memory(),profile={...emptyProfile(),ready:true,known:['hola:hello'],progress:{'hola:hello':{attempts:3,correct:2,lastCorrect:true}}};
  storage.setItem('sprachinseln.v1',JSON.stringify(profile));let s=open(storage);
  assert.equal(s.state.page,'home');assert.equal(s.state.profile.progress['hola:hello'].attempts,3);
  s.configure('reply',10);const saved=JSON.parse(storage.getItem('sprachinseln.v1'));
  Object.assign(saved.workspaces['de>es'],{page:'lesson',cards:['invented'],index:0});
  storage.setItem('sprachinseln.v1',JSON.stringify(saved));s=open(storage);
  assert.equal(s.state.warning,'resumeError');assert.deepEqual(s.state.profile.known,['hola:hello']);
  assert.equal(s.state.profile.progress['hola:hello'].attempts,3);
});
test('unreadable stored data is not overwritten by autosave; write failure retains last successful state',()=>{
  const storage=memory();storage.setItem('sprachinseln.v1','{broken');let s=open(storage);
  s.beginAssessment();s.wordDraft('hola');s.chooseTopic('cafe');assert.equal(storage.getItem('sprachinseln.v1'),'{broken');
  assert.equal(s.state.warning,'saveError');s.reset();s.beginAssessment();s.wordDraft('hola');
  const raw=storage.getItem('sprachinseln.v1');storage.setItem=()=>{throw Error('quota');};s.wordDraft('agua');
  assert.equal(s.state.warning,'saveError');assert.equal(storage.getItem('sprachinseln.v1'),raw);
});
test('full completion resumes the results page without recounting any answer',()=>{
  const storage=memory();let s=open(storage);s.chooseTopic('alltag');s.configure('word',10);s.start();
  while(s.state.page==='lesson'){s.check(s.state.cards[s.state.index].answers[0]);s.next();}
  const attempts=JSON.stringify(s.state.profile.progress);s=open(storage);
  assert.equal(s.state.page,'done');assert.equal(s.state.sessionCorrect,10);assert.equal(JSON.stringify(s.state.profile.progress),attempts);
});

test('old unfinished onboarding with confirmed words resumes at topic choice rather than empty intake',()=>{
  const storage=memory();storage.setItem('sprachinseln.v1',JSON.stringify({...emptyProfile(),known:['hola:hello']}));
  const s=open(storage);assert.equal(s.state.page,'topics');assert.deepEqual(s.state.profile.known,['hola:hello']);
});
test('meaning-search drafts and selected canonical words survive reload',()=>{
  const storage=memory();let s=open(storage);s.words('larvatei');s.meaningDraft('larvatei','waschen');s=open(storage);
  assert.equal(s.state.words[0].meaningHintQuery,'waschen');s.searchMeaning('larvatei','waschen');s=open(storage);
  const result=s.state.words[0].meaningResults.find(item=>item.id==='lavarte');assert.ok(result);
  s.confirmMeaning('larvatei',result.id);s=open(storage);assert.equal(s.state.words[0].entry.id,'lavarte');
  assert.equal(s.state.words[0].status,'meaning');
});
