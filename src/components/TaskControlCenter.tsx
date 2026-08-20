'use client';

import { useState, useMemo } from 'react';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import type { TaskStatus, PriorityLevel, AgentRole } from '@/types';
import { CardSkeleton, SkeletonLoader } from '@/components/SkeletonLoader';
import { FilterPresets, MobileFilterSheet, FAB, ExpandCollapseToggle } from '@/components/MobileFilterSheet';
import { LiveTimer } from '@/components/LiveTimer';
import { StaleTaskBanner } from '@/components/StaleTaskBanner';
import { useTaskStart, useTaskStop } from '@/hooks/useTaskStartStop';
import { useTaskHeartbeat } from '@/hooks/useTaskHeartbeat';

// Status column order for Kanban board
const KANBAN_COLUMNS: Array<TaskStatus | 'deprecated'> = ['backlog', 'active', 'blocked', 'in_review', 'done', 'deprecated'];

export function TaskControlCenter({ onUpdate }: { onUpdate: () => void }) {
    const { data: tasks = [], isLoading, error } = useTasks();
    const createTask = useCreateTask();
    const updateTask = useUpdateTask();
    const deleteTask = useDeleteTask();
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<PriorityLevel>('medium');
    const [agent, setAgent] = useState<AgentRole>('backend_engineer');
    const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');

    // Preset filter state
    const [presetFilter, setPresetFilter] = useState<string>('all');

    // Mobile form modal
    const [mobileFormOpen, setMobileFormOpen] = useState(false);

    // --- Helpers ---
    const getAgentLabel = (role?: string): string => {
        const labels: Record<string, string> = AGENT_LABELS;
        return labels[role ?? ''] ?? role ?? 'Unassigned';
    };

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim()) return;
        await createTask.mutateAsync({
            title: title.trim(),
            description: description.trim(),
            priority,
            status: 'backlog',
            assigned_agent: agent,
        });
        setTitle('');
        setDescription('');
        setPriority('medium');
        setAgent('backend_engineer');
        setShowForm(false);
        onUpdate();
    }

    async function handleDelete(id: number) {
        if (!confirm('Delete this task?')) return;
        await deleteTask.mutateAsync(id);
        onUpdate();
    }

    async function handleStatusChange(id: number, newStatus: string) {
        await updateTask.mutateAsync({ id, status: newStatus as TaskStatus });
        onUpdate();
    }

    const statuses: Array<TaskStatus | 'all'> = ['all', 'backlog', 'active', 'blocked', 'in_review', 'done', 'deprecated'];

    // Filter presets options
    const presetOptions = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const myCount = tasks.filter(t => t.status !== 'done').length;
        const highPriorityCount = tasks.filter(t => t.priority === 'high' || t.priority === 'critical').length;
        const dueTodayCount = tasks.filter(t => t.deadline?.startsWith(today)).length;

        return [
            { id: 'all', label: 'All', icon: '🌐', count: tasks.length },
            { id: 'my-tasks', label: 'My Tasks', icon: '📋', count: myCount },
            { id: 'high-priority', label: 'High Priority', icon: '⚡', count: highPriorityCount },
            { id: 'due-today', label: 'Due Today', icon: '⏰', count: dueTodayCount },
            { id: 'blocking', label: 'Blocked', icon: '🚫', count: tasks.filter(t => t.status === 'blocked').length },
            { id: 'doing', label: 'In Progress', icon: '🔨', count: tasks.filter(t => t.status === 'active').length },
        ];
    }, [tasks]);

    // Apply preset filter to the tasks list
    const visibleTasks = useMemo(() => {
        switch (presetFilter) {
            case 'my-tasks':
                return tasks.filter(t => t.status !== 'done');
            case 'high-priority':
                return tasks.filter(t => t.priority === 'high' || t.priority === 'critical');
            case 'due-today': {
                const today = new Date().toISOString().split('T')[0];
                return tasks.filter(t => t.deadline?.startsWith(today));
            }
            case 'blocking':
                return tasks.filter(t => t.status === 'blocked');
            case 'doing':
                return tasks.filter(t => t.status === 'active');
            default:
                return tasks;
        }
    }, [presetFilter, tasks]);

    const filtered = filterStatus === 'all' ? visibleTasks : visibleTasks.filter(t => t.status === filterStatus);

    // Group by status for Kanban view
    const groupedTasks = useMemo(() => {
        const groups: Record<string, typeof tasks> = {};
        for (const col of KANBAN_COLUMNS) {
            groups[col] = [];
        }
        filtered.forEach(task => {
            if (groups[task.status]) {
                groups[task.status].push(task);
            } else {
                groups[task.status] = [task];
            }
        });
        return groups;
    }, [filtered]);

    // --- Error / Loading states ---
    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500 mb-2">Failed to load tasks</p>
                <p className="text-sm text-slate-500">{(error as Error).message}</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* ===== Header with FAB (desktop button + mobile FAB below) ===== */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">✅ Task Control Center</h2>

                {/* Desktop action buttons — hidden on mobile */}
                <div className="hidden sm:flex items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className={`
                            touch-target px-4 py-2 rounded-lg text-sm font-medium transition-colors
                            ${showForm
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }
                        `}
                    >
                        {showForm ? '\u2715 Cancel' : '+ New Task'}
                    </button>
                </div>
            </div>

            {/* ===== Stale Task Banner ===== */}
            <StaleTaskBanner />

            {/* ===== Filter Presets Bar (horizontal scroll chips) ===== */}
            <FilterPresets
                presets={presetOptions}
                activePreset={presetFilter}
                onSelect={(id) => setPresetFilter(id)}
            />

            {/* ===== Status Tabs (below preset chips) ===== */}
            <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {statuses.map(status => {
                    const count = tasks.filter(t => status === 'all' || t.status === status).length;
                    return (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`
                                touch-target px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0
                                transition-colors
                                ${filterStatus === status
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border hover:border-slate-400'
                                }
                            `}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
                        </button>
                    );
                })}
            </div>

            {/* ===== Create Form (Desktop inline, Mobile bottom sheet) ===== */}
            {/* Desktop inline form */}
            {showForm && (
                <form onSubmit={handleCreate} className="hidden sm:block bg-white dark:bg-slate-800 border rounded-xl p-4 space-y-3">
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Task title (required)"
                        className="touch-target w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        autoFocus
                    />
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Description (optional)"
                        rows={2}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                    />
                    <div className="flex flex-wrap gap-3">
                        <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                            className="touch-target px-3 py-2 border rounded-lg text-sm min-w-[120px]"
                        >
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                        <select
                            value={agent}
                            onChange={(e) => setAgent(e.target.value as AgentRole)}
                            className="touch-target px-3 py-2 border rounded-lg text-sm min-w-[140px]"
                        >
                            {Object.entries(AGENT_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        type="submit"
                        disabled={!title.trim() || createTask.isPending}
                        className="touch-target w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                    >
                        {createTask.isPending ? 'Creating...' : 'Create Task'}
                    </button>
                </form>
            )}

            {/* Mobile create form bottom-sheet */}
            <MobileFilterSheet isOpen={mobileFormOpen} onClose={() => setMobileFormOpen(false)}>
                <form onSubmit={handleCreate} className="space-y-4 py-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-base">New Task</h3>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Task title (required)"
                        className="touch-target w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-base"
                        autoFocus
                    />
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Description (optional)"
                        rows={3}
                        className="w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-y text-base"
                    />
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Priority</label>
                            <div className="grid grid-cols-2 gap-2">
                                {(['critical', 'high', 'medium', 'low'] as PriorityLevel[]).map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setPriority(p)}
                                        className={`
                                            touch-target px-3 py-2.5 rounded-lg text-sm font-medium text-center
                                            transition-colors
                                            ${priority === p
                                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                            }
                                        `}
                                    >
                                        {p.charAt(0).toUpperCase() + p.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Assign To</label>
                            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                                {Object.entries(AGENT_LABELS).map(([key, label]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setAgent(key as AgentRole)}
                                        className={`
                                            touch-target px-2.5 py-2 rounded-lg text-xs font-medium text-left
                                            transition-colors
                                            ${agent === key
                                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                            }
                                        `}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={!title.trim() || createTask.isPending}
                        className="touch-target w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium text-base"
                    >
                        {createTask.isPending ? 'Creating...' : 'Create Task'}
                    </button>
                </form>
            </MobileFilterSheet>

            {/* ===== Empty State ===== */}
            {filtered.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                    {tasks.length === 0 ? 'No tasks yet. Create one to get started!' : `No ${filterStatus} tasks.`}
                </div>
            )}

            {/* ===== Desktop View: Grid Layout ===== */}
            <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {filtered.map(task => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                    />
                ))}
            </div>

            {/* ===== Mobile View: Horizontal Scroll Kanban ===== */}
            <div className="md:hidden">
                <div className="kanban-scroll-container flex gap-3 overflow-x-auto pb-4 px-1 snap-x snap-mandatory">
                    {KANBAN_COLUMNS.map(col => {
                        const colTasks = groupedTasks[col] || [];
                        const colLabel = col.charAt(0).toUpperCase() + col.slice(1);
                        const isDone = col === 'done';
                        return (
                            <div
                                key={col}
                                className={`snap-start shrink-0 w-[280px] sm:w-[300px]`}
                            >
                                {/* Column header */}
                                <div className={`
                                    sticky top-0 z-10 mb-2
                                    px-3 py-2 rounded-t-xl
                                    flex items-center justify-between
                                    bg-gradient-to-r border-t border-x border-transparent
                                    ${isDone
                                        ? 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'
                                        : 'from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800 border-slate-200 dark:border-slate-700'
                                    }
                                `}>
                                    <span className={`
                                        text-sm font-semibold capitalize
                                        ${isDone ? 'text-green-700 dark:text-green-300' : 'text-slate-700 dark:text-slate-300'}
                                    `}>
                                        {colLabel}
                                    </span>
                                    <span className={`
                                        text-xs font-bold px-2 py-0.5 rounded-full
                                        ${isDone
                                            ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                        }
                                    `}>
                                        {colTasks.length}
                                    </span>
                                </div>

                                {/* Column tasks */}
                                <div className={`
                                    space-y-2 pb-4 pt-2
                                    ${isDone ? '' : 'border-l-2 border-dashed border-slate-200 dark:border-slate-700 ml-3'}
                                `}>
                                    {colTasks.map(task => (
                                        <KanbanCardMobile
                                            key={task.id}
                                            task={task}
                                            onStatusChange={handleStatusChange}
                                            onDelete={handleDelete}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ============================
// Desktop Task Card
// ============================
function TaskCard({ task, onStatusChange, onDelete }: {
    task: any;
    onStatusChange: (id: number, status: TaskStatus) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
}) {
    const possibleTransitions = STATUS_FLOW[task.status];
    const isDone = task.status === 'done';
    const isActive = task.status === 'active';
    const hasStartTime = !!task.start_time;
    const startStop = useTaskStart();
    const stopTask = useTaskStop();
    // Only ping when task is active AND has a start time
    const heartbeat = useTaskHeartbeat(
        isActive && hasStartTime ? task.id : null,
        30,
        isActive && hasStartTime,
    );

    async function handleStart() {
        await startStop.mutateAsync({ taskId: task.id });
    }

    async function handleStop() {
        await stopTask.mutateAsync({ taskId: task.id });
    }

    return (
        <div className={`bg-white dark:bg-slate-800 border rounded-xl p-4 transition-all ${isDone ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className={`font-semibold text-slate-900 dark:text-white ${isDone ? 'line-through' : ''}`}>
                    {task.title}
                </h3>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>
                    {task.priority}
                </span>
            </div>

            {task.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">{task.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
                <span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">
                    {getAgentLabel(task.assigned_agent)}
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-500 dark:text-slate-400">Impact: {Math.round(task.impact_score)}</span>
                {task.deadline && (
                    <>
                        <span className="text-slate-400">|</span>
                        <span className="text-slate-500 dark:text-slate-400">Due: {new Date(task.deadline).toLocaleDateString()}</span>
                    </>
                )}
            </div>

            {/* ===== Real-time tracking controls (desktop only) ===== */}
            {isActive && (
                <div className="hidden sm:flex items-center gap-2 mb-3">
                    {!hasStartTime ? (
                        <button
                            onClick={handleStart}
                            disabled={startStop.isPending}
                            className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-2 border-green-500 text-green-600 dark:border-green-400 dark:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50"
                        >
                            ▶ Begin Work
                        </button>
                    ) : (
                        <button
                            onClick={handleStop}
                            disabled={stopTask.isPending}
                            className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-2 border-orange-400 text-orange-600 dark:border-orange-500 dark:text-orange-400 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors disabled:opacity-50"
                        >
                            ⏸ Stop Work
                        </button>
                    )}

                    {/* LiveTimer — visible when task has been started */}
                    {(hasStartTime || startStop.isPending) && (
                        <>
                            <span className="text-xs text-slate-400">⏱</span>
                            <LiveTimer startTime={hasStartTime ? task.start_time : undefined} />
                        </>
                    )}

                    {heartbeat.error && (
                        <span className="text-xs text-red-500 ml-auto" title={heartbeat.error}>
                            ●
                        </span>
                    )}
                    {heartbeat.isAlive && (
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shrink-0" title="Heartbeat alive" />
                    )}
                </div>
            )}

            {/* Status transitions */}
            <div className="flex flex-wrap gap-1.5">
                {possibleTransitions.map(newStatus => (
                    <button
                        key={newStatus}
                        onClick={() => onStatusChange(task.id, newStatus as TaskStatus)}
                        className="px-3 py-1 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors capitalize"
                    >
                        → {newStatus.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* Actions */}
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                {!isDone && (
                    <button
                        onClick={() => onDelete(task.id)}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                    >
                        Delete
                    </button>
                )}
            </div>
        </div>
    );
}

// ============================
// Mobile Kanban Card
// ============================
function KanbanCardMobile({ task, onStatusChange, onDelete }: {
    task: any;
    onStatusChange: (id: number, status: TaskStatus) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
}) {
    const possibleTransitions = STATUS_FLOW[task.status];
    const isDone = task.status === 'done';
    const isActive = task.status === 'active';
    const hasStartTime = !!task.start_time;
    const startStop = useTaskStart();
    const stopTask = useTaskStop();
    // Only ping when task is active AND has a start time
    const heartbeat = useTaskHeartbeat(
        isActive && hasStartTime ? task.id : null,
        30,
        isActive && hasStartTime,
    );

    async function handleStart() {
        await startStop.mutateAsync({ taskId: task.id });
    }

    async function handleStop() {
        await stopTask.mutateAsync({ taskId: task.id });
    }

    return (
        <div className={`
            bg-white dark:bg-slate-800 border rounded-xl p-3 shadow-sm
            transition-all active:scale-[0.98] select-none
            ${isDone ? 'opacity-60' : ''}
        `}>
            {/* Title + Priority */}
            <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className={`font-semibold text-sm text-slate-900 dark:text-white leading-snug flex-1 ${isDone ? 'line-through' : ''}`}>
                    {task.title}
                </h4>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${PRIORITY_COLORS[task.priority]}`}>
                    {task.priority}
                </span>
            </div>

            {/* Description */}
            {task.description && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">{task.description}</p>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2 text-[10px]">
                <span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                    {getAgentLabel(task.assigned_agent)}
                </span>
                {task.impact_score != null && (
                    <>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500 dark:text-slate-400">I: {Math.round(task.impact_score)}</span>
                    </>
                )}
            </div>

            {/* ===== Mobile real-time tracking controls ===== */}
            {isActive && (
                <div className="flex items-center gap-1.5 mb-2">
                    {!hasStartTime ? (
                        <button
                            onClick={handleStart}
                            disabled={startStop.isPending}
                            className="touch-target flex-1 px-2 py-1 text-[10px] font-semibold border border-green-500 text-green-600 dark:border-green-400 dark:text-green-400 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50"
                        >
                            ▶ Begin
                        </button>
                    ) : (
                        <button
                            onClick={handleStop}
                            disabled={stopTask.isPending}
                            className="touch-target flex-1 px-2 py-1 text-[10px] font-semibold border border-orange-400 text-orange-600 dark:border-orange-500 dark:text-orange-400 rounded-md hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50"
                        >
                            ⏸ Stop
                        </button>
                    )}
                    {(hasStartTime || startStop.isPending) && (
                        <LiveTimer startTime={hasStartTime ? task.start_time : undefined} />
                    )}
                    {heartbeat.isAlive && (
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shrink-0" />
                    )}
                    {heartbeat.error && (
                        <span className="text-red-500 text-[10px]" title={heartbeat.error}>●</span>
                    )}
                </div>
            )}

            {/* Quick status actions — touch-friendly mini buttons */}
            <div className="flex flex-wrap gap-1">
                {possibleTransitions.map(newStatus => (
                    <button
                        key={newStatus}
                        onClick={() => onStatusChange(task.id, newStatus as TaskStatus)}
                        className="touch-target px-2 py-1.5 text-[10px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors capitalize"
                    >
                        → {newStatus.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </button>
                ))}
            </div>

            {/* Delete */}
            {!isDone && (
                <button
                    onClick={() => onDelete(task.id)}
                    className="mt-1.5 text-[10px] text-red-400 hover:text-red-600 transition-colors w-full text-left py-1"
                >
                    🗑 Delete
                </button>
            )}
        </div>
    );
}

// ============================
// Shared constants & helpers
// ============================
const STATUS_FLOW: Record<string, string[]> = {
    backlog: ['active', 'blocked', 'deprecated'],
    active: ['in_review'],
    blocked: ['active', 'backlog'],
    in_review: ['done', 'active'],
    done: [],
    deprecated: ['backlog'],
};

const PRIORITY_COLORS: Record<string, string> = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-blue-100 text-blue-700',
    low: 'bg-slate-100 text-slate-600',
};

const AGENT_LABELS: Record<string, string> = {
    strategy: '🎯 Strategy',
    system_architect: '🏗️ System Arch',
    backend_engineer: '⚙️ Backend',
    frontend_engineer: '🎨 Frontend',
    integration_engineer: '🔌 Integration',
    qa: '✅ QA',
    devops: '🚀 DevOps',
    security: '🔒 Security',
    data: '📊 Data',
    growth: '📈 Growth',
    support_and_monitoring: '🚟 Support',
};

function getAgentLabel(role?: string): string {
    return AGENT_LABELS[role ?? ''] ?? role ?? 'Unassigned';
}
