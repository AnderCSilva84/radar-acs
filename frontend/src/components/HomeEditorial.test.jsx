import { it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NewsFeed } from './NewsFeed';
const news = [1,2,3].map(id=>({id,titulo:`Assunto ${id}`,resumo:'Resumo editorial preservado.',categoria:'Tecnologia',fonte:'Fonte',sourceUrl:'https://example.com/'+id}));
const liveState={status:'ready',data:{football:{enabled:true,teams:[{id:'botafogo',name:'Botafogo'}],matches:[],stale:false}}};
it('Home possui duas zonas e notícias secundárias completas antes do Seu Radar',()=>{
 const view=render(<NewsFeed home briefing={{data:'2026-10-05',noticias:news}} liveState={liveState} />);
 expect(view.container.querySelectorAll('.home-editorial-layout > div')).toHaveLength(2);
 expect(view.container.querySelectorAll('.secondary-stories .news-item')).toHaveLength(2);
 expect(view.container.querySelectorAll('.secondary-stories .editorial-visual')).toHaveLength(2);
 expect(screen.getByRole('complementary',{name:'Seu Radar'})).toBeInTheDocument();
 expect(screen.queryByText('E ainda no Radar')).not.toBeInTheDocument();
 expect(screen.queryByText('EDIÇÃO DE HOJE')).not.toBeInTheDocument();
 expect(screen.getAllByText('Botafogo')).toHaveLength(1);
 expect(screen.getByText('Nenhum jogo disponível agora.')).toBeInTheDocument();
 expect(screen.queryByText(/Você acompanha este time/)).not.toBeInTheDocument();
 expect(screen.getByAltText('Escudo do Botafogo')).toBeInTheDocument();
});
it('links da lateral preservam navegação e somente partidas recebidas aparecem',()=>{
 const state={...liveState,data:{football:{...liveState.data.football,matches:[{id:'m',status:'FINISHED',home:{name:'Botafogo'},away:{name:'Adversário da fixture'},score:{home:2,away:1}}]}}};
 render(<NewsFeed home briefing={{data:'2026-10-05',noticias:news}} liveState={state} />);
 expect(screen.getByRole('heading',{name:'Botafogo × Adversário da fixture'})).toBeInTheDocument();
 expect(screen.getByText('2 – 1')).toBeInTheDocument();
 expect(screen.getByRole('link',{name:'Ouvir agora →'})).toHaveAttribute('href','/listen');
 expect(screen.getByRole('link',{name:'Abrir Radar Ao Vivo →'})).toHaveAttribute('href','/live');
});
