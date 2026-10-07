'use strict';

const { normalize } = require('./news-duplicates');
// Explicit technical equivalences only; no fuzzy matching for named entities.
function canonical(text) {
    return normalize(text).replace(/\b(?:artificial intelligence|inteligencia artificial|ai|ia)\b/g, 'ia');
}
const stop = new Set('a o os as um uma de da do das dos em no na nos nas ao aos e ou para por com que se foi sua seu esta este isso essa esse mais como sobre pelo pela tambem ja hoje agora ele ela'.split(' '));
const plurals = new Map(['documento', 'relatorio', 'ferramenta', 'revisor', 'modelo', 'noticia'].map(word => [word + 's', word]));
function words(text) {
    // Lexical anchoring only: this does not singularise entity identifiers.
    return canonical(text).split(' ').filter(word => word.length > 2 && !stop.has(word)).map(word => plurals.get(word) || word);
}
function overlap(claim, evidence) {
    const tokens = words(claim), available = new Set(words(evidence));
    return tokens.length ? tokens.filter(token => available.has(token)).length / tokens.length : 0;
}
// Only compare operators in the most closely anchored sentence/clause. An extra
// reference is not allowed to invert an otherwise unrelated factual statement.
function relevant(claim, evidence) {
    const clauses = evidence.split(/[.!?;](?=\s|$)|,\s*mas\s+|:\s+/).filter(text => words(text).length);
    const scores = clauses.map(text => ({ text, score: overlap(claim, text) }));
    const best = Math.max(0, ...scores.map(item => item.score));
    return scores.filter(item => item.score >= Math.max(0.35, best * 0.8)).map(item => item.text).join(' ');
}
function negated(text) { return /\b(?:nao|nunca|jamais|nenhum|nenhuma|sem)\b/.test(canonical(text)); }
function modality(text) {
    // "previsto na MP/lei" describes an existing normative provision, not a forecast.
    const value = canonical(text).replace(/\bprevist[oa]s? (?:na|no|pela|pelo) (?:mp|lei|decreto|norma|regulamento)\b/g, 'disposto');
    if (/\b(?:pode|podem|podera|poderao|possibilidade|preve|previsto|prevista|planeja|planejado|estuda|propoe|pretende|pretendem|estimativa|estimado|estimada|talvez)\b/.test(value)) return 'POSSIBLE';
    if (/\b(?:deve|devem|obrigatorio|obrigatoria)\b/.test(value)) return 'OBLIGATION';
    return 'ASSERTED';
}
function finalStatus(result) {
    return !result.error && ['factual', 'numeric', 'identifier', 'negation', 'modality', 'url', 'source'].every(key => result[key] === 'PASS') ? 'PASS' : 'FAIL';
}
module.exports = { canonical, words, overlap, relevant, negated, modality, finalStatus };
