import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import ErrorState from '../../components/ErrorState';
import ProgressBar from '../../components/ProgressBar';
import Skeleton from '../../components/Skeleton';
import AcademicConnectPanel from '../../components/AcademicConnectPanel';

type RiskLevel = 'high' | 'attention' | 'normal' | 'unknown';

type AcademicRisk = {
  level: RiskLevel;
  title: string;
  detail: string;
};

type AcademicSummary = {
  id: number;
  gpa?: number | string | null;
  requiredCredits?: number | string | null;
  earnedCredits?: number | string | null;
  missingCredits?: number | string | null;
  plannedTotalCourses?: number | null;
  plannedPassedCourses?: number | null;
  plannedFailedCourses?: number | null;
  plannedMissedCourses?: number | null;
  plannedInProgressCourses?: number | null;
  riskLevel?: RiskLevel;
  syncedAt?: string;
  preliminary?: boolean;
  risks?: AcademicRisk[];
};

type CreditRequirement = {
  id: number;
  requirementName: string;
  requiredCredits?: number | string | null;
  earnedCredits?: number | string | null;
  missingCredits?: number | string | null;
};

type PlanCourse = {
  id: number;
  requirementGroup?: string;
  courseName: string;
  courseNo?: string;
  credit?: number | string | null;
  courseStatus?: string;
  displayTerm?: string;
  courseCategory?: string;
  courseNature?: string;
  maxGrade?: string;
  needsAttention?: boolean;
};

type Grade = {
  id: number;
  courseName: string;
  courseNo?: string;
  teachingClass?: string;
  teacherName?: string;
  credit?: number | string | null;
  courseCategory?: string;
  courseNature?: string;
  scoreText?: string;
  scoreNumeric?: number | string | null;
  gradePoint?: number | string | null;
  examType?: string;
  isPassed?: boolean | null;
};

type Schedule = {
  id: number;
  courseName: string;
  teacherName?: string;
  location?: string;
  weekday?: number | null;
  sectionText?: string;
  weekText?: string;
  startTime?: string;
  endTime?: string;
};

type Exam = {
  id: number;
  courseName: string;
  courseNo?: string;
  examType?: string;
  examTime?: string;
  location?: string;
  seatNo?: string;
  examStatus?: string;
};

type AcademicNotice = {
  id: number;
  title: string;
  noticeType?: string;
  content?: string;
  publishedAt?: string;
  isRead?: boolean;
};

type AcademicDashboard = {
  summary?: AcademicSummary | null;
  creditRequirements?: CreditRequirement[];
  planCourses?: PlanCourse[];
  grades?: Grade[];
  schedules?: Schedule[];
  exams?: Exam[];
  notices?: AcademicNotice[];
};

type AcademicTerm = {
  academicYear: string;
  term?: string | null;
  label: string;
};

type GradeFilter = 'all' | 'passed' | 'failed' | 'pending';

const NO_DATA = '无';

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const riskMeta: Record<RiskLevel, { label: string; chip: string; icon: string }> = {
  high: { label: '需优先关注', chip: 'chip chip-error', icon: 'warning' },
  attention: { label: '建议关注', chip: 'chip chip-warning', icon: 'info' },
  normal: { label: '情况正常', chip: 'chip chip-success', icon: 'task_alt' },
  unknown: { label: '待同步核验', chip: 'chip', icon: 'sync_problem' },
};

