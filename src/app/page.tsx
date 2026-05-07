"use client";

import { useEffect } from "react";

import { AnomalyBanner } from "@/components/dashboard/AnomalyBanner";
import { AutomationTable } from "@/components/dashboard/AutomationTable";
import { DataQualityReport } from "@/components/dashboard/DataQualityReport";
import { EmployeeTable } from "@/components/dashboard/EmployeeTable";
import { ExportButton } from "@/components/dashboard/ExportButton";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { KPICard } from "@/components/dashboard/KPICard";
import { TimeSinkChart } from "@/components/dashboard/TimeSinkChart";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { ChatPanel } from "@/components/chat/ChatPanel";
import useAnalyticsStore from "@/store/analyticsStore";
import { useFilteredAnalytics } from "@/hooks/useFilteredAnalytics";

export default function HomePage() {
  const fetchAnalytics = useAnalyticsStore((state) => state.fetchAnalytics);
  const { analytics, filtered, loading, error } = useFilteredAnalytics();

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading && !analytics) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 text-foreground md:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4">
          <div className="h-14 rounded-2xl border border-border/70 bg-card/70" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-28 rounded-2xl border border-border/70 bg-card/70" />
            <div className="h-28 rounded-2xl border border-border/70 bg-card/70" />
            <div className="h-28 rounded-2xl border border-border/70 bg-card/70" />
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <div className="max-w-xl rounded-3xl border border-border/70 bg-card p-8 shadow-dashboard-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Workforce Pulse</p>
          <h1 className="mt-4 text-2xl font-semibold">Analytics could not be loaded</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }

  if (!analytics || !filtered) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground md:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-[28px] border border-border/70 bg-card px-5 py-5 shadow-dashboard-panel md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Workforce Pulse</p>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Executive operational intelligence</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                {analytics.dateRange.start} to {analytics.dateRange.end} · {analytics.quality.rowsClean} clean rows · {analytics.quality.rowsDropped} dropped rows
              </p>
            </div>
            <ExportButton />
          </div>
          <FilterBar
            departments={analytics.filtersAvailable.departments}
            taskCategories={analytics.filtersAvailable.taskCategories}
            weeks={analytics.filtersAvailable.weeks}
          />
        </header>

        <AnomalyBanner anomalies={filtered.anomalies} />

        <section className="grid gap-4 md:grid-cols-3">
          <KPICard
            label="Recoverable Hours / Month"
            value={`~${analytics.headline.recoverableHoursMonth} hrs`}
            subtitle={`95% CI ${analytics.headline.recoverableHoursCi[0]} - ${analytics.headline.recoverableHoursCi[1]} hrs`}
            methodology={{
              title: "Recoverable hours methodology",
              formula: "Sum repetitive minutes, apply 60% automation recovery coefficient, convert to monthly hours.",
              assumptions: [
                "60% automation recovery coefficient",
                "Filtered from repetitive minutes only",
                "Uses a 4.33 weeks/month conversion",
              ],
              confidenceInterval: `${analytics.headline.recoverableHoursCi[0]} - ${analytics.headline.recoverableHoursCi[1]} hrs`,
              excludedRows: analytics.quality.rowsDropped,
              excludedEmployees: analytics.quality.employeeIssues.missingMetadata,
              rationale: "This coefficient is conservative enough for COO planning while still capturing measurable automation upside.",
            }}
          />
          <KPICard
            label="Recoverable INR / Month"
            value={`~₹${analytics.headline.recoverableInrMonth.toLocaleString("en-IN")}`}
            subtitle={`95% CI ₹${analytics.headline.recoverableInrCi[0].toLocaleString("en-IN")} - ₹${analytics.headline.recoverableInrCi[1].toLocaleString("en-IN")}`}
            methodology={{
              title: "Recoverable INR methodology",
              formula: "For each compensated employee, repetitive minutes × hourly cost × 60% recovery coefficient.",
              assumptions: [
                "Employees with no compensation are excluded from INR calculations",
                "Hourly cost uses 2,376 working hours/year",
                "Values are rounded to whole rupees for executive display",
              ],
              confidenceInterval: `₹${analytics.headline.recoverableInrCi[0].toLocaleString("en-IN")} - ₹${analytics.headline.recoverableInrCi[1].toLocaleString("en-IN")}`,
              excludedRows: analytics.quality.rowsDropped,
              excludedEmployees: analytics.quality.employeeIssues.missingMetadata,
              rationale: "This is the rupee value of recoverable repetitive work, weighted by compensation so the output tracks financial impact.",
            }}
          />
          <KPICard
            label="Average Repetitive Share"
            value={`${analytics.headline.avgRepSharePct}%`}
            subtitle="Share of total logged minutes marked repetitive"
            methodology={{
              title: "Repetitive share methodology",
              formula: "Repetitive minutes / total valid minutes across the cleaned dataset.",
              assumptions: [
                "Missing or invalid durations are excluded",
                "Unknown repetitive signals are retained for time analysis only",
                "Used to contextualize automation potential across the org",
              ],
              confidenceInterval: "Not modeled as a CI in this release",
              excludedRows: analytics.quality.rowsDropped,
              excludedEmployees: analytics.quality.employeeIssues.missingMetadata,
              rationale: "A high repetitive share indicates that the workload is structured enough to be automated or standardized.",
            }}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.45fr_0.95fr]">
          <AutomationTable tasks={filtered.tasks} />
          <TrendChart weekly={filtered.weekly} />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <TimeSinkChart tasks={filtered.tasks} apps={filtered.apps} departments={filtered.departments} />
          <EmployeeTable employees={filtered.employees} />
        </section>

        <DataQualityReport quality={analytics.quality} />
      </section>

      <ChatPanel />
    </main>
  );
}
