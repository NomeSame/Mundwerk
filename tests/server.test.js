import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import {spawnSync} from 'node:child_process';
import {mkdtemp,mkdir,writeFile,symlink,rm,copyFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadAssets,createStaticServer} from '../server/static-server.mjs';
import {assetPaths} from '../server/asset-list.mjs';
import {lanConfiguration,peerAllowed,lanBlock} from '../server/network.mjs';
import {createStore} from '../dist/state/store.js';
import {createRepository} from '../dist/data/progress.js';
import {practiceView} from '../dist/ui/practice.js';
const request=(port,route='/',options={})=>new Promise((resolve,reject)=>{
  const req=http.request({hostname:'127.0.0.1',port,path:route,headers:{Host:'localhost:4173',...options.headers},method:options.method??'GET'},res=>{
    let body='';res.on('data',data=>body+=data);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));
  });req.on('error',reject);req.end(options.body);
});
async function fixture(t){
  const assets=await loadAssets(),server=createStaticServer({assets});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
  return {assets,server,port:server.address().port};
}
test('only listed web assets are served, with safe headers and HEAD support',async t=>{
  const {port,assets}=await fixture(t);assert.equal(assets.size,assetPaths.length);
  for(const route of ['/',...assetPaths]){
    const result=await request(port,route);assert.equal(result.status,200,route);
    assert.equal(result.headers['x-content-type-options'],'nosniff');assert.equal(result.headers['x-frame-options'],'DENY');assert.ok(!result.headers['access-control-allow-origin']);
  }
  const get=await request(port),head=await request(port,'/',{method:'HEAD'});
  assert.equal(head.body,'');assert.equal(head.headers['content-length'],get.headers['content-length']);
  assert.match(get.headers['content-security-policy'],/script-src 'self'/);
});
test('project files, path traversal, Windows paths, encodings and arbitrary directories cannot be fetched',async t=>{
  const {port}=await fixture(t);
  for(const route of ['/server.mjs','/server/static-server.mjs','/package.json','/Probestunde.pdf','/AGENTS_CODE.md','/status.md','/.env','/.git/config','/.openai/hosting.json','/data/','/C:/Windows/win.ini','/..\\Windows\\win.ini','/../status.md','/%2e%2e/status.md','/%252e%252e/status.md','/%2f..%2fstatus.md','//main.js','/main.js::$DATA','/main.js%00','/new-secret.txt','http://example.com/']){
    const response=await request(port,route);assert.ok([400,404].includes(response.status),route);assert.equal(response.body,'Anfrage nicht erlaubt.');
  }
  assert.equal((await request(port,'/main.js?v=1')).status,200);
});
test('writes, uploads, unknown hosts, request bodies and oversized targets are denied',async t=>{
  const {port}=await fixture(t);
  for(const method of ['POST','PUT','DELETE','PATCH','OPTIONS','TRACE'])assert.equal((await request(port,'/',{method})).status,405,method);
  assert.equal((await request(port,'/',{headers:{Host:'evil.example:4173'}})).status,403);
  assert.equal((await request(port,'/',{headers:{'Content-Length':'4'},body:'test'})).status,400);
  assert.equal((await request(port,'/'+ 'a'.repeat(2100))).status,414);
});
async function rawExchange(port,payload){
  return await new Promise((resolve,reject)=>{
    let value='',settled=false;const finish=()=>{if(!settled){settled=true;resolve(value);}};
    const socket=net.connect(port,'127.0.0.1',()=>socket.write(payload));
    socket.setTimeout(2000,()=>{socket.destroy();if(!settled){settled=true;reject(Error('Antwort blieb aus'));}});
    socket.on('data',(chunk)=>{value+=chunk;if(value.includes('\r\n\r\n'))finish();});
    socket.on('end',finish);socket.on('close',finish);socket.on('error',finish);
  });
}
test('wiederholte Einzelwert-Header werden abgelehnt statt zur Kommaliste verschmolzen',async t=>{const {port}=await fixture(t);
  for(const headers of [['Host: 127.0.0.1:4173','Host: evil.example'],['Host: evil.example','Host: 127.0.0.1:4173'],['Host: 127.0.0.1:4173','Content-Length: 0','Content-Length: 0'],['Host: 127.0.0.1:4173','Transfer-Encoding: chunked','Transfer-Encoding: identity'],['Host: 127.0.0.1:4173','host: 127.0.0.1:4173']]){
    assert.match(await rawExchange(port,`GET / HTTP/1.1\r\n${headers.join('\r\n')}\r\n\r\n`),/^HTTP\/1\.1 400 /,headers.join(' | '));
  }
  assert.match(await rawExchange(port,'GET / HTTP/1.1\r\nHost: 127.0.0.1:4173\r\n\r\n'),/^HTTP\/1\.1 200 /);
});
test('gleichzeitige Verbindungen sind am Server gedeckelt, nicht nur im Kernel-Backlog',async t=>{
  const assets=await loadAssets(),server=createStaticServer({assets,connectionLimit:2});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
  assert.equal(server.maxConnections,2);
  const port=server.address().port,holders=[net.connect(port,'127.0.0.1'),net.connect(port,'127.0.0.1')];
  await new Promise(resolve=>setTimeout(resolve,150));
  assert.doesNotMatch(await rawExchange(port,'GET / HTTP/1.1\r\nHost: 127.0.0.1:4173\r\n\r\n'),/^HTTP\/1\.1 200 /);
  for(const socket of holders)await new Promise(resolve=>{socket.on('close',resolve);socket.destroy();});
  assert.match(await rawExchange(port,'GET / HTTP/1.1\r\nHost: 127.0.0.1:4173\r\n\r\n'),/^HTTP\/1\.1 200 /);
});
test('CONNECT tunnels and WebSocket upgrades are closed without forwarding',async t=>{
  const {port}=await fixture(t);
  for(const payload of ['CONNECT example.com:443 HTTP/1.1\r\nHost: localhost:4173\r\n\r\n','GET / HTTP/1.1\r\nHost: localhost:4173\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n']){
    const received=await new Promise((resolve,reject)=>{
      let value='';const socket=net.connect(port,'127.0.0.1',()=>socket.write(payload));socket.setTimeout(2000,()=>{socket.destroy();reject(Error('Tunnel was not closed'));});socket.on('data',chunk=>value+=chunk);socket.on('end',()=>resolve(value));socket.on('error',reject);
    });assert.equal(received,'');
  }
});
test('LAN configuration requires an actual private interface and rejects other networks',()=>{
  const interfaces={'Wi-Fi':[{address:'192.168.10.177',family:'IPv4',internal:false,cidr:'192.168.10.177/24'}]};
  const lan=lanConfiguration('192.168.10.177',interfaces);assert.equal(lan.subnet,'192.168.10.0/24');
  for(const address of ['127.0.0.1','192.168.10.2','192.168.10.177'])assert.equal(peerAllowed(address,lan),true);
  for(const address of ['192.168.11.2','192.168.39.2','100.64.0.2','8.8.8.8','::1','::ffff:192.168.10.2'])assert.equal(peerAllowed(address,lan),false,address);
  for(const ip of ['0.0.0.0','8.8.8.8','192.168.10.2','::'])assert.throws(()=>lanConfiguration(ip,interfaces));
  assert.equal(peerAllowed('192.168.10.2',null),false);
});
test('LAN-Profil akzeptiert nur eng begrenzte Subnetze, höchstens /22',()=>{
  const interfaces=(mask)=>({'WLAN':[{address:'192.168.10.177',family:'IPv4',internal:false,cidr:`192.168.10.177/${mask}`}]});
  for(const mask of[22,23,24,30])assert.equal(lanConfiguration('192.168.10.177',interfaces(mask)).subnet.split('/')[1],String(mask),`/${mask}`);
  for(const mask of[8,16,21,31,32])assert.throws(()=>lanConfiguration('192.168.10.177',interfaces(mask)),/begrenztem Subnetz/,`/${mask}`);
});
test('die Subnetzprüfung wird geteilt statt pro Anfrage neu aufgebaut',()=>{
  const lan=lanConfiguration('192.168.10.177',{'WLAN':[{address:'192.168.10.177',family:'IPv4',internal:false,cidr:'192.168.10.177/24'}]});
  const other=lanConfiguration('192.168.11.10',{'WLAN':[{address:'192.168.11.10',family:'IPv4',internal:false,cidr:'192.168.11.10/24'}]});
  assert.equal(lanBlock(lan),lanBlock(lan));assert.notEqual(lanBlock(lan),lanBlock(other));
  assert.equal(lanBlock(lan).check('192.168.10.2','ipv4'),true);assert.equal(lanBlock(other).check('192.168.10.2','ipv4'),false);
  // Der Puffer ist begrenzt: ein langlebiger Server darf nicht unbegrenzt Prüfobjekte ansammeln.
  const many=Array.from({length:9},(_,index)=>lanConfiguration(`192.168.${index}.10`,{[`WLAN${index}`]:[{address:`192.168.${index}.10`,family:'IPv4',internal:false,cidr:`192.168.${index}.10/24`}]}));
  const first=lanBlock(many[0]);for(const lan of many)lanBlock(lan);
  const again=lanBlock(many[0]);assert.notEqual(again,first);assert.equal(again.check('192.168.0.2','ipv4'),true);
});
test('die Verbindungsobergrenze des Servers ist messbar, der Kernel-Backlog nicht',async t=>{
  const assets=await loadAssets(),server=createStaticServer({assets,connectionLimit:2});
  await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise((resolve)=>{server.closeAllConnections();server.close(resolve);}));
  const port=server.address().port;assert.equal(server.maxConnections,2);
  const holders=[net.connect(port,'127.0.0.1'),net.connect(port,'127.0.0.1')];for(const socket of holders)socket.on('error',()=>{});
  await new Promise((resolve)=>setTimeout(resolve,100));
  const third=net.connect(port,'127.0.0.1',()=>third.write('GET / HTTP/1.1\r\nHost: 127.0.0.1:4173\r\nConnection: close\r\n\r\n'));third.on('error',()=>{});
  const answer=await new Promise((resolve)=>{let value='';third.on('data',(chunk)=>value+=chunk);third.on('close',()=>resolve(value));third.setTimeout(1500,()=>{third.destroy();resolve(value);});});
  assert.doesNotMatch(answer,/^HTTP\/1\.1 200 /,`dritte Verbindung blieb offen: ${answer.split('\r\n')[0]}`);
  for(const socket of holders)await new Promise((resolve)=>{socket.on('close',resolve);socket.destroy();});
  assert.match(await rawExchange(port,'GET / HTTP/1.1\r\nHost: 127.0.0.1:4173\r\nConnection: close\r\n\r\n'),/^HTTP\/1\.1 200 /);
});
test('lesson progress renders without inline styles forbidden by the server CSP',()=>{
  const store=createStore(createRepository({getItem:()=>null,setItem:()=>{}}));store.subscribe(()=>{});store.start();
  const html=practiceView(store.state,{name:'Alltag'});
  assert.match(html,/<progress /);assert.doesNotMatch(html,/\sstyle=|\sonclick=/i);
});
test('server assets are snapshotted and symlinks outside the web directory fail closed',async t=>{
  const root=await mkdtemp(path.join(tmpdir(),'sprachinseln-server-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const dist=path.join(root,'dist');await mkdir(dist);
  for(const route of assetPaths){const file=path.join(dist,route.slice(1));await mkdir(path.dirname(file),{recursive:true});await copyFile(new URL('../dist'+route,import.meta.url),file);}
  await writeFile(path.join(dist,'private.txt'),'secret');const assets=await loadAssets(dist);assert.ok(!assets.has('/private.txt'));
  await writeFile(path.join(dist,'main.js'),'changed after startup');assert.ok(!assets.get('/main.js').body.includes('changed after startup'));
  // A directory junction works on Windows without enabling Developer Mode.
  const outside=path.join(root,'outside');await mkdir(outside);await writeFile(path.join(outside,'content.js'),'secret');
  await rm(path.join(dist,'model'),{recursive:true});await symlink(outside,path.join(dist,'model'),process.platform==='win32'?'junction':'dir');
  await assert.rejects(loadAssets(dist),/außerhalb/);
});
test('deployment runtime permissions deny unrelated reads, writes and child processes',async t=>{
  const root=await mkdtemp(path.join(tmpdir(),'sprachinseln-permissions-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const allowed=path.join(root,'allowed');await mkdir(allowed);
  const outside=path.join(root,'not-a-web-file.txt');await writeFile(outside,'not published');
  const probe=path.join(allowed,'probe.mjs');
  await writeFile(probe,`import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';import {spawnSync} from 'node:child_process';
    assert.throws(()=>readFileSync(process.argv[2]),{code:'ERR_ACCESS_DENIED'});
    assert.throws(()=>writeFileSync(process.argv[3],'blocked'),{code:'ERR_ACCESS_DENIED'});
    assert.throws(()=>spawnSync(process.execPath,['--version']),{code:'ERR_ACCESS_DENIED'});
    assert.throws(()=>eval('1+1'),EvalError);
    assert.throws(()=>({}).__proto__,{code:'ERR_PROTO_ACCESS'});console.log('restrictions verified');`);
  const result=spawnSync(process.execPath,['--permission','--disable-proto=throw','--disallow-code-generation-from-strings','--allow-fs-read='+allowed,probe,outside,path.join(allowed,'write.txt')],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/restrictions verified/);
});
