-- ============================================================================
-- Agent Performance Metrics Aggregation — SQL Reference Queries
-- Database: agent_activity (Supabase / PostgreSQL)
-- ============================================================================
-- These queries compute per-role productivity metrics from the agent_activity
-- table and tasks table. They are designed to be run through the Supabase
-- REST API or any psql client and accept a time-range filter via bind parameters.
--
-- Updated for Task #13: Proper completion criteria, quality distribution
-- including unknown/critical, and median inter-task gap calculation.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- QUERY 1: Full performance report per role (primary dashboard query)
-- Returns one row per role with total tasks, completed count, completion rate,
-- average inter-task gap, and median gap for each role.
-- Uses status = 'completed' for completion (not != 'failed').
-- ---------------------------------------------------------------------------

SELECT
    -- Role identity (always present even when no activity exists)
    r.role AS agent_role,

    -- Total number of activity records within the time window
    COALESCE(agg.total_tasks, 0) AS total_tasks,

    -- Number of activities whose status IS 'completed'
    COALESCE(agg.completed_tasks, 0) AS completed_tasks,

    -- Completion rate as a percentage [0..100]
    CASE
        WHEN COALESCE(agg.total_tasks, 0) = 0 THEN 0.0
        ELSE ROUND(
            COALESCE(agg.completed_tasks, 0)::numeric / agg.total_tasks::numeric * 100,
            2
        )
    END AS completion_rate_pct,

    -- Average gap between consecutive completed tasks (seconds)
    -- Computed via a correlated subquery using LAG() window function
    COALESCE(ROUND(
        (
            SELECT AVG(COALESCE(EXTRACT(EPOCH FROM t2.gap), 0))
            FROM (
                SELECT
                    EXTRACT(EPOCH FROM (
                        created_at - LAG(created_at) OVER (PARTITION BY agent_name ORDER BY created_at)
                    )) AS gap
                FROM agent_activity
                WHERE agent_name = r.role
                  AND status = 'completed'
                  AND created_at IS NOT NULL
                  AND created_at >= $1          -- ← start_date (inclusive)
                  AND created_at <  $2          -- ← end_date (exclusive)
            ) t2
        ), 2
    ), 0) AS avg_completion_time_sec,

    -- Median gap between consecutive completed tasks (seconds)
    COALESCE(ROUND(
        (
            SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gap)::numeric
            FROM (
                SELECT
                    EXTRACT(EPOCH FROM (
                        created_at - LAG(created_at) OVER (PARTITION BY agent_name ORDER BY created_at)
                    )) AS gap
                FROM agent_activity
                WHERE agent_name = r.role
                  AND status = 'completed'
                  AND created_at IS NOT NULL
                  AND created_at >= $1
                  AND created_at <  $2
            ) t3
            WHERE gap IS NOT NULL
        ), 2
    ), 0) AS median_inter_gap_sec

FROM (
    SELECT unnest(ARRAY[
        'strategy',
        'system_architect',
        'backend_engineer',
        'frontend_engineer',
        'integration_engineer',
        'qa',
        'devops',
        'security',
        'data',
        'growth',
        'support_and_monitoring'
    ]) AS role
) r

LEFT JOIN (
    -- Per-role aggregates
    SELECT
        agent_name AS role,
        COUNT(*)                          AS total_tasks,
        COUNT(*) FILTER (WHERE
            status = 'completed'
            AND created_at IS NOT NULL
        )                                 AS completed_tasks
    FROM agent_activity
    WHERE created_at IS NOT NULL
      AND created_at >= $1              -- ← start_date (inclusive)
      AND created_at <  $2              -- ← end_date (exclusive)
    GROUP BY agent_name
) agg ON agg.role = r.role

ORDER BY r.role;


-- ---------------------------------------------------------------------------
-- QUERY 2: Outcome-quality breakdown per role
-- Shows counts of critical/high/medium/low/unknown outcomes grouped by role.
-- ---------------------------------------------------------------------------

