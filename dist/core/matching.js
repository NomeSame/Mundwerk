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
// Every intake word carries `slot`: its position in the intake order. A correction later
// refills that same slot, so every follow-up screen (meanings, insight, resume) stays in the
// order the user actually typed. Pure logic: no DOM, no persistence, no guessing.
export function matchWords(text, vocabulary) {
  const input = String(text ?? '').split(/[,;\n]+/u).map(normalize).filter(Boolean);
  const items = [];
  const seenInput = new Set();
  for (const word of input) {
    if (seenInput.has(word)) continue;
    seenInput.add(word);
    const forms=item=>[item.word,...(item.aliases??[])];
    const entries=vocabulary.filter(item=>forms(item).some(form=>foldLetters(form)===foldLetters(word)));
    const exact=entries.find(item=>forms(item).some(form=>normalize(form)===word));
    const entry=exact ?? entries[0] ?? null;
    const suggestions=entry ? [...new Set(entries.flatMap(forms).filter(form=>foldLetters(form)===foldLetters(word)&&normalize(form)!==word))] : suggestionsFor(word,vocabulary);
    items.push({word,entry,entries,status:entry ? exact ? 'exact' : 'orthography' : suggestions.length ? 'suggestion' : 'unknown',suggestions,slot:items.length+1});
  }
  return items;
}
// Distance a still-open word may be corrected by. Only compared against open words, never
// used to invent a meaning; the open word itself decides the slot.
const CORRECTION_REACH = 3;
function correctionCloseness(a, b) {
  const x = comparison(a), y = comparison(b);
  if (!x || !y || Math.abs(x.length - y.length) > CORRECTION_REACH) return null;
  const score = distance(x, y);
  return score >= 1 && score <= CORRECTION_REACH && 1 - score / Math.max(x.length, y.length) >= .6 ? score : null;
}
export function mergeCorrections(previous, text, vocabulary) {
  const open = previous.filter(item => !item.entry);
  const recognized = new Set(previous.filter(item => item.entry).map(item => item.entry.id));
  const slots = new Array(open.length).fill(null);
  const sameWriting = [];
  for (const item of matchWords(text, vocabulary)) {
    if (item.entry && recognized.has(item.entry.id)) continue;
    const at = open.findIndex((other, i) => !slots[i] && comparison(other.word) === comparison(item.word));
    if (at >= 0) slots[at] = item; else sameWriting.push(item);
  }
  const nearWriting = [];
  for (const item of sameWriting) {
    let at = -1, best = Infinity;
    open.forEach((other, i) => {
      if (slots[i]) return;
      const score = correctionCloseness(other.word, item.word);
      if (score !== null && score < best) { at = i; best = score; }
    });
    if (at >= 0) slots[at] = item; else nearWriting.push(item);
  }
  const extra = [];
  for (const item of nearWriting) {
    const at = slots.findIndex(value => !value);
    if (at >= 0) slots[at] = item; else extra.push(item);
  }
  const lastSlot = previous.reduce((highest, item) => Math.max(highest, item.slot ?? 0), 0);
  const merged = [];
  let next = 0;
  for (const item of previous) {
    if (item.entry) { merged.push(item); continue; }
    const replacement = slots[next++];
    // No line for this open word in the correction: it is dropped on purpose, and reported.
    if (replacement) merged.push({ ...replacement, slot: item.slot ?? merged.length + 1 });
  }
  extra.forEach((item, i) => merged.push({ ...item, slot: lastSlot + i + 1 }));
  const seen = new Set();
  return merged.filter(item => { const key = item.entry?.id ?? item.word; if (seen.has(key)) return false; seen.add(key); return true; });
}
// Which words the correction added beyond the open ones, and which open words were left out.
export function correctionReport(previous, merged) {
  const held = new Set(previous.map(item => item.slot).filter(slot => Number.isSafeInteger(slot) && slot > 0));
  const kept = new Set(merged.map(item => item.slot));
  return {
    added: merged.filter(item => !held.has(item.slot)).map(item => item.word),
    dropped: previous.filter(item => !item.entry && !kept.has(item.slot)).map(item => item.word),
  };
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
