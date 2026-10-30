import {matchWords,mergeCorrections,assessAnswer} from '../core/matching.js';
import {assessReply} from '../core/reply-assessment.js';
import {assessIntendedMeaning} from '../core/meaning-assessment.js';
import {findByMeaning} from '../core/meaning-search.js';
import {recordAttempt} from '../core/learning.js';
import {availableCards,buildSession,learningStage} from '../core/session.js';
import {topics} from '../data/topics.js';
import {directedContent,validPair} from '../core/content-direction.js';
import {emptyProfile} from '../data/progress.js';
export function createStore(repository) {
  const loaded=repository.load(), profile=loaded.profile;
  profile.baseLanguage??='de';profile.targetLanguage??='es';profile.pairs??={};profile.meaningEvidence??={};
  let {vocabulary,sentences,replies}=directedContent(profile.baseLanguage,profile.targetLanguage);
  if (!['path','word','sentence','reply','spelling'].includes(profile.mode)) profile.mode='path';
  if (![10,20,'all'].includes(profile.length)) profile.length=20;
  const state={profile,translationAnswers:{},meaningReviews:{},meaningFeedback:[],warning:loaded.error,page:profile.ready?'home':'welcome',round:1,words:[],translated:[],rejected:[],missing:[],cards:[],index:0,revealed:false,checked:false,correct:false,spelling:false,answer:'',sessionCorrect:0,install:false};
  let notify=()=>{};
  const emit=()=>{
    state.inventory=availableCards(profile.topic,vocabulary,sentences,replies);
    state.stage=learningStage(state.inventory,profile);
    state.sessionSize=buildSession(state.inventory,profile,profile.mode,profile.length).length;
    notify(state);
  };
  const save=()=>{state.warning=repository.save(profile);};
  const setWords=words=>{state.words=words;state.correctionDraft=words.filter(item=>!item.entry).map(item=>item.word).join('\n');state.page='word-check';emit();};
  return {
    state,
    subscribe(fn){notify=fn;emit();},
    go(page){state.page=page;emit();},
    warn(code){state.warning=code;emit();},
    languages(base,target){
      if(!validPair(base,target)){state.warning='pairError';emit();return false;}
      if(base===profile.baseLanguage&&target===profile.targetLanguage)return true;
      profile.pairs[profile.baseLanguage+'>'+profile.targetLanguage]={known:[...profile.known],meaningEvidence:{...profile.meaningEvidence},progress:{...profile.progress},ready:profile.ready,topic:profile.topic,mode:profile.mode,length:profile.length};
      const previous=profile.pairs[base+'>'+target];
      Object.assign(profile,{baseLanguage:base,targetLanguage:target,known:previous?.known??[],meaningEvidence:previous?.meaningEvidence??{},progress:previous?.progress??{},ready:previous?.ready??false,topic:previous?.topic??'alltag',mode:previous?.mode??'path',length:previous?.length??20});
      ({vocabulary,sentences,replies}=directedContent(base,target));
      Object.assign(state,{page:profile.ready?'home':'welcome',words:[],cards:[],round:1,translated:[],rejected:[],missing:[],correctionDraft:'',translationAnswers:{},meaningReviews:{},meaningFeedback:[],index:0,install:false});save();emit();return true;
    },
    reset(){
      const error=repository.reset();if(error){state.warning=error;emit();return false;}
      for(const key of Object.keys(profile))delete profile[key];
      Object.assign(profile,emptyProfile(),{mode:'path',length:20});
      ({vocabulary,sentences,replies}=directedContent());
      Object.assign(state,{page:'welcome',warning:'',words:[],cards:[],round:1,translated:[],rejected:[],missing:[],correctionDraft:'',translationAnswers:{},meaningReviews:{},meaningFeedback:[],index:0,install:false,answer:'',checked:false,revealed:false,sessionCorrect:0,correct:false,spelling:false});emit();return true;
    },
    beginAssessment(){state.words=[];state.round=1;state.rejected=[];state.translationAnswers={};state.meaningReviews={};state.meaningFeedback=[];state.page='known';emit();},
    words(text){state.round=1;setWords(matchWords(text,vocabulary));},
    correctWords(text){state.round++;setWords(mergeCorrections(state.words,text,vocabulary));},
    correctionDraft(text){state.correctionDraft=text;},
    searchMeaning(word,explanation){
      const item=state.words.find(item=>item.word===word&&!item.entry);
      if(!item)return;
      item.meaningHintQuery=explanation;item.meaningResults=findByMeaning(explanation,vocabulary);item.meaningSearched=true;emit();
    },
    confirmMeaning(word,id){
      const item=state.words.find(item=>item.word===word&&!item.entry);
      if(!item?.meaningResults?.some(result=>result.id===id))return;
      const entry=vocabulary.find(entry=>entry.id===id);
      Object.assign(item,{entry,entries:[entry],status:'meaning',suggestions:[entry.word]});
      const remaining=state.correctionDraft.split(/[,;\n]+/u).filter(value=>value.trim().toLocaleLowerCase('es')!==word);
      state.correctionDraft=remaining.join('\n');emit();
    },
    acceptWords(skip=false){
      if(state.words.some(item=>!item.entry)&&!skip)return false;
      const seen=new Set();
      state.words=state.words.filter(item=>{if(!item.entry||seen.has(item.entry.id))return false;seen.add(item.entry.id);return true;});
      state.page=state.words.length?'translations':'topics';emit();return true;
    },
    translationDraft(id,text){state.translationAnswers[id]=text;},
    confirmTranslation(id,canonical){
      if(!state.meaningReviews[id]?.suggestions.some(item=>item.canonical===canonical))return;
      state.translationAnswers[id]=canonical;delete state.meaningReviews[id];emit();
    },
    translations(answers,skip=false){
      state.translationAnswers={...answers};
      const resolved=state.words.map(item=>({item,review:assessIntendedMeaning(answers[item.entry.id],item,profile.baseLanguage)}));
      state.meaningReviews=Object.fromEntries(resolved.map(({item,review})=>[item.entry.id,review]));
      state.meaningFeedback=resolved.flatMap(({review})=>review.feedback);
      state.translated=resolved.flatMap(({item,review})=>review.matches.map(match=>({...item,...match})));
      state.rejected=resolved.filter(result=>!result.review.matches.length).map(result=>result.item);
      if(state.rejected.length&&!skip){emit();return false;}
      profile.known=[...new Set([...profile.known,...state.translated.flatMap(item=>item.ids.map(id=>item.entry.id+':'+id))])];
      for(const item of state.translated)for(const evidence of item.accepted){
        const key=item.entry.id+':'+evidence.id,previous=profile.meaningEvidence[key];
        if(previous?.level!=='exact'||evidence.level==='exact')profile.meaningEvidence[key]=evidence;
      }
      state.missing=state.translated.filter(item=>item.ids.length&&item.ids.length<item.entry.meanings.length);
      save();state.page=state.missing.length||state.meaningFeedback.length?'insight':'topics';emit();return true;
    },
    chooseTopic(topic){
      if(!topics.some(item=>item.id===topic))return;
      profile.topic=topic;profile.ready=true;save();state.page='home';emit();
    },
    configure(mode,length){
      if(['path','word','sentence','reply','spelling'].includes(mode))profile.mode=mode;
      if([10,20,'all'].includes(length))profile.length=length;
      save();emit();
    },
    start(){
      state.retrying=false;
      state.cards=buildSession(state.inventory,profile,profile.mode,profile.length);
      if(!state.cards.length){state.warning='noExercises';emit();return;}
      state.index=0;state.sessionCorrect=0;state.page='lesson';state.revealed=false;state.checked=false;state.answer='';state.spelling=false;emit();
    },
    check(answer){
      if(state.page!=='lesson'||(state.checked&&!state.retrying))return;
      state.retrying=false;
      const card=state.cards[state.index];
      state.answer=answer;state.formHint=false;
      Object.assign(state,card.kind==='reply'?assessReply(answer,card,profile.targetLanguage):assessAnswer(answer,card.answers,{strictSpelling:card.kind==='spelling'}));
      state.checked=true;state.revealed=true;
      profile.progress=recordAttempt(profile.progress,card.key,state.correct);
      state.sessionCorrect+=Number(state.correct);save();emit();
    },
    retryAnswer(){
      if(state.page!=='lesson'||!state.checked||state.correct||state.retrying)return;
      state.retrying=true;state.revealed=false;emit();
    },
    next(){
      if(state.page!=='lesson'||!state.checked)return;
      state.retrying=false;
      state.index++;state.revealed=false;state.checked=false;state.answer='';state.spelling=false;
      if(state.index>=state.cards.length)state.page='done';emit();
    },
    install(show){state.install=show;emit();}
  };
}
