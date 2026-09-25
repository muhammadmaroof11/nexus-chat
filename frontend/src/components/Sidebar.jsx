import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Plus, Trash2, MessageCircle,
  Search, Settings, Keyboard, X, PanelLeftClose, PanelLeft
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const Sidebar = forwardRef(function Sidebar({
  conversations,
  activeConversationId,
  collapsed,
  onToggleSidebar,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onClearAll,
  onOpenSettings,
  onOpenShortcuts,
}, ref) {
  const [search, setSearch] = useState('');
  const searchInputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focusSearch: () => {
      searchInputRef.current?.focus();
    },
  }));

  const filtered = conversations.filter((c) =>
    (c.title || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      return formatDistanceToNow(new Date(ts * 1000), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const handleCompactSearchClick = () => {
    onToggleSidebar();
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 150);
  };

  return (
    <aside className={`sidebar ${collapsed ? 'compact' : ''}`}>
      {/* Brand & Toggle Header */}
      <div className="sidebar-header">
        {collapsed ? (
          <button
            className="sidebar-toggle-btn compact-toggle"
            onClick={onToggleSidebar}
            title="Expand sidebar (Ctrl+B)"
            id="compact-sidebar-toggle"
          >
            <PanelLeft size={17} />
          </button>
        ) : (
          <div className="sidebar-brand-row">
            <div className="sidebar-brand" onClick={onNewChat} title="NexusChat — New conversation">
              <span className="brand-name">NexusChat</span>
            </div>

            <button
              className="sidebar-toggle-btn"
              onClick={onToggleSidebar}
              title="Collapse to icon rail (Ctrl+B)"
              id="sidebar-toggle-btn"
            >
              <PanelLeftClose size={16} />
            </button>
          </div>
        )}

        {/* New Chat Button */}
        <button
          className="new-chat-btn"
          onClick={onNewChat}
          id="new-chat-btn"
          title="New conversation (Ctrl+Shift+O)"
        >
          <Plus size={16} />
          {!collapsed && <span>New conversation</span>}
        </button>
      </div>

      {/* Search Bar or Compact Search Button */}
      {!collapsed ? (
        <div className="sidebar-search">
          <div className="search-wrapper">
            <Search size={14} />
            <input
              ref={searchInputRef}
              className="search-input"
              type="text"
              placeholder="Search chats… (Ctrl+K)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              id="search-conversations"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  display: 'flex',
                  padding: 0,
                  cursor: 'pointer',
                }}
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="sidebar-search">
          <button
            type="button"
            className="search-wrapper"
            onClick={handleCompactSearchClick}
            title="Search conversations (Ctrl+K)"
          >
            <Search size={15} />
          </button>
        </div>
      )}

      {/* Section Label (Full Mode Only) */}
      {!collapsed && filtered.length > 0 && (
        <div className="sidebar-section-label">
          Conversations ({filtered.length})
        </div>
      )}

      {/* Conversation List */}
      <div className="conversation-list">
        {filtered.length === 0 ? (
          <div className="empty-conversations">
            <MessageCircle size={collapsed ? 20 : 28} />
            {!collapsed && <p>{search ? 'No matches' : 'No chats yet'}</p>}
          </div>
        ) : (
          filtered.map((conv) => {
            const isActive = conv.id === activeConversationId;
            return (
              <div
                key={conv.id}
                className={`conversation-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectConversation(conv.id)}
                title={collapsed ? conv.title || 'Untitled conversation' : undefined}
                id={`conv-${conv.id}`}
              >
                <MessageSquare size={16} className="conv-icon" />

                {!collapsed && (
                  <>
                    <div className="conv-info">
                      <span className="conv-title">{conv.title || 'Untitled'}</span>
                      {conv.updated_at && (
                        <span className="conv-time">{formatTime(conv.updated_at)}</span>
                      )}
                    </div>
                    <div className="conv-actions">
                      <button
                        className="conv-action-btn danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conv.id);
                        }}
                        title="Delete conversation"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <button
          className="sidebar-footer-btn"
          onClick={onOpenSettings}
          title="Personas & Instructions (Ctrl+,)"
        >
          <Settings size={15} />
          {!collapsed && <span>Personas</span>}
        </button>

        <button
          className="sidebar-footer-btn"
          onClick={onOpenShortcuts}
          title="Keyboard shortcuts"
        >
          <Keyboard size={15} />
          {!collapsed && <span>Shortcuts</span>}
        </button>

        {conversations.length > 0 && (
          <button
            className="sidebar-footer-btn danger"
            onClick={onClearAll}
            title="Clear all conversations"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </aside>
  );
});

export default Sidebar;
