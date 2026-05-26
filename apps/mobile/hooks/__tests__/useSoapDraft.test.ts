/**
 * useSoapDraft tests
 * Story 3.1 — AC: 3, 8
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSoapDraft } from '../useSoapDraft';
import type { SoapJson, CidSugestao } from '@aiscribe/shared';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const NOTA_ID = 'nota-test-123';
const STORAGE_KEY = `soap_draft_${NOTA_ID}`;

const initialSoap: SoapJson = {
  subjetivo: 'Queixa inicial',
  objetivo: 'Exame normal',
  avaliacao: 'Diagnóstico A',
  plano: 'Conduta padrão',
};

const initialCids: CidSugestao[] = [
  { codigo: 'J00', descricao: 'Rinofaringite', confianca: 0.9 },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockAsyncStorage.getItem.mockResolvedValue(null);
  mockAsyncStorage.setItem.mockResolvedValue(undefined);
  mockAsyncStorage.removeItem.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useSoapDraft', () => {
  it('inicializa com os valores passados por prop', () => {
    const { result } = renderHook(() =>
      useSoapDraft(NOTA_ID, initialSoap, initialCids),
    );

    expect(result.current.soap).toEqual(initialSoap);
    expect(result.current.cids).toEqual(initialCids);
    expect(result.current.editedFields.size).toBe(0);
  });

  it('carrega rascunho do AsyncStorage ao montar — AC: 8', async () => {
    const savedDraft = {
      soap: { ...initialSoap, subjetivo: 'Texto editado offline' },
      cids: [],
      editedFields: ['subjetivo'],
    };
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(savedDraft));

    const { result } = renderHook(() =>
      useSoapDraft(NOTA_ID, initialSoap, initialCids),
    );

    await waitFor(() => {
      expect(result.current.soap.subjetivo).toBe('Texto editado offline');
    });
    expect(result.current.editedFields.has('subjetivo')).toBe(true);
    expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it('updateSoapField atualiza soap e marca campo como editado', () => {
    const { result } = renderHook(() =>
      useSoapDraft(NOTA_ID, initialSoap, initialCids),
    );

    act(() => {
      result.current.updateSoapField('subjetivo', 'Novo subjetivo');
    });

    expect(result.current.soap.subjetivo).toBe('Novo subjetivo');
    expect(result.current.editedFields.has('subjetivo')).toBe(true);
  });

  it('auto-save dispara após 5s de debounce — AC: 3', async () => {
    const { result } = renderHook(() =>
      useSoapDraft(NOTA_ID, initialSoap, initialCids),
    );

    act(() => {
      result.current.updateSoapField('plano', 'Novo plano terapêutico');
    });

    expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.stringContaining('Novo plano terapêutico'),
      );
    });
  });

  it('removeCid remove o CID da lista', () => {
    const { result } = renderHook(() =>
      useSoapDraft(NOTA_ID, initialSoap, initialCids),
    );

    act(() => {
      result.current.removeCid('J00');
    });

    expect(result.current.cids).toHaveLength(0);
  });

  it('clearDraft remove do AsyncStorage', async () => {
    const { result } = renderHook(() =>
      useSoapDraft(NOTA_ID, initialSoap, initialCids),
    );

    act(() => {
      result.current.clearDraft();
    });

    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it('não salva no AsyncStorage se notaId for null', () => {
    const { result } = renderHook(() =>
      useSoapDraft(null, initialSoap, initialCids),
    );

    act(() => {
      result.current.updateSoapField('objetivo', 'Mudança sem ID');
      jest.advanceTimersByTime(5000);
    });

    expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
