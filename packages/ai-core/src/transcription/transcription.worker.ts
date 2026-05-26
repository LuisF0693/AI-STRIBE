/**
 * TranscriptionWorker
 * Story 2.2 — AC: 1, 6, 7, 8
 * Consumer BullMQ que processa jobs de transcrição Whisper.
 */

import { Worker, Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { QUEUE_NAMES, QUEUE_CONFIG, redisConnection } from '../../api/src/queues/config';
import { noteGenerationQueue } from '../../api/src/queues/queues';
import { transcriptionService } from './transcription.service';

interface TranscriptionJobData {
  consulta_id: string;
  audio_url: string; // storage path no bucket
}

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function updateStatus(consultaId: string, status: string) {
  await supabaseAdmin.from('consultas').update({ status }).eq('id', consultaId);
}

async function processTranscriptionJob(job: Job<TranscriptionJobData>) {
  const { consulta_id, audio_url } = job.data;

  // Idempotência: se transcrição já existe como 'completed', não reprocessa
  const { data: existing } = await supabaseAdmin
    .from('transcricoes')
    .select('id, status')
    .eq('consulta_id', consulta_id)
    .maybeSingle();

  if (existing?.status === 'completed') return;

  // Upsert em 'processing' — evita duplicatas mesmo se job for repetido
  await supabaseAdmin.from('transcricoes').upsert(
    { consulta_id, status: 'processing' },
    { onConflict: 'consulta_id' },
  );

  await updateStatus(consulta_id, 'transcribing');

  // AC: 2, 3, 4 — Whisper com chunking e timestamps
  const result = await transcriptionService.transcribe(audio_url, consulta_id);

  // AC: 5 — salva resultado completo
  await supabaseAdmin.from('transcricoes').update({
    texto_completo: result.texto_completo,
    segmentos_json: result.segmentos_json,
    duracao_ms: result.duracao_ms,
    custo_usd: result.custo_usd,
    status: 'completed',
  }).eq('consulta_id', consulta_id);

  await updateStatus(consulta_id, 'generating_note');

  // Enfileira geração de nota — idempotente via jobId
  const { data: transcricao } = await supabaseAdmin
    .from('transcricoes')
    .select('id')
    .eq('consulta_id', consulta_id)
    .single();

  await noteGenerationQueue.add(
    'generate-note',
    { consulta_id, transcricao_id: transcricao?.id },
    { jobId: `note-${consulta_id}` },
  );
}

export const transcriptionWorker = new Worker<TranscriptionJobData>(
  QUEUE_NAMES.TRANSCRIPTION,
  processTranscriptionJob,
  {
    connection: redisConnection,
    concurrency: QUEUE_CONFIG.transcription.concurrency,
  },
);

transcriptionWorker.on('failed', async (job, err) => {
  if (!job) return;
  const { consulta_id } = job.data;

  // Após esgotar tentativas, marca como failed
  if (job.attemptsMade >= (job.opts.attempts ?? 3)) {
    await supabaseAdmin.from('transcricoes').update({
      status: 'failed',
      erro_msg: err.message.slice(0, 500),
    }).eq('consulta_id', consulta_id);

    await updateStatus(consulta_id, 'failed');
  }
});
