import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';
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

const CATEGORY_COLORS: Record<string, string> = {
  A: 'bg-primary',
  B: 'bg-info',
  C: 'bg-ink-muted-48',
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
    <div className="py-lg flex flex-col gap-lg">
      <PageHero
        eyebrow="Overview"
        title="学院总览"
        description="查看学院整体竞赛参与与获奖情况。"
      />

      <CascadeFilter onChange={handleFilterChange} />

      {loading ? (
        <div className="py-20 grid place-items-center text-ink-muted-48">
          <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
        </div>
      ) : !data ? (
        <div className="py-20 grid place-items-center text-ink-muted-48 gap-2">
          <span className="material-symbols-outlined text-[40px] opacity-40">error_outline</span>
          <p className="text-[14px]">暂无数据</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-md">
            {kpiCards.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35 }}
                className="stat-tile p-lg flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-ink-muted-80">{m.label}</span>
                  <span className="material-symbols-outlined text-[18px] text-primary">{m.icon}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display font-medium text-[22px] leading-none tabular-nums text-ink">{m.value}</span>
                  <span className="text-[12px] text-ink-muted-48">{m.suffix}</span>
                </div>
              </motion.div>
            ))}
          </section>

          {/* Charts Row */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
            {/* Grade Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="glass p-xl"
            >
              <h3 className="text-[16px] font-semibold text-ink mb-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">school</span>
                各年级人数分布
              </h3>
              {gradeEntries.length === 0 ? (
                <p className="text-[13px] text-ink-muted-48 py-6 text-center">暂无数据</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {gradeEntries.map(([grade, count]) => (
                    <div key={grade} className="flex items-center gap-3">
                      <span className="text-[13px] text-ink w-16 shrink-0 font-medium">{grade}级</span>
                      <div className="flex-1 h-6 rounded-full bg-primary/8 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(count / maxGradeCount) * 100}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className="h-full bg-primary rounded-full"
                        />
                      </div>
                      <span className="text-[13px] text-ink font-semibold tabular-nums w-10 text-right">{String(count)}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Category Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="glass p-xl"
            >
              <h3 className="text-[16px] font-semibold text-ink mb-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">category</span>
                竞赛类别分布
              </h3>
              {categoryEntries.length === 0 ? (
                <p className="text-[13px] text-ink-muted-48 py-6 text-center">暂无数据</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {categoryEntries.map(([cat, count]) => (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-[13px] text-ink w-28 shrink-0 font-medium">{CATEGORY_LABELS[cat] ?? cat}</span>
                      <div className="flex-1 h-6 rounded-full bg-primary/8 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(count / maxCatCount) * 100}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className={`h-full rounded-full ${CATEGORY_COLORS[cat] ?? 'bg-primary'}`}
                        />
                      </div>
                      <span className="text-[13px] text-ink font-semibold tabular-nums w-10 text-right">{String(count)}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </section>

          {/* Major Table */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="glass overflow-hidden"
          >
            <div className="p-md border-b border-hairline">
              <h3 className="text-[16px] font-semibold text-ink flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">analytics</span>
                各专业参赛数据
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-canvas-parchment text-[11px] text-ink-muted-48 border-b border-hairline">
                    <th className="py-3 px-md font-medium">专业</th>
                    <th className="py-3 px-md font-medium text-right">学生数</th>
                    <th className="py-3 px-md font-medium text-right">参赛人次</th>
                    <th className="py-3 px-md font-medium text-right">获奖数</th>
                    <th className="py-3 px-md font-medium">参赛率</th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  {majorStats.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-ink-muted-48">暂无数据</td>
                    </tr>
                  ) : (
                    majorStats.map((m) => (
                      <tr key={m.major} className="border-b border-hairline last:border-0 hover:bg-primary/6 transition">
                        <td className="py-3 px-md font-medium text-ink">{m.major}</td>
                        <td className="py-3 px-md text-right tabular-nums text-ink">{m.studentCount}</td>
                        <td className="py-3 px-md text-right tabular-nums text-ink">{m.registrationCount}</td>
                        <td className="py-3 px-md text-right tabular-nums text-ink">{m.awardCount}</td>
                        <td className="py-3 px-md">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-primary/8 overflow-hidden max-w-[120px]">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${(m.participationRate ?? 0) * 100}%` }}
                              />
                            </div>
                            <span className="text-[12px] tabular-nums text-ink-muted-80">
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
          </motion.section>
        </>
      )}
    </div>
  );
}
