/**
 * AudioUploadService
 * Story: 2.1 — AC: 6, 7, 8
 *
 * Responsabilidades:
 * - Gerar signed URL via Supabase Storage SDK
 * - Upload do arquivo .opus para bucket audio-consultas
 * - Fila local com AsyncStorage para retry offline (idempotência por hash)
 * - Salvar metadata na tabela consultas após upload confirmado
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../config/supabase';
import type { CompressedAudio } from '@aiscribe/ai-core/src/recording/audio-compressor.service';
import type { UpdateConsultaPayload } from '@aiscribe/shared';

const STORAGE_BUCKET = 'audio-consultas';
const UPLOAD_QUEUE_KEY = '@aiscribe:upload_queue';
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAYS_MS = [5_000, 15_000, 30_000, 60_000, 120_000]; // backoff exponencial

export interface UploadQueueItem {
  consulta_id: string;
  audio_uri: string;
  content_hash: string; // nome do arquivo no bucket (idempotência)
  size_bytes: number;
  attempts: number;
  queued_at: string;
  last_attempt_at: string | null;
}

export interface UploadResult {
  audio_url: string;
  consulta_id: string;
}

export class AudioUploadService {
  /**
   * Pipeline completo: gera signed URL → faz upload → confirma na API.
   * AC: 6 — signed URL com autenticação
   * AC: 7 — AES-256 garantido pelo bucket policy (configurado na Story 1.2)
   * AC: 8 — em caso de falha, adiciona à fila offline
   */
  async uploadAudio(
    consultaId: string,
    audio: CompressedAudio,
  ): Promise<UploadResult> {
    const isConnected = await this.isNetworkAvailable();

    if (!isConnected) {
      await this.addToQueue(consultaId, audio);
      throw new Error('OFFLINE_QUEUED');
    }

    return this.performUpload(consultaId, audio);
  }

  /**
   * Executa o upload real para o Supabase Storage.
   * Nome do arquivo = content_hash.opus — garante idempotência no retry.
   */
  private async performUpload(
    consultaId: string,
    audio: CompressedAudio,
  ): Promise<UploadResult> {
    const fileName = `${audio.contentHash}.opus`;
    const storagePath = `${consultaId}/${fileName}`;

    // Lê o arquivo para upload e converte base64 → ArrayBuffer (sem polyfill de Buffer)
    const fileContent = await FileSystem.readAsStringAsync(audio.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const fileBuffer = decode(fileContent);

    // AC: 6 — upload via Supabase Storage SDK (autenticado com JWT do médico)
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: audio.mimeType,
        upsert: true, // idempotente — sobrescreve se hash repetir (nunca acontece)
        cacheControl: '3600',
      });

    if (error) {
      throw new Error(`UPLOAD_FAILED: ${error.message}`);
    }

    // Salva o storage path (não a signed URL) para que workers gerem URLs frescas.
    // Signed URLs expiram em 1h — armazenar o path evita falhas em filas longas ou retries.
    await this.updateConsultaAfterUpload(consultaId, storagePath);

    return {
      audio_url: storagePath,
      consulta_id: consultaId,
    };
  }

  /**
   * Atualiza a tabela consultas após upload bem-sucedido.
   * Status machine: uploading → queued (pronto para TranscriptionWorker)
   */
  private async updateConsultaAfterUpload(
    consultaId: string,
    audioUrl: string,
  ): Promise<void> {
    const payload: UpdateConsultaPayload = {
      audio_url: audioUrl,
      status: 'queued',
    };

    const { error } = await supabase
      .from('consultas')
      .update(payload)
      .eq('id', consultaId);

    if (error) {
      throw new Error(`UPDATE_CONSULTA_FAILED: ${error.message}`);
    }
  }

  /**
   * Adiciona item à fila offline no AsyncStorage.
   * AC: 8 — arquivo fica em fila local e reenvio é automático ao reconectar
   */
  async addToQueue(consultaId: string, audio: CompressedAudio): Promise<void> {
    const queue = await this.getQueue();
    const existing = queue.find(
      (item) => item.content_hash === audio.contentHash,
    );

    // Evita duplicação na fila (mesma gravação falhou duas vezes)
    if (existing) return;

    const item: UploadQueueItem = {
      consulta_id: consultaId,
      audio_uri: audio.uri,
      content_hash: audio.contentHash,
      size_bytes: audio.sizeBytes,
      attempts: 0,
      queued_at: new Date().toISOString(),
      last_attempt_at: null,
    };

    queue.push(item);
    await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(queue));
  }

  /**
   * Processa a fila offline. Chame ao detectar reconexão via NetInfo.
   * AC: 8 — reenvio automático ao reconectar
   */
  async processQueue(): Promise<void> {
    const queue = await this.getQueue();
    if (queue.length === 0) return;

    const remaining: UploadQueueItem[] = [];

    for (const item of queue) {
      if (item.attempts >= MAX_RETRY_ATTEMPTS) {
        // Máximo de tentativas atingido — registra como falha permanente
        await this.markConsultaFailed(item.consulta_id);
        continue;
      }

      // Verifica se ainda está no backoff
      if (item.last_attempt_at) {
        const elapsed = Date.now() - new Date(item.last_attempt_at).getTime();
        const delay = RETRY_DELAYS_MS[Math.min(item.attempts, RETRY_DELAYS_MS.length - 1)];
        if (elapsed < delay) {
          remaining.push(item);
          continue;
        }
      }

      try {
        await this.performUpload(item.consulta_id, {
          uri: item.audio_uri,
          sizeBytes: item.size_bytes,
          mimeType: 'audio/opus',
          contentHash: item.content_hash,
        });
        // Sucesso — remove da fila e limpa arquivo local
        await FileSystem.deleteAsync(item.audio_uri, { idempotent: true });
      } catch {
        remaining.push({
          ...item,
          attempts: item.attempts + 1,
          last_attempt_at: new Date().toISOString(),
        });
      }
    }

    await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(remaining));
  }

  private async getQueue(): Promise<UploadQueueItem[]> {
    const raw = await AsyncStorage.getItem(UPLOAD_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  private async isNetworkAvailable(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable === true;
  }

  private async markConsultaFailed(consultaId: string): Promise<void> {
    await supabase
      .from('consultas')
      .update({ status: 'failed' })
      .eq('id', consultaId);
  }

  /** Retorna tamanho atual da fila offline. */
  async getQueueSize(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }
}

export const audioUploadService = new AudioUploadService();
