export function mediaUrl(value, spotify = false) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.hostname === 'localhost'
      || /^(?:127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(url.hostname)
      || /\[|\]/.test(url.hostname)
      || [...url.searchParams.keys()].some(key => /^(?:token|access_token|id_token|refresh_token|api_?key|key|secret|password|authorization|auth|credential|signature|sig|session|x-goog-.+|x-amz-.+)$/i.test(key))) return null;
    if (spotify) {
      if (url.hostname !== 'open.spotify.com' || url.port || url.hash || !/^\/(?:intl-[a-z]{2}\/)?playlist\/[A-Za-z0-9]{22}\/?$/.test(url.pathname)) return null;
      return 'https://open.spotify.com/playlist/' + url.pathname.split('/').filter(Boolean).at(-1);
    }
    return url.href;
  } catch { return null; }
}
export function spotifyPlaylistId(value) {
  const url = mediaUrl(value, true);
  return url ? new URL(url).pathname.split('/').at(-1) : null;
}
export function mediaId(name, items) {
  const base = String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64).replace(/-$/, '') || 'midia';
  let id = base, suffix = 2;
  while (items.some(item => item.id === id)) id = `${base}-${suffix++}`;
  return id;
}
export function orderedMedia(items) {
  return items.slice().sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}
export function appendMedia(items, draft) {
  const max = Math.max(0, ...items.map(item => item.sortOrder));
  const existing = max >= 1000 ? orderedMedia(items).map((item, index) => ({ ...item, sortOrder: index + 1 })) : items;
  return [...existing, { ...draft, id: mediaId(draft.name, items), sortOrder: max >= 1000 ? items.length + 1 : max + 1 }];
}
export function moveMedia(items, id, direction) {
  const ordered = orderedMedia(items);
  const index = ordered.findIndex(item => item.id === id), target = index + direction;
  if (index < 0 || target < 0 || target >= ordered.length) return items;
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  return ordered.map((item, position) => ({ ...item, sortOrder: position + 1 }));
}
