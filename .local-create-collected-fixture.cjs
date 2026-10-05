const fs = require('node:fs');
const editorial = JSON.parse(fs.readFileSync('tests/fixtures/editorial-edicao-002.json', 'utf8'));
const news = editorial.noticias.slice(0, 4).map((n, i) => ({ ...n, ordem: i + 1, dataPublicacao: editorial.data,
    sourceIds: [n.url], evidencia: 'Trecho sintético não encontrado no conteúdo parcial da ferramenta nesta fixture conceitual.',
    roteiroAlexa: n.resumo + ' ' + 'Vale acompanhar os próximos desdobramentos e avaliar com calma o impacto desse assunto no seu dia a dia. Isso ajuda a organizar prioridades e escolher o que merece atenção agora.' }));
const generated = { noticias: news, oportunidadeOrdem: 0, oportunidadeDoDia: 'Nenhuma oportunidade específica comprovada nesta edição.' };
const response = { status: 'completed', model: 'gpt-5.4-mini', usage: { input_tokens: 1000, output_tokens: 1000, total_tokens: 2000 },
    output: [{ id: 'search-fixture', type: 'web_search_call', status: 'completed', action: { type: 'search', queries: ['consulta mock'],
        sources: news.map(n => ({ title: n.titulo, url: n.url, snippet: 'Conteúdo parcial sintético da matéria para teste de ausência de confirmação literal posterior.' })) } },
        { type: 'message', content: [{ type: 'output_text', text: JSON.stringify(generated), annotations: [] }] }] };
fs.writeFileSync('tests/fixtures/collected-news-unconfirmed.json', JSON.stringify(response, null, 2) + '\n');
