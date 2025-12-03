"""
URL cache for avoiding redundant web requests.
Uses SQLite for persistent storage.
"""

import sqlite3
import os
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import logging
import json

logger = logging.getLogger(__name__)


class URLCache:
    """
    Cache for storing URL content to avoid redundant requests.
    
    Features:
    - Persistent SQLite storage
    - Automatic expiration
    - Metadata storage
    """
    
    def __init__(
        self, 
        db_path: str = "url_cache.db",
        default_ttl_days: int = 7
    ):
        """
        Initialize the URL cache.
        
        Args:
            db_path: Path to the SQLite database
            default_ttl_days: Default time-to-live for cached entries
        """
        self.db_path = db_path
        self.default_ttl_days = default_ttl_days
        self._init_db()

    def _init_db(self):
        """Initialize the database schema."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS cache (
                    url TEXT PRIMARY KEY,
                    content TEXT,
                    metadata TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME,
                    hit_count INTEGER DEFAULT 0
                )
            ''')
            
            # Create index for expiration queries
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_expires_at ON cache(expires_at)
            ''')
            
            conn.commit()
            conn.close()
            logger.debug(f"URL cache initialized at {self.db_path}")
            
        except Exception as e:
            logger.error(f"Error initializing URL cache: {e}")

    def get(self, url: str) -> Optional[str]:
        """
        Retrieve content from cache if it exists and hasn't expired.
        
        Args:
            url: The URL to look up
            
        Returns:
            Cached content or None if not found/expired
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT content FROM cache 
                WHERE url = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
            ''', (url,))
            
            result = cursor.fetchone()
            
            if result:
                # Update hit count
                cursor.execute('''
                    UPDATE cache SET hit_count = hit_count + 1 WHERE url = ?
                ''', (url,))
                conn.commit()
            
            conn.close()
            return result[0] if result else None
            
        except Exception as e:
            logger.error(f"Error getting from cache: {e}")
            return None

    def get_with_metadata(self, url: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve content and metadata from cache.
        
        Args:
            url: The URL to look up
            
        Returns:
            Dict with content, metadata, and cache info, or None
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT content, metadata, created_at, hit_count FROM cache 
                WHERE url = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
            ''', (url,))
            
            result = cursor.fetchone()
            conn.close()
            
            if result:
                metadata = json.loads(result[1]) if result[1] else {}
                return {
                    "content": result[0],
                    "metadata": metadata,
                    "created_at": result[2],
                    "hit_count": result[3]
                }
            return None
            
        except Exception as e:
            logger.error(f"Error getting with metadata: {e}")
            return None

    def set(
        self, 
        url: str, 
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
        ttl_days: Optional[int] = None
    ) -> bool:
        """
        Save content to cache.
        
        Args:
            url: The URL as cache key
            content: The content to cache
            metadata: Optional metadata dict
            ttl_days: Time-to-live in days (None for default, 0 for no expiration)
            
        Returns:
            True if successful
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Calculate expiration
            if ttl_days is None:
                ttl_days = self.default_ttl_days
            
            if ttl_days > 0:
                expires_at = (datetime.now() + timedelta(days=ttl_days)).isoformat()
            else:
                expires_at = None
            
            # Serialize metadata
            metadata_json = json.dumps(metadata) if metadata else None
            
            cursor.execute('''
                INSERT OR REPLACE INTO cache (url, content, metadata, expires_at, hit_count)
                VALUES (?, ?, ?, ?, COALESCE(
                    (SELECT hit_count FROM cache WHERE url = ?), 0
                ))
            ''', (url, content, metadata_json, expires_at, url))
            
            conn.commit()
            conn.close()
            
            logger.debug(f"Cached content for: {url[:50]}...")
            return True
            
        except Exception as e:
            logger.error(f"Error saving to cache: {e}")
            return False

    def delete(self, url: str) -> bool:
        """
        Delete a URL from cache.
        
        Args:
            url: The URL to delete
            
        Returns:
            True if successful
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('DELETE FROM cache WHERE url = ?', (url,))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Error deleting from cache: {e}")
            return False

    def clear_expired(self) -> int:
        """
        Remove all expired entries from cache.
        
        Returns:
            Number of entries removed
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                DELETE FROM cache WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')
            ''')
            
            deleted = cursor.rowcount
            conn.commit()
            conn.close()
            
            logger.info(f"Cleared {deleted} expired cache entries")
            return deleted
            
        except Exception as e:
            logger.error(f"Error clearing expired entries: {e}")
            return 0

    def clear_all(self) -> bool:
        """Clear all entries from cache."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('DELETE FROM cache')
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
            return False

    def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.
        
        Returns:
            Dict with cache stats
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Total entries
            cursor.execute('SELECT COUNT(*) FROM cache')
            total = cursor.fetchone()[0]
            
            # Expired entries
            cursor.execute('''
                SELECT COUNT(*) FROM cache 
                WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')
            ''')
            expired = cursor.fetchone()[0]
            
            # Total hits
            cursor.execute('SELECT SUM(hit_count) FROM cache')
            total_hits = cursor.fetchone()[0] or 0
            
            conn.close()
            
            return {
                "total_entries": total,
                "expired_entries": expired,
                "active_entries": total - expired,
                "total_hits": total_hits,
                "db_path": self.db_path
            }
            
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {}

    def has(self, url: str) -> bool:
        """
        Check if a URL is in cache (and not expired).
        
        Args:
            url: The URL to check
            
        Returns:
            True if cached and valid
        """
        return self.get(url) is not None
    
    def get_recent(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get the most recently cached URLs.
        
        Args:
            limit: Maximum number of entries
            
        Returns:
            List of cache entries
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT url, created_at, hit_count FROM cache 
                ORDER BY created_at DESC LIMIT ?
            ''', (limit,))
            
            results = cursor.fetchall()
            conn.close()
            
            return [
                {"url": r[0], "created_at": r[1], "hit_count": r[2]}
                for r in results
            ]
            
        except Exception as e:
            logger.error(f"Error getting recent entries: {e}")
            return []
