import test from 'node:test';
import assert from 'node:assert/strict';
import { bindEvents } from '../dist/ui/events.js';
test('navigation buttons outside forms work despite default HTML submit type', () => {
  const handlers = {}; let next = '';
  const root = {addEventListener:(name,handler)=>handlers[name]=handler};
  bindEvents(root,{go:page=>next=page},{});
  handlers.click({target:{closest:()=>({type:'submit',form:null,dataset:{action:'experience'}})},preventDefault(){}});
  assert.equal(next,'experience');
});
test('form submit buttons preserve native validation and submission', () => {
  const handlers = {}; let navigated = false;
  bindEvents({addEventListener:(name,handler)=>handlers[name]=handler},{go(){navigated=true;}},{});
  handlers.click({target:{closest:()=>({type:'submit',form:{},dataset:{action:'submit'}})},preventDefault(){throw Error('must preserve native submission');}});
  assert.equal(navigated,false);
});
