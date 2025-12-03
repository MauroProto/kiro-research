from pydantic import BaseModel, Field
from typing import Optional

class Evidence(BaseModel):
    url: str
    title: Optional[str] = None
    content: str = Field(..., description="Relevant content extract")
    source_reliability_score: float = Field(..., ge=0, le=100, description="Reliability score of the source (0-100)")
    supports_claim: bool = Field(..., description="Whether this evidence supports the claim")
    confidence_score: float = Field(..., ge=0, le=100, description="Confidence in this specific piece of evidence")
    explanation: str = Field(..., description="Reasoning for the scores and classification")
