"use client";

import { useEffect, useState, useCallback } from "react";

// Agent definitions matching the API
const DEGEN_AGENTS = {
  twitter: { name: "Twitter", icon: "X" },
  trending: { name: "Trending", icon: "T" },
  tokenAnalysis: { name: "Token", icon: "A" },
  pumpfun: { name: "Pump.fun", icon: "P" },
  news: { name: "News", icon: "N" },
  dexscreener: { name: "DEX", icon: "D" },
  aixbt: { name: "AIXBT", icon: "I" },
};

type AgentId = keyof typeof DEGEN_AGENTS;

interface AgentStatus {
  id: AgentId;
  status: "idle" | "pending" | "running" | "done" | "error" | "retrying";
  task?: string;
  error?: string;
  isRetry?: boolean;
}

interface DegenProgress {
  phase: "idle" | "orchestrating" | "agents" | "retrying" | "reasoning" | "complete";
  orchestratorReasoning?: string;
  selectedAgents: AgentId[];
  agentStatuses: Record<AgentId, AgentStatus>;
  currentAgent?: AgentId;
  reasonerText?: string;  // Chain of thought reasoning
  reasonerContent?: string;  // Final answer content
  retryingAgents?: string[];
}

interface DegenAgentPanelProps {
  isActive: boolean;
  query?: string;
}

export function DegenAgentPanel({ isActive, query }: DegenAgentPanelProps) {
  const [progress, setProgress] = useState<DegenProgress>({
    phase: "idle",
    selectedAgents: [],
    agentStatuses: {} as Record<AgentId, AgentStatus>,
  });

  const resetProgress = useCallback(() => {
    setProgress({
      phase: "idle",
      selectedAgents: [],
      agentStatuses: {} as Record<AgentId, AgentStatus>,
    });
  }, []);

  // Listen for SSE events from the DEGEN API
  useEffect(() => {
    if (!isActive || !query) {
      return;
    }

    resetProgress();
    setProgress(prev => ({ ...prev, phase: "orchestrating" }));

    const eventSource = new EventSource(`/api/degen/stream?query=${encodeURIComponent(query)}`);

    // We'll manually handle the events since the API uses POST
    // Instead, we'll update based on a custom event system

    return () => {
      eventSource.close();
    };
  }, [isActive, query, resetProgress]);

  // For now, we'll use a simpler approach - expose update functions
  // that page.tsx can call based on SSE events

  return (
    <div className="h-full flex flex-col bg-[#19161d]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#2a2635]">
        <div className="text-[#f472b6] font-medium">DEGEN Flow</div>
        <div className="text-[#5a5a6e] text-xs mt-1">Multi-Agent Research</div>
      </div>

      <div className="flex-1 flex flex-col p-5 overflow-auto">
        {/* QUERY */}
        <FlowNode
          label="QUERY"
          sublabel="Your question"
          active={progress.phase === "idle" && isActive}
          done={progress.phase !== "idle"}
          color="pink"
        />

        <Connector done={progress.phase !== "idle"} color="pink" />

        {/* ORCHESTRATOR */}
        <FlowNode
          label="ORCHESTRATOR"
          sublabel="Selects agents"
          active={progress.phase === "orchestrating"}
          done={["agents", "reasoning", "complete"].includes(progress.phase)}
          color="pink"
        />

        <Connector done={["agents", "reasoning", "complete"].includes(progress.phase)} color="pink" />

        {/* AGENTS */}
        <div className="flex-1 min-h-0">
          <div className="text-[#5a5a6e] text-xs text-center mb-3">AGENTS (Sequential)</div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {progress.selectedAgents.length > 0 ? (
              progress.selectedAgents.map((agentId, index) => {
                const status = progress.agentStatuses[agentId];
                return (
                  <AgentRow
                    key={agentId}
                    agentId={agentId}
                    index={index + 1}
                    status={status?.status || "pending"}
                    task={status?.task}
                    error={status?.error}
                    isCurrentAgent={progress.currentAgent === agentId}
                  />
                );
              })
            ) : (
              // Show all agents as idle when not selected yet
              Object.keys(DEGEN_AGENTS).map((agentId) => (
                <AgentRow
                  key={agentId}
                  agentId={agentId as AgentId}
                  status="idle"
                  isCurrentAgent={false}
                />
              ))
            )}
          </div>
        </div>

        <Connector done={["reasoning", "complete"].includes(progress.phase)} color="pink" />

        {/* RETRY CHECK */}
        <FlowNode
          label="RETRY CHECK"
          sublabel="Verifies agents"
          active={false}
          done={["reasoning", "complete"].includes(progress.phase)}
          color="yellow"
        />

        <Connector done={["reasoning", "complete"].includes(progress.phase)} color="pink" />

        {/* REASONER */}
        <FlowNode
          label="REASONER"
          sublabel="Synthesizes results"
          active={progress.phase === "reasoning"}
          done={progress.phase === "complete"}
          color="pink"
        />

        <Connector done={progress.phase === "complete"} color="pink" />

        {/* ANALYSIS */}
        <FlowNode
          label="ANALYSIS"
          sublabel="Final response"
          active={false}
          done={progress.phase === "complete"}
          color="pink"
        />
      </div>
    </div>
  );
}

