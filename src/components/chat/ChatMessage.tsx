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
          "max-w-[90%] rounded-xl px-3 py-2 text-sm leading-5 shadow-dashboard-panel sm:max-w-[85%] sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm sm:leading-6",
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