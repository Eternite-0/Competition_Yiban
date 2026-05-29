import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';

interface RadarDim {
  dimension: string;
  score: number;
  maxScore: number;
}

interface StudentData {
  studentId: string;
  realName: string;
  className: string;
  radar: RadarDim[];
  totalCompetitions: number;
  awards: number;
}

const RADAR_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'innovation', label: '创新能力' },
  { key: 'engineering', label: '工程实践' },
  { key: 'programming', label: '编程能力' },
  { key: 'writing', label: '文档写作' },
  { key: 'teamwork', label: '团队协作' },
];

const COLORS = ['var(--color-primary)', 'var(--color-warning)', 'var(--color-success)', 'var(--color-error)'];

function mapRadar(raw: any): RadarDim[] {
  const rd = raw?.radarData ?? null;
  if (!rd) return [];
  return RADAR_FIELDS.map((f) => ({
    dimension: f.label,
    score: Number(rd[f.key] ?? 0),
    maxScore: 100,
  }));
}

function CompareRadarChart({ students }: { students: StudentData[] }) {
  const cx = 140, cy = 140, maxRadius = 100;
  const n = RADAR_FIELDS.length;
  const angleStep = (2 * Math.PI) / n;

  const getPolygonPoints = (radius: number) =>
    Array.from({ length: n }, (_, i) => {
      const angle = angleStep * i - Math.PI / 2;
      return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
    }).join(' ');

  return (
    <svg viewBox="0 0 280 280" className="w-full h-full">
      {[0.25, 0.5, 0.75, 1.0].map((level, idx) => (
        <polygon key={idx} points={getPolygonPoints(maxRadius * level)} fill="none" stroke="var(--color-border)" strokeWidth="1" />
      ))}
      {RADAR_FIELDS.map((_, i) => {
        const angle = angleStep * i - Math.PI / 2;
        return <line key={i} x1={cx} y1={cy} x2={cx + maxRadius * Math.cos(angle)} y2={cy + maxRadius * Math.sin(angle)} stroke="var(--color-border)" strokeWidth="1" />;
      })}
      {students.map((s, si) => {
        const points = s.radar.map((d, i) => {
          const angle = angleStep * i - Math.PI / 2;
          const r = (d.score / Math.max(d.maxScore, 1)) * maxRadius;
          return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
        }).join(' ');
        return (
          <polygon
            key={s.studentId}
            points={points}
            fill={COLORS[si % COLORS.length]}
            fillOpacity="var(--radar-fill-opacity)"
            stroke={COLORS[si % COLORS.length]}
            strokeWidth="2"
          />
        );
      })}
      {RADAR_FIELDS.map((f, i) => {
        const angle = angleStep * i - Math.PI / 2;
        const labelR = maxRadius + 18;
        return (
          <text key={i} x={cx + labelR * Math.cos(angle)} y={cy + labelR * Math.sin(angle)} textAnchor="middle" dominantBaseline="middle" className="text-[10px] font-medium" fill="var(--color-ink)">
            {f.label}
          </text>
        );
      })}
    </svg>
  );
}

