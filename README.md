# Workforce Pulse

Workforce Pulse is a COO-grade operational intelligence platform built to identify repetitive work, operational inefficiencies, and automation opportunities from messy employee activity logs and inconsistent HRMS exports.

The project was built for a product-engineering challenge centered on:
- data correctness
- operational judgment
- auditability
- grounded AI integration
- shipping quality

Unlike a traditional dashboard, Workforce Pulse is designed to answer:
> “Where are we wasting the most time and money — and what should we automate first?”

---

# Live Demo

### Live Application
https://workforce-pulse-livid.vercel.app/

### GitHub Repository
https://github.com/harishankar3618/workforce-pulse

---

# Product Overview

The application ingests:
- dirty activity-level operational logs
- inconsistent HRMS exports
- compensation metadata
- repetitive-task signals

It then:
1. Normalizes and joins both datasets
2. Detects anomalies and inconsistencies
3. Computes operational metrics
4. Ranks automation opportunities
5. Provides grounded AI analysis
6. Generates executive summaries

The final system is:
- audit-aware
- compensation-aware
- filter-aware
- mobile-responsive
- production-deployed

---

# Core Features

## 1. ETL + Data Normalization

Implemented:
- timestamp normalization
- canonical app names
- canonical task categories
- repetitive-signal normalization
- compensation normalization
- duplicate employee resolution
- duration validation
- anomaly detection
- working-hours normalization

Dirty data handling includes:
- invalid durations
- negative values
- impossible activity lengths
- inconsistent schemas
- missing metadata
- orphan activity rows

---

## 2. Automation Opportunity Dashboard

The dashboard includes:

- Recoverable Hours / Month
- Recoverable INR / Month
- Automation Priority Score (APS)
- Time-sink breakdowns
- Employee drilldowns
- Week-over-week trends
- Data-quality reporting
- Cross-filter analytics
- Operational anomaly detection

All metrics are traceable back to source rows.

---

## 3. Grounded AI Assistant

The conversational assistant:
- uses the normalized analytics dataset
- supports multi-turn conversations
- respects live filters
- streams responses
- cites operational metrics
- refuses unsupported claims

The assistant never invents statistics outside the normalized dataset.

Example prompts:
- “Who in finance spends the most time on repetitive work?”
- “What’s the highest ROI automation opportunity?”
- “Break that down by department.”

---

## 4. Executive Export System

The application supports:
- live-state PDF export
- filter-aware summaries
- executive-ready formatting
- top automation opportunities
- KPI snapshots

Exports reflect the CURRENT dashboard state — not a static template.

---

# Architecture

```text
activity_logs.csv
        +
employees.json
        ↓

┌───────────────────────────┐
│ ETL Normalization Layer   │
│ - canonicalization        │
│ - timestamp parsing       │
│ - compensation resolution │
│ - anomaly detection       │
└───────────────────────────┘
              ↓
┌───────────────────────────┐
│ Joined Analytics Engine   │
│ - APS scoring             │
│ - KPI generation          │
│ - trends                  │
│ - anomalies               │
└───────────────────────────┘
              ↓
┌───────────────────────────┐
│ API + AI Layer            │
│ - analytics route         │
│ - grounded chat           │
│ - export generation       │
└───────────────────────────┘
              ↓
┌───────────────────────────┐
│ Dashboard UI              │
│ - filters                 │
│ - charts                  │
│ - drilldowns              │
│ - mobile responsiveness   │
└───────────────────────────┘
```

---

# Tech Stack

## Frontend
- Next.js 15
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand
- ECharts
- Framer Motion

## Backend
- Next.js Route Handlers
- In-memory ETL pipeline
- Deterministic analytics engine

## AI
- Vercel AI SDK
- Ollama Cloud API

## Deployment
- Vercel

---

# Data Engineering Decisions

## Duplicate Employee — E007

The HRMS export intentionally contains:
- two records for employee E007
- conflicting compensation values

Resolution strategy:
- prefer the newer V2 schema record
- use ₹24L annual compensation
- preserve audit trail
- log conflict visibly in data-quality reporting

