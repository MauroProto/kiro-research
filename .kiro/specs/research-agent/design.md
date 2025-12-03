# Research Agent - Technical Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
├─────────────────────────────────────────────────────────────┤
│  TerminalHeader │ MessageList │ AgentPanel │ TerminalInput  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Routes                                │
├─────────────────────────────────────────────────────────────┤
│  /api/research (POST)  │  /api/rate-limit (GET)             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Core Services                             │
├─────────────────────────────────────────────────────────────┤
│  database.ts  │  rateLimit.ts  │  validation.ts             │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    External APIs                             │
├─────────────────────────────────────────────────────────────┤
│       DeepSeek Chat API       │       Exa Search API        │
└─────────────────────────────────────────────────────────────┘
```

## Agent Flow

```
HYPOTHESIS → DIRECTOR → PARALLEL SEARCH → EVALUATE → SYNTHESIZE → VERDICT
                              │
                    ┌─────────┼─────────┐
                    │         │         │
              Scientific  Skeptic  Advocate
                    │         │         │
              Historical Statistical
```

## Data Models

### SearchResult
```typescript
interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  reliability: number;
  publishDate?: string;
  citations?: number;
}
```

### ValidationResult
```typescript
interface ValidationResult {
  contradictions: Contradiction[];
  consensusScore: number;
  sourceQuality: number;
  recencyScore: number;
  evidenceQuantity: number;
  finalConfidence: number;
}
```

### RateLimitResult
```typescript
interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  total: number;
  resetAt: number;
  ip: string;
}
```

## Tool Definitions

### 1. analyze_hypothesis
- **Purpose**: Director analysis and search strategy generation
- **Input**: hypothesis (string)
- **Output**: reasoning, searchInstructions, previousResearch

### 2. web_search
- **Purpose**: Perspective-based web search
- **Input**: query, perspective (enum)
- **Output**: agent, sources[], cached

### 3. validate_evidence
- **Purpose**: Cross-validation and confidence scoring
- **Input**: hypothesis, forCount, againstCount
- **Output**: validation metrics, verdict, explanation

### 4. get_knowledge_graph
- **Purpose**: Query related entities
- **Input**: entity (string)
- **Output**: relations[]

## Confidence Scoring Formula

```
baseConfidence = (
  consensusScore * 0.30 +      // 30% weight
  sourceQuality * 0.25 +        // 25% weight
  recencyScore * 0.15 +         // 15% weight
  evidenceQuantity * 0.30       // 30% weight
)

finalConfidence = baseConfidence - contradictionPenalty
```

## Verdict Categories
- **LIKELY VALID**: ratio > 0.7 && confidence > 60
- **LIKELY REFUTED**: ratio < 0.3 && confidence > 60
- **MIXED EVIDENCE**: 0.4 <= ratio <= 0.6
- **DISPUTED**: High contradictions between quality sources
- **INCONCLUSIVE**: confidence < 30

## Security Considerations
- Rate limiting by IP + browser fingerprint
- API keys stored in environment variables
- No PII stored in memory
- HTTPS enforced
