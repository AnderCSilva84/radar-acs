'use strict';
const { randomUUID } = require('node:crypto');
const policyVersion = 3;
const leaseMs = 15 * 60 * 1000;

// Narrow legacy incident evidence, read from Cloud Logging before this correction.
// It authorizes one recovery of this failed reservation, not a general retry bypass.
const incident = {
    date: '2026-10-04', previousDate: '2026-10-03',
    previousTitle: 'Radar ACS — Edição #002', title: 'Radar ACS — Edição #003',
    reservationTime: '2026-10-04T11:00:03.823Z',
    failureTime: '2026-10-04T11:00:24.198061Z',
    revision: 'generateradarscheduled-00001-kay',
    stage: 'FACTUAL_EVIDENCE', code: 'INSUFFICIENT_VERIFIED_NEWS'
};
// Explicit human authorization for this final incident attempt; not a credential.
const exceptionalAuthorization = 'final-2026-10-04-f2401621';
function createScheduledRepository(db, serverTimestamp) {
    const reservation = date => db.collection('geracoesManuais').doc('scheduled-' + date);
    const latestQuery = () => db.collection('briefings').where('publicado', '==', true).orderBy('data', 'desc').limit(1);
    return {
        async claim(date, now = new Date()) {
            const runId = randomUUID();
            return db.runTransaction(async tx => {
                const edition = await tx.get(db.collection('briefings').doc(date));
                const record = await tx.get(reservation(date));
                const saved = record.exists ? record.data() : {};
                if (edition.exists || saved.status === 'PUBLISHED') return { acquired: false, status: 'SKIPPED_ALREADY_PUBLISHED' };
                const started = saved.startedAt?.toDate?.() || new Date(saved.startedAt || 0);
                if (['RUNNING', 'RESERVED', 'RECOVERING', 'RECOVERING_EXCEPTIONAL'].includes(saved.status)
                    && (!Number.isFinite(started.getTime()) || now - started < leaseMs)) {
                    return { acquired: false, status: 'SKIPPED_RUNNING' };
                }
                // One explicit policy migration of old FAILED records; preserve incident fields.
                // It does not erase or reopen the old recovery guards.
                if (record.exists && saved.policyVersion !== policyVersion && saved.status !== 'FAILED') {
                    return { acquired: false, status: 'SKIPPED_LEGACY_RESERVATION' };
                }
                const attempts = saved.policyVersion === policyVersion ? saved.attempts || 0 : 0;
                if (attempts >= 1) {
                    if (saved.status === 'RUNNING') tx.update(reservation(date), { status: 'FAILED', atualizadoEm: serverTimestamp(), failureCode: 'RUNNING_LEASE_EXPIRED' });
                    return { acquired: false, status: 'SKIPPED_ATTEMPTS_EXHAUSTED' };
                }
                const patch = { tipo: 'scheduled-reservation', data: date, policyVersion, status: 'RUNNING',
                    attempts: attempts + 1, runId, startedAt: now, atualizadoEm: serverTimestamp(),
                    ...(record.exists ? {} : { criadoEm: serverTimestamp() }),
                    ...(record.exists && saved.policyVersion !== policyVersion ? {
                        ...(!saved.legacyIncident ? { legacyIncident: { status: saved.status, ultimoResultado: saved.ultimoResultado || null } } : {}),
                        previousPolicyVersion: saved.policyVersion || null, previousPolicyAttempts: saved.attempts || 0,
                        policyMigratedAt: serverTimestamp()
                    } : {}) };
                tx.set(reservation(date), patch, { merge: true });
                return { acquired: true, runId, attempt: attempts + 1 };
            });
        },
        async finishAttempt(date, runId, outcome) {
            return db.runTransaction(async tx => {
                const edition = await tx.get(db.collection('briefings').doc(date));
                const record = await tx.get(reservation(date));
                if (!record.exists || record.data().runId !== runId) throw Object.assign(new Error('Lease de execução alterado'), { code: 'RUN_LEASE_LOST' });
                const published = edition.exists;
                tx.update(reservation(date), { status: published ? 'PUBLISHED' : 'FAILED',
                    atualizadoEm: serverTimestamp(),
                    attemptResults: { ...(record.data().attemptResults || {}),
                        ['v' + policyVersion + '-' + record.data().attempts]: { ...outcome, publicado: published } } });
                return published;
            });
        },
        // Any existing edition, including draft, prevents a new generation.
        async published(date) { return (await db.collection('briefings').doc(date).get()).exists; },
        async reserve(date) {
            try { await reservation(date).create({ tipo: 'scheduled-reservation', data: date, status: 'RESERVED', criadoEm: serverTimestamp() }); return true; }
            catch (error) { if (error.code === 6 || error.code === 'already-exists') return false; throw error; }
        },
        async latest() { const result = await latestQuery().get(); return result.empty ? null : result.docs[0].data(); },
        async recover(date) {
            if (date !== incident.date) return false;
            return db.runTransaction(async tx => {
                const edition = await tx.get(db.collection('briefings').doc(date));
                const record = await tx.get(reservation(date));
                const numbered = await tx.get(db.collection('briefings').where('titulo', '==', incident.title).limit(1));
                const latest = await tx.get(latestQuery());
                if (edition.exists || !numbered.empty || !record.exists || latest.empty) return false;
                const previous = latest.docs[0].data();
                const saved = record.data();
                const knownFailure = saved.status === 'FAILED' || (
                    saved.tipo === 'scheduled-reservation' && saved.data === incident.date
                    && saved.criadoEm?.toDate().toISOString() === incident.reservationTime
                    && !saved.status
                );
                if (!knownFailure || saved.recoveryAttempted || previous.data !== incident.previousDate || previous.titulo !== incident.previousTitle) return false;
                tx.update(reservation(date), {
                    recoveryAttempted: true, status: 'RECOVERING', recoveryStartedAt: serverTimestamp(),
                    recoveredIncident: { failureTime: incident.failureTime, revision: incident.revision, stage: incident.stage, code: incident.code }
                });
                return true;
            });
        },
        async recoverExceptional(date, authorization) {
            if (date !== incident.date || authorization !== exceptionalAuthorization) return false;
            return db.runTransaction(async tx => {
                const edition = await tx.get(db.collection('briefings').doc(date));
                const record = await tx.get(reservation(date));
                const numbered = await tx.get(db.collection('briefings').where('titulo', '==', incident.title).limit(1));
                const publishedToday = await tx.get(db.collection('briefings').where('data', '==', date).where('publicado', '==', true).limit(1));
                const latest = await tx.get(latestQuery());
                if (edition.exists || !numbered.empty || !publishedToday.empty || !record.exists || latest.empty) return false;
                const saved = record.data();
                const previous = latest.docs[0].data();
                if (saved.data !== incident.date || saved.tipo !== 'scheduled-reservation'
                    || saved.status !== 'FAILED' || saved.recoveryAttempted !== true
                    || saved.exceptionalRecoveryConsumed === true
                    || previous.data !== incident.previousDate || previous.titulo !== incident.previousTitle) return false;
                tx.update(reservation(date), {
                    exceptionalRecoveryConsumed: true,
                    exceptionalRecoveryAuthorization: exceptionalAuthorization,
                    exceptionalRecoveryStartedAt: serverTimestamp(),
                    status: 'RECOVERING_EXCEPTIONAL'
                });
                return true;
            });
        },
        async recordResult(date, summary) {
            // The lease owner alone transitions state. Diagnostic writes cannot release it.
            await reservation(date).update({ ultimoResultado: summary, atualizadoEm: serverTimestamp() });
        }
    };
}
module.exports = { createScheduledRepository, incident, exceptionalAuthorization, policyVersion, leaseMs };
