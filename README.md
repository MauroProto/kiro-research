# 🔬 Research Agent

<div align="center">

**Multi-agent hypothesis validation system with real-time web research**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/research-agent&root=web&env=DEEPSEEK_API_KEY,EXA_API_KEY)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Kiro](https://img.shields.io/badge/Built%20with-Kiro-9046ff)](https://kiro.dev)

</div>

---

## Overview

Research Agent is a hypothesis validation system that uses 5 specialized AI agents to search for evidence both FOR and AGAINST any claim:

- **Scientific** - Peer-reviewed sources, academic papers
- **Skeptic** - Counter-arguments, critical analysis
- **Advocate** - Supporting evidence, confirmations
- **Historical** - Precedents, past research
- **Statistical** - Data, numbers, metrics

## Quick Start

```bash
cd web
npm install
cp env.local.example .env.local
# Add your API keys to .env.local
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
4. Set **Root Directory** to `web`
5. Add environment variables:
   - `DEEPSEEK_API_KEY`
   - `EXA_API_KEY`
6. Deploy!

## Features

- ⚡ Real-time streaming
- 🔍 Multi-perspective search (5 agents)
- 📊 Confidence scoring
- 🔒 Rate limiting (2 queries/user/day)

## Tech Stack

- Next.js 15, React 19, Tailwind CSS
- DeepSeek Chat + Vercel AI SDK
- Exa API for web search

---

## 🛠️ Built with Kiro IDE

Este proyecto fue desarrollado utilizando **Kiro IDE** para el Kiro Code Hackathon.

### Kiro Features Utilizadas

| Feature | Descripción | Ubicación |
|---------|-------------|-----------|
| **Specs** | Requisitos, diseño y tareas estructuradas | `.kiro/specs/research-agent/` |
| **Hooks** | Automatización de linting, tests y validación | `.kiro/hooks/` |
| **Steering** | Guías de proyecto y estándares de código | `.kiro/steering/` |
| **Vibe Coding** | Desarrollo conversacional con el agente | Documentado en `KIRO_USAGE.md` |

### Estructura Kiro

```
.kiro/
├── KIRO_USAGE.md              # Documentación completa del uso de Kiro
├── specs/
│   └── research-agent/
│       ├── requirements.md    # Requisitos funcionales y no funcionales
│       ├── design.md          # Arquitectura y diseño técnico
│       └── tasks.md           # Tareas de implementación
├── hooks/
│   ├── on-save-lint.md        # Auto-lint al guardar
│   ├── on-test-run.md         # Tests automáticos
│   └── on-api-change.md       # Validación de APIs
└── steering/
    ├── project-guidelines.md  # Guías del proyecto
    └── coding-standards.md    # Estándares de código
```

Para más detalles sobre cómo se utilizó Kiro, ver [.kiro/KIRO_USAGE.md](.kiro/KIRO_USAGE.md).

---

## License

MIT
