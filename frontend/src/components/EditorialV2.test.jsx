import { render, screen } from '@testing-library/react';
import { it, expect } from 'vitest';
import { NewsItem } from './NewsItem';

const legacy = { titulo: 'Matéria preservada', resumo: 'Resumo antigo disponível.', fonte: 'Fonte oficial', sourceUrl: 'https://example.org/materia' };
it('PWA prefere editorialSummary e preserva parágrafos sem ler speechSummary', () => {
  const view = render(<NewsItem news={{ ...legacy, editorialSummary: 'Fato sustentado pela fonte.\n\nContexto documentado da matéria.', speechSummary: 'Versão exclusiva para fala.' }} />);
  expect(screen.getByText('Fato sustentado pela fonte.')).toBeInTheDocument();
  expect(screen.getByText('Contexto documentado da matéria.')).toBeInTheDocument();
  expect(view.container.querySelectorAll('.news-copy > p')).toHaveLength(2);
  expect(screen.queryByText(legacy.resumo)).not.toBeInTheDocument();
  expect(screen.queryByText('Versão exclusiva para fala.')).not.toBeInTheDocument();
});
it('notícias antigas continuam usando resumo e link original', () => {
  render(<NewsItem news={legacy} />);
  expect(screen.getByText(legacy.resumo)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: legacy.fonte })).toHaveAttribute('href', legacy.sourceUrl);
});
it('resumo editorial vazio utiliza fallback legado', () => {
  render(<NewsItem news={{ ...legacy, editorialSummary: ' ' }} />);
  expect(screen.getByText(legacy.resumo)).toBeInTheDocument();
});
