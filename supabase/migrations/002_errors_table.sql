-- Error logging table for Mission Control
-- Stores all application errors with context for debugging and monitoring

CREATE TABLE IF NOT EXISTS errors (
  id BIGSERIAL PRIMARY KEY,
  component TEXT NOT NULL,           -- e.g., 'TaskControlCenter', 'SupabaseClient', 'CommandInterface'
  severity TEXT NOT NULL DEFAULT 'error', -- 'error', 'warning', 'info'
  message TEXT NOT NULL,             -- Human-readable error message
  details JSONB,                     -- Additional context: { method, path, payload, stack, etc. }
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_errors_component ON errors(component);
CREATE INDEX IF NOT EXISTS idx_errors_severity ON errors(severity);
CREATE INDEX IF NOT EXISTS idx_errors_occurred_at ON errors(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_errors_unresolved ON errors(resolved_at) WHERE resolved_at IS NULL;

-- Row Level Security: Allow all dashboard access (anon key)
ALTER TABLE errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access on errors" ON errors FOR ALL USING (true) WITH CHECK (true);

-- Optional: Keep only last 7 days of errors (auto-cleanup)
-- CREATE OR REPLACE FUNCTION cleanup_old_errors() RETURNS void AS $$
-- BEGIN
--   DELETE FROM errors WHERE occurred_at < NOW() - INTERVAL '7 days';
-- END;
-- $$ LANGUAGE plpgsql;
-- SELECT cron.schedule('@daily', 'SELECT cleanup_old_errors()');
