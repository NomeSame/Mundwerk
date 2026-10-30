import http from 'node:http';
import {readFile,realpath,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assetPaths} from './asset-list.mjs';
import {peerAllowed} from './network.mjs';
const defaultRoot=fileURLToPath(new URL('../dist/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
const securityHeaders={
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer',
  'Cross-Origin-Resource-Policy':'same-origin',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=(), usb=(), serial=()',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; require-trusted-types-for 'script'"
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
const singleValueHeaders=new Set(['host','content-length','transfer-encoding']);
// Node verschmilft wiederholte Einzelwert-Header zu einer Kommaliste und benutzt dann den ersten Wert.
// Hinter Vermittler oder CDN ist das die klassische Stelle für Request-Smuggling und Host-Täuschung,
// geprüft wird deshalb die Anzahl tatsächlich gesendeter Kopfzeilen, nicht ihr kombinierter Inhalt.
function ambiguousHeaders(rawHeaders){
  const seen=new Set();
  for(let index=0;index<rawHeaders.length;index+=2){
    const name=rawHeaders[index].toLowerCase();
    if(!singleValueHeaders.has(name))continue;
    if(seen.has(name))return true;
    seen.add(name);
  }
  return false;
}
export function createStaticServer({assets,lan=null,port=4173,connectionLimit=64}={}) {
  const hosts=new Set([`localhost:${port}`,`127.0.0.1:${port}`,...(lan?[`${lan.ip}:${port}`]:[])]);
  const reject=(response,status)=>{
    response.writeHead(status,{...securityHeaders,'Content-Type':'text/plain; charset=utf-8','Connection':'close',...(status===405?{Allow:'GET, HEAD'}:{})});
    response.end('Anfrage nicht erlaubt.');
  };
  const server=http.createServer({maxHeaderSize:8192,requestTimeout:10000,headersTimeout:5000,keepAliveTimeout:3000},(request,response)=>{
    if(ambiguousHeaders(request.rawHeaders))return reject(response,400);
    if(!peerAllowed(request.socket.remoteAddress,lan))return reject(response,403);
    if(!hosts.has(request.headers.host))return reject(response,403);
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
  server.maxConnections=connectionLimit;server.maxRequestsPerSocket=100;server.maxHeadersCount=40;
  // Obergrenze für gleichzeitige Verbindungen: ohne sie hält ein einziger Client unbegrenzt offene Sockets frei.
  // Der Kernel-Backlog nimmt Anfragen trotzdem vorher an, gemessen wird die Grenze deshalb am Server selbst.
  server.setTimeout(10000,socket=>socket.destroy());
  server.on('connect',(_req,socket)=>socket.destroy());
  server.on('upgrade',(_req,socket)=>socket.destroy());
  server.on('checkContinue',(_req,response)=>reject(response,405));
  server.on('checkExpectation',(_req,response)=>reject(response,417));
  server.on('clientError',(_error,socket)=>{if(socket.writable)socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');else socket.destroy();});
  return server;
}
