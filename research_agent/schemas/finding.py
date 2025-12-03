from pydantic import BaseModel, Field
from typing import List
from .claim import Claim
from .evidence import Evidence

class Finding(BaseModel):
    claim: Claim
    evidence: List[Evidence] = Field(default_factory=list)
    verdict: str = Field(..., description="VALID / PARTIALLY_VALID / REFUTED / INCONCLUSIVE")
    confidence_score: float = Field(..., ge=0, le=100)
    summary: str = Field(..., description="Summary of findings for this claim")
