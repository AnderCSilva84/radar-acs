'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { generateRadarEdition } = require('../api/generator');
const { defaultSettings } = require('../api/editorial-settings');
const { rankPool, classifyArticleUrl, resolveTeam, sourcePlan } = require('../api/editorial-pool');
const { buildWritingRequest, validateWriting } = require('../api/editorial-v2-generator');
const { createCollector, feedItems, articleMetadata } = require('../api/editorial-collector');
const { createDiagnosticBuffer, withConsolidatedDiagnostic } = require('../api/consolidated-diagnostic');
const { validateBriefing } = require('../api/validation');
const { publicNews } = require('../api/public-news');
const { renderEditionAudio } = require('../api/audio-rendering');
const fixture = require('./fixtures/editorial-v2.cjs');
const date = '2026-10-06', now = () => new Date(date + 'T11:00:00Z');
const logger = { info() {}, warn() {} };

async function run(candidates, overrides = {}) {
    const settings = overrides.settings || defaultSettings(), recent = overrides.recent || [];
    const ranked = rankPool(candidates, settings, recent, date);
    let calls = 0, publications = 0, writes = 0, saved, diagnostic;
    const buffer = createDiagnosticBuffer(async value => { writes++; diagnostic = value; }, ['fixture-secret'], { technicalOnly: true, date });
    let result, error;
    try { result = await withConsolidatedDiagnostic(buffer, () => generateRadarEdition({ apiKey: 'fixture-secret', now, logger,
        getEditorialSettings: async () => settings, getRecentNews: async () => recent,
        collectCandidates: async () => ({ candidates, metrics: { externalRequests: 0 } }),
        checkpoint: value => buffer.capture(value), evidenceCheckpoint: value => buffer.candidates(value),
        fetchImpl: async (url, request) => { calls++; assert.equal(calls, 1); assert.equal(url, 'https://api.openai.com/v1/responses');
            const sent = JSON.parse(request.body); assert.deepEqual(sent.tools, []); assert.equal(sent.tool_choice, 'none');
            const body = fixture.writing(ranked.selected); overrides.patch?.(body);
            return overrides.httpFailure ? { ok: false, status: 429 } : { ok: true, json: async () => fixture.response(body) }; },
        publish: async value => { publications++; saved = value; } })); } catch (caught) { error = caught; }
    return { result, error, calls, publications, writes, saved, diagnostic, ranked };
}

for (const size of [1, 2, 3, 4, 5, 6, 7]) test('V2: ' + size + ' notícias, seleção antes da única chamada e publicação simulada', async () => {
    const result = await run(fixture.pool().slice(0, size));
    assert.equal(result.error, undefined);
    assert.equal(result.saved.noticias.length, size);
    assert.equal(result.calls, 1); assert.equal(result.publications, 1); assert.equal(result.writes, 1);
    assert.equal(result.result.metrics.buscasWeb, 0);
    assert.equal(result.diagnostic.editorial.published, size);
    assert.equal(result.diagnostic.editorial.editorialShortage, size < 5);
    if (size <= 2) assert.match(result.diagnostic.editorial.editorialShortageReason, /^EDITORIAL_SHORTAGE/);
    assert.ok(result.saved.noticias.every(item => item.editorialSummary && item.speechSummary));
    assert.equal(result.diagnostic.status, 'PUBLISHED');
});

test('pool alvo 12–20, edição limitada a sete e extras consolidados sem outra IA', async () => {
    const result = await run(fixture.pool());
    assert.equal(result.error, undefined);
    assert.equal(result.ranked.pool.length, 12); assert.equal(result.saved.noticias.length, 7);
    assert.equal(result.diagnostic.feedCandidates.length, 5); assert.equal(result.writes, 1);
    assert.ok(result.diagnostic.editorial.editorialProfileVersion.startsWith('v2-'));
    assert.equal(result.diagnostic.editorial.prioritiesApplied.tecnologiaIA, 'high');
});

