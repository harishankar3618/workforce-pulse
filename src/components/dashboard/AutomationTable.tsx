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
    <section className="min-w-0 rounded-2xl border border-border/70 bg-card p-3 shadow-dashboard-panel sm:p-4 md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">
            Automation priorities
          </p>
          <h2 className="text-lg font-semibold text-foreground sm:mt-1 sm:text-xl md:text-2xl">
            APS ranking
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setSortAsc((value) => !value)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-muted-foreground transition hover:border-white/20 hover:text-foreground sm:px-3 sm:text-sm"
        >
          {sortAsc ? <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
          <span>Sort</span>
        </button>
      </div>

      <div className="mt-4 -mx-3 sm:mt-5 sm:-mx-4 md:mt-5">
        <div className="max-w-full overflow-x-auto rounded-[16px] border border-white/8">
          <table className="w-full min-w-[720px] border-collapse text-xs sm:text-sm">
            <thead className="sticky top-0 bg-[#1C1C1F]">
              <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <th className="px-3 py-2.5 sm:px-4 sm:py-3">Rank</th>
                <th className="px-3 py-2.5 sm:px-4 sm:py-3">Task</th>
                <th className="px-3 py-2.5 sm:px-4 sm:py-3">APS</th>
                <th className="px-3 py-2.5 sm:px-4 sm:py-3">Rep</th>
                <th className="hidden px-3 py-2.5 sm:px-4 sm:py-3 md:table-cell">Volume</th>
                <th className="px-3 py-2.5 sm:px-4 sm:py-3">Emp</th>
                <th className="hidden px-3 py-2.5 sm:px-4 sm:py-3 lg:table-cell">INR / mo</th>
                <th className="px-3 py-2.5 sm:px-4 sm:py-3">Conf</th>
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
                    <td className="px-3 py-3 sm:px-4 sm:py-4 text-foreground">{task.rank}</td>
                    <td className="px-3 py-3 sm:px-4 sm:py-4 font-medium text-foreground">{task.taskCategory}</td>
                    <td className="px-3 py-3 sm:px-4 sm:py-4 text-foreground">{task.aps.toFixed(1)}</td>
                    <td className="px-3 py-3 sm:px-4 sm:py-4 text-muted-foreground">{Math.round(task.repRate * 100)}%</td>
                    <td className="hidden px-3 py-3 sm:px-4 sm:py-4 text-muted-foreground md:table-cell">{Math.round(task.totalMinutes / 60)} hrs</td>
                    <td className="px-3 py-3 sm:px-4 sm:py-4 text-muted-foreground">{task.employeeCount}</td>
                    <td className="hidden px-3 py-3 sm:px-4 sm:py-4 text-muted-foreground lg:table-cell">
                      ₹{task.inrImpactMonth.toLocaleString("en-IN")}
                    </td>
                    <td className="px-3 py-3 sm:px-4 sm:py-4">
                      <span
                        className={[
                          "inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] sm:px-2.5 sm:py-1",
                          task.confidence === "high"
                            ? "bg-emerald-500/10 text-emerald-300"
                            : task.confidence === "medium"
                              ? "bg-amber-500/10 text-amber-300"
                              : "bg-white/10 text-muted-foreground",
                        ].join(" ")}
                      >
                        {task.confidence}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default AutomationTable;