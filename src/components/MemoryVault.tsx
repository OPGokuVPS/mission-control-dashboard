"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Memory {
  id: number;
  title: string;
  content: string;
  category: string;
  linked_task_id: number | null;
  linked_agent: string;
  created_at: string;
}

export function MemoryVault() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [newMemory, setNewMemory] = useState({ title: "", content: "", category: "general" });
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    loadMemories();
  }, []);

  async function loadMemories() {
    const { data } = await supabase.from("memory_vault").select("*").order("created_at", { ascending: false });
    setMemories(data || []);
  }

  async function createMemory() {
    if (!newMemory.title.trim() || !newMemory.content.trim()) return;
    await supabase.from("memory_vault").insert([newMemory]);
    setNewMemory({ title: "", content: "", category: "general" });
    loadMemories();
  }

  async function deleteMemory(id: number) {
    await supabase.from("memory_vault").delete().eq("id", id);
    loadMemories();
  }

  const categories = ["all", ...new Set(memories.map((m) => m.category))];
  const filtered = filter === "all" ? memories : memories.filter((m) => m.category === filter);

  return (
    <div>
      <div className="mb-4 flex gap-2 items-center">
        <select className="border p-2" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat === "all" ? "All Categories" : cat}</option>
          ))}
        </select>
      </div>

      <div className="mb-4 p-4 border rounded">
        <h3 className="font-semibold mb-2">Save New Memory</h3>
        <div className="flex gap-2 mb-2">
          <input
            className="border p-2 flex-1"
            placeholder="Title"
            value={newMemory.title}
            onChange={(e) => setNewMemory({ ...newMemory, title: e.target.value })}
          />
          <select
            className="border p-2"
            value={newMemory.category}
            onChange={(e) => setNewMemory({ ...newMemory, category: e.target.value })}
          >
            <option value="general">General</option>
            <option value="decision">Decision</option>
            <option value="lesson">Lesson Learned</option>
            <option value="context">Context</option>
          </select>
        </div>
        <textarea
          className="border p-2 w-full mb-2"
          placeholder="Content"
          value={newMemory.content}
          onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={createMemory}>
          Save Memory
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map((memory) => (
          <div key={memory.id} className="bg-gray-50 p-4 rounded border">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold">{memory.title}</h4>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{memory.category}</span>
                {memory.linked_agent && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded ml-2">Agent: {memory.linked_agent}</span>}
              </div>
              <button className="text-red-500 hover:text-red-700" onClick={() => deleteMemory(memory.id)}>Delete</button>
            </div>
            <p className="mt-2 text-gray-700">{memory.content}</p>
            <div className="text-xs text-gray-400 mt-2">{new Date(memory.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
