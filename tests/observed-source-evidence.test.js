'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { observedSourceEvidence } = require('../api/source-evidence-store');
const { collectObservedEvidence } = require('../api/observed-factual-evidence');
const { validateAudioScript } = require('../api/audio-script');
const { diagnosticSnapshot } = require('../api/diagnostics');
const { generateAndPublish } = require('./helpers/legacy-generator');

const url = 'https://example.com/article';
const a = 'A equipe lançou GPT-9 Sol com documentação para desenvolvedores e exemplos de integração em projetos de software.';
const b = 'A nova API está disponível e permite organizar tarefas de desenvolvimento com recursos documentados para as equipes.';
function response(content = true) {
    return { output: [{ id: 'tool-id', type: 'web_search_call', status: 'completed', action: { type: 'search', queries: ['consulta'], sources: [{ title: 'Artigo', url: url + '?utm_source=test', ...(content ? { snippet: a, text: b } : {}) }] } }] };
}
function candidate() {
    return { ordem: 1, titulo: 'Equipe lançou GPT-9 Sol', resumo: 'Nova API disponível.', contexto: '', roteiroAlexa: 'Equipe lançou GPT-9 Sol. Nova API disponível.',
        url, fonte: 'Equipe', sourceIds: [url], evidencia: a, evidencias: [a, b],
        allowedFacts: [{ texto: 'Equipe lançou GPT-9 Sol.', evidenciaIndices: [0] }, { texto: 'Nova API disponível.', evidenciaIndices: [1] }], termosEspecificos: ['GPT-9 Sol', 'API'] };
}
test('somente conteúdo de tool items vira sourceEvidence, não mensagem ou evidence do modelo', async () => {
    const metadata = observedSourceEvidence(response(false));
    assert.equal(metadata[0].contentAvailable, false);
    const result = await collectObservedEvidence([candidate()], metadata);
    assert.equal(result.warnings[0].code, 'SOURCE_CONTENT_UNAVAILABLE');
    assert.equal(result.candidatos[0].status, 'WARNING');
    assert.equal(result.rejeitadas.length, 0);
    assert.equal(result.noticias[0].independentlyVerified, false);
    assert.equal(observedSourceEvidence({ output: [{ type: 'message', content: [{ text: a }] }] }).length, 0);
});
test('sourceId inexistente e URL divergente são rejeitados', async () => {
    const sources = observedSourceEvidence(response());
    assert.equal((await collectObservedEvidence([{ ...candidate(), sourceIds: ['inventado'] }], sources)).rejeitadas[0].code, 'SOURCE_NOT_OBSERVED');
    assert.equal((await collectObservedEvidence([{ ...candidate(), url: 'https://example.com/invented' }], sources)).rejeitadas[0].code, 'SOURCE_URL_MISMATCH');
});
test('URL específica observada e múltiplos trechos independentes sustentam fatos', async () => {
    const sources = observedSourceEvidence(response());
    assert.equal(sources[0].canonicalUrl, url); assert.equal(sources[0].domain, 'example.com');
    assert.equal(sources[0].title, 'Artigo'); assert.equal(sources[0].searchActionId, 'tool-id');
    assert.ok(sources[0].contentHash); assert.equal(sources[0].query[0], 'consulta');
    assert.equal((await collectObservedEvidence([candidate()], sources)).resultado, 'PASS');
});
test('candidato pode vincular várias fontes observadas sem usar conteúdo do modelo como prova', async () => {
    const r = response(); delete r.output[0].action.sources[0].text;
    const other = 'https://example.com/other-article';
    r.output[0].action.sources.push({ url: other, snippet: b });
    const c = { ...candidate(), sourceIds: [url, other] };
    assert.equal((await collectObservedEvidence([c], observedSourceEvidence(r))).resultado, 'PASS');
});
test('open_page e search preservam ação distinta e tracking reconhecido é removido', () => {
    const r = response(); r.output.push({ id: 'open', type: 'web_search_call', status: 'completed', action: { type: 'open_page', sources: [{ url: url + '?gclid=x&version=2', text: b }] } });
    const sources = observedSourceEvidence(r);
    assert.equal(sources[0].action, 'search'); assert.equal(sources[1].action, 'open_page');
    assert.equal(sources[1].canonicalUrl, url + '?version=2');
});
test('homepage não substitui artigo observado', async () => {
    const r = response(); r.output[0].action.sources.push({ url: 'https://example.com/', snippet: a, text: b });
    const c = { ...candidate(), url: 'https://example.com/', sourceIds: ['https://example.com/'] };
    const result = await collectObservedEvidence([c], observedSourceEvidence(r));
    assert.equal(result.rejeitadas[0].code, 'SOURCE_URL_NOT_SPECIFIC');
});
test('fonte searching não é completed nem evidência válida', async () => {
    const r = response(); r.output[0].status = 'searching';
    assert.equal((await collectObservedEvidence([candidate()], observedSourceEvidence(r))).rejeitadas[0].code, 'SOURCE_COLLECTION_INCOMPLETE');
});
test('snapshot preserva fonte real e hash sanitizado sem promover evidence do modelo', () => {
    const r = response(); r.output[0].action.sources[0].snippet += ' secret-short';
    const snapshot = diagnosticSnapshot(r, { noticias: [candidate()] }, {}, ['secret-short']);
    assert.equal(snapshot.sourceEvidence[0].sourceId, url);
    assert.equal(snapshot.sourceEvidence[0].snippet.includes('secret-short'), false);
    assert.equal(snapshot.sourceEvidence[0].contentHash.length, 64);
    assert.deepEqual(snapshot.resultadoEstruturado.noticias[0].sourceIds, [url]);
});
function audio(words = 40) {
    const noticias = Array.from({ length: 3 }, (_, i) => ({ ordem: i + 1, roteiroAlexa: 'Informação '.repeat(words - 1) + 'completa.' }));
    return { noticias, roteiroAlexa: noticias.map(n => n.roteiroAlexa).join('\n\n') };
}
test('três notícias com 120 palavras e blocos substanciais são válidas', () => {
    assert.equal(validateAudioScript(audio()).palavras, 120);
});
test('bloco curto não invalida notícia nem exige contagem mínima', () => {
    const c = audio(60); c.noticias[0].roteiroAlexa = 'Curto.'; c.roteiroAlexa = c.noticias.map(n => n.roteiroAlexa).join('\n\n');
    assert.doesNotThrow(() => validateAudioScript(c));
});
test('URLs markdown www tracking e citações técnicas na fala são rejeitados', () => {
    for (const marker of ['https://example.com', 'http://example.com', 'www.example.com', '[Fonte](example.com)', 'utm_source=test', '【fonte】']) {
        const c = audio(); c.noticias[0].roteiroAlexa += ' ' + marker; c.roteiroAlexa = c.noticias.map(n => n.roteiroAlexa).join('\n\n');
        assert.throws(() => validateAudioScript(c), { code: 'AUDIO_SCRIPT_INVALID' });
    }
});
test('produção aceita fonte coletada sem sourceIds ou provas adicionais', async () => {
    const r = structuredClone(require('./fixtures/generated-response.json'));
    let ai = 0;
    const result = await generateAndPublish({ apiKey: 'fake', now: () => new Date('2026-10-02T12:00:00Z'),
        fetchImpl: async () => { ai++; return { ok: true, json: async () => r }; },
        readSource: async () => assert.fail('Não deve consultar páginas'), publish: async () => {}, logger: { info() {} }
    });
    assert.equal(result.noticias.length, 5);
    assert.equal(ai, 1);
});
test('search auxiliar pendente permite publicação de fontes já coletadas', async () => {
    const r = structuredClone(require('./fixtures/generated-response.json'));
    r.output.push({ id: 'pending', type: 'web_search_call', status: 'searching', action: { type: 'search', queries: ['outra'] } });
    const result = await generateAndPublish({ apiKey: 'fake', now: () => new Date('2026-10-02T12:00:00Z'),
        fetchImpl: async () => ({ ok: true, json: async () => r }), publish: async () => {}, logger: { info() {} }
    });
    assert.equal(result.noticias.length, 5);
    assert.deepEqual(result.metrics.webCollectionWarnings, ['WEB_COLLECTION_INCOMPLETE_WARNING']);
});
test('conteúdo ausente não enfraquece URL específica ou fatos permitidos', async () => {
    const metadata = observedSourceEvidence(response(false));
    const invalidFact = { ...candidate(), roteiroAlexa: candidate().roteiroAlexa + ' Preço de 99 reais.' };
    assert.equal((await collectObservedEvidence([invalidFact], metadata)).candidatos[0].status, 'FAIL');
    const r = response(false); r.output[0].action.sources.push({ url: 'https://example.com/' });
    const homepage = { ...candidate(), url: 'https://example.com/', sourceIds: ['https://example.com/'] };
    assert.equal((await collectObservedEvidence([homepage], observedSourceEvidence(r))).rejeitadas[0].code, 'SOURCE_URL_NOT_SPECIFIC');
});
test('conteúdo observado contraditório permanece hard fail', async () => {
    const r = response(); r.output[0].action.sources[0].snippet = 'A equipe não lançou o produto.';
    delete r.output[0].action.sources[0].text;
    const result = await collectObservedEvidence([candidate()], observedSourceEvidence(r));
    assert.equal(result.candidatos[0].status, 'FAIL'); assert.equal(result.warnings.length, 0);
});
test('warnings permitem publicação mockada mas ainda passam pela deduplicação recente', async () => {
    async function run(repeat) {
        const r = structuredClone(require('./fixtures/generated-response.json'));
        const g = JSON.parse(r.output[1].content[0].text);
        g.noticias.forEach(n => {
            n.sourceIds = [n.url]; n.evidencias = [n.evidencia]; n.termosEspecificos = [];
            n.allowedFacts = [{ texto: n.titulo + ' ' + n.resumo + ' ' + n.contexto, evidenciaIndices: [0] }];
            n.roteiroAlexa = n.resumo + ' ' + 'informação útil '.repeat(20).trim() + '.';
        });
        g.roteiroAlexa = g.noticias.map(n => n.roteiroAlexa).join('\n\n');
        g.oportunidadeOrdem = 0; g.oportunidadeDoDia = 'Nenhuma oportunidade específica comprovada nesta edição.';
        r.output[1].content[0].text = JSON.stringify(g);
        let published, calls = 0, diagnostics;
        const result = await generateAndPublish({ apiKey: 'fake', requireObservedEvidence: true,
            now: () => new Date('2026-10-02T12:00:00Z'),
            getRecentNews: async () => repeat ? [{ title: g.noticias[0].titulo, url: g.noticias[0].url, date: '2026-10-01' }] : [],
            fetchImpl: async () => { calls++; return { ok: true, json: async () => r }; },
            readSource: async () => assert.fail('Não deve buscar conteúdo'),
            evidenceCheckpoint: async value => { diagnostics = value; },
            publish: async briefing => { published = briefing; }, logger: { info() {} }
        });
        return { result, published, calls, diagnostics };
    }
    const approved = await run(false);
    assert.equal(approved.published.noticias.length, 5); assert.equal(approved.calls, 1);
    assert.ok(approved.diagnostics.every(n => n.status === 'WARNING'));
    assert.equal(approved.result.metrics.sourceEvidenceWarnings, 5);
    const repeated = await run(true);
    assert.equal(repeated.published.noticias.length, 4);
    assert.equal(repeated.diagnostics[0].status, 'FAIL'); assert.equal(repeated.calls, 1);
});
