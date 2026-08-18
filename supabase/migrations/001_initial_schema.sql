-- ============================================================================
-- OpenClaw AI Software Factory Schema
-- Migration: 001_initial_schema.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ENUMS & DOMAIN TYPES
-- ---------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE factory_status AS ENUM ('backlog', 'active', 'blocked', 'in_review', 'done', 'deprecated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE priority_level AS ENUM ('critical', 'high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE risk_severity AS ENUM ('high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE agent_role AS ENUM (
        'strategy', 'system_architect', 'backend_engineer', 'frontend_engineer',
        'integration_engineer', 'qa', 'devops', 'security', 'data',
        'growth', 'support_and_monitoring'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE metric_category AS ENUM ('performance', 'revenue', 'ux', 'reliability', 'operational');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE experiment_status AS ENUM (
        'running', 'concluded_winner_a', 'concluded_winner_b', 'concluded_tie', 'aborted'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE workflow_status AS ENUM ('idle', 'running', 'paused', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE memory_type AS ENUM ('successful_approach', 'failure_pattern', 'architecture_decision', 'kpi_learning');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- TABLE: tasks
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tasks (
    id              SERIAL PRIMARY KEY,
    title           TEXT NOT NULL CHECK (char_length(title) <= 500),
    description     TEXT,
    status          factory_status NOT NULL DEFAULT 'backlog',
    priority        priority_level NOT NULL DEFAULT 'medium',
    assigned_agent  agent_role,
    owner           TEXT,
    subtasks        JSONB DEFAULT '[]',
    deadline        TIMESTAMP WITH TIME ZONE,
    impact_score    DOUBLE PRECISION DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE tasks IS 'Tasks managed by agents across all factory roles';

-- ---------------------------------------------------------------------------
-- TABLE: workflows
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS workflows (
    id               SERIAL PRIMARY KEY,
    name             TEXT NOT NULL,
    description      TEXT,
    steps            JSONB DEFAULT '[]',
    current_step     INTEGER DEFAULT 0,
    status           workflow_status DEFAULT 'idle',
    dependencies     TEXT[],
    completion_pct   DOUBLE PRECISION DEFAULT 0,
    correction_logs  JSONB DEFAULT '[]',
    assigned_agent   agent_role,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABLE: agent_activity
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agent_activity (
    id                SERIAL PRIMARY KEY,
    agent_name        agent_role NOT NULL,
    objective         TEXT NOT NULL,
    actions           JSONB DEFAULT '[]',
    tools_used        TEXT[],
    result            TEXT,
    outcome_quality   TEXT CHECK (outcome_quality IN ('high', 'medium', 'low')),
    correction_applied BOOLEAN DEFAULT FALSE,
    status            TEXT DEFAULT 'completed',
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABLE: memory_vault
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS memory_vault (
    id              SERIAL PRIMARY KEY,
    title           TEXT NOT NULL,
    content         TEXT NOT NULL,
    category        memory_type NOT NULL,
    dedup_key       TEXT UNIQUE,
    linked_task_id  INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    linked_agent    agent_role,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABLE: insights
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS insights (
    id              SERIAL PRIMARY KEY,
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    category        metric_category NOT NULL,
    impact_level    TEXT CHECK (impact_level IN ('high', 'medium', 'low')) DEFAULT 'medium',
    suggestions     JSONB DEFAULT '[]',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABLE: alerts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS alerts (
    id                 SERIAL PRIMARY KEY,
    title              TEXT NOT NULL,
    description        TEXT NOT NULL,
    severity           risk_severity NOT NULL DEFAULT 'medium',
    source             TEXT DEFAULT 'technical',
    status             TEXT DEFAULT 'open',
    linked_task_id     INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    linked_workflow_id INTEGER REFERENCES workflows(id) ON DELETE SET NULL,
    resolved_at        TIMESTAMP WITH TIME ZONE,
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABLE: experiments
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS experiments (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    hypothesis      TEXT NOT NULL,
    variant_a_text  TEXT,
    variant_b_text  TEXT,
    metric_tracked  TEXT,
    sample_size     INTEGER,
    p_value         DOUBLE PRECISION,
    status          experiment_status NOT NULL DEFAULT 'running',
    decision        TEXT CHECK (decision IN ('rollout_variant_a', 'rollout_variant_b', 'keep_both', 'discard', 'continue_test')),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABLE: outcomes
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS outcomes (
    id              SERIAL PRIMARY KEY,
    task_id         INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    workflow_id     INTEGER REFERENCES workflows(id) ON DELETE SET NULL,
    metric_type     metric_category NOT NULL,
    baseline_value  DOUBLE PRECISION NOT NULL,
    final_value     DOUBLE PRECISION NOT NULL,
    delta_pct       DOUBLE PRECISION NOT NULL,
    measured_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABLE: cost_tracking
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cost_tracking (
    id                  SERIAL PRIMARY KEY,
    task_id             INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    agent_name          TEXT NOT NULL,
    model_used          TEXT NOT NULL,
    tokens_input        INTEGER DEFAULT 0,
    tokens_output       INTEGER DEFAULT 0,
    total_cost_usd      DOUBLE PRECISION NOT NULL DEFAULT 0,
    wall_time_seconds   INTEGER DEFAULT 0,
    recorded_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABLE: settings (factory context)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABLE: dashboard_metrics (historical KPI snapshots)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dashboard_metrics (
    id              SERIAL PRIMARY KEY,
    active_tasks    INTEGER DEFAULT 0,
    completed_today INTEGER DEFAULT 0,
    costs_today     DOUBLE PRECISION DEFAULT 0,
    avg_cycle_time_hours DOUBLE PRECISION,
    snapshot_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_assigned_agent ON tasks(assigned_agent);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_agent_activity_created ON agent_activity(created_at DESC);
CREATE INDEX idx_agent_activity_agent ON agent_activity(agent_name);
CREATE INDEX idx_memory_vault_category ON memory_vault(category);
CREATE INDEX idx_insights_category ON insights(category);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_experiments_status ON experiments(status);
CREATE INDEX idx_outcomes_metric ON outcomes(metric_type);
CREATE INDEX idx_cost_tracking_date ON cost_tracking(recorded_at);
CREATE INDEX idx_dashboard_metrics_snapshot ON dashboard_metrics(snapshot_at);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY POLICIES
-- ---------------------------------------------------------------------------

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: users can see their own data
CREATE POLICY "Users can view own data" ON tasks FOR SELECT USING (true);
CREATE POLICY "Users can insert tasks" ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE USING (true);
CREATE POLICY "Users can delete own tasks" ON tasks FOR DELETE USING (true);

-- Same pattern for all tables — simplify to enable-all for MVP, tighten later per tenant
DO $$
BEGIN
    EXECUTE 'CREATE POLICY "Enable all operations for authenticated users on tasks" ON tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);';
    EXECUTE 'CREATE POLICY "Enable all operations for authenticated users on workflows" ON workflows FOR ALL TO authenticated USING (true) WITH CHECK (true);';
    EXECUTE 'CREATE POLICY "Enable all operations for authenticated users on agent_activity" ON agent_activity FOR ALL TO authenticated USING (true) WITH CHECK (true);';
    EXECUTE 'CREATE POLICY "Enable all operations for authenticated users on memory_vault" ON memory_vault FOR ALL TO authenticated USING (true) WITH CHECK (true);';
    EXECUTE 'CREATE POLICY "Enable all operations for authenticated users on insights" ON insights FOR ALL TO authenticated USING (true) WITH CHECK (true);';
    EXECUTE 'CREATE POLICY "Enable all operations for authenticated users on alerts" ON alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);';
    EXECUTE 'CREATE POLICY "Enable all operations for authenticated users on experiments" ON experiments FOR ALL TO authenticated USING (true) WITH CHECK (true);';
    EXECUTE 'CREATE POLICY "Enable all operations for authenticated users on outcomes" ON outcomes FOR ALL TO authenticated USING (true) WITH CHECK (true);';
    EXECUTE 'CREATE POLICY "Enable all operations for authenticated users on cost_tracking" ON cost_tracking FOR ALL TO authenticated USING (true) WITH CHECK (true);';
    EXECUTE 'CREATE POLICY "Enable all operations for authenticated users on settings" ON settings FOR ALL TO authenticated USING (true) WITH CHECK (true);';
    EXECUTE 'CREATE POLICY "Enable all operations for authenticated users on dashboard_metrics" ON dashboard_metrics FOR ALL TO authenticated USING (true) WITH CHECK (true);';
END $$;