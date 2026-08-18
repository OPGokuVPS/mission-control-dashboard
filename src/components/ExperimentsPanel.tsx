'use client';

import { useState } from 'react';
import { useExperiments, useCreateExperiment, useUpdateExperiment } from '@/hooks/useExperiments';
import type { ExperimentStatus, ExperimentDecision } from '@/types';
import { CardSkeleton, SkeletonLoader } from '@/components/SkeletonLoader';

const STATUS_ICONS: Record<string, string> = {
    running: '🔄',
    concluded_winner_a: '🏆 A',
    concluded_winner_b: '🏆 B',
    concluded_tie: '⚖️ Tie',
    aborted: '❌ Aborted',
};

const DECISION_LABELS: Record<string, string> = {
    rollout_variant_a: 'Rollout A',
    rollout_variant_b: 'Rollout B',
    keep_both: 'Keep Both',
    discard: 'Discard',
    continue_test: 'Continue Testing',
};

export function ExperimentsPanel() {
    const { data: experiments = [], isLoading, error } = useExperiments();
    const createExperiment = useCreateExperiment();
    const updateExperiment = useUpdateExperiment();
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [hypothesis, setHypothesis] = useState('');
    const [metricTracked, setMetricTracked] = useState('');
    const [variantA, setVariantA] = useState('');
    const [variantB, setVariantB] = useState('');
    const [filterStatus, setFilterStatus] = useState<ExperimentStatus | 'all'>('all');

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim() || !hypothesis.trim() || !metricTracked.trim()) return;
        await createExperiment.mutateAsync({ name: name.trim(), hypothesis: hypothesis.trim(), variant_a_text: variantA, variant_b_text: variantB, metric_tracked: metricTracked.trim(), status: 'running' as ExperimentStatus });
        setName('');
        setHypothesis('');
        setMetricTracked('');
        setVariantA('');
        setVariantB('');
        setShowForm(false);
    }

    async function concludeExperiment(id: number, status: ExperimentStatus, decision?: string) {
        await updateExperiment.mutateAsync({ id, status, decision: (decision as ExperimentDecision) || undefined });
    }

    if (error) {
        return <div className="text-center py-12"><p className="text-red-500">Failed to load experiments</p></div>;
    }

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
        );
    }

    const filtered = filterStatus === 'all' ? experiments : experiments.filter(e => e.status === filterStatus);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">🔬 Experiments & A/B Tests</h2>
                <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-sm font-medium transition-colors">
                    + New Experiment
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {[
                    { value: 'all', label: 'All' },
                    { value: 'running', label: 'Running' },
                    { value: 'concluded_winner_a', label: 'Winner A' },
                    { value: 'concluded_winner_b', label: 'Winner B' },
                    { value: 'concluded_tie', label: 'Tie' },
                    { value: 'aborted', label: 'Aborted' },
                ].map(f => (
                    <button key={f.value} onClick={() => setFilterStatus(f.value as ExperimentStatus | 'all')}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                            filterStatus === f.value ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border hover:border-slate-400'
                        }`}>
                        {f.label} ({experiments.filter(e => f.value === 'all' || e.status === f.value).length})
                    </button>
                ))}
            </div>

            {/* Add form */}
            {showForm && (
                <form onSubmit={handleCreate} className="bg-white dark:bg-slate-800 border rounded-xl p-4 space-y-3">
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Experiment name" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 outline-none" autoFocus />
                    <textarea value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} placeholder="Hypothesis: If we change X, Y will improve by Z%" rows={3} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 outline-none resize-y" required />
                    <input value={metricTracked} onChange={(e) => setMetricTracked(e.target.value)} placeholder="Metric tracked (e.g., conversion rate, revenue per user)" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 outline-none" required />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Variant A (control)</label><input value={variantA} onChange={(e) => setVariantA(e.target.value)} placeholder="Current experience" className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                        <div><label className="block text-xs font-medium text-slate-600 mb-1">Variant B (test)</label><input value={variantB} onChange={(e) => setVariantB(e.target.value)} placeholder="New experience" className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" disabled={!name.trim() || !hypothesis.trim()} className="w-full sm:w-auto px-6 py-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white rounded-lg font-medium">
                            Start Experiment
                        </button>
                        <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg">Cancel</button>
                    </div>
                </form>
            )}

            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total', value: experiments.length, color: 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20' },
                    { label: 'Running', value: experiments.filter(e => e.status === 'running').length, color: 'from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20' },
                    { label: 'Completed', value: experiments.filter(e => e.status !== 'running' && e.status !== 'aborted').length, color: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20' },
                    { label: 'Win Rate A/B', value: (() => { const w = experiments.filter(e => e.status === 'concluded_winner_a' || e.status === 'concluded_winner_b'); const a = w.filter(e => e.status === 'concluded_winner_a').length; return w.length ? `${Math.round(a / w.length * 100)}%` : 'N/A'; })(), color: 'from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20' },
                ].map(s => (
                    <div key={s.label} className={`bg-gradient-to-br ${s.color} border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center`}>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Empty state */}
            {filtered.length === 0 && <div className="text-center py-12 text-slate-400">No experiments yet. Design your first A/B test!</div>}

            {/* Experiments list */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {filtered.map(exp => (
                    <ExperimentCard key={exp.id} experiment={exp} onConclude={concludeExperiment} />
                ))}
            </div>
        </div>
    );
}

function ExperimentCard({ experiment, onConclude }: { experiment: any; onConclude: (id: number, status: ExperimentStatus, decision?: string) => Promise<void> }) {
    const isRunning = experiment.status === 'running';
    const isComplete = !isRunning;

    return (
        <div className={`bg-white dark:bg-slate-800 border rounded-xl p-4 ${isComplete ? 'opacity-70' : ''}`}>
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0">{STATUS_ICONS[experiment.status]}</span>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm truncate">{experiment.name}</h3>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize shrink-0 ${
                    isRunning ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                }`}>
                    {isRunning ? 'Running' : experiment.status.replace('concluded_', '')}
                </span>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">"{experiment.hypothesis}"</p>

            <div className="mb-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>📊 Metric:</span>
                <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{experiment.metric_tracked}</span>
            </div>

            {(experiment.variant_a_text || experiment.variant_b_text) && (
                <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                    {experiment.variant_a_text && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-2 rounded">
                            <div className="font-medium text-blue-700 dark:text-blue-300 mb-1">A (Control)</div>
                            <div className="text-slate-600 dark:text-slate-400 line-clamp-2">{experiment.variant_a_text}</div>
                        </div>
                    )}
                    {experiment.variant_b_text && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-2 rounded">
                            <div className="font-medium text-purple-700 dark:text-purple-300 mb-1">B (Test)</div>
                            <div className="text-slate-600 dark:text-slate-400 line-clamp-2">{experiment.variant_b_text}</div>
                        </div>
                    )}
                </div>
            )}

            {isComplete && experiment.decision && (
                <div className="mb-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-2 rounded text-xs">
                    <strong>Decision:</strong> {DECISION_LABELS[experiment.decision] || experiment.decision}
                </div>
            )}

            {/* Conclude controls */}
            {isRunning && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-1.5">
                    <button onClick={() => onConclude(experiment.id, 'concluded_winner_a')} className="px-2 py-1 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-200 transition-colors">A wins</button>
                    <button onClick={() => onConclude(experiment.id, 'concluded_winner_b')} className="px-2 py-1 text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 rounded-lg hover:bg-purple-200 transition-colors">B wins</button>
                    <button onClick={() => onConclude(experiment.id, 'concluded_tie')} className="px-2 py-1 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition-colors">Tie</button>
                    <button onClick={() => onConclude(experiment.id, 'aborted')} className="px-2 py-1 text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-lg hover:bg-red-200 transition-colors">Abort</button>
                </div>
            )}

            <div className="mt-2 text-[10px] text-slate-400">Started: {new Date(experiment.created_at).toLocaleDateString()}</div>
        </div>
    );
}