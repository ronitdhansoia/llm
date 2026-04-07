import Anthropic from "@anthropic-ai/sdk";
import type {
  AnalysisRequest,
  AnalysisResponse,
  GenerateStrategyRequest,
  StrategyRules,
} from "./types";

const anthropic = new Anthropic();

export async function analyzeWithClaude(
  request: AnalysisRequest
): Promise<AnalysisResponse> {
  const strategyContext = request.strategy
    ? `\n\nThe user has a specific strategy or question: "${request.strategy}"\nTailor your analysis to address this. Incorporate it into your trendExplanation, momentum, and signalSummary fields - evaluate the indicators through the lens of this strategy.`
    : "";

  const systemPrompt = `You are a crypto technical analyst educator. Given the following technical indicator data for ${request.coin} over the last ${request.timeframe}, provide a structured educational analysis.${strategyContext}

You MUST respond in this exact JSON format and nothing else:
{
  "trend": "Bullish" | "Bearish" | "Neutral",
  "trendExplanation": "...",
  "momentum": "...",
  "keyLevels": { "support": number, "resistance": number, "explanation": "..." },
  "signalSummary": "...",
  "confidence": "High" | "Medium" | "Low",
  "disclaimer": "This analysis is purely educational and not financial advice."
}

Be specific, reference the actual indicator values provided, and explain what each indicator is showing in plain English. Keep each text field to 2-3 sentences.`;

  const userMessage = `Analyze the following technical indicator data for ${request.coin.toUpperCase()}:

Current Price: $${request.currentPrice.toLocaleString()}
Timeframe: ${request.timeframe}

Technical Indicators:
- RSI (14): ${request.indicators.rsiLatest.toFixed(2)}
- SMA 20: $${request.indicators.sma20Latest.toFixed(2)}
- SMA 50: $${request.indicators.sma50Latest.toFixed(2)}
- EMA 12: $${request.indicators.ema12Latest.toFixed(2)}
- EMA 26: $${request.indicators.ema26Latest.toFixed(2)}
- MACD: ${request.indicators.macdLatest.toFixed(2)}
- MACD Signal: ${request.indicators.macdSignalLatest.toFixed(2)}
- MACD Histogram: ${request.indicators.macdHistogramLatest.toFixed(2)}
- Bollinger Upper: $${request.indicators.bollingerUpper.toFixed(2)}
- Bollinger Middle: $${request.indicators.bollingerMiddle.toFixed(2)}
- Bollinger Lower: $${request.indicators.bollingerLower.toFixed(2)}

Recent Price Action: ${request.recentPriceAction}
${request.strategy ? `\nUser Strategy/Question: ${request.strategy}` : ""}
Provide your analysis as JSON only.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: userMessage,
      },
    ],
    system: systemPrompt,
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const analysis: AnalysisResponse = JSON.parse(jsonStr);
  return analysis;
}

export async function generateStrategy(
  request: GenerateStrategyRequest
): Promise<StrategyRules> {
  const systemPrompt = `You are a crypto trading strategy designer for educational backtesting. Given the user's strategy idea and current indicator data for ${request.coin}, produce a concrete, rule-based trading strategy that can be backtested against historical data.

You MUST respond in this exact JSON format and nothing else:
{
  "name": "Short descriptive name for the strategy",
  "description": "1-2 sentence explanation of the strategy logic",
  "entryRules": ["Human-readable rule 1", "Human-readable rule 2"],
  "exitRules": ["Human-readable rule 1", "Human-readable rule 2"],
  "rsiOversold": number (0-50, the RSI level that triggers a buy signal, e.g. 30),
  "rsiOverbought": number (50-100, the RSI level that triggers a sell signal, e.g. 70),
  "useSMACross": boolean (true if strategy uses SMA 20/50 golden cross as entry),
  "useMACDCross": boolean (true if strategy uses MACD crossing above signal as entry),
  "useBollingerBounce": boolean (true if strategy buys when price touches lower Bollinger Band),
  "stopLossPercent": number (1-20, stop loss as percentage, e.g. 5),
  "takeProfitPercent": number (2-50, take profit as percentage, e.g. 15)
}

Choose parameter values that make sense for the user's strategy description. If the user describes a conservative strategy, use tighter stops. If aggressive, use wider ranges. Always pick realistic values.`;

  const userMessage = `Create a backtestable strategy for ${request.coin.toUpperCase()} based on:

User's strategy idea: "${request.strategy}"
Timeframe: ${request.timeframe}
Current Price: $${request.currentPrice.toLocaleString()}

Current Indicators:
- RSI: ${request.indicators.rsiLatest.toFixed(2)}
- SMA 20: $${request.indicators.sma20Latest.toFixed(2)}
- SMA 50: $${request.indicators.sma50Latest.toFixed(2)}
- MACD: ${request.indicators.macdLatest.toFixed(2)}
- MACD Signal: ${request.indicators.macdSignalLatest.toFixed(2)}
- Bollinger Upper: $${request.indicators.bollingerUpper.toFixed(2)}
- Bollinger Lower: $${request.indicators.bollingerLower.toFixed(2)}

Respond with JSON only.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: userMessage }],
    system: systemPrompt,
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  return JSON.parse(jsonStr) as StrategyRules;
}
