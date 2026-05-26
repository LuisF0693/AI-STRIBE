/**
 * nota.service.ts
 * Story 3.2 — AC: 1, 2, 3, 4, 6, 7
 * State machine de status + lógica de aprovação com idempotência
 */

import { supabase } from '../config/supabase';
import type { Nota, NotaStatus, SoapJson, CidSugestao } from '@aiscribe/shared';

// Transições permitidas no MVP
const VALID_TRANSITIONS: Partial<Record<NotaStatus, NotaStatus[]>> = {
  draft: ['approved'],
  reviewed: ['approved'],
};

class ApiError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

// AC: 6 — state machine; transições inválidas lançam erro
export function validateStatusTransition(from: NotaStatus, to: NotaStatus): void {
  const allowed = VALID_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new ApiError(
      'INVALID_STATUS_TRANSITION',
      400,
      `Transição inválida: ${from} → ${to}`,
    );
  }
}

// AC: 1 — persiste rascunho editado; não altera status
// O trigger notas_versioning cria snapshot automático em notas_versoes
export async function saveNotaDraft(
  notaId: string,
  soapJson: SoapJson,
  cids: CidSugestao[],
): Promise<Nota> {
  const { data, error } = await supabase
    .from('notas')
    .update({ soap_json: soapJson, cids_sugeridos: cids })
    .eq('id', notaId)
    .select()
    .single();

  if (error) throw new ApiError('QUERY_FAILED', 500, error.message);
  if (!data) throw new ApiError('NOTA_NOT_FOUND', 404, 'Nota não encontrada');
  return data as Nota;
}

// AC: 2, 3, 4 — aprovação com idempotência e snapshot final
export async function aprovarNota(notaId: string, medicoId: string): Promise<Nota> {
  const { data: nota, error: fetchError } = await supabase
    .from('notas')
    .select('id, consulta_id, soap_json, cids_sugeridos, status, versao')
    .eq('id', notaId)
    .single();

  if (fetchError || !nota) {
    throw new ApiError('NOTA_NOT_FOUND', 404, 'Nota não encontrada');
  }

  // AC: 4 — idempotência: nota já aprovada retorna estado atual
  if (nota.status === 'approved') {
    const { data: current } = await supabase
      .from('notas')
      .select('*')
      .eq('id', notaId)
      .single();
    return current as Nota;
  }

  // AC: 6 — valida transição antes de UPDATE
  validateStatusTransition(nota.status as NotaStatus, 'approved');

  const approvedAt = new Date().toISOString();

  // AC: 2 — atualiza status, approved_by e approved_at
  const { data: updated, error: updateError } = await supabase
    .from('notas')
    .update({
      status: 'approved',
      approved_by: medicoId,
      approved_at: approvedAt,
    })
    .eq('id', notaId)
    .select()
    .single();

  if (updateError || !updated) {
    throw new ApiError('QUERY_FAILED', 500, updateError?.message ?? 'Falha ao aprovar nota');
  }

  // AC: 3 — snapshot imutável do estado final aprovado
  // Inserção manual pois o trigger só dispara em UPDATE de soap_json/texto_editado
  await supabase.from('notas_versoes').insert({
    nota_id: notaId,
    soap_json: nota.soap_json,
    versao: nota.versao,
    editado_por: medicoId,
  });

  // AC: 7 — Realtime: evento 'nota:approved' via Postgres changes (automático pela subscription)
  // O UPDATE acima já dispara o canal 'consulta:{consulta_id}' nos clientes inscritos

  return updated as Nota;
}

export { ApiError };
