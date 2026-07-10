import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { apiClient } from '../api/client';
import { useStore } from '../store/useStore';
import PageHero from '../components/PageHero';
import Pagination from '../components/Pagination';

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
  useStore((s) => s.currentUser); // 保持 store 订阅
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
    <div className="flex flex-col gap-4">
      <PageHero
        title="消息中心"
        description={`共 ${total} 条消息${unreadCount > 0 ? `，${unreadCount} 条未读` : ''}`}
        actions={
          unreadCount > 0 ? (
            <button type="button" onClick={handleMarkAllRead} className="btn-secondary">
              <span className="material-symbols-outlined text-[16px]">done_all</span>
              全部已读
            </button>
          ) : undefined
        }
      />

      <section className="section-card">
        {loading && messages.length === 0 ? (
          <div className="empty-panel py-16">
            <span className="material-symbols-outlined animate-spin text-body-muted">progress_activity</span>
            <p className="text-[13px]">加载中…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-panel py-16">
            <span className="material-symbols-outlined">notifications_none</span>
            <p className="text-[13px]">暂无消息</p>
          </div>
        ) : (
          <div className="section-card-body tight">
            <AnimatePresence>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => handleMarkRead(msg.id)}
                  className={`list-row list-row-clickable items-start ${
                    msg.isRead === 0 ? 'bg-primary-soft/40' : ''
                  }`}
                >
                  <div className="mt-1.5 shrink-0">
                    {msg.isRead === 0 ? (
                      <span className="block h-2 w-2 rounded-full bg-primary" />
                    ) : (
                      <span className="block h-2 w-2 rounded-full bg-surface-tile-3" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-[13.5px] ${msg.isRead === 0 ? 'font-medium text-ink' : 'text-body-muted'}`}>
                      {msg.title}
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-body-subtle">{msg.content}</p>
                    <span className="mt-1.5 block text-[12px] text-placeholder">{formatTime(msg.createTime)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }}
                    className="icon-button !h-8 !w-8 shrink-0"
                    aria-label="删除消息"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="border-t border-hairline px-4 py-3">
          <Pagination current={page} total={total} pageSize={size} onChange={setPage} />
        </div>
      </section>
    </div>
  );
}
