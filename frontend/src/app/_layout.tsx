import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "react-native";

import * as Notifications from "expo-notifications";

import { ensureNotificationSetup } from "@/utils/notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    GoogleSansRegular: require("../../assets/fonts/GoogleSans-Regular.ttf"),
    GoogleSansMedium: require("../../assets/fonts/GoogleSans-Medium.ttf"),
    GoogleSansSemiBold: require("../../assets/fonts/GoogleSans-SemiBold.ttf"),
    GoogleSansBold: require("../../assets/fonts/GoogleSans-Bold.ttf"),
  });

  useEffect(() => {
    void ensureNotificationSetup();
  }, []);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}
