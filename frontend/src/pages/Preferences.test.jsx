import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Preferences } from './Preferences';
import { PREFERENCES_KEY } from '../services/preferences';
import { briefing } from '../test/fixture';

it('capa especial é informativa, usa WebP/PNG e não muda preferências', () => {
  render(<Preferences />);
  const before = localStorage.getItem(PREFERENCES_KEY);
  const section = screen.getByRole('region', { name: 'CAPAS ESPECIAIS' });
  expect(section).toHaveTextContent('Eleições 2026');
  expect(section).toHaveTextContent('Automática');
  expect(section.querySelector('input, button, select')).toBeNull();
  expect(section.querySelector('source')).toHaveAttribute('srcset', '/capa-eleicoes-2026.webp');
  expect(section.querySelector('img')).toHaveAttribute('src', '/capa-eleicoes-2026.png');
  fireEvent.click(screen.getByText('Eleições 2026'));
  expect(localStorage.getItem(PREFERENCES_KEY)).toBe(before);
  expect(screen.getAllByRole('radio')).toHaveLength(3);
  expect(screen.getByRole('radio', { name: 'Radar', exact: true })).toBeChecked();
});

it('prioridades podem mudar e desligar sem qualquer chamada remota', () => {
  const fetch = vi.fn();vi.stubGlobal('fetch', fetch);
  render(<Preferences briefing={briefing} />);
  expect(screen.getByLabelText('Tecnologia & IA')).toHaveValue('high');
  fireEvent.change(screen.getByLabelText('Tecnologia & IA'), { target: { value: 'off' } });
  fireEvent.change(screen.getByLabelText('Economia'), { target: { value: 'low' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar preferências' }));
  expect(screen.getByText('Salvo neste dispositivo.')).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY)).editorial).toMatchObject({ tecnologiaIA: 'off', economia: 'low' });
  expect(fetch).not.toHaveBeenCalled();
});
it('três capas selecionáveis têm preview com dados da edição e IDs persistidos', () => {
  render(<Preferences briefing={briefing} />);
  expect(screen.getByRole('radio', { name: 'Radar' })).toBeChecked();
  for (const [label, id] of [['ACS', 'acs'], ['Radar News', 'radar-news'], ['Radar', 'radar']]) {
    fireEvent.click(screen.getByRole('radio', { name: label }));
    expect(screen.getByLabelText(`Visualização da capa ${label}`)).toHaveAttribute('data-cover', id);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar preferências' }));
    expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY)).appearance.cover).toBe(id);
  }
  expect(screen.getByText(briefing.titulo)).toBeInTheDocument();
  expect(screen.getByText('sábado, 3 de outubro de 2026')).toBeInTheDocument();
});
it('restaura defaults e continua utilizável sem API ou edição carregada', () => {
  render(<Preferences />);
  fireEvent.click(screen.getByRole('radio', { name: 'Radar News' }));
  fireEvent.change(screen.getByLabelText('Densidade do preview'), { target: { value: 'compact' } });
  fireEvent.click(screen.getByRole('button', { name: 'Restaurar padrões' }));
  expect(screen.getByRole('radio', { name: 'Radar' })).toBeChecked();
  expect(screen.getByLabelText('Densidade do preview')).toHaveValue('comfortable');
  expect(screen.getByText('Sua próxima edição, na sua tela.')).toBeInTheDocument();
});
it('remove opções antigas e usa logo local acessível nas capas SVG', () => {
  render(<Preferences briefing={briefing} />);
  expect(screen.getAllByRole('radio')).toHaveLength(3);
  expect(screen.queryByRole('radio', { name: 'Horizonte' })).not.toBeInTheDocument();
  expect(screen.queryByRole('radio', { name: 'Pulso' })).not.toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'ACS Informática' })).toHaveAttribute('src', '/logo-acs.png');
  fireEvent.click(screen.getByRole('radio', { name: 'ACS' }));
  expect(screen.getByRole('img', { name: 'ACS Informática' })).toHaveClass('prominent');
});
it('Radar News preserva arte, sem duplicar saudação e logo visualmente', () => {
  render(<Preferences briefing={briefing} />);
  fireEvent.click(screen.getByRole('radio', { name: 'Radar News' }));
  const preview = screen.getByLabelText('Visualização da capa Radar News');
  expect(preview.querySelector('img')).toHaveAttribute('src', '/capa-radar.png');
  expect(preview.querySelector('img')).toHaveAttribute('alt', '');
  expect(preview.querySelector('.preview-copy')).toBeNull();
  expect(preview.querySelector('.brand-signature')).toBeNull();
  expect(preview.querySelector('.news-cover-caption')).toHaveTextContent(briefing.titulo);
  expect(preview.querySelector('.sr-only')).toHaveTextContent('Bom dia, Anderson.');
  for (const img of document.querySelectorAll('.cover-options img, .screen-preview img')) expect(img.getAttribute('src')).toMatch(/^\/(?!\/)/);
});
