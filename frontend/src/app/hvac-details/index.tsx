import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  HealthGauge,
  healthColor,
  healthTrackColor,
} from "@/components/HealthGauge";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { ThemedText } from "@/components/ThemedText";
import { HVAC_LOCATIONS } from "@/constants";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useHomeTabStore } from "@/store/HomeTabStore";
import {
  getDetailsConfidence,
  getDetailsPriority,
  getDetailsTelemetry,
  useHVACDetailsStore,
} from "@/store/HVACDetailsStore";
import { TelemetryMetric } from "@/types";

const statusTone = (status: string) => {
  if (status === "critical")
    return { bg: "#FFEAEA", fg: "#B22A2A", label: "Critical" };
  if (status === "warning")
    return { bg: "#FFF4E6", fg: "#A56200", label: "Warning" };
  return { bg: "#EAF8EF", fg: "#197A3A", label: "Healthy" };
};

const metricTone = (status: TelemetryMetric["status"], isDark: boolean) => {
  if (status === "warning") {
    return {
      fg: "#F5A524",
      iosIcon: "exclamationmark.triangle.fill" as const,
      androidIcon: "warning" as const,
    };
  }
  return {
    fg: isDark ? "#8B95A8" : "#60646C",
    iosIcon: "checkmark.circle.fill" as const,
    androidIcon: "check_circle" as const,
  };
};

