import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdSlot } from './AdSlot';
import { AnimatedRadar } from './AnimatedRadar';
import { Advertisers } from '../pages/Advertisers';
import { campaignStatus, today } from '../services/advertising';
import { advertisingRequest } from '../services/adminAuth';
vi.mock('../services/adminAuth', () => ({ advertisingRequest: vi.fn() }));
const active = () => ({ id: 'mock', advertiserName: 'Mock sponsor', campaignName: 'Mock campaign', imageUrl: 'https://example.com/banner.png', targetUrl: 'https://example.com/product', alt: 'Mock banner', startDate: today(), endDate: '2099-12-31', position: 'HOME_TOP', active: true, notes: '', contact: '' });
it('slot vazio não cria espaço e campanha ativa aparece identificada com link seguro', () => {
  const view = render(<AdSlot position="HOME_TOP" />); expect(view.container).toBeEmptyDOMElement();
  view.rerender(<AdSlot position="HOME_TOP" campaigns={[active()]} />);
  expect(screen.getByText('Publicidade')).toBeInTheDocument(); expect(screen.getByRole('link')).toHaveAttribute('href', active().targetUrl);
  expect(screen.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer sponsored'); expect(screen.getByRole('img')).toHaveAttribute('loading', 'lazy');
  fireEvent.error(screen.getByRole('img')); expect(view.container).toBeEmptyDOMElement();
});
it.each([{ active: false }, { startDate: '2099-01-01' }, { endDate: '2020-01-01' }, { position: 'HISTORY' }])('campanha fora da condição não aparece: %j', patch => {
  const view = render(<AdSlot position="HOME_TOP" campaigns={[{ ...active(), ...patch }]} />); expect(view.container).toBeEmptyDOMElement();
});
it('radar possui círculos, feixe e blips relacionados à quantidade editorial', () => {
  const view = render(<AnimatedRadar count={2} />); expect(view.container.querySelectorAll('.radar-ring')).toHaveLength(4);
  expect(view.container.querySelectorAll('.radar-blip')).toHaveLength(2); expect(view.container.querySelector('.radar-sweep')).toBeTruthy(); expect(view.container.firstChild).toHaveAttribute('aria-hidden', 'true');
});
it('anunciante permite editar, ativar/desativar e excluir por salvamento explícito', async () => {
  advertisingRequest.mockResolvedValueOnce({ campaigns: [active()] }).mockImplementation(async (_, value) => value || { campaigns: [] });
  render(<Advertisers user={{ uid: 'mock-admin' }} />); await screen.findByRole('heading', { name: 'Mock campaign' });
  fireEvent.click(screen.getByRole('button', { name: 'Editar' })); fireEvent.change(screen.getByLabelText('Texto alternativo'), { target: { value: 'Updated banner' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar campanha' })); await screen.findByText('Campanhas salvas.'); expect(advertisingRequest.mock.calls[1][1].campaigns[0].alt).toBe('Updated banner');
  fireEvent.click(screen.getByRole('button', { name: 'Desativar' })); await screen.findByText('INATIVA');
  fireEvent.click(screen.getByRole('button', { name: 'Editar' })); fireEvent.click(screen.getByRole('button', { name: 'Excluir campanha' })); await screen.findByText('Nenhuma campanha cadastrada.');
  expect(advertisingRequest).toHaveBeenCalledTimes(4);
});
it('falha ao carregar não permite sobrescrever campanhas desconhecidas', async () => {
  advertisingRequest.mockRejectedValueOnce(Error('failed')); render(<Advertisers user={{ uid: 'mock-admin' }} />);
  await screen.findByText('Não foi possível carregar campanhas. Recarregue antes de editar.'); expect(screen.getByRole('button', { name: 'Nova campanha' })).toBeDisabled();
});
it('status futuro é agendado', () => { expect(campaignStatus({ ...active(), startDate: '2099-01-01' })).toBe('AGENDADA'); });
