# WORKFORCE PULSE — COMPLETE TECHNICAL IMPLEMENTATION DOCUMENTATION

> **Internal Engineering Planning Doc | Sprint Execution Handbook**  
> Stack: Next.js 15 · TypeScript · Tailwind · shadcn/ui · Zustand · ECharts · Framer Motion · Vercel AI SDK  
> Target: 3-hour build sprint | Production deployment on Vercel

---

## 1. EXECUTIVE IMPLEMENTATION OVERVIEW

### Overall Architecture

Workforce Pulse runs as a **single Next.js 15 App Router application** — no separate backend, no database, no orchestration layer. Everything lives in one repo, deploys to one Vercel project, and communicates over internal API routes.

```
Browser (React Client)
    │
    ├── Zustand filter store (department, task, week)
    ├── ECharts (canvas-rendered, memoized)
    ├── Framer Motion (KPI counter animation only)
    └── Vercel AI SDK useChat() hook
         │
         ▼
Next.js 15 App Router (Node.js edge/serverless)
    │
    ├── /api/analytics  → Runs ETL once, caches in module scope, returns AnalyticsResult
    ├── /api/chat       → Streams Ollama Cloud responses, injects grounded context
    └── /api/export     → Returns pre-rendered HTML for pdf generation
         │
         ▼
External: Ollama Cloud API (AI assistant only)
Static:   /public/data/activity_logs.csv + employees.json (bundled at build time)
```

**Execution philosophy:** Run ETL server-side, once, cache the result. Send the clean `AnalyticsResult` object to the client. The client never sees raw CSV. The AI assistant never sees raw CSV — it sees a serialized analytics context built from the clean dataset.

### Why This Architecture Is Optimized For Speed

| Decision | Justification |
|---|---|
| No database | 539 rows fit in Node.js memory in ~2ms. SQLite/Postgres adds 30 min of setup for zero gain. |
| Static data files in `/public` | No upload UX needed. One less surface area. |
| Module-level ETL cache | Zero recompute cost after first request. Serverless cold start ~200ms. |
| Vercel AI SDK `streamText` | Handles streaming, error boundaries, retry — saves 1.5 hrs vs raw fetch. |
| ECharts over Recharts | Canvas rendering, better defaults, less custom CSS, more chart types. |
| Zustand over Context | Three lines to define global filter state. No provider hell. |

### What NOT to Overengineer

- ❌ No RAG pipeline — inject structured context directly into system prompt
- ❌ No Redis/KV caching — module-level singleton is enough
- ❌ No authentication layer
- ❌ No React Query for analytics — single fetch on load, Zustand for derived state
- ❌ No Prisma/Drizzle — no database whatsoever
- ❌ No LangChain — direct Vercel AI SDK, full prompt control
- ❌ No Storybook, testing framework, CI pipeline — this is a sprint

### Mandatory Features (Never Cut)

1. ETL pipeline with full audit trail and data quality report
2. Two headline KPI numbers with methodology drawers
3. Automation Priority Score table with formula exposed
4. AI assistant: grounded, multi-turn, filter-aware, streaming
5. Cross-filters: department → all charts; task → employee table
6. PDF export from live filter state
7. Anomaly callout (E010 post-termination + 999-min HR entries)
8. Live Vercel deployment, mobile usable

### Features to Cut First (if behind schedule)

1. Framer Motion counter animations → replace with static numbers
2. Employee expanded profile drawer → keep the table, drop the panel
3. Dark mode toggle → ship dark-only
4. Week-over-week trend chart → text summary of weekly shift instead
5. Weight-adjustment sliders on APS → hardcode weights, document in README

### Maximizing Evaluation Score Quickly

The rubric is: Data (25%) → Product Judgment (20%) → AI (20%) → Design (15%) → Shipping (10%) → Methodology (10%).

**Sequence:** Fix data first, methodology second, AI third, UI last. A beautiful dashboard with broken joins scores below a plain dashboard with correct numbers and visible methodology. The methodology drawer on each KPI is worth more points per hour than any chart.

---

## 2. COMPLETE FILE/FOLDER STRUCTURE

```
workforce-pulse/
├── public/
│   └── data/
│       ├── activity_logs.csv          # Raw input — never modified
│       └── employees.json             # Raw input — never modified
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout, font setup, dark theme
│   │   ├── page.tsx                   # Dashboard page (server component shell)
│   │   ├── globals.css                # Design tokens as CSS vars
│   │   │
│   │   └── api/
│   │       ├── analytics/
│   │       │   └── route.ts           # GET → runs ETL, returns AnalyticsResult JSON
│   │       ├── chat/
│   │       │   └── route.ts           # POST → streamText with grounded context
│   │       └── export/
│   │           └── route.ts           # GET → returns export payload for client-side PDF
│   │
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── AnomalyBanner.tsx      # Top-level anomaly callout strip
│   │   │   ├── KPICard.tsx            # Headline number + methodology drawer trigger
│   │   │   ├── MethodologyDrawer.tsx  # Sheet component with formula breakdown
│   │   │   ├── AutomationTable.tsx    # Ranked APS table with confidence badges
│   │   │   ├── TimeSinkChart.tsx      # ECharts horizontal bar, tab-switchable
│   │   │   ├── TrendChart.tsx         # ECharts line chart, week-over-week
│   │   │   ├── EmployeeTable.tsx      # TanStack Table with drill-down
│   │   │   ├── DataQualityReport.tsx  # Numbers panel: rows dropped/fixed/flagged
│   │   │   ├── FilterBar.tsx          # Department + task cross-filter controls
│   │   │   └── ExportButton.tsx       # Triggers html2canvas + jsPDF
│   │   │
│   │   ├── chat/
│   │   │   ├── ChatPanel.tsx          # Full chat UI wrapper
│   │   │   ├── ChatMessage.tsx        # Renders assistant markdown with citation styling
│   │   │   └── ChatInput.tsx          # Input bar with send + streaming indicator
│   │   │
│   │   └── ui/                        # shadcn/ui primitives (Sheet, Badge, Tooltip, etc.)
│   │
│   ├── lib/
│   │   ├── etl/
│   │   │   ├── parseEmployees.ts      # employees.json → canonical Employee[]
│   │   │   ├── parseActivityLogs.ts   # CSV string → RawRow[] with audit fields
│   │   │   ├── canonicalize.ts        # APP_MAP, TASK_MAP, bool normalizer
│   │   │   ├── joinDatasets.ts        # Employee map lookup, anomaly detection
│   │   │   ├── computeMetrics.ts      # APS, RWS, ECS, headline KPIs, dept/week rollups
│   │   │   ├── auditTrail.ts          # DataQualityReport builder
│   │   │   └── index.ts              # runETL() → AnalyticsResult (cached singleton)
│   │   │
│   │   ├── ai/
│   │   │   ├── buildContext.ts        # Serialize AnalyticsResult → grounding string
│   │   │   └── systemPrompt.ts        # Full system prompt template with injection points
│   │   │
│   │   ├── export/
│   │   │   └── generatePDF.ts         # html2canvas capture + jsPDF assembly
│   │   │
│   │   ├── types.ts                   # All shared TypeScript interfaces
│   │   ├── constants.ts               # Weights, coefficients, thresholds
│   │   └── utils.ts                   # formatINR, formatHours, cn()
│   │
│   ├── store/
│   │   ├── filterStore.ts             # Zustand: { department, taskCategory, week }
│   │   └── analyticsStore.ts          # Zustand: { analytics, loading, error }
│   │
│   └── hooks/
│       ├── useFilteredAnalytics.ts    # Derives filtered view from store + raw analytics
│       └── useExport.ts              # Export trigger hook
│
├── .env.local                         # OLLAMA_API_KEY, OLLAMA_BASE_URL
├── .env.example                       # Template committed to repo
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── README.md                          # Methodology document (max 2 pages)
```

**Folder rationale:**

| Folder | Exists because |
|---|---|
| `lib/etl/` | ETL must be isolated, testable, stateless — no React imports allowed here |
| `lib/ai/` | Prompt logic changes independently of API route code |
| `store/` | Global state lives outside components; no prop drilling |
| `hooks/` | Derived computations (filtered analytics) belong in hooks, not components |
| `components/dashboard/` | Dashboard widgets are view-only; all data flows in via props |
| `components/ui/` | shadcn primitives stay separate from business logic components |
| `public/data/` | Static files bundled at build; no runtime fetch from external storage |

