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
        "whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition",
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
        <Chip active={!department} onClick={() => setDepartment(null)}>
          All departments
        </Chip>
        {departments.map((item) => (
          <Chip key={item} active={department === item} onClick={() => setDepartment(item)}>
            {item}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
        <Chip active={!taskCategory} onClick={() => setTaskCategory(null)}>
          All tasks
        </Chip>
        {taskCategories.map((item) => (
          <Chip key={item} active={taskCategory === item} onClick={() => setTaskCategory(item)}>
            {item}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
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
            className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/3 px-3 py-1.5 text-sm text-muted-foreground transition hover:border-white/20 hover:text-foreground"
          >
            <X className="h-4 w-4" />
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default FilterBar;