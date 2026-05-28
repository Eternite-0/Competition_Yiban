import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import { useStore } from '../../store/useStore';
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

interface MonitorRow {
  id: string;
  studentId?: string;
  studentName: string;
  studentNo?: string;
  className?: string;
  major?: string;
  competitionName: string;
  status: string;
  submitDate?: string;
}

interface OverviewData {
  totalPending?: number;
  totalApproved?: number;
  participationRate?: number;
  majorDistribution?: Array<{
    major: string;
    studentCount: number;
    registrationCount: number;
    awardCount: number;
    participationRate: number;
  }>;
  categoryDistribution?: Record<string, number>;
}

interface PendingItem {
  id: string;
  studentLabel: string;
  competitionLabel: string;
  submitDate: string;
  status: string;
}

function parseTrendMonth(raw: string) {
  const text = String(raw ?? '').trim();
  const currentYear = new Date().getFullYear();
  const iso = text.match(/(\d{4})[-/](\d{1,2})/);
  if (iso) return { year: Number(iso[1]), month: Number(iso[2]) };
  const cn = text.match(/(?:(\d{4})年)?\s*(\d{1,2})月/);
  if (cn) return { year: cn[1] ? Number(cn[1]) : currentYear, month: Number(cn[2]) };
  const numeric = text.match(/^(\d{1,2})$/);
  if (numeric) return { year: currentYear, month: Number(numeric[1]) };
  return null;
}

function normalizeTrend(points: TrendPoint[], minMonths = 6) {
  const now = new Date();
  const values = new Map<string, number>();
  let latestSerial = now.getFullYear() * 12 + now.getMonth() + 1;

  points.forEach((point) => {
    const parsed = parseTrendMonth(point.month);
    if (!parsed || parsed.month < 1 || parsed.month > 12) return;
    const serial = parsed.year * 12 + parsed.month;
    latestSerial = Math.max(latestSerial, serial);
    const key = `${parsed.year}-${String(parsed.month).padStart(2, '0')}`;
    values.set(key, (values.get(key) ?? 0) + Number(point.count || 0));
  });

  const visibleMonths = Math.max(minMonths, Math.min(8, values.size || minMonths));
  return Array.from({ length: visibleMonths }, (_, index) => {
    const serial = latestSerial - visibleMonths + 1 + index;
    const year = Math.floor((serial - 1) / 12);
    const month = ((serial - 1) % 12) + 1;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    return { month: `${month}月`, count: values.get(key) ?? 0 };
  });
}

