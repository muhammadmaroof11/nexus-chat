import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Square, X, ChevronDown, Check } from 'lucide-react';

export default function ChatInput({
  text = '',
  setText = () => {},
  onSend = () => {},
  isStreaming = false,
  onStop = () => {},
  models = [],
  selectedModel = 'gemini-2.5-flash',
  onSelectModel = () => {},
}) {
  const textareaRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const safeText = typeof text === 'string' ? text : '';

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      const scrollH = ta.scrollHeight;
      const targetH = Math.min(Math.max(scrollH, 24), 160);
      ta.style.height = `${targetH}px`;
    }
  }, [safeText]);

  // Focus textarea on mount and after streaming stops
  useEffect(() => {
    if (!isStreaming) {
      textareaRef.current?.focus();
    }
  }, [isStreaming]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = safeText.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const wordCount = safeText.trim() ? safeText.trim().split(/\s+/).length : 0;
  const tokenEstimate = Math.round(wordCount * 1.3);

  const currentModel = models.find((m) => m.model_id === selectedModel);
  const geminiModels = models.filter((m) => m.provider === 'gemini');
  const grokModels = models.filter((m) => m.provider === 'grok');

  return (
    <div className="input-area">
      <div className="input-container">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            className="chat-input"
            value={safeText}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message NexusChat… (Shift + Enter for newline)"
            rows={1}
            id="chat-input"
          />

          {/* Bottom Action Bar inside Input Card */}
          <div className="input-action-bar">
            {/* Left: Model Selector Pill */}
            <div className="input-model-selector" ref={dropdownRef}>
              <button
                type="button"
                className="input-model-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                id="input-model-btn"
                title="Change AI model"
              >
                <span className={`model-dot ${currentModel?.provider || ''}`} />
                <span className="model-name">{currentModel?.label || 'Select Model'}</span>
                <ChevronDown size={13} style={{ opacity: 0.6 }} />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    key="input-model-dropdown"
                    className="input-model-dropdown"
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {geminiModels.length > 0 && (
                      <>
                        <div className="model-dropdown-section">Google Gemini</div>
                        {geminiModels.map((m) => (
                          <button
                            key={m.model_id}
                            type="button"
                            className={`model-option ${m.model_id === selectedModel ? 'active' : ''}`}
                            onClick={() => {
                              onSelectModel(m.model_id);
                              setDropdownOpen(false);
                            }}
                          >
                            <span className={`model-dot ${m.provider}`} />
                            <div className="model-option-info">
                              <div className="name">{m.label}</div>
                              <div className="desc">{m.description}</div>
                            </div>
                            {m.model_id === selectedModel && <Check size={14} className="check" />}
                          </button>
                        ))}
                      </>
                    )}

                    {grokModels.length > 0 && (
                      <>
                        <div className="model-dropdown-section">Groq LPU Inference</div>
                        {grokModels.map((m) => (
                          <button
                            key={m.model_id}
                            type="button"
                            className={`model-option ${m.model_id === selectedModel ? 'active' : ''}`}
                            onClick={() => {
                              onSelectModel(m.model_id);
                              setDropdownOpen(false);
                            }}
                          >
                            <span className={`model-dot ${m.provider}`} />
                            <div className="model-option-info">
                              <div className="name">{m.label}</div>
                              <div className="desc">{m.description}</div>
                            </div>
                            {m.model_id === selectedModel && <Check size={14} className="check" />}
                          </button>
                        ))}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right: Actions (Clear, Counter, Send/Stop) */}
            <div className="input-action-right">
              {safeText.length > 0 && (
                <>
                  <span className="token-badge">
                    {safeText.length} chars · ~{tokenEstimate} tokens
                  </span>
                  <button
                    type="button"
                    className="input-clear-btn"
                    onClick={() => setText('')}
                    title="Clear input"
                  >
                    <X size={15} />
                  </button>
                </>
              )}

              {isStreaming ? (
                <button
                  type="button"
                  className="input-btn stop-btn"
                  onClick={onStop}
                  title="Stop generation"
                  id="stop-btn"
                >
                  <Square size={14} fill="currentColor" />
                </button>
              ) : (
                <button
                  type="button"
                  className="input-btn send-btn"
                  onClick={handleSubmit}
                  disabled={!safeText.trim()}
                  title="Send message (Enter)"
                  id="send-btn"
                >
                  <ArrowUp size={16} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="input-footer">
          <div className="input-footer-left">
            <span>Enter to send · Shift+Enter for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
}
