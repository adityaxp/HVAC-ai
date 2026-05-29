import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useColorScheme,
} from "react-native";

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
import { GET_AI_ASSISTANT_EXPLAINATION, RESOLVE_ALERT } from "@/services";
import { AlertItem, HVACItem } from "@/types";

type AlertDetailSheetProps = {
  alert: AlertItem;
  hvac: HVACItem | null;
  onClose: () => void;
  onResolved?: () => void;
};

const statusTone = (status: string) => {
  if (status === "critical")
    return { bg: "#FFEAEA", fg: "#B22A2A", label: "Critical" };
  if (status === "warning")
    return { bg: "#FFF4E6", fg: "#A56200", label: "Warning" };
  return { bg: "#EAF8EF", fg: "#197A3A", label: "Healthy" };
};

const prettify = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

const extractAiText = (data: unknown): string | null => {
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object") return null;

  const payload = data as Record<string, unknown>;
  const candidates = [
    payload.explanation,
    payload.answer,
    payload.message,
    payload.summary,
    payload.diagnosis,
  ];

  const found = candidates.find((value) => typeof value === "string");
  return typeof found === "string" ? found : null;
};

export function AlertDetailSheet({
  alert,
  hvac,
  onClose,
  onResolved,
}: AlertDetailSheetProps) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const theme = useTheme();
  const useLiquidGlass = Platform.OS === "ios" && isGlassEffectAPIAvailable();
  const [closePressed, setClosePressed] = useState(false);
  const [fieldNotes, setFieldNotes] = useState("");
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [resolveLoading, setResolveLoading] = useState(false);

  const notesReady = fieldNotes.trim().length > 0;
  const canResolve = notesReady && !resolveLoading;

  const unitLabel = alert.unit_id.replace("_", " ");
  const location =
    HVAC_LOCATIONS[alert.unit_id as keyof typeof HVAC_LOCATIONS] ??
    "Location unavailable";
  const healthScore = hvac?.health_score ?? 0;
  const tone = statusTone(hvac?.status ?? "critical");
  const meterColor = healthColor(healthScore);
  const meterTrackColor = healthTrackColor(healthScore, isDark);
  const issueText = hvac?.issue ?? alert.title;

  const metaChips = useMemo(
    () => [
      { label: tone.label, bg: tone.bg, fg: tone.fg, filled: true },
      {
        label: `Confidence: ${prettify(hvac?.confidence ?? "high")}`,
        filled: false,
      },
      {
        label: `Priority: ${prettify(hvac?.priority ?? alert.severity)}`,
        filled: false,
      },
    ],
    [alert.severity, hvac?.confidence, hvac?.priority, tone],
  );

  useEffect(() => {
    let cancelled = false;

    const loadExplanation = async () => {
      setAiLoading(true);
      try {
        const response = await GET_AI_ASSISTANT_EXPLAINATION(alert.unit_id);
        if (cancelled) return;
        setAiText(
          extractAiText(response.data) ??
            "Critical bearing wear detected. Vibration patterns match historical failure patterns. Recommend immediate lubrication check.",
        );
      } catch {
        if (!cancelled) {
          setAiText(
            alert.message ||
              "Unable to load AI diagnostics right now. Please retry shortly.",
          );
        }
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    };

    void loadExplanation();
    return () => {
      cancelled = true;
    };
  }, [alert.message, alert.unit_id]);

  const handleResolve = async () => {
    const notes = fieldNotes.trim();
    if (!notes || resolveLoading) return;

    setResolveLoading(true);
    try {
      await RESOLVE_ALERT(alert.id, notes);
      onResolved?.();
      onClose();
    } catch {
      Alert.alert("Error", "Failed to resolve alert. Please try again.");
    } finally {
      setResolveLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.sheetHeader}>
        <ThemedText type="subtitle" style={styles.sheetTitle}>
          {unitLabel}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close alert details"
          onPressIn={() => setClosePressed(true)}
          onPressOut={() => setClosePressed(false)}
          onPress={onClose}
          style={({ pressed }) => [
            styles.closeButton,
            !useLiquidGlass && {
              borderColor: theme.backgroundElement,
              backgroundColor: theme.backgroundElement,
            },
            pressed && styles.closeButtonPressed,
          ]}
        >
          <View style={styles.closeButtonSurface} pointerEvents="none">
            {useLiquidGlass ? (
              <GlassView
                style={styles.closeButtonGlass}
                glassEffectStyle={{
                  style: closePressed ? "regular" : "clear",
                  animate: true,
                  animationDuration: 0.2,
                }}
                isInteractive
              />
            ) : null}
          </View>
          <SymbolView
            name={{ ios: "xmark", android: "close" }}
            size={16}
            tintColor={theme.text}
          />
        </Pressable>
      </View>

      <View
        style={[styles.divider, { backgroundColor: theme.backgroundSelected }]}
      />

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

      <View style={styles.metaSection}>
        <View style={styles.chipsWrap}>
          {metaChips.map((chip) => (
            <View
              key={chip.label}
              style={[
                chip.filled ? styles.chipFilled : styles.chipOutline,
                chip.filled
                  ? { backgroundColor: chip.bg }
                  : {
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.backgroundSelected,
                    },
              ]}
            >
              <ThemedText
                type="smallBold"
                style={chip.filled ? { color: chip.fg } : undefined}
              >
                {chip.label}
              </ThemedText>
            </View>
          ))}
        </View>

        <HealthGauge
          score={healthScore}
          color={meterColor}
          trackColor={meterTrackColor}
          size={64}
        />
      </View>

      <View
        style={[styles.divider, { backgroundColor: theme.backgroundSelected }]}
      />

      <ThemedText type="smallBold" style={styles.issueHeading}>
        Issue: {issueText}
      </ThemedText>

      <View
        style={[
          styles.aiCard,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.backgroundSelected,
          },
        ]}
      >
        <View style={styles.aiHeader}>
          <SymbolView
            name={{ ios: "sparkles", android: "auto_awesome" }}
            size={18}
            tintColor={theme.accent}
          />
          <ThemedText
            type="smallBold"
            style={[styles.aiTitle, { color: theme.accent }]}
          >
            AI DIAGNOSTICS
          </ThemedText>
        </View>

        {aiLoading ? (
          <View style={styles.aiLoadingWrap}>
            <SkeletonLoader style={styles.skeletonAiLine} />
            <SkeletonLoader style={styles.skeletonAiLineShort} />
          </View>
        ) : (
          <View style={styles.quoteWrap}>
            <View
              style={[styles.quoteAccent, { backgroundColor: theme.accent }]}
            />
            <ThemedText type="small" style={styles.quoteText}>
              {aiText}
            </ThemedText>
          </View>
        )}
      </View>

      <View
        style={[
          styles.notesCard,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.backgroundSelected,
          },
        ]}
      >
        <ThemedText type="smallBold" style={styles.notesTitle}>
          ADD FIELD NOTES
        </ThemedText>
        <TextInput
          value={fieldNotes}
          onChangeText={setFieldNotes}
          placeholder="Remarks"
          placeholderTextColor={theme.textSecondary}
          multiline
          editable={!resolveLoading}
          style={[
            styles.notesInput,
            {
              color: theme.text,
              backgroundColor: theme.background,
              borderColor: theme.backgroundSelected,
            },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Resolve alert"
          accessibilityState={{ disabled: !canResolve }}
          disabled={!canResolve}
          onPress={() => {
            void handleResolve();
          }}
          style={({ pressed }) => [
            styles.resolveButton,
            {
              backgroundColor: canResolve
                ? theme.accent
                : theme.backgroundSelected,
              borderColor: canResolve
                ? isDark
                  ? "rgba(26,188,156,0.5)"
                  : "rgba(26,188,156,0.35)"
                : theme.backgroundSelected,
              opacity: canResolve ? 1 : 0.55,
            },
            pressed && canResolve && styles.resolveButtonPressed,
          ]}
        >
          {resolveLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <ThemedText type="smallBold" style={styles.resolveButtonText}>
              RESOLVE
            </ThemedText>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: {
    fontSize: 28,
    lineHeight: 34,
    flex: 1,
  },
  closeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  closeButtonSurface: {
    ...StyleSheet.absoluteFill,
    borderRadius: 25,
    overflow: "hidden",
  },
  closeButtonGlass: {
    ...StyleSheet.absoluteFill,
  },
  closeButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  divider: {
    height: 1,
    marginVertical: Spacing.three,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  metaSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  chipsWrap: {
    flex: 1,
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
  issueHeading: {
    marginBottom: Spacing.three,
    lineHeight: 22,
  },
  aiCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  aiTitle: {
    letterSpacing: 0.6,
  },
  aiLoadingWrap: {
    gap: Spacing.one,
  },
  skeletonAiLine: {
    width: "100%",
    height: 14,
    borderRadius: 7,
  },
  skeletonAiLineShort: {
    width: "72%",
    height: 14,
    borderRadius: 7,
  },
  quoteWrap: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  quoteAccent: {
    width: 3,
    borderRadius: 2,
    alignSelf: "stretch",
  },
  quoteText: {
    flex: 1,
    lineHeight: 21,
    fontStyle: "italic",
  },
  notesCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: Spacing.three,
  },
  notesTitle: {
    letterSpacing: 0.5,
    marginBottom: Spacing.two,
  },
  notesInput: {
    minHeight: 88,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    textAlignVertical: "top",
    marginBottom: Spacing.three,
  },
  resolveButton: {
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  resolveButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  resolveButtonText: {
    color: "#FFFFFF",
    letterSpacing: 0.8,
  },
});
