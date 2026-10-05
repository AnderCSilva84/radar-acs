'use strict';
const INTRO = 'Olá! Está começando o Radar ACS, seu briefing diário de tecnologia, inteligência artificial, carreira e oportunidades. Confira os assuntos importantes desta edição.';
function escapeXml(text) { return text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])); }
function getBriefingPlayback(briefing, prefix = '', options = {}) {
 if (!briefing || typeof briefing.roteiroAlexa !== 'string' || !briefing.roteiroAlexa.trim()) throw new Error('Roteiro inválido');
 // audioUrl reservado para AudioPlayer futuro. A fase atual sempre usa TTS.
 const parts = [prefix, options.introduction ?? INTRO, ...briefing.roteiroAlexa.trim().split(/\n\s*\n/), options.ending].filter(Boolean);
 const ssml = '<speak>' + parts.map(escapeXml).join('<break time="300ms"/>') + '</speak>';
 if (ssml.length > 8000) throw new Error('Roteiro excede o limite de voz da Alexa');
 return {type:'tts',ssml};
}
module.exports = {getBriefingPlayback,escapeXml};
