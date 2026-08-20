import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import CascadeFilter, { type FilterValues } from '../../components/CascadeFilter';
import PageHero from '../../components/PageHero';
import ProgressBar from '../../components/ProgressBar';

type RiskLevel = 'high' | 'attention' | 'normal' | 'unknown';

interface AcademicRisk {
  level: RiskLevel;
  title: string;
  detail: string;
}

interface WarningRecord {
  studentId: number;
  username: string;
  realName: string;
  major: string;
  className: string;
  grade: string;
  riskLevel: RiskLevel;
  riskLabel: string;
  gpa?: number | string | null;
  requiredCredits?: number | string | null;
  earnedCredits?: number | string | null;
  missingCredits?: number | string | null;
  failedCourses?: number | null;
  missedCourses?: number | null;
  inProgressCourses?: number | null;
  syncedAt?: string | null;
  risks?: AcademicRisk[];
}

interface WarningData {
  totalStudents: number;
  syncedStudents: number;
  unsyncedStudents: number;
  highCount: number;
  attentionCount: number;
  normalCount: number;
  unknownCount: number;
  failedCourseCount: number;
  missingCreditsTotal: number | string;
  records: WarningRecord[];
}

const riskMeta: Record<RiskLevel, { label: string; chip: string; icon: string; color: string }> = {
  high: { label: '高风险', chip: 'chip chip-error', icon: 'priority_high', color: 'var(--color-error)' },
  attention: { label: '需要关注', chip: 'chip chip-warning', icon: 'info', color: 'var(--color-warning)' },
  normal: { label: '情况正常', chip: 'chip chip-success', icon: 'check_circle', color: 'var(--color-success)' },
  unknown: { label: '待同步', chip: 'chip', icon: 'sync_problem', color: 'var(--color-placeholder)' },
};

function displayNumber(value?: number | string | null, digits = 1) {
  if (value === null || value === undefined || value === '') return '暂无';
  const number = Number(value);
  if (!Number.isFinite(number)) return '暂无';
  return Number.isInteger(number) ? String(number) : number.toFixed(digits).replace(/\.0$/, '');
}

function displayDate(value?: string | null) {
  if (!value) return '未同步';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('zh-CN');
}