**What stays stateless:** Everything in `lib/etl/` and `lib/ai/` must be pure functions. No side effects, no React state, no browser APIs. This makes them runnable in Node.js API routes without modification.

**What stays isolated:** The AI prompt builder (`lib/ai/`) must never import from React or component files. The ETL (`lib/etl/`) must never import from the AI layer. Dependency direction: `components → hooks → store → lib`.

---

## 3. STRICT 4-PHASE IMPLEMENTATION PLAN

---

### PHASE 1 — DATA FOUNDATION
**Time estimate: 55 minutes**

#### Objective
Produce a 100% correct, fully audited `AnalyticsResult` object from raw files. This object is the single source of truth for every number in the app, the AI assistant, and the PDF export. Nothing else in the project can start until this is correct.

#### Deliverables
- `lib/etl/` fully implemented (6 files)
- `/api/analytics` route returning correct JSON
- `types.ts` finalized with all interfaces
- Console log of data quality report passing manual spot checks

#### Engineering Tasks

1. **Define canonical types** (`lib/types.ts`)
   - `Employee`, `ActivityRow`, `CleanRow`, `AuditEntry`
   - `TaskMetrics`, `DeptMetrics`, `WeekMetrics`, `EmployeeMetrics`
   - `AnalyticsResult`, `DataQualityReport`, `Filters`

2. **Build canonicalization maps** (`lib/etl/canonicalize.ts`)
   - `APP_CANONICAL` map (30+ entries covering all casing/spelling variants)
   - `TASK_CANONICAL` map (25+ canonical task names)
   - `normalizeBoolean(raw)` → `true | false | null`
   - `validateDuration(raw)` → `{ value: number | null, flag: string }`
   - `parseTimestamp(raw)` → `{ parsed: Date | null, week: string, flag: string }`

3. **Parse employees.json** (`lib/etl/parseEmployees.ts`)
   - Detect schema version (V1: `EmployeeID`/`salary_LPA`, V2: `employee_id`/`annual_ctc_inr`, V2-nested: `meta.compensation`)
   - Unify compensation to `annual_ctc_inr` + `hourly_cost_inr` (÷ 2376 working hrs/year)
   - Resolve E007 duplicate: prefer V2 record (₹24L, Senior AE), log conflict
   - Handle E009/E010 nested `meta` structure
   - Track: E099 (no activity), E013 (missing metadata), E010 (terminated 2025-10-22)
   - Return: `Map<string, Employee>` + audit entries

4. **Parse activity_logs.csv** (`lib/etl/parseActivityLogs.ts`)
   - Use `papaparse` in Node environment
   - For each row: parse timestamp (5 format attempts), canonicalize app, canonicalize task, validate duration, normalize boolean
   - Assign `week_label`: W1=Oct 6–12, W2=Oct 13–19, W3=Oct 20–26, W4=Oct 21+ (confirm from data)
   - Append `_audit` object to every row
   - Separate `clean_rows[]` from `dropped_rows[]`

5. **Join datasets** (`lib/etl/joinDatasets.ts`)
   - For each clean row, look up `employee_id` in employee map
   - `?` IDs: include for time analysis, exclude from INR calculations
   - E013: include for time, exclude from INR (no compensation)
   - E010: include rows where `timestamp < 2025-10-22`, **flag** rows on/after as `post_termination_anomaly`
   - Attach `hourly_cost_inr` from employee to each joined row

6. **Compute metrics** (`lib/etl/computeMetrics.ts`)
   - Per-task: `total_minutes`, `repetitive_minutes`, `rep_rate`, `employee_count`, `ECS`, `inr_impact`, `APS`
   - APS formula: `(0.25 × norm_volume + 0.30 × norm_rep_rate + 0.25 × norm_ECS + 0.20 × norm_inr) → 0–100`
   - Per-employee: `RWS`, `top_tasks`, `total_minutes`, `inr_cost`
   - Per-department: aggregated rollups
   - Per-week: `rep_share`, `top_category`, category breakdown
   - Headline: `recoverable_hours_month`, `recoverable_inr_month` (both with ±CI)

7. **Build data quality report** (`lib/etl/auditTrail.ts`)
   - Counts: rows_total, rows_clean, rows_dropped (by reason), rows_flagged
   - Employee issues: missing_metadata (E013), no_activity (E099), duplicate_resolved (E007), post_termination (E010)

8. **Wire ETL entry point** (`lib/etl/index.ts`)
   - `let cache: AnalyticsResult | null = null`
   - `export async function getAnalytics(): Promise<AnalyticsResult>`
   - If cache exists, return. Otherwise run full pipeline and cache.

9. **Build `/api/analytics` route**
   - `GET` → calls `getAnalytics()` → returns `JSON.stringify(result)`
   - 5 minute `Cache-Control` header

#### Files to Create (Phase 1)
```
src/lib/types.ts
src/lib/constants.ts
src/lib/utils.ts
src/lib/etl/canonicalize.ts
src/lib/etl/parseEmployees.ts
src/lib/etl/parseActivityLogs.ts
src/lib/etl/joinDatasets.ts
src/lib/etl/computeMetrics.ts
src/lib/etl/auditTrail.ts
src/lib/etl/index.ts
src/app/api/analytics/route.ts
```

#### Success Criteria
- `curl /api/analytics` returns JSON without error
- `data_quality_report.rows_dropped` matches expected (~3–5 outliers + negatives)
- E007 appears once with `₹24L` compensation
- E013 appears in time metrics but not INR metrics
- E010 has `post_termination_anomaly: true` on affected rows
- `recoverable_hours_month` is in range 250–450
- All 15 canonical task categories present in output

#### Risks
- **papaparse in Node**: install `papaparse` + `@types/papaparse`. If edge runtime issues, force `runtime = 'nodejs'` on the route.
- **Timestamp edge cases**: the DD/MM/YYYY format must be parsed before ISO or it will misparse day/month.

#### Shortcuts if Behind Schedule
- Hardcode the canonicalization maps as JSON literals instead of code (paste from this doc)
- Skip per-employee INR cost computation — compute only at task and department level
- Skip the `_audit` field on every row — just count dropped rows by type

---

### PHASE 2 — API LAYER + AI INTEGRATION
**Time estimate: 40 minutes**

#### Objective
Build the two remaining API routes (`/api/chat`, `/api/export`) and implement the AI assistant's grounding architecture. By end of phase, the AI assistant must correctly answer "What is our top automation priority?" without hallucinating a single number.

#### Deliverables
- `/api/chat` streaming with Ollama Cloud via Vercel AI SDK
- Grounded system prompt builder that serializes `AnalyticsResult` per active filters
- Multi-turn conversation preserved client-side
- `/api/export` returning export payload

#### Engineering Tasks

1. **Install dependencies**
   ```bash
   npm install ai @ai-sdk/openai-compatible papaparse date-fns zustand \
     echarts echarts-for-react framer-motion html2canvas jspdf \
     @tanstack/react-table zod
   ```

2. **Build grounding context builder** (`lib/ai/buildContext.ts`)
   - Accept `AnalyticsResult` + `Filters`
   - Apply filters to produce a filtered view
   - Serialize to structured text block (not JSON — LLMs parse plain text better for reasoning)
   - Include: date range, row counts, headline KPIs, top 10 tasks by APS, dept breakdown, employee summary, week trends
   - **Critical:** include explicit exclusions ("E013 excluded from INR — no compensation data")

3. **Build system prompt** (`lib/ai/systemPrompt.ts`)
   ```typescript
   export function buildSystemPrompt(context: string, filters: Filters): string {
     return `You are the analytics engine for Workforce Pulse...
   
   ACTIVE FILTERS: ${JSON.stringify(filters)}
   
   ${context}
   
   HARD RULES:
   1. Never cite a number not in the data block above.
   2. Every quantitative answer must include: source metric name, row count, date range.
   3. Format INR as ₹X.XL/month or ₹X,XX,XXX.
   4. If asked something outside the data, say exactly: "I don't have data to answer that."
   5. Multi-turn: remember the conversation history sent with each request.`;
   }
   ```

