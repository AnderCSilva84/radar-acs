'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { canonicalUrl, loadRecentNews, classifyPreviousNews, compactHistory } = require('../api/recent-news');
const { createDiagnosticBuffer, withConsolidatedDiagnostic } = require('../api/consolidated-diagnostic');
const { buildRequest } = require('./helpers/legacy-generator');
const history = [{ title: 'Empresa anuncia produto', url: 'https://example.com/news', date: '2026-10-02' }];

test('URL já publicada e URL canônica equivalente são repetição forte', () => {
    for (const url of ['https://example.com/news', 'https://example.com/news/?utm_source=radar#section']) {
        assert.equal(classifyPreviousNews({ titulo: 'Outra manchete', url }, history).status, 'FAIL');
    }
    assert.notEqual(canonicalUrl('https://example.com/news?version=2'), canonicalUrl('https://example.com/news?version=1'));
});
test('título idêntico normalizado é repetido mesmo com URL diferente', () => {
    assert.equal(classifyPreviousNews({ titulo: 'EMPRESA ANUNCIA PRODUTO!', url: 'https://other.example/article' }, history).status, 'FAIL');
});
test('tema recorrente com URL, data e fato novo permite desenvolvimento relevante', () => {
    const candidate = { titulo: 'Produto recebe nova funcionalidade', url: 'https://example.com/new-feature', dataPublicacao: '2026-10-03',
        allowedFacts: [{ texto: 'Produto recebeu recurso documentado.', evidenciaIndices: [0] }],
        desenvolvimentoNovo: { relevante: true, sourceUrlAnterior: history[0].url, descricao: 'Produto recebeu recurso documentado.', fatoIndex: 0 } };
    assert.equal(classifyPreviousNews(candidate, history).status, 'PASS');
    assert.equal(classifyPreviousNews({ ...candidate, dataPublicacao: '2026-10-02' }, history).status, 'FAIL');
    assert.equal(classifyPreviousNews({ ...candidate, url: history[0].url }, history).status, 'FAIL');
    assert.equal(classifyPreviousNews({ ...candidate, allowedFacts: [] }, history).status, 'FAIL');
});
test('empresa ou tema não bastam para bloquear notícia com título e fonte diferentes', () => {
    assert.equal(classifyPreviousNews({ titulo: 'Empresa publica documentação técnica', url: 'https://example.com/documentation' }, history).status, 'PASS');
});
test('consulta de histórico é limitada a uma edição e projeta somente campos necessários', async () => {
    const calls = []; let queries = 0;
    const query = Object.fromEntries(['where', 'orderBy', 'limit', 'select'].map(method => [method, (...args) => { calls.push([method, ...args]); return query; }]));
    query.get = async () => { queries++; return { docs: [{ data: () => ({ data: '2026-10-02', noticias: [{ titulo: 'Título', url: history[0].url, resumo: 'Texto completo secreto para o prompt' }], roteiroAlexa: 'Roteiro completo' }) }] }; };
    const result = await loadRecentNews({ collection: name => { assert.equal(name, 'briefings'); return query; } });
    assert.equal(queries, 1); assert.ok(calls.some(call => call[0] === 'limit' && call[1] === 1));
    assert.deepEqual(calls.find(call => call[0] === 'select'), ['select', 'data', 'noticias']);
    assert.equal(result.length, 1); assert.equal(result[0].resumo, undefined); assert.equal(result[0].roteiroAlexa, undefined);
    assert.equal(compactHistory([{ data: '2026-10-02', noticias: [] }, { data: '2026-10-01', noticias: [{ titulo: 'Antiga', url: history[0].url }] }]).length, 0);
});
test('prompt envia só títulos URLs datas e mascara parâmetros sensíveis', () => {
    const request = buildRequest('2026-10-03', [{ ...history[0], url: history[0].url + '?token=secret-value', roteiroAlexa: 'NÃO ENVIAR ROTEIRO', resumo: 'NÃO ENVIAR RESUMO' }]);
    assert.ok(request.input.includes(history[0].title));
    assert.ok(!request.input.includes('NÃO ENVIAR')); assert.ok(!request.input.includes('secret-value'));
    assert.ok(!request.input.includes('subject')); assert.equal(request.reasoning.effort, 'low');
});
test('múltiplos candidatos resultam em exatamente uma persistência final sanitizada', async () => {
    let writes = 0, persisted;
    const buffer = createDiagnosticBuffer(async value => { writes++; persisted = value; }, ['secret-short']);
    buffer.capture({ respostaEditorialBruta: 'secret-short', fontes: [{ url: history[0].url }] });
    buffer.candidates(Array.from({ length: 5 }, (_, i) => ({ candidateId: 'candidate-' + i, title: 'Notícia', sourceUrl: history[0].url, status: 'PASS', reason: 'secret-short', evidenceCount: 2, allowedFactsCount: 1 })));
    assert.equal(writes, 0);
    await buffer.finish(); await buffer.finish();
    assert.equal(writes, 1); assert.equal(persisted.candidatos.length, 5); assert.equal(persisted.status, 'PUBLISHED');
    assert.ok(!JSON.stringify(persisted).includes('secret-short'));
    assert.equal(persisted.candidatos[0].sourceUrl, history[0].url);
});
test('falha de validação mantém resposta paga e diagnósticos em uma escrita final', async () => {
    let writes = 0, diagnostic;
    const buffer = createDiagnosticBuffer(async value => { writes++; diagnostic = value; });
    const error = Object.assign(new Error('Menos de três válidas'), { stage: 'FACTUAL_EVIDENCE' });
    await assert.rejects(withConsolidatedDiagnostic(buffer, async () => {
        buffer.capture({ respostaEditorialBruta: 'Resposta preservada' });
        buffer.candidates([{ status: 'FAIL', reason: 'Fonte sem apoio' }]); throw error;
    }), e => e === error);
    assert.equal(writes, 1); assert.equal(diagnostic.status, 'GENERATED_NOT_PUBLISHED');
    assert.equal(diagnostic.erro.etapa, 'FACTUAL_EVIDENCE'); assert.equal(diagnostic.candidatos.length, 1);
});
test('sem resposta paga não cria diagnóstico vazio e falha de persistência não gera retry', async () => {
    let writes = 0;
    const buffer = createDiagnosticBuffer(async () => { writes++; throw new Error('Banco indisponível'); });
    await buffer.finish(); assert.equal(writes, 0);
    buffer.capture({ respostaEditorialBruta: 'Resposta' });
    await assert.rejects(buffer.finish()); await buffer.finish(); assert.equal(writes, 1);
});
test('prompt limita entradas extras e mascara secrets explícitos', () => {
    const recent = Array.from({ length: 20 }, (_, i) => ({ title: 'secret-short notícia ' + i, url: 'https://example.com/' + i, date: '2026-10-02' }));
    const input = buildRequest('2026-10-03', recent, ['secret-short']).input;
    assert.ok(!input.includes('secret-short')); assert.ok(input.includes('[REDACTED]'));
    assert.ok(!input.includes('https://example.com/5'));
});
test('pipeline exclui notícia repetida após conferência factual e consolida uma única vez', async () => {
    const response = structuredClone(require('./fixtures/generated-response.json'));
    const generated = JSON.parse(response.output[1].content[0].text);
    generated.noticias.forEach(n => { n.roteiroAlexa = n.resumo + ' ' + 'informação útil '.repeat(20).trim() + '.'; });
    generated.roteiroAlexa = generated.noticias.map(n => n.roteiroAlexa).join('\n\n');
    generated.oportunidadeOrdem = 0;
    generated.oportunidadeDoDia = 'Nenhuma oportunidade específica comprovada nesta edição.';
    response.output[1].content[0].text = JSON.stringify(generated);
    let queries = 0, ai = 0, writes = 0, diagnostic, published;
    const buffer = createDiagnosticBuffer(async value => { writes++; diagnostic = value; });
    const result = await withConsolidatedDiagnostic(buffer, () => require('./helpers/legacy-generator').generateAndPublish({
        apiKey: 'fake', now: () => new Date('2026-10-02T12:00:00Z'),
        getRecentNews: async () => { queries++; return [{ title: generated.noticias[0].titulo, url: canonicalUrl(generated.noticias[0].url), date: '2026-10-01' }]; },
        fetchImpl: async () => { ai++; return { ok: true, json: async () => response }; },
        readSource: async url => generated.noticias.find(n => n.url === url).evidencia,
        checkpoint: snapshot => buffer.capture(snapshot), evidenceCheckpoint: candidates => buffer.candidates(candidates),
        publish: async briefing => { published = briefing; }, logger: { info() {} }
    }));
    assert.equal(queries, 1); assert.equal(ai, 1); assert.equal(writes, 1);
    assert.equal(result.noticias.length, 4); assert.equal(published.noticias.length, 4);
    assert.equal(diagnostic.candidatos.length, 5); assert.equal(diagnostic.candidatos[0].status, 'FAIL');
    assert.ok(diagnostic.candidatos[0].reason.includes('já publicado'));
});
