import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';
import ProgressBar from '../../components/ProgressBar';
import CascadeFilter, { type FilterValues } from '../../components/CascadeFilter';
import { useStore } from '../../store/useStore';


function currentAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  const startYear = now.getMonth() >= 8 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

function ExportButton({ filters, fixedCollege }: { filters: FilterValues; fixedCollege?: string }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const academicYear = currentAcademicYear();
      const params = new URLSearchParams({ academicYear });
      if (filters.college || fixedCollege) params.set('college', filters.college || fixedCollege || '');
      if (filters.major) params.set('major', filters.major);
      const res = await fetch(`/api/teacher/export/comprehensive?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
      });
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `学生综测报告_${academicYear}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('导出成功');
    } catch (err) {
      console.error(err);
      toast.error('导出失败，请稍后再试');
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="btn-secondary h-9 flex items-center gap-1.5 text-footnote disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <span className="material-symbols-outlined text-[16px]">{exporting ? 'hourglass_top' : 'download'}</span>
      {exporting ? '导出中...' : '导出综测'}
    </button>
  );
}

interface RadarDim {
  dimension: string;
  score: number;
  maxScore: number;
}

interface StudentGrowthData {
  studentId?: number | string;
  totalCompetitions?: number;
  awards?: number;
  totalActivities?: number;
  totalVolunteerHours?: number | string;
  totalCultureSports?: number;
  radar: RadarDim[];
}

interface SupervisedStudent {
  studentId: string;
  studentNo?: string;
  studentName: string;
  major?: string;
  className?: string;
  comprehensiveScore?: number | string;
  comprehensiveRank?: number;
  comprehensiveRankPercent?: number | string;
}

interface ComprehensiveScore {
  academicYear?: string;
  major?: string;
  grade?: string;
  comprehensiveRank?: number;
  comprehensiveRankPercent?: number | string;
  rankTotal?: number;
  rankScope?: string;
}

interface GrowthDimension {
  key?: string;
  label?: string;
  dimension?: string;
  score?: number;
  maxScore?: number;
}

interface GrowthProfileVO {
  studentId?: number | string;
  dimensions?: GrowthDimension[];
  totalCompetitions?: number;
  totalAwards?: number;
  totalActivities?: number;
  totalVolunteerHours?: number | string;
  totalCultureSports?: number;
}

interface TeacherGrowthOverview {
  totalStudents?: number;
  averageDimensions?: GrowthDimension[];
  activityTypeDistribution?: Record<string, number>;
  totalVolunteerHours?: number | string;
  lowParticipationCount?: number;
  lowParticipationStudents?: Array<{
    studentId?: number | string;
    studentNo?: string;
    studentName?: string;
    major?: string;
    className?: string;
    evidenceCount?: number;
  }>;
}

interface OverviewMetricCard {
  label: string;
  value: string;
  suffix: string;
  icon: string;
  hint: string;
  progress?: number;
}

interface StudentMetricCard {
  label: string;
  value: string;
  suffix: string;
  icon: string;
  hint?: string;
  interactive?: boolean;
}

const RADAR_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'innovation', label: '创新能力' },
  { key: 'engineering', label: '工程实践' },
  { key: 'programming', label: '编程能力' },
  { key: 'writing', label: '文档写作' },
  { key: 'teamwork', label: '团队协作' },
];