test('URL inválida, listagem genérica e evidência insuficiente têm contadores separados', () => {
    const input = fixture.pool().slice(0, 3);
    input[0].url = 'https://127.0.0.1/private'; input[1].url = 'https://example.org/latest/'; input[2].evidenceText = 'Sem conteúdo.';
    const result = rankPool(input, defaultSettings(), [], date);
    assert.equal(result.diagnostics.invalidUrls, 1); assert.equal(result.diagnostics.genericUrls, 1);
    assert.equal(result.diagnostics.insufficientEvidence, 1); assert.equal(result.selected.length, 0);
    for (const path of ['/news/', '/latest/', '/noticias/', '/home/', '/blog/category/ia/', '/futebol/times/botafogo/']) assert.equal(classifyArticleUrl('https://example.org' + path).classification, 'GENERIC_LISTING');
    assert.equal(classifyArticleUrl('https://www.gov.br/orgaos/documentos/edital-oficial').classification, 'ARTICLE_URL');
});

test('sem candidato válido: zero chamadas e um diagnóstico de falha, sem publicação', async () => {
    const result = await run([]);
    assert.equal(result.calls, 0); assert.equal(result.publications, 0); assert.equal(result.writes, 1);
    assert.equal(result.error.code, 'NO_VALID_NEWS'); assert.equal(result.diagnostic.editorial.openAiCalls, 0);
});

test('deduplicação canônica e título normalizado antes da redação', () => {
    const item = fixture.pool()[0];
    const result = rankPool([item, { ...item, url: item.url + '?utm_source=radar' }, { ...item, url: item.url + '/nova', title: item.title.toUpperCase() }], defaultSettings(), [], date);
    assert.equal(result.diagnostics.duplicates, 2); assert.equal(result.pool.length, 1);
});

test('janela anterior elimina repetição; tema com fato e URL novos permanece', () => {
    const input = fixture.pool().slice(0, 2);
    const result = rankPool(input, defaultSettings(), [{ title: input[0].title, url: input[0].url, date: '2026-10-05' }], date);
    assert.equal(result.diagnostics.previousEditionDuplicates, 1); assert.equal(result.selected.length, 1);
    assert.equal(rankPool([input[1]], defaultSettings(), [{ title: 'Laboratório anuncia curso', url: 'https://example.org/curso', date: '2026-10-05' }], date).selected.length, 1);
});

test('ALTA > MÉDIA > BAIXA, DESLIGADA excluída antes de coleta e IA', () => {
    const settings = defaultSettings(); settings.editorial.tecnologiaIA = 'high'; settings.editorial.desenvolvimento = 'medium'; settings.editorial.concursosCarreira = 'low'; settings.editorial.clima = 'off';
    const result = rankPool(fixture.pool().slice(0, 5), settings, [], date);
    const byCategory = Object.fromEntries(result.pool.map(item => [item.category, item]));
    assert.ok(byCategory.tecnologiaIA.score > byCategory.desenvolvimento.score); assert.ok(byCategory.desenvolvimento.score > byCategory.concursosCarreira.score);
    assert.equal(byCategory.clima, undefined); assert.equal(result.diagnostics.disabledCategories, 1);
    assert.ok(!sourcePlan(settings).some(source => source.categories.length === 1 && source.categories[0] === 'clima'));
});

test('diversidade é uma penalidade progressiva, não cota rígida', () => {
    const result = rankPool(fixture.pool(), defaultSettings(), [], date);
    assert.ok(new Set(result.selected.map(item => item.category)).size >= 4);
    assert.ok(result.selected.some(item => item.score !== item.selectionScore));
});

test('followedTeam recebe boost e clube Remo não é confundido com modalidade', () => {
    const settings = defaultSettings(); settings.followedTeams.push({ id: 'remo', catalogId: 'remo', name: 'Remo', active: true });
    const result = rankPool(fixture.pool().slice(5, 7), settings, [], date);
    assert.ok(result.pool.every(item => item.scoreComponents.followedTeam > 0));
    assert.equal(resolveTeam({ catalogId: 'remo', name: 'Remo' }).name, 'Clube do Remo');
    assert.equal(resolveTeam({ id: 'botafogo-pb', name: 'Botafogo-PB' }), null);
    assert.equal(resolveTeam({ id: 'sport-rowing', name: 'remo olímpico' }), null);
    assert.equal(resolveTeam({ id: 'botafogo' }).geUrl, 'https://ge.globo.com/futebol/times/botafogo/');
    assert.equal(resolveTeam({ id: 'remo' }).geUrl, 'https://ge.globo.com/pa/futebol/times/remo/');
    assert.ok(sourcePlan(settings).some(source => source.teamId === 'remo' && source.id === 'ge-remo'));
});

