import { it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditionHero } from './EditionHero';
import { EditionCover } from './EditionCover';
import { briefing } from '../test/fixture';
import { resolveCover } from '../services/covers';

it('explicit edition identity beats local preference, including stable covers', () => {
  expect(resolveCover({ coverId: 'acs' }, 'radar-news')).toBe('acs');
  expect(resolveCover({ coverId: 'radar' }, 'acs')).toBe('radar');
  expect(resolveCover({}, 'radar-news')).toBe('radar-news');
  expect(resolveCover({}, null)).toBe('radar');
});
it('hero keeps metadata below art and uses eager image without duplicated greeting', () => {
  render(<EditionHero briefing={{ ...briefing, coverId: 'eleicoes-2026', editionType: 'special' }} />);
  const cover = screen.getByLabelText('Capa Eleições 2026');
  expect(cover.querySelector('img')).toHaveAttribute('loading', 'eager');
  expect(cover.querySelector('.news-cover-caption')).toBeNull();
  expect(screen.getByText('EDIÇÃO ESPECIAL')).toBeInTheDocument();
  expect(screen.queryByText('Bom dia,')).not.toBeInTheDocument();
});
it('hero displays weekday and editorial date without extra metadata reads', () => {
  render(<EditionHero briefing={{ ...briefing, data: '2026-10-04' }} />);
  expect(screen.getByText('domingo, 4 de outubro de 2026')).toBeInTheDocument();
});
it('image fallback tries original PNG before safe local SVG fallback', () => {
  render(<EditionCover briefing={{ ...briefing, coverId: 'radar-news' }} />);
  const cover = screen.getByLabelText('Capa da edição');
  expect(cover.querySelector('source')).toHaveAttribute('type', 'image/webp');
  fireEvent.error(cover.querySelector('img'));
  expect(cover.querySelector('source')).toBeNull();
  expect(cover.querySelector('img')).toHaveAttribute('src', '/capa-radar.png');
  fireEvent.error(cover.querySelector('img'));
  expect(cover.querySelector('svg')).toBeInTheDocument();
});

