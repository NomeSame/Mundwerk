import test from 'node:test';
import assert from 'node:assert/strict';
import {directedContent,languageCodes} from '../dist/core/content-direction.js';
import {assessIntendedMeaning} from '../dist/core/meaning-assessment.js';
import {matchWords,assessAnswer} from '../dist/core/matching.js';
import {createStore} from '../dist/state/store.js';
import {createRepository,validProfile} from '../dist/data/progress.js';
import {translationView,meaningInsight} from '../dist/ui/meaning-review.js';
import {availableCards,buildSession} from '../dist/core/session.js';
function review(word,answer,base='de',target='es'){
  const record=matchWords(word,directedContent(base,target).vocabulary)[0];assert.ok(record.entry,word);
  return assessIntendedMeaning(answer,record,base);
}
test('reported digit meanings and every authored cardinal work in all six directions',()=>{
  for(const base of languageCodes)for(const target of languageCodes){
    if(base===target)continue;const c=directedContent(base,target);
    const numbers=c.vocabulary.filter(entry=>entry.meanings.some(meaning=>Number.isSafeInteger(meaning.numericValue)));
    assert.equal(numbers.length,14);
    for(const entry of numbers){
      const value=entry.meanings[0].numericValue,r=assessIntendedMeaning(String(value),{entry},base);
      assert.equal(r.status,'accepted',base+'>'+target+':'+entry.word);assert.equal(r.feedback[0].reason,'digits');
      assert.equal(assessIntendedMeaning(String(value+1),{entry},base).status,'unrecognized');
    }
  }
  for(const [word,value]of [['cuatro',4],['seis',6],['ocho',8],['nueve',9],['cinco',5]])assert.equal(review(word,String(value)).status,'accepted');
});
test('digit intake never makes number-writing exercises language-neutral',()=>{
  const c=directedContent(),entry=c.vocabulary.find(e=>e.id==='cinco');
  assert.equal(matchWords('5',c.vocabulary)[0].entry,null);
  const card=availableCards('zahlen',c.vocabulary,c.sentences,c.replies).word.find(card=>card.entry.id===entry.id);
  assert.equal(assessAnswer('5',card.answers).correct,false);assert.equal(assessAnswer('cinco',card.answers).correct,true);
  for(const input of ['4.0','4,0','-4','4e0','04','vierzig'])assert.equal(review('cuatro',input).status,'unrecognized',input);
});
test('verb concepts are partial knowledge, never the baby sense or a different verb',()=>{
  const drink=review('bebe','Trinken');assert.equal(drink.status,'accepted');assert.equal(drink.feedback[0].level,'partial');assert.equal(drink.feedback[0].reason,'verbform');
  assert.deepEqual(drink.matches.map(match=>match.entry.id),['bebe']);
  for(const [word,answer]of [['hablo','sprechen'],['creo','glauben'],['cuesta','kosten'],['soy','sein'],['lavarte','waschen']])assert.equal(review(word,answer).feedback[0].level,'partial');
  assert.equal(review('bebe','er trinkt').feedback.length,0);assert.equal(review('bebe','trink').status,'accepted');
  assert.equal(review('bebe','essen').status,'unrecognized');assert.equal(review('bebe','nicht trinken').status,'unrecognized');
  assert.equal(review('trinkt','beber','es','de').feedback[0].level,'partial');
  assert.equal(review('bebe','beber','pt-BR','es').feedback[0].level,'partial');
});
test('confused words receive explanations without silently confirming wrong meanings',()=>{
  for(const [word,answer,hint]of [['favor','Bitten','meaningHintFavor'],['te quiero','Ich will','meaningHintTeQuiero']]){
    const result=review(word,answer);assert.equal(result.matches.length,0);assert.equal(result.status,'unrecognized');assert.ok(result.hints.includes(hint));
  }
  assert.equal(review('quiero','Ich will').status,'accepted');assert.equal(review('por favor','Bitte').status,'accepted');assert.equal(review('favor','Gefallen').status,'accepted');
  const empty=review('por','');assert.equal(empty.status,'empty');assert.deepEqual(empty.hints,[]);
});
test('mixed answers disclose unsupported extras and preserve legitimate comma-bearing phrases',()=>{
  const result=review('gusto','Geschmack, Appetit');assert.equal(result.status,'accepted');assert.deepEqual(result.unmatched,['Appetit']);assert.ok(result.feedback.some(item=>item.reason==='unmatched'));assert.ok(result.hints.includes('meaningHintGusto'));
  assert.deepEqual(result.matches[0].ids,['gusto']);
  assert.deepEqual(review('gusto','Geschmack, Vergnügen').unmatched,[]);
  assert.deepEqual(review('creo que','ich glaube, dass').unmatched,[]);
  assert.deepEqual(review('no','nein, nicht').unmatched,[]);
});
test('digits, partial verb evidence and extra-meaning notices survive persistence and direction changes',()=>{
  let raw=null;const repository=createRepository({getItem:()=>raw,setItem:(_,value)=>{raw=value;},removeItem:()=>{raw=null;}});
  const store=createStore(repository);store.words('cinco, bebe, gusto');store.acceptWords();
  assert.equal(store.translations({cinco:'5',bebe:'trinken',gusto:'Geschmack, Appetit'}),true);
  const profile=store.state.profile;assert.equal(profile.meaningEvidence['cinco:cinco'].reason,'digits');assert.equal(profile.meaningEvidence['bebe:bebe'].level,'partial');
  assert.ok(!profile.known.includes('bebe-baby:bebe-baby'));assert.ok(!profile.known.includes('gusto:gusto-2'));assert.ok(validProfile(profile));
  assert.equal(repository.load().error,'');assert.equal(store.state.page,'insight');assert.match(meaningInsight(store.state),/Appetit/);
  const c=directedContent(),cards=availableCards('zahlen',c.vocabulary,c.sentences,c.replies);assert.ok(buildSession(cards,profile,'word','all').every(card=>!card.answers.includes('5')));
  store.languages('pt-BR','de');store.languages('de','es');assert.equal(store.state.profile.meaningEvidence['bebe:bebe'].reason,'verbform');
});
test('rendered explanations are localized, escaped and distinguish empty input',()=>{
  const store=createStore(createRepository({getItem:()=>null,setItem:()=>{}}));store.words('bebe, favor, por, gusto');store.acceptWords();store.translations({bebe:'trinken',favor:'Bitten',por:'',gusto:'Geschmack, <img src=x onerror=alert(1)>'});
  const html=translationView(store.state);assert.match(html,/Noch keine Bedeutung eingegeben/);assert.match(html,/Gefallen/);assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;img'));
});
