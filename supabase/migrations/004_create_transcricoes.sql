-- Migration: 004_create_transcricoes
-- Story: 2.2 Whisper Transcription Pipeline
-- AC: 5 — resultado da transcrição salvo com campos completos

CREATE TABLE IF NOT EXISTS transcricoes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consulta_id   UUID NOT NULL REFERENCES consultas(id) ON DELETE CASCADE,
  texto_completo TEXT,
  segmentos_json JSONB DEFAULT '[]',
  duracao_ms    INTEGER,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  custo_usd     DECIMAL(10,6),
  erro_msg      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (consulta_id) -- AC: 7 — idempotência, sem duplicatas por consulta
);

CREATE INDEX IF NOT EXISTS idx_transcricoes_consulta_id ON transcricoes(consulta_id);
CREATE INDEX IF NOT EXISTS idx_transcricoes_status ON transcricoes(status);

CREATE TRIGGER transcricoes_updated_at
  BEFORE UPDATE ON transcricoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE transcricoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transcricoes_select_own" ON transcricoes FOR SELECT
  USING (
    consulta_id IN (
      SELECT id FROM consultas WHERE medico_id IN (
        SELECT id FROM medicos WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "transcricoes_insert_own" ON transcricoes FOR INSERT
  WITH CHECK (
    consulta_id IN (
      SELECT id FROM consultas WHERE medico_id IN (
        SELECT id FROM medicos WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "transcricoes_update_own" ON transcricoes FOR UPDATE
  USING (
    consulta_id IN (
      SELECT id FROM consultas WHERE medico_id IN (
        SELECT id FROM medicos WHERE user_id = auth.uid()
      )
    )
  );
