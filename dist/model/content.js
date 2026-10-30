// Datenformen für lokale, redaktionell gepflegte Lerninhalte.
export function wordEntry(id, word, answers, topics, note = '', extra = {}) {
  const senses=Array.isArray(answers[0]) ? answers : [answers];
  return {id,word,meanings:senses.map((values,index)=>({id:index ? `${id}-${index+1}` : id,answers:values,note:note || `${word} — ${values[0]}.`})),topics,note,...extra};
}
export function sentence(id, topics, german, answers, note = '') {
  return { id, kind:'sentence', topics, prompt:german, answers, note };
}
export function reply(id, topics, heard, heardGerman, intention, answers, german, note = '') {
  return { id, kind:'reply', topics, heard, heardGerman, prompt:intention, answers, german, note };
}
