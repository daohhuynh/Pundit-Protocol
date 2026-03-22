# Pundit Protocol

An asynchronous, multi-agent orchestration engine that ingests real-time news data and generates autonomous, multi-perspective debate telemetry.

## System Architecture

Pundit Protocol is built on a distributed agent architecture, decoupling the client-facing WebSocket streams from the internal agent processing matrix.

* **The Orchestrator (FastAPI):** Manages the WebSocket connections and acts as a thread-safe bridge between the HTTP layer and the autonomous agent bureau.
* **The Swarm (Fetch.ai uAgents):** A concurrent execution environment where specialized agents (Moderator, Contrarian, Hype Man, Materialist) operate on isolated logical loops.
* **The Intelligence (Gemini 2.5 Flash):** Handles high-speed argument generation and multi-variable context synthesis.
* **The Context Engine (NewsAPI):** Provides real-time, domain-specific data grounding to prevent LLM hallucination during active debate rounds.

## Key Technical Implementations

### 1. Asynchronous Message Passing & Event Queues
To prevent WebSocket blocking during heavy LLM generation, the system utilizes a thread-safe queue.Queue to pass state between the synchronous FastAPI runtime and the asynchronous uAgents environment. The FastAPI server runs on port 8080 while the internal bureau communicates via local resolvers on port 8001.

### 2. Fault Tolerance & Rate Limit Mitigation
Big Tech APIs throttle under rapid multi-agent spin-ups. The Moderator agent implements a robust exponential backoff and retry mechanism. If the Synthesis node hits a 429 Resource Exhausted error from the Google API, the system traps the error, initiates a 5-second cooldown, and automatically re-executes the network request.

### 3. Dynamic Telemetry & UI State Management
The Next.js frontend is optimized for low-latency streaming. To handle the rapid influx of WebSocket packets without thrashing the React DOM, the application relies heavily on useRef for queuing messages (queueRef), managing typing states (activeTypist), and tracking asynchronous round timeouts (roundTimersRef). This ensures the UI remains non-blocking even during heavy data hydration.

### 4. Deterministic Persona Routing
Agent behavior is strictly governed by a configuration matrix (personas.py). Depending on the runtime parameters, agents dynamically hot-swap their base prompts between "MVP", "Sources", or "Chaos" modes before generating content, ensuring systemic alignment without requiring hard reboots of the agent nodes.

## Tech Stack
* **Frontend:** Next.js, React 18, Tailwind CSS, TypeScript
* **Backend:** Python 3.10+, FastAPI, Uvicorn
* **Agent Framework:** Fetch.ai uAgents
* **External APIs:** Google Gemini (LLM), NewsAPI (Data grounding)

## Local Execution Protocol

### Prerequisites
Ensure you have Python 3.10+ and Node.js installed. You will need API keys for Google Gemini and NewsAPI.

### 1. Clone and Configure
`git clone https://github.com/YOUR_USERNAME/pundit-protocol.git`
`cd pundit-protocol`

### 2. Backend Spin-Up
Create a .env file in the ./backend directory with GEMINI_API_KEY and NEWS_API_KEY.
`cd backend`
`pip install -r requirements.txt`
`uvicorn main:app --reload --port 8080`

### 3. Frontend Spin-Up
`cd frontend`
`npm install`
`npm run dev`

The application will be accessible at http://localhost:3000.
