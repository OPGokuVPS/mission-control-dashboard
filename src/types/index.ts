/**
 * Central type definitions for the Autonomous AI Software Factory.
 * Mirrors the PostgreSQL enum types and table schemas exactly.
 */

export const AGENT_ROLES = [
    'strategy',
    'system_architect',
    'backend_engineer',
    'frontend_engineer',
    'integration_engineer',
    'qa',
    'devops',
    'security',
    'data',
    'growth',
    'support_and_monitoring',
] as const;
export type AgentRole = (typeof AGENT_ROLES)[number];

export const TASK_STATUSES = ['backlog', 'active', 'blocked', 'in_review', 'done', 'deprecated'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PRIORITY_LEVELS = ['critical', 'high', 'medium', 'low'] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

export const RISK_SEVERITIES = ['high', 'medium', 'low'] as const;
export type RiskSeverity = (typeof RISK_SEVERITIES)[number];

export const ALERT_SOURCES = ['technical', 'business_risk', 'security', 'performance', 'cost'] as const;
export type AlertSource = (typeof ALERT_SOURCES)[number];

export const MEMORY_TYPES = ['successful_approach', 'failure_pattern', 'architecture_decision', 'kpi_learning'] as const;
export type MemoryType = (typeof MEMORY_TYPES)[number];

export const METRIC_CATEGORIES = ['performance', 'revenue', 'ux', 'reliability', 'operational'] as const;
export type MetricCategory = (typeof METRIC_CATEGORIES)[number];

export const IMPACT_LEVELS = ['high', 'medium', 'low'] as const;
export type ImpactLevel = (typeof IMPACT_LEVELS)[number];

export const EXPERIMENT_STATUSES = ['running', 'concluded_winner_a', 'concluded_winner_b', 'concluded_tie', 'aborted'] as const;
export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];

export const EXPERIMENT_DECISIONS = ['rollout_variant_a', 'rollout_variant_b', 'keep_both', 'discard', 'continue_test'] as const;
export type ExperimentDecision = (typeof EXPERIMENT_DECISIONS)[number];

export const WORKFLOW_STATUSES = ['idle', 'running', 'paused', 'completed', 'failed'] as const;
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export interface Subtask {
    id: string;
    title: string;
    completed: boolean;
}

export interface Task {
    id: number;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: PriorityLevel;
    assigned_agent?: AgentRole;
    owner?: string;
    subtasks?: Subtask[];
    deadline?: string;
    impact_score?: number;
    created_at: string;
}

export interface Workflow {
    id: number;
    name: string;
    description?: string;
    steps: string[];
    current_step: number;
    status: WorkflowStatus;
    dependencies?: string[];
    completion_pct: number;
    correction_logs?: { step: number; issue: string; correction: string }[];
    assigned_agent?: AgentRole;
    created_at: string;
}

export interface AgentActivity {
    id: number;
    agent_name: AgentRole;
    agent_role: AgentRole;
    objective: string;
    actions: string[];
    tools_used?: string[];
    result?: string;
    outcome_quality?: 'high' | 'medium' | 'low';
    correction_applied?: boolean;
    status: string;
    created_at: string;
}

export interface MemoryEntry {
    id: number;
    title: string;
    content: string;
    category: MemoryType;
    dedup_key?: string;
    linked_task_id?: number;
    linked_agent?: string;
    created_at: string;
}

export interface Insight {
    id: number;
    title: string;
    description: string;
    category: MetricCategory;
    impact_level: ImpactLevel;
    suggestions?: string[];
    created_at: string;
}

export interface Alert {
    id: number;
    title: string;
    description: string;
    severity: RiskSeverity;
    source: AlertSource;
    status: string;
    linked_task_id?: number;
    linked_workflow_id?: number;
    resolved_at?: string;
    created_at: string;
}

export interface Experiment {
    id: number;
    name: string;
    hypothesis: string;
    variant_a_text?: string;
    variant_b_text?: string;
    metric_tracked?: string;
    sample_size?: number;
    p_value?: number;
    status: ExperimentStatus;
    decision?: ExperimentDecision;
    created_at: string;
}

export interface Outcome {
    id: number;
    task_id?: number;
    workflow_id?: number;
    metric_type: MetricCategory;
    baseline_value: number;
    final_value: number;
    delta_pct: number;
    measured_at: string;
}

export interface CostRecord {
    id: number;
    task_id?: number;
    agent_name: string;
    model_used: string;
    tokens_input: number;
    tokens_output: number;
    total_cost_usd: number;
    wall_time_seconds: number;
    recorded_at: string;
}

export interface AppError {
    id: number;
    service: string;
    severity: 'warning' | 'error' | 'fatal';
    message: string;
    metadata_json?: Record<string, unknown>;
    created_at: string;
}

export interface FactoryContext {
    id?: number;
    industry?: string;
    business_model?: string;
    target_users?: string[];
    primary_kpis?: string[];
    constraints?: string;
    created_at?: string;
    updated_at?: string;
}

export interface DashboardSummary {
    tasks: number;
    workflows: number;
    alerts: number;
    active_experiments: number;
    agents_busy: number;
    cost_today: string;
}