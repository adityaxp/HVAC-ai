import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useColorScheme,
} from "react-native";
import { BarChart, LineChart } from "react-native-gifted-charts";
import { SafeAreaView } from "react-native-safe-area-context";

import { SkeletonLoader } from "@/components/SkeletonLoader";
import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useHomeTabStore } from "@/store/HomeTabStore";
import { useStatsTabStore } from "@/store/StatsTabStore";
import { HVACEventItem } from "@/types";

type MetricKey = "temp" | "pressure" | "airflow" | "vibration" | "power";

const METRICS: Array<{
  key: MetricKey;
  title: string;
  unit: string;
  color: string;
  chart: "line" | "bar";
}> = [
  {
    key: "temp",
    title: "Temperature",
    unit: "C",
    color: "#31B7FF",
    chart: "line",
  },
  {
    key: "pressure",
    title: "Pressure",
    unit: "bar",
    color: "#FF6C85",
    chart: "line",
  },
  {
    key: "airflow",
    title: "Airflow",
    unit: "m3/h",
    color: "#1ABC9C",
    chart: "bar",
  },
  {
    key: "vibration",
    title: "Vibration",
    unit: "g",
    color: "#A78BFA",
    chart: "line",
  },
  { key: "power", title: "Power", unit: "kW", color: "#F5A524", chart: "line" },
];
const HVAC_SERIES_COLORS = [
  "#31B7FF",
  "#FF6C85",
  "#1ABC9C",
  "#A78BFA",
  "#F5A524",
  "#22C55E",
];

