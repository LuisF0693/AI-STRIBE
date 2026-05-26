/**
 * AudioRecorderService
 * Story: 2.1 — AC: 1, 2, 3, 4, 5
 *
 * Responsabilidades:
 * - Gravar áudio com expo-av em .m4a 16kHz mono
 * - Configurar background audio session (iOS + Android)
 * - Comprimir .m4a → .opus antes do upload
 * - Expor status de gravação para a UI
 */

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

// AC: 5 — formato .m4a 16kHz mono otimizado para reconhecimento de voz
const RECORDING_OPTIONS: Audio.RecordingOptions = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 32000, // ~14MB/hora — bem abaixo do limite
  },
  ios: {
    extension: '.m4a',
    audioQuality: Audio.IOSAudioQuality.MEDIUM,
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 32000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 32000,
  },
};

export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'stopped' | 'error';

export interface RecordingState {
  status: RecordingStatus;
  durationMs: number;
  uri: string | null;
  error: string | null;
}

export interface AudioFile {
  uri: string;
  durationMs: number;
  sizeBytes: number;
  mimeType: string;
}

export class AudioRecorderService {
  private recording: Audio.Recording | null = null;
  private startTime: number | null = null;

  /**
   * Inicializa permissões e configura background audio session.
   * Deve ser chamado antes de startRecording().
   * AC: 4 — background audio session
   */
  async initialize(): Promise<void> {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('MICROPHONE_PERMISSION_DENIED');
    }

    // AC: 4 — configura para continuar em background (iOS AVAudioSession + Android)
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      // Mantém áudio ativo mesmo com ringer silenciado
      playsInSilentModeIOS: true,
      // Configura categoria para gravação com background
      staysActiveInBackground: true,
      // Android: solicita foco de áudio exclusivo
      shouldDuckAndroid: false,
    });
  }

  /**
   * Inicia a gravação.
   * AC: 1 — inicia imediatamente ao toque
   * AC: 4 — background session já configurada em initialize()
   */
  async startRecording(): Promise<void> {
    if (this.recording) {
      throw new Error('RECORDING_ALREADY_ACTIVE');
    }

    const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
    this.recording = recording;
    this.startTime = Date.now();
  }

  /**
   * Pausa a gravação (estado temporário).
   */
  async pauseRecording(): Promise<void> {
    if (!this.recording) {
      throw new Error('NO_ACTIVE_RECORDING');
    }
    await this.recording.pauseAsync();
  }

  /**
   * Retoma a gravação pausada.
   */
  async resumeRecording(): Promise<void> {
    if (!this.recording) {
      throw new Error('NO_ACTIVE_RECORDING');
    }
    await this.recording.startAsync();
  }

  /**
   * Para a gravação e retorna o arquivo de áudio .m4a.
   * AC: 3 — encerra gravação e prepara para upload
   * AC: 5 — arquivo .m4a antes da compressão
   */
  async stopRecording(): Promise<AudioFile> {
    if (!this.recording) {
      throw new Error('NO_ACTIVE_RECORDING');
    }

    await this.recording.stopAndUnloadAsync();

    const uri = this.recording.getURI();
    if (!uri) {
      throw new Error('RECORDING_URI_NOT_FOUND');
    }

    const durationMs = this.startTime ? Date.now() - this.startTime : 0;
    const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
    const sizeBytes = fileInfo.exists ? (fileInfo as { size: number }).size : 0;

    this.recording = null;
    this.startTime = null;

    // Restaura modo de áudio para reprodução normal
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
    });

    return {
      uri,
      durationMs,
      sizeBytes,
      mimeType: 'audio/mp4',
    };
  }

  /**
   * Retorna o status atual e duração em tempo real.
   * Usado pelo TimerDisplay na UI (AC: 2).
   */
  async getStatus(): Promise<RecordingState> {
    if (!this.recording) {
      return { status: 'idle', durationMs: 0, uri: null, error: null };
    }

    try {
      const status = await this.recording.getStatusAsync();
      return {
        status: status.isRecording ? 'recording' : 'paused',
        durationMs: status.durationMillis ?? 0,
        uri: this.recording.getURI() ?? null,
        error: null,
      };
    } catch (err) {
      return {
        status: 'error',
        durationMs: 0,
        uri: null,
        error: err instanceof Error ? err.message : 'UNKNOWN_ERROR',
      };
    }
  }

  /**
   * Limpa recursos sem salvar. Usado em cleanup de componente.
   */
  async cancel(): Promise<void> {
    if (!this.recording) return;

    try {
      await this.recording.stopAndUnloadAsync();
    } catch {
      // ignora erro ao cancelar
    }

    const uri = this.recording.getURI();
    if (uri) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }

    this.recording = null;
    this.startTime = null;
  }
}

// Singleton para uso no app mobile
export const audioRecorderService = new AudioRecorderService();
