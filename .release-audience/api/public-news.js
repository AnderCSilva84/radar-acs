'use strict';
const { newsImage } = require('./news-image');

// Public projection of the already-loaded edition. Never spread internal data.
function publicSourceUrl(value) {
    try {
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
        for (const key of [...url.searchParams.keys()]) {
            if (/^utm_|^(?:fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
        }
        return url.href;
    } catch { return null; }
}

function publicNews(items) {
    if (!Array.isArray(items)) return [];
    return items.filter(item => item && typeof item === 'object').map(item => {
        const news = {};
        for (const key of ['id', 'categoria', 'titulo', 'resumo', 'fonte']) {
            if (typeof item[key] === 'string' || (key === 'id' && typeof item[key] === 'number')) news[key] = item[key];
        }
        const sourceUrl = publicSourceUrl(item.sourceUrl || item.url);
        if (sourceUrl) news.sourceUrl = sourceUrl;
        Object.assign(news, newsImage(item));
        return news;
    });
}

module.exports = { publicNews, publicSourceUrl };
