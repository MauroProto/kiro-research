"""
Exa API client for semantic web search.

Exa is a search engine built for AI that uses neural embeddings
to find relevant content based on meaning, not just keywords.
"""

import os
from exa_py import Exa
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class ExaClient:
    """
    Wrapper for Exa API providing semantic search capabilities.
    
    Features:
    - Neural search based on meaning
    - Content extraction with highlights
    - Similar document discovery
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the Exa client.
        
        Args:
            api_key: Exa API key. If not provided, reads from EXA_API_KEY env var.
        """
        self.api_key = api_key or os.getenv("EXA_API_KEY")
        if not self.api_key:
            raise ValueError(
                "EXA_API_KEY not found. Please set it in your environment "
                "or pass it directly to ExaClient()."
            )
        self.client = Exa(self.api_key)

    def search(
        self, 
        query: str, 
        num_results: int = 5, 
        use_autoprompt: bool = True,
        include_domains: Optional[List[str]] = None,
        exclude_domains: Optional[List[str]] = None,
        start_published_date: Optional[str] = None,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Perform a semantic search using Exa API.
        
        Args:
            query: Search query (semantic, not keyword-based)
            num_results: Number of results to return (max 100)
            use_autoprompt: Let Exa optimize the query
            include_domains: Only include results from these domains
            exclude_domains: Exclude results from these domains
            start_published_date: Only include content published after this date (ISO format)
            category: Filter by category (news, blog, company, etc.)
            
        Returns:
            List of search results with url, title, text, and highlights
        """
        try:
            # Build search parameters
            search_params = {
                "query": query,
                "num_results": min(num_results, 100),
                "use_autoprompt": use_autoprompt,
                "text": True,
                "highlights": True
            }
            
            # Add optional filters
            if include_domains:
                search_params["include_domains"] = include_domains
            if exclude_domains:
                search_params["exclude_domains"] = exclude_domains
            if start_published_date:
                search_params["start_published_date"] = start_published_date
            if category:
                search_params["category"] = category
            
            response = self.client.search_and_contents(**search_params)
            
            # Convert Exa response to list of dicts
            results = []
            if response and response.results:
                for res in response.results:
                    result = {
                        "url": res.url,
                        "title": getattr(res, "title", None),
                        "text": getattr(res, "text", ""),
                        "highlights": getattr(res, "highlights", []),
                        "score": getattr(res, "score", 0.0),
                        "published_date": getattr(res, "published_date", None),
                        "author": getattr(res, "author", None)
                    }
                    results.append(result)
                    
            logger.info(f"Exa search returned {len(results)} results for: {query[:50]}...")
            return results
            
        except Exception as e:
            logger.error(f"Error searching Exa: {e}")
            return []

    def find_similar(
        self, 
        url: str, 
        num_results: int = 5,
        exclude_source_domain: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Find pages similar to a given URL.
        
        Args:
            url: URL to find similar content for
            num_results: Number of similar results to return
            exclude_source_domain: Exclude results from the same domain
            
        Returns:
            List of similar pages with url, title, text, and highlights
        """
        try:
            response = self.client.find_similar_and_contents(
                url,
                num_results=min(num_results, 100),
                text=True,
                highlights=True,
                exclude_source_domain=exclude_source_domain
            )
            
            results = []
            if response and response.results:
                for res in response.results:
                    result = {
                        "url": res.url,
                        "title": getattr(res, "title", None),
                        "text": getattr(res, "text", ""),
                        "highlights": getattr(res, "highlights", []),
                        "score": getattr(res, "score", 0.0)
                    }
                    results.append(result)
                    
            logger.info(f"Found {len(results)} similar pages for: {url}")
            return results
            
        except Exception as e:
            logger.error(f"Error finding similar in Exa: {e}")
            return []
    
    def get_contents(
        self,
        urls: List[str],
        text_length: int = 2000
    ) -> List[Dict[str, Any]]:
        """
        Get cleaned content from a list of URLs.
        
        Args:
            urls: List of URLs to fetch content from
            text_length: Maximum text length per result
            
        Returns:
            List of content objects with url and text
        """
        try:
            response = self.client.get_contents(
                urls,
                text={"max_characters": text_length},
                highlights=True
            )
            
            results = []
            if response and response.results:
                for res in response.results:
                    result = {
                        "url": res.url,
                        "title": getattr(res, "title", None),
                        "text": getattr(res, "text", ""),
                        "highlights": getattr(res, "highlights", [])
                    }
                    results.append(result)
                    
            return results
            
        except Exception as e:
            logger.error(f"Error getting contents from Exa: {e}")
            return []
    
    def search_news(
        self,
        query: str,
        num_results: int = 5,
        days_back: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Search specifically for news articles.
        
        Args:
            query: News search query
            num_results: Number of results
            days_back: Only include news from the last N days
            
        Returns:
            List of news articles
        """
        from datetime import datetime, timedelta
        
        start_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")
        
        return self.search(
            query=query,
            num_results=num_results,
            category="news",
            start_published_date=start_date
        )
    
    def search_academic(
        self,
        query: str,
        num_results: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search specifically for academic/research content.
        
        Args:
            query: Academic search query
            num_results: Number of results
            
        Returns:
            List of academic sources
        """
        academic_domains = [
            "arxiv.org",
            "nature.com", 
            "science.org",
            "sciencedirect.com",
            "springer.com",
            "wiley.com",
            "pubmed.ncbi.nlm.nih.gov",
            "scholar.google.com"
        ]
        
        return self.search(
            query=query,
            num_results=num_results,
            include_domains=academic_domains
        )
