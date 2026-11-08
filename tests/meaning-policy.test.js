import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assessCoreMeaning} from '../dist/core/meaning-policy.js';
import {assessIntendedMeaning} from '../dist/core/meaning-assessment.js';
import {directedContent} from '../dist/core/content-direction.js';
import {matchWords,assessAnswer} from '../dist/core/matching.js';
import {createStore} from '../dist/state/store.js';
import {createRepository,validProfile} from '../dist/data/progress.js';
import {buildSession} from '../dist/core/session.js';
import {translationView} from '../dist/ui/meaning-review.js';
import {translator} from '../dist/ui/messages.js';
function review(word,answer,base='de',target='es'){
  const record=matchWords(word,directedContent(base,target).vocabulary)[0];assert.ok(record.entry,word);
  return assessIntendedMeaning(answer,record,base);
}
test('lavarte recognizes precise meaning and related washing forms at different knowledge levels',()=>{
  const exact=review('lavarte','dich waschen');assert.equal(exact.status,'accepted');assert.equal(exact.matches[0].accepted[0].level,'exact');
  for(const answer of ['waschen','Wäsche','die Wäsche','ich wasche','du wäschst','sich waschen','das Waschen','gewaschen']){
    const result=review('lavarte',answer);assert.equal(result.status,'accepted',answer);assert.equal(result.feedback[0].level,'partial');assert.equal(result.feedback[0].canonical,'dich waschen');
  }
});
test('grammar policy applies to unseen meanings with no entry IDs or per-word exception',()=>{
  for(const [input,answers,locale,referenceAnswers]of [
    ['zeichnen',['ich zeichne'],'de',undefined],['ich plane',['planen'],'de',undefined],
    ['Kämme',['dich kämmen'],'de',undefined],['du pflegst',['pflegen'],'de',undefined],
    ['die Wohnung',['Wohnung'],'de',undefined],['Wohnungen',['Wohnung'],'de',undefined],
    ['organizo',['organizar'],'es',['ich organisiere']],['planejo',['planejar'],'pt-BR',['ich plane']],
    ['botellas',['botella'],'es',['Flasche']],['garrafas',['garrafa'],'pt-BR',['Flasche']]
  ])assert.ok(assessCoreMeaning(input,{answers,referenceAnswers},locale),input);
});
test('known verbs, subjects and reflexive forms work across language directions',()=>{
  for(const [id,answer,base,target]of [
    ['lavarte','Wäsche','de','es'],['lavarte','Wäsche','de','pt-BR'],
    ['lavarte','me lavo','es','de'],['lavarte','me lavo','es','pt-BR'],
    ['lavarte','você lava','pt-BR','de'],['lavarte','você lava','pt-BR','es'],
    ['necesito','brauchen','de','es'],['entiendo','verstehen','de','es'],
    ['pagar','ich bezahle','de','es'],['bebe','beber','pt-BR','es']
  ]){
    const c=directedContent(base,target),entry=c.vocabulary.find(entry=>entry.id===(base==='de'&&target==='es'?id:`w-${id}-${id}`));
    assert.ok(entry,id+':'+base+'>'+target);
    assert.equal(assessIntendedMeaning(answer,{entry},base).status,'accepted',base+'>'+target+':'+id);
  }
  assert.equal(review('dich waschen','me lavo','es','de').status,'accepted');
});
test('general noun number and related-concept evidence preserve original sense boundaries',()=>{
  assert.equal(review('manos','Hand').feedback[0].reason,'number');
  assert.equal(review('trabajo','arbeiten').matches.find(match=>match.entry.id==='trabajo').accepted[0].level,'partial');
  assert.equal(review('amor','lieben').feedback[0].reason,'concept');
  assert.equal(review('te quiero','Liebe').status,'accepted');
  assert.equal(review('bebe','trinken').matches[0].entry.id,'bebe');
});
test('concept policy does not erase negations, content objects, quantities or false friends',()=>{
  for(const [word,answer]of [['lavarte','nicht waschen'],['lavarte','ich wasche Bier'],['lavarte','Wasser'],['te quiero','ich will'],['favor','bitten'],['arroz','Reise'],['cinco','6'],['amor','lieber'],['bebe','Baby trinken']])assert.notEqual(review(word,answer).status,'accepted',word+': '+answer);
  assert.equal(review('ich liebe dich','quiero','es','de').status,'unrecognized');
  assert.equal(assessAnswer('lavar',['lavarte']).correct,false);
  assert.equal(assessAnswer('125 ml de vino',['250 ml de vino']).correct,false);
});
test('the other ordinary wording of a noted phrase is known meaning, not a new meaning',()=>{
  for(const [answer,canonical]of [['ich würde gerne','ich würde gern'],['ich hätte gerne','ich hätte gern'],['ich möchte gerne','ich möchte gern']]){
    const result=review('me gustaría',answer);assert.equal(result.status,'accepted',answer);
    assert.deepEqual(result.unmatched,[],answer);assert.equal(result.feedback.length,1,answer);
    assert.equal(result.feedback[0].reason,'wording',answer);assert.equal(result.feedback[0].level,'accepted',answer);
    assert.equal(result.feedback[0].canonical,canonical,answer);
  }
  assert.equal(review('me gustaría','ich würde gern').feedback.length,0);
  const note=review('me gustaría','ich würde gerne').feedback[0];
  for(const [locale,phrase]of [['de','meint dasselbe wie ich würde gern'],['es','significa lo mismo que ich würde gern'],['pt-BR','significa o mesmo que ich würde gern']]){
    assert.ok(translator(locale)('meaningwording',{answer:note.answer,canonical:note.canonical}).includes(phrase),locale);
  }
  const combined=review('me gustaría','ich würde gerne, ich hätte gerne');
  assert.equal(combined.status,'accepted');assert.deepEqual(combined.unmatched,[]);
});
test('wording tolerance never opens the door to single words, other word order or negation',()=>{
  assert.equal(assessCoreMeaning('gerne',{answers:['gern']},'de'),null);
  for(const wrong of ['gern','gerne','ich würde gerne nicht','ich hätte nichts gerne','du würdest gerne','gerne ich würde'])assert.notEqual(review('me gustaría',wrong).status,'accepted',wrong);
  assert.notEqual(review('gracias','gerne').status,'accepted');
  assert.notEqual(review('me gustaría','ich würde fast gerne').status,'accepted');
});
test('wording evidence stays valid on disk and counts as meaning knowledge, not as a loose hint',()=>{
  let saved=null;const storage={getItem:()=>saved,setItem:(_,value)=>{saved=value;},removeItem:()=>{saved=null;}};
  const s=createStore(createRepository(storage));s.words('me gustaría');s.acceptWords();
  assert.equal(s.translations({'me-gustaria':'ich würde gerne'}),true);
  assert.equal(s.state.profile.meaningEvidence['me-gustaria:me-gustaria'].reason,'wording');
  assert.ok(validProfile(s.state.profile));
  const reloaded=createStore(createRepository(storage));
  assert.equal(reloaded.state.profile.meaningEvidence['me-gustaria:me-gustaria'].level,'accepted');
  const cards={word:[{key:'full'},{key:'me-gustaria:me-gustaria'}],sentence:[],reply:[],spelling:[]};
  const profile={...s.state.profile,known:[...s.state.profile.known,'full']};
  assert.notEqual(buildSession(cards,profile,'word','all')[0].key,'me-gustaria:me-gustaria');
});
test('partial concepts persist as known foundations but remain unmastered and prioritized',()=>{
  let saved=null;const storage={getItem:()=>saved,setItem:(_,value)=>{saved=value;},removeItem:()=>{saved=null;}};
  const s=createStore(createRepository(storage));s.words('lavarte, amor');s.acceptWords();assert.equal(s.translations({lavarte:'Wäsche',amor:'lieben'}),true);
  assert.equal(s.state.page,'insight');assert.ok(s.state.profile.known.includes('lavarte:lavarte'));assert.equal(s.state.profile.meaningEvidence['lavarte:lavarte'].level,'partial');assert.equal(s.state.profile.meaningEvidence['amor:amor'].reason,'concept');assert.ok(validProfile(s.state.profile));
  const reloaded=createStore(createRepository(storage));assert.equal(reloaded.state.profile.meaningEvidence['amor:amor'].level,'partial');
  const cards={word:[{key:'full'},{key:'lavarte:lavarte'}],sentence:[],reply:[],spelling:[]};
  const profile={...s.state.profile,known:[...s.state.profile.known,'full']};assert.equal(buildSession(cards,profile,'word','all')[0].key,'lavarte:lavarte');
});
// Das Konzeptnetz in data/language-forms.js ist sprachweit, nicht pro Karte gepflegt:
// ein Eintrag wirkt für jede Karte, deren notierte Form in derselben Gruppe steht.
test('curated everyday synonyms recognize whole word families as partial understanding',()=>{
  for(const [word,answer,canonical]of [
    ['amigo','Kumpel','freund'],['amigo','Kollege','freund'],['amiga','Kumpelin','Freundin'],
    ['madre','Mama','Mutter'],['padre','Papa','Vater'],['bano','Klo','Bad'],['tren','Bahn','Zug'],
    ['medico','Doktor','Arzt'],['comida','Gericht','Essen'],['caro','kostspielig','teuer'],['cine','Filmtheater','Kino']
  ]){
    const result=review(word,answer);assert.equal(result.status,'accepted',word+': '+answer);
    const note=result.feedback[0];assert.equal(note.level,'partial',word+': '+answer);
    assert.equal(note.reason,'concept',word+': '+answer);assert.equal(note.canonical,canonical,word+': '+answer);
  }
  assert.equal(review('amigo','Freund').feedback.length,0);
});
test('the synonym network stays inside its groups and never replaces the noted form',()=>{
  for(const [word,answer]of [['amigo','Bruder'],['amigo','Hund'],['amigo','Freundschaft'],['amigo','Kumpel nicht'],
    ['madre','Vater'],['padre','Mutter'],['mujer','Mann'],['tren','Auto'],['habitacion','Bett'],['bano','Schlüssel'],['comida','Suppe']]){
    assert.notEqual(review(word,answer).status,'accepted',word+': '+answer);
  }
  assert.equal(assessAnswer('Kumpel',['freund']).correct,false);
  assert.equal(assessAnswer('Kumpel',['freund'],true).correct,false);
});
test('a synonym answer explains the difference and keeps the noted word in the next round',()=>{
  let saved=null;const storage={getItem:()=>saved,setItem:(_,value)=>{saved=value;},removeItem:()=>{saved=null;}};
  const s=createStore(createRepository(storage));s.words('amigo, tren');s.acceptWords();
  assert.equal(s.translations({amigo:'Kumpel',tren:'Bahn'}),true);
  assert.equal(s.state.page,'insight');
  const note=s.state.meaningFeedback.find(item=>item.word==='amigo');
  assert.deepEqual(note.hints,['meaningHintAmigo']);
  assert.ok(s.state.meaningFeedback.find(item=>item.word==='tren').hints.length===0);
  assert.equal(s.state.profile.meaningEvidence['amigo:friend'].level,'partial');
  assert.equal(s.state.profile.meaningEvidence['amigo:friend'].reason,'concept');
  assert.ok(validProfile(s.state.profile));
  const reloaded=createStore(createRepository(storage));
  assert.equal(reloaded.state.profile.meaningEvidence['amigo:friend'].level,'partial');
  const cards={word:[{key:'full'},{key:'amigo:friend'}],sentence:[],reply:[],spelling:[]};
  const profile={...s.state.profile,known:[...s.state.profile.known,'full']};
  assert.equal(buildSession(cards,profile,'word','all')[0].key,'amigo:friend');
  const explanation=note.hints[0];
  for(const locale of ['de','es','pt-BR'])assert.ok(translator(locale)(explanation).includes('colega'),locale);
  assert.ok(translator('de')(explanation).includes('Freund'));
  // Die Erklärung steht unter dem Feld der Bedeutungsabfrage und nur einmal je Wort.
  const blocks=translationView(s.state).split('<div class="translation">');
  const amigoBlock=blocks.find(block=>block.startsWith('<label for="t-amigo"'));
  const trenBlock=blocks.find(block=>block.startsWith('<label for="t-tren"'));
  assert.equal((amigoBlock.match(/meaning-hint/g)||[]).length,1);
  assert.match(amigoBlock,/<p class="meaning-hint">[^<]*colega/);
  assert.ok(!trenBlock.includes('meaning-hint'));
  assert.match(readFileSync(new URL('../dist/ui/meaning-review.js',import.meta.url),'utf8'),/notice\(item,t,true\)/);
});
