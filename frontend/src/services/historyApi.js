const HISTORY_URL = import.meta.env.DEV ? '/api/radar/history' : '/api/briefing/history';

export async function getBriefingHistory({ cursor, signal } = {}) {
  const params = new URLSearchParams({ limit: '5' });
  if (cursor) params.set('cursor', cursor);
  const response = await fetch(`${HISTORY_URL}?${params}`, {
    method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store', credentials: 'omit', signal
  });
  if (!response.ok) throw new Error('Não foi possível carregar o histórico agora.');
  const result = await response.json();
  if (result?.success !== true || !Array.isArray(result.editions) || result.editions.length > 5
    || !result.editions.every(item => typeof item.titulo === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.data || '')
      && typeof item.roteiroAlexa === 'string' && Array.isArray(item.noticias))
    || (result.nextCursor !== null && !/^\d{4}-\d{2}-\d{2}$/.test(result.nextCursor || ''))) {
    throw new Error('Resposta de histórico inválida.');
  }
  return result;
}
