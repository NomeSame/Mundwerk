import {normalizeAnswer,foldLetters} from './matching.js';
import {verbLexemes,irregularVerbs,nounParadigms,relatedConcepts,wordingVariants} from '../data/language-forms.js';
const key=value=>foldLetters(normalizeAnswer(value));
const articles={de:/^(?:der|die|das|ein|eine|einen|einem|einer) /u,es:/^(?:el|la|los|las|un|una|unos|unas) /u,'pt-BR':/^(?:o|a|os|as|um|uma|uns|umas) /u};
const pronouns={de:new Set('ich du er sie es wir ihr mich dich sich uns euch mir dir ihnen'.split(' ')),es:new Set('yo tu usted nosotros nosotras vosotros vosotras ustedes el ella ellos ellas'.split(' ')),'pt-BR':new Set('eu tu voce ele ela nos vos voces eles elas me se'.split(' '))};
const negative=/\b(?:nicht|kein\w*|ohne|nein|no|nunca|sin|nao|sem|nem)\b/u;
function core(text,locale,allowClitics=false){
  let value=key(text);if(negative.test(value))return '';
  value=value.replace(articles[locale],'');
  if(locale==='es')value=value.replace(/^(.{3,}(?:ar|er|ir))(?:me|te|se|nos|lo|la|los|las)$/u,'$1');
  if(locale==='pt-BR')value=value.replace(/-(?:me|te|se|nos|lhe|lhes)$/u,'');
  const clitics=locale==='es'?['me','te','se','nos','os']:locale==='pt-BR'?['me','te','se','nos']:[];
  const tokens=value.split(' ').filter(token=>!pronouns[locale].has(token)&&!(allowClitics&&clitics.includes(token)));
  return tokens.length===1?tokens[0]:'';
}
function forms(lemma,locale){
  if(irregularVerbs[locale][lemma])return new Set([lemma,...irregularVerbs[locale][lemma].split(' ')].map(key));
  let generated=[];
  if(locale==='de'){
    const stem=lemma.replace(/(?:en|n)$/u,'');
    const joined=/[dt]$/u.test(stem)?['e','est','et','en']:['e','st','t','en',''];
    generated=joined.map(ending=>stem+ending);
    const suffix=/[dt]$/u.test(stem)?'et':'t';
    generated.push((/^(?:be|emp|ent|er|ge|miss|ver|zer)/u.test(lemma)||lemma.endsWith('ieren')?'':'ge')+stem+suffix);
  }else{
    const stem=lemma.slice(0,-2),ending=lemma.slice(-2);
    const suffixes=locale==='es'?{ar:['o','as','a','amos','áis','an','ando','ado'],er:['o','es','e','emos','éis','en','iendo','ido'],ir:['o','es','e','imos','ís','en','iendo','ido']}:{ar:['o','as','a','amos','ais','am','ando','ado'],er:['o','es','e','emos','eis','em','endo','ido'],ir:['o','es','e','imos','is','em','indo','ido']};
    generated=(suffixes[ending]??[]).map(suffix=>stem+suffix);
  }
  return new Set([lemma,...generated].map(key));
}
const paradigms=Object.fromEntries(['de','es','pt-BR'].map(locale=>[locale,verbLexemes[locale].map(lemma=>({lemma,forms:forms(lemma,locale)}))]));
function verbKind(meaning){
  const reference=meaning.referenceAnswers??meaning.answers;
  return reference.some(text=>/^(?:ich|du|er|sie|es|wir|ihr|mich|dich|sich|uns|euch) /iu.test(text)||(/^[a-zäöüß]/u.test(text)&&(paradigms.de.some(paradigm=>paradigm.forms.has(key(text)))||/^[a-zäöüß]+(?:en|ern|eln)$/u.test(text))));
}
function inferredGermanLemma(text){
  const value=core(text,'de');if(!value)return null;
  if(/(?:en|ern|eln)$/u.test(value))return value;
  // A subject/reflexive frame is evidence of a verb, not a license to stem arbitrary nouns.
  if(!/^(?:ich|du|er|sie|es|wir|ihr|mich|dich|sich|uns|euch) /iu.test(text))return null;
  const stem=value.replace(/(?:est|et|st|e|t)$/u,'');
  if(stem.length<3)return null;
  return stem+(stem.endsWith('er')||stem.endsWith('el')?'n':'en');
}
function sameVerb(input,answer,locale){
  const allowClitics=/(?:ar|er|ir)(?:me|te|se|nos)?$/u.test(key(answer))||/^se /u.test(key(answer));
  const expected=core(answer,locale,allowClitics),candidate=core(input,locale,allowClitics);if(!expected||!candidate)return false;
  if(expected===candidate)return true;
  for(const paradigm of paradigms[locale])if(paradigm.forms.has(expected)&&paradigm.forms.has(candidate))return true;
  let lemma=locale==='de'?inferredGermanLemma(answer):/(?:ar|er|ir)$/u.test(expected)?expected:null;
  if(lemma&&lemma.length>=4){const generated=forms(lemma,locale);return generated.has(expected)&&generated.has(candidate);}
  return false;
}
function sameNumber(input,answer,locale){
  const a=key(input).replace(articles[locale],''),b=key(answer).replace(articles[locale],'');
  if(a.includes(' ')||b.includes(' ')||a===b)return false;
  if(nounParadigms[locale].some(group=>{const values=group.map(key);return values.includes(a)&&values.includes(b);}))return true;
  if(locale==='de')return /(?:ung|heit|keit|schaft|ion|tat)$/u.test(a)&&b===a+'en'||/(?:ung|heit|keit|schaft|ion|tat)$/u.test(b)&&a===b+'en'||a.endsWith('e')&&b===a+'n'||b.endsWith('e')&&a===b+'n';
  // Conservative productive plural: vowel + s only. No guessed stems or fuzzy endings.
  return a.length>=3&&/[aeiou]$/u.test(a)&&b===a+'s'||b.length>=3&&/[aeiou]$/u.test(b)&&a===b+'s';
}
const wordingAlias=Object.fromEntries(Object.entries(wordingVariants).map(([locale,groups])=>[locale,new Map(groups.flatMap(group=>group.map(word=>[key(word),key(group[0])])))]));
// „ich würde gerne“ statt der notierten Antwort „ich würde gern": nachweisbar derselbe
// Satz, nur mit der anderen üblichen Endung. Nur ganze Redewendungen vergleichen, damit
// kein Einzelwort über diese Tür angenommen wird und kein Teilstring zählt.
function sameWording(input,answer,locale){
  const map=wordingAlias[locale];if(!map?.size)return false;
  const strip=value=>key(value).replace(articles[locale],'').split(' ').filter(Boolean);
  const wanted=strip(answer),given=strip(input);
  if(wanted.length<2||wanted.length!==given.length)return false;
  let differs=false;
  for(let index=0;index<wanted.length;index++){
    if(wanted[index]===given[index])continue;
    if(!map.has(wanted[index])||!map.has(given[index])||map.get(wanted[index])!==map.get(given[index]))return false;
    differs=true;
  }
  return differs;
}
export function assessCoreMeaning(input,meaning,locale){
  if(!['de','es','pt-BR'].includes(locale)||negative.test(key(input)))return null;
  for(const answer of meaning.answers){
    const candidate=key(input),expected=key(answer);if(!candidate||!expected)continue;
    if(candidate.replace(articles[locale],'')===expected.replace(articles[locale],''))return {level:'accepted',reason:'context',canonical:answer};
    if(sameWording(input,answer,locale))return {level:'accepted',reason:'wording',canonical:answer};
    if(relatedConcepts[locale].some(group=>{
      const contains=value=>group.some(member=>key(member)===value||paradigms[locale].some(paradigm=>key(member)===key(paradigm.lemma)&&paradigm.forms.has(core(value,locale))));
      return contains(candidate)&&contains(expected);
    }))return {level:'partial',reason:'concept',canonical:answer};
    if(verbKind(meaning)&&sameVerb(input,answer,locale))return {level:'partial',reason:'verbform',canonical:meaning.answers[0]};
    const reference=meaning.referenceAnswers??meaning.answers;
    if(reference.some(value=>/^[A-ZÄÖÜ]/u.test(value))&&sameNumber(input,answer,locale))return {level:'partial',reason:'number',canonical:answer};
  }
  return null;
}
