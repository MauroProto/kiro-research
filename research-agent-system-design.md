# Sistema de Agente de Research Profesional - Documento de Diseño Completo

## Metadata
- **Fecha de creación:** Diciembre 2025
- **Propósito:** Diseño de un agente de investigación profesional para validación de hipótesis
- **Stack principal:** GLM 4.6 + Exa API
- **Tipo de sistema:** Hypothesis Validation Agent

---

## 1. Visión General del Proyecto

### 1.1 Objetivo
Construir un sistema de investigación automatizado de grado empresarial que pueda:
- Tomar ideas/hipótesis y validarlas o refutarlas con evidencia
- Realizar búsquedas web profundas y adversariales
- Evaluar la confiabilidad de fuentes
- Generar reportes con niveles de confianza por afirmación
- Detectar y resolver conflictos de información

### 1.2 Principios de Diseño Enterprise
1. **Durable Execution:** Si una investigación tarda horas y el servidor se reinicia, el agente debe continuar donde se quedó
2. **GraphRAG (Memoria Híbrida):** Construye un Grafo de Conocimiento conectando entidades para entender relaciones complejas
3. **Jerarquía de Mando:** Organización virtual con roles especializados (Director, Críticos, Investigadores)
4. **Búsqueda Adversarial:** Buscar evidencia a favor Y en contra simultáneamente
5. **Scoring de Fuentes:** Evaluar confiabilidad de cada fuente automáticamente

---

## 2. Arquitectura del Sistema

### 2.1 Vista de Alto Nivel (4 Planos)

