/**
 * nota.store.ts
 * Story 3.2 — AC: 8
 * Zustand store para status da nota ativa
 */

import { create } from 'zustand';
import type { NotaStatus } from '@aiscribe/shared';

interface NotaStore {
  notaId: string | null;
  status: NotaStatus | null;
  setNota: (id: string, status: NotaStatus) => void;
  updateStatus: (status: NotaStatus) => void;
  reset: () => void;
}

export const useNotaStore = create<NotaStore>((set) => ({
  notaId: null,
  status: null,
  setNota: (id, status) => set({ notaId: id, status }),
  updateStatus: (status) => set({ status }),
  reset: () => set({ notaId: null, status: null }),
}));
