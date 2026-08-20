'use client';

import { useQuery } from '@tanstack/react-query';
import { CardSkeleton } from '@/components/SkeletonLoader';

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

    if (isLoading) {
        return <CardSkeleton lines={8} />;
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">🤖 Agent Workload Dashboard</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {agentsBusy} agent{agentsBusy !== 1 ? 's' : ''} busy · Auto-updates every 10s
                    </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    Live
                </div>
            </div>

            {/* Workload Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {agentRoles.map(role => {
                    const w = workload[role];
                    const isBusy = w.active > 0;
                    return (
                        <div
                            key={role}
                            className={`bg-white dark:bg-slate-800 border rounded-xl p-4 transition-all hover:shadow-md ${
                                isBusy ? 'border-blue-300 dark:border-blue-700 shadow-sm' : 'border-slate-200 dark:border-slate-700'
                            }`}
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
                                {Object.entries(w).filter(([key]) => key !== 'total').map(([status, count]) => (
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
                })}
            </div>

            {/* Recent Activity Feed */}
            {recentActivity.length > 0 && (
                <div className="bg-white dark:bg-slate-800 border rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">📡 Recent Agent Activity</h3>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                        {recentActivity.slice(0, 15).map(activity => (
                            <div key={activity.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center shrink-0">
                                        <span className="text-sm">{AGENT_LABELS[activity.agent_name]?.split(' ')[0]}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 text-sm mb-1">
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
                                        {new Date(activity.created_at).toLocaleTimeString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}