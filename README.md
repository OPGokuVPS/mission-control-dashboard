# Mission Control Dashboard

Autonomous AI Software Factory — Virtual Command Center for managing tasks, agents, workflows, memory, insights, and alerts.

## Features

- **Task Control Center**: Kanban-style task management with statuses (Backlog/Active/Blocked/Done), subtasks, priorities, and owners
- **Memory Vault**: Persistent knowledge storage with categories, linking to tasks/agents, and full-text search
- **Agent Activity Feed**: Real-time log of all autonomous agent actions, tools used, and outcomes
- **Workflow Tracker**: Multi-step process tracking with dependencies, current step, and completion percentage
- **Performance Insights**: AI-generated insights about bottlenecks, deadlines, and system efficiency
- **Alerts & Risks**: Proactive monitoring of blocked tasks, overdue items, and agent failures
- **Command Interface**: Natural language commands to control the system ("create task:", "show workflows", "focus today", etc.)

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend/Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **Icons**: Lucide React

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/OPGokuVPS/mission-control-dashboard
cd mission-control-dashboard
npm install
```

### 2. Configure environment

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Set up Supabase database

Run the included SQL schema (or use the Supabase dashboard):

```sql
-- Tables: tasks, memory_vault, agent_activity, workflows, insights, alerts
-- RLS policies: all enabled with open access (adjust for production)
```

### 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000

### 5. Deploy to Vercel

Import the repository in Vercel and set the environment variables. Vercel will auto-detect Next.js and deploy.

## Database Schema

| Table | Purpose |
|-------|---------|
| `tasks` | Task management (title, status, owner, priority, subtasks) |
| `memory_vault` | Long-term knowledge storage (decisions, learnings, context) |
| `agent_activity` | Audit log of autonomous agent actions |
| `workflows` | Multi-step process tracking with steps and completion% |
| `insights` | AI-generated performance insights and suggestions |
| `alerts` | Risk and issue tracking (blocked tasks, deadlines, failures) |

All tables have Row Level Security (RLS) enabled.

## Command Interface

Type commands in the bottom panel:

- `create task: <title>` — Create a new task
- `update task <id> to <status>` — Change task status
- `show tasks` — List recent tasks
- `show workflows` — Show all workflows and progress
- `show insights` — Display latest insights
- `focus today` — Get recommended priorities
- `what is stuck` — Show blocked/overdue items
- `system summary` — Quick overview

## Development Notes

- Built with `app/` directory structure (Next.js 15)
- Components are self-contained and use Supabase client directly
- Real-time updates via polling (can be enhanced with Supabase Realtime)
- Tailwind CSS for styling
- TypeScript for type safety

## License

MIT

---

**Part of the Autonomous AI Software Factory project.**