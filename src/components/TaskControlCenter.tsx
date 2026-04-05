"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  owner: string;
  priority: string;
  deadline: string | null;
  subtasks: any[];
  created_at: string;
}

export function TaskControlCenter({ onUpdate }: { onUpdate: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState({ title: "", description: "" });

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    const { data } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    setTasks(data || []);
  }

  async function createTask() {
    if (!newTask.title.trim()) return;
    await supabase.from("tasks").insert([{ title: newTask.title, description: newTask.description }]);
    setNewTask({ title: "", description: "" });
    loadTasks();
    onUpdate();
  }

  async function updateStatus(id: number, status: string) {
    await supabase.from("tasks").update({ status }).eq("id", id);
    loadTasks();
    onUpdate();
  }

  async function deleteTask(id: number) {
    await supabase.from("tasks").delete().eq("id", id);
    loadTasks();
    onUpdate();
  }

  const statuses = ["backlog", "active", "blocked", "done"];

  return (
    <div>
      <div className="mb-4 p-4 border rounded">
        <h3 className="font-semibold mb-2">Create Task</h3>
        <div className="flex gap-2 mb-2">
          <input
            className="border p-2 flex-1"
            placeholder="Task title"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
          />
        </div>
        <textarea
          className="border p-2 w-full mb-2"
          placeholder="Description"
          value={newTask.description}
          onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={createTask}>
          Create Task
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statuses.map((status) => (
          <div key={status} className="bg-gray-50 p-4 rounded min-h-[200px]">
            <h4 className="font-semibold mb-3 capitalize">{status}</h4>
            <div className="space-y-2">
              {tasks.filter((t) => t.status === status).map((task) => (
                <div key={task.id} className="bg-white p-3 rounded shadow-sm border">
                  <div className="font-medium">{task.title}</div>
                  <div className="text-xs text-gray-500 mt-1">Owner: {task.owner}</div>
                  <div className="flex gap-2 mt-2">
                    <select
                      className="text-xs border p-1"
                      value={task.status}
                      onChange={(e) => updateStatus(task.id, e.target.value)}
                    >
                      {statuses.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button className="text-red-500 text-xs" onClick={() => deleteTask(task.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
