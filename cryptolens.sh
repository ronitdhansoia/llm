#!/usr/bin/env bash
# ─────────────────────────────────────────────
# CryptoLens CLI
# Interactive crypto analysis from your terminal
# ─────────────────────────────────────────────

set -euo pipefail

# ── Config ──
API_BASE="${CRYPTOLENS_API:-http://localhost:3000}"

# ── Colors ──
RESET="\033[0m"
BOLD="\033[1m"
DIM="\033[2m"
WHITE="\033[97m"
GRAY="\033[90m"
RED="\033[91m"
GREEN="\033[92m"
CYAN="\033[96m"

# ── Helpers ──

print_header() {
  clear
  echo ""
  echo -e "${DIM}  ┌──────────────────────────────────┐${RESET}"
  echo -e "${DIM}  │${RESET}  ${BOLD}${WHITE}CryptoLens CLI${RESET}  ${DIM}v1.0.0${RESET}           ${DIM}│${RESET}"
  echo -e "${DIM}  └──────────────────────────────────┘${RESET}"
  echo ""
}

print_dim() {
  echo -e "${DIM}  $1${RESET}"
}

print_white() {
  echo -e "  ${WHITE}$1${RESET}"
}

print_green() {
  echo -e "  ${GREEN}$1${RESET}"
}

print_red() {
  echo -e "  ${RED}$1${RESET}"
}

print_cyan() {
  echo -e "  ${CYAN}$1${RESET}"
}

spinner() {
  local pid=$1
  local msg="${2:-Processing}"
  local chars="⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
  local i=0
  while kill -0 "$pid" 2>/dev/null; do
    echo -ne "\r  ${DIM}${chars:i%10:1} ${msg}...${RESET}"
    i=$((i + 1))
    sleep 0.1
  done
  echo -ne "\r  ${DIM}✓ ${msg}... done${RESET}\n"
}

check_deps() {
  if ! command -v curl &>/dev/null; then
    print_red "Error: curl is required but not installed."
    exit 1
  fi
  if ! command -v jq &>/dev/null; then
    print_red "Error: jq is required but not installed."
    print_dim "Install with: brew install jq"
    exit 1
  fi
}

api_get() {
  curl -sf "${API_BASE}$1" 2>/dev/null
}

api_post() {
  curl -sf -X POST "${API_BASE}$1" \
    -H "Content-Type: application/json" \
    -d "$2" 2>/dev/null
}

# ── Interactive menu with arrow keys ──

select_menu() {
  local prompt="$1"
  shift
  local options=("$@")
  local selected=0
  local count=${#options[@]}

  # Hide cursor
  tput civis 2>/dev/null || true

  while true; do
    # Move cursor up to redraw
    if [ "$selected" -ge 0 ]; then
      for ((i = 0; i < count + 2; i++)); do
        echo -ne "\033[A\033[2K"
      done
    fi

    echo ""
    print_dim "$prompt"

    for ((i = 0; i < count; i++)); do
      if [ "$i" -eq "$selected" ]; then
        echo -e "  ${WHITE}▸ ${options[$i]}${RESET}"
      else
        echo -e "  ${DIM}  ${options[$i]}${RESET}"
      fi
    done

    # Read single keypress
    read -rsn1 key
    case "$key" in
      A|k) # Up arrow or k
        selected=$(( (selected - 1 + count) % count ))
        ;;
      B|j) # Down arrow or j
        selected=$(( (selected + 1) % count ))
        ;;
      "") # Enter
        break
        ;;
      $'\x1b') # Escape sequence
        read -rsn2 key2
        case "$key2" in
          '[A') selected=$(( (selected - 1 + count) % count )) ;;
          '[B') selected=$(( (selected + 1) % count )) ;;
        esac
        ;;
    esac
  done

  # Show cursor
  tput cnorm 2>/dev/null || true

  MENU_RESULT=$selected
}

read_input() {
  local prompt="$1"
  local default="${2:-}"
  echo ""
  if [ -n "$default" ]; then
    echo -ne "  ${DIM}${prompt}${RESET} ${DIM}(${default})${RESET} ${WHITE}› ${RESET}"
  else
    echo -ne "  ${DIM}${prompt}${RESET} ${WHITE}› ${RESET}"
  fi
  read -r INPUT_RESULT
  if [ -z "$INPUT_RESULT" ] && [ -n "$default" ]; then
    INPUT_RESULT="$default"
  fi
}

# ── Commands ──

