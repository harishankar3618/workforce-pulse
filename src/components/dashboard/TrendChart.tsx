"use client";

import dynamic from "next/dynamic";
import type { ComponentType, CSSProperties } from "react";
import { useEffect, useMemo, useRef } from "react";

import type { WeekMetrics } from "@/lib/types";

interface EChartsProps {
  option: Record<string, unknown>;
  style?: CSSProperties;
  onChartReady?: (instance: { resize: () => void }) => void;
}

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false }) as ComponentType<EChartsProps>;

interface TrendChartProps {
  weekly: WeekMetrics[];
}

export function TrendChart({ weekly }: TrendChartProps) {
  const chartRef = useRef<{ resize: () => void } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = containerRef.current;

    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }

    let frame = 0;

    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        chartRef.current?.resize();
      });
    });

    observer.observe(element);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const option = useMemo(() => {
    const labels = weekly.map((item) => item.week);

    return {
      backgroundColor: "transparent",
      grid: { left: 4, right: 12, top: 20, bottom: 16, containLabel: true },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(28,28,31,0.96)",
        borderColor: "rgba(255,255,255,0.08)",
        textStyle: { color: "#F4F4F5", fontSize: 11 },
      },
      legend: { textStyle: { color: "#A1A1AA", fontSize: 10 } },
      xAxis: {
        type: "category",
        data: labels,
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } },
        axisTick: { show: false },
        axisLabel: { color: "#A1A1AA", fontSize: 10 },
      },
      yAxis: {
        type: "value",
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.07)" } },
        axisLabel: { color: "#A1A1AA", fontSize: 10, formatter: (value: number) => `${value}%` },
      },
      series: [
        {
          name: "Repetitive share",
          type: "line",
          smooth: true,
          symbolSize: 6,
          lineStyle: { width: 2.5, color: "#F59E0B" },
          itemStyle: { color: "#F59E0B" },
          data: weekly.map((item) => Math.round(item.repShare * 100)),
        },
        {
          name: "Logged min /10",
          type: "line",
          smooth: true,
          symbolSize: 4,
          lineStyle: { width: 1.5, color: "rgba(148,163,184,0.9)" },
          itemStyle: { color: "rgba(148,163,184,0.9)" },
          data: weekly.map((item) => Math.round(item.totalMinutes / 10)),
        },
      ],
    };
  }, [weekly]);

  return (
    <section className="min-w-0 rounded-2xl border border-border/70 bg-card p-3 shadow-dashboard-panel sm:p-4 md:p-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">
          Weekly trend
        </p>
        <h2 className="mt-1 text-lg font-semibold text-foreground sm:mt-2 sm:text-xl md:text-2xl">
          Repetition over time
        </h2>
      </div>

      <div ref={containerRef} className="mt-3 min-w-0 overflow-hidden h-[260px] sm:mt-4 sm:h-[300px] md:h-[340px] lg:h-[420px]">
        <ReactECharts onChartReady={(instance) => (chartRef.current = instance)} option={option} style={{ height: "100%", width: "100%" }} />
      </div>
    </section>
  );
}

export default TrendChart;