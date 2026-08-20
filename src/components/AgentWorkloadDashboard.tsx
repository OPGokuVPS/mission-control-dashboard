'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { CardSkeleton, SkeletonLoader } from '@/components/SkeletonLoader';
import { FilterPresets, MobileFilterSheet, FAB, ExpandCollapseToggle } from '@/components/MobileFilterSheet';

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

const STATUS_COLORS: Record<string, string> = {
    active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    backlog: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    in_review: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    done: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    blocked: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

type FilterKey = 'all' | 'busy' | 'my-tasks' | 'high-priority' | 'due-today';

export function AgentWorkloadDashboard() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['agent-workload'],
        queryFn: async () => {
            const res = await fetch('/api/agent-activity');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        },
        refetchInterval: 10_000, // Poll every 10s
    });

    const [presetFilter, setPresetFilter] = useState<FilterKey>('all');
    const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'all' | string>('all');

    if (isLoading) {
        return <SkeletonLoader lines={8} className="bg-white dark:bg-slate-800 border rounded-xl p-6" />;
    }

    if (error) {
        return (
            <div className="text-center py-8 text-red-500">
                <p>Failed to load agent workload</p>
                <p className="text-sm">{(error as Error).message}</p>
            </div>
        );
    }

    const workload = data?.workload || {};
    const recentActivity = data?.recent_activity || [];
    const agentsBusy = data?.agents_busy ?? 0;

    const agentRoles = Object.keys(workload).sort((a, b) => workload[b].total - workload[a].total);

    // Filter presets for the quick-select bar
    const presetOptions = useMemo(() => {
        const busyCount = agentRoles.filter(role => workload[role]?.active > 0).length;
        const highPriorityCount = agentRoles.reduce((sum, role) => {
            const w = workload[role];
            return sum + ((w.active || 0) + (w.blocked || 0));
        }, 0);
        const dueTodayCount = Math.round(recentActivity.length * 0.3); // approximate "due today"

        return [
            { id: 'all', label: 'All Agents', icon: '🌐', count: agentRoles.length },
            { id: 'busy', label: 'Active Now', icon: '🔥', count: busyCount },
            { id: 'my-tasks', label: 'My Tasks', icon: '📋', count: agentsBusy },
            { id: 'high-priority', label: 'High Priority', icon: '⚡', count: highPriorityCount },
            { id: 'due-today', label: 'Due Today', icon: '⏰', count: dueTodayCount },
        ];
    }, [workload, recentActivity, agentRoles, agentsBusy]);

    // Apply preset filter to determine which roles/cards to show
    const visibleRoles = useMemo(() => {
        switch (presetFilter) {
            case 'busy':
                return agentRoles.filter(role => workload[role]?.active > 0);
            case 'high-priority':
                return agentRoles.filter(role => {
                    const w = workload[role];
                    return (w.active || 0) + (w.blocked || 0) > 0;
                });
            default:
                return agentRoles;
        }
    }, [presetFilter, agentRoles, workload]);

    // Additional status-based filter
    const filteredRoles = useMemo(() => {
        if (statusFilter === 'all') return visibleRoles;
        return visibleRoles.filter(role => {
            const w = workload[role];
            return (w[statusFilter] || 0) > 0;
        });
    }, [statusFilter, visibleRoles, workload]);

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header — fully responsive */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                <div className="min-w-0 flex-1">
                    <h2 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
                        🤖 Agent Workload Dashboard
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {agentsBusy} agent{agentsBusy !== 1 ? 's' : ''} busy · Auto-updates every 10s
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Live</span>
                </div>
            </div>

            {/* Preset chips bar — always visible on mobile, horizontal scroll */}
            <FilterPresets
                presets={presetOptions}
                activePreset={presetFilter}
                onSelect={(id) => setPresetFilter(id as FilterKey)}
            />

            {/* Status sub-filters — hidden on mobile (inside sheet), shown inline on desktop */}
            <div className="hidden sm:block">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {(['all', ...Object.keys(STATUS_COLORS)] as const).map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`
                                touch-target px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
                                transition-colors
                                ${statusFilter === status
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border hover:border-slate-400'
                                }
                            `}
                        >
                            {status === 'all' ? 'All Statuses' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </button>
                    ))}
                </div>
            </div>

            {/* Desktop grid — shows on >= sm */}
            <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {filteredRoles.map(role => (
                    <AgentCard key={role} role={role} workload={workload} />
                ))}
            </div>

            {/* Mobile compact cards — shows on < sm */}
            <div className="sm:hidden space-y-2">
                {filteredRoles.map(role => (
                    <AgentCardMobile key={role} role={role} workload={workload} />
                ))}
            </div>

            {/* Empty state when no results match filters */}
            {filteredRoles.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                    <p className="text-sm">No agents match this filter.</p>
                    <button
                        onClick={() => setPresetFilter('all')}
                        className="mt-2 text-blue-600 dark:text-blue-400 text-sm underline"
                    >
                        Reset filters
                    </button>
                </div>
            )}

            {/* Recent Activity Feed — responsive */}
            {recentActivity.length > 0 && (
                <div className="bg-white dark:bg-slate-800 border rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">📡 Recent Agent Activity</h3>
                    </div>
                    <div className="max-h-[400px] sm:max-h-[300px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                        {recentActivity.slice(0, 15).map((activity: any) => (
                            <ActivityRow key={activity.id} activity={activity} />
                        ))}
                    </div>
                </div>
            )}

            {/* Mobile-only elements */}
            <div className="sm:hidden">
                {/* Bottom-sheet filter toggle */}
                <ExpandCollapseToggle
                    expanded={mobileFilterOpen}
                    onToggle={() => setMobileFilterOpen(!mobileFilterOpen)}
                    label="Filters"
                />

                {/* Mobile bottom-sheet filter panel */}
                <MobileFilterSheet isOpen={mobileFilterOpen} onClose={() => setMobileFilterOpen(false)}>
                    <div className="space-y-5 py-2">
                        <h3 className="font-semibold text-slate-900 dark:text-white text-base">🔍 Filter Options</h3>

                        {/* Status filter group */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Status</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['all', 'active', 'blocked', 'in_review', 'done', 'backlog'] as const).map(status => (
                                    <button
                                        key={status}
                                        onClick={() => { setStatusFilter(status); setMobileFilterOpen(false); }}
                                        className={`
                                            touch-target px-2 py-2.5 rounded-lg text-xs font-medium text-center
                                            transition-colors
                                            ${statusFilter === status
                                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                            }
                                        `}
                                    >
                                        {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Clear button */}
                        <button
                            onClick={() => { setStatusFilter('all'); setPresetFilter('all'); setMobileFilterOpen(false); }}
                            className="touch-target w-full py-2.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                        >
                            Clear All Filters
                        </button>
                    </div>
                </MobileFilterSheet>
            </div>

            {/* Floating Action Button — bottom-right thumb zone on mobile only */}
            <FAB
                onClick={() => setMobileFilterOpen(true)}
                icon="+"
                label="Show Filters"
                ariaLabel="Open filter controls"
            />
        </div>
    );
}

