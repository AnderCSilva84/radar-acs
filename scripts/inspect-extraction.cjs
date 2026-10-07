const fs = require('node:fs');
const r = JSON.parse(fs.readFileSync('.local-editorial-v2-real-collection.json'));
(async () => {
 for (const url of [r.traces[8].url, r.traces[9].url, 'https://github.blog/feed/']) {
  const response = await fetch(url); const html = await response.text();
  console.log(JSON.stringify({url,status:response.status,bytes:Buffer.byteLength(html),doctype:html.match(/<!DOCTYPE[^>]*>/i)?.[0],
   structure:(html.match(/<(?:article|main|p|div|section)\b[^>]*>/gi)||[]).filter(t=>/content|body|article|main|materia/i.test(t)).slice(0,30),
   ld:(html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi)||[]).map(t=>t.slice(0,400)),start:html.slice(0,160)}));
 }
})();
