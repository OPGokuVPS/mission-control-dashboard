"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Activity {
  id: number;
  agent_name: string;
  objective: string;
  actions: any[];
  tools_used: any[];
  result: string;
  status: string;
  created_at: string;
}

export function AgentActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    loadActivities();
    // Poll for new activities every 5 seconds
    const interval = setInterval(loadActivities, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadActivities() {
    const { data } = await supabase.from("agent_activity").select("*").order("created_at", { ascending: false }).limit(10);
    setActivities(data || []);
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800";
      case "error":
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  }

  return (
    <div className="max-h-[500px] overflow-y-auto">
      {activities.length === 0 ? (
        <div className="text-gray-500 text-center py-8">No agent activity yet.</div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="bg-gray-50 p-3 rounded border text-sm">
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-blue-600">{activity.agent_name}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(activity.status)}`}>
                  {activity.status}
                </span>
              </div>
              <div className="text-gray-700 mb-1">{activity.objective}</div>
              <div className="text-xs text-gray-500">
                Tools: {activity.tools_used?.join(", ") || "none"}
              </div>
              <div className="text-xs text-gray-400 mt-1">{new Date(activity.created_at).toLocaleTimeString()}</div>
              {activity.result && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-gray-600">Result</summary>
                  <pre className="text-xs bg-white p-2 rounded mt-1 overflow-x-auto">{JSON.stringify(activity.result, null, 2)}</pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
