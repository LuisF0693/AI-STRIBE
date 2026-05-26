-- Migration: 007_nota_approval
-- Story: 3.2 Note Approval & Persistence
-- AC: 2, 3, 9 — colunas de aprovação e pdf_status

ALTER TABLE notas
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES medicos(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pdf_status TEXT
    CHECK (pdf_status IN ('none', 'pending', 'processing', 'ready', 'failed'))
    DEFAULT 'none';

-- Índice para consultas por status de aprovação (auditoria LGPD)
CREATE INDEX IF NOT EXISTS idx_notas_approved_by ON notas(approved_by) WHERE approved_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notas_approved_at ON notas(approved_at) WHERE approved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notas_pdf_status ON notas(pdf_status) WHERE pdf_status != 'none';
