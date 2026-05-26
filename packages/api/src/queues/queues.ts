import { Queue, QueueEvents } from 'bullmq';
import { QUEUE_NAMES, QUEUE_CONFIG, redisConnection } from './config';

// Queues (producers)
export const audioUploadQueue = new Queue(QUEUE_NAMES.AUDIO_UPLOAD, {
  connection: redisConnection,
  defaultJobOptions: QUEUE_CONFIG.audioUpload.defaultJobOptions,
});

export const transcriptionQueue = new Queue(QUEUE_NAMES.TRANSCRIPTION, {
  connection: redisConnection,
  defaultJobOptions: QUEUE_CONFIG.transcription.defaultJobOptions,
});

export const noteGenerationQueue = new Queue(QUEUE_NAMES.NOTE_GENERATION, {
  connection: redisConnection,
  defaultJobOptions: QUEUE_CONFIG.noteGeneration.defaultJobOptions,
});

// QueueEvents para monitoramento
export const transcriptionEvents = new QueueEvents(QUEUE_NAMES.TRANSCRIPTION, {
  connection: redisConnection,
});

export const noteEvents = new QueueEvents(QUEUE_NAMES.NOTE_GENERATION, {
  connection: redisConnection,
});

export const allQueues = [audioUploadQueue, transcriptionQueue, noteGenerationQueue];

/** Métricas agregadas para health check e Prometheus. */
export async function getQueueMetrics() {
  const [audioStats, transcriptionStats, noteStats] = await Promise.all([
    audioUploadQueue.getJobCounts('waiting', 'active', 'completed', 'failed'),
    transcriptionQueue.getJobCounts('waiting', 'active', 'completed', 'failed'),
    noteGenerationQueue.getJobCounts('waiting', 'active', 'completed', 'failed'),
  ]);

  return {
    [QUEUE_NAMES.AUDIO_UPLOAD]: audioStats,
    [QUEUE_NAMES.TRANSCRIPTION]: transcriptionStats,
    [QUEUE_NAMES.NOTE_GENERATION]: noteStats,
  };
}

/** Formato Prometheus para GET /metrics. */
export async function getPrometheusMetrics(): Promise<string> {
  const metrics = await getQueueMetrics();
  const lines: string[] = [
    '# HELP bullmq_jobs_waiting Jobs aguardando processamento',
    '# TYPE bullmq_jobs_waiting gauge',
    '# HELP bullmq_jobs_active Jobs sendo processados agora',
    '# TYPE bullmq_jobs_active gauge',
    '# HELP bullmq_jobs_completed Jobs concluídos com sucesso',
    '# TYPE bullmq_jobs_completed counter',
    '# HELP bullmq_jobs_failed Jobs que falharam',
    '# TYPE bullmq_jobs_failed counter',
  ];

  for (const [queue, counts] of Object.entries(metrics)) {
    const label = `queue="${queue}"`;
    lines.push(`bullmq_jobs_waiting{${label}} ${counts.waiting ?? 0}`);
    lines.push(`bullmq_jobs_active{${label}} ${counts.active ?? 0}`);
    lines.push(`bullmq_jobs_completed{${label}} ${counts.completed ?? 0}`);
    lines.push(`bullmq_jobs_failed{${label}} ${counts.failed ?? 0}`);
  }

  return lines.join('\n') + '\n';
}
