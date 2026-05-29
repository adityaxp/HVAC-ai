import { useTheme } from "@/hooks/use-theme";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import React from "react";
import { Platform, ScrollView, StyleSheet } from "react-native";

const BottomSheetModal = ({
  bottomSheetRef,
  children,
}: {
  bottomSheetRef: React.RefObject<TrueSheet | null>;
  children: React.ReactNode;
}) => {
  const theme = useTheme();
  return (
    <TrueSheet
      ref={bottomSheetRef}
      scrollable
      detents={[0.72, 1]}
      grabber={false}
      style={styles.bottomSheet}
      backgroundColor={Platform.OS === "android" ? theme.background : undefined}
    >
      <ScrollView
        style={styles.bottomSheetContent}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </TrueSheet>
  );
};

export default BottomSheetModal;

const styles = StyleSheet.create({
  bottomSheet: {},
  bottomSheetContent: {
    flexGrow: 1,
  },
});
