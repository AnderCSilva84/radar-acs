'use strict';
const prompt = 'Voz: conversa pessoal de manhã com Anderson, português brasileiro natural, curioso, direto, sem exagero, propaganda ou relatório. Notícia primeiro, Anderson depois, ACS só se útil: zero menções é válido; prefira até duas no roteiro inteiro. Integre contexto sem rótulos como Contexto ACS, Aplicação para ACS, Por que isso importa para você ou enumeração. Transições variadas e independentes, sem assunto anterior nem fechamento dependente. Expressões como olha que bacana são referências, não bordões; evite repetição, piadas forçadas e sotaque escrito. Tragédia, guerra e tensão militar exigem sobriedade, nunca entusiasmo. Comentário não cria fatos, previsões ou promessas. Comece pelo conteúdo, sem saudação da Skill. Cinco notícias: alvo 400–650 palavras; limite geral 120–750, sem enchimento.';
function validateVoice(news) {
    const script = news.map(n => n.roteiroAlexa || '').join(' ');
    const mentions = (script.match(/\bACS(?:\s+Tecnologia)?\b/gi) || []).length;
    const warnings = mentions > 2 ? ['ACS_MENTIONS_EXCESSIVE'] : [];
    for (const item of news) {
        const spoken = item.roteiroAlexa || '';
        if (/contexto\s+acs\s*:|aplica[cç][aã]o\s+para\s+acs\s*:|por que isso importa para voc[eê]\s*:|not[ií]cia n[uú]mero\s+\d/i.test(spoken)) {
            throw new Error('Rótulo robótico na narração do assunto ' + item.ordem);
        }
        if (/\b(?:guerra|morte|mortes|trag[eé]dia|desastre|m[ií]ssil|tens[aã]o militar)\b/i.test(item.titulo + ' ' + item.resumo)
            && /(?:que bacana|muito legal|olha que legal|olha que bacana)/i.test(spoken)) {
            throw new Error('Reação positiva inadequada ao assunto ' + item.ordem);
        }
    }
    return { warnings, mentions };
}
module.exports = { prompt, validateVoice };
