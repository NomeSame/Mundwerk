import {vocabulary} from '../data/vocabulary.js';
import {sentences} from '../data/sentences.js';
import {replies} from '../data/replies.js';
import {ptVocabulary} from '../data/pt-vocabulary.js';
import {ptSentences} from '../data/pt-sentences.js';
import {replyLocales} from '../data/reply-locales.js';
const split=value=>value.split('|');
export const languageCodes=['de','es','pt-BR'];
export const validPair=(base,target)=>languageCodes.includes(base)&&languageCodes.includes(target)&&base!==target;
export function directedContent(base='de',target='es'){
  if(!validPair(base,target))throw Error('Invalid language pair');
  if(base==='de'&&target==='es')return {vocabulary,sentences,replies};
  const words=vocabulary.flatMap(entry=>entry.meanings.map((meaning,index)=>{
    const pt=ptVocabulary[entry.id];
    if(!pt)throw Error('Missing pt-BR word: '+entry.id);
    const germanNouns={agua:['Wasser'],pan:['Brot'],puerta:['Tür','Türe'],leche:['Milch'],manzana:['Apfel'],amigo:['Freund'],casa:['Haus']};
    const forms={de:germanNouns[entry.id]??meaning.answers,es:[...new Set([entry.word,...(entry.aliases??[])])],'pt-BR':split(Array.isArray(pt)?pt[index]:pt)};
    return {id:`w-${entry.id}-${meaning.id}`,word:forms[target][0],aliases:forms[target],topics:meaning.topics??entry.topics,meanings:[{id:meaning.id,answers:forms[base],recognition:meaning.recognition,numericValue:meaning.numericValue,guidanceKey:meaning.guidanceKey,referenceAnswers:meaning.answers}],note:''};
  }));
  const phrases=sentences.map(item=>{
    if(!ptSentences[item.id])throw Error('Missing pt-BR sentence: '+item.id);
    const forms={de:item.answerForms?.de??[item.id==='good-afternoon'?'Guten Tag.':item.prompt],es:item.answers,'pt-BR':split(ptSentences[item.id])};
    return {...item,prompt:forms[base][0],answers:forms[target],note:''};
  });
  const conversations=replies.map(item=>{
    const row=replyLocales[item.id];if(!row)throw Error('Missing dialogue: '+item.id);
    const heard={de:item.heardGerman,es:item.heard,'pt-BR':row[0]};
    const intention={de:item.prompt,es:row[2],'pt-BR':row[1]};
    const answers={de:item.answerForms?.de??[item.german],es:item.answers,'pt-BR':split(row[3])};
    return {...item,heard:heard[target],heardGerman:heard[base],prompt:intention[base],answers:answers[target],german:answers[base][0],note:''};
  });
  return {vocabulary:words,sentences:phrases,replies:conversations};
}
