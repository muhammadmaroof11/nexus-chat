import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  MessageSquare, Plus, Trash2, MessageCircle,
  Search, Settings, Keyboard, X, PanelLeftClose, PanelLeft,
  Edit2, Check, Sun, Moon, MoreVertical, FileText, Code2, Copy
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Logo from './Logo';

/**
 * Chronological date grouping helper.
 * Categorizes conversations into: "Today", "Yesterday", "Previous 7 Days", "Previous 30 Days", "Older"
 */
export function groupConversationsByDate(conversations) {
  const groups = {
    Today: [],
    Yesterday: [],
    'Previous 7 Days': [],
    'Previous 30 Days': [],
    Older: [],
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const sevenDaysAgo = startOfToday - 6 * 86400000;
  const thirtyDaysAgo = startOfToday - 29 * 86400000;

  conversations.forEach((conv) => {
    let ts = 0;
    if (conv.updated_at) {
      ts = typeof conv.updated_at === 'number' && conv.updated_at < 1e11
        ? conv.updated_at * 1000
        : new Date(conv.updated_at).getTime();
    } else if (conv.created_at) {
      ts = typeof conv.created_at === 'number' && conv.created_at < 1e11
        ? conv.created_at * 1000
        : new Date(conv.created_at).getTime();
    }

    if (ts >= startOfToday) {
      groups.Today.push(conv);
    } else if (ts >= startOfYesterday) {
      groups.Yesterday.push(conv);
    } else if (ts >= sevenDaysAgo) {
      groups['Previous 7 Days'].push(conv);
    } else if (ts >= thirtyDaysAgo) {
      groups['Previous 30 Days'].push(conv);
    } else {
      groups.Older.push(conv);
    }
  });

  return [
    { label: 'Today', items: groups.Today },
    { label: 'Yesterday', items: groups.Yesterday },
    { label: 'Previous 7 Days', items: groups['Previous 7 Days'] },
    { label: 'Previous 30 Days', items: groups['Previous 30 Days'] },
    { label: 'Older', items: groups.Older },
  ].filter((g) => g.items.length > 0);
}

const Sidebar = forwardRef(function Sidebar({
  conversations = [],
  activeConversationId,
  collapsed = false,
  mobileOpen = false,
  onCloseMobile,
  onToggleSidebar,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onExportConversation,
  onClearAll,
  onOpenSettings,
  onOpenShortcuts,
  theme = 'dark',
  onSetTheme,
}, ref) {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuOpenUpward, setMenuOpenUpward] = useState(false);
  const searchInputRef = useRef(null);
  const editInputRef = useRef(null);
  const menuRef = useRef(null);

  // Close 3-dot dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) {
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }
  }, [openMenuId]);

  useImperativeHandle(ref, () => ({
    focusSearch: () => {
      searchInputRef.current?.focus();
    },
  }));

  const filtered = conversations.filter((c) =>
    (c.title || '').toLowerCase().includes(search.toLowerCase())
  );

  const grouped = groupConversationsByDate(filtered);

  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      const val = typeof ts === 'number' && ts < 1e11 ? ts * 1000 : ts;
      return formatDistanceToNow(new Date(val), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const handleCompactSearchClick = () => {
    onToggleSidebar?.();
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 150);
  };

  const startEditing = (e, conv) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditingTitle(conv.title || '');
    setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 50);
  };

  const handleSaveRename = (id) => {
    const trimmed = editingTitle.trim();
    if (trimmed && onRenameConversation) {
      onRenameConversation(id, trimmed);
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const handleRenameKeyDown = (e, id) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveRename(id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelRename();
    }
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    onSetTheme?.(nextTheme);
  };

  const handleToggleMenu = (e, convId) => {
    e.stopPropagation();
    if (openMenuId === convId) {
      setOpenMenuId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const windowH = window.innerHeight;
    setMenuOpenUpward(rect.bottom > windowH - 240);
    setOpenMenuId(convId);
  };

  return (
    <aside className={`sidebar ${collapsed ? 'compact' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Brand & Toggle Header */}
      <div className="sidebar-header">
        {collapsed ? (
          <button
            type="button"
            className="sidebar-toggle-btn compact-toggle"
            onClick={onToggleSidebar}
            title="Expand sidebar (Ctrl+B)"
            id="compact-sidebar-toggle"
          >
            <PanelLeft size={18} />
          </button>
        ) : (
          <div className="sidebar-brand-row">
            <div className="sidebar-brand" onClick={onNewChat} title="NexusChat — New conversation">
              <Logo theme={theme} className="brand-logo-img" />
              <span className="brand-name">NexusChat</span>
            </div>

            <button
              type="button"
              className="sidebar-toggle-btn"
              onClick={onToggleSidebar}
              title="Collapse to icon rail (Ctrl+B)"
              id="sidebar-toggle-btn"
            >
              <PanelLeftClose size={17} />
            </button>
          </div>
        )}

        {/* New Chat Button */}
        <button
          type="button"
          className="new-chat-btn"
          onClick={onNewChat}
          id="new-chat-btn"
          title="New conversation (Ctrl+Shift+O)"
        >
          {collapsed ? (
            <Plus size={18} />
          ) : (
            <>
              <div className="new-chat-left">
                <Plus size={16} />
                <span className="sidebar-label">New conversation</span>
              </div>
              <kbd className="sidebar-shortcut-badge">⌘⇧O</kbd>
            </>
          )}
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
              placeholder="Search chats…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              id="search-conversations"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="search-clear-btn"
                title="Clear search"
              >
                <X size={13} />
              </button>
            ) : (
              <kbd className="search-shortcut-badge">Ctrl K</kbd>
            )}
          </div>
        </div>
      ) : (
        <div className="sidebar-search">
          <button
            type="button"
            className="compact-search-btn"
            onClick={handleCompactSearchClick}
            title="Search conversations (Ctrl+K)"
          >
            <Search size={16} />
          </button>
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
          grouped.map((group) => (
            <div key={group.label} className="conv-group">
              <div className="conv-group-header">{group.label}</div>
              {group.items.map((conv) => {
                const isActive = conv.id === activeConversationId;
                const isEditing = editingId === conv.id;
                const isMenuOpen = openMenuId === conv.id;

                return (
                  <div
                    key={conv.id}
                    className={`conversation-item ${isActive ? 'active' : ''} ${isMenuOpen ? 'menu-active' : ''}`}
                    onClick={() => onSelectConversation(conv.id)}
                    title={collapsed ? conv.title || 'Untitled conversation' : undefined}
                    id={`conv-${conv.id}`}
                  >
                    <MessageSquare size={16} className="conv-icon" />

                    {!collapsed && (
                      <>
                        {isEditing ? (
                          <div className="conv-rename-wrap" onClick={(e) => e.stopPropagation()}>
                            <input
                              ref={editInputRef}
                              className="conv-rename-input"
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => handleRenameKeyDown(e, conv.id)}
                            />
                            <button
                              type="button"
                              className="conv-rename-btn save"
                              onClick={() => handleSaveRename(conv.id)}
                              title="Save title"
                            >
                              <Check size={13} />
                            </button>
                            <button
                              type="button"
                              className="conv-rename-btn cancel"
                              onClick={handleCancelRename}
                              title="Cancel"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="conv-info">
                              <span className="conv-title">{conv.title || 'Untitled'}</span>
                              {conv.updated_at && (
                                <span className="conv-time">{formatTime(conv.updated_at)}</span>
                              )}
                            </div>
                            <div className="conv-actions">
                              <button
                                type="button"
                                className={`conv-menu-btn ${isMenuOpen ? 'menu-open' : ''}`}
                                onClick={(e) => handleToggleMenu(e, conv.id)}
                                title="Chat options"
                              >
                                <MoreVertical size={14} />
                              </button>
                            </div>

                            {/* 3-dot options dropdown menu */}
                            {isMenuOpen && (
                              <div
                                ref={menuRef}
                                className={`conv-dropdown-menu ${menuOpenUpward ? 'open-upward' : ''}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className="conv-dropdown-item"
                                  onClick={(e) => {
                                    setOpenMenuId(null);
                                    startEditing(e, conv);
                                  }}
                                >
                                  <Edit2 size={13} />
                                  <span>Rename</span>
                                </button>

                                <div className="conv-dropdown-divider" />
                                <div className="conv-dropdown-section-title">Export</div>

                                <button
                                  type="button"
                                  className="conv-dropdown-item"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    onExportConversation?.(conv, 'markdown');
                                  }}
                                >
                                  <FileText size={13} />
                                  <span>Export Markdown (.md)</span>
                                </button>

                                <button
                                  type="button"
                                  className="conv-dropdown-item"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    onExportConversation?.(conv, 'json');
                                  }}
                                >
                                  <Code2 size={13} />
                                  <span>Export JSON (.json)</span>
                                </button>

                                <button
                                  type="button"
                                  className="conv-dropdown-item"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    onExportConversation?.(conv, 'copy');
                                  }}
                                >
                                  <Copy size={13} />
                                  <span>Copy to Clipboard</span>
                                </button>

                                <div className="conv-dropdown-divider" />

                                <button
                                  type="button"
                                  className="conv-dropdown-item danger"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    onDeleteConversation(conv.id);
                                  }}
                                >
                                  <Trash2 size={13} />
                                  <span>Delete chat</span>
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Footer - Icon Only Row */}
      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-footer-btn theme-toggle-btn"
          onClick={handleToggleTheme}
          title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
          id="sidebar-theme-toggle"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button
          type="button"
          className="sidebar-footer-btn"
          onClick={onOpenSettings}
          title="Settings & Personas (Ctrl+,)"
          id="sidebar-settings-btn"
        >
          <Settings size={17} />
        </button>

        <button
          type="button"
          className="sidebar-footer-btn"
          onClick={onOpenShortcuts}
          title="Keyboard shortcuts"
          id="sidebar-shortcuts-btn"
        >
          <Keyboard size={17} />
        </button>

        {conversations.length > 0 && (
          <button
            type="button"
            className="sidebar-footer-btn danger"
            onClick={onClearAll}
            title="Clear all conversations"
            id="sidebar-clear-all-btn"
          >
            <Trash2 size={17} />
          </button>
        )}
      </div>
    </aside>
  );
});

export default Sidebar;