export default function TeacherHome() {
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);
  const basePath = '/teacher';
  const scopeCollege = currentUser?.department || (currentUser as any)?.college || '';

  const [stats, setStats] = useState<DashboardStats>({});
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterValues>({});
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [monitorRows, setMonitorRows] = useState<MonitorRow[]>([]);
  const [overview, setOverview] = useState<OverviewData>({});
  const scopeLabel = filters.college || scopeCollege || '学院';

  const handleFilterChange = useCallback((f: FilterValues) => {
    setFilters(f);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const filterParams: Record<string, any> = {};
        if (filters.college || scopeCollege) filterParams.college = filters.college || scopeCollege;
        if (filters.grade) filterParams.grade = filters.grade;
        if (filters.major) filterParams.major = filters.major;
        if (filters.className) filterParams.className = filters.className;

        const [dash, pendingPage, trendData, monitorPage, overviewData] = await Promise.all([
          apiClient.get('/teacher/dashboard', { params: filterParams }).catch((e) => {
            console.error('dashboard failed', e);
            return {} as DashboardStats;
          }),
          apiClient.get('/registration/pending', { params: { current: 1, size: 5, ...filterParams } }).catch((e) => {
            console.error('pending failed', e);
            return { records: [] } as any;
          }),
          apiClient.get('/teacher/trend', { params: filterParams }).catch(() => ({ monthly: [] })),
          apiClient.get('/teacher/monitor/registrations', {
            params: { current: 1, size: 200, ...filterParams },
          }).catch(() => ({ records: [] })),
          apiClient.get('/teacher/college-overview', { params: filterParams }).catch(() => ({})),
        ]);
        if (cancelled) return;
        setStats((dash as DashboardStats) || {});
        const pendingPayload: any = pendingPage;
        const records: any[] = Array.isArray(pendingPayload) ? pendingPayload : pendingPayload?.records ?? [];
        setPending(
          records.map((r: any) => ({
            id: String(r.id ?? r.registrationId),
            studentLabel: r.studentName ?? (r.studentId != null ? `学号 ${r.studentId}` : '未知学生'),
            competitionLabel: r.competitionName ?? r.competitionTitle ?? (r.competitionId != null ? `赛事 #${r.competitionId}` : '未知赛事'),
            submitDate: r.submitDate ?? r.uploadDate ?? '',
            status: r.status ?? '待审核',
          }))
        );
        const monthly: TrendPoint[] = (trendData as any)?.monthly ?? [];
        setTrend(normalizeTrend(monthly));
        const monitorPayload: any = monitorPage;
        const monitorRecords: any[] = Array.isArray(monitorPayload) ? monitorPayload : monitorPayload?.records ?? [];
        setMonitorRows(
          monitorRecords.map((r: any) => ({
            id: String(r.id ?? r.registrationId),
            studentId: r.studentId != null ? String(r.studentId) : undefined,
            studentName: r.studentName ?? (r.studentId != null ? `学号 ${r.studentId}` : '未知学生'),
            studentNo: r.studentNo,
            className: r.className,
            major: r.major,
            competitionName: r.competitionName ?? r.competitionTitle ?? (r.competitionId != null ? `赛事 #${r.competitionId}` : '未知赛事'),
            status: r.status ?? '未知',
            submitDate: r.submitDate,
          }))
        );
        setOverview((overviewData as OverviewData) || {});
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
  }, [filters, scopeCollege]);

  const statusGroups = useMemo(() => {
    const base = [
      { key: '审核通过', label: '已通过', count: 0, tone: 'bg-primary' },
      { key: '审核中', label: '审核中', count: 0, tone: 'bg-primary/60' },
      { key: '已提交', label: '待审核', count: 0, tone: 'bg-primary/35' },
      { key: '退回补充', label: '需补充', count: 0, tone: 'bg-warning' },
      { key: '审核驳回', label: '已驳回', count: 0, tone: 'bg-error' },
      { key: '待完善', label: '待完善', count: 0, tone: 'bg-surface-chip' },
    ];
    const map = new Map(base.map((item) => [item.key, item]));
    monitorRows.forEach((row) => {
      const item = map.get(row.status);
      if (item) item.count += 1;
    });
    return base;
  }, [monitorRows]);

  const classRank = useMemo(() => {
    const map = new Map<string, { className: string; major?: string; count: number; pending: number; approved: number }>();
    monitorRows.forEach((row) => {
      const key = row.className || '未分班';
      const item = map.get(key) ?? { className: key, major: row.major, count: 0, pending: 0, approved: 0 };
      item.count += 1;
      if (row.status === '已提交' || row.status === '审核中' || row.status === '退回补充' || row.status === '待完善') item.pending += 1;
      if (row.status === '审核通过') item.approved += 1;
      map.set(key, item);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [monitorRows]);

  const riskRows = useMemo(
    () => monitorRows
      .filter((row) => ['待完善', '退回补充', '审核驳回', '已提交', '审核中'].includes(row.status))
      .slice(0, 6),
    [monitorRows]
  );

  const recentActivities = stats.recentActivities ?? [];
  const trendMax = Math.max(1, ...trend.map((t) => t.count));
  const totalRegistrations = stats.totalRegistrations ?? 0;
  const totalStudents = stats.totalStudents ?? 0;
  const pendingReviews = stats.pendingReviews ?? overview.totalPending ?? 0;
  const approvedCount = overview.totalApproved ?? statusGroups.find((item) => item.key === '审核通过')?.count ?? 0;
  const completionRate = totalRegistrations > 0 ? Math.round((approvedCount / totalRegistrations) * 100) : 0;
  const strongestMajor = (overview.majorDistribution ?? [])
    .slice()
    .sort((a, b) => b.registrationCount - a.registrationCount)[0];

  const cockpitMetrics = [
    { label: '参赛学生', value: totalStudents, suffix: '人', icon: 'groups', accent: 'text-primary' },
    { label: '参与人次', value: totalRegistrations, suffix: '次', icon: 'event_available', accent: 'text-primary' },
    { label: '待审压力', value: pendingReviews, suffix: '项', icon: 'pending_actions', accent: 'text-primary' },
    { label: '通过率', value: completionRate, suffix: '%', icon: 'verified', accent: 'text-primary' },
  ];

  const statusTotal = Math.max(1, statusGroups.reduce((sum, item) => sum + item.count, 0));

  return (
    <div className="py-lg flex flex-col gap-lg">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="glass-strong relative overflow-hidden text-ink"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-primary/20" />
        <div className="grid gap-lg p-lg lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)]">
          <div className="flex min-w-0 flex-col justify-between gap-xl">
            <div className="flex flex-wrap items-start justify-between gap-md">
              <div>
                <p className="text-[12px] uppercase tracking-[0.22em] text-ink-muted-48">Teacher Command Center</p>
                <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-tight sm:text-[38px]">
                  {scopeLabel}竞赛态势总览
                </h1>
                <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-muted-48">
                  {currentUser?.name ?? '老师'}，当前视图覆盖 {totalStudents} 名学生、{totalRegistrations} 条参赛记录，适合快速判断班级活跃度与待处理压力。
                </p>
              </div>
              <div className="flex flex-wrap gap-sm">
                <button
                  className="btn-utility h-10"
                  onClick={() => navigate(`${basePath}/audit`)}
                  aria-label="前往审核"
                >
                  <span className="material-symbols-outlined text-[17px]">fact_check</span>
                  审核中心
                </button>
                <button
                  className="btn-utility h-10"
                  onClick={() => navigate(`${basePath}/student-competitions`)}
                  aria-label="学生动态"
                >
                  <span className="material-symbols-outlined text-[17px]">groups</span>
                  学生动态
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-sm lg:grid-cols-4">
              {cockpitMetrics.map((metric, index) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + index * 0.05, duration: 0.35 }}
                  className="rounded-md border border-hairline bg-canvas-parchment p-md"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-[12px] text-ink-muted-48">{metric.label}</span>
                    <span className={`material-symbols-outlined text-[18px] ${metric.accent}`}>{metric.icon}</span>
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="font-display text-[36px] font-semibold leading-none tracking-normal tabular-nums">
                      {loading ? '—' : metric.value}
                    </span>
                    <span className="pb-1 text-[12px] text-ink-muted-48">{metric.suffix}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-hairline bg-canvas-parchment p-md">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-semibold text-ink">关键状态分布</h2>
                <p className="text-[11px] text-ink-muted-48">按报名/成果流转状态统计</p>
              </div>
              <span className="rounded-md border border-hairline bg-canvas px-2 py-1 text-[11px] text-ink-muted-48">
                {monitorRows.length} 条记录
              </span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-surface-chip">
              {statusGroups.map((item) => (
                <div
                  key={item.key}
                  className={`${item.tone} transition-all`}
                  style={{ width: `${(item.count / statusTotal) * 100}%` }}
                  title={`${item.label}: ${item.count}`}
                />
              ))}
            </div>
            <div className="mt-md grid grid-cols-2 gap-2 sm:grid-cols-3">
              {statusGroups.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-2 rounded-md border border-hairline bg-canvas px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2 text-[12px] text-ink-muted-80">
                    <span className={`h-2 w-2 rounded-full ${item.tone}`} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="text-[13px] font-semibold tabular-nums">{item.count}</span>
                </div>
              ))}
            </div>
            <div className="mt-md rounded-md border border-hairline bg-canvas p-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted-48">重点专业</p>
              <p className="mt-1 text-[15px] font-semibold text-ink">{strongestMajor?.major || '暂无数据'}</p>
              <p className="mt-1 text-[12px] text-ink-muted-48">
                {strongestMajor ? `${strongestMajor.registrationCount} 次参与，覆盖 ${strongestMajor.studentCount} 名学生` : '筛选后暂无专业参与记录'}
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      <section className="glass-tint flex flex-col gap-3 px-md py-3 lg:flex-row lg:items-center">
        <div className="flex items-center gap-2 text-[13px] font-medium text-ink">
          <span className="material-symbols-outlined text-[18px] text-primary">tune</span>
          教师授权范围
        </div>
        <CascadeFilter onChange={handleFilterChange} fixedCollege={scopeCollege || undefined} showCollege={!scopeCollege} />
      </section>

      <section className="grid grid-cols-1 gap-lg xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.6fr)]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.4 }}
          className="glass overflow-hidden"
        >
          <div className="flex flex-wrap items-start justify-between gap-md border-b border-hairline p-lg">
            <div>
              <h2 className="text-[20px] font-semibold tracking-tight text-ink">参赛趋势监测</h2>
              <p className="mt-1 text-[12px] text-ink-muted-48">近 {Math.max(trend.length, 1)} 个月报名活跃度，含空档月份。</p>
            </div>
            <div className="flex gap-2">
              <span className="chip chip-primary">峰值 {trendMax}</span>
              <span className="chip">人均 {stats.activeCoefficient ?? 0} 次</span>
            </div>
          </div>
          <div className="p-lg">
            {loading ? (
              <div className="h-[320px] grid place-items-center text-ink-muted-48">
                <span className="material-symbols-outlined animate-spin text-[30px]">progress_activity</span>
              </div>
            ) : trend.length === 0 || trend.every((t) => t.count === 0) ? (
              <div className="h-[320px] grid place-items-center text-ink-muted-48 gap-2">
                <span className="material-symbols-outlined text-[34px] opacity-40">bar_chart</span>
                <p className="text-[13px]">暂无趋势数据</p>
              </div>
            ) : (
              <div className="relative h-[320px] rounded-md border border-hairline bg-canvas p-md">
                <div className="absolute inset-x-md top-md bottom-10 grid grid-rows-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="border-t border-dashed border-hairline" />
                  ))}
                </div>
                <div className="relative z-10 flex h-full items-end gap-3 pb-8">
                  {trend.map((point, index) => {
                    const height = Math.max(8, (point.count / trendMax) * 100);
                    const label = point.month.includes('-') ? `${Number(point.month.split('-')[1])}月` : point.month;
                    const active = point.count === trendMax;
                    return (
                      <div key={point.month} className="group flex h-full flex-1 flex-col justify-end gap-2">
                        <div className="flex flex-1 items-end justify-center">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ delay: index * 0.04, duration: 0.55, ease: 'easeOut' }}
                            className={`relative w-full max-w-[56px] rounded-t-md ${active ? 'bg-primary' : 'bg-primary/18'} group-hover:bg-primary/70`}
                          >
                            <span className={`absolute -top-7 left-1/2 -translate-x-1/2 text-[12px] font-semibold tabular-nums ${active ? 'text-primary' : 'text-ink-muted-48'}`}>
                              {point.count}
                            </span>
                          </motion.div>
                        </div>
                        <span className="text-center text-[11px] text-ink-muted-48">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.4 }}
          className="glass flex flex-col overflow-hidden"
        >
          <div className="border-b border-hairline p-lg">
            <h2 className="text-[18px] font-semibold tracking-tight text-ink">需要关注</h2>
            <p className="mt-1 text-[12px] text-ink-muted-48">退回、驳回、待完善与待审记录。</p>
          </div>
          <div className="flex-1 p-md">
            {riskRows.length === 0 ? (
              <div className="grid min-h-[260px] place-items-center text-ink-muted-48">
                <div className="text-center">
                  <span className="material-symbols-outlined text-[34px] opacity-40">task_alt</span>
                  <p className="mt-2 text-[13px]">暂无风险事项</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {riskRows.map((row, index) => (
                  <motion.button
                    key={`${row.id}-${index}`}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04, duration: 0.3 }}
                    onClick={() => row.studentId && navigate(`${basePath}/student-detail?studentId=${row.studentId}`)}
                    className="rounded-md border border-hairline bg-canvas px-3 py-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-ink">{row.studentName}</p>
                        <p className="mt-0.5 truncate text-[11px] text-ink-muted-48">{row.className || '未分班'} · {row.competitionName}</p>
                      </div>
                      <span className={row.status === '审核驳回' ? 'chip chip-error' : 'chip chip-warning'}>{row.status}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </section>

      <section className="grid grid-cols-1 gap-lg xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.4 }}
          className="glass overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-hairline p-lg">
            <div>
              <h2 className="text-[18px] font-semibold tracking-tight text-ink">班级活跃排行</h2>
              <p className="mt-1 text-[12px] text-ink-muted-48">按当前筛选范围内参赛记录数排序。</p>
            </div>
            <button
              onClick={() => navigate(`${basePath}/student-growth`)}
              className="text-[12px] font-medium text-primary hover:text-primary-focus"
            >
              学情分析 →
            </button>
          </div>
          <div className="p-lg">
            {classRank.length === 0 ? (
              <div className="py-14 text-center text-[13px] text-ink-muted-48">暂无班级数据</div>
            ) : (
              <div className="flex flex-col gap-4">
                {classRank.map((item, index) => {
                  const width = Math.max(8, (item.count / Math.max(classRank[0]?.count || 1, 1)) * 100);
                  return (
                    <div key={item.className} className="grid grid-cols-[100px_minmax(0,1fr)_52px] items-center gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-ink">{item.className}</p>
                        <p className="truncate text-[11px] text-ink-muted-48">{item.major || '未标注专业'}</p>
                      </div>
                      <div className="h-8 rounded-md bg-primary/8 p-1">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${width}%` }}
                          transition={{ delay: index * 0.04, duration: 0.45 }}
                          className="h-full rounded-sm bg-primary"
                        />
                      </div>
                      <div className="text-right">
                        <p className="text-[15px] font-semibold tabular-nums text-ink">{item.count}</p>
                        <p className="text-[10px] text-ink-muted-48">人次</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26, duration: 0.4 }}
          className="glass overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-hairline p-lg">
            <div>
              <h2 className="text-[18px] font-semibold tracking-tight text-ink">近期动态流</h2>
              <p className="mt-1 text-[12px] text-ink-muted-48">最新报名、审核和材料流转。</p>
            </div>
            <button
              onClick={() => navigate(`${basePath}/student-competitions`)}
              className="text-[12px] font-medium text-primary hover:text-primary-focus"
            >
              查看学生 →
            </button>
          </div>
          <div className="p-md">
            {recentActivities.length === 0 ? (
              <div className="py-14 text-center text-[13px] text-ink-muted-48">暂无近期动态</div>
            ) : (
              <div className="flex flex-col">
                {recentActivities.map((item, index) => (
                  <div key={index} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 border-b border-hairline px-1 py-3 last:border-0">
                    <div className="grid h-8 w-8 place-items-center rounded-md bg-canvas-parchment text-[12px] font-semibold text-ink-muted-80">
                      {(item.studentName || '?')[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink">{item.studentName || '未知学生'}</p>
                      <p className="truncate text-[11px] text-ink-muted-48">
                        {item.class || '未分班'} · {item.submitDate ? new Date(item.submitDate).toLocaleDateString() : '—'}
                      </p>
                    </div>
                    <span className={item.status === '审核驳回' ? 'chip chip-error' : item.status === '审核通过' ? 'chip chip-success' : 'chip'}>
                      {item.status || '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </section>

      <section className="glass overflow-hidden">
          <div className="flex items-center justify-between border-b border-hairline p-lg">
            <div>
              <h2 className="text-[18px] font-semibold tracking-tight text-ink">待审核报名</h2>
              <p className="mt-1 text-[12px] text-ink-muted-48">教师角色可直接进入审核中心处理。</p>
            </div>
            <button
              onClick={() => navigate(`${basePath}/audit`)}
              className="text-[12px] font-medium text-primary hover:text-primary-focus"
            >
              查看全部 →
            </button>
          </div>
          <div className="p-md">
            {pending.length === 0 ? (
              <div className="py-10 text-center text-[13px] text-ink-muted-48">暂无待审核</div>
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {pending.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate('/teacher/audit')}
                    className="rounded-md border border-hairline bg-canvas p-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-ink">{item.studentLabel}</p>
                        <p className="mt-0.5 truncate text-[11px] text-ink-muted-48">{item.competitionLabel}</p>
                      </div>
                      <span className="chip chip-warning">{item.status}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
      </section>
    </div>
  );
}
