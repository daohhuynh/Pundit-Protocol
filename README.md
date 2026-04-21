# Pundit Protocol

**Asynchronous multi-agent orchestration and real-time telemetry streaming.**

Pundit Protocol is a distributed, multi-agent debate engine designed to ingest real-time news data and synthesize multi-perspective LLM arguments. It demonstrates advanced handling of asynchronous cross-runtime communication, unidirectional WebSocket streaming, and mutex-locked React DOM manipulation. 

## Decoupled Architecture & IPC Boundary

The system physically isolates the client UI, the HTTP orchestration layer, and the multi-agent reasoning environment, relying on a strict Inter-Process Communication (IPC) pipeline.

* **WebSocket Primary Transport:** The Next.js client maintains a persistent, stateful WebSocket connection (`/ws/debate`) to the FastAPI backend, receiving a continuous stream of typed event frames (overview, turn, summary, error) rather than relying on synchronous HTTP polling.
* **Cross-Runtime Bridging:** The architecture must bridge FastAPI's `async` event loop with the synchronous Fetch.ai uAgents runtime. This is achieved by spawning isolated daemon threads for the agents and passing telemetry via a thread-safe `queue.Queue`. The FastAPI layer utilizes `asyncio.to_thread()` to non-blockingly await queue pulls, preventing the high-frequency WS server from stalling during agent generation.
* **Static Latency Optimization:** The agents bypass the external Fetch.ai Almanac registry entirely. By hardcoding local resolver endpoints (`127.0.0.1:8000`), the system eliminates DNS resolution latency and external network hops on the critical agent-to-agent message bus.

## Asynchronous State & DOM Thrashing Prevention

Standard global state libraries (Redux, Zustand) trigger full component re-renders, causing catastrophic DOM thrashing and UI lockups when hydrating high-frequency WebSocket streams. This frontend drops external state managers entirely in favor of highly optimized `useRef` boundaries.

* **Mutex-Locked Queue Drain:** The incoming WebSocket stream dumps directly into a `useRef` queue. A recursive `setTimeout` loop drains this queue sequentially. A boolean `processingRef` acts as a strict mutex lock—if the drain function is called while already executing, it terminates immediately, serializing all DOM writes.
* **Round-Bucketing Synchronization:** Because the three backend LLM agents process concurrently, their responses arrive out of order. The frontend implements a "Round-Bucketing" pattern, holding incoming turns in `roundBucketsRef`. A flush to the DOM is only triggered when a strict consensus is reached (all agents have responded) or a hard 1200ms timeout is hit, ensuring chronological UI integrity.
* **Typewriter Briefing Gate:** A purely client-side rendering gate (`isBriefingDoneRef`) blocks the primary queue drain loop, polling every 200ms until the initial context briefing animation completes.

## AI Orchestration & Fault Tolerance

LLM endpoints are notoriously unstable under concurrent load. The system implements asymmetric fault tolerance and defensive API routing to prevent cascading system failures.

* **Staggered Dispatch Heuristic:** To prevent immediate HTTP 429 (Resource Exhausted) errors when three agents hit the Gemini 2.5 Flash API simultaneously, the dispatch layer implements a manual token-bucket avoidance stagger. Agents are subjected to hardcoded `asyncio.sleep` delays (0s, 2.5s, 5.0s) to feather the concurrent API load.
* **Asymmetric Retry Logic:** Individual pundit turns operate on a strict SLA; if the Gemini POST request fails, the system catches the exception and injects a deterministic fallback string rather than retrying, maintaining debate momentum. However, the final `_stub_conclusion` synthesis applies a rigid 3-attempt linear backoff (5.0s delay) specifically targeting HTTP 429 errors.
* **Graceful Context Degradation:** If the upstream NewsAPI fails to return context grounding (e.g., network timeout), the orchestration layer catches the `RequestException` and degrades gracefully, returning an empty article list and generating a fallback overview rather than throwing an HTTP 500.
* **Dual-LLM Governance (ChaosEngine):** For experimental agent configurations, the architecture supports a two-tier LLM pipeline: Gemini generates the raw debate content, which is then piped to a `gpt-4o-mini` instance acting strictly as a safety and relevance governor, returning a deterministic boolean flag before the payload is allowed to broadcast.

## Throughput & Execution Constraints

The backend enforces strict numerical boundaries to guarantee system stability:
* **Context Windows:** Pre-processing truncates NewsAPI context strictly at 1,500 characters max, capping at 5 articles to prevent LLM prompt bloat and context-window degradation.
* **Execution Timeouts:** The main `queue.get()` bridge enforces a 120-second timeout (`DEBATE_QUEUE_TIMEOUT`). If the agentic swarm fails to yield an event within this window, the backend gracefully closes the WebSocket with an error frame.
* **LLM Output Clamping:** Client-side rendering clamps agent outputs over 500 characters, requiring manual UI expansion to limit initial DOM paint costs for massive LLM generations.