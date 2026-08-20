'use client';

import type { DeployRecord } from '@/types/deploy-status';

/**
 * Status emoji mapping — 🟢 deployed | 🟡 building | 🔴 failed | ⚪ unknown
 */
const STATUS_CONFIG: Record<DeployRecord['status'], { emoji: string; label: string; colorClass: string }> = {
    ready:      { emoji: '🟢', label: 'Deployed',     colorClass: 'text-green-400 bg-green-950/60 border-green-800' },
    building:   { emoji: '🟡', label: 'Building',     colorClass: 'text-yellow-400 bg-yellow-950/60 border-yellow-800' },
    error:      { emoji: '🔴', label: 'Failed',       colorClass: 'text-red-400 bg-red-950/60 border-red-800' },
    cancelled:  { emoji: '⚪', label: 'Cancelled',    colorClass: 'text-gray-400 bg-gray-950/60 border-gray-700' },
    queued:     { emoji: '⚪', label: 'Queued',       colorClass: 'text-gray-400 bg-gray-950/60 border-gray-700' },
};

export interface DeployBadgeProps {
    deployment?: DeployRecord | null;
    showEnvironment?: boolean;
    showVersion?: boolean;
    compact?: boolean;
}

export function DeployBadge({
    deployment,
    showEnvironment = true,
    showVersion = true,
    compact = false,
}: DeployBadgeProps) {
    const config = deployment ? STATUS_CONFIG[deployment.status] : STATUS_CONFIG.cancelled;
    if (!deployment) {
        return (
            <span
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${config.colorClass}`}
                title="No deployment data available"
            >
                {config.emoji} Unknown
            </span>
        );
    }

    if (compact) {
        return (
            <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${config.colorClass}`}
                title={`${config.label}${deployment.environment ? ` · ${deployment.environment}` : ''}`}
            >
                {config.emoji}
            </span>
        );
    }

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium ${config.colorClass}`}
            title={`${config.label}${deployment.url ? ` · ${deployment.url}` : ''}`}
        >
            {config.emoji}
            <span>{config.label}</span>
            {showEnvironment && deployment.environment && (
                <span className="opacity-70">·</span>
            )}
            {showEnvironment && deployment.environment && (
                <span className="opacity-70">{deployment.environment}</span>
            )}
            {showVersion && deployment.version && (
                <>
                    <span className="opacity-70">·</span>
                    <span className="opacity-70">v{deployment.version}</span>
                </>
            )}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Full status card (reusable across dashboard pages)
// ---------------------------------------------------------------------------

export function DeployStatusCard({ deployment }: { deployment?: DeployRecord | null }) {
    if (!deployment) {
        return (
            <div className="rounded-lg border border-dashed border-gray-700 p-4 text-sm text-gray-500">
                No deployment information available
            </div>
        );
    }

    const config = STATUS_CONFIG[deployment.status];

    return (
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                    <span className="text-xs uppercase tracking-wider text-gray-500">
                        {deployment.environment} deployment
                    </span>
                    <span className="text-base font-semibold text-gray-100">
                        {config.emoji} {config.label}
                    </span>
                </div>
                <DeployBadge deployment={deployment} compact />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-gray-400">
                <div>
                    <span className="text-gray-500">Commit:</span>{' '}
                    <span className="font-mono text-gray-200">
                        {deployment.commit ?? '—'}
                    </span>
                </div>
                <div>
                    <span className="text-gray-500">Version:</span>{' '}
                    <span className="font-mono text-gray-200">
                        {deployment.version ?? '—'}
                    </span>
                </div>
                {deployment.startedAt && (
                    <div>
                        <span className="text-gray-500">Started:</span>{' '}
                        <time dateTime={deployment.startedAt}>
                            {new Date(deployment.startedAt).toLocaleString()}
                        </time>
                    </div>
                )}
                {deployment.finishedAt && (
                    <div>
                        <span className="text-gray-500">Finished:</span>{' '}
                        <time dateTime={deployment.finishedAt}>
                            {new Date(deployment.finishedAt).toLocaleString()}
                        </time>
                    </div>
                )}
                {deployment.durationSeconds != null && deployment.durationSeconds > 0 && (
                    <div>
                        <span className="text-gray-500">Duration:</span>{' '}
                        <span>{formatDuration(deployment.durationSeconds)}</span>
                    </div>
                )}
                {deployment.url && (
                    <div className="col-span-2">
                        <a
                            href={deployment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline decoration-blue-700/50"
                        >
                            Open deployment ↗
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
}
