from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field
from typing import Optional
from ..schemas.hypothesis import Hypothesis
from .llm import get_llm

class ClarificationResult(BaseModel):
    is_ambiguous: bool = Field(..., description="Whether the hypothesis is ambiguous")
    clarification_question: Optional[str] = Field(None, description="Question to ask the user if ambiguous")
    refined_hypothesis: Optional[str] = Field(None, description="Refined hypothesis if minor ambiguity was resolved automatically")

class Clarifier:
    def __init__(self):
        self.llm = get_llm()
        
    async def clarify(self, hypothesis: Hypothesis) -> ClarificationResult:
        """
        Checks if the hypothesis is ambiguous and needs clarification.
        """
        parser = PydanticOutputParser(pydantic_object=ClarificationResult)
        
        prompt = ChatPromptTemplate.from_template(
            """
            You are a research assistant. Analyze the following hypothesis for ambiguity.
            
            HYPOTHESIS: {hypothesis_text}
            CONTEXT: {context}
            
            Determine if the hypothesis is clear enough to be researched or if it needs clarification (e.g., vague terms, missing timeframes, unclear scope).
            
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
            print(f"Error clarifying hypothesis: {e}")
            # Default to not ambiguous if error
            return ClarificationResult(is_ambiguous=False)