```
┌───────────────────────────────────────────────────────────────────────────┐
│                        PLANO DE CONTROL (API / UI)                        │
│  (Dashboard de Investigación, Aprobación Humana, Webhooks de Entrada)     │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────── ORQUESTADOR MAESTRO ───────────────────────────┐
│ (State Machine Persistente - ej. LangGraph sobre Postgres/Temporal)       │
│                                                                           │
│  ┌────────────────────┐      ┌────────────────────┐      ┌──────────────┐ │
│  │  DIRECTOR DE INV.  │◄────►│  CRÍTICO / EDITOR  │◄────►│ COMPLIANCE   │ │
│  │ (Planificador Estr.)│      │ (Fact-checker)     │      │ (Safety/Legal)│ │
│  └─────────┬──────────┘      └────────────────────┘      └──────────────┘ │
└────────────┼──────────────────────────────────────────────────────────────┘
             │ Asigna misiones paralelas
             ▼
┌────────────┴──────────── ENJAMBRE DE SUB-AGENTES ─────────────────────────┐
│                                                                           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                 │
│  │ AGENTE PRO   │    │ AGENTE CONTRA│    │ AGENTE       │                 │
│  │ (A favor)    │    │ (En contra)  │    │ CONTEXTO     │                 │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                 │
│         │                   │                   │                         │
│  ┌──────▼───────┐    ┌──────▼───────┐    ┌──────▼───────┐                 │
│  │  EXA SEARCH  │    │  EXA SEARCH  │    │  EXA SEARCH  │                 │
│  │  + CONTENTS  │    │  + CONTENTS  │    │  + CONTENTS  │                 │
│  └──────────────┘    └──────────────┘    └──────────────┘                 │
└───────────────────────────────────────────────────────────────────────────┘
             │ Escribe / Lee
             ▼
┌──────────────────────────── PLANO DE MEMORIA ─────────────────────────────┐
│ 1. VECTOR DB (ChromaDB/Qdrant): Búsqueda semántica de chunks de texto     │
│ 2. KNOWLEDGE GRAPH (NetworkX/Neo4j): Entidades conectadas                 │
│ 3. CACHÉ DE URLs (SQLite/Redis): Para no repetir búsquedas               │
│ 4. FILE SYSTEM: PDFs originales, CSVs, capturas                          │
└───────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Arquitectura por Capas Detallada

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ENTRADA                                        │
│                                                                             │
│   Usuario ingresa hipótesis:                                                │
│   "El mercado de vehículos eléctricos en LATAM superará $50B para 2028"    │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CAPA 1: CLARIFICADOR                                │
│                                                                             │
│   • Detecta ambigüedades en la hipótesis                                    │
│   • Pregunta al usuario si es necesario:                                    │
│     - "¿LATAM incluye Brasil o solo HISPAM?"                               │
│     - "¿$50B en ventas o en valuación de mercado?"                         │
│   • Define el alcance exacto de la investigación                           │
│                                                                             │
│   [GLM 4.6 - Prompt de clarificación]                                      │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CAPA 2: DESCOMPONEDOR DE CLAIMS                        │
│                                                                             │
│   Toma la hipótesis clarificada y la rompe en afirmaciones atómicas:       │
│                                                                             │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│   │    CLAIM 1      │  │    CLAIM 2      │  │    CLAIM 3      │            │
│   │                 │  │                 │  │                 │            │
│   │ Tamaño actual   │  │ Tasa de crec.   │  │ Factores que    │            │
│   │ del mercado EV  │  │ histórica del   │  │ acelerarían o   │            │
│   │ en LATAM        │  │ sector          │  │ frenarían       │            │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘            │
│                                                                             │
│   Para cada claim genera:                                                   │
│   • Queries de búsqueda A FAVOR                                            │
│   • Queries de búsqueda EN CONTRA                                          │
│   • Tipo de evidencia necesaria (cuanti/cuali)                             │
│                                                                             │
│   [GLM 4.6 - Prompt de descomposición]                                     │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   CAPA 3: MOTOR DE BÚSQUEDA ADVERSARIAL                     │
│                                                                             │
│   Ejecuta búsquedas en paralelo con intenciones opuestas:                  │
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────┐    │
│   │                                                                   │    │
│   │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐           │    │
│   │  │   AGENTE    │    │   AGENTE    │    │   AGENTE    │           │    │
│   │  │    PRO      │    │   CONTRA    │    │  CONTEXTO   │           │    │
│   │  │             │    │             │    │             │           │    │
│   │  │ Busca datos │    │ Busca       │    │ Busca       │           │    │
│   │  │ que soporten│    │ críticas,   │    │ definiciones│           │    │
│   │  │ la hipótesis│    │ fracasos,   │    │ baseline,   │           │    │
│   │  │             │    │ obstáculos  │    │ histórico   │           │    │
│   │  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘           │    │
│   │         │                  │                  │                   │    │
│   │         ▼                  ▼                  ▼                   │    │
│   │  ┌─────────────────────────────────────────────────────────┐     │    │
│   │  │                    EXA API                              │     │    │
│   │  │                                                         │     │    │
│   │  │  • /search - Búsqueda semántica neural                 │     │    │
│   │  │  • /contents - Extracción de contenido limpio          │     │    │
│   │  │  • /findsimilar - Expandir fuentes buenas              │     │    │
│   │  │  • /research - Deep research automatizado              │     │    │
│   │  └─────────────────────────────────────────────────────────┘     │    │
│   │                                                                   │    │
│   └───────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CAPA 4: EVALUADOR DE EVIDENCIA                         │
│                                                                             │
│   Cada pieza de evidencia pasa por un scoring:                             │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                    MATRIZ DE CONFIABILIDAD                      │      │
│   │                                                                 │      │
│   │   FUENTE              │ SCORE │ RAZÓN                          │      │
│   │   ────────────────────┼───────┼─────────────────────────────── │      │
│   │   .gov / .edu         │  95%  │ Fuente primaria oficial        │      │
│   │   Papers (arxiv)      │  90%  │ Peer review implícito          │      │
│   │   Bloomberg/Reuters   │  85%  │ Estándar periodístico alto     │      │
│   │   Consulting (McK/BCG)│  80%  │ Research pagado pero riguroso  │      │
│   │   Tech media          │  65%  │ Variable, verificar datos      │      │
│   │   Blogs/Medium        │  35%  │ Sin verificación editorial     │      │
│   │   Foros/Reddit        │  20%  │ Anecdótico                     │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                                                                             │
│   Factores adicionales:                                                     │
│   • +10% si tiene citas a fuentes primarias                                │
│   • +5% si es reciente (< 12 meses)                                        │
│   • -20% si hay conflicto de interés obvio                                 │
│   • -30% si contradice múltiples fuentes de mayor tier                     │
│                                                                             │
│   [GLM 4.6 - Prompt de evaluación crítica]                                 │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CAPA 5: DETECTOR DE CONFLICTOS                      │
│                                                                             │
│   Identifica cuando la evidencia se contradice:                            │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │  CONFLICTO DETECTADO                                            │      │
│   │                                                                 │      │
│   │  Fuente A (Bloomberg, 85%):                                    │      │
│   │  "El mercado EV en LATAM creció 45% en 2024"                   │      │
│   │                                                                 │      │
│   │  Fuente B (Statista, 75%):                                     │      │
│   │  "El crecimiento fue del 28% en 2024"                          │      │
│   │                                                                 │      │
│   │  ──────────────────────────────────────────────                │      │
│   │  ACCIÓN: Lanzar búsqueda de DESEMPATE                          │      │
│   │  • Buscar fuente primaria (ej: ANFAVEA, datos gobierno)        │      │
│   │  • Verificar si usan definiciones distintas                    │      │
│   │  • Marcar como "dato en disputa" si no se resuelve             │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                                                                             │
│   Alternativa: DEBATE ADVERSARIAL                                          │
│   • Dos agentes argumentan posiciones opuestas                             │
│   • El Director actúa como juez                                            │
│   • Basado en paper de Google "Society of Mind"                            │
│                                                                             │
│   [GLM 4.6 - Prompt de resolución de conflictos]                           │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CAPA 6: SINTETIZADOR + VEREDICTO                       │
│                                                                             │
│   Combina toda la evidencia evaluada en un juicio final:                   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                                                                 │      │
│   │   HIPÓTESIS: "El mercado EV LATAM superará $50B para 2028"     │      │
│   │                                                                 │      │
│   │   ┌─────────────────────────────────────────────────────┐      │      │
│   │   │           VEREDICTO: PARCIALMENTE VÁLIDO            │      │      │
│   │   │                  Confianza: 62%                      │      │      │
│   │   └─────────────────────────────────────────────────────┘      │      │
│   │                                                                 │      │
│   │   CLAIM 1 (Tamaño actual): ✅ CONFIRMADO (89%)                 │      │
│   │   CLAIM 2 (Tasa crecimiento): ⚠️ PARCIAL (58%)                 │      │
│   │   CLAIM 3 (Factores macro): ❌ EVIDENCIA MIXTA (41%)           │      │
│   │                                                                 │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                                                                             │
│   [GLM 4.6 - Prompt de síntesis final]                                     │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CAPA 7: LOOP DE PROFUNDIZACIÓN                       │
│                                                                             │
│   Decisión automática basada en confianza:                                 │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                                                                 │      │
│   │   SI confianza < 60% Y iteraciones < 3:                        │      │
│   │      → Generar nuevas queries más específicas                   │      │
│   │      → Volver a CAPA 3 (búsqueda)                              │      │
│   │                                                                 │      │
│   │   SI confianza >= 60% O iteraciones >= 3:                      │      │
│   │      → Proceder a REPORTE FINAL                                │      │
│   │      → Marcar gaps de información                              │      │
│   │                                                                 │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SALIDA: REPORTE                                  │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                                                                 │      │
│   │   📊 RESEARCH REPORT                                           │      │
│   │   ═══════════════════════════════════════════════════════      │      │
│   │                                                                 │      │
│   │   VEREDICTO EJECUTIVO                                          │      │
│   │   [2-3 oraciones con conclusión]                               │      │
│   │                                                                 │      │
│   │   EVIDENCIA A FAVOR (ordenada por confiabilidad)               │      │
│   │   • Dato 1 - Fuente (Score) - Extracto clave                   │      │
│   │   • Dato 2 - Fuente (Score) - Extracto clave                   │      │
│   │                                                                 │      │
│   │   EVIDENCIA EN CONTRA                                          │      │
│   │   • Contraargumento 1 - Fuente - Por qué importa               │      │
│   │                                                                 │      │
│   │   INFORMACIÓN FALTANTE                                         │      │
│   │   • Qué datos no se pudieron encontrar                         │      │
│   │   • Qué fuentes serían ideales pero no accesibles              │      │
│   │                                                                 │      │
│   │   NIVEL DE CONFIANZA POR CLAIM                                 │      │
│   │   [Tabla visual]                                               │      │
│   │                                                                 │      │
│   │   FUENTES CONSULTADAS                                          │      │
│   │   [Lista con URLs y scores]                                    │      │
│   │                                                                 │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Flujo de Datos Simplificado

```
HIPÓTESIS
    │
    ▼
