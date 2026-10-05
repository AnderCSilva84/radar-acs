import { expect, it, vi, beforeEach } from 'vitest';
const sdk = vi.hoisted(() => ({ getAuth: vi.fn(() => ({ sdk: true })), setPersistence: vi.fn(async () => {}), onAuthStateChanged: vi.fn(() => () => {}), signInWithEmailAndPassword: vi.fn(async () => ({ user: {} })), signOut: vi.fn(async () => {}), initializeApp: vi.fn(config => ({ config })), getApps: vi.fn(() => []), browserSessionPersistence: { type: 'SESSION' } }));
vi.mock('firebase/app', () => ({ initializeApp: sdk.initializeApp, getApps: sdk.getApps }));
vi.mock('firebase/auth', () => sdk);
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); });
it('inicializa apenas projeto radar-acs e usa SDK Email/Password sem armazenar senha', async () => {
  const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ projectId: 'radar-acs', apiKey: 'public-config-key', authDomain: 'radar-acs.firebaseapp.com' }) })); vi.stubGlobal('fetch', fetch);
  const { loginAdmin, observeAdmin, logoutAdmin } = await import('./adminAuth');
  await loginAdmin('acs@acs.com', 'test-only-password'); await observeAdmin(() => {}); await logoutAdmin();
  expect(fetch).toHaveBeenCalledTimes(1); expect(sdk.setPersistence).toHaveBeenCalledWith({ sdk: true }, sdk.browserSessionPersistence);
  expect(sdk.signInWithEmailAndPassword).toHaveBeenCalledWith({ sdk: true }, 'acs@acs.com', 'test-only-password');
  expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
});
it('recusa configuração de outro projeto antes de inicializar Auth', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ projectId: 'app-artran', apiKey: 'public-key', authDomain: 'other.firebaseapp.com' }) })));
  const { loginAdmin } = await import('./adminAuth'); await expect(loginAdmin('acs@acs.com', 'unused')).rejects.toThrow('não configurada');
  expect(sdk.initializeApp).not.toHaveBeenCalled(); expect(sdk.signInWithEmailAndPassword).not.toHaveBeenCalled();
});
it('PUT usa ID token somente no header, uma requisição e erro seguro sem corpo remoto', async () => {
  const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ success: true, settings: { editorial: {} } }) })); vi.stubGlobal('fetch', fetch);
  const { editorialRequest } = await import('./adminAuth'); const user = { getIdToken: vi.fn(async () => 'test-only-id-token') };
  await editorialRequest(user, { editorial: {} }); expect(fetch).toHaveBeenCalledTimes(1);
  const [, options] = fetch.mock.calls[0]; expect(options.headers.Authorization).toBe('Bearer test-only-id-token'); expect(options.body).not.toContain('test-only-id-token');
  fetch.mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: 'SECRET' }) }); await expect(editorialRequest(user)).rejects.toThrow('Acesso negado.');
  expect(localStorage.length).toBe(0);
});
