import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';
import ProgressBar from '../../components/ProgressBar';

interface StudentInfo {
  id: number;
  username: string;
  realName: string;
  college: string;
  major: string;
  className: string;
  grade: string;
}

interface CompetitionEntry {
  registrationId: number;
  competitionId: number;
  competitionName: string;
  competitionLevel: string;
  competitionCategory: string;
  teamName: string | null;
  status: string;
  submitDate: string;
}

interface RadarDim {
  dimension: string;
  score: number;
  maxScore: number;
}
interface ComprehensiveScore {
  moralFinalScore?: number | null;
  sportsFinalScore?: number | null;
  abilityFinalScore?: number | null;
  academicScore?: number | null;
  comprehensiveScore?: number | null;
  moralRank?: number | null;
  sportsRank?: number | null;
  abilityRank?: number | null;
  academicRank?: number | null;
  academicYear?: string;
  major?: string;
  grade?: string;
  comprehensiveRank?: number;
  comprehensiveRankPercent?: number | string;
  rankTotal?: number;
  rankScope?: string;
}
interface DetailData {
  student: StudentInfo;
  totalCompetitions: number;
  totalAwards: number;
  awardRate: number;
  competitions: CompetitionEntry[];
  radar: { radarData: Record<string, number>; totalCompetitions: number; awards: number } | null;
  rank: number;
  rankTotal: number;
  comprehensive?: ComprehensiveScore | null;
}

const RADAR_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'innovation', label: '创新能力' },
  { key: 'engineering', label: '工程实践' },
  { key: 'programming', label: '编程能力' },
  { key: 'writing', label: '文档写作' },
  { key: 'teamwork', label: '团队协作' },
];

const statusChip: Record<string, string> = {
  '已提交': 'chip',
  '审核中': 'chip chip-warning',
  '审核通过': 'chip chip-success',
  '审核驳回': 'chip chip-error',
  '待完善': 'chip',
};

const LEVEL_COLORS: Record<string, string> = {
  '国家级': 'chip-national',
  '省级': 'chip-province',
  '校级': 'chip-school',
  '院级': 'chip-school',
};

function formatOfficialRank(score?: ComprehensiveScore | null) {
  if (!score?.comprehensiveRank) return '暂无';
  return score.rankTotal ? `${score.comprehensiveRank}/${score.rankTotal}` : String(score.comprehensiveRank);
}
function formatOfficialPercent(value?: number | string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '暂无';
  const percent = n > 1 ? n : n * 100;
  return `前 ${percent.toFixed(1)}%`;
}

function formatScore(value?: number | null) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : '暂无';
}

function formatDimensionRank(rank?: number | null, total?: number | null) {
  if (!rank) return '暂无排名';
  return total ? `第 ${rank} 名 / ${total}` : `第 ${rank} 名`;
}

