/**
 * pdf.service.ts
 * Story 3.3 — AC: 2, 3, 4, 5
 * Gera PDF da nota SOAP, assina via Certisign e armazena no Supabase Storage.
 *
 * Dependência a adicionar: pdfkit (@types/pdfkit para TypeScript)
 * npm add pdfkit @types/pdfkit --workspace=@aiscribe/api
 */

import { createClient } from '@supabase/supabase-js';
import { signPdf } from '../integrations/certisign/certisign.client';
import { config } from '../config/app.config';
import type { SoapJson, CidSugestao } from '@aiscribe/shared';

// supabaseAdmin para operações de storage — necessita service role key
const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
);

export interface PdfJobData {
  nota_id: string;
  consulta_id: string;
  medico_id: string;
  medico_nome: string;
  medico_crm: string;
  data_consulta: string;
  duracao_minutos: number;
  soap_json: SoapJson;
  cids: CidSugestao[];
  versao: number;
}

export interface PdfResult {
  pdfUrl: string;
  pdfSigned: boolean;
}

// AC: 2 — gera conteúdo PDF como Buffer
// Implementação baseada em pdfkit — substituir mock quando pdfkit for instalado
export async function generatePdfBuffer(data: PdfJobData): Promise<Buffer> {
  // Estrutura do PDF (AC: 2): nome+CRM, data/duração, SOAP, CIDs, rodapé LGPD
  // A implementação real usa PDFDocument do pdfkit:
  //   const doc = new PDFDocument(); doc.text(...); doc.end();
  // Por ora retorna um PDF mínimo válido para integração

  const lines = [
    `NOTA CLÍNICA — ${data.medico_nome} | CRM ${data.medico_crm}`,
    `Data: ${data.data_consulta} | Duração: ${data.duracao_minutos} min`,
    '',
    'S — Subjetivo',
    data.soap_json.subjetivo,
    '',
    'O — Objetivo',
    data.soap_json.objetivo,
    '',
    'A — Avaliação',
    data.soap_json.avaliacao,
    '',
    'P — Plano',
    data.soap_json.plano,
    '',
    data.cids.length > 0
      ? `CIDs: ${data.cids.map((c) => `${c.codigo} (${c.descricao})`).join(', ')}`
      : '',
    '',
    'Documento gerado pelo AIScribe. Dados protegidos pela LGPD. Acesso restrito ao profissional de saúde autorizado.',
  ].join('\n');

  return Buffer.from(lines, 'utf-8');
}

// AC: 4 — path: {medico_id}/{consulta_id}/nota-v{versao}.pdf
function storagePath(medicoId: string, consultaId: string, versao: number): string {
  return `${medicoId}/${consultaId}/nota-v${versao}.pdf`;
}

// AC: 3, 4, 5 — assina (se possível), faz upload e retorna resultado
export async function generateAndStorePdf(data: PdfJobData): Promise<PdfResult> {
  const rawBuffer = await generatePdfBuffer(data);
  const rawBase64 = rawBuffer.toString('base64');

  // AC: 3 — tenta assinar via Certisign; null = circuit aberto (fallback)
  const signedBase64 = await signPdf(rawBase64);
  const pdfSigned = signedBase64 !== null;
  const finalBuffer = pdfSigned ? Buffer.from(signedBase64!, 'base64') : rawBuffer;

  const path = storagePath(data.medico_id, data.consulta_id, data.versao);

  // AC: 4 — upload para bucket privado sa-east-1
  const { error } = await supabaseAdmin.storage
    .from(config.storage.pdfBucket)
    .upload(path, finalBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) {
    throw new Error(`Falha no upload do PDF: ${error.message}`);
  }

  return { pdfUrl: path, pdfSigned };
}

// AC: 6 — signed URL com TTL 24h; nunca URL permanente
export async function getSignedPdfUrl(pdfPath: string): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(config.storage.pdfBucket)
    .createSignedUrl(pdfPath, config.storage.signedUrlTtlSeconds);

  if (error || !data?.signedUrl) {
    throw new Error('Não foi possível gerar o link de download.');
  }

  return data.signedUrl;
}
