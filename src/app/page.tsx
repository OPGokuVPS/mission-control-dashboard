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
    const [showCommand, setShowCommand] = useState(false);
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
                        {/* Left: branding */}
                        <div className="flex items-center gap-3">
                            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                                🤖 Mission Control Dashboard
                            </h1>
                            {summaryLoading ? (
                                <div className="hidden sm:block w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                            ) : summary ? (
                                <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-3 py-1.5 rounded-full whitespace-nowrap">
                                    <span>{summary.tasks} tasks</span>
                                    <span>{summary.workflows} workflows</span>
                                    <span>{summary.alerts} alerts</span>
                                </div>
                            ) : null}
                        </div>

                        {/* Right */}
                        <div className="flex items-center gap-2">
                            {/* mobile menu toggle */}
                            <button
                                onClick={() => setShowMobileMenu(!showMobileMenu)}
                                className="sm:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                            >
                                {showMobileMenu ? '✕' : '☰'}
                            </button>
                            {/* Command Interface toggle */}
                            <button
                                onClick={() => setShowCommand(!showCommand)}
                                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                    showCommand
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                💻 CLI
                            </button>
                            {/* desktop user menu */}
                            <div className="hidden sm:flex items-center gap-3">
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                    {user.email}
                                </span>
                                <button
                                    onClick={() => signOut()}
                                    className="px-3 py-1.5 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* mobile menu */}
                    {showMobileMenu && (
                        <div className="sm:hidden pb-3 border-t border-slate-200 dark:border-slate-700 pt-2">
                            <div className="text-sm text-slate-500 mb-2">{user.email}</div>
                            <button
                                onClick={() => signOut()}
                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                            >
                                Sign Out
                            </button>
                        </div>
                    )}

                    {/* Command Interface overlay */}
                    {showCommand && (
                        <div className="mb-4">
                            <CommandInterface onUpdate={triggerRefresh} />
                        </div>
                    )}
                </div>
            </header>

            {/* ===== BODY ===== */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
                {/* Tabs */}
                <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-3 mb-4 border-b border-slate-200 dark:border-slate-700 -mx-4 sm:mx-0 px-4 sm:px-0">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                                activeTab === tab.id
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <span>{tab.icon}</span>
                            <span className="hidden xs:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Active tab content */}
                <main>
                    {renderTab(activeTab, refreshKey, triggerRefresh)}
                </main>
            </div>
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
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
                <p className="text-red-600 dark:text-red-400">Error loading dashboard data</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
                {[
                    { label: 'Tasks', value: summary?.tasks, icon: '✅', color: 'blue' },
                    { label: 'Active Workflows', value: summary?.workflows, icon: '⚙️', color: 'emerald' },
                    { label: 'Active Alerts', value: summary?.alerts, icon: '🔔', color: 'red' },
                    { label: 'Experiments', value: summary?.active_experiments, icon: '🔬', color: 'purple' },
                    { label: 'Busy Agents', value: summary?.agents_busy, icon: '🤖', color: 'amber' },
                    { label: "Today's Cost", value: summary?.cost_today ? `$${summary.cost_today}` : '$0', icon: '💰', color: 'cyan' },
                ].map((metric, idx) => (
                    <div
                        key={idx}
                        className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-5 transition-all hover:shadow-md ${
                            isLoading ? 'animate-pulse' : ''
                        }`}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{metric.icon}</span>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                {metric.label}
                            </span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                            {isLoading ? '—' : (metric.value ?? '—')}
                        </div>
                    </div>
                ))}
            </div>

            {/* Factory Context Bar */}
            {context && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold text-blue-700 dark:text-blue-300">🎯 Factory Context:</span>
                        <span className="text-slate-600 dark:text-slate-400">{context.industry}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-600 dark:text-slate-400">{context.business_model}</span>
                        {(context.primary_kpis?.length ?? 0) > 0 && (
                            <>
                                <span className="text-slate-300">·</span>
                                <span className="text-slate-500 dark:text-slate-400">
                                    {(context.primary_kpis?.length ?? 0)} KPI{(context.primary_kpis?.length ?? 0) > 1 ? 's' : ''} tracked
                                </span>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}