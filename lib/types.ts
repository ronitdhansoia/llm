export interface PricePoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface SimplePrice {
  time: number;
  value: number;
}

export interface IndicatorData {
  sma20: number[];
  sma50: number[];
  ema12: number[];
  ema26: number[];
  rsi: number[];
  macd: {
    macd: number[];
    signal: number[];
    histogram: number[];
  };
  bollingerBands: {
    upper: number[];
    middle: number[];
    lower: number[];
  };
}

export interface MarketDataResponse {
  prices: SimplePrice[];
  ohlc: PricePoint[];
  indicators: IndicatorData;
  metadata: {
    coin: string;
    days: number;
    lastPrice: number;
    change24h: number;
  };
}

export interface AnalysisRequest {
  coin: string;
  timeframe: string;
  currentPrice: number;
  indicators: {
    rsiLatest: number;
    sma20Latest: number;
    sma50Latest: number;
    ema12Latest: number;
    ema26Latest: number;
    macdLatest: number;
    macdSignalLatest: number;
    macdHistogramLatest: number;
    bollingerUpper: number;
    bollingerMiddle: number;
    bollingerLower: number;
  };
  recentPriceAction: string;
  strategy?: string;
}

export interface AnalysisResponse {
  trend: "Bullish" | "Bearish" | "Neutral";
  trendExplanation: string;
  momentum: string;
  keyLevels: {
    support: number;
    resistance: number;
    explanation: string;
  };
  signalSummary: string;
  confidence: "High" | "Medium" | "Low";
  disclaimer: string;
}

export interface CoinOption {
  id: string;
  name: string;
  symbol: string;
  image: string;
}

// ── Backtesting ──

export interface StrategyRules {
  name: string;
  description: string;
  entryRules: string[];
  exitRules: string[];
  // Concrete params the backtest engine evaluates
  rsiOversold: number;       // buy when RSI drops below (e.g. 30)
  rsiOverbought: number;     // sell when RSI rises above (e.g. 70)
  useSMACross: boolean;      // buy when SMA20 crosses above SMA50
  useMACDCross: boolean;     // buy on MACD crossing above signal
  useBollingerBounce: boolean; // buy when price touches lower band
  stopLossPercent: number;   // e.g. 5 means 5%
  takeProfitPercent: number; // e.g. 10 means 10%
}

export interface Trade {
  entryIndex: number;
  exitIndex: number;
  entryPrice: number;
  exitPrice: number;
  entryTime: number;
  exitTime: number;
  returnPercent: number;
  type: "win" | "loss";
  exitReason: string;
}

export interface BacktestResult {
  strategy: StrategyRules;
  trades: Trade[];
  equity: { time: number; value: number }[];
  metrics: {
    totalReturn: number;
    winRate: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    maxDrawdown: number;
    sharpeRatio: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    bestTrade: number;
    worstTrade: number;
  };
}

// ── Monte Carlo ──

export interface MonteCarloResult {
  simulations: number;
  percentiles: {
    p5: number[];   // 5th percentile equity at each step
    p25: number[];
    p50: number[];  // median
    p75: number[];
    p95: number[];
  };
  finalReturns: number[];         // final return of each simulation
  medianReturn: number;
  meanReturn: number;
  p5Return: number;               // worst-case (5th percentile)
  p95Return: number;              // best-case (95th percentile)
  probabilityOfProfit: number;    // % of sims that ended positive
  probabilityOfDoubling: number;  // % of sims that returned >100%
  maxDrawdowns: number[];         // max drawdown per simulation
  medianMaxDrawdown: number;
}

export interface GenerateStrategyRequest {
  coin: string;
  timeframe: string;
  currentPrice: number;
  strategy: string;
  indicators: AnalysisRequest["indicators"];
}