export default function StudentCompare() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const basePath = '/teacher';
  const ids = searchParams.get('ids')?.split(',').filter(Boolean) ?? [];

  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length === 0) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const results = await Promise.all(
          ids.map(async (id) => {
            const res: any = await apiClient.get('/teacher/student-detail', { params: { studentId: id } });
            return {
              studentId: id,
              realName: res.student?.realName ?? `学号 ${id}`,
              className: res.student?.className ?? '',
              radar: mapRadar(res.radar),
              totalCompetitions: res.totalCompetitions ?? 0,
              awards: res.totalAwards ?? 0,
            } as StudentData;
          })
        );
        if (!cancelled) setStudents(results);
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message || '加载对比数据失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')]);

  if (ids.length === 0) {
    return (
      <div className="py-lg flex flex-col gap-lg">
        <PageHero eyebrow="Compare" title="学生对比" description="请从学生列表中选择 2-4 名学生进行对比。" />
        <div className="py-20 grid place-items-center text-ink-muted-48 gap-2">
          <span className="material-symbols-outlined text-[48px] opacity-40">compare</span>
          <p className="text-[14px]">未选择学生</p>
          <button onClick={() => navigate(`${basePath}/student-growth`)} className="btn-primary mt-2 text-[13px]">返回学情分析</button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-lg flex flex-col gap-lg">
      <PageHero
        eyebrow="Compare"
        title="学生对比"
        description={`${students.length} 名学生的能力对比分析。`}
        actions={(
          <button onClick={() => navigate(-1)} className="btn-secondary h-9 flex items-center gap-1.5 text-[13px]">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            返回
          </button>
        )}
      />

      {loading ? (
        <div className="py-20 grid place-items-center text-ink-muted-48">
          <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
        </div>
      ) : (
        <>
          {/* Legend */}
          <div className="flex flex-wrap gap-4">
            {students.map((s, i) => (
              <div key={s.studentId} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-[13px] font-medium text-ink">{s.realName}</span>
                <span className="text-[12px] text-ink-muted-48">{s.className}</span>
              </div>
            ))}
          </div>

          {/* Radar + Stats */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass p-xl"
            >
              <h3 className="text-[16px] font-semibold text-ink mb-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">radar</span>
                能力雷达对比
              </h3>
              <div className="aspect-square max-w-[360px] mx-auto">
                <CompareRadarChart students={students} />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass p-xl"
            >
              <h3 className="text-[16px] font-semibold text-ink mb-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">bar_chart</span>
                数据对比
              </h3>
              <div className="flex flex-col gap-6">
                {/* Competition count */}
                <div>
                  <p className="text-[13px] text-ink-muted-80 mb-2">参赛次数</p>
                  <div className="flex flex-col gap-2">
                    {students.map((s, i) => (
                      <div key={s.studentId} className="flex items-center gap-3">
                        <span className="text-[12px] text-ink w-16 truncate shrink-0">{s.realName}</span>
                        <div className="flex-1 h-5 rounded-full bg-primary/8 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min((s.totalCompetitions / Math.max(...students.map(st => st.totalCompetitions), 1)) * 100, 100)}%`,
                              backgroundColor: COLORS[i % COLORS.length],
                            }}
                          />
                        </div>
                        <span className="text-[12px] tabular-nums text-ink font-semibold w-8 text-right">{s.totalCompetitions}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Awards */}
                <div>
                  <p className="text-[13px] text-ink-muted-80 mb-2">获奖数</p>
                  <div className="flex flex-col gap-2">
                    {students.map((s, i) => (
                      <div key={s.studentId} className="flex items-center gap-3">
                        <span className="text-[12px] text-ink w-16 truncate shrink-0">{s.realName}</span>
                        <div className="flex-1 h-5 rounded-full bg-primary/8 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min((s.awards / Math.max(...students.map(st => st.awards), 1)) * 100, 100)}%`,
                              backgroundColor: COLORS[i % COLORS.length],
                            }}
                          />
                        </div>
                        <span className="text-[12px] tabular-nums text-ink font-semibold w-8 text-right">{s.awards}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Radar dimensions */}
                {RADAR_FIELDS.map((f) => (
                  <div key={f.key}>
                    <p className="text-[13px] text-ink-muted-80 mb-2">{f.label}</p>
                    <div className="flex flex-col gap-2">
                      {students.map((s, i) => {
                        const dim = s.radar.find(d => d.dimension === f.label);
                        return (
                          <div key={s.studentId} className="flex items-center gap-3">
                            <span className="text-[12px] text-ink w-16 truncate shrink-0">{s.realName}</span>
                            <div className="flex-1 h-5 rounded-full bg-primary/8 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${dim ? dim.score : 0}%`,
                                  backgroundColor: COLORS[i % COLORS.length],
                                }}
                              />
                            </div>
                            <span className="text-[12px] tabular-nums text-ink font-semibold w-8 text-right">{dim?.score ?? 0}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </section>
        </>
      )}
    </div>
  );
}
