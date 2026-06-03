import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import { listContainer, listItem } from '../../lib/motion';
import { useStore } from '../../store/useStore';
import PageHero from '../../components/PageHero';
import Pagination from '../../components/Pagination';
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
    <div className="py-lg flex flex-col gap-lg">
      <PageHero
        eyebrow="Workspace"
        title={`${greetingName}，欢迎回来`}
        description="查看平台运营概览，处理待办事项。"
        actions={(
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate('/admin/publish')} className="btn-primary">
            <span className="material-symbols-outlined text-[18px]">add</span>
            发布新赛事
          </motion.button>
        )}
      />

      {/* Metrics */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-md">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="stat-tile p-lg flex flex-col gap-2 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 bg-surface-tile-2 rounded" />
                <div className="h-[18px] w-[18px] bg-surface-tile-2 rounded" />
              </div>
              <div className="flex items-baseline gap-1">
                <div className="h-8 w-20 bg-surface-tile-2 rounded" />
                <div className="h-3 w-6 bg-surface-tile-2 rounded" />
              </div>
            </div>
          ))
        ) : metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            whileHover={{ scale: 1.02, y: -2 }}
            className="stat-tile p-lg flex flex-col gap-2 cursor-default"
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-ink-muted-80">{m.label}</span>
              <span className={`material-symbols-outlined text-[18px] ${
                m.tone === 'warning' ? 'text-primary' : 'text-primary'
              }`}>{m.icon}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-display font-medium text-[22px] leading-none tabular-nums text-ink">{(m as any).loaded === false ? '—' : m.value}</span>
              <span className="text-[12px] text-ink-muted-48">{m.suffix}</span>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Main grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        {/* Left: Charts + Recent List */}
        <div className="lg:col-span-8 flex flex-col gap-lg">
          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            {/* Bar chart */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="glass p-lg"
            >
              <div className="flex items-center justify-between mb-md">
                <h3 className="text-[15px] font-semibold tracking-tight text-ink">发布趋势</h3>
                <span className="text-[11px] text-ink-muted-48">近 6 个月</span>
              </div>
              {barData.every((b) => b.value === 0) ? (
                <div className="h-40 grid place-items-center text-ink-muted-48 gap-2">
                  <span className="material-symbols-outlined text-[32px] opacity-40">bar_chart</span>
                  <p className="text-[13px]">暂无数据</p>
                </div>
              ) : (
                <>
                  <div className="flex items-end gap-2 h-40 border-b border-hairline pb-2">
                    {barData.map((bar) => {
                      const isMax = bar.value === maxBar && bar.value > 0;
                      return (
                        <div key={bar.label} className="flex-1 flex flex-col items-center gap-2 group">
                          <span className="text-[11px] tabular-nums text-ink-muted-48 opacity-0 group-hover:opacity-100 transition">
                            {bar.value}
                          </span>
                          <div className="w-full flex justify-center items-end h-full">
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
                  <div className="flex items-center gap-2 mt-2">
                    {barData.map((d) => (
                      <span key={d.label} className="flex-1 text-center text-[11px] text-ink-muted-48">{d.label}</span>
                    ))}
                  </div>
                </>
              )}
            </motion.div>

            {/* Level distribution */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="glass p-lg flex flex-col"
            >
              <h3 className="text-[15px] font-semibold tracking-tight text-ink mb-md">赛事级别分布</h3>
              <div className="flex-1 flex flex-col justify-center gap-4">
                {levelDist.map((s) => (
                  <div key={s.label}>
                    <div className="flex items-center justify-between text-[12px] mb-1.5">
                      <span className="text-ink-muted-80">{s.label}</span>
                      <span className="text-ink font-semibold tabular-nums">{s.pct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-primary/8 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${s.pct}%` }}
                        transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full bg-primary rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Recent competitions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="glass overflow-hidden"
          >
            <div className="p-md border-b border-hairline flex items-center justify-between">
              <h3 className="text-[15px] font-semibold tracking-tight text-ink">最近发布赛事</h3>
              <button
                className="text-[12px] text-primary hover:text-primary-focus font-medium"
                onClick={() => navigate('/admin/competitions')}
              >
                查看全部 →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-canvas-parchment text-[11px] text-ink-muted-48 border-b border-hairline">
                    <th className="py-3 px-md font-medium">赛事名称</th>
                    <th className="py-3 px-md font-medium">级别</th>
                    <th className="py-3 px-md font-medium">状态</th>
                    <th className="py-3 px-md font-medium text-right">截止日期</th>
                    <th className="py-3 px-md font-medium text-right">操作</th>
                  </tr>
                </thead>
                <motion.tbody className="text-[13px]" variants={listContainer} initial="hidden" animate="visible">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b border-hairline last:border-0 animate-pulse">
                        <td className="py-3 px-md"><div className="h-4 w-40 bg-surface-tile-2 rounded" /></td>
                        <td className="py-3 px-md"><div className="h-6 w-12 bg-surface-tile-2 rounded-full" /></td>
                        <td className="py-3 px-md"><div className="h-4 w-16 bg-surface-tile-2 rounded" /></td>
                        <td className="py-3 px-md text-right"><div className="h-4 w-20 bg-surface-tile-2 rounded ml-auto" /></td>
                        <td className="py-3 px-md text-right"><div className="h-4 w-12 bg-surface-tile-2 rounded ml-auto" /></td>
                      </tr>
                    ))
                  ) : pagedCompetitions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-ink-muted-48 text-[13px]">
                        暂无赛事数据
                      </td>
                    </tr>
                  ) : pagedCompetitions.map((comp, idx) => {
                    const display = statusLabel(comp.status);
                    return (
                      <motion.tr key={comp.id ?? idx} variants={listItem} className="border-b border-hairline last:border-0 hover:bg-primary/6 transition">
                        <td className="py-3 px-md font-medium text-ink truncate max-w-[260px]">{comp.name || comp.title || '未命名赛事'}</td>
                        <td className="py-3 px-md">
                          <span className={levelChipClass(comp.level)}>{comp.level || '校级'}</span>
                        </td>
                        <td className="py-3 px-md">
                          <span className="flex items-center gap-2 text-ink-muted-80">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              comp.status === 'published' ? 'bg-primary' :
                              comp.status === 'closed' ? 'bg-ink-muted-48/80' :
                              comp.status === 'draft' ? 'bg-primary/55' : 'bg-ink-muted-48/80'
                            }`} />
                            {display}
                          </span>
                        </td>
                        <td className="py-3 px-md text-ink-muted-48 tabular-nums text-right">
                          {(comp.endTime || comp.deadline || '—').slice(0, 10)}
                        </td>
                        <td className="py-3 px-md text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => navigate(`/admin/publish/${comp.id}`)}
                              className="p-1.5 rounded-md text-ink-muted-48 hover:text-primary hover:bg-primary/8 transition"
                              title="编辑"
                              aria-label="编辑"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button
                              onClick={() => handleToggleStatus(comp)}
                              className={`p-1.5 rounded-md transition ${
                                comp.status === 'published'
                                  ? 'text-ink-muted-48 hover:text-primary hover:bg-primary/8'
                                  : 'text-ink-muted-48 hover:text-primary hover:bg-primary/8'
                              }`}
                              title={comp.status === 'published' ? '下架' : '上架'}
                              aria-label={comp.status === 'published' ? '下架' : '上架'}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {comp.status === 'published' ? 'visibility_off' : 'visibility'}
                              </span>
                            </button>
                            <button
                              onClick={() => handleDelete(comp.id)}
                              className="p-1.5 rounded-md text-ink-muted-48 hover:text-error hover:bg-error/8 transition"
                              title="删除"
                              aria-label="删除"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            </div>
            {totalCompPages > 1 && (
              <div className="px-md py-3 border-t border-hairline flex items-center justify-between">
                <span className="text-[12px] text-ink-muted-48">
                  共 <span className="text-ink font-medium tabular-nums">{recentCompetitions.length}</span> 条
                </span>
                <Pagination current={currentCompPage} total={recentCompetitions.length} pageSize={compPageSize} onChange={setCurrentCompPage} />
              </div>
            )}
          </motion.div>
        </div>

        {/* Right: Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="lg:col-span-4 glass p-lg flex flex-col gap-md"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold tracking-tight text-ink">待处理事项</h3>
            <span className="chip">{pendingTasks.filter((t) => t.link).length || pendingTasks.length} 项</span>
          </div>
          <motion.div className="flex flex-col" variants={listContainer} initial="hidden" animate="visible">
            {pendingTasks.map((task) => (
              <motion.div
                key={task.title}
                variants={listItem}
                className="py-3 border-b border-hairline last:border-0 group cursor-pointer"
                onClick={() => task.link && navigate(task.link)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    task.tone === 'error' ? 'bg-error' : 'bg-primary'
                  }`} />
                  <span className={`text-[13px] font-semibold group-hover:text-primary transition ${
                    task.tone === 'error' ? 'text-error' : 'text-ink'
                  }`}>{task.title}</span>
                </div>
                <p className="text-[12px] text-ink-muted-80 leading-relaxed pl-3.5">{task.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
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
