import { create } from "zustand";

import { GET_HVAC_DETAILS } from "@/services";
import {
  HVACDetails,
  HVACRecommendationEvidence,
  TelemetryMetric,
  TelemetryStatus,
} from "@/types";

type HVACDetailsState = {
  details: HVACDetails | null;
  loading: boolean;
  error: string | null;
  fetchHVACDetails: (unitId: string) => Promise<void>;
};

const normalizeUnitId = (unitId: string) => unitId.replace(/\s+/g, "_").toUpperCase();

const prettify = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

const toMetricStatus = (isWarning: boolean): TelemetryStatus =>
  isWarning ? "warning" : "normal";

const buildTrend = (changePct: number) => {
  const intensity = Math.min(Math.abs(changePct) / 100, 1);
  return [0.35, 0.45, 0.55, 0.7, 0.35 + intensity * 0.55].map((v) =>
    Number(v.toFixed(2)),
  );
};

const buildTelemetry = (evidence: HVACRecommendationEvidence): TelemetryMetric[] => {
  const airflowRatio =
    evidence.baseline_airflow > 0
      ? evidence.avg_airflow / evidence.baseline_airflow
      : 0.72;

  const pressureValue = evidence.avg_pressure ?? 1.2;

  return [
    {
      key: "vibration",
      label: "VIBRATION",
      value: (evidence.avg_vibration * 24).toFixed(1),
      unit: "mm/s",
      status: toMetricStatus(
        evidence.vibration_change_pct > 20 || evidence.high_vibration_events >= 3,
      ),
      trend: buildTrend(evidence.vibration_change_pct),
    },
    {
      key: "temperature",
      label: "TEMPERATURE",
      value: String(Math.round(evidence.avg_temperature)),
      unit: "°C",
      status: toMetricStatus(
        evidence.temperature_change_pct > 5 || evidence.high_temperature_events >= 3,
      ),
      delta: `${evidence.temperature_change_pct >= 0 ? "↑" : "↓"} ${Math.abs(evidence.temperature_change_pct).toFixed(0)}% vs Mean`,
    },
    {
      key: "airflow",
      label: "AIRFLOW",
      value: String(Math.round(evidence.avg_airflow)),
      unit: "CFM",
      status: toMetricStatus(
        evidence.airflow_change_pct < -15 || evidence.low_airflow_events >= 3,
      ),
      progress: Math.max(0, Math.min(1, airflowRatio)),
    },
    {
      key: "pressure",
      label: "PRESSURE",
      value: pressureValue.toFixed(1),
      unit: "PSI",
      status: toMetricStatus(pressureValue < 0.8 || pressureValue > 1.5),
      range: "NORMAL RANGE: 0.8 - 1.5",
    },
  ];
};

const normalizeHVACDetails = (data: unknown): HVACDetails => {
  const payload = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const recommendationRaw =
    payload.recommendation && typeof payload.recommendation === "object"
      ? (payload.recommendation as Record<string, unknown>)
      : {};

  const evidenceRaw =
    recommendationRaw.evidence && typeof recommendationRaw.evidence === "object"
      ? (recommendationRaw.evidence as Record<string, unknown>)
      : {};

  const evidence: HVACRecommendationEvidence = {
    high_vibration_events: Number(evidenceRaw.high_vibration_events ?? 0),
    low_airflow_events: Number(evidenceRaw.low_airflow_events ?? 0),
    high_power_events: Number(evidenceRaw.high_power_events ?? 0),
    high_temperature_events: Number(evidenceRaw.high_temperature_events ?? 0),
    avg_vibration: Number(evidenceRaw.avg_vibration ?? 0),
    avg_airflow: Number(evidenceRaw.avg_airflow ?? 0),
    avg_power: Number(evidenceRaw.avg_power ?? 0),
    avg_temperature: Number(evidenceRaw.avg_temperature ?? 0),
    worst_anomaly_score: Number(evidenceRaw.worst_anomaly_score ?? 0),
    baseline_vibration: Number(evidenceRaw.baseline_vibration ?? 0),
    baseline_airflow: Number(evidenceRaw.baseline_airflow ?? 0),
    baseline_power: Number(evidenceRaw.baseline_power ?? 0),
    baseline_temperature: Number(evidenceRaw.baseline_temperature ?? 0),
    vibration_change_pct: Number(evidenceRaw.vibration_change_pct ?? 0),
    airflow_change_pct: Number(evidenceRaw.airflow_change_pct ?? 0),
    power_change_pct: Number(evidenceRaw.power_change_pct ?? 0),
    temperature_change_pct: Number(evidenceRaw.temperature_change_pct ?? 0),
    avg_pressure:
      evidenceRaw.avg_pressure !== undefined
        ? Number(evidenceRaw.avg_pressure)
        : undefined,
  };

  const recommendations = Array.isArray(recommendationRaw.recommendations)
    ? recommendationRaw.recommendations.map((item) => String(item))
    : [];

  return {
    unit_id: String(payload.unit_id ?? recommendationRaw.unit_id ?? "HVAC_1"),
    health_score: Number(payload.health_score ?? 0),
    status: String(payload.status ?? "critical"),
    anomaly_percentage: Number(payload.anomaly_percentage ?? 0),
    recommendation: {
      unit_id: String(recommendationRaw.unit_id ?? payload.unit_id ?? "HVAC_1"),
      priority: String(recommendationRaw.priority ?? "urgent"),
      confidence: String(recommendationRaw.confidence ?? "high"),
      issue: String(recommendationRaw.issue ?? "Operating within expected parameters"),
      description: String(
        recommendationRaw.description ??
          "No additional diagnostic description available.",
      ),
      recommendations,
      evidence,
    },
  };
};

export const useHVACDetailsStore = create<HVACDetailsState>((set) => ({
  details: null,
  loading: false,
  error: null,
  fetchHVACDetails: async (unitId) => {
    set({ loading: true, error: null });

    try {
      const response = await GET_HVAC_DETAILS(normalizeUnitId(unitId));
      set({ details: normalizeHVACDetails(response.data), loading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch HVAC details";
      set({ details: null, loading: false, error: message });
    }
  },
}));

export const getDetailsTelemetry = (details: HVACDetails): TelemetryMetric[] =>
  buildTelemetry(details.recommendation.evidence);

export const getDetailsPriority = (details: HVACDetails) =>
  prettify(details.recommendation.priority);

export const getDetailsConfidence = (details: HVACDetails) =>
  prettify(details.recommendation.confidence);
