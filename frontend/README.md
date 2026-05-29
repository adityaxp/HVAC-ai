# Softway HVAC Monitoring App

A React Native (Expo) app for monitoring a fleet of HVAC units in real time — health
scores, alerts, anomaly trends, per-metric telemetry, an AI diagnostics assistant, an
iOS home-screen widget.

## Project structure

```
src/
  app/              # expo-router routes
    (tabs)/         # home, stats, assistant tabs
    alerts/         # alerts screen
    hvac-details/   # per-unit telemetry screen
  components/       # shared UI (gauges, sheets, skeletons, themed text, etc.)
  constants/        # theme (colors, fonts, spacing)
  hooks/            # theme / color-scheme hooks
  services/         # axios API layer
  store/            # zustand stores (one per screen/feature)
  types/            # shared TypeScript types
  utils/            # notifications and helpers
  widgets/          # iOS home-screen widget + data sync
```

## Prerequisites

- Node.js (LTS) and npm
- Xcode (iOS) and/or Android Studio
- A **development build** is required — this app uses native modules
  (`expo-widgets`, `expo-glass-effect`, `react-native-true-sheet`) that are **not**
  available in Expo Go.

## Environment variables

Create a `.env` file in the project root:

```bash
EXPO_PUBLIC_BASE_URL=https://your-backend-url.example.com
```

The app reads this at runtime to talk to the HVAC backend API.

## Get started

1. Install dependencies

   ```bash
   npx expo install
   ```

2. Generate native projects

   ```bash
   npx expo prebuild
   ```

3. Build and run on a device or simulator

   ```bash
   npx expo run:ios
   # or
   npx expo run:android
   ```

## Notes

- **Widget is iOS-only.** It's built with SwiftUI via `@expo/ui/swift-ui` and configured
  in `app.json` under the `expo-widgets` plugin. The widget refreshes whenever the Home
  tab fetches HVAC metrics.
- After changing native config (e.g. `app.json` plugins), re-run
  `npx expo prebuild --clean` and rebuild.
