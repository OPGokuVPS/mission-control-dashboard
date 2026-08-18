import { describe, it, expect } from 'vitest';
import {
    sanitizeCommand,
    parseCommand,
    validateEntity,
    taskCreateSchema,
    workflowStepSchema,
    experimentSchema,
} from './validators';

// ── Input Sanitization Security Tests ────────────────────────────────

describe('sanitizeCommand', () => {
    it('returns normalized input for valid commands', () => {
        const input = 'create task: build feature X';
        expect(sanitizeCommand(input)).toBe('create task: build feature X');
    });

    it('rejects SQL injection via single quote + DROP', () => {
        expect(() => sanitizeCommand("test'; DROP TABLE users--")).toThrow(
            /SQL/i,
        );
    });

    it('rejects SQL injection via UNION SELECT', () => {
        expect(() => sanitizeCommand("1 UNION SELECT * FROM passwords--")).toThrow(
            /SQL/i,
        );
    });

    it('rejects XSS <script> tags', () => {
        expect(() => sanitizeCommand('<script>alert(1)</script>')).toThrow(
            /HTML/i,
        );
    });

    it('rejects javascript: protocol URIs', () => {
        expect(() => sanitizeCommand('<a href="javascript:alert(1)">x</a>')).toThrow(
            /HTML/i,
        );
    });

    it('rejects DELETE/INSERT/TRUNCATE keywords in queries', () => {
        expect(() => sanitizeCommand('DELETE FROM tasks WHERE 1=1')).toThrow(
            /SQL/i,
        );
        expect(() => sanitizeCommand('TRUNCATE TABLE sessions')).toThrow(
            /SQL/i,
        );
    });

    it('normalizes CRLF to LF line endings', () => {
        expect(sanitizeCommand('line1\r\nline2')).toBe('line1\nline2');
    });

    it('trims whitespace from input', () => {
        expect(sanitizeCommand('   hello world   ')).toBe('hello world');
    });

    it('allows safe commands with special but non-dangerous chars', () => {
        // Parentheses, brackets, colons are fine
        expect(sanitizeCommand('create task: fix [bug #123]: refactor auth')).toBe(
            'create task: fix [bug #123]: refactor auth',
        );
    });

    it('prevents empty string after trim', () => {
        const result = sanitizeCommand('  ');
        expect(result).toBe('');
    });
});

// ── Command Parser Tests ─────────────────────────────────────────────

describe('parseCommand', () => {
    it('parses create_task with title', () => {
        const result = parseCommand('create task: deploy frontend');
        expect(result.type).toBe('create_task');
        if (result.type === 'create_task') {
            expect(result.params.title).toBe('deploy frontend');
        }
    });

    it('parses update_task_status with id and status', () => {
        const result = parseCommand('update task 42 to active');
        expect(result.type).toBe('update_task_status');
        if (result.type === 'update_task_status') {
            expect(result.params.id).toBe(42);
            expect(result.params.status).toBe('active');
        }
    });

    it('accepts list_tasks variants', () => {
        expect(parseCommand('list tasks').type).toBe('list_tasks');
        expect(parseCommand('show tasks').type).toBe('list_tasks');
        expect(parseCommand('get tasks').type).toBe('list_tasks');
    });

    it('accepts insights/analyze', () => {
        expect(parseCommand('insights').type).toBe('run_insights');
        expect(parseCommand('analyze').type).toBe('run_insights');
    });

    it('accepts help', () => {
        expect(parseCommand('help').type).toBe('help');
        expect(parseCommand('?').type).toBe('help');
    });

    it('accepts clear', () => {
        expect(parseCommand('clear').type).toBe('clear_output');
    });

    it('returns unknown for unrecognized commands', () => {
        const result = parseCommand('gibberish xyz');
        expect(result.type).toBe('unknown');
        if (result.type === 'unknown') {
            expect(result.error).toContain('Unrecognized');
        }
    });

    it('blocks SQL injection at parse level', () => {
        expect(() => parseCommand("task; DROP TABLE users")).toThrow(/SQL/i);
    });
});

// ── Zod Schema Validation Tests ──────────────────────────────────────

