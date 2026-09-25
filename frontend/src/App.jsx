import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatHeader from './components/ChatHeader';
import ChatMessages from './components/ChatMessages';
import ChatInput from './components/ChatInput';
import WelcomeScreen from './components/WelcomeScreen';
import SystemPromptModal from './components/SystemPromptModal';
import ShortcutsModal from './components/ShortcutsModal';
import Toast from './components/Toast';
import {
  fetchModels,
  fetchConversations,
  fetchConversation,
  deleteConversation,
  clearAllConversations,
  sendMessageStream,
} from './api';

const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful, friendly, and precise AI assistant. Provide clear, accurate, and concise answers.';

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

  // ── Export Utilities ─────────────────────────────────────────────────────
  const getActiveTitle = () => {
    const conv = conversations.find((c) => c.id === activeConversationId);
    return conv ? conv.title : 'NexusChat-Conversation';
  };

  const handleExportMarkdown = () => {
    if (messages.length === 0) return;
    const title = getActiveTitle();
    let md = `# ${title}\n\n`;
    md += `*Exported on ${new Date().toLocaleString()} from NexusChat*\n\n---\n\n`;

    messages.forEach((m) => {
      const sender = m.role === 'user' ? '### 👤 User' : `### 🤖 ${m.model || 'AI Assistant'}`;
      md += `${sender}\n\n${m.content}\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Markdown exported', 'success');
  };

  const handleExportJSON = () => {
    if (messages.length === 0) return;
    const title = getActiveTitle();
    const data = {
      title,
      exported_at: new Date().toISOString(),
      conversation_id: activeConversationId,
      system_prompt: systemPrompt,
      messages,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('JSON exported', 'success');
  };

  const handleCopyChat = () => {
    if (messages.length === 0) return;
    let full = '';
    messages.forEach((m) => {
      const sender = m.role === 'user' ? 'User' : m.model || 'AI';
      full += `[${sender}]:\n${m.content}\n\n`;
    });
    navigator.clipboard.writeText(full.trim());
    addToast('Full conversation copied to clipboard', 'success');
  };

  const showWelcome = messages.length === 0 && !isStreaming;

  return (
    <div className="app-layout">
      <Toast toasts={toasts} onDismiss={dismissToast} />

      <Sidebar
        ref={sidebarRef}
        conversations={conversations}
        activeConversationId={activeConversationId}
        collapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onClearAll={handleClearAll}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      <main className="main-area">
        <ChatHeader
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          theme={theme}
          onSetTheme={handleSetTheme}
          onExportMarkdown={handleExportMarkdown}
          onExportJSON={handleExportJSON}
          onCopyChat={handleCopyChat}
          hasMessages={messages.length > 0}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {showWelcome ? (
          <WelcomeScreen onSelectSuggestion={handleSend} theme={theme} />
        ) : (
          <ChatMessages
            messages={messages}
            streamingContent={streamingContent}
            isStreaming={isStreaming}
            selectedModel={selectedModel}
            onRegenerate={handleRegenerate}
            onEditMessage={handleEditMessage}
          />
        )}

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
