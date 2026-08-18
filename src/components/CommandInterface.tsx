'use client';

import { useState } from 'react';
import { useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { CardSkeleton } from '@/components/SkeletonLoader';

type ParsedCommand = {
    type: string;
    params?: Record<string, unknown>;
};

export function CommandInterface({ onUpdate }: { onUpdate?: () => void }) {
    const [input, setInput] = useState('');
    const [output, setOutput] = useState<string[]>([]);
    const parseCommand = (cmd: string): ParsedCommand | null => {
        try {
            const json = JSON.parse(cmd);
            return json;
        } catch {
            setOutput(prev => [...prev, `❌ Invalid JSON: ${cmd}`]);
            return null;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const parsed = parseCommand(input);
        if (!parsed) return;

        switch (parsed.type) {
            case 'create_task': {
                if (parsed.params?.title) {
                    await createTask.mutateAsync({ title: String(parsed.params.title), status: 'pending', priority: 'medium' });
                    setOutput(prev => [...prev, `✅ Created task: "${parsed.params.title}"`]);
                    onUpdate?.();
                }
                break;
            }

            case 'update_task_status': {
                if (parsed.params?.id && parsed.params?.status) {
                    const id = Number(parsed.params.id);
                    const status = String(parsed.params.status);
                    await updateTask.mutateAsync({ id, status: status as any });
                    setOutput(prev => [...prev, `✅ Task #${id} → ${status}`]);
                    onUpdate?.();
                }
                break;
            }

            case 'delete_task': {
                if (parsed.params?.id) {
                    const id = Number(parsed.params.id);
                    await deleteTask.mutateAsync(id);
                    setOutput(prev => [...prev, `✅ Deleted task #${id}`]);
                    onUpdate?.();
                }
                break;
            }

            default:
                setOutput(prev => [...prev, `❌ Unknown command: ${parsed.type}`]);
        }
        setInput('');
    };

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{'⌨'} Command Interface</h2>
            <p className="text-sm text-slate-500">Execute commands via JSON input</p>

            <CardSkeleton className="border p-4">
                <form onSubmit={handleSubmit} className="space-y-3">
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder='{"type": "create_task", "params": {"title": "Build pipeline fix"}}'
                        className="w-full h-24 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm resize-none"
                    />
                    <button
                        type="submit"
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                    >
                        Execute
                    </button>
                </form>
            </CardSkeleton>

            {output.length > 0 && (
                <CardSkeleton className="border p-4">
                    <ul className="space-y-1 font-mono text-xs">
                        {output.map((msg, i) => (
                            <li key={i} className="text-slate-600 dark:text-slate-400">{msg}</li>
                        ))}
                    </ul>
                </CardSkeleton>
            )}
        </div>
    );
}