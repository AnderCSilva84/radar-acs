'use strict';
const https = require('node:https');
const config = require('./config.json');
const {getBriefingPlayback} = require('./playback');
const FALLBACK = 'Não consegui atualizar o Radar ACS agora. Vou reproduzir o último briefing disponível.';
function requestJson(url) {
 return new Promise((resolve,reject) => {
  let target; try {target = new URL(url); if(target.protocol !== 'https:' || target.username || target.password) throw new Error('Endpoint inválido');} catch(error){reject(error);return;}
  const req = https.get(target,{headers:{Accept:'application/json'}},res=>{
   if(res.statusCode!==200){res.resume();reject(new Error('HTTP '+res.statusCode));return;}
   let body='';let size=0;
   res.on('data',chunk=>{size+=chunk.length;if(size>65536)req.destroy(new Error('Resposta muito grande'));else body+=chunk;});
   res.on('error',reject);res.on('end',()=>{try{resolve(JSON.parse(body));}catch{reject(new Error('JSON inválido'));}});
  });
  const deadline=setTimeout(()=>req.destroy(new Error('Tempo esgotado')),3500);
  req.on('close',()=>clearTimeout(deadline));req.on('error',reject);
 });
}
function createBriefingClient(fetchJson=requestJson,getUrl=()=>process.env.BRIEFING_API_URL||config.briefingApiUrl){
 let cached=null;
 return async function getLatest(){
  try{
   const payload=await fetchJson(getUrl());
   if(payload && payload.success===false && payload.message==='Nenhum briefing disponível.'){cached=null;return {briefing:null};}
   if(!payload || payload.success!==true || !payload.briefing || !/^\d{4}-\d{2}-\d{2}$/.test(payload.briefing.data) || typeof payload.briefing.titulo!=='string')throw new Error('Resposta inválida');
   getBriefingPlayback(payload.briefing,FALLBACK);cached=payload.briefing;return {briefing:cached};
  }catch(error){console.error('Consulta de briefing falhou:',error.code||error.name);if(cached)return {briefing:cached,prefix:FALLBACK};throw error;}
 };
}
module.exports={createBriefingClient,requestJson};
