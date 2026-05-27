import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';
import CascadeFilter, { type FilterValues } from '../../components/CascadeFilter';

function ExportButton() {
  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/teacher/export/comprehensive', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
      });
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '学生综测报告.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('导出成功');
    } catch {
      toast.error('导出失败，请稍后再试');
    } finally {
      setExporting(false);
    }
  };
  return (
    <button onClick={handleExport} disabled={exporting} className="btn-secondary h-9 flex items-center gap-1.5 text-[13px] disabled:opacity-60 disabled:cursor-not-allowed">
      <span className="material-symbols-outlined text-[16px]">{exporting ? 'hourglass_top' : 'download'}</span>
      {exporting ? '导出中…' : '导出综测'}
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
  radar: RadarDim[];
}

interface SupervisedStudent {
  studentId: string;
  studentName: string;
  className?: string;
}

// Backend RadarData fields → display labels
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

  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  return (
    <svg viewBox="0 0 240 240" className="w-full h-full">
      {gridLevels.map((level, idx) => (
        <polygon
          key={idx}
          points={getPolygonPoints(maxRadius * level)}
          fill="none"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth="0.5"
        />
      ))}
      {data.map((_, i) => {
        const angle = angleStep * i - Math.PI / 2;
        const x2 = cx + maxRadius * Math.cos(angle);
        const y2 = cy + maxRadius * Math.sin(angle);
        return <line key={i} x1={cx} y1={cy} x2={x2} y2={y2} stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />;
      })}
      <polygon points={dataPoints} fill="var(--color-primary)" fillOpacity="0.15" stroke="var(--color-primary)" strokeWidth="1.5" />
      {data.map((d, i) => {
        const angle = angleStep * i - Math.PI / 2;
        const r = (d.score / Math.max(d.maxScore, 1)) * maxRadius;
        return (
          <circle key={i} cx={cx + r * Math.cos(angle)} cy={cy + r * Math.sin(angle)} r="3.5" fill="var(--color-primary)" />
        );
      })}
      {data.map((d, i) => {
        const angle = angleStep * i - Math.PI / 2;
        const labelRadius = maxRadius + 18;
        const x = cx + labelRadius * Math.cos(angle);
        const y = cy + labelRadius * Math.sin(angle);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="text-[10px] font-medium" fill="var(--color-ink)">
            {d.dimension}
          </text>
        );
      })}
    </svg>
  );
}

