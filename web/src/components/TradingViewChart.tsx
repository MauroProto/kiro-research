"use client";

import { useEffect, useRef, memo } from "react";

interface TradingViewChartProps {
  symbol: string;
  theme?: "dark" | "light";
  height?: number;
  autosize?: boolean;
}

// Map common token names to TradingView symbols
const SYMBOL_MAP: Record<string, string> = {
  // Major coins
  BTC: "BINANCE:BTCUSDT",
  BITCOIN: "BINANCE:BTCUSDT",
  ETH: "BINANCE:ETHUSDT",
  ETHEREUM: "BINANCE:ETHUSDT",
  SOL: "BINANCE:SOLUSDT",
  SOLANA: "BINANCE:SOLUSDT",
  BNB: "BINANCE:BNBUSDT",
  XRP: "BINANCE:XRPUSDT",
  DOGE: "BINANCE:DOGEUSDT",
  ADA: "BINANCE:ADAUSDT",
  AVAX: "BINANCE:AVAXUSDT",
  DOT: "BINANCE:DOTUSDT",
  MATIC: "BINANCE:MATICUSDT",
  LINK: "BINANCE:LINKUSDT",
  UNI: "BINANCE:UNIUSDT",
  ATOM: "BINANCE:ATOMUSDT",
  LTC: "BINANCE:LTCUSDT",

  // Memecoins
  PEPE: "BINANCE:PEPEUSDT",
  SHIB: "BINANCE:SHIBUSDT",
  FLOKI: "BINANCE:FLOKIUSDT",
  BONK: "BINANCE:BONKUSDT",
  WIF: "BINANCE:WIFUSDT",
  MEME: "BINANCE:MEMEUSDT",

  // DeFi
  AAVE: "BINANCE:AAVEUSDT",
  MKR: "BINANCE:MKRUSDT",
  CRV: "BINANCE:CRVUSDT",
  SNX: "BINANCE:SNXUSDT",
  COMP: "BINANCE:COMPUSDT",

  // Layer 2
  ARB: "BINANCE:ARBUSDT",
  OP: "BINANCE:OPUSDT",

  // Solana ecosystem
  JUP: "BINANCE:JUPUSDT",
  PYTH: "BINANCE:PYTHUSDT",
  JTO: "BINANCE:JTOUSDT",
  RAY: "BINANCE:RAYUSDT",

  // AI tokens
  FET: "BINANCE:FETUSDT",
  AGIX: "BINANCE:AGIXUSDT",
  RNDR: "BINANCE:RNDRUSDT",

  // Gaming
  AXS: "BINANCE:AXSUSDT",
  SAND: "BINANCE:SANDUSDT",
  MANA: "BINANCE:MANAUSDT",
  IMX: "BINANCE:IMXUSDT",
  GALA: "BINANCE:GALAUSDT",
};

/**
 * Get TradingView symbol from token name
 */
