import axios from "axios";

axios.defaults.baseURL = process.env.EXPO_PUBLIC_BASE_URL;

console.log(process.env.EXPO_PUBLIC_BASE_URL);

export const GET_HVAC_METRICS = async () => {
  return await axios.get("/hvac");
};

export const GET_HVAC_DETAILS = async (hvacId: string) => {
  return await axios.get(`/hvac/${hvacId}`);
};

export const GET_ACTIVE_ALERTS = async () => {
  return await axios.get("/alerts/active");
};

export const GET_ALERTS = async () => {
  return await axios.get("/alerts");
};

export const GET_WEEKLY_ANOMALY = async () => {
  return await axios.get("/stats/overview");
};

export const GET_EVENTS_DATA = async (hvacId: string, limit: number = 50) => {
  return await axios.get(`events/history/${hvacId}?limit=${limit}`);
};

export const GET_AI_ASSISTANT_EXPLAINATION = async (unitId: string) => {
  return await axios.get(`/assistant/explain/${unitId}`);
};

export const AI_ASSISTANT_CHAT = async (unitId: string, message: string) => {
  return await axios.post("/assistant/chat", {
    unit_id: unitId,
    question: message,
  });
};

export const RESOLVE_ALERT = async (alertId: number, notes: string) => {
  return await axios.patch(`/alerts/${alertId}/resolve`, {
    notes,
  });
};
