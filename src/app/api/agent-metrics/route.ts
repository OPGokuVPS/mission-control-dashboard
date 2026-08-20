import { NextResponse } from 'next/server';
import type { AgentRole, OutcomeQuality } from '@/types';
import type {
    AgentPerformanceReport,
    RolePerformanceMetric,
    RoleQualityBreakdown,
    ActivityDetailEntry,
    ThroughputTrendEntry,
} from '@/types/performance';

// ---------------------------------------------------------------------------
// Known agent roles (keeps all-roles completeness in aggregate queries)
// ---------------------------------------------------------------------------
const VALID_ROLES: AgentRole[] = [
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
    'support_and_monitoring',
];

const DEFAULT_LIMIT = 500;

// ---------------------------------------------------------------------------
// GET /api/agent-metrics
//
// Returns structured performance metrics aggregated from:
//   - agent_activity table (per-role aggregates, quality breakdowns, recent feed)
//   - tasks table (assigned-task counts by status per role)
//
// Query params:
//   startDate (ISO-8601, inclusive) — filter created_at >= startDate
//   endDate   (ISO-8601, exclusive) — filter created_at < endDate
//   limit     (integer, default 500) — max recent activities returned
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const startDateParam = url.searchParams.get('startDate');
        const endDateParam = url.searchParams.get('endDate');
        const limit = Math.min(
            parseInt(url.searchParams.get('limit') || String(DEFAULT_LIMIT)),
            10_000 // Supabase REST limit
        );

        const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

        if (!baseUrl || !anonKey) {
            return NextResponse.json(
                { error: 'Missing Supabase credentials' },
                { status: 500 }
            );
        }

        // ------------------------------------------------------------------
        // Resolve time-range shortcut (e.g., "24h", "7d", "30d")
        // ------------------------------------------------------------------
        const timeRangeParam = url.searchParams.get('timeRange');
        const TIME_RANGES: Record<string, number> = {
            '24h': 86_400_000,
            '7d': 604_800_000,
            '30d': 2_592_000_000,
        };

        let effectiveStart: string | null = startDateParam;
        let effectiveEnd: string | null = endDateParam;

        if (!effectiveStart && timeRangeParam && TIME_RANGES[timeRangeParam]) {
            effectiveStart = new Date(Date.now() - TIME_RANGES[timeRangeParam]).toISOString();
        }
        if (!effectiveEnd) {
            effectiveEnd = new Date().toISOString();
        }

        const whereClause = formatDateFilter(effectiveStart, effectiveEnd);

        const headers = {
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
        };

        // =========================================================================
        // DATA FETCHING — parallel requests
        // =========================================================================

        // 1. Fetch all agent_activity rows within time window
        const totalLimit = Math.min(limit * 5, 10_000);
        const activityUrl = `${baseUrl}/rest/v1/agent_activity?select=id,agent_name,agent_role,outcome_quality,status,created_at,objective,tools_used&order=created_at.desc&limit=${totalLimit}${whereClause}`;
        const activityResp = await fetch(activityUrl, { headers });

        if (!activityResp.ok) {
            console.error('Failed fetching agent_activity:', activityResp.status, activityResp.statusText);
            return NextResponse.json(
                { error: 'Failed to fetch agent_activity data' },
                { status: 500 }
            );
        }

        const activities = await activityResp.json() as Array<{
            id: number;
            agent_name: string;
            agent_role?: string;
            outcome_quality?: string | null;
            status: string;
            created_at: string;
            objective?: string;
            tools_used?: unknown[];
        }>;

        // 2. Fetch tasks for cross-reference (assigned_agent → role mapping)
        const tasksUrl = `${baseUrl}/rest/v1/tasks?select=assigned_agent,status&or=(assigned_agent.not.is.null)&limit=1000`;
        const tasksResp = await fetch(tasksUrl, { headers });
        const tasksByAgent: Record<string, { total: number; by_status: Record<string, number> }> = {};

        if (tasksResp.ok) {
            const tasks = await tasksResp.json() as Array<{ assigned_agent: string; status: string }>;
            for (const t of tasks) {
                const role = t.assigned_agent as AgentRole;
                if (!role || !VALID_ROLES.includes(role)) continue;
                if (!tasksByAgent[role]) {
                    tasksByAgent[role] = { total: 0, by_status: {} };
                }
                tasksByAgent[role].total++;
                tasksByAgent[role].by_status[t.status] =
                    (tasksByAgent[role].by_status[t.status] ?? 0) + 1;
            }
        }

        // 3. Fetch recent individual activities for drill-down
        const recentUrl = `${baseUrl}/rest/v1/agent_activity?select=id,agent_name,outcome_quality,correction_applied,status,created_at&order=created_at.desc&limit=${limit}${whereClause}`;
        const recentResp = await fetch(recentUrl, { headers });
        const rawRecentActivities: unknown[] = recentResp.ok ? await recentResp.json() : [];

        // =========================================================================
        // AGGREGATION — client-side since we have the data already
        // =========================================================================

        // --- Group activity records by agent name ---
        const grouped = new Map<string, typeof activities>();
        for (const entry of activities) {
            const key = entry.agent_name;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(entry);
        }

        // --- Compute per-role metrics ---
        const metricsMap = new Map<string, Omit<RolePerformanceMetric, 'agent_role'>>();

        for (const role of VALID_ROLES) {
            const entries = grouped.get(role) ?? [];
            const completedEntries = entries.filter(
                (e) => e.status === 'completed' && e.created_at
            );
            const completedCount = completedEntries.length;
            const totalCount = entries.length;

            const completionRatePct = totalCount > 0
                ? Math.round((completedCount / totalCount) * 10000) / 100
                : 0.0;

            // Average completion time: mean gap between consecutive completed tasks
            // (uses inter-task deltas as proxy for sustained throughput)
            const sortedCompleted = [...completedEntries]
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) as Array<{ created_at: string }>;

            const deltas: number[] = [];
            for (let i = 1; i < sortedCompleted.length; i++) {
                const diff =
                    (new Date(sortedCompleted[i].created_at).getTime() -
                        new Date(sortedCompleted[i - 1].created_at).getTime()) / 1000;
                if (diff >= 0) deltas.push(diff);
            }

            const avgCompletionTimeSec = deltas.length > 0
                ? Math.round(deltas.reduce((s, d) => s + d, 0) / deltas.length * 100) / 100
                : 0.0;

            // Median inter-gap
            const medianInterGapSec = sortedCompleted.length >= 2
                ? computeMedian(deltas)
                : 0.0;

            metricsMap.set(role, {
                total_tasks: totalCount,
                completed_tasks: completedCount,
                completion_rate_pct: completionRatePct,
                avg_completion_time_sec: avgCompletionTimeSec,
                median_inter_gap_sec: medianInterGapSec,
            });
        }

        const metrics: RolePerformanceMetric[] = VALID_ROLES.map((r) => ({
            agent_role: r,
            ...metricsMap.get(r)!,
        }));

        // --- Outcome-quality breakdown ---
        const qualityMap = new Map<string, { critical: number; high: number; medium: number; low: number; unknown: number }>();
        for (const role of VALID_ROLES) {
            qualityMap.set(role, { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 });
        }

        for (const entry of activities) {
            const q = entry.outcome_quality as OutcomeQuality | undefined;
            const bucket = qualityMap.get(entry.agent_name);
            if (bucket && q) {
                if (q === 'critical') bucket.critical++;
                else if (q === 'high') bucket.high++;
                else if (q === 'medium') bucket.medium++;
                else if (q === 'low') bucket.low++;
                else bucket.unknown++;
            }
        }

        const qualityBreakdown: RoleQualityBreakdown[] = [];
        for (const [role, buckets] of qualityMap.entries()) {
            const roleEntries = grouped.get(role) ?? [];
            const total = roleEntries.length;
            if (total === 0) continue;

            qualityBreakdown.push({
                agent_role: role as AgentRole,
                total_tasks: total,
                critical_outcomes: buckets.critical,
                high_outcomes: buckets.high,
                medium_outcomes: buckets.medium,
                low_outcomes: buckets.low,
                unknown_outcomes: buckets.unknown,
                critical_quality_pct: total > 0
                    ? Math.round((buckets.critical / total) * 10000) / 100
                    : 0.0,
                high_quality_pct: total > 0
                    ? Math.round((buckets.high / total) * 10000) / 100
                    : 0.0,
                low_quality_pct: total > 0
                    ? Math.round((buckets.low / total) * 10000) / 100
                    : 0.0,
            });
        }
        qualityBreakdown.sort((a, b) => a.agent_role.localeCompare(b.agent_role));

        // --- Recent activity feed ---
        const recentActivities: ActivityDetailEntry[] = rawRecentActivities
            .map((raw: any) => ({
                id: raw.id,
                agent_name: raw.agent_name as AgentRole,
                objective: raw.objective ?? '',
                tools_used: Array.isArray(raw.tools_used) ? raw.tools_used : [],
                outcome_quality: raw.outcome_quality as OutcomeQuality | undefined,
                correction_applied: raw.correction_applied ?? false,
                status: raw.status,
                created_at: raw.created_at,
            }))
            .filter((a) => a.id !== undefined);

        // =========================================================================
        // THROUGHPUT TRENDS — daily buckets within the time window
        // Group activities by UTC midnight, count total vs completed per day
        // =========================================================================

        // Parse start date and compute the full date range in days
        const startTimeMs = effectiveStart ? new Date(effectiveStart).getTime() : 0;
        const endTimeMs = effectiveEnd ? new Date(effectiveEnd).getTime() : Date.now();
        const totalDays = Math.max(1, Math.ceil((endTimeMs - startTimeMs) / 86_400_000));

        // Bucket activities into daily groups
        const dailyBuckets: Map<string, { total: number; completed: number }> = new Map();

        for (const entry of activities) {
            if (!entry.created_at) continue;
            const entryDate = new Date(entry.created_at);
            // Floor to UTC midnight
            const bucketKey = entryDate.toISOString().slice(0, 10); // "YYYY-MM-DD"
            if (!dailyBuckets.has(bucketKey)) {
                dailyBuckets.set(bucketKey, { total: 0, completed: 0 });
            }
            const bucket = dailyBuckets.get(bucketKey)!;
            bucket.total++;
            if (entry.status === 'completed') {
                bucket.completed++;
            }
        }

        // Build ordered array with zero-fill for missing days
        const throughputTrends: ThroughputTrendEntry[] = [];
        const startDate = new Date(startTimeMs || Date.now() - 7 * 86_400_000);
        startDate.setUTCHours(0, 0, 0, 0);
        const endDateUTC = new Date(endTimeMs);
        endDateUTC.setUTCHours(0, 0, 0, 0);

        for (let d = new Date(startDate); d <= endDateUTC && throughputTrends.length < totalDays + 2; d.setUTCDate(d.getUTCDate() + 1)) {
            const key = d.toISOString().slice(0, 10);
            const data = dailyBuckets.get(key) ?? { total: 0, completed: 0 };
            throughputTrends.push({
                date: `${key}T00:00:00Z`,
                total_activities: data.total,
                completed_activities: data.completed,
                completion_rate_pct: data.total > 0
                    ? Math.round((data.completed / data.total) * 10000) / 100
                    : 0.0,
            });
        }

        // --- Summary statistics ---
        const totalRoles = VALID_ROLES.length;
        const activeRoles = metrics.filter((m) => m.total_tasks > 0).length;
        const totalTasksAll = metrics.reduce((s, m) => s + m.total_tasks, 0);
        const completedAll = metrics.reduce((s, m) => s + m.completed_tasks, 0);
        const overallCompletionRate = totalTasksAll > 0
            ? Math.round((completedAll / totalTasksAll) * 10000) / 100
            : 0.0;

        const nonZeroCompletions = metrics
            .map((m) => m.avg_completion_time_sec)
            .filter((d) => d > 0);

        // Task-level summary across ALL agents
        let totalAssignedTasks = 0;
        const allStatusCounts: Record<string, number> = {};
        for (const role of Object.values(tasksByAgent)) {
            totalAssignedTasks += role.total;
            for (const [status, count] of Object.entries(role.by_status)) {
                allStatusCounts[status] = (allStatusCounts[status] ?? 0) + count;
            }
        }

        const report: AgentPerformanceReport = {
            metrics,
            quality_breakdown: qualityBreakdown,
            recent_activities: recentActivities,
            throughput_trends: throughputTrends,
            summary: {
                total_roles: totalRoles,
                active_roles: activeRoles,
                total_tasks_all_roles: totalTasksAll,
                overall_completion_rate_pct: overallCompletionRate,
                fastest_avg_completion_sec: nonZeroCompletions.length > 0
                    ? Math.round(Math.min(...nonZeroCompletions) * 100) / 100
                    : 0.0,
                slowest_avg_completion_sec: nonZeroCompletions.length > 0
                    ? Math.round(Math.max(...nonZeroCompletions) * 100) / 100
                    : 0.0,
                total_assigned_tasks: totalAssignedTasks,
                tasks_by_status: allStatusCounts,
            },
        };

        return NextResponse.json(report);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('GET /api/agent-metrics exception:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a Supabase WHERE-clause string for date filtering. */
function formatDateFilter(
    startDateParam: string | null,
    endDateParam: string | null
): string {
    const clauses: string[] = [];

    if (startDateParam) {
        const parsed = new Date(startDateParam);
        if (!isNaN(parsed.getTime())) {
            clauses.push(`created_at.gte.${encodeURIComponent(startDateParam)}`);
        }
    }

    if (endDateParam) {
        const parsed = new Date(endDateParam);
        if (!isNaN(parsed.getTime())) {
            clauses.push(`created_at.lt.${encodeURIComponent(endDateParam)}`);
        }
    }

    return clauses.join('&');
}

/** Compute the median of an array of numbers. Returns 0 for empty arrays. */
function computeMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;
    }
    return Math.round(sorted[mid] * 100) / 100;
}
