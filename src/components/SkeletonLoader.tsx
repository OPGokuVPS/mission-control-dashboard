import { ReactNode } from 'react';

export function SkeletonLoader({ lines = 4, className = '' }: { lines?: number; className?: string }) {
    return (
        <div className={`animate-pulse space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className="h-4 bg-gray-200 rounded"
                    style={{ width: `${85 - i * 8}%` }}
                />
            ))}
        </div>
    );
}

export function CardSkeleton({ className = '' }: { className?: string }) {
    return (
        <div className={`bg-white border rounded-lg p-4 ${className}`}>
            <div className="h-5 bg-gray-200 rounded w-1/2 mb-3 animate-pulse" />
            <SkeletonLoader lines={3} />
        </div>
    );
}

export function PanelSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
            ))}
        </div>
    );
}