export default function AcademicWarning() {
  const navigate = useNavigate();
  const [data, setData] = useState<WarningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterValues>({});
  const [riskFilter, setRiskFilter] = useState<'all' | RiskLevel>('all');
  const [keyword, setKeyword] = useState('');

  const loadWarnings = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.college) params.college = filters.college;
      if (filters.grade) params.grade = filters.grade;
      if (filters.major) params.major = filters.major;
      if (filters.className) params.className = filters.className;
      const result = await apiClient.get('/teacher/academic-warnings', { params });
      setData(result as unknown as WarningData);
    } catch (error: any) {
      toast.error(error?.message || '加载学业预警数据失败');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadWarnings();
  }, [loadWarnings]);

  const visibleRecords = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return (data?.records ?? []).filter((record) => {
      if (riskFilter !== 'all' && record.riskLevel !== riskFilter) return false;
      if (!query) return true;
      return [record.realName, record.username, record.major, record.className]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [data, keyword, riskFilter]);

  const stats = data
    ? [
        { label: '学院学生', value: data.totalStudents, suffix: '人', icon: 'groups', tone: 'primary' },
        { label: '高风险', value: data.highCount, suffix: '人', icon: 'warning', tone: 'error' },
        { label: '需要关注', value: data.attentionCount, suffix: '人', icon: 'notifications_active', tone: 'warning' },
        { label: '待同步', value: data.unsyncedStudents, suffix: '人', icon: 'cloud_off', tone: 'muted' },
        { label: '未通过课程', value: data.failedCourseCount, suffix: '门', icon: 'menu_book', tone: 'error' },
      ]
    : [];

  const distribution = data
    ? (['high', 'attention', 'normal', 'unknown'] as RiskLevel[]).map((level) => ({
        level,
        ...riskMeta[level],
        count: data[`${level === 'high' ? 'high' : level === 'attention' ? 'attention' : level === 'normal' ? 'normal' : 'unknown'}Count` as keyof WarningData] as number,
      }))
    : [];

  return (
    <div className="flex flex-col gap-4">
      <PageHero
        eyebrow="Academic care"
        title="学业预警看板"
        description="集中查看学院内学分缺口、未通过课程、GPA 偏低和教务数据未同步的学生。"
        density="feature"
      />

      <div className="filter-bar">
        <CascadeFilter onChange={setFilters} />
        <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as 'all' | RiskLevel)} className="input-glass h-9 !w-auto min-w-[120px] text-footnote">
          <option value="all">全部风险等级</option>
          <option value="high">高风险</option>
          <option value="attention">需要关注</option>
          <option value="normal">情况正常</option>
          <option value="unknown">待同步</option>
        </select>
        <div className="relative min-w-[180px] flex-1 md:max-w-[250px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-placeholder">search</span>
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索姓名、学号或班级" className="input-glass h-9 pl-9 text-footnote" />
        </div>
      </div>

      {loading ? (
        <div className="empty-panel py-16"><span className="material-symbols-outlined animate-spin">progress_activity</span><p className="text-footnote">正在整理学业风险数据…</p></div>
      ) : !data ? (
        <div className="empty-panel py-16"><span className="material-symbols-outlined">error_outline</span><p className="text-footnote">暂无预警数据</p></div>
      ) : (
        <>
          <section className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-error/5 via-surface-pearl to-surface-pearl px-5 py-5 shadow-sm sm:px-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-warning/10 blur-3xl" />
            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-2 flex items-center gap-2 text-caption font-medium uppercase tracking-[0.16em] text-warning"><span className="material-symbols-outlined text-[17px]">health_and_safety</span>Student care</div>
                <h2 className="text-title-3 font-semibold tracking-tight text-ink">把风险变成可跟进的名单</h2>
                <p className="mt-2 text-footnote leading-relaxed text-body-muted">预警结果来自学生最近一次教务同步，仅用于教师日常提醒和帮扶安排，不替代教务处正式毕业审核结论。</p>
              </div>
              <div className="rounded-lg border border-warning/20 bg-warning/5 px-4 py-3 text-footnote text-body-muted lg:max-w-[320px]">
                <div className="flex items-center gap-2 font-medium text-ink"><span className="material-symbols-outlined text-[18px] text-warning">schedule</span>数据更新时间</div>
                <p className="mt-1">已同步学生 {data.syncedStudents} 人 · 尚未同步 {data.unsyncedStudents} 人</p>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            {stats.map((stat) => (
              <div key={stat.label} className="stat-card relative overflow-hidden">
                <div className={`absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full ${stat.tone === 'error' ? 'bg-error/10 text-error' : stat.tone === 'warning' ? 'bg-warning/10 text-warning' : stat.tone === 'primary' ? 'bg-primary-soft text-primary' : 'bg-surface-tile-1 text-placeholder'}`}><span className="material-symbols-outlined text-[19px]">{stat.icon}</span></div>
                <div className="stat-card-label">{stat.label}</div>
                <div className="mt-1 pr-10 text-title-2 font-semibold tabular-nums text-ink">{stat.value}<span className="ml-1 text-footnote font-normal text-placeholder">{stat.suffix}</span></div>
                <div className={`mt-2 h-1 w-12 rounded-full ${stat.tone === 'error' ? 'bg-error' : stat.tone === 'warning' ? 'bg-warning' : stat.tone === 'primary' ? 'bg-primary' : 'bg-placeholder'}`} />
              </div>
            ))}
          </div>

          <section className="grid grid-cols-1 gap-3 lg:grid-cols-[1.1fr_.9fr]">
            <section className="section-card">
              <div className="section-card-header"><div><h2 className="section-card-title">风险分布</h2><p className="mt-1 text-caption text-body-muted">按当前筛选范围统计</p></div><span className="chip">{data.totalStudents} 人</span></div>
              <div className="section-card-body flex flex-col gap-4">
                {distribution.map((item) => (
                  <div key={item.level}>
                    <div className="mb-1.5 flex items-center justify-between text-footnote"><span className="flex items-center gap-2 font-medium text-ink"><span className="grid h-6 w-6 place-items-center rounded-full bg-surface-tile-1" style={{ color: item.color }}><span className="material-symbols-outlined text-[15px]">{item.icon}</span></span>{item.label}</span><span className="tabular-nums text-body-muted">{item.count} 人 · {data.totalStudents ? Math.round((item.count / data.totalStudents) * 100) : 0}%</span></div>
                    <ProgressBar value={data.totalStudents ? (item.count / data.totalStudents) * 100 : 0} size="sm" showThumb instant />
                  </div>
                ))}
              </div>
            </section>
            <section className="section-card">
              <div className="section-card-header"><div><h2 className="section-card-title">教师跟进提示</h2><p className="mt-1 text-caption text-body-muted">优先处理最可能影响毕业进度的情况</p></div><span className="material-symbols-outlined text-warning">tips_and_updates</span></div>
              <div className="section-card-body space-y-3">
                <div className="rounded-lg border border-error/15 bg-error/5 p-3"><div className="flex items-center gap-2 text-footnote font-medium text-ink"><span className="material-symbols-outlined text-[18px] text-error">priority_high</span>先看高风险学生</div><p className="mt-1 text-caption leading-relaxed text-body-muted">重点关注学分缺口较大、挂科达到 3 门或 GPA 明显偏低的学生。</p></div>
                <div className="rounded-lg border border-warning/15 bg-warning/5 p-3"><div className="flex items-center gap-2 text-footnote font-medium text-ink"><span className="material-symbols-outlined text-[18px] text-warning">forum</span>安排一对一沟通</div><p className="mt-1 text-caption leading-relaxed text-body-muted">核对补考、重修和培养方案选课计划，明确下一步帮扶动作。</p></div>
                <div className="rounded-lg border border-primary/15 bg-primary-soft/50 p-3"><div className="flex items-center gap-2 text-footnote font-medium text-ink"><span className="material-symbols-outlined text-[18px] text-primary">sync</span>提醒未同步学生</div><p className="mt-1 text-caption leading-relaxed text-body-muted">未同步不代表没有风险，建议提醒学生完成教务数据连接后再判断。</p></div>
              </div>
            </section>
          </section>

          <section className="section-card overflow-hidden">
            <div className="section-card-header"><div><h2 className="section-card-title">学生预警名单</h2><p className="mt-1 text-caption text-body-muted">共匹配 {visibleRecords.length} 人，按风险等级排序</p></div><span className="chip chip-warning">需要跟进</span></div>
            {data.syncedStudents === 0 ? (
              <div className="px-5 py-12 text-center sm:px-8"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary"><span className="material-symbols-outlined text-[28px]">cloud_sync</span></div><h3 className="mt-4 text-subhead font-semibold text-ink">学院还没有教务同步数据</h3><p className="mx-auto mt-2 max-w-xl text-footnote leading-relaxed text-body-muted">当前学生名单已经加载，但还不能据此判断挂科或毕业风险。请先让学生在学业中心完成教务数据同步，之后这里会自动生成预警。</p></div>
            ) : visibleRecords.length === 0 ? (
              <div className="empty-panel py-12"><span className="material-symbols-outlined">search_off</span><p className="text-footnote">没有匹配的学生</p></div>
            ) : (
              <div className="divide-y divide-hairline">
                {visibleRecords.map((record) => {
                  const meta = riskMeta[record.riskLevel] || riskMeta.unknown;
                  const reasons = (record.risks ?? []).filter((risk) => risk.level !== 'normal').slice(0, 2);
                  return (
                    <div key={record.studentId} className="flex flex-col gap-4 px-4 py-4 transition hover:bg-hover-overlay sm:px-5 lg:flex-row lg:items-center">
                      <div className="flex min-w-0 items-center gap-3 lg:w-[27%]">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-tile-1 text-footnote font-semibold text-body-muted">{record.realName?.slice(0, 1) || '?'}</div>
                        <div className="min-w-0"><p className="truncate text-footnote font-medium text-ink">{record.realName}</p><p className="mt-0.5 truncate text-caption-2 text-placeholder">{record.username} · {record.major}</p><p className="truncate text-caption-2 text-placeholder">{record.className}</p></div>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                        <span className={meta.chip}><span className="material-symbols-outlined mr-1 align-middle text-[14px]">{meta.icon}</span>{record.riskLabel || meta.label}</span>
                        {reasons.length > 0 ? reasons.map((reason) => <span key={reason.title} className="rounded-md bg-surface-tile-1 px-2 py-1 text-caption-2 text-body-muted">{reason.title}</span>) : <span className="text-caption text-placeholder">{record.riskLevel === 'unknown' ? '等待数据同步' : '暂无明显风险项'}</span>}
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-left sm:min-w-[280px] lg:w-[31%]">
                        <div><p className="text-caption-2 text-placeholder">GPA</p><p className={`mt-1 text-footnote font-semibold tabular-nums ${record.gpa != null && Number(record.gpa) < 2 ? 'text-warning' : 'text-ink'}`}>{displayNumber(record.gpa, 2)}</p></div>
                        <div><p className="text-caption-2 text-placeholder">未通过</p><p className={`mt-1 text-footnote font-semibold tabular-nums ${Number(record.failedCourses) > 0 ? 'text-error' : 'text-ink'}`}>{displayNumber(record.failedCourses, 0)} 门</p></div>
                        <div><p className="text-caption-2 text-placeholder">缺少学分</p><p className={`mt-1 text-footnote font-semibold tabular-nums ${Number(record.missingCredits) > 0 ? 'text-warning' : 'text-ink'}`}>{displayNumber(record.missingCredits)} 分</p></div>
                      </div>
                      <div className="flex items-center justify-between gap-3 lg:w-[16%] lg:justify-end"><span className="text-caption-2 text-placeholder">同步于 {displayDate(record.syncedAt)}</span><button type="button" onClick={() => navigate(`/teacher/student-detail?studentId=${record.studentId}`)} className="btn-utility h-8 px-2.5 text-caption">查看成绩</button></div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
