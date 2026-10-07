'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fixture = require('./fixtures/generated-response.json');
const { generateAndPublish, metricsFor, buildRequest } = require('./helpers/legacy-generator');
const { retainVerified, hydrateGenerated } = require('../api/briefing-recovery');
const { verifyEvidence } = require('../api/source-evidence');
const { validateBriefing } = require('../api/validation');
const { publishBriefing } = require('../api/publish-briefing');
const date = '2026-10-02';
function candidate() {
    const g = JSON.parse(fixture.output[1].content[0].text);
    g.noticias.forEach(item => {
        item.roteiroAlexa = item.resumo + ' ' + 'informação útil '.repeat(45).trim();
        item.termosEspecificos = [];
    });
    g.roteiroAlexa = g.noticias.map(item => item.roteiroAlexa).join('\n\n');
    g.oportunidadeOrdem = 0;
    g.oportunidadeDoDia = 'Nenhuma oportunidade específica comprovada nesta edição.';
    return g;
}
async function run(invalid, update = () => {}) {
    const g = candidate(); update(g);
    g.noticias.forEach(item => { if (invalid.includes(item.ordem)) item.fonte = ''; });
    const response = structuredClone(fixture);
    response.output[1].content[0].text = JSON.stringify(g);
    let ai = 0, saved = null, checkpoint = null, sources = 0;
    const promise = generateAndPublish({
        apiKey: 'fake', now: () => new Date(date + 'T12:00:00Z'),
        fetchImpl: async () => { ai++; return { ok: true, json: async () => response }; },
        readSource: async url => {
            sources++; const item = g.noticias.find(item => item.url === url);
            return invalid.includes(item.ordem) ? 'Conteúdo sem comprovação' : item.evidencia;
        }, checkpoint: async value => { checkpoint = value; },
        publish: briefing => publishBriefing(briefing, { baseUrl: 'https://example.com', token: 'x'.repeat(40), fetchImpl: async (_url, req) => {
            saved = JSON.parse(req.body); return { ok: true, json: async () => ({ success: true, id: date, publicado: true }) };
        } }), logger: { info() {} }
    });
    try { return { result: await promise, ai, saved, checkpoint, sources, g }; }
    catch (error) { return { error, ai, saved, checkpoint, sources, g }; }
}
for (const [name, invalid, total] of [['cinco válidas', [], 5], ['quatro válidas e uma inválida', [4], 4], ['três válidas e duas inválidas', [2, 4], 3], ['duas válidas', [1, 2, 4], 2], ['uma válida', [1, 2, 3, 4], 1]]) {
    test('Pipeline publica ' + name + ' sem reescrita ou IA adicional (mock)', async () => {
        const r = await run(invalid);
        assert.ifError(r.error); assert.equal(r.saved.noticias.length, total);
        assert.equal(r.ai, 1); assert.equal(r.sources, 0);
        assert.equal(r.checkpoint.status, 'GENERATED_NOT_PUBLISHED');
        assert.equal(r.checkpoint.resultadoEstruturado.noticias.length, 5);
        assert.equal(r.saved.roteiroAlexa, r.g.noticias.filter(item => !invalid.includes(item.ordem)).map(item => item.roteiroAlexa).join('\n\n'));
        assert.deepEqual(r.saved.noticias.map(item => item.ordem), Array.from({ length: total }, (_, i) => i + 1));
    });
}
test('Zero fontes válidas não publica e não chama IA novamente', async () => {
    const r = await run([1, 2, 3, 4, 5]); assert.equal(r.error.code, 'NO_VALID_NEWS');
    assert.equal(r.saved, null); assert.equal(r.ai, 1); assert.equal(r.sources, 0);
});
test('Notícias sem blocos recebem fallback de fala após seleção', async () => {
    const r = await run([4], g => { g.noticias.forEach(item => { delete item.roteiroAlexa; }); });
    assert.ifError(r.error);assert.equal(r.saved.noticias.length,4);assert.ok(r.saved.roteiroAlexa.includes(r.saved.noticias[0].resumo));
});
test('Remoção não mantém referência cruzada nem oportunidade de notícia removida', () => {
    for (const mutate of [g => { g.noticias[2].roteiroAlexa += ' Como mencionei no assunto anterior.'; g.roteiroAlexa = g.noticias.map(n => n.roteiroAlexa).join('\n\n'); }, g => { g.oportunidadeOrdem = 4; }, g => { g.oportunidadeDoDia = 'Aproveitar a notícia removida.'; }]) {
        const g = candidate(); mutate(g);
        assert.throws(() => retainVerified(g, [1, 2, 3, 5]), e => e.code === 'UNSAFE_DETERMINISTIC_RECOVERY');
    }
});
test('Contrato aceita uma a sete, rejeitando zero e oito', () => {
    for (const n of [1, 2, 3, 4, 5, 6, 7]) assert.equal(validateBriefing({ ...candidate(), noticias: Array.from({length:n},(_,i)=>({...candidate().noticias[i%5],ordem:i+1})), publicado: true }).noticias.length, n);
    assert.throws(() => validateBriefing({ ...candidate(), noticias: [], publicado: true }));
    assert.throws(() => validateBriefing({ ...candidate(), noticias: Array.from({length:8},(_,i)=>({...candidate().noticias[i%5],ordem:i+1})), publicado: true }));
});
test('Schema compacto hidrata roteiro, ordem e metadados sem IA', () => {
    const g = candidate(); delete g.data; delete g.titulo; delete g.resumo; delete g.roteiroAlexa;
    g.noticias.forEach(item => { delete item.ordem; });
    assert.equal(hydrateGenerated(g, date).roteiroAlexa, candidate().roteiroAlexa);
    assert.equal(buildRequest(date).text.format.schema.properties.noticias.minItems, 1);
    assert.equal(buildRequest(date).text.format.schema.properties.roteiroAlexa, undefined);
});
test('Métrica conta tool-call entries, não quantidade de queries', () => {
    const m = metricsFor({ model: 'gpt-5.4-mini', output: [{ id: 'ws_1', type: 'web_search_call', action: { type: 'search', queries: ['um', 'dois', 'três', 'quatro'] } }, { id: 'ws_2', type: 'web_search_call', action: { type: 'open_page', url: 'https://example.com' } }] }, 1);
    assert.equal(m.buscasWeb, 1); assert.equal(m.queriesObservadas, 4); assert.equal(m.toolCallsWebIdsDistintos, 2); assert.equal(m.toolCallsWeb, 2);
});
test('Metadados ausentes não viram contagem presumida de queries', () => {
    const m = metricsFor(fixture, 1); assert.equal(m.queriesObservadas, null); assert.equal(m.toolCallsWebIdsDistintos, null);
});
test('Ações web adicionais não bloqueiam por orçamento', async () => {
    const response = structuredClone(fixture);
    const call = response.output[0];
    response.output = [...Array.from({ length: 4 }, (_, i) => ({ ...call, id: 'ws_' + i })), response.output[1]];
    let ai = 0, saved;
    await generateAndPublish({
        apiKey: 'fake', now: () => new Date(date + 'T12:00:00Z'),
        fetchImpl: async () => { ai++; return { ok: true, json: async () => response }; },
        checkpoint: async value => { saved = value; },
        publish: async briefing => assert.equal(briefing.noticias.length,5), logger: { info() {} }
    });
    assert.equal(ai, 1); assert.equal(saved.chamadasWeb.length, 4);
    assert.equal(saved.status, 'GENERATED_NOT_PUBLISHED');
});
test('Categoria genérica não comprova lançamento específico mesmo com trecho coincidente', async () => {
    const evidence = 'We launched GPT-9 Sol for developers with new features and comprehensive documentation today.';
    await assert.rejects(verifyEvidence([{ ordem: 1, titulo: 'OpenAI lançou GPT-9 Sol', resumo: 'Novo modelo.', evidencia: evidence, url: 'https://community.openai.com/c/announcements/6' }], async () => evidence), /categoria\/listagem/);
});
test('Preço, disponibilidade e API exigem afirmação explícita no trecho', async () => {
    const evidence = 'The company published documentation describing its architecture and engineering practices for developers worldwide.';
    for (const title of ['Produto disponível para todos', 'Produto custa US$ 99', 'Nova API para desenvolvedores']) {
        await assert.rejects(verifyEvidence([{ ordem: 1, titulo: title, resumo: 'Atualização técnica.', evidencia: evidence, url: 'https://example.com/article' }], async () => evidence));
    }
});
test('Comunidade é secundária para lançamento e especulação não vira fato', async () => {
    const evidence = 'The company launched GPT-9 Sol with API availability for software developers and engineering teams today.';
    await assert.rejects(verifyEvidence([{ ordem: 1, titulo: 'GPT-9 Sol foi lançado', resumo: 'Modelo disponível.', evidencia: evidence, url: 'https://community.openai.com/t/new-model/123' }], async () => evidence), /secundária/);
    const speculative = 'The company reportedly plans to introduce GPT-9 Sol for software developers and engineering teams later.';
    await assert.rejects(verifyEvidence([{ ordem: 1, titulo: 'GPT-9 Sol foi lançado', resumo: 'Novo modelo.', evidencia: speculative, url: 'https://example.com/article' }], async () => speculative));
});
