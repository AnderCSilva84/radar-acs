'use strict';

// Contar operações search, não open_page nem número de queries por operação.
function classifyWebActions(items) {
    const actions = items.map(item => ({
        tipo: item.type || 'web_search_call',
        id: item.id || null,
        status: item.status || null,
        action: item.action?.type || item.tipoAcao || null,
        queries: Array.isArray(item.action?.queries) ? item.action.queries
            : typeof item.action?.query === 'string' ? [item.action.query]
                : Array.isArray(item.queries) ? item.queries : []
    }));
    const known = actions.every(item => item.tipo === 'web_search_call'
        && ['search', 'open_page'].includes(item.action));
    const searches = actions.filter(item => item.action === 'search');
    return {
        toolItems: actions.length,
        toolActions: actions.length,
        pesquisasObservadas: searches.length,
        pesquisasConcluidas: searches.filter(item => item.status === 'completed').length,
        searchQueries: searches.every(item => item.queries.length > 0)
            ? searches.reduce((count, item) => count + item.queries.length, 0) : null,
        classificacaoCompleta: known,
        acoes: actions
    };
}
function assertSearchBudget(items, limit) {
    const result = classifyWebActions(items);
    if (!result.classificacaoCompleta || result.pesquisasObservadas > limit) {
        const error = new Error(!result.classificacaoCompleta
            ? 'Metadados insuficientes para classificar ações web; publicação bloqueada'
            : 'Quantidade observada de operações search excedeu o orçamento');
        error.code = !result.classificacaoCompleta ? 'WEB_TOOL_METADATA_INCOMPLETE' : 'WEB_TOOL_BUDGET_EXCEEDED';
        error.stage = 'WEB_SEARCH_BUDGET';
        throw error;
    }
    return result;
}
module.exports = { classifyWebActions, assertSearchBudget };
