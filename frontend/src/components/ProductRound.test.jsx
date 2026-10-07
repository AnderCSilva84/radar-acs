import { it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { clubs as CLUBS, searchClubs, followClub } from '../services/clubCatalog';
import { FollowedTeamsEditor } from './FollowedTeamsEditor';
import { AdSlot } from './AdSlot';
import { AdCarousel } from './AdCarousel';
import { EditorialVisual } from './EditorialVisual';
import { today } from '../services/advertising';
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
const ad = id => ({id,campaignName:id,advertiserName:'ACS',position:'HOME_TOP',imageUrl:'https://example.com/'+id+'.png',targetUrl:'https://example.com/'+id,alt:id,startDate:today(),endDate:'2099-01-01',active:true});
it('catálogo 2026: 20 clubes por divisão sem IDs de provider inventados',()=>{
 for(const division of ['A','B','C']) expect(CLUBS.filter(club=>club.division===division)).toHaveLength(20);
 expect(CLUBS.every(club=>club.season===2026 && club.providerIds.footballData===null && club.source.startsWith('https://'))).toBe(true);
});
it('busca parcial, caixa e acentos; Botafogos corretamente separados',()=>{
 expect(searchClubs('BOTA').map(club=>club.id)).toEqual(expect.arrayContaining(['botafogo','botafogo-sp','botafogo-pb']));
 expect(searchClubs('paysa')[0].name).toBe('Paysandu');expect(searchClubs('america')[0].name).toBe('América-MG');
 expect(searchClubs('REMO')[0].name).toBe('Remo');
 expect(searchClubs('flamen')[0].name).toBe('Flamengo');
});
it('seguir Botafogo preserva identidade e vínculo antigos',()=>{
 const original={id:'legacy-botafogo',name:'Botafogo',active:false,provider:'football-data',providerTeamId:'1770'};
 const next=followClub(searchClubs('Botafogo')[0],[original]);expect(next).toHaveLength(1);expect(next[0]).toMatchObject({...original,active:true});
});
it('seleção por teclado e remoção sem campos técnicos',()=>{
 const change=vi.fn();const teams=[{id:'botafogo',name:'Botafogo',active:true}];render(<FollowedTeamsEditor teams={teams} onChange={change}/>);
 expect(screen.queryByText(/ID do time|ID football-data/)).not.toBeInTheDocument();
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'paysa'}});fireEvent.keyDown(screen.getByRole('combobox'),{key:'Enter'});
 expect(change.mock.calls[0][0][1].name).toBe('Paysandu');fireEvent.click(screen.getByRole('button',{name:'Remover Botafogo'}));expect(change.mock.calls[1][0]).toEqual([]);
});
it('2 campanhas: anterior/próximo/indicadores/teclado e link individual; publicidade permanente',()=>{
 render(<AdSlot position="HOME_TOP" campaigns={[ad('a'),ad('b')]} />);
 fireEvent.click(screen.getByRole('button',{name:'Próximo anúncio'}));expect(screen.getByRole('link')).toHaveAttribute('href','https://example.com/b');
 fireEvent.keyDown(screen.getByLabelText('Publicidade — campanhas'),{key:'ArrowLeft'});expect(screen.getByRole('img')).toHaveAttribute('alt','a');
 expect(screen.getAllByText('Publicidade')).toHaveLength(1);expect(screen.getByRole('button',{name:'Mostrar anúncio 1: a'})).toHaveAttribute('aria-pressed','true');
});
it('rotação opcional pausa na interação e página invisível',()=>{
 vi.useFakeTimers();render(<AdCarousel campaigns={[ad('a'),ad('b')]} autoplay/>);fireEvent(document,new Event('visibilitychange'));
 act(()=>vi.advanceTimersByTime(8000));expect(screen.getByRole('img')).toHaveAttribute('alt','b');
 fireEvent.click(screen.getByRole('button',{name:'Anúncio anterior'}));act(()=>vi.advanceTimersByTime(16000));expect(screen.getByRole('img')).toHaveAttribute('alt','a');
});
it('reduced-motion não inicia autoplay',()=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
 render(<AdCarousel campaigns={[ad('a'),ad('b')]} autoplay/>);act(()=>vi.advanceTimersByTime(24000));expect(screen.getByRole('img')).toHaveAttribute('alt','a');expect(screen.queryByText('Pausar rotação')).not.toBeInTheDocument();
});
it('falha de imagem e imagem pequena voltam ao fallback sem quebrar card',()=>{
 const news={id:'n',titulo:'Notícia',categoria:'Tecnologia',imageUrl:'https://example.com/news.jpg',imageSource:'https://example.com/article',imageApproved:true};
 const view=render(<EditorialVisual news={news}/>);Object.defineProperty(screen.getByRole('img'),'naturalWidth',{value:50});fireEvent.load(screen.getByRole('img'));expect(screen.queryByRole('img')).not.toBeInTheDocument();expect(view.container.querySelector('.category-art')).toBeTruthy();
});
it('imagem válida mostra fotografia com alt e notícias antigas mantêm fallback',()=>{
 const view=render(<EditorialVisual news={{titulo:'Artigo',imageUrl:'https://example.com/photo.jpg',imageSource:'https://example.com/article',imageApproved:true,imageAlt:'Fotografia editorial'}}/>);expect(screen.getByRole('img')).toHaveAttribute('alt','Fotografia editorial');
 view.rerender(<EditorialVisual news={{titulo:'Antiga'}}/>);expect(screen.queryByRole('img')).not.toBeInTheDocument();
});
it('aba invisível suspende autoplay até retornar',()=>{
 vi.useFakeTimers();const original=Object.getOwnPropertyDescriptor(document,'hidden');Object.defineProperty(document,'hidden',{configurable:true,value:false});
 const view=render(<AdCarousel campaigns={[ad('a'),ad('b')]} autoplay/>);
 Object.defineProperty(document,'hidden',{configurable:true,value:true});fireEvent(document,new Event('visibilitychange'));act(()=>vi.advanceTimersByTime(16000));expect(screen.getByRole('img')).toHaveAttribute('alt','a');
 Object.defineProperty(document,'hidden',{configurable:true,value:false});fireEvent(document,new Event('visibilitychange'));act(()=>vi.advanceTimersByTime(8000));expect(screen.getByRole('img')).toHaveAttribute('alt','b');
 view.unmount();if(original) Object.defineProperty(document,'hidden',original);else delete document.hidden;
});
it('timeout após entrar no viewport volta ao fallback',()=>{
 vi.useFakeTimers();let observe;vi.stubGlobal('IntersectionObserver',class {constructor(fn){observe=fn;}observe(){}disconnect(){}});
 render(<EditorialVisual news={{titulo:'Lenta',imageUrl:'https://example.com/slow.jpg',imageSource:'https://example.com/article',imageApproved:true}}/>);
 Object.defineProperty(screen.getByRole('img'),'complete',{value:false});act(()=>observe([{isIntersecting:true}]));act(()=>vi.advanceTimersByTime(10000));expect(screen.queryByRole('img')).not.toBeInTheDocument();
});
