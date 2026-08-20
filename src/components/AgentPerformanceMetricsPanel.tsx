'use client';

import { useState, useMemo } from 'react';
import { useAgentMetrics } from '@/hooks/useAgentPerformance';
import { CardSkeleton } from '@/components/SkeletonLoader';
import type {
    AgentPerformanceReport,
    RoleQualityBreakdown,
    RolePerformanceMetric,
    ActivityDetailEntry,
    ThroughputTrendEntry,
} from '@/types/performance';
import type { TimeRangePreset } from '@/hooks/useAgentPerformance';

// ===========================================================================
// Constants & helpers
// ===========================================================================

const TIME_RANGE_PRESETS: { label: string; value: TimeRangePreset }[] = [
    { label: 'Last 24h', value: '24h' },
    { label: 'Last 7d', value: '7d' },
    { label: 'Last 30d', value: '30d' },
    { label: 'Custom', value: 'custom' },
];

const ROLE_LABELS: Record<string, string> = {
    strategy: '🎯 Strategy',
    system_architect: '🏗️ Architect',
    backend_engineer: '⚙️ Backend',
    frontend_engineer: '🎨 Frontend',
    integration_engineer: '🔌 Integration',
    qa: '✅ QA',
    devops: '🚀 DevOps',
    security: '🔒 Security',
    data: '📊 Data',
    growth: '📈 Growth',
    support_and_monitoring: '🛟 Support',
};

const QUALITY_EMOJI: Record<string, string> = {
    critical: '🔴', high: '🟢', medium: '🟡', low: '🔵', unknown: '⚪',
};

const QUALITY_BADGE: Record<string, string> = {
    critical: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
    high: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
    medium: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
    low: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    unknown: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300',
};

