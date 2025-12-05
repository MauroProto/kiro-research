import { NextResponse } from 'next/server';

// CoinGecko IDs mapping
const CRYPTO_IDS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
};

export interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
}

export async function GET() {
  try {
    const ids = Object.values(CRYPTO_IDS).join(',');

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 30 }, // Cache for 30 seconds
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch prices');
    }

    const data = await response.json();

    // Transform to our format
    const prices: CryptoPrice[] = Object.entries(CRYPTO_IDS).map(([symbol, id]) => {
      const coinData = data[id];
      const price = coinData?.usd || 0;
      const changePercent = coinData?.usd_24h_change || 0;

      // Calculate absolute change from percentage
      const previousPrice = price / (1 + changePercent / 100);
      const absoluteChange = price - previousPrice;

      return {
        symbol: `${symbol}USD`,
        name: symbol,
        price,
        change24h: absoluteChange,
        changePercent24h: changePercent,
      };
    });

    return NextResponse.json({ prices, timestamp: Date.now() });
  } catch (error) {
    console.error('Crypto prices error:', error);

    // Return fallback data on error
    const fallbackPrices: CryptoPrice[] = [
      { symbol: 'BTCUSD', name: 'BTC', price: 104000, change24h: 312, changePercent24h: 0.30 },
      { symbol: 'ETHUSD', name: 'ETH', price: 2616.81, change24h: -63.07, changePercent24h: -2.35 },
      { symbol: 'SOLUSD', name: 'SOL', price: 180.03, change24h: -3.73, changePercent24h: -2.03 },
      { symbol: 'BNBUSD', name: 'BNB', price: 656.0, change24h: -8.50, changePercent24h: -1.28 },
      { symbol: 'XRPUSD', name: 'XRP', price: 2.5905, change24h: 0.01, changePercent24h: 0.30 },
    ];

    return NextResponse.json({ prices: fallbackPrices, timestamp: Date.now(), fallback: true });
  }
}
