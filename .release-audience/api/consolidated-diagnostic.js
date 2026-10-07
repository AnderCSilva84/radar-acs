'use strict';
const { redact, errorSnapshot, atStage } = require('./diagnostics');

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
                    status: error ? 'FAILED' : 'PUBLISHED', date: options.date || snapshot.resultadoEstruturado?.data || null,
                    editionNumber: options.editionNumber || null,
                    candidatosGerados: generated, candidatosValidos: valid,
                    candidatosRejeitados: candidates.length ? candidates.length - valid : null,
                    publicado: !error,
                    webActions: (snapshot.chamadasWeb || []).map(item => ({
                        id: item.id, action: item.tipoAcao, status: item.status
                    })),
                    candidatos: candidates.filter(item => item.status === 'FAIL').map(item => ({
                        candidateId: /^candidate-\d+$/.test(item.candidateId) ? item.candidateId : 'unknown',
                        stage: item.stage || 'CANDIDATE_VALIDATION',
                        reasonCode: item.reasonCode || 'INVALID_CANDIDATE'
                    })),
                    metrics: snapshot.metrics || null,
                    ...(error ? { erro: errorSnapshot(error, secrets) } : {})
                };
                options.onSummary?.(summary);
                await persist(clean(summary));
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
module.exports = { createDiagnosticBuffer, withConsolidatedDiagnostic };
