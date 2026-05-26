export type NotaStatus = 'draft' | 'reviewed' | 'approved' | 'exported';
export type PdfStatus = 'none' | 'pending' | 'processing' | 'ready' | 'failed';

export interface SoapJson {
  subjetivo: string;
  objetivo: string;
  avaliacao: string;
  plano: string;
}

export interface CidSugestao {
  codigo: string;
  descricao: string;
  confianca: number;
}

export interface Nota {
  id: string;
  consulta_id: string;
  transcricao_id: string | null;
  soap_json: SoapJson;
  cids_sugeridos: CidSugestao[];
  texto_editado: string | null;
  status: NotaStatus;
  baixa_confianca: boolean;
  versao: number;
  assinatura_hash: string | null;
  approved_by: string | null;
  approved_at: string | null;
  pdf_status: PdfStatus;
  created_at: string;
  updated_at: string;
}

export interface NotaVersao {
  id: string;
  nota_id: string;
  soap_json: SoapJson;
  texto_editado: string | null;
  versao: number;
  editado_por: string | null;
  created_at: string;
}
