"""
LLM configuration and initialization.
"""

import os
from langchain_openai import ChatOpenAI
from typing import Optional


# Default model configuration
DEFAULT_MODEL = "gpt-4o"
DEFAULT_TEMPERATURE = 0.0


def get_llm(
    model_name: Optional[str] = None,
    temperature: Optional[float] = None,
    api_key: Optional[str] = None
) -> ChatOpenAI:
    """
    Returns a configured LLM instance.
    
    Args:
        model_name: The model to use (default: gpt-4o)
        temperature: Sampling temperature (default: 0.0 for deterministic output)
        api_key: OpenAI API key (default: from environment)
    
    Returns:
        Configured ChatOpenAI instance
    """
    # Try to load from config if available
    try:
        from ..config import settings
        model_name = model_name or settings.llm_model
        temperature = temperature if temperature is not None else settings.llm_temperature
        api_key = api_key or settings.openai_api_key
    except ImportError:
        model_name = model_name or DEFAULT_MODEL
        temperature = temperature if temperature is not None else DEFAULT_TEMPERATURE
    
    # Fall back to environment variable
    api_key = api_key or os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        raise ValueError(
            "OPENAI_API_KEY not found. Please set it in your environment "
            "or pass it directly to get_llm()."
        )
    
    return ChatOpenAI(
        model=model_name,
        temperature=temperature,
        api_key=api_key
    )


def get_embedding_model(model_name: str = "text-embedding-3-small"):
    """
    Returns an embedding model for vector operations.
    
    Args:
        model_name: The embedding model to use
    
    Returns:
        Configured embedding model
    """
    from langchain_openai import OpenAIEmbeddings
    
    api_key = os.getenv("OPENAI_API_KEY")
    
    return OpenAIEmbeddings(
        model=model_name,
        api_key=api_key
    )
