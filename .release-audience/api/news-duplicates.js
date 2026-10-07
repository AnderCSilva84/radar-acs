'use strict';

const stop = new Set('a o as os de da do das dos e em no na nos nas um uma para por com ao aos que'.split(' '));
function normalize(text) {
    return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}
function tokens(text) { return new Set(normalize(text).split(' ').filter(word => word && !stop.has(word))); }
function similarity(a, b) {
    const x = tokens(a), y = tokens(b);
    const union = new Set([...x, ...y]).size;
    return union ? [...x].filter(word => y.has(word)).length / union : 0;
}
function validateDistinctNews(news) {
    const pairs = [];
    for (let i = 0; i < news.length; i++) {
        for (let j = i + 1; j < news.length; j++) {
            const title = similarity(news[i].titulo, news[j].titulo);
            const summary = similarity(news[i].resumo, news[j].resumo);
            const sameUrl = news[i].url.replace(/#.*$/, '') === news[j].url.replace(/#.*$/, '');
            const sameTitle = normalize(news[i].titulo) === normalize(news[j].titulo);
            const suspected = sameTitle || (title >= 0.75 && summary >= 0.65)
                || summary >= 0.90 || (sameUrl && title >= 0.60 && summary >= 0.70);
            pairs.push({ assuntos: [i + 1, j + 1], similaridadeTitulo: title, similaridadeResumo: summary, mesmaUrl: sameUrl });
            if (suspected) {
                const error = new Error('Possível duplicidade editorial entre assuntos ' + (i + 1) + ' e ' + (j + 1));
                error.name = 'ValidationError'; error.code = 'NEWS_DUPLICATE';
                error.validation = 'noticias.duplicidade_editorial';
                throw error;
            }
        }
    }
    return { resultado: 'PASS', pares: pairs };
}
module.exports = { normalize, similarity, validateDistinctNews };
