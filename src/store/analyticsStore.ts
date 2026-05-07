import { create } from "zustand";

import type { AnalyticsResult } from "../lib/types.ts";

interface AnalyticsStoreState {
  data: AnalyticsResult | null;
  loading: boolean;
  error: string | null;
  lastLoadedAt: string | null;
  fetchAnalytics: (forceRefresh?: boolean) => Promise<void>;
  clearAnalytics: () => void;
}

export const useAnalyticsStore = create<AnalyticsStoreState>((set, get) => ({
  data: null,
  loading: false,
  error: null,
  lastLoadedAt: null,
  fetchAnalytics: async (forceRefresh = false) => {
    const current = get();

    if (current.data && !forceRefresh) {
      return;
    }

    set({ loading: true, error: null });

    try {
      const response = await fetch("/api/analytics", {
        cache: forceRefresh ? "no-store" : "default",
      });

      if (!response.ok) {
        throw new Error(`Analytics request failed with ${response.status}`);
      }

      const data = (await response.json()) as AnalyticsResult;
      set({
        data,
        loading: false,
        error: null,
        lastLoadedAt: new Date().toISOString(),
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
  clearAnalytics: () =>
    set({
      data: null,
      loading: false,
      error: null,
      lastLoadedAt: null,
    }),
}));

export default useAnalyticsStore;