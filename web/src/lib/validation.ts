// Cross-validation and advanced confidence scoring system

export interface SourceData {
  title: string;
  url: string;
  snippet: string;
  reliability: number;
  publishDate?: string;
  citations?: number;
  domain: string;
}

export interface ValidationResult {
  contradictions: Contradiction[];
  consensusScore: number;
  sourceQuality: number;
  recencyScore: number;
  evidenceQuantity: number;
  finalConfidence: number;
}

export interface Contradiction {
  source1: string;
  source2: string;
  claim1: string;
  claim2: string;
  severity: 'low' | 'medium' | 'high';
}

// Domain reputation scores (can be expanded)
const DOMAIN_SCORES: Record<string, number> = {
  // Government
  '.gov': 95,
  '.gov.uk': 95,
  '.gov.au': 95,
  
  // Academic
  '.edu': 90,
  '.ac.uk': 90,
  'arxiv.org': 88,
  'scholar.google.com': 85,
  'pubmed.ncbi.nlm.nih.gov': 92,
  'nature.com': 93,
  'science.org': 93,
  'sciencedirect.com': 88,
  'springer.com': 87,
  'wiley.com': 86,
  'ieee.org': 88,
  
  // Major news
  'reuters.com': 88,
  'apnews.com': 88,
  'bbc.com': 85,
  'bbc.co.uk': 85,
  'nytimes.com': 82,
  'washingtonpost.com': 80,
  'theguardian.com': 78,
  'economist.com': 85,
  
  // Fact-checking
  'snopes.com': 80,
  'factcheck.org': 85,
  'politifact.com': 82,
  
  // Reference
  'wikipedia.org': 65,
  'britannica.com': 80,
  
  // Tech
  'techcrunch.com': 70,
  'wired.com': 72,
  'arstechnica.com': 75,
  
  // Default for unknown
  'default': 50
};

// Keywords indicating contradictions
const CONTRADICTION_KEYWORDS = {
  positive: ['confirms', 'supports', 'proves', 'validates', 'evidence shows', 'research finds'],
  negative: ['refutes', 'contradicts', 'disproves', 'debunks', 'no evidence', 'myth', 'false'],
  uncertain: ['unclear', 'mixed', 'inconclusive', 'debate', 'controversial', 'disputed']
};

/**
 * Calculate advanced source reliability score
 */
export function calculateSourceScore(source: SourceData): number {
  let score = 50; // Base score
  
  // Domain-based scoring
  const domain = source.domain.toLowerCase();
  for (const [pattern, domainScore] of Object.entries(DOMAIN_SCORES)) {
    if (domain.includes(pattern) || domain.endsWith(pattern)) {
      score = domainScore;
      break;
    }
  }
  
  // Recency bonus (if we have publish date)
  if (source.publishDate) {
    const ageInDays = (Date.now() - new Date(source.publishDate).getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays < 30) score += 5;
    else if (ageInDays < 180) score += 3;
    else if (ageInDays < 365) score += 1;
    else if (ageInDays > 730) score -= 5; // Older than 2 years
  }
  
  // Citation bonus
  if (source.citations) {
    if (source.citations > 100) score += 8;
    else if (source.citations > 50) score += 5;
    else if (source.citations > 10) score += 3;
  }
  
  // HTTPS check
  if (source.url.startsWith('https://')) score += 2;
  
  return Math.min(100, Math.max(0, score));
}

/**
 * Detect contradictions between sources
 */
export function detectContradictions(sources: SourceData[]): Contradiction[] {
  const contradictions: Contradiction[] = [];
  
  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const source1 = sources[i];
      const source2 = sources[j];
      
      const text1 = (source1.snippet || '').toLowerCase();
      const text2 = (source2.snippet || '').toLowerCase();
      
      // Check if one is positive and other is negative
      const hasPositive1 = CONTRADICTION_KEYWORDS.positive.some(k => text1.includes(k));
      const hasNegative1 = CONTRADICTION_KEYWORDS.negative.some(k => text1.includes(k));
      const hasPositive2 = CONTRADICTION_KEYWORDS.positive.some(k => text2.includes(k));
      const hasNegative2 = CONTRADICTION_KEYWORDS.negative.some(k => text2.includes(k));
      
      if ((hasPositive1 && hasNegative2) || (hasNegative1 && hasPositive2)) {
        // Determine severity based on source reliability
        const avgReliability = (source1.reliability + source2.reliability) / 2;
        let severity: 'low' | 'medium' | 'high' = 'low';
        if (avgReliability > 80) severity = 'high';
        else if (avgReliability > 60) severity = 'medium';
        
        contradictions.push({
          source1: source1.url,
          source2: source2.url,
          claim1: source1.snippet.slice(0, 100),
          claim2: source2.snippet.slice(0, 100),
          severity
        });
      }
    }
  }
  
  return contradictions;
}

/**
 * Calculate consensus score across perspectives
 */
