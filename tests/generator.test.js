'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { editorialDate, buildRequest, parseAndValidate, generateAndPublish, metricsFor } = require('./helpers/legacy-generator');
const { createManualGenerator } = require('../api/manual-generator');
const date = '2026-10-02';
const now = () => new Date('2026-10-02T12:00:00Z');
function fixture() {
    const generated = {
        data: date, titulo: 'Radar ACS - 02/10/2026', resumo: 'Cinco assuntos atuais e suas aplicações.',
        roteiroAlexa: 'Primeiro assunto. ' + 'conteúdo '.repeat(500).trim(),
        noticias: Array.from({ length: 5 }, (_, i) => ({
            ordem: i + 1, titulo: 'Assunto ' + (i + 1), resumo: ["Equipe lança biblioteca para testes rápidos com relatórios locais e exemplos públicos nesta semana.","Universidade abre inscrições para curso gratuito de redes e administração de servidores no Brasil.","Empresa apresenta ferramenta para organizar tarefas e integrar calendário em projetos de desenvolvimento.","Instituto publica edital de concurso para especialistas em infraestrutura com cronograma e vagas oficiais.","Comunidade atualiza documentação de banco de dados com orientações sobre consultas índices e desempenho."][i], evidencia: ["Equipe lança biblioteca para testes rápidos com relatórios locais e exemplos públicos nesta semana.","Universidade abre inscrições para curso gratuito de redes e administração de servidores no Brasil.","Empresa apresenta ferramenta para organizar tarefas e integrar calendário em projetos de desenvolvimento.","Instituto publica edital de concurso para especialistas em infraestrutura com cronograma e vagas oficiais.","Comunidade atualiza documentação de banco de dados com orientações sobre consultas índices e desempenho."][i],
            contexto: 'Impacto prático e oportunidade.', fonte: 'Fonte oficial',
            url: 'https://example.com/news/' + (i + 1), dataPublicacao: date
        })),
        oportunidadeDoDia: 'Avaliar a ferramenta para a ACS Tecnologia.'
    };
    return {
        status: 'completed', model: 'gpt-5.4-mini',
        usage: { input_tokens: 1000, input_tokens_details: { cached_tokens: 100 }, output_tokens: 2000 },
        output: [
            { type: 'web_search_call', status: 'completed', action: { type: 'search', sources: generated.noticias.map(n => ({ url: n.url })) } },
            { type: 'message', content: [{ type: 'output_text', text: JSON.stringify(generated), annotations: [] }] }
        ]
    };
}
function patch(response, updates) {
    const generated = JSON.parse(response.output[1].content[0].text);
    updates(generated);
    response.output[1].content[0].text = JSON.stringify(generated);
    return response;
}

test('Data editorial em Belém e busca externa obrigatória', () => {
    assert.equal(editorialDate(new Date('2026-10-03T01:00:00Z')), date);
    const request = buildRequest(date);
    assert.equal(request.tools[0].type, 'web_search');
    assert.equal(request.tools[0].external_web_access, true);
    assert.equal(request.store, false);
    assert.equal(request.text.format.strict, true);
});

test('Geração válida publica apenas depois da validação e mede uso', async () => {
    let published;
    const logs = [];
    const result = await generateAndPublish({
        apiKey: 'segredo-ficticio', now, readSource: async () => "Equipe lança biblioteca para testes rápidos com relatórios locais e exemplos públicos nesta semana. Universidade abre inscrições para curso gratuito de redes e administração de servidores no Brasil. Empresa apresenta ferramenta para organizar tarefas e integrar calendário em projetos de desenvolvimento. Instituto publica edital de concurso para especialistas em infraestrutura com cronograma e vagas oficiais. Comunidade atualiza documentação de banco de dados com orientações sobre consultas índices e desempenho.",
        fetchImpl: async (url, request) => {
            assert.equal(url, 'https://api.openai.com/v1/responses');
            assert.equal(request.headers.Authorization, 'Bearer segredo-ficticio');
            return { ok: true, json: async () => fixture() };
        },
        publish: async briefing => { published = briefing; },
        logger: { info: (...args) => logs.push(args) }
    });
    assert.equal(published.noticias.length, 5);
    assert.equal(published.data, date);
    assert.equal(published.audioUrl, null);
    assert.equal(result.metrics.tokensEntrada, 1000);
    assert.equal(result.metrics.buscasWeb, 1);
    assert.ok(result.metrics.custoEstimadoUsd > 0);
    assert.ok(!JSON.stringify(logs).includes('segredo-ficticio'));
});

