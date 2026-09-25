import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {toasts.map((t) => {
          const isError = t.type === 'error';
          const isSuccess = t.type === 'success';
          const isInfo = t.type === 'info';

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 16px',
                background: 'var(--bg-surface-raised)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)',
                boxShadow: 'var(--shadow-xl)',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-primary)',
                backdropFilter: 'blur(16px)',
                minWidth: 240,
                maxWidth: 380,
              }}
            >
              {isSuccess && <CheckCircle2 size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />}
              {isError && <AlertCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />}
              {isInfo && <Info size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />}

              <span style={{ flex: 1 }}>{t.message}</span>

              <button
                onClick={() => onDismiss(t.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  padding: 2,
                  display: 'flex',
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
