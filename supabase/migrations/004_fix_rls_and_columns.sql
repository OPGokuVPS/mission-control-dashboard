-- MIGRATION: 004_fix_rls_and_columns.sql
-- 1. Add service_role / anon bypass RLS policies for API endpoint
-- 2. Add helper columns for agent tracking

-- Allow anon and service_role to insert into tasks (needed by /api/task endpoint)
DO $$
BEGIN
    -- Drop the authenticated-only policy
    DROP POLICY IF EXISTS "Enable all operations for authenticated users on tasks" ON tasks;
    
    -- Recreate with permissive RLS: anon can insert, authenticated can do everything
    CREATE POLICY "Enable all operations for authenticated users on tasks"
        ON tasks FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
    
    -- Allow anon to insert tasks (for server-side agent API)
    CREATE POLICY "Enable insert for anon on tasks"
        ON tasks FOR INSERT
        TO anon
        WITH CHECK (true);
    
    -- Allow anon to SELECT tasks (for overview counts)
    CREATE POLICY "Enable select for anon on tasks"
        ON tasks FOR SELECT
        TO anon
        USING (true);

    -- Same for agent_activity
    DROP POLICY IF EXISTS "Enable all operations for authenticated users on agent_activity" ON agent_activity;
    
    CREATE POLICY "Enable all operations for authenticated users on agent_activity"
        ON agent_activity FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
    
    CREATE POLICY "Enable insert for anon on agent_activity"
        ON agent_activity FOR INSERT
        TO anon
        WITH CHECK (true);
    
    CREATE POLICY "Enable select for anon on agent_activity"
        ON agent_activity FOR SELECT
        TO anon
        USING (true);
END $$;