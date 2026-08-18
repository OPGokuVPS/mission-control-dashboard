'use client';

import { useState } from 'react';
import { useAlerts, useResolveAlert } from '@/hooks/useAlerts';
import type { Alert, RiskSeverity, AlertSource } from '@/types';

const SEVERITY_COLORS: Record<RiskSeverity, string> = {
    high: 'border-red-500',
    medium: 'border-yellow-300',
    low: 'border-blue-300',
};
const SEVERITY_ICONS: Record<RiskSeverity, string> = {
    high: '🔴', medium: '🟡', low: '🔵',
};
const STATUS_BADGES: Record<string, string> = {
    active: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
    resolved: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    acknowledged: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
};
const SOURCE_LABELS: Record<string, string> = {
    technical: '⚙️ Technical',
    business_risk: '📊 Business Risk',
    operational: '🛠️ Operational',
    compliance: '📋 Compliance',
};

export function AlertsRisksPanel() {
    const { data: alerts = [], isLoading, error } = useAlerts();
    const resolveAlert = useResolveAlert();
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'resolved' | 'acknowledged'>('active');
    const [filterSeverity, setFilterSeverity] = useState<RiskSeverity | 'all'>('all');

    async function handleResolve(id: number) {
        await resolveAlert.mutateAsync({ id, status: 'resolved' });
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500 mb-2">Failed to load alerts</p>
                <p className="text-sm text-slate-500">{(error as Error).message}</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm animate-pulse">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3" />
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2" />
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                    </div>
                ))}
            </div>
        );
    }

    const filtered = alerts.filter((a: Alert) => {
        if (filterStatus !== 'all' && a.status !== filterStatus) return false;
        if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
        return true;
    });

    const totalActive = alerts.filter((a: Alert) => a.status === 'active').length;
    const highPriority = alerts.filter((a: Alert) => a.status === 'active' && a.severity === 'high').length;

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{'🔔'} Alerts & Risks</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {totalActive} active · {highPriority} high priority
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 self-center mr-1">Status:</span>
                {(['all', 'active', 'resolved', 'acknowledged'] as const).map(status => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                            filterStatus === status
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border hover:border-slate-400'
                        }`}
                    >
                        {status} ({alerts.filter((a: Alert) => status === 'all' || a.status === status).length})
                    </button>
                ))}
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 self-center ml-4 mr-1">Severity:</span>
                {(['all', 'high', 'medium', 'low'] as const).map(sev => (
                    <button
                        key={sev}
                        onClick={() => setFilterSeverity(sev)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                            filterSeverity === sev
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border hover:border-slate-400'
                        }`}
                    >
                        {SEVERITY_ICONS[sev as RiskSeverity]} {sev}
                    </button>
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="text-center py-12 text-slate-400 bg-white dark:bg-slate-800 border rounded-xl">
                    {alerts.length === 0
                        ? 'No alerts. All systems nominal!'
                        : 'No alerts matching selected filters.'
                    }
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {filtered.map((alert: Alert) => (
                    <div key={alert.id} className={`bg-white dark:bg-slate-800 border-l-4 ${SEVERITY_COLORS[alert.severity]} rounded-xl p-4 shadow-sm`}>
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <span>{SEVERITY_ICONS[alert.severity]}</span>
                                <h3 className="font-semibold text-slate-900 dark:text-white text-sm truncate">{alert.title}</h3>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize shrink-0 ${STATUS_BADGES[alert.status] || ''}`}>
                                {alert.status}
                            </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-3">{alert.description}</p>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400">
                            <span>{new Date(alert.created_at).toLocaleString()}</span>
                            {alert.status === 'active' && (
                                <button
                                    onClick={() => handleResolve(alert.id)}
                                    className="px-3 py-1 text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300 rounded-lg hover:bg-green-100 transition-colors"
                                >
                                    {'✓'} Resolve
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}