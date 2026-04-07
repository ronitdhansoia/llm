import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { message, coinData } = await request.json();

    if (!message) {
      return Response.json({ error: "Missing message" }, { status: 400 });
    }

    const systemPrompt = `You are CryptoLens, a crypto technical analyst assistant running inside a terminal CLI. You answer questions about cryptocurrency markets, technical analysis, trading strategies, and indicators.

Rules:
- Keep responses concise — this is a terminal, not an essay. 2-4 short paragraphs max.
- Use plain text only. No markdown, no bullet points with *, no headers with #.
- When referencing numbers, be specific.
- Always end with a one-line disclaimer: "This is educational only, not financial advice."
- If the user asks about a specific coin and indicator data is provided, reference the actual values.
- If no coin data is provided, give general educational answers.`;

    let userMessage = message;

    if (coinData) {
      userMessage += `\n\nCurrent market data for ${coinData.coin}:
Price: $${coinData.price}
24h Change: ${coinData.change24h}%
RSI (14): ${coinData.rsi}
SMA 20: $${coinData.sma20}
SMA 50: $${coinData.sma50}
EMA 12: $${coinData.ema12}
EMA 26: $${coinData.ema26}
MACD: ${coinData.macd}
MACD Signal: ${coinData.macdSignal}
Bollinger Upper: $${coinData.bbUpper}
Bollinger Lower: $${coinData.bbLower}`;
    }

    const result = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = result.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No response");
    }

    return Response.json({ response: textBlock.text });
  } catch (error) {
    console.error("Chat error:", error);
    return Response.json(
      { error: "Failed to get response. Check your API key." },
      { status: 500 }
    );
  }
}