CLARIFICAR ──────► ¿Ambiguo? ──► SÍ ──► Preguntar al usuario
    │                              │
    │                              ▼
    │◄─────────────────────────────┘
    │
    ▼
DESCOMPONER EN CLAIMS
    │
    ▼
BÚSQUEDA PARALELA ◄────────────────────────┐
    │                                       │
    ├── Agente PRO (busca soporte)         │
    ├── Agente CONTRA (busca críticas)     │
    └── Agente CONTEXTO (busca base)       │
    │                                       │
    ▼                                       │
EVALUAR EVIDENCIA                          │
    │                                       │
    ▼                                       │
¿CONFLICTOS? ──► SÍ ──► DESEMPATE ─────────┤
    │                                       │
    ▼                                       │
SINTETIZAR                                 │
    │                                       │
    ▼                                       │
¿CONFIANZA < 60%? ──► SÍ ──────────────────┘
    │
    ▼
GENERAR REPORTE
```

---

## 4. Stack Tecnológico

### 4.1 Stack Recomendado

| Componente | Tecnología | Razón |
|------------|------------|-------|
| **LLM Principal** | GLM 4.6 | Modelo elegido por el usuario, buen razonamiento |
| **Búsqueda Web** | Exa API | Búsqueda semántica neural, hasta 100 resultados, control granular |
| **Scraping Backup** | Jina Reader | Para sitios que Exa no cubra bien |
| **Orquestación** | LangGraph | Maneja flujos con ciclos y estados |
| **Memoria Vector** | ChromaDB → Qdrant | ChromaDB para prototipar, Qdrant en producción |
| **Memoria Grafo** | NetworkX → Neo4j | NetworkX en memoria, Neo4j cuando escales |
| **Cache URLs** | SQLite | Simple y suficiente para no repetir búsquedas |
| **Backend** | FastAPI + Pydantic | Estándar para IA, async y rápido |

### 4.2 Stack Evolutivo

**Fase 1 - MVP (2-3 semanas):**
- LangGraph solo (sin Temporal)
- GLM 4.6 vía API
- Exa API para búsquedas
- ChromaDB local
- NetworkX en memoria
- SQLite para cache

**Fase 2 - Producción (2-3 meses):**
- Agregar Temporal.io para durabilidad
- Migrar a Qdrant
- Migrar a Neo4j
- Agregar Browserbase para navegadores headless

---

## 5. Exa API - Detalles de Integración

### 5.1 ¿Por qué Exa?

Exa es la primera API de búsqueda web basada en significado (embeddings). A diferencia de búsquedas keyword tradicionales:
- Usa modelos de embeddings entrenados para predecir el siguiente link relevante
- Entiende semántica, no solo coincidencia de palabras
- Reduce alucinaciones al proveer datos más relevantes
- Devuelve hasta 100 resultados vs 20 de Tavily

### 5.2 Endpoints Principales

| Endpoint | Uso | Precio |
|----------|-----|--------|
| **/search** | Búsqueda neural o keyword | $0.005 (1-25 results) |
| **/contents** | HTML parseado y limpio | $0.001 por página |
| **/findsimilar** | Expandir fuentes similares a una URL | $0.005 |
| **/research** | Deep research automatizado con citas | $0.015 (1-25 results) |

### 5.3 Exa vs Tavily - Comparación

| Aspecto | Exa | Tavily |
|---------|-----|--------|
| Filosofía | Deep research, control granular | Respuestas rápidas, defaults simples |
| Resultados por query | Hasta 100+ | Máximo 20 |
| Setup | Requiere configuración | Plug & play |
| Ideal para | Research profundo, validación | RAG simple, Q&A rápido |
| Índice | ~1 billón de páginas (propio) | Usa Google/Bing |

### 5.4 Limitaciones de Exa

- Índice más pequeño que Google (~1B vs ~1T páginas)
- Para noticias muy recientes o sitios nicho, complementar con otra fuente
- Requiere más configuración inicial que Tavily

---

## 6. Componentes Clave del Sistema

### 6.1 Director de Investigación (Planner Jerárquico)

**Función:** No resuelve todo, genera un Documento de Requerimientos de Investigación (DRD)

**Input:** "Analiza el mercado de baterías de estado sólido"

**Output:** Árbol de tareas
- Rama 1: Tecnología → Agente Técnico
- Rama 2: Competidores Chinos → Agente de Mercado Asia
- Rama 3: Startups USA → Agente VC

### 6.2 Protocolo de Consenso y Crítica

Antes de entregar el reporte, el Agente Crítico revisa:

```
CRÍTICO: "Afirmas que la empresa X creció 200%, 
         pero la cita es un blog de marketing. 
         Necesitamos fuente financiera (SEC, Bloomberg)."

