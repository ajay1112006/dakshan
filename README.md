# 🌱 Dakshan AI - Waste Awareness Chatbot

A clean, production-quality AI-powered waste awareness and sorting web application built with **Next.js (App Router)**, **TypeScript**, and **React**.

Dakshan AI guides users on how to properly separate household waste, divert materials from landfills, follow composting best practices, handle hazardous items and e-waste, and navigate tricky edge cases (such as greasy pizza boxes, batteries, and plastic grocery bags).

---

## 🌟 Key Features

- **End-to-End Chat Interface**: Generous whitespace, restrained eco-palette, crisp message bubbles, auto-scroll, real-time streaming text, and mobile-first responsiveness.
- **Waste Category Expertise**:
  - 🔵 **Recycling**: Rigid plastics (#1, #2, #5), clean cardboard, paper, aluminum/tin cans, glass jars.
  - 🟡 **Compost / Organics**: Food scraps, coffee grounds, eggshells, yard trimmings, unbleached paper napkins.
  - ⚪ **General Landfill**: Multilayer pouches, chip bags, plastic-lined coffee cups, non-recyclables.
  - 🔴 **Hazardous Waste**: Household batteries, lithium cells, paints, chemicals, fluorescent tubes.
  - 🟣 **E-Waste**: Old phones, chargers, computers, cables, circuit boards, small appliances.
- **Essential Edge Cases Handled**:
  - *Greasy pizza boxes*: Greasy/cheese-stained half goes to compost; clean top lid is recycled.
  - *Batteries*: Never in curbside bins (extreme truck fire hazard and heavy metal leaching); must go to dedicated battery drop-off bins.
  - *Plastic bags & films*: Tangling hazard for sorting machinery; take to supermarket return kiosks or reuse.
  - *Broken glass*: Non-recyclable due to distinct chemical melting temperatures; wrap securely for trash.
  - *Styrofoam (#6 EPS)*: Landfill unless municipal densifier drop-off exists.
- **Strict Server-Side Scope Enforcement**: The bot stays strictly on topic. If a user asks about software coding, sports, or unrelated subjects, the bot politely declines and steers the conversation back to waste management.
- **Server-Side System Prompt Protection**: The waste-sorting prompt resides exclusively on the server (`src/lib/system-prompt.ts`) and is never leaked to the client.
- **Swappable GGUF LLM Provider**: Cleanly decoupled module (`src/lib/llm.ts`) connecting via environment variables to any OpenAI-compatible inference server.

---

## 🏗️ Architecture & Project Structure

```
dakshan/
├── .env.example               # Template of all configurable environment variables
├── .env.local                 # Active local environment configuration
├── README.md                  # Comprehensive setup and architectural documentation
├── package.json               # Next.js 16 + React 19 + TypeScript dependencies
├── tsconfig.json              # TypeScript strict configuration
│
└── src/
    ├── app/
    │   ├── api/
    │   │   ├── chat/
    │   │   │   └── route.ts   # Server-side streaming route handler injecting system prompt
    │   │   └── health/
    │   │       └── route.ts   # Endpoint verifying connectivity to the GGUF inference server
    │   ├── globals.css        # Vanilla CSS design system, typography, and eco-theme tokens
    │   ├── layout.tsx         # Root layout with SEO metadata and responsive viewport settings
    │   └── page.tsx           # Home page rendering the ChatInterface
    │
    ├── components/
    │   ├── ChatInterface.tsx  # Central state coordinator: streaming reader, messages, error states
    │   ├── ChatHeader.tsx     # App title, branding, status pill, and session reset button
    │   ├── MessageList.tsx    # Message container with auto-scroll and loading indicators
    │   ├── MessageBubble.tsx  # User vs. Bot bubbles, category badge detection, and copy feature
    │   ├── ChatInput.tsx      # Fixed bottom input bar with auto-resizing textarea and shortcuts
    │   ├── StarterQuestions.tsx # 4 interactive starter prompts and category badges
    │   ├── CategoryPills.tsx  # Visual legend for waste streams (Recycle, Compost, Hazard, etc.)
    │   └── ServerStatusModal.tsx # Diagnostic modal with instructions to run local GGUF servers
    │
    └── lib/
        ├── types.ts           # Shared TypeScript interfaces
        ├── system-prompt.ts   # Server-side waste management guidance and guardrails
        ├── llm.ts            # Swappable OpenAI-compatible LLM streaming client
        └── mock-llm.ts        # Intelligent fallback for instant testing before booting llama.cpp
```

---

## 🤖 Connecting to Your Local GGUF Model

### Assumption
GGUF is a model binary format optimized for quantization and local CPU/GPU execution. GGUF models are typically run using a local inference runtime (such as **llama.cpp**, **Ollama**, or **LM Studio**) that hosts the model and provides an **OpenAI-compatible HTTP chat endpoint** (e.g. `POST /v1/chat/completions`).

The server route handler in this app connects to this endpoint through `src/lib/llm.ts`. Neither the model path nor the server endpoint are hardcoded.

### Option 1: Built-in Integrated llama-server (Active)
Your uploaded **`Qwen3-0.6B-Q8_0.gguf`** model is already configured and ready to run with the included high-speed `llama-server.exe` binary in `tools/llama/`:

```bash
# Start the local inference server with your uploaded GGUF model:
npm run model:start
```
The server binds to `http://127.0.0.1:8080/v1` and `.env.local` is already configured:
```env
LLM_BASE_URL=http://127.0.0.1:8080/v1
LLM_MODEL=Qwen3-0.6B-Q8_0.gguf
ENABLE_OFFLINE_FALLBACK=false
```

### Option 2: Ollama (Alternative)
If you manage GGUF models or standard open-weights models through Ollama:

1. Start Ollama and run your model:
   ```bash
   ollama run mistral
   # or create a model from your custom GGUF using: ollama create my-model -f Modelfile
   ```
2. Set in `.env.local`:
   ```env
   LLM_BASE_URL=http://127.0.0.1:11434/v1
   LLM_MODEL=mistral
   ```

### Option 3: LM Studio
1. Open **LM Studio**, load your GGUF model in the chat tab.
2. Go to the **Local Server** (Developer) tab (`<->`), set port to `1234`, and click **Start Server**.
3. Set in `.env.local`:
   ```env
   LLM_BASE_URL=http://127.0.0.1:1234/v1
   LLM_MODEL=default
   ```

### Option 4: Instant Fallback Awareness Mode
If you run this application before your GGUF server is started, the app includes a fallback mode (`ENABLE_OFFLINE_FALLBACK=true`). It answers waste sorting questions immediately and streams responses so you can test the full UI without needing active model weights running in memory.

---

## ⚙️ Environment Variables

Create or edit `.env.local` at the root of the project:

| Variable | Default | Description |
|---|---|---|
| `LLM_BASE_URL` | `http://127.0.0.1:8080/v1` | Base URL of the OpenAI-compatible GGUF inference server |
| `LLM_MODEL` | `default` | Model identifier passed to the inference server |
| `LLM_API_KEY` | `not-needed` | Optional API key (most local servers do not require one) |
| `LLM_TEMPERATURE` | `0.2` | Sampling temperature (lower = more deterministic & factual) |
| `LLM_TIMEOUT_MS` | `30000` | Request timeout in milliseconds (30 seconds) |
| `ENABLE_OFFLINE_FALLBACK` | `true` | When true, provides local awareness responses if server is offline |

---

## 🚀 Quickstart Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
# Copy the template to .env.local
cp .env.example .env.local
```
Update `LLM_BASE_URL` to point to your local GGUF server if it runs on a custom port.

### 3. Run Locally (Development)
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## 🛡️ Edge Cases & Scope Testing Checklist

You can test the chatbot using the following scenarios:

1. **Greasy Pizza Box**:
   - *Prompt*: "Where does a used pizza box go?"
   - *Expected*: Explains that greasy/cheese-soaked cardboard goes into compost (or trash if no municipal organics collection), while the clean top lid can be torn off and recycled.
2. **Old Batteries**:
   - *Prompt*: "How do I safely dispose of old batteries?"
   - *Expected*: Identifies them as Hazardous Waste. Explains the fire risk in garbage trucks and advises drop-off at hardware stores or municipal collection depots.
3. **Plastic Shopping Bags**:
   - *Prompt*: "Can I put plastic grocery bags in curbside recycling?"
   - *Expected*: Advises against curbside recycling (machinery tangling hazard) and recommends supermarket return bins or reuse.
4. **Off-Topic Refusal**:
   - *Prompt*: "Can you write a Python script for binary search?"
   - *Expected*: Politely states that it is dedicated exclusively to waste management and sorting, and asks how it can help with recycling or composting.
