/**
 * nota.service.ts — Mobile API client
 * Story 3.2 — AC: 1, 2, 8
 * Cliente para endpoints de nota: salvar rascunho e aprovar
 */

import type { Nota, SoapJson, CidSugestao } from '@aiscribe/shared';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiFetch<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const json = await response.json();

  if (!response.ok) {
    throw Object.assign(new Error(json?.error?.message ?? 'Erro desconhecido'), {
      code: json?.error?.code ?? 'UNKNOWN',
      status: response.status,
    });
  }

  return json as T;
}

// AC: 1 — persiste rascunho sem alterar status
export async function salvarRascunho(
  notaId: string,
  soapJson: SoapJson,
  cids: CidSugestao[],
): Promise<Nota> {
  return apiFetch<Nota>(`/api/v1/notas/${notaId}`, {
    method: 'PATCH',
    body: JSON.stringify({ soap_json: soapJson, cids_sugeridos: cids }),
  });
}

// AC: 2, 8 — aprova nota e aguarda confirmação do servidor
export async function aprovar(notaId: string, medicoId: string): Promise<Nota> {
  return apiFetch<Nota>(`/api/v1/notas/${notaId}/aprovar`, {
    method: 'POST',
    body: JSON.stringify({ medico_id: medicoId }),
  });
}
