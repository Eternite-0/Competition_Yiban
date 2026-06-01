import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import apiClient from '../../api/client';
import { useStore } from '../../store/useStore';
import PageHero from '../../components/PageHero';
import { pageVariants, pageTransition, listContainer, listItem } from '../../lib/motion';

type RadarData = {
  innovation: number;
  engineering: number;
  programming: number;
  writing: number;
  teamwork: number;
};

type StudentGrowthVO = {
  studentId: number | string;
  radarData?: RadarData;
  totalCompetitions: number;
  awards: number;
};

const DIMENSION_LABELS: Array<{ key: keyof RadarData; label: string }> = [
  { key: 'innovation', label: '创新能力' },
  { key: 'engineering', label: '工程实践' },
  { key: 'programming', label: '编程能力' },
  { key: 'writing', label: '文档写作' },
  { key: 'teamwork', label: '团队协作' },
];

function RadarChart({ data }: { data: { dimension: string; score: number; maxScore: number }[] }) {
  const cx = 120;
  const cy = 120;
  const maxRadius = 90;
  const n = data.length;
  const angleStep = (2 * Math.PI) / n;

  const getPolygonPoints = (radius: number) =>
    Array.from({ length: n }, (_, i) => {
      const angle = angleStep * i - Math.PI / 2;
      return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
    }).join(' ');

  const dataPoints = data
    .map((d, i) => {
      const angle = angleStep * i - Math.PI / 2;
      const r = (d.score / d.maxScore) * maxRadius;
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
          stroke="var(--color-border)"
          strokeWidth="1"
        />
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
        const r = (d.score / d.maxScore) * maxRadius;
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
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="text-[12px] font-normal" fill="var(--color-body-subtle)">
            {d.dimension}
          </text>
        );
      })}
    </svg>
  );
}

