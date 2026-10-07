import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TeamCrest, FollowedTeamCrests } from './TeamCrest';
import { clubs, followClub } from '../services/clubCatalog';
import { FollowedTeamsEditor } from './FollowedTeamsEditor';
import { LiveMatchCard } from './RadarLive';

it('escudos possuem origem oficial; clubes não verificados permanecem sem URL', () => {
  const verified = clubs.filter(club => club.crestUrl);
  expect(verified).toHaveLength(1);
  expect(verified[0]).toMatchObject({id:'botafogo',series:'A',crestSource:'https://botafogo.com.br/simbolos'});
  expect(clubs.find(club => club.id === 'botafogo-pb').crestUrl).toBeNull();
});
it('escudo quebrado vira fallback; trocar clube não mantém imagem errada', () => {
  const view = render(<TeamCrest team={{id:'botafogo',name:'Botafogo'}} />);
  const image = screen.getByAltText('Escudo do Botafogo');
  expect(image).toHaveAttribute('loading','lazy');
  fireEvent.error(image);
  expect(screen.queryByAltText('Escudo do Botafogo')).not.toBeInTheDocument();
  view.rerender(<TeamCrest team={{id:'botafogo-pb',name:'Botafogo-PB'}} />);
  expect(screen.getByLabelText('Escudo indisponível: Botafogo-PB')).toBeInTheDocument();
});
it('busca distingue os Botafogos e clique preserva vínculo existente', () => {
  const existing = {id:'legacy',name:'Botafogo',providerTeamId:'1770',active:true};
  const change = vi.fn();
  render(<FollowedTeamsEditor teams={[existing]} onChange={change} />);
  fireEvent.change(screen.getByRole('combobox'),{target:{value:'botafogo'}});
  const options = screen.getAllByRole('option');
  expect(options).toHaveLength(3);
  expect(options[0]).toHaveTextContent('Série A');
  expect(options[2]).toHaveTextContent('Série C');
  fireEvent.click(options[0]);
  expect(change.mock.calls[0][0]).toEqual([existing]);
  expect(followClub(clubs.find(club=>club.id==='botafogo'),[existing])[0].providerTeamId).toBe('1770');
});
it('composição limita quatro clubes, mostra +N e ignora pausados', () => {
  const teams = ['Botafogo','A','B','C','D'].map((name,index)=>({id:String(index),name,active:true}));
  const view = render(<FollowedTeamCrests teams={teams} compact />);
  expect(screen.getByText('+1')).toBeInTheDocument();
  expect(screen.queryByText('D')).not.toBeInTheDocument();
  view.rerender(<FollowedTeamCrests teams={[{id:'botafogo',name:'Botafogo',active:false}]} compact />);
  expect(screen.queryByLabelText('Times acompanhados')).not.toBeInTheDocument();
});
it('partida usa exclusivamente nomes e placar recebidos, sem inferir adversário', () => {
  render(<LiveMatchCard match={{status:'UPCOMING',home:{name:'Botafogo'},away:{name:'Adversário da fixture'}}} />);
  expect(screen.getByAltText('Escudo do Botafogo')).toBeInTheDocument();
  expect(screen.getByLabelText('Escudo indisponível: Adversário da fixture')).toBeInTheDocument();
  expect(screen.queryByText('0 – 0')).not.toBeInTheDocument();
});
