'use strict';

const { validateBriefing, validateNewsItem } = require('./validation');
const config = require('./generator-config.json');
const { hydrateGenerated } = require('./briefing-recovery');
const { classifyWebActions } = require('./web-search-budget');
const { cleanSourceUrl } = require('./source-url');
const { observedSourceEvidence } = require('./source-evidence-store');
const { validateAudioScript } = require('./audio-script');
const { renderEditionAudio } = require('./audio-rendering');
const { validateDistinctNews } = require('./news-duplicates');
const { classifyPreviousNews } = require('./recent-news');
const { prompt: voicePrompt, validateVoice } = require('./voice-guide');
const { estimatedDurationSeconds } = require('./narration-duration');
const { atStage, stage, diagnosticSnapshot, redact } = require('./diagnostics');
const { electionPrompt, validateElection } = require('./edition-context');

function editorialDate(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: config.timezone, year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(now);
    const get = type => parts.find(part => part.type === type).value;
    return get('year') + '-' + get('month') + '-' + get('day');
}

function buildRequest(date, selected = [], secrets = [], context = {}) {
    return require('./editorial-v2-generator').buildWritingRequest(selected, date, context, secrets);
}

async function requestOpenAI(body, apiKey, fetchImpl = globalThis.fetch) {
    if (typeof apiKey !== 'string' || !apiKey) throw new Error('Segredo OpenAI indisponível');
    let response;
    try {
        response = await fetchImpl('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(config.timeoutMs),
            redirect: 'error'
        });
    } catch (error) {
        throw new Error('Falha de transporte na geração OpenAI', { cause: error });
    }
    if (!response.ok) {
        const error = new Error('OpenAI recusou a geração: HTTP ' + response.status);
        error.status = response.status;
        throw error;
    }
    try { return await response.json(); }
    catch (error) { throw atStage(new Error('Resposta OpenAI inválida', { cause: error }), 'OPENAI_RESPONSE_PARSE'); }
}

function metricsFor(response, elapsedMs) {
    const usage = response.usage || {};
    const input = usage.input_tokens || 0;
    const cached = usage.input_tokens_details?.cached_tokens || 0;
    const output = usage.output_tokens || 0;
    const webCalls = (response.output || []).filter(item => item.type === 'web_search_call');
    const searchCalls = webCalls.filter(item => item.action?.type === 'search');
    const searches = searchCalls.length;
    const queryCounts = searchCalls.map(item => Array.isArray(item.action?.queries) ? item.action.queries.length : typeof item.action?.query === 'string' ? 1 : null);
    const classification = classifyWebActions(webCalls);
    const prices = config.prices;
    const knownPrice = response.model === config.model || response.model?.startsWith(config.model + '-');
    const estimate = knownPrice && response.usage
        ? ((input - cached) * prices.inputPerMillionUsd + cached * prices.cachedInputPerMillionUsd + output * prices.outputPerMillionUsd) / 1000000 + searches * prices.webSearchPerCallUsd
        : null;
    return {
        webToolItems: classification.webToolItems,
        webSearchActions: classification.webSearchActions,
        completedSearchActions: classification.completedSearchActions,
        inProgressSearchActions: classification.inProgressSearchActions,
        queries: classification.queries,
        openPageActions: classification.openPageActions,
        modelo: response.model || config.model,
        tokensEntrada: usage.input_tokens ?? null,
        tokensEntradaCache: usage.input_tokens_details?.cached_tokens ?? null,
        tokensSaida: usage.output_tokens ?? null,
        tokensTotal: usage.total_tokens ?? ((usage.input_tokens != null && usage.output_tokens != null) ? input + output : null),
        chamadasOpenAI: 1,
        tokensRaciocinio: usage.output_tokens_details?.reasoning_tokens ?? null,
        buscasWeb: searches,
        unidadeBuscasWeb: 'itens_web_search_call_action_search',
        toolCallsWeb: webCalls.length,
        toolCallsWebIdsDistintos: webCalls.every(item => typeof item.id === 'string') ? new Set(webCalls.map(item => item.id)).size : null,
        queriesObservadas: queryCounts.every(value => value !== null) ? queryCounts.reduce((sum, value) => sum + value, 0) : null,
        limiteToolCallsSolicitado: config.maxToolCalls,
        duracaoGeracaoMs: elapsedMs,
        custoEstimadoUsd: estimate === null ? null : Number(estimate.toFixed(6))
    };
}