// Expose a version that can receive progress updates from parent
export function DegenAgentPanelControlled({
  progress,
}: {
  progress: DegenProgress;
}) {
  // Check if any agent failed (to show retry check)
  const hasFailedAgents = Object.values(progress.agentStatuses).some(
    s => s.status === "error" || s.status === "retrying"
  );
  const isRetryingPhase = progress.phase === "retrying" ||
    Object.values(progress.agentStatuses).some(s => s.status === "retrying");

  return (
    <div className="h-full flex flex-col bg-[#19161d]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#2a2635]">
        <div className="text-[#f472b6] font-medium">DEGEN Flow</div>
        <div className="text-[#5a5a6e] text-xs mt-1">Multi-Agent Research</div>
      </div>

      <div className="flex-1 flex flex-col p-5 overflow-auto">
        {/* QUERY */}
        <FlowNode
          label="QUERY"
          sublabel="Your question"
          active={progress.phase === "idle"}
          done={progress.phase !== "idle"}
          color="pink"
        />

        <Connector done={progress.phase !== "idle"} color="pink" />

        {/* ORCHESTRATOR */}
        <FlowNode
          label="ORCHESTRATOR"
          sublabel="Selects agents"
          active={progress.phase === "orchestrating"}
          done={["agents", "retrying", "reasoning", "complete"].includes(progress.phase)}
          color="pink"
        />

        <Connector done={["agents", "retrying", "reasoning", "complete"].includes(progress.phase)} color="pink" />

        {/* AGENTS */}
        <div className="flex-1 min-h-0">
          <div className="text-[#5a5a6e] text-xs text-center mb-3">
            AGENTS {progress.selectedAgents.length > 0 && `(${progress.selectedAgents.length})`}
          </div>
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {progress.selectedAgents.length > 0 ? (
              progress.selectedAgents.map((agentId, index) => {
                const status = progress.agentStatuses[agentId];
                return (
                  <AgentRow
                    key={agentId}
                    agentId={agentId}
                    index={index + 1}
                    status={status?.status || "pending"}
                    task={status?.task}
                    error={status?.error}
                    isCurrentAgent={progress.currentAgent === agentId}
                    isRetry={status?.isRetry}
                  />
                );
              })
            ) : (
              <div className="text-center text-[#5a5a6e] text-xs py-4">
                Waiting for orchestrator...
              </div>
            )}
          </div>
        </div>

        <Connector done={["retrying", "reasoning", "complete"].includes(progress.phase) || hasFailedAgents} color="pink" />

        {/* RETRY CHECK - Always visible */}
        <FlowNode
          label="RETRY CHECK"
          sublabel="Verifies agents"
          active={isRetryingPhase}
          done={["reasoning", "complete"].includes(progress.phase)}
          color="yellow"
        />

        <Connector done={["reasoning", "complete"].includes(progress.phase)} color="pink" />

        {/* REASONER */}
        <FlowNode
          label="REASONER"
          sublabel="Synthesizes results"
          active={progress.phase === "reasoning"}
          done={progress.phase === "complete"}
          color="pink"
        />

        <Connector done={progress.phase === "complete"} color="pink" />

        {/* ANALYSIS */}
        <FlowNode
          label="ANALYSIS"
          active={false}
          done={progress.phase === "complete"}
          color="pink"
        />
      </div>
    </div>
  );
}

