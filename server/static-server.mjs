import http from 'node:http';
import {readFile,realpath,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assetPaths} from './asset-list.mjs';
import {peerAllowed} from './network.mjs';
import {parseOnionAddress,onionRequestAllowed} from './onion.mjs';
const defaultRoot=fileURLToPath(new URL('../dist/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
const securityHeaders={
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer',
  'Cross-Origin-Resource-Policy':'same-origin',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=(), usb=(), serial=()',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
};
export async function loadAssets(root=defaultRoot) {
  const absolute=path.resolve(root),canonical=await realpath(absolute);
  if(canonical.toLowerCase()!==absolute.toLowerCase())throw Error('Webverzeichnis darf kein umgeleiteter Pfad sein.');
  const assets=new Map();
  for(const route of assetPaths){
    const file=await realpath(path.join(canonical,route.slice(1)));
    if(!file.toLowerCase().startsWith((canonical+path.sep).toLowerCase())||!(await stat(file)).isFile())throw Error('Webdatei liegt außerhalb des erlaubten Verzeichnisses.');
    assets.set(route,{body:await readFile(file),type:types[path.extname(route)]});
  }
  return assets;
}
export function createStaticServer({assets,lan=null,port=4173,onion=[]}={}) {
  const hosts=new Set([`localhost:${port}`,`127.0.0.1:${port}`,...(lan?[`${lan.ip}:${port}`]:[])]);
  const onionHosts=new Map();
  for(const value of onion){
    const host=parseOnionAddress(value);
    if(!host)throw Error('Eine angekuendigte .onion-Adresse hat nicht das erwartete Format.');
    for(const form of [host,`${host}:80`]) onionHosts.set(form,host);
  }
  if(onion.length*2!==onionHosts.size)throw Error('Eine angekuendigte .onion-Adresse hat nicht das erwartete Format.');
  const reject=(response,status)=>{
    response.writeHead(status,{...securityHeaders,'Content-Type':'text/plain; charset=utf-8','Connection':'close',...(status===405?{Allow:'GET, HEAD'}:{})});
    response.end('Anfrage nicht erlaubt.');
  };
  const server=http.createServer({maxHeaderSize:8192,requestTimeout:10000,headersTimeout:5000,keepAliveTimeout:3000},(request,response)=>{
    const announced=onionHosts.get(request.headers.host)??null;
    const viaOnion=onionRequestAllowed(request.socket.remoteAddress,onionHosts.size)&&announced!==null;
    if(!viaOnion&&!peerAllowed(request.socket.remoteAddress,lan))return reject(response,403);
    if(!hosts.has(request.headers.host)&&announced===null)return reject(response,403);
    if(!['GET','HEAD'].includes(request.method))return reject(response,405);
    if(request.headers['transfer-encoding']||(request.headers['content-length']&&request.headers['content-length']!=='0'))return reject(response,400);
    const raw=request.url??'';
    if(raw.length>2048)return reject(response,414);
    // No decoding or normalizing: request paths never become arbitrary filesystem paths.
    const route=raw.split('?')[0];
    if(!/^\/[a-zA-Z0-9/_-]*\.?[a-zA-Z0-9]*$/.test(route)||route.includes('//')||route.includes('/.')||route.includes('..'))return reject(response,400);
    const asset=assets.get(route==='/'?'/index.html':route);
    if(!asset)return reject(response,404);
    response.writeHead(200,{...securityHeaders,'Content-Type':asset.type,'Content-Length':asset.body.length});
    response.end(request.method==='HEAD'?undefined:asset.body);
  });
  server.maxConnections=64;server.maxRequestsPerSocket=100;server.maxHeadersCount=40;
  server.setTimeout(10000,socket=>socket.destroy());
  server.on('connect',(_req,socket)=>socket.destroy());
  server.on('upgrade',(_req,socket)=>socket.destroy());
  server.on('checkContinue',(_req,response)=>reject(response,405));
  server.on('checkExpectation',(_req,response)=>reject(response,417));
  server.on('clientError',(_error,socket)=>{if(socket.writable)socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');else socket.destroy();});
  return server;
}
