/**
 * Tipos compartilhados — Consulta
 * Importar de: @aiscribe/shared/types
 * Story: 2.1 Audio Recording Service
 */

export type ConsultaStatus =
  | 'recording'
  | 'uploading'
  | 'queued'
  | 'transcribing'
  | 'generating_note'
  | 'completed'
  | 'failed';

export interface Consulta {
  id: string;
  medico_id: string;
  paciente_id: string | null;
  duracao_ms: number | null;
  timestamp_inicio: string;
  timestamp_fim: string | null;
  audio_url: string | null;
  status: ConsultaStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateConsultaPayload {
  medico_id: string;
  paciente_id?: string;
  timestamp_inicio: string;
}

export interface UpdateConsultaPayload {
  duracao_ms?: number;
  timestamp_fim?: string;
  audio_url?: string;
  status?: ConsultaStatus;
}

/** Transições de status válidas — state machine */
export const CONSULTA_STATUS_TRANSITIONS: Record<ConsultaStatus, ConsultaStatus[]> = {
  recording:       ['uploading', 'failed'],
  uploading:       ['queued', 'failed'],
  queued:          ['transcribing', 'failed'],
  transcribing:    ['generating_note', 'failed'],
  generating_note: ['completed', 'failed'],
  completed:       [],
  failed:          ['queued'], // permite re-enfileirar manualmente
};

export function isValidTransition(from: ConsultaStatus, to: ConsultaStatus): boolean {
  return CONSULTA_STATUS_TRANSITIONS[from].includes(to);
}
