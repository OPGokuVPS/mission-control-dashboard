import { NextResponse } from 'next/server';

const VALID_ROLES = [
    'strategy', 'system_architect', 'backend_engineer', 'frontend_engineer',
    'integration_engineer', 'qa', 'devops', 'security', 'data',
    'growth', 'support_and_monitoring'
];

/**
 * POST /api/agent-activity
 * Logs sub-agent activity into the agent_activity table via Supabase REST API.
 * Uses anon key with permissive RLS policy (added via SQL migration).
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            agent_role,          // Column name in DB matches agent_role enum type
            objective,
            actions = [],
            tools_used = [],
            result,
            outcome_quality,
            correction_applied = false,
            status = 'completed',
        } = body;

        if (!agent_role || !objective) {
            return NextResponse.json(
                { error: 'agent_role and objective are required' },
                { status: 400 }
            );
        }

        if (!VALID_ROLES.includes(agent_role)) {
            return NextResponse.json(
                { error: `Invalid agent_role. Must be one of: ${VALID_ROLES.join(', ')}` },
                { status: 400 }
            );
        }

        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/agent_activity?select=*`;

        const payload = {
            agent_role,
            objective: objective.trim(),
            actions: Array.isArray(actions) ? actions : [],
            tools_used: Array.isArray(tools_used) ? tools_used : [],
            result: result || null,
            outcome_quality: outcome_quality || null,
            correction_applied: Boolean(correction_applied),
            status: status || 'completed',
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
            return NextResponse.json(
                { error: `Supabase: ${resp.status} ${errorText}` },
                { status: resp.status }
            );
        }

        const data = await resp.json();
        return NextResponse.json(data[0], { status: 201 });
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

        const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const headers = {
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
        };

        // Get tasks assigned to agents (tasks table has assigned_agent column)
        const tasksResp = await fetch(
            `${baseUrl}/rest/v1/tasks?select=assigned_agent,status&or=(assigned_agent.not.is.null)&limit=500`,
            { headers }
        );

        if (!tasksResp.ok) {
            return NextResponse.json({ error: 'Failed to fetch task data' }, { status: 500 });
        }

        const tasks = await tasksResp.json() as { assigned_agent: string; status: string }[];

        // Build workload per agent
        const workload: Record<string, Record<string, number>> = {};
        for (const role of VALID_ROLES) {
            workload[role] = { total: 0, active: 0, backlog: 0, in_review: 0, done: 0, blocked: 0 };
        }

        for (const t of tasks) {
            const role = t.assigned_agent;
            if (role && workload[role]) {
                workload[role].total++;
                if (workload[role][t.status] !== undefined) {
                    workload[role][t.status]++;
                }
            }
        }

        // Get recent agent activity
        let activityUrl = `${baseUrl}/rest/v1/agent_activity?select=*&order=created_at.desc&limit=${limit}`;
        if (agent) {
            activityUrl += `&agent_role=eq.${agent}`;
        }

        const activityResp = await fetch(activityUrl, { headers });

        if (!activityResp.ok) {
            return NextResponse.json({ error: 'Failed to fetch activity data' }, { status: 500 });
        }

        const recentActivity = await activityResp.json();
        const agentsBusy = Object.values(workload).filter((w: any) => w.active > 0).length;

        return NextResponse.json({
            workload,
            recent_activity: recentActivity || [],
            agents_busy: agentsBusy,
        });
    } catch (error: any) {
        console.error('GET /api/agent-activity exception:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}