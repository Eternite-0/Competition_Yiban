import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';
import type { Announcement, AnnouncementType } from '../../types';

const typeLabels: Record<AnnouncementType, string> = {
  system: '系统公告',
  competition: '赛事公告',
  stage: '阶段公告',
};

const typeColors: Record<AnnouncementType, string> = {
  system: 'chip-primary',
  competition: 'chip-warning',
  stage: 'chip-success',
};

export default function AnnouncementManagement() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<AnnouncementType | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: '', content: '', type: 'system' as AnnouncementType, competitionId: '', isPinned: false });

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
    if (!confirm('确定删除此公告？')) return;
    try {
      await apiClient.delete(`/announcement/${id}`);
      toast.success('已删除');
      loadAnnouncements();
    } catch (err: any) {
      toast.error(err.message || '删除失败');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="py-lg flex flex-col gap-lg"
    >
      <PageHero
        eyebrow="Announcements"
        title="公告管理"
        description="发布和管理系统公告、赛事公告，打通信息差。"
        actions={(
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ title: '', content: '', type: 'system', competitionId: '', isPinned: false }); }} className="btn-primary">
            <span className="material-symbols-outlined text-[18px]">add</span>
            发布公告
          </button>
        )}
      />

      {/* Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="glass p-xl"
        >
          <h3 className="text-[17px] font-semibold text-ink mb-md">{editingId ? '编辑公告' : '发布新公告'}</h3>
          <div className="flex flex-col gap-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-ink">公告类型</label>
                <select className="input-glass" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as AnnouncementType }))}>
                  <option value="system">系统公告</option>
                  <option value="competition">赛事公告</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-ink">关联赛事ID（赛事公告必填）</label>
                <input className="input-glass" placeholder="留空表示系统公告" value={form.competitionId} onChange={e => setForm(f => ({ ...f, competitionId: e.target.value }))} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-ink"><span className="text-error mr-1">*</span>标题</label>
              <input className="input-glass" placeholder="公告标题" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-ink"><span className="text-error mr-1">*</span>内容</label>
              <textarea className="input-glass !h-auto py-2.5 resize-none" rows={5} placeholder="公告内容" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="pinned" checked={form.isPinned} onChange={e => setForm(f => ({ ...f, isPinned: e.target.checked }))} className="rounded" />
              <label htmlFor="pinned" className="text-[13px] text-ink">置顶</label>
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn-secondary" onClick={() => { setShowForm(false); setEditingId(null); }}>取消</button>
              <button className="btn-primary" onClick={handleSubmit}>{editingId ? '保存修改' : '发布'}</button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-primary/6 rounded-pill w-fit">
        {[
          { value: '', label: '全部' },
          { value: 'system', label: '系统公告' },
          { value: 'competition', label: '赛事公告' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilterType(tab.value as AnnouncementType | '')}
            className={`px-4 py-1.5 rounded-pill text-[13px] font-medium transition ${
              filterType === tab.value ? 'bg-canvas text-ink shadow-sm' : 'text-ink-muted-80 hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="py-section text-center text-ink-muted-48">
          <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
        </div>
      ) : announcements.length === 0 ? (
        <div className="glass p-xl text-center">
          <span className="material-symbols-outlined text-[48px] text-ink-muted-48">campaign</span>
          <p className="text-[15px] text-ink-muted-80 mt-3">暂无公告</p>
        </div>
      ) : (
        <div className="glass overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-canvas-parchment">
                <th className="text-left text-[11px] uppercase tracking-wider text-ink-muted-48 font-medium px-lg py-3">标题</th>
                <th className="text-left text-[11px] uppercase tracking-wider text-ink-muted-48 font-medium px-lg py-3">类型</th>
                <th className="text-left text-[11px] uppercase tracking-wider text-ink-muted-48 font-medium px-lg py-3">发布时间</th>
                <th className="text-right text-[11px] uppercase tracking-wider text-ink-muted-48 font-medium px-lg py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map(a => (
                <tr key={a.id} className="border-b border-hairline last:border-0 hover:bg-primary/3 transition">
                  <td className="px-lg py-3">
                    <div className="flex items-center gap-2">
                      {a.isPinned && <span className="material-symbols-outlined text-[16px] text-warning">push_pin</span>}
                      <span className="text-[14px] font-medium text-ink">{a.title}</span>
                    </div>
                  </td>
                  <td className="px-lg py-3">
                    <span className={`chip !text-[11px] ${typeColors[a.type]}`}>{typeLabels[a.type]}</span>
                  </td>
                  <td className="px-lg py-3 text-[13px] text-ink-muted-80">
                    {new Date(a.createTime).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-lg py-3 text-right">
                    <button onClick={() => handleEdit(a)} className="p-1.5 rounded-md text-ink-muted-48 hover:text-primary hover:bg-primary/8 transition">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-md text-ink-muted-48 hover:text-error hover:bg-error/8 transition ml-1">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
