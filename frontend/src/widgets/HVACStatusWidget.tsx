import {
  Gauge,
  HStack,
  Image,
  Spacer,
  Text,
  VStack,
  ZStack,
} from "@expo/ui/swift-ui";
import {
  background,
  containerBackground,
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  gaugeStyle,
  padding,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

export type HVACWidgetUnit = {
  id: string;
  name: string;
  status: string;
  health: number;
  critical: boolean;
};

export type HVACStatusWidgetProps = {
  units: HVACWidgetUnit[];
  healthyCount: number;
  totalCount: number;
};

const HVACStatusWidget = (
  props: HVACStatusWidgetProps,
  environment: WidgetEnvironment,
) => {
  "widget";

  const isDark = environment.colorScheme === "dark";
  const palette = {
    background: isDark ? "#0F1419" : "#FFFFFF",
    card: isDark ? "#1C2535" : "#F0F0F3",
    text: isDark ? "#FFFFFF" : "#000000",
    textSecondary: isDark ? "#8B95A8" : "#60646C",
    accent: "#1ABC9C",
    danger: "#E5484D",
  };

  const units = Array.isArray(props.units) ? props.units : [];
  const family = environment.widgetFamily;

  const toneFor = (critical: boolean) =>
    critical ? palette.danger : palette.accent;

  const clamp = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    if (value < 0) return 0;
    if (value > 100) return 100;
    return Math.round(value);
  };

  const renderGauge = (unit: HVACWidgetUnit, size: number, labelSize: number) => (
    <ZStack alignment="center" modifiers={[frame({ width: size, height: size })]}>
      <Gauge
        value={clamp(unit.health)}
        min={0}
        max={100}
        modifiers={[
          gaugeStyle("circular"),
          tint(toneFor(unit.critical)),
          frame({ width: size, height: size }),
        ]}
      />
      <Text
        modifiers={[
          font({ size: labelSize, weight: "bold" }),
          foregroundStyle(toneFor(unit.critical)),
        ]}
      >
        {`${clamp(unit.health)}%`}
      </Text>
    </ZStack>
  );

  const renderRow = (unit: HVACWidgetUnit) => (
    <HStack
      key={unit.id}
      spacing={10}
      modifiers={[
        padding({ horizontal: 12, vertical: 10 }),
        background(palette.card),
        cornerRadius(14),
      ]}
    >
      <Image systemName="circle.fill" size={9} color={toneFor(unit.critical)} />
      <VStack alignment="leading" spacing={1}>
        <Text
          modifiers={[
            font({ size: 15, weight: "semibold" }),
            foregroundStyle(palette.text),
          ]}
        >
          {unit.name}
        </Text>
        <Text
          modifiers={[
            font({ size: 12 }),
            foregroundStyle(palette.textSecondary),
          ]}
        >
          {unit.status}
        </Text>
      </VStack>
      <Spacer />
      {renderGauge(unit, 42, 11)}
    </HStack>
  );

  // iOS already applies default widget content margins, so keep our inset small.
  const containerModifiers = [
    padding({ all: 4 }),
    containerBackground(palette.background, "widget"),
  ];

  // Small widget: highlight the unit that needs the most attention.
  if (family === "systemSmall") {
    const focus =
      units.find((unit) => unit.critical) ?? units[0] ?? null;

    if (!focus) {
      return (
        <VStack spacing={4} modifiers={containerModifiers}>
          <Text
            modifiers={[
              font({ size: 14, weight: "semibold" }),
              foregroundStyle(palette.textSecondary),
            ]}
          >
            No HVAC data
          </Text>
        </VStack>
      );
    }

    return (
      <VStack alignment="center" spacing={10} modifiers={containerModifiers}>
        <HStack spacing={6}>
          <Image
            systemName="fanblades.fill"
            size={12}
            color={palette.accent}
          />
          <Text
            modifiers={[
              font({ size: 13, weight: "semibold" }),
              foregroundStyle(palette.textSecondary),
            ]}
          >
            {`${props.healthyCount}/${props.totalCount} healthy`}
          </Text>
        </HStack>
        {renderGauge(focus, 80, 18)}
        <VStack alignment="center" spacing={1}>
          <Text
            modifiers={[
              font({ size: 15, weight: "bold" }),
              foregroundStyle(palette.text),
            ]}
          >
            {focus.name}
          </Text>
          <Text
            modifiers={[
              font({ size: 12 }),
              foregroundStyle(toneFor(focus.critical)),
            ]}
          >
            {focus.status}
          </Text>
        </VStack>
      </VStack>
    );
  }

  // Medium widget: a couple of rows. Large widget: the full fleet.
  const maxRows = family === "systemMedium" ? 3 : 6;
  const visible = units.slice(0, maxRows);

  return (
    <VStack alignment="leading" spacing={10} modifiers={containerModifiers}>
      <HStack spacing={6}>
        <Image systemName="fanblades.fill" size={13} color={palette.accent} />
        <Text
          modifiers={[
            font({ size: 15, weight: "bold" }),
            foregroundStyle(palette.text),
          ]}
        >
          HVAC Status
        </Text>
        <Spacer />
        <Text
          modifiers={[
            font({ size: 12, weight: "medium" }),
            foregroundStyle(palette.textSecondary),
          ]}
        >
          {`${props.healthyCount}/${props.totalCount} healthy`}
        </Text>
      </HStack>

      {visible.length === 0 ? (
        <HStack modifiers={[padding({ vertical: 12 })]}>
          <Spacer />
          <Text
            modifiers={[
              font({ size: 13 }),
              foregroundStyle(palette.textSecondary),
            ]}
          >
            No HVAC data available
          </Text>
          <Spacer />
        </HStack>
      ) : (
        <VStack alignment="leading" spacing={8}>
          {visible.map((unit) => renderRow(unit))}
        </VStack>
      )}

      <Spacer />
    </VStack>
  );
};

export default createWidget("HVACStatusWidget", HVACStatusWidget);
