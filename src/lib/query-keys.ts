export const QUERY_KEYS = {
    factoryContext: ['factory_context'] as const,
    tasks: ['tasks'] as const,
    task: ['task'] as const,
    workflows: ['workflows'] as const,
    workflow: ['workflow'] as const,
    agentActivity: ['agent_activity'] as const,
    memoryVault: ['memory_vault'] as const,
    insights: ['insights'] as const,
    alerts: ['alerts'] as const,
    experiments: ['experiments'] as const,
    outcomes: ['outcomes'] as const,
    costTracking: ['cost_tracking'] as const,
    errors: ['errors'] as const,
    dashboardSummary: ['dashboard_summary'] as const,
} as const;

export function taskQueryKey(id: number) {
    return [...QUERY_KEYS.task, id] as const;
}

export function workflowQueryKey(id: number) {
    return [...QUERY_KEYS.workflow, id] as const;
}

export function byStatus(status: string) {
    return `status:${status}`;
}

export function byAgent(agent: string) {
    return `agent:${agent}`;
}
