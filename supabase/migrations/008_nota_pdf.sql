-- Migration: 008_nota_pdf
-- Story: 3.3 PDF Export & Digital Signature
-- AC: 5 — pdf_url e pdf_signed na tabela notas
-- Nota: pdf_status já foi adicionado na migration 007 (Story 3.2)

ALTER TABLE notas
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS pdf_signed BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_notas_pdf_url ON notas(id) WHERE pdf_url IS NOT NULL;

-- Supabase Storage: bucket notas-pdf deve ser criado via dashboard ou CLI
-- com acesso privado (authenticated only) e região sa-east-1
-- supabase storage create notas-pdf --region sa-east-1 --private
