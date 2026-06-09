import { Platform } from "react-native";

import { HVACItem } from "@/types";

import HVACStatusWidget, {
  type HVACStatusWidgetProps,
  type HVACWidgetUnit,
} from "./HVACStatusWidget";

const isCritical = (item: HVACItem) =>
  item.status?.toLowerCase() !== "healthy" || item.health_score < 70;

const toWidgetUnit = (item: HVACItem): HVACWidgetUnit => {
  const critical = isCritical(item);
  return {
    id: item.unit_id,
    name: item.unit_id.replace(/_/g, " "),
    status: critical ? "Needs attention" : "Stable",
    health: Math.round(item.health_score),
    critical,
  };
};

export const buildHVACWidgetProps = (
  items: HVACItem[],
): HVACStatusWidgetProps => {
  const units = items.map(toWidgetUnit);
  // Surface units that need attention first so small/medium sizes stay useful.
  units.sort((a, b) => Number(b.critical) - Number(a.critical) || a.health - b.health);

  return {
    units,
    healthyCount: items.filter((item) => !isCritical(item)).length,
    totalCount: items.length,
  };
};

/**
 * Pushes the latest HVAC fleet snapshot to the iOS home screen widget.
 * No-op on platforms without WidgetKit support.
 */
export const syncHVACWidget = (items: HVACItem[] | null | undefined) => {
  if (Platform.OS !== "ios" || !items) {
    return;
  }

  try {
    HVACStatusWidget.updateSnapshot(buildHVACWidgetProps(items));
  } catch (error) {
    if (__DEV__) {
      console.warn("[widget] Failed to update HVAC widget snapshot", error);
    }
  }
};
