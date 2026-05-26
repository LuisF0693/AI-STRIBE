/**
 * PdfGenerationWorker
 * Story 3.3 — AC: 1, 2, 4, 5, 8, 9
 * Consome fila 'pdf-generation', gera PDF assinado e atualiza notas.pdf_status
 */

import { Worker, Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { QUEUE_NAMES, QUEUE_CONFIG, redisConnection } from '../../api/src/queues/config';
import { generateAndStorePdf, PdfJobData } from '../../api/src/services/pdf.service';
import { getCircuitBreakerState } from '../../api/src/integrations/certisign/certisign.client';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function processPdfJob(job: Job<PdfJobData>) {
  const { nota_id, consulta_id } = job.data;

  // Idempotência: PDF já gerado não é reprocessado
  const { data: nota } = await supabaseAdmin
    .from('notas')
    .select('pdf_status, pdf_url')
    .eq('id', nota_id)
    .single();

  if (nota?.pdf_status === 'ready' || nota?.pdf_status === 'ready_unsigned') {
    return;
  }

  // Marca como 'processing' antes de iniciar
  await supabaseAdmin
    .from('notas')
    .update({ pdf_status: 'processing' })
    .eq('id', nota_id);

  const result = await generateAndStorePdf(job.data);

  // AC: 5 — atualiza pdf_status, pdf_url e pdf_signed
  // AC: 8 — se circuit aberto, pdf_signed=false e status='ready_unsigned'
  const pdfStatus = result.pdfSigned ? 'ready' : 'ready_unsigned';

  await supabaseAdmin
    .from('notas')
    .update({
      pdf_status: pdfStatus,
      pdf_url: result.pdfUrl,
      pdf_signed: result.pdfSigned,
    })
    .eq('id', nota_id);
}

export const pdfGenerationWorker = new Worker<PdfJobData>(
  QUEUE_NAMES.PDF_GENERATION,
  processPdfJob,
  {
    connection: redisConnection,
    concurrency: QUEUE_CONFIG.pdfGeneration.concurrency,
  },
);

pdfGenerationWorker.on('failed', async (job, err) => {
  if (!job) return;

  const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 3);
  if (!isLastAttempt) return;

  // Todas tentativas esgotadas — marca como falhou
  await supabaseAdmin
    .from('notas')
    .update({ pdf_status: 'failed' })
    .eq('id', job.data.nota_id);

  // AC: 8 — se circuit aberto após falhas, nota: 'ready_unsigned' já tratado no job
  // Se chegou aqui é falha de infra (storage, conexão), não Certisign
  const cbState = getCircuitBreakerState();
  if (cbState === 'open') {
    // Push notification seria enviada aqui (canal Realtime ou FCM — Epic 4)
    console.warn(`[PdfWorker] Circuit breaker aberto — PDF ${job.data.nota_id} sem assinatura`);
  }
});
