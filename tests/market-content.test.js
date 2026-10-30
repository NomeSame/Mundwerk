import test from 'node:test';
import assert from 'node:assert/strict';
import {directedContent,languageCodes} from '../dist/core/content-direction.js';
import {availableCards,buildSession} from '../dist/core/session.js';
import {assessAnswer,matchWords} from '../dist/core/matching.js';
import {emptyProfile} from '../dist/data/progress.js';
import {marketVocabulary,marketSentences,marketReplies} from '../dist/data/market-content.js';
const es=directedContent();
test('PDF shopping stages are available as real words, sentences and replies',()=>{
  assert.equal(marketVocabulary.length,34);assert.equal(marketSentences.length,24);assert.equal(marketReplies.length,20);
  for(const word of ['el carro de supermercado','el canasto de compras','el arroz','el agua','gramos','carne de res','bolsita'])assert.ok(matchWords(word,es.vocabulary)[0].entry,word);
  for(const id of ['market-rice','market-water','market-fruit','market-toilet','counter-ham','counter-beef','market-two-bags','market-credit','market-total'])assert.ok(es.sentences.some(s=>s.id===id),id);
  assert.equal(assessAnswer('Me da medio kilo de queso, por favor.',es.sentences.find(s=>s.id==='half-kilo').answers).correct,true);
  const pt=directedContent('es','pt-BR');assert.equal(assessAnswer('Quero meio quilo de queijo, por favor.',pt.replies.find(s=>s.id==='cheese-quantity').answers).correct,true);
});
test('new topics have substantial mixed practice in all six directions',()=>{
  for(const base of languageCodes)for(const target of languageCodes){
    if(base===target)continue;const c=directedContent(base,target);
    for(const topic of ['supermarkt','theke','bar']){
      const cards=availableCards(topic,c.vocabulary,c.sentences,c.replies);
      assert.ok(cards.word.length>=10,topic);assert.ok(cards.sentence.length>=4,topic);assert.ok(cards.reply.length>=4,topic);
      const session=buildSession(cards,emptyProfile());assert.equal(session.length,20);assert.equal(new Set(session.map(card=>card.kind)).size,3);
    }
    for(const row of marketSentences)assert.ok(c.sentences.find(item=>item.id===row.id).answers.every(Boolean));
    for(const row of marketReplies){const r=c.replies.find(item=>item.id===row.id);assert.ok(r.heard&&r.heardGerman&&r.prompt&&r.german);}
  }
});
test('equivalent quantities pass while the wrong amount or drink fails',()=>{
  for(const [base,target,id,good,bad]of [
    ['de','es','bar-eighth-wine',['Un octavo de litro de vino, por favor.','125 ml de vino, por favor.'],['250 ml de vino, por favor.','Una copa de vino, por favor.','125 ml de cerveza, por favor.']],
    ['es','pt-BR','bar-eighth-wine',['125 ml de vinho, por favor.','Um oitavo de litro de vinho, por favor.'],['250 ml de vinho, por favor.','125 ml de cerveja, por favor.']],
    ['pt-BR','de','bar-half-beer',['Einen halben Liter Bier, bitte.','500 ml Bier, bitte.','0,5 Liter Bier, bitte.'],['Einen Liter Bier, bitte.','500 ml Wein, bitte.']],
    ['de','es','counter-ham',['100 g de jamón, por favor.','Cien gramos de jamón, por favor.'],['200 g de jamón, por favor.']],
    ['es','pt-BR','bar-quarter-wine',['250 ml de vinho tinto, por favor.'],['125 ml de vinho tinto, por favor.']]
  ]){
    const answers=directedContent(base,target).sentences.find(s=>s.id===id).answers;
    for(const value of good)assert.equal(assessAnswer(value,answers).correct,true,value);
    for(const value of bad)assert.equal(assessAnswer(value,answers).correct,false,value);
  }
});
test('dialogue tasks distinguish choosing amounts, bag counts and regional RUC context',()=>{
  const c=directedContent('pt-BR','de');
  const half=c.replies.find(r=>r.id==='bar-half-answer');assert.match(half.heard,/halber Liter oder ein Liter/);assert.match(half.prompt,/meio litro/);
  assert.equal(assessAnswer('500 ml Bier, bitte.',half.answers).correct,true);
  assert.equal(assessAnswer('Einen Liter Bier, bitte.',half.answers).correct,false);
  const bags=es.replies.find(r=>r.id==='market-bags-yes');assert.equal(assessAnswer('Sí, dos, por favor.',bags.answers).correct,true);assert.equal(assessAnswer('Sí, una, por favor.',bags.answers).correct,false);
  const ruc=es.replies.find(r=>r.id==='market-ruc-tourist');assert.match(ruc.prompt,/Paraguay/);assert.equal(assessAnswer('No tengo RUC. Soy turista.',ruc.answers).correct,true);
});
test('shared shopping knowledge keeps its original identity and only relevant extra topics',()=>{
  const rice=es.vocabulary.find(w=>w.id==='arroz');assert.ok(rice.topics.includes('supermarkt'));assert.ok(rice.topics.includes('restaurant'));
  const beer=es.vocabulary.find(w=>w.id==='cerveza');assert.ok(beer.topics.includes('bar'));assert.ok(beer.topics.includes('supermarkt'));assert.ok(!beer.topics.includes('familie'));
  const cheese=es.replies.find(r=>r.id==='cheese-quantity');assert.ok(cheese.topics.includes('theke'));assert.ok(cheese.topics.includes('supermarkt'));
  assert.equal(es.vocabulary.filter(w=>w.id==='arroz').length,1);
});
