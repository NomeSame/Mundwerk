import {esc,button,eyebrow} from './components.js';
import {MAX_ANSWER} from '../core/translation-paste.js';
import {uiContext} from './context.js';
function notice(item,t,withHints=false){return `<p class="meaning-note ${item.reason==='unmatched'?'meaning-unmatched':''}">${esc(t('meaning'+item.reason,{answer:item.answer,canonical:item.canonical}))}</p>${withHints?(item.hints??[]).map(key=>`<p class="meaning-hint">${esc(t(key))}</p>`).join(''):''}`;}
export function translationView(s){
  const {t,base}=uiContext(s);
  return `<section class="narrow">${eyebrow(t('meaningsStep'))}<h1>${t('meaningsTitle')}</h1><p class="lead">${t('translateLead',{base})}</p><p class="fine" data-paste-hint>${esc(t('pasteLead'))}</p><p class="fine" data-paste-status role="status" aria-live="polite"></p><form data-form="translations">${s.words.map(w=>{
    const id=w.entry.id,review=s.meaningReviews?.[id],invalid=['unrecognized','empty'].includes(review?.status);
    // Bei teilweisem Verständnis steht die Kartenerklärung direkt unter dem Feld,
    // damit nicht nur die korrekte Form zu lesen ist, sondern auch der Unterschied.
    const explained=new Set((review?.feedback??[]).flatMap(item=>item.hints??[]));
    return `<div class="translation"><label for="t-${esc(id)}">${esc(w.entry.word)}${(w.entries?.reduce((n,e)=>n+e.meanings.length,0)??w.entry.meanings.length)>1?' *':''}</label><div class="translation-field"><input class="meaning-input ${review?.status??''}" id="t-${esc(id)}" name="${esc(id)}" value="${esc(s.translationAnswers?.[id]??'')}" autocomplete="off" maxlength="${MAX_ANSWER}" ${invalid?'aria-invalid="true"':''} ${review?`aria-describedby="review-${esc(id)}"`:''}><div id="review-${esc(id)}" class="meaning-review ${review?.status??''}">${review?.feedback.map(item=>notice(item,t,true)).join('')??''}${review?.status==='confirm'?`<p>${t('meaningConfirm')}</p>${review.suggestions.map(item=>`<button type="button" class="text-button" data-action="confirm-translation" data-entry="${esc(id)}" data-value="${esc(item.canonical)}">${esc(t('meaningUse',{canonical:item.canonical}))}</button>`).join('')}`:''}${(review?.hints??[]).filter(key=>!explained.has(key)).map(key=>`<p class="meaning-hint">${esc(t(key))}</p>`).join('')}${invalid?`<p>${t(review.status==='empty'?'meaningEmpty':'meaningUnrecognized')}</p>`:''}</div></div></div>`;
  }).join('')}<p class="fine">${t('meaningNote')}</p><div role="status">${s.rejected.length?`<p>${t('meaningError')}</p>`:''}</div>${button(t('checkMeanings'),'submit','type="submit"')}${s.rejected.length?`<button class="text-button" data-action="skip-translations" type="button">${t('skipMeanings')}</button>`:''}<div class="clear-all"><p class="fine" id="clear-all-note">${esc(t('clearAllLead'))}</p><button class="danger-button" data-action="clear-translations" type="button" aria-describedby="clear-all-note">${esc(t('clearAll'))}</button></div></form></section>`;
}
export function meaningInsight(s){
  const {t}=uiContext(s);
  return `<section class="narrow">${eyebrow(t('insight'))}<h1>${t('meaningInsightTitle')}</h1>${(s.meaningFeedback??[]).map(item=>`<div class="insight"><strong>${esc(item.word)}</strong>${notice(item,t,true)}</div>`).join('')}${s.missing.map(item=>`<div class="insight"><strong>${esc(item.entry.word)} *</strong><p>${t('alsoMeans')} ${item.entry.meanings.filter(m=>!item.ids.includes(m.id)).map(m=>esc(m.answers[0])).join(', ')}.</p></div>`).join('')}${button(t('continue'),'topics')}</section>`;
}
