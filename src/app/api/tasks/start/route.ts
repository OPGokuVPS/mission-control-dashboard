import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/tasks/start
 * Starts work on a task: sets start_time, creates heartbeat record,
 * and logs the status transition (active -> in_progress) in task_history.
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

        // ── 1. Validate that task exists and has status "active" ─────────
        const { data: existingTask, error: fetchErr } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', task_id)
            .maybeSingle();

        if (fetchErr) {
            console.error('[start] fetch error:', fetchErr.message);
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

        if (existingTask.status !== 'active') {
            return NextResponse.json(
                {
                    error: `Cannot start task with status "${existingTask.status}"`,
                },
                { status: 409 },
            );
        }

        // If already started, treat as idempotent success
        if (existingTask.start_time != null) {
            return NextResponse.json(
                {
                    message: 'Task already started',
                    ...existingTask,
                },
                { status: 200 },
            );
        }

        const now = new Date().toISOString();

        // ── 2. Set start_time on tasks table ────────────────────────────
        const { data: updatedTask, error: updateErr } = await supabase
            .from('tasks')
            .update({ start_time: now, updated_at: now })
            .eq('id', task_id)
            .select()
            .single();

        if (updateErr) {
            console.error('[start] update error:', updateErr.message);
            return NextResponse.json(
                { error: 'Failed to update task' },
                { status: 500 },
            );
        }

        // ── 3. Create heartbeat record for this task ────────────────────
        const { error: hbErr } = await supabase.from('task_heartbeats').insert([
            {
                task_id,
                last_ping: now,
                ping_interval_seconds: 30,
                is_alive: true,
            },
        ]);

        if (hbErr) {
            console.warn('[start] heartbeat insert failed (non-fatal):', hbErr.message);
            // Don't fail the whole operation for heartbeat issues
        }

        // ── 4. Log status transition to task_history ─────────────────────
        const { error: histErr } = await supabase.from('task_history').insert([
            {
                task_id,
                field_changed: 'status',
                old_value: 'active',
                new_value: 'in_progress',
                actor: actor || 'user',
                actor_role,
            },
        ]);

        if (histErr) {
            console.warn('[start] history insert failed (non-fatal):', histErr.message);
        }

        // ── 5. Return the updated task ───────────────────────────────────
        return NextResponse.json(updatedTask, { status: 200 });
    } catch (error: unknown) {
        const err = error as Error;
        console.error('[start] exception:', err.message);
        return NextResponse.json(
            { error: err.message || 'Internal server error' },
            { status: 500 },
        );
    }
}
