"use client";
import React, { useState, useRef, useEffect } from "react";
import { FiSettings, FiSearch, FiX } from "react-icons/fi";

// --- Types & Interfaces ---
interface Message {
  agentIdx: number;
  content: string;
  timestamp: string;
}

interface Agent {
  name: string;
  color: string;
  bg: string;
  text: string;
  logo: string | null;
  initials?: string;
}

interface Source {
  title: string;
  url: string;
}

// --- Timing Engine ---
const BASE_TYPE_SPEED = 15;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
// WPM is now passed dynamically
const calcReadTime = (text: string, multiplier: number, wpm: number) => ((text.split(" ").length / wpm) * 60000) / multiplier;
const calcTypeTime = (text: string, multiplier: number) => (text.length * BASE_TYPE_SPEED) / multiplier;

// --- Sub-Components ---
const Typewriter = ({ text, speedMs }: { text: string; speedMs: number }) => {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    if (!text) {
      setDisplayed("");
      return;
    }
    if (speedMs < 5) {
      setDisplayed(text);
      return;
    }

    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed((prev) => text.substring(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(interval);
      }
    }, speedMs);

    return () => clearInterval(interval);
  }, [text, speedMs]);

  return <span>{displayed}</span>;
};

// --- Config ---
const agentMetadata: Agent[] = [
  { name: "Jacobin", color: "border-rose-500", bg: "bg-rose-900/20", text: "text-rose-400", logo: "https://logo.clearbit.com/jacobin.com" },
  { name: "WSJ", color: "border-blue-500", bg: "bg-blue-900/20", text: "text-blue-400", logo: "https://logo.clearbit.com/wsj.com" },
  { name: "Fox", color: "border-orange-500", bg: "bg-orange-900/20", text: "text-orange-400", logo: "https://logo.clearbit.com/foxnews.com" },
  { name: "Wired", color: "border-teal-500", bg: "bg-teal-900/20", text: "text-teal-400", logo: "https://logo.clearbit.com/wired.com" },
  { name: "Reuters", color: "border-slate-400", bg: "bg-slate-800/30", text: "text-slate-300", logo: "https://logo.clearbit.com/reuters.com" },
];

const unknownAgent: Agent = { name: "Independent", color: "border-zinc-500", bg: "bg-zinc-800/30", text: "text-zinc-300", logo: null, initials: "IND" };

