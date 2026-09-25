import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  PanelLeftClose, PanelLeft, Download, Settings,
  FileText, Code2, Copy
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function ChatHeader({
  sidebarCollapsed,
  onToggleSidebar,
  theme,
  onSetTheme,
  onExportMarkdown,
  onExportJSON,
  onCopyChat,
  hasMessages,
  onOpenSettings,
}) {
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="chat-header">
      {/* Mobile-only sidebar toggle; on desktop the toggle is merged directly in the sidebar */}
      <button
        className="header-btn mobile-toggle-btn"
        onClick={onToggleSidebar}
        title="Toggle sidebar"
        id="toggle-sidebar"
      >
        <PanelLeft size={18} />
      </button>

      <div className="header-spacer" />

      <div className="header-group">
        {/* Export Menu */}
        {hasMessages && (
          <div className="export-menu" ref={exportRef}>
            <button
              className="header-btn"
              onClick={() => setExportOpen(!exportOpen)}
              title="Export conversation"
              id="export-btn"
            >
              <Download size={16} />
            </button>

            <AnimatePresence>
              {exportOpen && (
                <motion.div
                  key="export-menu-dropdown"
                  className="export-dropdown"
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                >
                  <button
                    className="export-option"
                    onClick={() => {
                      onExportMarkdown?.();
                      setExportOpen(false);
                    }}
                  >
                    <FileText size={15} />
                    <span>Export Markdown (.md)</span>
                  </button>
                  <button
                    className="export-option"
                    onClick={() => {
                      onExportJSON?.();
                      setExportOpen(false);
                    }}
                  >
                    <Code2 size={15} />
                    <span>Export JSON (.json)</span>
                  </button>
                  <button
                    className="export-option"
                    onClick={() => {
                      onCopyChat?.();
                      setExportOpen(false);
                    }}
                  >
                    <Copy size={15} />
                    <span>Copy to Clipboard</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <button
          className="header-btn"
          onClick={onOpenSettings}
          title="System Instructions & Personas (Ctrl+,)"
          id="settings-btn"
        >
          <Settings size={16} />
        </button>

        <ThemeToggle currentTheme={theme} onSetTheme={onSetTheme} />
      </div>
    </header>
  );
}
