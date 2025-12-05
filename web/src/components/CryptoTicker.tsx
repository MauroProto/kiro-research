"use client";

import { useState, useEffect, ReactNode } from "react";

interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
}

// Crypto icons as SVG components
const CryptoIcons: Record<string, ReactNode> = {
  BTC: (
    <svg viewBox="0 0 32 32" className="w-5 h-5">
      <circle cx="16" cy="16" r="16" fill="#F7931A" />
      <path
        fill="#FFF"
        d="M22.5 14.5c.3-2-1.2-3-3.3-3.8l.7-2.7-1.7-.4-.7 2.6c-.4-.1-.9-.2-1.4-.3l.7-2.7-1.7-.4-.7 2.7c-.4-.1-.7-.2-1.1-.2v-.1l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8 1l-.8 3.3c0 0 .1 0 .2.1h-.2l-1.2 4.7c-.1.2-.3.6-.8.4 0 0-1.2-.3-1.2-.3l-.8 2 2.2.5c.4.1.8.2 1.2.3l-.7 2.8 1.7.4.7-2.7c.5.1.9.2 1.4.3l-.7 2.7 1.7.4.7-2.8c2.8.5 4.9.3 5.8-2.2.7-2-.1-3.2-1.5-3.9 1.1-.3 1.9-1 2.1-2.5zm-3.8 5.3c-.5 2-3.9.9-5 .7l.9-3.6c1.1.3 4.6.8 4.1 2.9zm.5-5.4c-.5 1.8-3.3.9-4.2.7l.8-3.2c.9.2 3.9.7 3.4 2.5z"
      />
    </svg>
  ),
  ETH: (
    <svg viewBox="0 0 32 32" className="w-5 h-5">
      <circle cx="16" cy="16" r="16" fill="#627EEA" />
      <path fill="#FFF" fillOpacity="0.6" d="M16 4v8.87l7.5 3.35L16 4z" />
      <path fill="#FFF" d="M16 4L8.5 16.22 16 12.87V4z" />
      <path fill="#FFF" fillOpacity="0.6" d="M16 21.97v6.03l7.5-10.4L16 21.97z" />
      <path fill="#FFF" d="M16 28V21.97l-7.5-4.37L16 28z" />
      <path fill="#FFF" fillOpacity="0.2" d="M16 20.57l7.5-4.35L16 12.87v7.7z" />
      <path fill="#FFF" fillOpacity="0.6" d="M8.5 16.22l7.5 4.35v-7.7l-7.5 3.35z" />
    </svg>
  ),
  SOL: (
    <svg viewBox="0 0 32 32" className="w-5 h-5">
      <circle cx="16" cy="16" r="16" fill="#000" />
      <defs>
        <linearGradient id="sol-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00FFA3" />
          <stop offset="100%" stopColor="#DC1FFF" />
        </linearGradient>
      </defs>
      <path
        fill="url(#sol-grad)"
        d="M9.5 20.2c.1-.1.3-.2.5-.2h12.8c.3 0 .5.4.3.6l-2.4 2.4c-.1.1-.3.2-.5.2H7.4c-.3 0-.5-.4-.3-.6l2.4-2.4zm0-8.4c.1-.1.3-.2.5-.2h12.8c.3 0 .5.4.3.6l-2.4 2.4c-.1.1-.3.2-.5.2H7.4c-.3 0-.5-.4-.3-.6l2.4-2.4zm13.1 4.2c-.1-.1-.3-.2-.5-.2H9.3c-.3 0-.5.4-.3.6l2.4 2.4c.1.1.3.2.5.2h12.8c.3 0 .5-.4.3-.6l-2.4-2.4z"
      />
    </svg>
  ),
  BNB: (
    <svg viewBox="0 0 32 32" className="w-5 h-5">
      <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
      <path
        fill="#FFF"
        d="M12.1 14.5L16 10.6l3.9 3.9 2.3-2.3L16 6l-6.2 6.2 2.3 2.3zm-2.1 1.5L7.7 16l2.3 2.3 2.3-2.3-2.3-2.3zm2.1 1.5L16 21.4l3.9-3.9 2.3 2.3L16 26l-6.2-6.2 2.3-2.3zm10 0l2.3 2.3 2.3-2.3-2.3-2.3-2.3 2.3zM18.3 16L16 13.7 14.2 15.5l-.2.2-.3.3 2.3 2.3 2.3-2.3z"
      />
    </svg>
  ),
  XRP: (
    <svg viewBox="0 0 32 32" className="w-5 h-5">
      <circle cx="16" cy="16" r="16" fill="#23292F" />
      <path
        fill="#FFF"
        d="M23.1 8h2.4l-5.7 5.6c-2.1 2.1-5.5 2.1-7.6 0L6.5 8h2.4l4.5 4.4c1.4 1.4 3.6 1.4 5 0L23.1 8zM8.9 24H6.5l5.7-5.6c2.1-2.1 5.5-2.1 7.6 0l5.7 5.6h-2.4l-4.5-4.4c-1.4-1.4-3.6-1.4-5 0L8.9 24z"
      />
    </svg>
  ),
};

