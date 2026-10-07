import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { RadioPlayer } from './RadioPlayer';
import { RadarLive, LiveMatchCard } from './RadarLive';
import { Listen } from '../pages/Listen';
import { MediaAdmin } from '../pages/MediaAdmin';
import { FollowedTeamsEditor } from './FollowedTeamsEditor';
import { prioritizeNews } from '../services/live';
import { mediaRequest } from '../services/adminAuth';
vi.mock('../services/adminAuth', () => ({ mediaRequest: vi.fn() }));
const radio = {id:'test',mediaType:'RADIO_STREAM',name:'Rádio teste',streamUrl:'https://example.com/radio',enabled:true,usageStatus:'approved'};
const playlist = {id:'playlist',mediaType:'SPOTIFY_PLAYLIST',name:'Playlist teste',spotifyUrl:'https://open.spotify.com/playlist/1234567890123456789012',enabled:true};
const state = media => ({status:'ready',data:{media,football:{enabled:true,teams:[],matches:[],status:'NOT_CONFIGURED'}}});
it('Ouvir separa Spotify, approved e disabled; Spotify nunca passa no player', () => {
  const play=vi.fn();render(<Listen state={state([radio,playlist,{...radio,id:'pending',name:'Pendente',usageStatus:'pending'},{...playlist,id:'off',name:'Inativa',enabled:false}])} onPlay={play}/>);
  expect(screen.queryByText('Pendente')).not.toBeInTheDocument();expect(screen.queryByText('Inativa')).not.toBeInTheDocument();
  const link=screen.getByRole('link',{name:'Abrir no Spotify ↗'});expect(link).toHaveAttribute('href',playlist.spotifyUrl);expect(link).toHaveAttribute('rel','noopener noreferrer');
  fireEvent.click(link);expect(play).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Ouvir Rádio teste'}));expect(play).toHaveBeenCalledWith(radio);
});
it('player não tem autoplay; não aceita Spotify; reproduz rádio e preserva em rerender', async () => {
  const play=vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue();vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});vi.spyOn(HTMLMediaElement.prototype,'load').mockImplementation(()=>{});
  const ref=createRef();const view=render(<RadioPlayer ref={ref}/>);expect(view.container.querySelector('audio')).not.toHaveAttribute('autoplay');expect(play).not.toHaveBeenCalled();
  ref.current.play(playlist);expect(play).not.toHaveBeenCalled();ref.current.play(radio);
  await screen.findByText('Rádio teste');expect(play).toHaveBeenCalledTimes(1);view.rerender(<RadioPlayer ref={ref}/>);expect(view.container.querySelector('audio').src).toBe(radio.streamUrl);
  fireEvent.click(screen.getByRole('button',{name:'Parar'}));expect(screen.queryByText('Rádio teste')).not.toBeInTheDocument();
});
it('falha de áudio é tratada sem derrubar página', async()=>{
  vi.spyOn(HTMLMediaElement.prototype,'play').mockRejectedValue(Error('private error'));vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});
  const ref=createRef();render(<RadioPlayer ref={ref}/>);ref.current.play(radio);await screen.findByText('Não foi possível reproduzir a rádio. Tente novamente.');expect(screen.queryByText('private error')).not.toBeInTheDocument();
});
it('futebol desligado esconde todo o módulo; fallback não inventa placares',()=>{
  const value=state([]);value.data.football.enabled=false;const view=render(<RadarLive state={value}/>);expect(screen.queryByText('Radar Futebol')).not.toBeInTheDocument();
  value.data.football.enabled=true;view.rerender(<RadarLive state={value}/>);expect(screen.getByText(/Quando houver partidas disponíveis/)).toBeInTheDocument();expect(screen.queryByText('0 – 0')).not.toBeInTheDocument();
});
for(const status of ['UPCOMING','LIVE','HALFTIME','FINISHED','POSTPONED','CANCELLED']) it(`card normalizado ${status} não inventa minuto`,()=>{
  render(<LiveMatchCard match={{id:'m',status,home:{name:'A'},away:{name:'B'},startsAt:'2026-10-05T20:00:00Z'}}/>);expect(screen.getByRole('heading',{name:'A × B'})).toBeInTheDocument();expect(screen.queryByText('0 – 0')).not.toBeInTheDocument();
});
it('prioridades reais filtram futebol e ordenam sem alterar edição original',()=>{
  const original=[{id:1,categoria:'Futebol'},{id:2,categoria:'Economia'},{id:3,categoria:'Tecnologia & IA'}];
  expect(prioritizeNews(original,{futebol:'off',economia:'low',tecnologiaIA:'high'}).map(item=>item.id)).toEqual([3,2]);expect(original).toHaveLength(3);
});
it('admin muda campos por tipo e salva mídia pela API autenticada existente',async()=>{
  mediaRequest.mockResolvedValue({media:[]});render(<MediaAdmin user={{uid:'mock-only'}}/>);await waitFor(()=>expect(screen.getByRole('button',{name:'Nova mídia'})).toBeEnabled());
  fireEvent.click(screen.getByRole('button',{name:'Nova mídia'}));fireEvent.change(screen.getByLabelText('Tipo'),{target:{value:'SPOTIFY_PLAYLIST'}});
  expect(screen.queryByLabelText('Stream URL')).not.toBeInTheDocument();expect(screen.queryByLabelText('Status de uso')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/^Nome/),{target:{value:'Playlist'}});fireEvent.change(screen.getByLabelText(/^URL da playlist no Spotify/),{target:{value:playlist.spotifyUrl}});
  fireEvent.click(screen.getByRole('button',{name:'Salvar mídia'}));await screen.findByText('Mídias salvas.');expect(mediaRequest).toHaveBeenCalledWith({uid:'mock-only'},expect.objectContaining({media:expect.any(Array)}));
});
it('múltiplos times adicionados sem inventar ID de provider',()=>{
  const change=vi.fn();render(<FollowedTeamsEditor teams={[{id:'a',name:'A'}]} onChange={change}/>);
  fireEvent.change(screen.getByRole('combobox'),{target:{value:'paysa'}});fireEvent.keyDown(screen.getByRole('combobox'),{key:'Enter'});
  expect(change.mock.calls[0][0]).toHaveLength(2);expect(change.mock.calls[0][0][1].providerTeamId).toBeUndefined();
});



