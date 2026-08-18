'use client';

interface CardProps {
    className?: string;
}

export function CardSkeleton({ className = '' }: CardProps) {
    return (
        <div className={`animate-pulse border border-slate-200 dark:border-slate-700 rounded-xl p-4 ${className}`}>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3" />
            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-2/3 mb-2" />
            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
        </div>
    );
}

export function SkeletonLoader({ lines = 3, className = '' }: { lines?: number; className?: string }) {
    return (
        <div className={`space-y-3 animate-pulse ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-2">
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                </div>
            ))}
        </div>
    );
}