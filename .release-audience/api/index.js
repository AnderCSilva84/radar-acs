'use strict';
const {onRequest}=require('firebase-functions/v2/https');
const {defineSecret,defineString}=require('firebase-functions/params');
const {getAuth}=require('firebase-admin/auth');
const {initializeApp}=require('firebase-admin/app');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
const {createApi}=require('./handler');
const {loadHistory}=require('./history');
initializeApp();const db=getFirestore();const token=defineSecret('RADAR_ADMIN_TOKEN');
const repository={
 async history(options){return loadHistory(db,options);},
 async latest(){const result=await db.collection('briefings').where('publicado','==',true).orderBy('data','desc').limit(1).get();return result.empty?null:result.docs[0].data();},
 async save(briefing,options={}){const ref=db.collection('briefings').doc(briefing.id);await db.runTransaction(async tx=>{const existing=await tx.get(ref);if(options.onlyIfUnpublished){const numbered=await tx.get(db.collection('briefings').where('titulo','==',briefing.titulo).limit(1));if(!numbered.empty)throw Object.assign(new Error('Número de edição já publicado'),{code:'EDITION_NUMBER_EXISTS'});}if(options.onlyIfUnpublished&&existing.exists)throw Object.assign(new Error('Edição já publicada'),{code:'ALREADY_PUBLISHED'});tx.set(ref,{...briefing,criadoEm:existing.exists?existing.data().criadoEm:FieldValue.serverTimestamp(),atualizadoEm:FieldValue.serverTimestamp()});});}
};
const adminUid=defineString('ADMIN_UID',{default:''});
const editorialRepository=require('./editorial-settings').createEditorialRepository(db);
const adminSettings=require('./admin-settings').createAdminSettings({repository:{get:()=>editorialRepository.get(),save:async value=>{await editorialRepository.save(value);cachedEditorial.invalidate();}},verifyIdToken:(value,revoked)=>getAuth().verifyIdToken(value,revoked),getAdminUid:()=>adminUid.value()});
const advertisingRepository=require('./advertising').createAdvertisingRepository(db);
repository.advertising=()=>advertisingRepository.get();
const adminAdvertising=require('./admin-settings').createAdminSettings({repository:advertisingRepository,verifyIdToken:(value,revoked)=>getAuth().verifyIdToken(value,revoked),getAdminUid:()=>adminUid.value(),validate:require('./advertising').validateAdvertising,defaults:()=>({campaigns:[]})});
const { cachedRead, createLive } = require('./live');
const mediaRepository = require('./live-media').createMediaRepository(db);
const cachedEditorial = cachedRead(() => editorialRepository.get());
const cachedMedia = cachedRead(() => mediaRepository.get());
const { FootballProvider, createCachedFootball } = require('./live-providers');
const live = createLive({ settings: cachedEditorial, media: cachedMedia, football: createCachedFootball(new FootballProvider()) });
const adminMedia = require('./admin-settings').createAdminSettings({ repository: { get: () => mediaRepository.get(), save: async value => { await mediaRepository.save(value); cachedMedia.invalidate(); } }, verifyIdToken:(value,revoked)=>getAuth().verifyIdToken(value,revoked),getAdminUid:()=>adminUid.value(),validate:require('./live-media').validateMedia,defaults:()=>({media:[]}) });
const audienceModule=require('./audience');
const audience=audienceModule.createAudience({repository:audienceModule.createAudienceRepository(db),verifyIdToken:(value,revoked)=>getAuth().verifyIdToken(value,revoked),getAdminUid:()=>adminUid.value()});
exports.radarApi=onRequest({region:'us-east1',secrets:[token],timeoutSeconds:15,maxInstances:3,cors:false,invoker:'public'},createApi(repository,()=>token.value(),adminSettings,adminAdvertising,live,adminMedia,audience));

// Execução manual somente. Não há Scheduler ou trigger recorrente.
const { createManualGenerator } = require('./manual-generator');
const { generateRadarEdition } = require('./generator');
const { publishBriefing } = require('./publish-briefing');
const generatorConfig = require('./generator-config.json');
const openAIKey = defineSecret('OPENAI_API_KEY');
const { createExecutionLog } = require('./execution-log');
const { createDiagnosticBuffer, withConsolidatedDiagnostic } = require('./consolidated-diagnostic');
const runs = createExecutionLog(db, () => FieldValue.serverTimestamp());