export function calculateConsensus(perspectiveResults: Record<string, SourceData[]>): number {
  const stances: { perspective: string; stance: 'positive' | 'negative' | 'neutral' }[] = [];
  
  for (const [perspective, sources] of Object.entries(perspectiveResults)) {
    let positiveCount = 0;
    let negativeCount = 0;
    
    for (const source of sources) {
      const text = (source.snippet || '').toLowerCase();
      if (CONTRADICTION_KEYWORDS.positive.some(k => text.includes(k))) positiveCount++;
      if (CONTRADICTION_KEYWORDS.negative.some(k => text.includes(k))) negativeCount++;
    }
    
    const stance = positiveCount > negativeCount ? 'positive' : 
                   negativeCount > positiveCount ? 'negative' : 'neutral';
    stances.push({ perspective, stance });
  }
  
  // Calculate agreement percentage
  const posCount = stances.filter(s => s.stance === 'positive').length;
  const negCount = stances.filter(s => s.stance === 'negative').length;
  const maxAgreement = Math.max(posCount, negCount);
  
  return (maxAgreement / stances.length) * 100;
}

/**
 * Calculate recency score based on source dates
 */
export function calculateRecencyScore(sources: SourceData[]): number {
  const datedSources = sources.filter(s => s.publishDate);
  if (datedSources.length === 0) return 50; // Unknown, return neutral
  
  const now = Date.now();
  let totalScore = 0;
  
  for (const source of datedSources) {
    const ageInDays = (now - new Date(source.publishDate!).getTime()) / (1000 * 60 * 60 * 24);
    
    if (ageInDays < 30) totalScore += 100;
    else if (ageInDays < 90) totalScore += 85;
    else if (ageInDays < 180) totalScore += 70;
    else if (ageInDays < 365) totalScore += 55;
    else if (ageInDays < 730) totalScore += 40;
    else totalScore += 25;
  }
  
  return totalScore / datedSources.length;
}

/**
 * Calculate overall validation result
 */
export function validateEvidence(
  perspectiveResults: Record<string, SourceData[]>
): ValidationResult {
  // Flatten all sources
  const allSources = Object.values(perspectiveResults).flat();
  
  // Calculate individual metrics
  const contradictions = detectContradictions(allSources);
  const consensusScore = calculateConsensus(perspectiveResults);
  const sourceQuality = allSources.length > 0 
    ? allSources.reduce((sum, s) => sum + calculateSourceScore(s), 0) / allSources.length 
    : 0;
  const recencyScore = calculateRecencyScore(allSources);
  const evidenceQuantity = Math.min(100, allSources.length * 5); // Cap at 20 sources for 100%
  
  // Contradiction penalty
  const contradictionPenalty = contradictions.reduce((penalty, c) => {
    if (c.severity === 'high') return penalty + 15;
    if (c.severity === 'medium') return penalty + 8;
    return penalty + 3;
  }, 0);
  
  // Calculate final confidence
  const baseConfidence = (
    consensusScore * 0.30 +      // 30% weight on consensus
    sourceQuality * 0.25 +        // 25% weight on source quality
    recencyScore * 0.15 +         // 15% weight on recency
    evidenceQuantity * 0.30       // 30% weight on evidence quantity
  );
  
  const finalConfidence = Math.max(10, Math.min(95, baseConfidence - contradictionPenalty));
  
  return {
    contradictions,
    consensusScore: Math.round(consensusScore),
    sourceQuality: Math.round(sourceQuality),
    recencyScore: Math.round(recencyScore),
    evidenceQuantity: Math.round(evidenceQuantity),
    finalConfidence: Math.round(finalConfidence)
  };
}

/**
 * Determine verdict based on evidence
 */
export function determineVerdict(
  validation: ValidationResult,
  forCount: number,
  againstCount: number
): { verdict: string; explanation: string } {
  const ratio = forCount / (forCount + againstCount || 1);
  const confidence = validation.finalConfidence;
  
  if (confidence < 30) {
    return {
      verdict: 'INCONCLUSIVE',
      explanation: 'Insufficient reliable evidence to make a determination'
    };
  }
  
  if (validation.contradictions.filter(c => c.severity === 'high').length >= 2) {
    return {
      verdict: 'DISPUTED',
      explanation: 'Significant contradictions exist between high-quality sources'
    };
  }
  
  if (ratio > 0.7 && confidence > 60) {
    return {
      verdict: 'LIKELY VALID',
      explanation: 'Strong supporting evidence with high consensus'
    };
  }
  
  if (ratio < 0.3 && confidence > 60) {
    return {
      verdict: 'LIKELY REFUTED',
      explanation: 'Strong contradicting evidence with high consensus'
    };
  }
  
  if (ratio >= 0.4 && ratio <= 0.6) {
    return {
      verdict: 'MIXED EVIDENCE',
      explanation: 'Evidence is roughly balanced between supporting and opposing'
    };
  }
  
  return {
    verdict: 'PARTIALLY SUPPORTED',
    explanation: ratio > 0.5 
      ? 'More evidence supports than refutes, but not conclusively'
      : 'More evidence refutes than supports, but not conclusively'
  };
}

