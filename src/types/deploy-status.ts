/**
 * Types for deploy status monitoring across environments.
 */

export const DEPLOY_STATUSES = ['ready', 'building', 'error', 'cancelled', 'queued'] as const;
export type DeployStatus = (typeof DEPLOY_STATUSES)[number];

export type DeployEnvironment = 'production' | 'staging' | 'development';

export interface DeployRecord {
    /** Unique identifier for this deployment */
    id: string;
    /** Environment slug (vercel project) */
    uid: string;
    /** Target environment label */
    environment: DeployEnvironment;
    /** Git commit short hash (e.g. "a1b2c3d") */
    commit?: string;
    /** Human-readable version string (derived from git tag or commit) */
    version?: string;
    /** Build status */
    status: DeployStatus;
    /** Publicly accessible URL of the deployed preview / production app */
    url?: string;
    /** ISO-8601 timestamp when the build started */
    startedAt?: string;
    /** ISO-8601 timestamp when the build finished */
    finishedAt?: string;
    /** Duration of the build in seconds */
    durationSeconds?: number;
}

/** Shape returned by the GET /api/deploy-status endpoint */
export interface DeployStatusResponse {
    deployments: DeployRecord[];
    source: 'vercel-api' | 'github-actions' | 'local-cache';
    cachedAt?: string;
}

/** Payload received from a GitHub Actions webhook */
export interface GithubWebhookPayload {
    action?: string;
    workflow?: {
        name: string;
    };
    head_commit?: {
        id: string;
        message: string;
        timestamp: string;
    };
    branches?: {
        name: string;
    };
    repository?: {
        full_name: string;
        html_url: string;
    };
    created_at?: string;
}

/** Internal state stored locally as fallback */
export interface LocalDeployState {
    lastKnown: Record<DeployEnvironment, DeployRecord>;
    updatedAt: string;
}
