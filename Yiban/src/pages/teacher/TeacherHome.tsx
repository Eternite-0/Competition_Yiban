import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import { useStore } from '../../store/useStore';
import PageHero from '../../components/PageHero';
import CascadeFilter, { type FilterValues } from '../../components/CascadeFilter';

interface DashboardStats {
  totalStudents?: number;
  totalRegistrations?: number;
  pendingReviews?: number;
  activeCoefficient?: number;
  recentActivities?: Array<{ studentName: string; class?: string; submitDate?: string; status?: string }>;
}

interface TrendPoint {
  month: string;
  count: number;
}

interface PendingItem {
  id: string;
  studentLabel: string;
  competitionLabel: string;
  submitDate: string;
  status: string;
}

export default function TeacherHome() {
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);

  const [stats, setStats] = useState<DashboardStats>({});
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterValues>({});
  const [trend, setTrend] = useState<TrendPoint[]>([]);

  const handleFilterChange = useCallback((f: FilterValues) => {
    setFilters(f);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const filterParams: Record<string, any> = {};
        if (filters.college) filterParams.college = filters.college;
        if (filters.grade) filterParams.grade = filters.grade;
        if (filters.major) filterParams.major = filters.major;
        if (filters.className) filterParams.className = filters.className;

        const [dash, pendingPage, trendData] = await Promise.all([
          apiClient.get('/teacher/dashboard', { params: filterParams }).catch((e) => {
            console.error('dashboard failed', e);
            return {} as DashboardStats;
          }),
          apiClient.get('/registration/pending', { params: { current: 1, size: 5, ...filterParams } }).catch((e) => {
            console.error('pending failed', e);
            return { records: [] } as any;
          }),
          apiClient.get('/teacher/trend', { params: filterParams }).catch(() => ({ monthly: [] })),
        ]);
        if (cancelled) return;
        setStats((dash as DashboardStats) || {});
        const records: any[] = Array.isArray(pendingPage) ? pendingPage : pendingPage?.records ?? [];
        setPending(
          records.map((r: any) => ({
            id: String(r.id ?? r.registrationId),
            studentLabel: r.studentName ?? (r.studentId != null ? `学号 ${r.studentId}` : '未知学生'),
            competitionLabel: r.competitionTitle ?? (r.competitionId != null ? `赛事 #${r.competitionId}` : '未知赛事'),
            submitDate: r.submitDate ?? r.uploadDate ?? '',
            status: r.status ?? '待审核',
          }))
        );
        const monthly: TrendPoint[] = (trendData as any)?.monthly ?? [];
        setTrend(monthly.slice(-6));
      } catch (e: any) {
        toast.error(e?.message || '加载概览失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const metrics = [
    { label: '待审核数', value: String(stats.pendingReviews ?? 0), suffix: '', icon: 'pending_actions' },
    { label: '参赛学生数', value: String(stats.totalStudents ?? 0), suffix: '人', icon: 'group' },
    { label: '赛事参与人次', value: String(stats.totalRegistrations ?? 0), suffix: '', icon: 'event' },
    { label: '人均参赛', value: String(stats.activeCoefficient ?? 0), suffix: '次', icon: 'trending_up' },
  ];

  return (
    <div className="py-lg flex flex-col gap-lg">
      <PageHero
        eyebrow={currentUser?.department || '教师工作台'}
        title="年级总览"
        description={`欢迎回来，${currentUser?.name ?? '老师'}。`}
        actions={(
          <>
            <button className="btn-secondary" onClick={() => navigate('/teacher/audit')} aria-label="前往审核">
              <span className="material-symbols-outlined text-[18px]">fact_check</span>
              前往审核
            </button>
            <button className="btn-primary" onClick={() => navigate('/teacher/student-competitions')} aria-label="学生动态">
              <span className="material-symbols-outlined text-[18px]">groups</span>
              学生动态
            </button>
          </>
        )}
      />

      {/* Filters */}
      <CascadeFilter onChange={handleFilterChange} />

      {/* Metrics */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-md">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass p-lg flex flex-col gap-2 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 bg-gray-200 rounded" />
                <div className="h-[18px] w-[18px] bg-gray-200 rounded" />
              </div>
              <div className="flex items-baseline gap-1">
                <div className="h-8 w-20 bg-gray-200 rounded" />
                <div className="h-3 w-6 bg-gray-200 rounded" />
              </div>
            </div>
          ))
        ) : metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            className="glass p-lg flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-ink-muted-80">{m.label}</span>
              <span className="material-symbols-outlined text-[18px] text-primary">{m.icon}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-display font-semibold text-[34px] leading-none tabular-nums text-ink">{m.value}</span>
              <span className="text-[12px] text-ink-muted-48">{m.suffix}</span>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Trend chart */}
      {trend.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.4 }}
          className="glass p-lg"
        >
          <div className="flex items-center justify-between mb-md">
            <h3 className="text-[15px] font-semibold tracking-tight text-ink">报名趋势</h3>
            <span className="text-[11px] text-ink-muted-48">近 {trend.length} 个月</span>
          </div>
          {loading ? (
            <div className="h-32 grid place-items-center text-ink-muted-48">
              <span className="material-symbols-outlined animate-spin text-[28px]">progress_activity</span>
            </div>
          ) : trend.every((t) => t.count === 0) ? (
            <div className="h-32 grid place-items-center text-ink-muted-48 gap-2">
              <span className="material-symbols-outlined text-[32px] opacity-40">bar_chart</span>
              <p className="text-[13px]">暂无数据</p>
            </div>
          ) : (
            <div className="flex items-end gap-2 h-32 border-b border-hairline pb-2">
              {(() => {
                const maxVal = Math.max(1, ...trend.map((t) => t.count));
                return trend.map((t) => {
                  const isMax = t.count === maxVal && t.count > 0;
                  const label = t.month.split('-')[1] + '月';
                  return (
                    <div key={t.month} className="flex-1 flex flex-col items-center gap-1 group">
                      <span className="text-[11px] tabular-nums text-ink-muted-48 opacity-0 group-hover:opacity-100 transition">
                        {t.count}
                      </span>
                      <div className="w-full flex justify-center items-end h-full">
                        <div
                          className={`w-full max-w-[24px] rounded-t-sm transition-all ${
                            isMax ? 'bg-primary' : 'bg-primary/12 group-hover:bg-primary/60'
                          }`}
                          style={{ height: `${(t.count / maxVal) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-ink-muted-48">{label}</span>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </motion.div>
      )}

      {/* Pending + Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        {/* Pending list */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="lg:col-span-7 glass p-xl"
        >
          <div className="flex items-center justify-between mb-lg">
            <h3 className="text-[19px] font-semibold tracking-tight text-ink">待审核报名</h3>
            <button
              onClick={() => navigate('/teacher/audit')}
              className="text-[12px] text-primary hover:text-primary-focus font-medium"
            >
              查看全部 →
            </button>
          </div>
          {loading ? (
            <div className="flex flex-col">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-hairline last:border-0 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-200" />
                    <div className="flex flex-col gap-1.5">
                      <div className="h-3.5 w-24 bg-gray-200 rounded" />
                      <div className="h-3 w-32 bg-gray-200 rounded" />
                    </div>
                  </div>
                  <div className="h-6 w-14 bg-gray-200 rounded-full" />
                </div>
              ))}
            </div>
          ) : pending.length === 0 ? (
            <div className="py-10 grid place-items-center text-ink-muted-48 gap-2">
              <span className="material-symbols-outlined text-[32px] opacity-40">inbox</span>
              <p className="text-[13px]">暂无待审核</p>
            </div>
          ) : (
            <ul className="flex flex-col">
              {pending.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between py-3 border-b border-hairline last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-canvas-parchment text-ink-muted-80 grid place-items-center font-semibold text-[12px] shrink-0">
                      {p.studentLabel[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium text-ink truncate">{p.studentLabel}</div>
                      <div className="text-[12px] text-ink-muted-48 truncate">{p.competitionLabel} · {p.submitDate ? new Date(p.submitDate).toLocaleDateString() : '—'}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/teacher/audit')}
                    className="chip chip-warning shrink-0 ml-3"
                  >
                    {p.status}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </motion.div>

        {/* Recent activity */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="lg:col-span-5 glass p-xl flex flex-col"
        >
          <div className="flex items-center justify-between mb-lg">
            <h3 className="text-[19px] font-semibold tracking-tight text-ink">近期动态</h3>
            <button
              onClick={() => navigate('/teacher/student-competitions')}
              className="text-[12px] text-primary hover:text-primary-focus font-medium"
            >
              查看学生 →
            </button>
          </div>
          {(stats.recentActivities ?? []).length === 0 ? (
            <div className="py-10 grid place-items-center text-ink-muted-48 gap-2">
              <span className="material-symbols-outlined text-[32px] opacity-40">history</span>
              <p className="text-[13px]">暂无活动</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {(stats.recentActivities ?? []).map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                  className="flex items-center justify-between py-3 border-b border-hairline last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-canvas-parchment text-ink-muted-80 grid place-items-center font-semibold text-[12px] shrink-0">
                      {(a.studentName || '?')[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium text-ink truncate">{a.studentName || '未知'}</div>
                      <div className="text-[12px] text-ink-muted-48 truncate">
                        {a.class || ''}{a.class ? ' · ' : ''}{a.submitDate ? new Date(a.submitDate).toLocaleDateString() : ''}
                      </div>
                    </div>
                  </div>
                  <span className="chip shrink-0 ml-3">{a.status || '—'}</span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </section>
    </div>
  );
}
