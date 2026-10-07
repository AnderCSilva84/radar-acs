export const creativeSlots = {
  HOME_TOP: [1200, 300], HOME_MIDDLE: [1200, 400], HOME_BOTTOM: [1200, 400],
  HISTORY: [1200, 400], SIDEBAR: [600, 750], SPECIAL_SPONSOR: [1200, 400]
};
export const MAX_CREATIVE_BYTES = 5 * 1024 * 1024;
const formats = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
export function validateCreativeHeader(file, bytes) {
  const extension = file.name.split('.').pop().toLowerCase();
  if (!formats[extension] || formats[extension] !== file.type) throw Error('Selecione JPG, PNG ou WebP com formato e extensão correspondentes.');
  if (!file.size || file.size > MAX_CREATIVE_BYTES) throw Error('A imagem deve ter até 5 MB.');
  const signature = Array.from(bytes);
  const jpeg = signature[0] === 255 && signature[1] === 216 && signature[2] === 255;
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => signature[index] === value);
  const webp = String.fromCharCode(...signature.slice(0, 4)) === 'RIFF' && String.fromCharCode(...signature.slice(8, 12)) === 'WEBP';
  if (!(file.type === 'image/jpeg' ? jpeg : file.type === 'image/png' ? png : webp)) throw Error('O conteúdo não corresponde a uma imagem permitida.');
}
export function validateCreativeDimensions(width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 10000 || height > 10000 || width * height > 40000000) throw Error('Dimensões inválidas: máximo 10.000 px por lado e 40 megapixels.');
}
export function aspectWarning(width, height, slot) {
  const [w, h] = creativeSlots[slot] || creativeSlots.HOME_TOP;
  return Math.abs((width / height) / (w / h) - 1) > 0.25;
}
// Local preparation only. No upload, credentials, network request or persistence.
export async function prepareCreative(file) {
  validateCreativeHeader(file, new Uint8Array(await file.slice(0, 12).arrayBuffer()));
  const url = URL.createObjectURL(file);
  try {
    const dimensions = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(Error('Não foi possível decodificar a imagem.'));
      image.src = url;
    });
    validateCreativeDimensions(dimensions.width, dimensions.height);
    return { url, name: file.name, size: file.size, type: file.type, ...dimensions };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}
