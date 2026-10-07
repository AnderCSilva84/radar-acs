'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { collectEvidence } = require('../api/source-evidence');
const { validateVoice, prompt } = require('../api/voice-guide');
const { estimatedDurationSeconds } = require('../api/narration-duration');
const { diagnosticSnapshot } = require('../api/diagnostics');
const { validateBriefing } = require('../api/validation');
const { publishBriefing } = require('../api/publish-briefing');
const { createExecutionLog } = require('../api/execution-log');

const first = 'A equipe lançou GPT-9 Sol com documentação para desenvolvedores e exemplos de integração em projetos de software.';
const second = 'A nova API está disponível e permite organizar tarefas de desenvolvimento com recursos documentados para as equipes.';
function candidate() {
    return { ordem: 1, titulo: 'Equipe lançou GPT-9 Sol', resumo: 'Nova API disponível.', contexto: '', roteiroAlexa: 'Equipe lançou GPT-9 Sol. Nova API disponível.', url: 'https://example.com/long-public-news-source-path-preserved', fonte: 'Equipe', evidencia: first,
        evidencias: [first, second], allowedFacts: [{ texto: 'Equipe lançou GPT-9 Sol.', evidenciaIndices: [0] }, { texto: 'Nova API disponível.', evidenciaIndices: [1] }], termosEspecificos: ['GPT-9 Sol', 'API'] };
}
test('múltiplos trechos confirmados da mesma fonte sustentam fatos diferentes com uma leitura', async () => {
    let reads = 0;
    const result = await collectEvidence([candidate()], async () => { reads++; return first + ' ' + second; });
    assert.equal(result.resultado, 'PASS'); assert.equal(reads, 1);
    assert.equal(result.candidatos[0].evidenceCount, 2);
    assert.equal(result.candidatos[0].allowedFactsCount, 2);
});
test('fato fora de allowedFacts e vínculo inválido são rejeitados individualmente', async () => {
    for (const update of [n => { n.allowedFacts = n.allowedFacts.slice(1); }, n => { n.allowedFacts[0].evidenciaIndices = [8]; }, n => { n.roteiroAlexa += ' Preço de 99 reais.'; }]) {
        const n = candidate(); update(n);
        const result = await collectEvidence([n], async () => first + ' ' + second);
        assert.equal(result.candidatos[0].status, 'FAIL');
        assert.ok(result.candidatos[0].reason); assert.equal(result.noticias.length, 0);
    }
});
test('trecho não confirmado invalida candidato mesmo quando outro trecho está presente', async () => {
    const result = await collectEvidence([candidate()], async () => first);
    assert.equal(result.candidatos[0].status, 'FAIL');
});
test('voz natural dispensa rótulos e menções à ACS', () => {
    assert.deepEqual(validateVoice([{ titulo: 'Ferramenta atualizada', resumo: 'Documentação publicada.', roteiroAlexa: 'Essa chamou minha atenção. Talvez valha avaliar a ferramenta.' }]), { warnings: [], mentions: 0 });
});
test('rótulos falados são rejeitados e excesso de ACS gera sinal editorial', () => {
    for (const text of ['Contexto ACS: testar.', 'Por que isso importa para você: testar.']) {
        assert.throws(() => validateVoice([{ roteiroAlexa: text }]));
    }
    assert.deepEqual(validateVoice([{ roteiroAlexa: 'ACS Tecnologia. ACS. ACS.' }]).warnings, ['ACS_MENTIONS_EXCESSIVE']);
});
test('reação claramente inadequada a notícia grave é rejeitada, tom sóbrio aceito', () => {
    const n = { titulo: 'Teste de míssil', resumo: 'Tensão militar.' };
    assert.throws(() => validateVoice([{ ...n, roteiroAlexa: 'Olha que bacana.' }]));
    assert.doesNotThrow(() => validateVoice([{ ...n, roteiroAlexa: 'Agora uma notícia importante no cenário internacional.' }]));
});
test('abertura local da Skill é neutra em relação à quantidade', () => {
    const speech = require('../lambda/playback').getBriefingPlayback({ roteiroAlexa: 'Conteúdo editorial.' }).ssml;
    assert.ok(!/separei\s+(?:tr[eê]s|quatro|cinco)|(?:tr[eê]s|quatro|cinco)\s+assuntos/i.test(speech));
});
test('duração estimada usa ritmo central e valida parâmetro', () => {
    assert.equal(estimatedDurationSeconds('palavra '.repeat(140)), 60);
    assert.equal(estimatedDurationSeconds(''), 0);
    assert.throws(() => estimatedDurationSeconds('texto', 0));
});
test('snapshot preserva fatos, evidências e URLs públicas e mascara segredo', () => {
    const n = candidate(); const secret = 'secret-test-value'; n.allowedFacts[0].texto += ' ' + secret;
    const snap = diagnosticSnapshot({ output: [] }, { noticias: [n] }, {}, [secret]);
    assert.equal(snap.resultadoEstruturado.noticias[0].url, n.url);
    assert.equal(snap.resultadoEstruturado.noticias[0].evidencias.length, 2);
    assert.ok(!JSON.stringify(snap).includes(secret));
});
test('diagnóstico individual é atualizado no documento existente e sanitizado', async () => {
    let written;
    const runs = createExecutionLog({ collection: name => { assert.equal(name, 'geracoesDiagnostico'); return { doc: id => { assert.equal(id, 'run'); return { update: async value => { written = value; } }; } }; } }, () => 0);
    await runs.evidence('run', [{ sourceUrl: candidate().url, reason: 'secret-short', status: 'FAIL' }], ['secret-short']);
    assert.equal(written.candidatos[0].sourceUrl, candidate().url);
    assert.equal(written.candidatos[0].reason, '[REDACTED]');
});
test('edição #002 mantém contrato manual e publicador sem conferência externa (mock)', async () => {
    const b = JSON.parse(fs.readFileSync('tests/fixtures/editorial-edicao-002.json', 'utf8'));
    assert.equal(validateBriefing(b).noticias.length, 5);
    let calls = 0;
    await publishBriefing(b, { baseUrl: 'https://example.com', token: 'x'.repeat(40), fetchImpl: async () => { calls++; return { ok: true, json: async () => ({ success: true, id: b.data, publicado: true }) }; } });
    assert.equal(calls, 1);
});
test('prompt solicita conversa e schema simples dispensa prova de fatos', () => {
    const request = require('./helpers/legacy-generator').buildRequest('2026-10-03');
    const schema = request.text.format.schema.properties.noticias.items;
    assert.ok(!schema.required.includes('allowedFacts')); assert.ok(!schema.required.includes('evidencias'));
    assert.ok(schema.required.includes('fonte')); assert.ok(schema.required.includes('url'));
    assert.ok(request.instructions.includes(prompt));
});
test('contrato editorial aceita 1–7 e rejeita 0 e 8 notícias', () => {
    const input = require('./fixtures/editorial-edicao-002.json');
    for (const count of [1, 2, 3, 4, 5, 6, 7]) {
        assert.equal(validateBriefing({ ...input, noticias: Array.from({length:count},(_,i)=>({...input.noticias[i%5],ordem:i+1})) }).noticias.length, count);
    }
    assert.throws(() => validateBriefing({ ...input, noticias: [] }));
    assert.throws(() => validateBriefing({ ...input, noticias: Array.from({length:8},(_,i)=>({...input.noticias[i%5],ordem:i+1})) }));
});
test('diagnóstico de fontes coletadas não descarta candidatos por ausência de prova posterior', async () => {
    const response = require('./fixtures/generated-response.json');
    let saved, ai = 0;
    await require('./helpers/legacy-generator').generateAndPublish({
        apiKey: 'fake', now: () => new Date('2026-10-02T12:00:00Z'),
        fetchImpl: async () => { ai++; return { ok: true, json: async () => response }; },
        readSource: async () => assert.fail('Não revalidar'), evidenceCheckpoint: async candidates => { saved = candidates; },
        publish: async () => {}, logger: { info() {} }
    });
    assert.equal(ai, 1); assert.equal(saved.length, 5);
    assert.ok(saved.every(n => n.status === 'WARNING' && n.sourceUrl.startsWith('https://') && n.reason));
});
