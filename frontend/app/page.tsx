"use client";
import React, { useState, useRef, useEffect } from "react";

// --- Timing & Simulation Engine ---
const BASE_WPM = 250;
const BASE_TYPE_SPEED = 15;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const calcReadTime = (text: string, multiplier: number) => ((text.split(" ").length / BASE_WPM) * 60000) / multiplier;
const calcTypeTime = (text: string, multiplier: number) => (text.length * BASE_TYPE_SPEED) / multiplier;

// --- Custom Typewriter Component ---
const Typewriter = ({ text, speedMs }: { text: string; speedMs: number }) => {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed("");
    let i = 0;
    if (speedMs <= 0) {
      setDisplayed(text);
      return;
    }
    const interval = setInterval(() => {
      setDisplayed(text.substring(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, speedMs);
    return () => clearInterval(interval);
  }, [text, speedMs]);

  return <span>{displayed}</span>;
};

// --- Agent Metadata (Scaled to 5) ---
const agentMetadata = [
  { name: "Jacobin (Left)", color: "border-rose-500", bg: "bg-rose-900/20", text: "text-rose-400", logo: "https://logo.clearbit.com/jacobin.com" },
  { name: "WSJ (Center)", color: "border-blue-500", bg: "bg-blue-900/20", text: "text-blue-400", logo: "https://logo.clearbit.com/wsj.com" },
  { name: "Fox (Right)", color: "border-orange-500", bg: "bg-orange-900/20", text: "text-orange-400", logo: "https://logo.clearbit.com/foxnews.com" },
  { name: "Wired (Tech)", color: "border-teal-500", bg: "bg-teal-900/20", text: "text-teal-400", logo: "https://logo.clearbit.com/wired.com" },
  { name: "Reuters (Neutral)", color: "border-slate-400", bg: "bg-slate-800/30", text: "text-slate-300", logo: "https://logo.clearbit.com/reuters.com" },
];
const unknownAgent = { name: "Independent", color: "border-zinc-500", bg: "bg-zinc-800/30", text: "text-zinc-300", logo: null, initials: "IND" };

type Message = { agentIdx: number; content: string; timestamp: string; };

export default function PunditProtocolPage() {
  // --- Core State ---
  const [topic, setTopic] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAct, setCurrentAct] = useState<number>(0);
  
  // --- Settings State ---
  const [liveSource, setLiveSource] = useState(true);
  const [speedMode, setSpeedMode] = useState<"realtime" | "demo">("demo"); // Default to Demo for pitch
  const speedMultiplier = speedMode === "demo" ? 10 : 1;

  // --- Data State ---
  const [moderatorBrief, setModeratorBrief] = useState("Awaiting debate initialization...");
  const [messages, setMessages] = useState<Message[]>([]);
  const [moderatorSynthesis, setModeratorSynthesis] = useState("Awaiting synthesis...");
  const [citedSources, setCitedSources] = useState<{ title: string; url: string }[]>([]);
  
  // --- UI State ---
  const [showChat, setShowChat] = useState(true);
  const [activeTypist, setActiveTypist] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, activeTypist]);

  // --- Async Execution Engine ---
  // --- Live API Execution Engine ---
  const handleInitiateAnalysis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    // 1. Lock UI and reset state
    setIsAnalyzing(true);
    setCurrentAct(0);
    setMessages([]);
    setCitedSources([]);
    setShowChat(true);
    setActiveTypist(null);

    // 2. Open the WebSocket connection to the FastAPI backend
    // IMPORTANT: Ensure this matches the routing in main.py
    const ws = new WebSocket(`ws://localhost:8000/ws/debate?topic=${encodeURIComponent(topic)}`);

    ws.onopen = () => {
      setModeratorBrief(`Compiling baseline context for: ${topic}...`);
      setCurrentAct(1);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Route the incoming payload based on 'type'
      switch (data.type) {
        case "brief":
          setModeratorBrief(data.content);
          break;
        
        case "typing":
          // The backend signals that an agent is generating tokens
          setCurrentAct(2);
          setActiveTypist(data.agentIdx);
          break;

        case "message":
          // The backend yields the completed agent message
          setActiveTypist(null);
          setMessages((prev) => [...prev, {
            agentIdx: data.agentIdx,
            content: data.content,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
          break;

        case "synthesis":
          // The backend completes the debate loop
          setCurrentAct(3);
          setModeratorSynthesis(data.content);
          if (data.sources) setCitedSources(data.sources);
          setIsAnalyzing(false);
          setShowChat(false); 
          ws.close();
          break;
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket Error:", err);
      setModeratorBrief("Network Error: Could not connect to the Fetch.ai Orchestrator.");
      setIsAnalyzing(false);
    };
  };

  // --- Render Helpers ---
  function renderAvatar(agent: any) {
    return agent.logo ? (
      <img src={agent.logo} alt={agent.name} className="w-full h-full object-cover rounded-full bg-white p-0.5" />
    ) : (
      <span className={`font-mono font-bold text-lg ${agent.text}`} title={agent.name}>{agent.initials}</span>
    );
  }

  function renderAgentMessage(message: Message, idx: number) {
    const agent = agentMetadata[message.agentIdx] || unknownAgent;
    const isEven = idx % 2 === 0;
    
    return (
      <div className={`flex items-start gap-3 mb-4 ${isEven ? "" : "flex-row-reverse"}`} key={idx}>
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 ${agent.color} shadow-md ${agent.bg}`}>
          {renderAvatar(agent)}
        </div>
        <div className={`min-w-0 max-w-xl rounded-2xl px-4 py-3 ${agent.bg} border ${agent.color} shadow-sm ${isEven ? 'rounded-tl-sm' : 'rounded-tr-sm'}`}>
          <div className={`flex items-center gap-2 mb-1 ${isEven ? '' : 'flex-row-reverse'}`}>
            <span className={`text-xs font-semibold ${agent.text}`}>{agent.name}</span>
            <span className="text-xs text-zinc-500">{message.timestamp}</span>
          </div>
          <div className="text-sm leading-relaxed">{message.content}</div>
        </div>
      </div>
    );
  }

  function renderTypingIndicator() {
    if (activeTypist === null) return null;
    const agent = agentMetadata[activeTypist] || unknownAgent;
    const isEven = messages.length % 2 === 0;

    return (
      <div className={`flex items-end gap-2 mb-4 ${isEven ? "" : "flex-row-reverse"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${agent.color} shadow-sm ${agent.bg}`}>
          {renderAvatar(agent)}
        </div>
        
        <div className={`bg-zinc-800 border border-zinc-700/50 px-4 py-3 shadow-sm flex items-center gap-1.5 w-fit rounded-2xl ${isEven ? 'rounded-bl-sm' : 'rounded-br-sm'}`}>
          <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }}></div>
          <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }}></div>
          <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }}></div>
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen flex flex-col items-center bg-zinc-950 text-zinc-100 font-sans p-0">
      <section className="w-full pt-12 flex flex-col items-center gap-8">
        
        {/* Top Toggles */}
        <div className="flex items-center gap-6 justify-center">
          {/* Chaos Toggle */}
          <div className="flex items-center gap-3">
            <span className="uppercase tracking-wider text-xs font-bold text-zinc-400">Source:</span>
            <button
              type="button"
              className={`transition flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 shadow-inner ${liveSource ? "ring-1 ring-blue-500/60 bg-blue-950/20" : ""}`}
              onClick={() => setLiveSource((v) => !v)}
            >
              <span className={`w-2 h-2 rounded-full ${liveSource ? "bg-blue-400 animate-pulse shadow-blue-500/40" : "bg-zinc-600"}`}></span>
              <span className={`text-xs font-medium ${liveSource ? "text-blue-300" : "text-zinc-400"}`}>News APIs</span>
            </button>
          </div>
          
          {/* Speed Toggle */}
          <div className="flex items-center gap-3">
            <span className="uppercase tracking-wider text-xs font-bold text-zinc-400">Pacing:</span>
            <button
              type="button"
              className={`transition flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 shadow-inner ${speedMode === "demo" ? "ring-1 ring-amber-500/60 bg-amber-950/20" : ""}`}
              onClick={() => setSpeedMode(prev => prev === "demo" ? "realtime" : "demo")}
            >
              <span className={`w-2 h-2 rounded-full ${speedMode === "demo" ? "bg-amber-400 shadow-amber-500/40" : "bg-zinc-600"}`}></span>
              <span className={`text-xs font-medium ${speedMode === "demo" ? "text-amber-300" : "text-zinc-400"}`}>
                {speedMode === "demo" ? "10x Demo" : "1x Realtime"}
              </span>
            </button>
          </div>
        </div>

        <form className="w-full max-w-xl mx-auto flex gap-2 bg-zinc-900/50 rounded-xl shadow-lg border border-zinc-800 px-3 py-2 backdrop-blur-sm" onSubmit={handleInitiateAnalysis}>
          <input
            className="flex-1 bg-transparent outline-none text-lg px-2 text-zinc-100 placeholder-zinc-600"
            placeholder="Enter debate topic..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={isAnalyzing}
            autoFocus
          />
          <button
            type="submit"
            disabled={isAnalyzing || !topic.trim()}
            className="flex items-center px-5 py-2 font-mono font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow ring-1 ring-indigo-500/40 transition"
          >
            {isAnalyzing ? "Executing..." : "Analyze"}
          </button>
        </form>
      </section>

      <section className="w-full max-w-3xl flex flex-col gap-6 mt-8 px-2 pb-16">
        
        {currentAct >= 1 && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500 ease-out w-full bg-zinc-900 border border-zinc-800 rounded-2xl shadow-lg p-6 flex flex-col gap-2">
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center gap-2 font-mono text-indigo-400 text-xs font-bold uppercase tracking-wider">
                Moderator Brief
              </span>
            </div>
            <p className="text-md text-zinc-300 leading-relaxed min-h-[3rem]">
               <Typewriter text={moderatorBrief} speedMs={BASE_TYPE_SPEED / speedMultiplier} />
            </p>
          </div>
        )}

        {currentAct >= 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 ease-out w-full rounded-2xl bg-zinc-950 border border-zinc-800 shadow-lg relative overflow-hidden flex flex-col">
            <div className="flex items-center px-4 py-3 border-b border-zinc-900 bg-zinc-950/80 z-10">
              <span className="font-mono text-xs font-bold uppercase text-zinc-500 tracking-widest">Live War Room</span>
              <button
                className={`ml-auto px-3 py-1 text-xs rounded-lg transition border border-zinc-800 font-medium ${showChat ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800"}`}
                onClick={() => setShowChat((v) => !v)}
              >
                {showChat ? "Collapse Logs" : "Expand Logs"}
              </button>
            </div>
            
            <div className={`transition-all duration-500 ease-in-out ${showChat ? "h-[32rem] opacity-100" : "h-0 opacity-0"}`}>
              <div className="h-full overflow-y-auto px-4 pb-5 pt-6 font-mono scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                <div className="relative flex flex-col justify-end min-h-full">
                  {messages.length === 0 && !isAnalyzing && (
                    <div className="text-zinc-600 text-center py-8 text-sm uppercase tracking-widest absolute inset-0 flex items-center justify-center">System Idle.</div>
                  )}
                  {messages.map((msg, idx) => renderAgentMessage(msg, idx))}
                  {renderTypingIndicator()}
                  <div ref={messagesEndRef} className="h-4" />
                </div>
              </div>
            </div>
          </div>
        )}

        {currentAct >= 3 && (
          <div className="animate-in fade-in zoom-in-95 duration-700 ease-out w-full bg-zinc-900 border border-zinc-800 rounded-2xl shadow-lg p-6 flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 font-mono text-green-400 text-xs font-bold uppercase tracking-wider">
                Moderator Synthesis
              </span>
            </div>
            <p className="text-md text-zinc-300 leading-relaxed min-h-[3rem]">
               <Typewriter text={moderatorSynthesis} speedMs={BASE_TYPE_SPEED / speedMultiplier} />
            </p>
            
            {citedSources.length > 0 && (
              <div className="mt-4 animate-in fade-in duration-700 delay-300 fill-mode-both">
                <span className="block text-zinc-500 text-xs uppercase font-bold mb-3 tracking-wider">Source Material</span>
                <ul className="flex flex-wrap gap-3">
                  {citedSources.map((src, idx) => (
                    <li key={idx}>
                      <a href={src.url} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-blue-400 hover:text-blue-300 transition bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800 flex items-center gap-2">
                        {src.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}