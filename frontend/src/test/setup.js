import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
beforeEach(() => {
  window.history.replaceState({}, '', '/');
  localStorage.clear();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
HTMLDialogElement.prototype.showModal = function () { this.open = true; this.querySelector('button')?.focus(); };
HTMLDialogElement.prototype.close = function () { this.open = false; };
