'use strict';

function redact(value, secrets = []) {
    let text = String(value ?? '');
    for (const secret of secrets) {
        if (typeof secret === 'string' && secret) text = text.split(secret).join('[REDACTED]');
    }
    text = text
        .replace(/authorization[^\r\n]*/gi, '[REDACTED_HEADER]')
        .replace(/\b(?:set-cookie|cookie)\s*:[^\r\n]*/gi, '[REDACTED_COOKIE]')
        .replace(/\bBearer\s+[^\s"',}]+/gi, 'Bearer [REDACTED]')
        .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_ID_TOKEN]')
        .replace(/\bsk-[A-Za-z0-9_-]+/g, '[REDACTED_API_KEY]')
        .replace(/(?:OPENAI_API_KEY|RADAR_ADMIN_TOKEN|password|credential|secret)\s*[:=]\s*[^\s,;}]+/gi, '[REDACTED_SECRET]');
    // Preserve public URL paths, but remove credentials and sensitive parameters.
    // Placeholders are created locally, never supplied by the exception/content.
    const urls = [];
    const prefix = 'URL_' + require('node:crypto').randomBytes(8).toString('hex') + '_';
    text = text.replace(/https?:\/\/[^\s<>"']+/gi, raw => {
        let url;
        try { url = new URL(raw); }
        catch { return '[REDACTED_INVALID_URL]'; }
        if (url.username || url.password) {
            url.username = ''; url.password = '';
        }
        const sensitive = /token|secret|password|passwd|credential|authorization|cookie|signature|api[-_]?key|access[-_]?key|session|^auth$|^key$|^code$|^sig$|^x-(?:goog|amz)-/i;
        let changed = url.href !== raw && (raw.includes('@'));
        for (const key of [...url.searchParams.keys()]) {
            const values = url.searchParams.getAll(key);
            if (sensitive.test(key) || values.some(value =>
                /\b(?:Bearer\s|sk-[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/i.test(value)
                || secrets.some(secret => typeof secret === 'string' && secret && value.includes(secret)))) {
                url.searchParams.set(key, '[REDACTED]'); changed = true;
            }
        }
        if (url.hash && /(?:token|secret|password|credential|cookie|authorization|api[-_]?key|access[-_]?key|session|auth|code)\s*=/i.test(url.hash)) {
            url.hash = '[REDACTED]'; changed = true;
        }
        urls.push(changed ? url.href : raw);
        return prefix + (urls.length - 1) + '_END';
    });
    text = text.replace(/[A-Za-z0-9_+\/-]{32,}={0,2}/g, '[REDACTED_OPAQUE_VALUE]');
    return text.replace(new RegExp(prefix + '(\\d+)_END', 'g'), (_, index) => urls[Number(index)]);
}

function errorSnapshot(error, secrets = [], depth = 0, seen = new Set()) {
    const object = error && typeof error === 'object';
    const result = {
        etapa: redact(object && error.stage || 'UNKNOWN', secrets).slice(0, 100),
        name: redact(object ? error.name || 'Error' : 'ThrownValue', secrets).slice(0, 100),
        message: redact(object ? error.message || 'Exceção sem mensagem' : error, secrets).slice(0, 600),
        code: object && error.code !== undefined ? redact(error.code, secrets).slice(0, 100) : null,
        tipo: typeof error,
        tipoExcecao: object ? redact(error.constructor?.name || 'Object', secrets).slice(0, 100) : typeof error,
        validacao: object && error.validation ? redact(error.validation, secrets).slice(0, 120) : null,
        httpStatus: object && Number.isInteger(error.status) ? error.status : null
    };
    // Nunca serializar stack, request, response, config ou headers.
    if (object && error.cause && depth < 2 && !seen.has(error.cause)) {
        seen.add(error);
        result.cause = errorSnapshot(error.cause, secrets, depth + 1, seen);
    }
    return result;
}

function atStage(error, stage) {
    if (!(error instanceof Error)) error = new Error('Valor lançado fora do padrão Error', { cause: error });
    if (!error.stage) error.stage = stage;
    if (error.stage === 'BRIEFING_VALIDATION' && !error.validation) {
        error.validation = 'contrato_editorial_ou_playback';
    }
    return error;
}

async function stage(stageName, operation) {
    try { return await operation(); }
    catch (error) { throw atStage(error, stageName); }
}

function diagnosticSnapshot(response, generated, metrics, secrets = []) {
    const clean = (value, key = '') => {
        if (typeof value === 'string') return redact(value, secrets).slice(0, key === 'roteiroAlexa' ? 20000 : key === 'data' || key === 'dataPublicacao' ? 20 : 2000);
        if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
        if (Array.isArray(value)) return value.slice(0, 8).map(item => clean(item));
        if (value && typeof value === 'object') {
            const fields = ['data', 'titulo', 'resumo', 'roteiroAlexa', 'noticias', 'oportunidadeDoDia', 'ordem', 'contexto', 'fonte', 'url', 'dataPublicacao', 'evidencia', 'termosEspecificos', 'oportunidadeOrdem', 'evidencias', 'allowedFacts', 'texto', 'evidenciaIndices', 'desenvolvimentoNovo', 'relevante', 'sourceUrlAnterior', 'descricao', 'fatoIndex', 'sourceIds'];
            return Object.fromEntries(fields.filter(key => Object.hasOwn(value, key)).map(key => [key, clean(value[key], key)]));
        }
        return null;
    };
    const output = Array.isArray(response.output) ? response.output : [];
    const sources = output.filter(item => item.type === 'web_search_call').flatMap(item => item.action?.sources || []).slice(0, 80).map(source => ({ url: redact(source.url || '', secrets).slice(0, 2000) }));
    return {
        status: 'GENERATED_NOT_PUBLISHED',
        respostaEditorialBruta: redact(output.filter(item => item.type === 'message').flatMap(item => item.content || []).filter(item => item.type === 'output_text').map(item => item.text).join(''), secrets).slice(0, 100000),
        resultadoEstruturado: clean(generated),
        fontes: sources,
        sourceEvidence: require('./source-evidence-store').observedSourceEvidence(response).map(source => Object.fromEntries(Object.entries(source).map(([key, value]) => [key,
            key === 'contentHash' ? value : key === 'searchActionId' || key === 'observedSourceId' ? (value ? 'id-' + require('node:crypto').createHash('sha256').update(String(value)).digest('hex').slice(0, 16) : null)
            : typeof value === 'string' ? redact(value, secrets) : Array.isArray(value) ? value.map(item => redact(item, secrets)) : value]))),
        chamadasWeb: output.filter(item => item.type === 'web_search_call').map(item => ({ id: redact(item.id || '', secrets), status: redact(item.status || '', secrets), tipoAcao: redact(item.action?.type || '', secrets), queries: (Array.isArray(item.action?.queries) ? item.action.queries : typeof item.action?.query === 'string' ? [item.action.query] : []).map(query => redact(query, secrets).slice(0, 1000)) })),
        responseStatus: redact(response.status || '', secrets),
        responseId: redact(response.id || '', secrets),
        metrics
    };
}
module.exports = { redact, errorSnapshot, atStage, stage, diagnosticSnapshot };