---

## Missing Metadata — E013

Employee E013 appears in activity logs but not in HRMS metadata.

Handling:
- included in operational time metrics
- excluded from INR calculations
- surfaced in anomaly reporting

This prevents silent data loss while avoiding fabricated compensation assumptions.

---

## Terminated Employee — E010

E010 was terminated during the activity window.

Handling:
- post-termination activity flagged
- excluded from productivity metrics
- surfaced in anomaly reporting

---

## Impossible Durations

Rows such as:
- 999-minute activities
- negative durations
- blank durations

were:
- dropped from metric calculations
- retained in audit summaries
- surfaced in data-quality reporting

---

# Headline Metric Methodology

## Recoverable Hours / Month

Recoverable hours estimate:
- repetitive operational work
- task concentration
- automation suitability
- operational frequency

The calculation intentionally avoids simplistic:
> repetitive_minutes × arbitrary coefficient

Instead, recoverability is weighted using:
- repetitive share
- task distribution
- employee concentration
- confidence scoring

---

## Recoverable INR / Month

Recoverable INR combines:
- recoverable hours
- employee compensation
- normalized hourly rates

Compensation normalization supports:
- annual INR
- hourly INR
- LPA conversion

Missing compensation data is excluded rather than fabricated.

---

# Automation Priority Score (APS)

APS ranks automation opportunities using:

```text
APS =
Repetitive Share
× Operational Volume
× Employee Concentration
× Estimated INR Impact
× Confidence Weight
```

The formula intentionally balances:
- scale
- automation feasibility
- operational consistency
- business impact

Higher APS indicates:
- high repetitive burden
- broad organizational impact
- stronger automation ROI

---

# AI Grounding Strategy

The assistant is grounded ONLY in:
- normalized analytics results
- computed metrics
- audit-safe aggregates

The model:
- cannot access arbitrary external context
- cannot fabricate rows
- cannot invent metrics

Every quantitative answer references:
- categories
- row counts
- date ranges
- computed aggregates

---

# Mobile Responsiveness

The dashboard was optimized for:
- iPhone 12/13/14
- Pixel-class Android devices
- tablet breakpoints

Responsive improvements include:
- adaptive KPI layouts
- responsive charts
- scroll-safe tables
- mobile-safe filters
- touch-friendly interactions

---

# Performance Decisions

The project intentionally uses:
- in-memory ETL
- module-level caching
- deterministic computation

instead of:
- databases
- background workers
- distributed pipelines

Reason:
the dataset is small enough that:
- complexity would not provide value
- deterministic auditability matters more

---

# Trade-offs / What Was Cut

To prioritize correctness and shipping quality, the following were intentionally excluded:

- predictive forecasting
- historical persistence
- authentication
- role-based access
- workflow orchestration
- background jobs
- semantic vector search

The focus remained on:
- trustworthy metrics
- operational clarity
- grounded AI
- production readiness

---

# What I Would Build Next

With additional time, the next improvements would include:

- historical trend persistence
- manager benchmarking
- workflow simulation
- automated operational alerts
- anomaly clustering
- semantic analytics search
- richer AI memory
- approval pipeline integrations

---

# Local Development

## Install

```bash
npm install
```

## Run Development Server

```bash
npm run dev
```

Open:
```text
http://localhost:3000
```

---

# Environment Variables

```env
OLLAMA_API_KEY=
OLLAMA_BASE_URL=
OLLAMA_MODEL=
```

---

# Verification

```bash
npm run typecheck
npm run lint
npm run build
npx ts-node scripts/verify-etl.ts
```

---

# Challenge Alignment

This implementation satisfies all required challenge components:

- ingestion + normalization
- joined analytics
- grounded AI assistant
- export functionality
- live deployment
- methodology documentation

The project emphasizes:
- auditability
- operational trust
- defensible metrics
- product judgment
- grounded AI behavior

---

# Author

Hari Shankar Bakkamanthula

Cybersecurity & Product Engineering Enthusiast  
Focused on operational intelligence systems, AI-assisted analytics, and production-grade engineering workflows.
