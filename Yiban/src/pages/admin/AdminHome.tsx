import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiClient from '../../api/client';
import { useStore } from '../../store/useStore';
import PageHero from '../../components/PageHero';

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

const pendingTasks: Array<{ title: string; description: string; tone: 'primary' | 'error' }> = [
  {
    title: '待审核报名信息',
    description: '"2024 创新创业大赛" 有 12 份新提交的团队报名表单需要人工核验资格。',
    tone: 'primary' as const,
  },
  {
    title: '待补充附件模板',
    description: '"校级电子设计竞赛" 缺少官方统一格式的论文模板附件，请尽快上传。',
    tone: 'primary' as const,
  },
  {
    title: '即将截止赛事',
    description: '"物理实验竞赛" 报名阶段即将结束，目前仍有 5 支队伍状态异常。',
    tone: 'primary' as const,
  },
];

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

export default function AdminHome() {
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);

  const [records, setRecords] = useState<CompetitionRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);

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

  const metrics = [
    { label: '赛事总数', value: total, suffix: '场', icon: 'event' },
    { label: '进行中', value: counts.published, suffix: '场', icon: 'play_circle' },
    { label: '已结束', value: counts.closed, suffix: '场', icon: 'flag', tone: 'warning' as const },
    { label: '草稿', value: counts.draft, suffix: '场', icon: 'edit_note' },
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

  const greetingName = currentUser?.name?.trim() || '管理员';

  return (
    <div className="py-lg flex flex-col gap-lg">
      <PageHero
        eyebrow="Workspace"
        title={`${greetingName}，欢迎回来`}
        description="查看平台运营概览，处理待办事项。"
        actions={(
          <button onClick={() => navigate('/admin/publish')} className="btn-primary">
            <span className="material-symbols-outlined text-[18px]">add</span>
            发布新赛事
          </button>
        )}
      />

      {/* Metrics */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-md">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            className="glass p-lg flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-ink-muted-80">{m.label}</span>
              <span className={`material-symbols-outlined text-[18px] ${
                m.tone === 'warning' ? 'text-primary' : 'text-primary'
              }`}>{m.icon}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-display font-semibold text-[34px] leading-none tabular-nums text-ink">{loading ? '—' : m.value}</span>
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
                  <tr className="bg-canvas-parchment text-[11px] uppercase tracking-wider text-ink-muted-48 border-b border-hairline">
                    <th className="py-3 px-md font-medium">赛事名称</th>
                    <th className="py-3 px-md font-medium">级别</th>
                    <th className="py-3 px-md font-medium">状态</th>
                    <th className="py-3 px-md font-medium text-right">截止日期</th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  {recentCompetitions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-ink-muted-48 text-[13px]">
                        {loading ? '加载中…' : '暂无赛事数据'}
                      </td>
                    </tr>
                  ) : recentCompetitions.map((comp, idx) => {
                    const display = statusLabel(comp.status);
                    return (
                      <tr key={comp.id ?? idx} className="border-b border-hairline last:border-0 hover:bg-primary/6 transition">
                        <td className="py-3 px-md font-medium text-ink truncate max-w-[300px]">{comp.name || comp.title || '未命名赛事'}</td>
                        <td className="py-3 px-md">
                          <span className="chip">{comp.level || '校级'}</span>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
            <span className="chip">{pendingTasks.length} 项</span>
          </div>
          <div className="flex flex-col">
            {pendingTasks.map((task, i) => (
              <motion.div
                key={task.title}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.06, duration: 0.4 }}
                className="py-3 border-b border-hairline last:border-0 group cursor-pointer"
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
          </div>
        </motion.div>
      </section>
    </div>
  );
}
