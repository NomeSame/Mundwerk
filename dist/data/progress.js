import {topics} from './topics.js';
import {validPair} from '../core/content-direction.js';
import {MAX_ROUND} from '../model/practice.js';
const KEY = 'sprachinseln.v1';
export const emptyProfile = () => ({ version:1, ready:false, topic:'alltag', known:[], progress:{},baseLanguage:'de',targetLanguage:'es',pairs:{},meaningEvidence:{} });
const validProgress=progress=>progress&&typeof progress==='object'&&!Array.isArray(progress)&&Object.values(progress).every(item=>item&&Number.isSafeInteger(item.attempts)&&item.attempts>=0&&Number.isSafeInteger(item.correct)&&item.correct>=0&&item.correct<=item.attempts&&typeof item.lastCorrect==='boolean');
const validKnown=known=>Array.isArray(known)&&known.every(item=>typeof item==='string');
const validEvidence=value=>value===undefined||(value&&typeof value==='object'&&!Array.isArray(value)&&Object.values(value).every(item=>item&&['exact','accepted','partial'].includes(item.level)&&['exact','context','number','register','digits','verbform','concept','wording'].includes(item.reason)&&typeof item.answer==='string'&&typeof item.canonical==='string'));
const validRoundSize=length=>length==='all'||(Number.isInteger(length)&&length>=1&&length<=MAX_ROUND);
const validBucket=pair=>pair&&validEvidence(pair.meaningEvidence)&&validKnown(pair.known)&&validProgress(pair.progress)&&typeof pair.ready==='boolean'&&topics.some(topic=>topic.id===pair.topic)&&['path','word','sentence','reply','spelling'].includes(pair.mode)&&validRoundSize(pair.length);
export function validProfile(value) {
  return validEvidence(value?.meaningEvidence) && value?.version === 1 && typeof value.ready === 'boolean' &&
    ((value.baseLanguage===undefined&&value.targetLanguage===undefined)||validPair(value.baseLanguage,value.targetLanguage)) &&
    (value.pairs===undefined||(value.pairs&&typeof value.pairs==='object'&&!Array.isArray(value.pairs)&&Object.entries(value.pairs).every(([key,pair])=>key.split('>').length===2&&validPair(...key.split('>'))&&validBucket(pair)))) &&
    topics.some(topic=>topic.id === value.topic) && validKnown(value.known) && validProgress(value.progress);
}
export function createRepository(storage) {
  let unreadable=false;
  return {
    load() {
      try {
        const raw = storage.getItem(KEY);
        if (!raw) return { profile:emptyProfile(), error:'' };
        const profile = JSON.parse(raw);
        if (!validProfile(profile)) throw Error('invalid');
        unreadable=false;return { profile, error:'' };
      } catch { unreadable=true;return { profile:emptyProfile(), error:'loadError' }; }
    },
    save(profile) {
      if(unreadable)return 'saveError'; // Keep the original data until an explicit reset.
      try { storage.setItem(KEY, JSON.stringify(profile)); return ''; }
      catch { return 'saveError'; }
    },
    reset(){
      try{storage.removeItem(KEY);unreadable=false;return '';}
      catch{return 'resetError';}
    }
  };
}