function RadarChart({ data }: { data: RadarDim[] }) {
  const cx = 120;
  const cy = 120;
  const maxRadius = 90;
  const n = data.length;
  const angleStep = (2 * Math.PI) / Math.max(n, 1);

  const getPolygonPoints = (radius: number) =>
    Array.from({ length: n }, (_, i) => {
      const angle = angleStep * i - Math.PI / 2;
      return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
    }).join(' ');

  const dataPoints = data
    .map((d, i) => {
      const angle = angleStep * i - Math.PI / 2;
      const r = (d.score / Math.max(d.maxScore, 1)) * maxRadius;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 240 240" className="w-full h-full">
      {[0.25, 0.5, 0.75, 1].map((level, idx) => (
        <polygon key={idx} points={getPolygonPoints(maxRadius * level)} fill="none" stroke="var(--color-border)" strokeWidth="1" />
      ))}
      {data.map((_, i) => {
        const angle = angleStep * i - Math.PI / 2;
        const x2 = cx + maxRadius * Math.cos(angle);
        const y2 = cy + maxRadius * Math.sin(angle);
        return <line key={i} x1={cx} y1={cy} x2={x2} y2={y2} stroke="var(--color-border)" strokeWidth="1" />;
      })}
      <polygon points={dataPoints} fill="var(--color-primary)" fillOpacity="var(--radar-fill-opacity)" stroke="var(--color-primary)" strokeWidth="2" />
      {data.map((d, i) => {
        const angle = angleStep * i - Math.PI / 2;
        const r = (d.score / Math.max(d.maxScore, 1)) * maxRadius;
        return <circle key={i} cx={cx + r * Math.cos(angle)} cy={cy + r * Math.sin(angle)} r="3.5" fill="var(--color-primary)" />;
      })}
      {data.map((d, i) => {
        const angle = angleStep * i - Math.PI / 2;
        const labelRadius = maxRadius + 18;
        const x = cx + labelRadius * Math.cos(angle);
        const y = cy + labelRadius * Math.sin(angle);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="text-caption-2 font-medium" fill="var(--color-ink)">
            {d.dimension}
          </text>
        );
      })}
    </svg>
  );
}

function mapRadar(raw: any): RadarDim[] {
  const rd = raw?.radarData ?? raw?.radar ?? null;
  if (!rd) return [];
  if (Array.isArray(rd)) {
    return rd.map((d: any) => ({
      dimension: d.dimension ?? '',
      score: Number(d.score ?? 0),
      maxScore: Number(d.maxScore ?? 100),
    }));
  }
  return RADAR_FIELDS.map((f) => ({
    dimension: f.label,
    score: Number(rd[f.key] ?? 0),
    maxScore: 100,
  }));
}

function mapProfileRadar(raw: GrowthProfileVO | null): RadarDim[] {
  if (!Array.isArray(raw?.dimensions)) return [];
  return raw.dimensions.map((d) => ({
    dimension: d.label ?? d.dimension ?? '',
    score: Number(d.score ?? 0),
    maxScore: Number(d.maxScore ?? 100),
  }));
}

function formatHours(value?: number | string) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
}

function formatOfficialRank(score?: ComprehensiveScore | null) {
  if (!score?.comprehensiveRank) return '暂无数据';
  return score.rankTotal ? `第 ${score.comprehensiveRank} / ${score.rankTotal} 名` : `第 ${score.comprehensiveRank} 名`;
}

function formatOfficialPercent(value?: number | string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '暂无数据';
  const percent = n > 1 ? n : n * 100;
  return `前 ${percent.toFixed(1)}%`;
}

function studentNoText(student: Pick<SupervisedStudent, 'studentId' | 'studentNo'>) {
  return student.studentNo || student.studentId;
}

function compareByStudentNo(a: SupervisedStudent, b: SupervisedStudent) {
  return studentNoText(a).localeCompare(studentNoText(b), 'zh-CN', { numeric: true });
}

