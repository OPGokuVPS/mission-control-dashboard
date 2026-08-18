/**
 * Command parsing and validation utilities for the Mission Control CLI.
 * Uses Zod schemas for strict input validation.
 */
import { z } from 'zod';

// ---------- Entity Schemas ----------

export const taskCreateSchema = z.object({
    title: z.string().min(1).max(500),
    description: z.string().max(5000).optional(),
    status: z.enum(['backlog', 'active', 'blocked', 'in_review', 'done', 'deprecated']),
    priority: z.enum(['critical', 'high', 'medium', 'low']),
    assigned_agent: z.string().max(100).optional(),
});

export const workflowStepSchema = z.object({
    id: z.string().uuid(),
    title: z.string().min(1).max(200),
    completed: z.boolean(),
});

export const experimentSchema = z.object({
    name: z.string().min(1).max(200),
    hypothesis: z.string().min(1).max(5000),
    metric_tracked: z.string().min(1).max(200),
    variant_a_text: z.string().max(1000).optional(),
    variant_b_text: z.string().max(1000).optional(),
});

// ---------- Input Sanitization ----------

const SQL_INJECTION_PATTERNS = /['"]\s*(?:DROP|DELETE|INSERT|SELECT|UPDATE|TRUNCATE|ALTER|CREATE|EXEC|UNION)\b|--/i;
const XSS_PATTERN = /<script[^>]*>|javascript\s*:/i;

export function sanitizeCommand(input: string): string {
    let sanitized = input.replace(/\r\n/g, '\n');
    if (SQL_INJECTION_PATTERNS.test(sanitized)) {
        throw new Error('Potentially dangerous SQL pattern detected');
    }
    if (XSS_PATTERN.test(sanitized)) {
        throw new Error('Potentially dangerous HTML pattern detected');
    }
    return sanitized.trim();
}

// ---------- Command Parser ----------

const COMMAND_REGEX = /^(create\s+task:\s*(.+?)|update\s+task\s+(\d+)\s+to\s+(\w+)|list\s+tasks|clear|insights|analyze|help|\?|show\s+context)(\s+.*)?$/i;

export type ParsedCommand =
    | { type: 'create_task'; params: { title?: string } }
    | { type: 'update_task_status'; params: { id?: number; status?: string } }
    | { type: 'list_tasks' }
    | { type: 'clear_output' }
    | { type: 'run_insights' }
    | { type: 'show_context' }
    | { type: 'help' }
    | { type: 'unknown'; error: string };

export function parseCommand(rawInput: string): ParsedCommand {
    const input = sanitizeCommand(rawInput);

    if (/^(create\s+task)/i.test(input)) {
        const match = input.match(/^create\s+task:\s*(.+)$/i);
        return match ? { type: 'create_task', params: { title: match[1].trim() || undefined } } : { type: 'unknown', error: 'Invalid create task format. Use "create task: <title>"' };
    }

    if (/^update\s+task/i.test(input)) {
        const match = input.match(/^update\s+task\s+(\d+)\s+to\s+(\w+)/i);
        return match ? { type: 'update_task_status', params: { id: Number(match[1]), status: match[2] } } : { type: 'unknown', error: 'Invalid update format. Use "update task <id> to <status>"' };
    }

    if (/^(list\s+tasks|show\s+tasks|get\s+tasks)/i.test(input)) return { type: 'list_tasks' };
    if (/^clear$/i.test(input)) return { type: 'clear_output' };
    if (/^(insights|analyze)/i.test(input)) return { type: 'run_insights' };
    if (/^show\s+context/i.test(input)) return { type: 'show_context' };
    if (/^(help|\?$)/i.test(input)) return { type: 'help' };

    return { type: 'unknown', error: `Unrecognized command: "${input}". Type "help" for options.` };
}

// ---------- Validator Helpers ----------

export function validateEntity<T extends z.ZodTypeAny>(schema: T, data: unknown): { valid: true; data: z.infer<T> } | { valid: false; errors: string[] } {
    try {
        const result = schema.parse(data);
        return { valid: true, data: result };
    } catch (err) {
        if (err instanceof z.ZodError) {
            return { valid: false, errors: err.errors.map(e => `${e.path.join('.')} ${e.message}`) };
        }
        return { valid: false, errors: [(err as Error).message] };
    }
}