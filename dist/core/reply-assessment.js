import {assessAnswer,foldLetters,normalizeAnswer} from './matching.js';

// Conversation tolerance is separate from word and spelling exercises.
// Only quantity constructions are reduced; no arbitrary content tokens disappear.
const rules={
  es:{object:/^cuant[oa]s? (.+?) (?:quiere|quieres|necesita|necesitas|desea|deseas)$/,polite:/\bpor favor\b/gu,link:/\b(kilo|kilos|litro|litros|gramos|mililitros) de /gu,units:/\b(kilo|kilos|litro|litros|gramos|mililitros) /u,numbers:'un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|medio|media|cuarto|cien|ciento|doscientos|quinientos|cincuenta|veinte|y|de'},
  'pt-BR':{object:/^quant[oa]s? (.+?) (?:voce quer|quer|voce deseja|deseja|voce precisa|precisa)$/,polite:/\bpor favor\b/gu,link:/\b(quilo|quilos|litro|litros|gramas|mililitros) de /gu,units:/\b(quilo|quilos|litro|litros|gramas|mililitros) /u,numbers:'um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|meio|meia|quarto|cem|cento|duzentos|quinhentos|cinquenta|vinte|e|de'},
  de:{object:/^wie viel(?:e)? (.+?) (?:mochten sie|mochtest du|wollen sie|willst du|brauchen sie|brauchst du)$/,polite:/\bbitte\b/gu,link:/(?!)/gu,units:/(?!)/u,numbers:'ein|eine|einen|einem|eines|eins|zwei|drei|vier|funf|sechs|sieben|acht|neun|zehn|halb|halbe|halben|halbes|viertel|hundert|zweihundert|funfhundert|funfzig|zwanzig|und'}
};
const clean=value=>foldLetters(normalizeAnswer(value));
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');

export function assessReply(answer,card,language){
  const direct=assessAnswer(answer,card.answers);
  if(direct.correct)return direct;
  const rule=rules[language],input=clean(answer);
  if(!rule||!input||input.length>1000)return direct;
  const object=clean(card.heard).match(rule.object)?.[1];
  const quantity=new RegExp(`^(?:${rule.numbers}|[0-9]+(?:[ /][0-9]+)?|kilo|kilos|kilogramm|liter|litro|litros|gramm|gramos|gramas|mililitros|milliliter|quilo|quilos|g|ml)(?: (?:${rule.numbers}|[0-9]+|kilo|kilos|kilogramm|liter|litro|litros|gramm|gramos|gramas|mililitros|milliliter|quilo|quilos|g|ml))*$`,'u');
  const reduce=value=>{
    let text=clean(value).replace(rule.polite,'').replace(/\s+/gu,' ').trim().replace(rule.link,'$1 ');
    if(object){
      const suffix=new RegExp(` (?:de )?${escape(object)}$`,'u');
      const shortened=text.replace(suffix,'');
      if(shortened!==text&&quantity.test(shortened))text=shortened;
    }
    return text;
  };
  const reduced=reduce(input);
  if(!reduced||!card.answers.some(expected=>reduce(expected)===reduced))return direct;
  const equivalents=card.answers.filter(expected=>reduce(expected)===reduced);
  const modelAnswer=object&&input.includes(object)?equivalents.find(expected=>clean(expected).includes(object))??equivalents[0]:equivalents[0];
  return {correct:true,spelling:false,formHint:true,modelAnswer};
}
