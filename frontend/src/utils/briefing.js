export function formatDate(date) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Belem' })
    .format(new Date(date + 'T12:00:00Z'));
}
export function estimateMinutes(script) {
  const wordsPerMinute = 140;
  return Math.max(1, Math.round(script.trim().split(/\s+/).length / wordsPerMinute));
}
export function sourceLink(value) {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    for (const key of [...url.searchParams.keys()]) if (/^utm_/i.test(key)) url.searchParams.delete(key);
    return url.href;
  } catch { return null; }
}
// Display only: hide citation syntax and URL strings without modifying the
// editorial payload or synthesizing summaries/news from the spoken script.
export function readableParagraphs(script) {
  return script.replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, '')
    .replace(/https?:\/\/\S+|www\.\S+|【[^】]*】/g, '')
    .split(/\n\s*\n/).map(text => text.trim()).filter(Boolean);
}
