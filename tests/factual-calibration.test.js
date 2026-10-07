'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { canonical, words, relevant, negated, modality, finalStatus } = require('../api/factual-calibration');
const { validateWriting } = require('../api/editorial-v2-generator');

function check(claim, evidence) {
    const second = 'O documento apresenta orientações de utilização e descreve as limitações para as equipes.';
    const candidate = { id: 'synthetic', title: 'Comunicado técnico', sourceName: 'Fonte', publishedAt: '2026-10-06', evidence: [{ id: 'one', text: evidence }, { id: 'two', text: second }] };
    const news = { candidateId: candidate.id, editorialSummary: claim + '\n\n' + second, speechSummary: claim,
        evidenceReferences: [{ field: 'editorialSummary', segment: claim, evidenceIds: ['one'] }, { field: 'editorialSummary', segment: second, evidenceIds: ['two'] }, { field: 'speechSummary', segment: claim, evidenceIds: ['one'] }] };
    return () => validateWriting(news, candidate);
}
for (const [a, b] of [['IA','AI'], ['inteligência artificial','artificial intelligence'], ['AÇÃO','acao'], ['Análise, técnica!','analise tecnica']]) {
    test('safe canonical equivalence: ' + a, () => assert.equal(canonical(a), canonical(b)));
}
test('AI acronym supported by AI evidence permits IA prose', () => assert.doesNotThrow(check('A ferramenta IA analisa documentos para revisão técnica.', 'A ferramenta AI analisa documentos para revisão técnica.')));
for (const entity of ['Mariana', 'InventCorp', 'Curitiba', 'FakeModel-9']) {
    test('unsupported entity remains blocked: ' + entity, () => assert.throws(check('A ferramenta de ' + entity + ' analisa documentos para revisão técnica.', 'A ferramenta analisa documentos para revisão técnica.'), { code: 'FACTUAL_EVIDENCE' }));
}
test('real negation inversion fails', () => assert.throws(check('A ferramenta publica documentos para revisão técnica.', 'A ferramenta não publica documentos para revisão técnica.'), { code: 'FACTUAL_EVIDENCE' }));
test('equivalent negation passes', () => assert.doesNotThrow(check('A ferramenta não publica documentos para revisão técnica.', 'Para revisão técnica, a ferramenta não publica documentos.')));
test('explicit safe noun plurals affect anchoring only', () => assert.deepEqual(words('documentos ferramentas'), words('documento ferramenta')));
test('full technical expression supports acronym', () => assert.doesNotThrow(check('A ferramenta IA analisa documentos para revisão técnica.', 'A ferramenta artificial intelligence analisa documentos para revisão técnica.')));
test('unrelated referenced negation is not inherited', () => {
    const claim = 'A ferramenta analisa documentos para revisão técnica.';
    assert.equal(negated(relevant(claim, claim + ' As inscrições não começaram.')), false);
});
test('possibility cannot become certainty', () => assert.throws(check('A ferramenta publica documentos para revisão técnica.', 'A ferramenta pode publicar documentos para revisão técnica.'), { code: 'FACTUAL_EVIDENCE' }));
test('certainty cannot gain unsupported uncertainty', () => assert.throws(check('A ferramenta pode publicar documentos para revisão técnica.', 'A ferramenta publica documentos para revisão técnica.'), { code: 'FACTUAL_EVIDENCE' }));
test('preserved modality passes', () => assert.doesNotThrow(check('A ferramenta pode publicar documentos para revisão técnica.', 'A ferramenta pode publicar documentos para revisão técnica.')));
test('normative previsto is not possibility', () => { assert.equal(modality('A medida cumpre o previsto na MP 1.394/2026.'), 'ASSERTED'); assert.equal(modality('O lançamento está previsto para amanhã.'), 'POSSIBLE'); });
for (const [a, b] of [['20','21'], ['2026-10-06','2026-10-07']]) test('changed number/date blocked: ' + a, () => assert.throws(check('A ferramenta analisa ' + a + ' documentos para revisão técnica.', 'A ferramenta analisa ' + b + ' documentos para revisão técnica.'), { code: 'FACTUAL_EVIDENCE' }));
test('unrelated reference remains blocked', () => assert.throws(check('A ferramenta analisa documentos para revisão técnica.', 'O clube organiza partidas de futebol no estádio.'), { code: 'FACTUAL_EVIDENCE' }));
test('final never passes a failed mandatory check', () => {
    const keys = ['factual','numeric','identifier','negation','modality','url','source'];
    const good = Object.fromEntries(keys.map(key => [key, 'PASS']));
    assert.equal(finalStatus(good), 'PASS');
    for (const key of keys) assert.equal(finalStatus({ ...good, [key]: 'FAIL' }), 'FAIL');
    assert.equal(finalStatus({ ...good, error: { message: 'voice failed' } }), 'FAIL');
});
