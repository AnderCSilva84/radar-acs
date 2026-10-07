'use strict';
const { linkedSources } = require('./source-evidence-store');
const { collectEvidence, validateDerivedClaims } = require('./source-evidence');
const { cleanSourceUrl, assertSpecificSource } = require('./source-url');

async function collectObservedEvidence(news, observed) {
    const all = { resultado: 'PASS', noticias: [], rejeitadas: [], candidatos: [], warnings: [], leiturasFontes: 0 };
    for (const candidate of news) {
        try {
            const linked = linkedSources(candidate, observed);
            const content = linked.flatMap(source => [source.snippet, source.retrievedText]).filter(Boolean);
            assertSpecificSource(candidate.url);
            if (!content.length) {
                // Missing independent text is an explicit policy warning,
                // not proof that the model's evidence was independently verified.
                validateDerivedClaims(candidate, candidate.evidencias ?? [candidate.evidencia]);
                const reason = 'SOURCE_CONTENT_UNAVAILABLE: conteúdo independente não disponível; verificações derivadas aprovadas';
                all.warnings.push({ ordem: candidate.ordem, code: 'SOURCE_CONTENT_UNAVAILABLE', reason });
                all.noticias.push({ ordem: candidate.ordem, fonte: candidate.fonte, url: cleanSourceUrl(candidate.url), evidencia: candidate.evidencia, resultado: 'WARNING', independentlyVerified: false });
                all.candidatos.push({ candidateId: 'candidate-' + candidate.ordem, title: candidate.titulo, sourceUrl: cleanSourceUrl(candidate.url),
                    status: 'WARNING', reason, evidenceCount: candidate.evidencias?.length || 0, allowedFactsCount: candidate.allowedFacts?.length || 0 });
                continue;
            }
            const result = await collectEvidence([{ ...candidate, url: cleanSourceUrl(candidate.url) }], async () => content.join('\n'));
            all.noticias.push(...result.noticias); all.rejeitadas.push(...result.rejeitadas); all.candidatos.push(...result.candidatos);
        } catch (error) {
            all.rejeitadas.push({ ordem: candidate.ordem, code: error.code || 'FACTUAL_EVIDENCE_UNCONFIRMED', motivo: error.message });
            all.candidatos.push({ candidateId: 'candidate-' + candidate.ordem, title: candidate.titulo, sourceUrl: candidate.url,
                status: 'FAIL', stage: 'FACTUAL_EVIDENCE', reasonCode: error.code || 'FACTUAL_EVIDENCE_UNCONFIRMED', reason: error.message, evidenceCount: candidate.evidencias?.length || 0, allowedFactsCount: candidate.allowedFacts?.length || 0 });
        }
    }
    all.resultado = all.rejeitadas.length ? 'PARTIAL' : all.warnings.length ? 'WARNING' : 'PASS';
    return all;
}
module.exports = { collectObservedEvidence };
