import { it, expect, vi, beforeEach } from 'vitest';
const sdk = vi.hoisted(() => ({ uploadBytes: vi.fn(), ref: vi.fn((s, path) => path), getStorage: vi.fn(() => 'storage') }));
const app = vi.hoisted(() => ({ adminFirebaseApp: vi.fn() }));
vi.mock('firebase/storage', () => sdk);
vi.mock('./adminAuth', () => app);
import { uploadCreative, SUPERADMIN_UID } from './creativeUpload';
const file = { name: 'logo.png', type: 'image/png', size: 10, slice: () => ({ arrayBuffer: async () => Uint8Array.from([137,80,78,71,13,10,26,10]).buffer }) };
beforeEach(() => { vi.clearAllMocks(); app.adminFirebaseApp.mockResolvedValue({ options: { projectId: 'radar-acs' } }); sdk.uploadBytes.mockResolvedValue({}); });
it('outro UID e ID inválido não iniciam upload', async () => {
  await expect(uploadCreative({ uid: 'other' }, 'campaign', file)).rejects.toThrow('superadmin');
  await expect(uploadCreative({ uid: SUPERADMIN_UID }, '../escape', file)).rejects.toThrow('ID');
  expect(sdk.uploadBytes).not.toHaveBeenCalled();
});
it('upload usa bucket correto, nome único, MIME e URL pública sem token', async () => {
  const url = await uploadCreative({ uid: SUPERADMIN_UID }, 'campaign', file);
  expect(sdk.getStorage).toHaveBeenCalledWith(expect.anything(), 'gs://radar-acs.firebasestorage.app');
  expect(sdk.uploadBytes).toHaveBeenCalledWith(expect.stringMatching(/^advertising\/campaign\/[a-f0-9-]+\.png$/), file, expect.objectContaining({ contentType: 'image/png' }));
  expect(url).toMatch(/\?alt=media$/); expect(url).not.toMatch(/token|secret/);
});
it('projeto errado, arquivo inválido e erro remoto não expõem credenciais', async () => {
  app.adminFirebaseApp.mockResolvedValueOnce({ options: { projectId: 'app-artran' } });
  await expect(uploadCreative({ uid: SUPERADMIN_UID }, 'campaign', file)).rejects.toThrow('Projeto');
  await expect(uploadCreative({ uid: SUPERADMIN_UID }, 'campaign', { ...file, size: 6 * 1024 * 1024 })).rejects.toThrow('5 MB');
  sdk.uploadBytes.mockRejectedValueOnce(Error('secret-in-remote-error'));
  await expect(uploadCreative({ uid: SUPERADMIN_UID }, 'campaign', file)).rejects.toThrow('Não foi possível enviar');
});
