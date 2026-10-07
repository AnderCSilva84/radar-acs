import { adminFirebaseApp } from './adminAuth';
import { validateCreativeHeader } from './adCreative';
export const CREATIVE_BUCKET = 'radar-acs.firebasestorage.app';
export const SUPERADMIN_UID = 'GUM5PnF3wreizm9y2P3dSrgkH3s1';
export async function uploadCreative(user, campaignId, file) {
  if (user?.uid !== SUPERADMIN_UID) throw Error('Somente o superadmin pode enviar imagens.');
  if (!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(campaignId)) throw Error('ID da campanha inválido.');
  validateCreativeHeader(file, new Uint8Array(await file.slice(0, 12).arrayBuffer()));
  const app = await adminFirebaseApp(user);
  if (app.options.projectId !== 'radar-acs') throw Error('Projeto de armazenamento inválido.');
  const { getStorage, ref, uploadBytes } = await import('firebase/storage');
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
  const path = `advertising/${campaignId}/${crypto.randomUUID()}.${extension}`;
  try {
    await uploadBytes(ref(getStorage(app, `gs://${CREATIVE_BUCKET}`), path), file, {
      contentType: file.type, cacheControl: 'public,max-age=31536000,immutable'
    });
  } catch {
    throw Error('Não foi possível enviar a imagem. Confira conexão e permissão do Storage. A campanha não foi salva.');
  }
  // Public advertisement, authorized by Storage get rules; no download token in URL.
  return `https://firebasestorage.googleapis.com/v0/b/${CREATIVE_BUCKET}/o/${encodeURIComponent(path)}?alt=media`;
}
