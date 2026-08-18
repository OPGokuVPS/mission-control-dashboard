'use client';

import { useState } from 'react';
import { useTasks, useCreateTask, useUpdateTask } from '@/hooks/useTasks';
import { parseCommand } from '@/lib/validators';

export function CommandInterface({ onUpdate }: { onUpdate: () => void }) {
    const [input, setInput] = useState('');
    const [output, setOutput] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const { data: tasks } = useTasks();
    const createTask = useCreateTask();
    const updateTask = useUpdateTask();

    async function handleCommand() {
        if (!input.trim()) return;
        const cmd = input.trim();
        setInput('');
        setLoading(true);

        try {
            const parsed = parseCommand(cmd);

            if ('error' in parsed) {
                setOutput(prev => [...prev, `❌ ${parsed.error}`]);
                return;
            }

            switch (parsed.type) {
                case 'create_task': {
                    if (parsed.params?.title) {
                        await createTask.mutateAsync({ title: String(parsed.params.title), status: "backlog", priority: "medium" });
                        setOutput(prev => [...prev, `✅ Created task: "${parsed.params.title}"`]);
                        onUpdate();
                    }
                    break;
                }

                case 'update_task_status': {
                    if (parsed.params?.id && parsed.params?.status) {
                        const id = Number(parsed.params.id);
                        const status = String(parsed.params.status);
                        await updateTask.mutateAsync({ id, status: status as any });
                        setOutput(prev => [...prev, `✅ Task #${id} → ${status}`]);
                        onUpdate();
                    }
                    break;
                }

                case 'list_tasks': {
                    if (!tasks || tasks.length === 0) {
                        setOutput(prev => [...prev, '📋 No tasks found']);
                    } else {
                        const taskList = tasks.slice(0, 20).map(t =>
                            `  #${t.id} [${t.status}] ${AGENT_LABELS[t.assigned_agent ?? ""] ?? t.assigned_agent ?? "Unassigned"}: ${t.title}`
                        ).join('\n');
                        setOutput(prev => [...prev, `📋 Tasks (${tasks.length}):`, taskList]);
                    }
                    break;
                }

                case 'clear_output':
                    setOutput([]);
                    break;

                case 'show_context':
                    setOutput(prev => [...prev, 'ℹ️ Factory context not loaded yet. Configure it in Strategy tab.']);
                    break;

                case 'run_insights':
                    setOutput(prev => [...prev, '🔍 Running analysis... Check Insights tab for results.']);
                    break;

                case 'help':
                    setOutput(prev => [...prev,
                        '📖 Available Commands:',
                        '',
                        '• "create task: <title>" — Create a new task',
                        '• "update task <id> to <status>" — Change task status',
                        '• "list tasks" / "show tasks" — List all tasks',
                        '• "clear" — Clear command output',
                        '• "insights" / "analyze" — Run analysis',
                        '• "help" or "?" — Show this help',
                        '',
                        'Status values: backlog, active, blocked, in_review, done, deprecated',
                        'Priority levels: critical, high, medium, low',
                    ]);
                    break;

                default:
                    setOutput(prev => [...prev, `❓ Unknown command type. Type "help" for options.`]);
            }
        } catch (e) {
            setOutput(prev => [...prev, `💥 Error: ${(e as Error).message}`]);
        } finally {
            setLoading(false);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleCommand();
        }
    }

    return (
        <div className="bg-white dark:bg-slate-800 border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    💻 Command Interface
                </h3>
            </div>

            {/* Output area */}
            <div className="p-4 max-h-[200px] sm:max-h-[250px] overflow-y-auto font-mono text-xs leading-relaxed">
                {output.length === 0 ? (
                    <div className="text-slate-400 italic">
                        Enter a command below. Type "help" to see available commands.
                    </div>
                ) : (
                    <div className="space-y-1">
                        {output.map((line, i) => (
                            <div key={i} className={`${
                                line.startsWith('❌') ? 'text-red-600 dark:text-red-400' :
                                line.startsWith('✅') ? 'text-green-600 dark:text-green-400' :
                                line.startsWith('💥') ? 'text-red-600 dark:text-red-400' :
                                line.startsWith('📋') ? 'text-blue-600 dark:text-blue-400 font-semibold' :
                                line.startsWith('📖') ? 'text-purple-600 dark:text-purple-400 font-semibold' :
                                'text-slate-700 dark:text-slate-300'
                            }`}>
                                {line}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Input area */}
            <form onSubmit={(e) => { e.preventDefault(); handleCommand(); }} className="border-t border-slate-200 dark:border-slate-700 p-3">
                <div className="flex gap-2">
                    <span className="text-slate-400 self-center select-none">$</span>
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder='type "help" for commands...'
                        disabled={loading}
                        className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono disabled:opacity-50"
                        autoFocus={false}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors text-sm"
                    >
                        {loading ? '⏳' : '→'}
                    </button>
                </div>
            </form>
        </div>
    );
}

const AGENT_LABELS: Record<string, string> = {
    strategy: 'Strategy',
    system_architect: 'Architect',
    backend_engineer: 'Backend',
    frontend_engineer: 'Frontend',
    integration_engineer: 'Integration',
    qa: 'QA',
    devops: 'DevOps',
    security: 'Security',
    data: 'Data',
    growth: 'Growth',
    support_and_monitoring: 'Support',
};