"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";

import type { TaskMetrics } from "@/lib/types";
import useFilterStore from "@/store/filterStore";

interface AutomationTableProps {
  tasks: TaskMetrics[];
}

export function AutomationTable({ tasks }: AutomationTableProps) {
  const setTaskCategory = useFilterStore((state) => state.setTaskCategory);
  const activeTaskCategory = useFilterStore((state) => state.taskCategory);
  const [sortAsc, setSortAsc] = useState(false);

  const sortedTasks = useMemo(() => {
    const copy = [...tasks];
    copy.sort((left, right) => {
      if (sortAsc) {
        return left.aps - right.aps || left.totalMinutes - right.totalMinutes;
      }

      return right.aps - left.aps || right.totalMinutes - left.totalMinutes;
    });
    return copy;
  }, [sortAsc, tasks]);

  return (
    <section className="rounded-[24px] border border-border/70 bg-card p-5 shadow-dashboard-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Automation priorities</p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">APS ranking</h2>
        </div>
        <button
          type="button"
          onClick={() => setSortAsc((value) => !value)}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-muted-foreground transition hover:border-white/20 hover:text-foreground"
        >
          {sortAsc ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Sort APS
        </button>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <th className="py-3 pr-3">Rank</th>
              <th className="py-3 pr-3">Task</th>
              <th className="py-3 pr-3">APS</th>
              <th className="py-3 pr-3">Rep rate</th>
              <th className="py-3 pr-3">Volume</th>
              <th className="py-3 pr-3">Employees</th>
              <th className="py-3 pr-3">INR / mo</th>
              <th className="py-3 pr-3">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.slice(0, 10).map((task) => {
              const active = activeTaskCategory === task.taskCategory;

              return (
                <tr
                  key={task.taskCategory}
                  onClick={() => setTaskCategory(task.taskCategory)}
                  className={[
                    "cursor-pointer border-b border-white/6 transition",
                    active ? "bg-accent/10" : "hover:bg-white/4",
                  ].join(" ")}
                >
                  <td className="py-4 pr-3 text-foreground">{task.rank}</td>
                  <td className="py-4 pr-3 font-medium text-foreground">{task.taskCategory}</td>
                  <td className="py-4 pr-3 text-foreground">{task.aps.toFixed(1)}</td>
                  <td className="py-4 pr-3 text-muted-foreground">{Math.round(task.repRate * 100)}%</td>
                  <td className="py-4 pr-3 text-muted-foreground">{Math.round(task.totalMinutes / 60)} hrs</td>
                  <td className="py-4 pr-3 text-muted-foreground">{task.employeeCount}</td>
                  <td className="py-4 pr-3 text-muted-foreground">₹{task.inrImpactMonth.toLocaleString("en-IN")}</td>
                  <td className="py-4 pr-3">
                    <span className={[
                      "rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                      task.confidence === "high"
                        ? "bg-emerald-500/10 text-emerald-300"
                        : task.confidence === "medium"
                          ? "bg-amber-500/10 text-amber-300"
                          : "bg-white/10 text-muted-foreground",
                    ].join(" ")}>
                      {task.confidence}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default AutomationTable;