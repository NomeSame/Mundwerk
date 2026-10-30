import {foldLetters} from './matching.js';
const filler=new Set(['ich','meine','mein','mit','ist','das','die','der','dem','den','ein','eine','einen','etwas','was','gemeint','bedeutet','heisst','heißt','es','so','dass','damit','wird','oder','wort','man','fur','eigentlich','um','geht','beim']);
for(const word of ['eu','quero','dizer','significa','o','a','os','as','e','uma','um','palavra','isso','me','refiero','decir','significa','el','la','lo','los','las','un','una','que'])filler.add(word);
const tokens=value=>foldLetters(value).match(/[\p{L}\p{N}]+/gu) ?? [];
export function findByMeaning(explanation,vocabulary){
  const keywords=[...new Set(tokens(explanation).filter(token=>!filler.has(token)))];
  if(!keywords.length || keywords.length>12)return [];
  return vocabulary.flatMap(entry=>entry.meanings.flatMap(meaning=>{
    const matches=meaning.answers.filter(answer=>keywords.every(key=>tokens(answer).includes(key)));
    if(!matches.length)return [];
    return [{id:entry.id,word:entry.word,meaningId:meaning.id,definition:meaning.answers[0],score:Math.min(...matches.map(answer=>tokens(answer).length-keywords.length))}];
  })).sort((a,b)=>a.score-b.score || a.word.localeCompare(b.word,'es')).slice(0,8);
}
