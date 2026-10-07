import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomeListen } from './HomeListen';
import { NewsItem } from './NewsItem';
import { NewsFeed } from './NewsFeed';
import { RadarLive } from './RadarLive';
import { editorialImage } from '../utils/editorial';
import { AdCreative } from './AdCreative';

const base = { titulo: 'Título técnico', resumo: 'Resumo fornecido', fonte: 'Fonte técnica', sourceUrl: 'https://example.com/news' };
it('notícias sem categoria têm variação ornamental sem inventar categoria', () => {
  const first = render(<NewsItem news={base} index={0} />);
  const paths = first.container.querySelector('[data-motif=general]').innerHTML;
  first.rerender(<NewsItem news={base} index={1} />);
  expect(first.container.querySelector('[data-motif=general]').innerHTML).not.toBe(paths);
  expect(first.container.querySelector('.category')).toBeNull();
});
it('creativeFit cover é aceito visualmente sem mudar contrato backend', () => {
  render(<AdCreative campaign={{ position: 'HOME_TOP', advertiserName: 'Anunciante de teste', alt: 'Banner técnico', imageUrl: 'https://example.com/banner.png', creativeFit: 'cover' }} preview />);
  expect(screen.getByRole('img')).toHaveStyle({ objectFit: 'cover' });
});
it.each(['Tecnologia & IA', 'Desenvolvimento', 'Oportunidades', 'Brasil & Mundo', 'Economia', 'Esportes', 'Entretenimento'])('categoria %s usa ilustração local abstrata, sem R repetido', categoria => {
  const view = render(<NewsItem news={{ ...base, categoria }} />);
  expect(view.container.querySelector('[data-motif]')).toBeInTheDocument();
  expect(view.container.querySelector('img')).toBeNull();
});
it.each(['imageUrl', 'thumbnailUrl', 'sourceImageUrl', 'contextImageUrl'])('imagem %s precisa de aprovação e origem e tem fallback em erro', field => {
  const news = { ...base, categoria: 'Esportes', imageAlt: 'Imagem fornecida', [field]: 'https://example.com/editorial.png' };
  expect(editorialImage(news)).toBeNull();
  const view = render(<NewsItem news={{ ...news, imageApproved: true, imageSource: 'Fonte fornecida' }} />);
  expect(screen.getByRole('img')).toHaveAttribute('src', news[field]);
  fireEvent.error(screen.getByRole('img'));
  expect(view.container.querySelector('[data-motif=sport]')).toBeInTheDocument();
});
it('URLs de imagem com credenciais, IP privado ou token não são usadas', () => {
  for (const imageUrl of ['https://user:pass@example.com/a', 'https://172.16.1.1/a', 'https://example.com/a?token=SECRET']) expect(editorialImage({ imageApproved: true, imageSource: 'Fonte', imageUrl })).toBeNull();
});
it('metadados usam somente data e minutos fornecidos', () => {
  const view = render(<NewsItem news={base} />);
  expect(view.container.querySelector('time')).toBeNull();
  expect(view.container.textContent).not.toMatch(/\d+ min/);
  view.rerender(<NewsItem news={{ ...base, publishedAt: '2026-10-02', readingMinutes: 3 }} />);
  expect(screen.getByText('• 2 de outubro')).toBeInTheDocument();
  expect(screen.getByText('• 3 min')).toBeInTheDocument();
});
it('Home mostra apenas mídias públicas aprovadas sem iframe nem player duplicado', () => {
  const view = render(<HomeListen items={[
    { id: 'radio', name: 'Rádio técnica', enabled: true, mediaType: 'EXTERNAL_RADIO', externalUrl: 'https://example.com/live', usageStatus: 'approved' },
    { id: 'spotify', name: 'Playlist técnica', enabled: true, mediaType: 'SPOTIFY_PLAYLIST', spotifyUrl: 'https://open.spotify.com/playlist/1234567890123456789012' },
    { id: 'pending', name: 'Pendente', enabled: true, mediaType: 'RADIO_STREAM', streamUrl: 'https://example.com/stream', usageStatus: 'pending' }
  ]} />);
  expect(screen.getByText('Rádio técnica')).toBeInTheDocument();
  expect(screen.getByText('Playlist técnica')).toBeInTheDocument();
  expect(screen.queryByText('Pendente')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Ouvir transmissão oficial ↗' })).toHaveAttribute('target', '_blank');
  expect(screen.getByRole('link', { name: 'Ouvir →' })).toHaveAttribute('href', '/listen');
  expect(view.container.querySelector('iframe,audio')).toBeNull();
});
it('sem mídia elegível não cria espaço vazio', () => expect(render(<HomeListen />).container).toBeEmptyDOMElement());
it('Ao Vivo vazio apresenta time existente e CTA seguro; com dados usa somente partidas fornecidas', () => {
  const football = { enabled: true, teams: [{ name: 'Time técnico' }], matches: [], status: 'NOT_CONFIGURED' };
  const view = render(<RadarLive state={{ status: 'ready', data: { football } }} compact />);
  expect(screen.getByText('Acompanhando: Time técnico')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Ver Radar Ao Vivo →' })).toHaveAttribute('href', '/live');
  expect(view.container.textContent).not.toMatch(/provider|API|cache|integração/);
  const matches = [{ id: 'technical', status: 'LIVE', home: { name: 'Time técnico' }, away: { name: 'Adversário técnico' }, score: { home: 1, away: 0 } }];
  view.rerender(<RadarLive state={{ status: 'ready', data: { football: { ...football, matches } } }} />);
  expect(screen.getByText('1 – 0')).toBeInTheDocument();
  expect(screen.queryByText(/Quando houver partidas/)).not.toBeInTheDocument();
});
it('destaque mantém primeira notícia e grid secundário fora da coluna principal', () => {
  const view = render(<NewsFeed briefing={{ titulo: 'Edição técnica', data: '2026-10-05', roteiroAlexa: 'Roteiro técnico.', noticias: [base, { ...base, titulo: 'Segundo assunto' }] }} onRead={vi.fn()} />);
  expect(view.container.querySelector('.news-lead')).toHaveTextContent(base.titulo);
  expect(view.container.querySelector('.secondary-stories')).toHaveTextContent('Segundo assunto');
  expect(view.container.querySelector('.news-main .secondary-stories')).toBeNull();
});
it.each(['cover', 'contain'])('HOME_TOP público e admin continuam compartilhando geometria e %s', imageFit => {
  const campaign = { position: 'HOME_TOP', advertiserName: 'Anunciante de teste', alt: 'Banner técnico', imageUrl: 'https://example.com/banner.png', targetUrl: 'https://example.com/', imageFit };
  const view = render(<AdCreative campaign={campaign} />);
  const style = screen.getByRole('img').getAttribute('style');
  view.rerender(<AdCreative campaign={campaign} preview />);
  expect(screen.getByRole('img').getAttribute('style')).toBe(style);
});
