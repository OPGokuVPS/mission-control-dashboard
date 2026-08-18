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
                        await createTask.mutateAsync({ title: String(parsed.params.title), status: 'backlog', priority: 'medium' });
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
                        const agentName = AGENT_LABELS[task.assigned_agent ?? ''] ?? task.assigned_agent ?? 'Unassigned';
                        setOutput(prev => [...prev, `${agentName}: ${task.title} (#${task.id})`]);
                    }
                    break;
                }

                case 'clear_output'
