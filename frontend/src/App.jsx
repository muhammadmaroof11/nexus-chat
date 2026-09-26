import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeft } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ChatMessages from './components/ChatMessages';
import ChatInput from './components/ChatInput';
import WelcomeScreen from './components/WelcomeScreen';
import SystemPromptModal from './components/SystemPromptModal';
import ShortcutsModal from './components/ShortcutsModal';
import CursorFollow from './components/CursorFollow';
import Toast from './components/Toast';
import {
  fetchModels,
  fetchConversations,
  fetchConversation,
  deleteConversation,
  renameConversation,
  clearAllConversations,
  sendMessageStream,
} from './api';

const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful, friendly, and precise AI assistant. Provide clear, accurate, and concise answers.';

const PERSONA_NAMES = {
  'You are a helpful, friendly, and precise AI assistant. Provide clear, accurate, and concise answers.': 'General Assistant',
  'You are a Principal Software Engineer. Provide production-grade, secure, performant, and idiomatic code with clean formatting and architectural reasoning.': 'Principal Engineer',
  'You are an inspiring Socratic tutor. Guide the user through problem-solving step-by-step with intuitive explanations and thought-provoking questions.': 'Socratic Tutor',
  'You are an executive chief of staff. Deliver punchy, high-signal bullet points, ruthless brevity, and clear actionable takeaways without fluff.': 'Executive Brief',
  'You are a senior research scientist. Provide rigorous, evidence-grounded analysis, formal terminology, LaTeX equations where applicable, and nuanced explanations.': 'Research Scientist',
};

function getPersonaTitle(prompt) {
  if (!prompt) return 'General Assistant';
  const clean = prompt.trim();
  if (PERSONA_NAMES[clean]) return PERSONA_NAMES[clean];
  for (const [key, name] of Object.entries(PERSONA_NAMES)) {
    if (clean.includes(key.slice(0, 30))) return name;
  }
  return 'Custom Persona';
}

// ── Theme & Accent Management ───────────────────────────────────────────────
function getInitialTheme() {
  return localStorage.getItem('nexuschat-theme') || 'dark';
}

function getInitialAccent() {
  return localStorage.getItem('nexuschat-accent') || 'default';
}

function applyTheme(theme) {
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
  localStorage.setItem('nexuschat-theme', theme);
}

function applyAccent(accent) {
  if (accent === 'default') {
    document.documentElement.removeAttribute('data-accent');
  } else {
    document.documentElement.setAttribute('data-accent', accent);
  }
  localStorage.setItem('nexuschat-accent', accent);
}

// ── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [accent, setAccent] = useState(getInitialAccent);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [inputPrompt, setInputPrompt] = useState('');
  const [toasts, setToasts] = useState([]);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(() => {
    return localStorage.getItem('nexuschat-system-prompt') || DEFAULT_SYSTEM_PROMPT;
  });

  const activePersonaName = getPersonaTitle(systemPrompt);

  const sidebarRef = useRef(null);
  const streamControllerRef = useRef(null);
  const pendingConvIdRef = useRef(null);

  // ── Toast Dispatcher ────────────────────────────────────────────────────
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Apply theme & accent on state change
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  // Load models on mount
  useEffect(() => {
    fetchModels()
      .then((mods) => {
        setModels(mods);
        if (mods.length > 0 && !mods.some((m) => m.model_id === selectedModel)) {
          setSelectedModel(mods[0].model_id);
        }
      })
      .catch((err) => {
        console.error('Failed to load models:', err);
        addToast('Could not load models from server', 'error');
      });
  }, [addToast]);

  // Load conversations on mount & after changes
  const refreshConversations = useCallback(async () => {
    try {
      const convs = await fetchConversations();
      setConversations(convs);
    } catch {
      // Silently ignore background refresh errors
    }
  }, []);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  // Load a specific conversation
  const loadConversation = useCallback(
    async (id) => {
      try {
        const conv = await fetchConversation(id);
        setActiveConversationId(id);
        setMessages(conv.messages || []);
      } catch {
        setActiveConversationId(null);
        setMessages([]);
        addToast('Conversation not found', 'error');
      }
    },
    [addToast]
  );

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setStreamingContent('');
    setIsStreaming(false);
    if (streamControllerRef.current) {
      streamControllerRef.current.abort();
      streamControllerRef.current = null;
    }
  };

  const handleSelectConversation = (id) => {
    if (isStreaming) {
      addToast('Please wait for generation to complete', 'warning');
      return;
    }
    loadConversation(id);
  };

  const handleDeleteConversation = async (id) => {
    try {
      await deleteConversation(id);
      if (activeConversationId === id) {
        handleNewChat();
      }
      refreshConversations();
      addToast('Conversation deleted', 'info');
    } catch {
      addToast('Failed to delete conversation', 'error');
    }
  };

  const handleRenameConversation = useCallback(
    async (id, newTitle) => {
      // Optimistic title update
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
      );
      try {
        await renameConversation(id, newTitle);
        addToast('Conversation renamed', 'success');
        refreshConversations();
      } catch (err) {
        console.error('Failed to rename conversation:', err);
        addToast('Failed to rename conversation', 'error');
        refreshConversations();
      }
    },
    [addToast, refreshConversations]
  );

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear all conversations?')) {
      try {
        await clearAllConversations();
        handleNewChat();
        refreshConversations();
        addToast('All conversations cleared', 'info');
      } catch {
        addToast('Failed to clear conversations', 'error');
      }
    }
  };

  const handleSetTheme = (newTheme) => {
    document.documentElement.classList.add('theme-transitioning');
    setTheme(newTheme);
    applyTheme(newTheme);
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 350);
  };

  const handleSetAccent = (newAccent) => {
    setAccent(newAccent);
    applyAccent(newAccent);
    addToast(`Accent updated`, 'info');
  };

  const handleSaveSystemPrompt = (newPrompt) => {
    setSystemPrompt(newPrompt);
    localStorage.setItem('nexuschat-system-prompt', newPrompt);
    addToast('System instructions saved', 'success');
  };

  // ── Keyboard Shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd && e.shiftKey && (e.key === 'O' || e.key === 'o')) {
        e.preventDefault();
        handleNewChat();
        addToast('Started new conversation', 'info');
      } else if (isCtrlOrCmd && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setSidebarCollapsed((prev) => !prev);
      } else if (isCtrlOrCmd && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (sidebarCollapsed) setSidebarCollapsed(false);
        setTimeout(() => sidebarRef.current?.focusSearch(), 100);
      } else if (isCtrlOrCmd && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(true);
      } else if (e.key === 'Escape') {
        setIsSettingsOpen(false);
        setIsShortcutsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarCollapsed, addToast]);

  // ── Core Streaming Send ──────────────────────────────────────────────────
  const executeSend = useCallback(
    (text, existingMessages = messages) => {
      if (isStreaming) return;

      const userMsg = {
        role: 'user',
        content: text,
        timestamp: Date.now() / 1000,
        model: null,
      };

      const updatedMessages = [...existingMessages, userMsg];
      setMessages(updatedMessages);
      setInputPrompt('');
      setIsStreaming(true);
      setStreamingContent('');

      let fullResponse = '';

      const controller = sendMessageStream({
        conversationId: activeConversationId,
        message: text,
        model: selectedModel,
        systemPrompt,
        onToken: (token) => {
          fullResponse += token;
          setStreamingContent(fullResponse);
        },
        onMeta: (meta) => {
          if (meta.conversation_id && !activeConversationId) {
            pendingConvIdRef.current = meta.conversation_id;
          }
        },
        onDone: () => {
          const assistantMsg = {
            role: 'assistant',
            content: fullResponse,
            timestamp: Date.now() / 1000,
            model: selectedModel,
          };
          setMessages([...updatedMessages, assistantMsg]);
          setStreamingContent('');
          setIsStreaming(false);
          streamControllerRef.current = null;

          if (pendingConvIdRef.current) {
            setActiveConversationId(pendingConvIdRef.current);
            pendingConvIdRef.current = null;
          }

          refreshConversations();
        },
        onError: (err) => {
          console.error('Stream error:', err);
          const errorMsg = {
            role: 'assistant',
            content: `⚠️ **Generation Error**: ${err}\n\nPlease verify your API key or model availability.`,
            timestamp: Date.now() / 1000,
            model: selectedModel,
          };
          setMessages([...updatedMessages, errorMsg]);
          setStreamingContent('');
          setIsStreaming(false);
          streamControllerRef.current = null;
          refreshConversations();
          addToast('Failed to generate response', 'error');
        },
      });

      streamControllerRef.current = controller;
    },
    [activeConversationId, isStreaming, selectedModel, systemPrompt, messages, refreshConversations, addToast]
  );

  const handleSend = (text) => {
    executeSend(text, messages);
  };

  const handleStop = () => {
    if (streamControllerRef.current) {
      streamControllerRef.current.abort();
      streamControllerRef.current = null;
    }
    if (streamingContent) {
      const partialMsg = {
        role: 'assistant',
        content: streamingContent + '\n\n*— Generation stopped by user —*',
        timestamp: Date.now() / 1000,
        model: selectedModel,
      };
      setMessages((prev) => [...prev, partialMsg]);
    }
    setStreamingContent('');
    setIsStreaming(false);
    refreshConversations();
    addToast('Generation stopped', 'info');
  };

  // ── Regenerate Response ──────────────────────────────────────────────────
  const handleRegenerate = (assistantIndex) => {
    if (isStreaming) return;

    let lastUserMessage = null;
    for (let i = assistantIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMessage = messages[i].content;
        break;
      }
    }

    if (!lastUserMessage) {
      addToast('No prompt found to regenerate', 'error');
      return;
    }

    const pruned = messages.slice(0, assistantIndex);
    const prior = pruned.slice(0, -1);

    executeSend(lastUserMessage, prior);
  };

  const handleEditMessage = (content) => {
    setInputPrompt(content);
    addToast('Prompt loaded into editor', 'info');
  };

  // ── Generalized Export Utility (Active or Historical Conversation) ───────
  const handleExportConversation = async (conv, format) => {
    try {
      let targetMessages = [];
      let title = conv?.title || 'NexusChat-Conversation';

      if (conv?.id === activeConversationId && messages.length > 0) {
        targetMessages = messages;
      } else if (conv?.id) {
        addToast('Preparing conversation export…', 'info');
        const data = await fetchConversation(conv.id);
        targetMessages = data.messages || [];
        if (data.title) title = data.title;
      }

      if (targetMessages.length === 0) {
        addToast('No messages found to export', 'warning');
        return;
      }

      const safeFilename = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

      if (format === 'markdown') {
        let md = `# ${title}\n\n`;
        md += `*Exported on ${new Date().toLocaleString()} from NexusChat*\n\n---\n\n`;
        targetMessages.forEach((m) => {
          const sender = m.role === 'user' ? '### 👤 User' : `### 🤖 ${m.model || 'AI Assistant'}`;
          md += `${sender}\n\n${m.content}\n\n---\n\n`;
        });
        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeFilename}.md`;
        a.click();
        URL.revokeObjectURL(url);
        addToast('Markdown exported', 'success');
      } else if (format === 'json') {
        const exportData = {
          title,
          exported_at: new Date().toISOString(),
          conversation_id: conv?.id || activeConversationId,
          system_prompt: systemPrompt,
          messages: targetMessages,
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeFilename}.json`;
        a.click();
        URL.revokeObjectURL(url);
        addToast('JSON exported', 'success');
      } else if (format === 'copy') {
        let full = '';
        targetMessages.forEach((m) => {
          const sender = m.role === 'user' ? 'User' : m.model || 'AI';
          full += `[${sender}]:\n${m.content}\n\n`;
        });
        await navigator.clipboard.writeText(full.trim());
        addToast('Transcript copied to clipboard', 'success');
      }
    } catch (err) {
      console.error('Export error:', err);
      addToast('Failed to export conversation', 'error');
    }
  };

  const showWelcome = messages.length === 0 && !isStreaming;

  const handleToggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setMobileSidebarOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  };

  return (
    <div className="app-layout">
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Mobile backdrop */}
      <div
        className={`sidebar-backdrop ${mobileSidebarOpen ? 'visible' : ''}`}
        onClick={() => setMobileSidebarOpen(false)}
        aria-hidden="true"
      />

      <Sidebar
        ref={sidebarRef}
        conversations={conversations}
        activeConversationId={activeConversationId}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onToggleSidebar={handleToggleSidebar}
        onSelectConversation={(id) => {
          handleSelectConversation(id);
          setMobileSidebarOpen(false);
        }}
        onNewChat={() => {
          handleNewChat();
          setMobileSidebarOpen(false);
        }}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onExportConversation={handleExportConversation}
        onClearAll={handleClearAll}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        theme={theme}
        onSetTheme={handleSetTheme}
      />

      <main className="main-area">
        {/* React Bits Interactive Cursor Follow & Splash Animation */}
        <CursorFollow theme={theme} />

        {/* Floating mobile drawer trigger (Gemini style) */}
        <button
          type="button"
          className="mobile-menu-trigger"
          onClick={() => setMobileSidebarOpen(true)}
          title="Open sidebar"
          aria-label="Open sidebar menu"
        >
          <PanelLeft size={18} />
        </button>

        {/* Top-Right Floating Agent Persona Widget with Live Thinking/Signal Indicator */}
        <motion.button
          type="button"
          className="agent-persona-widget"
          onClick={() => setIsSettingsOpen(true)}
          title="Edit Agent Persona & Instructions (Ctrl+,)"
          id="agent-persona-btn"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <div className="agent-signal-box">
            <span className="agent-emoji">{isStreaming ? '⚡' : '🧠'}</span>
            <span className={`agent-signal-ring ${isStreaming ? 'thinking' : ''}`} />
          </div>
          <div className="agent-info">
            <span className="agent-name">{activePersonaName}</span>
            <span className="agent-desc">
              <span className={`live-dot ${isStreaming ? 'thinking' : ''}`} />
              {isStreaming ? 'Thinking…' : 'Persona Active · Edit'}
            </span>
          </div>
        </motion.button>

        <div className="chat-stage">
          <AnimatePresence mode="wait">
            {showWelcome ? (
              <motion.div
                key="stage-welcome"
                className="stage-transition-wrap"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <WelcomeScreen onSelectSuggestion={handleSend} theme={theme} />
              </motion.div>
            ) : (
              <motion.div
                key={`stage-chat-${activeConversationId || 'current'}`}
                className="stage-transition-wrap"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <ChatMessages
                  messages={messages}
                  streamingContent={streamingContent}
                  isStreaming={isStreaming}
                  selectedModel={selectedModel}
                  onRegenerate={handleRegenerate}
                  onEditMessage={handleEditMessage}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Atmospheric bottom scrim overlay (only active during chat stream) */}
          {!showWelcome && <div className="chat-bottom-scrim" aria-hidden="true" />}
        </div>

        <ChatInput
          text={inputPrompt}
          setText={setInputPrompt}
          onSend={handleSend}
          isStreaming={isStreaming}
          onStop={handleStop}
          models={models}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
        />
      </main>

      {/* Modals */}
      <SystemPromptModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        systemPrompt={systemPrompt}
        onSave={handleSaveSystemPrompt}
        theme={theme}
        onSetTheme={handleSetTheme}
        accent={accent}
        onSetAccent={handleSetAccent}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}
