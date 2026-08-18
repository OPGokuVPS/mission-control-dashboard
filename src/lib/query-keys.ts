// Static arrays used directly in some hooks
export const factoryContext = ['factory_context'] as const;
export const alerts = ['alerts'] as const;
export const costTracking = ['cost_tracking'] as const;
export const errors = ['errors'] as const;
export const memoryVault = ['memory_vault'] as const;

// Helper: create an object whose base value IS an array, PLUS supports chained .method()
const makeChainable = <T extends string>(base: readonly T[], methods?: Record<string, unknown>) => {
    const proxy = new Proxy(base as unknown as Record<string, unknown>, {
        get: (_target, prop) => {
            if (prop in (methods || {})) {
                return (methods || {})[prop];
            }
            if (typeof prop === 'string') {
                return undefined;
            }
            return (base as unknown as Record<string | number, unknown>)[prop];
        },
    });
    return proxy as unknown as Record<string, unknown> & typeof base;
};

export const tasks = makeChainable(['tasks'], {
    all: [...['tasks']],
});

export const task = makeChainable(['task'], {
    byId: (id: number) => [...['task'], id] as const,
});

export const workflows = makeChainable(['workflows'], {
    all: [...['workflows']],
    byStatus: (status?: string | null) =>
        status ? [...['workflows'], 'status:' + status] : [...['workflows']],
});

export const workflow = makeChainable(['workflow'], {
    byId: (id: number) => [...['workflow'], id] as const,
});

export const agentActivity = makeChainable(['agent_activity'], {
    recent: (limit: number) => [...['agent_activity'], 'recent', limit] as const,
});

export const memories: Record<string, unknown> = {};
(memories as any).all = ['memories', 'all'] as const;
(memories as any).byCategory = (category?: string | null) =>
    category ? ['memories', 'byCategory', category] as const : ['memories', 'all'] as const;

export const insights: Record<string, unknown> = {};
(insights as any).all = ['insights', 'all'] as const;
(insights as any).byCategory = (category?: string | null) =>
    category ? ['insights', 'byCategory', category] as const : ['insights', 'all'] as const;

export const experiments: Record<string, unknown> = {};
(experiments as any).all = ['experiments', 'all'] as const;
(experiments as any).byStatus = (status?: string | null) =>
    status ? ['experiments', 'byStatus', status] as const : ['experiments', 'all'] as const;

export const outcomes: Record<string, unknown> = {};
(outcomes as any).all = ['outcomes', 'all'] as const;
(outcomes as any).byMetric = (metric: string) => ['outcomes', metric] as const;

export const costs: Record<string, unknown> = {};
(costs as any).recent = (limit: number) => ['costs', 'recent', limit] as const;

export const dashboard: Record<string, unknown> = {};
(dashboard as any).summary = ['dashboard', 'summary'] as const;