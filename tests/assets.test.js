import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import {readdir} from 'node:fs/promises';
import { vocabulary } from '../dist/data/vocabulary.js';
import { assetPaths } from '../server/asset-list.mjs';
test('styles.css bindet keine externe Quelle ein und jede Schrift ist ausgelistet', async () => {
  const css = await readFile(new URL('../dist/styles.css',import.meta.url),'utf8');
  assert.doesNotMatch(css,/https?:\/\//,'Die Stilvorlage ruft eine fremde Quelle auf.');
  const urls=[...css.matchAll(/url\('([^']+)'\)/g)].map(match=>match[1]);
  assert.ok(urls.length>=4,'keine lokalen Schriften eingebunden');
  for(const url of urls){
    const route='/'+url.replace(/^\.\//,'');
    assert.ok(assetPaths.includes(route),route+' fehlt in der Assetliste');
    const bytes=await readFile(new URL('../dist/'+route.slice(1),import.meta.url));
    assert.equal(bytes.readUInt32BE(0),0x774f4632,route+' ist keine woff2-Datei');
  }
});
test('HTML wird nur an einer Stelle eingefügt, und die verlangt die Render-Richtlinie', async () => {
  const sinks=[];
  const walk=async(directory,prefix='')=>{
    for(const entry of await readdir(directory,{withFileTypes:true})){
      if(entry.isDirectory())await walk(new URL(entry.name+'/',directory),prefix+entry.name+'/');
      else if(entry.name.endsWith('.js')){
        const source=await readFile(new URL(entry.name,directory),'utf8');
        for(const match of source.matchAll(/\.\s*(innerHTML|outerHTML|insertAdjacentHTML|createContextualFragment)\b|document\.write(?:ln)?\b/g))sinks.push(prefix+entry.name+' '+match[0]);
      }
    }
  };
  await walk(new URL('../dist/',import.meta.url));
  assert.deepEqual(sinks,['ui/view.js .innerHTML'],sinks.join(', '));
  assert.match(await readFile(new URL('../dist/ui/view.js',import.meta.url),'utf8'),/innerHTML=renderHTML`/);
  assert.match(await readFile(new URL('../dist/ui/view.js',import.meta.url),'utf8'),/from '\.\.\/infrastructure\/trusted-types\.js'/);
  const platform=await readFile(new URL('../dist/infrastructure/platform.js',import.meta.url),'utf8');
  assert.match(platform,/serviceWorker\.register\(renderScriptURL\('/);
  assert.doesNotMatch(platform,/serviceWorker\.register\('/);
});
test('Assetliste und Offline-Cache decken genau dieselben Dateien ab', async () => {
  const worker=await readFile(new URL('../dist/sw.js',import.meta.url),'utf8');
  const files=worker.match(/const FILES = \[([^\]]+)\]/)[1].match(/'([^']+)'/g).map(s=>s.slice(1,-1));
  const routes=new Set(files.map(file=>file==='/'?'/':file.replace(/^\./,'')));
  // Absichtliche Ausnahme: der Service Worker darf nicht sich selbst cachen, sonst bleibt eine alte Version hängen.
  const excluded=new Set(['/sw.js']);
  for(const route of assetPaths)if(!excluded.has(route))assert.ok(routes.has(route),route+' fehlt im Offline-Cache');
  assert.ok(!routes.has('/sw.js'),'/sw.js darf nicht im Offline-Cache stehen');
  for(const route of routes)if(route!=='/')assert.ok(assetPaths.includes(route),route+' ist nicht ausgelistet');
  // '/' ist die Index-Route des Servers, kein Asset-Pfad; sie gehört trotzdem in den Offline-Cache.
  assert.ok(routes.has('/'),'/ fehlt im Offline-Cache');assert.ok(!assetPaths.includes('/'));
});
test('PWA manifest points to existing icons, start page and valid PNG sizes', async () => {
  const manifest = JSON.parse(await readFile(new URL('../dist/manifest.webmanifest',import.meta.url),'utf8'));
  assert.equal(manifest.display,'standalone');
  for (const icon of manifest.icons) {
    const bytes = await readFile(new URL('../dist/' + icon.src.replace('./',''),import.meta.url));
    const size = Number(icon.sizes.split('x')[0]);
    assert.equal(bytes.readUInt32BE(16),size); assert.equal(bytes.readUInt32BE(20),size);
  }
});
test('every explicit offline asset exists', async () => {
  const source = await readFile(new URL('../dist/sw.js',import.meta.url),'utf8');
  const files = source.match(/const FILES = \[([^\]]+)\]/)[1].match(/'([^']+)'/g).map(s=>s.slice(1,-1));
  for (const file of files) await access(new URL('../dist/' + (file==='./' ? 'index.html' : file.replace('./','')),import.meta.url));
});
test('offline cache includes every application module, including all language catalogs',async()=>{
  const worker=await readFile(new URL('../dist/sw.js',import.meta.url),'utf8');
  const walk=async(directory,prefix='')=>{
    for(const entry of await readdir(directory,{withFileTypes:true})){
      if(entry.isDirectory())await walk(new URL(entry.name+'/',directory),prefix+entry.name+'/');
      else if(entry.name.endsWith('.js')&&entry.name!=='sw.js')assert.ok(worker.includes("'./"+prefix+entry.name+"'"),prefix+entry.name);
    }
  };
  await walk(new URL('../dist/',import.meta.url));
});
test('seed meanings have accepted answers and context for every learning card', () => {
  const keys = [];
  for (const word of vocabulary) for (const meaning of word.meanings) {
    keys.push(word.id + ':' + meaning.id);
    assert.ok(meaning.answers.length); assert.ok(meaning.note ?? word.note);
  }
  assert.equal(new Set(keys).size,keys.length);
  assert.match(vocabulary.find(w=>w.id==='cuenta').meanings.find(m=>m.id==='account').note,/Bankkonto/);
});
