import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import { useStore } from '../../store/useStore';
import PageHero from '../../components/PageHero';
import Pagination from '../../components/Pagination';
import ProgressBar from '../../components/ProgressBar';
import ConfirmModal from '../../components/ConfirmModal';
import { useConfirmModal } from '../../hooks/useConfirmModal';

// Raw competition record from the backend. Field names are tolerant because
// the API contract documents both English (name/startTime/status) and the
// existing UI used some Chinese labels — we normalize at the boundary.
interface CompetitionRecord {
  id?: string | number;
  name?: string;
  title?: string;
  level?: string;
  category?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
  competitionStart?: string;
  competitionEnd?: string;
  createTime?: string;
  deadline?: string;
  coverUrl?: string;
}

interface PageResponse<T> {
  records: T[];
  total: number;
  current: number;
  size: number;
}

interface PendingTask {
  title: string;
  description: string;
  tone: 'primary' | 'error';
  link?: string;
}

// Map backend English status values to the Chinese display labels used in the UI.
const statusLabel = (s?: string): string => {
  switch (s) {
    case 'published':
      return '进行中';
    case 'closed':
      return '已结束';
    case 'draft':
      return '草稿';
    default:
      return s || '—';
  }
};

const monthsAgoLabel = (offset: number): { key: string; label: string } => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offset);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return { key, label: `${d.getMonth() + 1}月` };
};

const levelChipClass = (level?: string) => {
  if (level === '国家级') return 'chip chip-national';
  if (level === '省级') return 'chip chip-province';
  return 'chip chip-school';
};

