'use strict';
const {escapeXml}=require('./playback');
const {validateEditorialScript}=require('./validation');
const {validateVoice}=require('./voice-guide');

// Plain speech only: playback escapes XML exactly once at the Alexa boundary.
function sanitizeSpeech(value) {
    if(typeof value!=='string')return '';
    return value
        .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ')
        .replace(/\[([^\]]+)\]\([^)]*\)/gi,'$1')
        .replace(/https?:\/\/[^\s<>]+|\bwww\.[^\s<>]+/gi,' ')
        .replace(/<\/?[a-z][^>]*>/gi,' ')
        .replace(/&(?:amp|lt|gt|quot|apos|nbsp);|&#(?:\d+|x[\da-f]+);/gi,entity=>{
            const entities={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '};
            if(entities[entity.toLowerCase()])return entities[entity.toLowerCase()];
            const n=entity[2].toLowerCase()==='x'?parseInt(entity.slice(3,-1),16):Number(entity.slice(2,-1));
            return Number.isInteger(n)&&n>=32&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):' ';
        })
        .replace(/<\/?[a-z][^>]*>/gi,' ')
        .replace(/\[[\d,\s]+\]|【[^】]*】|\butm_[a-z_]+=[^\s]+/gi,' ')
        .replace(/(?:^|\n)\s*(?:#{1,6}\s+|[-*+]\s+)/g,' ')
        .replace(/\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|`([^`]+)`|\*([^*]+)\*|\b_([^_]+)_\b/g,(_, ...groups)=>groups.slice(0,6).find(value=>typeof value==='string') || '')
        .replace(/[\u0000-\u001f\u007f-\u009f]/g,' ')
        .replace(/\s+/g,' ').trim();
}
function usable(text) {return /[\p{L}\p{N}]/u.test(text);}
function customUsable(value,news) {
    if(typeof value!=='string'||/<[^>]*$|(?:\.\.\.|…|\b(?:e|ou|porque|para|com|de))\s*$/i.test(value))return false;
    const text=sanitizeSpeech(value);
    if(!usable(text)||text.split(/\s+/).length<2)return false;
    if(/\b(?:assunto anterior|notícia anterior|como mencionei|fechando a edição)\b/i.test(text))return false;
    try{validateEditorialScript(text);validateVoice([{...news,roteiroAlexa:text}]);return true;}catch{return false;}
}
function renderEditionAudio(edition) {
    let script='';const warnings=[];
    const noticias=edition.noticias.map(news=>{
        const supplied=news.speechSummary || news.roteiroAlexa;
        const personalized=customUsable(supplied,news)?sanitizeSpeech(supplied):'';
        const title=sanitizeSpeech(news.titulo),summary=sanitizeSpeech(news.resumo);
        const choices=[personalized,[title,summary].filter(Boolean).join('. '),summary].filter(usable);
        let chosen='';
        for(const choice of choices){
            try{validateEditorialScript(choice);validateVoice([{...news,roteiroAlexa:choice}]);}catch{continue;}
            const next=[script,choice].filter(Boolean).join('\n\n');
            // Presentation budget: omit speech only, never remove the PWA news.
            if(escapeXml(next).length<=6500){chosen=choice;script=next;break;}
        }
        if(!chosen)warnings.push({ordem:news.ordem,code:'AUDIO_ITEM_OMITTED'});
        else if(chosen!==personalized)warnings.push({ordem:news.ordem,code:'AUDIO_FALLBACK_TITLE_SUMMARY'});
        return {...news,roteiroAlexa:chosen};
    });
    if(!script)script='As notícias desta edição estão disponíveis no Radar ACS.';
    return {edition:{...edition,noticias,roteiroAlexa:script},warnings};
}
module.exports={sanitizeSpeech,renderEditionAudio,customUsable};
