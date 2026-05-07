"use client";

import { X } from "lucide-react";

import useFilterStore from "@/store/filterStore";

interface FilterBarProps {
  departments: string[];
  taskCategories: string[];
  weeks: string[];
}

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] transition sm:px-3 sm:py-1.5 sm:text-xs",
        "min-h-[28px] sm:min-h-[32px]",
        active
          ? "border-accent/60 bg-accent/10 text-accent"
          : "border-white/10 bg-white/3 text-muted-foreground hover:border-white/20 hover:text-foreground",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function FilterBar({ departments, taskCategories, weeks }: FilterBarProps) {
  const department = useFilterStore((state) => state.department);
  const taskCategory = useFilterStore((state) => state.taskCategory);
  const week = useFilterStore((state) => state.week);
  const setDepartment = useFilterStore((state) => state.setDepartment);
  const setTaskCategory = useFilterStore((state) => state.setTaskCategory);
  const setWeek = useFilterStore((state) => state.setWeek);
  const clearAll = useFilterStore((state) => state.clearAll);

  const hasActive = Boolean(department || taskCategory || week);

  return (
    <div className="space-y-3">
      {/* Department filters */}
      <div className="flex flex-wrap gap-2 overflow-x-auto pb-1.5 -mb-1.5 scrollbar-hide">
        <Chip active={!department} onClick={() => setDepartment(null)}>
          All departments
        </Chip>
        {departments.map((item) => (
          <Chip key={item} active={department === item} onClick={() => setDepartment(item)}>
            {item}
          </Chip>
        ))}
      </div>

      {/* Task category filters */}
      <div className="flex flex-wrap gap-2 overflow-x-auto pb-1.5 -mb-1.5 scrollbar-hide">
        <Chip active={!taskCategory} onClick={() => setTaskCategory(null)}>
          All tasks
        </Chip>
        {taskCategories.map((item) => (
          <Chip key={item} active={taskCategory === item} onClick={() => setTaskCategory(item)}>
            {item}
          </Chip>
        ))}
      </div>

      {/* Week filters + Clear */}
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1.5 -mb-1.5 scrollbar-hide">
        <Chip active={!week} onClick={() => setWeek(null)}>
          All weeks
        </Chip>
        {weeks.map((item) => (
          <Chip key={item} active={week === item} onClick={() => setWeek(item)}>
            {item}
          </Chip>
        ))}

        {hasActive ? (
          <button
            type="button"
            onClick={clearAll}
            className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/3 px-2 py-1 text-[10px] text-muted-foreground transition hover:border-white/20 hover:text-foreground sm:px-3 sm:py-1.5 sm:text-xs"
          >
            <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>Clear</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default FilterBar;