import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as QUERY_KEYS from '@/lib/query-keys';
import type { DashboardSummary, FactoryContext } from '@/types';

export function useDashboardSummary() {
    return useQuery({
        queryKey: QUERY_KEYS.dashboard.summary,
        queryFn: async (): Promise<DashboardSummary> => {
            const [tasksRes, workflowsRes, alertsRes, experimentsRes, costRes] = await Promise.all([
                supabase.from('tasks').select('id', { count: 'exact', head: true }),
                supabase.from('workflows').select('id', { count: 'exact', head: true }).eq('status', 'active'),
                supabase.from('alerts').select('id', { count: 'exact', head: true }).neq('status', 'resolved'),
                supabase.from('experiments').select('id', { count: 'exact', head: true }).eq('status', 'running'),
                supabase.from('cost_tracking').select('total_cost_usd').gte('recorded_at', new Date(Date.now() - 86400000).toISOString()),
            ]);

            const costToday = costRes.data?.reduce((sum: number, r: any) => sum + (Number(r.total_cost_usd) || 0), 0) ?? 0;

            return {
                tasks: tasksRes.count ?? 0,
                workflows: workflowsRes.count ?? 0,
                alerts: alertsRes.count ?? 0,
                active_experiments: experimentsRes.count ?? 0,
                agents_busy: 0,
                cost_today: costToday.toFixed(4),
            };
        },
        staleTime: 15_000,
    });
}