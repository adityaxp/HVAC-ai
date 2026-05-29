import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AlertDetailSheet } from "@/components/AlertDetailSheet";
import BottomSheetModal from "@/components/BottomSheetModal";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAlertScreenStore } from "@/store/AlertScreenStore";
import { useHomeTabStore } from "@/store/HomeTabStore";
import { AlertItem } from "@/types";
import { TrueSheet } from "@lodev09/react-native-true-sheet";

type AlertListItem = AlertItem | { skeleton: true; id: string };

const severityTone = (severity: AlertItem["severity"]) => {
  if (severity === "urgent")
    return { bg: "#FFE2E2", fg: "#C62020", label: "Urgent" };
  if (severity === "high")
    return { bg: "#FFEBD8", fg: "#B56500", label: "High" };
  if (severity === "medium")
    return { bg: "#FFF4D8", fg: "#A77D00", label: "Medium" };
  return { bg: "#E6F9ED", fg: "#1C7F45", label: "Low" };
};

const resolvedTone = (isDark: boolean) => ({
  bg: isDark ? "rgba(26,188,156,0.2)" : "rgba(26,188,156,0.14)",
  fg: "#1ABC9C",
});

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
  const [backPressed, setBackPressed] = useState(false);
  const {
    activeAlerts,
    allAlerts,
    activeLoading,
    allLoading,
    error,
    selectedTab,
    setSelectedTab,
    fetchActiveAlerts,
    fetchAllAlerts,
  } = useAlertScreenStore();
  const { hvacData, fetchHVACMetrics } = useHomeTabStore();
  const bottomSheetRef = useRef<TrueSheet | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);

  const activeCount = activeAlerts.filter((item) => item.resolved === 0).length;
  const isActiveTab = selectedTab === "active";
  const loading = isActiveTab ? activeLoading : allLoading;
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
    if (alert.resolved === 1) return;
    setSelectedAlert(alert);
    bottomSheetRef.current?.present();
  }, []);

  useEffect(() => {
    void fetchActiveAlerts();
    void fetchAllAlerts();
  }, [fetchActiveAlerts, fetchAllAlerts]);

  useEffect(() => {
    if (!hvacData) {
      void fetchHVACMetrics();
    }
  }, [fetchHVACMetrics, hvacData]);

  useEffect(() => {
    if (error) {
      Alert.alert("Error", error);
    }
  }, [error]);

  const listData: AlertListItem[] = useMemo(() => {
    if (loading) {
      return [
        { skeleton: true, id: "alert-skeleton-1" },
        { skeleton: true, id: "alert-skeleton-2" },
        { skeleton: true, id: "alert-skeleton-3" },
      ];
    }
    return isActiveTab ? activeAlerts : allAlerts;
  }, [activeAlerts, allAlerts, isActiveTab, loading]);

  const renderAlertCard = (item: AlertItem) => {
    const severity = severityTone(item.severity);
    const resolved = item.resolved === 1;
    const statusTone = resolved ? resolvedTone(isDark) : severity;

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: resolved }}
        disabled={resolved}
        onPress={() => openAlertSheet(item)}
        style={[
          styles.alertCard,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.backgroundSelected,
            opacity: resolved ? 0.92 : 1,
          },
        ]}
      >
        <View style={styles.alertTopRow}>
          <View style={styles.alertUnitWrap}>
            <SymbolView
              name={{
                ios: resolved
                  ? "checkmark.circle.fill"
                  : "exclamationmark.triangle.fill",
                android: resolved ? "check_circle" : "warning",
              }}
              size={16}
              tintColor={statusTone.fg}
            />
            <ThemedText type="smallBold">
              {item.unit_id.replace("_", " ")}
            </ThemedText>
          </View>
          <View
            style={[
              styles.alertSeverityChip,
              { backgroundColor: statusTone.bg },
            ]}
          >
            <ThemedText
              style={[styles.alertSeverityText, { color: statusTone.fg }]}
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
      </Pressable>
    );
  };

  const renderSkeletonCard = () => (
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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPressIn={() => setBackPressed(true)}
          onPressOut={() => setBackPressed(false)}
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            !useLiquidGlass && {
              borderColor: theme.backgroundElement,
              backgroundColor: theme.backgroundElement,
            },
            pressed && styles.buttonPressed,
          ]}
        >
          <View style={styles.backButtonSurface} pointerEvents="none">
            {useLiquidGlass ? (
              <GlassView
                style={styles.backButtonGlass}
                glassEffectStyle={{
                  style: backPressed ? "regular" : "clear",
                  animate: true,
                  animationDuration: 0.2,
                }}
                isInteractive
              />
            ) : null}
          </View>
          <SymbolView
            name={{ ios: "chevron.left", android: "arrow_back" }}
            size={20}
            tintColor={theme.text}
          />
        </Pressable>

        <ThemedText type="subtitle" style={styles.headerTitle}>
          Alerts
        </ThemedText>
      </View>

      <View
        style={[
          styles.segmentWrap,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.backgroundSelected,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: isActiveTab }}
          onPress={() => setSelectedTab("active")}
          style={[
            styles.segmentButton,
            isActiveTab && [
              styles.segmentButtonActive,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.06)",
                borderColor: isDark
                  ? "rgba(255,255,255,0.18)"
                  : "rgba(0,0,0,0.12)",
              },
            ],
          ]}
        >
          <ThemedText type="smallBold">
            Active alerts ({activeCount})
          </ThemedText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: !isActiveTab }}
          onPress={() => setSelectedTab("all")}
          style={[
            styles.segmentButton,
            !isActiveTab && [
              styles.segmentButtonActive,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.06)",
                borderColor: isDark
                  ? "rgba(255,255,255,0.18)"
                  : "rgba(0,0,0,0.12)",
              },
            ],
          ]}
        >
          <ThemedText type="smallBold">All alerts</ThemedText>
        </Pressable>
      </View>

      <FlatList<AlertListItem>
        data={listData}
        keyExtractor={(item) =>
          "skeleton" in item ? item.id : String(item.id)
        }
        style={styles.alertsList}
        contentContainerStyle={styles.alertListContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => (
          <View style={styles.alertItemSeparator} />
        )}
        renderItem={({ item }) =>
          "skeleton" in item ? renderSkeletonCard() : renderAlertCard(item)
        }
        ListEmptyComponent={
          !loading ? (
            <View
              style={[
                styles.emptyStateCard,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}
            >
              <ThemedText type="smallBold">
                {isActiveTab ? "No active alerts" : "No alerts yet"}
              </ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.emptyStateText}
              >
                {isActiveTab
                  ? "You are all clear right now. New alerts will show up here."
                  : "Alerts from your HVAC units will appear here once available."}
              </ThemedText>
            </View>
          ) : null
        }
      />

      <BottomSheetModal bottomSheetRef={bottomSheetRef}>
        {selectedAlert ? (
          <AlertDetailSheet
            alert={selectedAlert}
            hvac={selectedHvac}
            onClose={closeAlertSheet}
            onResolved={() => {
              void fetchActiveAlerts();
              void fetchAllAlerts();
            }}
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
  headerRow: {
    marginTop: Spacing.three,
    marginBottom: Spacing.three,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  headerTitle: {
    fontSize: 32,
    lineHeight: 40,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  backButtonSurface: {
    ...StyleSheet.absoluteFill,
    borderRadius: 25,
    overflow: "hidden",
  },
  backButtonGlass: {
    ...StyleSheet.absoluteFill,
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
  },
  segmentWrap: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.one,
    marginBottom: Spacing.three,
    gap: Spacing.one,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentButtonActive: {
    borderWidth: 1,
  },
  alertsList: {
    flex: 1,
  },
  alertListContent: {
    paddingBottom: Spacing.five,
  },
  alertItemSeparator: {
    height: Spacing.one,
  },
  alertCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
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
  emptyStateCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
    marginTop: Spacing.two,
  },
  emptyStateText: {
    marginTop: Spacing.half,
    lineHeight: 18,
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
});
