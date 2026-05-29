import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { SymbolView } from "expo-symbols";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AlertDetailSheet } from "@/components/AlertDetailSheet";
import BottomSheetModal from "@/components/BottomSheetModal";
import {
  HealthGauge,
  healthColor,
  healthTrackColor,
} from "@/components/HealthGauge";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useHomeTabStore } from "@/store/HomeTabStore";
import { AlertItem, AnomalyTrendItem, HVACItem } from "@/types";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { scheduleLocalAlertNotification } from "@/utils/notifications";

const statusTone = (status: string) => {
  if (status === "critical")
    return { bg: "#FFEAEA", fg: "#B22A2A", label: "Critical" };
  if (status === "warning")
    return { bg: "#FFF4E6", fg: "#A56200", label: "Warning" };
  return { bg: "#EAF8EF", fg: "#197A3A", label: "Healthy" };
};

const connectivityTone = (status: string) => {
  if (status === "critical") {
    return { label: "Offline", color: "#E84D4D" };
  }
  return { label: "Online", color: "#34C759" };
};

type HomeListItem = HVACItem | { skeleton: true; id: string };
type RecentAlertListItem = AlertItem | { skeleton: true; id: string };
type TrendListItem = AnomalyTrendItem | { skeleton: true; id: string };
const TREND_MAX_FILL_PERCENT = 50;

const severityTone = (severity: AlertItem["severity"]) => {
  if (severity === "urgent")
    return { bg: "#FFE2E2", fg: "#C62020", label: "Urgent" };
  if (severity === "high")
    return { bg: "#FFEBD8", fg: "#B56500", label: "High" };
  if (severity === "medium")
    return { bg: "#FFF4D8", fg: "#A77D00", label: "Medium" };
  return { bg: "#E6F9ED", fg: "#1C7F45", label: "Low" };
};

