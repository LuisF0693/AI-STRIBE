/**
 * Testes unitários — AudioRecorderService
 * Story: 2.1 — Tasks: Testes unitários
 */

import { AudioRecorderService } from '../audio-recorder.service';

// Mock expo-av
jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    Recording: {
      createAsync: jest.fn(),
    },
    AndroidOutputFormat: { MPEG_4: 'mpeg4' },
    AndroidAudioEncoder: { AAC: 'aac' },
    IOSAudioQuality: { MEDIUM: 'medium' },
    IOSOutputFormat: { MPEG4AAC: 'mpeg4aac' },
  },
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 5_000_000 }),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));

import { Audio } from 'expo-av';

const mockRecordingInstance = {
  startAsync: jest.fn().mockResolvedValue(undefined),
  pauseAsync: jest.fn().mockResolvedValue(undefined),
  stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
  getURI: jest.fn().mockReturnValue('file:///tmp/recording.m4a'),
  getStatusAsync: jest.fn().mockResolvedValue({
    isRecording: true,
    durationMillis: 5000,
  }),
};

describe('AudioRecorderService', () => {
  let service: AudioRecorderService;

  beforeEach(() => {
    service = new AudioRecorderService();
    jest.clearAllMocks();
    (Audio.Recording.createAsync as jest.Mock).mockResolvedValue({
      recording: mockRecordingInstance,
    });
  });

  describe('initialize()', () => {
    it('solicita permissão de microfone', async () => {
      await service.initialize();
      expect(Audio.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it('lança MICROPHONE_PERMISSION_DENIED quando permissão negada', async () => {
      (Audio.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });

      await expect(service.initialize()).rejects.toThrow(
        'MICROPHONE_PERMISSION_DENIED',
      );
    });

    it('configura background audio session (staysActiveInBackground: true)', async () => {
      await service.initialize();
      expect(Audio.setAudioModeAsync).toHaveBeenCalledWith(
        expect.objectContaining({ staysActiveInBackground: true }),
      );
    });
  });

  describe('startRecording()', () => {
    it('cria gravação com opções corretas (16kHz mono)', async () => {
      await service.startRecording();

      expect(Audio.Recording.createAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          android: expect.objectContaining({ sampleRate: 16000, numberOfChannels: 1 }),
          ios: expect.objectContaining({ sampleRate: 16000, numberOfChannels: 1 }),
        }),
      );
    });

    it('lança RECORDING_ALREADY_ACTIVE se já estiver gravando', async () => {
      await service.startRecording();
      await expect(service.startRecording()).rejects.toThrow(
        'RECORDING_ALREADY_ACTIVE',
      );
    });
  });

  describe('pauseRecording()', () => {
    it('chama pauseAsync na gravação ativa', async () => {
      await service.startRecording();
      await service.pauseRecording();
      expect(mockRecordingInstance.pauseAsync).toHaveBeenCalledTimes(1);
    });

    it('lança NO_ACTIVE_RECORDING sem gravação ativa', async () => {
      await expect(service.pauseRecording()).rejects.toThrow('NO_ACTIVE_RECORDING');
    });
  });

  describe('stopRecording()', () => {
    it('retorna AudioFile com uri, durationMs e sizeBytes', async () => {
      await service.startRecording();
      const result = await service.stopRecording();

      expect(result).toMatchObject({
        uri: 'file:///tmp/recording.m4a',
        mimeType: 'audio/mp4',
      });
      expect(result.sizeBytes).toBe(5_000_000);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('reseta estado da gravação após parar', async () => {
      await service.startRecording();
      await service.stopRecording();
      const status = await service.getStatus();
      expect(status.status).toBe('idle');
    });

    it('lança NO_ACTIVE_RECORDING sem gravação ativa', async () => {
      await expect(service.stopRecording()).rejects.toThrow('NO_ACTIVE_RECORDING');
    });

    it('restaura modo de áudio após parar', async () => {
      await service.startRecording();
      await service.stopRecording();

      expect(Audio.setAudioModeAsync).toHaveBeenLastCalledWith(
        expect.objectContaining({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
        }),
      );
    });
  });

  describe('getStatus()', () => {
    it('retorna idle quando não há gravação', async () => {
      const status = await service.getStatus();
      expect(status.status).toBe('idle');
      expect(status.durationMs).toBe(0);
    });

    it('retorna recording com durationMs durante gravação', async () => {
      await service.startRecording();
      const status = await service.getStatus();
      expect(status.status).toBe('recording');
      expect(status.durationMs).toBe(5000);
    });
  });

  describe('cancel()', () => {
    it('para e deleta o arquivo de gravação', async () => {
      const { deleteAsync } = require('expo-file-system');
      await service.startRecording();
      await service.cancel();

      expect(mockRecordingInstance.stopAndUnloadAsync).toHaveBeenCalled();
      expect(deleteAsync).toHaveBeenCalledWith(
        'file:///tmp/recording.m4a',
        { idempotent: true },
      );
    });

    it('não lança erro se não houver gravação ativa', async () => {
      await expect(service.cancel()).resolves.toBeUndefined();
    });
  });
});
