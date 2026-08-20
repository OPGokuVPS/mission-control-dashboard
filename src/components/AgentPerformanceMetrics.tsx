'use client';

import { useState, useMemo } from 'react';
import { useAgentPerformance, type TimeRangePreset } from '@/hooks/useAgentPerformance';
import { CardSkeleton, SkeletonLoader } from '@/components/SkeletonLoader';
import type { RoleQualityBreakdown, RolePerformanceMetric } from '@/types/performance';

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const TIME_RANGE_PRESETS: { label: string; value: TimeRangePreset }[] = [
    { label: 'Last 24h', value: '24h' },
    { label: 'Last 7d', value: '7d' },
    { label: 'Last 30d', value: '30d' },
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

function formatDuration(seconds: number): string {
    if (seconds <= 0) return '—';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
}

function completionColor(rate: number): string {
    if (rate >= 80) return 'text-emerald-500';
    if (rate >= 50) return 'text-amber-500';
    return 'text-red-500';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryStatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 transition-all hover:shadow-md">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{icon}</span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {label}
                </span>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
        </div>
    );
}

/** Renders a multi-segment quality bar using the expanded quality breakdown. */
function QualityBar({ breakdown }: { breakdown: RoleQualityBreakdown | undefined }) {
    if (!breakdown || breakdown.total_tasks === 0) {
        return <div className="mt-2 h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden" />;
    }

    const total = breakdown.total_tasks;
    return (
        <div className="mt-2 space-y-1">
            {/* Multi-color bar */}
            <div className="flex gap-0.5 h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
                {total > 0 && (
                    <>
                        {breakdown.critical_outcomes > 0 && (
                            <div
                                className="bg-violet-500"
                                style={{ width: `${(breakdown.critical_outcomes / total) * 100}%` }}
                                title={`${breakdown.critical_outcomes} critical`}
                            />
                        )}
                        {breakdown.high_outcomes > 0 && (
                            <div
                                className="bg-emerald-500"
                                style={{ width: `${(breakdown.high_outcomes / total) * 100}%` }}
                                title={`${breakdown.high_outcomes} high`}
                            />
                        )}
                        {breakdown.medium_outcomes > 0 && (
                            <div
                                className="bg-amber-500"
                                style={{ width: `${(breakdown.medium_outcomes / total) * 100}%` }}
                                title={`${breakdown.medium_outcomes} medium`}
                            />
                        )}
                        {breakdown.low_outcomes > 0 && (
                            <div
                                className="bg-red-500"
                                style={{ width: `${(breakdown.low_outcomes / total) * 100}%` }}
                                title={`${breakdown.low_outcomes} low`}
                            />
                        )}
                        {breakdown.unknown_outcomes > 0 && (
                            <div
                                className="bg-slate-400"
                                style={{ width: `${(breakdown.unknown_outcomes / total) * 100}%` }}
                                title={`${breakdown.unknown_outcomes} unknown`}
                            />
                        )}
                    </>
                )}
            </div>
            {/* Legend line */}
            <div className="flex flex-wrap gap-x-3 gap-y-0 text-[10px] text-slate-400">
                {breakdown.critical_quality_pct > 0 && (
                    <span>{breakdown.critical_quality_pct.toFixed(0)}% 🔴 Critical</span>
                )}
                {breakdown.high_quality_pct > 0 && (
                    <span>{breakdown.high_quality_pct.toFixed(0)}% 🟢 High</span>
                )}
                {breakdown.low_quality_pct > 0 && (
                    <span>{breakdown.low_quality_pct.toFixed(0)}% 🔴 Low</span>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main Component — with built-in time-range state
// ---------------------------------------------------------------------------

export function AgentPerformanceMetrics() {
    const [activeTimeRange, setActiveTimeRange] = useState<TimeRangePreset>('7d');

    const { data, isLoading, error } = useAgentPerformance(activeTimeRange);

    const metrics = (data?.metrics ?? []) as RolePerformanceMetric[];

    const qualityBreakdowns = useMemo(() => {
        const map = new Map<string, RoleQualityBreakdown>();
        for (const qb of data?.quality_breakdown ?? []) {
            map.set(qb.agent_role, qb);
        }
        return map;
    }, [data?.quality_breakdown]);

    const summary = data?.summary;

    // Find fastest active role
    const fastestRole = useMemo(() => {
        const active = metrics.filter((m: RolePerformanceMetric) => m.avg_completion_time_sec > 0);
        if (active.length === 0) return null;
        return active.reduce(
            (a: RolePerformanceMetric, b: RolePerformanceMetric) =>
                a.avg_completion_time_sec < b.avg_completion_time_sec ? a : b
        );
    }, [metrics]);

    return (
        <div className="space-y-6">
            {/* Header + Time-range selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">📈 Agent Performance Metrics</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Productivity analysis grouped by agent role
                    </p>
                </div>
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                    {TIME_RANGE_PRESETS.map((preset) => (
                        <button
                            key={preset.value}
                            onClick={() => setActiveTimeRange(preset.value)}
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
            </div>

            {isLoading && (
                <SkeletonLoader lines={6} className="bg-white dark:bg-slate-800 border rounded-xl p-6" />
            )}

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
                    <p className="text-red-600 dark:text-red-400">Error loading performance data</p>
                    <p className="text-sm text-red-500 dark:text-red-400/70 mt-1">{String(error)}</p>
                </div>
            )}

            {!isLoading && !error && summary && (
                <>
                    {/* Summary stat cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
                        <SummaryStatCard
                            icon="👥"
                            label="Active Roles"
                            value={`${summary.active_roles} / ${summary.total_roles}`}
                        />
                        <SummaryStatCard
                            icon="📋"
                            label="Total Tasks"
                            value={String(summary.total_tasks_all_roles)}
                        />
                        <SummaryStatCard
                            icon="✅"
                            label="Completion Rate"
                            value={`${summary.overall_completion_rate_pct.toFixed(1)}%`}
                        />
                        <SummaryStatCard
                            icon="⚡"
                            label={fastestRole ? `Fastest: ${ROLE_LABELS[fastestRole.agent_role]?.split(' ')[0]}` : 'Avg Duration'}
                            value={formatDuration(summary.fastest_avg_completion_sec)}
                        />
                        <SummaryStatCard
                            icon="🐢"
                            label="Slowest Avg"
                            value={formatDuration(summary.slowest_avg_completion_sec)}
                        />
                    </div>

                    {/* Per-role performance table */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                                🏆 Performance Breakdown by Role
                            </h3>
                        </div>

                        {/* Desktop table view */}
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
                                    {metrics.map((metric: RolePerformanceMetric) => {
                                        const q = qualityBreakdowns.get(metric.agent_role);
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
                                                <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">
                                                    {metric.total_tasks}
                                                </td>
                                                <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">
                                                    {metric.completed_tasks}
                                                </td>
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

                        {/* Mobile card view */}
                        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
                            {metrics.map((metric: RolePerformanceMetric) => {
                                const q = qualityBreakdowns.get(metric.agent_role);
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
                </>
            )}
        </div>
    );
}