const formatAlertTime = (value: string) => {
  const normalized = value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const index = () => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const theme = useTheme();
  const useLiquidGlass = Platform.OS === "ios" && isGlassEffectAPIAvailable();
  const [isPressed, setIsPressed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const {
    hvacData,
    alertsData,
    weeklyAnomaly,
    loading,
    alertsLoading,
    anomalyLoading,
    error,
    alertsError,
    anomalyError,
    fetchHVACMetrics,
    fetchActiveAlerts,
    fetchWeeklyAnomaly,
  } = useHomeTabStore();
  const alertCount =
    alertsData?.filter((item) => item.resolved === 0).length ?? 0;
  const trendData = weeklyAnomaly?.anomaly_trend ?? [];
  const trendMax = Math.max(...trendData.map((item) => item.count), 1);

  const bottomSheetRef = useRef<TrueSheet | null>(null);
  const notifiedAlertIdsRef = useRef<Set<number>>(new Set());
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);

  const selectedHvac = useMemo(
    () =>
      hvacData?.find((unit) => unit.unit_id === selectedAlert?.unit_id) ?? null,
    [hvacData, selectedAlert],
  );

  const closeAlertSheet = useCallback(() => {
    bottomSheetRef.current?.dismiss();
    setSelectedAlert(null);
  }, []);

  const openAlertSheet = useCallback((alert: AlertItem) => {
    setSelectedAlert(alert);
    bottomSheetRef.current?.present();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchHVACMetrics(),
        fetchActiveAlerts(),
        fetchWeeklyAnomaly(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchActiveAlerts, fetchHVACMetrics, fetchWeeklyAnomaly]);

  useEffect(() => {
    fetchHVACMetrics();
    fetchActiveAlerts();
    fetchWeeklyAnomaly();
  }, [fetchActiveAlerts, fetchHVACMetrics, fetchWeeklyAnomaly]);

  useEffect(() => {
    if (error) {
      Alert.alert("Error", "Failed to fetch HVAC metrics");
      console.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (alertsError) {
      Alert.alert("Error", "Failed to fetch active alerts");
      console.error(alertsError);
    }
  }, [alertsError]);

  useEffect(() => {
    if (anomalyError) {
      Alert.alert("Error", "Failed to fetch anomaly trend");
      console.error(anomalyError);
    }
  }, [anomalyError]);

  const listData: HomeListItem[] = loading
    ? [
        { skeleton: true, id: "skeleton-1" },
        { skeleton: true, id: "skeleton-2" },
        { skeleton: true, id: "skeleton-3" },
      ]
    : (hvacData ?? []);
  const hasHVACItems = (hvacData?.length ?? 0) > 0;
  const alertsListData: RecentAlertListItem[] = alertsLoading
    ? [
        { skeleton: true, id: "alert-skeleton-1" },
        { skeleton: true, id: "alert-skeleton-2" },
      ]
    : (alertsData ?? []);
  const trendListData: TrendListItem[] = anomalyLoading
    ? [
        { skeleton: true, id: "trend-skeleton-1" },
        { skeleton: true, id: "trend-skeleton-2" },
        { skeleton: true, id: "trend-skeleton-3" },
        { skeleton: true, id: "trend-skeleton-4" },
      ]
    : trendData;

  const renderHVACCard = useCallback(
    ({ item }: { item: HVACItem }) => {
      const tone = statusTone(item.status);
      const meterColor = healthColor(item.health_score);
      const meterTrackColor = healthTrackColor(item.health_score, isDark);
      const connectivity = connectivityTone(item.status);
      const riskLabel =
        item.health_score < 40
          ? "Needs attention"
          : item.health_score < 75
            ? "Watch closely"
            : "Stable";

      return (
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.backgroundSelected,
            },
          ]}
        >
          <View style={styles.cardTopRow}>
            <View style={styles.cardTitleWrap}>
              <View style={styles.cardTitleRow}>
                <View
                  style={[
                    styles.connectivityDot,
                    { backgroundColor: connectivity.color },
                  ]}
                />
                <ThemedText type="smallBold">
                  {item.unit_id.replace("_", " ")}
                </ThemedText>
              </View>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.riskText}
              >
                {riskLabel}
              </ThemedText>
            </View>
            <HealthGauge
              score={item.health_score}
              color={meterColor}
              trackColor={meterTrackColor}
              size={44}
            />
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.chip, { backgroundColor: tone.bg }]}>
              <ThemedText style={[styles.chipText, { color: tone.fg }]}>
                {tone.label}
              </ThemedText>
            </View>
            <View
              style={[
                styles.outlineChip,
                { borderColor: theme.backgroundSelected },
              ]}
            >
              <ThemedText type="small" style={styles.metaText}>
                Priority: {item.priority}
              </ThemedText>
            </View>
            <View
              style={[
                styles.outlineChip,
                { borderColor: theme.backgroundSelected },
              ]}
            >
              <ThemedText type="small" style={styles.metaText}>
                Confidence: {item.confidence}
              </ThemedText>
            </View>
          </View>

          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.issueText}
            numberOfLines={1}
          >
            {item.issue}
          </ThemedText>
        </View>
      );
    },
    [isDark, theme],
  );

  useEffect(() => {
    if (alertsLoading || !alertsData?.length) return;

    const activeAlerts = alertsData.filter((item) => item.resolved === 0);
    if (!activeAlerts.length) return;

    const notifyNewAlerts = async () => {
      for (const alert of activeAlerts) {
        if (notifiedAlertIdsRef.current.has(alert.id)) continue;

        notifiedAlertIdsRef.current.add(alert.id);
        await scheduleLocalAlertNotification(
          `${alert.unit_id.replace("_", " ")}  priority: ${alert.severity}`,
          alert.message,
        );
      }
    };

    void notifyNewAlerts();
  }, [alertsData, alertsLoading]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle">Softway Monitor</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Alerts, ${alertCount} unread`}
          onPressIn={() => setIsPressed(true)}
          onPressOut={() => setIsPressed(false)}
          style={({ pressed }) => [
            styles.alertButton,
            !useLiquidGlass && {
              borderColor: theme.backgroundElement,
              backgroundColor: theme.backgroundElement,
            },
            pressed && styles.alertButtonPressed,
          ]}
        >
          <View style={styles.alertButtonSurface} pointerEvents="none">
            {useLiquidGlass ? (
              <GlassView
                style={styles.alertButtonGlass}
                glassEffectStyle={{
                  style: isPressed ? "regular" : "clear",
                  animate: true,
                  animationDuration: 0.2,
                }}
                isInteractive
              />
            ) : null}
          </View>
          <Pressable onPress={() => router.push("/alerts")}>
            <SymbolView
              name={{ ios: "bell", android: "notifications" }}
              size={24}
              tintColor={theme.text}
            />
          </Pressable>
          {alertCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: theme.accent }]}>
              <ThemedText style={styles.badgeText}>{alertCount}</ThemedText>
            </View>
          ) : null}
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void onRefresh();
            }}
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }
      >
        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Online HVACs
          </ThemedText>
        <TouchableOpacity onPress={() => router.push("/hvac-details")}>
          <ThemedText type="smallBold" style={styles.detailedViewText}>
            Detailed View
          </ThemedText>
        </TouchableOpacity>
        </View>

        {loading || hasHVACItems ? (
          <FlatList<HomeListItem>
            horizontal
            data={listData}
            keyExtractor={(item) =>
              "skeleton" in item ? item.id : item.unit_id
            }
            style={styles.hvacList}
            renderItem={({ item }) =>
              "skeleton" in item ? (
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.backgroundSelected,
                    },
                  ]}
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardTitleWrap}>
                      <SkeletonLoader style={styles.skeletonTitle} />
                      <SkeletonLoader style={styles.skeletonSubtitle} />
                    </View>
                    <SkeletonLoader style={styles.skeletonGauge} />
                  </View>
                  <View style={styles.metaRow}>
                    <SkeletonLoader style={styles.skeletonChip} />
                    <SkeletonLoader style={styles.skeletonChip} />
                  </View>
                  <SkeletonLoader style={styles.skeletonIssue} />
                </View>
              ) : (
                renderHVACCard({ item })
              )
            }
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View
            style={[
              styles.emptyStateCard,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
              },
            ]}
          >
            <ThemedText type="smallBold">No HVAC units yet</ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.emptyStateText}
            >
              HVAC health cards will appear here once data is available.
            </ThemedText>
          </View>
        )}

        <View style={styles.alertSectionHeader}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Recent Alerts
          </ThemedText>
          <TouchableOpacity
            onPress={() => {
              router.push("/alerts");
            }}
          >
            <ThemedText type="smallBold" style={styles.detailedViewText}>
              View All
            </ThemedText>
          </TouchableOpacity>
        </View>

        <FlatList<RecentAlertListItem>
          data={alertsListData}
          style={styles.alertsList}
          keyExtractor={(item) =>
            "skeleton" in item ? item.id : String(item.id)
          }
          renderItem={({ item }) => {
            if ("skeleton" in item) {
              return (
                <View
                  style={[
                    styles.alertCard,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.backgroundSelected,
                    },
                  ]}
                >
                  <View style={styles.alertTopRow}>
                    <SkeletonLoader style={styles.skeletonAlertUnit} />
                    <SkeletonLoader style={styles.skeletonAlertStatus} />
                  </View>
                  <SkeletonLoader style={styles.skeletonAlertTitle} />
                  <SkeletonLoader style={styles.skeletonAlertMessage} />
                  <View style={styles.alertMetaRow}>
                    <SkeletonLoader style={styles.skeletonAlertTime} />
                  </View>
                </View>
              );
            }

            const severity = severityTone(item.severity);
            const resolved = item.resolved === 1;

            return (
              <TouchableOpacity
                onPress={() => openAlertSheet(item)}
                style={[
                  styles.alertCard,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                  },
                ]}
              >
                <View style={styles.alertTopRow}>
                  <View style={styles.alertUnitWrap}>
                    <SymbolView
                      name={{
                        ios: "exclamationmark.triangle.fill",
                        android: "warning",
                      }}
                      size={16}
                      tintColor={severity.fg}
                    />
                    <ThemedText type="smallBold">
                      {item.unit_id.replace("_", " ")}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.alertSeverityChip,
                      { backgroundColor: severity.bg },
                    ]}
                  >
                    <ThemedText
                      style={[styles.alertSeverityText, { color: severity.fg }]}
                    >
                      {resolved ? "Resolved" : "Open"}
                    </ThemedText>
                  </View>
                </View>

                <ThemedText type="smallBold" style={styles.alertTitle}>
                  {item.title}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.message}
                </ThemedText>

                <View style={styles.alertMetaRow}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatAlertTime(item.created_at)}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            );
          }}
          key={alertsLoading ? "alerts-loading" : "alerts-data"}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.alertListContent}
          ItemSeparatorComponent={() => (
            <View style={styles.alertItemSeparator} />
          )}
          ListEmptyComponent={
            <View
              style={[
                styles.emptyStateCard,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}
            >
              <View style={styles.emptyStateHeader}>
                <ThemedText type="smallBold">No active alerts</ThemedText>
              </View>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.emptyStateText}
              >
                You are all clear right now. New alerts will show up here.
              </ThemedText>
            </View>
          }
        />

        <View style={styles.trendSectionHeader}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Anomaly Trend
          </ThemedText>
        </View>
        <View
          style={[
            styles.trendCard,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.backgroundSelected,
            },
          ]}
        >
          {trendListData.map((item) =>
            "skeleton" in item ? (
              <View key={item.id} style={styles.trendRow}>
                <SkeletonLoader style={styles.skeletonTrendDay} />
                <SkeletonLoader style={styles.skeletonTrendTrack} />
                <SkeletonLoader style={styles.skeletonTrendCount} />
              </View>
            ) : (
              <View key={item.day} style={styles.trendRow}>
                <ThemedText type="smallBold" style={styles.trendDay}>
                  {item.day}
                </ThemedText>
                <View
                  style={[
                    styles.trendTrack,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(0,0,0,0.08)",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.trendFill,
                      {
                        width: `${Math.max((item.count / trendMax) * TREND_MAX_FILL_PERCENT, item.count > 0 ? 8 : 0)}%`,
                        backgroundColor: theme.accent,
                      },
                    ]}
                  />
                </View>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.trendCount}
                >
                  {item.count}
                </ThemedText>
              </View>
            ),
          )}
          {!anomalyLoading && trendData.length === 0 ? (
            <View style={styles.trendEmptyWrap}>
              <ThemedText type="small" themeColor="textSecondary">
                No anomaly trend data available.
              </ThemedText>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <BottomSheetModal bottomSheetRef={bottomSheetRef}>
        {selectedAlert ? (
          <AlertDetailSheet
            alert={selectedAlert}
            hvac={selectedHvac}
            onClose={closeAlertSheet}
            onResolved={fetchActiveAlerts}
          />
        ) : null}
      </BottomSheetModal>
    </SafeAreaView>
  );
};