export default function PunditProtocolPage() {
  // --- UI & Content State ---
  const [topic, setTopic] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAct, setCurrentAct] = useState<number>(0);
  const [liveSource, setLiveSource] = useState(true);
  const [speedMode, setSpeedMode] = useState<"realtime" | "demo">("realtime");  
  const speedMultiplier = speedMode === "demo" ? 10 : 1;

  // --- Settings State ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [wpm, setWpm] = useState<number>(250);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // --- Data State ---
  const [moderatorBrief, setModeratorBrief] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [moderatorSynthesis, setModeratorSynthesis] = useState("");
  const [citedSources, setCitedSources] = useState<Source[]>([]);
  const [activeTypist, setActiveTypist] = useState<number | null>(null);
  const [showChat, setShowChat] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, activeTypist]);

  const handleClearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  // --- Hardcoded Async Mock Engine ---
  const handleInitiateAnalysis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsAnalyzing(true);
    setCurrentAct(1); 
    setMessages([]);
    setCitedSources([]);
    setActiveTypist(null);
    setShowChat(true);

    const runDebateQueue = async () => {
      // Act 1: Briefing
      const briefText = "The topic of AI regulation has sparked global debate. Lawmakers weigh innovation velocity against existential and economic risks.";
      setModeratorBrief(briefText);
      await sleep(calcTypeTime(briefText, speedMultiplier) + (500 / speedMultiplier));

      // Act 2: Debate
      setCurrentAct(2);
      await sleep(600 / speedMultiplier); 

      const debateFlow = [
        { agentIdx: 3, content: "Silicon Valley asserts that heavy-handed oversight will stifle open-source development and cede geopolitical advantage." },
        { agentIdx: 0, content: "That is a corporate shield. Unregulated AI primarily threatens labor markets and centralizes unprecedented power in mega-caps." },
        { agentIdx: 1, content: "We need a scalpel, not a sledgehammer. Sector-specific liability frameworks protect markets better than broad sweeping mandates." },
        { agentIdx: 2, content: "Federal bureaucracies are too slow to regulate this anyway. We shouldn't be creating new three-letter agencies." },
        { agentIdx: 4, content: "EU markets are already deploying the AI Act. Global regulatory divergence is becoming the primary operational friction for enterprise." }
      ];

      for (const msg of debateFlow) {
        setActiveTypist(msg.agentIdx);
        const typingDelay = Math.min(calcTypeTime(msg.content, speedMultiplier) * 0.4, 2500 / speedMultiplier);
        await sleep(typingDelay);

        setActiveTypist(null);
        setMessages((prev) => [...prev, {
          agentIdx: msg.agentIdx,
          content: msg.content,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);

        // Utilizing the dynamic WPM state here
        await sleep(calcReadTime(msg.content, speedMultiplier, wpm));
      }

      // Act 3: Synthesis
      const synthText = "The ecosystem remains highly fragmented. While tech advocates push for agile frameworks, labor and international entities demand stringent safeguards.";
      setModeratorSynthesis(synthText);
      setCitedSources([
        { title: "Wired: The Open Source AI Debate", url: "#" },
        { title: "Reuters: EU AI Act Implementation", url: "#" }
      ]);
      
      setCurrentAct(3);
      setIsAnalyzing(false); 
      setShowChat(false); // <--- BOOM. Auto-collapse fixed.
    };

    runDebateQueue();
  };

  function renderAvatar(agent: Agent) {
    return agent.logo ? (
      <img src={agent.logo} alt={agent.name} className="w-full h-full object-cover rounded-full bg-white p-0.5" />
    ) : (
      <span className={`font-mono font-bold text-lg ${agent.text}`}>{agent.initials}</span>
    );
  }

  return (
    <div className={theme === "light" ? "invert hue-rotate-180" : ""}>
      <main className={`relative min-h-screen w-full flex flex-col items-center transition-all duration-1000 p-0 overflow-x-hidden
        ${!liveSource ? "bg-[#140202]" : "bg-zinc-950"} text-zinc-100 font-sans`}>
        
        {/* --- Settings Modal Overlay --- */}
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm flex flex-col gap-6 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-zinc-100">Settings</h2>
                <button onClick={() => setIsSettingsOpen(false)} className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors">
                  <FiX size={24} />
                </button>
              </div>

              <div className="flex flex-col gap-5">
                {/* WPM Input */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Reading Speed (WPM)</label>
                  <input 
                    type="number" 
                    value={wpm} 
                    onChange={(e) => setWpm(Number(e.target.value) || 250)}
                    min="50"
                    max="1000"
                    className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 outline-none focus:border-indigo-500 transition-colors" 
                  />
                  <p className="text-[10px] text-zinc-500">Determines agent reading pause duration.</p>
                </div>

                {/* Theme Dropdown */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Theme</label>
                  <select 
                    value={theme} 
                    onChange={(e) => setTheme(e.target.value as "dark" | "light")}
                    className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                  >
                    <option value="dark">Dark Mode (Recommended)</option>
                    <option value="light">Light Mode (Beta)</option>
                  </select>
                </div>

                {/* Cache Clearer */}
                <button 
                  onClick={handleClearCache}
                  className="mt-2 w-full py-2.5 rounded-xl bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/40 hover:text-red-300 font-medium transition-all"
                >
                  Clear Browser Cache
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Cog Trigger */}
        <div className="absolute top-6 right-6 z-50">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl border border-transparent hover:border-zinc-800 hover:bg-zinc-900/50 transition-all text-zinc-500 hover:text-zinc-200"
          >
            <FiSettings size={20} />
          </button>
        </div>

        {/* Hero: Dynamic Flex Centering */}
        <section className={`w-full max-w-2xl flex flex-col items-center px-4 transition-all duration-1000 ease-in-out
          ${currentAct === 0 ? "flex-1 justify-center pb-24" : "pt-12 pb-8"}`}>
          
          <h1 className={`text-4xl md:text-5xl font-semibold mb-10 tracking-tight transition-all duration-700
            ${currentAct === 0 ? "opacity-100 scale-100" : "opacity-0 scale-95 h-0 overflow-hidden"}`}>
            Out of the loop?
          </h1>

          <form className={`w-full flex gap-2 rounded-2xl shadow-2xl border px-3 py-2.5 backdrop-blur-md relative z-10 transition-colors
            ${!liveSource ? "border-red-900/50 bg-red-950/10" : "border-zinc-800 bg-zinc-900/40"}`} 
            onSubmit={handleInitiateAnalysis}>
            <div className="flex items-center pl-2 text-zinc-500">
              <FiSearch size={20} />
            </div>
            <input
              className="flex-1 bg-transparent outline-none text-lg px-2 text-zinc-100 placeholder-zinc-600"
              placeholder="Ask away..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isAnalyzing}
            />
            <button
              type="submit"
              disabled={isAnalyzing || !topic.trim()}
              className={`flex items-center justify-center w-28 h-11 rounded-xl font-medium transition-all transform active:scale-95
                ${!liveSource ? "bg-red-600 hover:bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)]" : "bg-indigo-600 hover:bg-indigo-500"} 
                text-white disabled:opacity-50`}
            >
              {isAnalyzing ? (
                <div className="flex gap-1.5 items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
                </div>
              ) : (
                "Debate"
              )}
            </button>
          </form>

          {/* Toggles */}
          <div className="flex items-center gap-6 mt-6 justify-center">
            <div className="flex items-center gap-3">
              <span className="uppercase tracking-widest text-[10px] font-bold text-zinc-500">Source</span>
              <button
                type="button"
                className={`transition-all flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-inner
                  ${liveSource ? "border-blue-500/20 bg-blue-900/10" : "border-red-500/50 bg-red-950/20"}`}
                onClick={() => setLiveSource((v) => !v)}
              >
                <span className={`w-2 h-2 rounded-full ${liveSource ? "bg-blue-400" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"}`}></span>
                <span className={`text-xs font-semibold uppercase ${liveSource ? "text-blue-300" : "text-red-400"}`}>
                  {liveSource ? "News" : "Chaos"}
                </span>
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="uppercase tracking-widest text-[10px] font-bold text-zinc-500">Pacing</span>
              <button
                type="button"
                className={`transition-all flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 shadow-inner 
                  ${speedMode === "demo" ? "border-amber-500/30 bg-amber-900/10" : ""}`}
                onClick={() => setSpeedMode(p => p === "demo" ? "realtime" : "demo")}
              >
                <span className={`w-2 h-2 rounded-full ${speedMode === "demo" ? "bg-amber-400" : "bg-zinc-600"}`}></span>
                <span className={`text-xs font-semibold uppercase ${speedMode === "demo" ? "text-amber-300" : "text-zinc-500"}`}>
                  {speedMode === "demo" ? "Turbo" : "Normal"}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Main Content Area */}
        <section className="w-full max-w-3xl flex flex-col gap-6 px-4 pb-24">
          {currentAct >= 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 w-full bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 flex flex-col gap-3">
              <span className="font-mono text-[10px] font-bold uppercase text-blue-400 tracking-widest">Briefing</span>
              <p className="text-md text-zinc-300 leading-relaxed min-h-[3rem]">
                <Typewriter text={moderatorBrief} speedMs={BASE_TYPE_SPEED / speedMultiplier} />
              </p>
            </div>
          )}

          {currentAct >= 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full">
              {/* Outer container transitions height smoothly */}
              <div className={`w-full rounded-2xl bg-zinc-950/50 border border-zinc-800 shadow-xl relative flex flex-col overflow-hidden transition-all duration-500 ease-in-out ${showChat ? "h-[32rem]" : "h-14"}`}>
                
                {/* Red Debate Header (Locked to h-14) */}
                <div className="flex items-center px-6 h-14 border-b border-zinc-900 bg-zinc-950/80 z-10 shrink-0">
                  <span className="font-mono text-[10px] font-bold uppercase text-red-400 tracking-widest">Debate</span>
                  <button
                    className={`ml-auto px-3 py-1 text-xs rounded-lg transition border border-zinc-800 font-medium ${showChat ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800"}`}
                    onClick={() => setShowChat((v) => !v)}
                  >
                    {showChat ? "Collapse" : "Expand"}
                  </button>
                </div>

                {/* Inner Content Area */}
                <div className={`transition-opacity duration-500 flex-1 overflow-hidden ${showChat ? "opacity-100" : "opacity-0"}`}>
                  <div className="h-full overflow-y-auto px-4 pb-5 pt-6 font-mono scrollbar-hide">
                    <div className="flex flex-col justify-end min-h-full">
                      {messages.map((msg, idx) => {
                        const agent = agentMetadata[msg.agentIdx] || unknownAgent;
                        const isEven = idx % 2 === 0;
                        return (
                          <div className={`flex items-start gap-3 mb-4 ${isEven ? "" : "flex-row-reverse"}`} key={idx}>
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 ${agent.color} ${agent.bg}`}>
                              {renderAvatar(agent)}
                            </div>
                            <div className={`min-w-0 max-w-xl rounded-2xl px-4 py-3 ${agent.bg} border ${agent.color} ${isEven ? 'rounded-tl-sm' : 'rounded-tr-sm'}`}>
                              <div className={`flex items-center gap-2 mb-1 ${isEven ? '' : 'flex-row-reverse'}`}>
                                <span className={`text-xs font-semibold ${agent.text}`}>{agent.name}</span>
                                <span className="text-xs text-zinc-500">{msg.timestamp}</span>
                              </div>
                              <div className="text-sm leading-relaxed">{msg.content}</div>
                            </div>
                          </div>
                        );
                      })}
                      {activeTypist !== null && (
                        <div className={`flex items-end gap-2 mb-4 ${messages.length % 2 === 0 ? "" : "flex-row-reverse"}`}>
                          <div className="w-8 h-8 rounded-full border border-zinc-700 bg-zinc-900 animate-pulse" />
                          <div className="bg-zinc-800/50 px-4 py-3 rounded-2xl flex gap-1 items-center">
                            <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" />
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} className="h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentAct >= 3 && (
            <div className="animate-in fade-in zoom-in-95 duration-700 w-full bg-zinc-900/40 border border-zinc-800 rounded-2xl p-8 flex flex-col gap-4">
              <span className="font-mono text-[10px] font-bold uppercase text-green-400 tracking-widest">Synthesis</span>
              <p className="text-md text-zinc-200 leading-relaxed">
                <Typewriter text={moderatorSynthesis} speedMs={BASE_TYPE_SPEED / speedMultiplier} />
              </p>
              {citedSources.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {citedSources.map((src, i) => (
                    <a key={i} href={src.url} target="_blank" className="text-[10px] font-mono text-zinc-500 hover:text-indigo-400 transition-colors bg-zinc-950/50 px-2 py-1 rounded border border-zinc-800">
                      {src.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}