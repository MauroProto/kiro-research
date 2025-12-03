// Supercookie implementation via Favicon fingerprinting
// Based on https://supercookie.me/

const FAVICON_BITS = 32; // Number of bits in the identifier
const FAVICON_PATH = '/favicons';

// Generate a unique identifier
export function generateUniqueId(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0].toString(2).padStart(FAVICON_BITS, '0');
}

// Convert binary string to readable ID
export function binaryToId(binary: string): string {
  return parseInt(binary, 2).toString(16).padStart(8, '0');
}

// Convert ID to binary string
export function idToBinary(id: string): string {
  return parseInt(id, 16).toString(2).padStart(FAVICON_BITS, '0');
}

// Get favicon URL for a specific bit position and value
export function getFaviconUrl(position: number, value: '0' | '1'): string {
  return `${FAVICON_PATH}/bit_${position}_${value}.ico`;
}

// Client-side: Write identifier to favicon cache
export async function writeIdentifier(identifier: string): Promise<void> {
  const bits = identifier.split('');
  
  for (let i = 0; i < bits.length; i++) {
    const url = getFaviconUrl(i, bits[i] as '0' | '1');
    
    // Create a link element to cache the favicon
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = url;
    
    // Force browser to cache by loading as image
    const img = new Image();
    img.src = url;
    
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      setTimeout(resolve, 100); // Timeout fallback
    });
  }
}

// Client-side: Read identifier from favicon cache
export async function readIdentifier(): Promise<string | null> {
  const bits: string[] = [];
  
  for (let i = 0; i < FAVICON_BITS; i++) {
    const bit = await detectBit(i);
    if (bit === null) return null;
    bits.push(bit);
  }
  
  return bits.join('');
}

// Detect a single bit by checking which favicon is cached
async function detectBit(position: number): Promise<'0' | '1' | null> {
  const url0 = getFaviconUrl(position, '0');
  const url1 = getFaviconUrl(position, '1');
  
  const [cached0, cached1] = await Promise.all([
    isCached(url0),
    isCached(url1)
  ]);
  
  if (cached0 && !cached1) return '0';
  if (cached1 && !cached0) return '1';
  
  return null; // Unknown or both cached
}

// Check if a URL is cached using timing attack
async function isCached(url: string): Promise<boolean> {
  const start = performance.now();
  
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      cache: 'force-cache',
      mode: 'no-cors'
    });
    
    const duration = performance.now() - start;
    
    // If response is very fast, it's likely cached
    return duration < 50;
  } catch {
    return false;
  }
}

// Alternative: Use localStorage fallback for reliability
export function getStoredId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('research_agent_uid');
}

export function setStoredId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('research_agent_uid', id);
}

// Combined approach: Try favicon cache first, fall back to localStorage
export async function getOrCreateUserId(): Promise<string> {
  // Try localStorage first (more reliable)
  let storedId = getStoredId();
  if (storedId) {
    return storedId;
  }
  
  // Try reading from favicon cache
  try {
    const cachedBinary = await readIdentifier();
    if (cachedBinary) {
      const id = binaryToId(cachedBinary);
      setStoredId(id);
      return id;
    }
  } catch (e) {
    console.log('Favicon cache read failed:', e);
  }
  
  // Generate new ID
  const binary = generateUniqueId();
  const id = binaryToId(binary);
  
  // Store in both localStorage and favicon cache
  setStoredId(id);
  
  try {
    await writeIdentifier(binary);
  } catch (e) {
    console.log('Favicon cache write failed:', e);
  }
  
  return id;
}

