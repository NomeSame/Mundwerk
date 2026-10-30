import test from 'node:test';
import assert from 'node:assert/strict';
import {vocabulary} from '../dist/data/vocabulary.js';
import {matchWords,mergeCorrections,assessAnswer,matchMeanings} from '../dist/core/matching.js';
import {createStore} from '../dist/state/store.js';
import {createRepository} from '../dist/data/progress.js';
import {assessmentView} from '../dist/ui/assessment.js';
const userWords='hola, megustaria, agua, perro, pero, muy, bien, tardes, noches, dia, salida, quanto, questa, tambien, amor, puta, te qierro, mas, menos, manos, larvatei, gracias, caballo, trabacho, gusto, bebe, pro, favor, pagar, uno, dos, tres, quatro, sinque, seis, otto, nouvem, diez, que, porque, grande, adventuro, approximadamente, como, nombe, ombre, muher, nombre, creo, creo que, no, si, hablo, espanol, poco, ayuda, disculpe, esta, calle, queso, loco, pollo, hermanos';
const store=()=>createStore(createRepository({getItem:()=>null,setItem:()=>{}}));
test('unprompted recall field is blank with no examples or autocomplete',()=>{
  const html=assessmentView({page:'known'});
  const field=html.match(/<textarea[^>]*>[\s\S]*?<\/textarea>/)[0];
  assert.match(field,/><\/textarea>/); assert.ok(!field.includes('placeholder'));
  assert.match(field,/autocomplete="off"/); assert.match(field,/spellcheck="false"/);
  assert.ok(!html.includes('hola')); assert.ok(!html.includes('gracias'));
});
test('correct words from the reported input are recognized without guessing',()=>{
  const matches=matchWords(userWords,vocabulary);
  for(const word of ['perro','pero','muy','bien','tardes','noches','salida','amor','puta','manos','caballo','gusto','bebe','pro','favor','pagar','uno','dos','tres','seis','diez','que','porque','grande','como','nombre','creo','creo que','no','si','hablo','poco','ayuda','disculpe','esta','calle','queso','loco','pollo','hermanos']){
    assert.ok(matches.find(item=>item.word===word)?.entry,word);
  }
  assert.ok(matches.filter(item=>item.entry).length>=42);
  // Product change: accent/ñ omissions are accepted; other spelling errors still are not.
  for(const wrong of ['trabacho','quatro','megustaria']) assert.equal(matches.find(item=>item.word===wrong).entry,null,wrong);
  for(const tolerated of ['dia','espanol'])assert.ok(matches.find(item=>item.word===tolerated).entry);
});
test('spelling suggestions never count as recognized or known',()=>{
  const s=store(); s.words('trabacho, dia, espanol, megustaria, te qierro');
  for(const [word,suggestion] of [['trabacho','trabajo'],['dia','día'],['espanol','español'],['megustaria','me gustaría'],['te qierro','te quiero']]){
    const item=s.state.words.find(item=>item.word===word);
    if(['dia','espanol'].includes(word))assert.ok(item.entry);
    else assert.equal(item.entry,null);
    assert.ok(item.suggestions.includes(suggestion),word);
  }
  s.acceptWords(true); assert.equal(s.state.words.length,2); assert.equal(s.state.profile.known.length,0);
});
test('correction editor contains only unresolved inputs; recognized words survive',()=>{
  const s=store(); s.words('hola, perro, trabacho, dia');
  const html=assessmentView(s.state);
  const editor=html.match(/<textarea[^>]*id="corrected"[^>]*>([\s\S]*?)<\/textarea>/)[1];
  assert.equal(editor,'trabacho');
  s.correctWords('trabajo, día');
  assert.equal(s.state.round,2);
  assert.deepEqual(s.state.words.map(w=>w.entry.id),['hola','perro','dia','trabajo']);
  assert.equal(s.acceptWords(),true); assert.equal(s.state.page,'translations');
});
test('removing all unresolved words does not remove recognized ones or add duplicates',()=>{
  const old=matchWords('hola, agua, trabacho',vocabulary);
  assert.deepEqual(mergeCorrections(old,'',vocabulary).map(w=>w.word),['hola','agua']);
  assert.deepEqual(mergeCorrections(old,'hola, trabajo',vocabulary).map(w=>w.word),['hola','agua','trabajo']);
});
test('accent-sensitive forms keep separate meanings',()=>{
  const words=matchWords('si, sí, bebe, bebé, esta, está, mas, más',vocabulary);
  assert.equal(new Set(words.map(w=>w.entry.id)).size,8);
  assert.deepEqual(matchMeanings('ja',words[0].entry),[]);
  assert.deepEqual(matchMeanings('ja',words[1].entry),['si']);
  assert.deepEqual(matchMeanings('Baby',words[2].entry),[]);
});
test('independent meanings are not promoted together',()=>{
  const trabajo=vocabulary.find(item=>item.id==='trabajo');
  assert.equal(trabajo.meanings.length,2);
  assert.deepEqual(matchMeanings('Arbeit',trabajo),['trabajo']);
  assert.deepEqual(matchMeanings('ich glaube, dass',vocabulary.find(item=>item.id==='creo-que')),['creo-que']);
});
test('normal exercises tolerate accents; the separate spelling chapter is strict',()=>{
  assert.equal(assessAnswer('  CON TARJETA, POR FAVOR! ',['Con tarjeta, por favor.']).correct,true);
  assert.deepEqual(assessAnswer('si por favor',['Sí, por favor.']),{correct:true,spelling:true});
  assert.deepEqual(assessAnswer('si por favor',['Sí, por favor.'],{strictSpelling:true}),{correct:false,spelling:true});
  assert.equal(assessAnswer('no gracias',['Sí, gracias.']).correct,false);
  assert.equal(assessAnswer('', ['Hola.']).correct,false);
});
test('unknown markup is escaped in the review and editor',()=>{
  const s=store(); s.words('<img src=x onerror=alert(1)>');
  const html=assessmentView(s.state);
  assert.ok(!html.includes('<img')); assert.ok(html.includes('&lt;img'));
});
