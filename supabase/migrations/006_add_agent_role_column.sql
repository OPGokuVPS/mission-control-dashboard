-- Migration: 006_add_agent_role_column.sql
-- Add agent_role column to agent_activity table for duplicate-role tracking.
-- Per Task #13 (Mission Control): agent_activity has BOTH agent_name AND agent_role
-- as duplicate NOT NULL columns — both must be sent on insert.
--
-- Agent Role: Use agent_name when querying/filtering; use agent_role for insertion
-- parity with the tasks/workflows tables. Both columns carry the same enum value.

ALTER TABLE agent_activity ADD COLUMN IF NOT EXISTS agent_role agent_role DEFAULT 'strategy'::agent_role;

-- Propagate existing agent_name values to agent_role where NULL (post-add backfill)
UPDATE agent_activity SET agent_role = agent_name WHERE agent_role IS NULL;

-- Set NOT NULL now that all rows have a value
ALTER TABLE agent_activity ALTER COLUMN agent_role SET NOT NULL;

-- Mirror the existing index on agent_name to also cover agent_role
CREATE INDEX IF NOT EXISTS idx_agent_activity_agent_role ON agent_activity(agent_role);
