export function today() { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Belem' }).format(new Date()); }
export function campaignStatus(campaign, date = today()) { return !campaign.active ? 'INATIVA' : campaign.startDate > date ? 'AGENDADA' : campaign.endDate < date ? 'ENCERRADA' : 'ATIVA'; }
export function safeAdUrl(value) { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; } }
export async function getCampaigns(signal) {
  const response = await fetch('/api/advertising', { signal, cache: 'no-store', redirect: 'error' });
  if (!response.ok) throw Error('Publicidade indisponível.');
  const result = await response.json();
  if (!result.success || !Array.isArray(result.campaigns)) throw Error('Publicidade indisponível.');
  return result.campaigns;
}