function mapRadar(raw: any): RadarDim[] {
  // Backend shape: { radarData: { innovation, engineering, programming, writing, teamwork } }
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

export default function TeacherStudentGrowth() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialId = searchParams.get('studentId') ?? '';

  const [selectedId, setSelectedId] = useState<string>(initialId);
  const [supervised, setSupervised] = useState<SupervisedStudent[]>([]);
  const [growth, setGrowth] = useState<StudentGrowthData | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingGrowth, setLoadingGrowth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterValues>({});

  const handleFilterChange = useCallback((f: FilterValues) => {
    setFilters(f);
  }, []);

  // Load supervised student list
  useEffect(() => {
    let cancelled = false;
    const loadStudents = async () => {
      setLoadingList(true);
      try {
        const params: Record<string, any> = { current: 1, size: 200 };
        if (filters.college) params.college = filters.college;
        if (filters.grade) params.grade = filters.grade;
        if (filters.major) params.major = filters.major;
        if (filters.className) params.className = filters.className;
        const data: any = await apiClient.get('/teacher/monitor/registrations', { params });
        if (cancelled) return;
        const records: any[] = Array.isArray(data) ? data : data?.records ?? [];
        const map = new Map<string, SupervisedStudent>();
        records.forEach((r: any) => {
          const sid = String(r.studentId ?? '');
          if (!sid || map.has(sid)) return;
          map.set(sid, {
            studentId: sid,
            studentName: r.studentName ?? `学号 ${sid}`,
            className: r.className,
          });
        });
        const list = Array.from(map.values());
        setSupervised(list);
        if (!selectedId && list.length > 0) {
          setSelectedId(list[0].studentId);
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
  }, [filters]);

  // Load growth for selected student
  useEffect(() => {
    if (!selectedId) {
      setGrowth(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoadingGrowth(true);
      setError(null);
      try {
        const data: any = await apiClient.get('/growth/radar', { params: { studentId: selectedId } });
        if (cancelled) return;
        setGrowth({
          studentId: data?.studentId ?? selectedId,
          totalCompetitions: data?.totalCompetitions ?? 0,
          awards: data?.awards ?? 0,
          radar: mapRadar(data),
        });
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

  // Sync selectedId → URL
  useEffect(() => {
    if (selectedId && selectedId !== searchParams.get('studentId')) {
      setSearchParams({ studentId: selectedId }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return supervised;
    const q = searchQuery.toLowerCase();
    return supervised.filter(
      (s) => s.studentName.toLowerCase().includes(q) || s.studentId.includes(q)
    );
  }, [supervised, searchQuery]);

  const selectedStudent = supervised.find((s) => s.studentId === selectedId);

  const kpiCards = [
    { label: '累计参赛', value: String(growth?.totalCompetitions ?? 0), suffix: '次', icon: 'format_list_numbered' },
    { label: '累计获奖', value: String(growth?.awards ?? 0), suffix: '项', icon: 'military_tech' },
    { label: '能力维度', value: String(growth?.radar?.length ?? 0), suffix: '项', icon: 'radar' },
    { label: '档案状态', value: growth ? '已建档' : '未建档', suffix: '', icon: 'task_alt' },
  ];

  return (
    <div className="py-lg flex flex-col gap-lg">
      {/* Header */}
      <PageHero
        eyebrow="Growth"
        title="学生成长管理"
        description="查看学生竞赛参与度与五维能力画像。"
        contentClassName="max-w-2xl"
        actions={(
          <>
            <div className="relative w-[220px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-muted-48">search</span>
              <input
                className="input-glass h-9 pl-9 text-[13px] !rounded-pill"
                placeholder="搜索姓名或学号"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {selectedId && (
              <button
                onClick={() => navigate(`/teacher/student-detail?studentId=${selectedId}`)}
                className="btn-secondary h-9 flex items-center gap-1.5 text-[13px]"
              >
                <span className="material-symbols-outlined text-[16px]">person</span>
                查看详情
              </button>
            )}
            <ExportButton />
          </>
        )}
      />

      {/* Filters */}
      <CascadeFilter onChange={handleFilterChange} />

      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
        {kpiCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.35 }}
            className="glass p-lg"
          >
            <div className="flex justify-between items-start mb-2">
              <p className="text-[13px] text-ink-muted-80">{card.label}</p>
              <span className="material-symbols-outlined text-[18px] text-primary">{card.icon}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display font-semibold text-[28px] leading-none tabular-nums text-ink">{card.value}</span>
              <span className="text-[12px] text-ink-muted-48">{card.suffix}</span>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Content: sidebar + detail */}
      <section className="flex flex-col lg:flex-row gap-md min-h-[500px]">
        {/* Sidebar — supervised student list */}
        <aside className="w-full lg:w-72 glass overflow-hidden flex flex-col shrink-0">
          <div className="p-md border-b border-hairline">
            <h3 className="text-[14px] font-semibold text-ink flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">groups</span>
              监管学生
              <span className="chip ml-auto">{supervised.length}</span>
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loadingList ? (
              <div className="py-10 grid place-items-center text-ink-muted-48">
                <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-10 grid place-items-center text-ink-muted-48 gap-2">
                <span className="material-symbols-outlined text-[28px] opacity-40">person_off</span>
                <p className="text-[12px]">暂无学生</p>
              </div>
            ) : (
              filteredStudents.map((s) => (
                <button
                  key={s.studentId}
                  onClick={() => setSelectedId(s.studentId)}
                  className={`w-full text-left p-2 rounded-md transition mb-1 ${
                    selectedId === s.studentId ? 'bg-primary/8' : 'hover:bg-primary/6'
                  }`}
                >
                  <div className={`text-[13px] ${selectedId === s.studentId ? 'text-primary font-semibold' : 'text-ink font-medium'}`}>
                    {s.studentName}
                  </div>
                  <div className="text-[11px] text-ink-muted-48 mt-0.5">
                    {s.studentId}{s.className ? ` · ${s.className}` : ''}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Detail */}
        <div className="flex-1 glass overflow-hidden flex flex-col">
          {!selectedId ? (
            <div className="flex-1 grid place-items-center text-ink-muted-48 gap-2 p-lg">
              <span className="material-symbols-outlined text-[48px] opacity-40">insights</span>
              <p className="text-[15px] font-medium text-ink-muted-80">请从左侧选择学生</p>
              <p className="text-[13px]">查看其成长档案与能力画像</p>
            </div>
          ) : loadingGrowth ? (
            <div className="flex-1 grid place-items-center text-ink-muted-48">
              <span className="material-symbols-outlined animate-spin text-[28px]">progress_activity</span>
            </div>
          ) : error ? (
            <div className="flex-1 grid place-items-center text-error gap-2">
              <span className="material-symbols-outlined text-[32px]">error_outline</span>
              <p className="text-[14px]">{error}</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-lg flex flex-col gap-lg">
              {/* Profile */}
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-canvas-parchment text-ink-muted-80 grid place-items-center font-semibold text-[18px]">
                  {(selectedStudent?.studentName || '?')[0]}
                </div>
                <div>
                  <p className="text-[18px] font-semibold text-ink">
                    {selectedStudent?.studentName || `学号 ${selectedId}`}
                  </p>
                  <p className="text-[12px] text-ink-muted-48">
                    {selectedId}{selectedStudent?.className ? ` · ${selectedStudent.className}` : ''}
                  </p>
                </div>
              </div>

              {/* Radar */}
              <div>
                <h3 className="text-[15px] font-semibold text-ink mb-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">radar</span>
                  能力维度雷达
                </h3>
                {growth && growth.radar.length > 0 ? (
                  <div className="aspect-square max-w-[320px] mx-auto">
                    <RadarChart data={growth.radar} />
                  </div>
                ) : (
                  <div className="py-10 grid place-items-center text-ink-muted-48 gap-2">
                    <span className="material-symbols-outlined text-[28px] opacity-40">radar</span>
                    <p className="text-[12px]">暂无能力数据</p>
                  </div>
                )}
              </div>

              {/* Dimension bars */}
              {growth && growth.radar.length > 0 && (
                <div>
                  <h3 className="text-[15px] font-semibold text-ink mb-md flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">bar_chart</span>
                    能力详情
                  </h3>
                  <div className="flex flex-col gap-3">
                    {growth.radar.map((d) => (
                      <div key={d.dimension}>
                        <div className="flex justify-between text-[12px] mb-1">
                          <span className="text-ink-muted-80">{d.dimension}</span>
                          <span className="text-ink font-semibold tabular-nums">{d.score} / {d.maxScore}</span>
                        </div>
                        <div className="h-1 w-full rounded-full bg-primary/8 overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${(d.score / Math.max(d.maxScore, 1)) * 100}%` }} />
                        </div>
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
