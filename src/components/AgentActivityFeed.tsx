'use client';

import { useAgentActivity } from '@/hooks/useAgentActivity';
import { CardSkeleton, SkeletonLoader } from '@/components/SkeletonLoader';

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

const QUALITY_ICONS: Record<string, string> = { high: '⭐', medium: '👍', low: '📉' };

export function AgentActivityFeed() {
    const { data: activities = [], isLoading } = useAgentActivity(50);

    if (isLoading) return <SkeletonLoader lines={5} className="bg-white rounded-xl p-6" />;

    if (activities.length === 0) {
        return <div className="text-center py-12 text-slate-400">No agent activity recorded yet</div>;
    }

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">📡 Agent Activity Feed</h2>
            <div className="space-y-2">
                {activities.slice(0, 20).map((activity: any) => (
                    <ActivityItem key={activity.id} activity={activity} />
                ))}
            </div>
        </div>
    );
}

function ActivityItem({ activity }: { activity: any }) {
    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0">{AGENT_LABELS[activity.agent_name]?.split(' ')[0] || '🤖'}</span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{AGENT_LABELS[activity.agent_name] || activity.agent_name}</span>
                    <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400">{activity.status}</span>
                </div>
                <span className="text-xs text-slate-400 shrink-0">{new Date(activity.created_at).toLocaleTimeString()}</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">{activity.objective}</p>
            {activity.tools_used && activity.tools_used.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {activity.tools_used.map((tool: string, i: number) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full">{tool}</span>
                    ))}
                </div>
            )}
            {activity.outcome_quality && (
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>{QUALITY_ICONS[activity.outcome_quality]}</span>
                    <span>{activity.outcome_quality} quality</span>
                </div>
            )}
        </div>
    );
}
