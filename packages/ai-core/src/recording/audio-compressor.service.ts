/**
 * AudioCompressorService
 * Story: 2.1 — Resolver limite 50MB Supabase Storage
 *
 * Converte .m4a → .opus 16kHz mono antes do upload.
 * Arquivo de 90min em Opus ≈ 18MB (vs ~90MB em .m4a bruto).
 */

import * as FileSystem from 'expo-file-system';
import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native';
import * as Crypto from 'expo-crypto';

export interface CompressedAudio {
  uri: string;
  sizeBytes: number;
  mimeType: 'audio/opus';
  /** SHA-256 do conteúdo — usado como nome do arquivo no bucket (idempotência) */
  contentHash: string;
}

export class AudioCompressorService {
  /**
   * Comprime arquivo de áudio .m4a para .opus 16kHz mono.
   * AC: Resolve limite 50MB — 90min em Opus ≈ 18MB.
   */
  async compress(inputUri: string): Promise<CompressedAudio> {
    const outputUri = inputUri.replace(/\.[^.]+$/, '_compressed.opus');

    // FFmpeg: converte para Opus 16kHz mono 32kbps
    const command = [
      '-i', inputUri,
      '-c:a', 'libopus',
      '-b:a', '32k',
      '-ar', '16000',
      '-ac', '1',
      '-vbr', 'on',
      '-compression_level', '10',
      '-y', // sobrescreve se existir
      outputUri,
    ].join(' ');

    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (!ReturnCode.isSuccess(returnCode)) {
      const logs = await session.getAllLogsAsString();
      throw new Error(`COMPRESSION_FAILED: ${logs}`);
    }

    // Lê o arquivo comprimido para obter tamanho e hash
    const fileInfo = await FileSystem.getInfoAsync(outputUri, { size: true });
    if (!fileInfo.exists) {
      throw new Error('COMPRESSED_FILE_NOT_FOUND');
    }

    const sizeBytes = (fileInfo as { size: number }).size;
    const contentHash = await this.computeFileHash(outputUri);

    // Remove arquivo original para liberar espaço
    await FileSystem.deleteAsync(inputUri, { idempotent: true });

    return {
      uri: outputUri,
      sizeBytes,
      mimeType: 'audio/opus',
      contentHash,
    };
  }

  /**
   * Calcula SHA-256 do arquivo — usado como nome no bucket (garante idempotência no retry).
   * Coding standard: "Audio Idempotência: Nome do arquivo no Storage = SHA-256 do conteúdo"
   */
  private async computeFileHash(uri: string): Promise<string> {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      base64,
    );
    return hash;
  }

  /**
   * Remove arquivo temporário comprimido após upload confirmado.
   */
  async cleanup(uri: string): Promise<void> {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}

export const audioCompressorService = new AudioCompressorService();
