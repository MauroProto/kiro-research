# Research Agent - Project Guidelines

## Project Overview
Research Agent es un sistema de validación de hipótesis multi-agente construido con Next.js 15, React 19, y Tailwind CSS. Utiliza DeepSeek para razonamiento LLM y Exa API para búsqueda web.

## Code Style

### TypeScript
- Usar tipos estrictos, evitar `any`
- Interfaces para objetos complejos
- Enums para valores constantes

### React
- Componentes funcionales con hooks
- "use client" para componentes interactivos
- Evitar prop drilling, usar composición

### Tailwind CSS
- Usar clases de utilidad
- Colores del tema: `#19161d` (bg), `#9046ff` (primary), `#c6a0ff` (secondary)
- Fuente: AWSDiatype, monospace fallback

## File Structure
```
web/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── page.tsx      # Main page
│   │   └── layout.tsx    # Root layout
│   ├── components/       # React components
│   ├── hooks/            # Custom hooks
│   └── lib/              # Utilities
```

## API Keys Required
- `DEEPSEEK_API_KEY` - DeepSeek Chat API
- `EXA_API_KEY` - Exa Search API
- `MAX_PROMPTS_PER_USER` - Rate limit (default: 2)

## Development Commands
```bash
cd web
npm install
npm run dev     # Development server
npm run build   # Production build
npm run lint    # Linting
```

## Important Patterns

### Rate Limiting
El rate limiting se hace por IP + fingerprint del navegador. Ver `lib/rateLimit.ts`.

### Caching
Los resultados de búsqueda se cachean por 1 hora. Ver `lib/database.ts`.

### Validation
La validación cruzada detecta contradicciones y calcula confianza. Ver `lib/validation.ts`.

## References
- #[[file:web/src/lib/database.ts]] - Database utilities
- #[[file:web/src/lib/rateLimit.ts]] - Rate limiting
- #[[file:web/src/lib/validation.ts]] - Validation system
- #[[file:web/src/app/api/research/route.ts]] - Main API route
