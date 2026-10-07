'use strict';
const {createHash}=require('node:crypto');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const routes=['/','/history','/listen','/live'];
const TTL=120000, DAY=86400000, MAX=1500;
const dateAt=ms=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Belem',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms));
const key=id=>createHash('sha256').update(id).digest('hex').slice(0,32);
function validateEvent(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['visitorId','tabId','eventId','type','path'].includes(k))||!uuid.test(body.visitorId)||!uuid.test(body.tabId)||!uuid.test(body.eventId)||!['pageview','audio_start','heartbeat','stop'].includes(body.type))throw new Error('INVALID_EVENT');
 if(body.type==='pageview'&&!routes.includes(body.path)||body.type!=='pageview'&&body.path!==undefined)throw new Error('INVALID_EVENT');
 return {...body};
}
function updateDaily(current,event,now){
 const date=dateAt(now),doc=current?.date===date?structuredClone(current):{date,visits:0,pages:{},visitors:{},audioSessions:0};
 const id=key(event.visitorId),old=doc.visitors[id];
 if(!old&&Object.keys(doc.visitors).length>=MAX)return {doc,changed:false};
 if(old?.eventId===event.eventId||old&&now-old.at<5000&&event.type==='pageview')return {doc,changed:false};
 if((old?.views||0)>=120&&event.type==='pageview')return {doc,changed:false};
 if(event.type==='audio_start'&&old?.audio)return {doc,changed:false};
 doc.visitors[id]={...old,at:now,eventId:event.eventId,views:(old?.views||0)+(event.type==='pageview'?1:0),audio:Boolean(old?.audio||event.type==='audio_start')};
 doc.expiresAt=new Date(Date.parse(date+'T03:00:00Z')+32*DAY);
 if(event.type==='pageview'){doc.visits++;doc.pages[event.path]=(doc.pages[event.path]||0)+1;}else doc.audioSessions++;
 return {doc,changed:true};
}
function updatePresence(current,event,now){
 const sessions={};for(const [id,tabs]of Object.entries(current?.sessions||{})){const alive=Object.fromEntries(Object.entries(tabs).filter(([,expires])=>expires>now));if(Object.keys(alive).length)sessions[id]=alive;}
 const id=key(event.visitorId),tab=key(event.tabId);
 if(event.type==='stop'){if(sessions[id]){delete sessions[id][tab];if(!Object.keys(sessions[id]).length)delete sessions[id];}}
 else if(sessions[id]||Object.keys(sessions).length<MAX){sessions[id]||={};if(sessions[id][tab]||Object.keys(sessions[id]).length<4)sessions[id][tab]=now+TTL;}
 return {sessions,expiresAt:new Date(now+TTL)};
}
function listenerCount(doc,now){return Object.values(doc?.sessions||{}).filter(tabs=>Object.values(tabs).some(exp=>exp>now)).length;}
function summarize(days,now,count){
 const today=dateAt(now),cut30=Date.parse(today)-29*DAY,cut7=Date.parse(today)-6*DAY;
 const valid=days.filter(d=>d?.date<=today&&Date.parse(d.date)>=cut30).sort((a,b)=>a.date.localeCompare(b.date));
 const unique=(list)=>new Set(list.flatMap(d=>Object.keys(d.visitors||{}))).size;
 const todayDoc=valid.find(d=>d.date===today),last7=valid.filter(d=>Date.parse(d.date)>=cut7),pages={};
 for(const d of valid)for(const [path,n]of Object.entries(d.pages||{}))pages[path]=(pages[path]||0)+n;
 const visits30=valid.reduce((n,d)=>n+d.visits,0);
 return {visitorsToday:Object.keys(todayDoc?.visitors||{}).length,visitsToday:todayDoc?.visits||0,visitors7:unique(last7),visitors30:unique(valid),visits30,listenersNow:count,
 days:valid.map(d=>({date:d.date,visitors:Object.keys(d.visitors||{}).length,visits:d.visits,audioSessions:d.audioSessions||0})),pages:Object.entries(pages).map(([path,views])=>({path,views,percent:visits30?Math.round(views*1000/visits30)/10:0}))};
}
function createAudienceRepository(db,clock=Date.now){
 const live=db.collection('audiencePrivate').doc('presence');
 const daily=date=>db.collection('audienceDaily').doc(String(Math.floor(Date.parse(date)/DAY)%32));
 return {async track(event){const now=clock();
  if(event.type==='pageview'||event.type==='audio_start')await db.runTransaction(async tx=>{const ref=daily(dateAt(now)),snap=await tx.get(ref),r=updateDaily(snap.exists?snap.data():null,event,now);if(r.changed)tx.set(ref,r.doc);});
  if(event.type!=='pageview')await db.runTransaction(async tx=>{const snap=await tx.get(live);tx.set(live,updatePresence(snap.exists?snap.data():null,event,now));});
 },async listeners(){const s=await live.get();return listenerCount(s.exists?s.data():null,clock());},async dashboard(){const now=clock(),docs=await db.getAll(...Array.from({length:32},(_,i)=>db.collection('audienceDaily').doc(String(i))));return summarize(docs.filter(s=>s.exists).map(s=>s.data()),now,await this.listeners());}};
}
function createAudience({repository,verifyIdToken,getAdminUid,clock=Date.now}){
 const rates=new Map();let cached=null,privateCache=null,windowAt=clock(),events=0;
 return async(req,res)=>{
 res.set('Cache-Control','no-store');
 if(req.path==='/api/admin/analytics'){
  if(req.method!=='GET')return res.status(405).json({success:false});
  const header=req.get('Authorization');if(!/^Bearer \S+$/.test(header||''))return res.status(401).json({success:false});
  let user;try{user=await verifyIdToken(header.slice(7),true);}catch{return res.status(401).json({success:false});}
  if(!getAdminUid()||user.uid!==getAdminUid())return res.status(403).json({success:false});
  if(!privateCache||privateCache.until<clock())privateCache={value:await repository.dashboard(),until:clock()+60000};
  return res.status(200).json({success:true,analytics:privateCache.value});
 }
 if(req.path==='/api/audience/listeners'&&req.method==='GET'){if(!cached||cached.until<clock())cached={count:await repository.listeners(),until:clock()+30000};return res.status(200).json({success:true,listeners:cached.count});}
 if(req.path!=='/api/audience/event'||req.method!=='POST')return res.status(404).json({success:false});
 if(!req.is('application/json')||Buffer.byteLength(JSON.stringify(req.body||{}))>512)return res.status(400).json({success:false});
 // Browser tracking only, same-origin. No IP, UA or credentials retained.
 const origin=req.get('Origin');if(!origin||!['https://radar-acs.web.app','https://radar-acs.firebaseapp.com','http://127.0.0.1:5173','http://localhost:5173'].includes(origin))return res.status(403).json({success:false});
 if(/bot|crawler|spider|headless|healthcheck/i.test(req.get('User-Agent')||''))return res.status(202).json({success:true,ignored:true});
 let event;try{event=validateEvent(req.body);}catch{return res.status(400).json({success:false});}
 const now=clock(),id=key(event.visitorId)+event.type;
 if(now-windowAt>=60000){windowAt=now;events=0;}if(++events>100)return res.status(429).json({success:false});
 if(rates.size>3000)for(const [k,t]of rates)if(now-t>60000)rates.delete(k);
 if(rates.size>3000)return res.status(429).json({success:false});
 if(now-(rates.get(id)||0)<(event.type==='heartbeat'?45000:event.type==='pageview'?5000:1000))return res.status(429).json({success:false});
 rates.set(id,now);await repository.track(event);cached=null;return res.status(202).json({success:true});
 };
}
module.exports={validateEvent,updateDaily,updatePresence,listenerCount,summarize,createAudienceRepository,createAudience,TTL};
