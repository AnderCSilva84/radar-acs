import { expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { History } from './History';
import { getBriefingHistory } from '../services/historyApi';
import { briefing } from '../test/fixture';
vi.mock('../services/historyApi', () => ({ getBriefingHistory: vi.fn() }));
beforeEach(() => getBriefingHistory.mockReset());

it('carrega página, mais somente sob demanda e abre edição sem leituras adicionais', async () => {
  const first = { ...briefing, diagnostics: 'INTERNAL', noticias: briefing.noticias.map(news => ({ ...news, evidence: 'INTERNAL' })) };
  getBriefingHistory.mockResolvedValueOnce({ editions: [first], nextCursor: '2026-10-03' }).mockResolvedValueOnce({ editions: [{ ...briefing, titulo: 'Edição anterior', data: '2026-10-02' }], nextCursor: null });
  render(<History />);
  expect(screen.getByText('Carregando suas edições...')).toBeInTheDocument();
  await screen.findByRole('heading', { name: first.titulo });
  expect(getBriefingHistory).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Carregar mais' }));
  await screen.findByRole('heading', { name: 'Edição anterior' });
  expect(getBriefingHistory.mock.calls[1][0].cursor).toBe('2026-10-03');
  fireEvent.click(screen.getAllByRole('button', { name: 'Ver edição →' })[0]);
  expect(screen.getAllByRole('article')).toHaveLength(5);
  expect(screen.getByRole('heading', { name: 'Roteiro da edição' })).toBeInTheDocument();
  expect(screen.queryByText('INTERNAL')).not.toBeInTheDocument();
  expect(getBriefingHistory).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button', { name: '← Voltar ao histórico' }));
  expect(screen.getByRole('heading', { name: 'Edição anterior' })).toBeInTheDocument();
});
it('histórico vazio tem estado próprio', async () => {
  getBriefingHistory.mockResolvedValue({ editions: [], nextCursor: null });render(<History />);
  expect(await screen.findByText('Ainda não há edições no histórico.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Carregar mais' })).not.toBeInTheDocument();
});
it('falha não faz retry automático e retry manual recupera', async () => {
  getBriefingHistory.mockRejectedValueOnce(new Error('private')).mockResolvedValueOnce({ editions: [], nextCursor: null });render(<History />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o histórico agora.');
  expect(getBriefingHistory).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await waitFor(() => expect(screen.getByText('Ainda não há edições no histórico.')).toBeInTheDocument());
  expect(getBriefingHistory).toHaveBeenCalledTimes(2);
});
