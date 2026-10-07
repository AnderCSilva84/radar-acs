import { lazy, Suspense } from 'react';
import { useAdmin } from '../hooks/useAdmin';
import { AdminRoute } from '../components/AdminRoute';
const page = (load, name) => lazy(() => load().then(module => ({ default: module[name] })));
const Login = page(() => import('./Login'), 'Login');
const AdminHome = page(() => import('./AdminHome'), 'AdminHome');
const Preferences = page(() => import('./Preferences'), 'Preferences');
const Calendar = page(() => import('./Calendar'), 'Calendar');
const Advertisers = page(() => import('./Advertisers'), 'Advertisers');
const MediaAdmin = page(() => import('./MediaAdmin'), 'MediaAdmin');
const Analytics = page(() => import('./Analytics'), 'Analytics');
export function AdminArea({ path, redirect, briefing }) {
  const admin = useAdmin(true);
  const loading = <p role="status">Carregando administração...</p>;
  if (path === '/login') return <Suspense fallback={loading}><Login admin={admin} redirect={redirect} /></Suspense>;
  return <AdminRoute admin={admin} redirect={redirect}><Suspense fallback={loading}>{admin.settings && (
    path === '/admin' ? <AdminHome /> : path === '/admin/analytics' ? <Analytics user={admin.user}/> : path === '/admin/radios' ? <MediaAdmin user={admin.user} /> :
    path === '/admin/advertisers' ? <Advertisers user={admin.user} /> : path === '/admin/calendar' ? <Calendar settings={admin.settings} onSave={admin.save} /> :
    <Preferences briefing={briefing} serverSettings={admin.settings} onSave={admin.save} />
  )}</Suspense></AdminRoute>;
}
