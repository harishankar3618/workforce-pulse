"use client";

import { useMemo, useEffect } from "react";

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
import { computeFilteredHeadline } from "@/lib/ai/buildContext";

export default function HomePage() {
  const fetchAnalytics = useAnalyticsStore((state) => state.fetchAnalytics);
  const { analytics, filtered, loading, error } = useFilteredAnalytics();

  const filteredHeadline = useMemo(() => {
    if (!analytics || !filtered) return null;
    return computeFilteredHeadline(analytics, filtered);
  }, [analytics, filtered]);

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
    <main className="min-h-screen bg-background px-4 py-4 text-foreground sm:px-4 md:px-6 lg:px-6 xl:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-4">
        {/* HEADER */}
        <header className="rounded-2xl border border-border/70 bg-card p-4 shadow-dashboard-panel md:p-5 lg:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent sm:text-xs">
                Workforce Pulse
              </p>
              <h1 className="text-2xl font-semibold tracking-tight leading-tight sm:text-3xl md:text-4xl">
                Executive operational intelligence
              </h1>
              <p className="max-w-2xl text-[11px] leading-5 text-muted-foreground break-words sm:text-sm sm:leading-6">
                {analytics.dateRange.start} to {analytics.dateRange.end} · {analytics.quality.rowsClean} clean rows · {analytics.quality.rowsDropped} dropped rows
              </p>
            </div>
            <div className="self-start sm:self-auto">
              <ExportButton />
            </div>
          </div>
          <div className="mt-4">
            <FilterBar
              departments={analytics.filtersAvailable.departments}
              taskCategories={analytics.filtersAvailable.taskCategories}
              weeks={analytics.filtersAvailable.weeks}
            />
          </div>
        </header>

        {/* ANOMALY BANNER */}
        <AnomalyBanner anomalies={filtered.anomalies} />

        {/* KPI CARDS */}
        <section className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <KPICard
            label="Recoverable Hours / Month"
            value={`~${filteredHeadline?.recoverableHoursMonth} hrs`}
            subtitle={`95% CI ${filteredHeadline?.recoverableHoursCi[0]} - ${filteredHeadline?.recoverableHoursCi[1]} hrs`}
            methodology={{
              title: "Recoverable hours methodology",
              formula: "Sum repetitive minutes, apply 60% automation recovery coefficient, convert to monthly hours.",
              assumptions: [
                "60% automation recovery coefficient",
                "Filtered from repetitive minutes only",
                "Uses a 4.33 weeks/month conversion",
              ],
              confidenceInterval: `${filteredHeadline?.recoverableHoursCi[0]} - ${filteredHeadline?.recoverableHoursCi[1]} hrs`,
              excludedRows: analytics.quality.rowsDropped,
              excludedEmployees: analytics.quality.employeeIssues.missingMetadata,
              rationale: "This coefficient is conservative enough for COO planning while still capturing measurable automation upside.",
            }}
          />
          <KPICard
            label="Recoverable INR / Month"
            value={`~₹${filteredHeadline?.recoverableInrMonth.toLocaleString("en-IN")}`}
            subtitle={`95% CI ₹${filteredHeadline?.recoverableInrCi[0].toLocaleString("en-IN")} - ₹${filteredHeadline?.recoverableInrCi[1].toLocaleString("en-IN")}`}
            methodology={{
              title: "Recoverable INR methodology",
              formula: "For each compensated employee, repetitive minutes × hourly cost × 60% recovery coefficient.",
              assumptions: [
                "Employees with no compensation are excluded from INR calculations",
                "Hourly cost uses 2,376 working hours/year",
                "Values are rounded to whole rupees for executive display",
              ],
              confidenceInterval: `₹${filteredHeadline?.recoverableInrCi[0].toLocaleString("en-IN")} - ₹${filteredHeadline?.recoverableInrCi[1].toLocaleString("en-IN")}`,
              excludedRows: analytics.quality.rowsDropped,
              excludedEmployees: analytics.quality.employeeIssues.missingMetadata,
              rationale: "This is the rupee value of recoverable repetitive work, weighted by compensation so the output tracks financial impact.",
            }}
          />
          <KPICard
            label="Average Repetitive Share"
            value={`${filteredHeadline?.avgRepSharePct}%`}
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

        {/* AUTOMATION TABLE + TREND CHART */}
        <section className="grid gap-4 lg:grid-cols-[1.45fr_0.95fr]">
          <AutomationTable tasks={filtered.tasks} />
          <TrendChart weekly={filtered.weekly} />
        </section>

        {/* TIME SINK CHART + EMPLOYEE TABLE */}
        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <TimeSinkChart tasks={filtered.tasks} apps={filtered.apps} departments={filtered.departments} />
          <EmployeeTable employees={filtered.employees} />
        </section>

        {/* DATA QUALITY REPORT */}
        <DataQualityReport quality={analytics.quality} />
      </div>

      {/* CHAT PANEL */}
      <ChatPanel />
    </main>
  );
}
