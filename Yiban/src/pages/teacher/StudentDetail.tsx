import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';

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

interface DetailData {
  student: StudentInfo;
  totalCompetitions: number;
  totalAwards: number;
  awardRate: number;
  competitions: CompetitionEntry[];
  radar: { radarData: Record<string, number>; totalCompetitions: number; awards: number } | null;
  rank: number;
  rankTotal: number;
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
  '国家级': 'bg-red-500/10 text-red-600',
  '省级': 'bg-amber-500/10 text-amber-600',
  '校级': 'bg-blue-500/10 text-blue-600',
  '院级': 'bg-gray-500/10 text-gray-600',
};

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
        <polygon key={idx} points={getPolygonPoints(maxRadius * level)} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />
      ))}
      {data.map((_, i) => {
        const angle = angleStep * i - Math.PI / 2;
        return <line key={i} x1={cx} y1={cy} x2={cx + maxRadius * Math.cos(angle)} y2={cy + maxRadius * Math.sin(angle)} stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />;
      })}
      <polygon points={dataPoints} fill="var(--color-primary)" fillOpacity="0.15" stroke="var(--color-primary)" strokeWidth="1.5" />
      {data.map((d, i) => {
        const angle = angleStep * i - Math.PI / 2;
        const r = (d.score / Math.max(d.maxScore, 1)) * maxRadius;
        return <circle key={i} cx={cx + r * Math.cos(angle)} cy={cy + r * Math.sin(angle)} r="3.5" fill="var(--color-primary)" />;
      })}
      {data.map((d, i) => {
        const angle = angleStep * i - Math.PI / 2;
        const labelR = maxRadius + 18;
        return (
          <text key={i} x={cx + labelR * Math.cos(angle)} y={cy + labelR * Math.sin(angle)} textAnchor="middle" dominantBaseline="middle" className="text-[10px] font-medium" fill="var(--color-ink)">
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
  const studentId = searchParams.get('studentId');

  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="py-lg flex flex-col gap-lg">
        <PageHero eyebrow="Student" title="学生详情" description="请从学生列表中选择一名学生。" />
        <div className="py-20 grid place-items-center text-ink-muted-48 gap-2">
          <span className="material-symbols-outlined text-[48px] opacity-40">person_search</span>
          <p className="text-[14px]">未指定学生</p>
          <button onClick={() => navigate('/teacher/student-competitions')} className="btn-primary mt-2 text-[13px]">返回学生看板</button>
        </div>
      </div>
    );
  }

  const radarDims: RadarDim[] = data?.radar?.radarData
    ? RADAR_FIELDS.map((f) => ({ dimension: f.label, score: data.radar!.radarData[f.key] ?? 0, maxScore: 100 }))
    : [];

  const kpiCards = data
    ? [
        { label: '参赛总数', value: String(data.totalCompetitions), suffix: '次', icon: 'format_list_numbered' },
        { label: '获奖数', value: String(data.totalAwards), suffix: '项', icon: 'military_tech' },
        { label: '获奖率', value: String(Math.round((data.awardRate ?? 0) * 100)), suffix: '%', icon: 'percent' },
        { label: '专业排名', value: data.rank ? `${data.rank}/${data.rankTotal}` : '—', suffix: '', icon: 'leaderboard' },
      ]
    : [];

  return (
    <div className="py-lg flex flex-col gap-lg">
      <PageHero
        eyebrow="Student"
        title="学生详情"
        description={data?.student ? `${data.student.realName} · ${data.student.college}` : '加载中...'}
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
      ) : !data ? (
        <div className="py-20 grid place-items-center text-ink-muted-48 gap-2">
          <span className="material-symbols-outlined text-[40px] opacity-40">error_outline</span>
          <p className="text-[14px]">未找到学生数据</p>
        </div>
      ) : (
        <>
          {/* Student Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-xl flex items-center gap-5"
          >
            <div className="w-16 h-16 rounded-full bg-canvas-parchment text-ink-muted-80 grid place-items-center font-semibold text-[22px] shrink-0">
              {data.student.realName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[20px] font-semibold text-ink">{data.student.realName}</h2>
              <p className="text-[13px] text-ink-muted-80 mt-1">
                学号 {data.student.username} · {data.student.grade}级 · {data.student.major} · {data.student.className}
              </p>
              <p className="text-[12px] text-ink-muted-48 mt-0.5">{data.student.college}</p>
            </div>
          </motion.div>

          {/* KPIs */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-md">
            {kpiCards.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35 }}
                className="glass p-lg flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-ink-muted-80">{m.label}</span>
                  <span className="material-symbols-outlined text-[18px] text-primary">{m.icon}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display font-semibold text-[28px] leading-none tabular-nums text-ink">{m.value}</span>
                  <span className="text-[12px] text-ink-muted-48">{m.suffix}</span>
                </div>
              </motion.div>
            ))}
          </section>

          {/* Radar + Bars */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="glass p-xl"
            >
              <h3 className="text-[16px] font-semibold text-ink mb-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">radar</span>
                能力雷达
              </h3>
              {radarDims.length > 0 ? (
                <div className="aspect-square max-w-[300px] mx-auto">
                  <RadarChart data={radarDims} />
                </div>
              ) : (
                <div className="py-10 grid place-items-center text-ink-muted-48 gap-2">
                  <span className="material-symbols-outlined text-[28px] opacity-40">radar</span>
                  <p className="text-[12px]">暂无能力数据</p>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="glass p-xl"
            >
              <h3 className="text-[16px] font-semibold text-ink mb-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">bar_chart</span>
                能力详情
              </h3>
              {radarDims.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {radarDims.map((d) => (
                    <div key={d.dimension}>
                      <div className="flex justify-between text-[12px] mb-1">
                        <span className="text-ink-muted-80">{d.dimension}</span>
                        <span className="text-ink font-semibold tabular-nums">{d.score} / {d.maxScore}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-primary/8 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(d.score / d.maxScore) * 100}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className="h-full bg-primary rounded-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 grid place-items-center text-ink-muted-48 gap-2">
                  <p className="text-[12px]">暂无数据</p>
                </div>
              )}
            </motion.div>
          </section>

          {/* Competition List */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="glass overflow-hidden"
          >
            <div className="p-md border-b border-hairline flex justify-between items-center">
              <h3 className="text-[16px] font-semibold text-ink flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">emoji_events</span>
                参赛记录
              </h3>
              <span className="text-[12px] text-ink-muted-48">共 {data.competitions?.length ?? 0} 条</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-canvas-parchment text-[11px] uppercase tracking-wider text-ink-muted-48 border-b border-hairline">
                    <th className="py-3 px-md font-medium">赛事</th>
                    <th className="py-3 px-md font-medium">等级</th>
                    <th className="py-3 px-md font-medium">团队</th>
                    <th className="py-3 px-md font-medium">提交时间</th>
                    <th className="py-3 px-md font-medium">状态</th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  {(data.competitions ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-ink-muted-48">暂无参赛记录</td>
                    </tr>
                  ) : (
                    data.competitions.map((c) => (
                      <tr key={c.registrationId} className="border-b border-hairline last:border-0 hover:bg-primary/6 transition">
                        <td className="py-3 px-md">
                          <div className="text-ink font-medium truncate max-w-[280px]">{c.competitionName}</div>
                          <div className="text-[11px] text-ink-muted-48">{c.competitionCategory}类</div>
                        </td>
                        <td className="py-3 px-md">
                          <span className={`chip text-[11px] ${LEVEL_COLORS[c.competitionLevel] ?? ''}`}>{c.competitionLevel}</span>
                        </td>
                        <td className="py-3 px-md text-ink-muted-80">{c.teamName || '个人'}</td>
                        <td className="py-3 px-md text-ink-muted-80 tabular-nums">
                          {c.submitDate ? new Date(c.submitDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-md">
                          <span className={statusChip[c.status] || 'chip'}>{c.status}</span>
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
