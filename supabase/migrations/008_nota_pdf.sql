-- Migration: 008_nota_pdf
-- Story: 3.3 PDF Export & Digital Signature
-- AC: 5 — pdf_url, pdf_signed e extensão do CHECK de pdf_status

ALTER TABLE notas
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS pdf_signed BOOLEAN NOT NULL DEFAULT false;

-- Estender CHECK de pdf_status (criado na migration 007) para incluir 'ready_unsigned'
-- Circuit breaker aciona fallback e seta pdf_status = 'ready_unsigned' (AC: 8)
ALTER TABLE notas DROP CONSTRAINT IF EXISTS notas_pdf_status_check;
ALTER TABLE notas
  ADD CONSTRAINT notas_pdf_status_check
  CHECK (pdf_status IN ('none', 'pending', 'processing', 'ready', 'ready_unsigned', 'failed'));

CREATE INDEX IF NOT EXISTS idx_notas_pdf_url ON notas(id) WHERE pdf_url IS NOT NULL;

-- Supabase Storage: bucket notas-pdf deve ser criado via dashboard ou CLI
-- com acesso privado (authenticated only) e região sa-east-1
-- supabase storage create notas-pdf --region sa-east-1 --private
