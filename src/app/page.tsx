"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { TaskControlCenter } from "@/components/TaskControlCenter";
import { MemoryVault } from "@/components/MemoryVault";
import { AgentActivityFeed } from "@/components/AgentActivityFeed";
import { WorkflowTracker } from "@/components/WorkflowTracker";
import { PerformanceInsights } from "@/components/PerformanceInsights";
import { AlertsRisksPanel } from "@/components/AlertsRisksPanel";
import { CommandInterface } from "@/components/CommandInterface";

export default function Home() {
  const [refresh, setRefresh] = useState(0);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    // Load dashboard summary stats
    async function loadSummary() {
      const [tasksRes, workflowsRes, insightsRes, alertsRes] = await Promise.all([
        supabase.from("tasks").select("*"),
        supabase.from("workflows").select("*"),
        supabase.from("insights").select("*"),
        supabase.from("alerts").select("*"),
      ]);

      setSummary({
        tasks: tasksRes.data?.length || 0,
        workflows: workflowsRes.data?.length || 0,
        insights: insightsRes.data?.length || 0,
        alerts: alertsRes.data?.filter((a: any) => a.status === "active").length,
      });
    }
    loadSummary();
  }, [refresh]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mission Control Dashboard</h1>
        <p className="text-gray-600 mt-2">Autonomous AI Software Factory — Virtual Command Center</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content area */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">📊 Task Control Center</h2>
            <TaskControlCenter onUpdate={() => setRefresh((r) => r + 1)} />
          </section>

          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">🔄 Workflow Tracker</h2>
            <WorkflowTracker />
          </section>

          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">🧠 Memory Vault</h2>
            <MemoryVault />
          </section>
        </div>

        {/* Sidebar area */}
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">📈 Performance & Insights</h2>
            <PerformanceInsights />
          </section>

          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">⚠️ Alerts & Risks</h2>
            <AlertsRisksPanel />
          </section>

          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">🤖 Agent Activity Feed</h2>
            <AgentActivityFeed />
          </section>
        </div>
      </div>

      {/* Command Interface at bottom */}
      <section className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">💬 Command Interface</h2>
        <CommandInterface onUpdate={() => setRefresh((r) => r + 1)} />
      </section>

      {/* System Summary */}
      <section className="mt-6 bg-gray-800 text-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">🧠 System Summary</h2>
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-gray-700 p-4 rounded">
              <div className="text-2xl font-bold">{summary.tasks}</div>
              <div>Tasks</div>
            </div>
            <div className="bg-gray-700 p-4 rounded">
              <div className="text-2xl font-bold">{summary.workflows}</div>
              <div>Workflows</div>
            </div>
            <div className="bg-gray-700 p-4 rounded">
              <div className="text-2xl font-bold">{summary.insights}</div>
              <div>Insights</div>
            </div>
            <div className="bg-gray-700 p-4 rounded">
              <div className="text-2xl font-bold text-red-400">{summary.alerts}</div>
              <div>Active Alerts</div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
