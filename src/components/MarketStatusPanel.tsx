'use client';

import { useMemo } from 'react';
import type { MarketDataPoint, MarketAlertThreshold } from '@/types';

interface MarketStatusPanelProps {
    data: MarketDataPoint;
}

/**
 * Color configuration for alert levels and price direction.
 */
const ALERT_STYLES: Record<MarketAlertThreshold, {
    bg: string;
    border: string;
    badge: string;
    icon: string;
}> = {
    normal: {
        bg: 'bg-white dark:bg-slate-800',
        border: 'border-slate-200 dark:border-slate-700',
        badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
        icon: '📊',
    },
    caution: {
        bg: 'bg-white dark:bg-slate-800',
        border: 'border-amber-300 dark:border-amber-700',
        badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
        icon: '⚠️',
    },
    warning: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-400 dark:border-red-600',
        badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
        icon: '🚨',
    },
};

export function MarketStatusPanel({ data }: MarketStatusPanelProps) {
    const isPositive = data.change >= 0;
    const styles = useMemo(() => ALERT_STYLES[data.alertLevel], [data.alertLevel]);
    const timeStr = new Date(data.timestamp).toLocaleString();

    return (
        <div className={`${styles.bg} border rounded-xl p-4 sm:p-5 transition-all duration-200 ${styles.border}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{styles.icon}</span>
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                        {data.name}
                    </h3>
                    <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                        {data.symbol}
                    </span>
                </div>
                {data.isDemoMode && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                        Demo Mode
                    </span>
                )}
            </div>

            {/* Price */}
            <div className="flex items-end justify-between">
                <div>
                    <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {data.currentPrice.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        Prev close: {data.previousClose.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                    </div>
                </div>

                {/* Change badge */}
                <div className="text-right">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-semibold ${
                        isPositive
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    }`}>
                        <span>{isPositive ? '▲' : '▼'}</span>
                        <span>
                            {isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%
                        </span>
                    </span>
                    <div className={`text-xs mt-1.5 font-medium ${
                        isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                        {isPositive ? '+' : ''}{data.change.toFixed(2)} pts
                    </div>
                </div>
            </div>

            {/* Alert level badge */}
            {data.alertLevel !== 'normal' && data.alertMessage && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${styles.badge}`}>
                        <span>{styles.icon}</span>
                        <span>{data.alertLevel.charAt(0).toUpperCase() + data.alertLevel.slice(1)}:</span>
                        <span className="font-normal">{data.alertMessage}</span>
                    </span>
                </div>
            )}

            {/* Timestamp */}
            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                <span>Last updated: {timeStr}</span>
                {!data.isDemoMode && (
                    <span className="flex items-center gap-1">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        Live
                    </span>
                )}
            </div>
        </div>
    );
}
