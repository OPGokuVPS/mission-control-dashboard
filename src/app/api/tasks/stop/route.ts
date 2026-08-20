import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/tasks/stop
 * Stops work on a task: sets end_time, computes duration_ms,
 * deactivates the heartbeat, and logs the history entry.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { task_id, actor = 'user', actor_role } = body;

        if (!task_id) {
            return NextResponse.json(
                { error: 'task_id is required' },
                { status: 400 },
            );
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        );

        // ── 1. Validate that task exists and has a start_time ───────────
        const { data: existingTask, error: fetchErr } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', task_id)
            .maybeSingle();

        if (fetchErr) {
            console.error('[stop] fetch error:', fetchErr.message);
            return NextResponse.json(
                { error: 'Failed to fetch task' },
                { status: 500 },
            );
        }

        if (!existingTask) {
            return NextResponse.json(
                { error: 'Task not found' },
                { status: 404 },
            );
        }

        if (!existingTask.start_time) {
            return NextResponse.json(
                { error: 'Task has no start_time — cannot compute duration' },
                { status: 400 },
            );
        }

        const now = new Date().toISOString();
        const startTimeMs = new Date(existingTask.start_time).getTime();
        const endTimeMs = new Date(now).getTime();
        const durationMs = endTimeMs - startTimeMs;

        // ── 2. Set end_time and mark status as done ─────────────────────
        const { data: updatedTask, error: updateErr } = await supabase
            .from('tasks')
            .update({ end_time: now, status: 'done', updated_at: now })
            .eq('id', task_id)
            .select()
            .single();

        if (updateErr) {
            console.error('[stop] update error:', updateErr.message);
            return NextResponse.json(
                { error: 'Failed to update task' },
                { status: 500 },
            );
        }

        // ── 3. Deactivate the heartbeat record ──────────────────────────
        const { error: hbErr } = await supabase
            .from('task_heartbeats')
            .update({ is_alive: false })
            .eq('task_id', task_id);

        if (hbErr) {
            console.warn('[stop] heartbeat deactivation failed (non-fatal):', hbErr.message);
        }

        // ── 4. Log status transition to task_history ────────────────────
        const { error: histErr } = await supabase.from('task_history').insert([
            {
                task_id,
                field_changed: 'status',
                old_value: existingTask.status,
                new_value: 'done',
                actor: actor || 'user',
                actor_role,
            },
            {
                task_id,
                field_changed: 'end_time',
                old_value: null,
                new_value: now,
                actor: actor || 'user',
                actor_role,
            },
        ]);

        if (histErr) {
            console.warn('[stop] history insert failed (non-fatal):', histErr.message);
        }

        // ── 5. Return the updated task with computed duration ───────────
        const result = { ...updatedTask, duration_ms: durationMs };
        return NextResponse.json(result, { status: 200 });
    } catch (error: unknown) {
        const err = error as Error;
        console.error('[stop] exception:', err.message);
        return NextResponse.json(
            { error: err.message || 'Internal server error' },
            { status: 500 },
        );
    }
}
