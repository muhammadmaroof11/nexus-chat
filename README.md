# NexusChat — Ultra-Modern AI Chat System

A high-performance AI chat application built with **React 19**, **Vite**, **FastAPI**, and **Framer Motion**, powered by **Google Gemini** (Gemini 2.5 Flash / Pro) and **Groq LPU / xAI** models.

---

## ✨ Features

- 💎 **Million-Dollar UI & Design System** — Built from scratch with glassmorphic surfaces, subtle glow gradients, dark/light theme switching, and refined typography (Inter & JetBrains Mono).
- ⚡ **Real-Time SSE Streaming** — Token-by-token response rendering with an animated glowing streaming cursor.
- 📐 **LaTeX Math Rendering** — Inline and block math equations rendered with KaTeX (e.g. $E=mc^2$).
- 💻 **Syntax-Highlighted Code Blocks** — Dark prism syntax highlighting with language detection and one-click copy button.
- 🎭 **System Instructions & Personas** — Modal with instant persona presets:
  - *Principal Software Engineer*
  - *Socratic Tutor*
  - *Executive Brief*
  - *Research Scientist*
  - *Custom Persona*
- 🔄 **Regenerate & Edit Messages** — Re-run any response with one click or edit and resend past prompts.
- 📊 **Word & Token Counter** — Real-time character, word, and token estimation badges.
- 💾 **Export Conversations** — One-click export to Markdown (`.md`), JSON (`.json`), or copy full chat to clipboard.
- 🔍 **Live Conversation Search** — Search conversations by title instantly with keyboard shortcut.
- ⌨️ **Keyboard Shortcuts**:
  - `Enter` — Send message
  - `Shift + Enter` — Multi-line prompt
  - `Ctrl / Cmd + Shift + O` — New conversation
  - `Ctrl / Cmd + B` — Toggle sidebar
  - `Ctrl / Cmd + K` — Search conversations
  - `Ctrl / Cmd + ,` — Open system instructions & personas
  - `Esc` — Close dialogs
- 🔔 **Glassmorphic Toast Notifications** — Instant micro-feedback on copy, exports, and settings.
- ⬇️ **Smart Scroll-to-Bottom** — Floating jump button when scrolled up.

---

## 🚀 Architecture

| Layer | Stack |
|-------|-------|
| **Frontend** | React 19, Vite, Framer Motion, KaTeX, Lucide Icons |
| **Backend** | Python 3.12, FastAPI, Uvicorn, SSE Starlette |
| **AI SDKs** | Google GenAI SDK (`google-genai`), OpenAI SDK (`openai` for Groq/xAI) |

---

## 🏃 Quick Start

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows (.venv/bin/activate on Linux/Mac)
pip install -r requirements.txt
```

Verify your `.env` file in `backend/.env`:
```env
GROK_API_KEY=your_groq_or_xai_key
GEMINI_API_KEY=your_gemini_key
```

Start the FastAPI server:
```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5174](http://localhost:5174) in your browser.
