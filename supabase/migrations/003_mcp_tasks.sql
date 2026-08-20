-- MIGRATION: 003_mcp_tasks.sql
-- Add task_tracking table to store agent sessions/work items

DO $$ BEGIN
    CREATE TYPE task_category AS ENUM ('feature', 'bugfix', 'optimization', 'research', 'deployment', 'debugging');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS task_tracking (
    id              SERIAL PRIMARY KEY,
    title           TEXT NOT NULL,
    description     TEXT,
    status          TEXT DEFAULT 'in_progress', -- pending|in_progress|done|cancelled
    category        task_category DEFAULT 'research',
    commit_sha      TEXT,
    files_changed   INTEGER DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at    TIMESTAMP WITH TIME ZONE,
    metadata_json   JSONB DEFAULT '{}'
);

ALTER TABLE task_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated on task_tracking" 
    ON task_tracking FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_task_tracking_status ON task_tracking(status);
CREATE INDEX idx_task_tracking_category ON task_tracking(category);
CREATE INDEX idx_task_tracking_created ON task_tracking(created_at DESC);

COMMENT ON TABLE task_tracking IS 'Tracks all agent work sessions, features, bugfixes, deployments';