ACCIÓN:  Rechaza sección → Sub-agente busca en fuentes Tier 1
```

### 6.3 Source Reliability Scoring

```python
SOURCE_SCORES = {
    # Tier 1: Fuentes primarias
    "gov": 0.95,
    "edu": 0.90,
    "arxiv": 0.90,
    "sec.gov": 0.95,
    
    # Tier 2: Medios establecidos
    "reuters": 0.85,
    "bloomberg": 0.85,
    "wsj": 0.80,
    
    # Tier 3: Tech/Industry
    "techcrunch": 0.70,
    "wired": 0.70,
    
    # Tier 4: Blogs
    "medium": 0.40,
    "substack": 0.50,
    "default": 0.30
}

# Modificadores
+0.10 si tiene citas a fuentes primarias
+0.05 si es reciente (< 12 meses)
-0.20 si hay conflicto de interés
-0.30 si contradice múltiples fuentes Tier 1
```

### 6.4 Confidence Intervals en Conclusiones

El reporte debe incluir niveles de confianza:
- **Alta confianza (80%+):** 3+ fuentes primarias concordantes
- **Media confianza (50-79%):** 1-2 fuentes primarias, algunas secundarias
- **Baja confianza (<50%):** Solo fuentes secundarias o conflictivas

---

## 7. Estructura de Código Sugerida

```
research_agent/
├── core/
│   ├── director.py          # Planner jerárquico
│   ├── clarifier.py         # Detecta ambigüedades
│   ├── decomposer.py        # Rompe hipótesis en claims
│   ├── critic.py            # Fact-checker
│   ├── conflict_resolver.py # Resuelve contradicciones
│   └── synthesizer.py       # Síntesis final + veredicto
│
├── agents/
│   ├── base_agent.py        # Clase abstracta
│   ├── pro_agent.py         # Busca evidencia a favor
│   ├── contra_agent.py      # Busca evidencia en contra
│   └── context_agent.py     # Busca definiciones/baseline
│
├── tools/
│   ├── exa_client.py        # Wrapper de Exa API
│   ├── jina_reader.py       # Backup para scraping
│   └── source_scorer.py     # Evalúa confiabilidad
│
├── memory/
│   ├── vector_store.py      # ChromaDB/Qdrant
│   ├── knowledge_graph.py   # NetworkX/Neo4j
│   └── url_cache.py         # SQLite para URLs
│
├── schemas/
│   ├── hypothesis.py        # Pydantic model
│   ├── claim.py             # Claims atómicos
│   ├── evidence.py          # Evidencia con score
│   ├── finding.py           # Hallazgos evaluados
│   └── report.py            # Reporte final
│
└── graph/
    └── workflow.py          # LangGraph state machine
