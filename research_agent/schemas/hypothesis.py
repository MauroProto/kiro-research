from pydantic import BaseModel, Field
from typing import List, Optional

class Hypothesis(BaseModel):
    text: str = Field(..., description="The hypothesis statement to validate")
    context: Optional[str] = Field(None, description="Additional context provided by the user")