function formatDuration(seconds: number): string {
    if (seconds <= 0) return '—';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.round(seconds % 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
}

function completionColor(rate: number): string {
    if (rate >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (rate >= 50) return 'text-amber-600 dark:text-amber-400';
    if (rate > 0) return 'text-red-600 dark:text-red-400';
    return 'text-slate-400';
}

// ===========================================================================
// Presentational sub-components
// ===========================================================================

/** Six-column summary stat cards */
function SummaryCards({ summary }: { summary: AgentPerformanceReport['summary'] }) {
    const kpis = [
        { icon: '🤖', label: 'Total Roles', value: String(summary.total_roles), color: 'border-blue-200 dark:border-blue-800', textColor: 'text-blue-700 dark:text-blue-300' },
        { icon: '🔥', label: 'Active Roles', value: String(summary.active_roles), color: 'border-amber-200 dark:border-amber-800', textColor: 'text-amber-700 dark:text-amber-300' },
        { icon: '✅', label: 'Completion', value: `${summary.overall_completion_rate_pct}%`, color: 'border-emerald-200 dark:border-emerald-800', textColor: 'text-emerald-700 dark:text-emerald-300' },
        { icon: '📋', label: 'Activities', value: String(summary.total_tasks_all_roles), color: 'border-purple-200 dark:border-purple-800', textColor: 'text-purple-700 dark:text-purple-300' },
        { icon: '⚡', label: 'Fastest Avg', value: formatDuration(summary.fastest_avg_completion_sec), color: 'border-cyan-200 dark:border-cyan-800', textColor: 'text-cyan-700 dark:text-cyan-300' },
        { icon: '🐢', label: 'Slowest Avg', value: formatDuration(summary.slowest_avg_completion_sec), color: 'border-orange-200 dark:border-orange-800', textColor: 'text-orange-700 dark:text-orange-300' },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {kpis.map((kpi) => (
                <div key={kpi.label} className={`bg-white dark:bg-slate-800 border ${kpi.color} rounded-xl p-4 transition-all hover:shadow-md`}>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{kpi.icon}</span>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{kpi.label}</span>
                    </div>
                    <div className={`text-xl sm:text-2xl font-bold ${kpi.textColor}`}>{kpi.value}</div>
                </div>
            ))}
        </div>
    );
}

/** Stacked quality bar for a single role — accepts optional RoleQualityBreakdown */
function QualityBar({ breakdown }: { breakdown: RoleQualityBreakdown | undefined }) {
    if (!breakdown || breakdown.total_tasks === 0) {
        return <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full" />;
    }

    const total = breakdown.total_tasks;
    const segments = [
        { key: 'critical', count: breakdown.critical_outcomes, color: 'bg-violet-500' },
        { key: 'high', count: breakdown.high_outcomes, color: 'bg-emerald-500' },
        { key: 'medium', count: breakdown.medium_outcomes, color: 'bg-amber-500' },
        { key: 'low', count: breakdown.low_outcomes, color: 'bg-red-500' },
        { key: 'unknown', count: breakdown.unknown_outcomes, color: 'bg-slate-400' },
    ].filter((s) => s.count > 0);

    return (
        <div className="relative w-full h-3 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-700">
            {segments.map((seg) => {
                const pct = (seg.count / total) * 100;
                return (
                    <div key={seg.key} className={`${seg.color} h-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                        title={`${QUALITY_EMOJI[seg.key] || ''} ${seg.key}: ${seg.count} (${pct.toFixed(1)}%)`} />
                );
            })}
        </div>
    );
}

/**
 * Throughput Trend Chart — SVG bar chart with completion rate overlay.
 * Pure CSS + SVG, no external chart library required.
 */
function ThroughputChart({ trends }: { trends: ThroughputTrendEntry[] }) {
    if (!trends || trends.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center">
                <p className="text-sm text-slate-400">No throughput data available yet.</p>
            </div>
        );
    }

    // --- Compute layout metrics ---
    const maxVal = Math.max(...trends.map((t) => t.total_activities), 1);
    const chartWidth = 800;
    const chartHeight = 220;
    const padding = { top: 30, right: 20, bottom: 50, left: 50 };
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    // Limit visible bars to avoid crowding (>60 days → sample every Nth day)
    const MAX_VISIBLE_BARS = 60;
    let displayTrends = trends;
    let samplingFactor = 1;
    if (trends.length > MAX_VISIBLE_BARS) {
        samplingFactor = Math.ceil(trends.length / MAX_VISIBLE_BARS);
        displayTrends = trends.filter((_, i) => i % samplingFactor === 0);
    }

    const barGap = Math.max(1, Math.min(4, innerWidth / displayTrends.length / 6));
    const barWidth = Math.max(2, (innerWidth - barGap * displayTrends.length) / displayTrends.length);

    // Format short labels
    function shortDate(dateStr: string): string {
        const d = new Date(dateStr);
        return `${d.getMonth() + 1}/${d.getDate()}`;
    }

    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">📊 Throughput Trends</h3>
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                        <span className="inline-block w-3 h-3 rounded-sm bg-indigo-500" />
                        Total Activities
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="inline-block w-3 h-3 rounded-sm bg-emerald-400" />
                        Completed
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="inline-block w-3 h-[1px] bg-amber-500" />
                        Completion Rate
                    </span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full min-w-[600px]"
                    style={{ maxHeight: '320px' }}
                    role="img"
                    aria-label="Throughput trend chart showing daily activity totals and completion rates"
                >
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                        const y = padding.top + innerHeight * (1 - frac);
                        return (
                            <g key={frac}>
                                <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y}
                                    stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth={1} strokeDasharray={frac === 0 ? 'none' : '4,4'} />
                                <text x={padding.left - 8} y={y + 4} textAnchor="end"
                                    className="fill-slate-400 text-[10px]" fontSize="10">{Math.round(frac * maxVal)}</text>
                            </g>
                        );
                    })}

                    {/* Bars — total activities (background) */}
                    {displayTrends.map((trend, i) => {
                        const x = padding.left + i * (barWidth + barGap);
                        const barH = (trend.total_activities / maxVal) * innerHeight;
                        const y = padding.top + innerHeight - barH;
                        return (
                            <rect key={trend.date} x={x} y={y} width={barWidth} height={barH}
                                rx={Math.min(2, barWidth / 2)}
                                className="fill-indigo-400 dark:fill-indigo-500"
                                opacity={trend.completed_activities === trend.total_activities ? 0.9 : 0.6}
                            >
                                <title>{`${trend.date}: ${trend.total_activities} activities (${trend.completion_rate_pct}% completed)`}</title>
                            </rect>
                        );
                    })}

                    {/* Bars — completed activities (foreground, shorter) */}
                    {displayTrends.map((trend, i) => {
                        const completedH = trend.total_activities > 0
                            ? (trend.completed_activities / trend.total_activities) * ((trend.total_activities / maxVal) * innerHeight)
                            : 0;
                        const x = padding.left + i * (barWidth + barGap);
                        const y = padding.top + innerHeight - completedH;
                        return (
                            <rect key={`${trend.date}-done`} x={x} y={y} width={barWidth} height={completedH}
                                rx={Math.min(2, barWidth / 2)}
                                className="fill-emerald-400 dark:fill-emerald-500"
                            >
                                <title>{`${trend.date}: ${trend.completed_activities} completed`}</title>
                            </rect>
                        );
                    })}

                    /* Line — completion rate (%) */
                    <polyline
                        points={displayTrends.map((trend, i) => {
                            const x = padding.left + i * (barWidth + barGap) + barWidth / 2;
                            const rateY = padding.top + innerHeight * (1 - trend.completion_rate_pct / 100);
                            return `${x},${rateY}`;
                        }).join(' ')}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* X-axis labels */}
                    {displayTrends.map((trend, i) => {
                        const x = padding.left + i * (barWidth + barGap) + barWidth / 2;
                        // Show every 3rd label or first/last
                        const showLabel = i === 0 || i === displayTrends.length - 1 || i % Math.max(1, Math.floor(displayTrends.length / 10)) === 0;
                        if (!showLabel) return null;
                        return (
                            <text key={`label-${i}`} x={x} y={chartHeight - padding.bottom + 16}
                                textAnchor="middle" className="fill-slate-400" fontSize="9"
                                transform={`rotate(-30, ${x}, ${chartHeight - padding.bottom + 16})`}>
                                {shortDate(trend.date)}
                            </text>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}

// ===========================================================================
// Main Panel Component
// ===========================================================================

export function AgentPerformanceMetricsPanel() {
    const [activeTimeRange, setActiveTimeRange] = useState<TimeRangePreset>('7d');
    const [customStartDate, setCustomStartDate] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().slice(0, 10);
    });
    const [customEndDate, setCustomEndDate] = useState<string>(() => {
        return new Date().toISOString().slice(0, 10);
    });

    // When switching away from custom, reset dates to sensible defaults
    const handleTimeRangeChange = (value: TimeRangePreset) => {
        setActiveTimeRange(value);
        if (value === 'custom') {
            // Reset to last 7 days as defaults
            const d = new Date();
            d.setDate(d.getDate() - 7);
            setCustomStartDate(d.toISOString().slice(0, 10));
            setCustomEndDate(new Date().toISOString().slice(0, 10));
        }
    };

    // Build effective time-range for the hook when custom is active
    const customRange = activeTimeRange === 'custom'
        ? { startDate: `${customStartDate}T00:00:00Z`, endDate: `${customEndDate}T23:59:59Z` }
        : undefined;

    const { data, isLoading, error } = useAgentMetrics(activeTimeRange !== 'custom' ? activeTimeRange : customRange);

    // Memoised quality lookup
    const qualityMap = useMemo(() => {
        const map = new Map<string, RoleQualityBreakdown>();
        for (const qb of data?.quality_breakdown ?? []) {
            map.set(qb.agent_role, qb);
        }
        return map;
    }, [data?.quality_breakdown]);

    // Fastest active role
    const fastestRole = useMemo(() => {
        const active = data?.metrics.filter((m) => m.avg_completion_time_sec > 0) ?? [];
        if (active.length === 0) return null;
        return active.reduce((a, b) => (a.avg_completion_time_sec < b.avg_completion_time_sec ? a : b));
    }, [data?.metrics]);

    /* ─── Error State ─── */
    if (error) {
        return (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">📊 Agent Performance Metrics</h2>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
                    <p className="text-red-600 dark:text-red-400 font-medium">Failed to load performance metrics</p>
                    <p className="text-sm text-red-500 dark:text-red-400 mt-1">{String(error)}</p>
                </div>
            </div>
        );
    }

    /* ─── Loading State ─── */
    if (isLoading) {
        return (
            <div className="space-y-4">
                <CardSkeleton className="bg-white dark:bg-slate-800 border rounded-xl p-4" />
                <CardSkeleton className="bg-white dark:bg-slate-800 border rounded-xl p-4" />
                <CardSkeleton className="bg-white dark:bg-slate-800 border rounded-xl p-4" />
            </div>
        );
    }

    /* ─── Empty State ─── */
    if (!data) {
        return (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">📊 Agent Performance Metrics</h2>
                <div className="text-center py-12 text-slate-400">No metrics data available yet.</div>
            </div>
        );
    }

    const metrics = data.metrics as RolePerformanceMetric[];
    const summary = data.summary;

    /* ─── Loaded State ─── */
    return (
        <div className="space-y-6">
            {/* ═══ Header + Time Range Selector ═══ */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">📊 Agent Performance Metrics</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Aggregated from agent_activity · Auto-refreshes every 5s
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                        {TIME_RANGE_PRESETS.map((preset) => (
                            <button
                                key={preset.value}
                                onClick={() => handleTimeRangeChange(preset.value)}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                    activeTimeRange === preset.value
                                        ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                    {activeTimeRange === 'custom' && (
                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg px-2 py-1">
                            <label htmlFor="cp-start" className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">From:</label>
                            <input
                                id="cp-start"
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="text-xs bg-transparent border border-slate-300 dark:border-slate-600 rounded px-1.5 py-0.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-500"
                            />
                            <span className="text-xs text-slate-400 mx-0.5 hidden sm:inline">→</span>
                            <label htmlFor="cp-end" className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">To:</label>
                            <input
                                id="cp-end"
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="text-xs bg-transparent border border-slate-300 dark:border-slate-600 rounded px-1.5 py-0.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-500"
                            />
                        </div>
                    )}
                    <span className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 ml-2">
                        <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        Live
                    </span>
                </div>
            </div>

            {/* ═══ Summary KPI Cards ═══ */}
            <SummaryCards summary={summary} />

            {/* ═══ Quick Insight Strip ═══ */}
            {fastestRole && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 flex items-center gap-3">
                    <span className="text-xl">⚡</span>
                    <span className="text-sm text-emerald-800 dark:text-emerald-200">
                        <strong>{ROLE_LABELS[fastestRole.agent_role] || fastestRole.agent_role}</strong> leads with the fastest average inter-task gap ({formatDuration(fastestRole.avg_completion_time_sec)}).
                    </span>
                </div>
            )}

            {/* ═══ Throughput Trend Chart ═══ */}
            <ThroughputChart trends={data.throughput_trends ?? []} />

            {/* ═══ Per-Role Performance Table (Desktop) + Cards (Mobile) ═══ */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">📈 Performance Breakdown by Role</h3>
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                <th className="px-4 py-3">Role</th>
                                <th className="px-4 py-3 text-center">Tasks</th>
                                <th className="px-4 py-3 text-center">Completed</th>
                                <th className="px-4 py-3 text-center">Rate</th>
                                <th className="px-4 py-3 text-center">Avg Completion</th>
                                <th className="px-4 py-3 text-center">Median Gap</th>
                                <th className="px-4 py-3 min-w-[180px]">Quality</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {metrics.map((metric) => {
                                const q = qualityMap.get(metric.agent_role);
                                return (
                                    <tr key={metric.agent_role} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span>{ROLE_LABELS[metric.agent_role]?.split(' ')[0]}</span>
                                                <span className="text-xs text-slate-400 hidden lg:inline font-normal">
                                                    {ROLE_LABELS[metric.agent_role] || metric.agent_role}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">{metric.total_tasks}</td>
                                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">{metric.completed_tasks}</td>
                                        <td className={`px-4 py-3 text-center font-semibold ${completionColor(metric.completion_rate_pct)}`}>
                                            {metric.completion_rate_pct.toFixed(1)}%
                                        </td>
                                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">
                                            {formatDuration(metric.avg_completion_time_sec)}
                                        </td>
                                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">
                                            {formatDuration(metric.median_inter_gap_sec)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-xs text-slate-400 mb-1">
                                                {q
                                                    ? `${q.high_outcomes}⭐ ${q.medium_outcomes}👍 ${q.low_outcomes}📉`
                                                    : '—'}
                                            </div>
                                            <QualityBar breakdown={q} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
                    {metrics.map((metric) => {
                        const q = qualityMap.get(metric.agent_role);
                        return (
                            <div key={metric.agent_role} className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold text-slate-900 dark:text-white">
                                        {ROLE_LABELS[metric.agent_role] || metric.agent_role}
                                    </span>
                                    <span className={`font-bold ${completionColor(metric.completion_rate_pct)}`}>
                                        {metric.completion_rate_pct.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                    <span className="text-slate-500 dark:text-slate-400">Total tasks:</span>
                                    <span className="text-slate-900 dark:text-white text-right">{metric.total_tasks}</span>
                                    <span className="text-slate-500 dark:text-slate-400">Completed:</span>
                                    <span className="text-slate-900 dark:text-white text-right">{metric.completed_tasks}</span>
                                    <span className="text-slate-500 dark:text-slate-400">Avg completion:</span>
                                    <span className="text-slate-900 dark:text-white text-right">{formatDuration(metric.avg_completion_time_sec)}</span>
                                    <span className="text-slate-500 dark:text-slate-400">Median gap:</span>
                                    <span className="text-slate-900 dark:text-white text-right">{formatDuration(metric.median_inter_gap_sec)}</span>
                                </div>
                                <QualityBar breakdown={q} />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
