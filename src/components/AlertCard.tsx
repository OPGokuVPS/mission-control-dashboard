import type { Alert } from '@/types';

interface AlertCardProps {
    alert: Alert;
    onResolve: (id: number) => Promise<void>;
}

export function AlertCard({ alert, onResolve }: AlertCardProps) {
    const severityColors: Record<string, string> = {
        critical: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        high: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
        medium: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
        low: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    };

    const severityBadges: Record<string, string> = {
        critical: 'bg-red-500',
        high: 'bg-orange-500',
        medium: 'bg-yellow-500',
        low: 'bg-blue-500',
    };

    return (
        <div className={`rounded-lg border p-4 space-y-2 ${severityColors[alert.severity] ?? 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${severityBadges[alert.severity] ?? 'bg-slate-400'}`} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {alert.severity}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                        {alert.source}
                    </span>
                </div>
                {alert.status === 'active' && (
                    <button
                        onClick={() => onResolve(alert.id)}
                        className="text-xs px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                        Resolve
                    </button>
                )}
            </div>
            <div>
                <p className="font-medium text-sm text-slate-900 dark:text-white">{alert.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{alert.description}</p>
            </div>
            {alert.root_cause && (
                <div className="text-xs text-slate-400 dark:text-slate-500">
                    <span className="font-medium">Root cause:</span> {alert.root_cause}
                </div>
            )}
            <div className="text-xs text-slate-400 dark:text-slate-500">
                Created {new Date(alert.created_at).toLocaleString()}
            </div>
        </div>
    );
}