4. **Build `/api/chat` route** (`app/api/chat/route.ts`)
   ```typescript
   import { streamText } from 'ai';
   import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
   
   const ollama = createOpenAICompatible({
     name: 'ollama',
     baseURL: process.env.OLLAMA_BASE_URL!,
     headers: { Authorization: `Bearer ${process.env.OLLAMA_API_KEY}` },
   });
   
   export async function POST(req: Request) {
     const { messages, filters } = await req.json();
     const analytics = await getAnalytics();
     const context = buildContext(analytics, filters);
     const system = buildSystemPrompt(context, filters);
   
     const result = await streamText({
       model: ollama('llama3.1:8b'), // or whichever Ollama Cloud model
       system,
       messages,
       maxTokens: 800,
     });
   
     return result.toDataStreamResponse();
   }
   ```

5. **Build `/api/export` route**
   - `GET ?filters=...`
   - Returns: `{ headlines, topTasks, dateRange, generatedAt }` as JSON
   - Client uses this to populate the export canvas

6. **Define Zustand stores** (`store/filterStore.ts`, `store/analyticsStore.ts`)
   ```typescript
   // filterStore.ts
   interface FilterState {
     department: string | null;
     taskCategory: string | null;
     week: string | null;
     setDepartment: (d: string | null) => void;
     setTaskCategory: (t: string | null) => void;
     setWeek: (w: string | null) => void;
     clearAll: () => void;
   }
   
   // analyticsStore.ts
   interface AnalyticsState {
     data: AnalyticsResult | null;
     loading: boolean;
     error: string | null;
     fetch: () => Promise<void>;
   }
   ```

7. **Build `useFilteredAnalytics` hook**
   - Reads from `analyticsStore` + `filterStore`
   - Returns derived `FilteredAnalytics` — memoized with `useMemo`
   - Dependency array: `[analytics, department, taskCategory, week]`

#### Files to Create (Phase 2)
```
src/lib/ai/buildContext.ts
src/lib/ai/systemPrompt.ts
src/app/api/chat/route.ts
src/app/api/export/route.ts
src/store/filterStore.ts
src/store/analyticsStore.ts
src/hooks/useFilteredAnalytics.ts
src/hooks/useExport.ts
.env.local
.env.example
```

#### Success Criteria
- Streaming chat response visible in terminal via `curl -N /api/chat`
- AI correctly answers "top automation priority" with exact APS score from data
- AI refuses to answer "what will next month look like?" with "I don't have data to answer that"
- Filter change → `useFilteredAnalytics` returns different task breakdown

#### Risks
- **Ollama Cloud API format**: verify base URL and auth header format against their docs. The `@ai-sdk/openai-compatible` package works if Ollama Cloud exposes an OpenAI-compatible endpoint.
- **Context length**: if the full analytics context exceeds model context window, truncate employee list to top 10 by minutes logged.

#### Shortcuts if Behind Schedule
- Skip `useFilteredAnalytics` hook; do filtering inline inside each component
- Skip `/api/export` route; build export payload client-side from Zustand store

---

### PHASE 3 — DASHBOARD UI
**Time estimate: 60 minutes**

#### Objective
Build the complete dashboard. Every component connects to real data. Cross-filters work end-to-end. Methodology drawers open with correct formulas. The UI must look like a product someone would pay for, not a Tailwind tutorial.

#### Deliverables
- Full dashboard layout rendering with live data
- KPI cards with methodology drawers
- Automation priority table with APS scores
- TimeSink chart (ECharts, tab-switchable)
- Employee table with cross-filter response
- Anomaly banner
- Data quality report panel
- Responsive (works at 375px width)

#### Engineering Tasks

1. **Establish design tokens** (`globals.css`)
   ```css
   :root {
     --bg-primary: #141416;
     --bg-surface: #1C1C1F;
     --bg-elevated: #242428;
     --border: rgba(255,255,255,0.08);
     --text-primary: #F4F4F5;
     --text-secondary: #A1A1AA;
     --text-muted: #52525B;
     --accent: #F59E0B;        /* amber — automation opportunities */
     --accent-soft: rgba(245,158,11,0.12);
     --danger: #EF4444;
     --success: #22C55E;
     --radius: 12px;
   }
   ```

2. **Build root layout** (`app/layout.tsx`)
   - Inter Variable font via `next/font`
   - Dark background, no body padding
   - Analytics fetch triggered in `AnalyticsProvider` (client component wrapping layout)

3. **Build `AnomalyBanner`**
   - Amber left-border strip, ⚠ icon
   - E010 post-termination message + 999-min HR entries message
   - Dismissible (local state)

4. **Build `KPICard`**
   - Props: `label`, `value`, `subtitle`, `methodology: MethodologyContent`
   - Framer Motion number counter on mount (0 → value over 800ms) — OR static if short on time
   - `[?]` button → opens `MethodologyDrawer`

5. **Build `MethodologyDrawer`**
   - shadcn `Sheet` component, right side
   - Sections: Formula, Inputs, Assumptions, Confidence Interval
   - Hardcode content per KPI (2 drawers total: hours, INR)

6. **Build `AutomationTable`**
   - Columns: Rank, Task Category, APS Score (progress bar), Rep Rate, Volume (hrs), Employees, INR Impact/mo, Confidence badge
   - Sort by APS descending, top 10 rows
   - Row click → sets `filterStore.taskCategory`
   - Confidence badge: green=high, yellow=medium, gray=low (based on row count + compensation coverage)

7. **Build `TimeSinkChart`**
   - Three tabs: By Task | By App | By Department
   - ECharts horizontal bar, sorted by total minutes descending
   - Bar click → sets filter (task or dept depending on active tab)
   - Show repetitive vs non-repetitive as stacked bar segments (amber + muted gray)
   - Active filter highlighted, others dimmed

8. **Build `TrendChart`**
   - ECharts line chart: X = week labels, Y = repetitive share %
   - One line per top-5 task category
   - Legend clickable to toggle lines

9. **Build `EmployeeTable`**
   - TanStack Table
   - Columns: Employee ID, Department, Role, Total Hrs, Rep Share (%), Top Task, INR Cost/mo
   - Sortable columns
   - Filters from `filterStore` applied via `columnFilters`
   - Row click → expand inline detail (top 3 tasks with minutes)

10. **Build `FilterBar`**
    - Department chips: all departments + "All" — single select
    - Active chip: amber outline
    - "Clear filters" link appears when any filter is active
    - Also shows active task filter if set (with ✕ to clear)

11. **Build `DataQualityReport`**
    - Collapsible panel (closed by default)
    - Shows: rows_total, rows_clean, rows_dropped (each reason), rows_flagged
    - Shows: employees with no metadata, metadata with no activity, duplicate resolved, post-termination rows

12. **Wire dashboard page** (`app/page.tsx`)
    - Server component shell that passes initial data
    - Or: Client component that fetches from `/api/analytics` on mount

#### Layout Grid (CSS Grid, 12-column)
```
Header bar: full width
Anomaly banner: full width (conditional)
KPI row: 3 equal cards
Automation table: 7 cols | Trend chart: 5 cols
TimeSink chart: 6 cols | Employee table: 6 cols
Data quality report: full width (collapsed)
Chat panel: fixed bottom-right FAB → expands to side panel
```

#### Files to Create (Phase 3)
```
src/app/layout.tsx
src/app/page.tsx
src/app/globals.css
src/components/dashboard/AnomalyBanner.tsx
src/components/dashboard/KPICard.tsx
src/components/dashboard/MethodologyDrawer.tsx
src/components/dashboard/AutomationTable.tsx
src/components/dashboard/TimeSinkChart.tsx
src/components/dashboard/TrendChart.tsx
src/components/dashboard/EmployeeTable.tsx
src/components/dashboard/FilterBar.tsx
src/components/dashboard/DataQualityReport.tsx
src/components/dashboard/ExportButton.tsx
```

#### Success Criteria
- Dashboard renders with real data on first load
- Clicking "Finance" department chip filters all 3 charts and employee table simultaneously
- Clicking a task bar in TimeSinkChart sets task filter visible in FilterBar
- "Clear filters" resets all filters
- Methodology drawer opens for both KPI cards
- Zero console errors
- Renders at 375px width without horizontal overflow

