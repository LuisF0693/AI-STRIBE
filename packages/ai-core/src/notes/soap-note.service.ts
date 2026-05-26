/**
 * SoapNoteService
 * Story 2.3 — AC: 1, 2, 3, 4, 5, 7, 8
 * Gera nota clínica SOAP estruturada via GPT-4o a partir da transcrição.
 */

import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

export interface CidSugestao {
  codigo: string;
  descricao: string;
  confianca: number;
}

export interface SoapJson {
  subjetivo: string;
  objetivo: string;
  avaliacao: string;
  plano: string;
}

export interface SoapNoteResult {
  soap_json: SoapJson;
  cids_sugeridos: CidSugestao[];
  baixa_confianca: boolean;
  tokens_input: number;
  tokens_output: number;
  custo_usd: number;
}

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, '../prompts/soap-note-system.md'),
  'utf-8',
);

const PALAVRAS_MINIMAS = 50;

// GPT-4o pricing (maio 2026): $2.50/1M input + $10/1M output
const CUSTO_INPUT_PER_TOKEN = 2.5 / 1_000_000;
const CUSTO_OUTPUT_PER_TOKEN = 10 / 1_000_000;

export class SoapNoteService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Gera nota SOAP a partir do texto da transcrição.
   * AC: 2, 3, 4 — campos SOAP + CID-10 + PT-BR
   * AC: 5 — output JSON estruturado
   * AC: 7 — target ≤ 30s (GPT-4o p95 ~10s para este tamanho)
   */
  async generateNote(transcricaoTexto: string): Promise<SoapNoteResult> {
    const palavras = transcricaoTexto.trim().split(/\s+/).length;
    const baixaConfiancaInput = palavras < PALAVRAS_MINIMAS;

    // AC: 5 — response_format json_object garante JSON válido
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.2, // determinístico para documentação clínica
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `TRANSCRIÇÃO DA CONSULTA:\n\n${transcricaoTexto}`,
        },
      ],
    });

    const rawContent = response.choices[0]?.message?.content ?? '{}';
    const parsed = this.parseAndValidate(rawContent);

    const tokensInput = response.usage?.prompt_tokens ?? 0;
    const tokensOutput = response.usage?.completion_tokens ?? 0;
    const custoUsd = tokensInput * CUSTO_INPUT_PER_TOKEN + tokensOutput * CUSTO_OUTPUT_PER_TOKEN;

    return {
      soap_json: {
        subjetivo: parsed.subjetivo ?? 'Não referido',
        objetivo: parsed.objetivo ?? 'Não referido',
        avaliacao: parsed.avaliacao ?? 'Não referido',
        plano: parsed.plano ?? 'Não referido',
      },
      cids_sugeridos: (parsed.cids_sugeridos ?? []).slice(0, 3),
      baixa_confianca: baixaConfiancaInput || (parsed.baixa_confianca ?? false),
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      custo_usd: Math.round(custoUsd * 1_000_000) / 1_000_000,
    };
  }

  /** Valida e sanitiza o JSON retornado pelo GPT-4o. */
  private parseAndValidate(raw: string): Record<string, unknown> {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) {
        return this.fallbackNote();
      }
      return parsed;
    } catch {
      return this.fallbackNote();
    }
  }

  private fallbackNote() {
    return {
      subjetivo: 'Não foi possível processar a transcrição.',
      objetivo: 'Não referido',
      avaliacao: 'Não referido',
      plano: 'Revisar manualmente a gravação.',
      cids_sugeridos: [],
      baixa_confianca: true,
    };
  }
}

export const soapNoteService = new SoapNoteService();
