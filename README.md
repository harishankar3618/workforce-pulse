# Workforce Pulse

This repository contains the Workforce Pulse dashboard, ETL, grounded AI assistant, and export pipeline used to analyze employee activity logs and surface automation opportunities.

**Quickstart**

- Install:

```bash
npm ci
```
- Local dev server:

```bash
npm run dev
# Open http://localhost:3000
```
- Production build:

```bash
npm run build
npm run start
```
- Verify ETL (standalone):

```bash
npx ts-node scripts/verify-etl.ts
```

Environment
- Copy `.env.example` to `.env.local` and fill values. Required env vars:
  - `OLLAMA_API_KEY` – API key for Ollama Cloud (if using cloud models)
  - `OLLAMA_BASE_URL` – e.g. `https://ollama.com/v1`
  - `OLLAMA_MODEL` – cloud model id (defaults to `gpt-oss:120b`)

Project overview
- ETL: `src/lib/etl/*` — canonicalize, parse employees, parse activity logs, join datasets, compute metrics, and build a data-quality audit.
- API: `src/app/api/analytics`, `src/app/api/chat`, `src/app/api/export` — analytics payload, grounded chat assistant, and export payload.
- UI: `src/app/page.tsx` and `src/components/*` — dashboard, charts, cross-filters, tables, and chat panel.
- AI context: `src/lib/ai/*` — builds a grounded assistant prompt and export payload from `AnalyticsResult`.
- Export: `src/lib/export/generatePDF.ts` — builds an offscreen document and generates a PDF via `html2canvas` + `jspdf`.

Methodology

**Assumptions**
- Input activity logs provide per-row employee, timestamp, application/task metadata and an activity duration in minutes.
- Employee metadata is authoritative for role/department/seniority used in aggregation joins.
- ETL is deterministic and idempotent; the ETL contract is intentionally frozen to avoid cross-layer regressions.

**Join strategy**
- Employee rows are joined to activity rows by employee id with a left-join from activities → employees.
- Missing metadata is flagged as `missing_metadata` in the data-quality report and excluded from some aggregates where appropriate.

**Anomaly detection**
- The ETL produces an `anomalies` list with typed anomalies such as `post_termination_activity`, `missing_metadata`, and `unknown_rows`.
- Anomalies are detected using rule-based checks (date vs termination date, missing required fields, out-of-range durations). These are surfaced in `src/lib/etl/auditTrail.ts` and included in the API payload.

**APS (Activity Prioritization Score)**
- APS ranks tasks by a combination of repetitive share, volume, and estimated business impact. In code we compute APS as a normalized score combining:

Inline math: $APS = 100 \times S_{rep} \times N_{vol} \times C_{conf}$

Where:
- $S_{rep}$ is repetitive share (fraction, e.g., 0.7 for 70%).
- $N_{vol}$ is volume normalized using a soft normalization: $N_{vol} = \dfrac{V}{V + m}$ where $V$ is task minutes and $m$ is the dataset median task minutes (prevents extreme skew).
- $C_{conf}$ is a confidence weight in $[0.5, 1.0]$ derived from data completeness and sample size.

This yields a 0–100 APS where higher is more attractive for automation.

**Recoverable INR / hour methodology**
- Recoverable hours are estimated from the portion of time classified as repetitive and eligible for automation. Monthly recoverable hours are aggregated across tasks and prorated to a 1‑month window.
- Recoverable INR is computed by multiplying recoverable hours by an estimated INR/hour rate derived from employee salary metadata or a fallback average. Formally:

Inline math: $Recoverable\_INR = RecoverableHours \times INR\_Per\_Hour$

Confidence intervals are produced via bootstrap sampling of employee-level aggregates to produce a lower/upper bound (95% CI) for recoverable hours and INR.

What we cut / limitations
- No raw keystroke or full PII-sensitive content is stored; we only keep aggregated metrics and task labels.
- The AI assistant is grounded on aggregate summaries and top-task examples, not raw event logs, to protect privacy and keep prompts compact.
- No on-device model hosting is required — the stack uses Ollama Cloud via `OLLAMA_BASE_URL` by default; local Ollama usage is possible if you run an Ollama host.

Developer notes
- Keep the ETL contract stable. If you need to add fields, add them as optional and keep adapters backward compatible.
- The chat route reads the chosen model from `process.env.OLLAMA_MODEL`. If a model is not available in the configured host, change `OLLAMA_MODEL` to a supported model id.

Commands and checks

```bash
# Typecheck
npm run typecheck

# Lint
npm run lint

# Run verifier
npx ts-node scripts/verify-etl.ts
```

Next steps
- Finish optional runtime zod schemas for external inputs.
- Add end-to-end tests for the chat streaming flow and the export PDF generation.
- Add a short methodology appendix with worked examples (CSV → KPIs → APS) and sample prompt templates for the assistant.

Maintainer
- Primary: Hari Shankar (local workspace). For questions raise an issue or edit this README.

This document summarizes the analysis approach and operational steps for the Workforce Pulse project. If you want a shorter executive README (one-page) or a longer technical appendix, tell me which and I'll add it.
