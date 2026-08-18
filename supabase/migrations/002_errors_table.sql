-- -------------------------------------------------------------------
-- MIGRATION: 002_errors_table.sql
-- -------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS errors (
    id              SERIAL PRIMARY KEY,
    service         TEXT NOT NULL,
    severity        TEXT CHECK (severity IN ('warning', 'error', 'fatal')), -- 'warning', 'error', 'fatal'
    message         TEXT NOT NULL,
    metadata_json   JSONB DEFAULT '{}',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated on errors" ON errors FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_errors_severity ON errors(severity);
CREATE INDEX idx_errors_created ON errors(created_at DESC);

COMMENT ON TABLE errors IS 'Global error ingestion — logged by ErrorBoundary and runtime handlers';