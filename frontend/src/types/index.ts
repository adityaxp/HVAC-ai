export type HVACItem = {
  unit_id: string;
  health_score: number;
  status: string;
  priority: string;
  confidence: string;
  issue: string;
};

export type AlertItem = {
  id: number;
  unit_id: string;
  severity: "urgent" | "high" | "medium" | "low";
  title: string;
  message: string;
  created_at: string;
  resolved: 0 | 1;
};

export type Alerts = {
  count: number;
  items: AlertItem[];
};

export type AnomalyTrendItem = {
  day: string;
  count: number;
};

export type WeeklyAnomaly = {
  total_units: number;
  healthy_units: number;
  critical_units: number;
  active_alerts: number;
  average_health_score: number;
  anomaly_trend: AnomalyTrendItem[];
};

export type HVACEventItem = {
  id: number;
  timestamp: string;
  unit_id: string;
  temp: number;
  pressure: number;
  airflow: number;
  vibration: number;
  power: number;
};

export type HVACEventsResponse = {
  unit_id: string;
  count: number;
  items: HVACEventItem[];
};

export type HVACUnitSeries = {
  unit_id: string;
  items: HVACEventItem[];
};

export type HVACRecommendationEvidence = {
  high_vibration_events: number;
  low_airflow_events: number;
  high_power_events: number;
  high_temperature_events: number;
  avg_vibration: number;
  avg_airflow: number;
  avg_power: number;
  avg_temperature: number;
  worst_anomaly_score: number;
  baseline_vibration: number;
  baseline_airflow: number;
  baseline_power: number;
  baseline_temperature: number;
  vibration_change_pct: number;
  airflow_change_pct: number;
  power_change_pct: number;
  temperature_change_pct: number;
  avg_pressure?: number;
};

export type HVACRecommendation = {
  unit_id: string;
  priority: string;
  confidence: string;
  issue: string;
  description: string;
  recommendations: string[];
  evidence: HVACRecommendationEvidence;
};

export type HVACDetails = {
  unit_id: string;
  health_score: number;
  status: string;
  anomaly_percentage: number;
  recommendation: HVACRecommendation;
};

export type TelemetryStatus = "warning" | "normal";

export type TelemetryMetric = {
  key: string;
  label: string;
  value: string;
  unit: string;
  status: TelemetryStatus;
  delta?: string;
  range?: string;
  progress?: number;
  trend?: number[];
};
