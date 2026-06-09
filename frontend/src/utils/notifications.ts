import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const HVAC_ALERTS_CHANNEL_ID = "hvac-alerts";

export async function ensureNotificationSetup(): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(HVAC_ALERTS_CHANNEL_ID, {
      name: "HVAC Alerts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1ABC9C",
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted || existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  return (
    requested.granted ||
    requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function scheduleLocalAlertNotification(title: string, body: string) {
  if (!Device.isDevice && Platform.OS === "ios") {
    // Local notifications are supported on recent iOS simulators; still attempt.
  }

  const canNotify = await ensureNotificationSetup();
  if (!canNotify) {
    if (__DEV__) {
      console.warn("[notifications] Permission not granted");
    }
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      ...(Platform.OS === "android" ? { channelId: HVAC_ALERTS_CHANNEL_ID } : {}),
    },
    trigger: null,
  });
}
