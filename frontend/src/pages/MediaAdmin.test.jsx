import { it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MediaAdmin } from './MediaAdmin';
import { Listen } from './Listen';
import { mediaRequest } from '../services/adminAuth';
import { mediaId, appendMedia, moveMedia, mediaUrl } from '../services/media';
vi.mock('../services/adminAuth', () => ({ mediaRequest: vi.fn() }));
const radio = { id: 'radio', name: 'Rádio', mediaType: 'RADIO_STREAM', streamUrl: 'https://example.com/stream', enabled: true, featured: false, usageStatus: 'approved', sortOrder: 1 };
const playlist = { id: 'playlist', name: 'Playlist', mediaType: 'SPOTIFY_PLAYLIST', spotifyUrl: 'https://open.spotify.com/playlist/1234567890123456789012', enabled: true, sortOrder: 2 };
beforeEach(() => mediaRequest.mockReset());
async function open(items = []) {
  mediaRequest.mockImplementation(async (_, value) => value || { media: items });
  render(<MediaAdmin user={{ uid: 'fixture-only' }} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Nova mídia' })).toBeEnabled());
}
it('gera slug seguro, resolve colisões e calcula próxima ordem', () => {
  expect(mediaId('Rádio São José!', [{ id: 'radio-sao-jose' }])).toBe('radio-sao-jose-2');
  expect(mediaId('!!!', [])).toBe('midia');
  expect(appendMedia([radio, { ...playlist, sortOrder: 9 }], { name: 'Nova' }).at(-1)).toMatchObject({ id: 'nova', sortOrder: 10 });
  expect(appendMedia([{ ...radio, sortOrder: 1000 }], { name: 'Nova' }).map(item => item.sortOrder)).toEqual([1, 2]);
});
it('reorganiza sem modificar os objetos anteriores e respeita limites', () => {
  expect(moveMedia([radio, playlist], 'playlist', -1).map(item => item.id)).toEqual(['playlist', 'radio']);
  expect(radio.sortOrder).toBe(1);
  expect(moveMedia([radio], 'radio', -1)).toEqual([radio]);
});
it('valida domínio e tipo Spotify, HTTPS e ausência de credenciais', () => {
  expect(mediaUrl(playlist.spotifyUrl, true)).toBe(playlist.spotifyUrl);
  for (const url of ['https://open.spotify.com/track/1234567890123456789012', 'https://evil.example/playlist/1234567890123456789012', 'http://example.com', 'https://example.com/?token=private', 'https://user:pass@example.com']) expect(mediaUrl(url, true)).toBeNull();
});
it('rádio inicia pendente, Brasil, ativa, sem destaque; texto alterna checkbox', async () => {
  await open(); fireEvent.click(screen.getByRole('button', { name: 'Nova mídia' }));
  expect(screen.queryByLabelText('ID')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Ordem')).not.toBeInTheDocument();
  expect(screen.getByLabelText('País')).toHaveValue('Brasil');
  expect(screen.getByLabelText('Status de uso')).toHaveValue('pending');
  expect(screen.getByRole('option', { name: 'Pendente — ainda não publicar' })).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: /^Ativa/ })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: /^Destaque/ })).not.toBeChecked();
  fireEvent.click(screen.getByText('Destaque', { exact: true }));
  expect(screen.getByRole('checkbox', { name: /^Destaque/ })).toBeChecked();
});
it('Spotify esconde campos de rádio e mostra preview sem áudio', async () => {
  await open(); fireEvent.click(screen.getByRole('button', { name: 'Nova mídia' }));
  fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'SPOTIFY_PLAYLIST' } });
  for (const label of ['País', 'Cidade', 'Estado', 'Status de uso', 'Site oficial']) expect(screen.queryByLabelText(label)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/^Nome/), { target: { value: 'Minha playlist' } });
  fireEvent.change(screen.getByLabelText(/^URL da playlist/), { target: { value: playlist.spotifyUrl } });
  expect(screen.getByRole('region', { name: 'Pré-visualização' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Abrir no Spotify ↗' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Salvar mídia' }));
  await screen.findByText('Mídias salvas.');
  expect(mediaRequest.mock.calls[1][1].media[0]).toMatchObject({ id: 'minha-playlist', sortOrder: 1, enabled: true });
});
it('preview rádio e edição preservam ID e ordem', async () => {
  await open([radio]); fireEvent.click(screen.getByRole('button', { name: 'Editar Rádio' }));
  expect(screen.getByText('radio', { selector: 'code' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '▶ Ouvir ao vivo' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText(/^Nome/), { target: { value: 'Novo nome' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar mídia' }));
  await screen.findByText('Mídias salvas.');
  expect(mediaRequest.mock.calls[1][1].media[0]).toMatchObject({ id: 'radio', sortOrder: 1, name: 'Novo nome' });
});
it('exclusão exige confirmação e cancelar não persiste', async () => {
  await open([radio]); fireEvent.click(screen.getByRole('button', { name: 'Excluir Rádio' }));
  expect(screen.getByRole('alertdialog')).toBeInTheDocument(); expect(mediaRequest).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar exclusão' })); expect(mediaRequest).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Excluir Rádio' })); fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }));
  await screen.findByText('Mídias salvas.'); expect(mediaRequest.mock.calls[1][1]).toEqual({ media: [] });
});
it('rádio externa cadastra link oficial sem exigir stream e preserva aprovação pendente', async () => {
  await open(); fireEvent.click(screen.getByRole('button', { name: 'Nova mídia' }));
  fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'EXTERNAL_RADIO' } });
  expect(screen.queryByLabelText(/^URL do stream/)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/^Nome/), { target: { value: 'Rádio oficial' } });
  fireEvent.change(screen.getByLabelText(/^URL da transmissão oficial/), { target: { value: 'https://example.com/ouvir' } });
  expect(screen.getByRole('button', { name: 'Abrir transmissão oficial ↗' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Salvar mídia' }));
  await screen.findByText('Mídias salvas.');
  expect(mediaRequest.mock.calls[1][1].media[0]).toMatchObject({ mediaType: 'EXTERNAL_RADIO', externalUrl: 'https://example.com/ouvir', usageStatus: 'pending' });
});
it('rádio externa abre link oficial e nunca aciona player', () => {
  const play = vi.fn();
  render(<Listen state={{ status: 'ready', data: { media: [{ ...radio, mediaType: 'EXTERNAL_RADIO', externalUrl: 'https://example.com/ouvir' }] } }} onPlay={play} />);
  const link = screen.getByRole('link', { name: 'Abrir transmissão oficial ↗' });
  expect(link).toHaveAttribute('href', 'https://example.com/ouvir');
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  fireEvent.click(link); expect(play).not.toHaveBeenCalled();
});
for (const [items, headings] of [[[], []], [[radio], ['Rádios ao vivo']], [[playlist], ['Playlists do Spotify']], [[radio, playlist], ['Rádios ao vivo', 'Playlists do Spotify']]]) it(`Ouvir mostra somente seções preenchidas: ${headings.join(',') || 'vazio único'}`, () => {
  render(<Listen state={{ status: 'ready', data: { media: items } }} onPlay={vi.fn()} />);
  for (const name of ['Rádios ao vivo', 'Playlists do Spotify']) expect(Boolean(screen.queryByRole('heading', { name }))).toBe(headings.includes(name));
  expect(Boolean(screen.queryByText('Novas formas de acompanhar seu dia estão chegando.'))).toBe(items.length === 0);
});
