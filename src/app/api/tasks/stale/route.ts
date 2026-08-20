import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/tasks/stale
 * Detects active tasks whose heartbeats are stale:
 *   - is_alive = false, OR
 *   - last_ping more than 3 minutes ago.
 */
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const maxAgeMinutes = Number(url.searchParams.get('max_age_minutes')) || 3;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        );

        const now = new Date();
        const cutoff = new Date(now.getTime() - maxAgeMinutes * 60 * 1000);
        const cutoffISO = cutoff.toISOString();

        // ── 1. Find active tasks with start_time set ─────────────────────
        const { data: activeTasks, error: tasksErr } = await supabase
            .from('tasks')
            .select('id, title, status, start_time, assigned_agent, owner')
            .eq('status', 'active')
            .not('start_time', 'is', null)
            .order('start_time', { ascending: true });

        if (tasksErr) {
            console.error('[stale] tasks query error:', tasksErr.message);
            return NextResponse.json(
                { error: 'Failed to fetch active tasks' },
                { status: 500 },
            );
        }

        if (!activeTasks || activeTasks.length === 0) {
            return NextResponse.json({ stale_tasks: [], total_stale: 0 });
        }

        const activeIds = activeTasks.map((t) => t.id);

        // ── 2. Cross-reference with task_heartbeats ─────────────────────
        const { data: heartbeats, error: hbErr } = await supabase
            .from('task_heartbeats')
            .select('*')
            .in('task_id', activeIds);

        if (hbErr) {
            console.error('[stale] heartbeat query error:', hbErr.message);
            return NextResponse.json(
                { error: 'Failed to fetch heartbeat data' },
                { status: 500 },
            );
        }

        // Build lookup map
        const heartbeatMap = new Map<number, typeof heartbeats[0]>();
        for (const hb of heartbeats ?? []) {
            heartbeatMap.set(hb.task_id, hb);
        }

        // ── 3. Identify stale tasks ────────────────────────────────────
        const staleTasks: Array<{
            task_id: number;
            title: string;
            started_at: string;
            assigned_agent?: string | null;
            last_ping?: string | null;
            seconds_since_ping?: number;
            reason: 'timeout' | 'no_heartbeat';
            warning: string;
        }> = [];

        for (const task of activeTasks) {
            const hb = heartbeatMap.get(task.id);

            let reason: 'timeout' | 'no_heartbeat' = 'no_heartbeat';
            let warning = '';

            if (!hb) {
                // No heartbeat record at all
                reason = 'no_heartbeat';
                warning = `No heartbeat recorded for active task — agent may have crashed`;
            } else if (!hb.is_alive) {
                // Heartbeat exists but marked dead
                reason = 'timeout';
                warning = `Heartbeat marked stale (${Math.round(
                    (new Date().getTime() - new Date(hb.last_ping).getTime()) / 1000
                )}s since last ping)`;
            } else {
                // Check if last_ping > cutoff
                const lastPingTime = new Date(hb.last_ping).getTime();
                if (lastPingTime < cutoff.getTime()) {
                    reason = 'timeout';
                    warning = `Last ping was ${Math.round((now.getTime() - lastPingTime) / 1000)}s ago (>${maxAgeMinutes}min threshold)`;
                } else {
                    // Task is healthy
                    continue;
                }
            }

            staleTasks.push({
                task_id: task.id,
                title: task.title,
                started_at: task.start_time ?? '',
                assigned_agent: task.assigned_agent,
                last_ping: hb?.last_ping ?? null,
                seconds_since_ping: hb
                    ? Math.round((now.getTime() - new Date(hb.last_ping!).getTime()) / 1000)
                    : undefined,
                reason,
                warning,
            });
        }

        // ── 4. Return sorted by staleness (oldest first) ──────────────
        staleTasks.sort(
            (a, b) =>
                new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
        );

        return NextResponse.json({
            stale_tasks: staleTasks,
            total_stale: staleTasks.length,
            total_active_checked: activeTasks.length,
        });
    } catch (error: unknown) {
        const err = error as Error;
        console.error('[stale] exception:', err.message);
        return NextResponse.json(
            { error: err.message || 'Internal server error' },
            { status: 500 },
        );
    }
}
