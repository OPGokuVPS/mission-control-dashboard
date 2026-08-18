'use client';

import { useState } from 'react';
import { useInsights, useAddInsight } from '@/hooks/useInsights';
import type { MetricCategory, ImpactLevel } from '@/types';
import { CardSkeleton, SkeletonLoader } from '@/components/SkeletonLoader';

const CATEGORY_ICONS: Record<MetricCategory, string> = {
    performance: '⚡',
    revenue: '💰',
    ux: '🎨',
    reliability: '🔒',
    operational: '⚙️',
};

export function PerformanceInsights() {
    const { data: insights = [], isLoading, error } = useInsights();
    const addInsight = useAddInsight();
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<MetricCategory>('performance');
    const [impact, setImpact] = useState<ImpactLevel>('medium');
    const [filterCategory, setFilterCategory] = useState<MetricCategory | 'all'>('all');

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim()) return;
        await addInsight.mutateAsync({ title: title.trim(), description: description.trim(), category, impact_level: impact });
        setTitle('');
        setDescription('');
        setCategory('performance');
        setImpact('medium');
        setShowForm(false);
    }

    if (error) return <div className="text-center py-12"><p className="text-red-500">Failed to load insights</p></div>;

    if (isLoading) return <SkeletonLoader lines={5} className="bg-white rounded-xl p-6" />;

    const filtered = filterCategory === 'all' ? insights : insights.filter(i => i.category === filterCategory);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">⚡ Performance Insights</h2>
                <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
                    + New Insight
                </button>
            </div>

            {/* Add form */}
            {showForm && (
                <form onSubmit={handleCreate} className="bg-white dark:bg-slate-800 border rounded-xl p-4 space-y-3">
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Insight title *" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" autoFocus required />
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={2} className="w-full px-3 py-2 border rounded-lg resize-y" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select value={category} onChange={(e) => setCategory(e.target.value as MetricCategory)} className="px-3 py-2 border rounded-lg">
                            {Object.entries(CATEGORY_ICONS).map(([key, icon]) => <option key={key} value={key}>{icon} {key.charAt(0).toUpperCase() + key.slice(1)}</option>)}
                        </select>
                        <select value={impact} onChange={(e) => setImpact(e.target.value as ImpactLevel)} className="px-3 py-2 border rounded-lg">
                            <option value="low">Low Impact</option>
                            <option value="medium">Medium Impact</option>
                            <option value="high">High Impact</option>
                        </select>
                    </div>
                    <button type="submit" disabled={!title.trim()} className="w-full sm:w-auto px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg font-medium">Add Insight</button>
                </form>
            )}

            {/* Category filters */}
            {(() => {
                const categoryOptions = [
                    { value: 'all' as const, label: 'All' },
                    ...Object.keys(CATEGORY_ICONS).map(c => ({
                        value: c as MetricCategory,
                        label: `${CATEGORY_ICONS[c as MetricCategory]} ${c}`,
                    })),
                ];
                return (
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {categoryOptions.map(f => (
                        <button key={f.value} onClick={() => setFilterCategory(f.value)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterCategory === f.value ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border hover:border-slate-400'}`}>
                            {f.label} ({f.value === 'all' ? insights.length : insights.filter(i => i.category === f.value).length})
                        </button>
                    ))}
                </div>);
            })()}

            {/* Empty state */}
            {filtered.length === 0 && <div className="text-center py-12 text-slate-400">No insights yet. Run analysis or add one manually.</div>}

            {/* Insights list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {filtered.map(insight => (
                    <div key={insight.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-3">
                            <span className="text-xl mt-0.5">{CATEGORY_ICONS[insight.category as MetricCategory]}</span>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-medium text-slate-900 dark:text-white truncate">{insight.title}</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{insight.description}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                                        insight.impact_level === 'high' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' :
                                        insight.impact_level === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' :
                                        'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                    }`}>
                                        {insight.impact_level} impact
                                    </span>
                                    <span className="text-xs text-slate-400">{new Date(insight.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}