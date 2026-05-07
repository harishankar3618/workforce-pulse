"use client";

import dynamic from "next/dynamic";
import type { ComponentType, CSSProperties } from "react";
import { useMemo, useState } from "react";

import type { AppMetrics, DeptMetrics, TaskMetrics } from "@/lib/types";
import useFilterStore from "@/store/filterStore";

interface EChartsClickParams {
  dataIndex?: number;
}

interface EChartsProps {
  option: Record<string, unknown>;
  style?: CSSProperties;
  onEvents?: {
    click?: (params: EChartsClickParams) => void;
  };
}

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false }) as ComponentType<EChartsProps>;

interface TimeSinkChartProps {
  tasks: TaskMetrics[];
  apps: AppMetrics[];
  departments: DeptMetrics[];
}

type ViewMode = "tasks" | "apps" | "departments";

export function TimeSinkChart({ tasks, apps, departments }: TimeSinkChartProps) {
  const [mode, setMode] = useState<ViewMode>("tasks");
  const setDepartment = useFilterStore((state) => state.setDepartment);
  const setTaskCategory = useFilterStore((state) => state.setTaskCategory);

  const seriesData = useMemo(() => {
    if (mode === "apps") {
      return apps.map((item) => ({
        label: item.appUsed,
        total: item.totalMinutes,
        repetitive: item.repetitiveMinutes,
        key: item.appUsed,
      }));
    }

    if (mode === "departments") {
      return departments.map((item) => ({
        label: item.department,
        total: item.totalMinutes,
        repetitive: item.repetitiveMinutes,
        key: item.department,
      }));
    }

    return tasks.map((item) => ({
      label: item.taskCategory,
      total: item.totalMinutes,
      repetitive: item.repetitiveMinutes,
      key: item.taskCategory,
    }));
  }, [apps, departments, mode, tasks]);

  const option = useMemo(() => {
    const labels = [...seriesData].sort((left, right) => right.total - left.total).slice(0, 10);
    const axisLabels = labels.map((item) => item.label);

    return {
      backgroundColor: "transparent",
      grid: { left: 4, right: 12, top: 20, bottom: 16, containLabel: true },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(28,28,31,0.96)",
        borderColor: "rgba(255,255,255,0.08)",
        textStyle: { color: "#F4F4F5", fontSize: 11 },
      },
      xAxis: {
        type: "value",
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.07)" } },
        axisLabel: { color: "#A1A1AA", fontSize: 10 },
      },
      yAxis: {
        type: "category",
        data: axisLabels,
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } },
        axisTick: { show: false },
        axisLabel: { color: "#E4E4E7", width: 100, overflow: "truncate", fontSize: 11 },
      },
      series: [
        {
          name: "Repetitive",
          type: "bar",
          stack: "time",
          barWidth: "60%",
          itemStyle: { color: "#F59E0B", borderRadius: [6, 6, 6, 6] },
          data: labels.map((item) => item.repetitive),
        },
        {
          name: "Other",
          type: "bar",
          stack: "time",
          barWidth: "60%",
          itemStyle: { color: "rgba(148,163,184,0.25)", borderRadius: [6, 6, 6, 6] },
          data: labels.map((item) => Math.max(0, item.total - item.repetitive)),
        },
      ],
    };
  }, [seriesData]);

  const handleClick = (params: EChartsClickParams) => {
    const item = [...seriesData].sort((left, right) => right.total - left.total).slice(0, 10)[params.dataIndex ?? -1];

    if (!item) {
      return;
    }

    if (mode === "departments") {
      setDepartment(item.key);
      return;
    }

    if (mode === "tasks") {
      setTaskCategory(item.key);
    }
  };

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-3 shadow-dashboard-panel sm:p-4 md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">
            Time sink breakdown
          </p>
          <h2 className="text-lg font-semibold text-foreground sm:mt-1 sm:text-xl md:text-2xl">
            Task, app, department
          </h2>
        </div>
        <div className="flex rounded-full border border-white/10 bg-white/5 p-1 text-muted-foreground">
          {(["tasks", "apps", "departments"] as ViewMode[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={[
                "rounded-full px-2.5 py-1 text-[11px] capitalize transition sm:px-3 sm:py-1.5 sm:text-sm",
                mode === item ? "bg-accent text-[#141416]" : "hover:text-foreground",
              ].join(" ")}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 h-[280px] sm:mt-4 sm:h-[320px] md:h-[360px] lg:h-[420px]">
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} onEvents={{ click: handleClick }} />
      </div>
    </section>
  );
}

export default TimeSinkChart;