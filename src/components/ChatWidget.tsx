"use client";

import { useReducer, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

interface ArticleSource {
  id: string;
  title: string;
  slug: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: ArticleSource[];
}

interface ChatState {
  isOpen: boolean;
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
}

type ChatAction =
  | { type: "TOGGLE_OPEN" }
  | { type: "SET_INPUT"; value: string }
  | { type: "ADD_USER_MESSAGE"; content: string }
  | { type: "START_LOADING" }
  | { type: "APPEND_TOKEN"; content: string }
  | { type: "SET_SOURCES"; sources: ArticleSource[] }
  | { type: "FINISH_LOADING" }
  | { type: "RESTORE_MESSAGES"; messages: ChatMessage[] };

const initialState: ChatState = {
  isOpen: false,
  messages: [],
  input: "",
  isLoading: false,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "TOGGLE_OPEN":
      return { ...state, isOpen: !state.isOpen };
    case "SET_INPUT":
      return { ...state, input: action.value };
    case "ADD_USER_MESSAGE":
      return {
        ...state,
        messages: [...state.messages, { role: "user", content: action.content }],
        input: "",
      };
    case "START_LOADING":
      return {
        ...state,
        isLoading: true,
        messages: [...state.messages, { role: "assistant", content: "" }],
      };
    case "APPEND_TOKEN": {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === "assistant") {
        msgs[msgs.length - 1] = { ...last, content: last.content + action.content };
      }
      return { ...state, messages: msgs };
    }
    case "SET_SOURCES": {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === "assistant") {
        msgs[msgs.length - 1] = { ...last, sources: action.sources };
      }
      return { ...state, messages: msgs };
    }
    case "FINISH_LOADING":
      return { ...state, isLoading: false };
    case "RESTORE_MESSAGES":
      return { ...state, messages: action.messages };
    default:
      return state;
  }
}

const SESSION_KEY = "ai-chat-history";

export function ChatWidget() {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Restore messages from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const messages = JSON.parse(saved) as ChatMessage[];
        dispatch({ type: "RESTORE_MESSAGES", messages });
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // Save messages to sessionStorage
  useEffect(() => {
    if (state.messages.length > 0) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(state.messages));
    }
  }, [state.messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages]);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || state.isLoading) return;

    dispatch({ type: "ADD_USER_MESSAGE", content: message });
    dispatch({ type: "START_LOADING" });

    const history = state.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });

      if (!response.ok) {
        dispatch({ type: "APPEND_TOKEN", content: "Ошибка при обращении к AI. Попробуйте позже." });
        dispatch({ type: "FINISH_LOADING" });
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const dataLine = line.trim();
          if (!dataLine.startsWith("data: ")) continue;
          const data = dataLine.slice(6);

          if (data === "[DONE]") {
            dispatch({ type: "FINISH_LOADING" });
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "token") {
              dispatch({ type: "APPEND_TOKEN", content: parsed.content });
            } else if (parsed.type === "sources") {
              dispatch({ type: "SET_SOURCES", sources: parsed.sources });
            }
          } catch {
            // ignore malformed events
          }
        }
      }

      dispatch({ type: "FINISH_LOADING" });
    } catch {
      dispatch({ type: "APPEND_TOKEN", content: "Ошибка сети. Проверьте подключение." });
      dispatch({ type: "FINISH_LOADING" });
    }
  }, [state.isLoading, state.messages]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(state.input);
  }, [sendMessage, state.input]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(state.input);
    }
  }, [sendMessage, state.input]);

  return (
    <>
      {/* Floating toggle button */}
      <button
        data-testid="chat-toggle-button"
        onClick={() => dispatch({ type: "TOGGLE_OPEN" })}
        className="fixed bottom-6 right-6 z-50 bg-primary text-primary-foreground rounded-full px-5 py-3 shadow-lg hover:opacity-90 transition-opacity flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        Спросить AI
      </button>

      {/* Chat panel */}
      <div
        ref={panelRef}
        data-testid="chat-panel"
        className={`fixed top-0 right-0 h-full w-[400px] max-w-full z-50 bg-card border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ${
          state.isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">AI Ассистент</h2>
          <button
            data-testid="chat-close-button"
            onClick={() => dispatch({ type: "TOGGLE_OPEN" })}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div
          data-testid="chat-messages"
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {state.messages.length === 0 && (
            <div className="text-center text-muted-foreground mt-8">
              <p>Задайте вопрос по базе знаний</p>
            </div>
          )}
          {state.messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {msg.content}
                {msg.role === "assistant" && msg.content === "" && state.isLoading && i === state.messages.length - 1 && (
                  <span className="inline-block w-2 h-4 bg-muted-foreground animate-pulse" />
                )}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1">Источники:</p>
                    {msg.sources.map((source) => (
                      <Link
                        key={source.id}
                        href={`/articles/${source.slug}`}
                        className="block text-xs text-primary hover:underline"
                      >
                        {source.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-border flex gap-2">
          <input
            data-testid="chat-input"
            type="text"
            value={state.input}
            onChange={(e) => dispatch({ type: "SET_INPUT", value: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="Введите вопрос..."
            className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            disabled={state.isLoading}
          />
          <button
            data-testid="chat-send-button"
            type="submit"
            disabled={state.isLoading || !state.input.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>

      {/* Backdrop */}
      {state.isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => dispatch({ type: "TOGGLE_OPEN" })}
        />
      )}
    </>
  );
}
