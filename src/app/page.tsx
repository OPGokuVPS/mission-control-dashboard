'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth-provider';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import { useFactoryContext } from '@/hooks/useFactoryContext';
import { TaskControlCenter } from '@/components/TaskControlCenter';
import { WorkflowTracker } from '@/components/WorkflowTracker';
import { AgentActivityFeed } from '@/components/AgentActivityFeed';
import { AgentWorkloadDashboard } from '@/components/AgentWorkloadDashboard';
import { BusinessImpactPanel } from '@/components/BusinessImpactPanel';
import { AlertsRisksPanel } from '@/components/AlertsRisksPanel';
import { CommandInterface } from '@/components/CommandInterface';
import { CommandOverlay } from '@/components/CommandOverlay';
import { MemoryVault } from '@/components/MemoryVault';
import { ExperimentsPanel } from '@/components/ExperimentsPanel';
import { CostTracking } from '@/components/CostTracking';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { StrategyOverview } from '@/components/StrategyOverview';
import { CardSkeleton } from '@/components/SkeletonLoader';
import { AgentPerformanceMetricsPanel } from '@/components/AgentPerformanceMetricsPanel';
import { ConnectionStatusIndicator } from '@/components/ConnectionStatusIndicator';
import { useMarketData } from '@/hooks/useMarketData';
import { MarketStatusPanel } from '@/components/MarketStatusPanel';

type Tab = 'overview' | 'tasks' | 'workflows' | 'activity' | 'performance' | 'insights' | 'alerts' | 'memory' | 'experiments' | 'costs' | 'strategy';

interface TabDef {
    id: Tab;
    label: string;
    icon: string;
    description: string;
}

// Nav groups: each sub-array is separated by a visual divider
const TAB_GROUPS: TabDef[][] = [
    // ── Operations ────────────────────────────────
    [
        { id: 'overview', label: 'Dashboard', icon: '🏠', description: 'Key metrics at a glance' },
        { id: 'tasks', label: 'Tasks', icon: '✅', description: 'Create, track, and manage tasks' },
        { id: 'workflows', label: 'Workflows', icon: '⚙️', description: 'Automated workflow pipelines' },
    ],
    // ── Agents ────────────────────────────────────
    [
        { id: 'activity', label: 'Agents', icon: '🤖', description: 'Agent workload & activity feed' },
        { id: 'performance', label: 'Metrics', icon: '📉', description: 'Agent performance KPIs & trends' },
    ],
    // ── Analytics ─────────────────────────────────
    [
        { id: 'insights', label: 'Impact', icon: '📋', description: 'Business impact measurements' },
        { id: 'costs', label: 'Costs', icon: '💵', description: 'Usage & cost tracking' },
    ],
    // ── System ────────────────────────────────────
    [
        { id: 'alerts', label: 'Alerts', icon: '🔔', description: 'Active alerts & risks' },
        { id: 'memory', label: 'Memory', icon: '🧠', description: 'Knowledge vault & memory store' },
        { id: 'experiments', label: 'Experiments', icon: '🧪', description: 'Test experiments & A/B tests' },
        { id: 'strategy', label: 'Strategy', icon: '🎯', description: 'Strategic planning & context' },
    ],
];

// Flatten for easier lookups
const ALL_TABS = TAB_GROUPS.flat();
function findTab(id: Tab): TabDef | undefined {
    return ALL_TABS.find(t => t.id === id);
}

