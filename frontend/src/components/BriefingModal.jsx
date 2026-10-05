import { useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { formatDate, readableParagraphs } from '../utils/briefing';
export function BriefingModal({ briefing, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    const prior = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prior; dialog.close(); previous?.focus(); };
  }, []);
  function keepFocus(event) {
    if (event.key !== 'Tab') return;
    const controls = [...ref.current.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]')];
    const first = controls[0], last = controls.at(-1);
    if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
      event.preventDefault(); (event.shiftKey ? last : first)?.focus();
    }
  }
  return <dialog ref={ref} className="briefing-modal" aria-labelledby="reading-title" onKeyDown={keepFocus} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === ref.current) onClose(); }}>
    <div className="modal-header"><span className="eyebrow">LEITURA DO BRIEFING</span><button className="icon-button" aria-label="Fechar roteiro" onClick={onClose}><Icon name="close" /></button></div>
    <div className="modal-body"><h2 id="reading-title">Roteiro do briefing</h2><p className="modal-edition">{briefing.titulo}<br />{formatDate(briefing.data)}</p><p className="reading-note">Leitura em texto. O botão não reproduz áudio gravado.</p><div className="script-text">{readableParagraphs(briefing.roteiroAlexa).map((text, index) => <p key={index}>{text}</p>)}</div></div>
  </dialog>;
}
