import {assessCoreMeaning} from './meaning-policy.js';
import {normalizeAnswer,foldLetters} from './matching.js';
const key=value=>foldLetters(normalizeAnswer(value));
const rank={exact:3,accepted:2,partial:1};
// Do not turn a decimal comma into separate integer answers.
const atoms=value=>String(value??'').split(/(?<!\d),|,(?!\d)|[;/\n]/u).map(value=>value.trim()).filter(Boolean);
const parts=value=>[...new Set([String(value??'').trim(),...atoms(value)].filter(Boolean))];
function oneEditApart(a,b){
  if(Math.abs(a.length-b.length)>1||a===b)return false;
  let i=0,j=0,edits=0;
  while(i<a.length&&j<b.length){
    if(a[i]===b[j]){i++;j++;continue;}
    if(++edits>1)return false;
    if(a.length>=b.length)i++;
    if(b.length>=a.length)j++;
  }
  return edits+Number(i<a.length||j<b.length)===1;
}
export function assessMeaning(answer,entry,locale='de'){
  const inputs=parts(answer),accepted=[],suggestions=[],matchedInputs=[];
  for(const meaning of entry.meanings){
    let best=null;
    for(const input of inputs){
      const exact=meaning.answers.find(value=>key(value)===key(input));
      const numeric=Number.isSafeInteger(meaning.numericValue)&&/^(0|[1-9]\d*)$/u.test(input)&&Number(input)===meaning.numericValue;
      const authored=meaning.recognition?.[locale]?.find(rule=>key(rule.answer)===key(input));
      const general=!exact&&!numeric&&!authored?assessCoreMeaning(input,meaning,locale):null;
      const found=exact?{level:'exact',reason:'exact',canonical:exact}:numeric?{level:'accepted',reason:'digits',canonical:meaning.answers[0]}:authored??general;
      if(found){
        matchedInputs.push(key(input));
        if(!best||rank[found.level]>rank[best.level])best={id:meaning.id,...found,answer:input};
      }
    }
    if(best){accepted.push(best);continue;}
    // Proposals are never promoted without confirmation; no substring/negation guessing.
    for(const canonical of meaning.answers){
      const expected=key(canonical);
      if(expected.length<4||expected.includes(' '))continue;
      if(inputs.some(input=>{const candidate=key(input);return !candidate.includes(' ')&&candidate.slice(0,3)===expected.slice(0,3)&&oneEditApart(candidate,expected);}))suggestions.push({canonical,meaningId:meaning.id});
    }
  }
  return {accepted,matchedInputs,suggestions:accepted.length?[]:suggestions};
}
export function assessIntendedMeaning(answer,record,locale='de'){
  const entries=(record.entries?.length?record.entries:[record.entry]).filter(Boolean);
  const evaluations=entries.map(entry=>({entry,...assessMeaning(answer,entry,locale)}));
  const matches=evaluations.filter(value=>value.accepted.length).map(value=>({...value,ids:value.accepted.map(item=>item.id)}));
  const suggestions=[...new Map(evaluations.flatMap(value=>value.suggestions).map(value=>[key(value.canonical),value])).values()];
  const covered=new Set(evaluations.flatMap(value=>value.matchedInputs));
  const guidanceFor=entry=>[...new Set(entry.meanings.map(meaning=>meaning.guidanceKey).filter(Boolean))];
  const unmatched=matches.length&&!covered.has(key(answer))?[...new Set(atoms(answer).filter(input=>!covered.has(key(input))))]:[];
  // Jede Rückmeldung trägt die redaktionelle Erklärung der Karte bei, damit bei
  // teilweisem Verständnis nicht nur die korrekte Form, sondern auch der Unterschied zeigt.
  const feedback=matches.flatMap(value=>value.accepted.filter(item=>item.level!=='exact').map(item=>({...item,word:value.entry.word,hints:guidanceFor(value.entry)})));
  if(unmatched.length)feedback.push({reason:'unmatched',word:record.entry.word,answer:unmatched.join(', '),canonical:matches.flatMap(value=>value.accepted.map(item=>item.canonical)).join(', '),hints:guidanceFor(record.entry)});
  const status=!String(answer??'').trim()?'empty':matches.length?'accepted':suggestions.length?'confirm':'unrecognized';
  const hints=status==='unrecognized'||unmatched.length?[...new Set(entries.flatMap(entry=>entry.meanings.map(meaning=>meaning.guidanceKey)).filter(Boolean))]:[];
  return {matches,feedback,hints,unmatched,suggestions:matches.length?[]:suggestions,status};
}
