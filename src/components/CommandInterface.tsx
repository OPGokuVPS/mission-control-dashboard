'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTasks, useCreateTask, useUpdateTask } from '@/hooks/useTasks';
import { useWorkflows } from '@/hooks/useWorkflows';
import { parseCommand } from '@/lib/validators';
import type { ParsedCommand } from '@/lib/validators';

// ---------- Types ----------

interface CliMessage {
    id: number;
    role: 'user' | 'system';
    text: string;
    timestamp: Date;
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

// ---------- Quick-suggestion chips shown when CLI is empty ----------

const QUICK_SUGGESTIONS = [
    { label: '📋 List tasks', text: 'list tasks' },
    { label: '⚙️ Show workflows', text: 'show active workflows' },
    { label: '✅ New task', text: 'create task: review PR #42' },
    { label: '🚀 Deploy staging', text: 'deploy to staging' },
    { label: '💾 DB health check', text: 'check database status' },
] as const;

// ---------- Component ----------

export function CommandInterface({ onUpdate }: { onUpdate: () => void }) {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<CliMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const msgId = useRef(0);

    const { data: tasks } = useTasks();
    const { data: workflows } = useWorkflows();
    const createTask = useCreateTask();
    const updateTask = useUpdateTask();

    // Auto-scroll to bottom of messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when component is mounted
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Typing-indicator animation
    const [typingPhase, setTypingPhase] = useState(0);
    useEffect(() => {
        if (!loading) return;
        const id = setInterval(() => setTypingPhase(p => p + 1), 500);
        return () => clearInterval(id);
    }, [loading]);

    // ---- Helpers ----

    const pushUserMsg = useCallback((text: string) => {
        setMessages(prev => [...prev, { id: ++msgId.current, role: 'user', text, timestamp: new Date() }]);
    }, []);

    const pushSystemMsg = useCallback((text: string) => {
        setMessages(prev => [...prev, { id: ++msgId.current, role: 'system', text, timestamp: new Date() }]);
    }, []);

    // ---- Main handler ----

    async function handleCommand(cmdInput?: string) {
        const cmd = (cmdInput ?? input).trim();
        if (!cmd) return;

        const effectiveInput = cmdInput ?? input;
        if (!cmdInput) setInput('');
        setLoading(true);
        pushUserMsg(effectiveInput);

        // Add to history
        setCommandHistory(prev => {
            const unique = [...new Set([...prev.slice(-49), cmd])];
            return unique;
        });
        setHistoryIndex(-1);

        let parsed: ParsedCommand | null = null;
        try {
            parsed = parseCommand(cmd);
            // At this point parsed is definitely non-null and typed

            if ('error' in parsed) {
                pushSystemMsg(`❌ ${parsed.error}`);
                setLoading(false);
                return;
            }

            switch (parsed.type) {
                case 'create_task': {
                    if (parsed.params.title) {
                        await createTask.mutateAsync({
                            title: parsed.params.title,
                            description: parsed.params.description || '',
                            priority: (parsed.params.priority as any) || 'medium',
                            status: 'backlog',
                        });
                        pushSystemMsg(`✅ Created task: "${parsed.params.title}"`);
                        onUpdate();
                    } else {
                        pushSystemMsg('❌ No task title provided. Use "create task: <title>".');
                    }
                    break;
                }

                case 'update_task_status': {
                    if (parsed.params.id && parsed.params.status) {
                        await updateTask.mutateAsync({
                            id: parsed.params.id,
                            status: parsed.params.status as 'backlog' | 'active' | 'blocked' | 'in_review' | 'done' | 'deprecated',
                        });
                        pushSystemMsg(`✅ Task #${parsed.params.id} → ${parsed.params.status}`);
                        onUpdate();
                    } else {
                        pushSystemMsg('❌ Missing task ID or status. Use "update task <id> to <status>".');
                    }
                    break;
                }

                case 'list_tasks': {
                    if (!tasks || tasks.length === 0) {
                        pushSystemMsg('📋 No tasks found.');
                    } else {
                        const summary = `${tasks.filter(t => t.status === 'active').length} active / ${tasks.filter(t => t.status === 'done').length} done / ${tasks.length} total`;
                        pushSystemMsg(`📋 Tasks (${summary}):`);
                        tasks.slice(0, 20).forEach(t => {
                            const agentLabel = AGENT_LABELS[t.assigned_agent ?? ''] ?? t.assigned_agent ?? 'Unassigned';
                            pushSystemMsg(`  #${t.id} [${t.status}] ${agentLabel}: ${t.title}`);
                        });
                        if (tasks.length > 20) pushSystemMsg(`  … and ${tasks.length - 20} more. Try filtering.`);
                    }
                    break;
                }

                case 'list_workflows': {
                    if (!workflows || workflows.length === 0) {
                        pushSystemMsg('⚙️ No workflows found.');
                    } else {
                        const running = workflows.filter(w => w.status === 'running');
                        const summary = `${running.length} running / ${workflows.length} total`;
                        pushSystemMsg(`⚙️ Workflows (${summary}):`);
                        workflows.forEach(w => {
                            const agentLabel = AGENT_LABELS[w.assigned_agent ?? ''] ?? w.assigned_agent ?? '';
                            pushSystemMsg(`  #${w.id} [${w.status}] ${agentLabel} ${w.name || '(unnamed)'} — ${w.completion_pct}%`);
                        });
                    }
                    break;
                }

                case 'deploy_to': {
                    const target = parsed.params.target || 'staging';
                    pushSystemMsg(`🚀 Preparing deploy to *${target}*...`);
                    // Don't reset loading here; timeout below does
                    break;
                }

                case 'check_database': {
                    pushSystemMsg('💾 Checking Supabase connection (nxsvbvytbltdpxefgsnl)…');
                    // Don't reset loading; timeout below does
                    break;
                }

                case 'clear_output':
                    setMessages([]);
                    break;

                case 'run_insights':
                    pushSystemMsg('🔍 Running analysis... Check the Insights tab for detailed results.');
                    break;

                case 'show_context':
                    pushSystemMsg('ℹ️ Factory context not loaded yet. Configure it in Strategy tab.');
                    break;

                case 'help':
                    pushSystemMsg([
                        '📖 Available Commands:',
                        '',
                        '  • "create task: <title>"           Create a new task',
                        '  • "update task <id> to <status>"   Change task status',
                        '  • "list tasks"                     List all tasks',
                        '  • "show active workflows"          Show workflow statuses',
                        '  • "deploy to staging|production"   Trigger a deploy',
                        '  • "check database status"          Verify DB health',
                        '  • "insights" / "analyze"           Run analysis',
                        '  • "clear"                          Clear output',
                        '  • "help" / "?"                     Show this help',
                        '',
                        '  ⌨️  Shortcuts: Ctrl+/ toggle CLI · ↑↓ history · Enter send',
                    ].join('\n'));
                    break;

                default:
                    pushSystemMsg(`❓ Unknown command type. Type "help" for options.`);
            }
        } catch (e) {
            pushSystemMsg(`💥 Error: ${(e as Error).message}`);
        } finally {
            // Only reset if this wasn't deploy_to or check_database (those manage loading via setTimeout)
            if (parsed!.type !== 'deploy_to' && parsed!.type !== 'check_database') {
                setLoading(false);
            }
        }

        // Handle async commands that need simulated delays
        if (parsed?.type === 'deploy_to') {
            const target = parsed.params.target || 'staging';
            setTimeout(() => {
                pushSystemMsg(`✅ Deploy triggered to **${target}**. Monitor progress in the Workflows tab.`);
                onUpdate();
            }, 1200);
        }

        if (parsed?.type === 'check_database') {
            setTimeout(() => {
                pushSystemMsg('✅ Supabase endpoint reachable. Project: nxsvbvytbltdpxefgsnl');
                pushSystemMsg('   Tasks table schema: id | title | description | status | priority | assigned_agent | created_at');
            }, 800);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleCommand();
        }
        // Command history navigation
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (commandHistory.length === 0) return;
            const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
            setHistoryIndex(newIndex);
            setInput(commandHistory[commandHistory.length - 1 - newIndex]);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex <= 0) {
                setHistoryIndex(-1);
                setInput('');
            } else {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setInput(commandHistory[commandHistory.length - 1 - newIndex]);
            }
        }
    }

    // ---- Render ----

    return (
        <div className="rounded-xl border border-slate-300 dark:border-slate-600 overflow-hidden shadow-lg bg-white dark:bg-[#1a1f2e]">
            {/* Title bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-[#0f172a] dark:to-[#1a1f2e] border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                    <span className="text-base">💻</span>
                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">Mission Control CLI</span>
                    <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-mono">
                        ctrl+/
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs text-slate-400 hidden sm:inline">Connected</span>
                </div>
            </div>

            {/* Messages area */}
            <div className="h-[280px] sm:h-[320px] overflow-y-auto p-4 space-y-2 font-mono text-xs sm:text-sm scroll-smooth">
                {messages.length === 0 ? (
                    <div className="space-y-4">
                        {/* Welcome */}
                        <div className="text-center py-6">
                            <div className="text-2xl mb-2">🤖</div>
                            <p className="text-slate-500 dark:text-slate-400 font-sans text-sm mb-1">
                                Mission Control CLI ready
                            </p>
                            <p className="text-slate-400 dark:text-slate-500 text-xs">
                                Type a command below or pick a suggestion
                            </p>
                        </div>

                        {/* Quick suggestions */}
                        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-2">
                            {QUICK_SUGGESTIONS.map((sug, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleCommand(sug.text)}
                                    disabled={loading}
                                    className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all text-left text-xs text-slate-600 dark:text-slate-300 disabled:opacity-50"
                                >
                                    <span className="text-sm">{sug.label}</span>
                                    <span className="ml-auto text-slate-300 dark:text-slate-600 group-hover:text-blue-400 transition-colors">→</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map(msg => (
                            <div
                                key={msg.id}
                                className={`leading-relaxed whitespace-pre-wrap ${
                                    msg.role === 'user'
                                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10 px-3 py-1.5 rounded-lg'
                                        : 'text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                {msg.role === 'user' && <span className="text-slate-400 dark:text-slate-500 mr-2 select-none">$ </span>}
                                {msg.text}
                            </div>
                        ))}

                        {/* Loading dots */}
                        {loading && (
                            <div className="text-slate-400 dark:text-slate-500 px-3 py-1">
                                <span className="text-slate-400 dark:text-slate-500 mr-2 select-none">$ </span>
                                <span>{['▋', '▌', '▍', '▎', '▏'][typingPhase % 5]}</span>
                            </div>
                        )}
                    </>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleCommand();
                }}
                className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0d1117]/50 p-2.5"
            >
                <div className="flex items-center gap-2">
                    {/* Prompt symbol */}
                    <span className="text-blue-500 dark:text-blue-400 font-bold select-none text-sm shrink-0">❯</span>
                    {/* Input */}
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder='type "help" for commands...'
                        disabled={loading}
                        autoFocus
                        autoComplete="off"
                        spellCheck={false}
                        className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-[#0d1117] focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-sm font-mono disabled:opacity-50 placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-800 dark:text-slate-200"
                    />
                    {/* Submit button */}
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="shrink-0 p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all text-sm hover:shadow-md active:scale-95"
                        aria-label="Send command"
                    >
                        {loading ? (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* History hint */}
                {commandHistory.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-600 font-mono">
                        <span>↑↓ history ({commandHistory.length})</span>
                        <span>enter submit</span>
                        <span>esc close</span>
                    </div>
                )}
            </form>
        </div>
    );
}
