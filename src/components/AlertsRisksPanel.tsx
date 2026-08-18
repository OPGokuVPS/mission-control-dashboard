'use client';

import { useState } from 'react';
import { useAlerts, useResolveAlert } from '@/hooks/useAlerts';
import type { RiskSeverity, AlertSource } from '@/types';
import { CardSkeleton, SkeletonLoader } from '@/components/SkeletonLoader';

const SEVERITY_ICONS: Record<RiskSeverity, string> = { high: '🔴', medium: '🟡', low: '🔵' };
const SEVERITY_COLORS: Record<RiskSeverity, string> = {
    high: 'border-red-300 dark:border-red-700',
    medium: 'border-yellow-300 dark:border-yellow-700',
    low: 'border-blue-300 dark:border-blue-700',
};

const STATUS_LABELS: Record<string, string> = {
    active: 'Active',
    acknowledged: 'Acknowledged',
    resolved: 'Resolved',
};

export function AlertsRisksPanel() {
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [severityFilter, setSeverityFilter] = useState<string>('all');
    const { data: alerts, isLoading: loadingAlerts } = useAlerts({
        status: statusFilter === 'all' ? undefined : statusFilter as any,
        severity: severityFilter === 'all' ? undefined : (severityFilter as any),
    });
    const resolveMutation = useResolveAlert();
    const alertList = alerts ?? [];

    const filteredAlerts = useMemo(() => {
        return alertList.filter(alert => {
            const statusMatch = statusFilter === 'all' || alert.status === statusFilter;
            const severityMatch = severityFilter === 'all' || alert.severity === severityFilter;
            return statusMatch && severityMatch;
        });
    }, [alertList, statusFilter, severityFilter]);

    const handleResolve = async (id: number) => {
        try {
            await resolveMutation.mutateAsync(id);
        } catch (error) {
            console.error('Failed to resolve alert:', error);
        }
    };

    if (loadingAlerts) {
        return <CardSkeleton title="Alerts & Risks" />;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Alerts &amp; Risks</h2>
                <div className="flex gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-sm px-2 py-1 rounded border bg-white dark:bg-slate-800"
                    >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="acknowledged">Acknowledged</option>
                        <option value="resolved">Resolved</option>
                    </select>
                    <select
                        value={severityFilter}
                        onChange={(e) => setSeverityFilter(e.target.value)}
                        className="text-sm px-2 py-1 rounded border bg-white dark:bg-slate-800"
                    >
                        <option value="all">All Severities</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>
            </div>
            {filteredAlerts.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No alerts match your filters.</p>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {filteredAlerts.map(alert => (
                        <div
                            key={alert.id}
                            className={`rounded-lg border p-4 ${SEVERITY_COLORS[alert.severity]}`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <span className="text-xs font-medium">{SEVERITY_ICONS[alert.severity]}</span>
                                    <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        {alert.severity}
                                    </span>
                                    <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                                        {alert.source}
                                    </span>
                                </div>
                                <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                                    {STATUS_LABELS[alert.status]}{' → '}{'∆'}
                                </span>
                            </div>
                            <div className="mt-2">
                                <p className="font-medium text-sm text-slate-900 dark:text-white">{alert.title}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{alert.description}</p>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                                <span className="text-xs text-slate-400 dark:text-slate-500">
                                    Created {new Date(alert.created_at).toLocaleString()}
                                </span>
                                {alert.status !== 'resolved' && (
                                    <button
                                        onClick={() => handleResolve(alert.id)}
                                        disabled={resolveMutation.isPending}
                                        className="text-xs px-3 py-1 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
                                    >
                                        {resolveMutation.isPending && resolveMutation.variables === alert.id ? '✓ Resolving...' : 'Resolve'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}