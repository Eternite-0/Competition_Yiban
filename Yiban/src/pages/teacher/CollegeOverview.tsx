import { useCallback, useEffect, useState } from 'react';
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

const CATEGORY_LABELS: Record<string, string> = {
  A: 'A类 · 科技创新',
  B: 'B类 · 商业创业',
  C: 'C类 · 文化艺术',
};

export default function CollegeOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
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
        const params: Record<string, any> = {};
        if (filters.college) params.college = filters.college;
        if (filters.grade) params.grade = filters.grade;
        if (filters.major) params.major = filters.major;
        const res: any = await apiClient.get('/teacher/college-overview', { params });
        if (cancelled) return;
        setData(res as OverviewData);
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
        { label: '学生总数', value: String(data.totalStudents), suffix: '人', icon: 'group' },
        { label: '参赛率', value: String(Math.round((data.participationRate ?? 0) * 100)), suffix: '%', icon: 'percent' },
        { label: '人均参赛', value: String(data.perStudentAvg ?? 0), suffix: '次', icon: 'trending_up' },
        { label: '累计获奖', value: String(data.totalApproved), suffix: '项', icon: 'military_tech' },
      ]
    : [];

  const gradeEntries = data
    ? Object.entries(data.gradeDistribution ?? {}).sort(([a], [b]) => b.localeCompare(a))
    : [];
  const maxGradeCount = Math.max(...gradeEntries.map(([, v]) => v), 1);

  const categoryEntries = data ? Object.entries(data.categoryDistribution ?? {}) : [];
  const maxCatCount = Math.max(...categoryEntries.map(([, v]) => v), 1);

  const majorStats = data?.majorDistribution ?? [];

  return (
    <div className="flex flex-col gap-4">
      <PageHero
        eyebrow="Overview"
        title="学院总览"
        description="查看学院整体竞赛参与与获奖情况。"
      />

      <div className="filter-bar">
        <CascadeFilter onChange={handleFilterChange} />
      </div>

      {loading ? (
        <div className="empty-panel py-16">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          <p className="text-[13px]">加载中…</p>
        </div>
      ) : !data ? (
        <div className="empty-panel py-16">
          <span className="material-symbols-outlined">error_outline</span>
          <p className="text-[13px]">暂无数据</p>
        </div>
      ) : (
        <>
          <div className="stat-grid">
            {kpiCards.map((m) => (
              <div key={m.label} className="stat-card">
                <div className="stat-card-label">{m.label}</div>
                <div className="stat-card-value">
                  {m.value}
                  <span className="ml-1 text-[13px] font-normal text-placeholder">{m.suffix}</span>
                </div>
                <div className="stat-card-hint">
                  <span className="material-symbols-outlined text-[14px] align-middle text-placeholder">{m.icon}</span>
                </div>
              </div>
            ))}
          </div>

          <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <section className="section-card">
              <div className="section-card-header">
                <h2 className="section-card-title">各年级人数分布</h2>
              </div>
              <div className="section-card-body">
                {gradeEntries.length === 0 ? (
                  <div className="empty-panel py-8"><p className="text-[13px]">暂无数据</p></div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {gradeEntries.map(([grade, count]) => (
                      <div key={grade} className="flex items-center gap-3">
                        <span className="w-16 shrink-0 text-[13px] font-medium text-ink">{grade}级</span>
                        <ProgressBar
                          value={(count / maxGradeCount) * 100}
                          size="sm"
                          segments={4}
                          showThumb
                          instant
                          className="min-w-0 flex-1"
                        />
                        <span className="w-10 text-right text-[13px] font-medium tabular-nums text-ink">{String(count)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="section-card">
              <div className="section-card-header">
                <h2 className="section-card-title">竞赛类别分布</h2>
              </div>
              <div className="section-card-body">
                {categoryEntries.length === 0 ? (
                  <div className="empty-panel py-8"><p className="text-[13px]">暂无数据</p></div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {categoryEntries.map(([cat, count]) => (
                      <div key={cat} className="flex items-center gap-3">
                        <span className="w-28 shrink-0 text-[13px] font-medium text-ink">{CATEGORY_LABELS[cat] ?? cat}</span>
                        <ProgressBar
                          value={(count / maxCatCount) * 100}
                          size="sm"
                          segments={4}
                          showThumb
                          instant
                          className="min-w-0 flex-1"
                        />
                        <span className="w-10 text-right text-[13px] font-medium tabular-nums text-ink">{String(count)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </section>

          <section className="section-card">
            <div className="section-card-header">
              <h2 className="section-card-title">各专业参赛数据</h2>
            </div>
            <div className="section-card-body tight">
              <div className="data-table-wrap !border-0 !rounded-none">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>专业</th>
                      <th className="text-right">学生数</th>
                      <th className="text-right">参赛人次</th>
                      <th className="text-right">获奖数</th>
                      <th>参赛率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {majorStats.length === 0 ? (
                      <tr>
                        <td colSpan={5}>
                          <div className="empty-panel py-10"><p className="text-[13px]">暂无数据</p></div>
                        </td>
                      </tr>
                    ) : (
                      majorStats.map((m) => (
                        <tr key={m.major}>
                          <td className="font-medium">{m.major}</td>
                          <td className="text-right tabular-nums">{m.studentCount}</td>
                          <td className="text-right tabular-nums">{m.registrationCount}</td>
                          <td className="text-right tabular-nums">{m.awardCount}</td>
                          <td>
                            <div className="flex min-w-[140px] items-center gap-2">
                              <ProgressBar
                                value={Math.round((m.participationRate ?? 0) * 100)}
                                size="sm"
                                showThumb
                                segments={4}
                                instant
                                className="min-w-0 flex-1"
                              />
                              <span className="w-10 shrink-0 text-right text-[12px] tabular-nums text-body-muted">
                                {Math.round((m.participationRate ?? 0) * 100)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
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
