import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../dist/state/store.js';
import {createRepository} from '../dist/data/progress.js';
import {directedContent,languageCodes} from '../dist/core/content-direction.js';
import {translationView} from '../dist/ui/meaning-review.js';
import {bindEvents} from '../dist/ui/events.js';
function memory(){const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};}
function reached(storage=memory()){
  const store=createStore(createRepository(storage));
  store.words('hola, perro');store.acceptWords();
  return {store,storage,ids:store.state.words.map(item=>item.entry.id)};
}
test('clearing empties every meaning field, keeps words and progress, and is stored so a reload stays empty',()=>{
  const {store,storage,ids}=reached();
  store.state.profile.known=['perro:dog'];store.state.profile.progress={'w-perro':{attempts:1,correct:1,lastCorrect:true}};
  const known=JSON.parse(JSON.stringify(store.state.profile.known)),progress=JSON.parse(JSON.stringify(store.state.profile.progress));
  for(const id of ids)store.translationDraft(id,'hallo');
  assert.equal(JSON.parse(storage.getItem('sprachinseln.v1')).workspaces['de>es'].translationAnswers[ids[0]],'hallo','drafts are recoverable');
  store.clearTranslations();
  assert.deepEqual(store.state.translationAnswers,{});
  assert.equal(store.state.page,'translations','clearing keeps the person on the list');
  assert.equal(store.state.words.length,2,'recognized words survive');
  assert.deepEqual(store.state.profile.known,known);assert.deepEqual(store.state.profile.progress,progress);
  assert.ok(store.state.words.every(item=>item.entry));
  const reloaded=createStore(createRepository(storage));
  assert.equal(reloaded.state.page,'translations');
  assert.deepEqual(reloaded.state.translationAnswers,{});
  assert.equal(reloaded.state.words.length,2);
  assert.deepEqual(reloaded.state.profile.known,known);
  assert.ok(store.state.words.every(item=>item.entry));
});
test('clearing also drops the previous check feedback so no stale notes stay under empty fields',()=>{
  const {store}=reached();
  const [first,second]=store.state.words,good=item=>item.entry.meanings[0].answers[0];
  assert.equal(store.translations({[first.entry.id]:good(first),[second.entry.id]:'dies passt garantiert nicht'}),false,'an unconfirmed answer blocks the list');
  assert.ok(store.state.rejected.length);assert.ok(Object.keys(store.state.meaningReviews).length);
  let html=translationView(store.state);
  assert.match(html,/aria-invalid="true"/);assert.match(html,/data-action="skip-translations"/);
  store.clearTranslations();
  html=translationView(store.state);
  assert.deepEqual(store.state.meaningReviews,{});assert.deepEqual(store.state.rejected,[]);
  assert.ok(!html.includes('aria-invalid'),'no field is marked after clearing');
  assert.ok(!html.includes('skip-translations'),'the skip question disappears together with the rejection');
  for(const item of store.state.words)store.translationDraft(item.entry.id,good(item));
  assert.equal(store.translations(Object.fromEntries(store.state.words.map(item=>[item.entry.id,good(item)]))),true,'the list can be checked again right after clearing');
});
test('the clear control is the last block of the list, red, never disabled and localized in all six directions',()=>{
  const labels={de:'Alle leeren',es:'Vaciar todo','pt-BR':'Limpar tudo'};
  for(const base of languageCodes)for(const target of languageCodes){
    if(base===target)continue;
    const store=createStore(createRepository(memory()));store.languages(base,target);
    const word=directedContent(base,target).vocabulary[0].word;
    store.words(word);store.acceptWords();
    const html=translationView(store.state);
    const clear=html.match(/<button class="danger-button" data-action="clear-translations" type="button"[^>]*>/);
    assert.ok(clear,base+'>'+target+' exposes the control');
    assert.ok(!/disabled/.test(clear[0]),base+'>'+target+' is never switched off');
    assert.ok(!/type="submit"/.test(clear[0]),base+'>'+target+' does not submit the form');
    assert.ok(html.indexOf(clear[0])>html.indexOf('data-action="submit"'),base+'>'+target+' sits after the main button');
    assert.ok(html.indexOf(clear[0])>html.lastIndexOf('meaning-input'),base+'>'+target+' sits below the whole list');
    assert.ok(html.includes(`>${labels[base]}<`),base+'>'+target+' label');
    assert.ok(html.includes('class="clear-all"'),base+'>'+target+' own separated block');
  }
});
test('one click asks first; cancel changes nothing, confirm clears the whole list',()=>{
  const texts={de:'Alle Bedeutungs-Eingaben leeren?',es:'¿Vaciar todas las entradas de significado?','pt-BR':'Esvaziar todas as entradas de significado?'};
  for(const language of Object.keys(texts)){
    const handlers={};let question='';let cleared=0;
    const root={addEventListener:(name,fn)=>handlers[name]=fn,querySelector:()=>null};
    const stub={state:{profile:{baseLanguage:language,targetLanguage:language==='de'?'es':'de'}},clearTranslations(){cleared++;}};
    bindEvents(root,stub,{confirm:text=>{question=text;return language==='pt-BR';}});
    handlers.click({target:{closest:()=>({type:'button',dataset:{action:'clear-translations'}})},preventDefault(){}});
    assert.equal(question,texts[language],language+' asks before clearing');
    assert.equal(cleared,language==='pt-BR'?1:0,language+' only acts after confirmation');
  }
  const {store,ids}=reached();
  for(const id of ids)store.translationDraft(id,'hallo');
  const handlers={};const root={addEventListener:(name,fn)=>handlers[name]=fn,querySelector:()=>null};
  bindEvents(root,store,{confirm:()=>false});
  handlers.click({target:{closest:()=>({type:'button',dataset:{action:'clear-translations'}})},preventDefault(){}});
  assert.equal(Object.keys(store.state.translationAnswers).length,ids.length,'cancel keeps every answer');
  bindEvents(root,store,{confirm:()=>true});
  handlers.click({target:{closest:()=>({type:'button',dataset:{action:'clear-translations'}})},preventDefault(){}});
  assert.deepEqual(store.state.translationAnswers,{});
  assert.equal(store.state.words.length,ids.length);
});
