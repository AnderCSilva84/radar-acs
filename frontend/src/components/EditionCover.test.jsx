import { expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EditionCover } from './EditionCover';
import { BriefingHero } from './BriefingHero';
import { briefing } from '../test/fixture';
it('edição especial exibe asset local da eleição e campos dinâmicos', () => {
  render(<BriefingHero briefing={{ ...briefing, coverId: 'eleicoes-2026', specialTitle: 'Eleições 2026' }} onRead={() => {}} />);
  const cover = screen.getByLabelText('Capa Eleições 2026');
  expect(cover.querySelector('img')).toHaveAttribute('src', '/capa-eleicoes-2026.png');
  expect(screen.getByText('sábado, 3 de outubro de 2026')).toBeInTheDocument();
  expect(cover.querySelector('.preview-copy')).toBeNull();
});
it('edições antigas mantêm capa radar', () => {
  render(<EditionCover briefing={briefing} />);expect(screen.getByLabelText('Capa da edição')).toHaveAttribute('data-cover', 'radar');
});