cmd_price() {
  read_input "Enter coin" "bitcoin"
  local coin="$INPUT_RESULT"

  echo ""
  local result
  result=$(api_get "/api/market-data?coin=${coin}&days=1") &
  local pid=$!
  spinner $pid "Fetching ${coin} price"
  wait $pid 2>/dev/null || true
  result=$(api_get "/api/market-data?coin=${coin}&days=1")

  if [ -z "$result" ]; then
    print_red "Failed to fetch data. Is the server running?"
    return
  fi

  local price change
  price=$(echo "$result" | jq -r '.metadata.lastPrice')
  change=$(echo "$result" | jq -r '.metadata.change24h')

  echo ""
  print_white "  $(echo "$coin" | tr '[:lower:]' '[:upper:]')"
  echo ""

  local formatted_price
  formatted_price=$(printf "%'.2f" "$price" 2>/dev/null || echo "$price")
  print_white "  Price:  \$${formatted_price}"

  if (( $(echo "$change >= 0" | bc -l 2>/dev/null || echo 0) )); then
    print_green "  24h:    ▲ +$(printf '%.2f' "$change")%"
  else
    print_red "  24h:    ▼ $(printf '%.2f' "$change")%"
  fi
  echo ""
}

cmd_indicators() {
  read_input "Enter coin" "bitcoin"
  local coin="$INPUT_RESULT"

  echo ""
  local result
  result=$(api_get "/api/market-data?coin=${coin}&days=30") &
  local pid=$!
  spinner $pid "Computing indicators"
  wait $pid 2>/dev/null || true
  result=$(api_get "/api/market-data?coin=${coin}&days=30")

  if [ -z "$result" ]; then
    print_red "Failed to fetch data."
    return
  fi

  echo ""
  print_white "  $(echo "$coin" | tr '[:lower:]' '[:upper:]') — Technical Indicators (30D)"
  echo ""

  local rsi sma20 sma50 ema12 ema26 macd macd_signal bb_upper bb_lower
  rsi=$(echo "$result" | jq '[.indicators.rsi[] | select(. != null)] | last // 0')
  sma20=$(echo "$result" | jq '[.indicators.sma20[] | select(. != null)] | last // 0')
  sma50=$(echo "$result" | jq '[.indicators.sma50[] | select(. != null)] | last // 0')
  ema12=$(echo "$result" | jq '[.indicators.ema12[] | select(. != null)] | last // 0')
  ema26=$(echo "$result" | jq '[.indicators.ema26[] | select(. != null)] | last // 0')
  macd=$(echo "$result" | jq '[.indicators.macd.macd[] | select(. != null)] | last // 0')
  macd_signal=$(echo "$result" | jq '[.indicators.macd.signal[] | select(. != null)] | last // 0')
  bb_upper=$(echo "$result" | jq '[.indicators.bollingerBands.upper[] | select(. != null)] | last // 0')
  bb_lower=$(echo "$result" | jq '[.indicators.bollingerBands.lower[] | select(. != null)] | last // 0')

  printf "  ${DIM}RSI (14):       ${WHITE}%.2f${RESET}\n" "$rsi"
  printf "  ${DIM}SMA 20:         ${WHITE}\$%.2f${RESET}\n" "$sma20"
  printf "  ${DIM}SMA 50:         ${WHITE}\$%.2f${RESET}\n" "$sma50"
  printf "  ${DIM}EMA 12:         ${WHITE}\$%.2f${RESET}\n" "$ema12"
  printf "  ${DIM}EMA 26:         ${WHITE}\$%.2f${RESET}\n" "$ema26"
  printf "  ${DIM}MACD:           ${WHITE}%.2f${RESET}\n" "$macd"
  printf "  ${DIM}MACD Signal:    ${WHITE}%.2f${RESET}\n" "$macd_signal"
  printf "  ${DIM}BB Upper:       ${WHITE}\$%.2f${RESET}\n" "$bb_upper"
  printf "  ${DIM}BB Lower:       ${WHITE}\$%.2f${RESET}\n" "$bb_lower"
  echo ""
}

