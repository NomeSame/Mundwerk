import {loadAssets,createStaticServer} from './server/static-server.mjs';
import {lanConfiguration} from './server/network.mjs';
import {readFile} from 'node:fs/promises';
import {parseOnionAddress} from './server/onion.mjs';
const args=process.argv.slice(2);
function parseArgs(argv){
  const out={lan:null,onionFile:null,onionPort:4174};
  for(let index=0;index<argv.length;index+=2){
    const flag=argv[index];
    if(!['--lan','--onion-file','--onion-port'].includes(flag)||argv[index+1]===undefined)throw Error('Aufruf: node server.mjs [--lan PRIVATE_IPV4] [--onion-file DATEI] [--onion-port PORT]');
    if(flag==='--lan')out.lan=argv[index+1];else if(flag==='--onion-file')out.onionFile=argv[index+1];else out.onionPort=argv[index+1];
  }
  return out;
}
const settings=parseArgs(args);
if(!Number.isInteger(Number(settings.onionPort))||Number(settings.onionPort)<1024)throw Error('Der Tor-Horer braucht einen Port oberhalb 1023.');
const lan=settings.lan?lanConfiguration(settings.lan):null;
// The announced address is read from Tor itself, never hardcoded: losing or rotating the
// address therefore cannot leave a stale host behind in this file.
let onion=[];
if(settings.onionFile){
  const line=(await readFile(settings.onionFile,'utf8')).trim();
  const host=parseOnionAddress(line);
  if(!host)throw Error('Die angekuerdigte .onion-Adresse ist ungueltig.');
  onion=[host];
}
const assets=await loadAssets(),servers=[];
try {
  for(const host of ['127.0.0.1',...(lan?[lan.ip]:[])]){
    const server=createStaticServer({assets,lan});servers.push(server);
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4173,host,resolve);});
    console.log(`Sprachinseln: http://${host}:4173/`);
  }
  if(onion.length){
    const listener=createStaticServer({assets,lan,onion});servers.push(listener);
    await new Promise((resolve,reject)=>{listener.once('error',reject);listener.listen(Number(settings.onionPort),'127.0.0.1',resolve);});
    console.log(`Sprachinseln ueber Tor: http://${onion[0]}/ (Horer 127.0.0.1:${settings.onionPort})`);
  }
  if(lan)console.log(`Erlaubtes WLAN-Subnetz: ${lan.subnet}. Nur feste Webdateien, GET/HEAD.`);
}catch(error){for(const server of servers)server.close();throw error;}
const stop=()=>{for(const server of servers){server.close();server.closeAllConnections();}};
process.once('SIGINT',stop);process.once('SIGTERM',stop);
