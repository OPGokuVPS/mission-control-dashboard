-- ============================================================================
-- Migration 008: RLS Policies for Real-Time Tracking Tables
-- 
-- Purpose: Allow API route server-side calls (via Supabase REST API) to
-- read/write task_history and task_heartbeats. These APIs use the anon key
-- via the 'apikey' + Authorization headers, which still go through RLS.
--
-- Changes:
--   1. Enable SELECT for all users on task_history
--   2. Enable INSERT for anon role on task_history (API routes write audit logs)
--   3. Enable ALL operations (SELECT/INSERT/UPDATE) for anon on task_heartbeats
--      (API routes upsert heartbeats for stale detection)
-- ============================================================================

-- COMMENT: task_history — allow reading history entries for any authenticated user
CREATE POLICY "Enable select for anon on task_history"
    ON task_history FOR SELECT TO anon USING (true);

-- COMMENT: task_history — allow API routes to insert audit trail entries
CREATE POLICY "Enable insert for anon on task_history"
    ON task_history FOR INSERT TO anon WITH CHECK (true);

-- COMMENT: task_heartbeats — allow reading heartbeat state (dashboard polling)
CREATE POLICY "Enable select for anon on task_heartbeats"
    ON task_heartbeats FOR SELECT TO anon USING (true);

-- COMMENT: task_heartbeats — allow API routes to upsert heartbeat records
CREATE POLICY "Enable upsert for anon on task_heartbeats"
    ON task_heartbeats FOR ALL TO anon USING (true) WITH CHECK (true);
