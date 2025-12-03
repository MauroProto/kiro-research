"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "ai/react";
import { TerminalHeader } from "@/components/TerminalHeader";
import { TerminalInput } from "@/components/TerminalInput";
import { MessageList } from "@/components/MessageList";
import { AgentPanel } from "@/components/AgentPanel";
import { useUserId } from "@/hooks/useUserId";

export default function Home() {
  const [showPanel, setShowPanel] = useState(true);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number>(2);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { userId } = useUserId();
  
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, setInput } = useChat({
    api: "/api/research",
    maxSteps: 25,
    body: {
      userId,
    },
    onError: (error) => {
      // Check if it's a rate limit error
      if (error.message.includes('Rate limit') || error.message.includes('429')) {
        setRateLimitError('Has alcanzado el límite de 2 consultas diarias. Vuelve mañana.');
        setRemaining(0);
      }
    },
    onFinish: () => {
      // Decrement remaining after successful request
      setRemaining(prev => Math.max(0, prev - 1));
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="h-screen flex flex-col bg-[#19161d]">
      {/* Header */}
      <TerminalHeader 
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
            <MessageList messages={messages} isLoading={isLoading} />
            {rateLimitError && (
              <div className="text-[#f472b6] text-sm mt-4 p-4 bg-[#f472b6]/10 rounded-lg border border-[#f472b6]/30">
                <div className="font-medium mb-1">Límite alcanzado</div>
                <div className="text-[#a0a0b0]">{rateLimitError}</div>
              </div>
            )}
            {error && !rateLimitError && (
              <div className="text-[#f472b6] text-sm mt-4">
                Error: {error.message}
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
        
        {/* Panel */}
        {showPanel && (
          <div className="w-96 border-l border-[#2a2635] overflow-hidden">
            <AgentPanel isActive={isLoading} messages={messages} />
          </div>
        )}
      </div>
      
    </div>
  );
}

const EXAMPLES = [
  "Climate change is reversible within 50 years",
  "Quantum computers will break encryption by 2030",
  "Mediterranean diet reduces heart disease risk",
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
        {/* Ghost image - peeks out from behind the H */}
        <img 
          src="/ghost.png"
          alt="ghost"
          className={`
            absolute w-20 h-20 object-contain pointer-events-none
            transition-all duration-500 ease-out
            ${isHovered 
              ? "opacity-100 -translate-y-1 rotate-[35deg]" 
              : "opacity-0 translate-y-8 rotate-0"
            }
          `}
          style={{ 
            right: "-15px", 
            top: "-5px",
            zIndex: 5,
            filter: "drop-shadow(0 0 10px rgba(255,255,255,0.3))",
            transformOrigin: "bottom center"
          }}
        />

        {/* Main ASCII Logo - R E S E A R C H */}
        <pre className="text-[10px] sm:text-xs leading-none mb-8 font-mono whitespace-pre relative z-10">
<span className="text-white">{`██████╗ `}</span><span className="text-[#9046ff]">{`███████╗`}</span><span className="text-white">{`███████╗`}</span><span className="text-[#9046ff]">{`███████╗`}</span><span className="text-white">{` █████╗ `}</span><span className="text-[#9046ff]">{`██████╗  `}</span><span className="text-white">{`██████╗`}</span><span className="text-[#9046ff]">{`██╗  ██╗`}</span>{`
`}<span className="text-white">{`██╔══██╗`}</span><span className="text-[#9046ff]">{`██╔════╝`}</span><span className="text-white">{`██╔════╝`}</span><span className="text-[#9046ff]">{`██╔════╝`}</span><span className="text-white">{`██╔══██╗`}</span><span className="text-[#9046ff]">{`██╔══██╗`}</span><span className="text-white">{`██╔════╝`}</span><span className="text-[#9046ff]">{`██║  ██║`}</span>{`
`}<span className="text-white">{`██████╔╝`}</span><span className="text-[#9046ff]">{`█████╗  `}</span><span className="text-white">{`███████╗`}</span><span className="text-[#9046ff]">{`█████╗  `}</span><span className="text-white">{`███████║`}</span><span className="text-[#9046ff]">{`██████╔╝`}</span><span className="text-white">{`██║     `}</span><span className="text-[#9046ff]">{`███████║`}</span>{`
`}<span className="text-white">{`██╔══██╗`}</span><span className="text-[#9046ff]">{`██╔══╝  `}</span><span className="text-white">{`╚════██║`}</span><span className="text-[#9046ff]">{`██╔══╝  `}</span><span className="text-white">{`██╔══██║`}</span><span className="text-[#9046ff]">{`██╔══██╗`}</span><span className="text-white">{`██║     `}</span><span className="text-[#9046ff]">{`██╔══██║`}</span>{`
`}<span className="text-white">{`██║  ██║`}</span><span className="text-[#9046ff]">{`███████╗`}</span><span className="text-white">{`███████║`}</span><span className="text-[#9046ff]">{`███████╗`}</span><span className="text-white">{`██║  ██║`}</span><span className="text-[#9046ff]">{`██║  ██║`}</span><span className="text-white">{`╚██████╗`}</span><span className="text-[#9046ff]">{`██║  ██║`}</span>{`
`}<span className="text-white">{`╚═╝  ╚═╝`}</span><span className="text-[#9046ff]">{`╚══════╝`}</span><span className="text-white">{`╚══════╝`}</span><span className="text-[#9046ff]">{`╚══════╝`}</span><span className="text-white">{`╚═╝  ╚═╝`}</span><span className="text-[#9046ff]">{`╚═╝  ╚═╝`}</span><span className="text-white">{` ╚═════╝`}</span><span className="text-[#9046ff]">{`╚═╝  ╚═╝`}</span>{`
`}<span className="text-white">{` █████╗ `}</span><span className="text-[#9046ff]">{` ██████╗ `}</span><span className="text-white">{`███████╗`}</span><span className="text-[#9046ff]">{`███╗   ██╗`}</span><span className="text-white">{`████████╗`}</span>{`
`}<span className="text-white">{`██╔══██╗`}</span><span className="text-[#9046ff]">{`██╔════╝ `}</span><span className="text-white">{`██╔════╝`}</span><span className="text-[#9046ff]">{`████╗  ██║`}</span><span className="text-white">{`╚══██╔══╝`}</span>{`
`}<span className="text-white">{`███████║`}</span><span className="text-[#9046ff]">{`██║  ███╗`}</span><span className="text-white">{`█████╗  `}</span><span className="text-[#9046ff]">{`██╔██╗ ██║`}</span><span className="text-white">{`   ██║   `}</span>{`
`}<span className="text-white">{`██╔══██║`}</span><span className="text-[#9046ff]">{`██║   ██║`}</span><span className="text-white">{`██╔══╝  `}</span><span className="text-[#9046ff]">{`██║╚██╗██║`}</span><span className="text-white">{`   ██║   `}</span>{`
`}<span className="text-white">{`██║  ██║`}</span><span className="text-[#9046ff]">{`╚██████╔╝`}</span><span className="text-white">{`███████╗`}</span><span className="text-[#9046ff]">{`██║ ╚████║`}</span><span className="text-white">{`   ██║   `}</span>{`
`}<span className="text-white">{`╚═╝  ╚═╝`}</span><span className="text-[#9046ff]">{` ╚═════╝ `}</span><span className="text-white">{`╚══════╝`}</span><span className="text-[#9046ff]">{`╚═╝  ╚═══╝`}</span><span className="text-white">{`   ╚═╝   `}</span>
        </pre>
      </div>

      <p className="mb-4 text-base">
        Hypothesis validation system. Enter a claim to validate with evidence-based research.
      </p>
      
      <div className="text-sm space-y-1 mb-6">
        <div>• Searches for evidence <span className="text-[#4ade80]">FOR</span> and <span className="text-[#f472b6]">AGAINST</span></div>
        <div>• Evaluates source reliability</div>
        <div>• Synthesizes balanced verdict</div>
      </div>
      
      <div className="p-3 bg-[#1f1c26] rounded border border-[#3d3850]">
        <span className="text-[#a0a0b0]">try:</span>
        {EXAMPLES.map((example, i) => (
          <button
            key={i}
            onClick={() => onSelectExample(example)}
            className="block text-[#a0a0b0] mt-2 text-sm text-left hover:text-[#c6a0ff] transition-colors cursor-pointer"
          >
            → "{example}"
          </button>
        ))}
      </div>
    </div>
  );
}
