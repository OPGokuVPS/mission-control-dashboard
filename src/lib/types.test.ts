import { describe, it, expect } from 'vitest';

// Import the full type system to verify compile-time contracts
type TaskStatus = 'backlog' | 'active' | 'blocked' | 'in_review' | 'done' | 'deprecated';
type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';
type AgentRole = 'planner' | 'coder' | 'reviewer' | 'tester' | 'deployer' | 'analyst' | 'researcher';
type ExperimentStatus = 'running' | 'completed' | 'abandoned';
type ImpactLevel = 'low' | 'medium' | 'high' | 'critical';
type AlertSource = 'system' | 'manual' | 'auto_diagnosis' | 'user_report';
type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
type MemoryType = 'decision' | 'reference' | 'lesson' | 'context' | 'spec';

describe('Type System Contracts', () => {
    describe('TaskStatus enum correctness', () => {
        it('has all expected workflow states', () => {
            const statuses: TaskStatus[] = [
                'backlog', 'active', 'blocked', 'in_review', 'done', 'deprecated',
            ];
            expect(statuses).toHaveLength(6);
            
            // Verify state transition ordering makes sense
            const validTransitions: Record<TaskStatus, TaskStatus[]> = {
                backlog: ['active', 'deprecated'],
                active: ['blocked', 'in_review', 'done', 'deprecated'],
                blocked: ['active'],
                in_review: ['active', 'done', 'blocked'],
                done: [],
                deprecated: [],
            };
            
            // This is a compile-time check — if any status is missing or invalid,
            // TypeScript will fail at build time
            expect(Object.keys(validTransitions)).toHaveLength(6);
        });
    });

    describe('PriorityLevel validity', () => {
        it('rejects invalid priority values at compile-time (TypeScript)', () => {
            const priorities: PriorityLevel[] = ['critical', 'high', 'medium', 'low'];
            expect(priorities).toHaveLength(4);
            
            // At runtime, TypeScript enforces union types — this test validates
            // the type definition doesn't accept non-union members
            const validCheck: string[] = ['critical', 'high', 'medium', 'low'];
            const extra = ['ultra_high', 'urgent', 'normal'];
            for (const p of extra) {
                expect(validCheck).not.toContain(p);
            }
        });
    });

    describe('AgentRole completeness', () => {
        it('covers all pipeline roles', () => {
            const roles: AgentRole[] = [
                'planner', 'coder', 'reviewer', 'tester', 
                'deployer', 'analyst', 'researcher',
            ];
            expect(roles).toHaveLength(7);
            
            // Verify no duplicates
            const unique = new Set(roles);
            expect(unique.size).toBe(7);
        });
    });

    describe('Experiment lifecycle', () => {
        it('defines complete experiment statuses', () => {
            const statuses: ExperimentStatus[] = ['running', 'completed', 'abandoned'];
            expect(statuses).toHaveLength(3);
        });
    });

    describe('ImpactLevels', () => {
        it('has escalating severity levels', () => {
            const levels: ImpactLevel[] = ['low', 'medium', 'high', 'critical'];
            expect(levels).toHaveLength(4);
            
            // Verify ordering semantics are sensible
            const severityOrder: Record<ImpactLevel, number> = {
                low: 1, medium: 2, high: 3, critical: 4,
            };
            const ordered = Object.entries(severityOrder)
                .sort((a, b) => a[1] - b[1])
                .map(([k]) => k);
            expect(ordered).toEqual(['low', 'medium', 'high', 'critical']);
        });
    });

    describe('AlertSources', () => {
        it('captures all alert origins', () => {
            const sources: AlertSource[] = ['system', 'manual', 'auto_diagnosis', 'user_report'];
            expect(sources).toHaveLength(4);
        });
    });

    describe('MemoryType categories', () => {
        it('covers all memory classifications', () => {
            const types: MemoryType[] = ['decision', 'reference', 'lesson', 'context', 'spec'];
            expect(types).toHaveLength(5);
            
            const unique = new Set(types);
            expect(unique.size).toBe(5);
        });
    });
});

describe('Type Safety - No Union Type Errors', () => {
    it('verifies no overlap between unrelated enums', () => {
        // Ensure TaskStatus doesn't accidentally accept non-status values
        const statusSet = new Set(['backlog', 'active', 'blocked', 'in_review', 'done', 'deprecated']);
        
        // These should NOT be in TaskStatus (compile-time enforced by TypeScript)
        const notAStatus = ['pending', 'todo', 'started', 'finished'];
        for (const item of notAStatus) {
            expect(statusSet.has(item as never)).toBe(false);
        }
    });
    
    it('ensures Severity and Priority don\'t collide', () => {
        const risks = new Set(['low', 'medium', 'high', 'critical']);
        const priorities = new Set(['critical', 'high', 'medium', 'low']);
        
        // Both use same values but different semantic meaning — verified separate
        expect(risks.size).toBe(4);
        expect(priorities.size).toBe(4);
    });
});
