/**
 * certisign.client tests — Story 3.3
 * AC: 3, 8, 9, 10
 */

import { signPdf, resetCircuitBreaker, getCircuitBreakerState } from '../certisign.client';

// Mock fetch global
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock config para testes
jest.mock('../../../config/app.config', () => ({
  config: {
    certisign: {
      apiKey: 'test-api-key',
      certId: 'test-cert-id',
      baseUrl: 'https://sandbox.certisign.com.br/api/v1',
      timeoutMs: 5000,
    },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  resetCircuitBreaker();
});

describe('signPdf — circuit breaker', () => {
  it('retorna base64 assinado em caso de sucesso — AC: 3', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        signed_document_base64: 'SIGNED_BASE64',
        signature_id: 'sig-1',
        timestamp: '2026-05-26T00:00:00Z',
      }),
    });

    const result = await signPdf('RAW_BASE64');
    expect(result).toBe('SIGNED_BASE64');
    expect(getCircuitBreakerState()).toBe('closed');
  });

  it('retorna null em falha de API e incrementa contador — AC: 9', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const result = await signPdf('RAW_BASE64');
    expect(result).toBeNull();
  });

  it('abre circuit breaker após 3 falhas consecutivas — AC: 8', async () => {
    mockFetch.mockResolvedValue({ ok: false });

    await signPdf('BASE64');
    await signPdf('BASE64');
    await signPdf('BASE64');

    expect(getCircuitBreakerState()).toBe('open');
  });

  it('retorna null imediatamente quando circuit está aberto — AC: 8', async () => {
    mockFetch.mockResolvedValue({ ok: false });

    // Abre o circuit
    await signPdf('B');
    await signPdf('B');
    await signPdf('B');

    // Quarta chamada: circuit aberto, fetch não deve ser chamado
    mockFetch.mockClear();
    const result = await signPdf('B');

    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fecha circuit após sucesso — AC: 9', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    await signPdf('B');
    await signPdf('B');

    // Ainda não abriu (threshold = 3)
    expect(getCircuitBreakerState()).toBe('closed');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ signed_document_base64: 'OK', signature_id: 's', timestamp: 't' }),
    });

    await signPdf('B');
    expect(getCircuitBreakerState()).toBe('closed');
  });

  it('retorna null e não expõe chave em erro de rede — AC: 10', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await signPdf('RAW');
    expect(result).toBeNull();
  });
});
