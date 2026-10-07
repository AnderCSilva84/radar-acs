export function today() { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Belem' }).format(new Date()); }
export function campaignStatus(campaign, date = today()) { return campaign.publicationState === 'draft' ? 'RASCUNHO' : !campaign.active ? 'INATIVA' : campaign.startDate > date ? 'AGENDADA' : campaign.endDate < date ? 'ENCERRADA' : 'ATIVA'; }
export function safeAdUrl(value) {
  try {
    if (typeof value !== 'string' || value.length > 2000) return null;
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.hostname === 'localhost' || /^(?:127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(url.hostname) || /\[|\]/.test(url.hostname) || [...url.searchParams.keys()].some(key => /^(?:token|access_token|id_token|refresh_token|api_?key|key|secret|password|authorization|auth|credential|signature|sig|session|x-goog-.+|x-amz-.+)$/i.test(key))) return null;
    return url.href;
  } catch { return null; }
}
export async function getCampaigns(signal) {
  const response = await fetch('/api/advertising', { signal, cache: 'no-store', redirect: 'error' });
  if (!response.ok) throw Error('Publicidade indisponível.');
  const result = await response.json();
  if (!result.success || !Array.isArray(result.campaigns)) throw Error('Publicidade indisponível.');
  return result.campaigns;
}
