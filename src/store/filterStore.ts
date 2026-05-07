import { create } from "zustand";

export interface FilterState {
  department: string | null;
  taskCategory: string | null;
  week: string | null;
  setDepartment: (department: string | null) => void;
  setTaskCategory: (taskCategory: string | null) => void;
  setWeek: (week: string | null) => void;
  clearAll: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  department: null,
  taskCategory: null,
  week: null,
  setDepartment: (department) =>
    set({
      department,
      taskCategory: null,
    }),
  setTaskCategory: (taskCategory) => set({ taskCategory }),
  setWeek: (week) => set({ week }),
  clearAll: () =>
    set({
      department: null,
      taskCategory: null,
      week: null,
    }),
}));

export default useFilterStore;