const index = () => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const theme = useTheme();
  const useLiquidGlass = Platform.OS === "ios" && isGlassEffectAPIAvailable();
  const { hvacData, fetchHVACMetrics } = useHomeTabStore();
  const { details, loading, error, fetchHVACDetails } = useHVACDetailsStore();
  const [backPressed, setBackPressed] = useState(false);
  const [dropdownPressed, setDropdownPressed] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState("HVAC 1");

  useEffect(() => {
    if (!hvacData) {
      void fetchHVACMetrics();
    }
  }, [fetchHVACMetrics, hvacData]);

  const hvacOptions = useMemo(
    () => (hvacData ?? []).map((item) => item.unit_id.replace("_", " ")),
    [hvacData],
  );

  useEffect(() => {
    if (!hvacOptions.length) return;
    if (!hvacOptions.includes(selectedUnit)) {
      setSelectedUnit(hvacOptions[0]);
    }
  }, [hvacOptions, selectedUnit]);

  useEffect(() => {
    void fetchHVACDetails(selectedUnit);
  }, [fetchHVACDetails, selectedUnit]);

  useEffect(() => {
    if (error) {
      Alert.alert("Error", error);
    }
  }, [error]);

  const unitId =
    details?.unit_id ?? selectedUnit.replace(/\s+/g, "_").toUpperCase();
  const unitLabel = unitId.replace("_", " ");
  const location =
    HVAC_LOCATIONS[unitId as keyof typeof HVAC_LOCATIONS] ??
    "Location unavailable";
  const healthScore = details?.health_score ?? 0;
  const tone = statusTone(details?.status ?? "critical");
  const meterColor = healthColor(healthScore);
  const meterTrackColor = healthTrackColor(healthScore, isDark);
  const telemetry = details ? getDetailsTelemetry(details) : [];

  const renderTelemetryCard = (metric: TelemetryMetric) => {
    const colors = metricTone(metric.status, isDark);
    const cardBg = isDark ? "#151C28" : "#E8EAEE";

    return (
      <View
        key={metric.key}
        style={[
          styles.telemetryCard,
          {
            backgroundColor: cardBg,
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
          },
        ]}
      >
        <View style={styles.telemetryTopRow}>
          <ThemedText type="smallBold" style={styles.telemetryLabel}>
            {metric.label}
          </ThemedText>
          <SymbolView
            name={{
              ios: colors.iosIcon,
              android: colors.androidIcon,
            }}
            size={16}
            tintColor={colors.fg}
          />
        </View>

        <View style={styles.telemetryValueRow}>
          <ThemedText
            type="subtitle"
            style={[styles.telemetryValue, { color: colors.fg }]}
          >
            {metric.value}
          </ThemedText>
          <ThemedText
            type="small"
            style={[styles.telemetryUnit, { color: colors.fg }]}
          >
            {metric.unit}
          </ThemedText>
        </View>

        {metric.delta ? (
          <ThemedText
            type="small"
            style={[styles.telemetryMeta, { color: colors.fg }]}
          >
            {metric.delta}
          </ThemedText>
        ) : null}

        {metric.range ? (
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.telemetryMeta}
          >
            {metric.range}
          </ThemedText>
        ) : null}

        {metric.trend?.length ? (
          <View style={styles.trendBars}>
            {metric.trend.map((height, index) => (
              <View
                key={`${metric.key}-bar-${index}`}
                style={[
                  styles.trendBar,
                  {
                    height: 8 + height * 28,
                    backgroundColor: colors.fg,
                  },
                ]}
              />
            ))}
          </View>
        ) : null}

        {typeof metric.progress === "number" ? (
          <View
            style={[
              styles.progressTrack,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(0,0,0,0.08)",
              },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${metric.progress * 100}%`,
                  backgroundColor: theme.accent,
                },
              ]}
            />
          </View>
        ) : null}
      </View>
    );
  };

  const renderSkeleton = () => (
    <>
      <View style={styles.summarySection}>
        <View style={styles.summaryTextWrap}>
          <SkeletonLoader style={styles.skeletonTitle} />
          <SkeletonLoader style={styles.skeletonLocation} />
          <View style={styles.chipsWrap}>
            <SkeletonLoader style={styles.skeletonChip} />
            <SkeletonLoader style={styles.skeletonChip} />
            <SkeletonLoader style={styles.skeletonChip} />
          </View>
        </View>
        <SkeletonLoader style={styles.skeletonGauge} />
      </View>

      <SkeletonLoader style={styles.skeletonIssue} />
      <View
        style={[
          styles.infoCard,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.backgroundSelected,
          },
        ]}
      >
        <SkeletonLoader style={styles.skeletonCardTitle} />
        <SkeletonLoader style={styles.skeletonLine} />
        <SkeletonLoader style={styles.skeletonLine} />
        <SkeletonLoader style={styles.skeletonLineShort} />
      </View>
      <View
        style={[
          styles.infoCard,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.backgroundSelected,
          },
        ]}
      >
        <SkeletonLoader style={styles.skeletonCardTitle} />
        <SkeletonLoader style={styles.skeletonLine} />
        <SkeletonLoader style={styles.skeletonLineShort} />
      </View>

      <SkeletonLoader style={styles.skeletonSectionTitle} />
      <View style={styles.telemetryGrid}>
        {Array.from({ length: 4 }).map((_, idx) => (
          <SkeletonLoader
            key={`telemetry-skeleton-${idx}`}
            style={styles.skeletonTelemetry}
          />
        ))}
      </View>
    </>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.headerSection}>
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
                  : theme.backgroundSelected,
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
            <ThemedText type="smallBold">{selectedUnit}</ThemedText>
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
            {(hvacOptions.length ? hvacOptions : ["HVAC 1"]).map((option) => (
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading || !details ? (
          renderSkeleton()
        ) : (
          <>
            <View style={styles.summarySection}>
              <View style={styles.summaryTextWrap}>
                <ThemedText type="subtitle" style={styles.unitTitle}>
                  {unitLabel}
                </ThemedText>
                <View style={styles.locationRow}>
                  <SymbolView
                    name={{ ios: "mappin.and.ellipse", android: "location_on" }}
                    size={16}
                    tintColor={theme.textSecondary}
                  />
                  <ThemedText type="small" themeColor="textSecondary">
                    {location}
                  </ThemedText>
                </View>
                <View style={styles.chipsWrap}>
                  <View
                    style={[styles.chipFilled, { backgroundColor: tone.bg }]}
                  >
                    <ThemedText type="smallBold" style={{ color: tone.fg }}>
                      {tone.label}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.chipOutline,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.backgroundSelected,
                      },
                    ]}
                  >
                    <ThemedText type="smallBold">
                      Confidence: {getDetailsConfidence(details)}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.chipOutline,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.backgroundSelected,
                      },
                    ]}
                  >
                    <ThemedText type="smallBold">
                      Priority: {getDetailsPriority(details)}
                    </ThemedText>
                  </View>
                </View>
              </View>
              <HealthGauge
                score={healthScore}
                color={meterColor}
                trackColor={meterTrackColor}
                size={72}
              />
            </View>

            <View
              style={[
                styles.divider,
                { backgroundColor: theme.backgroundSelected },
              ]}
            />

            <ThemedText type="smallBold" style={styles.issueHeading}>
              Issue: {details.recommendation.issue}
            </ThemedText>

            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}
            >
              <ThemedText type="smallBold" style={styles.cardTitle}>
                Description
              </ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.bodyText}
              >
                {details.recommendation.description}
              </ThemedText>
            </View>

            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}
            >
              <ThemedText type="smallBold" style={styles.cardTitle}>
                Recommendations
              </ThemedText>
              {details.recommendation.recommendations.map((item) => (
                <View key={item} style={styles.bulletRow}>
                  <ThemedText type="small" themeColor="textSecondary">
                    •
                  </ThemedText>
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={styles.bulletText}
                  >
                    {item}
                  </ThemedText>
                </View>
              ))}
            </View>

            <ThemedText type="subtitle" style={styles.telemetryTitle}>
              Telemetry
            </ThemedText>
            <View style={styles.telemetryGrid}>
              {telemetry.map((metric) => renderTelemetryCard(metric))}
            </View>
          </>
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
  headerSection: {
    marginTop: Spacing.three,
    marginBottom: Spacing.three,
    position: "relative",
    zIndex: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.two,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
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
  dropdownButton: {
    width: 150,
    height: 50,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
    position: "relative",
  },
  chevronCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
  },
  glassSurface: {
    ...StyleSheet.absoluteFill,
  },
  dropdownMenu: {
    position: "absolute",
    top: 56,
    right: 0,
    width: 150,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: Spacing.one,
    overflow: "hidden",
    zIndex: 30,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.six,
  },
  summarySection: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  summaryTextWrap: {
    flex: 1,
  },
  unitTitle: {
    fontSize: 32,
    lineHeight: 40,
  },
  locationRow: {
    marginTop: Spacing.one,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  chipsWrap: {
    marginTop: Spacing.two,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
  },
  chipFilled: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  chipOutline: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.three,
  },
  issueHeading: {
    marginBottom: Spacing.three,
    lineHeight: 22,
  },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  cardTitle: {
    marginBottom: Spacing.two,
  },
  bodyText: {
    lineHeight: 21,
  },
  bulletRow: {
    flexDirection: "row",
    gap: Spacing.one,
    marginBottom: Spacing.one,
  },
  bulletText: {
    flex: 1,
    lineHeight: 20,
  },
  telemetryTitle: {
    fontSize: 10,
    lineHeight: 36,
    marginBottom: Spacing.two,
  },
  telemetryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  telemetryCard: {
    width: "48%",
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.two,
    minHeight: 128,
  },
  telemetryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  telemetryLabel: {
    fontSize: 11,
    letterSpacing: 0.6,
  },
  telemetryValueRow: {
    marginTop: Spacing.two,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.half,
  },
  telemetryValue: {
    fontSize: 28,
    lineHeight: 32,
  },
  telemetryUnit: {
    marginBottom: 2,
  },
  telemetryMeta: {
    marginTop: Spacing.half,
    fontSize: 11,
    lineHeight: 14,
  },
  trendBars: {
    marginTop: Spacing.two,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 36,
  },
  trendBar: {
    width: 8,
    borderRadius: 3,
  },
  progressTrack: {
    marginTop: Spacing.two,
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  skeletonTitle: {
    width: 140,
    height: 32,
    borderRadius: 8,
  },
  skeletonLocation: {
    width: 180,
    height: 14,
    borderRadius: 7,
    marginTop: Spacing.one,
  },
  skeletonChip: {
    width: 88,
    height: 26,
    borderRadius: 999,
  },
  skeletonGauge: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  skeletonIssue: {
    width: "90%",
    height: 18,
    borderRadius: 8,
    marginBottom: Spacing.three,
  },
  skeletonCardTitle: {
    width: 120,
    height: 16,
    borderRadius: 8,
    marginBottom: Spacing.two,
  },
  skeletonLine: {
    width: "100%",
    height: 12,
    borderRadius: 6,
    marginBottom: Spacing.one,
  },
  skeletonLineShort: {
    width: "70%",
    height: 12,
    borderRadius: 6,
  },
  skeletonSectionTitle: {
    width: 130,
    height: 28,
    borderRadius: 8,
    marginBottom: Spacing.two,
  },
  skeletonTelemetry: {
    width: "48%",
    height: 128,
    borderRadius: 12,
  },
});
