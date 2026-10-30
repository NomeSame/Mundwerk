import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import {readdir} from 'node:fs/promises';
import { vocabulary } from '../dist/data/vocabulary.js';
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
