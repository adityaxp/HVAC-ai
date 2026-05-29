import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";

export const healthColor = (score: number) => {
  if (score < 40) return "#E84D4D";
  if (score < 75) return "#F2A93B";
  return "#34C759";
};

export const healthTrackColor = (score: number, isDark: boolean) => {
  if (isDark) {
    if (score < 40) return "rgba(232,77,77,0.3)";
    if (score < 75) return "rgba(242,169,59,0.3)";
    return "rgba(52,199,89,0.3)";
  }

  if (score < 40) return "#F6C7C7";
  if (score < 75) return "#FBE2BB";
  return "#BFECCF";
};

type HealthGaugeProps = {
  score: number;
  color: string;
  trackColor: string;
  size?: number;
  strokeWidth?: number;
};

export function HealthGauge({
  score,
  color,
  trackColor,
  size = 72,
  strokeWidth,
}: HealthGaugeProps) {
  const stroke = strokeWidth ?? Math.max(4, Math.round(size * 0.1));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <ThemedText
          type="smallBold"
          style={[styles.percent, { fontSize: size * 0.26 }]}
        >
          {score}%
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  percent: {
    lineHeight: 20,
  },
});
