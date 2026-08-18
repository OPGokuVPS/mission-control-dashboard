# 🚀 Mission Control — Autonomous AI Software Factory

A production-grade dashboard for managing an autonomous AI software factory with multi-agent coordination, real-time monitoring, and KPI-driven orchestration.

## 📦 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js 15 App Layer                    │
│  Auth Middleware ─→ QueryClient ─→ ErrorBoundary               │
├─────────────────────────────────────────────────────────────────┤
│                     React Components (14 panels)                 │
│  Strategy | Tasks | Workflows | Agents | Impact | Alerts         │
│  Memory | Experiments | Cost | Command Interface                │
├─────────────────────────────────────────────────────────────────┤
│                   TanStack Query Hooks (14 hooks)                │
│  useTasks | useWorkflows | useAgentActivity | useMemories        │
│  useInsights | useAlerts | useExperiments | useOutcomes          │
│  useCostTracking | useErrors | useDashboardSummary               │
│  useFactoryContext | useSyncMetrics                              │
├─────────────────────────────────────────────────────────────────┤
│                  Supabase Postgres (12 tables)                   │
│  tasks, workflows, agent_activity, memory_vault, insights         │
│  alerts, experiments, outcomes, cost_tracking, errors            │
│  settings, dashboard_metrics                                     │
└─────────────────────────────────────────────────────────────────┘
```

## 🏗️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + Dark Mode
- **Database**: Supabase (PostgreSQL) with RLS policies
- **Data Fetching**: TanStack Query v5 with SyncStoragePersister
- **Validation**: Zod schemas for all entities
- **Testing**: Vitest (unit tests for validators & CLI commands)
- **Deployment**: Vercel (standalone output mode)

## 🧩 Core Features

### 1. Authentication & Security
- Supabase Auth integration with session persistence
- Protected routes via Next.js middleware
- Row-Level Security (RLS) on all database tables
- SQL injection and XSS sanitization
- Input validation with Zod schemas

### 2. Multi-Agent Orchestration
- 9 specialized agent roles with auto-routing based on context
- Real-time activity feed tracking agent tool usage
- Self-correction loop with version tracking
- Context-aware objective setting

### 3. Task Management (Kanban)
- Full CRUD operations with priority levels
- Status flow: backlog → active → blocked/in_review → done/deprecated
- Assign agents to tasks based on expertise
- Subtask management and deadline tracking

### 4. Workflow Tracking
- Multi-step process automation
- Dependency graph between steps
- Automatic correction logging
- Version-based rollback capability

### 5. Business Intelligence
- KPI-aligned factory configuration per industry
- Performance insights with impact scoring
- Outcome measurement linking features to revenue
- A/B experiment tracking with statistical significance

### 6. Cost Tracking & Optimization
- Compute cost attribution per agent and model
- API cost tracking with token-level granularity
- Budget alerts when thresholds exceeded
- Infrastructure minimization recommendations

### 7. Experimentation Platform
- Hypothesis-driven testing framework
- Variant comparison with sample size tracking
- Statistical decision making (p-value threshold)
- Rollout recommendation engine

### 8. Knowledge Repository (Memory Vault)
- Pattern-based knowledge storage with deduplication
- Linked to tasks and agents for traceability
- Search and filter by category
- Automatic categorization (approach/failure/architecture/kpi)

### 9. Risk & Alert Management
- Severity-filtered alert system
- Distinction between technical failures and compliance violations
- Automated escalation rules
- Resolution tracking and audit trail

### 10. Command Interface
- Natural language parsing of commands
- Auto-suggest for entity names from database
- Session history with error recovery
- Help system with available command listing

## ⚡ Installation & Setup

```bash
# 1. Clone the repository
git clone https://github.com/OPGokuVPS/mission-control-dashboard.git
cd mission-control-dashboard

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials:
# NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# 4. Run database migrations
supabase db reset --db-url="postgresql://..."
# Or run SQL manually in Supabase Dashboard:
#   supabase/migrations/001_initial_schema.sql
#   supabase/migrations/002_errors_table.sql

# 5. Start development server
npm run dev
# Opens at http://localhost:3000

# 6. Run tests
npm test
# Runs all unit tests via Vitest

# 7. Build for production
npm run build
# Generates standalone output in out/

# 8. Deploy to Vercel
vercel deploy --prod
```

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key from Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Service role key for admin operations |
| `NODE_ENV` | Yes* | `development` or `production` (*set automatically) |

## 📊 Database Schema

The factory uses a single Postgres database with 12 tables organized as:

- **Core Entities**: `tasks`, `workflows`, `agent_activity` — main orchestration layer
- **Knowledge**: `memory_vault`, `insights` — pattern learning and analysis
- **Monitoring**: `alerts`, `errors` — risk detection and issue tracking
- **Experimentation**: `experiments`, `outcomes` — A/B testing and impact measurement
- **Infrastructure**: `cost_tracking`, `dashboard_metrics`, `settings` — resource optimization

All tables have RLS policies ensuring users can only access their own data unless using service role keys.

## 🎯 Agent Roles

| Role | Icon | Responsibility |
|------|------|----------------|
| Strategy | 🎯 | Objective setting, roadmap planning, prioritization |
| System Architect | 🏗️ | System design, technology selection, architecture |
| Backend Engineer | ⚙️ | API development, data modeling, business logic |
| Frontend Engineer | 🎨 | UI components, responsive design, animations |
| Integration Engineer | 🔌 | Third-party services, webhooks, API integrations |
| QA | ✅ | Testing strategies, automated tests, bug hunting |
| DevOps | 🚀 | CI/CD, deployment, infrastructure scaling |
| Security | 🔒 | Vulnerability scanning, compliance, encryption |
| Data | 📊 | Analytics dashboards, data pipelines, ML models |
| Growth | 📈 | User acquisition, conversion optimization, SEO |
| Support | 🛟 | Customer support automation, monitoring, feedback loops |

## 🧪 Testing

Unit tests cover validator logic, command parsing, and edge cases:

```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm test src/lib     # Run specific file
```

Current coverage: ~65% (validators, command parser, edge case handling)

## 📝 API Reference

### Health Check
`GET /api/health` — Returns 200 with uptime and memory usage.

### Authentication Callback
`GET /auth/callback` — Handles OAuth redirects from Supabase Auth.

### Login API
`POST /api/auth/login` — Email/password authentication via Supabase.

## 🔗 Integrations

- **Supabase** — PostgreSQL database, authentication, real-time subscriptions
- **Vercel** — Deployment platform, CDN, serverless functions
- **GitHub** — Source control, CI/CD pipeline, webhook triggers
- **OpenAI** — LLM-powered agent reasoning (configurable model)

## 🚧 Roadmap

- [ ] WebSocket real-time sync (replace polling)
- [ ] Drag-and-drop kanban reordering
- [ ] Agent-to-agent messaging channel
- [ ] Custom agent skill registry
- [ ] Export analytics to CSV/PDF
- [ ] Multi-workspace/team support
- [ ] Mobile app (React Native)

## 📄 License

Proprietary — All rights reserved © OPGokuVPS 2024

---
*Mission Control v2.0 — Where AI agents build software autonomously.*