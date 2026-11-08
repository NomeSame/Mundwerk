import test from 'node:test';
import assert from 'node:assert/strict';
import {vocabulary} from '../dist/data/vocabulary.js';
import {sentences} from '../dist/data/sentences.js';
import {replies} from '../dist/data/replies.js';
import {availableCards,buildSession,roundSize,MAX_ROUND} from '../dist/core/session.js';
import {MAX_ROUND as modelMaxRound,roundSize as modelRoundSize} from '../dist/model/practice.js';
import {createRepository,emptyProfile,validProfile} from '../dist/data/progress.js';
import {createStore} from '../dist/state/store.js';
import {practiceSettings} from '../dist/ui/practice.js';

const cards=availableCards('restaurant',vocabulary,sentences,replies);
const memory=()=>{const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};};
const open=storage=>{const store=createStore(createRepository(storage));store.subscribe(()=>{});return store;};

test('the round size is freely pickable from one to the single declared maximum',()=>{
  assert.equal(MAX_ROUND,30);
  assert.equal(modelMaxRound,MAX_ROUND);
  assert.equal(modelRoundSize(7),7);
  for(const size of [1,2,3,7,19,29,30]){
    assert.equal(buildSession(cards,emptyProfile(),'word',size).length,Math.min(size,cards.word.length),String(size));
    assert.equal(buildSession(cards,emptyProfile(),'path',size).length,Math.min(size,cards.word.length+cards.sentence.length+cards.reply.length),String(size));
    assert.equal(new Set(buildSession(cards,emptyProfile(),'path',size).map(card=>card.key)).size,buildSession(cards,emptyProfile(),'path',size).length,String(size));
  }
  assert.equal(buildSession(cards,emptyProfile(),'path','all').length,cards.word.length+cards.sentence.length+cards.reply.length,'all still means all');
});

test('a round size outside the range is normalized instead of silently trusted',()=>{
  assert.deepEqual([roundSize('all'),roundSize(7),roundSize('7'),roundSize(47)],['all',7,7,MAX_ROUND]);
  for(const junk of [0,-3,2.5,'',null,'alle',undefined])assert.equal(roundSize(junk,20),20,String(junk));
  const s=open(memory());s.chooseTopic('restaurant');s.configure('word',7);
  s.configure('word',0);assert.equal(s.state.profile.length,7,'a rejected size must not change the round');
  s.configure('word',99);assert.equal(s.state.profile.length,MAX_ROUND,'a huge size clamps to the maximum');
  assert.equal(s.state.sessionSize,Math.min(30,cards.word.length));
});

test('a freely chosen round starts that long, survives reload and keeps old checkpoints valid',()=>{
  const storage=memory();let s=open(storage);s.chooseTopic('restaurant');s.configure('word',7);s.start();
  assert.equal(s.state.cards.length,7);assert.equal(s.state.sessionSize,7);
  assert.equal(s.state.cards[0].kind,'word','the picked mode is kept while the size is free');
  s=open(storage);s.chooseTopic('restaurant');
  assert.equal(s.state.profile.length,7,'the size comes back from the checkpoint');
  assert.equal(s.state.sessionSize,7,'the round is planned that long again');
  s.start();assert.equal(s.state.cards.length,7);
  const saved=length=>validProfile({...emptyProfile(),ready:true,topic:'restaurant',pairs:{'de>es':{known:[],meaningEvidence:{},progress:{},ready:true,topic:'restaurant',mode:'word',length}}});
  for(const legacy of [10,20,'all'])assert.equal(saved(legacy),true,'established sizes stay valid: '+legacy);
  assert.equal(saved(7),true,'the free size is valid');
  for(const junk of [0,2.5,'alle',null,MAX_ROUND+1])assert.equal(saved(junk),false,'garbage sizes stay rejected: '+junk);
});

test('the form offers every numbered size plus all, in the base language',()=>{
  const s=open(memory());s.chooseTopic('restaurant');
  assert.equal((practiceSettings(s.state).match(/<option value="\d+"/g)||[]).length,MAX_ROUND);
  s.configure('word',1);let html=practiceSettings(s.state);
  assert.match(html,/<option value="1" selected>1 Übung<\/option>/,'one exercise reads singular');
  assert.match(html,/<option value="30"[^>]*>30 Übungen<\/option>/);
  s.configure('word',7);html=practiceSettings(s.state);
  assert.match(html,/<option value="7" selected>7 Übungen<\/option>/);
  assert.match(html,/<option value="all"[^>]*>Alle verfügbaren Übungen<\/option>/,'all stays selectable next to the numbers');
  assert.doesNotMatch(html,/<option value="\d+" selected>.*?selected/, 'exactly one size is selected');
});
