-- Migration: 005_create_notas
-- Story: 2.3 SOAP Note Generation
-- AC: 6, 10 — tabelas notas e notas_versoes com RLS e versionamento automático

CREATE TABLE IF NOT EXISTS notas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consulta_id     UUID NOT NULL REFERENCES consultas(id) ON DELETE CASCADE,
  transcricao_id  UUID REFERENCES transcricoes(id),
  soap_json       JSONB NOT NULL DEFAULT '{}',
  cids_sugeridos  JSONB DEFAULT '[]',
  texto_editado   TEXT,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'reviewed', 'approved', 'exported')),
  baixa_confianca BOOLEAN NOT NULL DEFAULT false,
  versao          INTEGER NOT NULL DEFAULT 1,
  assinatura_hash TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (consulta_id) -- idempotência
);

-- AC: 10 — histórico de versões, nota original nunca sobrescrita
CREATE TABLE IF NOT EXISTS notas_versoes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nota_id     UUID NOT NULL REFERENCES notas(id) ON DELETE CASCADE,
  soap_json   JSONB NOT NULL,
  texto_editado TEXT,
  versao      INTEGER NOT NULL,
  editado_por UUID REFERENCES medicos(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notas_consulta_id ON notas(consulta_id);
CREATE INDEX IF NOT EXISTS idx_notas_status ON notas(status);
CREATE INDEX IF NOT EXISTS idx_notas_versoes_nota_id ON notas_versoes(nota_id);

CREATE TRIGGER notas_updated_at
  BEFORE UPDATE ON notas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger de versionamento automático: cada UPDATE cria snapshot em notas_versoes
CREATE OR REPLACE FUNCTION snapshot_nota_version()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notas_versoes (nota_id, soap_json, texto_editado, versao)
  VALUES (OLD.id, OLD.soap_json, OLD.texto_editado, OLD.versao);
  NEW.versao := OLD.versao + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notas_versioning
  BEFORE UPDATE OF soap_json, texto_editado ON notas
  FOR EACH ROW EXECUTE FUNCTION snapshot_nota_version();

-- RLS
ALTER TABLE notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_versoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notas_select_own" ON notas FOR SELECT
  USING (
    consulta_id IN (
      SELECT id FROM consultas WHERE medico_id IN (
        SELECT id FROM medicos WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "notas_insert_own" ON notas FOR INSERT
  WITH CHECK (
    consulta_id IN (
      SELECT id FROM consultas WHERE medico_id IN (
        SELECT id FROM medicos WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "notas_update_own" ON notas FOR UPDATE
  USING (
    consulta_id IN (
      SELECT id FROM consultas WHERE medico_id IN (
        SELECT id FROM medicos WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "notas_versoes_select_own" ON notas_versoes FOR SELECT
  USING (
    nota_id IN (
      SELECT id FROM notas WHERE consulta_id IN (
        SELECT id FROM consultas WHERE medico_id IN (
          SELECT id FROM medicos WHERE user_id = auth.uid()
        )
      )
    )
  );
