# Research Agent

A professional hypothesis validation system with multi-agent research capabilities. Built with Next.js, Vercel AI SDK, and DeepSeek.

![Research Agent](https://img.shields.io/badge/version-1.0.0-purple)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Multi-Agent Research**: 5 specialized agents (Scientific, Skeptic, Advocate, Historical, Statistical) search in parallel
- **Cross-Validation**: Detects contradictions between sources
- **Confidence Scoring**: Advanced scoring based on consensus, source quality, recency, and evidence quantity
- **Real-time Streaming**: See the research process unfold in real-time
- **Rate Limiting**: 2 queries per user per day (configurable)
- **User Identification**: Unique ID per visitor via supercookie

## Tech Stack

- **Frontend**: Next.js 15, React, Tailwind CSS
- **AI**: DeepSeek Chat via Vercel AI SDK
- **Search**: Exa API for web search
- **Styling**: Custom terminal-style UI with AWSDiatype font

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- DeepSeek API key
- Exa API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/research-agent.git
cd research-agent/web
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp env.local.example .env.local
```

4. Add your API keys to `.env.local`:
```env
DEEPSEEK_API_KEY=your_deepseek_api_key
EXA_API_KEY=your_exa_api_key
MAX_PROMPTS_PER_USER=2
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Deployment to Vercel

### Option 1: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/research-agent&env=DEEPSEEK_API_KEY,EXA_API_KEY,MAX_PROMPTS_PER_USER)

### Option 2: Manual Deploy

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `DEEPSEEK_API_KEY`
   - `EXA_API_KEY`
   - `MAX_PROMPTS_PER_USER` (default: 2)
4. Deploy

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DEEPSEEK_API_KEY` | DeepSeek API key for LLM | Yes |
| `EXA_API_KEY` | Exa API key for web search | Yes |
| `MAX_PROMPTS_PER_USER` | Max queries per user per day | No (default: 2) |

## Project Structure

```
web/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── research/      # Main research API
│   │   │   ├── rate-limit/    # Rate limit checker
│   │   │   └── favicon/       # Supercookie favicons
│   │   ├── page.tsx           # Main page
│   │   └── layout.tsx         # Root layout
│   ├── components/
│   │   ├── AgentPanel.tsx     # Agent flow visualization
│   │   ├── MessageList.tsx    # Chat messages
│   │   ├── TerminalHeader.tsx # Header with user info
│   │   └── TerminalInput.tsx  # Input field
│   ├── hooks/
│   │   └── useUserId.ts       # User identification hook
│   └── lib/
│       ├── database.ts        # In-memory cache
│       ├── rateLimit.ts       # Rate limiting logic
│       ├── supercookie.ts     # User fingerprinting
│       └── validation.ts      # Cross-validation logic
├── public/
│   ├── AWSDiatype.woff2       # Custom font
│   └── ghost.png              # Easter egg
└── package.json
```

## API Endpoints

### POST /api/research
Main research endpoint. Streams the research process.

**Request:**
```json
{
  "messages": [...],
  "userId": "optional-user-id"
}
```

### GET /api/rate-limit
Check remaining prompts for a user.

**Headers:**
```
x-user-id: user-id
```

## License

MIT

## Credits

- UI inspired by terminal aesthetics
- Favicon fingerprinting based on [supercookie.me](https://supercookie.me/)