function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (price >= 1) {
    return price.toFixed(2);
  }
  return price.toFixed(4);
}

function formatChange(change: number): string {
  const sign = change >= 0 ? "+" : "";
  if (Math.abs(change) >= 1) {
    return `${sign}${change.toFixed(2)}`;
  }
  return `${sign}${change.toFixed(4)}`;
}

function formatPercent(percent: number): string {
  const sign = percent >= 0 ? "+" : "";
  return `${sign}${percent.toFixed(2)}%`;
}

function CryptoItem({ crypto }: { crypto: CryptoPrice }) {
  const isPositive = crypto.changePercent24h >= 0;
  const changeColor = isPositive ? "text-[#22c55e]" : "text-[#ef4444]";
  const icon = CryptoIcons[crypto.name] || null;

  return (
    <div className="flex items-center gap-3 px-4 whitespace-nowrap">
      {/* Icon */}
      <div className="flex-shrink-0">{icon}</div>

      {/* Symbol */}
      <span className="text-white font-medium text-sm">{crypto.symbol}</span>

      {/* Price */}
      <span className="text-white text-sm">{formatPrice(crypto.price)}</span>

      {/* Change */}
      <span className={`text-sm ${changeColor}`}>
        {formatChange(crypto.change24h)} ({formatPercent(crypto.changePercent24h)})
      </span>
    </div>
  );
}

interface CryptoTickerProps {
  showPanel?: boolean;
  onTogglePanel?: () => void;
  isProcessing?: boolean;
  remaining?: number;
}

export function CryptoTicker({
  showPanel = true,
  onTogglePanel,
  isProcessing = false,
  remaining = 2
}: CryptoTickerProps) {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch("/api/crypto-prices");
        const data = await res.json();
        setPrices(data.prices);
      } catch (error) {
        console.error("Error fetching prices:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPrices();

    // Refresh every 30 seconds
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  // Duplicate prices for seamless infinite scroll
  const duplicatedPrices = [...prices, ...prices, ...prices];

  return (
    <div className="bg-[#19161d] border-b border-[#2a2635] h-9 flex items-center">
      {/* Ticker area */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center gap-8 px-4 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#2a2635]" />
                <div className="w-16 h-4 bg-[#2a2635] rounded" />
                <div className="w-12 h-4 bg-[#2a2635] rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="ticker-track flex items-center">
            {duplicatedPrices.map((crypto, index) => (
              <CryptoItem key={`${crypto.symbol}-${index}`} crypto={crypto} />
            ))}
          </div>
        )}
      </div>

      {/* Controls on the right */}
      <div className="flex items-center gap-4 px-4 text-sm border-l border-[#2a2635] h-full bg-[#19161d]">
        {/* Prompts remaining badge */}
        {mounted && (
          <div className={`flex items-center gap-2 px-2 py-1 rounded ${
            remaining > 0
              ? 'text-[#a0a0b0]'
              : 'text-[#ef4444]'
          }`}>
            <span className="text-xs">
              {remaining}/2 queries
            </span>
          </div>
        )}

        {isProcessing && (
          <span className="text-[#9046ff] text-xs">processing...</span>
        )}

        {onTogglePanel && (
          <button
            onClick={onTogglePanel}
            className="text-[#a0a0b0] hover:text-white transition-colors text-xs"
          >
            {showPanel ? "hide panel" : "show panel"}
          </button>
        )}
      </div>

      <style jsx>{`
        .ticker-track {
          animation: ticker-scroll 30s linear infinite;
        }

        .ticker-track:hover {
          animation-play-state: paused;
        }

        @keyframes ticker-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
      `}</style>
    </div>
  );
}
