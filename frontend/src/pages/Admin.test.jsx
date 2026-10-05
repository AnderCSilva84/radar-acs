import { expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { Preferences } from './Preferences';
import { Calendar } from './Calendar';
import { observeAdmin, editorialRequest, logoutAdmin, loginAdmin } from '../services/adminAuth';
vi.mock('../services/adminAuth', () => ({ observeAdmin: vi.fn(), editorialRequest: vi.fn(), logoutAdmin: vi.fn(), loginAdmin: vi.fn(), advertisingRequest: vi.fn(async () => ({ campaigns: [] })) }));
vi.mock('../services/radarApi', () => ({ getLatestBriefing: vi.fn(async () => null) }));
const settings = () => ({ editorial: { tecnologiaIA: 'high', desenvolvimento: 'high', concursosCarreira: 'high', oportunidades: 'high', brasilMundo: 'medium', economia: 'medium', futebol: 'medium', clima: 'medium' }, appearance: { cover: 'radar', density: 'comfortable' }, followedTeams: [{ id: 'botafogo', name: 'Botafogo', sport: 'Futebol', country: 'Brasil', active: true }], events: [] });
let callback;
beforeEach(() => { vi.clearAllMocks(); observeAdmin.mockImplementation(async listener => { callback = listener; listener(null); return () => {}; }); editorialRequest.mockResolvedValue(settings()); });
it('visitante vê portal sem iniciar autenticação e admin redireciona para login', async () => {
  const view = render(<App />); await screen.findByText('Ainda não há uma edição publicada.');
  expect(observeAdmin).not.toHaveBeenCalled(); expect(screen.queryByRole('link', { name: 'Preferências' })).not.toBeInTheDocument();
  view.unmount(); window.history.replaceState({}, '', '/admin'); render(<App />);
  expect(screen.queryByText('Seu Radar')).not.toBeInTheDocument();
  await screen.findByRole('heading', { name: 'Acesso administrativo' }); expect(window.location.pathname).toBe('/login');
});
it('refresh em preferences autorizado carrega server-side e logout remove admin', async () => {
  observeAdmin.mockImplementation(async listener => { callback = listener; listener({ uid: 'authorized' }); return () => {}; });
  window.history.replaceState({}, '', '/preferences'); render(<App />);
  await screen.findByRole('heading', { name: 'Seu Radar' });
  expect(editorialRequest).toHaveBeenCalledTimes(1);
  logoutAdmin.mockImplementation(async () => callback(null));
  fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
  await screen.findByRole('heading', { name: 'Acesso administrativo' }); expect(screen.queryByText('Seu Radar')).not.toBeInTheDocument();
});
it('autenticado não autorizado é negado e não recebe preferências', async () => {
  editorialRequest.mockRejectedValue(new Error('Acesso negado.'));
  observeAdmin.mockImplementation(async listener => { listener({ uid: 'other' }); return () => {}; });
  window.history.replaceState({}, '', '/admin/calendar'); render(<App />);
  await screen.findByRole('heading', { name: 'Acesso negado' }); expect(screen.queryByText('Calendário editorial')).not.toBeInTheDocument();
});
it('estado Auth pendente não revela preferências antes da autorização', async () => {
  observeAdmin.mockImplementation(async listener => { callback = listener; return () => {}; });
  window.history.replaceState({}, '', '/admin'); render(<App />);
  expect(screen.getByText('Verificando acesso...')).toBeInTheDocument();
  expect(screen.queryByText('Seu Radar')).not.toBeInTheDocument();
  expect(editorialRequest).not.toHaveBeenCalled();
});
it.each(['/admin/preferences', '/admin/calendar', '/admin/advertisers', '/preferences'])('visitante em %s vai para login', async path => {
  window.history.replaceState({}, '', path); render(<App />);
  await screen.findByRole('heading', { name: 'Acesso administrativo' }); expect(window.location.pathname).toBe('/login');
  expect(screen.queryByText('Seu Radar')).not.toBeInTheDocument(); expect(screen.queryByText('Calendário editorial')).not.toBeInTheDocument();
});
it('login usa email/senha, sem cadastro e sem persistir senha local', async () => {
  window.history.replaceState({}, '', '/login'); render(<App />); await screen.findByRole('button', { name: 'Entrar' });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Entrar' })).not.toBeDisabled());
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'test-password-only' } }); fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  await waitFor(() => expect(loginAdmin).toHaveBeenCalledWith('acs@acs.com', 'test-password-only'));
  expect(localStorage.length).toBe(0); expect(screen.queryByText('Criar conta')).not.toBeInTheDocument();
});
it('preferências do servidor salvam uma vez por ação, com Botafogo extensível', async () => {
  const onSave = vi.fn(async value => value); render(<Preferences serverSettings={settings()} onSave={onSave} />);
  expect(screen.getByText('Estas preferências definem os assuntos priorizados no seu Radar diário.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Futebol'), { target: { value: 'off' } }); expect(onSave).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' })); await screen.findByText('Preferências salvas.');
  expect(onSave).toHaveBeenCalledTimes(1); expect(onSave.mock.calls[0][0].followedTeams[0].name).toBe('Botafogo'); expect(localStorage.length).toBe(0);
});
it('calendário mensal cria, edita e exclui com uma escrita explícita por ação', async () => {
  const onSave = vi.fn(async value => value); render(<Calendar settings={settings()} onSave={onSave} />);
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar evento' }));
  fireEvent.change(screen.getByLabelText('ID'), { target: { value: 'cirio-2026' } }); fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Círio de Nazaré 2026' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar evento' })); await screen.findByText('Calendário salvo.'); expect(onSave).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Círio de Nazaré 2026' })); fireEvent.change(screen.getByLabelText('Prioridade'), { target: { value: 'headline' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar evento' })); await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
  expect(onSave.mock.calls[1][0].events[0].priority).toBe('headline');
  fireEvent.click(screen.getByRole('button', { name: 'Círio de Nazaré 2026' })); fireEvent.click(screen.getByRole('button', { name: 'Excluir evento' })); await waitFor(() => expect(onSave).toHaveBeenCalledTimes(3));
  expect(onSave.mock.calls[2][0].events).toHaveLength(0);
});
