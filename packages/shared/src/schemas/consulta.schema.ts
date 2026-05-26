/**
 * Zod schemas compartilhados — Consulta
 * Usados tanto no backend (Fastify) quanto no mobile para validação
 */
import { z } from 'zod';

export const consultaStatusSchema = z.enum([
  'recording',
  'uploading',
  'queued',
  'transcribing',
  'generating_note',
  'completed',
  'failed',
]);

export const createConsultaSchema = z.object({
  medico_id:        z.string().uuid(),
  paciente_id:      z.string().uuid().optional(),
  timestamp_inicio: z.string().datetime(),
});

export const updateConsultaSchema = z.object({
  duracao_ms:    z.number().int().positive().optional(),
  timestamp_fim: z.string().datetime().optional(),
  audio_url:     z.string().url().optional(),
  status:        consultaStatusSchema.optional(),
});

export const uploadUrlRequestSchema = z.object({
  consulta_id: z.string().uuid(),
  file_size:   z.number().int().positive().max(52_428_800), // 50MB máx
  mime_type:   z.enum(['audio/opus', 'audio/mp4', 'audio/mpeg']),
});
