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
        className="fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full border border-accent/30 bg-accent text-[#141416] shadow-2xl transition hover:scale-[1.02]"
        aria-label="Open chat assistant"
      >
        <MessageSquareText className="h-6 w-6" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]">
          <button
            type="button"
            aria-label="Close chat assistant"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-[460px] flex-col border-l border-white/10 bg-[#1C1C1F] p-4 text-foreground shadow-2xl md:p-5">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Grounded assistant</p>
                <h2 className="mt-2 text-2xl font-semibold">Ask about the current filter scope</h2>
                <p className="mt-2 text-sm text-muted-foreground">{filtersToString(activeFilters)}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-muted-foreground transition hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <div className="rounded-3xl border border-white/8 bg-white/3 p-4 text-sm text-muted-foreground">
                  Try asking for the top automation priority, the main anomaly risk, or a departmental breakdown.
                </div>
              ) : null}

              {messages.map((message, index) => (
                <ChatMessage key={`${message.role}-${index}`} role={message.role} content={message.content} />
              ))}

              {error ? <p className="text-sm text-red-300">{error}</p> : null}
            </div>

            <ChatInput value={input} onChange={setInput} onSubmit={() => void submit()} disabled={loading} />
          </aside>
        </div>
      ) : null}
    </>
  );
}

export default ChatPanel;