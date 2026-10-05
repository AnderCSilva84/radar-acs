import { useId } from 'react';
const positions = [[62, 30], [28, 53], [73, 68], [43, 77], [42, 24]];
export function AnimatedRadar({ count = 3, small = false }) {
  const id = useId().replace(/:/g, '');
  return <svg className={'animated-radar' + (small ? ' radar-small' : '')} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <defs><linearGradient id={id}><stop stopColor="#64d6c9" stopOpacity="0" /><stop offset="1" stopColor="#64d6c9" stopOpacity=".4" /></linearGradient></defs>
    <circle className="radar-disc" cx="50" cy="50" r="47" />
    {[12, 24, 36, 47].map(radius => <circle className="radar-ring" key={radius} cx="50" cy="50" r={radius} />)}
    <path className="radar-axis" d="M3 50h94M50 3v94M17 17l66 66M17 83l66-66" />
    <g className="radar-sweep"><path d="M50 50L50 3A47 47 0 0 1 97 50Z" fill={'url(#' + id + ')'} /><path className="radar-beam" d="M50 50h47" /></g>
    {positions.slice(0, Math.max(0, Math.min(count, positions.length))).map(([x, y], i) => <g className="radar-blip" key={i} style={{ '--delay': i * .6 + 's' }}><circle className="radar-pulse" cx={x} cy={y} r="3" /><circle cx={x} cy={y} r="1.7" /></g>)}
    <circle cx="50" cy="50" r="2" fill="#a4eee4" />
  </svg>;
}
