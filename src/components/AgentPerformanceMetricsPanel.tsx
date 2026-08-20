'use client';

import { useAgentMetrics } from '@/hooks/useAgentPerformance';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import type { AgentPerformanceReport, RolePerformanceMetric, RoleQualityBreakdown, ActivityDetailEntry } from '@/types/performance';

// ---------------------------------------------------------------------------
// Labels & formatting helpers
// ---------------------------------------------------------------------------

const AGENT_LABELS: Record<string, string> = {
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
    critical: '🔴',
    high: '🟢',
    medium: '🟡',
    low: '🔵',
    unknown: '⚪',
};

const QUALITY_COLORS: Record<string, string> = {
    critical: 'bg-red-500 dark:bg-red-600',
    high: 'bg-emerald-500 dark:bg-emerald-600',
    medium: 'bg-yellow-500 dark:bg-yellow-600',
    low: 'bg-blue-500 dark:bg-blue-600',
    unknown: 'bg-gray-300 dark:bg-gray-600',
};

const QUALITY_TEXT_COLORS: Record<string, string> = {
    critical: 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40',
    high: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40',
    medium: 'text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/40',
    low: 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40',
    unknown: 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800',
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AgentPerformanceMetricsPanel() {
    const { data, isLoading, error } = useAgentMetrics();

    if (error) {
        return (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">📊 Agent Performance Metrics</h2>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
                    <p className="text-red-600 dark:text-red-400 font-medium">Failed to load performance metrics</p>
                    <p className="text-sm text-red-500 dark:text-red-400 mt-1">{(error as Error).message}</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-4">
                <SkeletonLoader lines={1} className="bg-white dark:bg-slate-800 border rounded-xl p-4" />
                <SkeletonLoader lines={1} className="bg-white dark:bg-slate-800 border rounded-xl p-4" />
                <SkeletonLoader lines={5} className="bg-white dark:bg-slate-800 border rounded-xl p-4" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ===== Header ===== */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">📊 Agent Performance Metrics</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Aggregated across all agent roles · Auto-updates every 5s
                    </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    Live
                </div>
            </div>

            {/* ===== Summary KPI Cards ===== */}
            {data && (
                <SummaryCards summary={data.summary} />
            )}

            {/* ===== Section 1: Completion Rate Per Role ===== */}
            {data && <CompletionRateSection metrics={data.metrics} />}

            {/* ===== Section 2: Average Completion Time ===== */}
            {data && <CompletionTimeSection metrics={data.metrics} />}

            {/* ===== Section 3: Quality Distribution ===== */}
            {data && <QualityDistributionSection qualityBreakdown={data.quality_breakdown} />}

            {/* ===== Section 4: Recent Activity Feed ===== */}
            {data && <RecentActivitySection recentActivities={data.recent_activities} />}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Summary KPI Cards
// ---------------------------------------------------------------------------

function SummaryCards({ summary }: { summary: AgentPerformanceReport['summary'] }) {
    const kpis = [
        {
            label: 'Total Roles',
            value: summary.total_roles,
            icon: '🤖',
            color: 'border-blue-200 dark:border-blue-800',
            textColor: 'text-blue-700 dark:text-blue-300',
        },
        {
            label: 'Active Roles',
            value: summary.active_roles,
            icon: '🔥',
            color: 'border-amber-200 dark:border-amber-800',
            textColor: 'text-amber-700 dark:text-amber-300',
        },
        {
            label: 'Overall Completion',
            value: `${summary.overall_completion_rate_pct}%`,
            icon: '✅',
            color: 'border-emerald-200 dark:border-emerald-800',
            textColor: 'text-emerald-700 dark:text-emerald-300',
        },
        {
            label: 'Total Activities',
            value: summary.total_tasks_all_roles,
            icon: '📋',
            color: 'border-purple-200 dark:border-purple-800',
            textColor: 'text-purple-700 dark:text-purple-300',
        },
        {
            label: 'Fastest Avg',
            value: formatDuration(summary.fastest_avg_completion_sec),
            icon: '⚡',
            color: 'border-cyan-200 dark:border-cyan-800',
            textColor: 'text-cyan-700 dark:text-cyan-300',
        },
        {
            label: 'Slowest Avg',
            value: formatDuration(summary.slowest_avg_completion_sec),
            icon: '🐢',
            color: 'border-orange-200 dark:border-orange-800',
            textColor: 'text-orange-700 dark:text-orange-300',
        },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {kpis.map((kpi) => (
                <div
                    key={kpi.label}
                    className={`bg-white dark:bg-slate-800 border ${kpi.color} rounded-xl p-4 transition-all hover:shadow-md`}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{kpi.icon}</span>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {kpi.label}
                        </span>
                    </div>
                    <div className={`text-xl sm:text-2xl font-bold ${kpi.textColor}`}>
                        {kpi.value}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Section 1: Completion Rate Per Role
// ---------------------------------------------------------------------------

function CompletionRateSection({ metrics }: { metrics: RolePerformanceMetric[] }) {
    // Sort by completion rate descending (only show roles with data)
    const ranked = [...metrics].filter((m) => m.total_tasks > 0).sort((a, b) => b.completion_rate_pct - a.completion_rate_pct);

    if (ranked.length === 0) {
        return (
        <MetricCard title="Completion Rate Per Role">
            <div className="text-center py-8 text-slate-400">No activity data yet.</div>
        </MetricCard>
        );
    }

    return (
        <MetricCard title="Completion Rate Per Role">
            <div className="space-y-3">
                {ranked.map((metric) => {
                    const pct = metric.completion_rate_pct;
                    const statusColor = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-yellow-500' : pct > 0 ? 'bg-red-500' : 'bg-gray-300';
                    return (
                        <div key={metric.agent_role} className="group">
                            <div className="flex items-center justify-between text-sm mb-1">
                                <span className="font-medium text-slate-700 dark:text-slate-300 min-w-0 flex-1 truncate mr-2">
                                    {AGENT_LABELS[metric.agent_role] || metric.agent_role}
                                </span>
                                <span className="text-xs text-slate-400 shrink-0 mr-2">
                                    {metric.completed_tasks}/{metric.total_tasks} tasks
                                </span>
                                <span className={`font-bold shrink-0 tabular-nums ${
                                    pct >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                                    pct >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                                    pct > 0 ? 'text-red-600 dark:text-red-400' :
                                    'text-slate-400'
                                }`}>
                                    {pct.toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className={`${statusColor} h-full rounded-full transition-all duration-700 ease-out`}
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                    role="progressbar"
                                    aria-valuenow={pct}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </MetricCard>
    );
}

// ---------------------------------------------------------------------------
// Section 2: Average Completion Time
// ---------------------------------------------------------------------------

function CompletionTimeSection({ metrics }: { metrics: RolePerformanceMetric[] }) {
    // Sort by avg completion time ascending (fastest first), only roles with data
    const ranked = [...metrics].filter((m) => m.total_tasks > 0).sort((a, b) => a.avg_completion_time_sec - b.avg_completion_time_sec);

    if (ranked.length === 0) {
        return (
        <MetricCard title="Average Completion Time">
            <div className="text-center py-8 text-slate-400">No timing data available.</div>
        </MetricCard>
        );
    }

    // Find max for scaling
    const maxTime = Math.max(...ranked.map((m) => m.avg_completion_time_sec), 1);

    return (
        <MetricCard title="Average Completion Time (Inter-task Gap)">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                            <th className="text-left py-2 pr-4 text-slate-500 dark:text-slate-400 font-medium">Role</th>
                            <th className="text-right py-2 pr-4 text-slate-500 dark:text-slate-400 font-medium">Avg (sec)</th>
                            <th className="text-right py-2 pr-4 text-slate-500 dark:text-slate-400 font-medium">Median (sec)</th>
                            <th className="text-right py-2 text-slate-500 dark:text-slate-400 font-medium">Tasks</th>
                            <th className="text-left py-2 pl-4 text-slate-500 dark:text-slate-400 font-medium w-1/3">Relative Speed</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {ranked.map((metric) => {
                            const barWidth = (metric.avg_completion_time_sec / maxTime) * 100;
                            const isFast = metric.avg_completion_time_sec <= (maxTime * 0.5);
                            return (
                                <tr key={metric.agent_role} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="py-2 pr-4">
                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                            {AGENT_LABELS[metric.agent_role] || metric.agent_role}
                                        </span>
                                    </td>
                                    <td className={`py-2 pr-4 text-right tabular-nums font-mono ${isFast ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {formatDuration(metric.avg_completion_time_sec)}
                                    </td>
                                    <td className="py-2 pr-4 text-right tabular-nums font-mono text-slate-600 dark:text-slate-400">
                                        {formatDuration(metric.median_inter_gap_sec)}
                                    </td>
                                    <td className="py-2 pr-4 text-right tabular-nums text-slate-600 dark:text-slate-400">
                                        {metric.total_tasks}
                                    </td>
                                    <td className="py-2 pl-4">
                                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className={`${isFast ? 'bg-emerald-500' : 'bg-blue-500'} h-full rounded-full`}
                                                style={{ width: `${barWidth}%` }}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </MetricCard>
    );
}

// ---------------------------------------------------------------------------
// Section 3: Quality Distribution
// ---------------------------------------------------------------------------

function QualityDistributionSection({ qualityBreakdown }: { qualityBreakdown: RoleQualityBreakdown[] }) {
    if (qualityBreakdown.length === 0) {
        return (
        <MetricCard title="Outcome Quality Distribution">
            <div className="text-center py-8 text-slate-400">No quality data available.</div>
        </MetricCard>
        );
    }

    return (
        <MetricCard title="Outcome Quality Distribution">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                            <th className="text-left py-2 pr-4 text-slate-500 dark:text-slate-400 font-medium">Role</th>
                            <th className="text-right py-2 pr-2 text-slate-500 dark:text-slate-400 font-medium">Total</th>
                            <th className="text-center py-2 px-1 text-slate-500 dark:text-slate-400 font-medium text-xs">Critical</th>
                            <th className="text-center py-2 px-1 text-slate-500 dark:text-slate-400 font-medium text-xs">High</th>
                            <th className="text-center py-2 px-1 text-slate-500 dark:text-slate-400 font-medium text-xs">Medium</th>
                            <th className="text-center py-2 px-1 text-slate-500 dark:text-slate-400 font-medium text-xs">Low</th>
                            <th className="text-center py-2 px-1 text-slate-500 dark:text-slate-400 font-medium text-xs">Unknown</th>
                            <th className="text-left py-2 pl-4 text-slate-500 dark:text-slate-400 font-medium w-1/4">Distribution</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {qualityBreakdown.map((qb) => (
                            <tr key={qb.agent_role} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="py-2 pr-4">
                                    <span className="font-medium text-slate-700 dark:text-slate-300">
                                        {AGENT_LABELS[qb.agent_role] || qb.agent_role}
                                    </span>
                                </td>
                                <td className="py-2 pr-2 text-right tabular-nums font-mono text-slate-600 dark:text-slate-400">
                                    {qb.total_tasks}
                                </td>
                                <td className={`py-2 px-1 text-center tabular-nums font-mono ${QUALITY_TEXT_COLORS.critical.split(' ')[0]} ${QUALITY_TEXT_COLORS.critical.split(' ')[1]}`}>
                                    {qb.critical_outcomes}
                                </td>
                                <td className={`py-2 px-1 text-center tabular-nums font-mono ${QUALITY_TEXT_COLORS.high.split(' ')[0]} ${QUALITY_TEXT_COLORS.high.split(' ')[1]}`}>
                                    {qb.high_outcomes}
                                </td>
                                <td className={`py-2 px-1 text-center tabular-nums font-mono ${QUALITY_TEXT_COLORS.medium.split(' ')[0]} ${QUALITY_TEXT_COLORS.medium.split(' ')[1]}`}>
                                    {qb.medium_outcomes}
                                </td>
                                <td className={`py-2 px-1 text-center tabular-nums font-mono ${QUALITY_TEXT_COLORS.low.split(' ')[0]} ${QUALITY_TEXT_COLORS.low.split(' ')[1]}`}>
                                    {qb.low_outcomes}
                                </td>
                                <td className={`py-2 px-1 text-center tabular-nums font-mono ${QUALITY_TEXT_COLORS.unknown.split(' ')[0]} ${QUALITY_TEXT_COLORS.unknown.split(' ')[1]}`}>
                                    {qb.unknown_outcomes}
                                </td>
                                <td className="py-2 pl-4">
                                    <QualityBar total={qb.total_tasks} buckets={{
                                        critical: qb.critical_outcomes,
                                        high: qb.high_outcomes,
                                        medium: qb.medium_outcomes,
                                        low: qb.low_outcomes,
                                        unknown: qb.unknown_outcomes,
                                    }} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </MetricCard>
    );
}

/** Horizontal stacked bar showing quality composition for a single role. */
function QualityBar({ total, buckets }: { total: number; buckets: { critical: number; high: number; medium: number; low: number; unknown: number } }) {
    if (total === 0) return <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full" />;

    const segments = [
        { key: 'critical', count: buckets.critical, color: 'bg-red-500' },
        { key: 'high', count: buckets.high, color: 'bg-emerald-500' },
        { key: 'medium', count: buckets.medium, color: 'bg-yellow-500' },
        { key: 'low', count: buckets.low, color: 'bg-blue-500' },
        { key: 'unknown', count: buckets.unknown, color: 'bg-gray-300 dark:bg-gray-600' },
    ].filter((s) => s.count > 0);

    return (
        <div className="relative w-full h-3 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-700">
            {segments.map((seg) => {
                const pct = (seg.count / total) * 100;
                return (
                    <div
                        key={seg.key}
                        className={`${seg.color} h-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                        title={`${QUALITY_EMOJI[seg.key] || ''} ${seg.key}: ${seg.count} (${pct.toFixed(1)}%)`}
                    />
                );
            })}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Section 4: Recent Activity Feed
// ---------------------------------------------------------------------------

function RecentActivitySection({ recentActivities }: { recentActivities: ActivityDetailEntry[] }) {
    if (recentActivities.length === 0) {
        return (
            <MetricCard title="Recent Activity Feed">
            <div className="text-center py-8 text-slate-400">No recent activity recorded.</div>
        </MetricCard>
        );
    }

    const feedItems = recentActivities.slice(0, 30);

    return (
        <MetricCard title="Recent Activity Feed">
            <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                {feedItems.map((entry) => (
                    <div key={entry.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center shrink-0">
                                <span className="text-sm">
                                    {(AGENT_LABELS[entry.agent_name] || entry.agent_name).split(' ')[0]}
                                </span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 text-sm mb-0.5 flex-wrap">
                                    <span className="font-medium text-slate-900 dark:text-white">
                                        {AGENT_LABELS[entry.agent_name] || entry.agent_name}
                                    </span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${
                                        entry.status === 'completed'
                                            ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                    }`}>
                                        {entry.status}
                                    </span>
                                    {entry.outcome_quality && (
                                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${QUALITY_TEXT_COLORS[entry.outcome_quality] ?? QUALITY_TEXT_COLORS.unknown}`}
                                            title={entry.outcome_quality}>
                                            {QUALITY_EMOJI[entry.outcome_quality] || ''} {entry.outcome_quality}
                                        </span>
                                    )}
                                    {entry.correction_applied && (
                                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                                            🔄 Corrected
                                        </span>
                                    )}
                                </div>
                                {entry.objective && (
                                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1">{entry.objective}</p>
                                )}
                            </div>
                            <span className="text-xs text-slate-400 shrink-0 tabular-nums">
                                {new Date(entry.created_at).toLocaleString(undefined, {
                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </MetricCard>
    );
}

// ---------------------------------------------------------------------------
// Shared card skeleton wrapper
// ---------------------------------------------------------------------------

function MetricCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{title}</h3>
            </div>
            <div className="p-4">
                {children}
            </div>
        </div>
    );
}
