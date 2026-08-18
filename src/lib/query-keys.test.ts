import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as QUERY_KEYS from './query-keys';

describe('Query Key Uniqueness', () => {
    it('task.byId produces unique keys per ID', () => {
        const key1 = QUERY_KEYS.task.byId(1);
        const key2 = QUERY_KEYS.task.byId(2);
        expect(key1).not.toEqual(key2);
        expect(Array.isArray(key1)).toBe(true);
        expect(key1[0]).toBe('task');
        expect(typeof key1[1]).toBe('number');
    });

    it('workflows.byStatus filters correctly', () => {
        const filtered = QUERY_KEYS.workflows.byStatus('active');
        expect(filtered).toEqual(['workflows', 'status:active']);

        const unfiltered = QUERY_KEYS.workflows.byStatus(null);
        expect(unfiltered).toEqual(['workflows']);

        const unfilteredUndefined = QUERY_KEYS.workflows.byStatus(undefined);
        expect(unfilteredUndefined).toEqual(['workflows']);
    });

    it('memories.byCategory falls back gracefully', () => {
        const specific = QUERY_KEYS.memories.byCategory('decision');
        expect(specific).toEqual(['memories', 'byCategory', 'decision']);

        const fallback = QUERY_KEYS.memories.byCategory(null);
        expect(fallback).toEqual(['memories', 'all']);
    });

    it('experiments.byStatus works same pattern', () => {
        expect(QUERY_KEYS.experiments.byStatus('running'))
            .toEqual(['experiments', 'byStatus', 'running']);
        expect(QUERY_KEYS.experiments.byStatus(null))
            .toEqual(['experiments', 'all']);
    });

    it('outcomes.byMetric accepts required string param', () => {
        const key = QUERY_KEYS.outcomes.byMetric('conversion_rate');
        expect(key).toEqual(['outcomes', 'conversion_rate']);
    });

    it('insights.byCategory works like memories', () => {
        expect(QUERY_KEYS.insights.byCategory('performance'))
            .toEqual(['insights', 'byCategory', 'performance']);
        expect(QUERY_KEYS.insights.byCategory(null))
            .toEqual(['insights', 'all']);
    });

    it('static keys are correct arrays', () => {
        expect(QUERY_KEYS.factoryContext).toEqual(['factory_context']);
        expect(QUERY_KEYS.alerts).toEqual(['alerts']);
        expect(QUERY_KEYS.costTracking).toEqual(['cost_tracking']);
        expect(QUERY_KEYS.memoryVault).toEqual(['memory_vault']);
    });

    it('limits work correctly', () => {
        const recentAgents = QUERY_KEYS.agentActivity.recent(10);
        expect(recentAgents).toEqual(['agent_activity', 'recent', 10]);

        const recentErrors = QUERY_KEYS.errors.recent(5);
        expect(recentErrors).toEqual(['errors', 'recent', 5]);

        const recentCosts = QUERY_KEYS.costs.recent(30);
        expect(recentCosts).toEqual(['costs', 'recent', 30]);
    });

    it('workflow.byId returns correct structure', () => {
        const key = QUERY_KEYS.workflow.byId(999);
        expect(key).toEqual(['workflow', 999]);
    });

    it('dashboard.summary is flat array', () => {
        expect(QUERY_KEYS.dashboard.summary).toEqual(['dashboard', 'summary']);
    });
});
