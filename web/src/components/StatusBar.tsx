"use client";

import { useEffect, useState } from "react";

interface StatusBarProps {
  isConnected: boolean;
  isProcessing: boolean;
}

export function StatusBar({ isConnected, isProcessing }: StatusBarProps) {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      setTime(
        new Date().toLocaleString("en-US", {
          hour12: false,
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="border-t border-slate-700/50 bg-slate-900/80 px-4 py-1.5 flex items-center justify-between text-xs font-terminal">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                : "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]"
            }`}
          />
          <span className={isConnected ? "text-emerald-400" : "text-rose-400"}>
            {isConnected ? "ONLINE" : "OFFLINE"}
          </span>
        </div>
        <span className="text-slate-700">│</span>
        <span className="text-slate-500">
          {isProcessing ? (
            <span className="text-amber-400">● PROCESSING</span>
          ) : (
            <span className="text-slate-500">○ READY</span>
          )}
        </span>
      </div>

      {/* Center */}
      <div className="hidden md:flex items-center gap-4 text-slate-600">
        <span>MULTI-AGENT</span>
        <span className="text-slate-700">│</span>
        <span>ADVERSARIAL SEARCH</span>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4 text-slate-500">
        <span className="tabular-nums">{time || "---"}</span>
        <span className="text-amber-400/70">■ v1.0</span>
      </div>
    </footer>
  );
}
