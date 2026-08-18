import { describe, it, expect } from 'vitest';
import { sanitizeCommand, parseCommand } from './validators';

describe('sanitizeCommand', () => {
    it('returns valid for normal commands', () => {
        expect(sanitizeCommand('create task: build feature')).toBe('create task: build feature');
    });

    it('throws on SQL injection', () => {
        expect(() => sanitizeCommand("test'; DROP TABLE users--")).toThrow('dangerous SQL pattern');
    });

    it('throws on XSS', () => {
        expect(() => sanitizeCommand('<script>alert(1)</script>')).toThrow('dangerous HTML pattern');
    });

    it('normalizes line endings', () => {
        expect(sanitizeCommand('a\r\nb')).toBe('a\nb');
    });
});

describe('parseCommand', () => {
    it('parses create_task', () => {
        const result = parseCommand('create task: deploy frontend');
        expect(result).toEqual({ type: 'create_task', params: { title: 'deploy frontend' } });
    });

    it('parses update_task_status', () => {
        const result = parseCommand('update task 42 to active');
        expect(result).toEqual({ type: 'update_task_status', params: { id: 42, status: 'active' } });
    });

    it('parses list_tasks', () => {
        expect(parseCommand('list tasks')).toEqual({ type: 'list_tasks' });
    });

    it('parses clear', () => {
        expect(parseCommand('clear')).toEqual({ type: 'clear_output' });
    });

    it('parses help', () => {
        expect(parseCommand('help')).toEqual({ type: 'help' });
        expect(parseCommand('?')).toEqual({ type: 'help' });
    });

    it('rejects invalid commands', () => {
        const result = parseCommand('gibberish xyz');
        expect(result.type).toBe('unknown');
        if (result.type === 'unknown') expect(result.error).toContain('Unrecognized');
    });
});