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
const STANDALONE_SQL_PATTERNS = /\b(?:DROP\s+TABLE|DELETE\s+(?:FROM|WHERE)|INSERT\s+INTO|UPDATE\s+\w+\s+SET|TRUNCATE\s+TABLE|ALTER\s+TABLE|CREATE\s+TABLE|EXEC\s*\(|UNION\s+SELECT)\b/i;
const XSS_PATTERN = /<script[^>]*>|javascript\s*:/i;

export function sanitizeCommand(input: string): string {
    let sanitized = input.replace(/\r\n/g, '\n');
    if (SQL_INJECTION_PATTERNS.test(sanitized)) {
        throw new Error('Potentially dangerous SQL pattern detected');
    }
    if (STANDALONE_SQL_PATTERNS.test(sanitized)) {
        throw new Error('Potentially dangerous SQL pattern detected');
    }
    if (XSS_PATTERN.test(sanitized)) {
        throw new Error('Potentially dangerous HTML pattern detected');
    }
    return sanitized.trim();
}

// ---------- Expanded Command Types ----------

export type ParsedCommand =
    | { type: 'create_task'; params: { title?: string; description?: string; priority?: string; agent?: string } }
    | { type: 'update_task_status'; params: { id?: number; status?: string } }
    | { type: 'list_tasks' }
    | { type: 'list_workflows' }
    | { type: 'deploy_to'; params: { target?: 'staging' | 'production' } }
    | { type: 'check_database' }
    | { type: 'clear_output' }
    | { type: 'run_insights' }
    | { type: 'show_context' }
    | { type: 'help' }
    | { type: 'unknown'; error: string };

// ---------- Natural Language Parser ----------

/**
 * Enhanced parser supporting natural-language commands beyond basic regex patterns.
 * Handles phrases like "Create new task: test this feature", "Show me all active workflows", etc.
 */
export function parseCommand(rawInput: string): ParsedCommand {
    const input = sanitizeCommand(rawInput);
    const lower = input.toLowerCase().trim();

    // --- help ---
    if (/^(help|\?|\[?[hH]elp\]?)$/.test(lower)) {
        return { type: 'help' };
    }

    // --- clear ---
    if (/^clear$/i.test(lower)) {
        return { type: 'clear_output' };
    }

    // --- create task (several NL variations) ---
    if (/^(create|add|new|make)\s+task(\s*:)?\s*/i.test(input)) {
        const match = input.match(/^(?:create|add|new|make)\s+task\s*:\s*(.+)$/i)
            ?? input.match(/^(?:create|add|new|make)\s+a?\s*task\s+(.+)$/i)
            ?? input.match(/^task:\s*(.+)$/i);
        if (match && match[1].trim()) {
            return { type: 'create_task', params: { title: match[1].trim() } };
        }
        return { type: 'unknown', error: 'What should the task be about? Use "create task: <title>".' };
    }

    // --- update task status ---
    if (/^update\s+task/i.test(input)) {
        const match = input.match(/^update\s+task\s+(\d+)\s+to\s+(\w+)/i);
        if (match) {
            return { type: 'update_task_status', params: { id: Number(match[1]), status: match[2] } };
        }
        // More flexible: "set task #5 to done" / "change task 3 status to blocked"
        const altMatch = input.match(/(?:task|#)\s*(\d+)\s+(?:to|as|with|status)\s+(\w+)/i);
        if (altMatch) {
            return { type: 'update_task_status', params: { id: Number(altMatch[1]), status: altMatch[2] } };
        }
        return { type: 'unknown', error: 'Invalid format. Use "update task <id> to <status>" or "set task #<id> to <status>".' };
    }

    // --- list tasks / show tasks / get tasks ---
    if (/^(list|show|get|view|fetch|display|read)\s+(all\s+)?tasks?/i.test(input)) {
        return { type: 'list_tasks' };
    }

    // --- list workflows / show workflows / what are we working on ---
    if (/^(list|show|get|view|fetch|display|read|what.*working|give.*me)\s+(all\s+)?workflows?/i.test(input)) {
        return { type: 'list_workflows' };
    }
    if (/^(list|show)\s+(all\s+)?active\s+(workflows?)/i.test(input)) {
        return { type: 'list_workflows' };
    }

    // --- deploy ---
    if (/^(deploy|ship|release|push)\s+to\s+(staging|production|prod)/i.test(input)) {
        const target = lower.includes('prod') ? 'production' : 'staging';
        return { type: 'deploy_to', params: { target: target as 'staging' | 'production' } };
    }
    if (/^deploy$/i.test(lower)) {
        return { type: 'deploy_to', params: { target: 'staging' } };
    }
    if (/^(deploy|ship)\s+production/i.test(input)) {
        return { type: 'deploy_to', params: { target: 'production' } };
    }

    // --- check database / health check ---
    if (/^(check|health|status)\s*(of|the)?\s*database/i.test(input)) {
        return { type: 'check_database' };
    }
    if (/^(db|database)\s+(status|health|ping)/i.test(input)) {
        return { type: 'check_database' };
    }

    // --- insights / analyze ---
    if (/^(insights|analyze|analysis|report)/i.test(lower)) {
        return { type: 'run_insights' };
    }

    // --- show context ---
    if (/^show\s+context/i.test(input)) {
        return { type: 'show_context' };
    }

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
