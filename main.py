"""
Research Agent - Main Entry Point

A professional hypothesis validation system that:
- Searches for evidence FOR and AGAINST claims
- Evaluates source reliability
- Resolves conflicts between sources
- Generates confidence-based reports
"""

import asyncio
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def check_environment():
    """Check that required environment variables are set."""
    required_vars = ["OPENAI_API_KEY", "EXA_API_KEY"]
    missing = [var for var in required_vars if not os.getenv(var)]
    
    if missing:
        print("❌ Missing required environment variables:")
        for var in missing:
            print(f"   - {var}")
        print("\n   Please set them in your .env file or environment.")
        print("   See .env.example for reference.")
        sys.exit(1)


async def run_research(hypothesis_text: str, context: str = None):
    """
    Run the research agent on a given hypothesis.
    
    Args:
        hypothesis_text: The hypothesis to validate
        context: Optional additional context
    
    Returns:
        The research report
    """
    from research_agent.graph.workflow import app
    from research_agent.schemas.hypothesis import Hypothesis
    
    hypothesis = Hypothesis(text=hypothesis_text, context=context)
    
    print("=" * 70)
    print("🔬 RESEARCH AGENT - Hypothesis Validation System")
    print("=" * 70)
    print(f"\n📋 Hypothesis: {hypothesis_text}")
    if context:
        print(f"📝 Context: {context}")
    print("\n" + "-" * 70)
    
    initial_state = {
        "hypothesis": hypothesis,
        "claims": [],
        "evidence": [],
        "findings": [],
        "report": None,
        "iterations": 0
    }
    
    try:
        result = await app.ainvoke(initial_state)
        report = result.get("report")
        
        if report:
            print_report(report)
            return report
        else:
            print("\n❌ No report generated.")
            return None
            
    except Exception as e:
        print(f"\n❌ Error running research: {e}")
        raise


def print_report(report):
    """Pretty print the research report."""
    print("\n" + "=" * 70)
    print("📊 RESEARCH REPORT")
    print("=" * 70)
    
    # Verdict with emoji
    verdict_emoji = {
        "VALID": "✅",
        "PARTIALLY_VALID": "⚠️",
        "INCONCLUSIVE": "❓",
        "REFUTED": "❌",
        "ERROR": "💥"
    }
    emoji = verdict_emoji.get(report.verdict, "📋")
    
    print(f"\n{emoji} VERDICT: {report.verdict}")
    print(f"📈 CONFIDENCE: {report.confidence_score:.1f}%")
    
    print(f"\n📝 EXECUTIVE SUMMARY:")
    print(f"   {report.executive_summary}")
    
    if report.findings:
        print(f"\n📋 FINDINGS BY CLAIM:")
        print("-" * 50)
        for i, finding in enumerate(report.findings, 1):
            finding_emoji = verdict_emoji.get(finding.verdict, "📋")
            print(f"\n   {i}. {finding.claim.text[:60]}...")
            print(f"      {finding_emoji} {finding.verdict} ({finding.confidence_score:.1f}%)")
            print(f"      📄 Evidence pieces: {len(finding.evidence)}")
            if finding.summary:
                summary = finding.summary[:100] + "..." if len(finding.summary) > 100 else finding.summary
                print(f"      💬 {summary}")
    
    if report.missing_information:
        print(f"\n⚠️ MISSING INFORMATION:")
        for info in report.missing_information:
            print(f"   • {info}")
    
    if report.sources:
        print(f"\n📚 SOURCES CONSULTED ({len(report.sources)}):")
        for source in report.sources[:5]:  # Show top 5
            url = source.get("url", "N/A")
            score = source.get("score", "N/A")
            print(f"   • {url[:50]}... (Score: {score})")
        if len(report.sources) > 5:
            print(f"   ... and {len(report.sources) - 5} more sources")
    
    print("\n" + "=" * 70)


async def interactive_mode():
    """Run the agent in interactive mode."""
    print("\n🔬 Research Agent - Interactive Mode")
    print("Type 'quit' or 'exit' to stop.\n")
    
    while True:
        try:
            hypothesis = input("Enter hypothesis to research: ").strip()
            
            if hypothesis.lower() in ['quit', 'exit', 'q']:
                print("👋 Goodbye!")
                break
            
            if not hypothesis:
                print("⚠️ Please enter a hypothesis.\n")
                continue
            
            context = input("Additional context (optional, press Enter to skip): ").strip()
            context = context if context else None
            
            await run_research(hypothesis, context)
            print("\n")
            
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {e}\n")


async def main():
    """Main entry point."""
    check_environment()
    
    # Check if running with command line arguments
    if len(sys.argv) > 1:
        hypothesis_text = " ".join(sys.argv[1:])
        await run_research(hypothesis_text)
    else:
        # Default example hypothesis
        hypothesis_text = (
            "The global market for electric vertical takeoff and landing (eVTOL) "
            "aircraft will exceed $10 billion by 2030."
        )
        
        print("No hypothesis provided. Running with example...")
        await run_research(hypothesis_text)


if __name__ == "__main__":
    asyncio.run(main())