export default index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.three,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.six,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.two,
  },
  alertButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    position: "relative",
  },
  alertButtonSurface: {
    ...StyleSheet.absoluteFill,
    borderRadius: 25,
    overflow: "hidden",
  },
  alertButtonGlass: {
    ...StyleSheet.absoluteFill,
  },
  alertButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 11,
    lineHeight: 13,
  },
  sectionHeader: {
    marginTop: Spacing.two,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 24,
  },
  sectionSubtext: {
    marginTop: Spacing.one,
  },
  listContent: {
    paddingTop: Spacing.one,
    paddingBottom: Spacing.one,
    paddingRight: Spacing.three,
    gap: Spacing.two,
    alignItems: "flex-start",
  },
  hvacList: {
    flexGrow: 0,
  },
  card: {
    width: 260,
    borderRadius: 20,
    padding: Spacing.three,
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.one,
  },
  cardTitleWrap: {
    flex: 1,
    paddingRight: Spacing.one,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.half,
  },
  connectivityDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    marginRight: Spacing.half + 2,
  },
  healthLabel: {
    marginTop: Spacing.half,
  },
  riskText: {
    marginBottom: Spacing.two,
    opacity: 0.85,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 12,
    lineHeight: 14,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
    marginBottom: Spacing.one,
  },
  outlineChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  metaText: {
    textTransform: "capitalize",
    fontSize: 12,
    lineHeight: 14,
  },
  issueText: {
    lineHeight: 20,
    marginTop: Spacing.one,
  },
  skeletonTitle: {
    width: 110,
    height: 16,
    borderRadius: 8,
    marginBottom: Spacing.one,
  },
  skeletonSubtitle: {
    width: 90,
    height: 12,
    borderRadius: 6,
  },
  skeletonGauge: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  skeletonChip: {
    width: 90,
    height: 24,
    borderRadius: 999,
  },
  skeletonIssue: {
    width: "100%",
    height: 14,
    borderRadius: 7,
    marginTop: Spacing.one,
  },
  skeletonAlertUnit: {
    width: 90,
    height: 16,
    borderRadius: 8,
  },
  skeletonAlertStatus: {
    width: 58,
    height: 24,
    borderRadius: 999,
  },
  skeletonAlertTitle: {
    width: "85%",
    height: 16,
    borderRadius: 8,
    marginBottom: Spacing.one,
  },
  skeletonAlertMessage: {
    width: "70%",
    height: 14,
    borderRadius: 7,
  },
  skeletonAlertTime: {
    width: 120,
    height: 14,
    borderRadius: 7,
  },
  emptyStateCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  emptyStateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.half,
  },
  emptyStateAccentDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  emptyStateText: {
    marginTop: Spacing.half,
    lineHeight: 18,
    opacity: 0.92,
  },
  detailedViewText: {
    color: Colors.dark.accent,
  },
  alertSectionHeader: {
    marginTop: Spacing.two,
    marginBottom: Spacing.one,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  alertCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
  },
  alertsList: {
    flexGrow: 0,
  },
  alertListContent: {
    paddingBottom: 0,
  },
  alertItemSeparator: {
    height: Spacing.one,
  },
  alertTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.one,
  },
  alertUnitWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.half,
  },
  alertSeverityChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  alertSeverityText: {
    fontSize: 12,
    lineHeight: 14,
  },
  alertTitle: {
    marginBottom: Spacing.half,
  },
  alertMetaRow: {
    marginTop: Spacing.two,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  alertResolvedChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  alertResolvedText: {
    fontSize: 12,
    lineHeight: 14,
  },
  trendSectionHeader: {
    marginTop: 10,
    marginBottom: Spacing.one,
  },
  trendCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.one,
  },
  trendDay: {
    width: 38,
  },
  trendTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    marginHorizontal: Spacing.one,
  },
  trendFill: {
    height: "100%",
    borderRadius: 999,
  },
  trendCount: {
    width: 28,
    textAlign: "right",
    lineHeight: 18,
  },
  skeletonTrendDay: {
    width: 32,
    height: 14,
    borderRadius: 6,
  },
  skeletonTrendTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    marginHorizontal: Spacing.one,
  },
  skeletonTrendCount: {
    width: 28,
    height: 14,
    borderRadius: 6,
  },
  trendEmptyWrap: {
    marginTop: Spacing.one,
  },
});
