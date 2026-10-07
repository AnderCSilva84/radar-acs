// Presentation only: the editorial payload and its original facts are preserved.
export function editorialText(value) {
  return String(value || '')
    .replace(/!?\[([^\]]+)\]\(https?:\/\/[^\s)]+\)/g, (_, label) => /^(?:www\.|https?:\/\/)|^[\w.-]+\.[a-z]{2,}(?:\/|$)/i.test(label) ? '' : label)
    .replace(/https?:\/\/[^\s]+|www\.[^\s]+|【[^】]*】/g, '')
    .replace(/\b(?:utm_[a-z_]+)=[^\s&)]*/gi, '')
    .replace(/\(\s*\)/g, '').replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\s+/g, ' ').trim();
}
export function categoryTone(value) {
  const text = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/desenvolv|software/.test(text)) return 'development';
  if (/tecnolog|\bia\b|inteligencia/.test(text)) return 'technology';
  if (/oportun|carreira|concurs/.test(text)) return 'opportunity';
  if (/brasil|mundo/.test(text)) return 'world';
  if (/futebol|esport/.test(text)) return 'sport';
  if (/econom/.test(text)) return 'economy';
  if (/entreten/.test(text)) return 'entertainment';
  return 'general';
}
export function editorialImage(news) {
  // Only display an image explicitly supplied with its editorial provenance.
  // Do not infer licensing, derive images from source pages or fetch new images.
  if (news.imageApproved !== true || !news.imageSource) return null;
  const candidates = [news.imageUrl, news.thumbnailUrl, news.sourceImageUrl, news.contextImageUrl];
  for (const candidate of candidates) {
  if (!candidate) continue;
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hostname === 'localhost' || /^(?:0\.|127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(url.hostname) || /\[|\]/.test(url.hostname)) continue;
    if ([...url.searchParams.keys()].some(key => /token|secret|password|authorization|api.?key|signature|credential|cookie|session/i.test(key))) continue;
    return url.href;
  } catch { /* Try only other explicitly approved supplied images. */ }
  }
  return null;
}
