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
    <section className="rounded-2xl border border-border/70 bg-card p-3 shadow-dashboard-panel sm:p-4 md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">
            Employee table
          </p>
          <h2 className="text-lg font-semibold text-foreground sm:mt-1 sm:text-xl md:text-2xl">
            Filtered workforce view
          </h2>
        </div>
        <div className="text-right text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:text-xs">
          {visibleEmployees.length} visible
        </div>
      </div>

      <div className="mt-3 -mx-3 sm:-mx-0">
        <div className="overflow-x-auto rounded-[16px] border border-white/8">
          <div className="max-h-[400px] sm:max-h-[440px] overflow-auto">
            <table className="w-full min-w-[700px] border-collapse text-[11px] sm:text-sm">
              <thead className="sticky top-0 bg-[#1C1C1F]">
                <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="px-2.5 py-2 sm:px-4 sm:py-3">
                    <button
                      type="button"
                      onClick={() => toggleSort("employeeId")}
                      className="inline-flex items-center gap-1 text-left transition hover:text-foreground"
                    >
                      Employee
                      {sortKey === "employeeId" ? (
                        descending ? <ChevronDown className="ml-1 h-3 w-3 sm:h-4 sm:w-4" /> : <ChevronUp className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
                      ) : null}
                    </button>
                  </th>
                  <th className="hidden px-2.5 py-2 sm:px-4 sm:py-3 sm:table-cell">
                    <button
                      type="button"
                      onClick={() => toggleSort("department")}
                      className="inline-flex items-center gap-1 text-left transition hover:text-foreground"
                    >
                      Dept
                      {sortKey === "department" ? (
                        descending ? <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" /> : <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
                      ) : null}
                    </button>
                  </th>
                  <th className="px-2.5 py-2 sm:px-4 sm:py-3">
                    <button
                      type="button"
                      onClick={() => toggleSort("totalMinutes")}
                      className="inline-flex items-center gap-1 text-left transition hover:text-foreground"
                    >
                      Hours
                      {sortKey === "totalMinutes" ? (
                        descending ? <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" /> : <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
                      ) : null}
                    </button>
                  </th>
                  <th className="px-2.5 py-2 sm:px-4 sm:py-3">
                    <button
                      type="button"
                      onClick={() => toggleSort("repetitiveShare")}
                      className="inline-flex items-center gap-1 text-left transition hover:text-foreground"
                    >
                      Rep
                      {sortKey === "repetitiveShare" ? (
                        descending ? <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" /> : <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
                      ) : null}
                    </button>
                  </th>
                  <th className="hidden px-2.5 py-2 sm:px-4 sm:py-3 md:table-cell">
                    <button
                      type="button"
                      onClick={() => toggleSort("inrCostMonth")}
                      className="inline-flex items-center gap-1 text-left transition hover:text-foreground"
                    >
                      INR
                      {sortKey === "inrCostMonth" ? (
                        descending ? <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" /> : <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
                      ) : null}
                    </button>
                  </th>
                  <th className="px-2.5 py-2 sm:px-4 sm:py-3">Top task</th>
                </tr>
              </thead>
              <tbody>
                {visibleEmployees.flatMap((employee) => {
                  const expanded = expandedEmployeeId === employee.employeeId;

                  return [
                    <tr
                      key={employee.employeeId}
                      onClick={() => setExpandedEmployeeId(expanded ? null : employee.employeeId)}
                      className="cursor-pointer border-b border-white/6 transition hover:bg-white/4"
                    >
                      <td className="px-2.5 py-2.5 font-medium text-foreground sm:px-4 sm:py-4">
                        {employee.employeeId}
                      </td>
                      <td className="hidden px-2.5 py-2.5 text-muted-foreground sm:table-cell sm:px-4 sm:py-4">
                        {employee.department}
                      </td>
                      <td className="px-2.5 py-2.5 text-muted-foreground sm:px-4 sm:py-4">
                        {Math.round(employee.totalMinutes / 60)}h
                      </td>
                      <td className="px-2.5 py-2.5 text-muted-foreground sm:px-4 sm:py-4">
                        {Math.round(employee.repetitiveShare * 100)}%
                      </td>
                      <td className="hidden px-2.5 py-2.5 text-muted-foreground md:table-cell md:px-4 md:py-4">
                        {employee.inrCostMonth === null ? "n/a" : `₹${employee.inrCostMonth.toLocaleString("en-IN")}`}
                      </td>
                      <td className="px-2.5 py-2.5 text-right text-xs font-medium text-foreground sm:px-4 sm:py-4 sm:text-left">
                        <span className="line-clamp-1">{employee.topTasks[0]?.taskCategory ?? "None"}</span>
                        {expanded ? <ChevronUp className="ml-1 inline h-3.5 w-3.5 sm:ml-2 sm:h-4 sm:w-4" /> : <ChevronDown className="ml-1 inline h-3.5 w-3.5 sm:ml-2 sm:h-4 sm:w-4" />}
                      </td>
                    </tr>,
                    expanded ? (
                      <tr
                        key={`${employee.employeeId}-expanded`}
                        className="border-b border-white/6 bg-white/3"
                      >
                        <td colSpan={6} className="px-2.5 py-3 sm:px-4 sm:py-4">
                          <div className="space-y-2 sm:grid sm:gap-2 sm:space-y-0 sm:grid-cols-2 md:grid-cols-3">
                            <div className="sm:hidden">
                              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                                Total hours
                              </p>
                              <p className="mt-1 text-sm font-semibold text-foreground">
                                {Math.round(employee.totalMinutes / 60)} hrs
                              </p>
                            </div>
                            <div className="md:hidden">
                              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                                Monthly INR
                              </p>
                              <p className="mt-1 text-sm font-semibold text-foreground">
                                {employee.inrCostMonth === null ? "n/a" : `₹${employee.inrCostMonth.toLocaleString("en-IN")}`}
                              </p>
                            </div>
                            {employee.topTasks.slice(0, 3).map((task) => (
                              <div
                                key={task.taskCategory}
                                className="rounded-xl border border-white/8 bg-[#242428] p-2.5 sm:p-3"
                              >
                                <p className="text-xs font-semibold text-foreground sm:text-sm line-clamp-1">
                                  {task.taskCategory}
                                </p>
                                <p className="mt-1.5 text-[10px] leading-4 text-muted-foreground sm:mt-2 sm:text-xs">
                                  {Math.round(task.totalMinutes / 60)}h · {Math.round(task.repetitiveMinutes / Math.max(1, task.totalMinutes || 1) * 100)}% repetitive
                                </p>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ) : null,
                  ];
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

export default EmployeeTable;