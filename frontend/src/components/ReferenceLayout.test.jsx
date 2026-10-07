import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Listen } from '../pages/Listen';
import { MediaCard } from './MediaCard';
import { NewsFeed } from './NewsFeed';
const briefing = { titulo: 'Edição técnica', data: '2026-10-05', roteiroAlexa: 'Roteiro técnico.', noticias: [{ id: 'a', titulo: 'Primeiro assunto técnico', resumo: 'Resumo fornecido', fonte: 'Fonte técnica', sourceUrl: 'https://example.com/a' }, { id: 'b', titulo: 'Segundo assunto técnico', resumo: 'Resumo fornecido', fonte: 'Fonte técnica', sourceUrl: 'https://example.com/b' }] };
const radio = { id: 'r', name: 'Rádio técnica', mediaType: 'EXTERNAL_RADIO', enabled: true, usageStatus: 'approved', externalUrl: 'https://example.com/live' };
const state = { status: 'ready', data: { preferences: { editorial: {} }, football: { enabled: true, teams: [{ name: 'Time técnico' }], matches: [] }, media: [radio] } };
it('hero fotográfico é asset local decorativo sem hotlink', () => {
  const view = render(<Listen state={state} onPlay={vi.fn()} />);
  expect(view.container.querySelector('.listen-hero-photo')).toHaveAttribute('src', '/images/listen-headphones.webp');
  expect(view.container.querySelector('.listen-hero-photo')).toHaveAttribute('alt', '');
  expect(screen.getByText(/Rádios autorizadas e playlists/)).toBeInTheDocument();
});
it('somente mídia existente ocupa destaque; não cria cards para completar grid', () => {
  const view = render(<Listen state={state} onPlay={vi.fn()} />);
  expect(view.container.querySelectorAll('.media-card')).toHaveLength(1);
  expect(view.container.querySelector('.media-featured')).toHaveTextContent('Rádio técnica');
  expect(view.container.querySelector('.radio-grid')).toHaveAttribute('data-count', '1');
});
it('grade editorial contém destaque, secundárias e sidebar no mesmo contêiner', () => {
  const view = render(<NewsFeed briefing={briefing} liveState={state} onRead={vi.fn()} />);
  expect(view.container.querySelector('.reference-news-grid .news-lead')).toHaveTextContent('Primeiro assunto técnico');
  expect(view.container.querySelector('.reference-news-grid .secondary-stories')).toHaveTextContent('Segundo assunto técnico');
  expect(view.container.querySelector('.reference-news-grid .editorial-sidebar')).toHaveTextContent('Time técnico');
  expect(view.container.querySelectorAll('.news-item')).toHaveLength(2);
});
it('Ouvir recebe edição existente sem nova integração de notícias', () => {
  render(<Listen state={state} briefing={briefing} onRead={vi.fn()} onPlay={vi.fn()} />);
  expect(screen.getByRole('heading', { name: 'Últimas notícias' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Primeiro assunto técnico' })).toBeInTheDocument();
});
it('destaque não muda link de rádio externa ou inicia player interno', () => {
  const play = vi.fn();
  render(<MediaCard item={radio} featured onPlay={play} />);
  expect(screen.getByRole('link', { name: 'Abrir transmissão oficial ↗' })).toHaveAttribute('href', radio.externalUrl);
  expect(play).not.toHaveBeenCalled();
});
