import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { apiClient } from '../api/client';
import { panelTransition, panelVariants } from '../lib/motion';
import { labelForPath } from '../config/navigation';

interface Message {
  id: number;
  fromUser: number;
  toUser: number;
  title: string;
  content: string;
  isRead: number;
  createTime: string;
}

interface HeaderProps {
  mobileNavOpen: boolean;
  onToggleMobileNav: () => void;
  desktopSidebarOpen: boolean;
}

interface SearchResult {
  id: string | number;
  type: 'competition';
  name: string;
  level?: string;
  status?: string;
}

export default function Header({ mobileNavOpen, onToggleMobileNav, desktopSidebarOpen }: HeaderProps) {
  const user = useStore((s) => s.currentUser);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const location = useLocation();
  const navigate = useNavigate();
  const title = labelForPath(location.pathname);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced search with AbortController to prevent race conditions
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (searchQuery.trim().length < 1) {
      setSearchResults([]);
      setSearchOpen(false);
      setActiveIndex(-1);
      return;
    }
    setSearchLoading(true);
    searchTimer.current = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      try {
        const data: any = await apiClient.get('/competition/list', {
          params: { current: 1, size: 5, keyword: searchQuery.trim() },
          signal: abortRef.current.signal,
        });
        const records = Array.isArray(data) ? data : data?.records ?? [];
        const mapped = records.map((r: any) => ({
            id: r.id,
            type: 'competition' as const,
            name: r.name || r.title || '未命名赛事',
            level: r.level,
            status: r.status,
          }));
        setSearchResults(mapped);
        setActiveIndex(-1);
        setSearchOpen(true);
      } catch (e: any) {
        if (e?.name !== 'CanceledError' && e?.code !== 'ERR_CANCELED') {
          setSearchResults([]);
        }
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(searchTimer.current);
    };
  }, [searchQuery]);

  // Close search on outside click
  useEffect(() => {
    if (!searchOpen) return;
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [searchOpen]);

  // Ctrl+K shortcut
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setActiveIndex(-1);
        searchInputRef.current?.blur();
        setPanelOpen(false);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const handleSearchSelect = (result: SearchResult) => {
    setSearchOpen(false);
    setSearchQuery('');
    setActiveIndex(-1);
    if (result.type === 'competition') {
      const role = user?.role || 'student';
      navigate(`/${role}/competitions/${result.id}`);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!searchOpen) return;
    const count = searchResults.length;
    if (count === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % count);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + count) % count);
    } else if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < count) {
      e.preventDefault();
      handleSearchSelect(searchResults[activeIndex]);
    }
  };

  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const data: any = await apiClient.get('/message/list', { params: { current: 1, size: 10 } });
      const list: Message[] = Array.isArray(data?.records) ? data.records : (Array.isArray(data) ? data : []);
      setMessages(list);
      setUnreadCount(data?.total ? Math.min(data.total, 99) : list.filter((m) => m.isRead === 0).length);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    const timer = setInterval(fetchMessages, 60_000);
    return () => clearInterval(timer);
  }, [fetchMessages]);

  // Close panel on outside click
  useEffect(() => {
    if (!panelOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        bellRef.current && !bellRef.current.contains(e.target as Node)
      ) {
        setPanelOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [panelOpen]);

  const handleMarkRead = async (id: number) => {
    const msg = messages.find((m) => m.id === id);
    if (!msg || msg.isRead === 1) return;
    try {
      await apiClient.post(`/message/read/${id}`);
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isRead: 1 } : m))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.post('/message/read-all');
      setMessages((prev) => prev.map((m) => ({ ...m, isRead: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMessage = async (id: number) => {
    try {
      await apiClient.delete(`/message/${id}`);
      setMessages((prev) => {
        const deleted = prev.find((m) => m.id === id);
        if (deleted && deleted.isRead === 0) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((m) => m.id !== id);
      });
    } catch (err) {
      console.error(err);
    }
  };

  function formatTime(raw: string): string {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin}分钟前`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}小时前`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}天前`;
    if (d.getFullYear() !== now.getFullYear()) {
      return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
    }
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!themeMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setThemeMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [themeMenuOpen]);

  const themeOptions: Array<{ value: 'light' | 'dark' | 'system'; label: string; icon: string }> = [
    { value: 'light', label: '浅色', icon: 'light_mode' },
    { value: 'dark', label: '深色', icon: 'dark_mode' },
    { value: 'system', label: '跟随系统', icon: 'brightness_auto' },
  ];

  return (
    <header className={`app-header fixed left-0 right-0 top-0 z-30 flex h-[var(--header-height)] items-center justify-between border-b border-hairline bg-canvas px-4 sm:px-6 ${desktopSidebarOpen ? 'md:left-[var(--sidebar-width)]' : 'md:left-0'}`}>
      <div className={`flex min-w-0 items-center gap-2 ${desktopSidebarOpen ? '' : 'md:pl-12'}`}>
        {/* 仅移动端汉堡；桌面折叠改在侧栏顶栏 / 左上角展开钮 */}
        <button
          type="button"
          onClick={onToggleMobileNav}
          className="icon-button md:hidden"
          aria-label={mobileNavOpen ? '关闭导航' : '打开导航'}
        >
          <span className="material-symbols-outlined text-[22px]">
            {mobileNavOpen ? 'close' : 'menu'}
          </span>
        </button>
        <h2 className="truncate text-subhead font-medium tracking-tight text-ink">{title}</h2>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <div ref={searchRef} className="relative hidden md:block">
          <div className="flex h-9 w-[200px] lg:w-[260px] items-center rounded-lg border border-hairline bg-canvas-parchment transition-colors focus-within:border-border-emphasis focus-within:bg-canvas" aria-expanded={searchOpen}>
            <span className="material-symbols-outlined text-[17px] text-placeholder ml-3">search</span>
            <input
              ref={searchInputRef}
              name="globalSearch"
              className="h-full flex-1 bg-transparent px-2 outline-none text-footnote font-normal text-ink placeholder:text-placeholder"
              placeholder="搜索赛事、团队、作品"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
              aria-haspopup="listbox"
              aria-activedescendant={activeIndex >= 0 ? `search-option-${searchResults[activeIndex]?.id}` : undefined}
            />
            <kbd className="mr-2 hidden rounded border border-hairline px-1.5 py-0.5 text-caption-2 text-placeholder lg:inline">⌘K</kbd>
            {searchLoading && (
              <span className="material-symbols-outlined text-[16px] text-placeholder mr-2 animate-spin">progress_activity</span>
            )}
          </div>

          <AnimatePresence>
            {searchOpen && (
              <motion.div
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={panelTransition}
                className="absolute left-0 top-[42px] z-50 w-[340px] overflow-hidden rounded-lg border border-[var(--material-border)] material-thick shadow-3"
              >
                <div className="border-b border-hairline/80 px-3 py-2">
                  <span className="text-caption text-placeholder">搜索结果</span>
                </div>
                {searchResults.length === 0 ? (
                  <div className="px-3 py-6 text-center text-footnote text-placeholder">无匹配结果</div>
                ) : (
                <ul className="max-h-[260px] overflow-y-auto" role="listbox">
                  {searchResults.map((r, i) => (
                    <li
                      key={r.id}
                      id={`search-option-${r.id}`}
                      role="option"
                      aria-selected={i === activeIndex}
                      onClick={() => handleSearchSelect(r)}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`flex cursor-pointer items-center gap-3 border-b border-hairline/50 px-3 py-2.5 transition last:border-b-0 ${
                        i === activeIndex ? 'bg-primary-soft' : 'hover:bg-canvas-parchment'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px] text-primary shrink-0">emoji_events</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-footnote font-medium text-ink truncate">{r.name}</div>
                        <div className="text-caption text-placeholder flex items-center gap-1.5">
                          {r.level && <span>{r.level}</span>}
                          {r.level && r.status && <span>·</span>}
                          {r.status && <span>{r.status === 'published' ? '进行中' : r.status === 'closed' ? '已结束' : r.status}</span>}
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-[16px] text-placeholder">arrow_forward</span>
                    </li>
                  ))}
                </ul>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Notification bell */}
        <div className="relative">
          <button
            ref={bellRef}
            onClick={() => setPanelOpen((v) => !v)}
            className="icon-button relative"
            aria-label="消息通知"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-primary text-caption-2 font-medium text-on-primary ring-2 ring-canvas-parchment">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {panelOpen && (
              <motion.div
                ref={panelRef}
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={panelTransition}
                className="absolute right-0 top-[46px] max-h-[420px] w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-[var(--material-border)] material-thick shadow-3"
              >
                <div className="flex items-center justify-between border-b border-hairline/80 px-4 py-3">
                  <span className="text-subhead font-medium text-ink">消息通知</span>
                  <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-caption text-primary hover:underline"
                      >
                        全部已读
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-y-auto max-h-[330px]">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-placeholder">
                      <span className="material-symbols-outlined text-[32px] mb-2">notifications_none</span>
                      <span className="text-xs">暂无消息</span>
                    </div>
                  ) : (
                    <ul role="menu">
                      {messages.map((msg) => (
                        <li
                          key={msg.id}
                          role="menuitem"
                          onClick={() => handleMarkRead(msg.id)}
                          className={`group flex items-start gap-3 border-b border-hairline/50 px-4 py-3 transition-colors last:border-b-0 hover:bg-primary/[0.04] ${
                            msg.isRead === 0 ? 'bg-primary/[0.03]' : ''
                          }`}
                        >
                          <div className="flex-shrink-0 mt-1">
                            {msg.isRead === 0 ? (
                              <span className="block w-2 h-2 rounded-full bg-primary" />
                            ) : (
                              <span className="block w-2 h-2 rounded-full bg-ink-muted-20" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-footnote truncate ${msg.isRead === 0 ? 'font-medium text-ink' : 'text-body-muted'}`}>
                                {msg.title}
                              </span>
                              <span className="flex-shrink-0 text-caption text-placeholder">{formatTime(msg.createTime)}</span>
                            </div>
                            <p className="text-caption text-placeholder mt-0.5 line-clamp-2 leading-relaxed">
                              {msg.content}
                            </p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); }}
                            className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="删除消息"
                          >
                            <span className="material-symbols-outlined text-[16px] text-placeholder hover:text-error">close</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="border-t border-hairline px-4 py-2.5 text-center">
                  <span
                    className="cursor-pointer text-caption font-normal text-primary hover:underline"
                    onClick={() => { setPanelOpen(false); navigate(`/${user?.role || 'student'}/notifications`); }}
                  >
                    查看全部
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Theme menu: light / dark / system */}
        <div ref={themeMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setThemeMenuOpen((v) => !v)}
            className="icon-button"
            aria-label={`当前主题：${theme === 'light' ? '浅色' : theme === 'dark' ? '深色' : '跟随系统'}`}
            aria-expanded={themeMenuOpen}
            aria-haspopup="menu"
            title="外观"
          >
            <span className="material-symbols-outlined text-[20px]">
              {theme === 'light' ? 'light_mode' : theme === 'dark' ? 'dark_mode' : 'brightness_auto'}
            </span>
          </button>
          <AnimatePresence>
            {themeMenuOpen && (
              <motion.div
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={panelTransition}
                role="menu"
                className="absolute right-0 top-[42px] z-50 w-[160px] overflow-hidden rounded-lg border border-[var(--material-border)] material-thick py-1 shadow-3"
              >
                {themeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={theme === opt.value}
                    onClick={() => {
                      setTheme(opt.value);
                      setThemeMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-footnote transition-colors ${
                      theme === opt.value
                        ? 'bg-surface-tile-1 text-ink font-medium'
                        : 'text-body-muted hover:bg-hover-overlay hover:text-ink'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{opt.icon}</span>
                    <span className="flex-1">{opt.label}</span>
                    {theme === opt.value && (
                      <span className="material-symbols-outlined text-[16px] text-primary">check</span>
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </header>
  );
}
