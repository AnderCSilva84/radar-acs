export const API_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_RADAR_API_URL || '/api/radar/latest')
  : '/api/briefing/latest';

export async function getLatestBriefing({ signal } = {}) {
  const response = await fetch(API_URL, {
    method: 'GET', headers: { Accept: 'application/json' }, signal, cache: 'no-store', credentials: 'omit'
  });
  if (!response.ok) throw new Error('Não foi possível carregar o Radar agora.');
  const result = await response.json();
  if (result?.success === false) return null;
  const briefing = result?.briefing;
  if (result?.success !== true || !briefing || typeof briefing.titulo !== 'string'
      || !/^\d{4}-\d{2}-\d{2}$/.test(briefing.data || '')
      || typeof briefing.roteiroAlexa !== 'string' || !briefing.roteiroAlexa.trim()) {
    throw new Error('Resposta de briefing inválida.');
  }
  // Additive feed contract; older editions/APIs remain readable without news.
  if (briefing.noticias !== undefined && !Array.isArray(briefing.noticias)) {
    throw new Error('Resposta de notícias inválida.');
  }
  return briefing;
}
