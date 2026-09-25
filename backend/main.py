"""
AI Chat Backend — FastAPI
Supports Groq / xAI and Google Gemini models with real-time SSE streaming.
"""

import os
import uuid
import time
import json
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from openai import OpenAI
from google import genai
from sse_starlette.sse import EventSourceResponse
import asyncio

load_dotenv()

# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="AI Chat API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Clients & Dynamic Provider Detection ─────────────────────────────────────
grok_raw_key = os.getenv("GROK_API_KEY", "").strip()
is_groq = grok_raw_key.startswith("gsk_")

if is_groq:
    openai_compat_client = OpenAI(
        api_key=grok_raw_key,
        base_url="https://api.groq.com/openai/v1",
    )
    OPENAI_COMPAT_MODELS = {
        "openai/gpt-oss-120b": {
            "provider": "grok",
            "model_id": "openai/gpt-oss-120b",
            "label": "GPT OSS 120B (Groq)",
            "description": "Ultra-fast Groq LPU inference",
        },
        "openai/gpt-oss-20b": {
            "provider": "grok",
            "model_id": "openai/gpt-oss-20b",
            "label": "GPT OSS 20B (Groq)",
            "description": "Fast low-latency reasoning",
        },
        "qwen/qwen3.8-27b": {
            "provider": "grok",
            "model_id": "qwen/qwen3.8-27b",
            "label": "Qwen 3.8 27B (Groq)",
            "description": "High performance multilingual & code",
        },
    }
else:
    openai_compat_client = OpenAI(
        api_key=grok_raw_key or "placeholder",
        base_url="https://api.x.ai/v1",
    )
    OPENAI_COMPAT_MODELS = {
        "grok-3": {
            "provider": "grok",
            "model_id": "grok-3",
            "label": "Grok 3",
            "description": "xAI's flagship reasoning model",
        },
        "grok-3-mini": {
            "provider": "grok",
            "model_id": "grok-3-mini",
            "label": "Grok 3 Mini",
            "description": "Fast & efficient model",
        },
    }

gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
gemini_client = genai.Client(api_key=gemini_key)

GEMINI_MODELS = {
    "gemini-2.5-flash": {
        "provider": "gemini",
        "model_id": "gemini-2.5-flash",
        "label": "Gemini 2.5 Flash",
        "description": "Google's fast multimodal model",
    },
    "gemini-2.5-pro": {
        "provider": "gemini",
        "model_id": "gemini-2.5-pro",
        "label": "Gemini 2.5 Pro",
        "description": "Google's most capable reasoning model",
    },
}

MODELS = {**GEMINI_MODELS, **OPENAI_COMPAT_MODELS}

# ── In-memory store ──────────────────────────────────────────────────────────
conversations: dict[str, dict] = {}


# ── Schemas ──────────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[float] = None
    model: Optional[str] = None


class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str
    model: str = "gemini-2.5-flash"
    system_prompt: Optional[str] = "You are a helpful, friendly AI assistant. Be concise and clear."
    stream: bool = True


class ConversationRename(BaseModel):
    title: str


# ── Helpers ──────────────────────────────────────────────────────────────────
def get_or_create_conversation(conv_id: Optional[str], system_prompt: str) -> tuple[str, dict]:
    if conv_id and conv_id in conversations:
        conv = conversations[conv_id]
        if system_prompt:
            conv["system_prompt"] = system_prompt
        return conv_id, conv

    new_id = str(uuid.uuid4())
    conversations[new_id] = {
        "id": new_id,
        "title": "New Chat",
        "created_at": time.time(),
        "updated_at": time.time(),
        "system_prompt": system_prompt or "You are a helpful AI assistant.",
        "messages": [],
    }
    return new_id, conversations[new_id]


def auto_title(message: str) -> str:
    words = message.strip().split()
    title = " ".join(words[:6])
    if len(words) > 6:
        title += "…"
    return title or "Conversation"


def build_openai_messages(conv: dict) -> list[dict]:
    messages = []
    if conv.get("system_prompt"):
        messages.append({"role": "system", "content": conv["system_prompt"]})
    for m in conv.get("messages", []):
        messages.append({"role": m["role"], "content": m["content"]})
    return messages


def build_gemini_contents(conv: dict) -> list[dict]:
    contents = []
    for m in conv.get("messages", []):
        role = "user" if m["role"] == "user" else "model"
        contents.append({"role": role, "parts": [{"text": m["content"]}]})
    return contents


# ── Routes ───────────────────────────────────────────────────────────────────
@app.get("/api/models")
def list_models():
    return {"models": list(MODELS.values())}


