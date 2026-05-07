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
    <div className="space-y-3 border-t border-white/10 pt-3 sm:pt-4">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={2}
        placeholder="Ask about automation priorities, anomalies, departments, or workload patterns..."
        className="w-full resize-none rounded-xl border border-white/10 bg-[#141416] px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-accent/50 sm:rounded-2xl sm:px-4 sm:py-3"
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {[
            "Top automation priority",
            "Main anomaly risk",
            "Departmental breakdown",
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onChange(prompt)}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] transition hover:border-white/20 hover:text-foreground sm:px-3 sm:py-1.5 sm:text-xs"
            >
              {prompt}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-accent/30 bg-accent px-2.5 py-1.5 text-xs font-semibold text-[#141416] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
        >
          <SendHorizonal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
}

export default ChatInput;