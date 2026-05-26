/**
 * Testes unitários — TranscriptionService
 * Story 2.2 — AC: 2, 3, 4, 9
 */

import { TranscriptionService } from '../transcription.service';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      audio: {
        transcriptions: {
          create: jest.fn().mockResolvedValue({
            text: 'Paciente relata dor de cabeça há três dias com febre.',
            duration: 300,
            segments: [
              { start: 0, end: 5.2, text: 'Paciente relata dor de cabeça' },
              { start: 5.2, end: 10.0, text: 'há três dias com febre.' },
            ],
          }),
        },
      },
    })),
  };
});

// Mock fs e path para evitar I/O real
jest.mock('fs', () => ({
  statSync: jest.fn().mockReturnValue({ size: 5_000_000 }), // 5MB — sem chunking
  createReadStream: jest.fn().mockReturnValue({}),
  writeFileSync: jest.fn(),
  rmSync: jest.fn(),
  mkdtempSync: jest.fn().mockReturnValue('/tmp/test-chunks'),
  readdirSync: jest.fn().mockReturnValue([]),
}));

// Mock download
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue({
    storage: {
      from: jest.fn().mockReturnValue({
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: 'https://storage.supabase.co/signed/audio.opus' },
          error: null,
        }),
      }),
    },
  }),
}));

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100)),
}) as jest.Mock;

describe('TranscriptionService', () => {
  let service: TranscriptionService;

  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    process.env.OPENAI_API_KEY = 'sk-test';
    service = new TranscriptionService();
    jest.clearAllMocks();
  });

  describe('transcribe()', () => {
    it('retorna texto completo e segmentos com timestamps', async () => {
      const result = await service.transcribe('consulta-id/hash.opus', 'consulta-id');

      expect(result.texto_completo).toContain('dor de cabeça');
      expect(result.segmentos_json).toHaveLength(2);
      expect(result.segmentos_json[0]).toMatchObject({
        start: 0,
        end: 5.2,
        text: expect.any(String),
      });
    });

    it('calcula custo_usd baseado em duração (300s = 5min = $0.03)', async () => {
      const result = await service.transcribe('consulta-id/hash.opus', 'consulta-id');
      expect(result.custo_usd).toBeCloseTo(0.03, 3);
    });

    it('não envia OPENAI_API_KEY em nenhum campo do resultado', async () => {
      const result = await service.transcribe('consulta-id/hash.opus', 'consulta-id');
      const resultStr = JSON.stringify(result);
      expect(resultStr).not.toContain('sk-test');
      expect(resultStr).not.toContain('OPENAI_API_KEY');
    });
  });
});
