import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { editorialText, categoryTone, editorialImage } from '../utils/editorial';
import { NewsItem } from './NewsItem';
import { EditionHero } from './EditionHero';
import { EditorialSidebar } from './EditorialSidebar';
import { RadarLive } from './RadarLive';
const news = { titulo: 'Notícia real', resumo: 'Resumo editorial ([github.blog](https://github.blog/news?utm_source=openai)).', categoria: 'Desenvolvimento', fonte: 'GitHub Blog', sourceUrl: 'https://github.blog/news?utm_source=chatgpt.com' };
it('remove markdown de citação e tracking sem alterar os dados originais', () => {
  const original = JSON.stringify(news);
  const view = render(<NewsItem news={news} lead index={0} />);
  expect(view.container.textContent).not.toMatch(/\]\(|utm_source|https:\/\//);
  expect(screen.getByRole('link', { name: 'GitHub Blog' })).toHaveAttribute('href', 'https://github.blog/news');
  expect(JSON.stringify(news)).toBe(original);
  expect(editorialText('**Texto** e [leia mais](https://example.com?a=1)')).toBe('Texto e leia mais');
});
it('sem imagem editorial aprovada usa gráfico, sem buscar fotos externas', () => {
  const view = render(<NewsItem news={{ ...news, imageUrl: 'https://example.com/unapproved.jpg' }} />);
  expect(view.container.querySelector('img')).toBeNull();
  expect(view.container.querySelector('.category-art')).toBeInTheDocument();
  expect(editorialImage({ imageUrl: 'https://example.com/unapproved.jpg' })).toBeNull();
});
it('imagem aprovada com origem possui lazy loading e fallback gráfico em erro', () => {
  const view = render(<NewsItem news={{ ...news, imageApproved: true, imageSource: 'Fonte editorial', imageUrl: 'https://example.com/licensed.jpg', imageAlt: 'Imagem editorial' }} />);
  const image = screen.getByAltText('Imagem editorial');
  expect(image).toHaveAttribute('loading', 'lazy');
  fireEvent.error(image);
  expect(view.container.querySelector('img')).toBeNull();
  expect(view.container.querySelector('.category-art')).toBeInTheDocument();
});
it('tons editoriais determinísticos não criam conteúdo', () => {
  expect(categoryTone('Tecnologia & IA')).toBe('technology');
  expect(categoryTone('Oportunidades')).toBe('opportunity');
  expect(categoryTone('Brasil & Mundo')).toBe('world');
  expect(categoryTone('Esportes')).toBe('sport');
  expect(categoryTone('Economia')).toBe('economy');
});
it('headline da marca, edição secundária e CTA abrem o roteiro existente', () => {
  const read = vi.fn();
  render(<EditionHero briefing={{ titulo: 'Radar ACS — Edição #004', data: '2026-10-05', roteiroAlexa: 'Texto real.', noticias: [news] }} onRead={read} />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Seu radar pessoaldo que importa.');
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Radar ACS — Edição #004');
  fireEvent.click(screen.getByRole('button', { name: 'Ler edição' }));
  expect(read).toHaveBeenCalledTimes(1);
});
it('sidebar apresenta somente categorias presentes e navegação existente', () => {
  render(<EditorialSidebar news={[news, news]} />);
  expect(screen.getAllByRole('link', { name: /Desenvolvimento/ })).toHaveLength(1);
  expect(screen.queryByText('Entretenimento')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Desenvolvimento/ })).toHaveAttribute('href', '#news-0');
});
it('estado ao vivo discreto preserva dados e não expõe integração nem inventa placar', () => {
  const state = { status: 'ready', data: { football: { enabled: true, status: 'NOT_CONFIGURED', teams: [{ name: 'Botafogo' }], matches: [] } } };
  const view = render(<RadarLive state={state} />);
  expect(screen.getByText('Acompanhando: Botafogo')).toBeInTheDocument();
  expect(screen.getByText('Quando houver partidas disponíveis, horários, placares e resultados aparecerão aqui.')).toBeInTheDocument();
  expect(view.container.textContent).not.toMatch(/provider|API|cache|backend|integração|0 – 0/);
});
