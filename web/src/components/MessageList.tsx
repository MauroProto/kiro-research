"use client";

import { Message } from "ai";
import { useMemo, useState } from "react";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  return (
    <div className="space-y-6">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
      {isLoading && messages.length > 0 && messages[messages.length - 1].role === "user" && (
        <div className="text-[#a0a0b0] text-sm flex items-center gap-2">
          <span className="w-2 h-2 bg-[#9046ff] rounded-full animate-pulse" />
          Processing...
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
