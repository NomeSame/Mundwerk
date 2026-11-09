// onion hosts are only ever accepted as an exact announced v3 address, and only from a
// direct local connection (the Tor daemon on this machine), never from the WLAN.
// A v3 onion address is 56 base32 characters plus ".onion" (the 52 characters of the label
// are the expanded descriptor; the hostname file holds the full form). Any other length or
// character is not a v3 host. The header form may additionally carry an announced port.
const onionPattern=/^[a-z2-7]{56}\.onion$/;
export function parseOnionAddress(headerValue){
  if(typeof headerValue!=='string'||headerValue.length>100)return null;
  const parts=headerValue.split(':');
  if(parts.length>2)return null;
  const host=parts[0];
  if(parts.length===2&&!/^(80|443|8080)$/.test(parts[1]))return null;
  return onionPattern.test(host)?host:null;
}
// A request may use an announced onion host only when it arrives from the loopback peer of
// the Tor daemon on this very machine; peers in the WLAN never reach it this way.
export function onionRequestAllowed(remoteAddress,announcedCount){
  return announcedCount>0&&remoteAddress==='127.0.0.1';
}
