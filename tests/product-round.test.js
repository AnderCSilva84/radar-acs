'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { safeImageUrl, imageFromSource, newsImage } = require('../api/news-image');
const { validateAdvertising, publicCampaigns, campaignStatus } = require('../api/advertising');
const campaign = { id:'c',advertiserName:'ACS',campaignName:'Radar',imageUrl:'https://example.com/image.png',targetUrl:'https://example.com/',alt:'ACS',startDate:'2026-10-01',endDate:'2026-10-31',position:'HOME_TOP',active:true };
test('imagem editorial tem precedência sobre OG/feed; resolve URL relativa da própria fonte',()=>{
 const item=imageFromSource({url:'https://example.com/article',imageUrl:'/editorial.jpg',ogImage:'https://example.com/og.jpg',thumbnail:'https://example.com/feed.jpg',imageApproved:true});
 assert.equal(item.imageUrl,'https://example.com/editorial.jpg');assert.equal(item.imageSource,'https://example.com/article');assert.equal(item.imageApproved,true);
});
test('OG disponível nos metadados existentes; URL inválida permite feed válido sem requisição nova',()=>{
 assert.equal(imageFromSource({url:'https://example.com/a',metadata:{'og:image':'/social.jpg'}}).imageUrl,'https://example.com/social.jpg');
 assert.equal(imageFromSource({url:'https://example.com/a',imageUrl:'javascript:bad',enclosure:{url:'/feed.png'}}).imageUrl,'https://example.com/feed.png');
});
test('imagem ausente ou insegura não entra no contrato',()=>{
 for(const value of ['file:///x','https://localhost/a','http://127.0.0.1/a','https://example.com/a?apiKey=secret','https://u:p@example.com/a']) assert.equal(safeImageUrl(value),null);
 assert.deepEqual(newsImage({imageUrl:'https://example.com/a',imageSource:'invalid'}),{});
 assert.deepEqual(imageFromSource({url:'https://example.com/a'}),{});
 assert.equal(safeImageUrl('http://example.com/a'),'http://example.com/a');
});
test('rascunho incompleto é privado e não aparece no portal',()=>{
 const saved=validateAdvertising({campaigns:[{...campaign,active:false,publicationState:'draft',imageUrl:'',targetUrl:'',alt:''}]});
 assert.equal(campaignStatus(saved.campaigns[0]),'RASCUNHO');assert.deepEqual(publicCampaigns(saved,'2026-10-05'),[]);
 assert.throws(()=>validateAdvertising({campaigns:[{...campaign,publicationState:'draft'}]}));
});
test('anunciante privado e prioridade persistem em uma configuração; nenhuma PII na projeção pública',()=>{
 const input={advertisers:[{id:'a',name:'ACS',company:'ACS',email:'test@example.com',whatsapp:'9999',notes:'Privado'}],campaigns:[{...campaign,advertiserId:'a',publicationState:'published',priority:2}]};
 const saved=validateAdvertising(input);assert.equal(saved.advertisers[0].email,'test@example.com');assert.equal(saved.campaigns[0].priority,2);
 const visible=publicCampaigns(saved,'2026-10-05');assert.equal(visible.length,1);assert.equal(visible[0].priority,2);assert.doesNotMatch(JSON.stringify(visible),/9999|Privado|test@example.com|advertiserId/);
 assert.throws(()=>validateAdvertising({...input,advertisers:[]}));assert.throws(()=>validateAdvertising({...input,advertisers:[{id:'a',name:'ACS',email:'invalid'}]}));
});
test('campanha legada continua pública; estados por período e habilitação',()=>{
 assert.equal(publicCampaigns({campaigns:[campaign]},'2026-10-05').length,1);
 assert.equal(campaignStatus({...campaign,startDate:'2099-01-01'},'2026-10-05'),'AGENDADA');
 assert.equal(campaignStatus({...campaign,endDate:'2020-01-01'},'2026-10-05'),'ENCERRADA');
 assert.equal(campaignStatus({...campaign,active:false},'2026-10-05'),'INATIVA');
});
test('projeção pública conserva metadados de imagem sem evidence ou secrets',()=>{
 const { publicNews }=require('../api/public-news');
 const result=publicNews([{titulo:'Artigo',url:'https://example.com/article',imageUrl:'https://example.com/news.jpg',imageSource:'https://example.com/article',imageApproved:true,imageAlt:'Fotografia',allowedFacts:['private'],evidence:'private'}]);
 assert.equal(result[0].imageUrl,'https://example.com/news.jpg');assert.equal(result[0].imageApproved,true);assert.doesNotMatch(JSON.stringify(result),/allowedFacts|evidence|private/);
});
test('somente metadados de source realmente observado podem enriquecer a imagem',()=>{
 const {observedSourceEvidence}=require('../api/source-evidence-store');
 const response={output:[{type:'message',content:[{imageUrl:'https://example.com/invented.jpg'}]},{type:'web_search_call',id:'web',status:'completed',action:{type:'search',sources:[{url:'https://example.com/article',imageUrl:'/real.jpg',imageApproved:true}]}}]};
 const result=observedSourceEvidence(response);assert.equal(result.length,1);assert.equal(result[0].imageUrl,'https://example.com/real.jpg');assert.equal(result[0].origin,'WEB_TOOL_OUTPUT');
});
