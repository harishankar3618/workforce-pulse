"use client";

import dynamic from "next/dynamic";
import type { ComponentType, CSSProperties } from "react";
import { useMemo } from "react";

import type { WeekMetrics } from "@/lib/types";

interface EChartsProps {
  option: Record<string, unknown>;
  style?: CSSProperties;
}

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false }) as ComponentType<EChartsProps>;

interface TrendChartProps {
  weekly: WeekMetrics[];
}

export function TrendChart({ weekly }: TrendChartProps) {
  const option = useMemo(() => {
    const labels = weekly.map((item) => item.week);

    return {
      backgroundColor: "transparent",
      grid: { left: 8, right: 18, top: 24, bottom: 18, containLabel: true },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(28,28,31,0.96)",
        borderColor: "rgba(255,255,255,0.08)",
        textStyle: { color: "#F4F4F5" },
      },
      legend: { textStyle: { color: "#A1A1AA" } },
      xAxis: {
        type: "category",
        data: labels,
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } },
        axisTick: { show: false },
        axisLabel: { color: "#A1A1AA" },
      },
      yAxis: {
        type: "value",
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.07)" } },
        axisLabel: { color: "#A1A1AA", formatter: (value: number) => `${value}%` },
      },
      series: [
        {
          name: "Repetitive share",
          type: "line",
          smooth: true,
          symbolSize: 8,
          lineStyle: { width: 3, color: "#F59E0B" },
          itemStyle: { color: "#F59E0B" },
          data: weekly.map((item) => Math.round(item.repShare * 100)),
        },
        {
          name: "Logged minutes / 10",
          type: "line",
          smooth: true,
          symbolSize: 8,
          lineStyle: { width: 2, color: "rgba(148,163,184,0.9)" },
          itemStyle: { color: "rgba(148,163,184,0.9)" },
          data: weekly.map((item) => Math.round(item.totalMinutes / 10)),
        },
      ],
    };
  }, [weekly]);

  return (
    <section className="rounded-[24px] border border-border/70 bg-card p-5 shadow-dashboard-panel">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Weekly trend</p>
        <h2 className="mt-2 text-2xl font-semibold text-foreground">Repetition over time</h2>
      </div>

      <div className="mt-5 h-[420px]">
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
      </div>
    </section>
  );
}

export default TrendChart;