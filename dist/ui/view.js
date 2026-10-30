import {languageCodes} from '../core/content-direction.js';
import {languageNames,messages} from './messages.js';
import {uiContext} from './context.js';
import {esc,button,eyebrow,topicGroups,localizedTopics} from './components.js';
import {assessmentView} from './assessment.js';
import {practiceSettings,practiceView} from './practice.js';
function languageSettings(s){
  const {t,locale,targetLanguage}=uiContext(s);
  return `<form data-form="languages" class="language-settings"><div><label for="base-language">${t('speak')}</label><select id="base-language" name="base">${languageCodes.map(code=>`<option value="${code}" ${locale===code?'selected':''}>${languageNames[locale][code]}</option>`).join('')}</select></div><span aria-hidden="true">→</span><div><label for="target-language">${t('learn')}</label><select id="target-language" name="target">${languageCodes.map(code=>`<option value="${code}" ${targetLanguage===code?'selected':''} ${locale===code?'disabled':''}>${languageNames[locale][code]}</option>`).join('')}</select></div></form>`;
}
function welcomeView(s){
  const {t}=uiContext(s);
  return `<section class="welcome"><div>${eyebrow(t('eyebrow'))}<h1>${t('welcomeTitle')}</h1><p class="lead">${t('welcomeLead')}</p>${button(t('start'),'experience')}<p class="fine">${t('noAccount')}</p></div><div class="island-art" aria-hidden="true"><div class="sun"></div><div class="arch arch-one"></div><div class="arch arch-two"></div><span class="art-word">${t('yourWay')}<span>${t('wordToTalk')}</span></span></div></section>`;
}
function homeView(s,topic){
  const {t,target,targetLanguage,locale}=uiContext(s),total=Object.values(s.profile.progress).reduce((n,p)=>n+p.attempts,0);
  return `<section class="dashboard"><div class="dashboard-heading"><div>${eyebrow(t('homeEyebrow',{target}))}<h1>${t('homeTitle')}</h1></div><span class="language-badge">${targetLanguage.toUpperCase()} ← ${locale.toUpperCase()}</span></div><div class="dashboard-grid"><article class="hero-card"><div><span class="pill">${t('currentTopic')}</span><h2>${topic.name}</h2><p>${topic.subtitle}<br>${t('wordToTalk')}</p>${button(t('startRound'),'start')}<small>${t('roundCount',{count:s.sessionSize})}</small></div><div class="door-art" aria-hidden="true"><span>↗</span></div></article><aside class="progress-card"><span class="tiny-icon" aria-hidden="true">✳</span><h3>${t('progressTitle')}</h3><div class="stat"><strong>${Object.keys(s.profile.progress).length}</strong><span>${t('practiced')}</span></div><div class="stat"><strong>${s.profile.known.length}</strong><span>${t('confirmed')}</span></div><p>${t('answerCount',{count:total})}</p><button class="text-button" data-action="known">${t('addWords')} ↗</button></aside></div>${practiceSettings(s)}<div class="section-heading"><h2>${t('topicsTitle')}</h2></div>${topicGroups(s)}<div class="bottom-note"><span aria-hidden="true">↳</span><p>${t('local')}</p><button class="text-button" data-action="install">${t('install')} ↗</button></div></section>`;
}
export function render(root,s){
  const previousPage=root.dataset?.page,focused=globalThis.document?.activeElement?.id;
  const {t,locale}=uiContext(s),topic=localizedTopics(s).find(t=>t.id===s.profile.topic);
  const content=s.page==='welcome'?welcomeView(s):s.page==='home'?homeView(s,topic):assessmentView(s)||practiceView(s,topic);
  root.innerHTML=`<div class="app-shell"><header><a class="brand" href="./" data-action="${s.profile.ready?'home':'welcome'}"><span class="brand-mark" aria-hidden="true">s<span>•</span></span>sprachinseln<span class="beta">${t('prototype')}</span></a><button class="header-help" data-action="install" aria-label="${t('install')}">${t('install')} ↗</button></header>${languageSettings(s)}<main id="main" tabindex="-1">${s.warning?`<p role="alert" class="storage-warning">${esc(messages[s.warning]?t(s.warning):s.warning)}</p>`:''}${content}</main><footer><span>${t('footer')}</span><button class="text-button" data-action="export">${t('export')} ↓</button><button class="text-button reset-button" data-action="reset">${t('reset')}</button></footer></div>${s.install?`<dialog aria-labelledby="install-title"><div><h2 id="install-title">${t('installTitle')}</h2><p>${t('installHelp')}</p><p class="fine">${t('local')}</p>${button(t('understood'),'close-install')}</div></dialog>`:''}`;
  if(root.dataset)root.dataset.page=s.page;
  if(typeof document!=='undefined'){
    document.documentElement.lang=locale;document.title='Sprachinseln';
    const skip=document.querySelector('.skip-link');if(skip)skip.textContent=t('skip');
    if(s.install)root.querySelector('dialog').showModal();
    else if(previousPage&&previousPage!==s.page){root.querySelector('main').focus();window.scrollTo(0,0);}
    else if(focused)document.getElementById(focused)?.focus();
  }
}
