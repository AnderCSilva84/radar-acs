'use strict';
function safeImageUrl(value, base) {
  try {
    if (typeof value !== 'string' || !value.trim() || value.length > 2000) return null;
    const url = new URL(value, base);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80','443'].includes(url.port)) || url.hostname === 'localhost' || /\[|\]|^(?:0\.|127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(url.hostname) || !url.hostname.includes('.')) return null;
    if ([...url.searchParams.keys()].some(key => /token|secret|password|authorization|api.?key|signature|credential|cookie|session/i.test(key))) return null;
    return url.href;
  } catch { return null; }
}
function newsImage(item) {
  const source = safeImageUrl(item.imageSource);
  const imageUrl = safeImageUrl(item.imageUrl);
  if (!source || !imageUrl) return {};
  return { imageUrl, imageSource: source, imageAlt: typeof item.imageAlt === 'string' ? item.imageAlt.replace(/[<>\u0000-\u001f]/g,'').slice(0,200) : '', imageApproved: item.imageApproved === true };
}
// Metadata returned by the existing collection only. Never fetch a second page.
function imageFromSource(source) {
  const values = [source.imageUrl, source.image?.url, typeof source.image === 'string' ? source.image : null,
    source.ogImage, source['og:image'], source.metadata?.['og:image'],
    source.thumbnailUrl, source.thumbnail?.url, typeof source.thumbnail === 'string' ? source.thumbnail : null,
    source.media?.url, source.enclosure?.url];
  const imageUrl = values.map(value => safeImageUrl(value, source.url)).find(Boolean);
  return newsImage({ imageUrl, imageSource: source.url, imageAlt: source.imageAlt || '', imageApproved: source.imageApproved === true });
}
module.exports = { safeImageUrl, newsImage, imageFromSource };