function number(value?: number | string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function displayNumber(value?: number | string | null, digits = 1) {
  if (value === null || value === undefined || value === '') return NO_DATA;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return NO_DATA;
  return Number.isInteger(parsed) ? String(parsed) : parsed.toFixed(digits).replace(/\.0$/, '');
}

function displayDate(value?: string) {
  if (!value) return NO_DATA;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function displayDateTime(value?: string) {
  if (!value) return NO_DATA;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace('T', ' ');
  return `${displayDate(value)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function courseGradeStatus(grade: Grade) {
  if (grade.isPassed === true) return { label: '已通过', chip: 'chip chip-success' };
  if (grade.isPassed === false) return { label: '未通过', chip: 'chip chip-error' };
  if (grade.scoreText || grade.scoreNumeric != null) return { label: '待核验', chip: 'chip chip-warning' };
  return { label: NO_DATA, chip: 'chip' };
}

function termKey(term?: AcademicTerm | null) {
  return term ? `${term.academicYear}|${term.term ?? ''}` : '';
}

function splitTerm(key: string) {
  if (!key) return { academicYear: undefined, term: undefined };
  const [academicYear, term] = key.split('|');
  return { academicYear: academicYear || undefined, term: term || undefined };
}

export default function StudentAcademic() {
  const [dashboard, setDashboard] = useState<AcademicDashboard | null>(null);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>('all');
  const [courseQuery, setCourseQuery] = useState('');
  const [academicInfo, setAcademicInfo] = useState<Record<string, unknown> | null>(null);

  const loadTerms = useCallback(async () => {
    try {
      const data = await apiClient.get('/academic/self/terms');
      setTerms(Array.isArray(data) ? data as AcademicTerm[] : []);
    } catch {
      setTerms([]);
    }
  }, []);

  const loadDashboard = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const params = splitTerm(selectedTerm);
      const data = await apiClient.get('/academic/self/dashboard', { params });
      setDashboard((data as AcademicDashboard) || {});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '加载学业数据失败';
      setError(message);
      if (showRefresh) toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedTerm]);

  useEffect(() => {
    loadTerms();
  }, [loadTerms]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const summary = dashboard?.summary ?? null;
  const credits = dashboard?.creditRequirements ?? [];
  const grades = dashboard?.grades ?? [];
  const schedules = dashboard?.schedules ?? [];
  const exams = dashboard?.exams ?? [];
  const notices = dashboard?.notices ?? [];
  const planCourses = dashboard?.planCourses ?? [];
  const currentRisk = riskMeta[summary?.riskLevel || 'unknown'];
  const attentionCourses = planCourses.filter((course) => course.needsAttention).slice(0, 6);

  const visibleGrades = useMemo(() => grades.filter((grade) => {
    if (gradeFilter === 'passed' && grade.isPassed !== true) return false;
    if (gradeFilter === 'failed' && grade.isPassed !== false) return false;
    if (gradeFilter === 'pending' && grade.isPassed !== null && grade.isPassed !== undefined) return false;
    const query = courseQuery.trim().toLowerCase();
    if (!query) return true;
    return [grade.courseName, grade.courseNo, grade.teacherName, grade.courseCategory]
      .filter(Boolean)
      .some((item) => item!.toLowerCase().includes(query));
  }), [grades, gradeFilter, courseQuery]);

  const scheduleByWeekday = useMemo(() => WEEKDAYS.map((_, index) => schedules
    .filter((item) => Number(item.weekday) === index + 1)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))), [schedules]);

  const [activeSection, setActiveSection] = useState('overview');

  const jumpTo = (section: string) => {
    setActiveSection(section);
    document.getElementById(`academic-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-56 w-full rounded-[24px]" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[224px_minmax(0,1fr)]"><Skeleton className="h-[520px] w-full rounded-2xl" /><div className="space-y-5"><Skeleton className="h-56 w-full rounded-2xl" /><Skeleton className="h-80 w-full rounded-2xl" /></div></div>
      </div>
    );
  }

  if (error) {
    return <ErrorState title="学业数据加载失败" message={error} onRetry={() => loadDashboard(true)} />;
  }

  return (
    <div className="space-y-5">
      <AcademicConnectPanel hasData={Boolean(summary)} onSynced={async (studentInfo) => { if (studentInfo) setAcademicInfo(studentInfo); await loadTerms(); await loadDashboard(true); }} />
      {academicInfo ? (
        <section className="grid grid-cols-2 gap-3 rounded-2xl border border-hairline bg-canvas p-4 shadow-card sm:grid-cols-5">
          {(
            [
              ['姓名', academicInfo.name],
              ['学号', academicInfo.sid],
              ['学院', academicInfo.collegeName],
              ['专业', academicInfo.majorName],
              ['班级', academicInfo.className],
            ] as Array<[string, unknown]>
          ).map(([label, value]) => <div key={label} className="min-w-0"><p className="text-caption-2 text-placeholder">{label}</p><p className="mt-1 truncate text-footnote font-medium text-ink">{String(value || NO_DATA)}</p></div>)}
        </section>
      ) : null}
      <section className="relative overflow-hidden rounded-[24px] border border-primary/15 bg-[linear-gradient(115deg,#eef4ff_0%,#f8fbff_58%,#fffaf4_100%)] p-5 shadow-card sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-caption font-semibold tracking-[0.16em] text-primary"><span>ACADEMIC HUB</span><span className="h-1 w-1 rounded-full bg-primary/50" /><span>个人学业档案</span></div>
            <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.035em] text-ink sm:text-[34px]">我的学业中心</h1>
            <p className="mt-2 max-w-2xl text-footnote leading-relaxed text-body-muted">把成绩、绩点、学分进度、课表和考试安排集中在一个页面里。点击左侧时间轴，可立即查询对应学期。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip border-primary/15 bg-canvas/70 text-primary"><span className="material-symbols-outlined mr-1 text-[15px]">verified_user</span>仅本人可见</span>
            <button type="button" onClick={() => loadDashboard(true)} disabled={refreshing} className="btn-primary h-9 disabled:cursor-not-allowed disabled:opacity-60"><span className={`material-symbols-outlined text-[17px] ${refreshing ? 'animate-spin' : ''}`}>{refreshing ? 'progress_activity' : 'sync'}</span>{refreshing ? '同步中' : '刷新数据'}</button>
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <QuickStat label="当前 GPA" value={displayNumber(summary?.gpa, 2)} icon="speed" />
          <QuickStat label="已获学分" value={displayNumber(summary?.earnedCredits)} icon="workspace_premium" />
          <QuickStat label="待补学分" value={displayNumber(summary?.missingCredits)} icon="pending_actions" tone={summary && number(summary.missingCredits) > 0 ? 'warning' : undefined} />
          <QuickStat label="同步状态" value={summary ? '已同步' : NO_DATA} icon={summary ? 'cloud_done' : 'cloud_off'} tone={summary ? undefined : 'warning'} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[224px_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-hairline bg-canvas p-3 shadow-card">
            <div className="px-2 pb-2"><p className="text-caption font-semibold tracking-[0.12em] text-placeholder">学业导航</p><p className="mt-1 text-caption-2 text-placeholder">快速定位信息</p></div>
            <div className="space-y-1">
              {[
                ['overview', '学业概览', 'dashboard'],
                ['grades', '成绩与绩点', 'grade'],
                ['schedule', '课表与考试', 'calendar_month'],
                ['plan', '培养方案', 'account_tree'],
                ['notices', '教务通知', 'campaign'],
              ].map(([id, label, icon]) => (
                <button key={id} type="button" onClick={() => jumpTo(id)} className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-footnote font-medium transition ${activeSection === id ? 'bg-primary-soft text-primary' : 'text-body-muted hover:bg-hover-overlay hover:text-ink'}`}>
                  <span className="material-symbols-outlined text-[19px]">{icon}</span><span className="flex-1">{label}</span><span className="material-symbols-outlined text-[16px] opacity-50">chevron_right</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-hairline bg-canvas p-3 shadow-card">
            <div className="flex items-start justify-between gap-2 px-2 pb-3"><div><p className="text-caption font-semibold tracking-[0.12em] text-placeholder">时间轴查询</p><p className="mt-1 text-caption-2 text-placeholder">点击学期立即刷新</p></div><span className="material-symbols-outlined text-[19px] text-primary">history</span></div>
            <div className="relative space-y-1 pl-2 before:absolute before:bottom-4 before:left-[17px] before:top-4 before:w-px before:bg-hairline">
              <button type="button" onClick={() => setSelectedTerm('')} className={`relative flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left transition ${!selectedTerm ? 'bg-primary-soft' : 'hover:bg-hover-overlay'}`}>
                <span className={`z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-canvas ${!selectedTerm ? 'bg-primary' : 'bg-body-subtle'}`} />
                <span className="min-w-0"><span className={`block text-footnote font-medium ${!selectedTerm ? 'text-primary' : 'text-ink'}`}>全部已同步学期</span><span className="mt-0.5 block text-caption-2 text-placeholder">汇总视图</span></span>
              </button>
              {terms.map((term) => {
                const key = termKey(term);
                const active = selectedTerm === key;
                return <button key={key} type="button" onClick={() => setSelectedTerm(key)} className={`relative flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left transition ${active ? 'bg-primary-soft' : 'hover:bg-hover-overlay'}`}><span className={`z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-canvas ${active ? 'bg-primary' : 'bg-body-subtle'}`} /><span className="min-w-0"><span className={`block truncate text-footnote font-medium ${active ? 'text-primary' : 'text-ink'}`}>{term.label}</span><span className="mt-0.5 block text-caption-2 text-placeholder">点击查看该学期</span></span></button>;
              })}
              {terms.length === 0 ? <div className="relative flex items-start gap-3 px-2 py-2.5"><span className="z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-warning ring-4 ring-canvas" /><span className="text-caption-2 leading-relaxed text-placeholder">学期数据：{NO_DATA}</span></div> : null}
            </div>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-primary-soft/50 p-3.5 text-caption-2 leading-relaxed text-body-muted"><span className="material-symbols-outlined mr-1 align-middle text-[16px] text-primary">lock</span>数据仅展示当前登录账号的学业结果，不保存教务密码、Cookie 或验证码。</div>
        </aside>

        <div className="min-w-0 space-y-5">
          <section id="academic-overview" className="scroll-mt-24 space-y-4">
            <SectionHeading icon="dashboard" title="学业概览" description={selectedTerm ? `当前查询：${terms.find((term) => termKey(term) === selectedTerm)?.label || selectedTerm}` : '总览最近同步的学业结果'} status={summary ? currentRisk.label : NO_DATA} />
            {!summary ? <SyncEmpty /> : null}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="已获学分" value={displayNumber(summary?.earnedCredits)} suffix="学分" icon="verified" /><Metric label="待补学分" value={displayNumber(summary?.missingCredits)} suffix="学分" icon="pending_actions" tone={summary && number(summary.missingCredits) > 0 ? 'warning' : undefined} /><Metric label="未通过课程" value={summary?.plannedFailedCourses != null ? String(summary.plannedFailedCourses) : NO_DATA} suffix="门" icon="error_outline" tone={summary && (summary.plannedFailedCourses ?? 0) > 0 ? 'error' : undefined} /><Metric label="未修课程" value={summary?.plannedMissedCourses != null ? String(summary.plannedMissedCourses) : NO_DATA} suffix="门" icon="menu_book" tone={summary && (summary.plannedMissedCourses ?? 0) > 0 ? 'warning' : undefined} /></div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]"><section className="section-card overflow-hidden"><div className="section-card-header"><div><h2 className="section-card-title flex items-center gap-2"><span className="material-symbols-outlined text-[19px] text-primary">pie_chart</span>毕业条件进度</h2><p className="mt-1 text-caption-2 text-placeholder">按培养方案分类查看学分完成情况</p></div><span className="chip">GPA {displayNumber(summary?.gpa, 2)}</span></div>{credits.length > 0 ? <div className="grid divide-y divide-hairline sm:grid-cols-2 sm:divide-x sm:divide-y-0">{credits.map((credit) => { const required = number(credit.requiredCredits); const earned = number(credit.earnedCredits); const hasMissing = credit.missingCredits !== null && credit.missingCredits !== undefined && credit.missingCredits !== ''; const missing = number(credit.missingCredits); const percent = required > 0 ? (earned / required) * 100 : 0; return <div key={credit.id} className="p-4"><div className="flex items-start justify-between gap-3"><p className="text-footnote font-medium text-ink">{credit.requirementName || NO_DATA}</p><span className={`text-caption font-medium ${hasMissing && missing > 0 ? 'text-warning' : hasMissing ? 'text-success' : 'text-placeholder'}`}>{!hasMissing ? NO_DATA : missing > 0 ? `尚差 ${displayNumber(credit.missingCredits)}` : '已达标'}</span></div><div className="mt-2 flex items-baseline gap-1"><span className="text-title-3 font-semibold tabular-nums text-ink">{displayNumber(credit.earnedCredits)}</span><span className="text-caption text-placeholder">/ {displayNumber(credit.requiredCredits)} 学分</span></div><ProgressBar value={percent} size="sm" showThumb={false} instant className="mt-3" /></div>; })}</div> : <EmptyLine text={NO_DATA} />}</section><section className="section-card"><div className="section-card-header"><div><h2 className="section-card-title flex items-center gap-2"><span className="material-symbols-outlined text-[19px] text-warning">flag</span>需要关注</h2><p className="mt-1 text-caption-2 text-placeholder">最近同步：{displayDateTime(summary?.syncedAt)}</p></div></div><div className="divide-y divide-hairline">{(summary?.risks || []).length > 0 ? (summary?.risks || []).map((risk, index) => { const meta = riskMeta[risk.level || 'unknown']; return <div key={`${risk.title}-${index}`} className="flex gap-3 p-4"><span className={`material-symbols-outlined mt-0.5 text-[19px] ${risk.level === 'high' ? 'text-error' : risk.level === 'attention' ? 'text-warning' : 'text-success'}`}>{meta.icon}</span><div><p className="text-footnote font-medium text-ink">{risk.title || NO_DATA}</p><p className="mt-1 text-caption leading-relaxed text-placeholder">{risk.detail || NO_DATA}</p></div></div>; }) : <EmptyLine text={NO_DATA} />}</div></section></div>
          </section>

          <section id="academic-grades" className="scroll-mt-24 section-card overflow-hidden"><SectionHeading icon="grade" title="成绩与绩点" description={selectedTerm ? '当前学期的课程成绩' : '最近同步批次中的全部课程成绩'} /><div className="flex flex-wrap gap-2 border-b border-hairline px-4 pb-4 sm:px-5"><div className="relative flex-1 sm:max-w-xs"><span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-placeholder">search</span><input value={courseQuery} onChange={(event) => setCourseQuery(event.target.value)} placeholder="搜索课程、教师或课程号" className="input-glass h-9 w-full pl-8 text-caption !rounded-lg" /></div><select value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value as GradeFilter)} className="h-9 rounded-lg border border-hairline bg-canvas px-2.5 text-caption text-ink outline-none focus:border-primary"><option value="all">全部状态</option><option value="passed">已通过</option><option value="failed">未通过</option><option value="pending">待核验</option></select></div>{visibleGrades.length > 0 ? <div className="overflow-x-auto"><table className="min-w-[860px] w-full text-left"><thead className="border-b border-hairline bg-canvas-parchment text-caption font-medium text-placeholder"><tr><th className="px-4 py-3">课程</th><th className="px-3 py-3">类别</th><th className="px-3 py-3 text-right">学分</th><th className="px-3 py-3 text-right">成绩</th><th className="px-3 py-3 text-right">绩点</th><th className="px-4 py-3 text-right">状态</th></tr></thead><tbody className="divide-y divide-hairline">{visibleGrades.map((grade) => { const status = courseGradeStatus(grade); return <tr key={grade.id} className="transition hover:bg-hover-overlay"><td className="px-4 py-3"><p className="text-footnote font-medium text-ink">{grade.courseName || NO_DATA}</p><p className="mt-0.5 text-caption-2 text-placeholder">{[grade.courseNo, grade.teacherName, grade.teachingClass].filter(Boolean).join(' · ') || NO_DATA}</p></td><td className="px-3 py-3 text-caption text-body-muted">{grade.courseCategory || grade.courseNature || NO_DATA}</td><td className="px-3 py-3 text-right text-footnote tabular-nums text-ink">{displayNumber(grade.credit)}</td><td className="px-3 py-3 text-right text-subhead font-semibold tabular-nums text-ink">{grade.scoreText || displayNumber(grade.scoreNumeric)}</td><td className="px-3 py-3 text-right text-footnote tabular-nums text-body-muted">{displayNumber(grade.gradePoint, 2)}</td><td className="px-4 py-3 text-right"><span className={status.chip}>{status.label}</span></td></tr>; })}</tbody></table></div> : <EmptyLine text={NO_DATA} />}</section>

          <section id="academic-schedule" className="scroll-mt-24 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]"><section className="section-card overflow-hidden"><SectionHeading icon="calendar_view_week" title="课表与考试" description="点击左侧学期时间点即可切换对应课表" />{schedules.length > 0 ? <div className="overflow-x-auto p-3"><div className="grid min-w-[770px] grid-cols-7 gap-2">{WEEKDAYS.map((day) => <div key={day} className="rounded-lg bg-canvas-parchment px-2 py-2 text-center text-caption font-medium text-body-muted">{day}</div>)}{scheduleByWeekday.map((courses, index) => <div key={WEEKDAYS[index]} className="min-h-[216px] space-y-2 rounded-lg border border-hairline bg-canvas p-2">{courses.map((course) => <div key={course.id} className="rounded-xl border border-primary/15 bg-primary-soft/55 p-2.5"><p className="line-clamp-2 text-caption font-semibold leading-snug text-ink">{course.courseName || NO_DATA}</p><p className="mt-1 text-caption-2 tabular-nums text-primary">{[course.startTime, course.endTime].filter(Boolean).join('–') || course.sectionText || NO_DATA}</p><p className="mt-1 truncate text-caption-2 text-placeholder">{course.location || NO_DATA}</p><p className="mt-0.5 truncate text-caption-2 text-placeholder">{course.teacherName || NO_DATA}</p></div>)}{courses.length === 0 ? <p className="pt-12 text-center text-caption-2 text-placeholder">{NO_DATA}</p> : null}</div>)}</div></div> : <EmptyLine text={NO_DATA} />}</section><section className="section-card"><SectionHeading icon="event_available" title="考试安排" description="按考试时间排序" />{exams.length > 0 ? <div className="divide-y divide-hairline">{exams.slice(0, 8).map((exam) => <div key={exam.id} className="p-4"><div className="flex gap-3"><span className="mt-0.5 material-symbols-outlined text-[18px] text-primary">schedule</span><div className="min-w-0 flex-1"><p className="truncate text-footnote font-medium text-ink">{exam.courseName || NO_DATA}</p><p className="mt-1 text-caption text-body-muted">{displayDateTime(exam.examTime)}</p><p className="mt-1 text-caption-2 text-placeholder">{[exam.location, exam.seatNo ? `座位 ${exam.seatNo}` : '', exam.examType].filter(Boolean).join(' · ') || NO_DATA}</p></div></div></div>)}</div> : <EmptyLine text={NO_DATA} />}</section></section>

          <section id="academic-plan" className="scroll-mt-24 section-card overflow-hidden"><SectionHeading icon="account_tree" title="培养方案" description="关注必修、通识与实践课程的完成状态" />{attentionCourses.length > 0 ? <div className="grid divide-y divide-hairline sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-3">{attentionCourses.map((course) => <div key={course.id} className="p-4"><p className="text-footnote font-medium text-ink">{course.courseName || NO_DATA}</p><p className="mt-1 text-caption text-body-muted">{[course.requirementGroup, course.displayTerm, course.courseCategory].filter(Boolean).join(' · ') || NO_DATA}</p><div className="mt-3 flex items-center justify-between gap-2"><span className="text-caption-2 text-placeholder">{course.courseNo || NO_DATA} · {displayNumber(course.credit)} 学分</span><span className="chip chip-warning">{course.courseStatus || NO_DATA}</span></div></div>)}</div> : <EmptyLine text={NO_DATA} />}</section>

          <section id="academic-notices" className="scroll-mt-24 section-card overflow-hidden"><SectionHeading icon="campaign" title="教务通知" description="来自教务系统的近期通知" />{notices.length > 0 ? <div className="divide-y divide-hairline">{notices.slice(0, 6).map((notice) => <div key={notice.id} className="p-4 sm:px-5"><div className="flex items-center gap-2"><p className="truncate text-footnote font-medium text-ink">{notice.title || NO_DATA}</p>{!notice.isRead ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> : null}</div><p className="mt-1 line-clamp-2 text-caption leading-relaxed text-placeholder">{notice.content || NO_DATA}</p><p className="mt-1.5 text-caption-2 text-placeholder">{[notice.noticeType, displayDate(notice.publishedAt)].filter(Boolean).join(' · ') || NO_DATA}</p></div>)}</div> : <EmptyLine text={NO_DATA} />}</section>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, suffix, icon, tone }: { label: string; value: string; suffix: string; icon: string; tone?: 'warning' | 'error' }) {
  const color = tone === 'error' ? 'text-error' : tone === 'warning' ? 'text-warning' : 'text-body-muted';
  return <div className="min-w-0 p-3.5 sm:p-4"><div className="flex items-center justify-between gap-2"><p className="truncate text-caption text-placeholder">{label}</p><span className={`material-symbols-outlined text-[18px] ${color}`}>{icon}</span></div><p className={`mt-2 text-title-3 font-semibold tabular-nums ${tone ? color : 'text-ink'}`}>{value}{value !== NO_DATA ? <span className="ml-1 text-caption font-normal text-placeholder">{suffix}</span> : null}</p></div>;
}

function QuickStat({ label, value, icon, tone }: { label: string; value: string; icon: string; tone?: 'warning' }) {
  return <div className="rounded-2xl border border-white/80 bg-white/65 px-3.5 py-3 backdrop-blur-sm"><div className="flex items-center justify-between gap-2"><span className="text-caption text-body-muted">{label}</span><span className={`material-symbols-outlined text-[17px] ${tone === 'warning' ? 'text-warning' : 'text-primary'}`}>{icon}</span></div><p className={`mt-1.5 text-subhead font-semibold tabular-nums ${tone === 'warning' ? 'text-warning' : 'text-ink'}`}>{value}</p></div>;
}

function SectionHeading({ icon, title, description, status }: { icon: string; title: string; description: string; status?: string }) {
  return <div className="mb-3 flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-title-3 font-semibold tracking-[-0.02em] text-ink"><span className="material-symbols-outlined text-[20px] text-primary">{icon}</span>{title}</h2><p className="mt-1 text-caption text-placeholder">{description}</p></div>{status ? <span className="chip">{status}</span> : null}</div>;
}

function SyncEmpty() {
  return <section className="rounded-2xl border border-dashed border-primary/25 bg-primary-soft/25 px-5 py-6 sm:px-8"><div className="flex w-full min-w-0 flex-col items-start gap-4 sm:flex-row sm:items-center"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-canvas text-primary shadow-card"><span className="material-symbols-outlined text-[25px]">cloud_sync</span></div><div className="w-full min-w-0 flex-1 basis-0"><h3 className="text-callout font-semibold text-ink">还没有同步教务数据</h3><p className="mt-1 w-full max-w-xl break-words text-footnote leading-relaxed text-body-muted">在学校 VPN 或授权环境中完成首次同步后，这里会自动生成成绩、学分进度、课表和考试安排。你可以先用左侧时间轴选择未来要查询的学期。</p></div></div></section>;
}

function EmptyLine({ text }: { text: string }) {
  return <p className="px-4 py-8 text-center text-footnote text-placeholder">{text}</p>;
}
