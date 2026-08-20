import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import * as QUERY_KEYS from '@/lib/query-keys';
import type { AgentPerformanceReport, PerformanceTimeRange } from '@/types/performance';

/** Relative time-range presets accepted by the UI. 'custom' means explicit dates via custom range picker. */
export type TimeRangePreset = '24h' | '7d' | '30d' | 'custom';

/** Default fetch interval (5s). */
const DEFAULT_POLL_INTERVAL = 5_000;

/** Convert preset to ISO-date range. Throws for 'custom' (handled via explicit date params). */
function presetToDates(preset: TimeRangePreset): PerformanceTimeRange {
    if (preset === 'custom') {
        // Custom dates are passed directly; this branch is never hit when custom is used.
        // Return last 7 days as a safe fallback.
        const elapsed = 604_800_000;
        return {
            startDate: new Date(Date.now() - elapsed).toISOString(),
            endDate: new Date().toISOString(),
        };
    }
    const ms: Record<TimeRangePreset, number> = {
        '24h': 86_400_000,
        '7d': 604_800_000,
        '30d': 2_592_000_000,
        'custom': 604_800_000, // fallback — always overridden by explicit dates
    };
    const elapsed = ms[preset];
    return {
        startDate: new Date(Date.now() - elapsed).toISOString(),
        endDate: new Date().toISOString(),
    };
}

/** Resolve the effective time-range from either a preset or explicit dates. */
function resolveTimeRange(timeRange?: TimeRangePreset | PerformanceTimeRange): Required<PerformanceTimeRange> {
    if (!timeRange) return { startDate: null, endDate: null };
    if (typeof timeRange === 'string') return presetToDates(timeRange);
    return { startDate: timeRange.startDate, endDate: timeRange.endDate };
}

// ---------------------------------------------------------------------------
// useAgentMetrics — primary hook for /api/agent-metrics
// Fetches comprehensive agent performance metrics with caching.
// Accepts either a time-range preset ("24h"|"7d"|"30d") or explicit ISO dates.
// ---------------------------------------------------------------------------

export function useAgentMetrics(
    timeRange?: TimeRangePreset | PerformanceTimeRange,
    enabled: boolean = true
) {
    const resolved = resolveTimeRange(timeRange);
    const params = buildSearchParams(resolved);

    return useQuery({
        queryKey: QUERY_KEYS.agentPerformance.metrics(resolved),
        queryFn: async () => {
            const resp = await fetch(`/api/agent-metrics?${params}`);
            if (!resp.ok) {
                throw new Error(`Agent Metrics API error: ${resp.status} ${resp.statusText}`);
            }
            return resp.json() as Promise<AgentPerformanceReport>;
        },
        staleTime: DEFAULT_POLL_INTERVAL,
        refetchInterval: DEFAULT_POLL_INTERVAL,
        enabled,
        retry: 2,
        retryDelay: 1000,
    });
}

// ---------------------------------------------------------------------------
// useAgentMetricsSuspended — suspense-aware variant
// ---------------------------------------------------------------------------

export function useAgentMetricsSuspended(
    timeRange?: TimeRangePreset | PerformanceTimeRange
) {
    const resolved = resolveTimeRange(timeRange);
    const params = buildSearchParams(resolved);

    return useSuspenseQuery({
        queryKey: QUERY_KEYS.agentPerformance.metrics(resolved),
        queryFn: async () => {
            const resp = await fetch(`/api/agent-metrics?${params}`);
            if (!resp.ok) {
                throw new Error(`Agent Metrics API error: ${resp.status} ${resp.statusText}`);
            }
            return resp.json() as Promise<AgentPerformanceReport>;
        },
        staleTime: DEFAULT_POLL_INTERVAL,
        refetchInterval: DEFAULT_POLL_INTERVAL,
        retry: 2,
        retryDelay: 1000,
    });
}

// ---------------------------------------------------------------------------
// Legacy aliases — keep backward-compat for existing imports
// ---------------------------------------------------------------------------

export const useAgentPerformance = useAgentMetrics;
export const useAgentPerformanceSuspended = useAgentMetricsSuspended;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSearchParams(range: Required<PerformanceTimeRange>): string {
    const parts: string[] = [];
    if (range.startDate) parts.push(`startDate=${encodeURIComponent(range.startDate)}`);
    if (range.endDate) parts.push(`endDate=${encodeURIComponent(range.endDate)}`);
    return parts.join('&');
}
