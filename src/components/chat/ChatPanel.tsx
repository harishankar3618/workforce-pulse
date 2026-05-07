"use client";

import { MessageSquareText, X } from "lucide-react";
import { useMemo, useState } from "react";

import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";
import useFilterStore from "@/store/filterStore";

interface ChatEntry {
  role: "user" | "assistant";
  content: string;
}

function filtersToString(filters: { department: string | null; taskCategory: string | null; week: string | null }) {
  return JSON.stringify(filters);
}

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const department = useFilterStore((state) => state.department);
  const taskCategory = useFilterStore((state) => state.taskCategory);
  const week = useFilterStore((state) => state.week);

  const activeFilters = useMemo(
    () => ({ department, taskCategory, week, employeeId: null }),
    [department, taskCategory, week],
  );

  const submit = async () => {
    if (!input.trim() || loading) {
      return;
    }

    const nextMessages: ChatEntry[] = [...messages, { role: "user", content: input.trim() }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages,
          filters: activeFilters,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Chat request failed with ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      setMessages((current) => [...current, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        assistantContent += decoder.decode(value, { stream: true });
        setMessages((current) => [
          ...current.slice(0, -1),
          { role: "assistant", content: assistantContent },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "I could not complete that request.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-accent text-[#141416] shadow-2xl transition hover:scale-[1.02] active:scale-[0.98] sm:bottom-5 sm:right-5 sm:h-14 sm:w-14 safe-bottom safe-right"
        aria-label="Open chat assistant"
      >
        <MessageSquareText className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]">
          <button
            type="button"
            aria-label="Close chat assistant"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-[100%] flex-col border-l border-white/10 bg-[#1C1C1F] text-foreground shadow-2xl sm:right-5 sm:top-5 sm:h-[calc(100vh-2.5rem)] sm:w-full sm:max-w-[460px] sm:rounded-2xl safe-top safe-right">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5 sm:py-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                  Grounded assistant
                </p>
                <h2 className="mt-1 text-lg font-semibold leading-tight sm:mt-2 sm:text-2xl">
                  Ask about the current filter scope
                </h2>
                <p className="mt-1.5 truncate text-[11px] text-muted-foreground sm:mt-2 sm:text-sm">
                  {filtersToString(activeFilters)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 p-1.5 text-muted-foreground transition hover:text-foreground sm:p-2"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
              {messages.length === 0 ? (
                <div className="rounded-2xl border border-white/8 bg-white/3 p-3 text-xs text-muted-foreground sm:rounded-3xl sm:p-4 sm:text-sm">
                  Try asking for the top automation priority, the main anomaly risk, or a departmental breakdown.
                </div>
              ) : null}

              {messages.map((message, index) => (
                <ChatMessage key={`${message.role}-${index}`} role={message.role} content={message.content} />
              ))}

              {error ? <p className="text-xs text-red-300 sm:text-sm">{error}</p> : null}
            </div>

            <div className="border-t border-white/10 px-4 py-3 sm:px-5 sm:py-4">
              <ChatInput
                value={input}
                onChange={setInput}
                onSubmit={() => void submit()}
                disabled={loading}
              />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

export default ChatPanel;