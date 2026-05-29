import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { apiClient } from '../api/client';
import { panelTransition, panelVariants } from '../lib/motion';

interface Message {
  id: number;
  fromUser: number;
  toUser: number;
  title: string;
  content: string;
  isRead: number;
  createTime: string;
}

const titleMap: Record<string, string> = {
  '/student': '工作台',
  '/student/competitions': '赛事大厅',
  '/student/calendar': '赛事日历',
  '/student/teams': '招募大厅',
  '/student/works': '光荣榜',
  '/student/registrations': '我的参赛',
  '/student/growth': '能力雷达',
  '/student/achievements/upload': '上传成果',
  '/student/progress': '我的进度',
  '/teacher': '工作台',
  '/teacher/college-overview': '学院总览',
  '/teacher/competitions': '赛事大厅',
  '/teacher/audit': '成果审批',
  '/teacher/student-competitions': '学生看板',
  '/teacher/student-growth': '学情分析',
  '/admin': '工作台',
  '/admin/competitions': '赛事管理',
  '/admin/publish': '赛事发布',
  '/admin/works': '作品库',
  '/admin/audit': '系统审核',
  '/admin/announcements': '公告管理',
  '/admin/users': '用户管理',
  '/teacher/student-detail': '学生详情',
  '/teacher/student-compare': '学生对比',
};

function resolveTitle(path: string): string {
  if (titleMap[path]) return titleMap[path];
  // Match dynamic detail routes
  if (/^\/student\/competitions\/.+/.test(path)) return '赛事详情';
  if (/^\/student\/registrations\/workbench\/.+/.test(path)) return '报名工作台';
  if (/^\/student\/upload\/.+/.test(path)) return '提交作品';
  if (/^\/admin\/publish\/.+/.test(path)) return '编辑赛事';
  return '易赛通';
}

interface HeaderProps {
  mobileNavOpen: boolean;
  onToggleMobileNav: () => void;
}

interface SearchResult {
  id: string | number;
  type: 'competition';
  name: string;
  level?: string;
  status?: string;
}

export default function Header({ mobileNavOpen, onToggleMobileNav }: HeaderProps) {
  const user = useStore((s) => s.currentUser);
  const location = useLocation();
  const navigate = useNavigate();
  const title = resolveTitle(location.pathname);

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
      const data = await apiClient.get<Message[]>('/message/list');
      const list = Array.isArray(data) ? data : [];
      setMessages(list.slice(0, 10));
      setUnreadCount(list.filter((m) => m.isRead === 0).length);
    } catch {
      // silently ignore — user may not be logged in yet
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
    } catch {
      // ignore
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

  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-[52px] items-center justify-between border-b border-hairline bg-canvas-parchment px-lg sm:px-page md:left-[200px]">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileNav}
          className="icon-button md:hidden"
          aria-label={mobileNavOpen ? '关闭导航' : '打开导航'}
        >
          <span className="material-symbols-outlined text-[20px]">
            {mobileNavOpen ? 'close' : 'menu'}
          </span>
        </button>
        <span className="sr-only">{title}</span>
      </div>

      <div className="flex items-center gap-3">
        <div ref={searchRef} className="relative hidden lg:block">
          <div className="flex h-9 w-[244px] items-center rounded-sm border border-hairline bg-canvas transition-all focus-within:border-primary focus-within:shadow-focus" aria-expanded={searchOpen}>
            <span className="material-symbols-outlined text-[17px] text-placeholder ml-3">search</span>
            <input
              ref={searchInputRef}
              name="globalSearch"
              className="h-full flex-1 bg-transparent px-2 outline-none text-[14px] font-normal text-ink placeholder:text-placeholder"
              placeholder="搜索赛事、团队、作品"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
              aria-haspopup="listbox"
              aria-activedescendant={activeIndex >= 0 ? `search-option-${searchResults[activeIndex]?.id}` : undefined}
            />
            {searchLoading ? (
              <span className="material-symbols-outlined text-[16px] text-placeholder mr-2 animate-spin">progress_activity</span>
            ) : (
              <kbd className="mr-2 rounded-xs bg-surface-chip px-1.5 py-0.5 font-mono text-[10px] font-normal text-placeholder">Ctrl K</kbd>
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
                className="absolute left-0 top-[42px] z-50 w-[340px] overflow-hidden rounded-md border border-hairline bg-canvas shadow-float"
              >
                <div className="border-b border-hairline/80 px-3 py-2">
                  <span className="text-[12px] text-placeholder">搜索结果</span>
                </div>
                {searchResults.length === 0 ? (
                  <div className="px-3 py-6 text-center text-[13px] text-placeholder">无匹配结果</div>
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
                        <div className="text-[13px] font-medium text-ink truncate">{r.name}</div>
                        <div className="text-[12px] text-placeholder flex items-center gap-1.5">
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
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-primary text-[10px] font-medium text-on-primary ring-2 ring-canvas-parchment">
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
                className="absolute right-0 top-[46px] max-h-[420px] w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-hairline bg-canvas shadow-float"
              >
                <div className="flex items-center justify-between border-b border-hairline/80 px-4 py-3">
                  <span className="text-[14px] font-medium text-ink">消息通知</span>
                  {unreadCount > 0 && (
                    <span className="text-[12px] text-primary font-normal">{unreadCount} 条未读</span>
                  )}
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
                          onClick={() => msg.isRead === 0 && handleMarkRead(msg.id)}
                          className={`flex cursor-pointer gap-3 border-b border-hairline/50 px-4 py-3 transition-colors last:border-b-0 hover:bg-primary/[0.04] ${
                            msg.isRead === 0 ? 'bg-primary/[0.03]' : ''
                          }`}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {msg.isRead === 0 ? (
                              <span className="block w-2 h-2 rounded-full bg-primary" />
                            ) : (
                              <span className="block w-2 h-2 rounded-full bg-ink-muted-20" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-[13px] truncate ${msg.isRead === 0 ? 'font-medium text-ink' : 'text-body-muted'}`}>
                                {msg.title}
                              </span>
                              <span className="flex-shrink-0 text-[12px] text-placeholder">{formatTime(msg.createTime)}</span>
                            </div>
                            <p className="text-[12px] text-placeholder mt-0.5 line-clamp-2 leading-relaxed">
                              {msg.content}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="border-t border-hairline px-4 py-2.5 text-center">
                  <span
                    className="cursor-pointer text-[12px] font-normal text-primary hover:underline"
                    onClick={() => setPanelOpen(false)}
                  >
                    查看全部
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="group flex cursor-pointer items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-[12px] font-medium text-on-primary">
            {user?.name?.[0] ?? 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
