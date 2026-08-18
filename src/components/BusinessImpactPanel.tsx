'use client';

import { useState } from 'react';
import { useOutcomes, useRecordOutcome } from '@/hooks/useOutcomes';
import { MetricCategory } from '@/types';
import { CardSkeleton, SkeletonLoader } from '@/components/SkeletonLoader';

const CATEGORY_ICONS: Record<MetricCategory, string> = {
    performance: '⚡',
    revenue: '💰',
    ux: '🎨',
    reliability: '🔒',
    operational: '⚙️',
};

export function BusinessImpactPanel() {
    const { data: outcomes = [], isLoading } = useOutcomes();
    const recordOutcome = useRecordOutcome();

    if (isLoading) return <SkeletonLoader lines={5} className="bg-white rounded-xl p-6" />;
    if (outcomes.length === 0) return <div className="text-center py-12 text-slate-400">No outcome measurements yet</div>;

    const totalLift = outcomes.reduce((sum: number, o) => sum + o.delta_pct, 0) / outcomes.length;

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">📈 Business Impact</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5">
                    <div className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">Measurements</div>
                    <div className="text-3xl font-bold text-emerald-800 dark:text-emerald-200">{outcomes.length}</div>
                </div>
                <div className={`bg-gradient-to-br ${totalLift >= 0 ? 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800' : 'from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800'} border rounded-xl p-5`}>
                    <div className={`text-sm ${totalLift >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'} mb-1`}>Avg Lift</div>
                    <div className={`text-3xl font-bold ${totalLift >= 0 ? 'text-blue-800 dark:text-blue-200' : 'text-red-800 dark:text-red-200'}`}>{totalLift.toFixed(1)}%</div>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {outcomes.map(o => (
                    <OutcomeCard key={o.id} outcome={o} />
                ))}
            </div>
        </div>
    );
}

function OutcomeCard({ outcome }: { outcome: any }) {
    const deltaColor = outcome.delta_pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    const arrow = outcome.delta_pct >= 0 ? '↑' : '↓';
    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-xl">{CATEGORY_ICONS[outcome.metric_type as MetricCategory]}</span>
                    <h3 className="font-medium text-slate-900 dark:text-white capitalize">{outcome.metric_type}</h3>
                </div>
                <span className={`text-lg font-bold ${deltaColor}`}>{arrow}{Math.abs(outcome.delta_pct).toFixed(1)}%</span>
            </div>
            <div className="flex items-end gap-4 text-sm text-slate-600 dark:text-slate-400">
                <div><span className="text-xs">Baseline</span><div className="font-semibold text-slate-900 dark:text-white">{outcome.baseline_value}</div></div>
                <span className="text-slate-300 dark:text-slate-600">→</span>
                <div><span className="text-xs">Final</span><div className="font-semibold text-slate-900 dark:text-white">{outcome.final_value}</div></div>
            </div>
            <div className="mt-2 text-xs text-slate-400">Measured: {new Date(outcome.measured_at).toLocaleDateString()}</div>
        </div>
    );
}