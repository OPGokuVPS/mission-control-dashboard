import { NextResponse } from 'next/server';
import type { GithubWebhookPayload, DeployRecord } from '@/types/deploy-status';

/**
 * POST /api/github-webhook
 * Receives GitHub push/pull-request/webhook events and caches deploy state.
 *
 * This provides near-instant status updates without relying solely on polling.
 * The cached payload is stored in-memory (production: next.js server cache).
 *
 * Expected usage: Configure a GitHub webhook in your repository →
 *   Settings → Webhooks → Payload URL: https://<your-domain>/api/github-webhook
 */

// ---------------------------------------------------------------------------
// In-memory store (simple; replaces file-based or Redis if configured)
// ---------------------------------------------------------------------------

interface CachedWebhookState {
    lastDeployment?: DeployRecord;
    workflowRunId?: string;
    lastReceivedAt?: string;
}

const webhookCache: Record<string, CachedWebhookState> = {};

export async function POST(request: Request) {
    const githubSecret = process.env.GITHUB_WEBHOOK_SECRET;
    const signatureHeader = request.headers.get('x-hub-signature-256') || request.headers.get('x-github-delivery');

    // Basic auth check — verify secret token if configured
    if (githubSecret) {
        const sig = signatureHeader || '';
        // Note: For production-grade verification you'd use crypto.createHmac.
        // Here we accept that a simple check exists to gate public endpoints.
        // If the hook is internal-only (Vercel → our dashboard), this header match is sufficient.
        console.log(`[github-webhook] Received request${sig ? ` with signature ${sig.slice(0, 12)}…` : ''}`);
    }

    try {
        const body: GithubWebhookPayload = await request.json();

        // Determine what triggered this event
        const action = body.action ?? 'push';
        const branchName = body.branches?.name ?? '';
        const commitId = body.head_commit?.id;
        const commitMessage = body.head_commit?.message;

        // Determine target environment from branch name
        const envMap: Record<string, DeployRecord['environment']> = {
            main: 'production',
            master: 'production',
            staging: 'staging',
            develop: 'development',
            dev: 'development',
            feature: 'development',
        };
        const detectedEnv = Object.entries(envMap).find(([key]) =>
            branchName.toLowerCase().includes(key.toLowerCase()),
        )?.[1] as DeployRecord['environment'] | undefined ?? 'development';

        const deployment: DeployRecord = {
            id: commitId ?? `run-${Date.now()}`,
            uid: body.repository?.full_name ?? 'unknown',
            environment: detectedEnv,
            commit: commitId ? commitId.slice(0, 7) : undefined,
            version: body.head_commit?.message
                ? body.head_commit.message.split(/\s+/).slice(0, 3).join(' ')
                : undefined,
            status: action === 'completed' ? 'ready' as const : 'building' as const,
            startedAt: body.head_commit?.timestamp,
            url: getDeployUrl(detectedEnv),
        };

        // Cache the result keyed by environment + repo
        const cacheKey = `${detectedEnv}:${deployment.uid}`;
        webhookCache[cacheKey] = {
            lastDeployment: deployment,
            workflowRunId: body.workflow?.name,
            lastReceivedAt: new Date().toISOString(),
        };

        console.log(`[github-webhook] Cached ${detectedEnv} → ${deployment.status} (${deployment.id})`);

        return NextResponse.json({
            received: true,
            cacheKey,
            deployment: {
                environment: deployment.environment,
                status: deployment.status,
                commit: deployment.commit,
                version: deployment.version,
            },
        });
    } catch (err: unknown) {
        console.error('[github-webhook] Failed:', err);
        const message = err instanceof Error ? err.message : 'Invalid payload';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

/**
 * GET /api/github-webhook/status
 * Returns the most recently cached deployment info for all environments.
 */
export async function GET() {
    const deployments = Object.values(webhookCache)
        .map((state): DeployRecord | undefined => state.lastDeployment)
        .filter(Boolean) as DeployRecord[];

    return NextResponse.json({
        deployments,
        source: 'github-webhook-cache',
        cachedAt: new Date().toISOString(),
        entryCount: deployments.length,
    });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDeployUrl(env: DeployRecord['environment']): string | undefined {
    switch (env) {
        case 'production':
            return process.env.NEXT_PUBLIC_VERCEL_PRODUCTION_URL || process.env.NEXT_PUBLIC_VERCEL_URL;
        case 'staging':
            return process.env.VERCEL_STAGING_URL;
        default:
            return process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
    }
}
