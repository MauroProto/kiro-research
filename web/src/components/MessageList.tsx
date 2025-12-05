"use client";

import { Message } from "ai";
import { useMemo, useState, useRef, useEffect } from "react";
import type { DegenProgress, AgentId } from "./DegenAgentPanel";
import { TradingViewChart, extractTokenFromQuery } from "./TradingViewChart";
import ReactMarkdown from "react-markdown";

// Agent display names
const DEGEN_AGENT_NAMES: Record<string, string> = {
  twitter: "Twitter Intelligence",
  trending: "Trending Tokens",
  tokenAnalysis: "Token Analysis",
  pumpfun: "Pump.fun Tracker",
  news: "Web3 News",
  dexscreener: "DEX Data",
  aixbt: "Project Analysis",
};

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  progress?: DegenProgress;
}

export function MessageList({ messages, isLoading, progress }: MessageListProps) {
  // Show progress display along with messages
  const showProgress = progress && progress.phase !== 'idle';

  // Get the last user query for chart detection
  const lastUserQuery = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return messages[i].content;
      }
    }
    return undefined;
  }, [messages]);

  return (
    <div className="space-y-6">
      {messages.map((message, index) => {
        // Show progress after the last user message
        const isLastUserMessage = message.role === 'user' &&
          (index === messages.length - 1 || (index === messages.length - 2 && messages[messages.length - 1]?.role === 'assistant'));

        // Skip rendering the last assistant message (it's shown in FinalAnalysisWithChart)
        const isLastAssistant = message.role === 'assistant' &&
          index === messages.length - 1 &&
          showProgress;

        if (isLastAssistant) {
          return null; // Don't render - content is already in FinalAnalysisWithChart
        }

        return (
          <div key={message.id}>
            <MessageItem message={message} />
            {/* Show progress after user message, before or without assistant response */}
            {isLastUserMessage && showProgress && progress && (
              <div className="mt-6">
                <DegenProgressDisplay progress={progress} isLoading={isLoading} userQuery={lastUserQuery} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Scrollable box component with auto-scroll
function ScrollableBox({
  children,
  className = "",
  autoScroll = true,
  maxHeight = "max-h-48",
}: {
  children: React.ReactNode;
  className?: string;
  autoScroll?: boolean;
  maxHeight?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [children, autoScroll]);

  return (
    <div
      ref={scrollRef}
      className={`overflow-y-auto scroll-smooth ${maxHeight} ${className}`}
    >
      {children}
    </div>
  );
}

// Collapsible box component
function CollapsibleBox({
  title,
  badge,
  isActive,
  defaultExpanded = true,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  isActive?: boolean;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-[#2a2635] rounded-lg bg-[#1a171f] overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#221f28] transition-colors"
      >
        <div className="flex items-center gap-2">
          {isActive && (
            <div className="w-2 h-2 border-2 border-[#f472b6] border-t-transparent rounded-full animate-spin" />
          )}
          <span className="text-[#a0a0b0] text-sm font-medium">{title}</span>
          {badge}
        </div>
        <span className="text-[#5a5a6e] text-xs">{isExpanded ? "−" : "+"}</span>
      </button>

      {isExpanded && (
        <div className="border-t border-[#2a2635]">
          {children}
        </div>
      )}
    </div>
  );
}

function DegenProgressDisplay({ progress, isLoading, userQuery }: { progress: DegenProgress; isLoading?: boolean; userQuery?: string }) {
  // Detect token from user query for chart display
  const detectedSymbol = useMemo(() => {
    if (!userQuery) return null;
    return extractTokenFromQuery(userQuery);
  }, [userQuery]);

  // Show chart after agents are done and before/during reasoning
  const showChart = detectedSymbol && (
    progress.phase === 'reasoning' ||
    progress.phase === 'complete' ||
    (progress.phase === 'agents' && Object.values(progress.agentStatuses).every(s => s.status === 'done' || s.status === 'error'))
  );

  return (
    <div className="space-y-4">
      {/* Orchestrator Section - Always visible once started */}
      {(progress.phase !== 'idle') && (
        <CollapsibleBox
          title="Orchestrator"
          isActive={progress.phase === 'orchestrating'}
          badge={
            progress.selectedAgents.length > 0 ? (
              <span className="text-xs bg-[#f472b6]/20 text-[#f472b6] px-2 py-0.5 rounded">
                {progress.selectedAgents.length} agents
              </span>
            ) : progress.phase === 'orchestrating' ? (
              <span className="text-xs bg-[#f472b6]/10 text-[#f472b6] px-2 py-0.5 rounded animate-pulse">
                selecting...
              </span>
            ) : null
          }
        >
          <ScrollableBox className="p-3 bg-[#16131a]" maxHeight="max-h-32">
            {progress.orchestratorReasoning ? (
              <p className="text-xs text-[#8a8a9a] font-mono leading-relaxed whitespace-pre-wrap">
                {progress.orchestratorReasoning}
                {progress.phase === 'orchestrating' && <span className="animate-pulse text-[#f472b6]">|</span>}
              </p>
            ) : (
              <div className="flex items-center gap-2 text-xs text-[#6a6a7a]">
                <span>Analyzing query...</span>
              </div>
            )}
          </ScrollableBox>
        </CollapsibleBox>
      )}

      {/* Agents Section - Always visible once we have agents */}
      {progress.selectedAgents.length > 0 && (
        <div className="border-l-2 border-[#2a2635] pl-4 py-2">
          <div className="text-xs text-[#5a5a6e] mb-3 uppercase tracking-wider">Agents (Sequential)</div>

          <div className="space-y-2">
            {progress.selectedAgents.map((agentId, index) => {
              const status = progress.agentStatuses[agentId];
              const agentName = DEGEN_AGENT_NAMES[agentId] || agentId;
              const isRunning = status?.status === 'running';
              const isRetrying = status?.status === 'retrying';
              const isDone = status?.status === 'done';
              const isError = status?.status === 'error';

              return (
                <div key={agentId} className="flex items-center gap-3">
                  {/* Status indicator */}
                  {(isRunning || isRetrying) ? (
                    <div className={`w-2.5 h-2.5 border-2 ${isRetrying ? 'border-[#fbbf24]' : 'border-[#f472b6]'} border-t-transparent rounded-full animate-spin flex-shrink-0`} />
                  ) : isDone ? (
                    <span className="w-2.5 h-2.5 bg-[#4ade80] rounded-full flex-shrink-0" />
                  ) : isError ? (
                    <span className="w-2.5 h-2.5 bg-[#ef4444] rounded-full flex-shrink-0" />
                  ) : (
                    <span className="w-2.5 h-2.5 bg-[#3a3a4a] rounded-full flex-shrink-0" />
                  )}

                  {/* Index */}
                  <span className="text-[#4a4a5a] text-xs w-4 flex-shrink-0">{index + 1}.</span>

                  {/* Agent name */}
                  <span className={`text-sm font-medium ${
                    isRetrying ? 'text-[#fbbf24]' :
                    isRunning ? 'text-[#f472b6]' :
                    isDone ? 'text-[#4ade80]' :
                    isError ? 'text-[#ef4444]' :
                    'text-[#6a6a7a]'
                  }`}>
                    [{agentName}]
                  </span>

                  {/* Retry badge */}
                  {isRetrying && (
                    <span className="text-[#fbbf24] text-xs bg-[#fbbf24]/10 px-1.5 py-0.5 rounded">
                      retry
                    </span>
                  )}

                  {/* Status text */}
                  {(isRunning || isRetrying) && status.task && (
                    <span className="text-[#7a7a8a] text-xs truncate flex-1">
                      {status.task}
                    </span>
                  )}
                  {isDone && (
                    <span className="text-[#4ade80] text-xs">
                      {status.isRetry ? 'ok (retry)' : 'complete'}
                    </span>
                  )}
                  {isError && (
                    <span className="text-[#ef4444] text-xs truncate flex-1">
                      {status.error || 'failed'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reasoner Section - Shows chain of thought reasoning in collapsible box */}
      {(progress.phase === 'reasoning' || progress.phase === 'complete') && (
        <CollapsibleBox
          title="Reasoner (Chain of Thought)"
          isActive={progress.phase === 'reasoning' && !progress.reasonerContent}
          badge={
            progress.phase === 'reasoning' && !progress.reasonerContent ? (
              <span className="text-xs bg-[#f472b6]/10 text-[#f472b6] px-2 py-0.5 rounded animate-pulse">
                thinking...
              </span>
            ) : progress.phase === 'reasoning' && progress.reasonerContent ? (
              <span className="text-xs bg-[#60a5fa]/10 text-[#60a5fa] px-2 py-0.5 rounded animate-pulse">
                writing...
              </span>
            ) : progress.phase === 'complete' ? (
              <span className="text-xs bg-[#4ade80]/10 text-[#4ade80] px-2 py-0.5 rounded">
                complete
              </span>
            ) : null
          }
        >
          <ScrollableBox className="p-3 bg-[#16131a]" maxHeight="max-h-64" autoScroll={progress.phase === 'reasoning' && !progress.reasonerContent}>
            {progress.reasonerText ? (
              <p className="text-xs text-[#8a8a9a] font-mono leading-relaxed whitespace-pre-wrap">
                {progress.reasonerText}
                {progress.phase === 'reasoning' && !progress.reasonerContent && (
                  <span className="animate-pulse text-[#f472b6]">|</span>
                )}
              </p>
            ) : (
              <div className="space-y-2 text-xs text-[#6a6a7a]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-[#f472b6] border-t-transparent rounded-full animate-spin" />
                  <span>Deep reasoning in progress...</span>
                </div>
                <p className="text-[#5a5a6a] animate-pulse">
                  Analyzing {progress.selectedAgents.length} agent results...
                </p>
              </div>
            )}
          </ScrollableBox>
        </CollapsibleBox>
      )}

      {/* Final Answer Section - Shows streamed content with chart in middle */}
      {(progress.phase === 'reasoning' || progress.phase === 'complete') && progress.reasonerContent && (
        <FinalAnalysisWithChart
          content={progress.reasonerContent}
          phase={progress.phase}
          detectedSymbol={detectedSymbol}
          showChart={!!showChart}
        />
      )}
    </div>
  );
}

// Component to render final analysis with chart embedded in the middle
function FinalAnalysisWithChart({
  content,
  phase,
  detectedSymbol,
  showChart,
}: {
  content: string;
  phase: string;
  detectedSymbol: string | null;
  showChart: boolean;
}) {
  // Track if we've shown the chart already (to avoid re-rendering during stream)
  const [chartShown, setChartShown] = useState(false);
  const [chartInsertPoint, setChartInsertPoint] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Copy content to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Determine when to show chart - after first ## section appears
  useEffect(() => {
    if (!showChart || !detectedSymbol || chartShown) return;

    // Look for a good insertion point (after first ## heading section)
    const match = content.match(/\n## [^\n]+\n[\s\S]{200,}?\n(?=## )/);
    if (match && match.index !== undefined) {
      setChartInsertPoint(match.index + match[0].length);
      setChartShown(true);
    } else if (phase === 'complete' && content.length > 500) {
      // Fallback: show at ~40% when complete
      const splitPoint = Math.floor(content.length * 0.4);
      const nearestNewline = content.indexOf('\n\n', splitPoint);
      if (nearestNewline > 0) {
        setChartInsertPoint(nearestNewline);
      }
      setChartShown(true);
    }
  }, [content, showChart, detectedSymbol, chartShown, phase]);

  const markdownComponents = {
    h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-lg font-bold text-white mb-2">{children}</h1>,
    h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-base font-semibold text-white mt-4 mb-2">{children}</h2>,
    h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-sm font-semibold text-[#a0a0b0] mt-3 mb-1">{children}</h3>,
    p: ({ children }: { children?: React.ReactNode }) => <p className="text-sm text-[#c0c0d0] mb-2 leading-relaxed">{children}</p>,
    ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc list-inside text-sm text-[#c0c0d0] mb-2 space-y-1">{children}</ul>,
    ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal list-inside text-sm text-[#c0c0d0] mb-2 space-y-1">{children}</ol>,
    li: ({ children }: { children?: React.ReactNode }) => <li className="text-sm text-[#c0c0d0]">{children}</li>,
    strong: ({ children }: { children?: React.ReactNode }) => <strong className="text-white font-semibold">{children}</strong>,
    code: ({ children }: { children?: React.ReactNode }) => <code className="bg-[#2a2635] px-1 py-0.5 rounded text-[#f472b6] text-xs">{children}</code>,
    blockquote: ({ children }: { children?: React.ReactNode }) => <blockquote className="border-l-2 border-[#f472b6] pl-3 italic text-[#a0a0b0]">{children}</blockquote>,
  };

  // If we have a chart insert point, split the content
  const firstPart = chartInsertPoint ? content.slice(0, chartInsertPoint) : content;
  const secondPart = chartInsertPoint ? content.slice(chartInsertPoint) : '';

  return (
    <div className="mt-4">
      <div className="text-xs text-[#5a5a6e] mb-2 flex items-center gap-2">
        <span>Final Analysis</span>
        {phase === 'reasoning' && (
          <div className="w-2 h-2 bg-[#60a5fa] rounded-full animate-pulse" />
        )}
      </div>
      <div className="prose prose-invert prose-sm max-w-none">
        {/* First part of content (or all content if no chart) */}
        <ReactMarkdown components={markdownComponents}>
          {firstPart}
        </ReactMarkdown>

        {/* Chart in the middle - only when we've determined insert point */}
        {chartInsertPoint && showChart && detectedSymbol && (
          <div className="my-6 w-[70%]">
            <TradingViewChart symbol={detectedSymbol} height={350} />
          </div>
        )}

        {/* Second part of content */}
        {secondPart && (
          <ReactMarkdown components={markdownComponents}>
            {secondPart}
          </ReactMarkdown>
        )}

        {/* Streaming cursor */}
        {phase === 'reasoning' && (
          <span className="animate-pulse text-[#60a5fa]">|</span>
        )}
      </div>

      {/* Copy button - only show when complete */}
      {phase === 'complete' && (
        <div className="flex justify-end mt-4">
          <button
            onClick={handleCopy}
            className={`p-2 rounded-lg transition-all duration-200 ${
              copied
                ? 'bg-[#4ade80]/20 text-[#4ade80]'
                : 'text-[#6a6a7a] hover:text-white hover:bg-[#2a2635]'
            }`}
            title={copied ? 'Copied!' : 'Copy Analysis'}
          >
            {copied ? (
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const toolInvocations = (message as any).toolInvocations || [];
  const searches = toolInvocations.filter((t: any) => t.toolName === "web_search");
  const directorThinking = toolInvocations.find((t: any) => t.toolName === "analyze_hypothesis");
  const validation = toolInvocations.find((t: any) => t.toolName === "validate_evidence");

  return (
    <div className="space-y-4">
      {isUser ? (
        <div className="flex items-start gap-3">
          <span className="text-[#4ade80]">$</span>
          <span className="text-white">{message.content}</span>
        </div>
      ) : (
        <>
          {/* Director Analysis - show during "call" state too for streaming effect */}
          {directorThinking && (
            <DirectorBox 
              analysis={directorThinking.state === "result" ? directorThinking.result : null} 
              isLoading={directorThinking.state === "call"}
              hypothesis={directorThinking.args?.hypothesis}
            />
          )}
          
          {/* Search Activity */}
          {searches.length > 0 && <SearchActivity searches={searches} />}
          
          {/* Cross-Validation Results */}
          {validation && validation.state === "result" && (
            <ValidationBox validation={validation.result} />
          )}
          
          {/* Main Response */}
          {message.content && <AssistantMessage content={message.content} />}
        </>
      )}
    </div>
  );
}

function DirectorBox({ analysis, isLoading, hypothesis }: { analysis: any; isLoading?: boolean; hypothesis?: string }) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border border-[#3d3850] rounded-lg bg-[#1f1c26] overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#2a2635] transition-colors"
      >
        <div className="flex items-center gap-3">
          {isLoading ? (
            <span className="text-[#c6a0ff] animate-pulse">◆</span>
          ) : (
            <span className="text-[#c6a0ff]">◆</span>
          )}
          <span className="text-white font-medium">Director Analysis</span>
          {isLoading && (
            <span className="text-xs bg-[#9046ff]/20 text-[#9046ff] px-2 py-0.5 rounded animate-pulse">
              analyzing...
            </span>
          )}
          {analysis?.previousResearch?.length > 0 && (
            <span className="text-xs bg-[#c6a0ff]/20 text-[#c6a0ff] px-2 py-0.5 rounded">
              {analysis.previousResearch.length} related hypothesis found
            </span>
          )}
        </div>
        <span className="text-[#5a5a6e]">{isExpanded ? "▼" : "▶"}</span>
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Loading state */}
          {isLoading && (
            <div className="text-sm text-[#a0a0b0] bg-[#19161d] rounded p-3 font-mono text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-[#9046ff] border-t-transparent rounded-full animate-spin" />
                <span>Analyzing hypothesis: "{hypothesis}"</span>
              </div>
              <div className="mt-2 text-[#5a5a6e] animate-pulse">
                Generating search strategy...
              </div>
            </div>
          )}
          
          {/* Reasoning (streamed) */}
          {analysis?.reasoning && (
            <div className="text-sm text-[#a0a0b0] bg-[#19161d] rounded p-3 font-mono text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">
              {analysis.reasoning}
            </div>
          )}
          
          {/* Previous Research */}
          {analysis?.previousResearch?.length > 0 && (
            <div className="border-t border-[#3d3850] pt-3">
              <div className="text-xs text-[#c6a0ff] mb-2">Previous Similar Research</div>
              {analysis.previousResearch.map((h: any, i: number) => (
                <div key={i} className="text-sm bg-[#2a2635] rounded p-2 mb-2">
                  <div className="text-white">"{h.hypothesis}"</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-medium ${
                      h.verdict.includes('VALID') ? 'text-[#c6a0ff]' :
                      h.verdict.includes('REFUTED') ? 'text-[#ff4d6a]' :
                      'text-[#a0a0b0]'
                    }`}>{h.verdict}</span>
                    <span className="text-xs text-[#5a5a6e]">({h.confidence}% confidence)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Search Instructions */}
          {analysis?.searchInstructions && (
            <div className="border-t border-[#3d3850] pt-3">
              <div className="text-xs text-[#a0a0b0] mb-2">Search Strategy</div>
              <div className="grid grid-cols-5 gap-2">
                {analysis.searchInstructions.map((inst: any, i: number) => (
                  <div 
                    key={i} 
                    className="text-xs p-2 rounded text-center bg-[#2a2635] text-[#c6a0ff] border border-[#3d3850]"
                  >
                    {inst.perspective}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ValidationBox({ validation }: { validation: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const v = validation.validation;
  
  const getConfidenceColor = (n: number) => 
    n >= 70 ? '#4ade80' : n >= 50 ? '#c6a0ff' : '#f472b6';

  return (
    <div className="border border-[#3d3850] rounded-lg bg-[#1f1c26] overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#2a2635] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-[#c6a0ff]">⬡</span>
          <span className="text-white font-medium">Cross-Validation</span>
          <span 
            className="text-xs font-bold px-2 py-0.5 rounded"
            style={{ 
              color: getConfidenceColor(v.finalConfidence),
              backgroundColor: `${getConfidenceColor(v.finalConfidence)}20`
            }}
          >
            {v.finalConfidence}% confidence
          </span>
          {v.contradictionsFound > 0 && (
            <span className="text-xs bg-[#f472b6]/20 text-[#f472b6] px-2 py-0.5 rounded">
              {v.contradictionsFound} contradictions
            </span>
          )}
        </div>
        <span className="text-[#5a5a6e]">{isExpanded ? "▼" : "▶"}</span>
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Score Breakdown */}
          <div className="grid grid-cols-4 gap-3 text-xs">
            <ScoreCard label="Consensus" value={v.consensusScore} />
            <ScoreCard label="Source Quality" value={v.sourceQualityScore} />
            <ScoreCard label="Recency" value={v.recencyScore} />
            <ScoreCard label="Evidence Qty" value={v.evidenceQuantityScore} />
          </div>
          
          {/* Contradictions */}
          {v.contradictionDetails?.length > 0 && (
            <div className="border-t border-[#2a2635] pt-3">
              <div className="text-xs text-[#ff4d6a] mb-2">Detected Contradictions</div>
              {v.contradictionDetails.map((c: any, i: number) => (
                <div key={i} className="text-xs bg-[#ff4d6a]/10 rounded p-2 mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-1 rounded ${
                      c.severity === 'high' ? 'bg-[#ff4d6a]/30 text-[#ff4d6a]' :
                      c.severity === 'medium' ? 'bg-[#9046ff]/30 text-[#9046ff]' :
                      'bg-[#5a5a6e]/30 text-[#a0a0b0]'
                    }`}>{c.severity}</span>
                  </div>
                  <div className="text-[#a0a0b0] truncate">{c.claim1.slice(0, 60)}...</div>
                  <div className="text-[#5a5a6e] my-1">vs</div>
                  <div className="text-[#a0a0b0] truncate">{c.claim2.slice(0, 60)}...</div>
                </div>
              ))}
            </div>
          )}
          
          {/* Verdict */}
          <div className="border-t border-[#2a2635] pt-3">
            <div className="text-xs text-[#5a5a6e] mb-1">Verdict</div>
            <div className={`font-bold ${
              validation.verdict.includes('VALID') ? 'text-[#4ade80]' :
              validation.verdict.includes('REFUTED') ? 'text-[#f472b6]' :
              'text-[#a0a0b0]'
            }`}>{validation.verdict}</div>
            <div className="text-xs text-[#a0a0b0] mt-1">{validation.explanation}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? '#4ade80' : value >= 50 ? '#c6a0ff' : '#f472b6';
  
  return (
    <div className="bg-[#2a2635] rounded p-2">
      <div className="text-[#a0a0b0] mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-[#3d3850] rounded overflow-hidden">
          <div 
            className="h-full rounded"
            style={{ width: `${value}%`, backgroundColor: color }}
          />
        </div>
        <span style={{ color }} className="font-medium">{value}%</span>
      </div>
    </div>
  );
}

function SearchActivity({ searches }: { searches: any[] }) {
  const completed = searches.filter(s => s.state === "result");
  const pending = searches.filter(s => s.state === "call");

  return (
    <div className="border-l-2 border-[#3d3850] pl-4 py-2 space-y-3">
      {/* Completed searches first */}
      {completed.map((s, i) => (
        <SearchResultCard key={`done-${i}`} search={s} />
      ))}
      {/* Pending searches at the bottom */}
      {pending.map((s, i) => (
        <div key={`pending-${i}`} className="flex items-center gap-2 text-sm text-[#a0a0b0]">
          <span className="w-2 h-2 bg-[#9046ff] rounded-full animate-pulse" />
          <span className="text-[#9046ff]">[{s.args?.perspective}]</span>
          <span>searching...</span>
        </div>
      ))}
    </div>
  );
}

function SearchResultCard({ search }: { search: any }) {
  const [showAll, setShowAll] = useState(false);
  const sources = search.result?.sources || [];
  const displayedSources = showAll ? sources : sources.slice(0, 3);
  const hasMore = sources.length > 3;
  const isCached = search.result?.cached;

  return (
    <div className="text-sm">
      <div className="flex items-center gap-2 text-[#a0a0b0] mb-2">
        <span className="w-2 h-2 bg-[#c6a0ff] rounded-full" />
        <span className="text-white font-medium">[{search.result?.agent}]</span>
        <span className="text-[#a0a0b0]">{sources.length} sources</span>
        {isCached && (
          <span className="text-xs bg-[#2a2635] text-[#c6a0ff] px-1.5 py-0.5 rounded border border-[#3d3850]">
            cached
          </span>
        )}
      </div>
      
      <div className="ml-4 space-y-1.5">
        {displayedSources.map((src: any, j: number) => (
          <div key={j} className="flex items-start gap-2">
            <span className={`text-xs shrink-0 ${
              src.reliability >= 80 ? 'text-[#c6a0ff]' :
              src.reliability >= 60 ? 'text-[#9046ff]' :
              'text-[#a0a0b0]'
            }`}>
              {src.reliability}%
            </span>
            <a 
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#c6a0ff] hover:underline hover:text-white truncate"
            >
              {src.title}
            </a>
          </div>
        ))}
        
        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-[#a0a0b0] hover:text-white mt-1"
          >
            {showAll ? "▲ Show less" : `▼ Show ${sources.length - 3} more`}
          </button>
        )}
      </div>
    </div>
  );
}

function AssistantMessage({ content }: { content: string }) {
  const html = useMemo(() => formatMarkdown(content), [content]);
  
  return (
    <div className="pl-4 border-l-2 border-[#3d3850]">
      <div 
        className="text-sm text-white leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

function formatMarkdown(content: string): string {
  let html = content;
  
  html = html.replace(/^### (.+)$/gm, '<h4 class="text-white font-semibold mt-5 mb-2">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 class="text-white font-semibold mt-5 mb-3 border-b border-[#2a2635] pb-2">$1</h3>');
  
  // Verdicts with new colors
  html = html.replace(/\*\*(LIKELY VALID)\*\*/g, '<span class="text-[#4ade80] font-bold">LIKELY VALID</span>');
  html = html.replace(/\*\*(LIKELY REFUTED)\*\*/g, '<span class="text-[#f472b6] font-bold">LIKELY REFUTED</span>');
  html = html.replace(/\*\*(MIXED EVIDENCE)\*\*/g, '<span class="text-[#c6a0ff] font-bold">MIXED EVIDENCE</span>');
  html = html.replace(/\*\*(DISPUTED)\*\*/g, '<span class="text-[#f472b6] font-bold">DISPUTED</span>');
  html = html.replace(/\*\*(INCONCLUSIVE)\*\*/g, '<span class="text-[#a0a0b0] font-bold">INCONCLUSIVE</span>');
  html = html.replace(/\*\*(VALID)\*\*/g, '<span class="text-[#4ade80] font-bold">VALID</span>');
  html = html.replace(/\*\*(PARTIALLY VALID)\*\*/g, '<span class="text-[#c6a0ff] font-bold">PARTIALLY VALID</span>');
  html = html.replace(/\*\*(REFUTED)\*\*/g, '<span class="text-[#f472b6] font-bold">REFUTED</span>');
  
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white">$1</strong>');
  html = html.replace(/(https?:\/\/[^\s<\n\)]+)/g, '<a href="$1" target="_blank" class="text-[#9046ff] hover:underline text-xs break-all">$1</a>');
  html = html.replace(/^- (.+)$/gm, '<li class="text-[#a0a0b0] ml-4 my-1">$1</li>');
  
  html = html.replace(/\(Reliability: (\d+)%\)/g, (_, s) => {
    const n = parseInt(s);
    const c = n >= 80 ? '#9046ff' : n >= 60 ? '#a668ff' : '#a0a0b0';
    return `<span class="text-xs" style="color:${c}">(${s}%)</span>`;
  });
  
  html = html.replace(/Confidence: (\d+)%/g, (_, s) => {
    const n = parseInt(s);
    const c = n >= 70 ? '#9046ff' : n >= 50 ? '#a668ff' : '#ff4d6a';
    return `Confidence: <span style="color:${c}" class="font-bold">${s}%</span>`;
  });
  
  html = html.replace(/\n\n/g, '</p><p class="my-3 text-[#a0a0b0]">');
  html = html.replace(/\n/g, '<br/>');
  
  return `<div class="text-[#a0a0b0]"><p>${html}</p></div>`;
}
