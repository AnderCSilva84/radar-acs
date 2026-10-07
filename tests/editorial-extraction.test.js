'use strict';
const test = require('node:test'); const assert = require('node:assert/strict');
const { articleMetadata, feedItems, createCollector } = require('../api/editorial-collector');
const { dateValue } = require('../api/editorial-extraction');
const fixtures = require('./fixtures/extraction-structures.cjs');
const { defaultSettings } = require('../api/editorial-settings');
const source = { id:'test',name:'Fonte',url:'https://github.blog/',categories:['desenvolvimento'],quality:3,articlePattern:'^/news/.+' };
test('GE: artigo de vídeo aninhado não interrompe o corpo semântico',()=>{
 const a=articleMetadata(fixtures.ge,'https://ge.globo.com/noticia/teste.ghtml');
 assert.equal(a.publishedAt,'2026-10-05'); assert.equal(a.dateSource,'ARTICLE_PUBLISHED_TIME'); assert.equal(a.evidenceQuality,'FULL_EVIDENCE'); assert.match(a.evidenceText,/comissão técnica/);
});
test('Agência Brasil: main permite extrair corpo e elimina seção de relacionados',()=>{
 const a=articleMetadata(fixtures.agencia,'https://agenciabrasil.ebc.com.br/politica/noticia/teste');
 assert.match(a.evidenceText,/comissão técnica/); assert.doesNotMatch(a.evidenceText,/newsletter/); assert.equal(a.pageType,'ARTICLE_PAGE');
});
test('RSS: DOCTYPE HTML dentro de CDATA não é entidade XML externa',()=>{
 const [a]=feedItems(fixtures.github,source,'2026-10-06'); assert.equal(a.dateSource,'RSS_PUBDATE'); assert.equal(a.publishedAt,'2026-10-06'); assert.match(a.evidenceText,/clube/);
 assert.throws(()=>feedItems('<!DOCTYPE rss SYSTEM "https://evil.example/x"><rss/>',source,'2026-10-06'),{code:'UNSAFE_FEED'});
});
test('Atom: published e updated são identificados sem fabricar data',()=>{
 for(const name of ['published','updated']) {const [a]=feedItems(`<feed><entry><title>Notícia</title><link rel="alternate" href="https://github.blog/news/artigo"/><${name}>2026-10-06T12:00:00Z</${name}><summary>${fixtures.prose}</summary></entry></feed>`,source,'2026-10-06'); assert.equal(a.publishedAt,'2026-10-06'); assert.equal(a.dateSource,'ATOM_'+name.toUpperCase());}
});
test('resolvedor aceita ISO, brasileiro e RFC com fuso, rejeita ambiguidade',()=>{
 for(const d of ['2026-10-06','2026-10-06T12:00:00-03:00','06/10/2026','Tue, 06 Oct 2026 12:00:00 GMT']) assert.equal(dateValue(d),'2026-10-06');
 for(const d of ['10-06-26','ontem','2026-02-30',undefined]) assert.equal(dateValue(d),null);
});
test('JSON-LD articleBody/datePublished e HTML meta reconhecidos',()=>{
 const a=articleMetadata(`<script type="application/ld+json">${JSON.stringify({'@type':'NewsArticle',datePublished:'2026-10-06',articleBody:fixtures.prose})}</script>`,'https://example.org/artigo');
 assert.equal(a.dateSource,'JSON_LD_DATE_PUBLISHED'); assert.equal(a.evidenceQuality,'FULL_EVIDENCE');
 const b=articleMetadata('<meta name="parsely-pub-date" content="2026-10-05"><article><p>Nota curta disponível nesta página.</p></article>','https://example.org/artigo'); assert.equal(b.dateSource,'HTML_META');
});
test('Google: seção é discovery, não matéria publicável',()=>{
 const a=articleMetadata(fixtures.google,'https://blog.google/innovation-and-ai/models-and-research/google-deepmind/'); assert.equal(a.pageType,'DISCOVERY_PAGE'); assert.equal(a.evidenceText,''); assert.equal(a.dateSource,'DATE_UNKNOWN');
});
test('metadata suficiente é parcial e conteúdo vazio insuficiente',()=>{
 const a=articleMetadata(`<meta property="og:description" content="${fixtures.prose}"><article></article>`,'https://example.org/artigo'); assert.equal(a.evidenceQuality,'PARTIAL_EVIDENCE'); assert.equal(a.publishedAt,null);
 assert.equal(articleMetadata('<article></article>','https://example.org/artigo').evidenceQuality,'INSUFFICIENT_EVIDENCE');
});
test('403 é SOURCE_BLOCKED e não interrompe outras fontes',async()=>{
 const result=await createCollector({sources:[source],includeTeamSources:false,fetchImpl:async()=>({ok:false,status:403})})({settings:defaultSettings(),date:'2026-10-06'});
 assert.equal(result.metrics.collectionWarnings[0].code,'SOURCE_BLOCKED'); assert.equal(result.candidates.length,0);
});