function AgentRow({
  agentId,
  index,
  status,
  task,
  error,
  isCurrentAgent,
  isRetry,
}: {
  agentId: AgentId;
  index?: number;
  status: "idle" | "pending" | "running" | "done" | "error" | "retrying";
  task?: string;
  error?: string;
  isCurrentAgent: boolean;
  isRetry?: boolean;
}) {
  const agent = DEGEN_AGENTS[agentId];

  const borderColor =
    status === "running"
      ? "border-[#f472b6]/50"
      : status === "retrying"
      ? "border-[#fbbf24]/50"
      : status === "done"
      ? "border-[#4ade80]/30"
      : status === "error"
      ? "border-[#ef4444]/30"
      : "border-[#3d3850]";

  const bgColor =
    status === "running"
      ? "bg-[#2a2635]"
      : status === "retrying"
      ? "bg-[#fbbf24]/5"
      : status === "done"
      ? "bg-[#4ade80]/5"
      : status === "error"
      ? "bg-[#ef4444]/5"
      : "bg-[#1f1c26]";

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${borderColor} ${bgColor}`}
    >
      {/* Status indicator */}
      <div
        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
          status === "idle"
            ? "bg-[#5a5a6e]"
            : status === "pending"
            ? "bg-[#5a5a6e]"
            : status === "running"
            ? "bg-[#f472b6] animate-pulse"
            : status === "retrying"
            ? "bg-[#fbbf24] animate-pulse"
            : status === "done"
            ? "bg-[#4ade80]"
            : "bg-[#ef4444]"
        }`}
      />

      {/* Index */}
      {index && (
        <span className="text-[#5a5a6e] text-xs w-4">{index}.</span>
      )}

      {/* Agent name */}
      <span
        className={`font-medium text-sm flex-1 ${
          status === "idle" || status === "pending"
            ? "text-[#5a5a6e]"
            : status === "error"
            ? "text-[#ef4444]"
            : status === "retrying"
            ? "text-[#fbbf24]"
            : "text-white"
        }`}
      >
        {agent?.name || agentId}
      </span>

      {/* Status icon */}
      {status === "running" && (
        <div className="w-3 h-3 border-2 border-[#f472b6] border-t-transparent rounded-full animate-spin" />
      )}
      {status === "retrying" && (
        <div className="w-3 h-3 border-2 border-[#fbbf24] border-t-transparent rounded-full animate-spin" />
      )}
      {status === "done" && (
        <span className="text-[#4ade80] text-sm">{isRetry ? "OK*" : "OK"}</span>
      )}
      {status === "error" && <span className="text-[#ef4444] text-sm">ERR</span>}
    </div>
  );
}

function FlowNode({
  label,
  sublabel,
  active,
  done,
  color = "purple",
}: {
  label: string;
  sublabel?: string;
  active: boolean;
  done: boolean;
  color?: "purple" | "pink" | "yellow";
}) {
  const accentColor = color === "pink" ? "#f472b6" : color === "yellow" ? "#fbbf24" : "#9046ff";

  const bgColor = done
    ? "bg-[#4ade80]/5"
    : active
    ? "bg-[#2a2635]"
    : "bg-[#1f1c26]";

  const textColor = done
    ? "text-[#4ade80]"
    : active
    ? color === "pink"
      ? "text-[#f472b6]"
      : color === "yellow"
      ? "text-[#fbbf24]"
      : "text-[#9046ff]"
    : "text-[#5a5a6e]";

  return (
    <div
      className={`px-4 py-2.5 rounded-lg border text-center transition-all ${bgColor}`}
      style={{
        borderColor: done
          ? "rgba(74, 222, 128, 0.3)"
          : active
          ? `${accentColor}80`
          : "#3d3850",
      }}
    >
      <div className={`font-medium flex items-center justify-center gap-2 text-sm ${textColor}`}>
        {done && <span>OK</span>}
        {active && !done && <span className="animate-pulse">...</span>}
        <span>{label}</span>
      </div>
      {sublabel && (
        <div
          className={`text-xs mt-0.5 ${
            done || active ? "text-[#a0a0b0]" : "text-[#5a5a6e]"
          }`}
        >
          {sublabel}
        </div>
      )}
    </div>
  );
}

function Connector({ done, color = "purple" }: { done: boolean; color?: "purple" | "pink" }) {
  return (
    <div className="flex justify-center py-1">
      <div
        className={`w-px h-4 ${done ? "bg-[#4ade80]" : "bg-[#3d3850]"}`}
      />
    </div>
  );
}

// Export types for use in page.tsx
export type { DegenProgress, AgentId, AgentStatus };