function parseResponse(response) {
    if (response.status !== 'completed') throw new Error('Geração incompleta; publicação cancelada');
    const output = response.output || [];
    const calls = output.filter(item => item.type === 'web_search_call' && item.status === 'completed');
    if (!calls.some(item => item.action?.type === 'search')) throw new Error('Pesquisa web não comprovada; publicação cancelada');
    const urls = new Set();
    for (const call of calls) {
        for (const source of call.action?.sources || []) {
            if (source.url) try { urls.add(cleanSourceUrl(source.url)); } catch { /* Reject unobserved invalid URLs later. */ }
        }
        if (call.action?.url) urls.add(call.action.url.replace(/#.*$/, ''));
    }
    const texts = [];
    for (const item of output) {
        if (item.type !== 'message') continue;
        for (const content of item.content || []) {
            if (content.type === 'refusal') throw new Error('Geração recusada; publicação cancelada');
            if (content.type === 'output_text') {
                texts.push(content.text);
                for (const annotation of content.annotations || []) {
                    if (annotation.type === 'url_citation' && annotation.url) try { urls.add(cleanSourceUrl(annotation.url)); } catch { /* Invalid citation URL. */ }
                }
            }
        }
    }
    let generated;
    try { generated = JSON.parse(texts.join('')); }
    catch (error) { throw atStage(new Error('JSON editorial inválido; publicação cancelada', { cause: error }), 'OPENAI_RESPONSE_PARSE'); }
    if (!generated || typeof generated !== 'object' || Array.isArray(generated)) {
        throw atStage(new Error('Resultado estruturado deve ser um objeto'), 'STRUCTURED_OUTPUT');
    }
    return { generated, urls };
}

function validateCollectedNews(news, urls, date) {
    validateNewsItem({ ...news, ordem: 1, contexto: news.contexto || news.resumo });
    const published = news.dataPublicacao;
    if (typeof published !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(published)
        || !Number.isFinite(Date.parse(published)) || new Date(published).toISOString().slice(0, 10) !== published
        || Date.parse(published) < Date.parse(date) - 3 * 86400000 || published > date) {
        throw new Error('Notícia sem data recente válida');
    }
    if (!urls.has(cleanSourceUrl(news.url))) throw new Error('URL de notícia não consta nas fontes da pesquisa');
}

function validateGenerated(generated, urls, date) {
    if (generated.data !== date) throw new Error('Data editorial diferente da data atual');
    const displayDate = date.split('-').reverse().join('/');
    if (generated.titulo !== 'Radar ACS - ' + displayDate) throw new Error('Título da edição inválido');
    const cutoff = Date.parse(date) - 3 * 86400000;
    if (!Array.isArray(generated.noticias)) throw new Error('Notícias ausentes');
    for (const news of generated.noticias) {
        const published = news.dataPublicacao;
        if (typeof published !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(published)
            || !Number.isFinite(Date.parse(published)) || new Date(published).toISOString().slice(0, 10) !== published
            || Date.parse(published) < cutoff || published > date) {
            throw new Error('Notícia sem data recente válida');
        }
        if (typeof news.url !== 'string' || !urls.has(cleanSourceUrl(news.url))) {
            throw new Error('URL de notícia não consta nas fontes da pesquisa');
        }
    }
    validateDistinctNews(generated.noticias);
    const briefing = validateBriefing({ ...generated, audioUrl: null, publicado: true });
    validateAudioScript(generated);
    return briefing;
}

function parseAndValidate(response, date) {
    let parsed;
    try { parsed = parseResponse(response); }
    catch (error) { throw atStage(error, 'STRUCTURED_OUTPUT'); }
    try { return validateGenerated(renderEditionAudio(hydrateGenerated(parsed.generated, date)).edition, parsed.urls, date); }
    catch (error) { throw atStage(error, 'BRIEFING_VALIDATION'); }
}

// V2 is the only production generation engine. Legacy parsers above read preserved responses.
async function generateRadarEdition(options) {
    return require('./editorial-v2-generator').generateEditorialEdition(options);
}

module.exports = { editorialDate, buildRequest, metricsFor, requestOpenAI, parseAndValidate, parseResponse, validateGenerated, validateCollectedNews, generateRadarEdition, generateAndPublish: generateRadarEdition };
