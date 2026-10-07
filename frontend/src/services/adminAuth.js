import { initializeApp, getApps } from 'firebase/app';
import { getAuth, setPersistence, browserSessionPersistence, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
let initialized;
async function auth() {
  if (!initialized) initialized = (async () => {
    const response = await fetch('/__/firebase/init.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Autenticação não configurada.');
    const config = await response.json();
    if (config.projectId !== 'radar-acs' || !config.apiKey || !config.authDomain) throw new Error('Autenticação não configurada.');
    const instance = getAuth(getApps().find(app => app.name === 'radar-admin') || initializeApp(config, 'radar-admin'));
    await setPersistence(instance, browserSessionPersistence);
    return instance;
  })().catch(error => { initialized = undefined; throw error; });
  return initialized;
}
export async function observeAdmin(callback) { return onAuthStateChanged(await auth(), callback); }
export async function loginAdmin(email, password) { return signInWithEmailAndPassword(await auth(), email, password); }
export async function logoutAdmin() { return signOut(await auth()); }
export async function adminFirebaseApp(user) {
  const instance = await auth();
  if (!user || instance.currentUser?.uid !== user.uid) throw Error('Autenticação necessária.');
  return instance.app;
}
async function adminRequest(user, settings, path) {
  if (!user) throw new Error('Autenticação necessária.');
  const response = await fetch(path, {
    method: settings ? 'PUT' : 'GET',
    headers: { Authorization: 'Bearer ' + await user.getIdToken(), ...(settings ? { 'Content-Type': 'application/json' } : {}) },
    ...(settings ? { body: JSON.stringify(settings) } : {}), cache: 'no-store', redirect: 'error'
  });
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Acesso negado.' : 'Configurações indisponíveis.');
  const result = await response.json();
  if (!result.success || !result.settings) throw new Error('Configurações indisponíveis.');
  return result.settings;
}
export const editorialRequest = (user, settings) => adminRequest(user, settings, '/api/admin/editorial');
export const advertisingRequest = (user, settings) => adminRequest(user, settings, '/api/admin/advertisers');
export const mediaRequest = (user, settings) => adminRequest(user, settings, '/api/admin/radios');