test('contrato de redação não permite descoberta, URLs novas nem omitir candidatos', async () => {
    const selected = rankPool(fixture.pool().slice(0, 3), defaultSettings(), [], date).selected;
    const request = buildWritingRequest(selected, date);
    assert.equal(request.text.format.schema.properties.noticias.minItems, 3);
    assert.equal(request.text.format.schema.properties.noticias.maxItems, 3);
    assert.equal(request.include, undefined); assert.equal(request.max_tool_calls, undefined);
    assert.match(request.input, /evidence/);
    const result = await run(fixture.pool().slice(0, 3), { patch: body => body.noticias.pop() });
    assert.equal(result.error.code, 'WRITING_SET_MISMATCH'); assert.equal(result.publications, 0); assert.equal(result.calls, 1);
    assert.equal(result.diagnostic.status, 'GENERATED_NOT_PUBLISHED'); assert.ok(result.diagnostic.respostaEditorialBruta);
});

test('texto ou número sem apoio é bloqueado sem retry; resposta paga preservada', async () => {
    for (const segment of ['O produto GPT-999 ganhou 500 recursos.', 'A inflação caiu 99 pontos e abriu vagas.']) {
        const result = await run(fixture.pool().slice(0, 3), { patch: body => { const news = body.noticias[0]; news.speechSummary = segment;
            news.evidenceReferences = news.evidenceReferences.filter(ref => ref.field !== 'speechSummary'); news.evidenceReferences.push({ field: 'speechSummary', segment, evidenceIds: ['e1'] }); } });
        assert.equal(result.error, undefined); assert.equal(result.saved.noticias.length, 2);
        assert.equal(result.calls, 1); assert.equal(result.publications, 1); assert.equal(result.writes, 1);
        assert.equal(result.diagnostic.status, 'PUBLISHED');
        assert.equal(result.result.metrics.editorial.editionStatus, 'SHORT_EDITION');
    }
});

test('trocar negação da evidência ou introduzir nome de produto não é autorizado', () => {
    const candidate = rankPool(fixture.pool().slice(0, 1), defaultSettings(), [], date).selected[0];
    for (const segment of [candidate.evidence[0].text.replace('amplia', 'não amplia'), candidate.evidence[0].text.replace('A biblioteca', 'A biblioteca HydraFusion')]) {
        const news = fixture.writing([candidate]).noticias[0];
        news.speechSummary = segment;
        news.evidenceReferences = news.evidenceReferences.filter(ref => ref.field !== 'speechSummary');
        news.evidenceReferences.push({ field: 'speechSummary', segment, evidenceIds: ['e1'] });
        assert.throws(() => validateWriting(news, candidate), error => error.code === 'FACTUAL_EVIDENCE');
    }
});

test('histórico inclui sétima notícia e evita repetição além do antigo teto de cinco', () => {
    const pool = fixture.pool().slice(0, 7);
    const history = require('../api/recent-news').compactHistory([{ data: '2026-10-05', noticias: pool.map(item => ({ titulo: item.title, url: item.url })) }]);
    assert.equal(history.length, 7);
    assert.equal(rankPool([pool[6]], defaultSettings(), history, date).diagnostics.previousEditionDuplicates, 1);
});

test('redação não pode retirar negação nem transformar possibilidade em lançamento', () => {
    for (const word of ['não ', 'pode ']) {
        const candidate = rankPool(fixture.pool().slice(0, 1), defaultSettings(), [], date).selected[0];
        candidate.evidence[0].text = candidate.evidence[0].text.replace('amplia', word + 'amplia');
        const news = fixture.writing([candidate]).noticias[0];
        const segment = candidate.evidence[0].text.replace(word, '');
        news.speechSummary = segment;
        news.evidenceReferences = news.evidenceReferences.filter(ref => ref.field !== 'speechSummary');
        news.evidenceReferences.push({ field: 'speechSummary', segment, evidenceIds: ['e1'] });
        assert.throws(() => validateWriting(news, candidate), error => error.code === 'FACTUAL_EVIDENCE');
    }
});

