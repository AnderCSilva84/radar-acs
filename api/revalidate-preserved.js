'use strict';
const { classifyWebActions, assertSearchBudget } = require('./web-search-budget');
const { hydrateGenerated } = require('./briefing-recovery');
const { validateBriefing } = require('./validation');
const { validateAudioScript } = require('./audio-script');
const { validateDistinctNews } = require('./news-duplicates');
const { classifyPreviousNews, compactHistory } = require('./recent-news');
const { assertSpecificSource } = require('./source-url');
const { collectEvidence } = require('./source-evidence');

// Offline-only review: no network or publication dependency is accepted.
async function revalidatePreserved(diagnostic, previousEdition, sourceTexts = {}) {
    const evaluate = fn => { try { return { status: 'PASS', detail: fn() }; } catch (e) { return { status: 'FAIL', code: e.code || null, reason: e.message }; } };
    const generated = hydrateGenerated(diagnostic.resultadoEstruturado, '2026-10-03');
    const web = classifyWebActions(diagnostic.chamadasWeb);
    const budget = evaluate(() => assertSearchBudget(diagnostic.chamadasWeb, 3));
    const contract = evaluate(() => { validateBriefing({ ...generated, audioUrl: null, publicado: true }); return 'Contrato estrutural válido'; });
    const audio = evaluate(() => validateAudioScript(generated));
    const duplicate = evaluate(() => validateDistinctNews(generated.noticias));
    const recent = compactHistory([previousEdition]);
    const factual = await collectEvidence(generated.noticias, async url => {
        if (!Object.hasOwn(sourceTexts, url)) throw new Error('EVIDENCE_SOURCE_TEXT_NOT_PRESERVED: conteúdo independente da página não preservado');
        return sourceTexts[url];
    });
    const candidates = generated.noticias.map(n => {
        const source = evaluate(() => assertSpecificSource(n.url));
        const fact = factual.candidatos.find(c => c.candidateId === 'candidate-' + n.ordem);
        return { title: n.titulo, sourceUrl: source.status === 'PASS' ? source.detail : null,
            sourceStatus: source, contract: contract.status, duplicate: duplicate.status,
            recentNewsDedup: classifyPreviousNews(n, recent), evidence: n.evidencias || [n.evidencia],
            allowedFacts: n.allowedFacts || [], factual: fact };
    });
    return { found: true, web, budget, contract, audio, duplicate, candidates,
        validCandidates: candidates.filter(c => c.sourceStatus.status === 'PASS' && c.factual?.status === 'PASS' && c.recentNewsDedup.status === 'PASS').length,
        publishable: false, publication: 'DISABLED_FOR_HUMAN_REVIEW', roteiroAlexa: generated.roteiroAlexa };
}
module.exports = { revalidatePreserved };
