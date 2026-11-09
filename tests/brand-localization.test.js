import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRepository} from '../dist/data/progress.js';
import {createStore} from '../dist/state/store.js';
import {translator} from '../dist/ui/messages.js';
import {render} from '../dist/ui/view.js';

const brands={
  de:{name:'Sprachinseln',mark:'S',title:'Sprachinseln — Dein Alltag. Deine Worte.'},
  es:{name:'Islas de idiomas',mark:'I',title:'Islas de idiomas — Tu día a día. Tus palabras.'},
  'pt-BR':{name:'Ilhas de idiomas',mark:'I',title:'Ilhas de idiomas — Seu dia a dia. Suas palavras.'}
};
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};

test('brand name, mark and browser metadata follow every base language without touching persistent identifiers',async()=>{
  const savedDocument=globalThis.document;
  try{
    for(const [locale,brand] of Object.entries(brands)){
      const document={activeElement:null,documentElement:{},title:'',querySelector:()=>null};
      globalThis.document=document;
      const store=createStore(createRepository(memory()));
      store.languages(locale,locale==='de'?'es':'de');
      const root={innerHTML:'',dataset:{}};
      render(root,store.state);
      assert.equal(translator(locale)('brandName'),brand.name,locale);
      assert.equal(translator(locale)('brandMark'),brand.mark,locale);
      assert.match(root.innerHTML,new RegExp(`brand-mark[^>]*>${brand.mark}<span`),locale);
      assert.match(root.innerHTML,new RegExp(`</span>${brand.name}<span class="beta">`),locale);
      assert.equal(document.title,brand.title,locale);
    }
  }finally{globalThis.document=savedDocument;}

  const [index,manifest,icon,progress,worker,platform]=await Promise.all([
    readFile(new URL('../dist/index.html',import.meta.url),'utf8'),
    readFile(new URL('../dist/manifest.webmanifest',import.meta.url),'utf8'),
    readFile(new URL('../dist/icon.svg',import.meta.url),'utf8'),
    readFile(new URL('../dist/data/progress.js',import.meta.url),'utf8'),
    readFile(new URL('../dist/sw.js',import.meta.url),'utf8'),
    readFile(new URL('../dist/infrastructure/platform.js',import.meta.url),'utf8')
  ]);
  assert.match(index,/<title>Sprachinseln — Dein Alltag\. Deine Worte\.<\/title>/);
  assert.match(index,/name="description" content="Dein Alltag\. Deine Worte\. Lerne in kleinen Schritten\."/);
  assert.match(index,/name="apple-mobile-web-app-title" content="Sprachinseln"/);
  const parsedManifest=JSON.parse(manifest);
  assert.equal(parsedManifest.name,'Sprachinseln');
  assert.equal(parsedManifest.short_name,'Sprachinseln');
  assert.equal(parsedManifest.description,'Dein Alltag. Deine Worte. Lerne in kleinen Schritten.');
  assert.match(icon,/>S<\/text>/,'the default SVG icon carries the German default mark');
  assert.match(progress,/'sprachinseln\.v1'/);
  assert.match(worker,/'sprachinseln-static-v28'/);
  assert.match(platform,/'sprachinseln-fortschritt\.json'/);
});
