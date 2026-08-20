import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';
import ProgressBar from '../../components/ProgressBar';
import CascadeFilter, { type FilterValues } from '../../components/CascadeFilter';

interface MajorStat {
  major: string;
  studentCount: number;
  registrationCount: number;
  awardCount: number;
  participationRate: number;
}

interface OverviewData {
  totalStudents: number;
  totalRegistrations: number;
  totalApproved: number;
  totalPending: number;
  participationRate: number;
  perStudentAvg: number;
  gradeDistribution: Record<string, number>;
  majorDistribution: MajorStat[];
  categoryDistribution: Record<string, number>;
}

interface StudentRow {
  id: number;
  username: string;
  realName: string;
  major: string;
  className: string;
  grade: string;
  comprehensiveScore?: number | null;
  comprehensiveRank?: number | null;
  comprehensiveRankPercent?: number | string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  A: 'A类 · 科技创新',
  B: 'B类 · 商业创业',
  C: 'C类 · 文化艺术',
};

function formatScore(value?: number | null) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : '暂无';
}

function formatPercent(value?: number | string | null) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '暂无';
  return `${(number > 1 ? number : number * 100).toFixed(1)}%`;
}

export default function CollegeOverview() {
  const navigate = useNavigate();
  const [data, setData] = useState<OverviewData | null>(null);
  const [topStudents, setTopStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterValues>({});

  const handleFilterChange = useCallback((f: FilterValues) => {
    setFilters(f);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params: Record<string, any> = { current: 1, size: 8, sort: 'comprehensive_desc' };
        if (filters.college) params.college = filters.college;
        if (filters.grade) params.grade = filters.grade;
        if (filters.major) params.major = filters.major;
        if (filters.className) params.className = filters.className;

        const [overview, students] = await Promise.all([
          apiClient.get('/teacher/college-overview', { params }),
          apiClient.get('/teacher/students', { params }),
        ]);
        if (cancelled) return;
        setData(overview as unknown as OverviewData);
        const records = Array.isArray((students as any)?.records) ? (students as any).records : [];
        setTopStudents(records as StudentRow[]);
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message || '加载学院数据失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [filters]);

  const kpiCards = data
    ? [
        { label: '学院学生', value: String(data.totalStudents), suffix: '人', icon: 'groups', accent: 'var(--color-primary)' },
        { label: '参赛覆盖率', value: String(Math.round((data.participationRate ?? 0) * 100)), suffix: '%', icon: 'track_changes', accent: '#0f766e' },
        { label: '人均参赛', value: String(data.perStudentAvg ?? 0), suffix: '次', icon: 'trending_up', accent: '#b45309' },
        { label: '累计获奖', value: String(data.totalApproved), suffix: '项', icon: 'military_tech', accent: '#7c3aed' },
        { label: '待审核', value: String(data.totalPending), suffix: '项', icon: 'pending_actions', accent: '#be123c' },
      ]
    : [];

  const gradeEntries = data
    ? Object.entries(data.gradeDistribution ?? {}).sort(([a], [b]) => b.localeCompare(a))
    : [];
  const maxGradeCount = Math.max(...gradeEntries.map(([, v]) => v), 1);
  const categoryEntries = data ? Object.entries(data.categoryDistribution ?? {}) : [];
  const maxCategoryCount = Math.max(...categoryEntries.map(([, v]) => v), 1);
  const majorStats = useMemo(
    () => [...(data?.majorDistribution ?? [])].sort((a, b) => b.studentCount - a.studentCount),
    [data],
  );
  const activeFilterLabel = filters.major || filters.grade ? `${filters.grade ? `${filters.grade}级` : '全部年级'}${filters.major ? ` · ${filters.major}` : ''}` : '全院';

  return (
    <div className="flex flex-col gap-4">
      <PageHero
        eyebrow="College dashboard"
        title="学院学生看板"
        description="从学生规模、参赛活跃度到综合成绩，快速掌握学院整体情况。"
        density="feature"
      />

      <div className="filter-bar">
        <CascadeFilter onChange={handleFilterChange} />
        <span className="ml-auto inline-flex items-center gap-1.5 text-caption text-body-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          当前视图：{activeFilterLabel}
        </span>
      </div>

      {loading ? (
        <div className="empty-panel py-16">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          <p className="text-footnote">加载中…</p>
        </div>
      ) : !data ? (
        <div className="empty-panel py-16">
          <span className="material-symbols-outlined">error_outline</span>
          <p className="text-footnote">暂无数据</p>
        </div>
      ) : (
        <>
          <section className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-surface-tile-1 via-surface-pearl to-surface-pearl px-5 py-5 shadow-sm sm:px-6">
            <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-2 flex items-center gap-2 text-caption font-medium uppercase tracking-[0.16em] text-primary">
                  <span className="material-symbols-outlined text-[17px]">insights</span>
                  Academic pulse
                </div>
                <h2 className="text-title-3 font-semibold tracking-tight text-ink">本学期学院画像</h2>
                <p className="mt-2 text-footnote leading-relaxed text-body-muted">
                  当前共有 <span className="font-semibold text-ink">{data.totalStudents}</span> 名学生，累计产生 <span className="font-semibold text-ink">{data.totalRegistrations}</span> 条参赛记录；重点关注参赛覆盖率和待审核记录，可及时安排指导与跟进。
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:min-w-[340px]">
                <div className="rounded-lg border border-border/80 bg-surface-pearl/80 px-3 py-2.5">
                  <div className="text-caption text-body-muted">参赛记录</div>
                  <div className="mt-1 text-title-3 font-semibold tabular-nums text-ink">{data.totalRegistrations}</div>
                </div>
                <div className="rounded-lg border border-border/80 bg-surface-pearl/80 px-3 py-2.5">
                  <div className="text-caption text-body-muted">待审核</div>
                  <div className="mt-1 text-title-3 font-semibold tabular-nums text-ink">{data.totalPending}</div>
                </div>
                <div className="rounded-lg border border-border/80 bg-surface-pearl/80 px-3 py-2.5">
                  <div className="text-caption text-body-muted">获奖率</div>
                  <div className="mt-1 text-title-3 font-semibold tabular-nums text-ink">
                    {data.totalRegistrations ? `${((data.totalApproved / data.totalRegistrations) * 100).toFixed(1)}%` : '0.0%'}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            {kpiCards.map((card) => (
              <div key={card.label} className="stat-card group relative overflow-hidden">
                <div className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-surface-tile-1" style={{ color: card.accent }}>
                  <span className="material-symbols-outlined text-[19px]">{card.icon}</span>
                </div>
                <div className="stat-card-label">{card.label}</div>
                <div className="mt-1 pr-10 text-title-2 font-semibold tabular-nums text-ink">
                  {card.value}<span className="ml-1 text-footnote font-normal text-placeholder">{card.suffix}</span>
                </div>
                <div className="mt-2 h-1 w-12 rounded-full" style={{ background: card.accent }} />
              </div>
            ))}
          </div>

          <section className="grid grid-cols-1 gap-3 lg:grid-cols-[1.15fr_.85fr]">
            <section className="section-card">
              <div className="section-card-header">
                <div>
                  <h2 className="section-card-title">学院重点学生</h2>
                  <p className="mt-1 text-caption text-body-muted">按综合成绩展示当前筛选范围内的前 8 名</p>
                </div>
                <span className="chip chip-primary">成绩榜</span>
              </div>
              <div className="section-card-body">
                {topStudents.length === 0 ? (
                  <div className="empty-panel py-10"><span className="material-symbols-outlined">person_search</span><p className="text-footnote">暂无综测成绩数据</p></div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {topStudents.map((student, index) => (
                      <button
                        type="button"
                        key={student.id}
                        onClick={() => navigate(`/teacher/student-detail?studentId=${student.id}`)}
                        className="group flex items-center gap-3 rounded-lg border border-border/80 bg-surface px-3 py-3 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
                      >
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-caption font-semibold ${index < 3 ? 'bg-primary text-white' : 'bg-surface-tile-1 text-body-muted'}`}>
                          {index + 1}
                        </span>
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-tile-2 text-footnote font-semibold text-body-muted">
                          {student.realName?.slice(0, 1) || '?'}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-footnote font-medium text-ink">{student.realName}</span>
                          <span className="mt-0.5 block truncate text-caption-2 text-placeholder">{student.major} · {student.className}</span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-subhead font-semibold tabular-nums text-ink">{formatScore(student.comprehensiveScore)}</span>
                          <span className="block text-caption-2 text-body-muted">{student.comprehensiveRank ? `专业第 ${student.comprehensiveRank}` : formatPercent(student.comprehensiveRankPercent)}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="section-card">
              <div className="section-card-header">
                <div>
                  <h2 className="section-card-title">年级结构</h2>
                  <p className="mt-1 text-caption text-body-muted">学生人数分布</p>
                </div>
                <span className="chip">{gradeEntries.length} 个年级</span>
              </div>
              <div className="section-card-body">
                {gradeEntries.length === 0 ? (
                  <div className="empty-panel py-8"><p className="text-footnote">暂无数据</p></div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {gradeEntries.map(([grade, count]) => (
                      <div key={grade}>
                        <div className="mb-1.5 flex items-center justify-between text-footnote">
                          <span className="font-medium text-ink">{grade}级</span>
                          <span className="tabular-nums text-body-muted">{count} 人 · {Math.round((count / Math.max(data.totalStudents, 1)) * 100)}%</span>
                        </div>
                        <ProgressBar value={(count / maxGradeCount) * 100} size="sm" segments={4} showThumb instant />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </section>

          <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <section className="section-card">
              <div className="section-card-header">
                <div>
                  <h2 className="section-card-title">赛事类别分布</h2>
                  <p className="mt-1 text-caption text-body-muted">各类别报名记录占比</p>
                </div>
                <span className="chip">{categoryEntries.reduce((sum, [, count]) => sum + count, 0)} 条</span>
              </div>
              <div className="section-card-body">
                {categoryEntries.length === 0 ? (
                  <div className="empty-panel py-8"><p className="text-footnote">暂无数据</p></div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {categoryEntries.map(([category, count]) => (
                      <div key={category}>
                        <div className="mb-1.5 flex items-center justify-between text-footnote">
                          <span className="font-medium text-ink">{CATEGORY_LABELS[category] ?? category}</span>
                          <span className="tabular-nums text-body-muted">{count} 条</span>
                        </div>
                        <ProgressBar value={(count / maxCategoryCount) * 100} size="sm" segments={4} showThumb instant />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="section-card">
              <div className="section-card-header">
                <div>
                  <h2 className="section-card-title">学院观察</h2>
                  <p className="mt-1 text-caption text-body-muted">帮助教师快速定位工作重点</p>
                </div>
                <span className="material-symbols-outlined text-primary">auto_awesome</span>
              </div>
              <div className="section-card-body grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-lg bg-surface-tile-1 p-3">
                  <div className="text-caption text-body-muted">覆盖学生</div>
                  <div className="mt-1 text-title-3 font-semibold tabular-nums text-ink">{Math.round((data.participationRate ?? 0) * 100)}%</div>
                  <div className="mt-1 text-caption-2 text-body-muted">至少参与 1 项赛事</div>
                </div>
                <div className="rounded-lg bg-surface-tile-1 p-3">
                  <div className="text-caption text-body-muted">最活跃专业</div>
                  <div className="mt-1 truncate text-footnote font-semibold text-ink">{[...majorStats].sort((a, b) => b.participationRate - a.participationRate)[0]?.major || '暂无'}</div>
                  <div className="mt-1 text-caption-2 text-body-muted">参赛率最高</div>
                </div>
                <div className="rounded-lg bg-surface-tile-1 p-3">
                  <div className="text-caption text-body-muted">待跟进事项</div>
                  <div className="mt-1 text-title-3 font-semibold tabular-nums text-ink">{data.totalPending}</div>
                  <div className="mt-1 text-caption-2 text-body-muted">需要教师审核</div>
                </div>
              </div>
            </section>
          </section>

          <section className="section-card">
            <div className="section-card-header">
              <div>
                <h2 className="section-card-title">专业参与情况</h2>
                <p className="mt-1 text-caption text-body-muted">对比各专业学生规模、报名记录和参赛覆盖率</p>
              </div>
              <span className="chip">{majorStats.length} 个专业</span>
            </div>
            <div className="section-card-body tight">
              <div className="data-table-wrap !border-0 !rounded-none">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>专业</th>
                      <th className="text-right">学生数</th>
                      <th className="text-right">参赛记录</th>
                      <th className="text-right">获奖数</th>
                      <th>参赛覆盖率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {majorStats.length === 0 ? (
                      <tr><td colSpan={5}><div className="empty-panel py-10"><p className="text-footnote">暂无数据</p></div></td></tr>
                    ) : majorStats.map((major) => (
                      <tr key={major.major}>
                        <td>
                          <div className="font-medium text-ink">{major.major}</div>
                          <div className="mt-0.5 text-caption-2 text-placeholder">占学院 {Math.round((major.studentCount / Math.max(data.totalStudents, 1)) * 100)}%</div>
                        </td>
                        <td className="text-right tabular-nums">{major.studentCount}</td>
                        <td className="text-right tabular-nums">{major.registrationCount}</td>
                        <td className="text-right tabular-nums">{major.awardCount}</td>
                        <td>
                          <div className="flex min-w-[170px] items-center gap-2">
                            <ProgressBar value={Math.round((major.participationRate ?? 0) * 100)} size="sm" showThumb segments={4} instant className="min-w-0 flex-1" />
                            <span className="w-10 shrink-0 text-right text-caption tabular-nums text-body-muted">{Math.round((major.participationRate ?? 0) * 100)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
