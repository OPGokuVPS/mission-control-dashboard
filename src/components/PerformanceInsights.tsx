"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Insight {
  id: number;
  title: string;
  description: string;
  category: string;
  impact: string;
  suggestions: any[];
  created_at: string;
}

export function PerformanceInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);

  useEffect(() => {
    loadInsights();
    // Auto-generate insights every 30 seconds
    const interval = setInterval(generateInsights, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadInsights() {
    const { data } = await supabase.from("insights").select("*").order("created_at", { ascending: false }).limit(5);
    setInsights(data || []);
  }

  async function generateInsights() {
    const { data: tasks } = await supabase.from("tasks").select("*");
    const { data: workflows } = await supabase.from("workflows").select("*");
    const { data: alerts } = await supabase.from("alerts").select("*").eq("status", "active");

    const blockedTasks = tasks?.filter((t: any) => t.status === "blocked") || [];
    const overdueTasks = tasks?.filter((t: any) => t.deadline && new Date(t.deadline) < new Date() && t.status !== "done") || [];
    const slowWorkflows = workflows?.filter((w: any) => w.completion_pct < 25 && w.status === "active") || [];

    const newInsights: { title: string; description: string; category: string; impact: string; suggestions: string[] }[] = [];

    if (blockedTasks.length > 0) {
      newInsights.push({
        title: `${blockedTasks.length} task(s) are blocked`,
        description: "Blocked tasks require immediate attention to unblock progress.",
        category: "bottleneck",
        impact: "high",
        suggestions: [
          "Review task dependencies and assign owners",
          "Remove blockers or re-assign to available agents",
          "Consider splitting into smaller subtasks"
        ]
      });
    }

    if (overdueTasks.length > 0) {
      newInsights.push({
        title: `${overdueTasks.length} overdue task(s)`,
        description: "Deadlines have passed without completion.",
        category: "deadline",
        impact: "medium",
        suggestions: [
          "Prioritize overdue tasks in next sprint",
          "Re-negotiate deadlines with stakeholders",
          "Assign additional resources if needed"
        ]
      });
    }

    if (slowWorkflows.length > 0) {
      newInsights.push({
        title: `${slowWorkflows.length} workflow(s) underperforming`,
        description: "Workflows are progressing slowly (<25% completion).",
        category: "performance",
        impact: "medium",
        suggestions: [
          "Review step complexity; break down steps",
          "Check for resource constraints or dependencies",
          "Accelerate by parallelizing independent steps"
        ]
      });
    }

    if (alerts.length > 0) {
      newInsights.push({
        title: `${alerts.length} active alerts`,
        description: "System has unaddressed alerts that may affect operations.",
        category: "risk",
        impact: "high",
        suggestions: [
          "Review alert details and root causes",
          "Assign owners to resolve within 24h",
          "Update system to prevent recurrence"
        ]
      });
    }

    // Insert new insights
    for (const insight of newInsights) {
      await supabase.from("insights").insert([insight]);
    }

    loadInsights();
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <div className="max-h-[400px] overflow-y-auto">
      {insights.length === 0 ? (
        <div className="text-gray-500 text-center py-4">No insights yet. System will generate automatically as data accumulates.</div>
      ) : (
        <div className="space-y-3">
          {insights.slice(0, 5).map((insight) => (
            <div key={insight.id} className="bg-gray-50 p-3 rounded border">
              <div className="flex justify-between items-start">
                <h4 className="font-semibold text-sm">{insight.title}</h4>
                <span className={`px-2 py-0.5 rounded text-xs ${getImpactColor(insight.impact)}`}>
                  {insight.impact}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">{insight.description}</p>
              {insight.suggestions?.length > 0 && (
                <ul className="mt-2 text-xs text-gray-700 list-disc list-inside">
                  {insight.suggestions.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
