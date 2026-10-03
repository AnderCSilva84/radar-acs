'use strict';
const {onRequest}=require('firebase-functions/v2/https');
const {defineSecret}=require('firebase-functions/params');
const {initializeApp}=require('firebase-admin/app');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
const {createApi}=require('./handler');
initializeApp();const db=getFirestore();const token=defineSecret('RADAR_ADMIN_TOKEN');
const repository={
 async latest(){const result=await db.collection('briefings').where('publicado','==',true).orderBy('data','desc').limit(1).get();return result.empty?null:result.docs[0].data();},
 async save(briefing){const ref=db.collection('briefings').doc(briefing.id);await db.runTransaction(async tx=>{const existing=await tx.get(ref);tx.set(ref,{...briefing,criadoEm:existing.exists?existing.data().criadoEm:FieldValue.serverTimestamp(),atualizadoEm:FieldValue.serverTimestamp()});});}
};
exports.radarApi=onRequest({region:'us-east1',secrets:[token],timeoutSeconds:15,maxInstances:3,cors:false,invoker:'public'},createApi(repository,()=>token.value()));

// Execução manual somente. Não há Scheduler ou trigger recorrente.
const { createManualGenerator } = require('./manual-generator');
const { generateAndPublish } = require('./generator');
const { publishBriefing } = require('./publish-briefing');
const generatorConfig = require('./generator-config.json');
const openAIKey = defineSecret('OPENAI_API_KEY');
const { createExecutionLog } = require('./execution-log');
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
    getRedactions: () => [openAIKey.value(), token.value()],
    generate: id => generateAndPublish({
        redactions: [token.value()],
        checkpoint: snapshot => runs.snapshot(id, snapshot),
        apiKey: openAIKey.value(),
        publish: briefing => publishBriefing(briefing, { baseUrl: generatorConfig.apiBaseUrl, token: token.value() })
    })
}));