```

---

## 8. Prompts Clave

### 8.1 Prompt del Decomposer

```
Sos un analista de investigación. Tu trabajo es descomponer una hipótesis 
en claims atómicos y verificables.

HIPÓTESIS: {hypothesis}

Para cada claim, especificá:
1. El claim exacto a verificar
2. Qué tipo de evidencia lo validaría (dato cuantitativo, opinión experta, caso de estudio)
3. Qué tipo de evidencia lo refutaría
4. Keywords de búsqueda óptimas (PRO y CONTRA)

Formato JSON:
{
  "claims": [
    {
      "claim": "...",
      "evidence_needed": "...",
      "refutation_would_be": "...",
      "search_queries_pro": ["...", "..."],
      "search_queries_contra": ["...", "..."]
    }
  ]
}
```

### 8.2 Prompt del Evaluador

```
Evaluá la siguiente evidencia para el claim: {claim}

EVIDENCIA:
- Fuente: {url}
- Dominio: {domain}
- Fecha: {date}
- Contenido: {content}

Determiná:
1. Score de confiabilidad (0-100)
2. ¿Soporta o refuta el claim?
3. ¿Hay conflicto de interés potencial?
4. ¿Tiene citas a fuentes primarias?
5. Extracto clave relevante al claim

Formato JSON.
```

### 8.3 Prompt del Sintetizador

```
Sintetizá la siguiente evidencia para la hipótesis: {hypothesis}

