'use strict';
const { createHash } = require('node:crypto');
const { cleanSourceUrl } = require('./source-url');

// Only web tool items are accepted. Message text/annotations and candidate
// evidence fields are never independent source content.
function observedSourceEvidence(response) {
    const records = [];
    for (const action of response.output || []) {
        if (action.type !== 'web_search_call') continue;
        const queries = Array.isArray(action.action?.queries) ? action.action.queries
            : typeof action.action?.query === 'string' ? [action.action.query] : [];
        const sources = action.action?.sources || [];
        for (const source of sources) {
            let url;
            try { url = cleanSourceUrl(source.url); } catch { continue; }
            // These optional content fields are preserved only IF actually
            // returned by the tool. Current production artifacts have URLs only.
            const snippet = typeof source.snippet === 'string' ? source.snippet.slice(0, 4000) : null;
            const retrievedText = typeof source.text === 'string' ? source.text.slice(0, 4000) : null;
            records.push({ sourceId: url, searchActionId: action.id || null,
                observedSourceId: source.id || null, title: typeof source.title === 'string' ? source.title.slice(0, 300) : null,
                url, canonicalUrl: url, domain: new URL(url).hostname, snippet, retrievedText,
                query: queries, status: action.status || null, action: action.action?.type || null,
                contentHash: snippet || retrievedText ? createHash('sha256').update([snippet, retrievedText].filter(Boolean).join('\n')).digest('hex') : null,
                origin: 'WEB_TOOL_OUTPUT', contentAvailable: Boolean(snippet || retrievedText) });
        }
    }
    return records.slice(0, 80);
}
function linkedSources(candidate, observed) {
    if (!Array.isArray(candidate.sourceIds) || !candidate.sourceIds.length || candidate.sourceIds.length > 4) {
        throw Object.assign(new Error('SOURCE_NOT_OBSERVED: candidato sem sourceIds válidos'), { code: 'SOURCE_NOT_OBSERVED' });
    }
    const linked = [];
    for (const id of candidate.sourceIds) {
        const entries = observed.filter(source => source.sourceId === id && source.origin === 'WEB_TOOL_OUTPUT');
        if (!entries.length) throw Object.assign(new Error('SOURCE_NOT_OBSERVED: sourceId não observado'), { code: 'SOURCE_NOT_OBSERVED' });
        linked.push(...entries);
    }
    const url = cleanSourceUrl(candidate.url);
    if (!linked.some(source => source.canonicalUrl === url)) throw Object.assign(new Error('SOURCE_URL_MISMATCH: URL diverge da fonte observada'), { code: 'SOURCE_URL_MISMATCH' });
    if (linked.some(source => source.status !== 'completed')) throw Object.assign(new Error('SOURCE_COLLECTION_INCOMPLETE: fonte em operação não concluída'), { code: 'SOURCE_COLLECTION_INCOMPLETE' });
    return linked;
}
module.exports = { observedSourceEvidence, linkedSources };
