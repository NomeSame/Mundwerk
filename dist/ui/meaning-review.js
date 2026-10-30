import {esc,button,eyebrow} from './components.js';
import {uiContext} from './context.js';
function notice(item,t){return `<p class="meaning-note ${item.reason==='unmatched'?'meaning-unmatched':''}">${esc(t('meaning'+item.reason,{answer:item.answer,canonical:item.canonical}))}</p>`;}
export function translationView(s){
  const {t,base}=uiContext(s);
  return `<section class="narrow">${eyebrow(t('meaningsStep'))}<h1>${t('meaningsTitle')}</h1><p class="lead">${t('translateLead',{base})}</p><form data-form="translations">${s.words.map(w=>{
    const id=w.entry.id,review=s.meaningReviews?.[id],invalid=['unrecognized','empty'].includes(review?.status);
    return `<div class="translation"><label for="t-${esc(id)}">${esc(w.entry.word)}${(w.entries?.reduce((n,e)=>n+e.meanings.length,0)??w.entry.meanings.length)>1?' *':''}</label><div class="translation-field"><input class="meaning-input ${review?.status??''}" id="t-${esc(id)}" name="${esc(id)}" value="${esc(s.translationAnswers?.[id]??'')}" autocomplete="off" maxlength="300" ${invalid?'aria-invalid="true"':''} ${review?`aria-describedby="review-${esc(id)}"`:''}><div id="review-${esc(id)}" class="meaning-review ${review?.status??''}">${review?.feedback.map(item=>notice(item,t)).join('')??''}${review?.status==='confirm'?`<p>${t('meaningConfirm')}</p>${review.suggestions.map(item=>`<button type="button" class="text-button" data-action="confirm-translation" data-entry="${esc(id)}" data-value="${esc(item.canonical)}">${esc(t('meaningUse',{canonical:item.canonical}))}</button>`).join('')}`:''}${(review?.hints??[]).map(key=>`<p class="meaning-hint">${esc(t(key))}</p>`).join('')}${invalid?`<p>${t(review.status==='empty'?'meaningEmpty':'meaningUnrecognized')}</p>`:''}</div></div></div>`;
  }).join('')}<p class="fine">${t('meaningNote')}</p><div role="status">${s.rejected.length?`<p>${t('meaningError')}</p>`:''}</div>${button(t('checkMeanings'),'submit','type="submit"')}${s.rejected.length?`<button class="text-button" data-action="skip-translations" type="button">${t('skipMeanings')}</button>`:''}</form></section>`;
}
export function meaningInsight(s){
  const {t}=uiContext(s);
  return `<section class="narrow">${eyebrow(t('insight'))}<h1>${t('meaningInsightTitle')}</h1>${(s.meaningFeedback??[]).map(item=>`<div class="insight"><strong>${esc(item.word)}</strong>${notice(item,t)}</div>`).join('')}${s.missing.map(item=>`<div class="insight"><strong>${esc(item.entry.word)} *</strong><p>${t('alsoMeans')} ${item.entry.meanings.filter(m=>!item.ids.includes(m.id)).map(m=>esc(m.answers[0])).join(', ')}.</p></div>`).join('')}${button(t('continue'),'topics')}</section>`;
}
