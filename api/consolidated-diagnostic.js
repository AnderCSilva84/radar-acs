'use strict';
const { redact, errorSnapshot, atStage } = require('./diagnostics');

function sanitizeDiagnostic(value, secrets = [], key = '') {
    if (/authorization|cookie|password|credential|api.?key|admin.?token|id.?token/i.test(key)) return '[REDACTED]';
    if (value === 'WEB_COLLECTION_INCOMPLETE_WARNING' && !secrets.includes(value)) return value;
    if (typeof value === 'string') return redact(value, secrets);
    if (Array.isArray(value)) return value.map(item => sanitizeDiagnostic(item, secrets));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, sanitizeDiagnostic(item, secrets, name)]));
    return value;
}

function createDiagnosticBuffer(persist, secrets = [], options = {}) {
    let snapshot, candidates = [], persisted = false;
    const clean = value => {
        if (value === 'WEB_COLLECTION_INCOMPLETE_WARNING' && !secrets.includes(value)) return value;
        if (typeof value === 'string') return redact(value, secrets);
        if (Array.isArray(value)) return value.map(clean);
        if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clean(item)]));
        return value;
    };
    return {
        capture(value) { snapshot = value; },
        candidates(value) { candidates = value; },
        async finish(error) {
            if (!snapshot || persisted) return;
            persisted = true; // A failed write is not retried automatically.
            if (options.technicalOnly) {
                const generated = snapshot.resultadoEstruturado?.noticias?.length ?? null;
                const valid = candidates.length ? candidates.filter(item => ['PASS', 'WARNING'].includes(item.status)).length : null;
                const summary = {
                    status: error ? (snapshot.metrics?.editorial?.openAiCalls && snapshot.respostaEditorialBruta ? 'GENERATED_NOT_PUBLISHED' : 'FAILED') : 'PUBLISHED', date: options.date || snapshot.resultadoEstruturado?.data || null,
                    editionNumber: options.editionNumber || null,
                    candidatosGerados: generated, candidatosValidos: valid,
                    candidatosRejeitados: candidates.length ? candidates.length - valid : null,
                    publicado: !error,
                    webActions: (snapshot.chamadasWeb || []).map(item => ({
                        id: item.id, action: item.tipoAcao, status: item.status
                    })),
                    candidatos: candidates.filter(item => snapshot.metrics?.editorial || item.status === 'FAIL').map(item => ({
                        candidateId: /^candidate-[a-z0-9]{1,20}$/.test(item.candidateId) ? item.candidateId : 'unknown',
                        stage: item.stage || 'CANDIDATE_VALIDATION',
                        reasonCode: item.reasonCode || (snapshot.metrics?.editorial ? null : 'INVALID_CANDIDATE'),
                        ...(snapshot.metrics?.editorial ? { title: item.title || '', sourceUrl: item.sourceUrl || null, status: item.status,
                            reason: item.reason || item.reasonCode || null, evidenceCount: item.evidenceCount || 0,
                            allowedFactsCount: item.allowedFactsCount || 0, score: item.score ?? null, category: item.category || null, priority: item.priority || null,
                            selectedForWriting: item.selectedForWriting === true, selectionScore: item.selectionScore ?? null,
                            scoreComponents: item.scoreComponents || null, selectionReason: item.selectionReason || null } : {})
                    })),
                    metrics: snapshot.metrics || null,
                    ...(snapshot.metrics?.editorial ? { editorial: snapshot.metrics.editorial, feedCandidates: snapshot.feedCandidates || [],
                        ...(error && snapshot.respostaEditorialBruta ? { respostaEditorialBruta: snapshot.respostaEditorialBruta,
                            resultadoEstruturado: snapshot.resultadoEstruturado, editorialPool: snapshot.editorialPool } : {}) } : {}),
                    ...(error ? { erro: errorSnapshot(error, secrets) } : {})
                };
                const safeSummary = sanitizeDiagnostic(clean(summary), secrets);
                options.onSummary?.(safeSummary);
                await persist(safeSummary);
                return;
            }
            await persist(clean({ ...snapshot, candidatos: candidates,
                status: error ? 'GENERATED_NOT_PUBLISHED' : 'PUBLISHED',
                ...(error ? { erro: errorSnapshot(error, secrets) } : {}) }));
        }
    };
}

async function withConsolidatedDiagnostic(buffer, operation, logger = console) {
    let error;
    try { return await operation(); }
    catch (caught) { error = caught; throw caught; }
    finally {
        try { await buffer.finish(error); }
        catch (failure) {
            if (!error) throw atStage(failure, 'FIRESTORE_EXECUTION_LOG');
            logger.error('Falha ao persistir diagnóstico consolidado', { etapa: 'FIRESTORE_EXECUTION_LOG' });
        }
    }
}
module.exports = { createDiagnosticBuffer, withConsolidatedDiagnostic, sanitizeDiagnostic };
