import { create } from "zustand";

import { GET_ACTIVE_ALERTS, GET_HVAC_METRICS, GET_WEEKLY_ANOMALY } from "@/services";
import { AlertItem, Alerts, HVACItem, WeeklyAnomaly } from "@/types";

type HVACMetricsResponse = {
  count: number;
  items: HVACItem[];
};

type HomeTabState = {
  hvacData: HVACItem[] | null;
  alertsData: AlertItem[] | null;
  weeklyAnomaly: WeeklyAnomaly | null;
  loading: boolean;
  alertsLoading: boolean;
  anomalyLoading: boolean;
  error: string | null;
  alertsError: string | null;
  anomalyError: string | null;
  fetchHVACMetrics: () => Promise<void>;
  fetchActiveAlerts: () => Promise<void>;
  fetchWeeklyAnomaly: () => Promise<void>;
};

export const useHomeTabStore = create<HomeTabState>((set) => ({
  hvacData: null,
  alertsData: null,
  weeklyAnomaly: null,
  loading: false,
  alertsLoading: false,
  anomalyLoading: false,
  error: null,
  alertsError: null,
  anomalyError: null,
  fetchHVACMetrics: async () => {
    set({ loading: true, error: null });

    try {
      const response = await GET_HVAC_METRICS();
      const data = response.data as HVACMetricsResponse;
      set({ hvacData: data.items ?? [], loading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch HVAC metrics";
      set({ error: message, loading: false });
    }
  },
  fetchActiveAlerts: async () => {
    set({ alertsLoading: true, alertsError: null });

    try {
      const response = await GET_ACTIVE_ALERTS();
      const data = response.data as Alerts;
      set({ alertsData: data.items ?? [], alertsLoading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch active alerts";
      set({ alertsError: message, alertsLoading: false });
    }
  },
  fetchWeeklyAnomaly: async () => {
    set({ anomalyLoading: true, anomalyError: null });

    try {
      const response = await GET_WEEKLY_ANOMALY();
      const data = response.data as WeeklyAnomaly;
      set({ weeklyAnomaly: data, anomalyLoading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch weekly anomaly data";
      set({ anomalyError: message, anomalyLoading: false });
    }
  },
}));
