-- ============================================================================
-- Migration 007: Add Real-Time Tracking Infrastructure
-- 
-- Purpose: Foundation for Phase 2 P0 — actual start/end timing, duration
-- calculations, heartbeat detection, and SLA awareness.
--
-- Changes:
--   1. Add start_time, end_time columns to tasks (nullable — set when work begins/ends)
--   2. Add sla_deadline column to tasks (optional deadline for SLA tracking)
--   3. Add started_at, completed_at, execution_duration_ms, step_count to agent_activity
--   4. Create task_history table for audit trail (P0 requirement #8)
--   5. Create task_heartbeats table for stale-task detection
--   6. Add indexes for performance
-- ============================================================================

-- COMMENT: Tasks table — add lifecycle timestamps
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ;

-- COMMENT: Agent activity — add execution timing
ALTER TABLE agent_activity ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE agent_activity ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE agent_activity ADD COLUMN IF NOT EXISTS execution_duration_ms BIGINT;
ALTER TABLE agent_activity ADD COLUMN IF NOT EXISTS step_count INTEGER DEFAULT 0;

-- COMMENT: Audit trail — track who changed what on every task update
CREATE TABLE IF NOT EXISTS task_history (
    id BIGSERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    field_changed VARCHAR(64) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    actor VARCHAR(64) NOT NULL DEFAULT 'system',
    actor_role VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- COMMENT: Heartbeat table — detect stale active tasks
CREATE TABLE IF NOT EXISTS task_heartbeats (
    id BIGSERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
    last_ping TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ping_interval_seconds INTEGER NOT NULL DEFAULT 30,
    is_alive BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- COMMENT: Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_tasks_start_time ON tasks(start_time);
CREATE INDEX IF NOT EXISTS idx_tasks_end_time ON tasks(end_time);
CREATE INDEX IF NOT EXISTS idx_tasks_sla_deadline ON tasks(sla_deadline);
CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_field ON task_history(field_changed);
CREATE INDEX IF NOT EXISTS idx_agent_activity_started_at ON agent_activity(started_at);
CREATE INDEX IF NOT EXISTS idx_agent_activity_completed_at ON agent_activity(completed_at);

-- COMMENT: Set default SLA warning thresholds at 80% of a hypothetical deadline
COMMENT ON COLUMN tasks.sla_deadline IS 'Optional deadline for SLA tracking. When exceeded, triggers Discord alert.';
COMMENT ON COLUMN agent_activity.execution_duration_ms IS 'Milliseconds from started_at to completed_at, computed automatically on completion.';
COMMENT ON COLUMN task_history.old_value IS 'JSON-encoded string of the old value for reference.';
COMMENT ON COLUMN task_history.new_value IS 'JSON-encoded string of the new value for reference.';
COMMENT ON COLUMN task_heartbeats.last_ping IS 'Timestamp of most recent heartbeat ping from the active agent.';
COMMENT ON COLUMN task_heartbeats.is_alive IS 'False if no heartbeat received within 3x ping_interval.';
