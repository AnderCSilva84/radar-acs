'use strict';
const {getBriefingPlayback}=require('./playback');

// Validate only the final rendered presentation, never news eligibility.
// No editorial minimum word count or mandatory per-news custom speech.
function validateAudioScript(generated) {
    const script=generated.roteiroAlexa;
    const fail=message=>{throw Object.assign(new Error(message),{name:'ValidationError',code:'AUDIO_SCRIPT_INVALID',validation:'roteiroAlexa.renderizacao_final'})};
    if(typeof script!=='string'||!script.trim())fail('Roteiro final vazio');
    if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]|https?:\/\/|\bwww\.|\[[^\]]+\]\([^)]*\)|<\/?[a-z][^>]*>|【|\butm_[a-z_]+=/i.test(script))fail('Roteiro final não sanitizado');
    try{getBriefingPlayback(generated);}catch{fail('Roteiro final excede capacidade SSML');}
    return {palavras:script.trim().split(/\s+/).length};
}
module.exports={validateAudioScript};
