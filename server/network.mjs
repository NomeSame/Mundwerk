import {networkInterfaces} from 'node:os';
import {BlockList,isIPv4} from 'node:net';
export function lanConfiguration(ip,interfaces=networkInterfaces()) {
  if(!isIPv4(ip)||!(/^(10\.|192\.168\.)/.test(ip)||(/^172\./.test(ip)&&Number(ip.split('.')[1])>=16&&Number(ip.split('.')[1])<=31)))throw Error('LAN-Adresse muss eine private IPv4-Adresse sein.');
  const match=Object.entries(interfaces).flatMap(([name,values])=>(values??[]).map(value=>({...value,name}))).find(value=>value.address===ip&&!value.internal&&value.family==='IPv4');
  const prefix=Number(match?.cidr?.split('/')[1]);
  if(!match||!Number.isInteger(prefix)||prefix<22||prefix>30)throw Error('Keine passende lokale LAN-Schnittstelle mit begrenztem Subnetz (höchstens /22) gefunden.');
  const network=ip.split('.').map((value,index)=>{const bits=Math.max(0,Math.min(8,prefix-index*8));return Number(value)&(bits?256-2**(8-bits):0);}).join('.');
  return {ip,network,prefix,subnet:`${network}/${prefix}`,interfaceAlias:match.name};
}
export function peerAllowed(address,lan) {
  if(address==='127.0.0.1')return true;
  if(!lan||!isIPv4(address))return false;
  const block=new BlockList();block.addSubnet(lan.network,lan.prefix,'ipv4');
  return block.check(address,'ipv4');
}
