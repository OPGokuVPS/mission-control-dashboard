'use client';

import { useCostTracking } from '@/hooks/useCostTracking';
import { CardSkeleton, SkeletonLoader } from '@/components/SkeletonLoader';

export function CostTracking() {
    const { data: costs = [], isLoading, error } = useCostTracking();

    if (error) return <div className="text-center py-12"><p className="text-red-500">Failed to load cost data</p></div>;
    if (isLoading) return <SkeletonLoader lines={6} className="bg-white rounded-xl p-6" />;

    // Summary calculations
    const totalCost = costs.reduce((sum: number, c: any) => sum + (Number(c.total_cost_usd) || 0), 0);
    const avgCostPerTask = (() => {
        const taskCosts = costs.filter(c => c.task_id);
        return taskCosts.length ? totalCost / taskCosts.length : 0;
    })();
    
    const agentBreakdown = (() => {
        const map: Record<string, number> = {};
        costs.forEach(c => {
            const key = c.agent_name || 'Unknown';
            map[key] = (map[key] || 0) + (Number(c.total_cost_usd) || 0);
        });
        return Object.entries(map).sort(([, a], [, b]) => b - a);
    })();

    const modelBreakdown = (() => {
        const map: Record<string, number> = {};
        costs.forEach(c => {
            const key = c.model_used || 'Unknown';
            map[key] = (map[key] || 0) + (Number(c.total_cost_usd) || 0);
        });
        return Object.entries(map).sort(([, a], [, b]) => b - a);
    })();

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">💰 Cost Tracking</h2>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5">
                    <div className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">Total Spent</div>
                    <div className="text-3xl font-bold text-emerald-800 dark:text-emerald-200">${totalCost.toFixed(4)}</div>
                    <div className="text-xs text-emerald-500 mt-2">{costs.length} records tracked</div>
                </div>
                
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
                    <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">Avg per Task</div>
                    <div className="text-3xl font-bold text-blue-800 dark:text-blue-200">${avgCostPerTask.toFixed(4)}</div>
                    <div className="text-xs text-blue-500 mt-2">When task is linked</div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-5">
                    <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">Agents Active</div>
                    <div className="text-3xl font-bold text-purple-800 dark:text-purple-200">{agentBreakdown.length}</div>
                    <div className="text-xs text-purple-500 mt-2">Different agents tracked</div>
                </div>
            </div>

            {/* Agent breakdown */}
            <div className="bg-white dark:bg-slate-800 border rounded-xl p-4 sm:p-6">
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-4">💸 By Agent</h3>
                {agentBreakdown.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">No cost data recorded yet.</p>
                ) : (
                    <div className="space-y-2">
                        {agentBreakdown.map(([agent, cost]) => (
                            <div key={agent} className="flex items-center gap-3">
                                <span className="w-36 text-sm text-slate-700 dark:text-slate-300 truncate">{agent}</span>
                                <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min(100, (cost / totalCost) * 100)}%` }}
                                    />
                                </div>
                                <span className="w-20 text-right text-sm font-medium text-slate-700 dark:text-slate-300">${cost.toFixed(4)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Model breakdown */}
            <div className="bg-white dark:bg-slate-800 border rounded-xl p-4 sm:p-6">
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-4">🤖 By Model</h3>
                {modelBreakdown.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">No cost data recorded yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="text-left py-2 px-3 text-slate-600 dark:text-slate-400 font-medium">Model</th>
                                    <th className="text-right py-2 px-3 text-slate-600 dark:text-slate-400 font-medium">Cost</th>
                                    <th className="text-right py-2 px-3 text-slate-600 dark:text-slate-400 font-medium w-32">Share</th>
                                </tr>
                            </thead>
                            <tbody>
                                {modelBreakdown.map(([model, cost]) => (
                                    <tr key={model} className="border-b border-slate-100 dark:border-slate-700/50">
                                        <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300">{model}</td>
                                        <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">${cost.toFixed(4)}</td>
                                        <td className="py-2 px-3 text-right">
                                            <div className="inline-block bg-gray-200 dark:bg-slate-700 rounded-full h-2 w-24 ml-auto">
                                                <div
                                                    className="bg-emerald-500 h-full rounded-full"
                                                    style={{ width: `${Math.min(100, (cost / totalCost) * 100)}%` }}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Recent records */}
            <div className="bg-white dark:bg-slate-800 border rounded-xl p-4 sm:p-6">
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-4">📋 Recent Records</h3>
                {costs.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">No cost data recorded yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="text-left py-2 px-3 text-slate-600 dark:text-slate-400 font-medium">Agent</th>
                                    <th className="text-left py-2 px-3 text-slate-600 dark:text-slate-400 font-medium">Model</th>
                                    <th className="text-right py-2 px-3 text-slate-600 dark:text-slate-400 font-medium">Input</th>
                                    <th className="text-right py-2 px-3 text-slate-600 dark:text-slate-400 font-medium">Output</th>
                                    <th className="text-right py-2 px-3 text-slate-600 dark:text-slate-400 font-medium">Cost</th>
                                    <th className="text-right py-2 px-3 text-slate-600 dark:text-slate-400 font-medium">Time</th>
                                    <th className="text-left py-2 px-3 text-slate-600 dark:text-slate-400 font-medium">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {costs.slice(0, 20).map((c: any) => (
                                    <tr key={c.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{c.agent_name}</td>
                                        <td className="py-2 px-3 font-mono text-slate-500 dark:text-slate-400">{c.model_used}</td>
                                        <td className="py-2 px-3 text-right tabular-nums text-slate-600 dark:text-slate-400">{formatNum(c.tokens_input)}</td>
                                        <td className="py-2 px-3 text-right tabular-nums text-slate-600 dark:text-slate-400">{formatNum(c.tokens_output)}</td>
                                        <td className="py-2 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">${Number(c.total_cost_usd).toFixed(4)}</td>
                                        <td className="py-2 px-3 text-right text-slate-500 dark:text-slate-400">{c.wall_time_seconds}s</td>
                                        <td className="py-2 px-3 text-slate-500 dark:text-slate-400">{new Date(c.recorded_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function formatNum(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
}