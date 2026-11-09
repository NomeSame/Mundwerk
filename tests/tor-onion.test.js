import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {parseOnionAddress,onionRequestAllowed} from '../server/onion.mjs';
import {loadAssets,createStaticServer} from '../server/static-server.mjs';
const ADDR='rusjsrwwmvbz2bnjyb5geloiix4pubwyhi7bwv67oynfm6u2ra2wdvad.onion';
const request=(port,route='/',options)=>new Promise((resolve,reject)=>{
  const headers={...(options&&options.host?{Host:options.host}:{})};
  const req=http.request({hostname:'127.0.0.1',port,path:route,headers},res=>{
    let body='';res.on('data',(data)=>body+=data);res.on('end',()=>resolve({status:res.statusCode,body}));
  });req.on('error',reject);req.end();
});
async function fixture(t,extra={}){
  const assets=await loadAssets(),server=createStaticServer({assets,...extra});
  await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise((resolve)=>{server.closeAllConnections();server.close(resolve);}));
  return server.address().port;
}
test('only a well formed v3 onion address is accepted, nothing else resembles one',()=>{
  assert.equal(parseOnionAddress(`${ADDR}:80`),ADDR);
  assert.equal(parseOnionAddress(ADDR),ADDR);
  for(const value of [`evil.example:80`,`evil${ADDR}:80`,`${ADDR}evil:80`,'notonion.onion:80','a2'.repeat(26)+'.onion:81',
    `${ADDR}:080`,`${ADDR.toUpperCase()}:80`,`${ADDR}:80/path`,`${ADDR}/`,`${ADDR}:80 `,` ${ADDR}:80`,
    `${ADDR.slice(0,-1)}2:80`,'.onion:80',`${ADDR}:80:80`,'http://'+ADDR,'::1',`${ADDR.slice(0,55)}.onion:80`,
    `${ADDR.slice(0,56)}0.onion:80`,'a'.repeat(56)+'.EXAMPLE.onion:80',`${ADDR}:0`,`${ADDR}:8081`]) assert.equal(parseOnionAddress(value),null,value);
  assert.equal(parseOnionAddress(`${ADDR}:443`),ADDR);
  assert.equal(parseOnionAddress(`${ADDR}:8080`),ADDR);
});
test('the onion address is only reachable through a direct local connection',()=>{
  assert.equal(onionRequestAllowed('127.0.0.1',1),true);
  for(const peer of ['192.168.10.42','100.64.0.2','8.8.8.8','::ffff:127.0.0.1','::1',undefined,null,'']) assert.equal(onionRequestAllowed(peer,1),false,String(peer));
  assert.equal(onionRequestAllowed('127.0.0.1',0),false);
});
test('the published onion host is served while every other host stays denied',async t=>{
  const port=await fixture(t,{onion:[ADDR]});
  assert.equal((await request(port,'/',{host:`${ADDR}:80`})).status,200);
  assert.match((await request(port,'/',{host:`${ADDR}:80`})).body,/<!doctype html>/i);
  for(const host of ['evil.example:80',`evil-${ADDR}:80`,'localhost:80','127.0.0.1:80',`${ADDR}:9999`])
    assert.equal((await request(port,'/',{host})).status,403,host);
});
test('without an announced onion address an onion host is denied as before',async t=>{
  const port=await fixture(t);
  assert.equal((await request(port,'/',{host:`${ADDR}:80`})).status,403);
  assert.equal((await request(port,'/',{host:'localhost:4173'})).status,200);
});
test('a malformed announced address stops the server instead of publishing a broken host',()=>{
  assert.throws(()=>createStaticServer({assets:new Map(),onion:['halber-uebel.onion']}),/onion-Adresse/);
  assert.throws(()=>createStaticServer({assets:new Map(),onion:['a'.repeat(62)+'.onion']}),/onion-Adresse/);
  assert.throws(()=>createStaticServer({assets:new Map(),onion:[`${ADDR}.evil.example`]}),/onion-Adresse/);
  assert.doesNotThrow(()=>createStaticServer({assets:new Map(),onion:[ADDR]}));
});
test('the announced onion host cannot be reached from a non loopback peer',async t=>{
  // Same rule as above: only the loopback peer of Tor may present the announced host.
  assert.equal(onionRequestAllowed('192.168.10.42',1),false);
});
test('the onion routes for the app are the same explicit asset list as in the LAN',async t=>{
  const port=await fixture(t,{onion:[ADDR]});
  for(const route of ['/main.js','/styles.css','/sw.js','/manifest.webmanifest','/core/meaning-assessment.js','/data/language-forms.js'])
    assert.equal((await request(port,route,{host:`${ADDR}:80`})).status,200,route);
  for(const route of ['/server.mjs','/server/onion.mjs','/status.md'])
    assert.ok([400,404].includes((await request(port,route,{host:`${ADDR}:80`})).status),route);
});
