'use strict';
const { normalize } = require('./news-duplicates');
const config = require('./generator-config.json');

function canonicalUrl(value) {
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.username || url.password) return null;
        url.hash = '';
        for (const key of [...url.searchParams.keys()]) {
            if (/^utm_|^(?:fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
        }
        url.searchParams.sort();
        url.pathname = url.pathname.replace(/\/+$/, '') || '/';
        return url.href;
    } catch { return null; }
}

function compactHistory(editions) {
    return editions.slice(0, config.recentEditionLimit).flatMap(edition =>
        (Array.isArray(edition.noticias) ? edition.noticias : []).slice(0, 7).map(news => ({
            title: String(news.titulo || '').slice(0, 200),
            url: canonicalUrl(news.url),
            date: edition.data,
            subject: normalize(news.titulo)
        })).filter(news => news.url && news.title));
}

async function loadRecentNews(db) {
    const limit = config.recentEditionLimit;
    if (!Number.isInteger(limit) || limit < 1 || limit > 3) throw new Error('Janela de histórico inválida');
    const result = await db.collection('briefings').where('publicado', '==', true)
        .orderBy('data', 'desc').limit(limit).select('data', 'noticias').get();
    return compactHistory(result.docs.map(doc => doc.data()));
}

function classifyPreviousNews(candidate, recent) {
    const url = canonicalUrl(candidate.url);
    const title = normalize(candidate.titulo);
    const development = candidate.desenvolvimentoNovo;
    const previous = recent.find(news => (url && url === news.url) || (title && title === normalize(news.title))
        || (development?.relevante === true && canonicalUrl(development.sourceUrlAnterior) === news.url));
    if (!previous) return { status: 'PASS', reason: 'Sem repetição forte na janela recente' };
    // Only a different source URL, a newer documented date and an explicit,
    // evidence-linked new fact can request the material-development exception.
    const fact = candidate.allowedFacts?.[development?.fatoIndex];
    if (development?.relevante === true && url && url !== previous.url
        && title !== normalize(previous.title)
        && /^\d{4}-\d{2}-\d{2}$/.test(candidate.dataPublicacao || '')
        && candidate.dataPublicacao > previous.date
        && fact?.texto && Array.isArray(fact.evidenciaIndices) && fact.evidenciaIndices.length
        && typeof development.descricao === 'string'
        && normalize(development.descricao) === normalize(fact.texto)) {
        return { status: 'PASS', reason: 'Desenvolvimento novo declarado; exige conferência factual' };
    }
    return { status: 'FAIL', reason: 'URL canônica ou título já publicado, sem desenvolvimento novo comprovável' };
}

module.exports = { canonicalUrl, compactHistory, loadRecentNews, classifyPreviousNews };
