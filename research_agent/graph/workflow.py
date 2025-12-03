from langgraph.graph import StateGraph, END
from typing import Literal
import asyncio

from .state import ResearchState
from ..core.clarifier import Clarifier
from ..core.decomposer import Decomposer
from ..core.critic import Critic
from ..core.conflict_resolver import ConflictResolver
from ..core.synthesizer import Synthesizer
from ..agents.pro_agent import ProAgent
from ..agents.contra_agent import ContraAgent
from ..agents.context_agent import ContextAgent
from ..tools.exa_client import ExaClient
from ..memory.vector_store import VectorStore
from ..memory.url_cache import URLCache
from ..schemas.finding import Finding
from ..schemas.hypothesis import Hypothesis

# Configuration
MAX_ITERATIONS = 3
MIN_CONFIDENCE_THRESHOLD = 60.0

# Initialize components
clarifier = Clarifier()
decomposer = Decomposer()
critic = Critic()
conflict_resolver = ConflictResolver()
synthesizer = Synthesizer()

# Initialize tools and memory (lazy initialization for flexibility)
_exa_client = None
_vector_store = None
_url_cache = None

def get_exa_client():
    global _exa_client
    if _exa_client is None:
        _exa_client = ExaClient()
    return _exa_client

def get_vector_store():
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStore()
    return _vector_store

def get_url_cache():
    global _url_cache
    if _url_cache is None:
        _url_cache = URLCache()
    return _url_cache

# Initialize agents
def get_pro_agent():
    return ProAgent(get_exa_client(), get_vector_store(), get_url_cache())

def get_contra_agent():
    return ContraAgent(get_exa_client(), get_vector_store(), get_url_cache())

def get_context_agent():
    return ContextAgent(get_exa_client(), get_vector_store(), get_url_cache())


# ============================================================
# NODE DEFINITIONS
# ============================================================

async def clarify_node(state: ResearchState) -> dict:
    """
    Node 1: Clarifies the hypothesis if ambiguous.
    """
    hypothesis = state["hypothesis"]
    
    result = await clarifier.clarify(hypothesis)
    
    if result.is_ambiguous and result.clarification_question:
        # In a real system, we'd pause and ask the user
        # For now, we'll log and continue with the original hypothesis
        print(f"⚠️ Hypothesis may be ambiguous: {result.clarification_question}")
        print("   Continuing with original hypothesis...")
    
    # If there's a refined hypothesis, use it
    if result.refined_hypothesis:
        updated_hypothesis = Hypothesis(
            text=result.refined_hypothesis,
            context=hypothesis.context
        )
        return {"hypothesis": updated_hypothesis}
    
    return {}


async def decompose_node(state: ResearchState) -> dict:
    """
    Node 2: Decomposes hypothesis into atomic claims.
    """
    hypothesis = state["hypothesis"]
    
    print(f"📋 Decomposing hypothesis into claims...")
    claims = await decomposer.decompose(hypothesis)
    
    if not claims:
        print("⚠️ No claims generated. Creating a default claim from hypothesis.")
        from ..schemas.claim import Claim
        claims = [Claim(
            id="claim_1",
            text=hypothesis.text,
            evidence_needed="Evidence supporting or refuting this statement",
            refutation_would_be="Evidence contradicting this statement",
            search_queries_pro=[hypothesis.text],
            search_queries_contra=[f"criticism {hypothesis.text}", f"problems with {hypothesis.text}"]
        )]
    
    print(f"   Generated {len(claims)} claims")
    for i, claim in enumerate(claims):
        print(f"   {i+1}. {claim.text[:80]}...")
    
    return {"claims": claims}


