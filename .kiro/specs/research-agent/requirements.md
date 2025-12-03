# Research Agent - Requirements

## Overview
Sistema de validación de hipótesis multi-agente que utiliza 5 agentes especializados para buscar evidencia a favor y en contra de cualquier afirmación.

## Functional Requirements

### FR-1: Multi-Agent Research System
- **FR-1.1**: El sistema debe utilizar 5 agentes especializados (Scientific, Skeptic, Advocate, Historical, Statistical)
- **FR-1.2**: Cada agente debe buscar desde su perspectiva única
- **FR-1.3**: Los agentes deben ejecutar búsquedas en paralelo

### FR-2: Hypothesis Analysis
- **FR-2.1**: El Director debe analizar la hipótesis antes de las búsquedas
- **FR-2.2**: Debe generar una estrategia de búsqueda personalizada
- **FR-2.3**: Debe verificar hipótesis similares previas en memoria

### FR-3: Evidence Validation
- **FR-3.1**: Cross-validation de todas las fuentes recolectadas
- **FR-3.2**: Detección de contradicciones entre fuentes
- **FR-3.3**: Cálculo de puntuación de confianza avanzada

### FR-4: Source Reliability
- **FR-4.1**: Puntuación de confiabilidad por dominio (.gov, .edu, etc.)
- **FR-4.2**: Bonus por recencia de publicación
- **FR-4.3**: Bonus por número de citaciones

### FR-5: Rate Limiting
- **FR-5.1**: Límite de 2 consultas por usuario por día
- **FR-5.2**: Detección por IP + fingerprint del navegador
- **FR-5.3**: Reset automático cada 24 horas

### FR-6: Caching System
- **FR-6.1**: Cache de búsquedas para evitar duplicados
- **FR-6.2**: TTL de 1 hora para resultados cacheados
- **FR-6.3**: Indicador visual de resultados cacheados

### FR-7: Knowledge Graph
- **FR-7.1**: Almacenamiento de entidades (claims, sources, evidence)
- **FR-7.2**: Relaciones entre entidades (supports, contradicts, cites)
- **FR-7.3**: Consulta de entidades relacionadas

## Non-Functional Requirements

### NFR-1: Performance
- Respuesta inicial en menos de 2 segundos
- Streaming de resultados en tiempo real

### NFR-2: User Experience
- Interfaz tipo terminal retro
- Panel de visualización del flujo de agentes
- Feedback visual durante el procesamiento

### NFR-3: Deployment
- Compatible con Vercel serverless
- Variables de entorno para API keys
- Sin dependencias de base de datos externa

## Tech Stack
- Next.js 15 + React 19
- Tailwind CSS
- DeepSeek Chat API
- Exa API para búsqueda web
- Vercel AI SDK
