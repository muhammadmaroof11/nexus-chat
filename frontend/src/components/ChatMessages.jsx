import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Sparkles, Copy, Check, RotateCcw, ArrowDown, Edit3 } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

const MODEL_REGISTRY = {
  'gemini-2.5-flash': { name: 'Gemini 2.5 Flash', provider: 'Google', dotClass: 'gemini' },
  'gemini-2.5-pro': { name: 'Gemini 2.5 Pro', provider: 'Google', dotClass: 'gemini' },
  'openai/gpt-oss-120b': { name: 'GPT OSS 120B', provider: 'Groq', dotClass: 'grok' },
  'openai/gpt-oss-20b': { name: 'GPT OSS 20B', provider: 'Groq', dotClass: 'grok' },
  'qwen/qwen3.8-27b': { name: 'Qwen 3.8 27B', provider: 'Groq', dotClass: 'grok' },
  'grok-3': { name: 'Grok 3', provider: 'xAI', dotClass: 'grok' },
  'grok-3-mini': { name: 'Grok 3 Mini', provider: 'xAI', dotClass: 'grok' },
};

function getModelInfo(modelId) {
  if (!modelId) return { name: 'NexusChat AI', provider: 'AI', dotClass: 'gemini' };
  if (MODEL_REGISTRY[modelId]) return MODEL_REGISTRY[modelId];

  // Dynamic fallback
  if (modelId.startsWith('gemini')) {
    return { name: modelId, provider: 'Google', dotClass: 'gemini' };
  }
  if (modelId.startsWith('openai/') || modelId.startsWith('qwen/')) {
    const raw = modelId.split('/')[1] || modelId;
    return { name: raw.toUpperCase(), provider: 'Groq', dotClass: 'grok' };
  }
  if (modelId.startsWith('grok')) {
    return { name: modelId, provider: 'xAI', dotClass: 'grok' };
  }
  return { name: modelId, provider: 'AI', dotClass: 'gemini' };
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function countWords(str) {
  if (!str) return 0;
  return str.trim().split(/\s+/).filter(Boolean).length;
}

export default function ChatMessages({
  messages,
  streamingContent,
  isStreaming,
  selectedModel,
  onRegenerate,
  onEditMessage,
}) {
  const containerRef = useRef(null);
  const bottomRef = useRef(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const isAutoScrollingRef = useRef(true);

  // Handle scroll detection for the scroll-to-bottom button
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // Show button if more than 140px away from bottom
    const isScrolledUp = distanceToBottom > 140;
    setShowScrollBtn(isScrolledUp);
    isAutoScrollingRef.current = distanceToBottom < 60;
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end',
    });
  }, []);

  // Auto-scroll when messages or streaming content changes, if user is near bottom
  useEffect(() => {
    if (isAutoScrollingRef.current) {
      scrollToBottom(false);
    }
  }, [messages, streamingContent, scrollToBottom]);

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const currentModelInfo = getModelInfo(selectedModel);

  return (
    <div className="chat-area" ref={containerRef} onScroll={handleScroll}>
      <div className="chat-container">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            const modelInfo = getModelInfo(msg.model);
            const words = countWords(msg.content);
            const isLastAssistant = !isUser && i === messages.length - 1;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className={`message-row ${isUser ? 'user' : 'assistant'}`}
                id={`message-${i}`}
              >
                {/* Avatar */}
                <div className="msg-avatar">
                  {isUser ? <User size={15} /> : <Sparkles size={15} />}
                </div>

                {/* Body */}
                <div className="msg-body">
                  {/* Header */}
                  <div className="msg-header">
                    <span className="msg-sender">{isUser ? 'You' : modelInfo.name}</span>
                    {!isUser && msg.model && (
                      <span className="msg-model-badge">
                        {modelInfo.provider}
                      </span>
                    )}
                    {msg.timestamp && (
                      <span className="msg-time">{formatTime(msg.timestamp)}</span>
                    )}
                  </div>

                  {/* Content (No duplicate .msg-content nesting for assistant) */}
                  {isUser ? (
                    <div className="msg-content">
                      <div className="user-bubble" style={{ whiteSpace: 'pre-wrap' }}>
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <MarkdownRenderer content={msg.content} />
                  )}

                  {/* Actions */}
                  <div className="msg-actions">
                    <button
                      type="button"
                      className={`msg-action-btn ${copiedIndex === i ? 'copied' : ''}`}
                      onClick={() => handleCopy(msg.content, i)}
                      title="Copy to clipboard"
                    >
                      {copiedIndex === i ? (
                        <>
                          <Check size={12} /> Copied
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Copy
                        </>
                      )}
                    </button>

                    {isUser && onEditMessage && (
                      <button
                        type="button"
                        className="msg-action-btn"
                        onClick={() => onEditMessage(msg.content, i)}
                        title="Edit and resend"
                      >
                        <Edit3 size={12} /> Edit
                      </button>
                    )}

                    {!isUser && isLastAssistant && onRegenerate && !isStreaming && (
                      <button
                        type="button"
                        className="msg-action-btn"
                        onClick={() => onRegenerate(i)}
                        title="Regenerate this response"
                      >
                        <RotateCcw size={12} /> Regenerate
                      </button>
                    )}

                    {words > 0 && (
                      <span className="token-badge" style={{ marginLeft: 6 }}>
                        {words} words · ~{Math.round(words * 1.3)} tokens
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Live Streaming Message */}
        {isStreaming && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="message-row assistant"
            id="message-streaming"
          >
            <div className="msg-avatar">
              <Sparkles size={15} />
            </div>

            <div className="msg-body">
              <div className="msg-header">
                <span className="msg-sender">{currentModelInfo.name}</span>
                <span className="msg-model-badge">{currentModelInfo.provider}</span>
                <span className="msg-time">Generating…</span>
              </div>

              {streamingContent ? (
                <MarkdownRenderer content={streamingContent} isStreaming={true} />
              ) : (
                <div className="msg-content">
                  <div className="typing-indicator">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      {/* Floating Scroll to Bottom Button (Centered floating pill above composer) */}
      {showScrollBtn && (
        <button
          type="button"
          className="scroll-bottom-btn"
          onClick={() => scrollToBottom(true)}
          title="Scroll to latest messages"
          id="scroll-to-bottom"
        >
          <ArrowDown size={14} />
          <span>Latest messages</span>
        </button>
      )}
    </div>
  );
}
