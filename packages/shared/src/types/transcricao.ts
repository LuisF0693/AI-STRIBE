export type TranscricaoStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface TranscricaoSegmento {
  start: number;
  end: number;
  text: string;
  speaker?: 'medico' | 'paciente' | 'unknown';
}

export interface Transcricao {
  id: string;
  consulta_id: string;
  texto_completo: string | null;
  segmentos_json: TranscricaoSegmento[];
  duracao_ms: number | null;
  status: TranscricaoStatus;
  custo_usd: number | null;
  created_at: string;
  updated_at: string;
}
