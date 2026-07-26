import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';
import ConfirmModal from '../../components/ConfirmModal';
import { useConfirmModal } from '../../hooks/useConfirmModal';
import type { Announcement, AnnouncementType } from '../../types';

const typeLabels: Record<AnnouncementType, string> = {
  system: '系统公告',
  competition: '赛事公告',
  stage: '阶段公告',
};

const typeColors: Record<AnnouncementType, string> = {
  system: 'chip chip-primary',
  competition: 'chip chip-warning',
  stage: 'chip chip-success',
};

export default function AnnouncementManagement() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<AnnouncementType | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: '', content: '', type: 'system' as AnnouncementType, competitionId: '', isPinned: false });
  const { isOpen, title, message, variant, confirm, close } = useConfirmModal();

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const params: any = { current: 1, size: 50 };
      if (filterType) params.type = filterType;
      const data: any = await apiClient.get('/announcement/list', { params });
      setAnnouncements(Array.isArray(data?.records) ? data.records : []);
    } catch (err) {
      console.error('Failed to load announcements', err);
      toast.error('加载公告列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAnnouncements(); }, [filterType]);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('请填写标题和内容');
      return;
    }
    try {
      const payload: any = {
        title: form.title,
        content: form.content,
        type: form.type,
        isPinned: form.isPinned ? 1 : 0,
      };
      if (form.competitionId) payload.competitionId = Number(form.competitionId);

      if (editingId) {
        await apiClient.put(`/announcement/${editingId}`, payload);
        toast.success('公告已更新');
      } else {
        await apiClient.post('/announcement', payload);
        toast.success('公告已发布');
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ title: '', content: '', type: 'system', competitionId: '', isPinned: false });
      loadAnnouncements();
    } catch (err: any) {
      toast.error(err.message || '操作失败');
    }
  };

  const handleEdit = (a: Announcement) => {
    setEditingId(a.id);
    setForm({
      title: a.title,
      content: a.content,
      type: a.type,
      competitionId: a.competitionId?.toString() || '',
      isPinned: a.isPinned,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: '删除公告',
      message: '确定删除此公告？',
      confirmText: '删除',
      cancelText: '取消',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await apiClient.delete(`/announcement/${id}`);
      toast.success('已删除');
      loadAnnouncements();
    } catch (err: any) {
      toast.error(err.message || '删除失败');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHero
        eyebrow="管理端"
        title="公告管理"
        description="发布和管理系统公告、赛事公告，打通信息差。"
        actions={(
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setForm({ title: '', content: '', type: 'system', competitionId: '', isPinned: false });
            }}
            className="btn-primary"
          >
            <span className="material-symbols-outlined">add</span>
            发布公告
          </button>
        )}
      />

      <AnimatePresence>
        {showForm && (
          <section className="section-card">
            <div className="section-card-header">
              <h2 className="section-card-title">{editingId ? '编辑公告' : '发布新公告'}</h2>
            </div>
            <div className="section-card-body flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-footnote font-medium text-ink">公告类型</label>
                  <select
                    className="input-glass"
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AnnouncementType }))}
                  >
                    <option value="system">系统公告</option>
                    <option value="competition">赛事公告</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-footnote font-medium text-ink">关联赛事ID（赛事公告必填）</label>
                  <input
                    className="input-glass"
                    placeholder="留空表示系统公告"
                    value={form.competitionId}
                    onChange={(e) => setForm((f) => ({ ...f, competitionId: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-footnote font-medium text-ink">
                  <span className="mr-1 text-error">*</span>标题
                </label>
                <input
                  className="input-glass"
                  placeholder="公告标题"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-footnote font-medium text-ink">
                  <span className="mr-1 text-error">*</span>内容
                </label>
                <textarea
                  className="input-glass !h-auto resize-none py-2.5"
                  rows={5}
                  placeholder="公告内容"
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinned"
                  checked={form.isPinned}
                  onChange={(e) => setForm((f) => ({ ...f, isPinned: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="pinned" className="text-footnote text-ink">置顶</label>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                >
                  取消
                </button>
                <button type="button" className="btn-primary" onClick={handleSubmit}>
                  {editingId ? '保存修改' : '发布'}
                </button>
              </div>
            </div>
          </section>
        )}
      </AnimatePresence>

      <div className="filter-bar">
        {[
          { value: '', label: '全部' },
          { value: 'system', label: '系统公告' },
          { value: 'competition', label: '赛事公告' },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilterType(tab.value as AnnouncementType | '')}
            className={filterType === tab.value ? 'btn-primary !h-8 !px-3 !text-caption' : 'btn-utility !h-8 !px-3 !text-caption'}
          >
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        <span className="chip tabular-nums">{announcements.length} 条</span>
      </div>

      {loading ? (
        <div className="empty-panel py-16">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          <p className="text-footnote">加载中…</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="empty-panel py-16">
          <span className="material-symbols-outlined">campaign</span>
          <p className="text-footnote">暂无公告</p>
        </div>
      ) : (
        <section className="section-card">
          <div className="section-card-header">
            <h2 className="section-card-title">公告列表</h2>
          </div>
          <div className="data-table-wrap !rounded-none !border-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>标题</th>
                  <th>类型</th>
                  <th>发布时间</th>
                  <th className="text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        {a.isPinned && (
                          <span className="material-symbols-outlined text-[16px] text-warning">push_pin</span>
                        )}
                        <span className="font-medium">{a.title}</span>
                      </div>
                    </td>
                    <td>
                      <span className={typeColors[a.type]}>{typeLabels[a.type]}</span>
                    </td>
                    <td className="text-body-muted">
                      {new Date(a.createTime).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => handleEdit(a)}
                        className="icon-button"
                        aria-label="编辑公告"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(a.id)}
                        className="icon-button text-error hover:text-error"
                        aria-label="删除公告"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <ConfirmModal
        isOpen={isOpen}
        onClose={close}
        onConfirm={() => {}}
        title={title}
        message={message}
        variant={variant}
      />
    </div>
  );
}
