from pydantic import BaseModel, Field
from typing import List, Dict
from .finding import Finding

class Report(BaseModel):
    hypothesis: str
    verdict: str = Field(..., description="Overall verdict")
    confidence_score: float
    executive_summary: str
    findings: List[Finding]
    missing_information: List[str]
    sources: List[Dict[str, str]] = Field(..., description="List of sources with URL and score")
