from typing import List, Dict, Any, Optional
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

from ..schemas.hypothesis import Hypothesis
from ..schemas.claim import Claim
from ..schemas.report import Report
from .clarifier import Clarifier, ClarificationResult
from .decomposer import Decomposer
from .synthesizer import Synthesizer
from .llm import get_llm


class ResearchPlan(BaseModel):
    """Plan for researching a hypothesis."""
    research_branches: List[Dict[str, str]] = Field(
        ..., 
        description="List of research branches with 'topic' and 'agent_type' keys"
    )
    priority_order: List[int] = Field(
        ..., 
        description="Order in which to tackle research branches"
    )
    estimated_complexity: str = Field(
        ..., 
        description="LOW, MEDIUM, or HIGH complexity estimate"
    )
    key_entities: List[str] = Field(
        default_factory=list,
        description="Key entities to track in knowledge graph"
    )
    suggested_sources: List[str] = Field(
        default_factory=list,
        description="Suggested source types for this research"
    )


class Director:
    """
    Orchestrates the research process.
    Acts as the strategic planner that doesn't resolve everything,
    but generates a Research Requirements Document (RRD).
    """
    
    def __init__(self):
        self.clarifier = Clarifier()
        self.decomposer = Decomposer()
        self.synthesizer = Synthesizer()
        self.llm = get_llm()
        
    async def analyze_hypothesis(self, hypothesis: Hypothesis) -> ClarificationResult:
        """
        First step: Analyze if the hypothesis needs clarification.
        """
        return await self.clarifier.clarify(hypothesis)
    
    async def create_research_plan(self, hypothesis: Hypothesis) -> ResearchPlan:
        """
        Creates a strategic research plan for the hypothesis.
        """
        parser = PydanticOutputParser(pydantic_object=ResearchPlan)
        
        prompt = ChatPromptTemplate.from_template(
            """
            You are a Research Director. Create a strategic research plan for the following hypothesis.
            
            HYPOTHESIS: {hypothesis_text}
            CONTEXT: {context}
            
            Consider:
            1. What are the main research branches needed?
            2. What type of agent/expertise is needed for each branch?
            3. What is the complexity level?
            4. What key entities should we track?
            5. What source types would be most valuable?
            
            {format_instructions}
            """
        )
        
        chain = prompt | self.llm | parser
        
        try:
            return await chain.ainvoke({
                "hypothesis_text": hypothesis.text,
                "context": hypothesis.context or "",
                "format_instructions": parser.get_format_instructions()
            })
        except Exception as e:
            print(f"Error creating research plan: {e}")
            # Return a default simple plan
            return ResearchPlan(
                research_branches=[
                    {"topic": hypothesis.text, "agent_type": "general"}
                ],
                priority_order=[0],
                estimated_complexity="MEDIUM",
                key_entities=[],
                suggested_sources=["news", "academic", "government"]
            )
    
    async def decompose_to_claims(self, hypothesis: Hypothesis) -> List[Claim]:
        """
        Decomposes the hypothesis into atomic, verifiable claims.
        """
        return await self.decomposer.decompose(hypothesis)
    
    async def generate_report(self, hypothesis: Hypothesis, findings: List) -> Report:
        """
        Generates the final research report.
        """
        return await self.synthesizer.synthesize_report(hypothesis, findings)
    
    async def evaluate_confidence(self, findings: List) -> Dict[str, Any]:
        """
        Evaluates overall confidence and determines if more research is needed.
        """
        if not findings:
            return {
                "overall_confidence": 0.0,
                "needs_more_research": True,
                "weak_claims": [],
                "strong_claims": []
            }
        
        total_confidence = sum(f.confidence_score for f in findings)
        avg_confidence = total_confidence / len(findings)
        
        weak_claims = [f.claim.text for f in findings if f.confidence_score < 50]
        strong_claims = [f.claim.text for f in findings if f.confidence_score >= 70]
        
        return {
            "overall_confidence": avg_confidence,
            "needs_more_research": avg_confidence < 60,
            "weak_claims": weak_claims,
            "strong_claims": strong_claims
        }
    
    async def suggest_follow_up_queries(self, findings: List) -> List[str]:
        """
        Suggests follow-up queries for claims with low confidence.
        """
        weak_findings = [f for f in findings if f.confidence_score < 50]
        
        if not weak_findings:
            return []
        
        prompt = ChatPromptTemplate.from_template(
            """
            The following claims have low confidence scores and need more research:
            
            {claims}
            
            Suggest 3-5 specific search queries that could help find better evidence.
            Return just the queries, one per line.
            """
        )
        
        claims_text = "\n".join([
            f"- {f.claim.text} (confidence: {f.confidence_score:.1f}%)"
            for f in weak_findings
        ])
        
        chain = prompt | self.llm
        
        try:
            result = await chain.ainvoke({"claims": claims_text})
            queries = [q.strip() for q in result.content.split("\n") if q.strip()]
            return queries[:5]
        except Exception as e:
            print(f"Error generating follow-up queries: {e}")
            return []
