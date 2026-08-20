import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/task
 * Auto-create a task record in the dashboard for agent work tracking.
 * Uses service_role key when available, falls back to anon key for RLS-based access.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, description, priority = 'medium', status = 'backlog', commit_sha, files_changed } = body;

        if (!title?.trim()) {
            return NextResponse.json(
                { error: 'Title is required' },
                { status: 400 }
            );
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json(
                { error: 'Supabase credentials not configured' },
                { status: 500 }
            );
        }

        // Use direct supabase-js client (not @supabase/ssr) - this is a server-side service call
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data, error } = await supabase
            .from('tasks')
            .insert([{
                title: title.trim(),
                description: description?.trim() || '',
                priority: ['critical', 'high', 'medium', 'low'].includes(priority) ? priority : 'medium',
                status: ['backlog', 'active', 'blocked', 'in_review', 'done', 'deprecated'].includes(status) ? status : 'backlog',
                owner: 'hermes-agent',
                metadata_json: {
                    commit_sha: commit_sha || null,
                    files_changed: files_changed || 0,
                    logged_by: 'hermes-agent',
                }
            }])
            .select()
            .single();

        if (error) {
            console.error('Task creation failed:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data, { status: 201 });
    } catch (error: any) {
        console.error('POST /api/task exception:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}