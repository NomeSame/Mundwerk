export function normalize(value) {
  return typeof value === 'string' ? value.normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('es') : '';
}
export const foldLetters=value=>normalize(value).normalize('NFD').replace(/\p{M}/gu,'').replace(/ß/g,'ss');
const comparison=value=>foldLetters(value).replace(/\s/gu,'');
function distance(a,b) {
  let previous = Array.from({length:b.length+1},(_,i)=>i);
  for (let i=1;i<=a.length;i++) {
    const row = [i];
    for (let j=1;j<=b.length;j++) row[j] = Math.min(row[j-1]+1,previous[j]+1,previous[j-1]+Number(a[i-1]!==b[j-1]));
    previous = row;
  }
  return previous[b.length];
}
export function suggestionsFor(word, vocabulary) {
  const input = comparison(word);
  if (input.length < 3 || input.length > 80) return [];
  return vocabulary.map(entry => {
    const candidate = comparison(entry.word);
    if (Math.abs(candidate.length-input.length)>3) return null;
    const score = distance(input,candidate);
    return {entry,score,similarity:1-score/Math.max(input.length,candidate.length)};
  }).filter(item=>item && item.score <= (input.length > 7 ? 3 : 2) && item.similarity >= .65)
    .sort((a,b)=>a.score-b.score || b.similarity-a.similarity).slice(0,3).map(item=>item.entry.word);
}
export function matchWords(text, vocabulary) {
  const input = String(text ?? '').split(/[,;\n]+/u).map(normalize).filter(Boolean);
  return [...new Set(input)].map(word => {
    const forms=item=>[item.word,...(item.aliases??[])];
    const entries=vocabulary.filter(item=>forms(item).some(form=>foldLetters(form)===foldLetters(word)));
    const exact=entries.find(item=>forms(item).some(form=>normalize(form)===word));
    const entry=exact ?? entries[0] ?? null;
    const suggestions=entry ? [...new Set(entries.flatMap(forms).filter(form=>foldLetters(form)===foldLetters(word)&&normalize(form)!==word))] : suggestionsFor(word,vocabulary);
    return {word,entry,entries,status:entry ? exact ? 'exact' : 'orthography' : suggestions.length ? 'suggestion' : 'unknown',suggestions};
  });
}
export function mergeCorrections(previous, text, vocabulary) {
  const combined = [...previous.filter(item=>item.entry),...matchWords(text,vocabulary)];
  const seen = new Set();
  return combined.filter(item => {const key=item.entry?.id ?? item.word; if(seen.has(key)) return false; seen.add(key); return true;});
}
export function matchMeanings(answer, entry) {
  const raw=String(answer ?? '');
  const answers=[raw,...raw.split(',')].map(normalizeAnswer).filter(Boolean);
  return entry.meanings.filter(meaning => meaning.answers.some(value => answers.includes(normalizeAnswer(value)))).map(meaning => meaning.id);
}
export function resolveMeanings(answer,record){
  return (record.entries?.length ? record.entries : [record.entry]).filter(Boolean)
    .map(entry=>({entry,ids:matchMeanings(answer,entry)})).filter(result=>result.ids.length);
}
export function normalizeAnswer(value) {
  return normalize(value).replace(/[¿?¡!.,;:"“”«»]/gu,'').replace(/\s+/gu,' ').trim();
}
export function assessAnswer(answer, expected, {strictSpelling=false}={}) {
  const input = normalizeAnswer(answer);
  const answers = expected.map(normalizeAnswer);
  const exact=Boolean(input) && answers.includes(input);
  const spelling=!exact && Boolean(input) && answers.some(value=>foldLetters(value)===foldLetters(input));
  const correct=exact || (!strictSpelling && spelling);
  return {correct,spelling};
}
