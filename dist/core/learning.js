export {normalize, matchWords, matchMeanings} from './matching.js';
export function learningCards(topic, vocabulary) {
  return vocabulary.flatMap(entry =>
    entry.meanings.filter(meaning => (meaning.topics ?? entry.topics).includes(topic))
      .map(meaning => ({ entry, meaning, key:entry.id + ':' + meaning.id })));
}
export function recordAttempt(progress, key, correct) {
  const old = progress[key] ?? { attempts:0, correct:0 };
  return { ...progress, [key]:{ attempts:old.attempts + 1, correct:old.correct + Number(correct), lastCorrect:Boolean(correct) } };
}
