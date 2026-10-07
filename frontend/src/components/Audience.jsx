import {useEffect,useState} from 'react';
import {consent,setConsent,trackPage,presencePageHide,presencePageShow} from '../services/audience';
export function AudienceConsent({path}){
 const [choice,setChoice]=useState(consent);
 useEffect(()=>{const change=()=>setChoice(consent());window.addEventListener('radar-audience-consent',change);return()=>window.removeEventListener('radar-audience-consent',change);},[]);
 useEffect(()=>trackPage(path),[path,choice]);
 useEffect(()=>{window.addEventListener('pagehide',presencePageHide);window.addEventListener('pageshow',presencePageShow);return()=>{window.removeEventListener('pagehide',presencePageHide);window.removeEventListener('pageshow',presencePageShow);};},[]);
 if(path.startsWith('/admin')||path==='/login')return null;
 return <>{choice==='unset'&&<section className="audience-consent" aria-label="Métricas de audiência"><p>Podemos medir visitas e reprodução de áudio com um identificador aleatório? Não usamos fingerprint, nome ou localização precisa. <a href="/privacy">Saiba mais</a>.</p><div><button onClick={()=>setConsent('accepted')}>Aceitar métricas</button><button onClick={()=>setConsent('denied')}>Recusar</button></div></section>}<button className="audience-choice" onClick={()=>setConsent(choice==='accepted'?'denied':'unset')}>{choice==='accepted'?'Desativar métricas de uso':'Métricas de uso'}</button></>;
}
export function ListenerCount(){
 const [count,setCount]=useState(null);
 useEffect(()=>{let alive=true;const update=async()=>{if(document.visibilityState==='hidden')return;try{const r=await fetch('/api/audience/listeners',{cache:'no-store'});if(!r.ok)throw new Error();const data=await r.json();if(alive)setCount(Number.isInteger(data.listeners)&&data.listeners>=0?data.listeners:null);}catch{if(alive)setCount(null);}};update();const timer=setInterval(update,60000);return()=>{alive=false;clearInterval(timer);};},[]);
 return <span className="listener-count">{count>0?`● ${count} ouvindo agora`:'Disponível para ouvir'}</span>;
}
