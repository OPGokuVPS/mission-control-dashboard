'use client';

import { useState } from 'react';
import { useWorkflows } from '@/hooks/useWorkflows';
import { useUpdateWorkflow } from '@/hooks/useWorkflows';
import { CardSkeleton, SkeletonLoader } from '@/components/SkeletonLoader';

const STATUS_ICONS: Record<string, string> = { idle: '⏸️', running: '▶️', paused: '⏸️', completed: '✅', failed: '❌' };

export function WorkflowTracker() {
    const { data: workflows = [], isLoading } = useWorkflows();
    const updateWorkflow = useUpdateWorkflow();

    if (isLoading) return <SkeletonLoader lines={3} className="bg-white rounded-xl p-6" />;

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">⚙️ Workflow Tracker</h2>
            {workflows.length === 0 ? (
                <div className="text-center py-12 text-slate-400">No workflows yet</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {workflows.map(wf => (
                        <WorkflowCard key={wf.id} workflow={wf} onUpdate={updateWorkflow} />
                    ))}
                </div>
            )}
        </div>
    );
}

function WorkflowCard({ workflow, onUpdate }: { workflow: any; onUpdate: any }) {
    return (
        <div className="bg-white dark:bg-slate-800 border rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-slate-900 dark:text-white">{workflow.name}</h3>
                <span className="text-xs px-2 py-1 rounded-full capitalize bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">{STATUS_ICONS[workflow.status]} {workflow.status}</span>
            </div>
            <div className="mb-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Progress</span>
                    <span>{workflow.completion_pct}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                    <div className={`h-full rounded-full transition-all ${workflow.completion_pct >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${workflow.completion_pct}%` }} />
                </div>
            </div>
            {workflow.steps && workflow.steps.length > 0 && (
                <div className="space-y-1">
                    {workflow.steps.slice(0, 5).map((step: string, i: number) => (
                        <div key={i} className={`text-xs p-1 rounded flex items-center gap-2 ${i < workflow.current_step ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
                            <span>{i < workflow.current_step ? '✅' : i === workflow.current_step ? '▶️' : '⬜'}</span>
                            <span className="truncate">{step}</span>
                        </div>
                    ))}
                    {workflow.steps.length > 5 && <div className="text-xs text-slate-400">+{workflow.steps.length - 5} more...</div>}
                </div>
            )}
            {(workflow.dependencies?.length ?? 0) > 0 && (
                <div className="mt-2 text-xs text-slate-400">Depends on: {workflow.dependencies.join(', ')}</div>
            )}
        </div>
    );
}