from pydantic import BaseModel, Field
from typing import List

class Claim(BaseModel):
    id: str = Field(..., description="Unique identifier for the claim")
    text: str = Field(..., description="The atomic claim statement")
    evidence_needed: str = Field(..., description="Description of evidence needed to validate this claim")
    refutation_would_be: str = Field(..., description="Description of what would refute this claim")
    search_queries_pro: List[str] = Field(default_factory=list, description="Search queries to find supporting evidence")
    search_queries_contra: List[str] = Field(default_factory=list, description="Search queries to find refuting evidence")
