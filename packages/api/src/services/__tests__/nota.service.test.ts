/**
 * nota.service tests — Story 3.2
 * AC: 1, 2, 3, 4, 6, 10
 */

import { validateStatusTransition, saveNotaDraft, aprovarNota } from '../nota.service';
import { supabase } from '../../config/supabase';
import type { SoapJson, CidSugestao } from '@aiscribe/shared';

jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

const mockSoap: SoapJson = {
  subjetivo: 'Cefaleia há 2 dias',
  objetivo: 'PA 120/80',
  avaliacao: 'Cefaleia tensional',
  plano: 'Dipirona 500mg 8/8h',
};

const mockCids: CidSugestao[] = [
  { codigo: 'G44', descricao: 'Cefaleia tensional', confianca: 0.9 },
];

beforeEach(() => jest.clearAllMocks());

describe('validateStatusTransition', () => {
  it('permite draft → approved', () => {
    expect(() => validateStatusTransition('draft', 'approved')).not.toThrow();
  });

  it('permite reviewed → approved', () => {
    expect(() => validateStatusTransition('reviewed', 'approved')).not.toThrow();
  });

  it('bloqueia approved → draft (INVALID_STATUS_TRANSITION) — AC: 6', () => {
    expect(() => validateStatusTransition('approved', 'draft')).toThrow(
      expect.objectContaining({ code: 'INVALID_STATUS_TRANSITION' }),
    );
  });

  it('bloqueia exported → approved', () => {
    expect(() => validateStatusTransition('exported', 'approved')).toThrow(
      expect.objectContaining({ code: 'INVALID_STATUS_TRANSITION' }),
    );
  });
});

describe('saveNotaDraft', () => {
  it('persiste soap_json e cids_sugeridos sem alterar status — AC: 1', async () => {
    const mockNota = { id: 'nota-1', soap_json: mockSoap, status: 'draft' };
    (mockSupabase.from as jest.Mock).mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockNota, error: null }),
    });

    const result = await saveNotaDraft('nota-1', mockSoap, mockCids);
    expect(result.status).toBe('draft');
    expect(result.soap_json).toEqual(mockSoap);
  });

  it('lança NOTA_NOT_FOUND quando nota não existe', async () => {
    (mockSupabase.from as jest.Mock).mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    await expect(saveNotaDraft('inexistente', mockSoap, [])).rejects.toMatchObject({
      code: 'NOTA_NOT_FOUND',
    });
  });
});

describe('aprovarNota', () => {
  it('aprova nota draft corretamente — AC: 2', async () => {
    const notaDraft = { id: 'nota-1', consulta_id: 'c-1', soap_json: mockSoap, status: 'draft', versao: 1 };
    const notaAprovada = { ...notaDraft, status: 'approved', approved_by: 'medico-1', approved_at: '2026-05-26T00:00:00Z' };

    let callCount = 0;
    (mockSupabase.from as jest.Mock).mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return { data: notaDraft, error: null };
        return { data: notaAprovada, error: null };
      }),
    }));

    const result = await aprovarNota('nota-1', 'medico-1');
    expect(result.status).toBe('approved');
    expect(result.approved_by).toBe('medico-1');
  });

  it('idempotência: nota já aprovada retorna estado atual sem re-processar — AC: 4', async () => {
    const notaAprovada = {
      id: 'nota-1',
      consulta_id: 'c-1',
      soap_json: mockSoap,
      status: 'approved',
      approved_by: 'medico-1',
      approved_at: '2026-05-26T00:00:00Z',
      versao: 2,
    };

    const updateMock = jest.fn().mockReturnThis();
    const insertMock = jest.fn().mockReturnThis();

    (mockSupabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      update: updateMock,
      insert: insertMock,
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: notaAprovada, error: null }),
    });

    const result = await aprovarNota('nota-1', 'medico-2');
    expect(result.status).toBe('approved');
    expect(updateMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('lança NOTA_NOT_FOUND quando nota não existe — AC: 10', async () => {
    (mockSupabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    });

    await expect(aprovarNota('inexistente', 'medico-1')).rejects.toMatchObject({
      code: 'NOTA_NOT_FOUND',
    });
  });

  it('lança INVALID_STATUS_TRANSITION para nota exported — AC: 6', async () => {
    const notaExportada = { id: 'nota-1', consulta_id: 'c-1', soap_json: mockSoap, status: 'exported', versao: 3 };

    (mockSupabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: notaExportada, error: null }),
    });

    await expect(aprovarNota('nota-1', 'medico-1')).rejects.toMatchObject({
      code: 'INVALID_STATUS_TRANSITION',
    });
  });
});
