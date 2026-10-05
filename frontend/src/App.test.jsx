import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from './App';
import { getLatestBriefing } from './services/radarApi';
import { briefing, alexaBriefing } from './test/fixture';
vi.mock('./services/radarApi', () => ({ getLatestBriefing: vi.fn() }));
beforeEach(() => { getLatestBriefing.mockReset(); });
describe('Home', () => {
  it('renderiza loading e faz apenas uma consulta inicial', () => {
    getLatestBriefing.mockReturnValue(new Promise(() => {})); render(<App />);
    expect(screen.getByText('Preparando seu Radar...')).toBeInTheDocument();
    expect(getLatestBriefing).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Online')).not.toBeInTheDocument();
  });
  it('exibe edição real e cinco notícias quando fornecidas', async () => {
    getLatestBriefing.mockResolvedValue(briefing); render(<App />);
    expect(await screen.findByRole('heading', { name: briefing.titulo })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(5);
    expect(screen.getAllByText('5 assuntos')).toHaveLength(2);
    expect(screen.getByText('sábado, 3 de outubro de 2026')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText(briefing.noticias[0].resumo)).toBeInTheDocument();
  });
  it('não inventa notícias ou quantidade ausentes na resposta atual da API', async () => {
    getLatestBriefing.mockResolvedValue(alexaBriefing); render(<App />);
    await screen.findByText(alexaBriefing.titulo);
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.queryByText('5 assuntos')).not.toBeInTheDocument();
    expect(screen.getByText('Os destaques estão no seu briefing.')).toBeInTheDocument();
  });
  it('renderiza erro e tenta novamente somente por ação do usuário', async () => {
    getLatestBriefing.mockRejectedValueOnce(new Error('stack privado')).mockResolvedValueOnce(alexaBriefing);
    render(<App />);
    expect(await screen.findByText('Não foi possível carregar o Radar agora.')).toBeInTheDocument();
    expect(screen.queryByText('stack privado')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await screen.findByText(alexaBriefing.titulo);
    expect(getLatestBriefing).toHaveBeenCalledTimes(2);
  });
  it('renderiza empty', async () => {
    getLatestBriefing.mockResolvedValue(null); render(<App />);
    expect(await screen.findByText('Ainda não há uma edição publicada.')).toBeInTheDocument();
  });
  it('abre e fecha roteiro com nome acessível e devolve foco', async () => {
    getLatestBriefing.mockResolvedValue(alexaBriefing); render(<App />);
    const trigger = await screen.findByRole('button', { name: 'Ler briefing' });
    trigger.focus(); fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Roteiro do briefing' })).toBeInTheDocument();
    expect(screen.getByText('Leitura em texto. O botão não reproduz áudio gravado.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar roteiro' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it('fecha roteiro por Escape', async () => {
    getLatestBriefing.mockResolvedValue(alexaBriefing); render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ler briefing' }));
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
  it('links externos seguros e sem tracking visível', async () => {
    getLatestBriefing.mockResolvedValue({ ...briefing, noticias: [{ ...briefing.noticias[0], url: briefing.noticias[0].url + '?utm_source=test' }] });
    render(<App />);
    const link = await screen.findByRole('link', { name: briefing.noticias[0].fonte });
    expect(link).toHaveAttribute('target', '_blank'); expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link.href).not.toContain('utm_source');
    expect(screen.queryByText(/utm_source/)).not.toBeInTheDocument();
  });
  it('consome sourceUrl do contrato aditivo e mostra fonte sem URL como texto', async () => {
    const first = briefing.noticias[0];
    getLatestBriefing.mockResolvedValue({ ...briefing, noticias: [
      { titulo: first.titulo, resumo: first.resumo, fonte: 'Fonte oficial', sourceUrl: 'https://example.com/article?id=2' },
      { titulo: 'Outro assunto', fonte: 'Fonte sem link' }
    ] });
    render(<App />);
    expect(await screen.findByRole('link', { name: 'Fonte oficial' })).toHaveAttribute('href', 'https://example.com/article?id=2');
    expect(screen.getByText('Fonte sem link')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Fonte sem link' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });
  it('feed vazio mantém fallback e permite abrir roteiro', async () => {
    getLatestBriefing.mockResolvedValue({ ...alexaBriefing, noticias: [] });
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ler roteiro' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.getByText('Os assuntos que merecem sua atenção.')).toBeInTheDocument();
  });
  it('contador plural e resumo da edição usam dados dinâmicos', async () => {
    const edition = { ...briefing, titulo: 'Outra edição editorial', noticias: briefing.noticias.slice(0, 3), roteiroAlexa: Array(280).fill('palavra').join(' ') };
    getLatestBriefing.mockResolvedValue(edition); render(<App />);
    expect(await screen.findByText('3 assuntos que merecem sua atenção.')).toBeInTheDocument();
    const summary = within(screen.getByRole('complementary', { name: 'EDIÇÃO DE HOJE' }));
    expect(summary.getByText(edition.titulo)).toBeInTheDocument();
    expect(summary.getByText('3 assuntos')).toBeInTheDocument();
    expect(summary.getByText('aproximadamente 2 min')).toBeInTheDocument();
    expect(summary.getByText('Publicado')).toBeInTheDocument();
    fireEvent.click(summary.getByRole('button', { name: 'Ler briefing' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(getLatestBriefing).toHaveBeenCalledTimes(1);
  });
  it('contador singular e categoria ausente sem label vazio', async () => {
    getLatestBriefing.mockResolvedValue({ ...briefing, noticias: [{ titulo: 'Um assunto', resumo: 'Resumo', fonte: 'Fonte', sourceUrl: 'https://example.com/' }] });
    render(<App />);
    expect(await screen.findByText('1 assunto que merece sua atenção.')).toBeInTheDocument();
    expect(screen.getByRole('article').querySelector('.category')).toBeNull();
    expect(screen.getByRole('link', { name: 'Fonte' }).textContent).toBe('Fonte');
  });
});
