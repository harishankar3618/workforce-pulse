import { NextResponse } from "next/server";
import getAnalytics from "@/lib/etl/index";

export async function GET() {
  try {
    const analytics = await getAnalytics();
    return new NextResponse(JSON.stringify(analytics), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (error) {
    console.error("/api/analytics error", error);
    return new NextResponse(JSON.stringify({ error: "ETL pipeline failed", detail: String(error) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

export const runtime = "nodejs";