exports.generateRadarManual = onRequest({
    region: 'us-east1',
    secrets: [openAIKey, token],
    timeoutSeconds: 540,
    memory: '512MiB',
    maxInstances: 1,
    concurrency: 1,
    cors: false,
    invoker: 'private'
}, createManualGenerator({
    runs,
    canGenerate: async () => {
        const date = require('./generator').editorialDate();
        if (await scheduledRepository.published(date)) return false;
        const latest = await scheduledRepository.latest();
        return !latest || latest.data <= date;
    },
    getRedactions: () => [openAIKey.value(), token.value()],
    generate: async id => {
        const date = require('./generator').editorialDate();
        if (!await scheduledRepository.reserve(date)) throw Object.assign(new Error('Data já reservada; geração cancelada'), { code: 'ALREADY_RESERVED' });
        const previous = await scheduledRepository.latest();
        if (previous?.data > date) throw Object.assign(new Error('Latest posterior à data editorial'), { code: 'LATEST_GUARD_FAILED' });
        const diagnostic = createDiagnosticBuffer(snapshot => runs.snapshot(id, snapshot), [openAIKey.value(), token.value()], { technicalOnly: true });
        return withConsolidatedDiagnostic(diagnostic, () => generateRadarEdition({
        getEditorialSettings: () => editorialRepository.get(),
        context: require('./edition-context').editionContext(date),
        finalTitle: require('./edition-context').editionTitle(date, previous?.titulo),
        redactions: [token.value()],
        checkpoint: snapshot => diagnostic.capture(snapshot),
        evidenceCheckpoint: candidates => diagnostic.candidates(candidates),
        getRecentNews: async () => require('./recent-news').compactHistory(previous ? [previous] : []),
        apiKey: openAIKey.value(),
        publish: briefing => publishBriefing(briefing, { baseUrl: generatorConfig.apiBaseUrl, token: token.value(), onlyIfUnpublished: true })
        }));
    }
}));

// Only IAM-authorized Scheduler can invoke this private endpoint.
const { createScheduledGenerator } = require('./scheduled-generator');
const { createScheduledRepository } = require('./scheduled-repository');
const scheduledRepository = createScheduledRepository(db, () => FieldValue.serverTimestamp());
exports.generateRadarScheduled = onRequest({
    region: 'us-east1', secrets: [openAIKey, token], invoker: ['radar-scheduler@radar-acs.iam.gserviceaccount.com'],
    timeoutSeconds: 540, memory: '512MiB', maxInstances: 1, concurrency: 1, cors: false
}, createScheduledGenerator({
    getRedactions: () => [openAIKey.value(), token.value()],
    repository: scheduledRepository,
    generate: options => {
        let recorded = false, lastSummary;
        const diagnostic = createDiagnosticBuffer(async summary => {
            recorded = true;
            await scheduledRepository.recordResult(options.date, summary);
        }, [openAIKey.value(), token.value()], {
            technicalOnly: true, date: options.date,
            editionNumber: /#(\d+)/.exec(options.finalTitle)?.[1] || null,
            onSummary: summary => { lastSummary = summary; console.info('RADAR_EXECUTION_SUMMARY', summary); }
        });
        return withConsolidatedDiagnostic(diagnostic, () => generateRadarEdition({
        getEditorialSettings: () => editorialRepository.get(),
        ...options, apiKey: openAIKey.value(), redactions: [token.value()],
        checkpoint: snapshot => diagnostic.capture(snapshot), evidenceCheckpoint: candidates => diagnostic.candidates(candidates),
        publish: briefing => publishBriefing(briefing, { baseUrl: generatorConfig.apiBaseUrl, token: token.value(), onlyIfUnpublished: true })
        })).catch(async error => {
            if (lastSummary?.metrics) error.metrics = lastSummary.metrics;
            if (!recorded) {
                const summary = { date: options.date, editionNumber: /#(\d+)/.exec(options.finalTitle)?.[1] || null,
                    candidatosGerados: null, candidatosValidos: null, candidatosRejeitados: null,
                    publicado: false, status: 'FAILED', erro: require('./diagnostics').errorSnapshot(error, [openAIKey.value(), token.value()]) };
                console.info('RADAR_EXECUTION_SUMMARY', summary);
                try { await scheduledRepository.recordResult(options.date, summary); } catch { console.error('RADAR_DIAGNOSTIC_WRITE_FAILED'); }
            }
            throw error;
        });
    }
}));
