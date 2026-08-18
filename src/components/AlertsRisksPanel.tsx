'use client';

import { useState } from 'react';
import { useAlerts, useResolveAlert } from '@/hooks/useAlerts';
import type { RiskSeverity, AlertSource } from '@/types';
import { CardSkeleton, SkeletonLoader } from '@/components/SkeletonLoader';

const SEVERITY_ICONS: Record<string, string> = { high: '🔴', medium: '🟠', low: '🟡' };
const SOURCE_LABELS: Record<string, string> = { technical: 'Technical', business_risk: 'Business Risk', security: 'Security', performance: 'Performance', cost: 'Cost' };

export function AlertsRisksPanel() {
    const { data: alerts = [], isLoading } = useAlerts();
    const resolveAlert = useResolveAlert();
    const [filter, setFilter] = useState<RiskSeverity | 'all'>('all');

    if (isLoading) return <SkeletonLoader lines={3} className="bg-white rounded-xl p-6" />;

    const filtered = filter === 'all' ? alerts : alerts.filter((a: any) => a.severity === filter);

    if (filtered.length === 0) return <div className="text-center py-12 text-slate-400">No alerts</div>;

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">🚨 Alerts & Risks</h2>
            <div className="flex gap-2 overflow-x-auto pb-2">
                {[{ value: 'all', label: 'All' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }].map(f => (
                    <button key={f.value} onClick={() => setFilter(f.value as any)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filter === f.value ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border hover:border-slate-400'}`}>
                        {f.label} ({f.value === 'all' ? alerts.length : alerts.filter((a: any) => a.severity === f.value).length})
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {filtered.map((alert: any) => (
                    <AlertCard key={alert.id} alert={alert} onResolve={resolveAlert.mutateAsync.bind(resolveAlert)} />
                ))}
            </div>
        </div>
    );
}

function AlertCard({ alert, onResolve }: { alert: any; onResolve: (id: number) => Promise<void> }) {
    const isResolved = alert.status === 'resolved';
    return (
        <div className={`bg-white dark:bg-slate-800 border rounded-xl p-4 ${isResolved ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span>{SEVERITY_ICONS[alert.severity]}</span>
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{alert.title}</h3>
                </div>
                {isResolved && <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full">Resolved</span>}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">{alert.description}</p>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400">{SOURCE_LABELS[alert.source] || alert.source}</span>
                <span className="text-[10px] px-2 py-0.5 capitalize bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">{alert.severity}</span>
            </div>
            {!isResolved && (
                <button onClick={() => onResolve(alert.id)} className="w-full py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors">Mark Resolved</button>
            )}
        </div>
    );
}