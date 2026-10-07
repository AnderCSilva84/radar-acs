import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import {setAudioActive} from '../services/audience';
export const RadioPlayer = forwardRef(function RadioPlayer(_, ref) {
  const audio = useRef(null);
  const [station, setStation] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState('');
  async function play() {
    setMessage('');
    try { await audio.current.play(); }
    catch { setPlaying(false); setMessage('Não foi possível reproduzir a rádio. Tente novamente.'); }
  }
  useImperativeHandle(ref, () => ({ play(item) {
    if (item.mediaType !== 'RADIO_STREAM' || !item.enabled || item.usageStatus !== 'approved') return;
    try {
      const url = new URL(item.streamUrl);
      if (url.protocol !== 'https:' || url.username || url.password) return;
      audio.current.pause();
      audio.current.src = url.href;
      setStation(item);
      play();
    } catch { setMessage('Fonte de rádio inválida.'); }
  } }));
  function stop() { audio.current.pause(); audio.current.removeAttribute('src'); audio.current.load(); setStation(null); setPlaying(false); }
  return <><audio ref={audio} preload="none" onPlaying={() => {setPlaying(true);setAudioActive(true);}} onWaiting={()=>setAudioActive(false)} onEnded={()=>{setPlaying(false);setAudioActive(false);}} onPause={() => {setPlaying(false);setAudioActive(false);}} onError={() => { setPlaying(false);setAudioActive(false); setMessage('Stream indisponível.'); }} />
    {station && <aside className="radio-player" aria-label="Player de rádio"><div><span className="eyebrow">RÁDIO AO VIVO</span><strong>{station.name}</strong>{message && <p role="status">{message}</p>}</div>
      <button onClick={() => playing ? audio.current.pause() : play()}>{playing ? 'Pausar' : 'Reproduzir'}</button>
      <label>Volume<input type="range" min="0" max="1" step="0.05" defaultValue="1" onChange={event => { audio.current.volume = Number(event.target.value); }} /></label>
      <button onClick={stop}>Parar</button></aside>}
  </>;
});
