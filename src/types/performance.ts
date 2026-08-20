/**
 * Types for agent performance metrics aggregation dashboard panel.
 */

import type { AgentRole } from '@/types';

/** Possible outcome quality values (matches actual DB enum). */
export type OutcomeQuality = 'critical' | 'high' | 'medium' | 'low' | 'unknown';

/** A single role's aggregate metrics row. */
export interface RolePerformanceMetric {
    /** The agent role (one of AGENT_ROLES). */
    agent_role: AgentRole;
    /** Total activity records in the time window. */
    total_tasks: number;
    /** Activities whose status is 'completed' (not pending/failed/blocked). */
    completed_tasks: number;
    /** Completion rate as a percentage 0..100. */
    completion_rate_pct: number;
    /** Average wall-clock seconds from created_at to first completed record per role. */
    avg_completion_time_sec: number;
    /** Median inter-task gap in seconds (proxy for sustained throughput). */
    median_inter_gap_sec: number;
}

/** Outcome-quality breakdown per role. */
export interface RoleQualityBreakdown {
    agent_role: AgentRole;
    total_tasks: number;
    critical_outcomes: number;
    high_outcomes: number;
    medium_outcomes: number;
    low_outcomes: number;
    unknown_outcomes: number;
    critical_quality_pct: number;
    high_quality_pct: number;
    low_quality_pct: number;
}

/** Individual activity entry for drill-down detail pane. */
export interface ActivityDetailEntry {
    id: number;
    /** The agent_name field from agent_activity (same as role in practice). */
    agent_name: AgentRole;
    objective: string;
    tools_used?: string[];
    outcome_quality?: OutcomeQuality;
    correction_applied?: boolean;
    status: string;
    created_at: string;
}

/** Time-range filter accepted by the query parameter interface. */
export interface PerformanceTimeRange {
    /** Inclusive start (ISO-8601 string or Date, e.g. "2025-01-01T00:00:00Z"). */
    startDate: string | null;
    /** Exclusive end (null = defaults to current UTC time). */
    endDate: string | null;
}

/** Combined response envelope returned by the performance API. */
export interface AgentPerformanceReport {
    /** Primary per-role metrics rows (includes ALL roles). */
    metrics: RolePerformanceMetric[];
    /** Secondary outcome-quality breakdown per role (only roles with data). */
    quality_breakdown: RoleQualityBreakdown[];
    /** Recent individual entries for drill-down. */
    recent_activities: ActivityDetailEntry[];
    /** Summary statistics computed from the metrics array. */
    summary: {
        total_roles: number;
        active_roles: number;
        total_tasks_all_roles: number;
        overall_completion_rate_pct: number;
        fastest_avg_completion_sec: number;
        slowest_avg_completion_sec: number;
        /* Task-level aggregates from the tasks table. */
        total_assigned_tasks: number;
        tasks_by_status: Record<string, number>;
    };
}
