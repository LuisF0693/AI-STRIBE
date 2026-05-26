/**
 * Testes unitários — AudioUploadService
 * Story: 2.1 — AC: 6, 7, 8 — retry offline, idempotência, signed URL
 */

import { AudioUploadService } from '../audio-upload.service';
import type { CompressedAudio } from '@aiscribe/ai-core/src/recording/audio-compressor.service';

// Mock Supabase
jest.mock('../../config/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: { path: 'test/file.opus' }, error: null }),
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: 'https://supabase.co/signed/url' },
          error: null,
        }),
      }),
    },
    from: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  },
}));

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
}));

// Mock NetInfo
const mockNetInfo = {
  isConnected: true,
  isInternetReachable: true,
};
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve(mockNetInfo)),
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue('base64encodedcontent'),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  EncodingType: { Base64: 'base64' },
}));

const mockAudio: CompressedAudio = {
  uri: 'file:///tmp/recording_compressed.opus',
  sizeBytes: 5_000_000,
  mimeType: 'audio/opus',
  contentHash: 'abc123def456',
};

describe('AudioUploadService', () => {
  let service: AudioUploadService;

  beforeEach(() => {
    service = new AudioUploadService();
    jest.clearAllMocks();
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    mockNetInfo.isConnected = true;
    mockNetInfo.isInternetReachable = true;
  });

  describe('uploadAudio()', () => {
    it('faz upload e retorna audio_url (storage path) quando conectado', async () => {
      const result = await service.uploadAudio('consulta-uuid-1', mockAudio);

      expect(result.audio_url).toContain('abc123def456.opus');
      expect(result.consulta_id).toBe('consulta-uuid-1');
    });

    it('enfileira offline e lança OFFLINE_QUEUED sem conexão', async () => {
      mockNetInfo.isConnected = false;
      mockNetInfo.isInternetReachable = false;

      await expect(
        service.uploadAudio('consulta-uuid-2', mockAudio),
      ).rejects.toThrow('OFFLINE_QUEUED');

      // Verifica que foi adicionado à fila
      const queueSize = await service.getQueueSize();
      expect(queueSize).toBe(1);
    });

    it('usa content_hash como nome do arquivo (idempotência)', async () => {
      const { supabase } = require('../../config/supabase');
      const uploadMock = supabase.storage.from().upload;

      await service.uploadAudio('consulta-uuid-3', mockAudio);

      expect(uploadMock).toHaveBeenCalledWith(
        expect.stringContaining('abc123def456.opus'),
        expect.any(ArrayBuffer),
        expect.objectContaining({ upsert: true }),
      );
    });
  });

  describe('addToQueue() / processQueue()', () => {
    it('não duplica item na fila com mesmo content_hash', async () => {
      await service.addToQueue('c-1', mockAudio);
      await service.addToQueue('c-1', mockAudio); // mesmo hash

      const size = await service.getQueueSize();
      expect(size).toBe(1);
    });

    it('processa fila quando online e limpa itens bem-sucedidos', async () => {
      // Adiciona item offline
      mockNetInfo.isConnected = false;
      await service.addToQueue('c-2', { ...mockAudio, contentHash: 'unique-hash-1' });

      // Reconecta e processa
      mockNetInfo.isConnected = true;
      mockNetInfo.isInternetReachable = true;

      // Reset attempt timing para processar imediatamente
      const { AsyncStorage } = require('@react-native-async-storage/async-storage');
      const queueRaw = mockStorage['@aiscribe:upload_queue'];
      if (queueRaw) {
        const queue = JSON.parse(queueRaw);
        queue[0].last_attempt_at = null;
        mockStorage['@aiscribe:upload_queue'] = JSON.stringify(queue);
      }

      await service.processQueue();

      const size = await service.getQueueSize();
      expect(size).toBe(0);
    });

    it('incrementa attempts ao falhar e mantém na fila', async () => {
      const { supabase } = require('../../config/supabase');
      supabase.storage.from.mockReturnValueOnce({
        upload: jest.fn().mockRejectedValue(new Error('UPLOAD_ERROR')),
        createSignedUrl: jest.fn(),
      });

      await service.addToQueue('c-3', { ...mockAudio, contentHash: 'unique-hash-2' });

      // Reset last_attempt_at
      const queueRaw = mockStorage['@aiscribe:upload_queue'];
      if (queueRaw) {
        const queue = JSON.parse(queueRaw);
        queue[0].last_attempt_at = null;
        mockStorage['@aiscribe:upload_queue'] = JSON.stringify(queue);
      }

      await service.processQueue();

      const queueRaw2 = mockStorage['@aiscribe:upload_queue'];
      const queue = JSON.parse(queueRaw2 ?? '[]');
      expect(queue[0].attempts).toBe(1);
    });
  });

  describe('getQueueSize()', () => {
    it('retorna 0 com fila vazia', async () => {
      expect(await service.getQueueSize()).toBe(0);
    });

    it('retorna tamanho correto após adicionar itens', async () => {
      await service.addToQueue('c-4', { ...mockAudio, contentHash: 'hash-a' });
      await service.addToQueue('c-5', { ...mockAudio, contentHash: 'hash-b' });
      expect(await service.getQueueSize()).toBe(2);
    });
  });
});
