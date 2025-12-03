import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";
import { 
  getCachedSearch, 
  setCachedSearch, 
  getSimilarHypotheses, 
  saveHypothesisResult,
  addEntity,
  addRelation,
  getRelatedEntities,
  type SearchResult 
} from "@/lib/database";
import { 
  calculateSourceScore, 
  validateEvidence, 
  determineVerdict,
  type SourceData 
} from "@/lib/validation";
import { checkRateLimitByIP, incrementUsageByIP } from "@/lib/rateLimit";

// DeepSeek Configuration
const deepseek = createOpenAI({
  name: "deepseek",
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

// Exa API Configuration
const EXA_API_KEY = process.env.EXA_API_KEY;

// Agent perspectives with specialized prompts
const PERSPECTIVES = {
  scientific: { 
    name: "Scientific", 
    prefix: "peer-reviewed research study empirical evidence",
    focus: "academic papers, clinical trials, meta-analyses"
  },
  skeptic: { 
    name: "Skeptic", 
    prefix: "criticism problems limitations evidence against debunk",
    focus: "counter-arguments, failed predictions, limitations"
  },
  advocate: { 
    name: "Advocate", 
    prefix: "benefits evidence supporting success proven",
    focus: "supporting evidence, success cases, positive outcomes"
  },
  historical: { 
    name: "Historical", 
    prefix: "history past precedent timeline evolution",
    focus: "historical context, past predictions, precedents"
  },
  statistical: { 
    name: "Statistical", 
    prefix: "statistics data numbers percentage research quantitative",
    focus: "quantitative data, statistics, numerical evidence"
  }
};

interface ExaResult {
  title: string;
  url: string;
  text?: string;
  publishedDate?: string;
}

// Collect results from all perspectives for validation
let currentResearchResults: Record<string, SourceData[]> = {};

async function exaSearch(query: string): Promise<ExaResult[]> {
  if (!EXA_API_KEY) {
    console.error('EXA_API_KEY not configured');
    return [];
  }
  
  try {
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": EXA_API_KEY,
      },
      body: JSON.stringify({
        query,
        numResults: 5,
        type: "auto",
        useAutoprompt: true,
        contents: { text: { maxCharacters: 500 } }
      }),
    });

    if (!response.ok) return [];
    const data = await response.json();
    return data.results || [];
  } catch { return []; }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    // Check rate limit by IP (server-side, harder to bypass)
    const rateLimit = checkRateLimitByIP(req);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          message: `You have reached the limit of ${rateLimit.total} daily queries. Come back tomorrow.`,
          remaining: 0,
          resetAt: rateLimit.resetAt,
          ip: rateLimit.ip
        }), 
        { 
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toString()
          }
        }
      );
    }
    
    // Increment usage by IP
    incrementUsageByIP(req);
    
    // Reset results for new research
    currentResearchResults = {};

    const result = streamText({
      model: deepseek("deepseek-chat"),
      system: `You are an advanced hypothesis validation system with memory, cross-validation, and knowledge graph capabilities.

## Your Enhanced Capabilities
1. **Memory**: You can check if similar hypotheses were analyzed before
2. **Caching**: Search results are cached to improve speed
3. **Cross-Validation**: Sources are checked for contradictions
4. **Knowledge Graph**: Connections between claims and evidence are tracked
5. **Advanced Scoring**: Confidence is calculated using multiple factors

## Process (FOLLOW STRICTLY)
1. FIRST call analyze_hypothesis - this will:
   - Check for similar past hypotheses
   - Generate search instructions
   - Stream the Director's reasoning

2. THEN call web_search for EACH of the 5 perspectives:
   - scientific
   - skeptic  
   - advocate
   - historical
   - statistical

3. THEN call validate_evidence to:
   - Detect contradictions between sources
   - Calculate advanced confidence score
   - Update knowledge graph

4. Finally synthesize findings into a verdict

## Response Format (clean markdown, NO emojis)

### Director Analysis
[Initial reasoning from analyze_hypothesis]

### Previous Research
[Any related past hypotheses if found]

### Evidence Summary

**Supporting Evidence**
- Source: [name] (Reliability: X%)
  [Key finding]
  
**Contradicting Evidence**  
- Source: [name] (Reliability: X%)
  [Key finding]

### Cross-Validation
- Contradictions found: X
- Consensus score: X%
- Source quality: X%

### Verdict
**[LIKELY VALID | LIKELY REFUTED | MIXED EVIDENCE | DISPUTED | INCONCLUSIVE]**

Confidence: X% (based on consensus, source quality, recency, evidence quantity)

[Detailed reasoning]

IMPORTANT: Always cite actual URLs from search results.`,
      messages,
      tools: {
        analyze_hypothesis: tool({
          description: "Director model that analyzes the hypothesis, checks memory for similar past research, and generates search strategy. ALWAYS call this FIRST.",
          parameters: z.object({
            hypothesis: z.string().describe("The hypothesis to analyze"),
          }),
          execute: async ({ hypothesis }) => {
            // Check for similar past hypotheses
            const similarHypotheses = getSimilarHypotheses(hypothesis);
            
            // Check knowledge graph for related entities
            const relatedTopics = getRelatedEntities(hypothesis.split(' ').slice(0, 3).join(' '));
            
            // Add hypothesis to knowledge graph
            addEntity(hypothesis, 'claim', { analyzed_at: new Date().toISOString() });
            
            // Generate detailed reasoning (this will be streamed)
            const reasoning = `
## Director's Analysis

**Hypothesis**: "${hypothesis}"

**Decomposition**:
- Core claim: ${hypothesis}
- Key concepts: ${hypothesis.split(' ').filter(w => w.length > 4).slice(0, 5).join(', ')}
- Testable aspects: Evidence for/against, historical precedent, statistical support

**Search Strategy**:
1. Scientific: Look for peer-reviewed research and academic consensus
2. Skeptic: Find counter-arguments and known limitations  
3. Advocate: Gather supporting evidence and success cases
4. Historical: Check past predictions and precedents
5. Statistical: Find quantitative data and statistics

${similarHypotheses.length > 0 ? `
**Previous Research Found**:
${similarHypotheses.map(h => `- "${h.hypothesis}" → ${h.verdict} (${h.confidence}% confidence)`).join('\n')}
` : '**No similar hypotheses found in memory**'}

${relatedTopics.length > 0 ? `
**Related Topics in Knowledge Graph**:
${relatedTopics.map(r => `- ${r.entity} (${r.relation})`).join('\n')}
` : ''}

**Proceeding with parallel search across all perspectives...**
`;
            
            const searchInstructions = Object.entries(PERSPECTIVES).map(([key, p]) => ({
              perspective: key,
              query: `${hypothesis} ${p.prefix}`,
              focus: p.focus
            }));
            
            return {
              hypothesis,
              reasoning,
              searchInstructions,
              previousResearch: similarHypotheses,
              relatedTopics: relatedTopics.map(r => r.entity)
            };
          },
        }),
        
        web_search: tool({
          description: "Search web from a specific perspective. Uses caching to avoid duplicate searches.",
          parameters: z.object({
            query: z.string(),
            perspective: z.enum(["scientific", "skeptic", "advocate", "historical", "statistical"]),
          }),
          execute: async ({ query, perspective }) => {
            const p = PERSPECTIVES[perspective];
            const fullQuery = `${query} ${p.prefix}`;
            
            // Check cache first
            const cached = getCachedSearch(query, perspective);
            if (cached) {
              currentResearchResults[perspective] = cached.results.map(r => ({
                ...r,
                domain: extractDomain(r.url)
              }));
              return {
                agent: p.name,
                perspective,
                cached: true,
                sources: cached.results.map(r => ({
                  ...r,
                  reliability: calculateSourceScore({ ...r, domain: extractDomain(r.url) })
                }))
              };
            }
            
            // Perform search
            const results = await exaSearch(fullQuery);
            
            // Process and score results
            const processedSources: SearchResult[] = results.map(r => {
              const domain = extractDomain(r.url);
              const sourceData: SourceData = {
                title: r.title,
                url: r.url,
                snippet: r.text?.slice(0, 400) || "",
                reliability: 0,
                publishDate: r.publishedDate,
                domain
              };
              sourceData.reliability = calculateSourceScore(sourceData);
              
              return {
                title: r.title,
                url: r.url,
                snippet: r.text?.slice(0, 400) || "",
                reliability: sourceData.reliability,
                publishDate: r.publishedDate
              };
            });
            
            // Cache results
            setCachedSearch(query, perspective, processedSources);
            
            // Store for validation
            currentResearchResults[perspective] = processedSources.map(r => ({
              ...r,
              domain: extractDomain(r.url)
            }));
            
            // Add to knowledge graph
            for (const source of processedSources) {
              addEntity(source.url, 'source', { title: source.title, reliability: source.reliability });
              addRelation(query, source.url, source.reliability > 70 ? 'supports' : 'related_to', source.reliability / 100);
            }
            
            return {
              agent: p.name,
              perspective,
              cached: false,
              sources: processedSources
            };
          },
        }),
        
        validate_evidence: tool({
          description: "Cross-validate all collected evidence, detect contradictions, and calculate final confidence score. Call this AFTER all searches complete.",
          parameters: z.object({
            hypothesis: z.string(),
            forCount: z.number().describe("Number of supporting sources"),
            againstCount: z.number().describe("Number of contradicting sources")
          }),
          execute: async ({ hypothesis, forCount, againstCount }) => {
            // Perform cross-validation
            const validation = validateEvidence(currentResearchResults);
            const verdict = determineVerdict(validation, forCount, againstCount);
            
            // Save to hypothesis history
            const allSources = Object.values(currentResearchResults).flat();
            saveHypothesisResult(
              hypothesis,
              verdict.verdict,
              validation.finalConfidence,
              allSources.filter(s => s.reliability > 70).map(s => s.url),
              allSources.filter(s => s.reliability <= 70).map(s => s.url),
              allSources.map(s => s.url)
            );
            
            // Update knowledge graph with verdict
            addEntity(verdict.verdict, 'evidence', { confidence: validation.finalConfidence });
            addRelation(hypothesis, verdict.verdict, 'supports', validation.finalConfidence / 100);
            
            return {
              validation: {
                contradictionsFound: validation.contradictions.length,
                contradictionDetails: validation.contradictions.slice(0, 3),
                consensusScore: validation.consensusScore,
                sourceQualityScore: validation.sourceQuality,
                recencyScore: validation.recencyScore,
                evidenceQuantityScore: validation.evidenceQuantity,
                finalConfidence: validation.finalConfidence
              },
              verdict: verdict.verdict,
              explanation: verdict.explanation,
              recommendation: validation.finalConfidence > 70 
                ? "High confidence result"
                : validation.finalConfidence > 40
                ? "Moderate confidence - consider additional research"
                : "Low confidence - significant uncertainty remains"
            };
          }
        }),
        
        get_knowledge_graph: tool({
          description: "Query the knowledge graph for related claims and evidence",
          parameters: z.object({
            entity: z.string().describe("Entity to query relationships for")
          }),
          execute: async ({ entity }) => {
            const relations = getRelatedEntities(entity);
            return {
              entity,
              relations,
              totalConnections: relations.length
            };
          }
        })
      },
      maxSteps: 25,
      temperature: 0.3,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
}
