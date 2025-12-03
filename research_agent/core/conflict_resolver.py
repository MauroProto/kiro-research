"""
Conflict resolution for contradicting evidence.
"""

from typing import List, Dict, Any, Optional
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from ..schemas.claim import Claim
from ..schemas.evidence import Evidence
from .llm import get_llm


class ConflictAnalysis(BaseModel):
    """Analysis of conflicts in evidence."""
    has_conflicts: bool = Field(..., description="Whether conflicts were detected")
    conflict_description: Optional[str] = Field(None, description="Description of the conflicts")
    resolution: str = Field(..., description="Resolution statement")
    winning_position: Optional[str] = Field(None, description="Which position has stronger evidence")
    confidence_in_resolution: float = Field(..., ge=0, le=100, description="Confidence in the resolution")


class ConflictResolver:
    """
    Identifies and resolves conflicts between pieces of evidence.
    
    Uses LLM to analyze contradictions and determine which sources
    are more reliable based on their scores and content.
    """
    
    def __init__(self):
        self.llm = get_llm()
        
    async def resolve(self, claim: Claim, evidence_list: List[Evidence]) -> str:
        """
        Identifies and resolves conflicts in evidence using LLM.
        
        Args:
            claim: The claim being evaluated
            evidence_list: List of evidence pieces to analyze
            
        Returns:
            Resolution statement describing the analysis
        """
        if not evidence_list:
            return "No evidence to analyze."
        
        # Check if there are actual conflicts (mix of supporting and refuting)
        supporting = [e for e in evidence_list if e.supports_claim]
        refuting = [e for e in evidence_list if not e.supports_claim]
        
        if not supporting or not refuting:
            # No conflict - all evidence points one direction
            direction = "supporting" if supporting else "refuting"
            count = len(supporting) if supporting else len(refuting)
            avg_score = sum(e.source_reliability_score for e in evidence_list) / len(evidence_list)
            return (
                f"No significant conflicts detected. {count} sources {direction} the claim "
                f"with average reliability score of {avg_score:.1f}."
            )
        
        # Format evidence for prompt
        evidence_text = self._format_evidence(evidence_list)
        
        prompt = ChatPromptTemplate.from_template(
            """
            Analyze the following evidence for the claim: "{claim_text}"
            
            EVIDENCE:
            {evidence_text}
            
            The evidence contains both supporting and refuting sources. Analyze:
            
            1. What are the specific contradictions?
            2. Which sources are more reliable and why? (Consider their reliability scores)
            3. Could the contradiction be explained by different definitions, timeframes, or scopes?
            4. What is the most likely truth based on the evidence?
            
            Provide a clear, balanced resolution statement that:
            - Acknowledges both sides
            - Explains why one position is stronger (if applicable)
            - Notes any caveats or uncertainties
            
            Keep the response concise (2-4 sentences).
            """
        )
        
        chain = prompt | self.llm
        
        try:
            result = await chain.ainvoke({
                "claim_text": claim.text,
                "evidence_text": evidence_text
            })
            return result.content
        except Exception as e:
            # Fallback to rule-based resolution
            return self._rule_based_resolution(claim, supporting, refuting)
    
    async def detailed_analysis(
        self, 
        claim: Claim, 
        evidence_list: List[Evidence]
    ) -> ConflictAnalysis:
        """
        Performs detailed conflict analysis with structured output.
        
        Args:
            claim: The claim being evaluated
            evidence_list: List of evidence pieces to analyze
            
        Returns:
            Structured ConflictAnalysis object
        """
        from langchain_core.output_parsers import PydanticOutputParser
        
        if not evidence_list:
            return ConflictAnalysis(
                has_conflicts=False,
                resolution="No evidence to analyze.",
                confidence_in_resolution=0.0
            )
        
        supporting = [e for e in evidence_list if e.supports_claim]
        refuting = [e for e in evidence_list if not e.supports_claim]
        
        if not supporting or not refuting:
            direction = "support" if supporting else "refute"
            return ConflictAnalysis(
                has_conflicts=False,
                resolution=f"All evidence appears to {direction} the claim.",
                winning_position=direction,
                confidence_in_resolution=min(80.0, len(evidence_list) * 20)
            )
        
        parser = PydanticOutputParser(pydantic_object=ConflictAnalysis)
        evidence_text = self._format_evidence(evidence_list)
        
        prompt = ChatPromptTemplate.from_template(
            """
            Analyze conflicts in the following evidence for: "{claim_text}"
            
            EVIDENCE:
            {evidence_text}
            
            Perform a detailed conflict analysis.
            
            {format_instructions}
            """
        )
        
        chain = prompt | self.llm | parser
        
        try:
            return await chain.ainvoke({
                "claim_text": claim.text,
                "evidence_text": evidence_text,
                "format_instructions": parser.get_format_instructions()
            })
        except Exception as e:
            # Fallback
            return ConflictAnalysis(
                has_conflicts=True,
                conflict_description=f"Error analyzing conflicts: {str(e)}",
                resolution=self._rule_based_resolution(claim, supporting, refuting),
                confidence_in_resolution=30.0
            )
    
    def _format_evidence(self, evidence_list: List[Evidence]) -> str:
        """Format evidence list for prompt."""
        formatted = []
        for i, e in enumerate(evidence_list, 1):
            position = "SUPPORTS" if e.supports_claim else "REFUTES"
            formatted.append(
                f"{i}. [{position}] Source: {e.url}\n"
                f"   Reliability Score: {e.source_reliability_score:.0f}/100\n"
                f"   Content: {e.content[:300]}..."
            )
        return "\n\n".join(formatted)
    
    def _rule_based_resolution(
        self, 
        claim: Claim,
        supporting: List[Evidence], 
        refuting: List[Evidence]
    ) -> str:
        """
        Fallback rule-based conflict resolution.
        Uses reliability scores to determine the stronger position.
        """
        # Calculate weighted scores
        support_score = sum(e.source_reliability_score for e in supporting)
        refute_score = sum(e.source_reliability_score for e in refuting)
        
        # Weighted by number of sources
        support_avg = support_score / len(supporting) if supporting else 0
        refute_avg = refute_score / len(refuting) if refuting else 0
        
        if support_avg > refute_avg + 10:
            return (
                f"Conflict detected between {len(supporting)} supporting and "
                f"{len(refuting)} refuting sources. Supporting sources have higher "
                f"average reliability ({support_avg:.0f} vs {refute_avg:.0f}), "
                f"suggesting the claim is likely valid."
            )
        elif refute_avg > support_avg + 10:
            return (
                f"Conflict detected between {len(supporting)} supporting and "
                f"{len(refuting)} refuting sources. Refuting sources have higher "
                f"average reliability ({refute_avg:.0f} vs {support_avg:.0f}), "
                f"suggesting the claim may be invalid."
            )
        else:
            return (
                f"Significant conflict detected with {len(supporting)} supporting "
                f"and {len(refuting)} refuting sources of similar reliability. "
                f"Additional research may be needed to resolve this uncertainty."
            )
