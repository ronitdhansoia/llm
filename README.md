# CryptoLens

**AI-Powered Crypto Chart Analyzer**

CryptoLens is a full-stack web application that fetches real-time cryptocurrency data, computes technical indicators, renders interactive charts, generates AI-powered analysis, backtests trading strategies with Monte Carlo simulation, exports PineScript code, and provides a natural language terminal interface.

Built as a course project for "Introduction to LLMs."

---

## Features

### Interactive Charts
- Canvas-rendered price charts using TradingView Lightweight Charts
- Zoom, pan, crosshair with live value tracking
- SMA (20/50), EMA (12/26), Bollinger Bands overlays
- RSI and MACD sub-charts with independent crosshairs
- Timeframes: 1D, 3D, 7D, 30D, 90D, 1Y
- Auto-refresh every 60s on short timeframes
- Buy/sell trade markers from backtest results rendered on the main chart

### AI Analysis
- Natural language prompt bar (fixed at bottom of dashboard)
- Structured analysis output: trend, momentum, key levels, signal summary, confidence
- Strategy-aware: describe a strategy and the analysis is tailored to it
- All indicator values injected into the LLM prompt as real-time context

### Strategy Backtesting
- AI generates concrete trading rules from natural language strategy descriptions
- Backtest engine simulates trades against historical price + indicator data
- Supported rules: RSI oversold/overbought, SMA golden/death cross, MACD crossover, Bollinger band bounce, stop loss, take profit
- Full trade log with entry/exit dates, prices, returns, and exit reasons
- Metrics: total return, win rate, max drawdown, Sharpe ratio, profit factor

### Monte Carlo Simulation
- 500 randomized trade sequence simulations
- Percentile equity bands (5th/25th/50th/75th/95th)
- Return distribution histogram
- Probability of profit, probability of doubling, median max drawdown

### PineScript Export
- One-click code generation for TradingView
- Includes all strategy rules, inputs, indicators, entry/exit logic, risk management
- Collapsible code viewer with line numbers and copy button

### Terminal
- Embedded web CLI at `/terminal`
- Structured commands: `price`, `analyze`, `backtest`, `indicators`, `coins`
- Free-form natural language prompting with auto coin/intent detection
- Conversation memory: remembers coin, strategy, timeframe, and last results across commands
- Conversation history sent to LLM for follow-up awareness
- Also available as `cryptolens.sh` shell script with interactive arrow-key menu

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Server Components, API Routes) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| Charts | TradingView Lightweight Charts v5 (canvas) |
| LLM | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| Market Data | CoinGecko free API |
| Indicators | `technicalindicators` npm package |
| Icons | Lucide React |
| Font | Inter (primary), Bebas Neue (terminal display), SF Mono (terminal body) |
| Deployment | Vercel |

---

## Architecture

```
User Input (prompt / coin / timeframe)
        |
        v
  Next.js API Routes
        |
        +--> GET /api/market-data
        |       Fetches price data from CoinGecko
        |       Computes SMA, EMA, RSI, MACD, Bollinger Bands server-side
        |       Returns prices + indicators + metadata
        |
        +--> POST /api/analyze
        |       Sends indicator values + user strategy to Claude
        |       Returns structured JSON (trend, momentum, key levels, confidence)
        |
        +--> POST /api/generate-strategy
        |       Sends user's natural language strategy to Claude
        |       Returns concrete backtestable parameters
        |       (RSI thresholds, crossover toggles, stop loss %, take profit %)
        |
        +--> POST /api/chat
                Sends message + conversation history + session context to Claude
                Returns plain text response for terminal
        |
        v
  Client-Side Processing
        |
        +--> Backtest Engine (lib/backtest.ts)
        |       Simulates trades against historical data using strategy rules
        |       Outputs equity curve, trade log, performance metrics
        |
        +--> Monte Carlo Simulation (lib/backtest.ts)
        |       500 randomized trade order permutations
        |       Percentile bands, return distribution, risk metrics
        |
        +--> PineScript Generator (lib/pinescript.ts)
                Converts strategy rules to TradingView Pine Script v5
```

