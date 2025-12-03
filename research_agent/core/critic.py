from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from ..schemas.evidence import Evidence
from ..schemas.claim import Claim
from .llm import get_llm

class Critic:
    def __init__(self):
        self.llm = get_llm()
        
    async def evaluate_evidence(self, claim: Claim, evidence: Evidence) -> Evidence:
        """
        Evaluates the evidence against the claim using LLM.
        """
        parser = PydanticOutputParser(pydantic_object=Evidence)
        
        prompt = ChatPromptTemplate.from_template(
            """
            You are a critical fact-checker. Evaluate the following evidence against the claim.
            
            CLAIM: {claim_text}
            
            EVIDENCE:
            - URL: {url}
            - Content: {content}
            
            Determine:
            1. Does the evidence support, refute, or is it irrelevant to the claim?
            2. Assign a confidence score (0-100) based on source reliability and content relevance.
            3. Provide an explanation.
            
            Update the 'supports_claim', 'confidence_score', and 'explanation' fields.
            Keep the original URL, title, and content.
            
            {format_instructions}
            """
        )
        
        chain = prompt | self.llm | parser
        
        try:
            evaluated_evidence = await chain.ainvoke({
                "claim_text": claim.text,
                "url": evidence.url,
                "content": evidence.content[:2000], # Limit content length for context window
                "format_instructions": parser.get_format_instructions()
            })
            
            # Preserve original metadata that might be lost if LLM hallucinates or omits
            evaluated_evidence.url = evidence.url
            evaluated_evidence.title = evidence.title
            evaluated_evidence.source_reliability_score = evidence.source_reliability_score # Keep the domain-based score or blend it?
            # Let's trust the LLM's confidence score which should factor in reliability if instructed, 
            # but for now let's keep the domain score separate or average them.
            
            return evaluated_evidence
            
        except Exception as e:
            print(f"Error evaluating evidence: {e}")
            return evidence
