import test from 'node:test';
import assert from 'node:assert/strict';
import {directedContent,languageCodes} from '../dist/core/content-direction.js';
import {availableCards,buildSession} from '../dist/core/session.js';
import {createStore} from '../dist/state/store.js';
import {createRepository,emptyProfile} from '../dist/data/progress.js';
import {topics} from '../dist/data/topics.js';
import {messages,translator} from '../dist/ui/messages.js';
import {render} from '../dist/ui/view.js';
import {matchWords,assessAnswer} from '../dist/core/matching.js';
import {bindEvents} from '../dist/ui/events.js';
function memory(){const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};}
test('all six directions have vocabulary, sentence and response content for all topics',()=>{
  for(const base of languageCodes)for(const target of languageCodes){
    if(base===target)continue;
    const content=directedContent(base,target);
    assert.ok(content.vocabulary.length>=199,base+'>'+target);
    assert.equal(content.sentences.length,88);assert.equal(content.replies.length,78);
    for(const entry of content.vocabulary){assert.ok(entry.word);assert.ok(entry.meanings.every(m=>m.answers.every(Boolean)));}
    for(const topic of topics){
      const cards=availableCards(topic.id,content.vocabulary,content.sentences,content.replies);
      assert.equal(buildSession(cards,emptyProfile()).length,20,base+'>'+target+':'+topic.id);
    }
  }
});
test('pt-BR base and German target orient vocabulary, sentence and dialogue correctly',()=>{
  const c=directedContent('pt-BR','de');
  assert.ok(c.vocabulary.some(w=>w.word==='Wasser'&&w.meanings[0].answers.includes('água')));
  const sentence=c.sentences.find(s=>s.id==='coffee-milk');
  assert.equal(sentence.prompt,'Um café com leite, por favor.');assert.ok(sentence.answers.includes('Einen Kaffee mit Milch, bitte.'));
  const reply=c.replies.find(r=>r.id==='payment');
  assert.equal(reply.heard,'Bar oder mit Karte?');assert.equal(reply.heardGerman,'Em dinheiro ou com cartão?');
  assert.equal(reply.prompt,'Diga que quer pagar com cartão.');assert.deepEqual(reply.answers,['Mit Karte, bitte.']);assert.equal(reply.german,'Com cartão, por favor.');
});
test('Spanish base and pt-BR target use Brazilian vocabulary and answers',()=>{
  const c=directedContent('es','pt-BR');
  assert.ok(c.vocabulary.some(w=>w.word==='ônibus'&&w.meanings[0].answers.includes('autobús')));
  const thanks=matchWords('obrigada',c.vocabulary)[0];assert.ok(thanks.entry);assert.deepEqual(thanks.suggestions,[]);
  const cards=availableCards('cafe',c.vocabulary,c.sentences,c.replies);
  assert.ok(cards.word.some(card=>assessAnswer('oi',card.answers).correct));
});
test('UI catalogs are complete for all three interface languages',()=>{
  for(const [key,translations]of Object.entries(messages)){assert.equal(translations.length,3,key);assert.ok(translations.every(Boolean),key);}
  assert.equal(translator('pt-BR')('speak'),'Eu falo');assert.equal(translator('es')('speak'),'Hablo');
  const s=createStore(createRepository(memory()));s.languages('pt-BR','de');
  const root={innerHTML:'',dataset:{}};render(root,s.state);
  assert.ok(root.innerHTML.includes('Eu falo'));assert.ok(root.innerHTML.includes('Quero aprender'));
  assert.ok(root.innerHTML.includes('Redefinir')||root.innerHTML.includes('redefinir'));
  assert.ok(!root.innerHTML.includes('Deine'));assert.ok(!root.innerHTML.includes('Meinen Einstieg'));
  s.chooseTopic('cafe');render(root,s.state);assert.ok(root.innerHTML.includes('Na cafeteria'));
  s.configure('reply',10);s.start();render(root,s.state);
  assert.ok(root.innerHTML.includes('Sua resposta em alemão'));assert.ok(root.innerHTML.includes('lang="de"'));
});
test('progress is isolated by direction and recovered when switching back',()=>{
  const s=createStore(createRepository(memory()));s.chooseTopic('alltag');s.start();s.check(s.state.cards[0].answers[0]);
  const key=s.state.cards[0].key;s.languages('pt-BR','de');assert.deepEqual(s.state.profile.progress,{});
  s.chooseTopic('cafe');s.start();s.check(s.state.cards[0].answers[0]);
  s.languages('de','es');assert.equal(s.state.profile.progress[key].attempts,1);assert.equal(s.state.profile.topic,'alltag');
});
test('reset removes only this apps profile, all language buckets and all session state',()=>{
  const storage=memory();storage.setItem('unrelated','keep');
  const s=createStore(createRepository(storage));s.chooseTopic('cafe');s.start();s.check('');s.languages('pt-BR','de');s.chooseTopic('familie');s.words('Kind, Junge');
  assert.equal(s.reset(),true);assert.equal(storage.getItem('sprachinseln.v1'),null);assert.equal(storage.getItem('unrelated'),'keep');
  assert.equal(s.state.page,'welcome');assert.deepEqual(s.state.profile.known,[]);assert.deepEqual(s.state.profile.progress,{});assert.deepEqual(s.state.profile.pairs,{});
  assert.equal(s.state.profile.baseLanguage,'de');assert.equal(s.state.profile.targetLanguage,'es');assert.deepEqual(s.state.words,[]);assert.deepEqual(s.state.cards,[]);
  assert.equal(createStore(createRepository(storage)).state.page,'welcome');
});
test('failed reset preserves the existing profile and reports a localized error key',()=>{
  const storage=memory();storage.removeItem=()=>{throw Error('denied');};
  const s=createStore(createRepository(storage));s.chooseTopic('cafe');s.state.profile.known=['hola:hello'];
  assert.equal(s.reset(),false);assert.equal(s.state.warning,'resetError');assert.deepEqual(s.state.profile.known,['hola:hello']);
});
test('reset button requires confirmation and cancel has no effect',()=>{
  const handlers={};let resets=0;let question='';let approved=false;
  const s={state:{profile:{baseLanguage:'pt-BR',targetLanguage:'de'}},reset(){resets++;}};
  bindEvents({addEventListener:(name,fn)=>handlers[name]=fn},s,{confirm:text=>{question=text;return approved;}});
  handlers.click({target:{closest:()=>({type:'button',dataset:{action:'reset'}})},preventDefault(){}});
  assert.equal(resets,0);assert.ok(question.startsWith('Apagar todos'));
  approved=true;handlers.click({target:{closest:()=>({type:'button',dataset:{action:'reset'}})},preventDefault(){}});assert.equal(resets,1);
});
test('accent tolerance and strict spelling work for Portuguese and German special letters too',()=>{
  const pt=directedContent('de','pt-BR');assert.ok(matchWords('nao',pt.vocabulary)[0].entry);
  const de=directedContent('pt-BR','de');assert.ok(matchWords('Strasse',de.vocabulary)[0].entry);
  assert.equal(assessAnswer('strasse',['Straße']).correct,true);
  assert.equal(assessAnswer('strasse',['Straße'],{strictSpelling:true}).correct,false);
});
test('equal or unknown language pairs are rejected without losing progress',()=>{
  const s=createStore(createRepository(memory()));s.state.profile.known=['hola:hello'];
  assert.equal(s.languages('pt-BR','pt-BR'),false);assert.equal(s.languages('xx','de'),false);assert.deepEqual(s.state.profile.known,['hola:hello']);
});
test('archived pair state survives a real repository reload and malformed buckets are rejected',()=>{
  const storage=memory();const s=createStore(createRepository(storage));s.chooseTopic('cafe');s.start();s.check('');s.languages('pt-BR','de');s.chooseTopic('familie');
  const restored=createStore(createRepository(storage));assert.equal(restored.state.profile.baseLanguage,'pt-BR');restored.languages('de','es');assert.equal(restored.state.profile.topic,'cafe');assert.equal(Object.keys(restored.state.profile.progress).length,1);
  const invalid=emptyProfile();invalid.pairs={'de>es':null};storage.setItem('sprachinseln.v1',JSON.stringify(invalid));assert.equal(createRepository(storage).load().error,'loadError');
});
