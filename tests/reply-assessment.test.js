import test from 'node:test';
import assert from 'node:assert/strict';
import {assessReply} from '../dist/core/reply-assessment.js';
import {assessAnswer} from '../dist/core/matching.js';
import {directedContent,languageCodes} from '../dist/core/content-direction.js';
import {createStore} from '../dist/state/store.js';
import {emptyProfile} from '../dist/data/progress.js';
import {practiceView} from '../dist/ui/practice.js';

test('screenshot: missing de is accepted with a nonblocking formulation hint',()=>{
  const card=directedContent().replies.find(c=>c.id==='cheese-quantity');
  assert.deepEqual(assessReply('Medio kilo queso por favor',card,'es'),{correct:true,spelling:false,formHint:true,modelAnswer:'Medio kilo de queso, por favor.'});
  for(const answer of ['Medio kilo queso','medio kilo de queso por favor','Medio kilo, por favor.'])assert.equal(assessReply(answer,card,'es').correct,true,answer);
  for(const answer of ['Un kilo queso por favor','Medio kilo jamón por favor','No medio kilo queso por favor','Medio kilo queso y vino por favor','queso por favor','',null])assert.equal(assessReply(answer,card,'es').correct,false,String(answer));
});
test('quantity objects are optional across all six directions, independent of card IDs',()=>{
  const forms={es:['¿Cuánto tofu quiere?',['Medio kilo, por favor.'],'Medio kilo tofu por favor'],de:['Wie viel Tofu möchten Sie?',['Ein halbes Kilo, bitte.'],'Ein halbes Kilo Tofu bitte'],'pt-BR':['Quanto tofu você quer?',['Meio quilo, por favor.'],'Meio quilo tofu por favor']};
  for(const base of languageCodes)for(const target of languageCodes){
    if(base===target)continue;
    const [heard,answers,input]=forms[target],card={heard,answers};
    assert.equal(assessReply(input,card,target).correct,true,base+'>'+target);
    assert.equal(assessReply(input.replace(/tofu/iu,'arroz'),card,target).correct,false);
    assert.equal(assessReply(input,{heard:'',answers},target).correct,false);
    const reversed={heard,answers:[input]};
    assert.equal(assessReply(answers[0],reversed,target).correct,true);
  }
});
test('countable objects, punctuation and accents work without discarding arbitrary additions',()=>{
  const card={heard:'¿Cuántas berenjenas quiere?',answers:['Tres, por favor.']};
  assert.equal(assessReply('¡Tres berenjenas, por favor!',card,'es').correct,true);
  for(const answer of ['Dos berenjenas por favor','Tres berenjenas no por favor','Tres berenjenas grandes por favor','Tres berenjenas cuatro por favor'])assert.equal(assessReply(answer,card,'es').correct,false,answer);
  assert.equal(assessAnswer('medio kilo queso',['Medio kilo de queso.']).correct,false);
  assert.equal(assessAnswer('nino',['niño'],{strictSpelling:true}).correct,false);
});
test('store records the accepted reply and UI displays the formulation hint',()=>{
  const profile={...emptyProfile(),ready:true,topic:'zahlen',mode:'reply',length:'all'};
  const store=createStore({load:()=>({profile,error:''}),save:()=>''});
  store.subscribe(()=>{});store.start();store.state.index=store.state.cards.findIndex(c=>c.id==='cheese-quantity');
  assert.ok(store.state.index>=0);
  store.check('Medio kilo queso por favor');
  assert.equal(store.state.correct,true);assert.equal(store.state.sessionCorrect,1);
  assert.equal(profile.progress['reply:cheese-quantity'].lastCorrect,true);
  const html=practiceView(store.state,{name:'Zahlen'});
  assert.match(html,/feedback success/);assert.match(html,/Eine natürlichere Formulierung/);
  store.next();store.check('falsch');assert.equal(store.state.formHint,false);
});
