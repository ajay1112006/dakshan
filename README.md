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

## 🤖 Powered Exclusively by Groq Cloud API

Dakshan AI is powered directly by Groq's ultra-fast LPU inference engine with real-time streaming:

1. Get your free API key at [Groq Console](https://console.groq.com/keys).
2. Add your key to `.env.local` (or in your Vercel project Environment Variables):
   ```env
   GROQ_API_KEY=gsk_your_groq_key_here
   GROQ_MODEL=llama-3.3-70b-versatile
   ```
3. Dakshan AI communicates directly with Groq with ultra-low latency streaming text completions.

---

## ⚙️ Environment Variables

Edit `.env.local` at the root of the project:

| Variable | Default | Description |
|---|---|---|
| `GROQ_API_KEY` | *(required)* | Groq API key from https://console.groq.com/keys |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Groq model name (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`) |
| `LLM_TEMPERATURE` | `0.7` | Sampling temperature for natural conversational flow |
| `LLM_TIMEOUT_MS` | `45000` | Request timeout in milliseconds (45 seconds) |

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
