import {loadAssets,createStaticServer} from './server/static-server.mjs';
import {lanConfiguration} from './server/network.mjs';
const args=process.argv.slice(2);
if(args.length&&!(args.length===2&&args[0]==='--lan'))throw Error('Aufruf: node server.mjs [--lan PRIVATE_IPV4]');
const lan=args.length?lanConfiguration(args[1]):null;
const assets=await loadAssets(),servers=[];
try {
  for(const host of ['127.0.0.1',...(lan?[lan.ip]:[])]){
    const server=createStaticServer({assets,lan});servers.push(server);
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4173,host,resolve);});
    console.log(`Sprachinseln: http://${host}:4173/`);
  }
  if(lan)console.log(`Erlaubtes WLAN-Subnetz: ${lan.subnet}. Nur feste Webdateien, GET/HEAD.`);
}catch(error){for(const server of servers)server.close();throw error;}
const stop=()=>{for(const server of servers){server.close();server.closeAllConnections();}};
process.once('SIGINT',stop);process.once('SIGTERM',stop);