function RadarChart({ data }: { data: RadarDim[] }) {
  const cx = 120, cy = 120, maxRadius = 90;
  const n = data.length;
  const angleStep = (2 * Math.PI) / Math.max(n, 1);

  const getPolygonPoints = (radius: number) =>
    Array.from({ length: n }, (_, i) => {
      const angle = angleStep * i - Math.PI / 2;
      return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
    }).join(' ');

  const dataPoints = data.map((d, i) => {
    const angle = angleStep * i - Math.PI / 2;
    const r = (d.score / Math.max(d.maxScore, 1)) * maxRadius;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 240 240" className="w-full h-full">
      {[0.25, 0.5, 0.75, 1.0].map((level, idx) => (
        <polygon key={idx} points={getPolygonPoints(maxRadius * level)} fill="none" stroke="var(--color-border)" strokeWidth="1" />
      ))}
      {data.map((_, i) => {
        const angle = angleStep * i - Math.PI / 2;
        return <line key={i} x1={cx} y1={cy} x2={cx + maxRadius * Math.cos(angle)} y2={cy + maxRadius * Math.sin(angle)} stroke="var(--color-border)" strokeWidth="1" />;
      })}
      <polygon points={dataPoints} fill="var(--color-primary)" fillOpacity="var(--radar-fill-opacity)" stroke="var(--color-primary)" strokeWidth="2" />
      {data.map((d, i) => {
        const angle = angleStep * i - Math.PI / 2;
        const r = (d.score / Math.max(d.maxScore, 1)) * maxRadius;
        return <circle key={i} cx={cx + r * Math.cos(angle)} cy={cy + r * Math.sin(angle)} r="3.5" fill="var(--color-primary)" />;
      })}
      {data.map((d, i) => {
        const angle = angleStep * i - Math.PI / 2;
        const labelR = maxRadius + 18;
        return (
          <text key={i} x={cx + labelR * Math.cos(angle)} y={cy + labelR * Math.sin(angle)} textAnchor="middle" dominantBaseline="middle" className="text-caption-2 font-medium" fill="var(--color-ink)">
            {d.dimension}
          </text>
        );
      })}
    </svg>
  );
}
export default function StudentDetail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const basePath = '/teacher';
  const studentId = searchParams.get('studentId');

  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [rankMode, setRankMode] = useState<'rank' | 'percent'>('rank');

  const handleExport = useCallback(async () => {
    if (!studentId) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/teacher/export/student-detail?studentId=${studentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
      });
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data?.student ? `${data.student.realName}_个人报告.xlsx` : '学生报告.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('导出成功');
    } catch (err) {
      console.error(err);
      toast.error('导出失败');
    } finally {
      setExporting(false);
    }
  }, [studentId, data]);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res: any = await apiClient.get('/teacher/student-detail', { params: { studentId } });
        if (cancelled) return;
        setData(res as DetailData);
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message || '加载学生详情失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [studentId]);

  if (!studentId) {
    return (
      <div className="flex flex-col gap-4">
        <PageHero eyebrow="Student" title="学生详情" description="请从学生列表中选择一名学生。" />
        <div className="empty-panel py-16">
          <span className="material-symbols-outlined">person_search</span>
          <p className="text-footnote">未指定学生</p>
          <button type="button" onClick={() => navigate(`${basePath}/student-competitions`)} className="btn-primary mt-2">返回学生看板</button>
        </div>
      </div>
    );
  }

  const radarDims: RadarDim[] = data?.radar?.radarData
    ? RADAR_FIELDS.map((f) => ({ dimension: f.label, score: data.radar!.radarData[f.key] ?? 0, maxScore: 100 }))
    : [];

  const score = data?.comprehensive;
  const scoreDimensions = score
    ? [
        { key: 'moral', label: '品德发展', score: score.moralFinalScore, rank: score.moralRank, icon: 'volunteer_activism', tone: '#7c3aed' },
        { key: 'academic', label: '学业成绩', score: score.academicScore, rank: score.academicRank, icon: 'menu_book', tone: '#2563eb' },
        { key: 'sports', label: '体育健康', score: score.sportsFinalScore, rank: score.sportsRank, icon: 'sports_score', tone: '#0f766e' },
        { key: 'ability', label: '能力素质', score: score.abilityFinalScore, rank: score.abilityRank, icon: 'rocket_launch', tone: '#b45309' },
      ]
    : [];

  const kpiCards = data
    ? [
        { label: '参赛总数', value: String(data.totalCompetitions), suffix: '次', icon: 'format_list_numbered' },
        { label: '获奖数', value: String(data.totalAwards), suffix: '项', icon: 'military_tech' },
        { label: '获奖率', value: String(Math.round((data.awardRate ?? 0) * 100)), suffix: '%', icon: 'percent' },
        {
          label: '综测排名',
          value: rankMode === 'rank'
            ? formatOfficialRank(data.comprehensive)
            : formatOfficialPercent(data.comprehensive?.comprehensiveRankPercent),
          suffix: '',
          icon: 'leaderboard',
          toggle: true,
          hint: `${data.comprehensive?.rankScope || data.student.major || '本专业'} · ${rankMode === 'rank' ? '点击看前百分位' : '点击看排名'}`,
        },
      ]
    : [];
  return (
    <div className="flex flex-col gap-4">
      <PageHero
        eyebrow="Student"
        title="学生详情"
        description={data?.student ? `${data.student.realName} · ${data.student.college}` : '加载中...'}
        actions={(
          <>
            <button type="button" onClick={handleExport} disabled={exporting} className="btn-secondary disabled:opacity-60">
              <span className="material-symbols-outlined">{exporting ? 'hourglass_top' : 'download'}</span>
              {exporting ? '导出中...' : '导出报告'}
            </button>
            <button type="button" onClick={() => navigate(-1)} className="btn-utility">
              <span className="material-symbols-outlined">arrow_back</span>
              返回
            </button>
          </>
        )}
      />

      {loading ? (
        <div className="empty-panel py-16">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
        </div>
      ) : !data ? (
        <div className="empty-panel py-16">
          <span className="material-symbols-outlined">error_outline</span>
          <p className="text-footnote">未找到学生数据</p>
        </div>
      ) : (
        <>
          <section className="section-card">
            <div className="section-card-body flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary text-title-2 font-semibold text-white shadow-sm">
                {data.student.realName[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-title-3 font-semibold text-ink">{data.student.realName}</h2>
                  <span className="chip chip-primary">{data.student.grade}级</span>
                </div>
                <p className="mt-1.5 text-footnote text-body-muted">
                  学号 {data.student.username} · {data.student.grade}级 · {data.student.major} · {data.student.className}
                </p>
                <p className="mt-1 text-caption text-placeholder">{data.student.college}</p>
              </div>
              <div className="rounded-lg bg-surface-tile-1 px-3 py-2 text-left sm:min-w-[150px] sm:text-right">
                <div className="text-caption text-body-muted">综测学年</div>
                <div className="mt-1 text-footnote font-medium text-ink">{data.comprehensive?.academicYear || '暂无数据'}</div>
              </div>
            </div>
          </section>

          <div className="stat-grid">
            {kpiCards.map((m) => (
              <button
                type="button"
                key={m.label}
                onClick={() => m.toggle && setRankMode((mode) => (mode === 'rank' ? 'percent' : 'rank'))}
                className="stat-card text-left"
              >
                <div className="stat-card-label">{m.label}</div>
                <div className="stat-card-value">
                  {m.value}
                  {m.suffix ? <span className="ml-1 text-footnote font-normal text-placeholder">{m.suffix}</span> : null}
                </div>
                {m.hint ? <div className="stat-card-hint truncate">{m.hint}</div> : null}
              </button>
            ))}
          </div>

          <section className="section-card overflow-hidden">
            <div className="section-card-header">
              <div>
                <h2 className="section-card-title">成绩与综测</h2>
                <p className="mt-1 text-caption text-body-muted">四项维度共同构成学生综合表现</p>
              </div>
              <span className="chip chip-primary">{score?.academicYear || '暂无学年'}</span>
            </div>
            {score ? (
              <div className="grid grid-cols-1 gap-0 lg:grid-cols-[minmax(230px,.75fr)_1.25fr]">
                <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary-soft to-surface-pearl px-5 py-6 lg:border-b-0 lg:border-r">
                  <div className="pointer-events-none absolute -bottom-16 -right-8 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
                  <div className="relative">
                    <div className="text-caption font-medium uppercase tracking-[0.14em] text-primary">Comprehensive score</div>
                    <div className="mt-2 flex items-end gap-2">
                      <span className="text-[46px] font-semibold leading-none tracking-tight tabular-nums text-ink">{formatScore(score.comprehensiveScore)}</span>
                      <span className="mb-1 text-footnote text-body-muted">/ 100</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-caption text-body-muted">
                      <span><span className="text-ink">综合排名</span> {formatDimensionRank(score.comprehensiveRank, score.rankTotal)}</span>
                      <span><span className="text-ink">超过</span> {formatOfficialPercent(score.comprehensiveRankPercent).replace('前 ', '')}</span>
                    </div>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-tile-2">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(Math.max(Number(score.comprehensiveScore) || 0, 0), 100)}%` }} />
                    </div>
                    <p className="mt-2 text-caption-2 text-placeholder">排名范围：{score.rankScope || '当前专业'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2">
                  {scoreDimensions.map((dimension) => (
                    <div key={dimension.key} className="bg-surface-pearl px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-tile-1" style={{ color: dimension.tone }}>
                            <span className="material-symbols-outlined text-[17px]">{dimension.icon}</span>
                          </span>
                          <span className="truncate text-footnote font-medium text-ink">{dimension.label}</span>
                        </div>
                        <span className="text-subhead font-semibold tabular-nums text-ink">{formatScore(dimension.score)}</span>
                      </div>
                      <div className="mt-3">
                        <ProgressBar value={Math.min(Math.max(Number(dimension.score) || 0, 0), 100)} size="sm" showThumb instant />
                      </div>
                      <div className="mt-2 text-caption-2 text-body-muted">{formatDimensionRank(dimension.rank, score.rankTotal)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-panel py-12">
                <span className="material-symbols-outlined">scoreboard</span>
                <p className="text-footnote">暂无综测成绩数据</p>
              </div>
            )}
          </section>

          <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <section className="section-card">
              <div className="section-card-header">
                <h2 className="section-card-title">能力雷达</h2>
              </div>
              <div className="section-card-body">
                {radarDims.length > 0 ? (
                  <div className="mx-auto aspect-square max-w-[300px]">
                    <RadarChart data={radarDims} />
                  </div>
                ) : (
                  <div className="empty-panel py-10">
                    <span className="material-symbols-outlined">radar</span>
                    <p className="text-footnote">暂无能力数据</p>
                  </div>
                )}
              </div>
            </section>

            <section className="section-card">
              <div className="section-card-header">
                <h2 className="section-card-title">能力详情</h2>
              </div>
              <div className="section-card-body">
                {radarDims.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {radarDims.map((d) => (
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
                ) : (
                  <div className="empty-panel py-10"><p className="text-footnote">暂无数据</p></div>
                )}
              </div>
            </section>
          </section>

          <section className="section-card">
            <div className="section-card-header">
              <h2 className="section-card-title">参赛记录</h2>
              <span className="text-caption text-placeholder">共 {data.competitions?.length ?? 0} 条</span>
            </div>
            <div className="section-card-body tight">
              <div className="data-table-wrap !border-0 !rounded-none">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>赛事</th>
                      <th>等级</th>
                      <th>团队</th>
                      <th>提交时间</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.competitions ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={5}>
                          <div className="empty-panel py-10"><p className="text-footnote">暂无参赛记录</p></div>
                        </td>
                      </tr>
                    ) : (
                      data.competitions.map((c) => (
                        <tr key={c.registrationId}>
                          <td>
                            <div className="max-w-[280px] truncate font-medium text-ink">{c.competitionName}</div>
                            <div className="text-caption-2 text-placeholder">{c.competitionCategory}类</div>
                          </td>
                          <td>
                            <span className={`chip text-caption-2 ${LEVEL_COLORS[c.competitionLevel] ?? ''}`}>{c.competitionLevel}</span>
                          </td>
                          <td className="text-body-muted">{c.teamName || '个人'}</td>
                          <td className="tabular-nums text-body-muted">
                            {c.submitDate ? new Date(c.submitDate).toLocaleDateString() : '-'}
                          </td>
                          <td>
                            <span className={statusChip[c.status] || 'chip'}>{c.status}</span>
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
