import {uiContext} from './context.js';
import {languageCodes} from '../core/content-direction.js';
import {usesWholeList,wholeList,pasteSummary} from '../core/translation-paste.js';
export function bindEvents(root, store, platform) {
  root.addEventListener('click', event => {
    const target = event.target.closest('[data-action]');
    if (!target || (target.form && target.type === 'submit')) return;
    event.preventDefault();
    const action = target.dataset.action;
    if (action === 'accept-words') {
      const unknown = store.state.words.some(item => !item.entry);
      if (!unknown || platform.confirm(uiContext(store.state).t('skipConfirm'))) store.acceptWords(true);
    } else if (action === 'known') store.beginAssessment();
    else if (action === 'confirm-meaning') store.confirmMeaning(target.dataset.original,target.dataset.entry);
    else if (action === 'confirm-translation') store.confirmTranslation(target.dataset.entry,target.dataset.value);
    else if (action === 'beginner') store.go('topics');
    else if (action === 'choose-topic') store.chooseTopic(target.dataset.topic);
    else if (action === 'start') store.start();
    else if (action === 'next') store.next();
    else if (action === 'retry-answer') {store.retryAnswer();root.querySelector('#answer')?.focus();}
    else if (action === 'dont-know') store.check('');
    else if (action === 'skip-translations') {
      if (platform.confirm(uiContext(store.state).t('skipMeaningConfirm'))) store.translations(Object.fromEntries(new FormData(target.closest('form'))), true);
    } else if (action === 'clear-translations') {
      if (platform.confirm(uiContext(store.state).t('clearMeaningsConfirm'))) store.clearTranslations();
    } else if (action === 'install') store.install(true);
    else if (action === 'close-install') store.install(false);
    else if (action === 'export') platform.download(store.state.profile);
    else if (action === 'reset') {if(platform.confirm(uiContext(store.state).t('resetConfirm')))store.reset();}
    else store.go(action);
  });
  root.addEventListener('input',event=>{
    if(event.target.id==='words')store.wordDraft(event.target.value);
    if(event.target.id==='answer')store.answerDraft(event.target.value);
    const meaningForm=event.target.closest('[data-form="meaning"]');
    if(meaningForm)store.meaningDraft(meaningForm.dataset.original,event.target.value);
    if(event.target.id==='corrected')store.correctionDraft(event.target.value);
    if(event.target.closest('[data-form="translations"]')&&event.target.name)store.translationDraft(event.target.name,event.target.value);
  });
  // Whole list into one field: the line break ends this field, commas keep several meanings.
  root.addEventListener('paste',event=>{
    const field=event.target?.closest?.('.meaning-input');
    const form=field?.form;
    if(!form||form.dataset.form!=='translations')return;
    const t=uiContext(store.state).t;
    const text=event.clipboardData?.getData?.('text/plain')??'';
    const status=root.querySelector('[data-paste-status]');
    if(!usesWholeList(text)){if(status)status.textContent=t('pasteSingle');return;}
    const fields=[...form.querySelectorAll('.meaning-input')];
    const words=store.state.words.map(item=>({id:item.entry.id,word:item.entry.word}));
    const list=wholeList(text,words,fields.indexOf(field),Object.fromEntries(fields.map(input=>[input.name,input.value])));
    if(!list.assigned.length&&!list.left.length&&!list.tooLong.length&&!list.stopped&&!list.oversized)return;
    event.preventDefault();
    for(const item of list.assigned){
      const input=form.querySelector(`[name="${item.id}"]`);
      if(input)input.value=item.answer;
      store.translationDraft(item.id,item.answer);
    }
    if(status)status.textContent=pasteSummary(list,words.length,t);
    fields.find(input=>!input.value.trim())?.focus();
  });
  root.addEventListener('change',event=>{
    const languages=event.target.closest('[data-form="languages"]');
    if(languages){const fields=Object.fromEntries(new FormData(languages));const target=fields.target===fields.base?languageCodes.find(code=>code!==fields.base):fields.target;store.languages(fields.base,target);return;}
    const form=event.target.closest('[data-form="settings"]');
    if(form){const fields=Object.fromEntries(new FormData(form));store.configure(fields.mode,fields.length==='all'?'all':Number(fields.length));}
  });
  root.addEventListener('cancel',event=>{
    if(event.target.tagName==='DIALOG'){event.preventDefault();store.install(false);}
  },true);
  root.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.target;
    const fields = Object.fromEntries(new FormData(form));
    if (form.dataset.form === 'words') store.words(fields.words);
    if (form.dataset.form === 'correction') store.correctWords(fields.words);
    if (form.dataset.form === 'meaning') store.searchMeaning(form.dataset.original,fields.explanation);
    if (form.dataset.form === 'translations') {
      const saved = fields;
      store.translations(fields);
      // Preserve answers after an unsuccessful translation check.
      for (const [key,value] of Object.entries(saved)) {
        const input = root.querySelector(`[name="${key}"]`);
        if (input) input.value = value;
      }
    }
    if (form.dataset.form === 'answer') store.check(fields.answer);
  });
}
