"use client";

import { useState, useEffect } from 'react';
import { getOrCreateUserId, getStoredId, setStoredId, generateUniqueId, binaryToId } from '@/lib/supercookie';

export function useUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initUserId() {
      try {
        // Quick check for existing ID
        const existingId = getStoredId();
        if (existingId) {
          setUserId(existingId);
          setIsLoading(false);
          return;
        }

        // Generate new ID (simplified - skip favicon cache for reliability)
        const binary = generateUniqueId();
        const newId = binaryToId(binary);
        setStoredId(newId);
        setUserId(newId);
        
        // Try favicon cache in background (optional enhancement)
        // This is disabled by default for reliability
        // await writeIdentifier(binary);
        
      } catch (error) {
        console.error('Error initializing user ID:', error);
        // Fallback: generate simple ID
        const fallbackId = Math.random().toString(36).substring(2, 10);
        setStoredId(fallbackId);
        setUserId(fallbackId);
      } finally {
        setIsLoading(false);
      }
    }

    initUserId();
  }, []);

  return { userId, isLoading };
}

// Short hash for display purposes
export function shortenUserId(id: string): string {
  return id.slice(0, 6).toUpperCase();
}