#### Risks
- **ECharts SSR**: wrap all ECharts components in `dynamic(() => import(...), { ssr: false })`
- **TanStack Table v8**: use `getCoreRowModel`, `getSortedRowModel`, `getFilteredRowModel` — don't overthink it

#### Shortcuts if Behind Schedule
- Drop `TrendChart` — mention in README
- Replace `EmployeeTable` drill-down with a plain HTML table
- Remove Framer Motion — use CSS transitions only
- Combine TimeSink tabs into one chart showing task categories only

---

### PHASE 4 — AI CHAT + EXPORT + POLISH + DEPLOY
**Time estimate: 25 minutes**

#### Objective
Wire the AI chat panel, build the PDF export, handle edge cases, deploy to Vercel, smoke test on mobile. Ship.

#### Deliverables
- AI chat panel fully functional with streaming
- PDF export downloading from live filter state
- Mobile layout passing 375px test
- Vercel deployment live with correct env vars
- README committed

#### Engineering Tasks

1. **Build `ChatPanel`** (`components/chat/ChatPanel.tsx`)
   - Fixed FAB button bottom-right: chat bubble icon
   - Click → expand to side panel (CSS transition, 400px wide)
   - Uses Vercel AI SDK `useChat({ api: '/api/chat', body: { filters } })`
   - `body` must include current filter state (re-read from Zustand on each send)

2. **Build `ChatMessage`**
   - User message: right-aligned, amber background
   - Assistant message: left-aligned, surface card
   - Render markdown via `react-markdown`
   - Numbers styled with `font-variant-numeric: tabular-nums`

3. **Build `ChatInput`**
   - Textarea (auto-resize), send button
   - Disabled + spinner during streaming
   - 3 starter prompts as clickable chips (pre-populated questions)

4. **Build `generatePDF`** (`lib/export/generatePDF.ts`)
   ```typescript
   export async function generatePDF(filters: Filters, analytics: AnalyticsResult) {
     // 1. Create an off-screen div with export layout
     // 2. Populate with: headline KPIs, top-5 APS tasks, date range, "Generated by Workforce Pulse"
     // 3. html2canvas capture → PNG
     // 4. jsPDF: A4 landscape, embed PNG
     // 5. jsPDF.save('workforce-pulse-export.pdf')
   }
   ```
   - Do NOT capture the full dashboard DOM — create a dedicated export-layout div
   - Style it with inline CSS (html2canvas struggles with Tailwind utility classes)

5. **Mobile responsiveness pass**
   - Stack KPI cards vertically on `< 768px`
   - AutomationTable: hide INR column, show only top 3 rows
   - Chat panel: full-screen overlay on mobile instead of side panel
   - FilterBar: horizontal scroll instead of wrap

6. **Environment variables**
   ```env
   OLLAMA_API_KEY=your_key_here
   OLLAMA_BASE_URL=https://your-ollama-cloud-endpoint
   ```

7. **Vercel deployment**
   ```bash
   npm run build   # must pass with zero errors
   vercel --prod
   # Add env vars in Vercel dashboard: Settings → Environment Variables
   ```

8. **Smoke test checklist (mobile incognito)**
   - [ ] Dashboard loads in < 3s
   - [ ] KPI numbers visible above fold
   - [ ] Department filter works
   - [ ] Chat sends and streams a response
   - [ ] Export downloads a PDF with real numbers
   - [ ] Zero console errors
   - [ ] No horizontal scroll on 375px

9. **Commit README**

#### Files to Create (Phase 4)
```
src/components/chat/ChatPanel.tsx
src/components/chat/ChatMessage.tsx
src/components/chat/ChatInput.tsx
src/lib/export/generatePDF.ts
README.md
vercel.json (if custom headers needed)
```

#### Success Criteria
- Live URL returns 200 in incognito
- Chat correctly answers at least 2 test questions with real numbers
- PDF download contains correct headline numbers (matches dashboard)
- Mobile: all 6 required features accessible

#### Shortcuts if Behind Schedule
- PDF: use `window.print()` with a print stylesheet instead of html2canvas (20 min saved)
- Chat: remove streaming, use regular `fetch` POST instead of `useChat`

---

## 4. PHASE-WISE FILE CREATION ORDER

### Phase 1 — Why Order Matters

```
1. src/lib/types.ts
   WHY FIRST: Every other file imports from this. Define all interfaces before writing any logic.

2. src/lib/constants.ts
   WHY: Compensation formula constants (2376 hrs/year), APS weights, duration thresholds.
        Referenced by canonicalize.ts and computeMetrics.ts.

3. src/lib/etl/canonicalize.ts
   WHY: parseActivityLogs.ts calls these functions. Must exist first.

4. src/lib/etl/parseEmployees.ts
   WHY: joinDatasets.ts needs the employee Map. No dependency on activity logs.

5. src/lib/etl/parseActivityLogs.ts
   WHY: Depends on canonicalize.ts. Returns RawRow[] independently of employee data.

6. src/lib/etl/joinDatasets.ts
   WHY: Needs both parseEmployees output AND parseActivityLogs output.

7. src/lib/etl/computeMetrics.ts
   WHY: Needs joined dataset to compute APS, RWS, headline numbers.

8. src/lib/etl/auditTrail.ts
   WHY: Needs dropped_rows[] and join anomalies from previous steps.

9. src/lib/etl/index.ts
   WHY: Orchestrates all above. The singleton cache lives here.

10. src/lib/utils.ts
    WHY: formatINR(), formatHours() needed by API route response shaping.

11. src/app/api/analytics/route.ts
    WHY LAST IN PHASE: Depends on lib/etl/index.ts. Test with curl before moving on.
```

### Phase 2 — Why Order Matters

```
1. src/store/filterStore.ts
   WHY FIRST: buildContext.ts imports the Filters type. Define the shape now.

2. src/store/analyticsStore.ts
   WHY: Needed by hooks. Define before hooks.

3. src/lib/ai/buildContext.ts
   WHY: Needs AnalyticsResult type (from Phase 1 types.ts). Independent of route.

4. src/lib/ai/systemPrompt.ts
   WHY: Depends on buildContext output shape.

5. src/app/api/chat/route.ts
   WHY: Depends on buildContext + systemPrompt. Test with curl before building UI.

6. src/app/api/export/route.ts
   WHY: Independent of chat. Simple data serialization.

7. src/hooks/useFilteredAnalytics.ts
   WHY: Depends on both stores being defined. Used by Phase 3 components.

8. src/hooks/useExport.ts
   WHY: Depends on analyticsStore + filterStore.
```

### Phase 3 — Why Order Matters

```
1. src/app/globals.css
   WHY FIRST: CSS vars used by every component. Define tokens before building components.

2. src/app/layout.tsx
   WHY: Root layout must exist for any page to render.

3. src/components/dashboard/FilterBar.tsx
   WHY: All other dashboard components read from filterStore.
        Build the write side (FilterBar) before the read side (charts).

4. src/components/dashboard/KPICard.tsx + MethodologyDrawer.tsx
   WHY: Highest-value components first. If you run out of time, KPIs must be done.

5. src/components/dashboard/AnomalyBanner.tsx
   WHY: Simple component, high signal value for judges. Build while KPI logic is fresh.

6. src/components/dashboard/AutomationTable.tsx
   WHY: Second highest-value component after KPIs.

7. src/components/dashboard/TimeSinkChart.tsx
   WHY: Needs ECharts setup done. Tab switching logic is medium complexity.

8. src/components/dashboard/EmployeeTable.tsx
   WHY: TanStack Table setup takes time. Do after charts are stable.

9. src/components/dashboard/TrendChart.tsx
   WHY: Optional if behind schedule. Build last.

10. src/components/dashboard/DataQualityReport.tsx
    WHY: Uses pre-computed DataQualityReport object. Simple render, build quickly.

11. src/components/dashboard/ExportButton.tsx
    WHY: Depends on export hook from Phase 2. Shell only in Phase 3; wire in Phase 4.

12. src/app/page.tsx
    WHY LAST: Assembles all components. Only build once components exist.
```

### Phase 4 — Why Order Matters

