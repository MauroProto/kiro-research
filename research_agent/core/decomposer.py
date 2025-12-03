from typing import List
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from ..schemas.hypothesis import Hypothesis
from ..schemas.claim import Claim
from .llm import get_llm

class Decomposer:
    def __init__(self):
        self.llm = get_llm()
        
    async def decompose(self, hypothesis: Hypothesis) -> List[Claim]:
        """
        Decomposes a hypothesis into atomic claims.
        """
        # We need a wrapper model to parse a list of claims
        from pydantic import BaseModel, Field
        class ClaimsList(BaseModel):
            claims: List[Claim]

        parser = PydanticOutputParser(pydantic_object=ClaimsList)
        
        prompt = ChatPromptTemplate.from_template(
            """
            You are a research analyst. Your job is to decompose a hypothesis into atomic, verifiable claims.
            
            HYPOTHESIS: {hypothesis_text}
            CONTEXT: {context}
            
            For each claim, specify:
            1. The exact claim to verify
            2. Evidence needed (quantitative, expert opinion, etc.)
            3. What would refute it
            4. Search queries (PRO and CONTRA)
            
            {format_instructions}
            """
        )
        
        chain = prompt | self.llm | parser
        
        try:
            result = await chain.ainvoke({
                "hypothesis_text": hypothesis.text,
                "context": hypothesis.context or "",
                "format_instructions": parser.get_format_instructions()
            })
            return result.claims
        except Exception as e:
            print(f"Error decomposing hypothesis: {e}")
            return []
