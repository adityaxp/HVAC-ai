import { create } from "zustand";

import { AI_ASSISTANT_CHAT } from "@/services";

export type AssistantMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  sender?: string;
};

type AssistantTabState = {
  messages: AssistantMessage[];
  isReplyLoading: boolean;
  error: string | null;
  sendMessage: (unitId: string, message: string) => Promise<void>;
  clearError: () => void;
  resetChat: () => void;
};

const INITIAL_MESSAGES: AssistantMessage[] = [
  {
    id: "assistant-welcome",
    role: "assistant",
    text: "Hi, I'm your Softway HVAC AI assistant. How can I help you today?",
    sender: "Softway Assistant",
  },
];

const normalizeUnitId = (unitId: string) => unitId.replace(/\s+/g, "_").toUpperCase();

const extractAssistantReply = (data: unknown): string | null => {
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object") return null;

  const payload = data as Record<string, unknown>;
  const candidates = [
    payload.answer,
    payload.reply,
    payload.response,
    payload.message,
    payload.output,
  ];

  const found = candidates.find((value) => typeof value === "string");
  return typeof found === "string" ? found : null;
};

export const useAssistantTabStore = create<AssistantTabState>((set) => ({
  messages: INITIAL_MESSAGES,
  isReplyLoading: false,
  error: null,
  sendMessage: async (unitId, message) => {
    const trimmed = message.trim();
    if (!trimmed) return;

    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: `user-${Date.now()}`,
          role: "user",
          text: trimmed,
        },
      ],
      isReplyLoading: true,
      error: null,
    }));

    try {
      const response = await AI_ASSISTANT_CHAT(normalizeUnitId(unitId), trimmed);
      const reply =
        extractAssistantReply(response.data) ??
        "I could not parse the assistant response. Please try again.";

      set((state) => ({
        messages: [
          ...state.messages,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            text: reply,
            sender: "Softway Assistant",
          },
        ],
        isReplyLoading: false,
      }));
    } catch (err) {
      const messageText =
        err instanceof Error ? err.message : "Failed to fetch assistant response";

      set((state) => ({
        error: messageText,
        isReplyLoading: false,
        messages: [
          ...state.messages,
          {
            id: `assistant-error-${Date.now()}`,
            role: "assistant",
            text: "I couldn't fetch a response right now. Please try again.",
            sender: "Softway Assistant",
          },
        ],
      }));
    }
  },
  clearError: () => set({ error: null }),
  resetChat: () => set({ messages: INITIAL_MESSAGES, isReplyLoading: false, error: null }),
}));
