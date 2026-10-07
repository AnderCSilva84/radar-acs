'use strict';
const {getBriefingPlayback}=require('./playback');
const {editionMetadata}=require('./edition-metadata');
const {newsImage}=require('./news-image');
const FALLBACK='Não consegui atualizar o Radar ACS agora. Vou reproduzir o último briefing disponível.';
function text(value,field,max=10000){if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw new Error('Campo inválido: '+field);return value.trim();}
function httpsUrl(value){let url;try{url=new URL(value);}catch{throw new Error('URL inválida');}if(url.protocol!=='https:'||url.username||url.password)throw new Error('URL deve usar HTTPS sem credenciais');return url.href;}
function validateNewsItem(item,index=0){if(!item||item.ordem!==index+1)throw new Error('Ordene as notícias de 1 a 5');return {ordem:item.ordem,...Object.fromEntries(['titulo','resumo','contexto','fonte'].map(field=>[field,text(item[field],field,3000)])),url:httpsUrl(text(item.url,'url',2000)),...newsImage(item)};}
function validateBriefing(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Briefing inválido');
 const data=text(input.data,'data',10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(data)||!Number.isFinite(Date.parse(data))||new Date(data).toISOString().slice(0,10)!==data)throw new Error('Data inválida; use YYYY-MM-DD');
 if(typeof input.publicado!=='boolean')throw new Error('publicado deve ser booleano');
 if(!Array.isArray(input.noticias)||(input.noticias.length<1||input.noticias.length>5))throw new Error('Informe de uma a cinco notícias');
 const noticias=input.noticias.map(validateNewsItem);
 const result={id:data,data,titulo:text(input.titulo,'titulo',200),resumo:text(input.resumo,'resumo',5000),roteiroAlexa:text(input.roteiroAlexa,'roteiroAlexa'),noticias,oportunidadeDoDia:text(input.oportunidadeDoDia,'oportunidadeDoDia',5000),audioUrl:input.audioUrl==null?null:httpsUrl(text(input.audioUrl,'audioUrl',2000)),publicado:input.publicado};
 Object.assign(result,editionMetadata(input,true));
 validateEditorialScript(result.roteiroAlexa);
 getBriefingPlayback(result,FALLBACK);return result;
}
function validateEditorialScript(script) {
 const normalized = script.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
 const repeatsOpening = /esta\s+comecando\s+o\s+radar\s+acs|seu\s+briefing\s+diario\s+de\s+tecnologia|separei\s+cinco\s+assuntos\s+importantes\s+para\s+hoje/.test(normalized);
 const containsGreeting = /\b(?:bom dia|boa tarde|boa noite)\b|(?:^|\n)\s*(?:ola|oi)(?:[,.!:\s]|$)/.test(normalized);
 if (repeatsOpening || containsGreeting) {
  throw new Error('roteiroAlexa deve conter somente conteúdo editorial, sem saudação ou abertura da Skill');
 }
}
module.exports={validateBriefing,validateNewsItem,validateEditorialScript};
