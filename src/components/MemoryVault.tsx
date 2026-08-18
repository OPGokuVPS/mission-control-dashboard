'use client';

import { useState } from 'react';
import { useMemories, useAddMemory, useDeleteMemory } from '@/hooks/useMemories';
import type { MemoryType } from '@/types';
import { CardSkeleton, SkeletonLoader } from '@/components/SkeletonLoader';

const TYPE_ICONS: Record<MemoryType, string> = {
    successful_approach: '✅',
    failure_pattern: '❌',
    architecture_decision: '🏗️',
    kpi_learning: '📊',
};

const TYPE_LABELS: Record<MemoryType, string> = {
    successful_approach: 'Successful Approach',
    failure_pattern: 'Failure Pattern',
    architecture_decision: 'Architecture Decision',
    kpi_learning: 'KPI Learning',
};

export function MemoryVault() {
    const { data: memories = [], isLoading } = useMemories();
    const addMemory = useAddMemory();
    const deleteMemory = useDeleteMemory();
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState<MemoryType>('successful_approach');
    const [filterType, setFilterType] = useState<MemoryType | 'all'>('all');

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;
        await addMemory.mutateAsync({ title: title.trim(), content: content.trim(), category });
        setTitle('');
        setContent('');
        setShowForm(false);
    }

    if (isLoading) return <SkeletonLoader lines={4} className="bg-white rounded-xl p-6" />;

    const filtered = filterType === 'all' ? memories : memories.filter((m: any) => m.category === filterType);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">🧠 Memory Vault</h2>
                <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">+ Add Memory</button>
            </div>

            {showForm && (
                <form onSubmit={handleCreate} className="bg-white dark:bg-slate-800 border rounded-xl p-4 space-y-3">
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Memory title *" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" autoFocus required />
                    <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Content..." rows={4} className="w-full px-3 py-2 border rounded-lg resize-y focus:ring-2 focus:ring-indigo-500 outline-none" required />
                    <select value={category} onChange={(e) => setCategory(e.target.value as MemoryType)} className="w-full px-3 py-2 border rounded-lg">
                        {Object.entries(TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                    <div className="flex gap-2">
                        <button type="submit" disabled={!title.trim() || !content.trim()} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium">Save</button>
                        <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg">Cancel</button>
                    </div>
                </form>
            )}

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['all', ...Object.keys(TYPE_LABELS)] as Array<string>).map(type => (
                    <button key={type} onClick={() => setFilterType(type as any)} className={`bg-white dark:bg-slate-800 border rounded-xl p-3 text-center cursor-pointer transition-all ${filterType === type ? 'ring-2 ring-indigo-500' : 'hover:shadow-md'}`}>
                        {type !== 'all' && <span className="text-lg">{TYPE_ICONS[type as MemoryType]}</span>}
                        {type === 'all' && <span className="text-lg">🧠</span>}
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {type === 'all' ? memories.length : memories.filter((m: any) => m.category === type).length}
                        </div>
                    </button>
                ))}
            </div>

            {/* Memories list */}
            <div className="space-y-3">
                {filtered.map((mem: any) => (
                    <div key={mem.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{TYPE_ICONS[mem.category as MemoryType]}</span>
                                <h3 className="font-medium text-slate-900 dark:text-white">{mem.title}</h3>
                            </div>
                            <button onClick={() => deleteMemory.mutate(mem.id)} className="text-slate-400 hover:text-red-500 text-sm">✕</button>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{mem.content}</p>
                        <div className="mt-2 text-xs text-slate-400">Added: {new Date(mem.created_at).toLocaleDateString()}</div>
                    </div>
                ))}
            </div>
            {filtered.length === 0 && <div className="text-center py-8 text-slate-400">No memories stored yet.</div>}
        </div>
    );
}