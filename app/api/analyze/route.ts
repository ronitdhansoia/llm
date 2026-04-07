import { NextRequest } from "next/server";
import { analyzeWithClaude } from "@/lib/claude";
import type { AnalysisRequest } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body: AnalysisRequest = await request.json();

    if (!body.coin || !body.currentPrice || !body.indicators) {
      return Response.json(
        { error: "Missing required fields: coin, currentPrice, indicators" },
        { status: 400 }
      );
    }

    const analysis = await analyzeWithClaude(body);

    return Response.json(analysis);
  } catch (error) {
    console.error("Analysis error:", error);
    return Response.json(
      {
        error:
          "Failed to generate analysis. Please check your API key and try again.",
      },
      { status: 500 }
    );
  }
}
