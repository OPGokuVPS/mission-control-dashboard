// Static arrays (used directly in some hooks)
export const factoryContext = ['factory_context'] as const;
export const alerts = ['alerts'] as const;
export const costTracking = ['cost_tracking'] as const;
export const memoryVault = ['memory_vault'] as const;

// --- tasks.all, task.byId(id) ---
export const tasks = Object.assign(['tasks'], { all: ['tasks'] }) as readonly string[] & { all: readonly string[] };
export const task = Object.assign(['task'], { byId: (id: number) => [...['task'], id] as const }) as readonly string[] & { byId: (id: number) => readonly (string | number)[] };

// --- workflows.all, workflows.byStatus(s) ---
export const workflows = Object.assign(['workflows'], {
    all: ['workflows'],
    byStatus: (status?: string | null) => status ? [...['workflows'], `status:${status}`] as const : ['workflows'] as const,
}) as readonly string[] & { all: readonly string[]; byStatus: (s?: string | null) => readonly string[] };

// --- workflow.byId(id) ---
export const workflow = Object.assign(['workflow'], {
    byId: (id: number) => [...['workflow'], id] as const,
}) as readonly string[] & { byId: (id: number) => readonly (string | number)[] };

// --- agentActivity.recent(limit) ---
export const agentActivity = Object.assign(['agent_activity'], {
    recent: (limit: number) => [...['agent_activity', 'recent'], limit] as const,
}) as readonly string[] & { recent: (limit: number) => readonly (string | number)[] };

// --- errors static + errors.recent(limit) ---
export const errors = Object.assign(['errors'], {
    recent: (limit: number) => [...['errors', 'recent'], limit] as const,
}) as readonly string[] & { recent: (limit: number) => readonly (string | number)[] };

// --- memories.all, memories.byCategory(c) ---
export const memories = {
    all: ['memories', 'all'] as const,
    byCategory: (category?: string | null) => category ? ['memories', 'byCategory', category] as const : ['memories', 'all'] as const,
};

// --- insights.all, insights.byCategory(c) ---
export const insights = {
    all: ['insights', 'all'] as const,
    byCategory: (category?: string | null) => category ? ['insights', 'byCategory', category] as const : ['insights', 'all'] as const,
};

// --- experiments.all, experiments.byStatus(s) ---
export const experiments = {
    all: ['experiments', 'all'] as const,
    byStatus: (status?: string | null) => status ? ['experiments', 'byStatus', status] as const : ['experiments', 'all'] as const,
};

// --- outcomes.all, outcomes.byMetric(m) ---
export const outcomes = {
    all: ['outcomes', 'all'] as const,
    byMetric: (metric: string) => ['outcomes', metric] as const,
};

// --- costs.recent(limit) ---
export const costs = {
    recent: (limit: number) => ['costs', 'recent', limit] as const,
};

// --- dashboard.summary ---
export const dashboard = {
    summary: ['dashboard', 'summary'] as const,
};

// --- agentPerformance.metrics(range) ---
export const agentPerformance = {
    metrics: (range?: PerformanceRangeParams | null) =>
        range && (range.startDate || range.endDate)
            ? ['agent_performance', 'metrics', { ...range }] as const
            : ['agent_performance', 'metrics'] as const,
};

interface PerformanceRangeParams {
    startDate: string | null;
    endDate: string | null;
}