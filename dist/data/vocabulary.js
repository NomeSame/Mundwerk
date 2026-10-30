import {marketVocabulary,addMarketTopics} from './market-content.js';
import { extendedVocabulary } from './lexicon.js';
import {meaningRules,cardinalValues,meaningGuidance} from './meaning-rules.js';
export { topics } from './topics.js';
const baseVocabulary = [
  { id:'hola', word:'hola', meanings:[{id:'hello', answers:['hallo']}], topics:['alltag','cafe','einkaufen'], note:'Hola. — Hallo.' },
  { id:'gracias', word:'gracias', meanings:[{id:'thanks', answers:['danke','vielen dank']}], topics:['alltag','cafe','einkaufen'], note:'Gracias. — Danke.' },
  { id:'agua', word:'agua', meanings:[{id:'water', answers:['wasser']}], topics:['cafe','einkaufen'], note:'Agua, por favor. — Wasser, bitte.' },
  { id:'pan', word:'pan', meanings:[{id:'bread', answers:['brot']}], topics:['einkaufen'], note:'Pan, por favor. — Brot, bitte.' },
  { id:'puerta', word:'puerta', meanings:[{id:'door', answers:['tür','tuere','türe']}], topics:['alltag'], note:'La puerta. — Die Tür.' },
  { id:'cafe', word:'café', meanings:[{id:'coffee', answers:['Kaffee']},{id:'cafe-place',answers:['Café','Kaffeehaus'], note:'En el café. — Im Café.'}], topics:['cafe'], note:'Un café, por favor. — Einen Kaffee, bitte.' },
  { id:'leche', word:'leche', meanings:[{id:'milk', answers:['milch']}], topics:['cafe','einkaufen'], note:'Con leche. — Mit Milch.' },
  { id:'cuenta', word:'cuenta', meanings:[{id:'bill', answers:['Rechnung']},{id:'account',answers:['Konto'], topics:['alltag'], note:'Una cuenta bancaria. — Ein Bankkonto.'}], topics:['cafe'], note:'La cuenta, por favor. — Die Rechnung, bitte.' },
  { id:'manzana', word:'manzana', meanings:[{id:'apple', answers:['apfel']}], topics:['einkaufen'], note:'Una manzana. — Ein Apfel.' },
  { id:'amigo', word:'amigo', meanings:[{id:'friend', answers:['freund']}], topics:['alltag'], note:'Un amigo. — Ein Freund.' },
  { id:'casa', word:'casa', meanings:[{id:'house', answers:['haus']}], topics:['alltag'], note:'Mi casa. — Mein Haus.' },
  { id:'adios', word:'adiós', meanings:[{id:'goodbye', answers:['auf wiedersehen','tschüss','tschüs','leb wohl']}], topics:['alltag'], note:'Adiós. — Auf Wiedersehen.' }
];
const additionalTopics = {
  hola:['begruessen','vorstellen','restaurant','unterkunft'], gracias:['begruessen','restaurant','bezahlen','hilfe'],
  agua:['restaurant','lebensmittel'], pan:['restaurant','lebensmittel','cafe'],
  puerta:['wege','unterkunft'], cafe:['restaurant','lebensmittel'], leche:['lebensmittel'],
  cuenta:['bezahlen','restaurant'], manzana:['lebensmittel'], amigo:['familie','freizeit','vorstellen'],
  casa:['familie','unterkunft','vorstellen'], adios:['begruessen']
};
export const vocabulary = addMarketTopics('word',[...baseVocabulary.map(entry => ({...entry,topics:[...new Set([...entry.topics,...(additionalTopics[entry.id] ?? [])])]})), ...extendedVocabulary,...marketVocabulary]).map(entry=>({...entry,meanings:entry.meanings.map(meaning=>({...meaning,recognition:meaningRules[`${entry.id}:${meaning.id}`]??{},numericValue:meaning.id===entry.id?cardinalValues[entry.id]:undefined,guidanceKey:meaningGuidance[`${entry.id}:${meaning.id}`]}))}));
