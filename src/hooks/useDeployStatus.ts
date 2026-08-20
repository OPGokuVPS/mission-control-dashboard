/**
 * useDeployStatus — React Query hook for polling deploy status.
 *
 * Polls every 30 s while a build is active (building/error/queued),
 * and every 60 s when idle (ready/cancelled).
 */

import { useQuery } from '@tanstack/react-query';
import type { DeployRecord, DeployStatusResponse } from '@/types/deploy-status';
import * as QUERY_KEYS from '@/lib/query-keys';

const POLL_INTERVAL_BUILDING = 30_000; // ms — while building
const POLL_INTERVAL_IDLE = 60_000;     // ms — when idle / ready

async function fetchDeployStatus(env?: string): Promise<DeployStatusResponse> {
    const params = env ? new URLSearchParams({ env }).toString() : '';
    const resp = await fetch(`/api/deploy-status?${params}`);
    if (!resp.ok) {
        throw new Error(`deploy-status API returned ${resp.status}`);
    }
    return resp.json();
}

export function useDeployStatus(options?: { env?: string }) {
    return useQuery<DeployStatusResponse>({
        queryKey: options?.env
            ? [...QUERY_KEYS.deploy.all, `env:${options.env}`]
            : QUERY_KEYS.deploy.all,
        queryFn: () => fetchDeployStatus(options?.env),
        refetchInterval: (query) => {
            const data = query.state.data?.deployments;
            if (!data || data.length === 0) return POLL_INTERVAL_IDLE;

            // If ANY deployment is building/error/queued, poll faster
            const anyBuilding = data.some(
                (d: DeployRecord) => ['building', 'error', 'queued'].includes(d.status),
            );
            return anyBuilding ? POLL_INTERVAL_BUILDING : POLL_INTERVAL_IDLE;
        },
        staleTime: 15_000,
        refetchOnWindowFocus: true,
        retry: 2,
        retryDelay: 2_000,
    });
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

export function getLatestDeployment(data: DeployStatusResponse | undefined): DeployRecord | undefined {
    return data?.deployments[0];
}

export function getDeployByEnv(
    data: DeployStatusResponse | undefined,
    env: DeployRecord['environment'],
): DeployRecord | undefined {
    return data?.deployments.find((d) => d.environment === env);
}
