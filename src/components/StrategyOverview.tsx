'use client';

import { useState } from 'react';
import { useFactoryContext, useUpdateFactoryContext } from '@/hooks/useFactoryContext';
import { CardSkeleton, SkeletonLoader } from '@/components/SkeletonLoader';
import type { FactoryContext } from '@/types';

const BUSINESS_MODELS = ['SaaS', 'Marketplace', 'E-commerce', 'Fintech', 'Healthcare', 'Travel', 'Education', 'Lead Generation', 'Subscription', 'Transactional'];
const INDUSTRIES = ['Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Education', 'Real Estate', 'Media', 'Logistics', 'Consulting'];

export function StrategyOverview({ onUpdate }: { onUpdate?: () => void }) {
    const { data: context, isLoading, error } = useFactoryContext();
    const updateCtx = useUpdateFactoryContext();
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState<Partial<FactoryContext>>({});

    if (error) return <div className="text-red-500">Error loading strategy context</div>;

    if (!context || !context.industry) {
        return (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">🎯 Factory Context Configuration</h2>
                <p className="text-slate-600 dark:text-slate-400">
                    Configure your factory context to enable intelligent agent routing and KPI-aligned task prioritization.
                </p>
                <button onClick={() => { setEditing(true); }} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors">
                    Configure Factory Context
                </button>
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                    <h3 className="font-semibold text-lg mb-4">Why this matters:</h3>
                    <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <li>• Agent roles are automatically assigned based on business context</li>
                        <li>• Task priorities align with your primary KPIs</li>
                        <li>• All decisions flow from your industry and constraints</li>
                    </ul>
                </div>
            </div>
        );
    }

    if (editing) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">🎯 Edit Factory Context</h2>
                    <button onClick={() => setEditing(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg">Cancel</button>
                </div>
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    await updateCtx.mutateAsync(form as any);
                    setEditing(false);
                    onUpdate?.();
                }} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Industry</label>
                        <select value={form.industry || ''} onChange={(e) => setForm(f => ({ ...f, industry: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="">Select industry...</option>
                            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Business Model</label>
                        <select value={form.business_model || ''} onChange={(e) => setForm(f => ({ ...f, business_model: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="">Select model...</option>
                            {BUSINESS_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Primary KPIs (comma-separated)</label>
                        <input value={form.primary_kpis?.join(', ') || ''} onChange={(e) => setForm(f => ({ ...f, primary_kpis: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                            placeholder="revenue, conversion rate, retention" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <button type="submit" disabled={updateCtx.isPending} className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors">
                        Save Changes
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">🎯 Factory Context</h2>
                <button onClick={() => setEditing(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">Edit</button>
            </div>

            {/* Current context */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
                    <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">Industry</div>
                    <div className="text-lg font-semibold text-blue-800 dark:text-blue-200">{context.industry}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-5">
                    <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">Business Model</div>
                    <div className="text-lg font-semibold text-purple-800 dark:text-purple-200">{context.business_model}</div>
                </div>
            </div>

            {/* KPIs */}
            {context.primary_kpis && context.primary_kpis.length > 0 && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-3">📊 Primary KPIs</h3>
                    <div className="flex flex-wrap gap-2">
                        {context.primary_kpis.map((kpi, i) => (
                            <span key={i} className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">{kpi}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Agent routing guide */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4">🤖 Agent Routing Guide</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[...Array(9)].map((_, i) => {
                        const role = ['strategy', 'system_architect', 'backend_engineer', 'frontend_engineer', 'integration_engineer', 'qa', 'devops', 'security', 'data', 'growth', 'support_and_monitoring'][i];
                        const icons = ['🎯', '🏗️', '⚙️', '🎨', '🔌', '✅', '🚀', '🔒', '📊', '📈', '🛟'];
                        const labels = ['Strategy', 'Architecture', 'Backend', 'Frontend', 'Integration', 'QA', 'DevOps', 'Security', 'Data', 'Growth', 'Support'];
                        return (
                            <div key={role} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                <span className="text-xl">{icons[i]}</span>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{labels[i]}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Constraints */}
            {context.constraints && (<div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3">⚠️ Business Constraints</h3>
                <div className="flex flex-wrap gap-2">
                    {JSON.parse(context.constraints).map((c: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-sm">{c}</span>
                    ))}
                </div>
            </div>)}
        </div>
    );
}