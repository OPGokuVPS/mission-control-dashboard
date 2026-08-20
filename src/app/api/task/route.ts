import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/task
 * Auto-create a task record in the dashboard for agent work tracking.
 * This runs server-side and calls the Supabase REST API directly.
 * Uses the anon key — RLS policy must allow anon inserts on tasks table.
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