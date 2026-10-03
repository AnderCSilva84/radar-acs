'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateDistinctNews } = require('../api/news-duplicates');
const { verifyEvidence, publicIPv4 } = require('../api/source-evidence');
const { generateAndPublish } = require('../api/generator');
const fixture = require('./fixtures/generated-response.json');
const first = { ordem: 1, titulo: 'Biblioteca de testes ganha relatórios locais', resumo: 'Equipe lança biblioteca para testes rápidos com relatórios locais e exemplos públicos nesta semana.', url: 'https://example.com/releases', fonte: 'Equipe', evidencia: 'Equipe lança biblioteca para testes rápidos com relatórios locais e exemplos públicos nesta semana.' };
const second = { ordem: 2, titulo: 'Curso gratuito de redes abre inscrições', resumo: 'Universidade abre inscrições para curso gratuito de redes e administração de servidores no Brasil.', url: first.url, fonte: 'Universidade', evidencia: 'Universidade abre inscrições para curso gratuito de redes e administração de servidores no Brasil.' };

test('Título normalizado idêntico rejeita duplicidade mesmo com fontes diferentes', () => {
    assert.throws(() => validateDistinctNews([first, { ...first, titulo: 'BIBLIOTECA DE TESTES GANHA RELATÓRIOS LOCAIS!', url: 'https://other.example/news' }]), e => e.code === 'NEWS_DUPLICATE');
});
test('Resumo praticamente idêntico rejeita títulos diferentes', () => {
    assert.throws(() => validateDistinctNews([first, { ...second, resumo: first.resumo }]), e => e.code === 'NEWS_DUPLICATE');
});
test('Mesma URL permite assuntos com títulos e resumos diferentes', () => {
    assert.equal(validateDistinctNews([first, second]).resultado, 'PASS');
});
test('Mesma página precisa conter os dois trechos; leitura é reutilizada em memória', async () => {
    let reads = 0;
    const result = await verifyEvidence([first, second], async () => { reads++; return '<p>' + first.evidencia + '</p><p>' + second.evidencia + '</p>'; });
    assert.equal(result.resultado, 'PASS'); assert.equal(reads, 1);
});
test('Trecho inventado ou ausência de evidência impede factualidade', async () => {
    await assert.rejects(verifyEvidence([first], async () => '<p>Outro anúncio diferente</p>'), e => e.code === 'FACTUAL_EVIDENCE_UNCONFIRMED');
    await assert.rejects(verifyEvidence([{ ...first, evidencia: '' }], async () => assert.fail('Não deve consultar')), /insuficiente/);
});
test('Modelo/versão sem apoio no trecho confirmado é rejeitado', async () => {
    await assert.rejects(verifyEvidence([{ ...first, titulo: 'Equipe lança GPT-99 Sol' }], async () => first.evidencia), /produto\/modelo\/versão/);
});
test('Redes internas não podem ser usadas como fonte', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.0.1', '169.254.169.254', '100.64.0.1', '::1']) assert.equal(publicIPv4(ip), false);
    assert.equal(publicIPv4('8.8.8.8'), true);
});
test('Falha factual preserva resultado e impede publicação sem retry OpenAI', async () => {
    let ai = 0, snapshots = 0, publications = 0;
    await assert.rejects(generateAndPublish({
        apiKey: 'fake', now: () => new Date('2026-10-02T12:00:00Z'),
        fetchImpl: async () => { ai++; return { ok: true, json: async () => fixture }; },
        readSource: async () => '<p>Sem evidência</p>', checkpoint: async value => {
            snapshots++; assert.equal(value.status, 'GENERATED_NOT_PUBLISHED');
            assert.ok(value.respostaEditorialBruta.includes('https://example.com'));
            assert.ok(value.resultadoEstruturado.noticias[0].evidencia);
        }, publish: async () => { publications++; }, logger: { info() {} }
    }), e => e.stage === 'FACTUAL_EVIDENCE');
    assert.equal(ai, 1); assert.equal(snapshots, 1); assert.equal(publications, 0);
});
