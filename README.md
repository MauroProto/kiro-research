# 🔬 Research Agent

<div align="center">

**Multi-agent hypothesis validation system with real-time web research**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/research-agent&env=DEEPSEEK_API_KEY,EXA_API_KEY)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

## Overview

Research Agent is a sophisticated hypothesis validation system that uses 5 specialized AI agents to search for evidence both FOR and AGAINST any claim. Each agent has a unique perspective:

- **Scientific** - Peer-reviewed sources, academic papers
- **Skeptic** - Counter-arguments, critical analysis
- **Advocate** - Supporting evidence, confirmations
- **Historical** - Precedents, past research
- **Statistical** - Data, numbers, metrics

## Demo

![Research Agent Screenshot](web/public/screenshot.png)

## Quick Start

```bash
# Clone
git clone https://github.com/yourusername/research-agent.git
cd research-agent/web

# Install
npm install

# Configure
cp env.local.example .env.local
# Edit .env.local with your API keys

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## API Keys Required

| Service | Get Key | Purpose |
|---------|---------|---------|
| DeepSeek | [platform.deepseek.com](https://platform.deepseek.com/) | LLM reasoning |
| Exa | [exa.ai](https://exa.ai/) | Web search |

## Deploy to Vercel

1. Fork this repository
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your fork
4. Add environment variables:
   - `DEEPSEEK_API_KEY`
   - `EXA_API_KEY`
5. Deploy!

## Features

- ⚡ **Real-time streaming** - See research unfold live
- 🔍 **Multi-perspective search** - 5 agents with different viewpoints
- 📊 **Confidence scoring** - Evidence-based verdict
- 🎯 **Cross-validation** - Detects contradictions between sources
- 🔒 **Rate limiting** - 2 queries per user per day
- 🎨 **Terminal UI** - Clean, modern interface

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **AI**: DeepSeek Chat + Vercel AI SDK
- **Search**: Exa API
- **Animation**: Framer Motion

## License

MIT

---

<div align="center">
Made with ☕ and curiosity
</div>

