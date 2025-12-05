"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Message } from "ai/react";
import { TerminalInput } from "@/components/TerminalInput";
import { MessageList } from "@/components/MessageList";
import { DegenAgentPanelControlled, DegenProgress, AgentId } from "@/components/DegenAgentPanel";
import { GhostScreensaver } from "@/components/GhostScreensaver";
import { CryptoTicker } from "@/components/CryptoTicker";
import { ErrorSuppressor } from "@/components/ErrorSuppressor";

const initialProgress: DegenProgress = {
  phase: "idle",
  selectedAgents: [],
  agentStatuses: {} as Record<AgentId, { id: AgentId; status: "idle" | "pending" | "running" | "done" | "error" | "retrying"; task?: string; error?: string; isRetry?: boolean }>,
};

export default function Home() {
  const [showPanel, setShowPanel] = useState(true);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number>(2);
  const [progress, setProgress] = useState<DegenProgress>(initialProgress);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch remaining prompts on mount
  useEffect(() => {
    fetch('/api/rate-limit')
      .then(res => res.json())
      .then(data => {
        setRemaining(data.remaining ?? 2);
      })
      .catch(() => {
        setRemaining(2);
      });
  }, []);

  // SSE handler for research
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setProgress({ ...initialProgress, phase: "orchestrating" });

    try {
      const response = await fetch('/api/degen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: input }] }),
      });

      if (response.status === 429) {
        setRateLimitError('You have reached the limit of 2 daily queries. Come back tomorrow.');
        setRemaining(0);
        setIsLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              handleEvent(event);
            } catch {
              // Ignore parsing errors
            }
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Research error:', errorMessage);
      setProgress(prev => ({ ...prev, phase: "complete" }));
      const errorAssistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${errorMessage}`,
      };
      setMessages(prev => [...prev, errorAssistantMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading]);

  // Handle SSE events
  const handleEvent = useCallback((event: { type: string; [key: string]: unknown }) => {
    switch (event.type) {
      case 'orchestrator_start':
        setProgress(prev => ({ ...prev, phase: 'orchestrating', orchestratorReasoning: '' }));
        break;

      case 'orchestrator_chunk':
        setProgress(prev => ({
          ...prev,
          orchestratorReasoning: (prev.orchestratorReasoning || '') + (event.text as string),
        }));
        break;

      case 'orchestrator_done': {
        const decision = event.decision as { agents: string[]; reasoning: string; tasks: Record<string, string> };
        const agentStatuses: Record<AgentId, { id: AgentId; status: "pending"; task?: string }> = {} as Record<AgentId, { id: AgentId; status: "pending"; task?: string }>;
        decision.agents.forEach((agentId: string) => {
          agentStatuses[agentId as AgentId] = {
            id: agentId as AgentId,
            status: 'pending',
            task: decision.tasks[agentId],
          };
        });
        setProgress(prev => ({
          ...prev,
          phase: 'agents',
          orchestratorReasoning: decision.reasoning || prev.orchestratorReasoning,
          selectedAgents: decision.agents as AgentId[],
          agentStatuses,
        }));
        break;
      }

      case 'agent_start': {
        const isRetry = event.isRetry as boolean | undefined;
        setProgress(prev => ({
          ...prev,
          currentAgent: event.agent as AgentId,
          agentStatuses: {
            ...prev.agentStatuses,
            [event.agent as string]: {
              ...prev.agentStatuses[event.agent as AgentId],
              status: isRetry ? 'retrying' : 'running',
              task: event.task as string,
              isRetry: isRetry || false,
            },
          },
        }));
        break;
      }

      case 'agent_done':
        setProgress(prev => ({
          ...prev,
          agentStatuses: {
            ...prev.agentStatuses,
            [event.agent as string]: {
              ...prev.agentStatuses[event.agent as AgentId],
              status: event.success ? 'done' : 'error',
              error: event.error as string | undefined,
            },
          },
        }));
        break;

      case 'retry_check_start':
        setProgress(prev => ({
          ...prev,
          phase: 'retrying',
          retryingAgents: event.failedAgents as string[],
        }));
        break;

      case 'retry_check_done':
        console.log('Retry plan:', event.retryPlan);
        break;

      case 'reasoner_start':
        setProgress(prev => ({
          ...prev,
          phase: 'reasoning',
          currentAgent: undefined,
          reasonerText: '',
          reasonerContent: ''
        }));
        break;

      case 'reasoner_chunk':
        setProgress(prev => ({
          ...prev,
          reasonerText: (prev.reasonerText || '') + (event.text as string),
        }));
        break;

      case 'reasoner_content_chunk':
        setProgress(prev => ({
          ...prev,
          reasonerContent: (prev.reasonerContent || '') + (event.text as string),
        }));
        break;

      case 'reasoner_done':
        setProgress(prev => ({ ...prev, phase: 'reasoning' }));
        break;

      case 'complete': {
        setProgress(prev => ({ ...prev, phase: 'complete' }));
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: event.response as string,
        };
        setMessages(prev => [...prev, assistantMessage]);
        setRemaining(prev => Math.max(0, prev - 1));
        break;
      }
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setInput(e.target.value);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="h-screen flex flex-col bg-[#19161d]">
      {/* Suppress wallet extension errors */}
      <ErrorSuppressor />
      {/* Ghost Screensaver - appears after 30 seconds of inactivity */}
      <GhostScreensaver idleTimeout={30000} duration={12000} />

      {/* Crypto Price Ticker + Controls */}
      <CryptoTicker
        showPanel={showPanel}
        onTogglePanel={() => setShowPanel(!showPanel)}
        isProcessing={isLoading}
        remaining={remaining}
      />

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-6">
            {messages.length === 0 && <Welcome onSelectExample={setInput} />}
            <MessageList
              messages={messages}
              isLoading={isLoading}
              progress={progress}
            />
            {rateLimitError && (
              <div className="text-[#f472b6] text-sm mt-4 p-4 bg-[#f472b6]/10 rounded-lg border border-[#f472b6]/30">
                <div className="font-medium mb-1">Limit reached</div>
                <div className="text-[#a0a0b0]">{rateLimitError}</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[#2a2635] px-6 py-4">
            <TerminalInput
              value={input}
              onChange={handleInputChange}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              disabled={remaining <= 0}
            />
          </div>
        </div>

        {/* Panel - hidden on mobile, visible on lg screens */}
        {showPanel && (
          <div className="hidden lg:block w-96 border-l border-[#2a2635] overflow-hidden">
            <DegenAgentPanelControlled progress={progress} />
          </div>
        )}
      </div>

    </div>
  );
}

const EXAMPLES = [
  "What's the sentiment on $SOL right now?",
  "Which altcoins are whales accumulating?",
  "Top trending memecoins this week",
];

function Welcome({ onSelectExample }: { onSelectExample: (text: string) => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="text-[#a0a0b0] mb-8">
      {/* ASCII Art Logo with Ghost */}
      <div
        className="relative cursor-pointer select-none inline-block overflow-visible"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Ghost image - peeks out from behind the H in RESEARCH */}
        <img
          src="/ghost.png"
          alt="ghost"
          className={`
            absolute w-18 h-18 object-contain pointer-events-none
            transition-all duration-500 ease-out
            ${isHovered
              ? "opacity-100 -translate-y-2 rotate-[25deg]"
              : "opacity-0 translate-y-6 rotate-0"
            }
          `}
          style={{
            width: "72px",
            height: "72px",
            right: "-16px",
            bottom: "28px",
            zIndex: 5,
            filter: "drop-shadow(0 0 10px rgba(255,255,255,0.3))",
            transformOrigin: "bottom center"
          }}
        />

        {/* Main ASCII Logo - CRYPTO RESEARCH */}
        <pre className="text-[8px] sm:text-[10px] leading-tight mb-6 font-mono whitespace-pre relative z-10" suppressHydrationWarning>
          <span className="text-white">{`  ██████╗`}</span><span className="text-[#9046ff]">{` ██████╗ `}</span><span className="text-white">{`██╗   ██╗`}</span><span className="text-[#9046ff]">{` ██████╗ `}</span><span className="text-white">{`████████╗`}</span><span className="text-[#9046ff]">{`  ██████╗ `}</span>{"\n"}
          <span className="text-white">{` ██╔════╝`}</span><span className="text-[#9046ff]">{` ██╔══██╗`}</span><span className="text-white">{`╚██╗ ██╔╝`}</span><span className="text-[#9046ff]">{` ██╔══██╗`}</span><span className="text-white">{`╚══██╔══╝`}</span><span className="text-[#9046ff]">{` ██╔═══██╗`}</span>{"\n"}
          <span className="text-white">{` ██║     `}</span><span className="text-[#9046ff]">{` ██████╔╝`}</span><span className="text-white">{` ╚████╔╝ `}</span><span className="text-[#9046ff]">{` ██████╔╝`}</span><span className="text-white">{`   ██║   `}</span><span className="text-[#9046ff]">{` ██║   ██║`}</span>{"\n"}
          <span className="text-white">{` ██║     `}</span><span className="text-[#9046ff]">{` ██╔══██╗`}</span><span className="text-white">{`  ╚██╔╝  `}</span><span className="text-[#9046ff]">{` ██╔═══╝ `}</span><span className="text-white">{`   ██║   `}</span><span className="text-[#9046ff]">{` ██║   ██║`}</span>{"\n"}
          <span className="text-white">{` ╚██████╗`}</span><span className="text-[#9046ff]">{` ██║  ██║`}</span><span className="text-white">{`   ██║   `}</span><span className="text-[#9046ff]">{` ██║     `}</span><span className="text-white">{`   ██║   `}</span><span className="text-[#9046ff]">{` ╚██████╔╝`}</span>{"\n"}
          <span className="text-white">{`  ╚═════╝`}</span><span className="text-[#9046ff]">{` ╚═╝  ╚═╝`}</span><span className="text-white">{`   ╚═╝   `}</span><span className="text-[#9046ff]">{` ╚═╝     `}</span><span className="text-white">{`   ╚═╝   `}</span><span className="text-[#9046ff]">{`  ╚═════╝ `}</span>{"\n"}
          <span className="text-white">{` ██████╗ `}</span><span className="text-[#9046ff]">{` ███████╗`}</span><span className="text-white">{` ███████╗`}</span><span className="text-[#9046ff]">{` ███████╗`}</span><span className="text-white">{`  █████╗ `}</span><span className="text-[#9046ff]">{` ██████╗  `}</span><span className="text-white">{` ██████╗`}</span><span className="text-[#9046ff]">{` ██╗  ██╗`}</span>{"\n"}
          <span className="text-white">{` ██╔══██╗`}</span><span className="text-[#9046ff]">{` ██╔════╝`}</span><span className="text-white">{` ██╔════╝`}</span><span className="text-[#9046ff]">{` ██╔════╝`}</span><span className="text-white">{` ██╔══██╗`}</span><span className="text-[#9046ff]">{` ██╔══██╗`}</span><span className="text-white">{` ██╔════╝`}</span><span className="text-[#9046ff]">{` ██║  ██║`}</span>{"\n"}
          <span className="text-white">{` ██████╔╝`}</span><span className="text-[#9046ff]">{` █████╗  `}</span><span className="text-white">{` ███████╗`}</span><span className="text-[#9046ff]">{` █████╗  `}</span><span className="text-white">{` ███████║`}</span><span className="text-[#9046ff]">{` ██████╔╝`}</span><span className="text-white">{` ██║     `}</span><span className="text-[#9046ff]">{` ███████║`}</span>{"\n"}
          <span className="text-white">{` ██╔══██╗`}</span><span className="text-[#9046ff]">{` ██╔══╝  `}</span><span className="text-white">{` ╚════██║`}</span><span className="text-[#9046ff]">{` ██╔══╝  `}</span><span className="text-white">{` ██╔══██║`}</span><span className="text-[#9046ff]">{` ██╔══██╗`}</span><span className="text-white">{` ██║     `}</span><span className="text-[#9046ff]">{` ██╔══██║`}</span>{"\n"}
          <span className="text-white">{` ██║  ██║`}</span><span className="text-[#9046ff]">{` ███████╗`}</span><span className="text-white">{` ███████║`}</span><span className="text-[#9046ff]">{` ███████╗`}</span><span className="text-white">{` ██║  ██║`}</span><span className="text-[#9046ff]">{` ██║  ██║`}</span><span className="text-white">{` ╚██████╗`}</span><span className="text-[#9046ff]">{` ██║  ██║`}</span>{"\n"}
          <span className="text-white">{` ╚═╝  ╚═╝`}</span><span className="text-[#9046ff]">{` ╚══════╝`}</span><span className="text-white">{` ╚══════╝`}</span><span className="text-[#9046ff]">{` ╚══════╝`}</span><span className="text-white">{` ╚═╝  ╚═╝`}</span><span className="text-[#9046ff]">{` ╚═╝  ╚═╝`}</span><span className="text-white">{`  ╚═════╝`}</span><span className="text-[#9046ff]">{` ╚═╝  ╚═╝`}</span>
        </pre>
      </div>

      <p className="mb-4 text-base">
        Deep research for the crypto market. Analyze tokens, sentiment, and market trends.
      </p>

      <div className="text-sm space-y-1 mb-6">
        <div>• <span className="text-[#f472b6]">Sentiment analysis</span> from Twitter/X</div>
        <div>• Whale movements and smart money</div>
        <div>• Trending narratives and alpha</div>
      </div>

      <div className="p-3 bg-[#1f1c26] rounded border border-[#3d3850]">
        <span className="text-[#a0a0b0]">try:</span>
        {EXAMPLES.map((example, i) => (
          <button
            key={i}
            onClick={() => onSelectExample(example)}
            className="block mt-2 text-sm text-left transition-colors cursor-pointer text-[#a0a0b0] hover:text-[#f472b6]"
          >
            → "{example}"
          </button>
        ))}
      </div>
    </div>
  );
}
