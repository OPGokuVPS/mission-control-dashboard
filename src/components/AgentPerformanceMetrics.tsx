'use client';

/**
 * Backward-compatible wrapper — re-exports the consolidated
 * AgentPerformanceMetricsPanel so existing imports via
 * `import { AgentPerformanceMetrics } from '@/components/AgentPerformanceMetrics'`
 * continue working unchanged.
 */

export { AgentPerformanceMetricsPanel as AgentPerformanceMetrics } from './AgentPerformanceMetricsPanel';
