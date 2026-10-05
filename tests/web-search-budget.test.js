'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { assertSearchBudget } = require('../api/web-search-budget');
const searches = Array.from({ length: 3 }, (_, i) => ({ type: 'web_search_call', id: 'ws_' + i, status: 'completed', action: { type: 'search', queries: ['a', 'b', 'c', 'd'] } }));
test('Três pesquisas com doze queries e open_page auxiliar cabem no orçamento', () => {
    const result = assertSearchBudget([...searches, { type: 'web_search_call', status: 'searching', action: { type: 'open_page' } }], 3);
    assert.equal(result.toolItems, 4); assert.equal(result.toolActions, 4);
    assert.equal(result.pesquisasObservadas, 3); assert.equal(result.pesquisasConcluidas, 3);
    assert.equal(result.searchQueries, 12);
});
test('Quarta operação search é telemetria e não gate', () => {
    assert.equal(assertSearchBudget([...searches, searches[0]], 3).searchActions, 4);
});
test('Evento desconhecido ou sem action não é presumido auxiliar', () => {
    for (const item of [{ type: 'web_search_call' }, { type: 'web_search_call', action: { type: 'unknown' } }]) {
        assert.equal(assertSearchBudget([...searches, item], 3).classificacaoCompleta, false);
    }
});
test('Formato sanitizado persistido distingue search de open_page sem depender de ID', () => {
    const result = assertSearchBudget([...searches.map(item => ({ tipoAcao: 'search', status: 'completed', queries: item.action.queries, id: '[REDACTED_OPAQUE_VALUE]' })), { tipoAcao: 'open_page', status: 'searching', queries: [] }], 3);
    assert.equal(result.pesquisasObservadas, 3);
});
