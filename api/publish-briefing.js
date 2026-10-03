'use strict';

const { validateBriefing } = require('./validation');

async function publishBriefing(input, options = {}) {
    // Toda a validação acontece antes de qualquer requisição ou escrita.
    const briefing = validateBriefing(input);
    const baseUrl = options.baseUrl || process.env.RADAR_API_BASE_URL;
    const token = options.token || process.env.RADAR_ADMIN_TOKEN;
    const fetchImpl = options.fetchImpl || globalThis.fetch;
    let base;

    try {
        base = new URL(baseUrl);
    } catch (error) {
        throw new Error('Configure RADAR_API_BASE_URL com a URL HTTPS da API');
    }

    if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash
        || typeof token !== 'string' || token.length < 32) {
        throw new Error('Configure URL HTTPS e token com pelo menos 32 caracteres');
    }

    let response;
    try {
        response = await fetchImpl(base.href.replace(/\/$/, '') + '/api/briefing', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + token
            },
            body: JSON.stringify(briefing),
            signal: AbortSignal.timeout(15000),
            redirect: 'error'
        });
    } catch (error) {
        // Não propagar erros de transporte que possam conter dados de autenticação.
        throw new Error('Não foi possível acessar a API para publicar o briefing', { cause: error });
    }

    if (!response.ok) {
        const error = new Error('Publicação recusada: HTTP ' + response.status);
        error.status = response.status;
        throw error;
    }

    let result;
    try {
        result = await response.json();
    } catch (error) {
        throw new Error('Resposta de publicação inválida', { cause: error });
    }

    if (!result || result.success !== true || result.id !== briefing.id
        || result.publicado !== briefing.publicado) {
        throw new Error('Resposta de publicação inválida');
    }

    return { success: true, id: result.id, publicado: result.publicado };
}

module.exports = { publishBriefing };
