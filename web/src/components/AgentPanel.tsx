"use client";

import { useMemo } from "react";
import { Message } from "ai";

interface AgentPanelProps {
  isActive: boolean;
  messages: Message[];
}

interface AgentStatus {
  id: string;
  name: string;
  perspective: string;
  status: "idle" | "searching" | "done";
  sources: number;
}

const AGENTS: AgentStatus[] = [
  { id: "scientific", name: "Scientific", perspective: "Peer-reviewed", status: "idle", sources: 0 },
  { id: "skeptic", name: "Skeptic", perspective: "Counter-arguments", status: "idle", sources: 0 },
  { id: "advocate", name: "Advocate", perspective: "Supporting", status: "idle", sources: 0 },
  { id: "historical", name: "Historical", perspective: "Precedents", status: "idle", sources: 0 },
  { id: "statistical", name: "Statistical", perspective: "Data", status: "idle", sources: 0 },
];

export function AgentPanel({ isActive, messages }: AgentPanelProps) {
  const { directorDone, agentStates, phase } = useMemo(() => {
    const states = AGENTS.map(a => ({ ...a }));
    let directorDone = false;
    
    for (const msg of messages) {
      const tools = (msg as any).toolInvocations || [];
      for (const tool of tools) {
        if (tool.toolName === "analyze_hypothesis") {
          if (tool.state === "result") directorDone = true;
        }
        if (tool.toolName === "web_search") {
          const perspective = tool.args?.perspective || tool.result?.perspective;
          const agent = states.find(a => a.id === perspective);
          if (agent) {
            if (tool.state === "call") agent.status = "searching";
            else if (tool.state === "result") {
              agent.status = "done";
              agent.sources = tool.result?.sources?.length || 0;
            }
          }
        }
      }
    }
    
    const hasSearching = states.some(a => a.status === "searching");
    const hasDone = states.some(a => a.status === "done");
    const allDone = states.filter(a => a.status !== "idle").every(a => a.status === "done");
    
    const lastAssistant = [...messages].reverse().find(m => m.role === "assistant" && m.content);
    const hasVerdict = lastAssistant?.content?.includes("VALID") || 
                       lastAssistant?.content?.includes("REFUTED") ||
                       lastAssistant?.content?.includes("INCONCLUSIVE");
    
    let phase = "idle";
    if (hasVerdict && !isActive) phase = "done";
    else if (allDone && hasDone && !hasSearching) phase = "synthesize";
    else if (hasDone && !hasSearching && isActive) phase = "evaluate";
    else if (hasSearching || hasDone) phase = "parallel";
    else if (directorDone) phase = "director_done";
    else if (isActive) phase = "director";
    
    return { directorDone, agentStates: states, phase };
  }, [messages, isActive]);

  const step0Done = directorDone;
  const step1Done = ["parallel", "evaluate", "synthesize", "done"].includes(phase);
  const step2Done = ["evaluate", "synthesize", "done"].includes(phase);
  const step3Done = ["synthesize", "done"].includes(phase);
  const step4Done = phase === "done";

  return (
    <div className="h-full flex flex-col bg-[#19161d]">
      <div className="px-5 py-4 border-b border-[#2a2635]">
        <div className="text-[#a0a0b0]">Agent Flow</div>
      </div>

      <div className="flex-1 flex flex-col p-5">
        {/* HYPOTHESIS */}
        <FlowNode label="HYPOTHESIS" active={phase === "idle" && isActive} done={step0Done || step1Done} />
        
        <Connector done={step0Done || step1Done} />
        
        {/* DIRECTOR */}
        <FlowNode 
          label="DIRECTOR" 
          sublabel="Analyze & Plan"
          active={phase === "director"}
          done={step0Done}
          color="purple"
        />
        
        <Connector done={step1Done} />
        
        {/* PARALLEL SEARCH */}
        <div className="flex-1 flex flex-col">
          <div className="text-[#5a5a6e] text-xs text-center mb-3">PARALLEL SEARCH</div>
          <div className="flex-1 flex flex-col justify-center space-y-2">
            {agentStates.map((agent) => (
              <AgentRow key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
        
        <Connector done={step2Done} />
        
        {/* EVALUATE */}
        <FlowNode label="EVALUATE" active={phase === "evaluate"} done={step2Done} />
        
        <Connector done={step3Done} />
        
        {/* SYNTHESIZE */}
        <FlowNode label="SYNTHESIZE" active={phase === "synthesize"} done={step3Done} />
        
        <Connector done={step4Done} />
        
        {/* VERDICT */}
        <FlowNode label="VERDICT" active={phase === "done"} done={step4Done} />
      </div>
    </div>
  );
}

function AgentRow({ agent }: { agent: AgentStatus }) {
  return (
    <div className={`
      flex items-center gap-4 px-5 py-4 rounded-lg border transition-all
      ${agent.status === "searching" ? "border-[#9046ff]/50 bg-[#2a2635]" : 
        agent.status === "done" ? "border-[#c6a0ff]/50 bg-[#2a2635]" : 
        "border-[#3d3850] bg-[#1f1c26]"}
    `}>
      <div className={`w-3 h-3 rounded-full ${
        agent.status === "idle" ? "bg-[#5a5a6e]" :
        agent.status === "searching" ? "bg-[#9046ff] animate-pulse" :
        "bg-[#c6a0ff]"
      }`} />
      <span className={`font-medium text-base ${agent.status === "idle" ? "text-[#5a5a6e]" : "text-white"}`}>
        {agent.name}
      </span>
      <span className="text-[#a0a0b0] flex-1">{agent.perspective}</span>
      {agent.sources > 0 && <span className="text-[#c6a0ff]">{agent.sources}</span>}
      {agent.status === "searching" && (
        <div className="w-4 h-4 border-2 border-[#9046ff] border-t-transparent rounded-full animate-spin" />
      )}
      {agent.status === "done" && <span className="text-[#4ade80] text-lg">✓</span>}
    </div>
  );
}

function FlowNode({ label, sublabel, active, done, color }: { 
  label: string; 
  sublabel?: string;
  active: boolean; 
  done: boolean;
  color?: string;
}) {
  const borderColor = done ? "border-[#4ade80]/30" : 
    active ? "border-[#9046ff]/50" : 
    "border-[#3d3850]";
  
  const bgColor = done ? "bg-[#4ade80]/5" : 
    active ? "bg-[#2a2635]" : 
    "bg-[#1f1c26]";
  
  const textColor = done ? "text-[#4ade80]" : 
    active ? "text-[#9046ff]" : 
    "text-[#5a5a6e]";

  return (
    <div className={`px-5 py-3 rounded-lg border text-center transition-all ${borderColor} ${bgColor}`}>
      <div className={`font-medium flex items-center justify-center gap-2 ${textColor}`}>
        {done && <span>✓</span>}
        {active && !done && <span className="animate-pulse">●</span>}
        <span>{label}</span>
      </div>
      {sublabel && (
        <div className={`text-xs mt-1 ${done || active ? "text-[#a0a0b0]" : "text-[#5a5a6e]"}`}>
          {sublabel}
        </div>
      )}
    </div>
  );
}

function Connector({ done }: { done: boolean }) {
  return (
    <div className="flex justify-center py-1">
      <div className={`w-px h-5 ${done ? "bg-[#4ade80]" : "bg-[#3d3850]"}`} />
    </div>
  );
}