test('editorial e fala separados; referência ausente e trecho truncado rejeitados', () => {
    const candidate = rankPool(fixture.pool().slice(0, 1), defaultSettings(), [], date).selected[0];
    const news = fixture.writing([candidate]).noticias[0];
    assert.ok(validateWriting(news, candidate).editorialSummary.includes('\n\n'));
    assert.throws(() => validateWriting({ ...news, evidenceReferences: [] }, candidate), error => error.code === 'FACTUAL_EVIDENCE');
    assert.throws(() => validateWriting({ ...news, speechSummary: 'Texto truncado porque' }, candidate), error => error.code === 'WRITING_INVALID');
});

test('paráfrase factual é permitida e versões com ponto não truncam a evidência', () => {
    const candidate = rankPool(fixture.pool().slice(0, 1), defaultSettings(), [], date).selected[0];
    const news = fixture.writing([candidate]).noticias[0];
    const segment = 'Os testes locais de aplicações foram ampliados pela biblioteca, que permite comparar relatórios entre execuções.';
    news.speechSummary = segment;
    news.evidenceReferences = news.evidenceReferences.filter(ref => ref.field !== 'speechSummary');
    news.evidenceReferences.push({ field: 'speechSummary', segment, evidenceIds: ['e1'] });
    assert.equal(validateWriting(news, candidate).speechSummary, segment);
    const text = 'A documentação do GPT-5.4 descreve exemplos completos para classificação de documentos com modelos de inteligência artificial.';
    assert.equal(require('../api/editorial-pool').evidenceUnits(text)[0].text, text);
});

test('edições antigas preservadas; PWA recebe resumo editorial e Alexa fala própria', async () => {
    for (const old of ['../examples/briefing-teste.json', './fixtures/editorial-edicao-002.json']) assert.equal(validateBriefing(require(old)).noticias.length, 5);
    const result = await run(fixture.pool().slice(0, 5));
    const projected = publicNews(result.saved.noticias);
    assert.equal(projected[0].editorialSummary, result.saved.noticias[0].editorialSummary);
    assert.equal(projected[0].evidenceText, undefined);
    const rendered = renderEditionAudio({ noticias: [{ ...result.saved.noticias[0], roteiroAlexa: 'Texto legado diferente.' }] });
    assert.equal(rendered.edition.roteiroAlexa, result.saved.noticias[0].speechSummary);
});

test('diagnóstico consolidado não expõe secrets nem credenciais de objetos inesperados', async () => {
    let saved, writes = 0;
    const buffer = createDiagnosticBuffer(async value => { writes++; saved = value; }, ['fixture-secret'], { technicalOnly: true });
    buffer.capture({ resultadoEstruturado: { noticias: [] }, metrics: { editorial: { title: 'fixture-secret', Authorization: 'private', cookie: 'private', openAiCalls: 0 } } });
    buffer.candidates([{ candidateId: 'candidate-a', title: 'fixture-secret', status: 'PASS', evidenceCount: 2 }]);
    await buffer.finish(); await buffer.finish(); assert.equal(writes, 1);
    assert.doesNotMatch(JSON.stringify(saved), /fixture-secret|private/);
});

test('falha HTTP da IA não gera retry nem publicação', async () => {
    const result = await run(fixture.pool().slice(0, 2), { httpFailure: true });
    assert.equal(result.error.status, 429); assert.equal(result.calls, 1); assert.equal(result.publications, 0);
});

const source = { id: 'fixture-feed', name: 'Fonte de teste', url: 'https://fixtures.example.org/feed.xml', categories: ['desenvolvimento'], quality: 3, articlePattern: '^/materias/' };
function rss() { return '<rss><channel>' + fixture.pool().map(item => '<item><title>' + item.title + '</title><link>' + item.url + '</link><pubDate>Tue, 06 Oct 2026 08:00:00 GMT</pubDate><description><![CDATA[' + item.evidenceText + ']]></description></item>').join('') + '</channel></rss>'; }

test('feed produz doze candidatos com uma requisição e cache sem Firestore', async () => {
    let requests = 0;
    const collector = createCollector({ includeTeamSources: false, sources: [source], fetchImpl: async () => { requests++; return { ok: true, text: async () => rss() }; } });
    const first = await collector({ settings: defaultSettings(), date });
    assert.equal(first.candidates.length, 12); assert.equal(requests, 1); assert.equal(first.metrics.articleFetches, 0);
    const second = await collector({ settings: defaultSettings(), date });
    assert.equal(requests, 1); assert.equal(second.metrics.cacheHits, 1);
    assert.ok(first.candidates.every(item => item.publishedAt === date && item.evidenceText));
});