```
1. src/components/chat/ChatInput.tsx
   WHY FIRST: Simplest chat component. No dependencies.

2. src/components/chat/ChatMessage.tsx
   WHY: Depends on message shape. Build before ChatPanel.

3. src/components/chat/ChatPanel.tsx
   WHY: Orchestrates Input + Message + useChat. Depends on both above.

4. src/lib/export/generatePDF.ts
   WHY: Independent of chat. Build in parallel mentally.

5. README.md
   WHY LAST: Written after everything else is confirmed working. 
             Do not write methodology until you've verified your numbers.
```

---

## 5. API ARCHITECTURE

### `/api/analytics` — GET

**Purpose:** Run ETL (once), return full `AnalyticsResult`.

**Request:** `GET /api/analytics` — no parameters. All filtering happens client-side.

**Response schema:**
```typescript
interface AnalyticsResult {
  meta: {
    generated_at: string;           // ISO timestamp
    date_range: { start: string; end: string; weeks: number };
    rows_total: number;
    rows_clean: number;
    weeks_in_dataset: number;
  };
  
  headline: {
    recoverable_hours_month: number;
    recoverable_hours_ci: [number, number];    // ± confidence interval
    recoverable_inr_month: number;
    recoverable_inr_ci: [number, number];
    avg_rep_share_pct: number;
  };
  
  tasks: TaskMetrics[];             // Sorted by APS desc
  departments: DeptMetrics[];
  employees: EmployeeMetrics[];
  apps: AppMetrics[];
  weekly: WeeklyMetrics[];          // W1 → W4
  
  anomalies: Anomaly[];
  data_quality: DataQualityReport;
}
```

**Caching strategy:** Module-level singleton. First request triggers ETL (~50ms). All subsequent requests return cached object (~0ms). On Vercel, each serverless function instance has its own singleton — cold starts are rare for active apps.

**Error handling:**
```typescript
try {
  const analytics = await getAnalytics();
  return Response.json(analytics);
} catch (error) {
  console.error('[ETL Error]', error);
  return Response.json({ error: 'ETL pipeline failed', detail: String(error) }, { status: 500 });
}
```

**Validation strategy:** Use `zod` to validate raw CSV rows at parse time. If a row fails schema validation (not just data quality issues), log it and skip. ETL errors should never crash the route.

---

### `/api/chat` — POST (Streaming)

**Purpose:** Stream AI responses grounded in analytics context.

**Request body:**
```typescript
interface ChatRequest {
  messages: { role: 'user' | 'assistant'; content: string }[];
  filters: {
    department: string | null;
    taskCategory: string | null;
    week: string | null;
  };
}
```

**Streaming architecture:** Vercel AI SDK `streamText` → `toDataStreamResponse()`. Client uses `useChat` hook which handles SSE parsing automatically.

**Grounding injection flow:**
```
Request arrives
  → getAnalytics() (cached, ~0ms)
  → buildContext(analytics, filters)  (~2ms, pure function)
  → buildSystemPrompt(context, filters)
  → streamText({ system: prompt, messages: history })
  → SSE stream to client
```

**Auditability strategy:** The system prompt includes the exact row count and date range used for every metric. If the AI says "Email Triage represents 23% of time," the system prompt contains "Email Triage: 23.1% of total minutes (based on 127 rows, Oct 6–24)."

**Error handling:**
```typescript
// In the route:
if (!process.env.OLLAMA_API_KEY) {
  return Response.json({ error: 'AI not configured' }, { status: 503 });
}

// Vercel AI SDK handles stream errors internally.
// Add onError callback:
const result = await streamText({
  ...
  onError: (error) => console.error('[Chat stream error]', error),
});
```

---

### `/api/export` — GET

**Purpose:** Return export payload for client-side PDF generation.

**Request:** `GET /api/export?department=Finance&taskCategory=Email+Triage`

**Response:**
```typescript
interface ExportPayload {
  generated_at: string;
  date_range: string;
  active_filters: Filters;
  headline: { hours: number; inr: number; rep_share: number };
  top_tasks: { rank: number; task: string; aps: number; inr_month: number }[];  // top 5
  summary_line: string;  // "Workforce Pulse Analysis | Oct 6–24, 2025"
}
```

The client receives this, populates a hidden div, and captures it with `html2canvas`. The payload is always derived from the ETL cache, never static.

---

## 6. AI IMPLEMENTATION STRATEGY

### Ollama Cloud API Integration Architecture

