"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";

import type { EmployeeMetrics } from "@/lib/types";
import useFilterStore from "@/store/filterStore";

interface EmployeeTableProps {
  employees: EmployeeMetrics[];
}

type SortKey = "employeeId" | "department" | "totalMinutes" | "repetitiveShare" | "inrCostMonth";

export function EmployeeTable({ employees }: EmployeeTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("repetitiveShare");
  const [descending, setDescending] = useState(true);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const department = useFilterStore((state) => state.department);
  const taskCategory = useFilterStore((state) => state.taskCategory);

  const sortedEmployees = useMemo(() => {
    const copy = [...employees];

    copy.sort((left, right) => {
      const leftValue =
        sortKey === "employeeId"
          ? left.employeeId
          : sortKey === "department"
            ? left.department
            : sortKey === "repetitiveShare"
              ? left.repetitiveShare
              : sortKey === "inrCostMonth"
                ? left.inrCostMonth ?? 0
                : left.totalMinutes;
      const rightValue =
        sortKey === "employeeId"
          ? right.employeeId
          : sortKey === "department"
            ? right.department
            : sortKey === "repetitiveShare"
              ? right.repetitiveShare
              : sortKey === "inrCostMonth"
                ? right.inrCostMonth ?? 0
                : right.totalMinutes;

      if (typeof leftValue === "string" && typeof rightValue === "string") {
        return descending ? rightValue.localeCompare(leftValue) : leftValue.localeCompare(rightValue);
      }

      const leftNumber = typeof leftValue === "number" ? leftValue : 0;
      const rightNumber = typeof rightValue === "number" ? rightValue : 0;

      return descending ? rightNumber - leftNumber : leftNumber - rightNumber;
    });

    return copy;
  }, [descending, employees, sortKey]);

  const visibleEmployees = sortedEmployees.filter((employee) => {
    if (department && employee.department !== department) {
      return false;
    }

    if (taskCategory && !employee.topTasks.some((task) => task.taskCategory === taskCategory)) {
      return false;
    }

    return true;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setDescending((value) => !value);
      return;
    }

    setSortKey(key);
    setDescending(true);
  };

  return (
    <section className="rounded-[24px] border border-border/70 bg-card p-5 shadow-dashboard-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Employee table</p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">Filtered workforce view</h2>
        </div>
        <div className="text-right text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {visibleEmployees.length} visible
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-[20px] border border-white/8">
        <div className="max-h-[440px] overflow-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-[#1C1C1F]">
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {[
                  ["employeeId", "Employee"],
                  ["department", "Department"],
                  ["totalMinutes", "Total hrs"],
                  ["repetitiveShare", "Rep share"],
                  ["inrCostMonth", "INR / mo"],
                ].map(([key, label]) => (
                  <th key={key} className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleSort(key as SortKey)}
                      className="inline-flex items-center gap-1 text-left transition hover:text-foreground"
                    >
                      {label}
                      {sortKey === key ? (
                        descending ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronUp className="h-4 w-4" />
                        )
                      ) : null}
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3">Top task</th>
              </tr>
            </thead>
            <tbody>
              {visibleEmployees.flatMap((employee) => {
                const expanded = expandedEmployeeId === employee.employeeId;
                const rows = [
                  <tr
                    key={employee.employeeId}
                    onClick={() => setExpandedEmployeeId(expanded ? null : employee.employeeId)}
                    className="cursor-pointer border-b border-white/6 transition hover:bg-white/4"
                  >
                    <td className="hidden px-4 py-4 text-foreground sm:table-cell">{employee.employeeId}</td>
                    <td className="px-4 py-4 text-sm font-medium text-foreground md:text-base">
                      <div>{employee.employeeId}</div>
                      <div className="text-xs text-muted-foreground sm:hidden">{employee.department}</div>
                    </td>
                    <td className="hidden px-4 py-4 text-muted-foreground md:table-cell">{employee.department}</td>
                    <td className="hidden px-4 py-4 text-muted-foreground sm:table-cell">{Math.round(employee.totalMinutes / 60)} hrs</td>
                    <td className="px-4 py-4 text-muted-foreground">
                      <span className="inline-block sm:hidden">{Math.round(employee.repetitiveShare * 100)}%</span>
                      <span className="hidden sm:inline">{Math.round(employee.repetitiveShare * 100)}%</span>
                    </td>
                    <td className="hidden px-4 py-4 text-muted-foreground lg:table-cell">
                      {employee.inrCostMonth === null ? "n/a" : `₹${employee.inrCostMonth.toLocaleString("en-IN")}`}
                    </td>
                    <td className="px-4 py-4 text-right text-xs font-medium text-foreground sm:text-left">
                      {employee.topTasks[0]?.taskCategory ?? "None"}
                      {expanded ? <ChevronUp className="ml-2 inline h-4 w-4" /> : <ChevronDown className="ml-2 inline h-4 w-4" />}
                    </td>
                  </tr>,
                ];

                if (expanded) {
                  rows.push(
                    <tr key={`${employee.employeeId}-expanded`} className="border-b border-white/6 bg-white/3">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="space-y-3 sm:grid sm:gap-3 sm:grid-cols-2 md:grid-cols-3">
                          <div className="sm:hidden">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total hours</p>
                            <p className="mt-1 text-sm font-semibold text-foreground">{Math.round(employee.totalMinutes / 60)} hrs</p>
                          </div>
                          <div className="lg:hidden">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Monthly INR</p>
                            <p className="mt-1 text-sm font-semibold text-foreground">
                              {employee.inrCostMonth === null ? "n/a" : `₹${employee.inrCostMonth.toLocaleString("en-IN")}`}
                            </p>
                          </div>
                          {employee.topTasks.slice(0, 3).map((task) => (
                            <div key={task.taskCategory} className="rounded-2xl border border-white/8 bg-[#242428] p-3 sm:p-4">
                              <p className="text-sm font-semibold text-foreground">{task.taskCategory}</p>
                              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                {Math.round(task.totalMinutes / 60)} hrs · {Math.round(task.repetitiveMinutes / Math.max(1, task.totalMinutes || 1) * 100)}% repetitive
                              </p>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>,
                  );
                }

                return rows;
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default EmployeeTable;