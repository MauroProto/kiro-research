"""
State definition for the research workflow.
"""

from typing import List, Optional, Annotated
from typing_extensions import TypedDict
from operator import add

from ..schemas.hypothesis import Hypothesis
from ..schemas.claim import Claim
from ..schemas.evidence import Evidence
from ..schemas.finding import Finding
from ..schemas.report import Report


class ResearchState(TypedDict, total=False):
    """
    State object that flows through the research workflow.
    
    Attributes:
        hypothesis: The hypothesis being validated
        claims: Atomic claims decomposed from the hypothesis
        evidence: Raw evidence collected from searches
        findings: Evaluated findings per claim
        report: Final synthesized report
        iterations: Number of research iterations completed
    """
    hypothesis: Hypothesis
    claims: List[Claim]
    evidence: List[Evidence]
    findings: List[Finding]
    report: Optional[Report]
    iterations: int


def get_initial_state(hypothesis: Hypothesis) -> ResearchState:
    """
    Create an initial state for a research workflow.
    
    Args:
        hypothesis: The hypothesis to research
        
    Returns:
        Initialized ResearchState
    """
    return ResearchState(
        hypothesis=hypothesis,
        claims=[],
        evidence=[],
        findings=[],
        report=None,
        iterations=0
    )
