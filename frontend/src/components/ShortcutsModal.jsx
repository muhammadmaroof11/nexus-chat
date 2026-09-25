import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';

const SHORTCUTS = [
  { keys: ['Enter'], desc: 'Send message' },
  { keys: ['Shift', 'Enter'], desc: 'Insert new line' },
  { keys: ['Ctrl', 'Shift', 'O'], desc: 'Start new chat' },
  { keys: ['Ctrl', 'B'], desc: 'Toggle sidebar' },
  { keys: ['Ctrl', 'K'], desc: 'Search conversations' },
  { keys: ['Ctrl', ','], desc: 'System prompt & personas' },
  { keys: ['Esc'], desc: 'Close dialogs' },
];

export default function ShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

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
          style={{ maxWidth: 460 }}
        >
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Keyboard size={18} style={{ color: 'var(--accent)' }} />
              <h3>Keyboard Shortcuts</h3>
            </div>
            <button className="modal-close" onClick={onClose} title="Close">
              <X size={16} />
            </button>
          </div>

          <div className="modal-body">
            <div className="shortcuts-grid">
              {SHORTCUTS.map((item, idx) => (
                <div key={idx} className="shortcut-row">
                  <span className="shortcut-label">{item.desc}</span>
                  <div className="shortcut-keys">
                    {item.keys.map((k, i) => (
                      <kbd key={i} className="kbd">
                        {k === 'Ctrl' && isMac ? '⌘' : k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-primary" onClick={onClose}>
              Got it
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
