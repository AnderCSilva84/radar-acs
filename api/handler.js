'use strict';
const {timingSafeEqual}=require('node:crypto');
const {validateBriefing}=require('./validation');
function authorized(header,secret){if(typeof secret!=='string'||secret.length<32||typeof header!=='string')return false;const actual=Buffer.from(header);const expected=Buffer.from('Bearer '+secret);return actual.length===expected.length&&timingSafeEqual(actual,expected);}
function createApi(repository,getSecret){return async(req,res)=>{
 res.set('Cache-Control','no-store');res.set('X-Content-Type-Options','nosniff');
 try{
  if(req.path==='/api/briefing/latest'&&req.method==='GET'){
   const value=await repository.latest();if(!value)return res.status(200).json({success:false,message:'Nenhum briefing disponível.'});
   const {data,titulo,roteiroAlexa,audioUrl}=value;return res.status(200).json({success:true,briefing:{data,titulo,roteiroAlexa,audioUrl:audioUrl||null}});
  }
  if(req.path==='/api/briefing'&&req.method==='POST'){
   if(!authorized(req.get('Authorization'),getSecret()))return res.status(401).json({success:false,message:'Não autorizado.'});
   if(!req.is('application/json'))return res.status(415).json({success:false,message:'Envie JSON.'});
   if(Buffer.byteLength(JSON.stringify(req.body)||'')>65536)return res.status(413).json({success:false,message:'Briefing muito grande.'});
   let briefing;try{briefing=validateBriefing(req.body);}catch(error){return res.status(400).json({success:false,message:error.message});}
   await repository.save(briefing);return res.status(200).json({success:true,id:briefing.id,publicado:briefing.publicado});
  }
  return res.status(404).json({success:false,message:'Rota não encontrada.'});
 }catch(error){console.error('Erro na API:',error.code||error.name);return res.status(503).json({success:false,message:'Radar ACS indisponível no momento.'});}
};}
module.exports={createApi,authorized};