export default function AdminHome() {
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);
  const { isOpen, title, message, variant, confirm, close } = useConfirmModal();

  const [records, setRecords] = useState<CompetitionRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [pendingRegCount, setPendingRegCount] = useState<number | null>(null);
  const [pendingSubCount, setPendingSubCount] = useState<number | null>(null);
  const [totalSubCount, setTotalSubCount] = useState<number | null>(null);
  const [workbenchStats, setWorkbenchStats] = useState<{ pending?: number; overdue?: number } | null>(null);
  const [currentCompPage, setCurrentCompPage] = useState(1);

  // Fetch registration and submission counts
  useEffect(() => {
    let cancelled = false;
    const fetchCounts = async () => {
      try {
        const taskStats: any = await apiClient.get('/admin/workbench/stats');
        if (!cancelled && taskStats) {
          setWorkbenchStats(taskStats as { pending?: number; overdue?: number });
        }
      } catch (err) { console.error(err); if (!cancelled) setWorkbenchStats(null); }
      try {
        const regData: any = await apiClient.get('/registration/pending', { params: { current: 1, size: 1 } });
        if (!cancelled && regData && typeof regData.total === 'number') {
          setPendingRegCount(regData.total);
        }
      } catch (err) { console.error(err); if (!cancelled) setPendingRegCount(0); }
      try {
        const subData: any = await apiClient.get('/submission/list', { params: { current: 1, size: 1, status: '待审核' } });
        if (!cancelled && subData && typeof subData.total === 'number') {
          setPendingSubCount(subData.total);
        }
      } catch (err) { console.error(err); if (!cancelled) setPendingSubCount(0); }
      try {
        const allSub: any = await apiClient.get('/submission/list', { params: { current: 1, size: 1 } });
        if (!cancelled && allSub && typeof allSub.total === 'number') {
          setTotalSubCount(allSub.total);
        }
      } catch (err) { console.error(err); if (!cancelled) setTotalSubCount(0); }
    };
    fetchCounts();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchCompetitions = async () => {
      try {
        const data: PageResponse<CompetitionRecord> | CompetitionRecord[] | null = await apiClient.get(
          '/competition/list',
          { params: { current: 1, size: 100 } }
        );
        if (cancelled) return;
        if (Array.isArray(data)) {
          setRecords(data);
          setTotal(data.length);
        } else if (data && Array.isArray(data.records)) {
          setRecords(data.records);
          setTotal(typeof data.total === 'number' ? data.total : data.records.length);
        }
      } catch (err) {
        console.error('Failed to fetch competitions for dashboard:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchCompetitions();
    return () => {
      cancelled = true;
    };
  }, []);

  // KPI counts derived from records (status uses backend english strings).
  const counts = useMemo(() => {
    const c = { published: 0, closed: 0, draft: 0 };
    for (const r of records) {
      if (r.status === 'published') c.published += 1;
      else if (r.status === 'closed') c.closed += 1;
      else if (r.status === 'draft') c.draft += 1;
    }
    return c;
  }, [records]);

  // Bar chart: count newly created competitions per month for the last 6 months.
  const barData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => monthsAgoLabel(5 - i));
    const counts: Record<string, number> = {};
    months.forEach((m) => (counts[m.key] = 0));
    for (const r of records) {
      const t = r.createTime || r.startTime;
      if (!t) continue;
      const d = new Date(t);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key in counts) counts[key] += 1;
    }
    return months.map((m) => ({ label: m.label, value: counts[m.key] }));
  }, [records]);

  const maxBar = Math.max(1, ...barData.map((b) => b.value));

  const recentCompetitions = useMemo(() => records.slice(0, 5), [records]);
  const compPageSize = 5;
  const totalCompPages = Math.max(1, Math.ceil(recentCompetitions.length / compPageSize));
  const pagedCompetitions = recentCompetitions.slice((currentCompPage - 1) * compPageSize, currentCompPage * compPageSize);

  const metrics = [
    { label: '赛事总数', value: total, suffix: '场', icon: 'event' },
    { label: '进行中', value: counts.published, suffix: '场', icon: 'play_circle' },
    { label: '待审核', value: workbenchStats?.pending ?? ((pendingRegCount ?? 0) + (pendingSubCount ?? 0)), suffix: '项', icon: 'pending_actions', tone: 'warning' as const, loaded: workbenchStats !== null || (pendingRegCount !== null && pendingSubCount !== null) },
    { label: '作品总数', value: totalSubCount ?? 0, suffix: '份', icon: 'description', loaded: totalSubCount !== null },
  ];

  // Level distribution computed from records; falls back to even spread if empty.
  const levelDist = useMemo(() => {
    const buckets: Record<string, number> = { 国家级: 0, 省级: 0, 校级: 0 };
    let known = 0;
    for (const r of records) {
      if (r.level && r.level in buckets) {
        buckets[r.level] += 1;
        known += 1;
      }
    }
    if (known === 0) {
      return [
        { label: '国家级', pct: 0 },
        { label: '省级', pct: 0 },
        { label: '校级', pct: 0 },
      ];
    }
    return (['国家级', '省级', '校级'] as const).map((label) => ({
      label,
      pct: Math.round((buckets[label] / known) * 100),
    }));
  }, [records]);

  // Compute real pending tasks from API data
  const pendingTasks = useMemo<PendingTask[]>(() => {
    const tasks: PendingTask[] = [];

    if (pendingRegCount > 0) {
      tasks.push({
        title: '待审核报名',
        description: `当前有 ${pendingRegCount} 份报名信息等待审核，请及时处理。`,
        tone: 'primary',
        link: '/admin/audit',
      });
    }

    if (pendingSubCount > 0) {
      tasks.push({
        title: '待审核作品',
        description: `当前有 ${pendingSubCount} 份提交作品等待审核。`,
        tone: 'primary',
        link: '/admin/audit',
      });
    }

    if ((workbenchStats?.overdue ?? 0) > 0) {
      tasks.push({
        title: '超期待办',
        description: `当前有 ${workbenchStats?.overdue} 项统一待办已超过截止时间，请优先处理。`,
        tone: 'error',
        link: '/admin/audit',
      });
    }

    // Check for competitions with deadlines in the next 3 days
    const now = Date.now();
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    const approaching = records.filter((r) => {
      if (r.status !== 'published') return false;
      const deadline = r.endTime || r.deadline;
      if (!deadline) return false;
      const t = new Date(deadline).getTime();
      return t > now && t - now < threeDays;
    });
    if (approaching.length > 0) {
      tasks.push({
        title: '即将截止赛事',
        description: `${approaching.map((r) => r.name || r.title).join('、')} 报名即将截止，请关注。`,
        tone: 'error',
        link: '/admin/competitions',
      });
    }

    if (tasks.length === 0) {
      tasks.push({
        title: '暂无待办',
        description: '当前没有需要处理的事项。',
        tone: 'primary',
      });
    }

    return tasks;
  }, [pendingRegCount, pendingSubCount, records, workbenchStats]);

  const greetingName = currentUser?.name?.trim() || '管理员';

  const handleDelete = async (id: string | number | undefined) => {
    if (!id) return;
    const confirmed = await confirm({
      title: '删除赛事',
      message: '确定要删除这个赛事吗？此操作不可恢复。',
      confirmText: '删除',
      cancelText: '取消',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await apiClient.delete(`/competition/admin/delete/${id}`);
      toast.success('已删除');
      setRecords((prev) => prev.filter((r) => r.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      console.error(err);
      toast.error('删除失败');
    }
  };

  const handleToggleStatus = async (comp: CompetitionRecord) => {
    if (!comp.id) return;
    const newStatus = comp.status === 'published' ? 'closed' : 'published';
    try {
      await apiClient.put(`/competition/admin/update/${comp.id}`, { status: newStatus });
      toast.success(newStatus === 'published' ? '已上架' : '已下架');
      setRecords((prev) => prev.map((r) => r.id === comp.id ? { ...r, status: newStatus } : r));
    } catch (err) {
      console.error(err);
      toast.error('操作失败');
    }
  };

  return (
    <div className="admin-home operator-home flex flex-col gap-4">
      <PageHero
        eyebrow="平台运营"
        title="管理工作台"
        description={`${greetingName}，先处理运营待办，再查看赛事发布与平台数据。`}
        actions={(
          <button type="button" onClick={() => navigate('/admin/publish')} className="btn-primary">
            <span className="material-symbols-outlined">add</span>
            发布新赛事
          </button>
        )}
      />

      <section className={`operator-focus-bar ${pendingTasks[0]?.tone === 'error' ? 'is-urgent' : ''}`}>
        <div className="operator-focus-symbol">
          <span className="material-symbols-outlined">{pendingTasks[0]?.tone === 'error' ? 'priority_high' : 'assignment'}</span>
        </div>
        <div className="min-w-0 flex-1">
          <span className="operator-focus-label">运营待办</span>
          <h2>{pendingTasks[0]?.title || '暂无待办'}</h2>
          <p>{pendingTasks[0]?.description || '当前平台运行正常。'}</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => navigate(pendingTasks[0]?.link || '/admin/competitions')}>
          {pendingTasks[0]?.link ? '立即处理' : '查看赛事'}
          <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
        </button>
      </section>

      <div className="stat-grid">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="stat-card animate-pulse">
                <div className="h-3 w-16 rounded bg-surface-tile-2" />
                <div className="h-7 w-16 rounded bg-surface-tile-2" />
                <div className="h-3 w-12 rounded bg-surface-tile-2" />
              </div>
            ))
          : metrics.map((m) => (
              <div key={m.label} className="stat-card">
                <div className="stat-card-label">{m.label}</div>
                <div className="stat-card-value">
                  {(m as { loaded?: boolean }).loaded === false ? '—' : m.value}
                  <span className="ml-1 text-footnote font-normal text-placeholder">{m.suffix}</span>
                </div>
                <div className="stat-card-hint">
                  <span className="material-symbols-outlined align-middle text-[14px] text-placeholder">{m.icon}</span>
                </div>
              </div>
            ))}
      </div>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <section className="section-card">
              <div className="section-card-header">
                <h2 className="section-card-title">发布趋势</h2>
                <span className="chip">近 6 个月</span>
              </div>
              <div className="section-card-body">
                {barData.every((b) => b.value === 0) ? (
                  <div className="empty-panel h-40">
                    <span className="material-symbols-outlined">bar_chart</span>
                    <p className="text-footnote">暂无数据</p>
                  </div>
                ) : (
                  <>
                    <div className="flex h-40 items-end gap-2 border-b border-hairline pb-2">
                      {barData.map((bar) => {
                        const isMax = bar.value === maxBar && bar.value > 0;
                        return (
                          <div key={bar.label} className="group flex flex-1 flex-col items-center gap-2">
                            <span className="text-caption-2 tabular-nums text-placeholder opacity-0 transition group-hover:opacity-100">
                              {bar.value}
                            </span>
                            <div className="flex h-full w-full items-end justify-center">
                              <div
                                className={`w-full max-w-[24px] rounded-t-sm transition-all ${
                                  isMax ? 'bg-primary' : 'bg-primary/12 group-hover:bg-primary/60'
                                }`}
                                style={{ height: `${(bar.value / maxBar) * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      {barData.map((d) => (
                        <span key={d.label} className="flex-1 text-center text-caption-2 text-placeholder">{d.label}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="section-card">
              <div className="section-card-header">
                <h2 className="section-card-title">赛事级别分布</h2>
              </div>
              <div className="section-card-body flex flex-col justify-center gap-4">
                {levelDist.map((s) => (
                  <div key={s.label}>
                    <div className="mb-1.5 flex items-center justify-between text-caption">
                      <span className="text-body-muted">{s.label}</span>
                      <span className="font-medium tabular-nums text-ink">{s.pct}%</span>
                    </div>
                    <ProgressBar value={s.pct} size="sm" showThumb segments={4} instant />
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="section-card">
            <div className="section-card-header">
              <h2 className="section-card-title">最近发布赛事</h2>
              <button type="button" className="btn-text" onClick={() => navigate('/admin/competitions')}>
                查看全部
              </button>
            </div>
            <div className="data-table-wrap !rounded-none !border-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>赛事名称</th>
                    <th>级别</th>
                    <th>状态</th>
                    <th className="text-right">截止日期</th>
                    <th className="text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty-panel py-12">
                          <span className="material-symbols-outlined animate-spin">progress_activity</span>
                        </div>
                      </td>
                    </tr>
                  ) : pagedCompetitions.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty-panel py-12">
                          <span className="material-symbols-outlined">event_busy</span>
                          <p className="text-footnote">暂无赛事数据</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pagedCompetitions.map((comp, idx) => {
                      const display = statusLabel(comp.status);
                      return (
                        <tr key={comp.id ?? idx}>
                          <td className="max-w-[260px] truncate font-medium">{comp.name || comp.title || '未命名赛事'}</td>
                          <td>
                            <span className={levelChipClass(comp.level)}>{comp.level || '校级'}</span>
                          </td>
                          <td>
                            <span className="flex items-center gap-2 text-body-muted">
                              <span
                                className={`h-1.5 w-1.5 rounded-md ${
                                  comp.status === 'published'
                                    ? 'bg-primary'
                                    : comp.status === 'draft'
                                      ? 'bg-primary/55'
                                      : 'bg-placeholder'
                                }`}
                              />
                              {display}
                            </span>
                          </td>
                          <td className="text-right tabular-nums text-placeholder">
                            {(comp.endTime || comp.deadline || '—').slice(0, 10)}
                          </td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => navigate(`/admin/publish/${comp.id}`)}
                                className="icon-button"
                                title="编辑"
                                aria-label="编辑"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(comp)}
                                className="icon-button"
                                title={comp.status === 'published' ? '下架' : '上架'}
                                aria-label={comp.status === 'published' ? '下架' : '上架'}
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  {comp.status === 'published' ? 'visibility_off' : 'visibility'}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(comp.id)}
                                className="icon-button text-error hover:text-error"
                                title="删除"
                                aria-label="删除"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {totalCompPages > 1 && (
              <div className="flex items-center justify-between border-t border-hairline px-4 py-3">
                <span className="text-caption text-placeholder">
                  共 <span className="font-medium tabular-nums text-ink">{recentCompetitions.length}</span> 条
                </span>
                <Pagination
                  current={currentCompPage}
                  total={recentCompetitions.length}
                  pageSize={compPageSize}
                  onChange={setCurrentCompPage}
                />
              </div>
            )}
          </section>
        </div>

        <section className="section-card lg:col-span-4">
          <div className="section-card-header">
            <h2 className="section-card-title">待处理事项</h2>
            <span className="chip">{pendingTasks.filter((t) => t.link).length || pendingTasks.length} 项</span>
          </div>
          <div className="section-card-body tight">
            {pendingTasks.map((task) => (
              <button
                key={task.title}
                type="button"
                className="list-row list-row-clickable w-full text-left"
                onClick={() => task.link && navigate(task.link)}
                disabled={!task.link}
              >
                <span
                  className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                    task.tone === 'error' ? 'bg-error' : 'bg-primary'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className={`text-footnote font-medium ${task.tone === 'error' ? 'text-error' : 'text-ink'}`}>
                    {task.title}
                  </div>
                  <p className="mt-0.5 text-caption leading-relaxed text-body-muted">{task.description}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </section>

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
