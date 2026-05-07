"use client";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={[
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-dashboard-panel",
          isUser
            ? "bg-accent text-[#141416]"
            : "border border-white/10 bg-[#242428] text-foreground",
        ].join(" ")}
      >
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  );
}

export default ChatMessage;