cmd_analyze() {
  read_input "Enter coin" "bitcoin"
  local coin="$INPUT_RESULT"

  read_input "Strategy or question (optional)" ""
  local strategy="$INPUT_RESULT"

  echo ""
  print_dim "Fetching market data..."

  local market_data
  market_data=$(api_get "/api/market-data?coin=${coin}&days=30")

  if [ -z "$market_data" ]; then
    print_red "Failed to fetch data."
    return
  fi

  local price rsi sma20 sma50 ema12 ema26 macd_val macd_sig macd_hist bb_up bb_mid bb_low
  price=$(echo "$market_data" | jq '.metadata.lastPrice')
  rsi=$(echo "$market_data" | jq '[.indicators.rsi[] | select(. != null)] | last // 0')
  sma20=$(echo "$market_data" | jq '[.indicators.sma20[] | select(. != null)] | last // 0')
  sma50=$(echo "$market_data" | jq '[.indicators.sma50[] | select(. != null)] | last // 0')
  ema12=$(echo "$market_data" | jq '[.indicators.ema12[] | select(. != null)] | last // 0')
  ema26=$(echo "$market_data" | jq '[.indicators.ema26[] | select(. != null)] | last // 0')
  macd_val=$(echo "$market_data" | jq '[.indicators.macd.macd[] | select(. != null)] | last // 0')
  macd_sig=$(echo "$market_data" | jq '[.indicators.macd.signal[] | select(. != null)] | last // 0')
  macd_hist=$(echo "$market_data" | jq '[.indicators.macd.histogram[] | select(. != null)] | last // 0')
  bb_up=$(echo "$market_data" | jq '[.indicators.bollingerBands.upper[] | select(. != null)] | last // 0')
  bb_mid=$(echo "$market_data" | jq '[.indicators.bollingerBands.middle[] | select(. != null)] | last // 0')
  bb_low=$(echo "$market_data" | jq '[.indicators.bollingerBands.lower[] | select(. != null)] | last // 0')

  local recent
  recent=$(echo "$market_data" | jq -r '[.prices[-5:][] | .value | tostring | "$" + .] | join(" → ")')

  print_dim "Running AI analysis..."

  local body
  body=$(jq -n \
    --arg coin "$coin" \
    --arg timeframe "30 days" \
    --argjson currentPrice "$price" \
    --argjson rsi "$rsi" \
    --argjson sma20 "$sma20" \
    --argjson sma50 "$sma50" \
    --argjson ema12 "$ema12" \
    --argjson ema26 "$ema26" \
    --argjson macd "$macd_val" \
    --argjson macdSignal "$macd_sig" \
    --argjson macdHist "$macd_hist" \
    --argjson bbUp "$bb_up" \
    --argjson bbMid "$bb_mid" \
    --argjson bbLow "$bb_low" \
    --arg recent "$recent" \
    --arg strategy "$strategy" \
    '{
      coin: $coin,
      timeframe: $timeframe,
      currentPrice: $currentPrice,
      indicators: {
        rsiLatest: $rsi,
        sma20Latest: $sma20,
        sma50Latest: $sma50,
        ema12Latest: $ema12,
        ema26Latest: $ema26,
        macdLatest: $macd,
        macdSignalLatest: $macdSignal,
        macdHistogramLatest: $macdHist,
        bollingerUpper: $bbUp,
        bollingerMiddle: $bbMid,
        bollingerLower: $bbLow
      },
      recentPriceAction: ("Last 5 data points: " + $recent),
      strategy: (if $strategy == "" then null else $strategy end)
    }')

  local analysis
  analysis=$(api_post "/api/analyze" "$body")

  if [ -z "$analysis" ]; then
    print_red "Analysis failed."
    return
  fi

  echo ""
  print_white "  $(echo "$coin" | tr '[:lower:]' '[:upper:]') — AI Analysis"
  echo ""

  local trend confidence trend_exp momentum support resistance key_exp summary disclaimer
  trend=$(echo "$analysis" | jq -r '.trend')
  confidence=$(echo "$analysis" | jq -r '.confidence')
  trend_exp=$(echo "$analysis" | jq -r '.trendExplanation')
  momentum=$(echo "$analysis" | jq -r '.momentum')
  support=$(echo "$analysis" | jq -r '.keyLevels.support')
  resistance=$(echo "$analysis" | jq -r '.keyLevels.resistance')
  key_exp=$(echo "$analysis" | jq -r '.keyLevels.explanation')
  summary=$(echo "$analysis" | jq -r '.signalSummary')
  disclaimer=$(echo "$analysis" | jq -r '.disclaimer')

  print_white "  Trend:       ${trend} (${confidence} confidence)"
  echo -e "  ${DIM}${trend_exp}${RESET}"
  echo ""
  print_white "  Momentum:    ${momentum}"
  echo ""
  print_white "  Support:     \$${support}"
  print_white "  Resistance:  \$${resistance}"
  echo -e "  ${DIM}${key_exp}${RESET}"
  echo ""
  print_white "  Summary:"
  echo -e "  ${DIM}${summary}${RESET}"
  echo ""
  print_dim "  ${disclaimer}"
  echo ""
}

