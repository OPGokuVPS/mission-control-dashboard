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

/** Group labels used to title each section in the drawer menu. */
const GROUP_LABELS = ['Operations', 'Agents', 'Analytics', 'System'];

export default function Dashboard() {
    const { user, signOut } = useAuth();
    
    // Persistent tab selection — restore last visited tab
    const [savedTab, setSavedTab] = useState<string | null>(null);
    const activeTabState = savedTab ? (savedTab as Tab) : 'overview';
    const [activeTab, setActiveTabInternal] = useState<Tab>(activeTabState);
    
    const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
    const [showDrawer, setShowDrawer] = useState(false);
    const [showCommand, setShowCommand] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // Persist tab selection to localStorage
    const setActiveTab = useCallback((tab: Tab) => {
        setActiveTabInternal(tab);
        try { localStorage.setItem('nav-active-tab', tab); } catch {}
    }, []);
    
    // Load saved tab on mount
    useEffect(() => {
        if (!savedTab) {
            try {
                const restored = localStorage.getItem('nav-active-tab');
                if (restored && ALL_TABS.some(t => t.id === restored)) {
                    setSavedTab(restored);
                }
            } catch {}
        }
    }, [savedTab]);

    // Close drawer when clicking outside
    useEffect(() => {
        if (!showDrawer) return;
        function handleBackdropClick(e: MouseEvent) {
            const target = e.target as HTMLElement;
            // Only close if click is NOT on a nav-button or the drawer trigger itself
            if (!target.closest('[data-nav-btn]') && !target.closest('[data-nav-trigger]')) {
                setShowDrawer(false);
            }
        }
        document.addEventListener('click', handleBackdropClick, true);
        return () => document.removeEventListener('click', handleBackdropClick, true);
    }, [showDrawer]);

    // Keep a ref to the latest `showCommand` value so the keyboard
    // listener (registered once) always reads the current state without
    // needing to be re-attached on every toggle.
    const showCommandRef = useRef(showCommand);
    useEffect(() => {
        showCommandRef.current = showCommand;
    }, [showCommand]);
    
    // Keyboard shortcuts: Ctrl+K/Ctrl+/ to toggle CLI, Escape to close overlays,
    // Ctrl+1 through Ctrl+9 to jump to tabs 1–9
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            // --- Close overlays with Escape ---
            if (e.key === 'Escape') {
                if (showCommandRef.current) {
                    e.preventDefault();
                    setShowCommand(false);
                    return;
                }
            }
            // --- Toggle CLI with Ctrl/Cmd + K or / ---
            const mod = e.ctrlKey || e.metaKey;
            if (mod && (e.key === '/' || e.key === 'k') && !e.shiftKey && !e.altKey && !(e.ctrlKey && e.metaKey)) {
                e.preventDefault();
                setShowCommand(prev => !prev);
                return;
            }
            // --- Numbered tab shortcuts: Ctrl+1 through Ctrl+9 ---
            if (mod) {
                const digit = parseInt(e.key);
                if (digit >= 1 && digit <= 9 && !e.shiftKey && !e.altKey) {
                    const idx = digit - 1;
                    if (idx < ALL_TABS.length) {
                        e.preventDefault();
                        setActiveTab(ALL_TABS[idx].id);
                        setShowDrawer(false);
                    }
                }
            }
        }
        document.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, []);

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
                        {/* Left: hamburger trigger + branding */}
                        <div className="flex items-center gap-2 sm:gap-3">
                            {/* Hamburger menu toggle — opens navigation drawer */}
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowDrawer(!showDrawer); }}
                                className="p-2 -ml-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                                aria-label="Open navigation menu"
                                aria-expanded={showDrawer}
                                data-nav-trigger
                            >
                                {showDrawer ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                )}
                            </button>
                            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                                🤖 Mission Control
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
                </div>
            </header>

            {/* ===== NAVIGATION DRAWER (overlay) ===== */}
            {showDrawer && (
                <div className="fixed inset-0 z-50">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDrawer(false)} />
                    {/* Drawer panel — slides in from left */}
                    <nav className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white dark:bg-slate-800 shadow-2xl overflow-y-auto z-10" role="navigation" aria-label="Navigation menu">
                        {/* Drawer header */}
                        <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
                            <span className="font-semibold text-slate-900 dark:text-white text-sm uppercase tracking-wider">Navigate</span>
                            <button
                                onClick={() => setShowDrawer(false)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
                                aria-label="Close navigation"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Groups */}
                        <div className="p-3 space-y-1">
                            {TAB_GROUPS.map((group, gIdx) => (
                                <div key={gIdx} className="mb-3">
                                    {/* Group label */}
                                    <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                        {GROUP_LABELS[gIdx]}
                                    </p>
                                    {/* Tabs in group */}
                                    {group.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => { setActiveTab(tab.id); setShowDrawer(false); }}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 ${
                                                activeTab === tab.id
                                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                                            }`}
                                            data-nav-btn
                                        >
                                            <span className="text-lg shrink-0">{tab.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-medium block leading-tight">{tab.label}</span>
                                                <span className={`text-[11px] ${activeTab === tab.id ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 dark:text-slate-500'} block truncate`}>
                                                    {tab.description}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>

                        {/* Drawer footer */}
                        <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 space-y-3">
                            {/* CLI shortcut */}
                            <button
                                onClick={() => { setShowCommand(!showCommand); setShowDrawer(false); }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                                    showCommand
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                                }`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3" />
                                </svg>
                                <span>Toggle CLI</span>
                                <kbd className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400">⌘K</kbd>
                            </button>
                            {/* Sign out */}
                            <button
                                onClick={() => signOut()}
                                className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                            >
                                Sign Out
                            </button>
                        </div>
                    </nav>
                </div>
            )}

            {/* ===== BODY ===== */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
                {/* Desktop tab bar */}
                <div className="hidden sm:block pb-3 mb-4 border-b border-slate-200 dark:border-slate-700 -mx-4 sm:mx-0 px-4 sm:px-0">
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
                                        data-nav-btn
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
                                        {/* Shortcut hint (Ctrl+1..9) */}
                                        {(() => {
                                            const tabIndex = ALL_TABS.findIndex(t => t.id === tab.id) + 1;
                                            if (tabIndex < 10) {
                                                return (
                                                    <span className="shrink-0 text-[10px] font-mono opacity-40 ml-0.5">{tabIndex}</span>
                                                );
                                            }
                                            return null;
                                        })()}
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
