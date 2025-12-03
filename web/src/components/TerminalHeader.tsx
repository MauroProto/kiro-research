"use client";

import { useState, useEffect } from 'react';

interface TerminalHeaderProps {
  showPanel: boolean;
  onTogglePanel: () => void;
  isProcessing: boolean;
  remaining?: number;
}

export function TerminalHeader({ showPanel, onTogglePanel, isProcessing, remaining = 2 }: TerminalHeaderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="border-b border-[#2a2635] bg-[#1f1c26] px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#ff4d6a]" />
          <span className="w-3 h-3 rounded-full bg-[#9046ff]" />
          <span className="w-3 h-3 rounded-full bg-[#a668ff]" />
        </div>
        <span className="text-[#a0a0b0] text-sm">
          research-agent — bash
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm">
        {/* Prompts remaining badge - only render after mount to avoid hydration mismatch */}
        {mounted && (
          <div className={`flex items-center gap-2 px-2 py-1 rounded border ${
            remaining > 0 
              ? 'bg-[#2a2635] border-[#3d3850]' 
              : 'bg-[#f472b6]/10 border-[#f472b6]/30'
          }`}>
            <span className={`text-xs ${remaining > 0 ? 'text-[#a0a0b0]' : 'text-[#f472b6]'}`}>
              {remaining > 0 ? `${remaining}/2 queries` : 'No queries left'}
            </span>
          </div>
        )}
        
        {isProcessing && (
          <span className="text-[#9046ff]">● processing</span>
        )}
        <button
          onClick={onTogglePanel}
          className="text-[#a0a0b0] hover:text-white transition-colors"
        >
          {showPanel ? "hide panel" : "show panel"}
        </button>
      </div>
    </header>
  );
}