cmd_backtest() {
  read_input "Enter coin" "bitcoin"
  local coin="$INPUT_RESULT"

  read_input "Describe your strategy" "balanced swing trading using RSI and MACD"
  local strategy="$INPUT_RESULT"

  echo ""
  print_dim "Fetching 90D market data..."

  local market_data
  market_data=$(api_get "/api/market-data?coin=${coin}&days=90")

  if [ -z "$market_data" ]; then
    print_red "Failed to fetch data."
    return
  fi

  local price rsi sma20 sma50 ema12 ema26 macd_val macd_sig macd_hist bb_up bb_mid bb_low
  price=$(echo "$market_data" | jq '.metadata.lastPrice')
  rsi=$(echo "$market_data" | jq '[.indicators.rsi[] | select(. != null)] | last // 0')
  sma20=$(echo "$market_data" | jq '[.indicators.sma20[] | select(. != null)] | last // 0')
  sma50=$(echo "$market_data" | jq '[.indicators.sma50[] | select(. != null)] | last // 0')
  ema12=$(echo "$market_data" | jq '[.indicators.ema12[] | select(. != null)] | last // 0')
  ema26=$(echo "$market_data" | jq '[.indicators.ema26[] | select(. != null)] | last // 0')
  macd_val=$(echo "$market_data" | jq '[.indicators.macd.macd[] | select(. != null)] | last // 0')
  macd_sig=$(echo "$market_data" | jq '[.indicators.macd.signal[] | select(. != null)] | last // 0')
  macd_hist=$(echo "$market_data" | jq '[.indicators.macd.histogram[] | select(. != null)] | last // 0')
  bb_up=$(echo "$market_data" | jq '[.indicators.bollingerBands.upper[] | select(. != null)] | last // 0')
  bb_mid=$(echo "$market_data" | jq '[.indicators.bollingerBands.middle[] | select(. != null)] | last // 0')
  bb_low=$(echo "$market_data" | jq '[.indicators.bollingerBands.lower[] | select(. != null)] | last // 0')

  print_dim "Generating strategy: \"${strategy}\"..."

  local body
  body=$(jq -n \
    --arg coin "$coin" \
    --arg timeframe "90 days" \
    --argjson currentPrice "$price" \
    --arg strategy "$strategy" \
    --argjson rsi "$rsi" \
    --argjson sma20 "$sma20" \
    --argjson sma50 "$sma50" \
    --argjson ema12 "$ema12" \
    --argjson ema26 "$ema26" \
    --argjson macd "$macd_val" \
    --argjson macdSignal "$macd_sig" \
    --argjson macdHist "$macd_hist" \
    --argjson bbUp "$bb_up" \
    --argjson bbMid "$bb_mid" \
    --argjson bbLow "$bb_low" \
    '{
      coin: $coin,
      timeframe: $timeframe,
      currentPrice: $currentPrice,
      strategy: $strategy,
      indicators: {
        rsiLatest: $rsi,
        sma20Latest: $sma20,
        sma50Latest: $sma50,
        ema12Latest: $ema12,
        ema26Latest: $ema26,
        macdLatest: $macd,
        macdSignalLatest: $macdSignal,
        macdHistogramLatest: $macdHist,
        bollingerUpper: $bbUp,
        bollingerMiddle: $bbMid,
        bollingerLower: $bbLow
      }
    }')

  local strat_result
  strat_result=$(api_post "/api/generate-strategy" "$body")

  if [ -z "$strat_result" ]; then
    print_red "Strategy generation failed."
    return
  fi

  local strat_name strat_desc
  strat_name=$(echo "$strat_result" | jq -r '.name')
  strat_desc=$(echo "$strat_result" | jq -r '.description')

  echo ""
  print_white "  Strategy: ${strat_name}"
  echo -e "  ${DIM}${strat_desc}${RESET}"
  echo ""

  print_dim "Entry rules:"
  echo "$strat_result" | jq -r '.entryRules[]' | while read -r rule; do
    echo -e "  ${GREEN}  ▸ ${rule}${RESET}"
  done

  print_dim "Exit rules:"
  echo "$strat_result" | jq -r '.exitRules[]' | while read -r rule; do
    echo -e "  ${RED}  ▸ ${rule}${RESET}"
  done

  echo ""
  print_dim "Run this strategy on the web dashboard for full backtest"
  print_dim "results, trade log, Monte Carlo, and PineScript export."
  echo ""
  print_dim "  ${API_BASE}/analyze?coin=${coin}&strategy=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${strategy}'))" 2>/dev/null || echo "${strategy// /+}")"
  echo ""
}

# ── Main loop ──

main() {
  check_deps

  while true; do
    print_header

    print_dim "What would you like to do?"
    echo ""

    # Print initial menu
    local options=("Check price" "View indicators" "AI analysis" "Backtest strategy" "Exit")
    echo -e "  ${WHITE}▸ ${options[0]}${RESET}"
    for ((i = 1; i < ${#options[@]}; i++)); do
      echo -e "  ${DIM}  ${options[$i]}${RESET}"
    done

    select_menu "What would you like to do?" "${options[@]}"

    case $MENU_RESULT in
      0) cmd_price ;;
      1) cmd_indicators ;;
      2) cmd_analyze ;;
      3) cmd_backtest ;;
      4)
        echo ""
        print_dim "Goodbye."
        echo ""
        exit 0
        ;;
    esac

    echo ""
    print_dim "Press any key to continue..."
    read -rsn1
  done
}

main "$@"
