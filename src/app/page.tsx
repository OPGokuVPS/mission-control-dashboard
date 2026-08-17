'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-provider';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import { useFactoryContext } from '@/hooks/useFactoryContext';
import { TaskControlCenter } from '@/components/TaskControlCenter';
import { WorkflowTracker } from '@/components/WorkflowTracker';
import { AgentActivityFeed } from '@/components/AgentActivityFeed';
import { BusinessImpactPanel } from '@/components/BusinessImpactPanel';
import { AlertsRisksPanel } from '@/components/AlertsRisksPanel';
import { CommandInterface } from '@/components/CommandInterface';
import { MemoryVault } from '@/components/MemoryVault';
import { ExperimentsPanel } from '@/components/ExperimentsPanel';
import { CostTracking } from '@/components/CostTracking';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { StrategyOverview } from '@/components/StrategyOverview';
import { CardSkeleton } from '@/components/SkeletonLoader';

type Tab = 'overview' | 'tasks' | 'workflows' | 'activity' | 'insights' | 'alerts' | 'memory' | 'experiments' | 'costs' | 'strategy';

const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'tasks', label: 'Tasks', icon: '✅' },
    { id: 'workflows', label: 'Workflows', icon: '⚙️' },
    { id: 'activity', label: 'Agents', icon: '🤖' },
    { id: 'insights', label: 'Impact', icon: '📈' },
    { id: 'alerts', label: 'Alerts', icon: '🔔' },
    { id: 'memory', label: 'Memory', icon: '🧠' },
    { id: 'experiments', label: 'Tests', icon: '🔬' },
    { id: 'costs', label: 'Costs', icon: '💰' },
    { id: 'strategy', label: 'Strategy', icon: '🎯' },
];

export default function Dashboard() {
    const { user, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const triggerRefresh = useCallback(() => setRefreshKey(k => k + 1), []);

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
                <div className="text-center text-white">
                    <p className="text-xl mb-4">Redirecting to login...</p>
                    <a href="/login" className="text-blue-400 hover:underline">Sign in</a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
            {/* ===== HEADER ===== */}
            <header className="sticky top-0 z-40 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-14 sm:h-16">
                        {/* Logo / Title */}
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                className="sm:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                                onClick={() => setShowMobileMenu(!showMobileMenu)}
                                aria-label="Toggle menu"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showMobileMenu ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
                                </svg>
                            </button>
                            <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
                                🚀 Mission Control
                            </span>
                            {/* Quick stats */}
                            {summary && !summaryLoading && (
                                <div className="hidden md:flex items-center gap-3 ml-4 text-xs">
                                    <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-medium">
                                        {summary.tasks} tasks
                                    </span>
                                    <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full font-medium">
                                        {summary.active_experiments} tests
                                    </span>
                                    <span className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-1 rounded-full font-medium">
                                        {summary.alerts} alerts
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Right side */}
                        <div className="flex items-center gap-2 sm:gap-4">
                            <span className="hidden sm:block text-sm text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                                {user.email}
                            </span>
                            <button
                                onClick={signOut}
                                className="text-sm text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors px-2 py-1"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile nav */}
                {showMobileMenu && (
                    <div className="sm:hidden border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                        <div className="grid grid-cols-5 gap-1 p-2">
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => { setActiveTab(tab.id); setShowMobileMenu(false); }}
                                    className={`flex flex-col items-center py-2 px-1 rounded-lg text-xs transition-colors ${
                                        activeTab === tab.id
                                            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <span className="text-lg mb-0.5">{tab.icon}</span>
                                    <span className="truncate w-full text-center">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Desktop nav */}
                <div className="hidden sm:block border-t border-slate-200 dark:border-slate-700">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="flex gap-1 py-1.5 overflow-x-auto">
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                                        activeTab === tab.id
                                            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <span>{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            {/* ===== MAIN CONTENT ===== */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
                <ErrorBoundary onError={() => {}}>
                    {renderTab(activeTab, refreshKey, triggerRefresh)}
                </ErrorBoundary>
            </main>
        </div>
    );
}

function renderTab(tab: Tab, refreshKey: number, triggerRefresh: () => void) {
    switch (tab) {
        case 'overview':
            return <OverviewTab refreshKey={refreshKey} />;
        case 'tasks':
            return <TaskControlCenter onUpdate={triggerRefresh} />;
        case 'workflows':
            return <WorkflowTracker />;
        case 'activity':
            return <AgentActivityFeed />;
        case 'insights':
            return <BusinessImpactPanel />;
        case 'alerts':
            return <AlertsRisksPanel />;
        case 'memory':
            return <MemoryVault />;
        case 'experiments':
            return <ExperimentsPanel />;
        case 'costs':
            return <CostTracking />;
        case 'strategy':
            return <StrategyOverview onUpdate={triggerRefresh} />;
        default:
            return <OverviewTab refreshKey={refreshKey} />;
    }
}

function OverviewTab({ refreshKey }: { refreshKey: number }) {
    const { data: summary, isLoading, error } = useDashboardSummary();
    const { data: context } = useFactoryContext();

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500 mb-2">Failed to load dashboard</p>
                <p className="text-sm text-slate-500">{(error as Error).message}</p>
            </div>
        );
    }

    if (isLoading || !summary) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
        );
    }

    const cards = [
        { label: 'Total Tasks', value: summary.tasks, icon: '✅', color: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200' },
        { label: 'Active Workflows', value: summary.workflows, icon: '⚙️', color: 'bg-purple-50 dark:bg-purple-900/30 border-purple-200' },
        { label: 'Active Alerts', value: summary.alerts, icon: '🔔', color: 'bg-red-50 dark:bg-red-900/30 border-red-200' },
        { label: 'Running Experiments', value: summary.active_experiments, icon: '🔬', color: 'bg-green-50 dark:bg-green-900/30 border-green-200' },
        { label: 'Agents Busy', value: summary.agents_busy, icon: '🤖', color: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200' },
        { label: 'Cost Today', value: `$${summary.cost_today}`, icon: '💰', color: 'bg-teal-50 dark:bg-teal-900/30 border-teal-200' },
    ];

    return (
        <div className="space-y-6">
            {/* Factory context banner */}
            {context && context.industry && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold text-blue-700 dark:text-blue-300">🎯 Factory Context:</span>
                        <span className="text-slate-600 dark:text-slate-400">{context.industry}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-600 dark:text-slate-400">{context.business_model}</span>
                        {context.primary_kpis?.length > 0 && (
                            <>
                                <span className="text-slate-300">·</span>
                                <span className="text-slate-500 dark:text-slate-400">
                                    {context.primary_kpis.length} KPI{(context.primary_kpis.length > 1 ? 's' : '')} tracked
                                </span>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Summary cards grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {cards.map(card => (
                    <div key={card.label} className={`${card.color} border rounded-xl p-3 sm:p-4`}>
                        <div className="text-xl sm:text-2xl mb-1">{card.icon}</div>
                        <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{card.value}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{card.label}</div>
                    </div>
                ))}
            </div>

            {/* Command interface + Activity feed on overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                    <AgentActivityFeed compact />
                </div>
                <div>
                    <CommandInterface onUpdate={() => {}} />
                </div>
            </div>
        </div>
    );
}