import {esc,button,eyebrow} from './components.js';
import {uiContext} from './context.js';
function meaningHelp(item,index,s){
  const {t,base,targetLanguage}=uiContext(s);
  return `<details class="meaning-help" ${item.meaningSearched?'open':''}><summary>${t('meaningSearch')}</summary><form data-form="meaning" data-original="${esc(item.word)}"><label for="meaning-${index}">${t('describe',{base})}</label><input id="meaning-${index}" name="explanation" value="${esc(item.meaningHintQuery??'')}" maxlength="200" autocomplete="off" required><button class="secondary" type="submit">${t('findWords')}</button></form>${item.meaningSearched?`<div class="meaning-results" role="status">${item.meaningResults?.length?`<p>${t('chooseMeaning')}</p>${item.meaningResults.map(result=>`<button type="button" class="meaning-result" data-action="confirm-meaning" data-original="${esc(item.word)}" data-entry="${esc(result.id)}"><strong lang="${targetLanguage}">${esc(result.word)}</strong><span>${esc(result.definition)}</span><small>${t('thisOne')} ↗</small></button>`).join('')}`:`<p>${t('noMeaning')}</p>`}</div>`:''}</details>`;
}
function mergeNote(s){
  // Feedback over die vergangene Korrekturrunde: nichts verschwindet still, aber es gibt
  // bewusst keine sichtbaren Positionsnummern.
  const {t}=uiContext(s),report=s.mergeReport;
  if(!report||!(report.added.length||report.dropped.length))return '';
  const parts=[];
  if(report.added.length)parts.push(t('mergeAdded',{words:report.added.map(esc).join(', ')}));
  if(report.dropped.length)parts.push(t('mergeDropped',{words:report.dropped.map(esc).join(', ')}));
  return `<p class="fine" role="status" data-merge-report="">${parts.join(' ')}</p>`;
}
export function wordReview(s){
  const {t,base}=uiContext(s),recognized=s.words.filter(w=>w.entry),unknown=s.words.filter(w=>!w.entry);
  const draft=s.correctionDraft??unknown.map(w=>w.word).join('\n');
  return `<section class="narrow">${eyebrow(t('reviewStep',{round:s.round}))}<h1>${t('reviewTitle')}</h1><p class="lead">${t('recognizedCount',{count:recognized.length,total:s.words.length})}</p><div class="recognition-legend"><span>● ${t('green')}</span><span>● ${t('orange')}</span><span>● ${t('red')}</span></div>
  ${recognized.length?`<details class="recognized-words" open><summary>✓ ${t('recognizedGroup',{count:recognized.length})}</summary><ul class="word-list">${recognized.map(w=>`<li class="recognized"><div><strong>${esc(w.word)}</strong>${w.suggestions?.length?`<small>${t('spellingHint')}: ${w.suggestions.map(esc).join(' · ')}</small>`:''}${w.status==='meaning'?`<small>${t('assignedNote')}</small>`:''}</div><span>✓ ${t(w.status==='meaning'?'assigned':'recognized')}</span></li>`).join('')}</ul></details>`:''}
  ${mergeNote(s)}
  ${unknown.length?`<h2 class="review-heading">${t('pending')}</h2><p class="fine">${t('pendingLead',{base})}</p><ul class="word-list pending-words">${unknown.map((w,index)=>`<li class="unrecognized ${w.suggestions?.length?'suggested-word':'unknown-word'}"><div class="pending-content"><div class="word-heading"><strong>${esc(w.word)}</strong><span>${t(w.suggestions?.length?'checkSpelling':'notFound')}</span></div>${w.suggestions?.length?`<small>${t('spellingHint')}: ${w.suggestions.map(esc).join(' · ')}</small>`:`<small>${t('notInLexicon')}</small>`}${meaningHelp(w,index,s)}</div></li>`).join('')}</ul>`:''}
  ${unknown.length?`<form data-form="correction"><label for="corrected">${t('editPending')}</label><textarea id="corrected" name="words" rows="6" maxlength="12000" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false">${esc(draft)}</textarea><p class="fine">${t('retain',{count:recognized.length})}</p>${button(t('recheck'),'submit','type="submit"')}</form>`:''}
  ${button(t(unknown.length?'skipPending':'acceptWords'),'accept-words')}<p class="fine">${t(unknown.length?'skipNote':'acceptNote')}</p></section>`;
}