for (const [name, update] of [
    ['zero notícias', g => { g.noticias = []; }],
    ['seis notícias', g => { g.noticias.push({ ...g.noticias[4], ordem: 6 }); }],
    ['data diferente', g => { g.data = '2026-10-01'; }],

]) {
    test('Gerador rejeita ' + name + ' sem publicar', async () => {
        let writes = 0;
        await assert.rejects(generateAndPublish({
            apiKey: 'ficticio', now,
            fetchImpl: async () => ({ ok: true, json: async () => patch(fixture(), update) }),
            publish: async () => { writes++; }, logger: { info() {} }
        }));
        assert.equal(writes, 0);
    });
}

test('Resposta sem busca, truncada ou falha OpenAI não publica', async () => {
    for (const invalid of [ { ...fixture(), status: 'incomplete' }, { ...fixture(), output: fixture().output.slice(1) } ]) {
        assert.throws(() => parseAndValidate(invalid, date));
    }
    let writes = 0;
    await assert.rejects(generateAndPublish({
        apiKey: 'ficticio', now,
        fetchImpl: async () => ({ ok: false, status: 429 }),
        publish: async () => { writes++; }
    }), /HTTP 429/);
    assert.equal(writes, 0);
});

test('Não publica se a data muda durante a geração', async () => {
    let ticks = 0;
    await assert.rejects(generateAndPublish({
        apiKey: 'ficticio', now: () => new Date(ticks++ === 0 ? '2026-10-02T12:00:00Z' : '2026-10-03T12:00:00Z'),
        fetchImpl: async () => ({ ok: true, json: async () => fixture() }),
        publish: async () => assert.fail('Não deve publicar'), logger: { info() {} }
    }), /data mudou/);
});

test('Preço desconhecido não recebe estimativa inventada', () => {
    assert.equal(metricsFor({ ...fixture(), model: 'outro-modelo' }, 10).custoEstimadoUsd, null);
});

test('Endpoint manual protege custo e impede replay', async () => {
    const token = 'x'.repeat(40);
    const id = '12345678-1234-4234-8234-123456789abc';
    const seen = new Set();
    let generations = 0;
    const handler = createManualGenerator({
        generate: async () => { generations++; return { success: true }; },
        runs: { acquire: async key => { if (seen.has(key)) return false; seen.add(key); return true; }, complete: async () => {}, fail: async () => {} }
    });
    async function invoke(auth, body = { requestId: id, confirmarPublicacao: true }) {
        const res = { set() { return this; }, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } };
        await handler({ method: 'POST', get: () => auth, is: () => true, body }, res);
        return res;
    }
    assert.equal((await invoke('Bearer ' + token, {})).code, 400);
    assert.equal((await invoke('Bearer ' + token)).code, 200);
    assert.equal((await invoke('Bearer ' + token)).code, 409);
    assert.equal(generations, 1);
});

test('Pesquisa limitada e roteiro ligeiramente abaixo do alvo são aceitos', () => {
 const request = buildRequest(date);
 assert.equal(request.max_tool_calls, 3);
 assert.equal(request.tools[0].search_context_size, 'low');
 assert.equal(request.reasoning.effort, 'low');
 assert.equal(parseAndValidate(patch(fixture(), g => { g.roteiroAlexa = 'Primeiro assunto. ' + 'conteúdo '.repeat(410); }), date).noticias.length, 5);
});

for (const [name,update,total] of [
 ['roteiro vazio',g=>{g.roteiroAlexa=''},5],['abertura duplicada',g=>{g.roteiroAlexa='Bom dia, Anderson.'},5],['roteiro curto',g=>{g.roteiroAlexa='Assunto curto.'},5],
 ['URL inventada',g=>{g.noticias[0].url='https://example.com/inventada'},4],['data antiga',g=>{g.noticias[0].dataPublicacao='2026-09-01'},4],['data futura',g=>{g.noticias[0].dataPublicacao='2026-10-03'},4]
])test('Notícia e fala separadas: '+name,async()=>{
 let saved;await generateAndPublish({apiKey:'mock',now,fetchImpl:async()=>({ok:true,json:async()=>patch(fixture(),update)}),publish:async value=>{saved=value},logger:{info(){}}});
 assert.equal(saved.noticias.length,total);assert.ok(saved.roteiroAlexa.trim());assert.ok(!saved.roteiroAlexa.includes('Bom dia'));
});