const formatTimeLabel = (timestamp: string) => {
  const normalized = timestamp.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatMetricValue = (value: number, key: MetricKey) => {
  if (key === "vibration") return value.toFixed(3);
  if (key === "pressure") return value.toFixed(2);
  return value.toFixed(1);
};

const buildLineData = (events: HVACEventItem[], key: MetricKey) =>
  events.map((event, index) => ({
    value: Number(event[key]),
    label: index % 2 === 0 ? formatTimeLabel(event.timestamp) : "",
    hideDataPoint: false,
  }));

const buildBarData = (events: HVACEventItem[], key: MetricKey, color: string) =>
  events.map((event, index) => ({
    value: Number(event[key]),
    label: index % 2 === 0 ? formatTimeLabel(event.timestamp) : "",
    frontColor: color,
  }));

const prettifyUnitId = (unitId: string) => unitId.replace(/_/g, " ");

const index = () => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const theme = useTheme();
  const useLiquidGlass = Platform.OS === "ios" && isGlassEffectAPIAvailable();
  const { hvacData, fetchHVACMetrics } = useHomeTabStore();
  const { eventsData, allUnitsSeries, loading, error, fetchEventsData } =
    useStatsTabStore();
  const [dropdownPressed, setDropdownPressed] = useState(false);
  const [resetPressed, setResetPressed] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState("HVAC 1");

  useEffect(() => {
    if (!hvacData) {
      fetchHVACMetrics();
    }
  }, [fetchHVACMetrics, hvacData]);

  const hvacOptions = useMemo(() => {
    const units = (hvacData ?? []).map((item) =>
      item.unit_id.replace("_", " "),
    );
    return [...units, "All HVACs"];
  }, [hvacData]);

  const hvacUnitsOnly = useMemo(
    () => hvacOptions.filter((option) => option !== "All HVACs"),
    [hvacOptions],
  );

  useEffect(() => {
    if (!hvacOptions.length) return;
    if (!hvacOptions.includes(selectedUnit)) {
      setSelectedUnit(hvacOptions[0]);
    }
  }, [hvacOptions, selectedUnit]);

  useEffect(() => {
    if (!hvacUnitsOnly.length) return;
    fetchEventsData(selectedUnit, hvacUnitsOnly);
  }, [fetchEventsData, hvacUnitsOnly, selectedUnit]);

  useEffect(() => {
    if (error) {
      Alert.alert("Error", "Failed to fetch events data");
    }
  }, [error]);

  const lineRulesColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
  const chartTextColor = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)";

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <View style={styles.headerRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Select HVAC unit"
              onPressIn={() => setDropdownPressed(true)}
              onPressOut={() => setDropdownPressed(false)}
              onPress={() => setIsDropdownOpen((prev) => !prev)}
              style={({ pressed }) => [
                styles.dropdownButton,
                {
                  borderColor: useLiquidGlass
                    ? "rgba(255,255,255,0.22)"
                    : theme.backgroundElement,
                  backgroundColor: useLiquidGlass
                    ? "transparent"
                    : theme.backgroundElement,
                },
                pressed && styles.buttonPressed,
              ]}
            >
              {useLiquidGlass ? (
                <View style={styles.glassSurface} pointerEvents="none">
                  <GlassView
                    style={StyleSheet.absoluteFill}
                    glassEffectStyle={{
                      style: dropdownPressed ? "regular" : "clear",
                      animate: true,
                      animationDuration: 0.2,
                    }}
                    isInteractive
                  />
                </View>
              ) : null}
              <ThemedText type="subtitle" style={styles.dropdownText}>
                {selectedUnit}
              </ThemedText>
              <View
                style={[
                  styles.chevronCircle,
                  {
                    borderColor: useLiquidGlass
                      ? "rgba(255,255,255,0.22)"
                      : theme.backgroundSelected,
                    backgroundColor: theme.background,
                  },
                ]}
              >
                <SymbolView
                  name={
                    isDropdownOpen
                      ? { ios: "chevron.up", android: "keyboard_arrow_up" }
                      : { ios: "chevron.down", android: "keyboard_arrow_down" }
                  }
                  size={11}
                  tintColor={theme.text}
                />
              </View>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset stats filters"
              onPressIn={() => setResetPressed(true)}
              onPressOut={() => setResetPressed(false)}
              onPress={() => {
                setSelectedUnit(hvacOptions[0] ?? "HVAC 1");
                setIsDropdownOpen(false);
              }}
              style={({ pressed }) => [
                styles.resetButton,
                {
                  borderColor: useLiquidGlass
                    ? "rgba(255,255,255,0.22)"
                    : theme.backgroundElement,
                  backgroundColor: useLiquidGlass
                    ? "transparent"
                    : theme.backgroundElement,
                },
                pressed && styles.buttonPressed,
              ]}
            >
              {useLiquidGlass ? (
                <View style={styles.glassSurface} pointerEvents="none">
                  <GlassView
                    style={StyleSheet.absoluteFill}
                    glassEffectStyle={{
                      style: resetPressed ? "regular" : "clear",
                      animate: true,
                      animationDuration: 0.2,
                    }}
                    isInteractive
                  />
                </View>
              ) : null}
              <SymbolView
                name={{ ios: "arrow.counterclockwise", android: "refresh" }}
                size={18}
                tintColor={theme.text}
              />
            </Pressable>
          </View>

          {isDropdownOpen ? (
            <View
              style={[
                styles.dropdownMenu,
                {
                  backgroundColor: useLiquidGlass
                    ? "transparent"
                    : theme.backgroundElement,
                  borderColor: useLiquidGlass
                    ? "rgba(255,255,255,0.22)"
                    : isDark
                      ? "rgba(255,255,255,0.14)"
                      : "rgba(0,0,0,0.12)",
                },
              ]}
            >
              {useLiquidGlass ? (
                <View style={styles.glassSurface} pointerEvents="none">
                  <GlassView
                    style={StyleSheet.absoluteFill}
                    glassEffectStyle="regular"
                    isInteractive
                  />
                </View>
              ) : null}
              {hvacOptions.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => {
                    setSelectedUnit(option);
                    setIsDropdownOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.dropdownOption,
                    selectedUnit === option && {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.06)",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.18)"
                        : "rgba(0,0,0,0.12)",
                    },
                    pressed && styles.dropdownOptionPressed,
                  ]}
                >
                  <ThemedText type="smallBold">{option}</ThemedText>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.chartsWrap}>
            {Array.from({ length: 3 }).map((_, idx) => (
              <View
                key={`stats-skeleton-${idx}`}
                style={[
                  styles.chartCard,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                  },
                ]}
              >
                <SkeletonLoader style={styles.skeletonChartTitle} />
                <SkeletonLoader style={styles.skeletonChart} />
                <View style={styles.legendRow}>
                  <SkeletonLoader style={styles.skeletonLegendItem} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.chartsWrap}>
            <FlatList
              data={METRICS}
              keyExtractor={(metric) => metric.key}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => (
                <View style={styles.chartSeparator} />
              )}
              renderItem={({ item: metric }) => {
                const isAllSelected = selectedUnit === "All HVACs";
                const chartData =
                  metric.chart === "bar"
                    ? buildBarData(eventsData, metric.key, metric.color)
                    : buildLineData(eventsData, metric.key);
                const latest = eventsData.length
                  ? Number(eventsData[eventsData.length - 1][metric.key])
                  : 0;
                const allSeriesData = allUnitsSeries.map((series, index) => ({
                  unitId: series.unit_id,
                  color: HVAC_SERIES_COLORS[index % HVAC_SERIES_COLORS.length],
                  data: buildLineData(series.items, metric.key),
                }));

                return (
                  <View
                    style={[
                      styles.chartCard,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.backgroundSelected,
                      },
                    ]}
                  >
                    <View style={styles.chartHeader}>
                      <ThemedText type="subtitle" style={styles.chartTitle}>
                        {metric.title}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {isAllSelected
                          ? "All HVACs"
                          : `${formatMetricValue(latest, metric.key)} ${metric.unit}`}
                      </ThemedText>
                    </View>

                    {isAllSelected ? (
                      <LineChart
                        dataSet={allSeriesData.map((series) => ({
                          data: series.data,
                          color: series.color,
                          thickness: 2.5,
                          hideDataPoints: true,
                        }))}
                        height={160}
                        spacing={20}
                        yAxisTextStyle={{ color: chartTextColor, fontSize: 10 }}
                        xAxisLabelTextStyle={{
                          color: chartTextColor,
                          fontSize: 10,
                        }}
                        yAxisColor={lineRulesColor}
                        xAxisColor={lineRulesColor}
                        rulesColor={lineRulesColor}
                      />
                    ) : metric.chart === "bar" ? (
                      <BarChart
                        data={chartData}
                        height={150}
                        barWidth={18}
                        spacing={18}
                        hideYAxisText
                        hideRules
                        xAxisLabelTextStyle={{
                          color: chartTextColor,
                          fontSize: 10,
                        }}
                        xAxisColor={lineRulesColor}
                        yAxisColor={lineRulesColor}
                      />
                    ) : (
                      <LineChart
                        data={chartData}
                        areaChart
                        height={160}
                        color={metric.color}
                        thickness={3}
                        startFillColor={metric.color}
                        endFillColor={metric.color}
                        startOpacity={0.28}
                        endOpacity={0.04}
                        spacing={20}
                        hideDataPoints
                        yAxisTextStyle={{ color: chartTextColor, fontSize: 10 }}
                        xAxisLabelTextStyle={{
                          color: chartTextColor,
                          fontSize: 10,
                        }}
                        yAxisColor={lineRulesColor}
                        xAxisColor={lineRulesColor}
                        rulesColor={lineRulesColor}
                      />
                    )}

                    {isAllSelected && (
                      <View style={styles.legendWrap}>
                        {allSeriesData.map((series) => (
                          <View
                            key={`${metric.key}-${series.unitId}`}
                            style={styles.legendRow}
                          >
                            <View
                              style={[
                                styles.legendDot,
                                { backgroundColor: series.color },
                              ]}
                            />
                            <ThemedText type="small" themeColor="textSecondary">
                              {prettifyUnitId(series.unitId)}
                            </ThemedText>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              }}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.three,
  },
  scrollContent: {
    // paddingBottom: Spacing.six,
  },
  headerSection: {
    marginTop: Spacing.three,
    position: "relative",
    zIndex: 10,
    overflow: "visible",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 2,
  },
  dropdownButton: {
    flex: 1,
    maxWidth: 150,
    height: 50,
    borderRadius: 11,
    borderWidth: 0.8,
    paddingHorizontal: Spacing.three,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
    position: "relative",
  },
  dropdownText: {
    fontSize: 14,
    lineHeight: 18,
  },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  resetButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.three,
    overflow: "hidden",
    position: "relative",
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
  },
  glassSurface: {
    ...StyleSheet.absoluteFill,
  },
  dropdownMenu: {
    position: "absolute",
    top: 56,
    left: 0,
    width: 160,
    maxWidth: 200,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: Spacing.one,
    overflow: "hidden",
    zIndex: 20,
    elevation: 12,
  },
  dropdownOption: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderColor: "transparent",
  },
  dropdownOptionPressed: {
    opacity: 0.75,
  },
  chartsWrap: {
    marginTop: Spacing.three,
    gap: Spacing.one,
  },
  chartCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.two,
  },
  chartSeparator: {
    height: Spacing.two,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.one,
  },
  chartTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  legendRow: {
    marginTop: Spacing.half,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  legendWrap: {
    marginTop: Spacing.half,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },
  skeletonChartTitle: {
    width: 130,
    height: 18,
    borderRadius: 8,
    marginBottom: Spacing.two,
  },
  skeletonChart: {
    width: "100%",
    height: 148,
    borderRadius: 10,
  },
  skeletonLegendItem: {
    width: 100,
    height: 12,
    borderRadius: 6,
  },
});
