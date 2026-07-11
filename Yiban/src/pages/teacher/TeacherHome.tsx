import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import { useStore } from '../../store/useStore';
import CascadeFilter, { type FilterValues } from '../../components/CascadeFilter';
import PageHero from '../../components/PageHero';
import ProgressBar from '../../components/ProgressBar';

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
      { key: '审核通过', label: '已通过', count: 0, tone: 'bg-success' },
      { key: '审核中', label: '审核中', count: 0, tone: 'bg-warning' },
      { key: '已提交', label: '待审核', count: 0, tone: 'bg-primary' },
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
    { label: '参赛学生', value: totalStudents, suffix: '人', hint: '覆盖范围' },
    { label: '参与人次', value: totalRegistrations, suffix: '次', hint: '报名记录' },
    { label: '待审压力', value: pendingReviews, suffix: '项', hint: pendingReviews > 0 ? '需尽快处理' : '暂无积压' },
    { label: '通过率', value: completionRate, suffix: '%', hint: `已通过 ${approvedCount}` },
  ];

  const statusTotal = Math.max(1, statusGroups.reduce((sum, item) => sum + item.count, 0));
  const hasParticipationData = totalRegistrations > 0
    || monitorRows.length > 0
    || trend.some((item) => item.count > 0)
    || recentActivities.length > 0;

  return (
    <div className="teacher-home operator-home flex flex-col gap-4">
      <PageHero
        eyebrow={scopeLabel}
        title="教师工作台"
        description={`${currentUser?.name ?? '老师'}，这里集中展示审核任务、学生参赛和需要关注的异常状态。`}
        actions={(
          <>
            <button type="button" className="btn-primary" onClick={() => navigate(`${basePath}/audit`)} aria-label="前往审核">
              <span className="material-symbols-outlined">fact_check</span>
              去审核中心
            </button>
            <button type="button" className="btn-secondary" onClick={() => navigate(`${basePath}/student-competitions`)} aria-label="学生看板">
              <span className="material-symbols-outlined">groups</span>
              学生看板
            </button>
          </>
        )}
      />

      <section className={`operator-focus-bar ${pendingReviews > 0 ? 'is-urgent' : ''}`}>
        <div className="operator-focus-symbol">
          <span className="material-symbols-outlined">{pendingReviews > 0 ? 'pending_actions' : 'task_alt'}</span>
        </div>
        <div className="min-w-0 flex-1">
          <span className="operator-focus-label">当前优先事项</span>
          <h2>{pendingReviews > 0 ? `${pendingReviews} 项审核等待处理` : '审核队列暂无积压'}</h2>
          <p>{pendingReviews > 0 ? '优先处理临近截止和退回补充的学生材料。' : `当前覆盖 ${totalStudents} 名学生，可继续查看学生竞赛情况。`}</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => navigate(`${basePath}/${pendingReviews > 0 ? 'audit' : 'student-competitions'}`)}>
          {pendingReviews > 0 ? '进入审核' : '查看学生'}
          <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
        </button>
      </section>

      <div className="stat-grid">
        {cockpitMetrics.map((metric) => (
          <div key={metric.label} className="stat-card">
            <div className="stat-card-label">{metric.label}</div>
            <div className="stat-card-value">
              {loading ? '—' : metric.value}
              <span className="ml-1 text-[13px] font-normal text-placeholder">{metric.suffix}</span>
            </div>
            <div className="stat-card-hint">{metric.hint}</div>
          </div>
        ))}
      </div>

      {!loading && !hasParticipationData ? (
        <section className="operator-empty-focus">
          <div className="operator-empty-mark">
            <span className="material-symbols-outlined">query_stats</span>
          </div>
          <div>
            <h2>当前筛选范围暂无参赛记录</h2>
            <p>学生完成报名后，这里会展示审核状态、参赛趋势、班级活跃度与风险事项。</p>
          </div>
          <div className="operator-empty-actions">
            <button type="button" className="btn-primary" onClick={() => navigate(`${basePath}/student-competitions`)}>查看学生名单</button>
            <button type="button" className="btn-secondary" onClick={() => navigate(`${basePath}/competitions`)}>查看赛事</button>
          </div>
        </section>
      ) : (
        <>

      <section className="section-card">
        <div className="section-card-header">
          <div>
            <h2 className="section-card-title">关键状态分布</h2>
            <p className="mt-0.5 text-[12px] text-placeholder">按报名/成果流转状态统计</p>
          </div>
          <span className="chip">{monitorRows.length} 条记录</span>
        </div>
        <div className="section-card-body flex flex-col gap-3">
          <div className="flex h-2.5 overflow-hidden rounded-md bg-surface-chip">
            {statusGroups.map((item) => (
              <div
                key={item.key}
                className={`${item.tone} transition-all`}
                style={{ width: `${(item.count / statusTotal) * 100}%` }}
                title={`${item.label}: ${item.count}`}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {statusGroups.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 text-[12px] text-body-muted">
                  <span className={`h-2 w-2 shrink-0 rounded-md ${item.tone}`} />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="text-[13px] font-medium tabular-nums text-ink">{item.count}</span>
              </div>
            ))}
          </div>
          <div className="rounded-md border border-border bg-surface-tile-1 px-3 py-2.5">
            <p className="text-[12px] text-placeholder">重点专业</p>
            <p className="mt-0.5 text-[14px] font-medium text-ink">{strongestMajor?.major || '暂无数据'}</p>
            <p className="mt-0.5 text-[12px] text-placeholder">
              {strongestMajor ? `${strongestMajor.registrationCount} 次参与，覆盖 ${strongestMajor.studentCount} 名学生` : '筛选后暂无专业参与记录'}
            </p>
          </div>
        </div>
      </section>

      <div className="filter-bar">
        <div className="flex items-center gap-2 text-[13px] font-medium text-ink">
          <span className="material-symbols-outlined text-[18px] text-body-muted">tune</span>
          教师授权范围
        </div>
        <CascadeFilter onChange={handleFilterChange} fixedCollege={scopeCollege || undefined} showCollege={!scopeCollege} />
      </div>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <section className="section-card">
          <div className="section-card-header">
            <div>
              <h2 className="section-card-title">参赛趋势监测</h2>
              <p className="mt-0.5 text-[12px] text-placeholder">近 {Math.max(trend.length, 1)} 个月报名活跃度</p>
            </div>
            <div className="flex gap-1.5">
              <span className="chip">峰值 {trendMax}</span>
              <span className="chip">人均 {stats.activeCoefficient ?? 0} 次</span>
            </div>
          </div>
          <div className="section-card-body">
            {loading ? (
              <div className="empty-panel h-[280px]">
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                <p className="text-[13px]">加载中…</p>
              </div>
            ) : trend.length === 0 || trend.every((t) => t.count === 0) ? (
              <div className="empty-panel h-[280px]">
                <span className="material-symbols-outlined">bar_chart</span>
                <p className="text-[13px]">暂无趋势数据</p>
              </div>
            ) : (
              <div className="relative h-[280px] rounded-md border border-border p-3">
                <div className="absolute inset-x-3 top-3 bottom-10 grid grid-rows-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="border-t border-dashed border-hairline" />
                  ))}
                </div>
                <div className="relative z-10 flex h-full items-end gap-2 pb-8">
                  {trend.map((point) => {
                    const height = Math.max(8, (point.count / trendMax) * 100);
                    const label = point.month.includes('-') ? `${Number(point.month.split('-')[1])}月` : point.month;
                    const active = point.count === trendMax;
                    return (
                      <div key={point.month} className="group flex h-full flex-1 flex-col justify-end gap-2">
                        <div className="flex flex-1 items-end justify-center">
                          <div
                            className={`relative w-full max-w-[48px] rounded-t-md ${active ? 'bg-ink' : 'bg-ink/20'} group-hover:bg-ink/55`}
                            style={{ height: `${height}%` }}
                          >
                            <span className={`absolute -top-6 left-1/2 -translate-x-1/2 text-[12px] font-medium tabular-nums ${active ? 'text-ink' : 'text-placeholder'}`}>
                              {point.count}
                            </span>
                          </div>
                        </div>
                        <span className="text-center text-[11px] text-placeholder">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="section-card flex flex-col">
          <div className="section-card-header">
            <div>
              <h2 className="section-card-title">需要关注</h2>
              <p className="mt-0.5 text-[12px] text-placeholder">退回、驳回、待完善与待审</p>
            </div>
          </div>
          <div className="section-card-body tight flex-1">
            {riskRows.length === 0 ? (
              <div className="empty-panel min-h-[240px]">
                <span className="material-symbols-outlined">task_alt</span>
                <p className="text-[13px]">暂无风险事项</p>
              </div>
            ) : (
              riskRows.map((row, index) => (
                <button
                  key={`${row.id}-${index}`}
                  type="button"
                  onClick={() => row.studentId && navigate(`${basePath}/student-detail?studentId=${row.studentId}`)}
                  className="list-row list-row-clickable w-full text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-ink">{row.studentName}</p>
                    <p className="mt-0.5 truncate text-[12px] text-placeholder">{row.className || '未分班'} · {row.competitionName}</p>
                  </div>
                  <span className={row.status === '审核驳回' ? 'chip chip-error' : 'chip chip-warning'}>{row.status}</span>
                </button>
              ))
            )}
          </div>
        </section>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <section className="section-card">
          <div className="section-card-header">
            <div>
              <h2 className="section-card-title">班级活跃排行</h2>
              <p className="mt-0.5 text-[12px] text-placeholder">按参赛记录数排序</p>
            </div>
            <button type="button" onClick={() => navigate(`${basePath}/student-growth`)} className="text-[12.5px] text-body-muted hover:text-ink">
              学情分析 →
            </button>
          </div>
          <div className="section-card-body">
            {classRank.length === 0 ? (
              <div className="empty-panel py-10">
                <span className="material-symbols-outlined">inbox</span>
                <p className="text-[13px]">暂无班级数据</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {classRank.map((item) => {
                  const width = Math.max(8, (item.count / Math.max(classRank[0]?.count || 1, 1)) * 100);
                  return (
                    <div key={item.className} className="grid grid-cols-[100px_minmax(0,1fr)_48px] items-center gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-ink">{item.className}</p>
                        <p className="truncate text-[11px] text-placeholder">{item.major || '未标注专业'}</p>
                      </div>
                      <ProgressBar value={width} size="sm" segments={4} showThumb instant className="min-w-0" />
                      <div className="text-right">
                        <p className="text-[14px] font-medium tabular-nums text-ink">{item.count}</p>
                        <p className="text-[10px] text-placeholder">人次</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="section-card">
          <div className="section-card-header">
            <div>
              <h2 className="section-card-title">近期动态流</h2>
              <p className="mt-0.5 text-[12px] text-placeholder">最新报名与审核流转</p>
            </div>
            <button type="button" onClick={() => navigate(`${basePath}/student-competitions`)} className="text-[12.5px] text-body-muted hover:text-ink">
              查看学生 →
            </button>
          </div>
          <div className="section-card-body tight">
            {recentActivities.length === 0 ? (
              <div className="empty-panel py-10">
                <span className="material-symbols-outlined">inbox</span>
                <p className="text-[13px]">暂无近期动态</p>
              </div>
            ) : (
              recentActivities.map((item, index) => (
                <div key={index} className="list-row">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-surface-tile-1 text-[12px] font-medium text-body-muted">
                    {(item.studentName || '?')[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-ink">{item.studentName || '未知学生'}</p>
                    <p className="truncate text-[12px] text-placeholder">
                      {item.class || '未分班'} · {item.submitDate ? new Date(item.submitDate).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  <span className={item.status === '审核驳回' ? 'chip chip-error' : item.status === '审核通过' ? 'chip chip-success' : 'chip'}>
                    {item.status || '—'}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </section>

      <section className="section-card">
        <div className="section-card-header">
          <div>
            <h2 className="section-card-title">待审核报名</h2>
            <p className="mt-0.5 text-[12px] text-placeholder">可直接进入审核中心处理</p>
          </div>
          <button type="button" onClick={() => navigate(`${basePath}/audit`)} className="text-[12.5px] text-body-muted hover:text-ink">
            查看全部 →
          </button>
        </div>
        <div className="section-card-body tight">
          {pending.length === 0 ? (
            <div className="empty-panel py-10">
              <span className="material-symbols-outlined">task_alt</span>
              <p className="text-[13px]">暂无待审核</p>
            </div>
          ) : (
            pending.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate('/teacher/audit')}
                className="list-row list-row-clickable w-full text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-ink">{item.studentLabel}</p>
                  <p className="mt-0.5 truncate text-[12px] text-placeholder">{item.competitionLabel}</p>
                </div>
                <span className="chip chip-warning">{item.status}</span>
                <span className="material-symbols-outlined text-[18px] text-placeholder">chevron_right</span>
              </button>
            ))
          )}
        </div>
      </section>
        </>
      )}
    </div>
  );
}
