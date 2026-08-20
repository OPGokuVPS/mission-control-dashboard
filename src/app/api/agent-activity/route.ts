import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/agent-activity
 * Logs sub-agent activity into the agent_activity table.
 * Called automatically when delegate_task completes so the
 * Mission Control dashboard shows real-time agent workload.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            agent_name,
            objective,
            actions = [],
            tools_used = [],
            result,
            outcome_quality,
            correction_applied = false,
            status = 'completed',
        } = body;

        if (!agent_name || !objective) {
            return NextResponse.json(
                { error: 'agent_name and objective are required' },
                { status: 400 }
            );
        }

        const validRoles = [
            'strategy', 'system_architect', 'backend_engineer', 'frontend_engineer',
            'integration_engineer', 'qa', 'devops', 'security', 'data',
            'growth', 'support_and_monitoring'
        ];
        if (!validRoles.includes(agent_name)) {
            return NextResponse.json(
                { error: `Invalid agent_name. Must be one of: ${validRoles.join(', ')}` },
                { status: 400 }
            );
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data, error } = await supabase
            .from('agent_activity')
            .insert([{
                agent_name,
                objective: objective.trim(),
                actions: Array.isArray(actions) ? actions : [],
                tools_used: Array.isArray(tools_used) ? tools_used : [],
                result: result || null,
                outcome_quality: outcome_quality || null,
                correction_applied: Boolean(correction_applied),
                status: status || 'completed',
            }])
            .select()
            .single();

        if (error) {
            console.error('agent_activity insert failed:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data, { status: 201 });
    } catch (error: any) {
        console.error('POST /api/agent-activity exception:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

/**
 * GET /api/agent-activity
 * Returns agent workload summary: counts per role + recent activity
 */
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const agent = url.searchParams.get('agent');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 100);

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get workload summary: task count per agent + per status
        const { data: taskSummary, error: taskError } = await supabase
            .from('tasks')
            .select('assigned_agent, status')
            .not('assigned_agent', 'is', null);

        if (taskError) {
            return NextResponse.json({ error: taskError.message }, { status: 500 });
        }

        // Build workload per agent
        const agentRoles = [
            'strategy', 'system_architect', 'backend_engineer', 'frontend_engineer',
            'integration_engineer', 'qa', 'devops', 'security', 'data',
            'growth', 'support_and_monitoring'
        ];

        const workload: Record<string, { total: number; active: number; backlog: number; in_review: number; done: number; blocked: number }> = {};
        for (const role of agentRoles) {
            workload[role] = { total: 0, active: 0, backlog: 0, in_review: 0, done: 0, blocked: 0 };
        }

        for (const t of (taskSummary || [])) {
            const role = t.assigned_agent as string;
            if (role && workload[role]) {
                workload[role].total++;
                const status = t.status as string;
                if (status && workload[role][status as keyof typeof workload[typeof role]] !== undefined) {
                    (workload[role] as any)[status]++;
                }
            }
        }

        // Get recent activity
        let query = supabase
            .from('agent_activity')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (agent) {
            query = query.eq('agent_name', agent);
        }

        const { data: activity, error: activityError } = await query;

        if (activityError) {
            return NextResponse.json({ error: activityError.message }, { status: 500 });
        }

        // Count busy agents (agents with active tasks)
        const agentsBusy = Object.values(workload).filter(w => w.active > 0).length;

        return NextResponse.json({
            workload,
            recent_activity: activity || [],
            agents_busy: agentsBusy,
        });
    } catch (error: any) {
        console.error('GET /api/agent-activity exception:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}