```typescript
// lib/ai/ollamaClient.ts
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export const ollamaCloud = createOpenAICompatible({
  name: 'ollama-cloud',
  baseURL: process.env.OLLAMA_BASE_URL!,  // e.g. https://api.ollama.ai/v1
  headers: {
    Authorization: `Bearer ${process.env.OLLAMA_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

// Usage in route:
const result = await streamText({
  model: ollamaCloud('llama3.1:8b'),
  system: systemPrompt,
  messages,
  maxTokens: 800,
  temperature: 0.1,   // Low temperature: we want factual, not creative
});
```

**Temperature 0.1:** Critical. Higher temperature increases hallucination risk for quantitative reasoning tasks. For grounded analytics, you want deterministic extraction from the context, not creative generation.

### Grounded Prompting Strategy

The context block injected into the system prompt must be structured for easy extraction, not narrative prose:

```
TASK AUTOMATION PRIORITIES (sorted by APS):
1. Email Triage | APS: 78.4 | Volume: 1,840 min (14 employees) | Rep rate: 89% | INR: ₹1.2L/mo | Confidence: HIGH
2. Status Updates | APS: 71.2 | Volume: 920 min (11 employees) | Rep rate: 82% | INR: ₹0.6L/mo | Confidence: HIGH
3. CRM Updates | APS: 65.8 | Volume: 740 min (8 employees) | Rep rate: 76% | INR: ₹0.8L/mo | Confidence: MEDIUM
...

DEPARTMENT BREAKDOWN:
Finance | 1,240 min logged | 71% repetitive | ~₹1.8L/month | 3 employees
Sales | 1,560 min logged | 58% repetitive | ~₹2.4L/month | 4 employees
...
```

Table-format context extracts better than prose. The LLM can scan structured lines for specific values.

### Hallucination Prevention — Three Layers

**Layer 1 — Prompt constraints (always active):**
```
ABSOLUTE RULES:
- Every number you state must exist verbatim in the ANALYTICS CONTEXT block above.
- If asked for a figure not in the context, reply: "That specific data isn't in my analytics context."
- Never extrapolate or estimate beyond what is stated.
- Do not combine two numbers to produce a third unless explicitly instructed to.
```

**Layer 2 — Structured context (architecture):**
All data is injected as key-value pairs. The model cannot "guess" a number if that number's key isn't in the context.

**Layer 3 — Low temperature (model config):**
`temperature: 0.1` severely reduces the model's tendency to deviate from the provided context.

**What NOT to do:**
- Do NOT send "here's the raw CSV data, answer questions about it" — too much noise, model will hallucinate patterns
- Do NOT use RAG/embeddings for this dataset — adds complexity without benefit
- Do NOT allow the client to call the AI directly — keep the key server-side and inject context server-side
- Do NOT use a general-purpose prompt ("you are a helpful assistant") — be specific about what data exists

### Multi-turn Conversation Memory

```typescript
// Client-side (ChatPanel.tsx)
const { messages, input, handleSubmit, isLoading } = useChat({
  api: '/api/chat',
  body: { filters: useFilterStore() },  // Re-reads filter state on each send
});

// Server-side (/api/chat/route.ts)
// Full messages array is sent on every request
// System prompt is rebuilt with current filter state on every request
// This means filter changes mid-conversation take effect immediately
```

**Why rebuild system prompt on every turn:** If the user sets a "Finance" filter mid-conversation, the next AI response should only reference Finance data. This is correct behavior — the AI's context window shifts with the user's view.

### AI Response Formatting

The system prompt instructs the AI to:
- Lead with the direct answer, then explain
- Format numbers: `₹1.2L/month` (Indian lakh format), not `$12,000/month`
- Bold key metrics: `**Email Triage accounts for 34% of all logged time**`
- Add citation parenthetical: `(127 rows, Oct 6–24, all departments)`
- Keep responses under 200 words unless asked to elaborate

### What Judges Will Look For in the AI

1. **Does it cite row counts?** "Based on 127 activity log entries..." — YES
2. **Does it refuse to invent?** Ask "what will next month look like?" — should say "I don't have predictive data"
3. **Does it track conversation?** "And break that down by department" should work
4. **Does it respect filters?** With Finance filter active, it should only reference Finance data
5. **Does it format INR correctly?** ₹ symbol, lakh format, ~tilde for estimates

---

## 7. DATA PIPELINE EXECUTION PLAN

### What Runs Server-Side (Node.js)

Everything in `lib/etl/`. Reasons:
- Raw CSV/JSON files are in `/public` — readable by Node at build time or runtime
- `papaparse` runs in Node without issues
- ETL result is ~50KB JSON — safe to serialize and send to client
- API key never touches the client

### What Runs Client-Side (Browser)

- Zustand filter state management
- `useFilteredAnalytics` hook (derives filtered view from cached analytics)
- ECharts rendering
- TanStack Table sorting/filtering
- `html2canvas` + `jsPDF` export
- `useChat` hook (Vercel AI SDK)

### What Gets Cached

| Item | Cache location | TTL |
|---|---|---|
| `AnalyticsResult` | Module-level singleton | Forever (immutable data) |
| API route response | `Cache-Control: max-age=300` | 5 minutes |
| Filtered analytics | React `useMemo` | Until filter change |
| Chat messages | React state (`useChat`) | Until page refresh |

### What Should Never Be Recomputed

- The ETL pipeline — run once, cache forever. If the data files change, you need a server restart anyway.
- The APS scores — pure function of the clean dataset. Compute once in `computeMetrics.ts`.
- The system prompt template — only the context injection changes per request.

### CSV Ingestion Flow

```
/public/data/activity_logs.csv (raw string)
  │
  ▼
papaparse.parse() → RawRow[]
  │
  ▼  For each row:
  ├── parseTimestamp() → { parsed, week_label, _parse_flag }
  ├── canonicalizeApp() → canonical app name | null
  ├── canonicalizeTask() → canonical task category | null
  ├── validateDuration() → { value, _duration_flag }
  └── normalizeBoolean() → { value: bool | null, _bool_flag }
  │
  ▼
Partition: clean_rows[] (all fields valid) | dropped_rows[] (critical field invalid)
  │
  ▼  Flag rows (included but marked):
  ├── duration > 120 → _duration_flag: 'flagged_high'
  ├── unknown employee_id ('?') → _employee_flag: 'unknown_id'
  └── missing app/task → _app_flag or _task_flag: 'missing'
```

### JSON Normalization Flow

```
employees.json → employees[]
  │
  ▼  For each employee record:
  ├── Detect schema version (EmployeeID vs employee_id, presence of meta key)
  ├── Extract compensation → normalize to annual_ctc_inr + hourly_cost_inr
  ├── Extract department → canonical name (Dept vs department)
  ├── Extract role (flat vs meta.role)
  ├── Extract tenure_months
  ├── Parse working_hours → { start, end } or null
  └── Extract status + terminated_on
  │
  ▼
Conflict resolution:
  ├── E007: two records detected → prefer employee_id (lowercase) schema → ₹24L
  └── Build _conflicts field for audit trail
  │
  ▼
Build Map<string, Employee> (key: uppercase employee_id)
Track: orphan (E099), ghost (E013), terminated (E010)
```

### Canonicalization Layer

The canonicalization maps live in `constants.ts` as static objects. The normalize functions are simple map lookups with lowercased, trimmed input keys. Any value not in the map is preserved as-is (unknown apps/tasks appear in a separate "other" bucket).

**Critical sequencing:** Timestamp parsing must attempt DD/MM/YYYY before ISO. `21/10/2025` parsed as ISO would read as year 21, month 10, day 2025 — completely wrong.

### Analytics Computation Layer

```
computeMetrics(joinedRows: JoinedRow[], employees: Map<string, Employee>): AnalyticsResult

Step 1: Group joinedRows by task_category → TaskMetrics[]
  - total_minutes = sum(duration_minutes)
  - repetitive_minutes = sum(duration WHERE is_repetitive=true)
  - rep_rate = repetitive_minutes / total_minutes
  - employee_count = count(distinct employee_id)
  - ECS = employee_count / total_employees
  - inr_impact = sum((duration_minutes/60) × hourly_cost_inr × 0.60 × (4.33/weeks))
                 for rows with known compensation only

Step 2: Min-max normalize each metric across all tasks → normalized values [0,1]

Step 3: APS = 0.25×norm_volume + 0.30×norm_rep_rate + 0.25×norm_ECS + 0.20×norm_inr
         → multiply by 100, round to 1 decimal

Step 4: Group by department, employee, app, week → respective metrics

Step 5: Compute headline KPIs:
  recoverable_hours_month = Σ(rep_minutes_all) × 0.60 / 60 / weeks × 4.33
  recoverable_inr_month = Σ(per-employee INR recoverable)
  
  CI: ±15% for hours, ±20% for INR (INR has additional compensation uncertainty)
```

### Anomaly Detection Layer

```typescript
function detectAnomalies(rows: JoinedRow[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  // Anomaly 1: Post-termination activity
  rows.filter(r => r._employee_flag === 'post_termination').forEach(r => {
    anomalies.push({
      type: 'post_termination_activity',
      severity: 'high',
      employee_id: r.employee_id,
      detail: `Activity logged ${r.date} — ${r._days_after_termination} days after termination (${r._terminated_on})`,
      recommendation: 'Review offboarding process and system access revocation'
    });
  });
  
  // Anomaly 2: Duration outliers that were dropped
  const droppedOutliers = droppedRows.filter(r => r._duration_flag.startsWith('outlier_dropped'));
  if (droppedOutliers.length > 0) {
    anomalies.push({
      type: 'impossible_duration',
      severity: 'medium',
      detail: `${droppedOutliers.length} entries with 999-minute sessions dropped — all in HR department`,
      recommendation: 'Investigate time-tracking system for HR — possible logging bug'
    });
  }
  
  // Anomaly 3: Employee with >80% repetitive share
  employees.forEach(e => {
    if (e.rep_share > 0.80 && e.total_minutes > 120) {
      anomalies.push({
        type: 'high_repetitive_concentration',
        severity: 'medium',
        employee_id: e.employee_id,
        detail: `${e.rep_share}% of ${e.name}'s logged time is repetitive — highest in company`,
        recommendation: 'Priority automation candidate for this role'
      });
    }
  });
  
  return anomalies;
}
```

---

## 8. UI IMPLEMENTATION STRATEGY

### Dashboard Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ Header: "Workforce Pulse" logo | Date range badge | [Export PDF] │
├──────────────────────────────────────────────────────────────────┤
│ [AnomalyBanner — amber strip, conditionally rendered]            │
├──────────────────────────────────────────────────────────────────┤
│ FilterBar: [All Depts] [Operations] [Finance] [Sales] [CS] ...   │
├────────────────┬────────────────┬─────────────────────────────────┤
│ KPI: Recov.    │ KPI: Recov.    │ KPI: Avg Rep Share             │
│ Hours/Month    │ INR/Month      │                                │
│ ~340 hrs [?]   │ ~₹8.2L [?]    │ 63%                            │
├────────────────┴────────────────┴─────────────────────────────────┤
│                                                                    │
│  AUTOMATION PRIORITIES                    [7 cols wide]           │
│  # | Task | APS ████████░░ | Rep% | Vol | Emp | INR | Conf.      │
│  1 | Email Triage | 78.4 | 89% | ...                             │
│                                           [5 cols]                │
│  WEEKLY TREND                                                      │
│  [Line chart: rep share % by week, top 5 tasks]                  │
│                                                                    │
├────────────────────────────────┬─────────────────────────────────┤
│ TIME SINK                      │ EMPLOYEE TABLE                  │
│ [Task | App | Dept tabs]       │ Sort: Rep% ▼                   │
│ ████████ Email Triage 1840min  │ E001 | Ops | 62% | ₹X,XXX     │
│ ██████ Status Updates 920min   │ E004 | Fin | 71% | ₹X,XXX     │
│ (click bar = sets filter)      │ (click row = inline expand)    │
├────────────────────────────────┴─────────────────────────────────┤
│ [Data Quality Report — collapsed toggle]                          │
│  539 total rows | 523 clean | 16 dropped | Details ▾            │
└──────────────────────────────────────────────────────────────────┘
[Chat FAB bottom-right: ● Opens side panel]
```

### Component Hierarchy

```
Page
├── Header
├── AnomalyBanner (conditional)
├── FilterBar (writes to filterStore)
├── KPIRow
│   ├── KPICard (hours) → MethodologyDrawer
│   ├── KPICard (INR) → MethodologyDrawer
│   └── KPICard (rep share)
├── MainGrid
│   ├── AutomationTable (reads filterStore, writes taskCategory filter on row click)
│   ├── TrendChart
│   ├── TimeSinkChart (reads filterStore, writes dept/task filter on bar click)
│   └── EmployeeTable (reads both filters, row click = inline expand)
├── DataQualityReport (collapsible)
└── ChatPanel (fixed position FAB → panel)
```

### Cross-Filter Architecture

```typescript
// filterStore.ts
const useFilterStore = create<FilterState>((set) => ({
  department: null,
  taskCategory: null,
  week: null,
  setDepartment: (d) => set({ department: d }),
  setTaskCategory: (t) => set({ taskCategory: t }),
  setWeek: (w) => set({ week: w }),
  clearAll: () => set({ department: null, taskCategory: null, week: null }),
}));

// Every chart: reads filterStore, passes active filter to ECharts for visual emphasis
// EmployeeTable: uses filterStore to columnFilters in TanStack
// AI chat: reads filterStore on each message send, injects into request body
```

**Filter interaction rules:**
- Clicking a department chip in FilterBar → sets `department`, clears `taskCategory`
- Clicking a bar in TimeSinkChart (task tab) → sets `taskCategory`
- Clicking a bar in TimeSinkChart (dept tab) → sets `department`
- Clicking AutomationTable row → sets `taskCategory`
- FilterBar always shows active state; "Clear" link appears when any filter is set
- Cross-filter is additive: dept=Finance AND task=Email Triage is valid

### KPI Card Strategy

```tsx
<KPICard
  label="Recoverable Hours / Month"
  value="~340 hrs"
  subtext="±15% confidence interval"
  trend="+12% vs industry benchmark"
  methodology={{
    formula: "Σ(repetitive_min) × 60% ÷ 60 ÷ 3.3 weeks × 4.33",
    inputs: { rep_minutes: 8420, excluded_rows: 16, coeff: 0.60 },
    assumption: "60% automation recovery rate (McKinsey RPA benchmarks)"
  }}
/>
```

The `~` tilde prefix on all estimates is non-negotiable. It signals "this is a model output, not a precise count." CFOs notice when dashboards claim false precision.

### Responsive Strategy

| Breakpoint | Layout change |
|---|---|
| > 1024px | Full grid layout as described |
| 768–1024px | AutomationTable + TrendChart stack vertically |
| 375–768px | All cards stack, table shows 3 columns, chat is full-screen overlay |
| < 375px | KPIs only above fold, rest scrolls |

**Mobile-first implementation:**

Start with mobile layout. Add `md:` and `lg:` Tailwind prefixes for wider screens. Do not do the reverse — adding mobile overrides to desktop styles is always messier.

### UI Build Order

1. Design tokens (globals.css)
2. FilterBar — simplest interactive component
3. KPICard — most important, build perfectly
4. MethodologyDrawer — pairs with KPICard
5. AnomalyBanner — simple, high signal
6. AutomationTable — second most important
7. TimeSinkChart — ECharts setup here
8. EmployeeTable — TanStack Table setup here
9. TrendChart — reuses ECharts setup from step 7
10. DataQualityReport — simple render
11. ChatPanel — most complex, build last

### Styling Philosophy

- **Zero decorative elements.** No gradients behind charts, no icon-for-the-sake-of-it.
- **Consistent spacing scale:** 4px base unit. Use Tailwind: `gap-4` (16px), `gap-6` (24px), `p-6` (24px card padding).
- **Typography hierarchy:** Label (11px, uppercase, muted), Value (32px, semibold, primary), Subtext (13px, secondary).
- **Color used purposefully:** Amber = automation opportunity. Red = anomaly/risk. Green = positive metric. Gray = neutral/muted. Never color for aesthetics.
- **Chart styling:** Remove all chart borders, lighten axis lines to 15% opacity, no chart background fill, grid lines muted gray.

---

## 9. PERFORMANCE STRATEGY

### Memoization Strategy

```typescript
// useFilteredAnalytics.ts
export function useFilteredAnalytics(): FilteredAnalytics {
  const { data } = useAnalyticsStore();
  const { department, taskCategory, week } = useFilterStore();
  
  return useMemo(() => {
    if (!data) return null;
    return applyFilters(data, { department, taskCategory, week });
  }, [data, department, taskCategory, week]);
}

// applyFilters is a pure function — safe to memoize
// Runs in ~1ms for 539-row dataset — no need for worker thread
```

### Chart Optimization

```tsx
// All ECharts components: dynamic import + SSR disabled
const TimeSinkChart = dynamic(() => import('./TimeSinkChart'), { ssr: false });

// Inside ECharts component: use notMerge for filter changes
echartsRef.current?.setOption(option, { notMerge: false, replaceMerge: ['series'] });

// Resize observer for responsive charts
useEffect(() => {
  const ro = new ResizeObserver(() => echartsRef.current?.resize());
  ro.observe(containerRef.current!);
  return () => ro.disconnect();
}, []);
```

### Avoiding Unnecessary Rerenders

```typescript
// AutomationTable: wrap in React.memo
// Only rerenders when filteredAnalytics.tasks changes
export const AutomationTable = React.memo(({ tasks }: { tasks: TaskMetrics[] }) => {
  // ...
});

// FilterBar: setDepartment is stable (Zustand actions are stable references)
// No useCallback needed for simple Zustand setters

// EmployeeTable: use TanStack's built-in column memoization
const columns = useMemo(() => [...columnDefs], []); // define once
```

### Client/Server Separation

The ETL runs server-side. The client receives only the `AnalyticsResult` JSON — never the raw 539-row dataset. This means:
- ~50KB payload to client instead of raw CSV
- No parsing overhead in the browser
- API key never exposed to client

### Streaming Strategy

AI responses stream via Server-Sent Events (Vercel AI SDK). The `useChat` hook handles reconnection, partial renders, and error states. Show a blinking cursor during streaming. Disable the send button until the current stream completes.

---

## 10. DEPLOYMENT STRATEGY

### Vercel Deployment

```bash
# Initial setup
npm install -g vercel
vercel login

# From project root:
npm run build    # MUST pass before deploying
vercel           # Preview deployment
vercel --prod    # Production deployment
```

### Environment Variables

**Set in Vercel dashboard** (Settings → Environment Variables → Production):

```
OLLAMA_API_KEY=your_key_here
OLLAMA_BASE_URL=https://your-ollama-cloud-base-url/v1
```

**Never commit these.** `.env.local` is in `.gitignore` by default in Next.js.

**.env.example (committed to repo):**
```
# Ollama Cloud API Configuration
# Get your API key from: [Ollama Cloud dashboard URL]
OLLAMA_API_KEY=your_ollama_api_key_here
OLLAMA_BASE_URL=https://api.ollama.ai/v1
```

### `next.config.ts`

```typescript
const nextConfig = {
  // Ensure CSV files in public are served
  // No special config needed for static files in /public
  
  // If using edge runtime for chat route, set here:
  // experimental: { serverActions: { allowedOrigins: ['*'] } }
};

export default nextConfig;
```

### Production Build Validation Checklist

```bash
npm run build
# ✅ No TypeScript errors
# ✅ No ESLint errors  
# ✅ All pages statically analyzable
# ✅ API routes recognized

# Check bundle size:
# ✅ First load JS < 250KB (ECharts adds ~200KB — use tree shaking)
```

**ECharts tree shaking** (critical for bundle size):
```typescript
// Don't: import * as echarts from 'echarts'
// Do:
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
echarts.use([BarChart, LineChart, CanvasRenderer]);
```

### Mobile Testing Checklist

Test in Chrome DevTools → iPhone 12 (390px) + actual device if available:

- [ ] Dashboard loads in < 3s on 4G throttling
- [ ] All 3 KPI cards visible above fold (stacked vertically)
- [ ] FilterBar horizontally scrollable without layout break
- [ ] AutomationTable: at least rank + task + APS visible without horizontal scroll
- [ ] Chat FAB visible and tappable
- [ ] Chat panel opens full-screen on mobile
- [ ] Export button works (PDF downloads)
- [ ] Methodology drawer opens and closes correctly
- [ ] No text overflow anywhere

### Deployment Validation Checklist

After `vercel --prod`:

- [ ] Live URL returns 200 (check in incognito)
- [ ] `/api/analytics` returns JSON without error
- [ ] Dashboard loads with real numbers (not zeros or errors)
- [ ] AI chat sends and receives a streaming response
- [ ] Export downloads a PDF
- [ ] Mobile: works on phone browser in incognito
- [ ] No console errors in production build
- [ ] Environment variables not exposed in client-side source

---

## 11. README / METHODOLOGY DOCUMENT PLAN

### Exact README Structure (2 pages max)

```markdown
# Workforce Pulse

Live: [URL] | Built with: Next.js 15, TypeScript, ECharts, Vercel AI SDK, Ollama Cloud

## Data Assumptions

**employees.json**
- E007 appears twice with conflicting data. Resolved by preferring the post-migration 
  schema (employee_id lowercase). Used ₹24L compensation, 28-month tenure. The V1 
  record (₹14L, "Account Executive") is logged in the audit trail as a conflict.
- E013 appears in activity logs (HR department) with no employee record. Included in 
  time analysis, excluded from all INR calculations.
- E099 has an employee record but zero activity logs. Retained in employee data.
- E010 terminated 2025-10-22. Pre-termination rows included. Post-termination rows 
  flagged as anomalies, excluded from metrics.
- Compensation normalized to hourly cost using 2,376 working hours/year 
  (22 days/month × 9 hours/day × 12 months).

**activity_logs.csv**
- Timestamp formats: ISO 8601 (with/without T separator, with/without seconds), 
  DD/MM/YYYY HH:MM. Parsed in priority order — DD/MM/YYYY attempted first to prevent 
  day/month transposition.
- Negative durations: dropped. Zero durations: dropped. Duration > 480 min: dropped 
  (impossible single session). Duration 121–480 min: included with flag.
- 999-minute entries (3 rows, all HR): dropped as outliers. Surfaced as anomaly.
- is_repetitive normalized from 11 variants (TRUE/true/1/yes/Yes/no/false/0/NA/-/empty).
  Null after normalization = excluded from repetitiveness metrics, included for time analysis.
- app_used and task_category: 30+ canonical forms each. Full map in /lib/etl/canonicalize.ts.

## Join Strategy

Activity rows joined to employee records on canonicalized employee_id (uppercase). 
Unknown IDs ('?'): retained for time analysis, excluded from INR. 
Missing metadata (E013): retained for time analysis, excluded from INR.
E010 post-termination rows: flagged, excluded from metrics.

## Formulas

**Recoverable Hours/Month**
```
Σ(duration_minutes WHERE is_repetitive=true AND duration_valid=true)
  × 0.60 (automation recovery coefficient)
  ÷ 60
  ÷ [weeks in dataset]
  × 4.33 (avg weeks/month)
```
Recovery coefficient 0.60 based on McKinsey RPA study range (50–80%).
Confidence interval: ±15%.

**Recoverable INR/Month**
```
For each employee with known compensation:
  (repetitive_minutes ÷ 60) × hourly_cost_inr × 0.60 × (4.33 ÷ weeks)
Sum across all employees.
```
Excludes E013 (no compensation data). Stated as estimate (~).

**Automation Priority Score (APS)**
```
APS = 25% × norm(volume) + 30% × norm(rep_rate) 
    + 25% × norm(employee_concentration) + 20% × norm(INR_impact)
```
Weights: rep_rate highest (repetitive = automatable signal).
INR weighted lower to avoid senior-employee salary bias.
All inputs min-max normalized across task categories before weighting.

## Anomaly Detection

1. **Post-termination activity** (rule-based): E010 has activity on 2025-10-24, 
   2 days after termination. Flagged as offboarding process gap.
2. **Impossible durations** (threshold): 3 entries with 999-minute sessions in HR.
   Likely time-tracking system bug. Rows dropped, flagged in data quality report.
3. **High repetitive concentration** (threshold): Any employee with >80% repetitive 
   share across >120 minutes flagged for automation prioritization.

## What I Cut

- Individual employee drill-down profile panel (table only)
- Dark mode toggle (ships dark-only)
- APS weight adjustment sliders (hardcoded, documented here)

## What I'd Build Next (2 more days)

- Slack/email anomaly alerts when weekly repetitive share spikes >20%
- HRMS direct integration via webhook for live data refresh
- AI-generated weekly narrative summaries (PDF auto-emailed to COO)
- Cohort analysis: new hires (<6mo) vs tenured employees in same role
- Confidence score improvement with more historical data
```

### What NOT to Include in README

- Code snippets (README is not a tutorial)
- Technology justification essays
- "This was built in X hours" (unprofessional)
- Apologies for what's missing
- Screenshots (link to live URL instead)

---

## 12. FINAL RECOMMENDED EXECUTION STRATEGY

### The Brutally Honest Prioritization

**Minute 0–55:** Do nothing but ETL. Do not touch the UI. Do not think about the AI. The entire submission stands or falls on whether your headline numbers are correct and defensible. If `recoverable_hours_month` is wrong, every feature after it is noise.

**Minute 55–95:** Wire the AI. The grounded prompting strategy takes 40 minutes to do correctly. The alternative is an AI that confidently hallucinates numbers, which is worse than no AI at all. Grounding first, UI second.

**Minute 95–155:** Build the dashboard. Start with KPI cards and methodology drawers — these score more points per hour than any chart. Then the AutomationTable. Charts last.

**Minute 155–180:** Deploy, polish, README. A broken live URL costs you the Shipping dimension. Submit with 30 minutes of buffer.

### What Creates Maximum "Wow Factor"

1. **The methodology drawer.** When a judge clicks `[?]` on `~₹8.2L/month` and sees the exact formula, the input counts, the assumptions, and the confidence interval — they know they're looking at a senior engineer's work. Nothing else creates this impression as efficiently.

2. **The anomaly callout.** E010 post-termination activity is a real operational finding hiding in dirty data. Surfacing it with a clear recommendation ("review offboarding process") shows product judgment, not just data engineering.

3. **The AI knowing what it doesn't know.** Ask the AI "what will next month look like?" and it should respond "I don't have predictive data in my analytics context." This single behavior demonstrates that the AI is genuinely grounded, not pattern-matching to produce plausible-sounding answers.

### What Creates Maximum Trust

- The `~` tilde on every estimate
- The data quality report showing rows dropped, why, and how many
- The methodology drawer on every headline number
- The AI citing row counts and date ranges
- The README documenting conflicts and how you resolved them (E007)
- The confidence badge on each APS score

### What Makes The Submission Feel Senior-Level

**Senior engineers make decisions and document them.** The data is ambiguous. E007 has two records. E013 has no metadata. You cannot ask for clarification. Make the call, defend it in the README, move on.

**Senior engineers know what to cut.** Adding a seventh chart is not adding value. The brief lists exactly six requirements. Ship six things done well. The README notes what you cut and why — this shows judgment.

**Senior engineers write commit messages like documentation.** `feat: resolve E007 duplicate — prefer V2 schema (₹24L vs ₹14L), conflicts logged in audit trail` tells the reviewer everything they need to know before opening the diff.

**Senior engineers think about the downstream user.** Every number on this dashboard will be forwarded to a CFO. Design each number so that if the CFO asks "how did you calculate this," the COO has an answer. The methodology drawer is the product. The charts are packaging.

### The One Heuristic That Separates Winning Submissions

> **Every aggregated number on the dashboard should be traceable back to source rows.**

If you build nothing else beyond KPI cards with methodology drawers and a grounded AI that refuses to hallucinate — you are in the top 10% of submissions. The charts are nice. The animation is nice. The export is required. But the thing that makes a COO trust a number is knowing exactly where it came from and what decisions were made to produce it.

Build that trust, and you win.

---

*Workforce Pulse — Implementation Documentation v1.0*  
*Generated for 3-hour sprint execution*  
*Stack: Next.js 15 · TypeScript · ECharts · Zustand · Vercel AI SDK · Ollama Cloud*