CLAIMS Y EVIDENCIA:
{claims_with_evidence}

Generá:
1. Veredicto: VÁLIDO / PARCIALMENTE VÁLIDO / REFUTADO / INCONCLUSO
2. Score de confianza general (0-100)
3. Resumen ejecutivo (2-3 oraciones)
4. Score por claim individual
5. Principales gaps de información
6. Recomendación de acción

Formato JSON.
```

---

## 9. Output Esperado del Sistema

```markdown
# Research Report: [Hipótesis]

## Veredicto: PARCIALMENTE VÁLIDO (67% confianza)

## Resumen Ejecutivo
[2-3 oraciones con la conclusión principal]

## Evidencia a Favor
1. **[Claim 1]** ✅ Confirmado (89%)
   - Fuente: [URL] (confiabilidad: 85%)
   - Dato clave: "..."

2. **[Claim 2]** ⚠️ Parcial (58%)
   - Fuente: [URL] (confiabilidad: 70%)
   - Dato clave: "..."

## Evidencia en Contra
1. **[Claim 3]** ❌ Refutado (41%)
   - Fuente: [URL] (confiabilidad: 80%)
   - Contraargumento: "..."

## Información Faltante
- No se encontró data sobre X
- Sería necesario acceder a Y para confirmar
- Fuente ideal no accesible: Z

## Nivel de Confianza por Claim
| Claim | Status | Confianza | Fuentes |
|-------|--------|-----------|---------|
| Claim 1 | ✅ | 89% | 4 |
| Claim 2 | ⚠️ | 58% | 2 |
| Claim 3 | ❌ | 41% | 3 |

## Fuentes Consultadas
1. [URL1] - Domain (Score: 85%) - Tier 1
2. [URL2] - Domain (Score: 70%) - Tier 2
...
```

---

## 10. Diferenciadores vs Chatbot Básico

| Aspecto | Chatbot con Búsqueda | Este Sistema |
|---------|----------------------|--------------|
| Búsqueda | Una query, primeros resultados | Múltiples queries adversariales |
| Evaluación | Confía en todo | Scoring de fuentes por tier |
| Conflictos | Ignora o elige arbitrariamente | Detecta, desempata, documenta |
| Output | Respuesta plana | Veredicto + confianza + gaps |
| Iteración | Una pasada | Loop hasta confianza mínima |
| Memoria | Ninguna | Cache + findings + grafo |
| Transparencia | Caja negra | Citas exactas con scores |

---

## 11. Próximos Pasos Recomendados

1. **Semana 1:** Implementar loop básico Exa + GLM 4.6 sin LangGraph (validar flujo)
2. **Semana 2:** Agregar LangGraph para manejar estados y ciclos
3. **Semana 3:** Implementar source scoring y detector de conflictos
4. **Semana 4:** Agregar memoria (ChromaDB) y cache de URLs
5. **Mes 2:** Escalar con Qdrant, Neo4j, y dashboard de monitoreo

---

## 12. Referencias y Recursos

- **Exa API Docs:** https://docs.exa.ai/
- **LangGraph:** https://python.langchain.com/docs/langgraph
- **Paper "Society of Mind":** Debate adversarial entre agentes
- **Temporal.io:** Para durable execution en producción
- **ChromaDB:** https://www.trychroma.com/
- **Jina Reader:** https://jina.ai/reader/

---

*Documento generado para servir como contexto completo del proyecto de Research Agent*
