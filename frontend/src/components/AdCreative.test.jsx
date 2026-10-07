import { it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { AdCreative } from './AdCreative';
import { AdCreativeEditor } from './AdCreativeEditor';
import { validateCreativeHeader, validateCreativeDimensions, aspectWarning, prepareCreative, creativeSlots } from '../services/adCreative';
import { safeAdUrl } from '../services/advertising';

const campaign = { position: 'HOME_TOP', imageUrl: 'https://example.com/banner.png', targetUrl: 'https://example.com/offer', advertiserName: 'Anunciante de teste', campaignName: 'Campanha técnica', alt: 'Banner técnico', ctaText: 'Saiba mais', startDate: '2026-10-05', endDate: '2026-10-20', active: true };
const png = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0];
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it.each([
  ['banner.jpg', 'image/jpeg', [255, 216, 255]],
  ['banner.jpeg', 'image/jpeg', [255, 216, 255]],
  ['banner.png', 'image/png', png],
  ['banner.webp', 'image/webp', Array.from('RIFF0000WEBP', c => c.charCodeAt(0))]
])('valida assinatura, MIME e extensão: %s', (name, type, bytes) => expect(() => validateCreativeHeader({ name, type, size: 1024 }, bytes)).not.toThrow());
it.each([
  { name: 'banner.svg', type: 'image/svg+xml', size: 500 },
  { name: 'banner.html', type: 'text/html', size: 500 },
  { name: 'banner.exe', type: 'image/png', size: 500 },
  { name: 'banner.png', type: 'image/jpeg', size: 500 },
  { name: 'banner.png', type: 'image/png', size: 0 },
  { name: 'banner.png', type: 'image/png', size: 5 * 1024 * 1024 + 1 }
])('rejeita arquivo inseguro ou acima do limite: %j', file => expect(() => validateCreativeHeader(file, png)).toThrow());
it('rejeita HTML renomeado para PNG', () => expect(() => validateCreativeHeader({ name: 'fake.png', type: 'image/png', size: 50 }, [60, 104, 116, 109, 108])).toThrow());
it('limita dimensões e área e avisa proporção sem bloquear', () => {
  expect(() => validateCreativeDimensions(1200, 300)).not.toThrow();
  for (const pair of [[0, 300], [10001, 10], [9000, 9000], [1.5, 300]]) expect(() => validateCreativeDimensions(...pair)).toThrow();
  expect(aspectWarning(1200, 300, 'HOME_TOP')).toBe(false);
  expect(aspectWarning(1200, 300, 'SIDEBAR')).toBe(true);
});
it.each(['cover', 'contain'])('público e prévia usam o mesmo ajuste %s, alt e CTA', imageFit => {
  const view = render(<AdCreative campaign={{ ...campaign, imageFit }} />);
  expect(screen.getByRole('img')).toHaveStyle({ objectFit: imageFit });
  expect(screen.getByRole('img')).toHaveAttribute('alt', 'Banner técnico');
  expect(screen.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer sponsored');
  view.rerender(<AdCreative campaign={{ ...campaign, imageFit }} preview localImageUrl="blob:technical" />);
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:technical');
  expect(screen.getByText('Saiba mais')).toBeInTheDocument();
});
it.each(['javascript:alert(1)', 'http://example.com', 'https://user:pass@example.com', 'https://example.com?token=SECRET', 'https://localhost/image'])('URL insegura não é clicável: %s', value => expect(safeAdUrl(value)).toBeNull());
function Harness() {
  const [draft, setDraft] = useState(campaign);
  return <><select aria-label="Slot" value={draft.position} onChange={e => setDraft({ ...draft, position: e.target.value })}>{Object.keys(creativeSlots).map(slot => <option key={slot}>{slot}</option>)}</select><AdCreativeEditor draft={draft} onChange={setDraft} onLocalSelection={vi.fn()} editing /></>;
}
it('simula Desktop, Tablet e Mobile e todos os slots; link de teste separado', () => {
  const view = render(<Harness />);
  for (const [name, width] of [['Desktop', 1440], ['Tablet', 768], ['Mobile', 390]]) {
    fireEvent.click(screen.getByRole('button', { name }));
    expect(view.container.querySelector('.creative-preview-viewport')).toHaveAttribute('data-width', String(width));
  }
  for (const slot of Object.keys(creativeSlots)) {
    fireEvent.change(screen.getByLabelText('Slot'), { target: { value: slot } });
    expect(view.container.querySelector('.ad-slot-' + slot.toLowerCase())).toBeTruthy();
  }
  expect(screen.getByRole('link', { name: 'Testar link ↗' })).toHaveAttribute('target', '_blank');
});
function mockImages(fail = false) {
  URL.createObjectURL = vi.fn(() => 'blob:technical-' + Math.random());
  URL.revokeObjectURL = vi.fn();
  vi.stubGlobal('Image', class { naturalWidth = 1200; naturalHeight = 300; set src(value) { queueMicrotask(() => fail ? this.onerror() : this.onload()); } });
}
const file = { name: 'technical.png', type: 'image/png', size: 1200, slice: () => ({ arrayBuffer: async () => new Uint8Array(png).buffer }) };
it('preview imediato, dimensões, substituição, remoção e unmount liberam URLs', async () => {
  mockImages();
  const onLocalSelection = vi.fn();
  const view = render(<AdCreativeEditor draft={campaign} onChange={vi.fn()} onLocalSelection={onLocalSelection} />);
  const input = screen.getByLabelText('Selecionar imagem');
  fireEvent.change(input, { target: { files: [file] } });
  await screen.findByText(/technical.png · 1200 × 300 px/);
  const first = screen.getByRole('img').getAttribute('src');
  fireEvent.drop(view.container.querySelector('.creative-drop'), { dataTransfer: { files: [{ ...file, name: 'replacement.png' }] } });
  await screen.findByText(/replacement.png/);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith(first);
  fireEvent.click(screen.getByRole('button', { name: 'Remover imagem local' }));
  expect(screen.queryByText(/replacement.png/)).not.toBeInTheDocument();
  expect(onLocalSelection).toHaveBeenLastCalledWith(false);
  fireEvent.change(input, { target: { files: [file] } });
  await screen.findByText(/technical.png/);
  view.unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(3);
});
it('falha de decode revoga URL e não prepara upload', async () => {
  mockImages(true);
  await expect(prepareCreative(file)).rejects.toThrow('decodificar');
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
});