@app.get("/api/conversations")
def list_conversations():
    convs = sorted(conversations.values(), key=lambda c: c["updated_at"], reverse=True)
    return {
        "conversations": [
            {
                "id": c["id"],
                "title": c["title"],
                "created_at": c["created_at"],
                "updated_at": c["updated_at"],
                "message_count": len(c["messages"]),
            }
            for c in convs
        ]
    }


@app.get("/api/conversations/{conv_id}")
def get_conversation(conv_id: str):
    if conv_id not in conversations:
        raise HTTPException(404, "Conversation not found")
    return {"conversation": conversations[conv_id]}


@app.delete("/api/conversations/{conv_id}")
def delete_conversation(conv_id: str):
    if conv_id not in conversations:
        raise HTTPException(404, "Conversation not found")
    del conversations[conv_id]
    return {"ok": True}


@app.patch("/api/conversations/{conv_id}")
def rename_conversation(conv_id: str, body: ConversationRename):
    if conv_id not in conversations:
        raise HTTPException(404, "Conversation not found")
    conversations[conv_id]["title"] = body.title
    return {"ok": True}


@app.delete("/api/conversations")
def clear_all_conversations():
    conversations.clear()
    return {"ok": True}


@app.post("/api/chat")
async def chat(req: ChatRequest):
    model_info = MODELS.get(req.model)
    if not model_info:
        # Fallback to default model if requested model key not matched
        fallback_key = list(MODELS.keys())[0]
        model_info = MODELS[fallback_key]
        req.model = fallback_key

    conv_id, conv = get_or_create_conversation(req.conversation_id, req.system_prompt)

    # Append user message
    user_msg = {
        "role": "user",
        "content": req.message,
        "timestamp": time.time(),
        "model": None,
    }
    conv["messages"].append(user_msg)
    conv["updated_at"] = time.time()

    # Auto-title on first turn
    if len(conv["messages"]) == 1:
        conv["title"] = auto_title(req.message)

    if req.stream:
        return EventSourceResponse(
            stream_response(conv_id, conv, model_info, req.model),
            media_type="text/event-stream",
        )
    else:
        full_text = await get_full_response(conv, model_info)
        assistant_msg = {
            "role": "assistant",
            "content": full_text,
            "timestamp": time.time(),
            "model": req.model,
        }
        conv["messages"].append(assistant_msg)
        return {
            "conversation_id": conv_id,
            "message": assistant_msg,
        }


async def stream_response(conv_id: str, conv: dict, model_info: dict, model_key: str):
    """SSE generator for streaming AI responses."""
    provider = model_info["provider"]
    model_id = model_info["model_id"]
    full_text = ""

    try:
        # Metadata event
        yield {"event": "meta", "data": json.dumps({"conversation_id": conv_id})}

        if provider == "grok":
            messages = build_openai_messages(conv)
            stream = openai_compat_client.chat.completions.create(
                model=model_id,
                messages=messages,
                max_tokens=2048,
                stream=True,
            )
            for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    token = chunk.choices[0].delta.content
                    full_text += token
                    yield {"event": "token", "data": json.dumps({"token": token})}
                    await asyncio.sleep(0)

        elif provider == "gemini":
            contents = build_gemini_contents(conv)
            config = {}
            if conv.get("system_prompt"):
                config["system_instruction"] = conv["system_prompt"]

            stream = gemini_client.models.generate_content_stream(
                model=model_id,
                contents=contents,
                config=config if config else None,
            )
            for chunk in stream:
                if chunk.text:
                    token = chunk.text
                    full_text += token
                    yield {"event": "token", "data": json.dumps({"token": token})}
                    await asyncio.sleep(0)

        # Save assistant message
        assistant_msg = {
            "role": "assistant",
            "content": full_text,
            "timestamp": time.time(),
            "model": model_key,
        }
        conv["messages"].append(assistant_msg)
        conv["updated_at"] = time.time()

        yield {"event": "done", "data": json.dumps({"conversation_id": conv_id})}

    except Exception as e:
        yield {"event": "error", "data": json.dumps({"error": str(e)})}


async def get_full_response(conv: dict, model_info: dict) -> str:
    provider = model_info["provider"]
    model_id = model_info["model_id"]

    if provider == "grok":
        messages = build_openai_messages(conv)
        resp = openai_compat_client.chat.completions.create(
            model=model_id,
            messages=messages,
            max_tokens=2048,
        )
        return resp.choices[0].message.content or ""

    elif provider == "gemini":
        contents = build_gemini_contents(conv)
        config = {}
        if conv.get("system_prompt"):
            config["system_instruction"] = conv["system_prompt"]

        resp = gemini_client.models.generate_content(
            model=model_id,
            contents=contents,
            config=config if config else None,
        )
        return resp.text or ""


# ── Health ───────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok", "timestamp": time.time()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
