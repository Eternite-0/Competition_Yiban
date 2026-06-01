import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { apiClient } from '../api/client';
import { useStore } from '../store/useStore';
import PageHero from '../components/PageHero';
import Pagination from '../components/Pagination';
import { listContainer, listItem, pageVariants, pageTransition } from '../lib/motion';

interface Message {
  id: number;
  fromUser: number;
  toUser: number;
  title: string;
  content: string;
  isRead: number;
  createTime: string;
}

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

export default function NotificationsPage() {
  const user = useStore((s) => s.currentUser);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const size = 20;

  const fetchMessages = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const data: any = await apiClient.get('/message/list', { params: { current: p, size } });
      const list: Message[] = Array.isArray(data?.records) ? data.records : (Array.isArray(data) ? data : []);
      setMessages(list);
      setTotal(data?.total ?? list.length);
    } catch (err) {
      toast.error('加载消息失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMessages(page); }, [page, fetchMessages]);

  const handleMarkRead = async (id: number) => {
    const msg = messages.find((m) => m.id === id);
    if (!msg || msg.isRead === 1) return;
    try {
      await apiClient.post(`/message/read/${id}`);
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isRead: 1 } : m)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.post('/message/read-all');
      setMessages((prev) => prev.map((m) => ({ ...m, isRead: 1 })));
      toast.success('已全部标记为已读');
    } catch (err) {
      toast.error('操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/message/${id}`);
      setMessages((prev) => {
        const next = prev.filter((m) => m.id !== id);
        // If current page is now empty and not page 1, go back
        if (next.length === 0 && page > 1) {
          setPage((p) => p - 1);
        }
        return next;
      });
      setTotal((t) => {
        const next = t - 1;
        // Also trigger page correction if needed
        const totalPages = Math.ceil(next / size);
        if (page > totalPages && totalPages > 0) {
          setPage(totalPages);
        }
        return next;
      });
      toast.success('已删除');
    } catch (err) {
      toast.error('删除失败');
    }
  };

  const unreadCount = messages.filter((m) => m.isRead === 0).length;

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" className="flex flex-col">
      <PageHero
        title="消息中心"
        description={`共 ${total} 条消息${unreadCount > 0 ? `，${unreadCount} 条未读` : ''}`}
        className="mb-6"
        titleClassName="text-[22px] font-medium text-ink"
        descriptionClassName="mt-1 text-sm text-body-muted"
        actions={
          unreadCount > 0 ? (
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleMarkAllRead} className="btn-secondary">
              <span className="material-symbols-outlined text-[16px]">done_all</span>
              全部已读
            </motion.button>
          ) : undefined
        }
      />

      <div className="app-panel overflow-hidden">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-body-muted">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mr-3" />
            加载中...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-placeholder">
            <span className="material-symbols-outlined text-[48px] mb-3">notifications_none</span>
            <span className="text-[14px]">暂无消息</span>
          </div>
        ) : (
          <motion.div variants={listContainer} initial="hidden" animate="visible">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  variants={listItem}
                  exit={{ opacity: 0, x: -20, height: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => handleMarkRead(msg.id)}
                  className={`group flex items-start gap-3 border-b border-border px-5 py-4 transition-colors last:border-b-0 cursor-pointer hover:bg-primary/[0.03] ${
                    msg.isRead === 0 ? 'bg-primary/[0.02]' : ''
                  }`}
                >
                  <div className="flex-shrink-0 mt-1.5">
                    {msg.isRead === 0 ? (
                      <span className="block w-2.5 h-2.5 rounded-full bg-primary" />
                    ) : (
                      <span className="block w-2.5 h-2.5 rounded-full bg-ink-muted-20" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[14px] ${msg.isRead === 0 ? 'font-medium text-ink' : 'text-body-muted'}`}>
                        {msg.title}
                      </span>
                    </div>
                    <p className="text-[13px] text-body-muted mt-1 leading-relaxed">
                      {msg.content}
                    </p>
                    <span className="text-[12px] text-placeholder mt-1.5 block">
                      {formatTime(msg.createTime)}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }}
                    className="flex-shrink-0 mt-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                    aria-label="删除消息"
                  >
                    <span className="material-symbols-outlined text-[18px] text-placeholder hover:text-error">delete</span>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        <Pagination current={page} total={total} pageSize={size} onChange={setPage} />
      </div>
    </motion.div>
  );
}
