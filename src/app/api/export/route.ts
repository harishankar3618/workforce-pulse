import getAnalytics from "@/lib/etl/index";
import { buildExportPayload } from "@/lib/ai/buildContext";
import type { Filters } from "@/lib/types";

function readFilters(request: Request): Filters {
  const url = new URL(request.url);

  return {
    department: url.searchParams.get("department") || null,
    taskCategory: url.searchParams.get("taskCategory") || null,
    week: url.searchParams.get("week") || null,
    employeeId: url.searchParams.get("employeeId") || null,
  };
}

export async function GET(request: Request) {
  try {
    const analytics = await getAnalytics();
    const filters = readFilters(request);
    const payload = buildExportPayload(analytics, filters);

    return Response.json(payload, {
      headers: {
        "cache-control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (error) {
    console.error("/api/export error", error);

    return Response.json(
      { error: "Export payload failed", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";