export default function Dashboard() {
    const { user, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showCommand, setShowCommand] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // Keep a ref to the latest `showCommand` value so the keyboard
    // listener (registered once) always reads the current state without
    // needing to be re-attached on every toggle.
    const showCommandRef = useRef(showCommand);
    useEffect(() => {
        showCommandRef.current = showCommand;
    }, [showCommand]);

    const triggerRefresh = useCallback(() => setRefreshKey(k => k + 1), []);

    // Global keyboard shortcuts (capture phase):
    //   Esc              → close overlay
    //   Ctrl/Cmd + K     → toggle overlay
    //   Ctrl/Cmd + /     → toggle overlay
    // We listen on `document` during the capture phase so the handler
    // fires *before* any focused element swallows the event — this
    // means the shortcuts work even when typing inside inputs, selects,
    // etc.  Only `preventDefault()` for shortcuts we own; OS combos
    // such as Ctrl+W remain untouched.
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            // --- Close with Escape ---
            if (e.key === 'Escape' && showCommandRef.current) {
                e.preventDefault();
                setShowCommand(false);
                return;
            }
            // --- Toggle with Ctrl/Cmd + K or / ---
            const mod = e.ctrlKey || e.metaKey;
            if (!mod) return;
            if (e.key !== '/' && e.key !== 'k') return;
            if (e.shiftKey || e.altKey) return;
            if (e.ctrlKey && e.metaKey) return;
            e.preventDefault();
            setShowCommand(prev => !prev);
        }
        document.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, []);

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
                            {/* Command Interface toggle — desktop */}
                            <button
                                onClick={() => setShowCommand(!showCommand)}
                                title="Toggle Command Interface (Ctrl+K or Ctrl+/)"
                                aria-label="Toggle Command Interface"
                                className={`group flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                                    showCommand
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-700 shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                {/* Terminal icon — rotates slightly on hover */}
                                <svg
                                    className={`w-4 h-4 transition-transform duration-200 ${
                                        showCommand ? 'text-blue-600 dark:text-blue-400' : 'group-hover:scale-110'
                                    }`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3" />
                                </svg>
                                <span className="hidden lg:inline font-medium">CLI</span>
                                <kbd className="text-[10px] leading-none font-mono px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 opacity-70">⌘K</kbd>
                                {/* Active indicator dot */}
                                {showCommand && (
                                    <span className="relative flex h-2 w-2 shrink-0">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                                    </span>
                                )}
                            </button>
                            {/* Real-time connection status */}
                            <div className="hidden sm:block">
                                <ConnectionStatusIndicator />
                            </div>
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
                                onClick={() => setShowCommand(!showCommand)}
                                title="Toggle Command Interface"
                                aria-label="Toggle Command Interface"
                                className={`flex items-center gap-2 w-full text-left px-3 py-2 text-sm rounded-lg transition-colors mb-2 ${
                                    showCommand
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                        : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3" />
                                </svg>
                                <span>Toggle Command Interface</span>
                                <kbd className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400">⌘K</kbd>
                            </button>
                            <button
                                onClick={() => signOut()}
                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                            >
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* ===== BODY ===== */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
                {/* Tabs */}
                <div className="pb-3 mb-4 border-b border-slate-200 dark:border-slate-700 -mx-4 sm:mx-0 px-4 sm:px-0">
                    <nav className="flex flex-wrap items-center gap-x-1 gap-y-1" aria-label="Navigation tabs">
                        {TAB_GROUPS.map((group, gIdx) => (
                            <>
                                {gIdx > 0 && (
                                    <span className="w-px h-6 bg-slate-200 dark:bg-slate-700 self-center mx-1 hidden sm:block" aria-hidden="true" />
                                )}
                                {group.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        title={tab.description}
                                        role="tab"
                                        aria-selected={activeTab === tab.id}
                                        aria-controls={`panel-${tab.id}`}
                                        className={`
                                            group/nav flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-150 relative
                                            ${activeTab === tab.id
                                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                                            }
                                        `}
                                    >
                                        <span className="text-base leading-none shrink-0">{tab.icon}</span>
                                        <span className="shrink-0">{tab.label}</span>
                                        {/* Tooltip on hover for non-active items */}
                                        <span className={`
                                            absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 text-xs text-white bg-slate-800 dark:bg-slate-600 rounded-md shadow-lg opacity-0 pointer-events-none transition-opacity duration-150 z-50 whitespace-nowrap
                                            ${activeTab === tab.id ? '' : 'group-hover/nav:opacity-100'}
                                        `}>
                                            {tab.description}
                                        </span>
                                    </button>
                                ))}
                            </>
                        ))}
                    </nav>
                </div>

                {/* Active tab content */}
                <main>
                    {renderTab(activeTab, refreshKey, triggerRefresh)}
                </main>
            </div>

            {/* ===== Command Interface overlay (below sticky header, above content) ===== */}
            <CommandOverlay show={showCommand} onUpdate={triggerRefresh} />
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
            return <AgentWorkloadDashboard />;
        case 'performance':
            return <AgentPerformanceMetricsPanel />;
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
    const { data: marketData, isLoading: marketLoading } = useMarketData();

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

            {/* Market Status */}
            <div className="grid grid-cols-1 xl:col-span-6">
                {marketLoading ? (
                    <CardSkeleton />
                ) : marketData ? (
                    <MarketStatusPanel data={marketData} />
                ) : null}
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