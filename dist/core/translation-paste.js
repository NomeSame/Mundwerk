// Eingefügte Bedeutungsliste. Ein Eintrag pro Zeile, getrennt durch „;“ oder durch „|“.
// Semikolon und Umbruch springen also ins nächste Feld, während das Komma frei bleibt:
// Wörter, die nur durch Komma getrennt sind, bleiben im selben Feld (ein Wort behält damit
// mehrere Bedeutungen). Optional darf das Zielwort vorangestellt sein („hola: hallo“,
// „me gustaría gefällt mir“); erkannte Wörter ordnen sich selbst ein, Akzente und Großschreibung
// sind egal. Eine Leerzeile oder eine Markierung („fertig“) beendet die Liste.
// MAX_ANSWER spiegelt maxlength in dist/ui/meaning-review.js.
export const MAX_ANSWER=300;
export const MAX_PASTE=100000;
const STOP=/^(?:fertig|ende|done|fim|stop|ok|listo|pronto|---+|\.\.\.+|#+)$/iu;
const PREFIX=/^(.{1,60}?)\s*(?:=|:|→|–|—|\t+| {2,}| - )\s*(.+)$/su;
export function foldWord(value){
  return String(value).normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('es').replace(/\s+/gu,' ').trim();
}
export function stripWordPrefix(value,word){
  const folded=foldWord(word);
  if(!folded)return null;
  // Compare literal text, including decomposed accents and regex metacharacters.
  for(let end=1;end<Math.min(value.length,String(word).length*3+16);end++){
    if(/\s/u.test(value[end])&&foldWord(value.slice(0,end))===folded){
      const rest=value.slice(end).trim();if(rest)return rest;
    }
  }
  return null;
}
export function usesWholeList(text){
  const value=String(text??'');
  return /[\r\n|;]/u.test(value)||STOP.test(value.trim());
}
// words: [{id, word}] in Feldreihenfolge, start: Index des Feldes, in das eingefügt wurde.
export function wholeList(text,words,start=0,existing={}){
  const fields=words.map(item=>({id:item.id,word:item.word,fold:foldWord(item.word)}));
  const taken=new Set(fields.filter(item=>String(existing[item.id]??'').trim()).map(item=>item.id));
  const assigned=[],left=[],tooLong=[];
  let stopped=false,marker='',blank=false,processed=false;
  let cursor=Math.min(Math.max(Math.trunc(Number(start)||0),0),fields.length);
  const source=String(text??'');
  if(source.length>MAX_PASTE)return {values:{},assigned,left,tooLong,stopped,marker,blank,emptyFields:fields.length-taken.size,oversized:true};
  const parts=source.replace(/;[ \t]*(?:\r\n|[\r\n])/gu,';').split(/\r\n|[\r\n|;]/u);
  while(parts.length&&!parts.at(-1).trim())parts.pop();
  for(const part of parts){
    const value=part.trim();
    if(!value){if(processed&&!stopped){stopped=true;blank=true;}continue;}
    if(STOP.test(value)){if(!stopped){stopped=true;marker=value;}continue;}
    if(stopped){left.push(value);continue;}
    processed=true;
    let index=-1,answer=value;
    const pair=value.match(PREFIX);
    if(pair){
      const fold=foldWord(pair[1]);
      index=fields.findIndex(field=>fold&&field.fold===fold);
      if(index>=0)answer=pair[2].trim();
    }else{
      let bestRest=null;
      for(const [position,field] of fields.entries()){
        const rest=stripWordPrefix(value,field.word);
        if(rest!==null&&(index<0||rest.length<bestRest.length)){index=position;bestRest=rest;}
      }
      if(index>=0)answer=bestRest;
    }
    if(index<0){
      while(cursor<fields.length&&taken.has(fields[cursor].id))cursor++;
      index=cursor;
    }
    const field=fields[index];
    if(!field||taken.has(field.id)){left.push(answer);continue;}
    cursor=Math.max(cursor,index+1);
    if(answer.length>MAX_ANSWER){tooLong.push(field.word);continue;}
    assigned.push({id:field.id,word:field.word,answer});taken.add(field.id);
  }
  return {values:Object.fromEntries(assigned.map(item=>[item.id,item.answer])),assigned,left,tooLong,
    stopped,marker,blank,emptyFields:fields.length-taken.size,oversized:false};
}
export function pasteSummary(list,total,t){
  if(list.oversized)return t('pasteOversized');
  const parts=[];
  if(list.assigned.length)parts.push(t('pasteFilled',{count:list.assigned.length,total}));
  if(list.stopped&&list.left.length)parts.push(t(list.blank?'pasteBlank':'pasteStopped',{marker:list.marker,count:list.left.length}));
  else if(list.left.length)parts.push(t('pasteLeft',{count:list.left.length}));
  if(list.tooLong.length)parts.push(t('pasteCut',{count:list.tooLong.length}));
  return parts.join(' ');
}
