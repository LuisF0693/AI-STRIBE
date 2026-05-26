/**
 * Certisign Client — ICP-Brasil digital signature
 * Story 3.3 — AC: 3, 8, 9, 10
 * Circuit breaker manual: 3 falhas → circuito aberto → fallback PDF sem assinatura
 * Secrets via config object — nunca process.env direto (AC: 10)
 */

import { config } from '../../config/app.config';

interface SignResponse {
  signed_document_base64: string;
  signature_id: string;
  timestamp: string;
}

// Circuit breaker state (singleton por processo — adequado para worker único)
let cbFailures = 0;
let cbLastFailureTime = 0;
let cbState: 'closed' | 'open' | 'half-open' = 'closed';

const CB_THRESHOLD = 3;       // AC: 8 — abre após 3 falhas
const CB_RESET_MS = 30_000;   // 30s antes de tentar fechar

function circuitIsOpen(): boolean {
  if (cbState === 'open') {
    if (Date.now() - cbLastFailureTime > CB_RESET_MS) {
      cbState = 'half-open';
      return false;
    }
    return true;
  }
  return false;
}

function onCbSuccess(): void {
  cbFailures = 0;
  cbState = 'closed';
}

function onCbFailure(): void {
  cbFailures++;
  cbLastFailureTime = Date.now();
  if (cbFailures >= CB_THRESHOLD) {
    cbState = 'open';
  }
}

// Para testes — permite resetar estado do circuit breaker
export function resetCircuitBreaker(): void {
  cbFailures = 0;
  cbLastFailureTime = 0;
  cbState = 'closed';
}

export function getCircuitBreakerState(): 'closed' | 'open' | 'half-open' {
  return cbState;
}

// AC: 3, 8 — assina PDF via Certisign; retorna null se circuit aberto (fallback)
export async function signPdf(pdfBase64: string): Promise<string | null> {
  if (circuitIsOpen()) {
    return null;
  }

  const { apiKey, certId, baseUrl, timeoutMs } = config.certisign;

  if (!apiKey || !certId) {
    onCbFailure();
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/sign`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        // AC: 10 — chave via config, nunca exposta em logs
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        document_base64: pdfBase64,
        certificate_id: certId,
        signature_type: 'ICP_BRASIL',
      }),
    });

    if (!response.ok) {
      onCbFailure();
      return null;
    }

    const data = (await response.json()) as SignResponse;
    onCbSuccess();
    return data.signed_document_base64;
  } catch {
    onCbFailure();
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
