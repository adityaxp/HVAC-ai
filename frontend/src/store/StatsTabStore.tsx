import { create } from "zustand";

import { GET_EVENTS_DATA } from "@/services";
import { HVACEventItem, HVACEventsResponse, HVACUnitSeries } from "@/types";

type StatsTabState = {
  eventsData: HVACEventItem[];
  allUnitsSeries: HVACUnitSeries[];
  eventsCache: Record<string, HVACEventItem[]>;
  loading: boolean;
  error: string | null;
  fetchEventsData: (selectedUnit: string, allUnits: string[]) => Promise<void>;
};

const normalizeUnitId = (unit: string) => unit.replace(/\s+/g, "_").toUpperCase();

const aggregateEvents = (events: HVACEventItem[]) => {
  const buckets = new Map<
    string,
    {
      timestamp: string;
      temp: number;
      pressure: number;
      airflow: number;
      vibration: number;
      power: number;
      count: number;
    }
  >();

  events.forEach((event) => {
    const key = event.timestamp;
    const existing = buckets.get(key);
    if (existing) {
      existing.temp += event.temp;
      existing.pressure += event.pressure;
      existing.airflow += event.airflow;
      existing.vibration += event.vibration;
      existing.power += event.power;
      existing.count += 1;
      return;
    }

    buckets.set(key, {
      timestamp: event.timestamp,
      temp: event.temp,
      pressure: event.pressure,
      airflow: event.airflow,
      vibration: event.vibration,
      power: event.power,
      count: 1,
    });
  });

  return Array.from(buckets.values())
    .map((bucket, index) => ({
      id: index + 1,
      unit_id: "ALL_HVACS",
      timestamp: bucket.timestamp,
      temp: bucket.temp / bucket.count,
      pressure: bucket.pressure / bucket.count,
      airflow: bucket.airflow / bucket.count,
      vibration: bucket.vibration / bucket.count,
      power: bucket.power / bucket.count,
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

export const useStatsTabStore = create<StatsTabState>((set) => ({
  eventsData: [],
  allUnitsSeries: [],
  eventsCache: {},
  loading: false,
  error: null,
  fetchEventsData: async (selectedUnit, allUnits) => {
    set({ loading: true, error: null });

    try {
      if (selectedUnit === "All HVACs") {
        const unitIds = allUnits.map(normalizeUnitId);
        const { eventsCache } = useStatsTabStore.getState();
        const missingUnitIds = unitIds.filter((unitId) => !eventsCache[unitId]);

        const responses = await Promise.all(
          missingUnitIds.map((unitId) => GET_EVENTS_DATA(unitId)),
        );

        const nextCache = { ...eventsCache };
        missingUnitIds.forEach((unitId, index) => {
          const data = responses[index].data as HVACEventsResponse;
          nextCache[unitId] = [...(data.items ?? [])].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
          );
        });

        const series = unitIds.map((unitId) => ({
          unit_id: unitId,
          items: nextCache[unitId] ?? [],
        }));

        const merged = series.flatMap((entry) => entry.items);
        set({
          eventsCache: nextCache,
          allUnitsSeries: series,
          eventsData: aggregateEvents(merged),
          loading: false,
        });
        return;
      }

      const unitId = normalizeUnitId(selectedUnit);
      const { eventsCache } = useStatsTabStore.getState();

      if (eventsCache[unitId]) {
        set({ eventsData: eventsCache[unitId], allUnitsSeries: [], loading: false });
        return;
      }

      const response = await GET_EVENTS_DATA(unitId);
      const data = response.data as HVACEventsResponse;
      const sorted = [...(data.items ?? [])].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

      set({
        eventsData: sorted,
        allUnitsSeries: [],
        eventsCache: { ...eventsCache, [unitId]: sorted },
        loading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch events data";
      set({ error: message, loading: false, eventsData: [], allUnitsSeries: [] });
    }
  },
}));
