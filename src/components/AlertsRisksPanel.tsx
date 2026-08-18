'use client';

import { useState, useMemo } from 'react';
import { useAlerts, useResolveAlert, type Alert } from '@/hooks/useAlerts';
import { AlertCard } from './AlertCard';

export function AlertsRisksPanel() {
    const { data: alerts, isLoading } = useAlerts();
    const resolveAlert = useResolveAlert();
    const [filterSeverity, setFilterSeverity] = useState<string>('all');

    const filtered = useMemo(() => {
        if (!alerts) return [];
        if (filterSeverity === 'all') return alerts;
        return alerts.filter((a: Alert) => a.severity === filterSeverity);
    }, [alerts, filterSeverity]);

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const severities = ['all', 'critical', 'warning', 'info', 'low'];

    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    🔔 Alerts & Risks
                </h2>
                <div className="flex gap-1.5">
                    {severities.map(sev => (
                        <button
                            key={sev}
                            onClick={() => setFilterSeverity(sev)}
                            className={`px-2.5 py-1 text-xs font-medium rounded-lg capitalize ${
                                filterSeverity === sev
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                            }`}
                        >
                            {sev}
                        </button>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {filtered.map((alert: any) => (
                    <AlertCard key={alert.id} alert={alert} onResolve={async (id: number) => { await resolveAlert.mutateAsync(id); }} />
                ))}
            </div>
        </div>
    );
}