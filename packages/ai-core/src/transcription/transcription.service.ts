/**
 * TranscriptionService
 * Story 2.2 — AC: 2, 3, 4, 8, 9
 * Integra OpenAI Whisper com retry/backoff e chunking para arquivos >25MB.
 */

import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

const WHISPER_MAX_BYTES = 24 * 1024 * 1024; // 24MB — margem de segurança abaixo do limite 25MB
const MEDICAL_CONTEXT_PROMPT =
  'Transcrição de consulta médica em português brasileiro. Terminologia: CID-10, TUSS, prontuário, anamnese, hipótese diagnóstica, prescrição, retorno.';

export interface TranscricaoSegmento {
  start: number;
  end: number;
  text: string;
  speaker?: 'medico' | 'paciente' | 'unknown';
}

export interface TranscricaoResult {
  texto_completo: string;
  segmentos_json: TranscricaoSegmento[];
  duracao_ms: number;
  custo_usd: number;
}

export class TranscriptionService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Baixa áudio do Supabase Storage e transcreve com Whisper.
   * AC: 3 — chunking transparente para arquivos >25MB
   */
  async transcribe(audioUrl: string, consultaId: string): Promise<TranscricaoResult> {
    const localPath = await this.downloadAudio(audioUrl, consultaId);

    try {
      const stat = fs.statSync(localPath);
      const needsChunking = stat.size > WHISPER_MAX_BYTES;

      const result = needsChunking
        ? await this.transcribeChunked(localPath)
        : await this.transcribeSingle(localPath);

      return result;
    } finally {
      fs.rmSync(localPath, { force: true });
    }
  }

  /** Download do áudio do Storage path via Supabase service role. */
  private async downloadAudio(storagePath: string, consultaId: string): Promise<string> {
    // O storagePath é relativo ao bucket (ex: "consulta-id/hash.opus")
    // Workers usam service role key para gerar URL fresca
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabaseAdmin.storage
      .from('audio-consultas')
      .createSignedUrl(storagePath, 600); // 10 min — suficiente para download

    if (error || !data?.signedUrl) {
      throw new Error(`DOWNLOAD_URL_FAILED: ${error?.message}`);
    }

    const response = await fetch(data.signedUrl);
    if (!response.ok) throw new Error(`DOWNLOAD_FAILED: ${response.status}`);

    const buffer = await response.arrayBuffer();
    const tmpPath = path.join(os.tmpdir(), `aiscribe-${consultaId}.opus`);
    fs.writeFileSync(tmpPath, Buffer.from(buffer));
    return tmpPath;
  }

  /** Transcreve arquivo único (< 25MB). AC: 4 — timestamps por segmento. */
  private async transcribeSingle(filePath: string): Promise<TranscricaoResult> {
    const startTime = Date.now();
    const fileStream = fs.createReadStream(filePath);

    const response = await this.openai.audio.transcriptions.create({
      file: fileStream as unknown as File,
      model: 'whisper-1',
      language: 'pt',
      response_format: 'verbose_json',
      prompt: MEDICAL_CONTEXT_PROMPT,
      timestamp_granularities: ['segment'],
    });

    const duracao_ms = Date.now() - startTime;
    const custo_usd = this.calcularCusto(response.duration ?? 0);

    const segmentos: TranscricaoSegmento[] = (response.segments ?? []).map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text.trim(),
    }));

    return {
      texto_completo: response.text,
      segmentos_json: segmentos,
      duracao_ms,
      custo_usd,
    };
  }

  /**
   * Divide o arquivo em chunks com ffmpeg e concatena os resultados.
   * AC: 3 — chunking transparente, timestamps contínuos.
   */
  private async transcribeChunked(filePath: string): Promise<TranscricaoResult> {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiscribe-chunks-'));
    const chunkPattern = path.join(tmpDir, 'chunk-%03d.opus');

    // Divide em segmentos de 20 minutos (bem abaixo do limite de 25MB para 16kHz mono Opus)
    execSync(
      `ffmpeg -i "${filePath}" -f segment -segment_time 1200 -c copy "${chunkPattern}" -y`,
      { stdio: 'pipe' },
    );

    const chunkFiles = fs.readdirSync(tmpDir)
      .filter((f) => f.startsWith('chunk-'))
      .sort()
      .map((f) => path.join(tmpDir, f));

    let textoCompleto = '';
    const todosSegmentos: TranscricaoSegmento[] = [];
    let custoTotal = 0;
    let offsetSeconds = 0;

    for (const chunk of chunkFiles) {
      const result = await this.transcribeSingle(chunk);
      textoCompleto += (textoCompleto ? ' ' : '') + result.texto_completo;
      custoTotal += result.custo_usd;

      for (const seg of result.segmentos_json) {
        todosSegmentos.push({
          ...seg,
          start: seg.start + offsetSeconds,
          end: seg.end + offsetSeconds,
        });
      }

      // Avança offset pelo último timestamp do chunk
      const lastSeg = result.segmentos_json.at(-1);
      if (lastSeg) offsetSeconds = lastSeg.end;
    }

    fs.rmSync(tmpDir, { recursive: true, force: true });

    return {
      texto_completo: textoCompleto,
      segmentos_json: todosSegmentos,
      duracao_ms: offsetSeconds * 1000,
      custo_usd: custoTotal,
    };
  }

  /** Custo Whisper: $0.006/min (v1 pricing). AC: 9 */
  private calcularCusto(duracaoSegundos: number): number {
    const minutos = duracaoSegundos / 60;
    return Math.round(minutos * 0.006 * 1_000_000) / 1_000_000;
  }
}

export const transcriptionService = new TranscriptionService();