describe('taskCreateSchema', () => {
    it('accepts valid task payload', () => {
        const data = {
            title: 'Build login page',
            description: 'Implement OAuth flow',
            status: 'backlog',
            priority: 'high',
            assigned_agent: 'agent-alpha',
        };
        const result = validateEntity(taskCreateSchema, data);
        expect(result.valid).toBe(true);
        if (result.valid) {
            expect(result.data.title).toBe('Build login page');
        }
    });

    it('rejects empty title', () => {
        const result = validateEntity(taskCreateSchema, {
            title: '',
            status: 'backlog',
            priority: 'medium',
        });
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.errors[0]).toContain('title');
        }
    });

    it('rejects missing required fields', () => {
        const result = validateEntity(taskCreateSchema, {});
        expect(result.valid).toBe(false);
        if (!result.valid) {
            // Should report multiple field errors
            expect(result.errors.length).toBeGreaterThanOrEqual(3);
        }
    });

    it('validates enum values for status', () => {
        const result = validateEntity(taskCreateSchema, {
            title: 'test',
            status: 'invalid_status' as any,
            priority: 'medium',
        });
        expect(result.valid).toBe(false);
    });

    it('validates enum values for priority', () => {
        const result = validateEntity(taskCreateSchema, {
            title: 'test',
            status: 'backlog',
            priority: 'ultra_high' as any,
        });
        expect(result.valid).toBe(false);
    });

    it('enforces title max length of 500', () => {
        const longTitle = 'a'.repeat(501);
        const result = validateEntity(taskCreateSchema, {
            title: longTitle,
            status: 'backlog',
            priority: 'medium',
        });
        expect(result.valid).toBe(false);
    });

    it('allows optional description up to 5000 chars', () => {
        const desc = 'b'.repeat(5000);
        const result = validateEntity(taskCreateSchema, {
            title: 'test',
            status: 'backlog',
            priority: 'medium',
            description: desc,
        });
        expect(result.valid).toBe(true);
    });

    it('rejects description exceeding 5000 chars', () => {
        const desc = 'b'.repeat(5001);
        const result = validateEntity(taskCreateSchema, {
            title: 'test',
            status: 'backlog',
            priority: 'medium',
            description: desc,
        });
        expect(result.valid).toBe(false);
    });
});

describe('experimentSchema', () => {
    it('accepts valid experiment payload', () => {
        const data = {
            name: 'A/B Test: Button Color',
            hypothesis: 'Blue button increases conversion by 5%',
            metric_tracked: 'conversion_rate',
        };
        const result = validateEntity(experimentSchema, data);
        expect(result.valid).toBe(true);
    });

    it('accepts optional variant text fields', () => {
        const data = {
            name: 'Test',
            hypothesis: 'Hypothesis here',
            metric_tracked: 'CTR',
            variant_a_text: 'Original copy',
            variant_b_text: 'New copy v2',
        };
        const result = validateEntity(experimentSchema, data);
        expect(result.valid).toBe(true);
    });

    it('rejects missing required fields', () => {
        const result = validateEntity(experimentSchema, {});
        expect(result.valid).toBe(false);
    });
});

describe('workflowStepSchema', () => {
    it('accepts valid step with UUID', () => {
        const data = {
            id: '550e8400-e29b-41d4-a716-446655440000',
            title: 'Build assets',
            completed: false,
        };
        const result = validateEntity(workflowStepSchema, data);
        expect(result.valid).toBe(true);
    });

    it('rejects invalid UUID format', () => {
        const result = validateEntity(workflowStepSchema, {
            id: 'not-a-uuid',
            title: 'Step',
            completed: true,
        });
        expect(result.valid).toBe(false);
    });
});

// ── Edge Case / Regression Tests ─────────────────────────────────────

describe('Security edge cases', () => {
    it('rejects semi-colon bypass attempt', () => {
        // Try injecting SQL via semicolon-based split
        expect(() => sanitizeCommand('; INSERT INTO admin VALUES(true)')).toThrow(
            /SQL/i,
        );
    });

    it('rejects UNION SELECT bypass', () => {
        expect(() => sanitizeCommand('1 UNION SELECT * FROM users--')).toThrow(/SQL/i);
    });

    it('handles unicode characters safely', () => {
        const result = sanitizeCommand('任务管理');
        expect(typeof result).toBe('string');
    });

    it('handles very long inputs without crashing', () => {
        const longInput = 'safe '.repeat(5000);
        const result = sanitizeCommand(longInput);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });
});
