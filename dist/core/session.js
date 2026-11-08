import {learningCards} from './learning.js';
import {normalize,foldLetters} from './matching.js';
export function availableCards(topic, vocabulary, sentences, replies) {
  return {
    word:learningCards(topic,vocabulary).map(card=>({...card,kind:'word',prompt:card.meaning.answers[0],answers:[...new Set([card.entry.word,...(card.entry.aliases??[])])],note:card.meaning.note ?? card.entry.note})),
    sentence:sentences.filter(item=>item.topics.includes(topic)).map(item=>({...item,key:'sentence:'+item.id})),
    reply:replies.filter(item=>item.topics.includes(topic)).map(item=>({...item,key:'reply:'+item.id})),
    spelling:vocabulary.filter(entry=>foldLetters(entry.word)!==normalize(entry.word)).map(entry=>({kind:'spelling',key:'spelling:'+entry.id,prompt:foldLetters(entry.word),german:entry.meanings[0].answers[0],answers:[entry.word],note:'Hier zählen Akzente und spanische Buchstaben. Im Wortschatztraining werden sie toleriert.'}))
  };
}
const mastered = (card,profile) => (profile.known.includes(card.key)&&profile.meaningEvidence?.[card.key]?.level!=='partial') || (profile.progress[card.key]?.correct >= 2 && profile.progress[card.key]?.lastCorrect);
export function learningStage(cards, profile) {
  if (cards.sentence.filter(card=>mastered(card,profile)).length >= 2) return 'reply';
  if (cards.word.filter(card=>mastered(card,profile)).length >= Math.min(4,cards.word.length)) return 'sentence';
  return 'word';
}
// One number for the whole product: how large a practice round may be by choice.
export const MAX_ROUND = 30;
export function roundSize(value, fallback = 20) {
  if (value === 'all') return 'all';
  const size = Number(value);
  return Number.isInteger(size) && size >= 1 ? Math.min(MAX_ROUND, size) : fallback;
}
export function buildSession(cards, profile, mode = 'path', length = 20) {
  const size = roundSize(length, 20);
  const sorted = Object.fromEntries(Object.entries(cards).map(([kind,list])=>[kind,[...list].sort((a,b)=>
    Number(mastered(a,profile))-Number(mastered(b,profile)) || (profile.progress[a.key]?.attempts ?? 0)-(profile.progress[b.key]?.attempts ?? 0))]));
  if (mode !== 'path') return size === 'all' ? sorted[mode] ?? [] : (sorted[mode] ?? []).slice(0,size);
  const stage = learningStage(cards,profile);
  const order = stage === 'reply' ? ['reply','sentence','word'] : stage === 'sentence' ? ['sentence','reply','word'] : ['word','sentence','reply'];
  if (size === 'all') return order.flatMap(kind=>sorted[kind]);
  const shares = [Math.ceil(size*.4),Math.ceil(size*.3),Math.floor(size*.3)];
  const picked = Object.fromEntries(order.map((kind,i)=>[kind,sorted[kind].slice(0,shares[i])]));
  let remaining = size-Object.values(picked).flat().length;
  for (const kind of order) {
    const extra = sorted[kind].slice(picked[kind].length,picked[kind].length+Math.max(remaining,0));
    picked[kind].push(...extra); remaining -= extra.length;
  }
  // A small round must stay small: the shares only spread over the kinds, they never enlarge it.
  return order.flatMap(kind=>picked[kind]).slice(0,size);
}
