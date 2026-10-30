import {topics} from '../data/topics.js';
import {topicLocales,groupLocales} from '../data/topic-locales.js';
import {uiContext} from './context.js';
export const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const button=(text,action,extra='')=>`<button class="primary" data-action="${action}" ${extra}>${text}<span aria-hidden="true">↗</span></button>`;
export const eyebrow=text=>`<p class="eyebrow">${esc(text)}</p>`;
export const kindLabels={word:'kindWord',sentence:'kindSentence',reply:'kindReply',spelling:'kindSpelling'};
export function localizedTopics(s){
  const {locale}=uiContext(s);if(locale==='de')return topics;
  const offset=locale==='es'?0:2;
  return topics.map(item=>({...item,name:topicLocales[item.id][offset],subtitle:topicLocales[item.id][offset+1],group:groupLocales[item.group][locale==='es'?0:1]}));
}
export function topicCards(s,group){
  return localizedTopics(s).filter(t=>!group||t.group===group).map(t=>`<button type="button" class="topic ${t.color} ${s.profile.topic===t.id?'selected':''}" data-action="choose-topic" data-topic="${t.id}" aria-pressed="${s.profile.topic===t.id}"><span class="topic-symbol" aria-hidden="true">${t.symbol}</span><span><strong>${t.name}</strong><small>${t.subtitle}</small></span><span aria-hidden="true">↗</span></button>`).join('');
}
export function topicGroups(s){return [...new Set(localizedTopics(s).map(t=>t.group))].map(group=>`<section class="topic-group"><h3>${group}</h3><div class="topic-grid">${topicCards(s,group)}</div></section>`).join('');}
