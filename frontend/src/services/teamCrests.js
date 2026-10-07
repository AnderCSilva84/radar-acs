// URLs copied from the club's official page, never inferred from provider IDs.
export const verifiedCrests = {
  botafogo: {
    name: 'Botafogo',
    crestUrl: 'https://botafogo.com.br/_next/image?url=%2Fimages%2FBFR-logo.png&w=128&q=75',
    crestSource: 'https://botafogo.com.br/simbolos'
  }
};
export function verifiedCrestFor(team) {
  if (!team) return null;
  const identity = team.catalogId || team.id;
  if (verifiedCrests[identity]) return verifiedCrests[identity];
  // Exact name only: never confuse Botafogo-RJ with Botafogo-SP or Botafogo-PB.
  return Object.values(verifiedCrests).find(item => item.name === team.name) || null;
}
