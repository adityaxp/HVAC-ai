import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SkeletonLoader } from "@/components/SkeletonLoader";
import { ThemedText } from "@/components/ThemedText";
import { TypeWriter } from "@/components/TypeWriter";
import { Fonts, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAssistantTabStore } from "@/store/AssistantTabStore";
import { useHomeTabStore } from "@/store/HomeTabStore";

type ChatListItem =
  | {
      id: string;
      role: "assistant" | "user";
      text: string;
      sender?: string;
      kind?: "message";
    }
  | {
      id: "assistant-skeleton";
      role: "assistant";
      kind: "skeleton";
    };

const QUICK_REPLIES = [
  "Why is this unit critical?",
  "How urgent is this?",
  "Show probable root cause",
];

const index = () => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const theme = useTheme();
  const useLiquidGlass = Platform.OS === "ios" && isGlassEffectAPIAvailable();
  const { hvacData, fetchHVACMetrics } = useHomeTabStore();
  const { messages, isReplyLoading, error, sendMessage: sendAssistantMessage, clearError } =
    useAssistantTabStore();
  const [backPressed, setBackPressed] = useState(false);
  const [dropdownPressed, setDropdownPressed] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState("HVAC 1");
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList<ChatListItem>>(null);

  useEffect(() => {
    if (!hvacData) {
      fetchHVACMetrics();
    }
  }, [fetchHVACMetrics, hvacData]);

  const hvacOptions = useMemo(
    () => (hvacData ?? []).map((item) => item.unit_id.replace("_", " ")),
    [hvacData],
  );

  useEffect(() => {
    if (!hvacOptions.length) return;
    if (!hvacOptions.includes(selectedUnit)) {
      setSelectedUnit(hvacOptions[0]);
    }
  }, [hvacOptions, selectedUnit]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    clearError();
    setDraft("");
    await sendAssistantMessage(selectedUnit, trimmed);
  };

  const chatItems = useMemo<ChatListItem[]>(
    () =>
      isReplyLoading
        ? [...messages.map((item) => ({ ...item, kind: "message" as const })), { id: "assistant-skeleton", role: "assistant", kind: "skeleton" }]
        : messages.map((item) => ({ ...item, kind: "message" as const })),
    [isReplyLoading, messages],
  );

  useEffect(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [chatItems.length]);

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.headerSection}>
          <View style={styles.headerRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to home"
              onPressIn={() => setBackPressed(true)}
              onPressOut={() => setBackPressed(false)}
              onPress={() => router.replace("/home")}
              style={({ pressed }) => [
                styles.backButton,
                !useLiquidGlass && {
                  borderColor: theme.backgroundElement,
                  backgroundColor: theme.backgroundElement,
                },
                pressed && styles.buttonPressed,
              ]}
            >
              <View style={styles.backButtonSurface} pointerEvents="none">
                {useLiquidGlass ? (
                  <GlassView
                    style={styles.backButtonGlass}
                    glassEffectStyle={{
                      style: backPressed ? "regular" : "clear",
                      animate: true,
                      animationDuration: 0.2,
                    }}
                    isInteractive
                  />
                ) : null}
              </View>
              <SymbolView
                name={{ ios: "chevron.left", android: "arrow_back" }}
                size={20}
                tintColor={theme.text}
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Select HVAC unit"
              onPressIn={() => setDropdownPressed(true)}
              onPressOut={() => setDropdownPressed(false)}
              onPress={() => setIsDropdownOpen((prev) => !prev)}
              style={({ pressed }) => [
                styles.dropdownButton,
                {
                  borderColor: useLiquidGlass
                    ? "rgba(255,255,255,0.22)"
                    : theme.backgroundSelected,
                  backgroundColor: useLiquidGlass
                    ? "transparent"
                    : theme.backgroundElement,
                },
                pressed && styles.buttonPressed,
              ]}
            >
              {useLiquidGlass ? (
                <View style={styles.glassSurface} pointerEvents="none">
                  <GlassView
                    style={StyleSheet.absoluteFill}
                    glassEffectStyle={{
                      style: dropdownPressed ? "regular" : "clear",
                      animate: true,
                      animationDuration: 0.2,
                    }}
                    isInteractive
                  />
                </View>
              ) : null}
              <ThemedText type="smallBold">{selectedUnit}</ThemedText>
              <View
                style={[
                  styles.chevronCircle,
                  {
                    borderColor: useLiquidGlass
                      ? "rgba(255,255,255,0.22)"
                      : theme.backgroundSelected,
                    backgroundColor: theme.background,
                  },
                ]}
              >
                <SymbolView
                  name={
                    isDropdownOpen
                      ? { ios: "chevron.up", android: "keyboard_arrow_up" }
                      : { ios: "chevron.down", android: "keyboard_arrow_down" }
                  }
                  size={11}
                  tintColor={theme.text}
                />
              </View>
            </Pressable>
          </View>

          {isDropdownOpen ? (
            <View
              style={[
                styles.dropdownMenu,
                {
                  backgroundColor: useLiquidGlass
                    ? "transparent"
                    : theme.backgroundElement,
                  borderColor: useLiquidGlass
                    ? "rgba(255,255,255,0.22)"
                    : isDark
                      ? "rgba(255,255,255,0.14)"
                      : "rgba(0,0,0,0.12)",
                },
              ]}
            >
              {useLiquidGlass ? (
                <View style={styles.glassSurface} pointerEvents="none">
                  <GlassView
                    style={StyleSheet.absoluteFill}
                    glassEffectStyle="regular"
                    isInteractive
                  />
                </View>
              ) : null}
              {(hvacOptions.length ? hvacOptions : ["HVAC 1"]).map((option) => (
                <Pressable
                  key={option}
                  onPress={() => {
                    setSelectedUnit(option);
                    setIsDropdownOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.dropdownOption,
                    selectedUnit === option && {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.06)",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.18)"
                        : "rgba(0,0,0,0.12)",
                    },
                    pressed && styles.dropdownOptionPressed,
                  ]}
                >
                  <ThemedText type="smallBold">{option}</ThemedText>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.chatPanel}>
          <FlatList
            ref={listRef}
            data={chatItems}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              if (item.kind === "skeleton") {
                return (
                  <View style={[styles.messageWrapper, styles.assistantMessageWrapper]}>
                    <View
                      style={[
                        styles.avatar,
                        {
                          backgroundColor: theme.background,
                          borderColor: theme.backgroundSelected,
                        },
                      ]}
                    >
                      <ThemedText type="smallBold">S</ThemedText>
                    </View>
                    <View
                      style={[
                        styles.messageBubble,
                        styles.assistantBubble,
                        {
                          backgroundColor: theme.background,
                          borderColor: theme.backgroundSelected,
                        },
                      ]}
                    >
                      <SkeletonLoader style={styles.skeletonSender} />
                      <SkeletonLoader style={styles.skeletonMessageLine} />
                      <SkeletonLoader style={styles.skeletonMessageLineShort} />
                    </View>
                  </View>
                );
              }

              const isUser = item.role === "user";
              return (
                <View
                  style={[
                    styles.messageWrapper,
                    isUser
                      ? styles.userMessageWrapper
                      : styles.assistantMessageWrapper,
                  ]}
                >
                  {!isUser ? (
                    <View
                      style={[
                        styles.avatar,
                        {
                          backgroundColor: theme.background,
                          borderColor: theme.backgroundSelected,
                        },
                      ]}
                    >
                      <ThemedText type="smallBold">S</ThemedText>
                    </View>
                  ) : null}

                  <View
                    style={[
                      styles.messageBubble,
                      isUser
                        ? [
                            styles.userBubble,
                            {
                              backgroundColor: isDark
                                ? "rgba(26,188,156,0.3)"
                                : "rgba(26,188,156,0.2)",
                              borderColor: isDark
                                ? "rgba(26,188,156,0.44)"
                                : "rgba(26,188,156,0.3)",
                            },
                          ]
                        : [
                            styles.assistantBubble,
                            {
                              backgroundColor: theme.background,
                              borderColor: theme.backgroundSelected,
                            },
                          ],
                    ]}
                  >
                    {!isUser && item.sender ? (
                      <ThemedText
                        type="smallBold"
                        style={[styles.senderName, { color: theme.accent }]}
                      >
                        {item.sender}
                      </ThemedText>
                    ) : null}

                    {isUser ? (
                      <ThemedText type="small" style={styles.messageText}>
                        {item.text}
                      </ThemedText>
                    ) : (
                      <TypeWriter text={item.text} speed={36} style={styles.messageText} />
                    )}
                  </View>
                </View>
              );
            }}
          />
        </View>

        <View style={styles.quickRepliesWrap}>
          <FlatList
            horizontal
            data={QUICK_REPLIES}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRepliesContent}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => sendMessage(item)}
                style={[
                  styles.quickReplyChip,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                  },
                ]}
              >
                <ThemedText type="small">{item}</ThemedText>
              </Pressable>
            )}
          />
        </View>
        {error ? (
          <View style={styles.errorWrap}>
            <ThemedText type="small" style={[styles.errorText, { color: "#FF6C85" }]}>
              {error}
            </ThemedText>
          </View>
        ) : null}
        <View style={styles.composerWrap}>
          <View
            style={[
              styles.composerInputWrap,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
              },
            ]}
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Type here..."
              placeholderTextColor={theme.textSecondary}
              style={[styles.composerInput, { color: theme.text }]}
              returnKeyType="send"
              editable={!isReplyLoading}
              onSubmitEditing={() => {
                void sendMessage(draft);
              }}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            disabled={isReplyLoading}
            onPress={() => {
              void sendMessage(draft);
            }}
            style={[
              styles.sendButton,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
              },
            ]}
          >
            <SymbolView
              name={{ ios: "paperplane.fill", android: "send" }}
              size={18}
              tintColor={theme.text}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.three,
  },
  keyboardWrap: {
    flex: 1,
  },
  headerSection: {
    marginTop: Spacing.three,
    position: "relative",
    zIndex: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.two,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  backButtonSurface: {
    ...StyleSheet.absoluteFill,
    borderRadius: 25,
    overflow: "hidden",
  },
  backButtonGlass: {
    ...StyleSheet.absoluteFill,
  },
  dropdownButton: {
    width: 120,
    height: 50,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
    position: "relative",
  },
  chevronCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
  },
  glassSurface: {
    ...StyleSheet.absoluteFill,
  },
  dropdownMenu: {
    position: "absolute",
    top: 56,
    right: 0,
    width: 120,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: Spacing.one,
    overflow: "hidden",
    zIndex: 30,
    elevation: 12,
  },
  dropdownOption: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderColor: "transparent",
  },
  dropdownOptionPressed: {
    opacity: 0.75,
  },
  chatPanel: {
    marginTop: Spacing.four,
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  messageWrapper: {
    marginBottom: Spacing.three,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.two,
    maxWidth: "100%",
  },
  userMessageWrapper: {
    alignSelf: "flex-end",
    paddingLeft: Spacing.four,
  },
  assistantMessageWrapper: {
    alignSelf: "flex-start",
    paddingRight: Spacing.four,
  },
  messageBubble: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    flexShrink: 1,
  },
  userBubble: {
    borderBottomRightRadius: 6,
    maxWidth: "86%",
  },
  assistantBubble: {
    borderBottomLeftRadius: 6,
    maxWidth: "86%",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  senderName: {
    marginBottom: Spacing.half,
  },
  messageText: {
    lineHeight: 21,
    flexShrink: 1,
  },
  quickRepliesWrap: {
    marginTop: Spacing.three,
  },
  quickRepliesContent: {
    paddingRight: Spacing.two,
    gap: Spacing.two,
  },
  quickReplyChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  errorWrap: {
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  errorText: {
    lineHeight: 18,
  },
  composerWrap: {
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  composerInputWrap: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    minHeight: 46,
    justifyContent: "center",
  },
  composerInput: {
    fontSize: 14,
    fontFamily: Fonts.sansMedium,
    paddingVertical: Spacing.one,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  skeletonSender: {
    width: 130,
    height: 12,
    borderRadius: 6,
    marginBottom: Spacing.two,
  },
  skeletonMessageLine: {
    width: 190,
    maxWidth: "100%",
    height: 12,
    borderRadius: 6,
    marginBottom: Spacing.one,
  },
  skeletonMessageLineShort: {
    width: 120,
    height: 12,
    borderRadius: 6,
  },
});
