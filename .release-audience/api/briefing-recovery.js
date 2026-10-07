'use strict';

function unsafe(message) {
    const error = new Error(message);
    error.code = 'UNSAFE_DETERMINISTIC_RECOVERY';
    error.validation = 'roteiroAlexa.remocao_deterministica';
    return error;
}
function hydrateGenerated(candidate, date) {
    const news = Array.isArray(candidate.noticias) ? candidate.noticias.map((item, i) => ({ ...item, ordem: item.ordem ?? i + 1 })) : candidate.noticias;
    const blocks = Array.isArray(news) && news.every(item => typeof item.roteiroAlexa === 'string');
    return {
        ...candidate, noticias: news, data: candidate.data ?? date,
        titulo: candidate.titulo ?? 'Radar ACS - ' + date.split('-').reverse().join('/'),
        resumo: candidate.resumo ?? (Array.isArray(news) ? news.map(item => item.resumo).join(' ') : ''),
        roteiroAlexa: candidate.roteiroAlexa ?? (blocks ? news.map(item => item.roteiroAlexa.trim()).join('\n\n') : '')
    };
}
function retainVerified(generated, acceptedOrders) {
    const keep = generated.noticias.filter(item => acceptedOrders.includes(item.ordem));
    if (keep.length < 1) {
        const error = new Error('Nenhuma notícia coletada atende ao contrato de publicação');
        error.code = 'NO_VALID_NEWS'; error.validation = 'noticias.minimo_valido';
        throw error;
    }
    if (keep.length === generated.noticias.length) return generated;
    // Não tentar adivinhar a relação entre parágrafos de um roteiro legado e notícias.
    if (!generated.noticias.every(item => typeof item.roteiroAlexa === 'string')) {
        throw unsafe('Remoção exige blocos de roteiro explicitamente vinculados a cada notícia');
    }
    const joined = generated.noticias.map(item => item.roteiroAlexa.trim()).join('\n\n');
    if (generated.roteiroAlexa.trim() !== joined.trim()) throw unsafe('Roteiro global diverge dos blocos individuais');
    if (!Number.isInteger(generated.oportunidadeOrdem) || generated.oportunidadeOrdem < 0
        || (generated.oportunidadeOrdem !== 0 && !acceptedOrders.includes(generated.oportunidadeOrdem))) {
        throw unsafe('Oportunidade do dia não está vinculada a assunto preservado');
    }
    if (generated.oportunidadeOrdem === 0
        && generated.oportunidadeDoDia !== 'Nenhuma oportunidade específica comprovada nesta edição.') {
        throw unsafe('Oportunidade sem vínculo deve declarar somente ausência, sem referências a fatos removidos');
    }
    const crossReference = /\b(?:como mencionei|assunto anterior|noticia anterior|primeiro assunto|segundo assunto|terceiro assunto|quarto assunto|quinto assunto|ultimo assunto|fechando a edicao|esses (?:tres|quatro|cinco)|estes (?:tres|quatro|cinco)|ainda no|tambem na)\b/i;
    for (const item of keep) {
        const normalized = item.roteiroAlexa.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (crossReference.test(normalized)) throw unsafe('Bloco contém referência cruzada dependente da edição original');
    }
    return {
        ...generated, noticias: keep.map((item, i) => ({ ...item, ordem: i + 1 })),
        resumo: keep.map(item => item.resumo).join(' '),
        roteiroAlexa: keep.map(item => item.roteiroAlexa.trim()).join('\n\n'),
        oportunidadeOrdem: generated.oportunidadeOrdem === 0 ? 0 : keep.findIndex(item => item.ordem === generated.oportunidadeOrdem) + 1
    };
}
module.exports = { hydrateGenerated, retainVerified };