export function getTradingViewSymbol(token: string): string | null {
  const normalized = token.toUpperCase().replace("$", "");

  // Direct match
  if (SYMBOL_MAP[normalized]) {
    return SYMBOL_MAP[normalized];
  }

  // Try to find partial match
  for (const [key, value] of Object.entries(SYMBOL_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  // If it looks like a valid symbol, try Binance
  if (/^[A-Z]{2,10}$/.test(normalized)) {
    return `BINANCE:${normalized}USDT`;
  }

  return null;
}

/**
 * Extract token symbol from a query/message
 */
export function extractTokenFromQuery(query: string): string | null {
  // Look for $TOKEN pattern
  const dollarMatch = query.match(/\$([A-Z]{2,10})/i);
  if (dollarMatch) {
    const symbol = getTradingViewSymbol(dollarMatch[1]);
    if (symbol) return symbol;
  }

  // Look for known token names
  const words = query.toUpperCase().split(/\s+/);
  for (const word of words) {
    const clean = word.replace(/[^A-Z]/g, "");
    if (SYMBOL_MAP[clean]) {
      return SYMBOL_MAP[clean];
    }
  }

  // Check for token mentions in context
  const tokenPatterns = [
    /\b(bitcoin|btc)\b/i,
    /\b(ethereum|eth)\b/i,
    /\b(solana|sol)\b/i,
    /\b(dogecoin|doge)\b/i,
    /\b(pepe)\b/i,
    /\b(shib|shiba)\b/i,
    /\b(bonk)\b/i,
    /\b(wif)\b/i,
    /\b(jupiter|jup)\b/i,
  ];

  for (const pattern of tokenPatterns) {
    const match = query.match(pattern);
    if (match) {
      const symbol = getTradingViewSymbol(match[1]);
      if (symbol) return symbol;
    }
  }

  return null;
}

/**
 * TradingView Advanced Chart Widget
 */
function TradingViewChartComponent({
  symbol,
  theme = "dark",
  height = 300,
  autosize = false
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptId = useRef(`tradingview-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous content
    containerRef.current.innerHTML = "";

    // Create widget container
    const widgetContainer = document.createElement("div");
    widgetContainer.id = scriptId.current;
    widgetContainer.style.height = autosize ? "100%" : `${height}px`;
    containerRef.current.appendChild(widgetContainer);

    // Load TradingView script
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      if (typeof window !== "undefined" && (window as any).TradingView) {
        new (window as any).TradingView.widget({
          container_id: scriptId.current,
          symbol: symbol,
          interval: "60", // 1 hour
          timezone: "Etc/UTC",
          theme: theme,
          style: "1", // Candlestick
          locale: "en",
          toolbar_bg: theme === "dark" ? "#1f1c26" : "#f1f3f6",
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          hide_volume: false,
          allow_symbol_change: true,
          withdateranges: true,
          range: "1M", // Show 1 month of data (less zoom)
          autosize: autosize,
          height: autosize ? undefined : height,
          width: "100%",
          studies: ["Volume@tv-basicstudies"],
          show_popup_button: false,
          popup_width: "1000",
          popup_height: "650",
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      // Remove script if it exists
      const existingScript = document.querySelector(`script[src="${script.src}"]`);
      // Don't remove the script as it might be used by other charts
    };
  }, [symbol, theme, height, autosize]);

  // Get display name from symbol
  const displayName = symbol.split(":")[1]?.replace("USDT", "") || symbol;
  const exchange = symbol.split(":")[0] || "BINANCE";

  return (
    <div className="rounded-xl overflow-hidden border border-[#2a2635] bg-gradient-to-b from-[#1a171f] to-[#16131a] shadow-lg shadow-[#9046ff]/5">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#2a2635] bg-[#1a171f]/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className="relative">
              <div className="w-2 h-2 bg-[#4ade80] rounded-full" />
              <div className="absolute inset-0 w-2 h-2 bg-[#4ade80] rounded-full animate-ping opacity-75" />
            </div>

            {/* Token info */}
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-white">{displayName}</span>
              <span className="text-[10px] text-[#5a5a6e] bg-[#2a2635] px-1.5 py-0.5 rounded font-mono">
                {exchange}
              </span>
            </div>

            {/* Badge */}
            <span className="text-[10px] text-[#9046ff] bg-[#9046ff]/10 px-2 py-0.5 rounded-full border border-[#9046ff]/20">
              Live Chart
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[#5a5a6e]">1H Candles</span>
            <a
              href={`https://www.tradingview.com/chart/?symbol=${symbol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#7a7a8a] hover:text-[#f472b6] transition-colors flex items-center gap-1"
            >
              <span>TradingView</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Chart container */}
      <div
        ref={containerRef}
        style={{ height: autosize ? "100%" : height }}
        className="tradingview-widget-container"
      />

      {/* Footer */}
      <div className="px-4 py-2 border-t border-[#2a2635] bg-[#16131a] flex items-center justify-between">
        <span className="text-[10px] text-[#4a4a5a]">Data provided by TradingView</span>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-[#4ade80] rounded-full" />
          <span className="text-[10px] text-[#5a5a6e]">Real-time</span>
        </div>
      </div>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export const TradingViewChart = memo(TradingViewChartComponent);
