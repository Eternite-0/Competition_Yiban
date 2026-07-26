import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';
import ProgressBar from '../../components/ProgressBar';

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
          <text key={i} x={cx + labelR * Math.cos(angle)} y={cy + labelR * Math.sin(angle)} textAnchor="middle" dominantBaseline="middle" className="text-caption-2 font-medium" fill="var(--color-ink)">
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
      <div className="flex flex-col gap-4">
        <PageHero eyebrow="Compare" title="学生对比" description="请从学生列表中选择 2-4 名学生进行对比。" />
        <div className="empty-panel py-16">
          <span className="material-symbols-outlined">compare</span>
          <p className="text-footnote">未选择学生</p>
          <button type="button" onClick={() => navigate(`${basePath}/student-growth`)} className="btn-primary mt-2">返回学情分析</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHero
        eyebrow="Compare"
        title="学生对比"
        description={`${students.length} 名学生的能力对比分析。`}
        actions={(
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            <span className="material-symbols-outlined">arrow_back</span>
            返回
          </button>
        )}
      />

      {loading ? (
        <div className="empty-panel py-16">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          <p className="text-footnote">加载中…</p>
        </div>
      ) : (
        <>
          <div className="filter-bar">
            {students.map((s, i) => (
              <div key={s.studentId} className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-md" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-footnote font-medium text-ink">{s.realName}</span>
                <span className="text-caption text-placeholder">{s.className}</span>
              </div>
            ))}
          </div>

          <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <section className="section-card">
              <div className="section-card-header">
                <h2 className="section-card-title">能力雷达对比</h2>
              </div>
              <div className="section-card-body">
                <div className="mx-auto aspect-square max-w-[360px]">
                  <CompareRadarChart students={students} />
                </div>
              </div>
            </section>

            <section className="section-card">
              <div className="section-card-header">
                <h2 className="section-card-title">数据对比</h2>
              </div>
              <div className="section-card-body flex flex-col gap-5">
                <div>
                  <p className="mb-2 text-caption font-medium text-body-muted">参赛次数</p>
                  <div className="flex flex-col gap-2">
                    {students.map((s) => (
                      <div key={s.studentId} className="flex items-center gap-3">
                        <span className="w-16 shrink-0 truncate text-caption text-ink">{s.realName}</span>
                        <ProgressBar
                          value={Math.min((s.totalCompetitions / Math.max(...students.map((st) => st.totalCompetitions), 1)) * 100, 100)}
                          size="sm"
                          segments={4}
                          showThumb
                          instant
                          className="min-w-0 flex-1"
                        />
                        <span className="w-8 text-right text-caption font-medium tabular-nums text-ink">{s.totalCompetitions}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-caption font-medium text-body-muted">获奖数</p>
                  <div className="flex flex-col gap-2">
                    {students.map((s) => (
                      <div key={s.studentId} className="flex items-center gap-3">
                        <span className="w-16 shrink-0 truncate text-caption text-ink">{s.realName}</span>
                        <ProgressBar
                          value={Math.min((s.awards / Math.max(...students.map((st) => st.awards), 1)) * 100, 100)}
                          size="sm"
                          segments={4}
                          showThumb
                          instant
                          className="min-w-0 flex-1"
                        />
                        <span className="w-8 text-right text-caption font-medium tabular-nums text-ink">{s.awards}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {RADAR_FIELDS.map((f) => (
                  <div key={f.key}>
                    <p className="mb-2 text-caption font-medium text-body-muted">{f.label}</p>
                    <div className="flex flex-col gap-2">
                      {students.map((s) => {
                        const dim = s.radar.find((d) => d.dimension === f.label);
                        return (
                          <div key={s.studentId} className="flex items-center gap-3">
                            <span className="w-16 shrink-0 truncate text-caption text-ink">{s.realName}</span>
                            <ProgressBar
                              value={dim ? dim.score : 0}
                              size="sm"
                              segments={4}
                              showThumb
                              instant
                              className="min-w-0 flex-1"
                            />
                            <span className="w-8 text-right text-caption font-medium tabular-nums text-ink">{dim?.score ?? 0}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </section>
        </>
      )}
    </div>
  );
}
