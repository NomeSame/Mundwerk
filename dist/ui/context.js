import {translator,languageNames} from './messages.js';
export function uiContext(s){
  const locale=s.profile?.baseLanguage??'de',targetLanguage=s.profile?.targetLanguage??'es';
  return {locale,targetLanguage,t:translator(locale),base:languageNames[locale][locale],target:languageNames[locale][targetLanguage]};
}
