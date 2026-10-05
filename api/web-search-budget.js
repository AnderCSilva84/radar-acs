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
    const grouped = [];
    for (const action of actions) {
        const validId = typeof action.id === 'string' && action.id && !action.id.includes('[REDACTED');
        const prior = validId && grouped.find(item => item.id === action.id && item.action === action.action
            && item.status !== action.status && [item.status, action.status].includes('completed'));
        // Only collapse an identifiable intermediate state of the SAME call.
        // Repeated completed entries or redacted IDs do not prove an event transition.
        if (prior) {
            prior.queries = [...new Set([...prior.queries, ...action.queries])];
            prior.status = 'completed';
        } else grouped.push({ ...action });
    }
    const searches = grouped.filter(item => item.action === 'search');
    return {
        toolItems: actions.length,
        toolActions: grouped.length,
        webToolItems: actions.length,
        webSearchActions: searches.length,
        searchActions: searches.length,
        completedSearchActions: searches.filter(item => item.status === 'completed').length,
        inProgressSearchActions: searches.filter(item => ['searching', 'in_progress'].includes(item.status)).length,
        openPageActions: grouped.filter(item => item.action === 'open_page').length,
        pesquisasObservadas: searches.length,
        pesquisasConcluidas: searches.filter(item => item.status === 'completed').length,
        queries: searches.every(item => item.queries.length > 0) ? searches.reduce((count, item) => count + item.queries.length, 0) : null,
        searchQueries: searches.every(item => item.queries.length > 0)
            ? searches.reduce((count, item) => count + item.queries.length, 0) : null,
        classificacaoCompleta: known,
        operacoes: grouped,
        acoes: actions
    };
}
// Compatibility name: telemetry only; never a publication gate.
function assertSearchBudget(items) { return classifyWebActions(items); }
module.exports = { classifyWebActions, assertSearchBudget };
