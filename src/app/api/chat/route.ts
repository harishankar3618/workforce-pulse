import { streamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import getAnalytics from "@/lib/etl/index";
import { buildContext } from "@/lib/ai/buildContext";
import { buildSystemPrompt } from "@/lib/ai/systemPrompt";
import type { Filters } from "@/lib/types";

interface ChatRequestBody {
  messages: Array<{ role: string; content: string }>;
  filters?: Partial<Filters>;
}

export async function POST(request: Request) {
  try {
    if (!process.env.OLLAMA_BASE_URL || !process.env.OLLAMA_API_KEY) {
      return Response.json(
        { error: "AI not configured", detail: "Missing OLLAMA_BASE_URL or OLLAMA_API_KEY." },
        { status: 503 },
      );
    }

    const body = (await request.json()) as ChatRequestBody;
    const analytics = await getAnalytics();
    const filters: Filters = {
      department: body.filters?.department ?? null,
      taskCategory: body.filters?.taskCategory ?? null,
      week: body.filters?.week ?? null,
      employeeId: body.filters?.employeeId ?? null,
    };

    const context = buildContext(analytics, filters);
    const system = buildSystemPrompt(context, filters);
    const transcript = body.messages
      .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
      .join("\n\n");

    const provider = createOpenAICompatible({
      name: "ollama-cloud",
      baseURL: process.env.OLLAMA_BASE_URL,
      headers: {
        Authorization: `Bearer ${process.env.OLLAMA_API_KEY}`,
      },
    });

    const modelName = process.env.OLLAMA_MODEL ?? "gpt-oss:120b";

    const result = await streamText({
      model: provider(modelName),
      prompt: [system, "CONVERSATION HISTORY", transcript, "ASSISTANT:"].join("\n\n"),
      temperature: 0.1,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("/api/chat error", error);

    return Response.json(
      { error: "Chat pipeline failed", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";