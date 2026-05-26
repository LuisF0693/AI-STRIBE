/**
 * NoteGenerationWorker
 * Story 2.3 — AC: 1, 6, 9
 * Consumer BullMQ que gera nota SOAP após transcrição concluída.
 */

import { Worker, Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { QUEUE_NAMES, QUEUE_CONFIG, redisConnection } from '../../api/src/queues/config';
import { soapNoteService } from './soap-note.service';

interface NoteGenerationJobData {
  consulta_id: string;
  transcricao_id: string;
}

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function processNoteJob(job: Job<NoteGenerationJobData>) {
  const { consulta_id, transcricao_id } = job.data;

  // Idempotência: nota já gerada não é reprocessada
  const { data: existing } = await supabaseAdmin
    .from('notas')
    .select('id, status')
    .eq('consulta_id', consulta_id)
    .maybeSingle();

  if (existing?.status === 'draft' || existing?.status === 'reviewed' || existing?.status === 'approved') {
    return;
  }

  // Busca transcrição
  const { data: transcricao } = await supabaseAdmin
    .from('transcricoes')
    .select('texto_completo')
    .eq('id', transcricao_id)
    .single();

  if (!transcricao?.texto_completo) {
    throw new Error('TRANSCRICAO_TEXTO_VAZIO');
  }

  // AC: 1, 2, 3, 4, 5 — gera nota SOAP via GPT-4o
  const result = await soapNoteService.generateNote(transcricao.texto_completo);

  // AC: 6 — salva em `notas` com upsert (idempotência)
  await supabaseAdmin.from('notas').upsert(
    {
      consulta_id,
      transcricao_id,
      soap_json: result.soap_json,
      cids_sugeridos: result.cids_sugeridos,
      baixa_confianca: result.baixa_confianca,
      status: 'draft',
      versao: 1,
    },
    { onConflict: 'consulta_id' },
  );

  // Atualiza status da consulta para completed
  await supabaseAdmin
    .from('consultas')
    .update({ status: 'completed' })
    .eq('id', consulta_id);
}

export const noteGenerationWorker = new Worker<NoteGenerationJobData>(
  QUEUE_NAMES.NOTE_GENERATION,
  processNoteJob,
  {
    connection: redisConnection,
    concurrency: QUEUE_CONFIG.noteGeneration.concurrency,
  },
);

noteGenerationWorker.on('failed', async (job, err) => {
  if (!job) return;
  const { consulta_id } = job.data;

  if (job.attemptsMade >= (job.opts.attempts ?? 2)) {
    await supabaseAdmin
      .from('consultas')
      .update({ status: 'failed' })
      .eq('id', consulta_id);
  }
});
