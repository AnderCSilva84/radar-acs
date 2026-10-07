'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fixture = require('./fixtures/generated-response.json');
const { generateAndPublish, parseAndValidate } = require('./helpers/legacy-generator');
const { errorSnapshot, diagnosticSnapshot, redact } = require('../api/diagnostics');
const { publishBriefing } = require('../api/publish-briefing');
const { createManualGenerator } = require('../api/manual-generator');
const { createExecutionLog } = require('../api/execution-log');
const now = () => new Date('2026-10-02T12:00:00Z');
function response(patch) {
    const copy = JSON.parse(JSON.stringify(fixture));
    const generated = JSON.parse(copy.output[1].content[0].text);
    if (patch) patch(generated);
    copy.output[1].content[0].text = JSON.stringify(generated);
    return copy;
}
function run(value, overrides = {}) {
    return generateAndPublish({ apiKey: 'fake-secret', now, readSource: async () => "Equipe lança biblioteca para testes rápidos com relatórios locais e exemplos públicos nesta semana. Universidade abre inscrições para curso gratuito de redes e administração de servidores no Brasil. Empresa apresenta ferramenta para organizar tarefas e integrar calendário em projetos de desenvolvimento. Instituto publica edital de concurso para especialistas em infraestrutura com cronograma e vagas oficiais. Comunidade atualiza documentação de banco de dados com orientações sobre consultas índices e desempenho.",
        fetchImpl: async () => ({ ok: true, json: async () => value }),
        publish: async () => {}, logger: { info() {} }, ...overrides });
}

test('Roteiro curto preservado no snapshot; fala final usa notícia sem nova IA',async()=>{
 const calls=[];let published;
 await run(response(g=>{g.roteiroAlexa='Primeiro assunto.'}),{checkpoint:async snapshot=>{calls.push(snapshot)},publish:async value=>{published=value}});
 assert.equal(calls[0].status,'GENERATED_NOT_PUBLISHED');assert.equal(calls[0].resultadoEstruturado.roteiroAlexa,'Primeiro assunto.');assert.equal(published.noticias.length,5);assert.ok(published.roteiroAlexa.length>0);
});

test('JSON inválido é preservado e classificado como OPENAI_RESPONSE_PARSE', async () => {
    const invalid = response(); invalid.output[1].content[0].text = '{JSON incompleto';
    let snapshot;
    await assert.rejects(run(invalid, { checkpoint: async value => { snapshot = value; } }), error => error.stage === 'OPENAI_RESPONSE_PARSE');
    assert.equal(snapshot.resultadoEstruturado.roteiroAlexa, '{JSON incompleto');
});

test('Diferença de URL reproduz rejeição na validação, não falha OpenAI', () => {
    assert.throws(() => parseAndValidate(response(g => { g.noticias[0].url += '?version=teste'; }), '2026-10-02'), error => error.stage === 'BRIEFING_VALIDATION' && /fontes/.test(error.message));
});

test('Publicação mockada usa serviço real e distingue PUBLICATION HTTP 503', async () => {
    let saved;
    await assert.rejects(run(response(), {
        checkpoint: async value => { saved = value; },
        publish: briefing => publishBriefing(briefing, { baseUrl: 'https://example.com', token: 'x'.repeat(40), fetchImpl: async () => ({ ok: false, status: 503 }) })
    }), error => error.stage === 'PUBLICATION' && error.status === 503);
    assert.equal(saved.status, 'GENERATED_NOT_PUBLISHED');
});

test('Falha ao preservar resposta impede publicação e identifica Firestore', async () => {
    await assert.rejects(run(response(), {
        checkpoint: async () => { throw Object.assign(new Error('Banco indisponível'), { code: 14 }); },
        publish: async () => assert.fail('Não deve publicar')
    }), error => error.stage === 'FIRESTORE_EXECUTION_LOG' && error.code === 14);
});

test('Logs e causa encadeada removem chaves, cabeçalhos e ID tokens', () => {
    const secret = 'secret-value-that-must-never-appear';
    const error = Object.assign(new TypeError(secret + ' sk-testsecret'), { stage: 'PUBLICATION', code: 'E_FAIL', status: 401,
        cause: new Error('Authorization: Bearer private-value\nToken eyJabcdefgh.abcdefghijk.abcdefghijk') });
    error.request = { headers: { Authorization: secret } };
    const diagnostic = errorSnapshot(error, [secret]);
    const output = JSON.stringify(diagnostic);
    assert.equal(diagnostic.name, 'TypeError'); assert.equal(diagnostic.httpStatus, 401);
    for (const value of [secret, 'private-value', 'sk-testsecret', 'eyJabcdefgh', 'headers', 'request']) assert.ok(!output.includes(value));
});