test('feeds inseguros e URLs fora do host são rejeitados; data não é inventada', () => {
    assert.throws(() => feedItems('<!DOCTYPE test><rss></rss>', source, date), error => error.code === 'UNSAFE_FEED');
    assert.equal(feedItems(rss().replaceAll('https://fixtures.example.org/materias/', 'https://evil.example.org/materias/'), source, date).length, 0);
    const article = articleMetadata('<h1>Notícia institucional</h1><meta name="description" content="Texto breve.">', 'https://fixtures.example.org/materias/1');
    assert.equal(article.publishedAt, null);
});

test('GE é descoberta; somente matéria do clube fornece candidato final', async () => {
    const ge = { ...source, id: 'ge-botafogo', name: 'GE', url: 'https://ge.globo.com/futebol/times/botafogo/', categories: ['futebol'], articlePattern: '^/futebol/times/botafogo/noticia/', teamId: 'botafogo' };
    const item = fixture.pool()[5], url = ge.url + 'noticia/2026/10/06/treino.ghtml';
    const html = '<a href="' + url + '">' + item.title + '</a><a href="https://evil.example.org/article">Conteúdo não permitido</a>';
    let calls = 0;
    const collector = createCollector({ includeTeamSources: false, sources: [ge], fetchImpl: async address => { calls++; return { ok: true, text: async () => address === ge.url ? html
        : '<script type="application/ld+json">' + JSON.stringify({ '@type': 'NewsArticle', headline: item.title, datePublished: date, description: item.evidenceText }) + '</script>' }; } });
    const result = await collector({ settings: defaultSettings(), date });
    assert.equal(calls, 2); assert.equal(result.candidates.length, 1);
    assert.equal(result.candidates[0].url, url); assert.equal(result.candidates[0].teamId, 'botafogo');
    assert.equal(rankPool(result.candidates, defaultSettings(), [], date).selected.length, 1);
});

test('limites de coleta e resposta impedem chamadas externas ilimitadas', async () => {
    let calls = 0;
    const collector = createCollector({ includeTeamSources: false, sources: [source], limits: { ...require('../api/editorial-v2-config.json'), maxExternalRequests: 1, maxResponseBytes: 10 },
        fetchImpl: async () => { calls++; return { ok: true, text: async () => rss() }; } });
    const result = await collector({ settings: defaultSettings(), date });
    assert.equal(calls, 1); assert.equal(result.candidates.length, 0); assert.equal(result.metrics.collectionWarnings[0].code, 'SOURCE_TOO_LARGE');
});

test('Ship It: anchoring isolado ? warning, mantendo a rastreabilidade obrigat?ria', () => {
 const candidate = rankPool(fixture.pool().slice(0,1),defaultSettings(),[],date).selected[0];
 const news = fixture.writing([candidate]).noticias[0], audit = {};
 const text = 'A biblioteca ajuda na an?lise t?cnica das aplica??es.';
 news.speechSummary = text;
 news.evidenceReferences = news.evidenceReferences.filter(ref => ref.field !== 'speechSummary');
 news.evidenceReferences.push({field:'speechSummary',segment:text,evidenceIds:['e1']});
 assert.doesNotThrow(()=>validateWriting(news,candidate,audit));
 assert.equal(audit.factual,'PASS'); assert.ok(audit.warnings.some(item=>item.code==='ANCHORING_WARNING'));
});
test('Ship It: zero mat?rias seguras n?o publica e n?o repete OpenAI', async () => {
 const result=await run(fixture.pool().slice(0,3),{patch:body=>body.noticias.forEach(news=>{news.speechSummary='O produto GPT-999 ganhou 500 recursos.';news.evidenceReferences=news.evidenceReferences.filter(ref=>ref.field!=='speechSummary');news.evidenceReferences.push({field:'speechSummary',segment:news.speechSummary,evidenceIds:['e1']});})});
 assert.equal(result.error.code,'FACTUAL_EVIDENCE');assert.equal(result.publications,0);assert.equal(result.calls,1);assert.equal(result.diagnostic.status,'GENERATED_NOT_PUBLISHED');
});
