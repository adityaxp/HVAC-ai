import { LinearGradient } from "expo-linear-gradient";
import type { StyleProp, ViewStyle } from "react-native";
import ShimmerPlaceHolder from "react-native-shimmer-placeholder";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface SkeletonLoaderProps {
  style?: StyleProp<ViewStyle>;
}

export const SkeletonLoader = ({ style }: SkeletonLoaderProps) => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const shimmerColors = isDark
    ? [
        Colors.dark.backgroundElement,
        Colors.dark.backgroundSelected,
        Colors.dark.backgroundElement,
      ]
    : [
        Colors.light.backgroundElement,
        Colors.light.backgroundSelected,
        Colors.light.backgroundElement,
      ];

  return (
    <ShimmerPlaceHolder
      LinearGradient={LinearGradient}
      style={style}
      shimmerColors={shimmerColors}
    />
  );
};
