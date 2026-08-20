import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/tasks/heartbeat
 * Pings the heartbeat for an active task (idempotent upsert).
 * Returns current_status and seconds_since_last_ping.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { task_id } = body;

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

        const now = new Date().toISOString();
        const nowDate = new Date(now);

        // ── 1. Fetch the latest heartbeat + task info ───────────────────
        const { data: heartbeat, error: hbFetchErr } = await supabase
            .from('task_heartbeats')
            .select('*, tasks(status)')
            .eq('task_id', task_id)
            .maybeSingle();

        if (hbFetchErr) {
            console.error('[heartbeat] fetch error:', hbFetchErr.message);
            return NextResponse.json(
                { error: 'Failed to fetch heartbeat state' },
                { status: 500 },
            );
        }

        // ── 2. Idempotent upsert: INSERT if missing, UPSERT if exists ──
        if (!heartbeat) {
            // No record yet — create one
            await supabase.from('task_heartbeats').insert([
                {
                    task_id,
                    last_ping: now,
                    ping_interval_seconds: 30,
                    is_alive: true,
                },
            ]);
        } else {
            // Record exists — update it
            await supabase
                .from('task_heartbeats')
                .update({ last_ping: now, is_alive: true, updated_at: now })
                .eq('task_id', task_id);
        }

        // ── 3. Get current task status ──────────────────────────────────
        const { data: taskData } = await supabase
            .from('tasks')
            .select('status')
            .eq('id', task_id)
            .single();

        // ── 4. Calculate seconds since last ping (before our update) ────
        const lastPing = heartbeat?.last_ping ? new Date(heartbeat.last_ping).getTime() : null;
        const secondsSinceLastPing = lastPing != null
            ? Math.round((nowDate.getTime() - lastPing) / 1000)
            : 0;

        // ── 5. Return success ───────────────────────────────────────────
        return NextResponse.json({
            success: true,
            task_id,
            last_ping: now,
            current_status: taskData?.status ?? 'unknown',
            seconds_since_last_ping: secondsSinceLastPing,
            is_alive: true,
        });
    } catch (error: unknown) {
        const err = error as Error;
        console.error('[heartbeat] exception:', err.message);
        return NextResponse.json(
            { error: err.message || 'Internal server error' },
            { status: 500 },
        );
    }
}
