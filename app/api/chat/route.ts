import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { message, coinData, conversationHistory, context } =
      await request.json();

    if (!message) {
      return Response.json({ error: "Missing message" }, { status: 400 });
    }

    let systemPrompt = `You are CryptoLens, a crypto technical analyst assistant running inside a terminal CLI. You answer questions about cryptocurrency markets, technical analysis, trading strategies, and indicators.

Rules:
- Keep responses concise - this is a terminal, not an essay. 2-4 short paragraphs max.
- Use plain text only. No markdown, no bullet points with *, no headers with #.
- When referencing numbers, be specific.
- Always end with a one-line disclaimer: "This is educational only, not financial advice."
- If the user asks about a specific coin and indicator data is provided, reference the actual values.
- If no coin data is provided, give general educational answers.
- If the user says "why?", "explain more", "go deeper", or asks a follow-up, refer to the conversation history.
- If the user says "what about X" where X is a different coin, compare it to the previous coin if data is available.
- When suggesting strategies, be specific with entry/exit rules, indicator thresholds, and risk management parameters so they can be backtested.`;

    // Add context about what the user has been doing
    if (context) {
      const parts: string[] = [];
      if (context.coin)
        parts.push(`The user is currently looking at ${context.coin}.`);
      if (context.strategy)
        parts.push(
          `Their current strategy idea: "${context.strategy.slice(0, 300)}"`
        );
      if (context.lastAnalysis)
        parts.push(
          `Recent analysis result: ${context.lastAnalysis.slice(0, 300)}`
        );
      if (context.lastBacktestSummary)
        parts.push(
          `Recent backtest: ${context.lastBacktestSummary.slice(0, 200)}`
        );
      if (parts.length > 0) {
        systemPrompt += `\n\nSession context:\n${parts.join("\n")}`;
      }
    }

    // Build user message with coin data
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

    // Build messages array with conversation history
    const messages: { role: "user" | "assistant"; content: string }[] = [];

    // Include last 6 turns of conversation for context
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recent = conversationHistory.slice(-6);
      for (const msg of recent) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add current message
    messages.push({ role: "user", content: userMessage });

    const result = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      system: systemPrompt,
      messages,
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