export default function StudentGrowth() {
  const { currentUser } = useStore();
  const [growth, setGrowth] = useState<StudentGrowthVO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGrowth = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = currentUser?.id ? { studentId: currentUser.id } : {};
        const data: any = await apiClient.get('/growth/radar', { params });
        setGrowth(data || null);
      } catch (err: any) {
        setError(err.message || '获取成长数据失败');
      } finally {
        setLoading(false);
      }
    };
    fetchGrowth();
  }, [currentUser?.id]);

  if (loading) {
    return (
      <div className="py-section text-center text-ink-muted-48">
        <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
        <p className="mt-2 text-[14px]">加载中…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-section text-center text-error">
        <span className="material-symbols-outlined text-[32px]">error_outline</span>
        <p className="mt-2 text-[14px]">{error}</p>
      </div>
    );
  }
  if (!growth) {
    return (
      <div className="py-section text-center text-ink-muted-48">
        <span className="material-symbols-outlined text-[40px]">insights</span>
        <p className="mt-3 text-[15px]">暂无成长数据</p>
      </div>
    );
  }

  const radarData = DIMENSION_LABELS.map((d) => ({
    dimension: d.label,
    score: growth.radarData?.[d.key] ?? 0,
    maxScore: 100,
  }));

  const dimensionBars = radarData.map((d) => ({ label: d.dimension, score: d.score }));

  const metrics = [
    { label: '累计参赛', value: growth.totalCompetitions ?? 0, suffix: '次', icon: 'format_list_numbered' },
    { label: '累计获奖', value: growth.awards ?? 0, suffix: '项', icon: 'military_tech' },
    {
      label: '能力均值',
      value: Math.round(radarData.reduce((acc, d) => acc + d.score, 0) / Math.max(1, radarData.length)),
      suffix: '分',
      icon: 'task_alt',
    },
    {
      label: '最高维度',
      value: Math.max(...radarData.map((d) => d.score), 0),
      suffix: '分',
      icon: 'moving',
    },
  ];

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-6"
    >
      <PageHero
        eyebrow="Growth"
        title="我的成长档案"
        description="按参赛记录与能力维度持续追踪个人成长。"
        contentClassName="max-w-2xl"
      />

      {/* Profile Hero */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="glass p-xl flex items-start gap-lg flex-wrap"
      >
        <div className="w-24 h-24 rounded-full bg-canvas-parchment grid place-items-center shrink-0 border border-hairline">
          <span className="material-symbols-outlined text-[44px] text-primary icon-fill">person</span>
        </div>
        <div className="flex-1 min-w-[280px] flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-display text-[22px] font-medium leading-[1.4] text-ink">
              {currentUser?.name || '同学'}
            </div>
            <span className="chip">2021 级 · 本科</span>
            <span className="chip chip-primary flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">verified</span>
              已实名
            </span>
          </div>
          <p className="text-[15px] text-ink-muted-80 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-ink-muted-48">school</span>
            {currentUser?.department || '计算机科学与技术学院'}
          </p>
          <div className="flex gap-1.5 flex-wrap mt-1">
            <span className="chip">创新实践标兵</span>
            <span className="chip">算法竞赛达人</span>
          </div>
        </div>
        <div className="text-right">
          <div className="mb-1 text-[12px] font-normal text-placeholder">综合等级</div>
          <div className="font-display text-[22px] font-medium leading-none text-primary">A+</div>
        </div>
      </motion.section>

      {/* Metrics */}
      <motion.section variants={listContainer} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-4 gap-md">
        {metrics.map((m) => (
          <motion.div
            key={m.label}
            variants={listItem}
            whileHover={{ scale: 1.03, y: -2 }}
            transition={pageTransition}
            className="stat-tile flex flex-col gap-2 p-lg"
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-body-subtle">{m.label}</span>
              <span className="material-symbols-outlined text-[18px] text-primary">{m.icon}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-[22px] font-medium leading-none tabular-nums text-ink">{m.value}</span>
              <span className="text-[12px] text-placeholder">{m.suffix}</span>
            </div>
          </motion.div>
        ))}
      </motion.section>

      {/* Bento */}
      <section className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
        {/* Analytics */}
        <div className="flex flex-col gap-5 lg:row-span-2">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-[15px] font-semibold text-ink mb-md flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">radar</span>
              能力维度
            </h3>
            <div className="min-h-[260px] h-[260px] max-w-[280px] mx-auto">
              {growth.radarData ? <RadarChart data={radarData} /> : (
                <div className="h-full grid place-items-center text-[12px] text-ink-muted-48">暂无数据</div>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-[15px] font-semibold text-ink mb-md flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">bar_chart</span>
              能力详情
            </h3>
            <motion.div variants={listContainer} initial="hidden" animate="visible">
              {dimensionBars.map((d) => (
                <motion.div key={d.label} variants={listItem} className="flex items-center gap-3 mb-3">
                  <span className="text-sm text-slate-600 w-[72px] shrink-0">{d.label}</span>
                  <motion.div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        d.score < 70 ? 'bg-slate-400' : d.score < 85 ? 'bg-blue-400' : 'bg-blue-600'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, d.score)}%` }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                    />
                  </motion.div>
                  <span className="text-sm font-medium text-slate-700 w-[28px] text-right tabular-nums">{d.score}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Records */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-md">
            <h3 className="text-[15px] font-semibold text-ink flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">emoji_events</span>
              成长概览
            </h3>
          </div>
          <div className="flex flex-col gap-3">
            <div className="rounded-md border border-hairline bg-canvas p-md">
              <div className="flex justify-between items-start mb-2 gap-2">
                <h4 className="text-[14px] font-semibold text-ink leading-snug">参赛累计</h4>
                <span className="chip shrink-0">汇总</span>
              </div>
              <p className="text-[12px] text-ink-muted-80 mb-3">您已经参加了 {growth.totalCompetitions ?? 0} 场赛事，在校园赛事档案中持续累积。</p>
              <div className="rounded-sm bg-canvas-parchment/60 py-1.5 px-2.5 flex items-center justify-between">
                <span className="text-[11px] text-ink-muted-48">累计参赛</span>
                <span className="text-[13px] font-semibold text-primary tabular-nums">{growth.totalCompetitions ?? 0} 次</span>
              </div>
            </div>
            <div className="rounded-md border border-hairline bg-canvas p-md">
              <div className="flex justify-between items-start mb-2 gap-2">
                <h4 className="text-[14px] font-semibold text-ink leading-snug">获奖累计</h4>
                <span className="chip shrink-0">荣誉</span>
              </div>
              <p className="text-[12px] text-ink-muted-80 mb-3">在已参与的赛事中累计获奖 {growth.awards ?? 0} 项，继续保持。</p>
              <div className="rounded-sm bg-canvas-parchment/60 py-1.5 px-2.5 flex items-center justify-between">
                <span className="text-[11px] text-ink-muted-48">累计获奖</span>
                <span className="text-[13px] font-semibold text-primary tabular-nums">{growth.awards ?? 0} 项</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-[15px] font-semibold text-ink mb-md flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary">tips_and_updates</span>
            成长建议
          </h3>
          <motion.ul variants={listContainer} initial="hidden" animate="visible" className="flex flex-col gap-3 text-[13px] text-ink-muted-80 leading-relaxed">
            <motion.li variants={listItem} className="flex gap-2">
              <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">trending_up</span>
              <span>继续参与不同方向的赛事，全面提升能力雷达。</span>
            </motion.li>
            <motion.li variants={listItem} className="flex gap-2">
              <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">groups</span>
              <span>积极参与组队，团队协作维度增长最快。</span>
            </motion.li>
            <motion.li variants={listItem} className="flex gap-2">
              <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">edit_note</span>
              <span>认真撰写参赛文档，能显著提升写作维度评分。</span>
            </motion.li>
          </motion.ul>
        </div>
      </section>
    </motion.div>
  );
}
