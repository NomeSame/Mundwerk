import test from 'node:test';
import assert from 'node:assert/strict';
import {vocabulary,topics} from '../dist/data/vocabulary.js';
import {sentences} from '../dist/data/sentences.js';
import {replies} from '../dist/data/replies.js';
import {availableCards,buildSession,learningStage} from '../dist/core/session.js';
import {createRepository,emptyProfile} from '../dist/data/progress.js';
import {createStore} from '../dist/state/store.js';
import {assessAnswer} from '../dist/core/matching.js';
const profile=()=>emptyProfile();
const inventory=topic=>availableCards(topic,vocabulary,sentences,replies);
test('all 19 topics have actual content and twenty-item mixed sessions',()=>{
  assert.equal(topics.length,19); assert.ok(vocabulary.length>=190);
  for(const topic of topics){
    const cards=inventory(topic.id), session=buildSession(cards,profile());
    assert.ok(cards.word.length>=10,topic.id);assert.ok(cards.sentence.length>=4,topic.id);assert.ok(cards.reply.length>=4,topic.id);
    assert.equal(session.length,20,topic.id);
    assert.deepEqual(new Set(session.map(c=>c.kind)),new Set(['word','sentence','reply']));
    assert.equal(new Set(session.map(c=>c.key)).size,session.length);
  }
});
test('all content IDs and topic references are valid and keys are unique',()=>{
  const topicIds=new Set(topics.map(t=>t.id));
  for(const collection of [vocabulary,sentences,replies]){
    assert.equal(new Set(collection.map(item=>item.id)).size,collection.length);
    for(const item of collection)for(const topic of item.topics)assert.ok(topicIds.has(topic));
  }
  for(const topic of topics){const all=Object.values(inventory(topic.id)).flat();assert.equal(new Set(all.map(c=>c.key)).size,all.length);}
});
test('words and situations are shared across appropriate categories',()=>{
  for(const topic of ['cafe','restaurant','bezahlen'])assert.ok(inventory(topic).sentence.some(c=>c.id==='bill'));
  assert.ok(inventory('restaurant').reply.some(c=>c.id==='payment'));
  assert.ok(inventory('bezahlen').reply.some(c=>c.id==='payment'));
});
test('modes have no five-item cap, all means all, and small corpora are honest',()=>{
  const cards=inventory('restaurant');
  assert.equal(buildSession(cards,profile(),'word',10).length,10);
  assert.equal(buildSession(cards,profile(),'sentence','all').length,cards.sentence.length);
  assert.equal(buildSession(cards,profile(),'reply',20).length,cards.reply.length);
  assert.ok(buildSession(cards,profile(),'reply',20).every(card=>card.kind==='reply'));
  // The separate spelling chapter must never inflate or leak into the main path.
  assert.equal(buildSession(cards,profile(),'path','all').length,cards.word.length+cards.sentence.length+cards.reply.length);
  assert.deepEqual(buildSession({word:[],sentence:[],reply:[]},profile()),[]);
});
test('prior knowledge moves path towards sentences, practiced sentences towards replies',()=>{
  const cards=inventory('cafe'), p=profile();
  assert.equal(learningStage(cards,p),'word');
  p.known=cards.word.slice(0,4).map(c=>c.key);
  assert.equal(buildSession(cards,p)[0].kind,'sentence');
  for(const card of cards.sentence.slice(0,2))p.progress[card.key]={attempts:2,correct:2,lastCorrect:true};
  assert.equal(buildSession(cards,p)[0].kind,'reply');
});
test('practice rotates towards unpracticed items',()=>{
  const cards=inventory('cafe'), p=profile();
  const first=buildSession(cards,p,'word',10)[0];
  p.progress[first.key]={attempts:1,correct:0,lastCorrect:false};
  assert.notEqual(buildSession(cards,p,'word',10)[0].key,first.key);
});
test('dialogue answers accept authored alternatives and reject unrelated answers',()=>{
  const payment=replies.find(c=>c.id==='payment');
  assert.ok(payment.heard && payment.heardGerman && payment.prompt);
  for(const alternative of payment.answers)assert.equal(assessAnswer(alternative,payment.answers).correct,true);
  assert.equal(assessAnswer('No entiendo.',payment.answers).correct,false);
  for(const card of [...sentences,...replies])assert.ok(card.answers.every(answer=>answer.length>0));
});
test('old browser profiles load, new topics and practice preferences survive reload',()=>{
  let raw=JSON.stringify({...profile(),ready:true,known:['hola:hello']});
  const storage={getItem:()=>raw,setItem:(_,value)=>raw=value};
  const s=createStore(createRepository(storage));s.chooseTopic('verkehr');s.configure('reply','all');s.start();
  const card=s.state.cards[0];s.check(card.answers[0]);s.check(card.answers[0]);
  assert.equal(s.state.profile.progress[card.key].attempts,1);
  const restored=createStore(createRepository(storage));
  assert.equal(restored.state.profile.topic,'verkehr');assert.equal(restored.state.profile.mode,'reply');assert.equal(restored.state.profile.length,'all');
  assert.deepEqual(restored.state.profile.known,['hola:hello']);
});
test('new modes finish a full round and persist separate sentence and reply histories',()=>{
  const s=createStore(createRepository({getItem:()=>null,setItem:()=>{}}));s.chooseTopic('restaurant');s.configure('path',20);s.start();
  while(s.state.page==='lesson'){s.check(s.state.cards[s.state.index].answers[0]);s.next();}
  assert.equal(s.state.page,'done');assert.equal(s.state.sessionCorrect,20);
  assert.ok(Object.keys(s.state.profile.progress).some(key=>key.startsWith('sentence:')));
  assert.ok(Object.keys(s.state.profile.progress).some(key=>key.startsWith('reply:')));
  const previous=s.state.profile.topic;s.chooseTopic('not-a-topic');assert.equal(s.state.profile.topic,previous);
});
