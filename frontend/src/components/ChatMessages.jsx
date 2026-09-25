import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Sparkles, Copy, Check, RotateCcw, ArrowDown, Edit3 } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

const PROVIDER_NAMES = {
  'gemini-2.5-flash': { name: 'Gemini 2.5 Flash', provider: 'Google', dotClass: 'gemini' },
  'gemini-2.5-pro': { name: 'Gemini 2.5 Pro', provider: 'Google', dotClass: 'gemini' },
  'grok-3': { name: 'Grok 3', provider: 'xAI', dotClass: 'grok' },
  'grok-3-mini': { name: 'Grok 3 Mini', provider: 'xAI', dotClass: 'grok' },
};

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
    // Show button if more than 150px away from bottom
    const isScrolledUp = distanceToBottom > 150;
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

  const currentModelInfo = PROVIDER_NAMES[selectedModel] || {
    name: selectedModel,
    provider: 'AI',
    dotClass: '',
  };

  return (
    <div className="chat-area" ref={containerRef} onScroll={handleScroll}>
      <div className="chat-container">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            const modelInfo = PROVIDER_NAMES[msg.model] || {
              name: msg.model || 'AI Assistant',
              provider: 'AI',
              dotClass: '',
            };
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

                  {/* Content */}
                  <div className="msg-content">
                    {isUser ? (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                    ) : (
                      <MarkdownRenderer content={msg.content} />
                    )}
                  </div>

                  {/* Actions */}
                  <div className="msg-actions">
                    <button
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
                        className="msg-action-btn"
                        onClick={() => onEditMessage(msg.content, i)}
                        title="Edit and resend"
                      >
                        <Edit3 size={12} /> Edit
                      </button>
                    )}

                    {!isUser && isLastAssistant && onRegenerate && !isStreaming && (
                      <button
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

              <div className="msg-content">
                {streamingContent ? (
                  <MarkdownRenderer content={streamingContent} isStreaming={true} />
                ) : (
                  <div className="typing-indicator">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBtn && (
        <button
          className="scroll-bottom-btn"
          onClick={() => scrollToBottom(true)}
          title="Scroll to bottom"
          id="scroll-to-bottom"
        >
          <ArrowDown size={16} />
        </button>
      )}
    </div>
  );
}
