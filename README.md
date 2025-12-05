# KIRO RESEARCH AGENT

<div align="center">

**AI-Powered Multi-Agent Crypto Research Terminal**

*Real-time market intelligence using 12 specialized AI agents*

[![Built with Kiro](https://img.shields.io/badge/Built%20with-Kiro%20Code-9046ff?style=for-the-badge)](https://kiro.dev)
[![Kiroween Hackathon](https://img.shields.io/badge/Kiroween-Hackathon%202025-orange?style=for-the-badge)](https://kiroween.devpost.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

<img src="web/public/web-app-manifest-512x512.png" alt="Research Agent Logo" width="200"/>

</div>

---

## Overview

**Kiro Research Agent** is a crypto research terminal that orchestrates 12 specialized AI agents to provide comprehensive market intelligence. Unlike simple web scrapers, this system uses intelligent agents that understand context, analyze sentiment, track wallet movements, monitor liquidity, and synthesize insights from multiple data sources simultaneously.

### Why Multi-Agent?

Traditional research tools give you raw data. This system gives you **intelligence**:

| Traditional Scraper | Multi-Agent System |
|--------------------|--------------------|
| Single data source | 12 specialized agents working in parallel |
| Raw price data | Contextual analysis with sentiment |
| Manual correlation | Automatic cross-referencing |
| Static snapshots | Real-time streaming updates |
| No interpretation | AI-synthesized insights |

---

## Features

### Core Capabilities

- **Real-time Streaming** - Watch agents work in real-time with SSE streaming
- **Multi-Agent Orchestration** - Up to 5 agents working simultaneously per query
- **Intelligent Synthesis** - AI combines findings into actionable insights
- **DEGEN Mode** - Aggressive research mode for high-risk analysis
- **TradingView Integration** - Live charts embedded for any token
- **Smart Caching** - Optimized response times with intelligent cache
- **Rate Limiting** - Fair usage with IP + fingerprint protection

### The 12 Specialized Agents

| Agent | Capability | Use Case |
|-------|------------|----------|
| **Elfa Twitter** | Twitter intelligence & sentiment | Track crypto influencers, smart money mentions |
| **CoinGecko** | Market data & token info | Price, volume, market cap, historical data |
| **Solana Token** | On-chain Solana analytics | Token metrics, holders, top traders |
| **Solana Wallet** | Wallet tracking & analysis | Portfolio analysis, transaction history |
| **Crypto News** | Real-time news aggregation | Breaking news, market-moving events |
| **DexScreener** | DEX trading data | Liquidity pools, trading pairs, volume |
| **Token Metrics** | AI-powered analytics | Sentiment scores, trader grades |
| **Wallet Analyst** | Cross-chain wallet intelligence | Multi-chain portfolio tracking |
| **Explorer** | Blockchain exploration | Transaction details, contract analysis |
| **Trending** | Trend detection | Viral tokens, momentum signals |
| **Liquidity** | Liquidity monitoring | Pool depth, slippage analysis |
| **Technical** | Technical analysis | Chart patterns, indicators |

---

## Architecture

### 3-Step Orchestration Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER QUERY                               │
│                "What's trending in Solana?"                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STEP 1: PLANNING                              │
│                                                                  │
│  AI analyzes query and selects optimal agents:                   │
│  • elfaTwitter (social sentiment)                                │
│  • solanaToken (on-chain data)                                   │
│  • dexscreener (trading activity)                                │
│  • trending (momentum signals)                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   STEP 2: EXECUTION                              │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Elfa    │  │  Solana  │  │   DEX    │  │ Trending │        │
│  │ Twitter  │  │  Token   │  │ Screener │  │  Agent   │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │             │             │               │
│       ▼             ▼             ▼             ▼               │
│  [Results]     [Results]     [Results]     [Results]           │
│                                                                  │
│  Real-time streaming with retry & fallback                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   STEP 3: SYNTHESIS                              │
│                                                                  │
│  AI combines all agent findings into:                            │
│  • Key insights and trends                                       │
│  • Risk assessment                                               │
│  • Actionable recommendations                                    │
│  • Source citations                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FINAL REPORT                                │
│                                                                  │
│  Comprehensive analysis with:                                    │
│  • TradingView chart (if token mentioned)                        │
│  • Agent-by-agent breakdown                                      │
│  • Synthesized conclusion                                        │
│  • Related token suggestions                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15, React 19, TypeScript |
| **Styling** | Tailwind CSS, Custom Terminal Theme |
| **AI Agents** | Heurist Mesh API (12 agents) |
| **Orchestration** | Custom AI Pipeline |
| **Streaming** | Server-Sent Events (SSE) |
| **Charts** | TradingView Widget |
| **Rate Limiting** | IP + Browser Fingerprint |

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- API Keys (see below)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/kiro-research.git
cd kiro-research

# Navigate to web directory
cd web

# Install dependencies
npm install

# Copy environment template
cp env.local.example .env.local

# Add your API keys to .env.local
# Then start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the terminal interface.

### Required API Keys

| Service | Get Key | Purpose |
|---------|---------|---------|
| **Heurist** | [heurist.ai](https://heurist.ai/) | AI agent mesh network |
| **Exa** | [exa.ai](https://exa.ai/) | Web search capabilities |

### Environment Variables

```env
# Required
HEURIST_API_KEY=your_heurist_api_key
EXA_API_KEY=your_exa_api_key

# Optional
DEEPSEEK_API_KEY=your_deepseek_key  # For enhanced synthesis
```

---

## Usage

### Example Queries

```
> What's trending in the Solana ecosystem?

> Analyze $WIF - is it a good entry point?

> Show me whale movements on Jupiter

> What are crypto influencers saying about $BONK?

> Compare liquidity between Raydium and Orca

> Find new Solana memecoins with strong momentum
```

### DEGEN Mode

Toggle DEGEN mode for more aggressive research:
- Higher risk tolerance analysis
- Memecoin-focused insights
- Degen-friendly language
- Extended agent selection

---

## Project Structure

```
kiro-research/
├── web/                          # Next.js application
│   ├── src/
│   │   ├── app/                  # App router pages
│   │   │   ├── page.tsx          # Main terminal interface
│   │   │   └── api/              # API routes
│   │   │       ├── research/     # Main research endpoint (SSE)
│   │   │       └── favicon/      # Dynamic favicon proxy
│   │   │
│   │   ├── components/           # React components
│   │   │   ├── ResearchTerminal.tsx    # Main terminal UI
│   │   │   ├── MessageList.tsx         # Message rendering
│   │   │   ├── TradingViewChart.tsx    # Chart integration
│   │   │   ├── GhostScreensaver.tsx    # Idle animation
│   │   │   └── ErrorSuppressor.tsx     # Wallet error handler
│   │   │
│   │   ├── services/             # Backend services
│   │   │   ├── heurist/          # Heurist agent integration
│   │   │   │   ├── client.ts     # API client with retry
│   │   │   │   ├── config.ts     # Agent configuration
│   │   │   │   ├── orchestrator.ts   # Multi-agent orchestrator
│   │   │   │   └── agents/       # Individual agent wrappers
│   │   │   │       ├── elfaTwitterAgent.ts
│   │   │   │       ├── coingeckoAgent.ts
│   │   │   │       ├── solanaTokenAgent.ts
│   │   │   │       ├── solanaWalletAgent.ts
│   │   │   │       ├── cryptoNewsAgent.ts
│   │   │   │       └── ...
│   │   │   │
│   │   │   ├── ai/               # AI services
│   │   │   │   └── synthesizer.ts    # Response synthesis
│   │   │   │
│   │   │   └── rateLimit.ts      # Rate limiting logic
│   │   │
│   │   └── types/                # TypeScript definitions
│   │
│   ├── public/                   # Static assets
│   └── package.json
│
├── .kiro/                        # Kiro IDE configuration
│   ├── specs/                    # Requirements & design docs
│   ├── hooks/                    # Automation hooks
│   └── steering/                 # Project guidelines
│
└── README.md
```

---

## Heurist Agent Details

### Agent Configuration

Each agent is configured with specific capabilities:

```typescript
// Example: Elfa Twitter Agent
{
  id: 'elfaTwitter',
  name: 'Elfa Twitter Intelligence',
  capabilities: [
    'search_mentions',      // Smart money mentions
    'search_account',       // Account tweet history
    'get_trending_tokens'   // Twitter-based trends
  ],
  cacheTTL: 120000,  // 2 minutes
  timeout: 60000     // 60 seconds
}
```

### Retry & Fallback System

```typescript
// Automatic retry with exponential backoff
retryConfig: {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryOn: [429, 500, 502, 503, 504]
}

// Fallback chain for critical agents
fallbackChain: {
  coingecko: ['dexscreener', 'tokenMetrics'],
  elfaTwitter: ['cryptoNews', 'trending']
}
```

---

## Built with Kiro IDE

This project was developed entirely using **[Kiro Code](https://kiro.dev)** for the **Kiroween Hackathon 2024**.

### Kiro Features Used

| Feature | Description | Location |
|---------|-------------|----------|
| **Specs** | Structured requirements, design docs, and task lists | `.kiro/specs/` |
| **Hooks** | Automated linting, testing, and validation | `.kiro/hooks/` |
| **Steering** | Project guidelines and coding standards | `.kiro/steering/` |
| **Vibe Coding** | Conversational development with AI | Throughout development |

### Kiro Spec Structure

```
.kiro/specs/research-agent/
├── requirements.md    # Functional & non-functional requirements
├── design.md          # Architecture and technical design
└── tasks.md           # Implementation task breakdown
```

### Development Workflow with Kiro

1. **Requirements Definition** - Used Kiro specs to define all features
2. **Design Phase** - Architecture documented in design.md
3. **Task Generation** - Automatic task breakdown from requirements
4. **Implementation** - Vibe coding with Kiro agent assistance
5. **Validation** - Hooks for automated testing and linting

---

## API Reference

### Research Endpoint

```
POST /api/research
Content-Type: application/json

{
  "query": "What's trending in Solana?",
  "mode": "normal" | "degen"
}

Response: Server-Sent Events stream
```

### SSE Event Types

```typescript
// Agent status update
{ type: 'agent_status', agent: string, status: 'running' | 'complete' | 'error' }

// Agent result
{ type: 'agent_result', agent: string, data: AgentResult }

// Synthesis progress
{ type: 'synthesis', content: string, done: boolean }

// Final report
{ type: 'complete', report: ResearchReport }
```

---

## Deployment

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/kiro-research&root=web&env=HEURIST_API_KEY,EXA_API_KEY)

1. Fork this repository
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your fork
4. Set **Root Directory** to `web`
5. Add environment variables
6. Deploy!

### Manual Deployment

```bash
cd web
npm run build
npm start
```

---

## Rate Limiting

To ensure fair usage, the system implements rate limiting:

- **2 queries per user per day** (free tier)
- Identification via IP + browser fingerprint
- Graceful error messages when limit reached

---

## Contributing

Contributions are welcome! Please read the guidelines in `.kiro/steering/` before submitting PRs.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **[Kiro Code](https://kiro.dev)** - AI-powered development environment
- **[Heurist](https://heurist.ai)** - Decentralized AI agent infrastructure
- **[Exa](https://exa.ai)** - Neural search API

---

<div align="center">

**Built with love for the Kiroween Hackathon 2024**

*By Mauro*

</div>
