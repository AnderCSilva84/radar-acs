import { useState, useEffect } from 'react';
import { loginAdmin } from '../services/adminAuth';
export function Login({ admin, redirect }) {
  const [email, setEmail] = useState('acs@acs.com'), [password, setPassword] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  useEffect(() => { if (admin.status === 'authorized') redirect('/admin'); }, [admin.status, redirect]);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage('');
    try { await loginAdmin(email, password); setPassword(''); }
    catch { setMessage('Não foi possível entrar. Verifique os dados e a configuração de acesso.'); setPassword(''); }
    finally { setBusy(false); }
  }
  return <section className="inner-page"><div className="page-heading"><span className="eyebrow">ADMIN</span><h1>Acesso administrativo</h1></div>
    <form onSubmit={submit} className="admin-form"><label>E-mail<input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} /></label>
      <label>Senha<input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></label>
      <button className="primary-button" disabled={busy || admin.status === 'loading'}>Entrar</button>
      <p role="status">{message || (admin.status === 'denied' ? 'Acesso negado.' : admin.status === 'error' ? 'Autenticação não configurada ou indisponível.' : '')}</p>
      {admin.user && admin.status !== 'authorized' && <button type="button" className="text-button" onClick={admin.logout}>Sair</button>}
    </form></section>;
}
