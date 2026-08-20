import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/task
 * Auto-create a task record in the dashboard for agent work tracking.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, description, priority = 'medium', status = 'backlog' } = body;

        if (!title?.trim()) {
            return NextResponse.json(
                { error: 'Title is required' },
                { status: 400 }
            );
        }

        const validPriorities = ['critical', 'high', 'medium', 'low'];
        const validStatuses = ['backlog', 'active', 'blocked', 'in_review', 'done', 'deprecated'];

        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/tasks?select=*`;

        const payload = {
            title: title.trim(),
            description: description?.trim() || '',
            priority: validPriorities.includes(priority as any) ? priority : 'medium',
            status: validStatuses.includes(status as any) ? status : 'backlog',
            owner: 'hermes-agent',
        };

        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
                'Range-Unit': 'items',
                'Range': '0-1',
            },
            body: JSON.stringify(payload),
        });

        if (!resp.ok) {
            const errorText = await resp.text();
            console.error('Supabase insert failed:', resp.status, errorText);
            return NextResponse.json(
                { error: resp.status === 401 ? 'Authentication required' : errorText },
                { status: resp.status }
            );
        }

        const data = await resp.json();
        return NextResponse.json(data[0], { status: 201 });
    } catch (error: any) {
        console.error('POST /api/task exception:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

/**
 * PATCH /api/task
 * Update an existing task's status server-side (bypasses RLS restrictions on anon key).
 */
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, status, ...fields } = body;

        if (!id) {
            return NextResponse.json(
                { error: 'Task id is required' },
                { status: 400 }
            );
        }

        const validStatuses = ['backlog', 'active', 'blocked', 'in_review', 'done', 'deprecated'];
        const updatePayload: Record<string, any> = {};

        if (status && validStatuses.includes(status as any)) {
            updatePayload.status = status;

            // ── Auto-set start_time on backlog -> active transition ──
            if (String(status) === 'active') {
                // Fetch current status to check if this is a backlog transition
                const { data: currentData } = await fetch(
                    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/tasks?select=status,start_time&id=eq.${id}`,
                    {
                        headers: {
                            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
                            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
                        },
                    },
                ).then((r) => r.json());

                const currentStatus = currentData?.[0]?.status;
                const hasStartTime = currentData?.[0]?.start_time;

                // Only auto-set start_time if transitioning from backlog and no explicit start_time provided
                if (
                    currentStatus === 'backlog' &&
                    !hasStartTime &&
                    !fields.start_time
                ) {
                    updatePayload.start_time = new Date().toISOString();
                }
            }
        }

        // Merge any other allowed fields
        const allowedFields = ['priority', 'assigned_agent', 'owner', 'description'];
        for (const field of allowedFields) {
            if (fields[field] !== undefined) {
                updatePayload[field] = fields[field];
            }
        }

        if (Object.keys(updatePayload).length === 0) {
            return NextResponse.json(
                { error: 'No valid fields to update' },
                { status: 400 }
            );
        }

        updatePayload.updated_at = new Date().toISOString();

        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/tasks?id=eq.${id}`;

        const resp = await fetch(url, {
            method: 'PATCH',
            headers: {
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
            },
            body: JSON.stringify(updatePayload),
        });

        if (!resp.ok) {
            const errorText = await resp.text();
            console.error('Supabase update failed:', resp.status, errorText);
            return NextResponse.json(
                { error: resp.status === 401 ? 'Authentication required' : errorText },
                { status: resp.status }
            );
        }

        const data = await resp.json();
        if (!data || data.length === 0) {
            return NextResponse.json(
                { error: 'Task not found or no changes applied' },
                { status: 404 }
            );
        }

        return NextResponse.json(data[0], { status: 200 });
    } catch (error: any) {
        console.error('PATCH /api/task exception:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}