---

## Project Structure

```
cryptolens/
  app/
    layout.tsx                    Root layout, Inter font, dark theme
    page.tsx                      Landing page (hero + how it works)
    globals.css                   Dark theme, noise texture, shimmer animations
    analyze/
      page.tsx                    Main dashboard (charts, analysis, backtest, Monte Carlo)
    backtest/
      page.tsx                    Standalone backtest page (direct link support)
    terminal/
      page.tsx                    Terminal page with Bebas Neue display font
    api/
      market-data/route.ts        CoinGecko data + indicator computation
      analyze/route.ts            Claude analysis endpoint
      generate-strategy/route.ts  Claude strategy generation endpoint
      chat/route.ts               Claude free-form chat with conversation history
  components/
    Navbar.tsx                    Fixed nav with Home, Dashboard, Terminal links
    Hero.tsx                      Aurora background, animated headline, prompt bar
    HowItWorks.tsx                Three-step feature cards
    PromptBar.tsx                 Hero prompt bar with coin selector + suggestions
    CoinSelector.tsx              Searchable dropdown (15 coins)
    TimeframeToggle.tsx           Animated pill toggle (1D/3D/7D/30D/90D/1Y)
    PriceChart.tsx                Main chart + RSI + MACD (Lightweight Charts)
    AnalysisCard.tsx              Structured AI analysis display
    AnalyzeButton.tsx             Loading button + skeleton states
    BacktestDashboard.tsx         Metrics grid, price chart with trade markers, trade log
    MonteCarloChart.tsx           Percentile fan chart, return histogram, risk metrics
    PineScriptViewer.tsx          Collapsible code viewer with copy button
    Terminal.tsx                  Interactive CLI with context memory + intent detection
    ui/                           Aceternity-style primitives (spotlight, sparkles, glass cards)
  lib/
    types.ts                      All TypeScript interfaces
    utils.ts                      cn() class name helper
    coingecko.ts                  CoinGecko API client with cache + retry
    indicators.ts                 SMA, EMA, RSI, MACD, Bollinger Bands computation
    claude.ts                     Claude API calls (analysis + strategy generation)
    backtest.ts                   Backtesting engine + Monte Carlo simulation
    pinescript.ts                 PineScript v5 code generator
  cryptolens.sh                   Interactive shell script CLI
```

---

## API Contracts

### GET /api/market-data

```
Query: ?coin=bitcoin&days=30

Response: {
  prices: [{ time: number, value: number }],
  ohlc: [],
  indicators: {
    sma20: number[], sma50: number[],
    ema12: number[], ema26: number[],
    rsi: number[],
    macd: { macd: number[], signal: number[], histogram: number[] },
    bollingerBands: { upper: number[], middle: number[], lower: number[] }
  },
  metadata: { coin, days, lastPrice, change24h }
}
```

### POST /api/analyze

```
Body: {
  coin, timeframe, currentPrice,
  indicators: { rsiLatest, sma20Latest, sma50Latest, ... },
  recentPriceAction, strategy?
}

Response: {
  trend: "Bullish" | "Bearish" | "Neutral",
  trendExplanation, momentum,
  keyLevels: { support, resistance, explanation },
  signalSummary, confidence, disclaimer
}
```

### POST /api/generate-strategy

```
Body: {
  coin, timeframe, currentPrice, strategy, indicators
}

Response: {
  name, description, entryRules[], exitRules[],
  rsiOversold, rsiOverbought,
  useSMACross, useMACDCross, useBollingerBounce,
  stopLossPercent, takeProfitPercent
}
```

### POST /api/chat

```
Body: {
  message, coinData?, conversationHistory?, context?
}

Response: { response: string }
```

---

## How the LLM is Used

Three distinct Claude API calls, each with a specialized system prompt:

**1. Analysis** - Claude acts as a technical analyst educator. Receives all indicator values as structured data. Returns strict JSON with trend, momentum, key levels, and confidence. The user's strategy prompt is injected into the system prompt so the analysis is tailored.

