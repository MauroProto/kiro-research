from typing import List
from .base_agent import BaseAgent
from ..schemas.claim import Claim
from ..schemas.evidence import Evidence

class ContraAgent(BaseAgent):
    async def process_claim(self, claim: Claim) -> List[Evidence]:
        """
        Searches for evidence that refutes the claim.
        """
        evidence_list = []
        queries = claim.search_queries_contra
        
        for query in queries:
            results = self.exa_client.search(query, num_results=3)
            for res in results:
                evidence = self._evidence_from_result(res, claim, supports=False)
                evidence_list.append(evidence)
                
        return evidence_list
