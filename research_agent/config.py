"""
Centralized configuration for the Research Agent.
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    """
    
    # API Keys
    openai_api_key: Optional[str] = Field(None, env="OPENAI_API_KEY")
    exa_api_key: Optional[str] = Field(None, env="EXA_API_KEY")
    
    # LLM Configuration
    llm_model: str = Field("gpt-4o", env="LLM_MODEL")
    llm_temperature: float = Field(0.0, env="LLM_TEMPERATURE")
    
    # Research Configuration
    max_iterations: int = Field(3, env="MAX_ITERATIONS")
    min_confidence_threshold: float = Field(60.0, env="MIN_CONFIDENCE_THRESHOLD")
    max_results_per_query: int = Field(5, env="MAX_RESULTS_PER_QUERY")
    
    # Memory Configuration
    chroma_persist_dir: str = Field("./chroma_db", env="CHROMA_PERSIST_DIR")
    url_cache_db: str = Field("./url_cache.db", env="URL_CACHE_DB")
    
    # Source Scoring
    default_source_score: float = Field(50.0, env="DEFAULT_SOURCE_SCORE")
    recency_bonus: float = Field(5.0, env="RECENCY_BONUS")
    primary_source_bonus: float = Field(10.0, env="PRIMARY_SOURCE_BONUS")
    conflict_penalty: float = Field(20.0, env="CONFLICT_PENALTY")
    bias_penalty: float = Field(30.0, env="BIAS_PENALTY")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


# Global settings instance
settings = Settings()


# Source reliability tiers
SOURCE_TIERS = {
    # Tier 1: Primary/Official Sources (90-100)
    "tier_1": {
        "domains": [".gov", ".edu", "arxiv.org", "sec.gov", "who.int", "un.org"],
        "score_range": (90, 100),
        "description": "Official government, educational, and institutional sources"
    },
    
    # Tier 2: Established Media/Financial (80-89)
    "tier_2": {
        "domains": ["reuters.com", "bloomberg.com", "wsj.com", "ft.com", 
                   "nytimes.com", "bbc.com", "economist.com", "apnews.com"],
        "score_range": (80, 89),
        "description": "Major established news and financial media"
    },
    
    # Tier 3: Tech/Industry Publications (65-79)
    "tier_3": {
        "domains": ["techcrunch.com", "wired.com", "theverge.com", "arstechnica.com",
                   "hbr.org", "mit.edu", "nature.com", "science.org"],
        "score_range": (65, 79),
        "description": "Reputable tech and industry publications"
    },
    
    # Tier 4: General News/Wikipedia (50-64)
    "tier_4": {
        "domains": ["wikipedia.org", "cnn.com", "forbes.com", "businessinsider.com"],
        "score_range": (50, 64),
        "description": "General news and reference sites"
    },
    
    # Tier 5: Blogs/UGC (20-49)
    "tier_5": {
        "domains": ["medium.com", "substack.com", "linkedin.com"],
        "score_range": (20, 49),
        "description": "User-generated content and blogs"
    },
    
    # Tier 6: Forums/Social (0-19)
    "tier_6": {
        "domains": ["reddit.com", "quora.com", "twitter.com", "x.com"],
        "score_range": (0, 19),
        "description": "Social media and forums - anecdotal"
    }
}


# Verdict definitions
VERDICTS = {
    "VALID": {
        "min_confidence": 80,
        "min_support_ratio": 0.7,
        "description": "Strong evidence supports the hypothesis"
    },
    "PARTIALLY_VALID": {
        "min_confidence": 50,
        "min_support_ratio": 0.4,
        "description": "Mixed evidence with some support"
    },
    "INCONCLUSIVE": {
        "min_confidence": 30,
        "min_support_ratio": 0.2,
        "description": "Insufficient or conflicting evidence"
    },
    "REFUTED": {
        "min_confidence": 0,
        "min_support_ratio": 0.0,
        "description": "Evidence contradicts the hypothesis"
    }
}


# Prompt templates
PROMPTS = {
    "clarifier": """
You are a research assistant. Analyze the following hypothesis for ambiguity.

HYPOTHESIS: {hypothesis_text}
CONTEXT: {context}

Determine if the hypothesis is clear enough to be researched or if it needs clarification.
Look for:
- Vague terms that could have multiple interpretations
- Missing timeframes or geographic scope
- Undefined metrics or thresholds
- Ambiguous references

{format_instructions}
""",

    "decomposer": """
You are a research analyst. Decompose this hypothesis into atomic, verifiable claims.

HYPOTHESIS: {hypothesis_text}
CONTEXT: {context}

For each claim:
1. State the exact claim to verify
2. Describe what evidence would validate it
3. Describe what would refute it
4. Provide search queries to find supporting evidence
5. Provide search queries to find refuting evidence

Generate 2-5 claims depending on hypothesis complexity.

{format_instructions}
""",

    "evaluator": """
You are a critical fact-checker. Evaluate this evidence against the claim.

CLAIM: {claim_text}

EVIDENCE:
- URL: {url}
- Domain: {domain}
- Content: {content}

Determine:
1. Does the evidence support, refute, or is irrelevant to the claim?
2. Assign a confidence score (0-100) based on source reliability and content relevance
3. Identify any potential conflicts of interest
4. Note if the source cites primary sources
5. Extract the key relevant quote

{format_instructions}
""",

    "synthesizer": """
Synthesize the research findings into a comprehensive report.

HYPOTHESIS: {hypothesis_text}

FINDINGS:
{findings_text}

Generate a report with:
1. Overall verdict: VALID / PARTIALLY_VALID / REFUTED / INCONCLUSIVE
2. Confidence score (0-100)
3. Executive summary (2-3 sentences)
4. Analysis of each claim's findings
5. List of information gaps
6. Recommendations

{format_instructions}
""",

    "conflict_resolver": """
Analyze the following evidence for the claim: "{claim_text}"

EVIDENCE:
{evidence_text}

Identify:
1. Are there contradictions between sources?
2. Which sources are more reliable and why?
3. Can the contradiction be explained (different definitions, timeframes, etc.)?
4. Provide a resolution statement.

Return a clear resolution statement.
"""
}

