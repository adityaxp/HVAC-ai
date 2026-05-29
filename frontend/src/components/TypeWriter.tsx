import { useEffect, useMemo, useState } from "react";
import { Platform, StyleProp, StyleSheet, Text, TextStyle } from "react-native";

import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type TypeWriterProps = {
  text: string;
  speed?: number;
  style?: StyleProp<TextStyle>;
};

export const TypeWriter = ({ text, speed = 40, style }: TypeWriterProps) => {
  const theme = useTheme();
  const words = useMemo(() => text.split(" "), [text]);
  const [displayText, setDisplayText] = useState("");
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  useEffect(() => {
    setDisplayText("");
    setCurrentWordIndex(0);
  }, [text]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentWordIndex((prevIndex) => {
        if (prevIndex >= words.length) {
          clearInterval(timer);
          return prevIndex;
        }

        setDisplayText((prevText) => `${prevText}${words[prevIndex]} `);
        return prevIndex + 1;
      });
    }, speed);

    return () => clearInterval(timer);
  }, [speed, words]);

  const renderWithBoldTokens = (value: string) => {
    const parts = value.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <Text key={`bold-${index}`} style={styles.bold}>
            {part.slice(2, -2)}
          </Text>
        );
      }

      return (
        <Text key={`plain-${index}`} style={styles.plain}>
          {part}
        </Text>
      );
    });
  };

  return (
    <Text style={[styles.base, { color: theme.text }, style]}>
      {renderWithBoldTokens(displayText)}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    textAlign: "left",
    fontFamily: Fonts.sansMedium,
    fontSize: Platform.OS === "ios" ? 16 : 14,
    lineHeight: Platform.OS === "ios" ? 22 : 20,
  },
  plain: {
    fontFamily: Fonts.sansMedium,
    fontSize: Platform.OS === "ios" ? 16 : 14,
    lineHeight: Platform.OS === "ios" ? 22 : 20,
  },
  bold: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: Platform.OS === "ios" ? 16 : 14,
    lineHeight: Platform.OS === "ios" ? 22 : 20,
  },
});
