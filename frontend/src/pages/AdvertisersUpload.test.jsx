import { it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ advertisingRequest: vi.fn(), uploadCreative: vi.fn(), file: { name: 'logo.png' } }));
vi.mock('../services/adminAuth', () => ({ advertisingRequest: mocks.advertisingRequest }));
vi.mock('../services/creativeUpload', () => ({ uploadCreative: mocks.uploadCreative }));
vi.mock('../components/AdCreativeEditor', () => ({ AdCreativeEditor: ({ onLocalSelection, onFileSelection }) => <button type="button" onClick={() => { onLocalSelection(true); onFileSelection(mocks.file); }}>Selecionar fixture</button> }));
import { Advertisers } from './Advertisers';
beforeEach(() => { vi.clearAllMocks(); mocks.advertisingRequest.mockResolvedValue({ campaigns: [] }); mocks.uploadCreative.mockResolvedValue('https://example.com/saved.png'); });
async function fill() {
  render(<Advertisers user={{ uid: 'superadmin-fixture' }} />);
  await screen.findByText('Nenhuma campanha cadastrada.');
  fireEvent.click(screen.getByRole('button', { name: 'Nova campanha' }));
  for (const [label, value] of [['Anunciante','ACS'],['Campanha','Banner'],['URL de destino','https://example.com/'],['Texto alternativo','Logo ACS']]) fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
  fireEvent.click(screen.getByText('Selecionar fixture'));
}
it('salva somente após upload com URL retornada, sem arquivo/base64 no payload', async () => {
  await fill(); fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
  await screen.findByText('Campanhas salvas.');
  expect(mocks.uploadCreative).toHaveBeenCalledTimes(1);
  expect(mocks.advertisingRequest.mock.calls[1][1].campaigns[0].imageUrl).toBe('https://example.com/saved.png');
  expect(JSON.stringify(mocks.advertisingRequest.mock.calls[1][1])).not.toMatch(/base64|logo.png/);
});
it('falha upload preserva rascunho e não escreve campanha', async () => {
  mocks.uploadCreative.mockRejectedValueOnce(Error('Upload indisponível'));
  await fill(); fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
  await screen.findByText('Upload indisponível');
  expect(mocks.advertisingRequest).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Campanha', { exact: true })).toHaveValue('Banner');
});
it('falha ao salvar permite nova tentativa sem segundo upload', async () => {
  await fill(); mocks.advertisingRequest.mockRejectedValueOnce(Error('save failed'));
  fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
  await screen.findByText(/Não foi possível salvar/);
  fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
  await screen.findByText('Campanhas salvas.');
  expect(mocks.uploadCreative).toHaveBeenCalledTimes(1);
});
it('publicação exige confirmação e não escreve antes de confirmar', async () => {
  await fill();fireEvent.submit(screen.getByRole('button',{name:'Publicar campanha'}).closest('form'));
  expect(mocks.advertisingRequest).toHaveBeenCalledTimes(1);expect(mocks.uploadCreative).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Confirmar'}));await screen.findByText('Campanhas salvas.');
  expect(mocks.advertisingRequest.mock.calls[1][1].campaigns[0]).toMatchObject({active:true,publicationState:'published'});
  expect(mocks.advertisingRequest.mock.calls[1][1].advertisers[0].name).toBe('ACS');
});
it('rascunho pode ser salvo sem criativo e nunca fica ativo', async () => {
  render(<Advertisers user={{uid:'superadmin-fixture'}}/>);await screen.findByText('Nenhuma campanha cadastrada.');fireEvent.click(screen.getByRole('button',{name:'Nova campanha'}));
  fireEvent.change(screen.getByLabelText('Anunciante',{exact:true}),{target:{value:'ACS'}});fireEvent.change(screen.getByLabelText('Campanha',{exact:true}),{target:{value:'Rascunho'}});
  fireEvent.click(screen.getByRole('button',{name:'Salvar rascunho'}));await screen.findByText('Campanhas salvas.');expect(mocks.uploadCreative).not.toHaveBeenCalled();
  expect(mocks.advertisingRequest.mock.calls[1][1].campaigns[0]).toMatchObject({active:false,publicationState:'draft',imageUrl:''});
});
