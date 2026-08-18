'use client';

import { useState } from 'react';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import type { TaskStatus, PriorityLevel, AgentRole } from '@/types';
import { CardSkeleton, SkeletonLoader } from '@/components/SkeletonLoader';

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

    const filtered = filterStatus === 'all' ? tasks : tasks.filter(t => t.status === filterStatus);
    const statuses: Array<TaskStatus | 'all'> = ['all', 'backlog', 'active', 'blocked', 'in_review', 'done'];

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
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">✅ Task Control Center</h2>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors w-full sm:w-auto"
                >
                    {showForm ? '\u2715 Cancel' : '+ New Task'}
                </button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {statuses.map(status => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                            filterStatus === status
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border hover:border-slate-400'
                        }`}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1)} ({tasks.filter(t => status === 'all' || t.status === status).length})
                    </button>
                ))}
            </div>

            {/* Create form */}
            {showForm && (
                <form onSubmit={handleCreate} className="bg-white dark:bg-slate-800 border rounded-xl p-4 space-y-3">
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Task title (required)"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                            className="px-3 py-2 border rounded-lg text-sm"
                        >
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                        <select
                            value={agent}
                            onChange={(e) => setAgent(e.target.value as AgentRole)}
                            className="px-3 py-2 border rounded-lg text-sm"
                        >
                            {Object.entries(AGENT_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        type="submit"
                        disabled={!title.trim() || createTask.isPending}
                        className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                    >
                        {createTask.isPending ? 'Creating...' : 'Create Task'}
                    </button>
                </form>
            )}

            {/* Empty state */}
            {filtered.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                    {tasks.length === 0 ? 'No tasks yet. Create one to get started!' : `No ${filterStatus} tasks.`}
                </div>
            )}

            {/* Tasks grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {filtered.map(task => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                    />
                ))}
            </div>
        </div>
    );
}

function TaskCard({ task, onStatusChange, onDelete }: {
    task: any;
    onStatusChange: (id: number, status: TaskStatus) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
}) {
    const possibleTransitions = STATUS_FLOW[task.status];
    const isDone = task.status === 'done';

    return (
        <div className={`bg-white dark:bg-slate-800 border rounded-xl p-4 transition-all ${isDone ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className={`font-semibold text-slate-900 dark:text-white ${isDone ? 'line-through' : ''}`}>
                    {task.title}
                </h3>
                <div className="flex items-center gap-1 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>
                        {task.priority}
                    </span>
                </div>
            </div>

            {task.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">{task.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
                <span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">
                    {AGENT_LABELS[task.assigned_agent ?? ""] ?? task.assigned_agent ?? "Unassigned"}
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-500 dark:text-slate-400">Impact: {Math.round(task.impact_score)}</span>
            </div>

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


// Status transition map
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

