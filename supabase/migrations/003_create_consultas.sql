-- Migration: 003_create_consultas
-- Story: 2.1 Audio Recording Service
-- AC: 9 — Metadata da consulta salva na tabela `consultas`

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- Tabela: consultas
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consultas (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medico_id        UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  paciente_id      UUID REFERENCES pacientes(id) ON DELETE SET NULL,
  duracao_ms       INTEGER,
  timestamp_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  timestamp_fim    TIMESTAMPTZ,
  audio_url        TEXT,
  status           TEXT NOT NULL DEFAULT 'recording'
                   CHECK (status IN (
                     'recording',
                     'uploading',
                     'queued',
                     'transcribing',
                     'generating_note',
                     'completed',
                     'failed'
                   )),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Índices
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_consultas_medico_id
  ON consultas(medico_id);

CREATE INDEX IF NOT EXISTS idx_consultas_status
  ON consultas(status);

CREATE INDEX IF NOT EXISTS idx_consultas_timestamp_inicio
  ON consultas(timestamp_inicio DESC);

-- ─────────────────────────────────────────────
-- updated_at automático
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consultas_updated_at
  BEFORE UPDATE ON consultas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────
-- RLS (Row Level Security)
-- AC: 7 — médico só acessa suas próprias consultas
-- ─────────────────────────────────────────────
ALTER TABLE consultas ENABLE ROW LEVEL SECURITY;

-- SELECT: médico vê apenas suas consultas
CREATE POLICY "consultas_select_own"
  ON consultas FOR SELECT
  USING (
    medico_id IN (
      SELECT id FROM medicos WHERE user_id = auth.uid()
    )
  );

-- INSERT: médico só insere para si mesmo
CREATE POLICY "consultas_insert_own"
  ON consultas FOR INSERT
  WITH CHECK (
    medico_id IN (
      SELECT id FROM medicos WHERE user_id = auth.uid()
    )
  );

-- UPDATE: médico atualiza apenas suas consultas
CREATE POLICY "consultas_update_own"
  ON consultas FOR UPDATE
  USING (
    medico_id IN (
      SELECT id FROM medicos WHERE user_id = auth.uid()
    )
  );

-- DELETE: médico deleta apenas suas consultas
CREATE POLICY "consultas_delete_own"
  ON consultas FOR DELETE
  USING (
    medico_id IN (
      SELECT id FROM medicos WHERE user_id = auth.uid()
    )
  );

-- Service role (backend workers) tem acesso total sem RLS
-- Configurado via supabaseAdmin client com service_role_key
