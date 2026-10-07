const CONSENT='radar-audience-consent-v1',VISITOR='radar-audience-visitor-v1',EXPIRY='radar-audience-visitor-expiry-v1';
let tabId,active=false,heartbeat,lastPath,lastRouteAt=0;
export function consent(){try{return localStorage.getItem(CONSENT)||'unset';}catch{return 'denied';}}
function identity(){try{let id=localStorage.getItem(VISITOR);if(!id||Number(localStorage.getItem(EXPIRY)||0)<Date.now()){id=crypto.randomUUID();localStorage.setItem(VISITOR,id);localStorage.setItem(EXPIRY,String(Date.now()+30*86400000));}tabId||=crypto.randomUUID();return {visitorId:id,tabId};}catch{return null;}}
export function sendAudience(type,path,keepalive=false){
 if(consent()!=='accepted'||navigator.globalPrivacyControl||navigator.doNotTrack==='1')return Promise.resolve();
 const ids=identity();if(!ids)return Promise.resolve();
 return fetch('/api/audience/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...ids,eventId:crypto.randomUUID(),type,...(path?{path}:{})}),keepalive}).catch(()=>{});
}
export function setConsent(value){
 if(value!=='accepted'&&active)sendAudience('stop',undefined,true);
 try{localStorage.setItem(CONSENT,value);if(value!=='accepted'){localStorage.removeItem(VISITOR);localStorage.removeItem(EXPIRY);lastPath=undefined;}}catch{ /* Refusal is safe when storage is unavailable. */ }
 window.dispatchEvent(new Event('radar-audience-consent'));
 if(value==='accepted'&&active){sendAudience('audio_start');startHeartbeat();}else if(value!=='accepted'){clearInterval(heartbeat);heartbeat=undefined;}
}
function startHeartbeat(){clearInterval(heartbeat);if(consent()==='accepted')heartbeat=setInterval(()=>{if(active)sendAudience('heartbeat');},60000);}
export function setAudioActive(value){if(Boolean(value)===active)return;active=Boolean(value);if(active){sendAudience('audio_start');startHeartbeat();}else{clearInterval(heartbeat);heartbeat=undefined;sendAudience('stop',undefined,true);}}
export function trackPage(path){if(!['/','/history','/live','/listen'].includes(path)||path===lastPath||consent()!=='accepted')return;const delay=Math.max(0,5000-(Date.now()-lastRouteAt));const timer=setTimeout(()=>{lastPath=path;lastRouteAt=Date.now();sendAudience('pageview',path);},delay);return ()=>clearTimeout(timer);}
export function presencePageHide(){if(active)sendAudience('stop',undefined,true);clearInterval(heartbeat);}
export function presencePageShow(){if(active){sendAudience('heartbeat');startHeartbeat();}}
export async function loadAnalytics(user){const token=await user.getIdToken();const response=await fetch('/api/admin/analytics',{headers:{Authorization:'Bearer '+token},cache:'no-store'});if(!response.ok)throw new Error('Audiência indisponível.');return (await response.json()).analytics;}