**2. Strategy Generation** - Claude receives a natural language strategy description and current indicator values. Returns concrete backtestable parameters (RSI thresholds, crossover booleans, stop loss/take profit percentages). These parameters are machine-readable rules that the backtest engine executes deterministically.

**3. Free-form Chat** - Claude receives the user's message, last 6 conversation turns, session context (current coin, strategy, analysis results, backtest results), and optionally live market data. Responds in concise terminal-formatted plain text.

Key LLM concepts demonstrated:
- Structured JSON output with strict schema enforcement
- System prompt engineering (different personas per endpoint)
- Real-time context injection (live market data in every prompt)
- Multi-step pipeline (natural language -> rules -> simulation -> visualization)
- Conversational memory (conversation history + session state)

---

## Terminal Commands

| Command | Aliases | Description |
|---------|---------|-------------|
| `price <coin>` | `fetch`, `get`, `check`, `lookup`, `show` | Current price + 24h change |
| `analyze <coin>` | `analyse`, `analysis` | Full AI technical analysis |
| `backtest <coin> <strategy>` | `bt`, `test`, `run`, `simulate` | Generate strategy + run backtest |
| `indicators <coin>` | `ind`, `ta` | Latest indicator values |
| `coins` | | List supported coins |
| `clear` | | Clear terminal + reset context |
| `help` | | Show available commands |

All commands support timeframe suffixes: `analyze bitcoin 7d`, `backtest eth 1y momentum`

Any unrecognized input is treated as free-form AI chat with automatic coin detection and intent routing.

---

## Supported Coins

Bitcoin (BTC), Ethereum (ETH), BNB, Solana (SOL), XRP, Cardano (ADA), Dogecoin (DOGE), Polkadot (DOT), Avalanche (AVAX), Chainlink (LINK), Litecoin (LTC), Uniswap (UNI), NEAR Protocol (NEAR), Stellar (XLM)

---

## Getting Started

### Prerequisites
- Node.js 20+
- Anthropic API key

### Installation

```bash
git clone https://github.com/ronitdhansoia/llm.git
cd llm/cryptolens
npm install
```

### Environment Variables

Create `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

CoinGecko free API requires no key.

### Development

```bash
npm run dev
```

Open http://localhost:3000

### Production Build

```bash
npm run build
npm run start
```

### Shell CLI

```bash
chmod +x cryptolens.sh
./cryptolens.sh
```

Requires `curl` and `jq`. Set `CRYPTOLENS_API` env var if not running locally:

```bash
CRYPTOLENS_API=https://your-app.vercel.app ./cryptolens.sh
```

---

## Deployment

Deploy to Vercel:

1. Push to GitHub
2. Import repository in Vercel
3. Set root directory to `cryptolens`
4. Add environment variable: `ANTHROPIC_API_KEY`
5. Deploy

---

## Design

- Background: pure black (#000000)
- Text: white at varying opacities (80%, 40%, 20%, 10%) for hierarchy
- No accent colors - monochrome only
- Charts: white lines on black, no colored fills
- Cards: white/2% background, white/6% borders
- Font: Inter (UI), Bebas Neue (terminal display), SF Mono (terminal body)
- All elements animate on entry with Framer Motion
- Mobile responsive across all breakpoints
- Canvas-based aurora background on hero page

---

## Codebase Stats

| Metric | Value |
|--------|-------|
| Lines of code | ~6,300 TypeScript/TSX |
| Source files | 37 |
| API routes | 4 |
| Technical indicators | 7 |
| Monte Carlo simulations | 500 per backtest |
| Supported coins | 15 |
| Chart timeframes | 6 (1D to 1Y) |

---

## Limitations

- CoinGecko free tier: rate limited (~10-30 req/min), max 5-min granularity
- No real-time WebSocket streaming (polling every 60s for short timeframes)
- Backtest assumes no slippage, fees, or liquidity constraints
- Strategy rules limited to indicator-based signals
- LLM responses are non-deterministic

---

## Disclaimer

This is an educational tool built for a university course project. It is not financial advice. All analysis, backtesting, and strategy suggestions are for learning purposes only. Do not make financial decisions based on this tool's output.

---

## License

MIT
