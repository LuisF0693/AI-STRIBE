/**
 * Testes unitários — SoapNoteService
 * Story 2.3 — AC: 2, 3, 4, 5, 8
 */

import { SoapNoteService } from '../soap-note.service';

// Mock fs para evitar leitura do arquivo de prompt
jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue('System prompt de teste'),
}));

const mockGptResponse = {
  subjetivo: 'Paciente refere cefaleia há 3 dias, associada a febre e mialgia.',
  objetivo: 'PA 120/80 mmHg, FC 88 bpm, Tax 38.2°C. Orofaringe hiperemiada.',
  avaliacao: 'Síndrome gripal. Hipóteses: Influenza, rinofaringite aguda.',
  plano: 'Dipirona 500mg 6/6h se febre. Repouso 3 dias. Retorno se não melhora.',
  cids_sugeridos: [
    { codigo: 'J11', descricao: 'Influenza sem vírus identificado', confianca: 0.85 },
    { codigo: 'J00', descricao: 'Rinofaringite aguda', confianca: 0.72 },
  ],
  baixa_confianca: false,
};

jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify(mockGptResponse) } }],
          usage: { prompt_tokens: 1200, completion_tokens: 350 },
        }),
      },
    },
  })),
}));

describe('SoapNoteService', () => {
  let service: SoapNoteService;
  const transcricaoSample =
    'Bom dia doutor. Estou com dor de cabeça há três dias, muita febre e dor no corpo. ' +
    'Tomei dipirona mas não melhorou muito. Tenho histórico de rinite. ' +
    'Exame físico: garganta avermelhada, sem pontos de pus. Temperatura 38.2 graus.';

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'sk-test';
    service = new SoapNoteService();
    jest.clearAllMocks();
  });

  describe('generateNote()', () => {
    it('retorna os 4 campos SOAP preenchidos', async () => {
      const result = await service.generateNote(transcricaoSample);

      expect(result.soap_json.subjetivo).toBeTruthy();
      expect(result.soap_json.objetivo).toBeTruthy();
      expect(result.soap_json.avaliacao).toBeTruthy();
      expect(result.soap_json.plano).toBeTruthy();
    });

    it('retorna até 3 CIDs sugeridos com código e descrição', async () => {
      const result = await service.generateNote(transcricaoSample);

      expect(result.cids_sugeridos.length).toBeLessThanOrEqual(3);
      expect(result.cids_sugeridos[0]).toMatchObject({
        codigo: expect.any(String),
        descricao: expect.any(String),
        confianca: expect.any(Number),
      });
    });

    it('marca baixa_confianca=true para transcrições com menos de 50 palavras', async () => {
      const curta = 'Dor de cabeça.';
      const result = await service.generateNote(curta);
      expect(result.baixa_confianca).toBe(true);
    });

    it('calcula custo_usd baseado em tokens', async () => {
      const result = await service.generateNote(transcricaoSample);
      // 1200 * 2.5/1M + 350 * 10/1M = 0.003 + 0.0035 = 0.0065
      expect(result.custo_usd).toBeCloseTo(0.0065, 4);
      expect(result.tokens_input).toBe(1200);
      expect(result.tokens_output).toBe(350);
    });

    it('não expõe transcrição do paciente em dados de erro', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementationOnce(() => ({
        chat: { completions: { create: jest.fn().mockRejectedValue(new Error('rate_limit')) } },
      }));

      const svc = new SoapNoteService();
      await expect(svc.generateNote(transcricaoSample)).rejects.toThrow('rate_limit');
    });

    it('retorna fallback se GPT retornar JSON inválido', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementationOnce(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: 'não é json' } }],
              usage: { prompt_tokens: 0, completion_tokens: 0 },
            }),
          },
        },
      }));

      const svc = new SoapNoteService();
      const result = await svc.generateNote(transcricaoSample);
      expect(result.baixa_confianca).toBe(true);
      expect(result.soap_json.plano).toContain('Revisar manualmente');
    });
  });
});
