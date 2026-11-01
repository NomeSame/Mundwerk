import {translationView,meaningInsight} from './meaning-review.js';
import {wordReview} from './word-review.js';
import {esc,button,eyebrow,topicGroups} from './components.js';
import {uiContext} from './context.js';
export function assessmentView(s){
  const {t,base,target}=uiContext(s);
  if(s.page==='experience')return `<section class="narrow">${eyebrow(t('experience'))}<h1>${t('experienceTitle')}</h1><p class="lead">${t('experienceLead')}</p><button class="choice" data-action="known"><strong>${t('known')} ↗</strong><small>${t('knownLead')}</small></button><button class="choice" data-action="beginner"><strong>${t('beginner')} ↗</strong><small>${t('beginnerLead')}</small></button></section>`;
  if(s.page==='known')return `<section class="narrow">${eyebrow(t('vocabStep'))}<h1>${t('recallTitle',{target})}</h1><p class="lead">${t('recallLead')}</p><form data-form="words"><label for="words">${t('yourWords',{target})}</label><textarea id="words" name="words" rows="6" maxlength="12000" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" required>${esc(s.wordDraft??'')}</textarea><p class="fine">${t('recallNote')}</p>${button(t('checkWords'),'submit','type="submit"')}</form></section>`;
  if(s.page==='word-check')return wordReview(s);
  if(s.page==='translations')return translationView(s);
  if(s.page==='insight')return meaningInsight(s);
  if(s.page==='topics')return `<section class="topic-selection">${eyebrow(t('topicsStep'))}<h1>${t('topicsTitle')}</h1><p class="lead">${t('topicsLead')}</p>${topicGroups(s)}</section>`;
  return '';
}
