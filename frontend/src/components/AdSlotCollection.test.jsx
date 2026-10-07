import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdSlot, eligibleCampaigns } from './AdSlot';
import { today } from '../services/advertising';
const campaign = (id, patch = {}) => ({ id, advertiserName: id, campaignName: id, position: 'HOME_TOP', active: true, startDate: '2020-01-01', endDate: '2099-12-31', imageUrl: `https://example.com/${id}.png`, targetUrl: `https://example.com/${id}`, alt: `Criativo ${id}`, ...patch });
it('coleção preserva todas as campanhas elegíveis, prioridade e ordem sem mutação', () => {
  const campaigns = [campaign('a'), campaign('b', { priority: 2 }), campaign('c', { priority: 2 }), campaign('off', { active: false }), campaign('future', { startDate: '2099-01-01' }), campaign('unsafe', { imageUrl: 'javascript:alert(1)' })];
  expect(eligibleCampaigns(campaigns, 'HOME_TOP', today()).map(item => item.id)).toEqual(['b', 'c', 'a']);
  expect(campaigns[0].id).toBe('a');
});
it('uma campanha mantém banner estático; múltiplas entregam coleção ao apresentador futuro', () => {
  const renderCampaigns = vi.fn(({ campaigns }) => <div>{campaigns.map(item => <span key={item.id}>{item.alt}</span>)}</div>);
  const view = render(<AdSlot position="HOME_TOP" campaigns={[campaign('a')]} renderCampaigns={renderCampaigns} />);
  expect(screen.getByRole('img')).toHaveAttribute('alt', 'Criativo a');
  expect(renderCampaigns).not.toHaveBeenCalled();
  view.rerender(<AdSlot position="HOME_TOP" campaigns={[campaign('a'), campaign('b')]} renderCampaigns={renderCampaigns} />);
  expect(screen.getByText('Criativo b')).toBeInTheDocument();
  expect(renderCampaigns.mock.calls[0][0].campaigns).toHaveLength(2);
});
it('sem carrossel ativo mostra primeiro; erro troca somente criativo falho, sem perder label/link/alt', () => {
  render(<AdSlot position="HOME_TOP" campaigns={[campaign('a'), campaign('b')]} />);
  fireEvent.error(screen.getByRole('img'));
  expect(screen.getByRole('img')).toHaveAttribute('alt', 'Criativo b');
  expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com/b');
  expect(screen.getByText('Publicidade')).toBeInTheDocument();
  fireEvent.error(screen.getByRole('img'));
  expect(screen.queryByText('Publicidade')).not.toBeInTheDocument();
});
