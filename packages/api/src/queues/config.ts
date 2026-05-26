import { ConnectionOptions } from 'bullmq';

export const redisConnection: ConnectionOptions = {
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
};

export const QUEUE_NAMES = {
  AUDIO_UPLOAD: 'audio-upload',
  TRANSCRIPTION: 'transcription',
  NOTE_GENERATION: 'note-generation',
  PDF_GENERATION: 'pdf-generation',
} as const;

export const QUEUE_CONFIG = {
  audioUpload: {
    concurrency: 10,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential' as const, delay: 5_000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: false, // mantém na DLQ
    },
  },
  transcription: {
    concurrency: 5,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential' as const, delay: 10_000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: false,
    },
  },
  noteGeneration: {
    concurrency: 10,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential' as const, delay: 5_000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: false,
    },
  },
  pdfGeneration: {
    concurrency: 3,
    defaultJobOptions: {
      // AC: 9 — 3 tentativas com backoff exponencial: 30s, 2min, 10min
      attempts: 3,
      backoff: { type: 'exponential' as const, delay: 30_000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: false,
    },
  },
} as const;

export const JOB_TTL_MS = 24 * 60 * 60 * 1000; // 24h
export const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 30_000; // 30s
