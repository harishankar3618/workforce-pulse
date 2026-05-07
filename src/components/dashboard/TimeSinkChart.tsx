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
      grid: { left: 8, right: 16, top: 24, bottom: 18, containLabel: true },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(28,28,31,0.96)",
        borderColor: "rgba(255,255,255,0.08)",
        textStyle: { color: "#F4F4F5" },
      },
      xAxis: {
        type: "value",
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.07)" } },
        axisLabel: { color: "#A1A1AA" },
      },
      yAxis: {
        type: "category",
        data: axisLabels,
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } },
        axisTick: { show: false },
        axisLabel: { color: "#E4E4E7", width: 140, overflow: "truncate" },
      },
      series: [
        {
          name: "Repetitive",
          type: "bar",
          stack: "time",
          barWidth: 16,
          itemStyle: { color: "#F59E0B", borderRadius: [8, 8, 8, 8] },
          data: labels.map((item) => item.repetitive),
        },
        {
          name: "Other",
          type: "bar",
          stack: "time",
          barWidth: 16,
          itemStyle: { color: "rgba(148,163,184,0.25)", borderRadius: [8, 8, 8, 8] },
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
    <section className="rounded-[24px] border border-border/70 bg-card p-5 shadow-dashboard-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Time sink breakdown</p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">Task, app, department</h2>
        </div>
        <div className="flex rounded-full border border-white/10 bg-white/5 p-1 text-sm text-muted-foreground">
          {(["tasks", "apps", "departments"] as ViewMode[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={[
                "rounded-full px-3 py-1.5 capitalize transition",
                mode === item ? "bg-accent text-[#141416]" : "hover:text-foreground",
              ].join(" ")}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 h-[420px]">
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} onEvents={{ click: handleClick }} />
      </div>
    </section>
  );
}

export default TimeSinkChart;