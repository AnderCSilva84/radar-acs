const {discover,feedItems,articleMetadata}=require('../api/editorial-collector');
const {normalizeCandidate}=require('../api/editorial-pool');
const sources=[
 {id:'microsoft-dev',name:'Microsoft Developer Blog',url:'https://devblogs.microsoft.com/',categories:['desenvolvimento'],quality:3,articlePattern:'^/[^/]+/[^/]+'},
 {id:'mte-news',name:'Ministério do Trabalho e Emprego',url:'https://www.gov.br/trabalho-e-emprego/pt-br/noticias-e-conteudo',categories:['concursosCarreira'],quality:3,articlePattern:'^/trabalho-e-emprego/pt-br/noticias-e-conteudo/.+'}
];
(async()=>{for(const s of sources){try{const r=await fetch(s.url,{signal:AbortSignal.timeout(7000)});const h=await r.text();const items=/<rss\b|<feed\b/i.test(h)?feedItems(h,s,'2026-10-06'):discover(h,s,'2026-10-06');console.log(JSON.stringify({source:s,status:r.status,actual:r.url,found:items.length,links:items.slice(0,3).map(x=>x._fetchUrl||x.url)}));for(const i of items.slice(0,2)){const p=await fetch(i._fetchUrl||i.url,{signal:AbortSignal.timeout(7000)});const m=articleMetadata(await p.text(),i.url);console.log(JSON.stringify({url:i.url,status:p.status,date:m.publishedAt,quality:m.evidenceQuality,pageType:m.pageType,valid:!!normalizeCandidate({...i,...m},'2026-10-06').candidate}));}}catch(e){console.log(JSON.stringify({source:s.id,error:e.name}));}}})();