test('Snapshot permite apenas campos editoriais e elimina segredo em texto', () => {
    const secret = 'valor-secreto-ficticio';
    const candidate = JSON.parse(response().output[1].content[0].text);
    candidate.OPENAI_API_KEY = secret; candidate.roteiroAlexa += secret;
    const result = diagnosticSnapshot(response(), candidate, {}, [secret]);
    assert.ok(!JSON.stringify(result).includes(secret));
    assert.equal(result.resultadoEstruturado.OPENAI_API_KEY, undefined);
});

test('Handler registra etapa e diagnóstico seguro sem retorná-los no HTTP', async () => {
    const logs = []; let stored;
    const handler = createManualGenerator({
        runs: { acquire: async () => true, fail: async (id, diagnostic) => { stored = diagnostic; } },
        generate: async () => { throw Object.assign(new Error('segredo-ficticio'), { stage: 'PUBLICATION', status: 503 }); },
        getRedactions: () => ['segredo-ficticio'], logger: { error: (...args) => logs.push(args) }
    });
    const res = { set() { return this; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await handler({ method: 'POST', is: () => true, body: { confirmarPublicacao: true, requestId: '12345678-1234-4234-8234-123456789abc' } }, res);
    assert.equal(res.code, 503); assert.equal(stored.etapa, 'PUBLICATION');
    assert.ok(!JSON.stringify(logs).includes('segredo-ficticio')); assert.ok(!JSON.stringify(res.body).includes('PUBLICATION'));
});

test('Reserva atômica não lê banco; duplicata não inicia geração', async () => {
    let writes = 0;
    const db = { collection: () => ({ doc: () => ({ create: async () => { writes++; if (writes > 1) throw Object.assign(new Error('Já existe'), { code: 6 }); } }) }) };
    const runs = createExecutionLog(db, () => 'timestamp');
    assert.equal(await runs.acquire('id'), true);
    assert.equal(await runs.acquire('id'), false);
});


test('URLs públicas longas permanecem intactas em texto, notícias e fontes', () => {
 const url = 'https://help.openai.com/en/articles/123456789-long-public-article-path-with-hyphens?mw_entry=2026-09-03-3f56515da8b13ccc';
 assert.equal(redact(url), url);
 assert.equal(redact('Fonte: ' + url), 'Fonte: ' + url);
 const value=response(g => { g.noticias[0].url=url; });
 value.output[0].action.sources[0].url=url;
 const snapshot=diagnosticSnapshot(value, JSON.parse(value.output[1].content[0].text), {});
 assert.equal(snapshot.fontes[0].url,url);
 assert.equal(snapshot.resultadoEstruturado.noticias[0].url,url);
});

test('URLs não preservam credenciais, parâmetros sensíveis nem secrets conhecidos', () => {
 const secret='segredo conhecido com espaços';
 const raw='https://usuario:senha@example.com/public-article-with-long-path?token=valor-token&X-Goog-Signature=assinatura&publico=sim&extra='+encodeURIComponent(secret);
 const output=redact(raw,[secret]);
 for(const value of ['usuario','senha','valor-token','assinatura',encodeURIComponent(secret)]) assert.ok(!output.includes(value));
 assert.ok(output.includes('publico=sim'));
 assert.ok(output.includes('public-article-with-long-path'));
});

test('Cookies, JWT, Bearer e chaves continuam ocultos junto a URL pública', () => {
 const output=redact('https://example.com/public-document-with-a-very-long-path\nCookie: session=valor-cookie\nAuthorization: Bearer valor-auth\nBearer valor-bearer\neyJabcdefgh.abcdefghijk.abcdefghijk\nsk-chaveficticia');
 for(const value of ['valor-cookie','valor-auth','valor-bearer','eyJabcdefgh','sk-chaveficticia']) assert.ok(!output.includes(value));
 assert.ok(output.includes('https://example.com/public-document-with-a-very-long-path'));
});


test('Fonte repetida não rejeita automaticamente acontecimentos distintos', () => {
 const value=response(g=>{g.noticias[1].url=g.noticias[0].url;});
 assert.equal(parseAndValidate(value,'2026-10-02').noticias.length,5);
});
