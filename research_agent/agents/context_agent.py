from typing import List
from .base_agent import BaseAgent
from ..schemas.claim import Claim
from ..schemas.evidence import Evidence

class ContextAgent(BaseAgent):
    async def process_claim(self, claim: Claim) -> List[Evidence]:
        """
        Searches for background context/definitions.
        """
        # Context agent might generate its own queries or use a subset
        # For now, let's assume it uses the claim text to find general info
        evidence_list = []
        query = f"background info {claim.text}"
        
        results = self.exa_client.search(query, num_results=2)
        for res in results:
            # Context is neutral, but we need to fit the schema. 
            # We'll mark as 'supports' for now but with low confidence on polarity if needed.
            # Or maybe we need a 'neutral' flag in Evidence? 
            # The schema says 'supports_claim: bool'. 
            # Let's assume context supports the existence of the topic.
            evidence = self._evidence_from_result(res, claim, supports=True) 
            evidence.explanation = "Contextual information."
            evidence_list.append(evidence)
                
        return evidence_list
