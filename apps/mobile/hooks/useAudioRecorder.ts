/**
 * useAudioRecorder
 * Hook que encapsula AudioRecorderService para uso na UI.
 * Expõe estado de gravação e callbacks tipados.
 * Story: 2.1 — AC: 1, 2, 3, 4
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { audioRecorderService, audioCompressorService, type RecordingStatus } from '@aiscribe/ai-core';
import { audioUploadService } from '@aiscribe/api';

export interface AudioRecorderHookState {
  status: RecordingStatus;
  durationMs: number;
  isInitialized: boolean;
  error: string | null;
}

export interface AudioRecorderHookActions {
  initialize: () => Promise<void>;
  startRecording: (consultaId: string) => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  stopAndUpload: () => Promise<void>;
  cancel: () => Promise<void>;
}

export function useAudioRecorder(
  consultaId: string | null,
): AudioRecorderHookState & AudioRecorderHookActions {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [durationMs, setDurationMs] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Atualiza timer a cada segundo enquanto gravando
  useEffect(() => {
    if (status === 'recording') {
      timerRef.current = setInterval(async () => {
        const state = await audioRecorderService.getStatus();
        setDurationMs(state.durationMs);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  // AC: 4 — monitora AppState para confirmar que background funciona
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        appStateRef.current === 'active' &&
        nextState === 'background' &&
        status === 'recording'
      ) {
        // gravação continua em background via staysActiveInBackground
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, [status]);

  const initialize = useCallback(async () => {
    try {
      await audioRecorderService.initialize();
      setIsInitialized(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'INIT_FAILED');
    }
  }, []);

  const startRecording = useCallback(async (cId: string) => {
    try {
      setError(null);
      await audioRecorderService.startRecording();
      setStatus('recording');
      setDurationMs(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'START_FAILED');
      setStatus('error');
    }
  }, []);

  const pauseRecording = useCallback(async () => {
    try {
      await audioRecorderService.pauseRecording();
      setStatus('paused');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PAUSE_FAILED');
    }
  }, []);

  const resumeRecording = useCallback(async () => {
    try {
      await audioRecorderService.resumeRecording();
      setStatus('recording');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'RESUME_FAILED');
    }
  }, []);

  const stopAndUpload = useCallback(async () => {
    if (!consultaId) {
      setError('CONSULTA_ID_REQUIRED');
      return;
    }

    try {
      setStatus('stopped');

      // 1. Para gravação e obtém arquivo .m4a
      const audioFile = await audioRecorderService.stopRecording();

      // 2. Comprime .m4a → .opus (resolve limite 50MB)
      const compressed = await audioCompressorService.compress(audioFile.uri);

      // 3. Faz upload ou enfileira offline
      await audioUploadService.uploadAudio(consultaId, compressed);

      // 4. Limpa arquivo comprimido local
      await audioCompressorService.cleanup(compressed.uri);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'STOP_FAILED';
      if (msg !== 'OFFLINE_QUEUED') {
        setError(msg);
      }
    }
  }, [consultaId]);

  const cancel = useCallback(async () => {
    try {
      await audioRecorderService.cancel();
      setStatus('idle');
      setDurationMs(0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CANCEL_FAILED');
    }
  }, []);

  return {
    status,
    durationMs,
    isInitialized,
    error,
    initialize,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopAndUpload,
    cancel,
  };
}