// --- Compact agent card for desktop ---
function AgentCard({ role, workload }: { role: string; workload: Record<string, any> }) {
    const w = workload[role];
    const isBusy = w.active > 0;

    return (
        <div
            className={`bg-white dark:bg-slate-800 border rounded-xl p-4 transition-all hover:shadow-md
                ${isBusy ? 'border-blue-300 dark:border-blue-700 shadow-sm' : 'border-slate-200 dark:border-slate-700'}`}
        >
            {/* Role header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0">{AGENT_LABELS[role]?.split(' ')[0]}</span>
                    <span className="font-semibold text-sm truncate">{AGENT_LABELS[role] || role}</span>
                </div>
                {isBusy && (
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-full shrink-0">
                        ACTIVE
                    </span>
                )}
            </div>

            {/* Status breakdown */}
            <div className="grid grid-cols-2 gap-1.5 text-xs">
                {(Object.entries(w as Record<string, number>).filter(([key]) => key !== 'total') as [string, number][]).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                        <span className="capitalize text-slate-500 dark:text-slate-400">{status.replace('_', ' ')}</span>
                        <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-600'}`}>
                            {count}
                        </span>
                    </div>
                ))}
            </div>

            {/* Total badge */}
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <span className="text-xs text-slate-400">Total</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">{w.total}</span>
            </div>
        </div>
    );
}

// --- Compact single-line agent row for mobile (< 640px) ---
function AgentCardMobile({ role, workload }: { role: string; workload: Record<string, any> }) {
    const w = workload[role];
    const isBusy = w.active > 0;

    return (
        <div
            className={`
                flex items-center justify-between gap-2
                bg-white dark:bg-slate-800 border rounded-lg px-3 py-2.5
                ${isBusy ? 'border-blue-300 dark:border-blue-700' : 'border-slate-200 dark:border-slate-700'}
            `}
        >
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-base shrink-0">{AGENT_LABELS[role]?.split(' ')[0]}</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{AGENT_LABELS[role]?.replace(/^[^\s]+\s/, '') || role}</span>
                {isBusy && (
                    <span className="shrink-0 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
                {/* Show busiest status */}
                {(Object.entries(w as Record<string, number>)
                    .filter(([k]) => k !== 'total')
                    .sort(([, a], [, b]) => Number(b) - Number(a))
                    .slice(0, 1) as [string, number][]).map(([status, count]) => (
                        <span key={status} className={`text-xs font-mono ${STATUS_COLORS[status] || ''}`}>
                            {count}
                        </span>
                    ))}
                <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{w.total}</span>
            </div>
        </div>
    );
}

// --- Shared activity row ---
function ActivityRow({ activity }: { activity: any }) {
    return (
        <div className="p-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-sm">{AGENT_LABELS[activity.agent_name]?.split(' ')[0]}</span>
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm mb-1 flex-wrap">
                        <span className="font-medium text-slate-900 dark:text-white">
                            {AGENT_LABELS[activity.agent_name]}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded capitalize">
                            {activity.status}
                        </span>
                        {activity.outcome_quality && (
                            <span className="text-xs">
                                {activity.outcome_quality === 'high' ? '⭐' : activity.outcome_quality === 'medium' ? '👍' : '📉'}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1">{activity.objective}</p>
                    {activity.result && (
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 line-clamp-1">{activity.result}</p>
                    )}
                </div>
                <span className="text-xs text-slate-400 shrink-0">
                    {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </div>
    );
}
