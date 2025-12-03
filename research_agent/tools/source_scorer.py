"""
Source reliability scoring system.
Evaluates the trustworthiness of web sources based on domain, content, and other factors.
"""

from urllib.parse import urlparse
from datetime import datetime, timedelta
from typing import Optional, Dict, Any


class SourceScorer:
    """
    Evaluates the reliability of a source based on its domain and other factors.
    
    Scoring is based on a tiered system:
    - Tier 1 (90-100): Government, educational, academic sources
    - Tier 2 (80-89): Major established news and financial media
    - Tier 3 (65-79): Reputable tech and industry publications
    - Tier 4 (50-64): General news and reference sites
    - Tier 5 (20-49): Blogs and user-generated content
    - Tier 6 (0-19): Forums and social media
    """
    
    # Domain-specific scores
    DOMAIN_SCORES = {
        # Tier 1: Primary/Official Sources
        "gov": 95,
        "edu": 90,
        "arxiv.org": 92,
        "sec.gov": 95,
        "who.int": 95,
        "un.org": 95,
        "nih.gov": 95,
        "cdc.gov": 95,
        "europa.eu": 93,
        "nature.com": 92,
        "science.org": 92,
        "sciencedirect.com": 90,
        "pubmed.ncbi.nlm.nih.gov": 92,
        "scholar.google.com": 85,
        
        # Tier 2: Established Media/Financial
        "reuters.com": 88,
        "bloomberg.com": 87,
        "wsj.com": 85,
        "ft.com": 87,
        "nytimes.com": 83,
        "washingtonpost.com": 82,
        "bbc.com": 84,
        "bbc.co.uk": 84,
        "economist.com": 86,
        "apnews.com": 88,
        "afp.com": 87,
        
        # Tier 3: Tech/Industry Publications
        "techcrunch.com": 72,
        "wired.com": 73,
        "theverge.com": 70,
        "arstechnica.com": 75,
        "technologyreview.com": 78,
        "hbr.org": 80,
        "mckinsey.com": 78,
        "bcg.com": 78,
        "bain.com": 78,
        "deloitte.com": 76,
        "pwc.com": 76,
        "gartner.com": 77,
        "forrester.com": 76,
        "statista.com": 75,
        
        # Tier 4: General News/Reference
        "wikipedia.org": 60,
        "cnn.com": 68,
        "forbes.com": 65,
        "businessinsider.com": 63,
        "cnbc.com": 70,
        "investopedia.com": 68,
        "crunchbase.com": 70,
        "pitchbook.com": 72,
        
        # Tier 5: Blogs/UGC
        "medium.com": 40,
        "substack.com": 50,
        "linkedin.com": 45,
        "hackernews.com": 45,
        "dev.to": 45,
        
        # Tier 6: Forums/Social
        "reddit.com": 25,
        "quora.com": 30,
        "twitter.com": 20,
        "x.com": 20,
        "facebook.com": 15,
    }
    
    # TLD-based scores (fallback for unknown domains)
    TLD_SCORES = {
        ".gov": 95,
        ".gov.uk": 93,
        ".gov.au": 93,
        ".edu": 90,
        ".edu.au": 88,
        ".ac.uk": 88,
        ".org": 60,
        ".int": 85,
    }
    
    # Score modifiers
    MODIFIERS = {
        "has_citations": 10,      # Source cites primary sources
        "is_recent": 5,           # Published within last 12 months
        "is_primary": 15,         # This IS the primary source
        "peer_reviewed": 12,      # Academic peer-reviewed content
        "conflict_of_interest": -20,  # Author has obvious bias
        "contradicts_consensus": -15,  # Contradicts multiple higher-tier sources
        "unverified_claims": -10,     # Makes claims without evidence
    }

    @staticmethod
    def get_domain(url: str) -> str:
        """Extract the domain from a URL."""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            return domain.replace("www.", "")
        except Exception:
            return ""

    @classmethod
    def score_url(cls, url: str) -> float:
        """
        Calculate base reliability score for a URL based on its domain.
        
        Args:
            url: The URL to score
            
        Returns:
            Float score between 0 and 100
        """
        domain = cls.get_domain(url)
        if not domain:
            return 30.0  # Default low score for invalid/unknown
        
        # Check exact domain matches
        if domain in cls.DOMAIN_SCORES:
            return float(cls.DOMAIN_SCORES[domain])
        
        # Check if it's a subdomain of a known domain
        for known_domain, score in cls.DOMAIN_SCORES.items():
            if domain.endswith(f".{known_domain}") or domain.endswith(known_domain):
                return float(score)
        
        # Check TLDs
        for tld, score in cls.TLD_SCORES.items():
            if domain.endswith(tld):
                return float(score)
        
        # Default for unknown domains
        return 50.0
    
    @classmethod
    def score_with_modifiers(
        cls,
        url: str,
        has_citations: bool = False,
        is_recent: bool = False,
        is_primary: bool = False,
        peer_reviewed: bool = False,
        conflict_of_interest: bool = False,
        contradicts_consensus: bool = False,
        unverified_claims: bool = False
    ) -> float:
        """
        Calculate reliability score with modifiers.
        
        Args:
            url: The URL to score
            has_citations: Whether the source cites primary sources
            is_recent: Whether published within last 12 months
            is_primary: Whether this is the primary/original source
            peer_reviewed: Whether content is peer-reviewed
            conflict_of_interest: Whether author has obvious bias
            contradicts_consensus: Whether it contradicts higher-tier sources
            unverified_claims: Whether it makes unverified claims
            
        Returns:
            Float score between 0 and 100 (clamped)
        """
        base_score = cls.score_url(url)
        
        # Apply modifiers
        if has_citations:
            base_score += cls.MODIFIERS["has_citations"]
        if is_recent:
            base_score += cls.MODIFIERS["is_recent"]
        if is_primary:
            base_score += cls.MODIFIERS["is_primary"]
        if peer_reviewed:
            base_score += cls.MODIFIERS["peer_reviewed"]
        if conflict_of_interest:
            base_score += cls.MODIFIERS["conflict_of_interest"]
        if contradicts_consensus:
            base_score += cls.MODIFIERS["contradicts_consensus"]
        if unverified_claims:
            base_score += cls.MODIFIERS["unverified_claims"]
        
        # Clamp to valid range
        return max(0.0, min(100.0, base_score))
    
    @classmethod
    def get_tier(cls, score: float) -> Dict[str, Any]:
        """
        Get the tier information for a given score.
        
        Args:
            score: The reliability score
            
        Returns:
            Dict with tier number, name, and description
        """
        if score >= 90:
            return {"tier": 1, "name": "Primary/Official", "color": "green"}
        elif score >= 80:
            return {"tier": 2, "name": "Established Media", "color": "blue"}
        elif score >= 65:
            return {"tier": 3, "name": "Industry Publication", "color": "cyan"}
        elif score >= 50:
            return {"tier": 4, "name": "General News", "color": "yellow"}
        elif score >= 20:
            return {"tier": 5, "name": "Blog/UGC", "color": "orange"}
        else:
            return {"tier": 6, "name": "Forum/Social", "color": "red"}
    
    @classmethod
    def explain_score(cls, url: str, score: float) -> str:
        """
        Generate a human-readable explanation of the score.
        
        Args:
            url: The URL that was scored
            score: The assigned score
            
        Returns:
            Explanation string
        """
        domain = cls.get_domain(url)
        tier = cls.get_tier(score)
        
        return (
            f"Domain '{domain}' scored {score:.0f}/100 "
            f"(Tier {tier['tier']}: {tier['name']})"
        )
