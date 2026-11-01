import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../dist/state/store.js';
import {emptyProfile} from '../dist/data/progress.js';
import {practiceView} from '../dist/ui/practice.js';
import {bindEvents} from '../dist/ui/events.js';
function setup(base='de',target='es',mode='reply'){
  const profile={...emptyProfile(),baseLanguage:base,targetLanguage:target,ready:true,topic:'zahlen',mode,length:'all'};
  let saves=0;
  const store=createStore({load:()=>({profile,error:''}),save:()=>{saves++;return '';}});
  store.subscribe(()=>{});store.start();
  return {store,profile,saves:()=>saves};
}
test('failed answers remain editable over repeated correction rounds; each check is recorded once',()=>{
  const {store,profile,saves}=setup(),s=store.state,card=s.cards[0];
  store.retryAnswer();assert.equal(s.retrying,false);
  store.check('falsch');const before=saves();
  store.check(card.answers[0]);assert.equal(saves(),before);assert.equal(s.correct,false);
  store.retryAnswer();assert.equal(s.answer,'falsch');assert.equal(s.retrying,true);assert.equal(s.revealed,false);
  const afterEditing=saves();store.retryAnswer();assert.equal(saves(),afterEditing);
  assert.equal(profile.progress[card.key].attempts,1,'persisting edit state is not an answer attempt');
  store.check('noch falsch');assert.equal(s.correct,false);assert.equal(s.retrying,false);
  store.retryAnswer();store.check(card.answers[0]);
  assert.equal(s.correct,true);assert.equal(s.sessionCorrect,1);
  assert.equal(profile.progress[card.key].attempts,3);assert.equal(profile.progress[card.key].correct,1);
  assert.equal(profile.progress[card.key].lastCorrect,true);
  store.retryAnswer();assert.equal(s.retrying,false);
  store.check(card.answers[0]);assert.equal(s.sessionCorrect,1);
  store.next();assert.equal(s.answer,'');assert.equal(s.retrying,false);assert.equal(s.index,1);
});
test('continuing is optional both before and during correction, including the final exercise',()=>{
  for(const editing of [false,true]){
    const {store}=setup();store.state.index=store.state.cards.length-1;
    store.check('');if(editing)store.retryAnswer();store.next();
    assert.equal(store.state.page,'done');assert.equal(store.state.sessionCorrect,0);
  }
});
test('all exercise modes and six directions expose localized correction controls',()=>{
  const labels={de:['Antwort korrigieren','Erneut prüfen'],es:['Corregir respuesta','Comprobar de nuevo'],'pt-BR':['Corrigir resposta','Conferir novamente']};
  for(const base of Object.keys(labels))for(const target of Object.keys(labels))for(const mode of ['word','sentence','reply','spelling']){
    if(base===target)continue;
    const {store}=setup(base,target,mode),s=store.state;
    store.check('falsch');let html=practiceView(s,{name:'Test'});
    assert.ok(html.includes(labels[base][0]));assert.match(html,/data-action="next"/);
    store.retryAnswer();html=practiceView(s,{name:'Test'});
    assert.ok(html.includes(labels[base][1]));assert.match(html,/data-action="next"/);
    assert.doesNotMatch(html,/<textarea[^>]*disabled/);
    assert.match(html,/>falsch<\/textarea>/);
    store.check(s.cards[s.index].answers[0]);assert.equal(s.correct,true);
    assert.doesNotMatch(practiceView(s,{name:'Test'}),/data-action="retry-answer"/);
  }
});
test('retry button routes to the store and focuses the preserved answer',()=>{
  const handlers={};let retried=0,focused=0;
  bindEvents({addEventListener:(name,fn)=>handlers[name]=fn,querySelector:()=>({focus(){focused++;}})},{retryAnswer(){retried++;}},{});
  handlers.click({target:{closest:()=>({type:'button',dataset:{action:'retry-answer'}})},preventDefault(){}});
  assert.equal(retried,1);assert.equal(focused,1);
});
