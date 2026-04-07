import { NextRequest } from "next/server";
import { generateStrategy } from "@/lib/claude";
import type { GenerateStrategyRequest } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body: GenerateStrategyRequest = await request.json();

    if (!body.coin || !body.strategy || !body.indicators) {
      return Response.json(
        { error: "Missing required fields: coin, strategy, indicators" },
        { status: 400 }
      );
    }

    const strategy = await generateStrategy(body);

    return Response.json(strategy);
  } catch (error) {
    console.error("Strategy generation error:", error);
    return Response.json(
      { error: "Failed to generate strategy. Please try again." },
      { status: 500 }
    );
  }
}