async def research_node(state: ResearchState) -> dict:
    """
    Node 3: Runs parallel adversarial search for each claim.
    """
    claims = state["claims"]
    findings = []
    
    pro_agent = get_pro_agent()
    contra_agent = get_contra_agent()
    context_agent = get_context_agent()
    
    print(f"\n🔍 Researching {len(claims)} claims...")
    
    for i, claim in enumerate(claims):
        print(f"\n   📌 Claim {i+1}: {claim.text[:60]}...")
        
        # Run agents in parallel for this claim
        try:
            pro_task = asyncio.create_task(pro_agent.process_claim(claim))
            contra_task = asyncio.create_task(contra_agent.process_claim(claim))
            context_task = asyncio.create_task(context_agent.process_claim(claim))
            
            pro_evidence, contra_evidence, context_evidence = await asyncio.gather(
                pro_task, contra_task, context_task, 
                return_exceptions=True
            )
            
            # Handle exceptions
            if isinstance(pro_evidence, Exception):
                print(f"      ⚠️ Pro agent error: {pro_evidence}")
                pro_evidence = []
            if isinstance(contra_evidence, Exception):
                print(f"      ⚠️ Contra agent error: {contra_evidence}")
                contra_evidence = []
            if isinstance(context_evidence, Exception):
                print(f"      ⚠️ Context agent error: {context_evidence}")
                context_evidence = []
            
            raw_evidence = pro_evidence + contra_evidence + context_evidence
            print(f"      Found {len(raw_evidence)} pieces of evidence")
            
        except Exception as e:
            print(f"      ❌ Error in parallel search: {e}")
            raw_evidence = []
        
        # Evaluate each piece of evidence with the Critic
        evaluated_evidence = []
        for ev in raw_evidence:
            try:
                evaluated_ev = await critic.evaluate_evidence(claim, ev)
                evaluated_evidence.append(evaluated_ev)
            except Exception as e:
                print(f"      ⚠️ Error evaluating evidence: {e}")
                evaluated_evidence.append(ev)  # Keep original if evaluation fails
        
        # Resolve conflicts in evidence
        try:
            resolution = await conflict_resolver.resolve(claim, evaluated_evidence)
        except Exception as e:
            print(f"      ⚠️ Error resolving conflicts: {e}")
            resolution = "Could not resolve conflicts."
        
        # Calculate confidence based on evidence
        if evaluated_evidence:
            avg_confidence = sum(e.confidence_score for e in evaluated_evidence) / len(evaluated_evidence)
            supporting = sum(1 for e in evaluated_evidence if e.supports_claim)
            total = len(evaluated_evidence)
            support_ratio = supporting / total if total > 0 else 0.5
            
            # Determine verdict based on support ratio
            if support_ratio >= 0.7:
                verdict = "VALID"
            elif support_ratio >= 0.4:
                verdict = "PARTIALLY_VALID"
            elif support_ratio >= 0.2:
                verdict = "INCONCLUSIVE"
            else:
                verdict = "REFUTED"
        else:
            avg_confidence = 0.0
            verdict = "INCONCLUSIVE"
        
        finding = Finding(
            claim=claim,
            evidence=evaluated_evidence,
            verdict=verdict,
            confidence_score=avg_confidence,
            summary=resolution
        )
        findings.append(finding)
        
        print(f"      Verdict: {verdict} ({avg_confidence:.1f}% confidence)")
    
    return {"findings": findings}


async def synthesize_node(state: ResearchState) -> dict:
    """
    Node 4: Synthesizes findings into final report.
    """
    hypothesis = state["hypothesis"]
    findings = state["findings"]
    
    print(f"\n📝 Synthesizing report...")
    
    try:
        report = await synthesizer.synthesize_report(hypothesis, findings)
        print(f"   Verdict: {report.verdict}")
        print(f"   Confidence: {report.confidence_score:.1f}%")
    except Exception as e:
        print(f"   ❌ Error synthesizing: {e}")
        from ..schemas.report import Report
        report = Report(
            hypothesis=hypothesis.text,
            verdict="ERROR",
            confidence_score=0.0,
            executive_summary=f"Error generating report: {str(e)}",
            findings=findings,
            missing_information=["Report generation failed"],
            sources=[]
        )
    
    # Increment iteration count
    iterations = state.get("iterations", 0) + 1
    
    return {"report": report, "iterations": iterations}


def should_continue(state: ResearchState) -> Literal["research", "end"]:
    """
    Decision node: Determines if we need more research iterations.
    """
    report = state.get("report")
    iterations = state.get("iterations", 0)
    
    if report is None:
        return "end"
    
    # Check if we should do another iteration
    if report.confidence_score < MIN_CONFIDENCE_THRESHOLD and iterations < MAX_ITERATIONS:
        print(f"\n🔄 Confidence ({report.confidence_score:.1f}%) below threshold ({MIN_CONFIDENCE_THRESHOLD}%).")
        print(f"   Starting iteration {iterations + 1}/{MAX_ITERATIONS}...")
        return "research"
    
    return "end"


# ============================================================
# BUILD THE GRAPH
# ============================================================

def build_workflow() -> StateGraph:
    """
    Builds and returns the compiled workflow graph.
    """
    workflow = StateGraph(ResearchState)
    
    # Add nodes
    workflow.add_node("clarify", clarify_node)
    workflow.add_node("decompose", decompose_node)
    workflow.add_node("research", research_node)
    workflow.add_node("synthesize", synthesize_node)
    
    # Define edges (flow)
    workflow.set_entry_point("clarify")
    workflow.add_edge("clarify", "decompose")
    workflow.add_edge("decompose", "research")
    workflow.add_edge("research", "synthesize")
    
    # Conditional edge for iteration loop
    workflow.add_conditional_edges(
        "synthesize",
        should_continue,
        {
            "research": "research",
            "end": END
        }
    )
    
    return workflow.compile()


# Create the compiled app
app = build_workflow()
