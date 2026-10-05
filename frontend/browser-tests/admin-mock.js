// Test-only fixtures. No real credentials or remote authentication.
export async function adminMock(page, authorized = true) {
  let settings = { editorial: { tecnologiaIA: 'high', desenvolvimento: 'high', concursosCarreira: 'high', oportunidades: 'high', brasilMundo: 'medium', economia: 'medium', futebol: 'medium', clima: 'medium' }, appearance: { cover: 'radar', density: 'comfortable' }, followedTeams: [{ id: 'botafogo', name: 'Botafogo', sport: 'football', country: 'BR', active: true }], events: [] };
  let advertising = { campaigns: [] };
  const uid = authorized ? 'mock-superadmin' : 'mock-other', now = Math.floor(Date.now() / 1000);
  const token = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url') + '.' + Buffer.from(JSON.stringify({ iss: 'https://securetoken.google.com/radar-acs', aud: 'radar-acs', sub: uid, user_id: uid, iat: now, exp: now + 3600, auth_time: now, email: 'acs@acs.com', firebase: { sign_in_provider: 'password', identities: { email: ['acs@acs.com'] } } })).toString('base64url') + '.mock-signature';
  await page.route('**/__/firebase/init.json', route => route.fulfill({ json: { projectId: 'radar-acs', apiKey: 'mock-public-key', authDomain: 'radar-acs.firebaseapp.com' } }));
  await page.route('https://identitytoolkit.googleapis.com/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('accounts:signInWithPassword')) return route.fulfill({ json: { localId: uid, email: 'acs@acs.com', idToken: token, refreshToken: 'mock-refresh-only', expiresIn: '3600', registered: true } });
    if (path.endsWith('accounts:lookup')) return route.fulfill({ json: { users: [{ localId: uid, email: 'acs@acs.com', emailVerified: true, providerUserInfo: [{ providerId: 'password', email: 'acs@acs.com' }], createdAt: String(now * 1000), lastLoginAt: String(now * 1000) }] } });
    return route.fulfill({ json: {} });
  });
  await page.route('https://securetoken.googleapis.com/**', route => route.abort());
  await page.route('**/api/admin/**', route => {
    if (!route.request().headers().authorization) return route.fulfill({ status: 401, json: { success: false } });
    if (!authorized) return route.fulfill({ status: 403, json: { success: false } });
    const ads = route.request().url().includes('/advertisers');
    if (route.request().method() === 'PUT') { if (ads) advertising = route.request().postDataJSON(); else settings = route.request().postDataJSON(); }
    return route.fulfill({ json: { success: true, settings: ads ? advertising : settings } });
  });
  return { settings: () => settings };
}
export async function loginMock(page) {
  await page.goto('/login'); await page.getByLabel('Senha', { exact: true }).fill('browser-fixture-only');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}
