import { usePathname } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";

export default function AppTabs() {
  const scheme = useColorScheme();
  const pathname = usePathname();
  const colors = Colors[scheme === "unspecified" ? "light" : scheme];
  const hideTabBar = pathname === "/assistant";

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      iconColor={{ default: colors.textSecondary, selected: colors.accent }}
      labelStyle={{ selected: { color: colors.text } }}
      sidebarAdaptable={true}
      hidden={hideTabBar}
    >
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          md={{ default: "home", selected: "home_filled" }}
          sf={{ default: "house", selected: "house.fill" }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="stats">
        <NativeTabs.Trigger.Label>Stats</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          md={{ default: "bar_chart", selected: "bar_chart_4_bars" }}
          sf={{ default: "chart.bar", selected: "chart.bar.fill" }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="assistant" role="search">
        <NativeTabs.Trigger.Label>Assistant</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          md={{ default: "auto_awesome", selected: "auto_awesome" }}
          sf={{
            default: "sparkles",
            selected: "sparkles",
          }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
