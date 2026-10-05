const fs=require('fs');let s=fs.readFileSync('api/generator.js','utf8');
s=s.replace("const { validateBriefing }", "const { validateBriefing, validateNewsItem }");
s=s.replace("const { hydrateGenerated, retainVerified }", "const { hydrateGenerated }");
s=s.replace("const { validateAudioScript } = require('./audio-script');", "const { validateAudioScript } = require('./audio-script');\nconst { renderEditionAudio } = require('./audio-rendering');");
const point=s.indexOf('function validateGenerated(');
s=s.slice(0,point)+`function validateCollectedNews(news, urls, date) {
    validateNewsItem({ ...news, ordem: 1, contexto: news.contexto || news.resumo });
    const published = news.dataPublicacao;
    if (typeof published !== 'string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(published)
        || !Number.isFinite(Date.parse(published)) || new Date(published).toISOString().slice(0, 10) !== published
        || Date.parse(published) < Date.parse(date) - 3 * 86400000 || published > date) {
        throw new Error('Notícia sem data recente válida');
    }
    if (!urls.has(cleanSourceUrl(news.url))) throw new Error('URL de notícia não consta nas fontes da pesquisa');
}

`+s.slice(point);
s=s.replace("validateGenerated({ ...generated, noticias: [{ ...news, ordem: 1 }],\n                roteiroAlexa: news.roteiroAlexa || generated.roteiroAlexa }, urls, date);", "validateCollectedNews(news, urls, date);");
s=s.replace("structurallyValid.push(news);", "structurallyValid.push({ ...news, contexto: news.contexto || news.resumo });");
s=s.replace("try { return validateGenerated(hydrateGenerated(parsed.generated, date), parsed.urls, date); }", "try { return validateGenerated(renderEditionAudio(hydrateGenerated(parsed.generated, date)).edition, parsed.urls, date); }");
const from=s.indexOf("    const retained = await stage('CANDIDATE_VALIDATION'");const to=s.indexOf("    briefing = await stage('BRIEFING_VALIDATION'",from);
s=s.slice(0,from)+`    if (!selectedOrders.length) throw atStage(Object.assign(new Error('Nenhuma notícia coletada atende ao contrato de publicação'), { code: 'NO_VALID_NEWS', validation: 'noticias.minimo_valido' }), 'CANDIDATE_VALIDATION');
    const keep = structurallyValid.filter(news => selectedOrders.includes(news.ordem));
    const selected = { ...selectedEdition,
        noticias: keep.map((news, i) => ({ ...news, ordem: i + 1 })), resumo: keep.map(news => news.resumo).join(' '),
        oportunidadeOrdem: selectedEdition.oportunidadeOrdem > 0 ? keep.findIndex(news => news.ordem === selectedEdition.oportunidadeOrdem) + 1 : 0 };
    const rendered = renderEditionAudio(selected);
    const retained = rendered.edition;
    metrics.audioWarnings = rendered.warnings;
`+s.slice(to);
s=s.replace('validateGenerated, generateRadarEdition', 'validateGenerated, validateCollectedNews, generateRadarEdition');fs.writeFileSync('api/generator.js',s);
