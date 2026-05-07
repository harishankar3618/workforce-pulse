"use client";

import { SendHorizonal } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function ChatInput({ value, onChange, onSubmit, disabled }: ChatInputProps) {
  return (
    <div className="space-y-3 border-t border-white/10 pt-4">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        placeholder="Ask about automation priorities, anomalies, departments, or workload patterns..."
        className="w-full resize-none rounded-2xl border border-white/10 bg-[#141416] px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-accent/50"
      />
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {[
            "What is the top automation priority?",
            "Explain the main anomaly risk.",
            "Break down repetitive work by department.",
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onChange(prompt)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 transition hover:border-white/20 hover:text-foreground"
            >
              {prompt}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent px-4 py-2 text-sm font-semibold text-[#141416] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <SendHorizonal className="h-4 w-4" />
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatInput;