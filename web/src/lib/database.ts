// In-memory database for serverless environments (Vercel)
// For production, consider using Vercel KV, Upstash Redis, or PlanetScale

import crypto from 'crypto';

// In-memory stores
const searchCache = new Map<string, { query: string; perspective: string; results: SearchResult[]; created_at: string; hits: number }>();
const hypothesisHistory = new Map<string, HypothesisRecord>();
const kgEntities = new Map<string, { id: number; name: string; type: string; metadata: Record<string, unknown> }>();
const kgRelations: Array<{ sourceId: number; targetId: number; relationType: string; weight: number; evidence?: string }> = [];
let entityIdCounter = 1;

// Hash function for queries
function hashQuery(query: string, perspective: string): string {
  return crypto.createHash('md5').update(`${query}:${perspective}`).digest('hex');
}

function hashHypothesis(hypothesis: string): string {
  return crypto.createHash('md5').update(hypothesis.toLowerCase().trim()).digest('hex');
}

// ============ SEARCH CACHE ============

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  reliability: number;
  publishDate?: string;
  citations?: number;
}

export interface CachedSearch {
  query: string;
  perspective: string;
  results: SearchResult[];
  created_at: string;
  hits: number;
}

export function getCachedSearch(query: string, perspective: string): CachedSearch | null {
  try {
    const hash = hashQuery(query, perspective);
    const cached = searchCache.get(hash);
    
    if (cached) {
      // Check if cache is fresh (less than 1 hour for serverless)
      const cacheAge = Date.now() - new Date(cached.created_at).getTime();
      const maxAge = 60 * 60 * 1000; // 1 hour
      
      if (cacheAge < maxAge) {
        cached.hits += 1;
        return cached;
      } else {
        searchCache.delete(hash);
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function setCachedSearch(query: string, perspective: string, results: SearchResult[]): void {
  try {
    const hash = hashQuery(query, perspective);
    searchCache.set(hash, {
      query,
      perspective,
      results,
      created_at: new Date().toISOString(),
      hits: 0
    });
  } catch (e) {
    console.error('Cache write error:', e);
  }
}

// ============ HYPOTHESIS HISTORY ============

export interface HypothesisRecord {
  id: number;
  hypothesis: string;
  verdict: string;
  confidence: number;
  evidence_for: string[];
  evidence_against: string[];
  sources: string[];
  created_at: string;
}

export function getSimilarHypotheses(hypothesis: string): HypothesisRecord[] {
  try {
    const hash = hashHypothesis(hypothesis);
    const exact = hypothesisHistory.get(hash);
    
    if (exact) {
      return [exact];
    }
    
    // Simple keyword search
    const keywords = hypothesis.toLowerCase().split(' ')
      .filter(w => w.length > 4)
      .slice(0, 3);
    
    if (keywords.length === 0) return [];
    
    const results: HypothesisRecord[] = [];
    hypothesisHistory.forEach((record) => {
      const matches = keywords.some(k => record.hypothesis.toLowerCase().includes(k));
      if (matches) {
        results.push(record);
      }
    });
    
    return results.slice(0, 5);
  } catch {
    return [];
  }
}

export function saveHypothesisResult(
  hypothesis: string,
  verdict: string,
  confidence: number,
  evidenceFor: string[],
  evidenceAgainst: string[],
  sources: string[]
): void {
  try {
    const hash = hashHypothesis(hypothesis);
    hypothesisHistory.set(hash, {
      id: hypothesisHistory.size + 1,
      hypothesis,
      verdict,
      confidence,
      evidence_for: evidenceFor,
      evidence_against: evidenceAgainst,
      sources,
      created_at: new Date().toISOString()
    });
  } catch (e) {
    console.error('Hypothesis save error:', e);
  }
}

// ============ KNOWLEDGE GRAPH ============

export interface KGEntity {
  id: number;
  name: string;
  type: 'claim' | 'source' | 'evidence' | 'topic';
  metadata: Record<string, unknown>;
}

export interface KGRelation {
  source: string;
  target: string;
  type: 'supports' | 'contradicts' | 'cites' | 'related_to';
  weight: number;
  evidence?: string;
}

export function addEntity(name: string, type: KGEntity['type'], metadata: Record<string, unknown> = {}): number {
  try {
    const existing = kgEntities.get(name);
    if (existing) return existing.id;
    
    const id = entityIdCounter++;
    kgEntities.set(name, { id, name, type, metadata });
    return id;
  } catch {
    return -1;
  }
}

export function addRelation(
  sourceName: string, 
  targetName: string, 
  relationType: KGRelation['type'],
  weight: number = 1.0,
  evidence?: string
): void {
  try {
    const source = kgEntities.get(sourceName);
    const target = kgEntities.get(targetName);
    
    if (!source || !target) return;
    
    kgRelations.push({
      sourceId: source.id,
      targetId: target.id,
      relationType,
      weight,
      evidence
    });
  } catch (e) {
    console.error('Relation add error:', e);
  }
}

export function getRelatedEntities(entityName: string): { entity: string; relation: string; weight: number }[] {
  try {
    const entity = kgEntities.get(entityName);
    if (!entity) return [];
    
    const results: { entity: string; relation: string; weight: number }[] = [];
    
    kgRelations.forEach(rel => {
      if (rel.sourceId === entity.id) {
        const target = Array.from(kgEntities.values()).find(e => e.id === rel.targetId);
        if (target) {
          results.push({ entity: target.name, relation: rel.relationType, weight: rel.weight });
        }
      }
      if (rel.targetId === entity.id) {
        const source = Array.from(kgEntities.values()).find(e => e.id === rel.sourceId);
        if (source) {
          results.push({ entity: source.name, relation: rel.relationType, weight: rel.weight });
        }
      }
    });
    
    return results;
  } catch {
    return [];
  }
}

// ============ SOURCE RELIABILITY ============

const sourceReliability = new Map<string, { baseScore: number; accuracyScore: number }>();

export function getSourceReliability(domain: string): number {
  try {
    const data = sourceReliability.get(domain);
    if (data) {
      return (data.baseScore + data.accuracyScore * 100) / 2;
    }
    return 50;
  } catch {
    return 50;
  }
}

export function updateSourceReliability(domain: string, baseScore: number, accuracyDelta: number = 0): void {
  try {
    const existing = sourceReliability.get(domain);
    
    if (existing) {
      const newAccuracy = Math.max(0, Math.min(1, existing.accuracyScore + accuracyDelta));
      sourceReliability.set(domain, { baseScore, accuracyScore: newAccuracy });
    } else {
      sourceReliability.set(domain, { baseScore, accuracyScore: 0.5 });
    }
  } catch (e) {
    console.error('Source reliability update error:', e);
  }
}