SELECT
    agent_name AS agent_role,
    COUNT(*)                                  AS total_tasks,
    COUNT(*) FILTER (WHERE outcome_quality = 'critical')   AS critical_outcomes,
    COUNT(*) FILTER (WHERE outcome_quality = 'high')       AS high_outcomes,
    COUNT(*) FILTER (WHERE outcome_quality = 'medium')     AS medium_outcomes,
    COUNT(*) FILTER (WHERE outcome_quality = 'low')        AS low_outcomes,
    COUNT(*) FILTER (WHERE outcome_quality = 'unknown' OR outcome_quality IS NULL) AS unknown_outcomes,
    CASE
        WHEN COUNT(*) = 0 THEN 0.0
        ELSE ROUND(COUNT(*) FILTER (WHERE outcome_quality = 'critical')::numeric / COUNT(*)::numeric * 100, 2)
    END AS critical_quality_pct,
    CASE
        WHEN COUNT(*) = 0 THEN 0.0
        ELSE ROUND(COUNT(*) FILTER (WHERE outcome_quality = 'high')::numeric / COUNT(*)::numeric * 100, 2)
    END AS high_quality_pct,
    CASE
        WHEN COUNT(*) = 0 THEN 0.0
        ELSE ROUND(COUNT(*) FILTER (WHERE outcome_quality = 'low')::numeric / COUNT(*)::numeric * 100, 2)
    END AS low_quality_pct

FROM agent_activity
WHERE created_at IS NOT NULL
  AND created_at >= $3          -- ← start_date (inclusive)
  AND created_at <  $4          -- ← end_date (exclusive)
GROUP BY agent_name
ORDER BY agent_name;


-- ---------------------------------------------------------------------------
-- QUERY 3: Recent individual activity entries (for drill-down detail pane)
-- Ordered by most recent first. Includes agent_name mapping.
-- ---------------------------------------------------------------------------

SELECT
    id,
    agent_name    AS agent_name,
    objective,
    tools_used,
    outcome_quality,
    correction_applied,
    status,
    created_at
FROM agent_activity
WHERE created_at IS NOT NULL
  AND created_at >= $5          -- ← start_date (inclusive)
  AND created_at <  $6          -- ← end_date (exclusive)
ORDER BY created_at DESC
LIMIT 500;


-- ---------------------------------------------------------------------------
-- QUERY 4: Task-level assignment summary (from tasks table)
-- Counts assigned tasks per agent_role with status breakdown.
-- ---------------------------------------------------------------------------

SELECT
    assigned_agent AS agent_role,
    COUNT(*)                           AS total_assigned_tasks,
    COUNT(*) FILTER (WHERE status = 'backlog')         AS backlog,
    COUNT(*) FILTER (WHERE status = 'active')          AS active,
    COUNT(*) FILTER (WHERE status = 'in_review')       AS in_review,
    COUNT(*) FILTER (WHERE status = 'done')            AS done,
    COUNT(*) FILTER (WHERE status = 'blocked')         AS blocked
FROM tasks
WHERE assigned_agent IS NOT NULL
GROUP BY assigned_agent
ORDER BY assigned_agent;


-- ---------------------------------------------------------------------------
-- NOTES ON EDGE CASES HANDLED
-- ---------------------------------------------------------------------------
-- • Roles with ZERO tasks: LEFT JOIN guarantees a row with total_tasks=0,
--   completed_tasks=0, completion_rate_pct=0, avg/median duration=0.
-- • NULL timestamps: All queries filter `created_at IS NOT NULL` before any
--   aggregation; rows with missing timestamps are excluded silently.
-- • NULL/outcome_quality: Treated separately from known categories; counted
--   in "unknown" bucket. The FILTER predicate fails cleanly for non-matching values.
-- • Division by zero in percentages: Guarded with CASE WHEN count = 0 → 0.0.
-- • Time range boundaries: Inclusive start ($N), exclusive end ($N+1) so
--   sub-day ranges work correctly without off-by-one errors.
-- • COMPLETION DEFINITION: A task is "completed" only if status = 'completed'.
--   This excludes pending, failed, blocked, and other intermediate states.
-- • MEDIAN CALCULATION: Uses PostgreSQL's PERCENTILE_CONT(0.5) for proper
--   median computation rather than simple midpoint averaging.
-- ---------------------------------------------------------------------------
