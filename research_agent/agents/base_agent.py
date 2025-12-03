from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from ..tools.exa_client import ExaClient
from ..schemas.claim import Claim
from ..schemas.evidence import Evidence
from ..tools.source_scorer import SourceScorer
from ..memory.vector_store import VectorStore
from ..memory.url_cache import URLCache

class BaseAgent(ABC):
    def __init__(self, exa_client: ExaClient, vector_store: Optional[VectorStore] = None, url_cache: Optional[URLCache] = None):
        self.exa_client = exa_client
        self.scorer = SourceScorer()
        self.vector_store = vector_store
        self.url_cache = url_cache

    @abstractmethod
    async def process_claim(self, claim: Claim) -> List[Evidence]:
        """
        Process a claim and return a list of evidence.
        """
        pass

    def _evidence_from_result(self, result: Dict[str, Any], claim: Claim, supports: bool) -> Evidence:
        """
        Helper to convert search result to Evidence object.
        """
        score = self.scorer.score_url(result['url'])
        
        # Simple confidence heuristic based on source score and relevance (if available)
        confidence = score
        
        evidence = Evidence(
            url=result['url'],
            title=result.get('title'),
            content=result.get('text', '')[:1000], # Truncate for now
            source_reliability_score=score,
            supports_claim=supports,
            confidence_score=confidence,
            explanation=f"Source score: {score}. Found via search."
        )

        # Save to memory if available
        if self.vector_store:
            self._save_to_memory(evidence, claim)
            
        return evidence

    def _save_to_memory(self, evidence: Evidence, claim: Claim):
        try:
            # Save to URL Cache
            if self.url_cache:
                self.url_cache.set(evidence.url, evidence.content)

            # Create a unique ID for the evidence
            import hashlib
            evidence_id = hashlib.md5(evidence.content.encode()).hexdigest()
            
            self.vector_store.add_documents(
                documents=[evidence.content],
                metadatas=[{
                    "url": evidence.url,
                    "claim_id": claim.id,
                    "supports": evidence.supports_claim,
                    "score": evidence.source_reliability_score
                }],
                ids=[evidence_id]
            )
        except Exception as e:
            print(f"Error saving to memory: {e}")
