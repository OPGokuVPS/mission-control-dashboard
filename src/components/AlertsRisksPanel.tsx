"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Alert {
  id: number;
  title: string;
  description: string;
  severity: string;
  source: string;
  linked_task_id: number | null;
  linked_workflow_id: number | null;
  status: string;
  created_at: string;
}

export function AlertsRisksPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("active");

  useEffect(() => {
    loadAlerts();
    // Poll for new alerts every 10 seconds
    const interval = setInterval(loadAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadAlerts() {
    const query = supabase.from("alerts").select("*").order("created_at", { ascending: false });
    if (filter !== "all") {
      query.eq("status", filter);
    }
    const { data } = await query;
    setAlerts(data || []);
  }

  async function resolveAlert(id: number) {
    await supabase.from("alerts").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", id);
    loadAlerts();
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 border-red-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-blue-100 text-blue-800 border-blue-300";
    }
  };

  return (
    <div>
      <div className="mb-4">
        <div className="flex gap-2">
          {(["active", "resolved", "all"] as const).map((f) => (
            <button
              key={f}
              className={`px-3 py-1 rounded text-sm ${filter === f ? "bg-blue-600 text-white" : "bg-gray-200"}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="text-gray-500 text-center py-4">No alerts.</div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className={`border rounded p-3 ${alert.status === "resolved" ? "bg-gray-50 opacity-60" : ""}`}>
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-semibold text-sm">{alert.title}</h4>
                <span className={`px-2 py-0.5 rounded text-xs border ${getSeverityColor(alert.severity)}`}>
                  {alert.severity}
                </span>
              </div>
              <p className="text-xs text-gray-600">{alert.description}</p>
              <div className="text-xs text-gray-400 mt-1">
                Source: {alert.source} • {new Date(alert.created_at).toLocaleString()}
              </div>
              {alert.status === "active" && (
                <button
                  className="mt-2 text-xs bg-green-600 text-white px-3 py-1 rounded"
                  onClick={() => resolveAlert(alert.id)}
                >
                  Resolve
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
