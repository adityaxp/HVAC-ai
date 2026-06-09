import { create } from "zustand";

import { GET_ACTIVE_ALERTS, GET_ALERTS } from "@/services";
import { AlertItem, Alerts } from "@/types";

export type AlertScreenTab = "active" | "all";

type AlertScreenState = {
  activeAlerts: AlertItem[];
  allAlerts: AlertItem[];
  activeLoading: boolean;
  allLoading: boolean;
  error: string | null;
  selectedTab: AlertScreenTab;
  setSelectedTab: (tab: AlertScreenTab) => void;
  fetchActiveAlerts: () => Promise<void>;
  fetchAllAlerts: () => Promise<void>;
};

export const useAlertScreenStore = create<AlertScreenState>((set, get) => ({
  activeAlerts: [],
  allAlerts: [],
  activeLoading: false,
  allLoading: false,
  error: null,
  selectedTab: "active",
  setSelectedTab: (tab) => {
    set({ selectedTab: tab });
    if (tab === "all" && !get().allLoading && get().allAlerts.length === 0) {
      void get().fetchAllAlerts();
    }
  },
  fetchActiveAlerts: async () => {
    set({ activeLoading: true, error: null });

    try {
      const response = await GET_ACTIVE_ALERTS();
      const data = response.data as Alerts;
      set({ activeAlerts: data.items ?? [], activeLoading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch active alerts";
      set({ activeLoading: false, error: message });
    }
  },
  fetchAllAlerts: async () => {
    set({ allLoading: true, error: null });

    try {
      const response = await GET_ALERTS();
      const data = response.data as Alerts;
      set({ allAlerts: data.items ?? [], allLoading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch alerts";
      set({ allLoading: false, error: message });
    }
  },
}));
