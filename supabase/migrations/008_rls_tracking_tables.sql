-- ============================================================================
-- Migration 008: RLS Policies for Real-Time Tracking Tables
-- 
-- Purpose: Grant anon role access to task_history and task_heartbeats
--          tables created in migration 007.
-- ============================================================================

-- COMMENT: Enable SELECT on task_history for anonymous users
CREATE POLICY "Enable select for anon on task_history"
    ON task_history
    FOR SELECT TO anon
    USING (true);

-- COMMENT: Enable INSERT on task_history for anonymous users
CREATE POLICY "Enable insert for anon on task_history"
    ON task_history
    FOR INSERT TO anon
    WITH CHECK (true);

-- COMMENT: Enable UPDATE on task_history for anonymous users
CREATE POLICY "Enable update for anon on task_history"
    ON task_history
    FOR UPDATE TO anon
    USING (true)
    WITH CHECK (true);

-- COMMENT: Enable DELETE on task_history for anonymous users
CREATE POLICY "Enable delete for anon on task_history"
    ON task_history
    FOR DELETE TO anon
    USING (true);

-- COMMENT: Enable ALL operations on task_heartbeats for anonymous users
CREATE POLICY "Enable select for anon on task_heartbeats"
    ON task_heartbeats
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "Enable insert for anon on task_heartbeats"
    ON task_heartbeats
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "Enable update for anon on task_heartbeats"
    ON task_heartbeats
    FOR UPDATE TO anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete for anon on task_heartbeats"
    ON task_heartbeats
    FOR DELETE TO anon
    USING (true);
