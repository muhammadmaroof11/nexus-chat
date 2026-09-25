import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, RotateCcw, Palette, Sun, Moon, Monitor } from 'lucide-react';

const PRESETS = [
  {
    id: 'default',
    name: 'General Assistant',
    prompt: 'You are a helpful, friendly, and precise AI assistant. Provide clear, accurate, and concise answers.',
  },
  {
    id: 'coder',
    name: 'Principal Engineer',
    prompt: 'You are a Principal Software Engineer. Provide production-grade, secure, performant, and idiomatic code with clean formatting and architectural reasoning.',
  },
  {
    id: 'tutor',
    name: 'Socratic Tutor',
    prompt: 'You are an inspiring Socratic tutor. Guide the user through problem-solving step-by-step with intuitive explanations and thought-provoking questions.',
  },
  {
    id: 'executive',
    name: 'Executive Brief',
    prompt: 'You are an executive chief of staff. Deliver punchy, high-signal bullet points, ruthless brevity, and clear actionable takeaways without fluff.',
  },
  {
    id: 'scientist',
    name: 'Research Scientist',
    prompt: 'You are a senior research scientist. Provide rigorous, evidence-grounded analysis, formal terminology, LaTeX equations where applicable, and nuanced explanations.',
  },
];

const ACCENTS = [
  { id: 'default', name: 'Nexus Violet', color: '#6366f1' },
  { id: 'emerald', name: 'Quantum Emerald', color: '#10b981' },
  { id: 'rose', name: 'Electric Rose', color: '#f43f5e' },
];

export default function SystemPromptModal({
  isOpen,
  onClose,
  systemPrompt,
  onSave,
  theme,
  onSetTheme,
  accent,
  onSetAccent,
}) {
  const [prompt, setPrompt] = useState(systemPrompt);
  const [activePreset, setActivePreset] = useState('');

  if (!isOpen) return null;

  const handleSelectPreset = (preset) => {
    setActivePreset(preset.id);
    setPrompt(preset.prompt);
  };

  const handleSave = () => {
    onSave(prompt);
    onClose();
  };

  const handleReset = () => {
    setActivePreset('default');
    setPrompt(PRESETS[0].prompt);
  };

  return (
    <AnimatePresence>
      <div className="modal-overlay" onClick={onClose}>
        <motion.div
          className="modal"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} style={{ color: 'var(--accent)' }} />
              <h3>Preferences & Instructions</h3>
            </div>
            <button className="modal-close" onClick={onClose} title="Close">
              <X size={16} />
            </button>
          </div>

          <div className="modal-body">
            {/* Theme Mode Selection */}
            <label className="modal-label">Appearance & Dual-Theme</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                type="button"
                className={`preset-chip ${theme === 'light' ? 'active' : ''}`}
                onClick={() => onSetTheme('light')}
                style={{ display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <Sun size={13} />
                <span>Light Mode</span>
              </button>
              <button
                type="button"
                className={`preset-chip ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => onSetTheme('dark')}
                style={{ display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <Moon size={13} />
                <span>Dark Mode</span>
              </button>
              <button
                type="button"
                className={`preset-chip ${theme === 'system' ? 'active' : ''}`}
                onClick={() => onSetTheme('system')}
                style={{ display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <Monitor size={13} />
                <span>Auto System</span>
              </button>
            </div>

            {/* Accent Theme Selection */}
            {onSetAccent && (
              <>
                <label className="modal-label">Accent Theme</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {ACCENTS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className={`preset-chip ${(accent || 'default') === a.id ? 'active' : ''}`}
                      onClick={() => onSetAccent(a.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: a.color,
                          display: 'inline-block',
                        }}
                      />
                      <span>{a.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <label className="modal-label">Persona Presets</label>
            <div className="preset-chips">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`preset-chip ${activePreset === p.id ? 'active' : ''}`}
                  onClick={() => handleSelectPreset(p)}
                >
                  {p.name}
                </button>
              ))}
            </div>

            <label className="modal-label" style={{ marginTop: 12 }}>
              Custom System Prompt
            </label>
            <textarea
              className="system-prompt-textarea"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setActivePreset('');
              }}
              placeholder="Give instructions to shape the model's tone, expertise, and format…"
              rows={4}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleReset}
                style={{ fontSize: 11, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <RotateCcw size={12} /> Reset default
              </button>
              <div className="char-count">{prompt.length} characters</div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              Save Instructions
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
