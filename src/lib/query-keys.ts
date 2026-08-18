export const factoryContext = ['factoryContext'] as const;
export const tasks = { all: ['tasks'], byId: (id: number | null) => id ? [...['task', id]] : []; }
export const workflows = { all: ['workflows'], byStatus: (status?: string | null) => status ? [...['workflows', status]] : ['workflows']; }
export const agentActivity = { recent: (limit: number) => [...['agent_activity', limit]] as const; }
export const memories = { all: ['memories'], byCategory: (cat?: string | null) => cat ? [...['memories', cat]] : ['memories']; }
export const insights = { all: ['insights'], byCategory: (cat?: string | null) => cat ? [...['insights', cat]] : ['insights']; }
export const alerts = { all: ['alerts'], byFilter: (sev?: string | null, src?: string | null) => [
    'alerts', ...(sev ? [sev] : []), ...(src ? [src] : [])
]; }
export const experiments = { all: ['experiments'], byStatus: (s?: string | null) => s ? [...['experiments', s]] : ['experiments']; }
export const outcomes = { all: ['outcomes'], byMetric: (m?: string | null) => m ? [...['outcomes', m]] : ['outcomes']; }
export const costs = { all: ['costs'], recent: (n: number) => [...['costs', n]]; }
export const errors = { all: ['errors'], recent: (n: number) => [...['errors', n]]; }
export const dashboard = { summary: ['dashboard_summary']; }

export default { factoryContext, tasks, workflows, agentActivity, memories, insights, alerts, experiments, outcomes, costs, errors, dashboard };