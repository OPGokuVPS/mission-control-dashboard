"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Workflow {
  id: number;
  name: string;
  description: string;
  steps: any[];
  current_step: number;
  status: string;
  dependencies: any[];
  completion_pct: number;
  created_at: string;
}

export function WorkflowTracker() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({ name: "", description: "", steps: [] as string[] });

  useEffect(() => {
    loadWorkflows();
  }, []);

  async function loadWorkflows() {
    const { data } = await supabase.from("workflows").select("*").order("created_at", { ascending: false });
    setWorkflows(data || []);
  }

  async function createWorkflow() {
    if (!newWorkflow.name.trim()) return;
    await supabase.from("workflows").insert([{
      name: newWorkflow.name,
      description: newWorkflow.description,
      steps: newWorkflow.steps.map((step, i) => ({ name: step, order: i + 1 })),
      current_step: 0,
      completion_pct: 0,
      status: "active"
    }]);
    setNewWorkflow({ name: "", description: "", steps: [] });
    setShowNew(false);
    loadWorkflows();
  }

  async function updateProgress(id: number, increment: boolean) {
    const wf = workflows.find(w => w.id === id);
    if (!wf) return;
    const newStep = increment ? Math.min(wf.current_step + 1, wf.steps.length) : Math.max(wf.current_step - 1, 0);
    const pct = Math.round((newStep / wf.steps.length) * 100);
    await supabase.from("workflows").update({
      current_step: newStep,
      completion_pct: pct,
      status: newStep === wf.steps.length ? "completed" : "active"
    }).eq("id", id);
    loadWorkflows();
  }

  const stepLabels = ["Define", "Build", "Test", "Deploy", "Monitor"];

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h3 className="font-semibold">Active Workflows</h3>
        <button className="text-sm bg-green-600 text-white px-3 py-1 rounded" onClick={() => setShowNew(!showNew)}>
          {showNew ? "Cancel" : "+ New"}
        </button>
      </div>

      {showNew && (
        <div className="mb-4 p-4 border rounded">
          <div className="mb-2">
            <input
              className="border p-2 w-full mb-2"
              placeholder="Workflow name"
              value={newWorkflow.name}
              onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
            />
            <textarea
              className="border p-2 w-full mb-2"
              placeholder="Description"
              value={newWorkflow.description}
              onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
            />
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={createWorkflow}>
            Create Workflow
          </button>
        </div>
      )}

      <div className="space-y-4">
        {workflows.map((wf) => (
          <div key={wf.id} className="border rounded p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-semibold">{wf.name}</h4>
                <p className="text-sm text-gray-600">{wf.description}</p>
              </div>
              <span className="text-sm font-medium">{wf.completion_pct}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${wf.completion_pct}%` }}
              ></div>
            </div>
            <div className="flex items-center gap-2">
              {wf.steps.map((step: any, idx: number) => (
                <span key={idx} className={`text-xs ${idx < wf.current_step ? "text-green-600" : "text-gray-400"}`}>
                  {step.name}
                  {idx < wf.steps.length - 1 && " → "}
                </span>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <button className="text-sm bg-gray-200 px-2 py-1 rounded" onClick={() => updateProgress(wf.id, false)}>← Back</button>
              <button className="text-sm bg-blue-600 text-white px-2 py-1 rounded" onClick={() => updateProgress(wf.id, true)}>Next →</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
