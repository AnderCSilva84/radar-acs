'use strict';

const https = require('node:https');
const { lookup } = require('node:dns/promises');
const { isIP } = require('node:net');
const { assertSpecificSource } = require('./source-url');
const { normalize } = require('./news-duplicates');

function failure(message, index) {
    const error = new Error('Evidência do assunto ' + index + ': ' + message);
    error.name = 'ValidationError'; error.code = 'FACTUAL_EVIDENCE_UNCONFIRMED';
    error.validation = 'noticias.evidencia_factual';
    return error;
}
function publicIPv4(address) {
    if (isIP(address) !== 4) return false;
    const [a, b] = address.split('.').map(Number);
    return a !== 0 && a !== 10 && a !== 127 && a < 224
        && !(a === 169 && b === 254) && !(a === 172 && b >= 16 && b <= 31)
        && !(a === 192 && (b === 168 || b === 0)) && !(a === 100 && b >= 64 && b <= 127)
        && !(a === 198 && (b === 18 || b === 19));
}
async function readPublicSource(value) {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')
        || isIP(url.hostname) || !url.hostname.includes('.')) throw new Error('Fonte pública HTTPS exigida');
    const addresses = await lookup(url.hostname, { family: 4, all: true });
    if (!addresses.length || addresses.some(item => !publicIPv4(item.address))) throw new Error('Endereço de fonte não público');
    // DNS fixado na conexão para evitar redirecionamento/rebinding para redes internas.
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            agent: false, timeout: 10000,
            lookup: (_host, options, callback) => options.all
                ? callback(null, [addresses[0]]) : callback(null, addresses[0].address, 4),
            headers: { Accept: 'text/html,text/plain', 'User-Agent': 'RadarACS-source-validation/1.0' }
        }, res => {
            if (res.statusCode !== 200) {
                res.resume(); reject(new Error('Fonte HTTP ' + res.statusCode)); return;
            }
            if (!/text\/(?:html|plain)/i.test(res.headers['content-type'] || '')) {
                res.resume(); reject(new Error('Fonte não textual')); return;
            }
            let bytes = 0; const chunks = [];
            res.on('data', chunk => {
                bytes += chunk.length;
                if (bytes > 1500000) req.destroy(new Error('Fonte excede limite de leitura'));
                else chunks.push(chunk);
            });
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            res.on('error', reject);
        });
        req.on('timeout', () => req.destroy(new Error('Timeout de fonte')));
        req.on('error', reject);
    });
}
function pageText(html) {
    return html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<[^>]*>/g, ' ').replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) => {
            const n = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code);
            return n <= 0x10ffff ? String.fromCodePoint(n) : ' ';
        }).replace(/&(amp|quot|apos|lt|gt|nbsp);/gi, (_, key) => ({ amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' })[key.toLowerCase()]);
}
function checkSpecificFacts(item, evidence) {
    const claims = item.titulo + ' ' + item.resumo + ' ' + (item.contexto || '') + ' ' + (item.roteiroAlexa || '');
    const products = claims.match(/\b(?:GPT|Gemini|Claude|Llama)\s*[- ]?\s*\d+(?:\.\d+)*(?:\s+(?:Sol|Astra|Argon|Pro|Flash|mini|nano))?/gi) || [];
    const versions = claims.match(/\bv?\d+\.\d+(?:\.\d+)*\b/gi) || [];
    const specific = [...products, ...versions, ...(item.termosEspecificos || [])];
    if (specific.some(term => typeof term !== 'string' || !normalize(term) || !evidence.includes(normalize(term)))) {
        throw failure('termo/produto/modelo/versão sem apoio no trecho confirmado', item.ordem);
    }
    const normalized = normalize(claims);
    const rules = [
        [/\b(?:lanca|lancou|lancamento|anuncia|anunciou|novo modelo|nova versao)\b/, /\b(?:launch|launches|launched|introduce|introduces|introduced|release|released|announce|announced|announcement|lanca|lancou|anuncia|anunciou|lancamento)\b/],
        [/\b(?:disponivel|disponibilidade|available)\b/, /\b(?:available|availability|disponivel|disponibilidade|released)\b/],
        [/\b(?:preco|pricing|price)\b|(?:R\$|US\$|\$)\s*\d/i, /\b(?:price|prices|pricing|cost|costs|preco|custo|usd|brl)\b/],
        [/\b(?:novo recurso|nova api|novidade na api|api)\b/, /\b(?:api|feature|features|recurso|launch|introduced|released)\b/]
    ];
    for (const [claim, support] of rules) {
        if (claim.test(normalized) && !support.test(evidence)) throw failure('afirmação específica não está explicitada no trecho', item.ordem);
    }
    const prices = claims.match(/(?:R\$|US\$|\$)\s*\d+(?:[.,]\d+)?/g) || [];
    if (prices.length && !/\b(?:price|prices|pricing|cost|costs|preco|custo|usd|brl)\b/.test(evidence)) {
        throw failure('valor numérico não comprova preço sem contexto de preço/custo', item.ordem);
    }
    if (prices.some(price => !evidence.includes(normalize(price.replace(/^(?:R\$|US\$|\$)\s*/, ''))))) {
        throw failure('preço não está explicitado na evidência', item.ordem);
    }
    const dates = claims.match(/\b\d{4}-\d{2}-\d{2}\b|\b\d{2}\/\d{2}\/\d{4}\b/g) || [];
    if (dates.some(date => !evidence.includes(normalize(date)))) throw failure('data específica sem apoio explícito', item.ordem);
    const generic = /\/(?:c\/[^/]+\/\d+|categories?|announcements?|product-releases)\/?$/i.test(new URL(item.url).pathname);
    const specificClaim = products.length || versions.length || rules.some(([rule]) => rule.test(normalized));
    if (specificClaim && /\b(?:rumor|rumors|reportedly|might|could|planned|plans to|expected|planeja|previsto|especulacao)\b/.test(evidence)) {
        throw failure('evidência especulativa não comprova fato específico', item.ordem);
    }
    if (generic && specificClaim) throw failure('página de categoria/listagem não substitui evidência primária de fato específico', item.ordem);
    if (specificClaim && /^(?:community\.|discuss\.|forum\.|forums\.)|(^|\.)(?:reddit\.com|stackoverflow\.com)$/.test(new URL(item.url).hostname)) {
        throw failure('comunidade é fonte secundária para lançamento/modelo; exigir fonte primária', item.ordem);
    }
}
function validateDerivedClaims(item, excerpts) {
    if (!Array.isArray(excerpts) || !excerpts.length || excerpts.length > 4 || excerpts.some(text => typeof text !== 'string' || text.trim().split(/\s+/).length < 10 || text.length > 1500)) throw failure('trecho literal ausente ou insuficiente', item.ordem);
    const normalizedExcerpts = excerpts.map(normalize);
    const evidence = normalizedExcerpts.join(' ');
        if (item.evidencias !== undefined || item.allowedFacts !== undefined) {
            if (!Array.isArray(item.allowedFacts) || !item.allowedFacts.length || item.allowedFacts.length > 8) throw failure('allowedFacts ausente ou inválido', item.ordem);
            for (const fact of item.allowedFacts) {
                if (!fact || typeof fact.texto !== 'string' || !fact.texto.trim() || !Array.isArray(fact.evidenciaIndices) || !fact.evidenciaIndices.length
                    || fact.evidenciaIndices.some(index => !Number.isInteger(index) || index < 0 || index >= excerpts.length)) throw failure('fato permitido sem vínculo válido à evidência', item.ordem);
                checkSpecificFacts({ ...item, titulo: fact.texto, resumo: '', contexto: '', roteiroAlexa: '', termosEspecificos: [] }, fact.evidenciaIndices.map(index => normalizedExcerpts[index]).join(' '));
            }
            // Conservative signal, not a semantic entailment proof: reject new
            // concrete numbers/models/API/availability claims beyond allowedFacts.
            const allowed = normalize(item.allowedFacts.map(fact => fact.texto).join(' '));
            const claims = item.titulo + ' ' + item.resumo + ' ' + (item.contexto || '') + ' ' + (item.roteiroAlexa || '');
            const numbers = claims.match(/\b\d+(?:[.,]\d+)*\b/g) || [];
            if (numbers.some(value => !allowed.split(' ').includes(normalize(value)))) throw failure('número factual fora de allowedFacts', item.ordem);
            checkSpecificFacts(item, allowed);
        }
        checkSpecificFacts(item, evidence);
}
async function collectEvidence(news, readSource = readPublicSource) {
    const pages = new Map(); const results = []; const rejected = []; const candidates = [];
    for (const item of news) {
        try {
        assertSpecificSource(item.url);
        const excerpts = item.evidencias ?? [item.evidencia];
        if (!Array.isArray(excerpts) || !excerpts.length || excerpts.length > 4 || excerpts.some(text => typeof text !== 'string' || text.trim().split(/\s+/).length < 10 || text.length > 1500)) throw failure('trecho literal ausente ou insuficiente', item.ordem);
        const key = item.url.replace(/#.*$/, '');
        if (!pages.has(key)) {
            try { pages.set(key, { text: normalize(pageText(await readSource(key))) }); }
            catch (error) { pages.set(key, { error: 'não foi possível confirmar a fonte: ' + error.message }); }
        }
        if (pages.get(key).error) throw failure(pages.get(key).error, item.ordem);
        const normalizedExcerpts = excerpts.map(normalize);
        if (normalizedExcerpts.some(text => !pages.get(key).text.includes(text))) throw failure('trecho não encontrado na página indicada', item.ordem);
        const evidence = normalizedExcerpts.join(' ');
        validateDerivedClaims(item, excerpts);
        candidates.push({ candidateId: 'candidate-' + item.ordem, title: item.titulo, sourceUrl: item.url, status: 'PASS', reason: 'Trechos confirmados e verificações determinísticas aprovadas', evidenceCount: excerpts.length, allowedFactsCount: item.allowedFacts?.length || 0 });
        results.push({ ordem: item.ordem, fonte: item.fonte, url: item.url, evidencia: item.evidencia, resultado: 'PASS' });
        } catch (error) {
            candidates.push({ candidateId: 'candidate-' + item.ordem, title: item.titulo, sourceUrl: item.url, status: 'FAIL', reason: error.message, evidenceCount: Array.isArray(item.evidencias) ? item.evidencias.length : item.evidencia ? 1 : 0, allowedFactsCount: item.allowedFacts?.length || 0 });
            rejected.push({ ordem: item.ordem, code: error.code || 'FACTUAL_EVIDENCE_UNCONFIRMED', motivo: error.message });
        }
    }
    return { resultado: rejected.length ? 'PARTIAL' : 'PASS', leiturasFontes: pages.size, noticias: results, rejeitadas: rejected, candidatos: candidates };
}
async function verifyEvidence(news, readSource = readPublicSource) {
    const result = await collectEvidence(news, readSource);
    if (result.rejeitadas.length) throw failure(result.rejeitadas[0].motivo, result.rejeitadas[0].ordem);
    return result;
}
module.exports = { validateDerivedClaims, verifyEvidence, collectEvidence, readPublicSource, pageText, publicIPv4 };
