import { vi } from 'vitest';

// Mock Supabase globally via Vite alias injection
const mockDb = {
    tasks: [] as any[],
    workflows: [] as any[],
    experiments: [] as any[],
    outcomes: [] as any[],
    insights: [] as any[],
    memory_vault: [] as any[],
    alerts: [] as any[],
    agent_activity: [] as any[],
    errors_table: [] as any[],
    costs: [] as any[],
    settings: [{ key: 'factory_context', value: {} }] as any[],
};

let nextId = 1;

function makeId() {
    return nextId++;
}

class QueryBuilder {
    private table: string;
    private fields = '*';
    private filters: Array<{ field: string; value: unknown }> = [];
    private orders: Array<{ field: string; ascending: boolean }> = [];
    private mutationType: 'insert' | 'update' | 'delete' | null = null;
    private mutationData?: any;
    private _onFinally?: () => void;

    constructor(table: string) {
        this.table = table;
        if (!(table in mockDb)) (mockDb as any)[table] = [];
    }

    private getTable() {
        return (mockDb as any)[this.table] || [];
    }

    select(fields = '*'): this {
        this.fields = fields;
        return this;
    }

    eq(field: string, value: unknown): this {
        this.filters.push({ field, value });
        return this;
    }

    order(field: string, opts?: { ascending?: boolean }): this {
        this.orders.push({
            field,
            ascending: opts?.ascending !== false,
        });
        return this;
    }

    async applyFilters(data: any[]) {
        let filtered = [...data];
        for (const f of this.filters) {
            filtered = filtered.filter(
                (item: any) => item[f.field] === f.value,
            );
        }
        for (const o of this.orders) {
            filtered.sort((a: any, b: any) => {
                const va = a[o.field];
                const vb = b[o.field];
                return o.ascending ? (va > vb ? 1 : -1) : va < vb ? 1 : -1;
            });
        }
        return filtered;
    }

    async single(): Promise<{ data: any; error: any }> {
        const data = await this.execute();
        return data.length === 0
            ? { data: null, error: { message: 'Not found' } }
            : { data: data[0], error: null };
    }

    async maybeSingle(): Promise<{ data: any; error: any }> {
        return this.single();
    }

    insert(data: any): this {
        this.mutationType = 'insert';
        this.mutationData = Array.isArray(data) ? data : [data];
        return this;
    }

    update(data: any): this {
        this.mutationType = 'update';
        this.mutationData = data;
        return this;
    }

    delete(): this {
        this.mutationType = 'delete';
        return this;
    }

    finally(fn: () => void): this {
        this._onFinally = fn;
        return this;
    }

    private async execute(): Promise<any[]> {
        switch (this.mutationType) {
            case 'insert': {
                const inserted = this.mutationData!.map((item: any) => ({
                    ...item,
                    id: item.id ?? makeId(),
                    created_at:
                        item.created_at ?? new Date().toISOString(),
                }));
                (mockDb as any)[this.table].push(...inserted);
                if (this._onFinally) this._onFinally();
                return inserted;
            }
            case 'update': {
                const items = await this.applyFilters(this.getTable());
                for (const item of items) {
                    Object.assign(item, this.mutationData!);
                }
                return this.getTable();
            }
            case 'delete': {
                const ids = new Set(
                    (await this.applyFilters(this.getTable())).map(
                        (d: any) => d.id,
                    ),
                );
                (mockDb as any)[this.table] = (mockDb as any)[
                    this.table
                ].filter((item: any) => !ids.has(item.id));
                if (this._onFinally) this._onFinally();
                return [];
            }
            default:
                return this.applyFilters(this.getTable());
        }
    }

    then(onFulfilled: any, onRejected?: any): any {
        return this.execute().then(onFulfilled, onRejected);
    }
}

export const supabase = {
    from(table: string) {
        if (!(table in mockDb)) (mockDb as any)[table] = [];
        return new QueryBuilder(table);
    },
    auth: {
        getSession: async () => ({
            data: { session: null },
            error: null,
        }),
        onAuthStateChange: () => ({
            unsubscribe: () => {},
        }),
        signOut: async () => ({ data: null, error: null }),
        signInWithPassword: async () => ({
            data: {
                user: {
                    id: 'test-user',
                    email: 'test@example.com',
                },
            },
            error: null,
        }),
        signUp: async () => ({
            data: {
                user: {
                    id: 'test-user',
                    email: 'test@example.com',
                },
            },
            error: null,
        }),
    },
    _reset() {
        for (const k of Object.keys(mockDb)) {
            if (k === 'settings') {
                (mockDb as any)[k] = [
                    { key: 'factory_context', value: {} },
                ];
            } else {
                (mockDb as any)[k] = [];
            }
        }
        nextId = 1;
    },
    _get<T>(table: string): T[] {
        return (mockDb as any)[table] || [];
    },
    _set(table: string, data: any[]) {
        (mockDb as any)[table] = data;
    },
};
