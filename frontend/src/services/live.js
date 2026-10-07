let cached, expires = 0, pending;
export async function getLive() {
  if (cached && Date.now() < expires) return cached;
  if (!pending) pending = fetch('/api/live', { credentials: 'omit', cache: 'no-store' })
    .then(async response => {
      if (!response.ok) throw Error('Radar Ao Vivo indisponível.');
      const value = await response.json();
      if (!value.success || !Array.isArray(value.media) || !Array.isArray(value.football?.matches) || !value.preferences?.editorial) throw Error('Resposta inválida.');
      cached = value;
      expires = Date.now() + 60000;
      return value;
    }).finally(() => { pending = null; });
  return pending;
}
export function prioritizeNews(news, priorities) {
  if (!priorities) return news;
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const category = value => {
    const text = normalize(value);
    if (/futebol|esporte/.test(text)) return 'futebol';
    if (/concurs|carreira/.test(text)) return 'concursosCarreira';
    if (/desenvolv|software/.test(text)) return 'desenvolvimento';
    if (/tecnolog|inteligencia|\bia\b/.test(text)) return 'tecnologiaIA';
    if (/econom/.test(text)) return 'economia';
    if (/oportun/.test(text)) return 'oportunidades';
    if (/clima/.test(text)) return 'clima';
    if (/brasil|mundo/.test(text)) return 'brasilMundo';
    return null;
  };
  const priority = item => priorities[category(item.categoria)];
  return news.filter(item => priority(item) !== 'off').slice().sort((a, b) =>
    ({ high: 0, medium: 1, low: 2 }[priority(a)] ?? 1) - ({ high: 0, medium: 1, low: 2 }[priority(b)] ?? 1));
}
