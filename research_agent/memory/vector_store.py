"""
Vector store for semantic search over research evidence.
Uses ChromaDB for persistent vector storage.
"""

import chromadb
from chromadb.config import Settings
from typing import List, Dict, Any, Optional
import logging
import os

logger = logging.getLogger(__name__)


class VectorStore:
    """
    Vector database for storing and searching research evidence.
    
    Uses ChromaDB with sentence transformers for embedding.
    Supports semantic similarity search across collected evidence.
    """
    
    def __init__(
        self, 
        collection_name: str = "research_evidence",
        persist_directory: Optional[str] = None
    ):
        """
        Initialize the vector store.
        
        Args:
            collection_name: Name of the collection to use
            persist_directory: Directory to persist the database
        """
        self.persist_directory = persist_directory or "./chroma_db"
        
        # Ensure directory exists
        os.makedirs(self.persist_directory, exist_ok=True)
        
        try:
            self.client = chromadb.Client(Settings(
                is_persistent=True,
                persist_directory=self.persist_directory,
                anonymized_telemetry=False
            ))
            self.collection = self.client.get_or_create_collection(
                name=collection_name,
                metadata={"hnsw:space": "cosine"}
            )
            logger.info(f"Initialized vector store: {collection_name}")
        except Exception as e:
            logger.error(f"Error initializing vector store: {e}")
            # Fallback to in-memory client
            self.client = chromadb.Client()
            self.collection = self.client.get_or_create_collection(name=collection_name)
            logger.warning("Using in-memory vector store as fallback")

    def add_documents(
        self, 
        documents: List[str], 
        metadatas: List[Dict[str, Any]], 
        ids: List[str]
    ) -> bool:
        """
        Add documents to the vector store.
        
        Args:
            documents: List of text documents to store
            metadatas: List of metadata dicts for each document
            ids: List of unique IDs for each document
            
        Returns:
            True if successful, False otherwise
        """
        if not documents:
            return False
            
        try:
            # Filter out any None or empty documents
            valid_indices = [i for i, doc in enumerate(documents) if doc and doc.strip()]
            if not valid_indices:
                return False
            
            valid_docs = [documents[i] for i in valid_indices]
            valid_metas = [metadatas[i] for i in valid_indices]
            valid_ids = [ids[i] for i in valid_indices]
            
            # Ensure metadata values are valid types
            cleaned_metas = []
            for meta in valid_metas:
                cleaned = {}
                for k, v in meta.items():
                    if isinstance(v, (str, int, float, bool)):
                        cleaned[k] = v
                    else:
                        cleaned[k] = str(v)
                cleaned_metas.append(cleaned)
            
            self.collection.add(
                documents=valid_docs,
                metadatas=cleaned_metas,
                ids=valid_ids
            )
            logger.debug(f"Added {len(valid_docs)} documents to vector store")
            return True
            
        except Exception as e:
            logger.error(f"Error adding documents: {e}")
            return False

    def query(
        self, 
        query_text: str, 
        n_results: int = 5,
        where: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Query the vector store for similar documents.
        
        Args:
            query_text: Text to search for
            n_results: Maximum number of results
            where: Optional filter conditions
            
        Returns:
            Dict with documents, metadatas, distances, and ids
        """
        try:
            params = {
                "query_texts": [query_text],
                "n_results": min(n_results, self.collection.count() or 1)
            }
            if where:
                params["where"] = where
                
            results = self.collection.query(**params)
            return results
            
        except Exception as e:
            logger.error(f"Error querying vector store: {e}")
            return {
                "documents": [[]],
                "metadatas": [[]],
                "distances": [[]],
                "ids": [[]]
            }
    
    def get_by_id(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a document by its ID.
        
        Args:
            doc_id: The document ID
            
        Returns:
            Document data or None if not found
        """
        try:
            result = self.collection.get(ids=[doc_id])
            if result and result["documents"]:
                return {
                    "document": result["documents"][0],
                    "metadata": result["metadatas"][0] if result["metadatas"] else {},
                    "id": doc_id
                }
            return None
        except Exception as e:
            logger.error(f"Error getting document {doc_id}: {e}")
            return None
    
    def delete(self, ids: List[str]) -> bool:
        """
        Delete documents by their IDs.
        
        Args:
            ids: List of document IDs to delete
            
        Returns:
            True if successful
        """
        try:
            self.collection.delete(ids=ids)
            return True
        except Exception as e:
            logger.error(f"Error deleting documents: {e}")
            return False
    
    def count(self) -> int:
        """Get the number of documents in the collection."""
        try:
            return self.collection.count()
        except Exception:
            return 0
    
    def clear(self) -> bool:
        """Clear all documents from the collection."""
        try:
            # Delete and recreate collection
            self.client.delete_collection(self.collection.name)
            self.collection = self.client.create_collection(
                name=self.collection.name,
                metadata={"hnsw:space": "cosine"}
            )
            return True
        except Exception as e:
            logger.error(f"Error clearing collection: {e}")
            return False
    
    def search_by_claim(
        self, 
        claim_id: str, 
        n_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Find all evidence related to a specific claim.
        
        Args:
            claim_id: The claim ID to search for
            n_results: Maximum results
            
        Returns:
            List of evidence documents
        """
        try:
            result = self.collection.get(
                where={"claim_id": claim_id},
                limit=n_results
            )
            
            documents = []
            if result and result["documents"]:
                for i, doc in enumerate(result["documents"]):
                    documents.append({
                        "document": doc,
                        "metadata": result["metadatas"][i] if result["metadatas"] else {},
                        "id": result["ids"][i] if result["ids"] else None
                    })
            return documents
            
        except Exception as e:
            logger.error(f"Error searching by claim: {e}")
            return []
