'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { assertSearchBudget, classifyWebActions } = require('../api/web-search-budget');
const { cleanSourceUrl, isSpecificSource } = require('../api/source-url');
const { revalidatePreserved } = require('../api/revalidate-preserved');
const search = (id, status, queries = ['um', 'dois']) => ({ id, type: 'web_search_call', status, action: { type: 'search', queries } });

test('search concluída, em progresso e queries são métricas separadas', () => {
    const m = classifyWebActions([search('a', 'completed'), search('b', 'searching')]);
    assert.equal(m.searchActions, 2); assert.equal(m.completedSearchActions, 1);
    assert.equal(m.inProgressSearchActions, 1); assert.equal(m.queries, 4);
});
test('estado intermediário com mesmo ID não conta a operação duas vezes', () => {
    const m = assertSearchBudget([search('a', 'searching'), search('a', 'completed'), search('b', 'completed'), search('c', 'completed')], 3);
    assert.equal(m.webToolItems, 4); assert.equal(m.searchActions, 3); assert.equal(m.queries, 6);
});
test('quarta search em progresso é contabilizada sem bloquear', () => {
    assert.equal(assertSearchBudget([search('a', 'completed'), search('b', 'completed'), search('c', 'completed'), search('d', 'searching')], 3).searchActions, 4);
});
test('IDs mascarados não autorizam presumir que uma ação é evento intermediário', () => {
    assert.equal(assertSearchBudget([search('[REDACTED_OPAQUE_VALUE]', 'completed'), search('[REDACTED_OPAQUE_VALUE]', 'completed'), search('[REDACTED_OPAQUE_VALUE]', 'completed'), search('[REDACTED_OPAQUE_VALUE]', 'searching')], 3).searchActions, 4);
});
test('open_page não é search e múltiplas queries não excedem orçamento de operações', () => {
    const m = assertSearchBudget([search('a', 'completed', Array(16).fill('consulta')), { id: 'b', type: 'web_search_call', status: 'completed', action: { type: 'open_page' } }], 1);
    assert.equal(m.searchActions, 1); assert.equal(m.openPageActions, 1); assert.equal(m.queries, 16);
});
test('página específica aceita e homepage ou índice genérico rejeitados', () => {
    assert.equal(isSpecificSource('https://github.blog/changelog/2026-10-02-feature/'), true);
    assert.equal(isSpecificSource('https://github.blog/?utm_source=openai'), false);
    assert.equal(isSpecificSource('https://github.blog/changelog/'), false);
});
test('limpeza remove somente utm e fragmentos, mantendo parâmetros funcionais', () => {
    assert.equal(cleanSourceUrl('https://example.com/article?utm_source=x&utm_medium=y&utm_campaign=z&version=2#section'), 'https://example.com/article?version=2');
});
test('revalidação offline não chama fetch, não publica e não supõe conteúdo de fonte', async () => {
    const fixture = require('./fixtures/generated-response.json');
    const generated = JSON.parse(fixture.output[1].content[0].text);
    const previous = require('./fixtures/editorial-edicao-002.json');
    generated.data = '2026-10-03'; generated.titulo = 'Radar ACS - 03/10/2026';
    const result = await revalidatePreserved({ resultadoEstruturado: generated, chamadasWeb: [search('a', 'completed')] }, previous);
    assert.equal(result.publication, 'DISABLED_FOR_HUMAN_REVIEW'); assert.equal(result.publishable, false);
    assert.ok(result.candidates.every(c => c.factual.status === 'FAIL'));
    assert.ok(result.candidates.every(c => c.factual.reason.includes('EVIDENCE_SOURCE_TEXT_NOT_PRESERVED')));
});
