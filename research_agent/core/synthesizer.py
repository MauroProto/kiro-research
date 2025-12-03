from typing import List
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from ..schemas.hypothesis import Hypothesis
from ..schemas.finding import Finding
from ..schemas.report import Report
from .llm import get_llm

class Synthesizer:
    def __init__(self):
        self.llm = get_llm()
        
    async def synthesize_report(self, hypothesis: Hypothesis, findings: List[Finding]) -> Report:
        """
        Synthesizes findings into a final report.
        """
        parser = PydanticOutputParser(pydantic_object=Report)
        
        # Convert findings to text for prompt
        findings_text = "\n\n".join([f"Claim: {f.claim.text}\nVerdict: {f.verdict}\nSummary: {f.summary}" for f in findings])
        
        prompt = ChatPromptTemplate.from_template(
            """
            Synthesize the following research findings into a final report for the hypothesis.
            
            HYPOTHESIS: {hypothesis_text}
            
            FINDINGS:
            {findings_text}
            
            Generate a comprehensive report with an overall verdict, confidence score, and executive summary.
            
            {format_instructions}
            """
        )
        
        chain = prompt | self.llm | parser
        
        try:
            return await chain.ainvoke({
                "hypothesis_text": hypothesis.text,
                "findings_text": findings_text,
                "format_instructions": parser.get_format_instructions()
            })
        except Exception as e:
            print(f"Error synthesizing report: {e}")
            # Return empty/error report
            return Report(
                hypothesis=hypothesis.text,
                verdict="ERROR",
                confidence_score=0.0,
                executive_summary="Failed to generate report.",
                findings=[],
                missing_information=[],
                sources=[]
            )
