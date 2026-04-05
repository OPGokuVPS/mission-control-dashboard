"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export function CommandInterface({ onUpdate }: { onUpdate: () => void }) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleCommand() {
    if (!input.trim()) return;
    const command = input.trim();
    setInput("");
    setLoading(true);
    setOutput((prev) => [...prev, `> ${command}`]);

    try {
      // Parse command
      const cmd = command.toLowerCase();

      if (cmd.startsWith("create task:")) {
        const title = command.replace("create task:", "").trim();
        await supabase.from("tasks").insert([{ title, status: "backlog" }]);
        setOutput((prev) => [...prev, `✅ Created task: "${title}"`]);
      } else if (cmd.startsWith("update task")) {
        // Format: update task X to done
        const match = command.match(/update task (\d+) to (\w+)/);
        if (match) {
          const [, id, status] = match;
          await supabase.from("tasks").update({ status }).eq("id", parseInt(id));
          setOutput((prev) => [...prev, `✅ Task ${id} status → ${status}`]);
        } else {
          setOutput((prev) => [...prev, "❌ Usage: update task <id> to <status>"]);
        }
      } else if (cmd === "show tasks" || cmd === "list tasks") {
        const { data } = await supabase.from("tasks").select("*");
        const count = data?.length || 0;
        setOutput((prev) => [...prev, `📋 Total tasks: ${count}`]);
        data?.slice(0, 5).forEach((t: any) => {
          setOutput((prev) => [...prev, `  #${t.id} [${t.status}] ${t.title}`]);
        });
        if (count > 5) setOutput((prev) => [...prev, `  ...and ${count - 5} more`]);
      } else if (cmd === "show workflows") {
        const { data } = await supabase.from("workflows").select("*");
        const count = data?.length || 0;
        setOutput((prev) => [...prev, `🔄 Total workflows: ${count}`]);
        data?.forEach((w: any) => {
          setOutput((prev) => [...prev, `  ${w.name} — ${w.completion_pct}%`]);
        });
      } else if (cmd === "show insights") {
        const { data } = await supabase.from("insights").select("*");
        const count = data?.length || 0;
        setOutput((prev) => [...prev, `💡 Total insights: ${count}`]);
        data?.slice(0, 3).forEach((i: any) => {
          setOutput((prev) => [...prev, `  • ${i.title}`]);
        });
      } else if (cmd === "focus today" || cmd === "what should i focus on today") {
        // Smart suggestion
        const { data: tasks } = await supabase.from("tasks").select("*");
        const blocked = tasks?.filter((t: any) => t.status === "blocked") || [];
        const overdue = tasks?.filter((t: any) => t.deadline && new Date(t.deadline) < new Date() && t.status !== "done") || [];
        const active = tasks?.filter((t: any) => t.status === "active") || [];

        setOutput((prev) => [...prev, "🎯 Focus for today:"]);
        if (blocked.length > 0) {
          setOutput((prev) => [...prev, `  ⚠️ Unblock ${blocked.length} task(s): ${blocked.map((t: any) => t.title).join(", ")}`]);
        }
        if (overdue.length > 0) {
          setOutput((prev) => [...prev, `  ⏰ Complete ${overdue.length} overdue task(s)`]);
        }
        if (active.length > 0) {
          setOutput((prev) => [...prev, `  ▶️ Continue ${active.length} active task(s)`]);
        }
        setOutput((prev) => [...prev, "  💡 Suggest running: 'show workflows', 'show insights'"]);
      } else if (cmd === "help") {
        setOutput((prev) => [...prev, `
Available commands:
  create task: <title>           Create a new task
  update task <id> to <status>  Update task status (backlog/active/blocked/done)
  show tasks                    List recent tasks
  show workflows                Show all workflows and progress
  show insights                 Show latest insights
  focus today                   Get recommended priorities
  what is stuck                 Show blocked/overdue items
  system summary                Quick overview
        `]);
      } else if (cmd === "what is stuck" || cmd === "show blocked") {
        const { data: tasks } = await supabase.from("tasks").select("*");
        const blocked = tasks?.filter((t: any) => t.status === "blocked") || [];
        const overdue = tasks?.filter((t: any) => t.deadline && new Date(t.deadline) < new Date() && t.status !== "done") || [];
        setOutput((prev) => [...prev, `🚫 Blocked: ${blocked.length}, Overdue: ${overdue.length}`]);
        blocked.forEach((t: any) => setOutput((prev) => [...prev, `  • ${t.title} (${t.owner})`]));
        overdue.forEach((t: any) => setOutput((prev) => [...prev, `  • ${t.title} — ${t.deadline}`]));
      } else if (cmd === "system summary" || cmd === "status") {
        const [{ data: tasks }, { data: workflows }, { data: insights }, { data: alerts }] = await Promise.all([
          supabase.from("tasks").select("*", { count: "exact" }),
          supabase.from("workflows").select("*", { count: "exact" }),
          supabase.from("insights").select("*", { count: "exact" }),
          supabase.from("alerts").select("*", { count: "exact" }).eq("status", "active"),
        ]);
        setOutput((prev) => [...prev, `
📊 SYSTEM SUMMARY
  Tasks: ${tasks?.length || 0}
  Workflows: ${workflows?.length || 0}
  Insights: ${insights?.length || 0} (cached)
  Active alerts: ${alerts?.length || 0}
  Status: Operational
        `]);
      } else {
        setOutput((prev) => [...prev, `❓ Unknown command. Type "help" for available commands.`]);
      }

      onUpdate();
    } catch (error: any) {
      setOutput((prev) => [...prev, `❌ Error: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          className="border p-3 flex-1 font-mono text-sm"
          placeholder="Type command (e.g., 'create task: implement login', 'show tasks', 'focus today')"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCommand()}
        />
        <button
          className="bg-green-600 text-white px-6 py-2 rounded font-semibold"
          onClick={handleCommand}
          disabled={loading}
        >
          {loading ? "..." : "→"}
        </button>
      </div>
      <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-[300px] overflow-y-auto">
        {output.length === 0 ? (
          <div className="text-gray-500">Welcome to Mission Control. Type "help" for commands.</div>
        ) : (
          output.map((line, i) => <div key={i}>{line}</div>)
        )}
      </div>
    </div>
  );
}