export default function TeacherStudentGrowth() {
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialId = searchParams.get('studentId') ?? '';
  const basePath = '/teacher';
  const scopeCollege = currentUser?.department || (currentUser as any)?.college || '';

  const [selectedId, setSelectedId] = useState<string>(initialId);
  const [supervised, setSupervised] = useState<SupervisedStudent[]>([]);
  const [growth, setGrowth] = useState<StudentGrowthData | null>(null);
  const [overview, setOverview] = useState<TeacherGrowthOverview | null>(null);
  const [comprehensive, setComprehensive] = useState<ComprehensiveScore | null>(null);
  const [comprehensiveMode, setComprehensiveMode] = useState<'rank' | 'percent'>('rank');
  const [studentSort, setStudentSort] = useState<'default' | 'comprehensive_desc'>('default');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingGrowth, setLoadingGrowth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterValues>({});
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());

  const handleFilterChange = useCallback((f: FilterValues) => {
    setFilters(f);
  }, []);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 4) {
        next.add(id);
      } else {
        toast.warning('最多选择 4 名学生进行对比');
      }
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadOverview = async () => {
      setLoadingOverview(true);
      try {
        const params: Record<string, any> = {};
        if (filters.college || scopeCollege) params.college = filters.college || scopeCollege;
        if (filters.grade) params.grade = filters.grade;
        if (filters.major) params.major = filters.major;
        if (filters.className) params.className = filters.className;
        const data = await apiClient.get('/teacher/growth-overview', { params });
        if (!cancelled) setOverview(data as TeacherGrowthOverview);
      } catch (e) {
        console.error(e);
        if (!cancelled) setOverview(null);
      } finally {
        if (!cancelled) setLoadingOverview(false);
      }
    };
    loadOverview();
    return () => {
      cancelled = true;
    };
  }, [filters, scopeCollege]);

  useEffect(() => {
    let cancelled = false;
    const loadStudents = async () => {
      setLoadingList(true);
      try {
        const params: Record<string, any> = { current: 1, size: 1000 };
        if (filters.college || scopeCollege) params.college = filters.college || scopeCollege;
        if (filters.grade) params.grade = filters.grade;
        if (filters.major) params.major = filters.major;
        if (filters.className) params.className = filters.className;
        if (studentSort !== 'default') params.sort = studentSort;
        const data: any = await apiClient.get('/teacher/students', { params });
        if (cancelled) return;

        const records: any[] = Array.isArray(data) ? data : data?.records ?? [];
        const map = new Map<string, SupervisedStudent>();
        records.forEach((r: any) => {
          const sid = String(r.id ?? r.studentId ?? '');
          if (!sid || map.has(sid)) return;
          map.set(sid, {
            studentId: sid,
            studentNo: r.username,
            studentName: r.realName ?? r.studentName ?? `学号 ${r.username ?? sid}`,
            major: r.major,
            className: r.className,
            comprehensiveScore: r.comprehensiveScore,
            comprehensiveRank: r.comprehensiveRank,
            comprehensiveRankPercent: r.comprehensiveRankPercent,
          });
        });

        const list = Array.from(map.values());
        const orderedList = studentSort === 'default' ? [...list].sort(compareByStudentNo) : list;
        setSupervised(orderedList);
        setCompareIds((prev) => new Set(Array.from(prev).filter((id) => map.has(id))));
        if (orderedList.length === 0) {
          setSelectedId('');
        } else if (!selectedId || !map.has(selectedId)) {
          setSelectedId(orderedList[0].studentId);
        }
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message || '加载学生列表失败');
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    };
    loadStudents();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, scopeCollege, studentSort]);

  useEffect(() => {
    if (!selectedId) {
      setGrowth(null);
      setComprehensive(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoadingGrowth(true);
      setError(null);
      try {
        let profileError: unknown = null;
        let radarError: unknown = null;
        const [profile, data, score]: any[] = await Promise.all([
          apiClient.get('/growth/profile', { params: { studentId: selectedId } }).catch((e) => {
            profileError = e;
            return null;
          }),
          apiClient.get('/growth/radar', { params: { studentId: selectedId } }).catch((e) => {
            radarError = e;
            return null;
          }),
          apiClient.get('/growth/comprehensive', { params: { studentId: selectedId } }).catch(() => null),
        ]);
        if (!profile && !data) {
          throw profileError || radarError || new Error('获取成长数据失败');
        }
        if (cancelled) return;
        const profileRadar = mapProfileRadar(profile as GrowthProfileVO | null);
        const fallbackRadar = mapRadar(data);
        setGrowth({
          studentId: profile?.studentId ?? data?.studentId ?? selectedId,
          totalCompetitions: profile?.totalCompetitions ?? data?.totalCompetitions ?? 0,
          awards: profile?.totalAwards ?? data?.awards ?? 0,
          totalActivities: profile?.totalActivities ?? 0,
          totalVolunteerHours: profile?.totalVolunteerHours ?? 0,
          totalCultureSports: profile?.totalCultureSports ?? 0,
          radar: profileRadar.length > 0 ? profileRadar : fallbackRadar,
        });
        setComprehensive(score ?? null);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || '获取成长数据失败');
      } finally {
        if (!cancelled) setLoadingGrowth(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (selectedId && selectedId !== searchParams.get('studentId')) {
      setSearchParams({ studentId: selectedId }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return supervised;
    const q = searchQuery.toLowerCase();
    return supervised.filter((s) =>
      s.studentName.toLowerCase().includes(q)
      || s.studentNo?.includes(q)
      || s.studentId.includes(q)
      || s.major?.toLowerCase().includes(q)
      || s.className?.toLowerCase().includes(q)
    );
  }, [supervised, searchQuery]);

  const selectedStudent = supervised.find((s) => s.studentId === selectedId);
  const selectedPercent = formatOfficialPercent(selectedStudent?.comprehensiveRankPercent);
  const activityDistribution = overview?.activityTypeDistribution ?? {};
  const totalStudents = overview?.totalStudents ?? supervised.length;
  const lowParticipationCount = overview?.lowParticipationCount ?? overview?.lowParticipationStudents?.length ?? 0;
  const coveredStudents = Math.max(0, totalStudents - lowParticipationCount);
  const coveragePercent = totalStudents > 0
    ? Number(((coveredStudents / totalStudents) * 100).toFixed(1))
    : 0;
  const volunteerParticipation = Number(activityDistribution.volunteer ?? 0);
  const cultureSportsParticipation = Number(activityDistribution.culture_sports ?? 0);
  const campusParticipation = volunteerParticipation + cultureSportsParticipation;
  const scopeLabel = filters.className || filters.major || filters.grade || scopeCollege || '全部学生';
  const hasOfficialRank = Boolean(comprehensive?.comprehensiveRank);

  const overviewCards: OverviewMetricCard[] = [
    {
      label: '已形成成长档案',
      value: loadingOverview ? '...' : `${coveredStudents}/${totalStudents}`,
      suffix: '人',
      icon: 'groups',
      hint: loadingOverview ? '正在汇总当前范围数据' : `覆盖率 ${coveragePercent}% · 已有审核成长记录`,
      progress: loadingOverview ? 0 : coveragePercent,
    },
    {
      label: '已审核校园参与',
      value: loadingOverview ? '...' : String(campusParticipation),
      suffix: '人次',
      icon: 'volunteer_activism',
      hint: loadingOverview ? '正在汇总审核记录' : `志愿 ${volunteerParticipation} 人次 · 文体 ${cultureSportsParticipation} 人次`,
    },
    {
      label: '尚未沉淀成长记录',
      value: loadingOverview ? '...' : String(lowParticipationCount),
      suffix: '人',
      icon: 'person_alert',
      hint: '缺少已审核的竞赛、志愿或文体记录',
    },
  ];

  const kpiCards: StudentMetricCard[] = [
    { label: '竞赛实践', value: String(growth?.totalCompetitions ?? 0), suffix: '次', icon: 'emoji_events' },
    { label: '校园活动参与', value: String(growth?.totalActivities ?? 0), suffix: '次', icon: 'event_available' },
    { label: '志愿时长', value: formatHours(growth?.totalVolunteerHours), suffix: '小时', icon: 'volunteer_activism' },
    { label: '文体参与', value: String(growth?.totalCultureSports ?? 0), suffix: '次', icon: 'sports_soccer' },
    { label: '认证荣誉', value: String(growth?.awards ?? 0), suffix: '项', icon: 'verified' },
    {
      label: '综测排名',
      value: hasOfficialRank && comprehensiveMode === 'rank'
        ? formatOfficialRank(comprehensive)
        : hasOfficialRank
          ? formatOfficialPercent(comprehensive?.comprehensiveRankPercent)
          : '暂无数据',
      suffix: '',
      icon: 'leaderboard',
      interactive: hasOfficialRank,
      hint: hasOfficialRank
        ? `${comprehensive?.rankScope || comprehensive?.major || '本专业'} · 点击查看${comprehensiveMode === 'rank' ? '前百分位' : '排名'}`
        : '本学年综测数据未同步',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHero
        eyebrow="Growth"
        title="学生成长管理"
        description="按学院、专业或班级查看竞赛、志愿、文体活动沉淀与学生成长画像。"
        contentClassName="max-w-2xl"
        actions={(
          <>
            <div className="relative w-[220px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-placeholder">search</span>
              <input
                className="input-glass h-9 pl-9 text-footnote !rounded-lg"
                placeholder="搜索姓名或学号"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {selectedId && (
              <button
                onClick={() => navigate(`${basePath}/student-detail?studentId=${selectedId}`)}
                className="btn-secondary h-9 flex items-center gap-1.5 text-footnote"
              >
                <span className="material-symbols-outlined text-[16px]">person</span>
                查看详情
              </button>
            )}
            {compareIds.size >= 2 && (
              <button
                onClick={() => navigate(`${basePath}/student-compare?ids=${Array.from(compareIds).join(',')}`)}
                className="btn-primary h-9 flex items-center gap-1.5 text-footnote"
              >
                <span className="material-symbols-outlined text-[16px]">compare</span>
                对比 ({compareIds.size})
              </button>
            )}
            <ExportButton filters={filters} fixedCollege={scopeCollege || undefined} />
          </>
        )}
      />

      <div className="filter-bar justify-between">
        <CascadeFilter onChange={handleFilterChange} fixedCollege={scopeCollege || undefined} showCollege={!scopeCollege} />
        <label className="flex items-center gap-2 text-footnote text-body-muted">
          <span className="material-symbols-outlined text-[17px] text-body-muted">sort</span>
          <select
            value={studentSort}
            onChange={(e) => setStudentSort(e.target.value as 'default' | 'comprehensive_desc')}
            className="h-9 min-w-[190px] rounded-sm border border-hairline bg-canvas pl-3 pr-9 text-subhead font-normal text-ink transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          >
            <option value="default">默认排序</option>
            <option value="comprehensive_desc">专业综测从高到低</option>
          </select>
        </label>
      </div>

      <section className="flex flex-col gap-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-card-title flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-body-muted">monitoring</span>
            范围健康度
          </h2>
          <span className="text-caption text-placeholder">
            当前筛选：{scopeLabel}
          </span>
        </div>
        <div className="stat-grid !grid-cols-1 sm:!grid-cols-3">
          {overviewCards.map((card) => (
            <div key={card.label} className="stat-card">
              <div className="flex justify-between items-start mb-2">
                <p className="text-footnote text-body-muted">{card.label}</p>
                <span className="material-symbols-outlined text-[18px] text-body-muted">{card.icon}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display font-medium text-title-2 leading-none tabular-nums text-ink">{card.value}</span>
                <span className="text-caption text-placeholder">{card.suffix}</span>
              </div>
              <p className="mt-2 truncate text-caption-2 text-placeholder">{card.hint}</p>
              {typeof card.progress === 'number' && (
                <ProgressBar
                  value={card.progress}
                  size="sm"
                  segments={2}
                  showThumb={false}
                  instant
                  className="mt-3"
                />
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="section-card overflow-hidden">
        <div className="section-card-header flex-wrap gap-2">
          <div>
            <h2 className="section-card-title flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-body-muted">person</span>
              学生画像
            </h2>
            <p className="mt-1 text-caption-2 text-placeholder">仅展示当前选中学生的个人累计数据</p>
          </div>
          {selectedStudent ? (
            <div className="ml-auto min-w-0 text-right">
              <p className="truncate text-footnote font-medium text-ink">{selectedStudent.studentName}</p>
              <p className="truncate text-caption-2 text-placeholder">
                {selectedStudent.studentNo ?? selectedStudent.studentId}
                {selectedStudent.major ? ` · ${selectedStudent.major}` : ''}
                {selectedStudent.className ? ` · ${selectedStudent.className}` : ''}
              </p>
            </div>
          ) : null}
        </div>
        {!selectedStudent ? (
          <div className="empty-panel py-8">
            <span className="material-symbols-outlined">person_search</span>
            <p className="text-footnote">请从下方学生列表选择一名学生</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 p-3 md:grid-cols-3 xl:grid-cols-6">
            {kpiCards.map((card) => {
              const content = (
                <>
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-footnote text-body-muted">{card.label}</p>
                    <span className="material-symbols-outlined text-[18px] text-body-muted">{card.icon}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display font-medium text-title-2 leading-none tabular-nums text-ink">{card.value}</span>
                    <span className="text-caption text-placeholder">{card.suffix}</span>
                  </div>
                  {card.hint && <p className="mt-2 truncate text-caption-2 text-placeholder">{card.hint}</p>}
                </>
              );

              return card.interactive ? (
                <button
                  type="button"
                  key={card.label}
                  onClick={() => setComprehensiveMode((mode) => mode === 'rank' ? 'percent' : 'rank')}
                  className="stat-card text-left transition hover:bg-hover-overlay"
                >
                  {content}
                </button>
              ) : (
                <div key={card.label} className="stat-card">{content}</div>
              );
            })}
          </div>
        )}
      </section>

      <section className="section-card">
        <div className="section-card-header flex-wrap gap-2">
          <div>
            <h2 className="section-card-title flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-body-muted">donut_small</span>
              已审核校园活动构成
            </h2>
            <p className="mt-1 text-caption-2 text-placeholder">仅统计当前范围内审核通过的志愿与文体参与记录</p>
          </div>
          <span className="ml-auto text-caption text-placeholder">{scopeLabel}</span>
        </div>
        <div className="grid grid-cols-1 divide-y divide-hairline border-t border-hairline sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-footnote text-body-muted">志愿服务</p>
                <p className="mt-1 text-caption-2 text-placeholder">累计 {formatHours(overview?.totalVolunteerHours)} 小时</p>
              </div>
              <p className="font-display text-title-2 font-medium tabular-nums text-ink">
                {loadingOverview ? '...' : volunteerParticipation}<span className="ml-1 text-caption font-normal text-placeholder">人次</span>
              </p>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-footnote text-body-muted">文体活动</p>
                <p className="mt-1 text-caption-2 text-placeholder">审核通过后计入文体素养</p>
              </div>
              <p className="font-display text-title-2 font-medium tabular-nums text-ink">
                {loadingOverview ? '...' : cultureSportsParticipation}<span className="ml-1 text-caption font-normal text-placeholder">人次</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col lg:flex-row gap-3 min-h-[500px] lg:h-[720px]">
        <aside className="w-full lg:w-80 max-h-[520px] lg:max-h-none section-card overflow-hidden flex flex-col shrink-0">
          <div className="section-card-header">
            <h3 className="section-card-title flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-body-muted">groups</span>
              监管学生
              <span className="chip ml-auto">{filteredStudents.length}</span>
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loadingList ? (
              <div className="py-10 grid place-items-center text-placeholder">
                <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-10 grid place-items-center text-placeholder gap-2">
                <span className="material-symbols-outlined text-[28px] opacity-40">person_off</span>
                <p className="text-caption">暂无学生</p>
              </div>
            ) : (
              <div>
                {filteredStudents.map((s) => {
                  const rankPercentText = formatOfficialPercent(s.comprehensiveRankPercent);
                  return (
                    <div key={s.studentId} className={`flex items-center gap-2 p-2 rounded-md transition mb-1 ${
                        selectedId === s.studentId ? 'bg-hover-overlay' : 'hover:bg-hover-overlay'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={compareIds.has(s.studentId)}
                        onChange={() => toggleCompare(s.studentId)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-hairline text-body-muted focus:ring-primary/30 shrink-0 accent-primary"
                      />
                      <button onClick={() => setSelectedId(s.studentId)} className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-footnote ${selectedId === s.studentId ? 'text-ink font-semibold' : 'text-ink font-medium'} truncate`}>
                            {s.studentName}
                          </span>
                          {studentSort !== 'default' && s.comprehensiveRank ? (
                            <span className="ml-auto shrink-0 rounded-sm bg-surface-tile-1 px-1.5 py-0.5 text-caption-2 font-medium tabular-nums text-body-muted">
                              第 {s.comprehensiveRank} 名
                            </span>
                          ) : null}
                        </div>
                        <div className="text-caption-2 text-placeholder mt-0.5 truncate">
                          {s.studentNo ?? s.studentId}{s.major ? ` · ${s.major}` : ''}{s.className ? ` · ${s.className}` : ''}
                        </div>
                        {rankPercentText !== '暂无数据' && (
                          <div className="mt-1 text-caption-2 text-body-muted tabular-nums">
                            综测排名 {rankPercentText}
                          </div>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <div className="flex-1 section-card overflow-hidden flex flex-col">
          {!selectedId ? (
            <div className="empty-panel flex-1">
              <span className="material-symbols-outlined">insights</span>
              <p className="text-footnote font-medium text-body-muted">请从左侧选择学生</p>
              <p className="text-caption text-placeholder">查看成长档案与能力画像</p>
            </div>
          ) : loadingGrowth ? (
            <div className="empty-panel flex-1">
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            </div>
          ) : error ? (
            <div className="empty-panel flex-1 text-error">
              <span className="material-symbols-outlined">error_outline</span>
              <p className="text-footnote">{error}</p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto section-card-body">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-md bg-surface-tile-1 text-callout font-medium text-body-muted">
                  {(selectedStudent?.studentName || '?')[0]}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-callout font-medium text-ink">
                    {selectedStudent?.studentName || `学号 ${selectedId}`}
                  </p>
                  <p className="truncate text-caption text-placeholder">
                    {selectedStudent?.studentNo ?? selectedId}
                    {selectedStudent?.major ? ` · ${selectedStudent.major}` : ''}
                    {selectedStudent?.className ? ` · ${selectedStudent.className}` : ''}
                    {selectedPercent !== '暂无数据' ? ` · 综测排名 ${selectedPercent}` : ''}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="section-card-title mb-3">成长画像五维</h3>
                {growth && growth.radar.length > 0 ? (
                  <div className="mx-auto aspect-square max-w-[320px]">
                    <RadarChart data={growth.radar} />
                  </div>
                ) : (
                  <div className="empty-panel py-10">
                    <span className="material-symbols-outlined">insights</span>
                    <p className="text-footnote">暂无画像数据</p>
                  </div>
                )}
              </div>

              {growth && growth.radar.length > 0 && (
                <div>
                  <h3 className="section-card-title mb-3">画像详情</h3>
                  <div className="flex flex-col gap-3">
                    {growth.radar.map((d) => (
                      <div key={d.dimension}>
                        <div className="mb-1 flex justify-between text-caption">
                          <span className="text-body-muted">{d.dimension}</span>
                          <span className="font-medium tabular-nums text-ink">{d.score} / {d.maxScore}</span>
                        </div>
                        <ProgressBar
                          value={(d.score / Math.max(d.maxScore, 1)) * 100}
                          size="sm"
                          segments={4}
                          showThumb
                          instant
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
