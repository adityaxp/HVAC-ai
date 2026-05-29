import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#000000",
    background: "#ffffff",
    backgroundElement: "#F0F0F3",
    backgroundSelected: "#E0E1E6",
    textSecondary: "#60646C",
    accent: "#1ABC9C",
  },
  dark: {
    text: "#ffffff",
    background: "#0F1419",
    backgroundElement: "#1C2535",
    backgroundSelected: "#2D3F54",
    textSecondary: "#8B95A8",
    accent: "#1ABC9C",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: "GoogleSansRegular",
    sansMedium: "GoogleSansMedium",
    sansSemiBold: "GoogleSansSemiBold",
    sansBold: "GoogleSansBold",
    serif: "GoogleSansRegular",
    rounded: "GoogleSansRegular",
    mono: "ui-monospace",
  },
  default: {
    sans: "GoogleSansRegular",
    sansMedium: "GoogleSansMedium",
    sansSemiBold: "GoogleSansSemiBold",
    sansBold: "GoogleSansBold",
    serif: "serif",
    rounded: "GoogleSansRegular",
    mono: "monospace",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 10,
  four: 16,
  five: 24,
  six: 32,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
