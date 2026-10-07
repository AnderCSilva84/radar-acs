import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../App';
import { getLatestBriefing } from '../services/radarApi';
import { observeAdmin } from '../services/adminAuth';
vi.mock('../services/radarApi', () => ({ getLatestBriefing: vi.fn() }));
vi.mock('../services/adminAuth', () => ({ observeAdmin: vi.fn(), editorialRequest: vi.fn(), logoutAdmin: vi.fn(), loginAdmin: vi.fn() }));

async function renderLegalRoute() {
  // Synchronize with the real lazy module, rather than timing its cold transform.
  // async act also flushes the Suspense retry after this import resolves.
  await act(async () => {
    render(<App />);
    await import('./Legal');
  });
}

for (const [path, title] of [['/privacy', 'Política de Privacidade'], ['/terms', 'Termos de Uso']]) {
  it(`${path} é pública, possui conteúdo próprio e não consulta API nem autenticação`, async () => {
    window.history.replaceState({}, '', path);
    await renderLegalRoute();
    expect(await screen.findByRole('heading', { level: 1, name: `${title} — Radar ACS` })).toBeInTheDocument();
    expect(screen.getByText(path === '/privacy' ? '6 de outubro de 2026' : '4 de outubro de 2026')).toHaveAttribute('dateTime', path === '/privacy' ? '2026-10-06' : '2026-10-04');
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(8);
    expect(getLatestBriefing).not.toHaveBeenCalled();
    expect(observeAdmin).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Hoje' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Histórico' })).toHaveAttribute('href', '/history');
  });
}
it('links legais do rodapé navegam entre as páginas corretas', async () => {
  window.history.replaceState({}, '', '/privacy');
  await renderLegalRoute();
  fireEvent.click(screen.getByRole('link', { name: 'Termos de Uso' }));
  expect(window.location.pathname).toBe('/terms');
  expect(await screen.findByRole('heading', { level: 1, name: 'Termos de Uso — Radar ACS' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Política de Privacidade' }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Política de Privacidade — Radar ACS' })).toBeInTheDocument();
});

