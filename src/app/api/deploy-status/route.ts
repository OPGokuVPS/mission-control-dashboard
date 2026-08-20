import { NextResponse } from 'next/server';
import type { DeployStatus, DeployRecord } from '@/types/deploy-status';

/**
 * GET /api/deploy-status
 * Returns the latest Vercel deployment status per environment.
 *
 * Falls back gracefully when VERCEL_TOKEN is not set:
 *   1. Reads from local .vercel/state.json (on dev servers).
 *   2. Returns a cached/placeholder response indicating fallback mode.
 */

// ---------------------------------------------------------------------------
// Vercel REST API helpers
// ---------------------------------------------------------------------------

interface VercelDeployment {
    id: string;
    uid: string;
    url: string;
    build: {
        env?: Record<string, string>;
    };
    meta: Record<string, string | number>;
    createdAt: number;
    finishedAt?: number;
    readyState: string;
    sender?: string;
    commit?: string;
    name?: string;
    alias?: string[];
}

const VERCEL_API = 'https://api.vercel.com/v2';

async function fetchVercelDeployments(token: string): Promise<VercelDeployment[]> {
    const resp = await fetch(`${VERCEL_API}/deployments?teamId=${process.env.VERCEL_TEAM_ID}&limit=3&status=ready,building,error,cancelled`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        // Cache for 60 seconds since we poll anyway
        next: { revalidate: 60 },
    });

    if (!resp.ok) {
        throw new Error(`Vercel API error ${resp.status}: ${resp.statusText}`);
    }

    const data = await resp.json();
    return Array.isArray(data?.deployments) ? data.deployments : [];
}

// ---------------------------------------------------------------------------
// Local state fallback
// ---------------------------------------------------------------------------

function readLocalState(): DeployRecord[] {
    try {
        // Try .vercel/state.json on disk (only exists on dev/proxy builds)
        const fs = require('fs');
        const path = require('path');
        const statePath = path.join(process.cwd(), '.vercel', 'state.json');

        if (fs.existsSync(statePath)) {
            const raw = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
            // Build a minimal record from whatever info is available
            return [{
                id: 'local-state',
                uid: raw.projectId ?? 'unknown',
                environment: 'development' as const,
                version: raw.targetName ?? undefined,
                status: 'queued' as const,
                startedAt: new Date().toISOString(),
            }];
        }
    } catch {
        // ignore — will fall through to placeholder
    }

    return [];
}

function placeholderDeployments(): DeployRecord[] {
    const now = new Date().toISOString();
    return (['production', 'staging', 'development'] as const).map((env) => ({
        id: 'placeholder',
        uid: process.env.VERCEL_PROJECT_ID ?? 'unknown',
        environment: env,
        status: 'queued' as DeployStatus,
        version: env === 'production' ? 'N/A (no token)' : undefined,
        startedAt: now,
        url: getVercelUrl(env),
    }));
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

const VERCEL_TO_DEPLOY_STATUS: Record<string, DeployStatus> = {
    READY: 'ready',
    BUILDING: 'building',
    ERROR: 'error',
    CANCELLED: 'cancelled',
    QUEUED: 'queued',
};

function mapToEnv(uid: string): DeployRecord['environment'] {
    const target = process.env.VERCEL_TARGET || '';
    if (target.includes('production') || uid.toLowerCase().includes('production')) return 'production';
    if (target.includes('staging') || uid.toLowerCase().includes('staging')) return 'staging';
    return 'development';
}

function getVercelUrl(env: DeployRecord['environment']): string | undefined {
    switch (env) {
        case 'production':
            return process.env.NEXT_PUBLIC_VERCEL_PRODUCTION_URL
                || process.env.NEXT_PUBLIC_VERCEL_URL;
        case 'staging':
            return process.env.VERCEL_STAGING_URL;
        case 'development':
            return process.env.NEXT_PUBLIC_VERCEL_URL
                || process.env.VERCEL_URL;
    }
}

function computeDuration(startTimeMs: number, endTimeMs?: number): number | undefined {
    if (!endTimeMs) return undefined;
    return Math.round((endTimeMs - startTimeMs) / 1000);
}

function mapDeployment(d: VercelDeployment): DeployRecord {
    const startedAt = d.createdAt ? new Date(d.createdAt).toISOString() : undefined;
    const finishedAt = d.finishedAt ? new Date(d.finishedAt).toISOString() : undefined;
    const shortCommit = typeof d.commit === 'string' ? d.commit.slice(0, 7) : undefined;

    return {
        id: d.id,
        uid: d.uid,
        environment: mapToEnv(d.uid),
        commit: shortCommit,
        version: d.name,
        status: VERCEL_TO_DEPLOY_STATUS[d.readyState] ?? 'queued',
        url: d.url,
        startedAt,
        finishedAt,
        durationSeconds: computeDuration(d.createdAt, d.finishedAt),
    };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const envFilter = searchParams.get('env');  // optional: filter by environment slug

    try {
        const token = process.env.VERCEL_TOKEN || process.env.VERCEL_API_TOKEN;

        if (!token) {
            console.warn('[deploy-status] VERCEL_TOKEN not set — returning placeholder with fallback');
            let deployments = placeholderDeployments();

            // If we have local vercel state on disk, use that as a slightly better fallback
            const local = readLocalState();
            if (local.length > 0 && deployments.every((d) => d.id === 'placeholder')) {
                deployments = local;
            }

            return NextResponse.json({
                deployments,
                source: 'local-cache',
                cachedAt: new Date().toISOString(),
                warning: 'VERCEL_TOKEN environment variable not configured; showing placeholder data',
            });
        }

        // --- Real Vercel API call ---
        const deployments = await fetchVercelDeployments(token);

        const mapped = deployments.map(mapDeployment);

        // Apply optional environment filter
        let filtered = mapped;
        if (envFilter) {
            filtered = mapped.filter((d) => d.environment === envFilter);
        }

        // Sort: newest first, building/error items first
        filtered.sort((a, b) => {
            const priority: Record<DeployStatus, number> = {
                building: 0, error: 1, queued: 2, ready: 3, cancelled: 4,
            };
            return (priority[a.status] ?? 5) - (priority[b.status] ?? 5);
        });

        return NextResponse.json({
            deployments: filtered,
            source: 'vercel-api',
            cachedAt: new Date().toISOString(),
        });
    } catch (err: unknown) {
        console.error('[deploy-status] GET failed:', err);
        const message = err instanceof Error ? err.message : 'Internal server error';

        // Return placeholder even on API failure so the UI doesn't break
        const fallback = placeholderDeployments();
        return NextResponse.json({
            deployments: fallback,
            source: 'local-cache',
            cachedAt: new Date().toISOString(),
            warning: `Vercel API request failed: ${message}`,
            error: message,
        }, { status: 502 });
    }
}
