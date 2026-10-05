'use strict';
function editionContext(date) {
    return date === '2026-10-04'
        ? { context: 'eleicoes-2026', coverId: 'eleicoes-2026', editionType: 'special', specialTitle: 'Eleições 2026' }
        : {};
}
function editionTitle(date, previousTitle) {
    const previous = /Edição #(\d+)/.exec(previousTitle || '');
    return 'Radar ACS — Edição #' + String(previous ? Number(previous[1]) + 1 : 1).padStart(3, '0');
}
const electionPrompt = 'Edição eleitoral especial de 04/10/2026, às 08:00 America/Belem. Priorize Brasil, Pará, serviço ao eleitor, tecnologia e segurança eleitoral; tecnologia, carreira e economia relevantes também podem entrar. Neutralidade absoluta: informativo, factual e apartidário, sem recomendar voto/candidato, propaganda, ataques/elogios editoriais ou torcida. Diferencie fato, declaração atribuída, pesquisa, resultado e apuração. Às 08:00 NÃO existem resultados da votação deste dia: nunca antecipe vencedores, resultados ou transforme pesquisas em previsão. Regras/horários/dados oficiais devem vir de TSE, TRE-PA ou Justiça Eleitoral; acontecimentos de jornalismo confiável. Fatos controversos exigem confirmação adequada na mesma pesquisa; descarte se insuficiente. Não invente percentuais, candidatos, declarações, números ou regras. Tom sóbrio e neutro. Sem saudação, pois a Skill já abre o briefing.';
function validateElection(news, date) {
    if (date !== '2026-10-04') return;
    const text = news.map(n => [n.titulo, n.resumo, n.contexto, n.roteiroAlexa].join(' ')).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (/\b(?:vote em|votem em|peco seu voto|pedimos seu voto|melhor candidato|pior candidato|merece seu voto|vai vencer a eleicao|vencera a eleicao|candidato favorito vencer[a-z]*)\b/.test(text)
        || /\b(?:foi eleito|foi eleita|venceu a eleicao|resultado final|resultado oficial|votos apurados|apuracao (?:mostra|confirma|indica))\b/.test(text)) {
        const error = new Error('ELECTION_NEUTRALITY: propaganda, previsão ou resultado incompatível com a edição das 08:00');
        error.code = 'ELECTION_NEUTRALITY';error.stage = 'EDITORIAL_VALIDATION';throw error;
    }
}
module.exports = { editionContext, editionTitle, electionPrompt, validateElection };
