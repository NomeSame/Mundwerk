import test from 'node:test';
import assert from 'node:assert/strict';
import {assessIntendedMeaning} from '../dist/core/meaning-assessment.js';
import {directedContent} from '../dist/core/content-direction.js';
import {matchWords,assessAnswer} from '../dist/core/matching.js';
import {createStore} from '../dist/state/store.js';
import {createRepository,validProfile} from '../dist/data/progress.js';
import {assessmentView} from '../dist/ui/assessment.js';
import {buildSession} from '../dist/core/session.js';
const memory=()=>{let data=null;return {getItem:()=>data,setItem:(_,value)=>data=value,removeItem:()=>data=null};};
function review(word,answer,base='de',target='es'){
  const record=matchWords(word,directedContent(base,target).vocabulary)[0];
  assert.ok(record.entry,word);return assessIntendedMeaning(answer,record,base);
}
test('reported context, synonyms and singular concepts are accepted with precise feedback',()=>{
  assert.equal(review('tambien','ich auch').status,'accepted');
  assert.equal(review('tambien','ich auch').feedback[0].reason,'context');
  assert.equal(review('manos','Hand').feedback[0].level,'partial');
  assert.equal(review('manos','Hand').feedback[0].canonical,'Hände');
  assert.equal(review('puta','Schlampe').feedback[0].reason,'register');
  for(const answer of ['Liebe','Zuneigung'])assert.equal(review('amor',answer).status,'accepted');
});
test('spelling proposals require explicit confirmation; unrelated and negated answers fail',()=>{
  assert.equal(review('amor','lieber').status,'confirm');
  assert.deepEqual(review('amor','lieber').suggestions.map(item=>item.canonical),['Liebe']);
  for(const [word,answer]of [['amor','bevorzugt'],['amor','keine Liebe'],['manos','nicht Hand'],['tambien','nicht auch'],['puta','Hund']])assert.equal(review(word,answer).status,'unrecognized',answer);
});
test('recognition metadata works in every direction without replacing canonical translations',()=>{
  for(const [base,target,word,answer,reason]of [
    ['pt-BR','de','Hände','mão','number'],['es','de','Hände','mano','number'],
    ['de','pt-BR','mãos','Hand','number'],['es','pt-BR','mãos','mano','number'],
    ['pt-BR','es','también','eu também','context']
  ])assert.equal(review(word,answer,base,target).feedback[0].reason,reason);
  assert.equal(review('manos','Hände').feedback.length,0);
});
test('retry and correction preserve all answers; only confirmed meanings enter the profile',()=>{
  const storage=memory(),s=createStore(createRepository(storage));s.words('aproximadamente,tambien,amor,manos,puta');s.acceptWords();
  const answers={aproximadamente:'ungefähr',tambien:'ich auch',amor:'lieber',manos:'Hand',puta:'Schlampe'};
  assert.equal(s.translations(answers),false);assert.equal(s.state.profile.known.length,0);
  const html=assessmentView(s.state);assert.ok(html.includes('value="ich auch"'));assert.ok(html.includes('data-action="confirm-translation"'));
  s.translationDraft('aproximadamente','etwa');s.confirmTranslation('amor','Liebe');
  assert.equal(s.state.translationAnswers.aproximadamente,'etwa');assert.equal(s.state.translationAnswers.amor,'Liebe');
  assert.equal(s.state.profile.known.length,0);assert.equal(s.translations(s.state.translationAnswers),true);
  assert.equal(s.state.page,'insight');assert.equal(s.state.profile.meaningEvidence['manos:manos'].level,'partial');
  assert.ok(s.state.profile.known.includes('amor:amor'));assert.ok(validProfile(s.state.profile));
  const reloaded=createStore(createRepository(storage));assert.equal(reloaded.state.profile.meaningEvidence['manos:manos'].level,'partial');
  s.languages('pt-BR','de');assert.deepEqual(s.state.profile.meaningEvidence,{});s.languages('de','es');assert.equal(s.state.profile.meaningEvidence['manos:manos'].level,'partial');
  s.reset();assert.deepEqual(s.state.profile.meaningEvidence,{});assert.deepEqual(s.state.translationAnswers,{});
});
test('partial number knowledge remains prioritized for practice',()=>{
  const cards={word:[{key:'full'},{key:'partial'}],sentence:[],reply:[],spelling:[]};
  const profile={known:['full','partial'],progress:{},meaningEvidence:{partial:{level:'partial'}}};
  assert.equal(buildSession(cards,profile,'word','all')[0].key,'partial');
});
test('the afternoon word credits the everyday overlap without renaming its dictionary meaning',()=>{
  for(const [word,answer,canonical]of [['tardes','Tag','Nachmittage'],['tardes','Tage','Nachmittage'],['tarde','Tag','Nachmittag'],['tarde','Tage','Nachmittag']]){
    const result=review(word,answer);assert.equal(result.status,'accepted',word+': '+answer);
    assert.equal(result.feedback[0].reason,'concept',word+': '+answer);
    assert.equal(result.feedback[0].level,'partial',word+': '+answer);
    assert.equal(result.feedback[0].canonical,canonical,word+': '+answer);
  }
  for(const answer of ['am Nachmittag','nachmittags']){
    const result=review('tardes',answer);assert.equal(result.status,'accepted',answer);
    assert.equal(result.feedback[0].reason,'context',answer);assert.equal(result.feedback[0].level,'accepted',answer);
  }
  assert.equal(review('tardes','Nachmittag').feedback[0].reason,'number');
  assert.equal(review('tardes','Nachmittage').feedback.length,0);
  for(const wrong of ['Abend','Nacht','Morgen','Tag und Nacht','spanischer Nachmittag'])assert.notEqual(review('tardes',wrong).status,'accepted',wrong);
  assert.notEqual(review('dia','Nachmittag').status,'accepted');
});
test('partial overlap keeps the wordcard in practice while a whole phrase is mastered',()=>{
  const storage=memory(),s=createStore(createRepository(storage));s.words('tardes,me gustaría');s.acceptWords();
  assert.equal(s.translations({tardes:'Tag','me-gustaria':'ich würde gerne'}),true);
  assert.equal(s.state.profile.meaningEvidence['tardes:tardes'].level,'partial');
  assert.equal(s.state.profile.meaningEvidence['me-gustaria:me-gustaria'].level,'accepted');
  assert.ok(validProfile(s.state.profile));
  const cards={word:[{key:'full'},{key:'tardes:tardes'},{key:'me-gustaria:me-gustaria'}],sentence:[],reply:[],spelling:[]};
  const profile={...s.state.profile,known:[...s.state.profile.known,'full']};
  assert.equal(buildSession(cards,profile,'word','all')[0].key,'tardes:tardes');
});
test('a polite apology worded differently is accepted as the noted apology',()=>{
  for(const [answer,canonical]of [['Verzeihung','Entschuldigung'],['verzeihung','Entschuldigung'],['VERZEIHUNG','Entschuldigung'],['Verzeihen Sie','entschuldigen Sie']]){
    const result=review('disculpe',answer);assert.equal(result.status,'accepted',answer);
    assert.equal(result.feedback[0].reason,'context',answer);
    assert.equal(result.feedback[0].level,'accepted',answer);
    assert.equal(result.feedback[0].canonical,canonical,answer);
  }
  // Die notierten Formen bleiben direkt grün, ohne Hinweis.
  for(const answer of ['Entschuldigung','entschuldigen Sie'])assert.equal(review('disculpe',answer).feedback.length,0,answer);
  // Keine Teilstring-, semantische oder Toleranztür: anderes Wort, Wortstumpf, Negation.
  for(const wrong of ['Schuld','Schuldigung','Verzeichnis','Verzeih','Verzeihung nicht','Hund','gute Entschuldigung'])assert.notEqual(review('disculpe',wrong).status,'accepted',wrong);
});
test('the accepted apology wording is stored as full knowledge and survives a reload',()=>{
  const storage=memory(),s=createStore(createRepository(storage));s.words('disculpe');s.acceptWords();
  assert.equal(s.translations({disculpe:'Verzeihung'}),true);
  const evidence=s.state.profile.meaningEvidence['disculpe:disculpe'];
  assert.equal(evidence.level,'accepted');assert.equal(evidence.reason,'context');assert.equal(evidence.canonical,'Entschuldigung');
  assert.ok(s.state.profile.known.includes('disculpe:disculpe'));assert.ok(validProfile(s.state.profile));
  assert.ok(assessmentView(s.state).includes('Übernommen: „Verzeihung“'));
  const reloaded=createStore(createRepository(storage));assert.equal(reloaded.state.profile.meaningEvidence['disculpe:disculpe'].reason,'context');
});
test('the tolerance stays at intake: the learning round still wants the noted apology form',()=>{
  const expected=['entschuldigen Sie','Entschuldigung'];
  assert.equal(assessAnswer('Verzeihung',expected).correct,false);
  assert.equal(assessAnswer('Verzeihung',expected,{strictSpelling:true}).correct,false);
  assert.equal(assessAnswer('Entschuldigung',expected).correct,true);
});
test('malformed evidence is rejected while legacy profiles stay valid',()=>{
  const s=createStore(createRepository(memory()));assert.ok(validProfile(s.state.profile));
  assert.equal(validProfile({...s.state.profile,meaningEvidence:{bad:{level:'anything'}}}),false);
  delete s.state.profile.meaningEvidence;assert.ok(validProfile(s.state.profile));
});
