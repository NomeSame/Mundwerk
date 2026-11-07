import {matchWords} from '../core/matching.js';
import {assessIntendedMeaning} from '../core/meaning-assessment.js';
import {findByMeaning} from '../core/meaning-search.js';

const pages=['welcome','experience','known','word-check','translations','insight','topics','home','lesson','done'];
const intake=['word-check','translations','insight'];
const text=(value,max)=>typeof value==='string'&&value.length<=max;
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const whole=(value,max)=>Number.isSafeInteger(value)&&value>=0&&value<=max;
export const workspaceKey=profile=>profile.baseLanguage+'>'+profile.targetLanguage;
export function checkpoint(state){
  const learning=['lesson','done'].includes(state.page);
  return {version:1,page:state.page,wordDraft:state.wordDraft??'',correctionDraft:state.correctionDraft??'',
    words:intake.includes(state.page)?state.words.map(item=>({word:item.word,slot:Number.isSafeInteger(item.slot)&&item.slot>0?item.slot:null,assigned:item.status==='meaning'?item.entry.id:null,hint:item.meaningHintQuery??'',searched:Boolean(item.meaningSearched)})):[],
    translationAnswers:state.translationAnswers,reviewed:Object.keys(state.meaningReviews).length>0,
    round:state.round,cards:learning?state.cards.map(card=>card.key):[],index:learning?state.index:0,
    answer:learning?state.answer:'',checked:learning&&state.checked,correct:learning&&state.correct,
    spelling:learning&&state.spelling,retry:learning&&Boolean(state.retrying),revealed:learning&&state.revealed,
    formHint:learning&&Boolean(state.formHint),modelAnswer:state.modelAnswer??'',sessionCorrect:learning?state.sessionCorrect:0};
}
// Only references and bounded plain data are stored. Rendered HTML, entry objects and
// card answers always come from the current content, never from localStorage.
export function resumeCheckpoint(saved,vocabulary,inventory,locale){
  if(!object(saved)||saved.version!==1||!pages.includes(saved.page)||
    !text(saved.wordDraft,12000)||!text(saved.correctionDraft,12000)||!text(saved.answer,1000)||
    !text(saved.modelAnswer,1000)||!whole(saved.round,100000)||saved.round<1||
    !Array.isArray(saved.words)||saved.words.length>6000||!Array.isArray(saved.cards)||saved.cards.length>2000||
    !whole(saved.index,saved.cards.length)||!whole(saved.sessionCorrect,saved.cards.length)||
    !['reviewed','checked','correct','spelling','retry','revealed','formHint'].every(key=>typeof saved[key]==='boolean')||
    !object(saved.translationAnswers)||Object.keys(saved.translationAnswers).length>1000||
    !Object.values(saved.translationAnswers).every(value=>text(value,300)))return null;
  const entries=new Map(vocabulary.map(entry=>[entry.id,entry]));
  const words=[];
  for(const row of saved.words){
    if(!object(row)||!text(row.word,12000)||!row.word||!(row.assigned===null||typeof row.assigned==='string')||!text(row.hint??'',200)||!(row.searched===undefined||typeof row.searched==='boolean')||!(row.slot===undefined||row.slot===null||whole(row.slot,6000)))return null;
    const record=matchWords(row.word,vocabulary)[0];
    if(!record)return null;
    // The stored order is the intake order; an explicit slot also keeps gaps from dropped words.
    record.slot=row.slot??words.length+1;
    record.meaningHintQuery=row.hint??'';record.meaningSearched=Boolean(row.searched);
    if(record.meaningSearched)record.meaningResults=findByMeaning(record.meaningHintQuery,vocabulary);
    if(row.assigned!==null){
      const entry=entries.get(row.assigned);if(!entry)return null;
      Object.assign(record,{entry,entries:[entry],status:'meaning',suggestions:[entry.word]});
    }
    words.push(record);
  }
  const available=new Map(Object.values(inventory).flat().map(card=>[card.key,card]));
  if(!saved.cards.every(key=>typeof key==='string'&&available.has(key)))return null;
  const cards=saved.cards.map(key=>available.get(key));
  if(saved.page==='lesson'&&(!cards.length||saved.index>=cards.length))return null;
  if(saved.page==='done'&&(!cards.length||saved.index!==cards.length))return null;
  if(['translations','insight'].includes(saved.page)&&(!words.length||words.some(row=>!row.entry)))return null;
  const reviews=saved.reviewed?words.filter(row=>row.entry).map(item=>({item,review:assessIntendedMeaning(saved.translationAnswers[item.entry.id]??'',item,locale)})):[];
  const translated=reviews.flatMap(({item,review})=>review.matches.map(match=>({...item,...match})));
  return {page:saved.page,wordDraft:saved.wordDraft,correctionDraft:saved.correctionDraft,words,
    translationAnswers:Object.fromEntries(Object.entries(saved.translationAnswers).filter(([id])=>entries.has(id))),
    meaningReviews:Object.fromEntries(reviews.map(({item,review})=>[item.entry.id,review])),
    meaningFeedback:reviews.flatMap(({review})=>review.feedback),translated,
    rejected:reviews.filter(({review})=>!review.matches.length).map(({item})=>item),
    missing:translated.filter(item=>item.ids.length&&item.ids.length<item.entry.meanings.length),
    round:saved.round,cards,index:saved.index,answer:saved.answer,checked:saved.checked,correct:saved.correct,
    spelling:saved.spelling,retrying:saved.retry,revealed:saved.revealed,formHint:saved.formHint,
    modelAnswer:saved.modelAnswer,sessionCorrect:saved.sessionCorrect};
}
