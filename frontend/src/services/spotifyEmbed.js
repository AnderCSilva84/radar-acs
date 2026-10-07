import { spotifyPlaylistId } from './media';

export function spotifyEmbedUrls(value) {
  const playlistId = spotifyPlaylistId(value);
  if (!playlistId) return null;
  return {
    type: 'playlist', playlistId,
    canonicalUrl: `https://open.spotify.com/playlist/${playlistId}`,
    embedUrl: `https://open.spotify.com/embed/playlist/${playlistId}`
  };
}
