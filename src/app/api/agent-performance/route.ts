import { NextResponse } from 'next/server';
import type { AgentRole, OutcomeQuality } from '@/types';
import type {
    AgentPerformanceReport,
    RolePerformanceMetric,
    RoleQualityBreakdown,
    ActivityDetailEntry,
} from '@/types/performance';

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
// GET /api/agent-performance (legacy alias — delegates to same logic)
// Returns structured performance metrics aggregated from agent_activity
// Query params: startDate (ISO-8601, inclusive), endDate (exclusive), limit
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const startDateParam = url.searchParams.get('startDate');
        const endDateParam = url.searchParams.get('endDate');
        const limit = Math.min(
            parseInt(url.searchParams.get('limit') || String(DEFAULT_LIMIT)),
            10_000
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

        // Use resolved ISO dates for filtering
        const whereClause = formatDateFilter(effectiveStart, effectiveEnd);

        const headers = {
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
        };
        const totalLimit = Math.min(limit * 5, 10_000);

        // Fetch all activity rows within filter window
        const activityResp = await fetch(
            `${baseUrl}/rest/v1/agent_activity?select=id,agent_name,agent_role,outcome_quality,status,created_at&order=created_at.desc&limit=${totalLimit}${whereClause}`,
            { headers }
        );

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
        }>;

        // --- Per-role aggregates ---
        const grouped = new Map<string, typeof activities>();
        for (const entry of activities) {
            const key = entry.agent_name;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(entry);
        }

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

            // Average inter-task gap among completed records (proxy for throughput)
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

        // --- Quality breakdown ---
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

        // --- Recent individual entries ---
        const recentUrl = `${baseUrl}/rest/v1/agent_activity?select=id,agent_name,outcome_quality,correction_applied,status,created_at&order=created_at.desc&limit=${limit}${whereClause}`;
        const recentResp = await fetch(recentUrl, { headers });
        const rawRecent = recentResp.ok ? await recentResp.json() : [];
        const recentActivities: ActivityDetailEntry[] = rawRecent
            .map((r: any) => ({
                id: r.id,
                agent_name: r.agent_name as AgentRole,
                objective: r.objective ?? '',
                tools_used: Array.isArray(r.tools_used) ? r.tools_used : [],
                outcome_quality: r.outcome_quality as OutcomeQuality | undefined,
                correction_applied: r.correction_applied ?? false,
                status: r.status,
                created_at: r.created_at,
            }))
            .filter((a: ActivityDetailEntry) => a.id !== undefined);

        // --- Summary ---
        const totalRoles = VALID_ROLES.length;
        const activeRoles = metrics.filter((m) => m.total_tasks > 0).length;
        const totalTasksAll = metrics.reduce((s, m) => s + m.total_tasks, 0);
        const completedAll = metrics.reduce((s, m) => s + m.completed_tasks, 0);
        const overallCompletionRate = totalTasksAll > 0
            ? Math.round((completedAll / totalTasksAll) * 10000) / 100
            : 0.0;
        const nonZero = metrics.map((m) => m.avg_completion_time_sec).filter((d) => d > 0);

        const report: AgentPerformanceReport = {
            metrics,
            quality_breakdown: qualityBreakdown,
            recent_activities: recentActivities,
            summary: {
                total_roles: totalRoles,
                active_roles: activeRoles,
                total_tasks_all_roles: totalTasksAll,
                overall_completion_rate_pct: overallCompletionRate,
                fastest_avg_completion_sec: nonZero.length > 0
                    ? Math.round(Math.min(...nonZero) * 100) / 100
                    : 0.0,
                slowest_avg_completion_sec: nonZero.length > 0
                    ? Math.round(Math.max(...nonZero) * 100) / 100
                    : 0.0,
                total_assigned_tasks: 0,
                tasks_by_status: {},
            },
        };

        return NextResponse.json(report);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('GET /api/agent-performance exception:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/** Build Supabase WHERE-clause for date filtering. */
function formatDateFilter(start: string | null, end: string | null): string {
    const clauses: string[] = [];
    if (start) {
        const p = new Date(start);
        if (!isNaN(p.getTime())) clauses.push(`created_at.gte.${encodeURIComponent(start)}`);
    }
    if (end) {
        const p = new Date(end);
        if (!isNaN(p.getTime())) clauses.push(`created_at.lt.${encodeURIComponent(end)}`);
    }
    return clauses.join('&');
}

/** Compute median of an array of numbers. */
function computeMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;
    }
    return Math.round(sorted[mid] * 100) / 100;
}
