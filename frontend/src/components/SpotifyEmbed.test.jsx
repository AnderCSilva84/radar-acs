import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpotifyEmbed } from './SpotifyEmbed';
import { MediaCard } from './MediaCard';
import { spotifyPlaylistId } from '../services/media';
import { spotifyEmbedUrls } from '../services/spotifyEmbed';
const id = '1234567890123456789012';
const url = `https://open.spotify.com/playlist/${id}`;
it('extrai somente ID validado e descarta tracking', () => {
  expect(spotifyPlaylistId(url)).toBe(id);
  expect(spotifyPlaylistId(`${url}?si=public&utm_source=share`)).toBe(id);
  expect(spotifyPlaylistId(`https://open.spotify.com/intl-pt/playlist/${id}/?si=public`)).toBe(id);
});
for (const bad of ['javascript:alert(1)', 'data:text/html,<iframe>', 'file:///x', '<iframe src="https://open.spotify.com"></iframe>', `https://open.spotify.com.evil.test/playlist/${id}`, `https://evil.test/playlist/${id}`, `https://open.spotify.com/track/${id}`, 'https://open.spotify.com/playlist/no', `${url}?token=secret`, `https://user:pass@open.spotify.com/playlist/${id}`]) it(`rejeita entrada insegura: ${bad.split(':')[0]}`, () => {
  expect(spotifyPlaylistId(bad)).toBeNull();
  const view = render(<SpotifyEmbed url={bad} name="Teste" />);
  expect(view.container.querySelector('iframe')).toBeNull();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
it('renderiza iframe oficial responsivo lazy, encrypted-media e link externo limpo', () => {
  const view = render(<SpotifyEmbed url={`${url}?si=public`} name="Playlist" />);
  const iframe = view.container.querySelector('iframe');
  expect(iframe).toHaveAttribute('src', `https://open.spotify.com/embed/playlist/${id}`);
  expect(iframe).toHaveAttribute('loading', 'lazy');
  expect(iframe).toHaveAttribute('width', '100%');
  expect(iframe).toHaveAttribute('height', '352');
  expect(iframe).toHaveAttribute('frameborder', '0');
  expect(iframe).toHaveAttribute('allow', 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture');
  expect(iframe.getAttribute('allow')).toContain('encrypted-media');
  expect(iframe).toHaveAttribute('allowfullscreen');
  expect(iframe).toHaveAttribute('title', 'Player oficial do Spotify — Playlist');
  const link = screen.getByRole('link', { name: 'Abrir no Spotify ↗' });
  expect(link).toHaveAttribute('href', url);
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
});
it('erro do iframe preserva fallback e link externo', () => {
  const view = render(<SpotifyEmbed url={url} name="Teste" />);
  fireEvent.error(view.container.querySelector('iframe'));
  expect(screen.getByText('Não foi possível carregar o player do Spotify.')).toBeInTheDocument();
  expect(screen.getByText('Ouça esta playlist no Spotify.')).toBeInTheDocument();
  expect(view.container.querySelector('iframe')).toBeNull();
  expect(screen.getByRole('link', { name: 'Abrir no Spotify ↗' })).toHaveAttribute('href', url);
});
it('builder separa tipo, ID, canonical e embed e remove parâmetros de compartilhamento', () => {
  expect(spotifyEmbedUrls(`${url}?si=public&utm_source=share`)).toEqual({ type: 'playlist', playlistId: id, canonicalUrl: url, embedUrl: `https://open.spotify.com/embed/playlist/${id}` });
  expect(spotifyEmbedUrls(`https://open.spotify.com/album/${id}`)).toBeNull();
});
it('load do iframe não é tratado como prova de sucesso ou falha cross-origin', () => {
  const view = render(<SpotifyEmbed url={url} name="Teste" />);
  fireEvent.load(view.container.querySelector('iframe'));
  expect(view.container.querySelector('iframe')).toBeInTheDocument();
  expect(screen.queryByText('Ouça esta playlist no Spotify.')).not.toBeInTheDocument();
});
it('fallback manual cobre erros internos cross-origin não observáveis', () => {
  render(<SpotifyEmbed url={url} name="Teste" />);
  fireEvent.click(screen.getByRole('button', { name: 'Player não carregou?' }));
  expect(screen.getByText('Não foi possível carregar o player do Spotify.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Abrir no Spotify ↗' })).toBeInTheDocument();
});
it('trocar playlist reinicia estado de falha', () => {
  const view = render(<SpotifyEmbed url={url} name="Teste" />);
  fireEvent.error(view.container.querySelector('iframe'));
  view.rerender(<SpotifyEmbed url="https://open.spotify.com/playlist/abcdefghijklmnopqrstuv" name="Outra" />);
  expect(view.container.querySelector('iframe')).toHaveAttribute('src', 'https://open.spotify.com/embed/playlist/abcdefghijklmnopqrstuv');
});
it('preview administrativo não carrega Spotify nem inicia áudio', () => {
  const play = vi.fn();
  const view = render(<MediaCard item={{ name: 'Preview', mediaType: 'SPOTIFY_PLAYLIST', spotifyUrl: url }} onPlay={play} preview />);
  expect(view.container.querySelector('iframe')).toBeNull();
  expect(screen.getByRole('button', { name: 'Abrir no Spotify ↗' })).toBeDisabled();
  expect(play).not.toHaveBeenCalled();
});
