import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import apiClient from '../../api/client';
import { useStore } from '../../store/useStore';
import PageHero from '../../components/PageHero';
import { pageVariants, listContainer, listItem } from '../../lib/motion';

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

type Registration = {
  id: number | string;
  competitionId: number | string;
  competitionName?: string;
  competitionLevel?: string;
  competitionCategory?: string;
  teamName?: string;
  track?: string;
  status: string;
  submitDate?: string;
};

type Submission = {
  id: number | string;
  competitionId?: number | string;
  competitionName?: string;
  competitionLevel?: string;
  fileName?: string;
  uploadDate?: string;
  status?: string;
  approved?: boolean;
};

type AwardProof = {
  id: number | string;
  competitionName?: string;
  awardLevel?: string;
  awardTime?: string;
  organizer?: string;
  winnerName?: string;
  certificateNo?: string;
  status?: string;
  createTime?: string;
  updateTime?: string;
};

type TimelineRecord = {
  id: number | string;
  recordType?: string;
  title?: string;
  happenTime?: string;
};

type TimelineItem = {
  id: string;
  type: 'honor' | 'registration' | 'submission' | 'growth';
  title: string;
  subtitle: string;
  date?: string;
  level?: string;
  status?: string;
  icon: string;
};

const DIMENSION_LABELS: Array<{ key: keyof RadarData; label: string; hint: string }> = [
  { key: 'innovation', label: '创新能力', hint: '科技创新、创业类赛事会提升该维度' },
  { key: 'engineering', label: '工程实践', hint: '作品落地、实践类成果会提升该维度' },
  { key: 'programming', label: '编程能力', hint: '算法、软件开发、AI 类赛事会提升该维度' },
  { key: 'writing', label: '文档写作', hint: '成果材料和文档质量会提升该维度' },
  { key: 'teamwork', label: '团队协作', hint: '组队参赛和团队成果会提升该维度' },
];

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateValue(value?: string) {
  if (!value) return 0;
  const d = new Date(value);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function unwrapRecords<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const obj = data as { records?: T[]; data?: { records?: T[] } } | null;
  if (Array.isArray(obj?.records)) return obj.records;
  if (Array.isArray(obj?.data?.records)) return obj.data.records;
  return [];
}

function getLevelMeta(level?: string) {
  const text = (level || '未分级').trim();
  const normalized = text.toLowerCase();
  if (['national', 'country', 'state', '国家级'].includes(normalized) || /国家|国赛|全国|国家级/.test(text)) return { label: '国家级', chip: 'chip chip-error' };
  if (['provincial', 'province', '省级'].includes(normalized) || /省|省级|自治区|直辖市/.test(text)) return { label: '省级', chip: 'chip chip-primary' };
  if (['school', 'campus', 'university', '校级'].includes(normalized) || /校|校级/.test(text)) return { label: '校级', chip: 'chip chip-success' };
  if (['college', 'department', '院级'].includes(normalized) || /院级|学院/.test(text)) return { label: '院级', chip: 'chip chip-success' };
  return { label: text, chip: 'chip' };
}

function formatAwardLevel(level?: string) {
  const text = (level || '获奖').trim();
  const normalized = text.toLowerCase().replace(/[\s_-]+/g, ' ');
  const exactMap: Record<string, string> = {
    champion: '冠军',
    winner: '获奖',
    gold: '金奖',
    silver: '银奖',
    bronze: '铜奖',
    'first prize': '一等奖',
    first: '一等奖',
    'second prize': '二等奖',
    second: '二等奖',
    'third prize': '三等奖',
    third: '三等奖',
    excellent: '优秀奖',
    excellence: '优秀奖',
    finalist: '入围奖',
  };
  if (exactMap[normalized]) return exactMap[normalized];
  if (/^1(st)? prize$/.test(normalized)) return '一等奖';
  if (/^2(nd)? prize$/.test(normalized)) return '二等奖';
  if (/^3(rd)? prize$/.test(normalized)) return '三等奖';
  return text;
}

function isApprovedAward(status?: string) {
  return ['approved', '审核通过', '已通过'].includes(status || '');
}

function RadarChart({ data }: { data: { dimension: string; score: number; maxScore: number }[] }) {
  const cx = 120;
  const cy = 120;
  const maxRadius = 88;
  const n = data.length;
  const angleStep = (2 * Math.PI) / n;

  const getPoint = (index: number, radius: number) => {
    const angle = angleStep * index - Math.PI / 2;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  };

  const getPolygonPoints = (radius: number) => data.map((_, i) => {
    const point = getPoint(i, radius);
    return `${point.x},${point.y}`;
  }).join(' ');

  const dataPoints = data.map((d, i) => {
    const point = getPoint(i, (d.score / d.maxScore) * maxRadius);
    return `${point.x},${point.y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 240 240" className="h-full w-full" aria-label="能力雷达图">
      {[0.25, 0.5, 0.75, 1].map((level) => (
        <polygon key={level} points={getPolygonPoints(maxRadius * level)} fill="none" stroke="var(--color-border)" strokeWidth="1" />
      ))}
      {data.map((_, i) => {
        const point = getPoint(i, maxRadius);
        return <line key={i} x1={cx} y1={cy} x2={point.x} y2={point.y} stroke="var(--color-border)" strokeWidth="1" />;
      })}
      <polygon points={dataPoints} fill="var(--color-primary)" fillOpacity="0.14" stroke="var(--color-primary)" strokeWidth="2" />
      {data.map((d, i) => {
        const point = getPoint(i, (d.score / d.maxScore) * maxRadius);
        const label = getPoint(i, maxRadius + 18);
        return (
          <g key={d.dimension}>
            <circle cx={point.x} cy={point.y} r="3.5" fill="var(--color-primary)" />
            <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" className="text-[11px]" fill="var(--color-body-subtle)">{d.dimension.replace('能力', '')}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function StudentGrowth() {
  const { currentUser } = useStore();
  const [growth, setGrowth] = useState<StudentGrowthVO | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [awardProofs, setAwardProofs] = useState<AwardProof[]>([]);
  const [timeline, setTimeline] = useState<TimelineRecord[]>([]);
  const [showAllTimeline, setShowAllTimeline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGrowth = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = currentUser?.id ? { studentId: currentUser.id } : {};
        const [radarData, timelineData, submissionData, registrationData, awardData] = await Promise.all([
          apiClient.get('/growth/radar', { params }),
          apiClient.get('/growth/timeline', { params: { ...params, current: 1, size: 20 } }).catch(() => null),
          apiClient.get('/submission/my').catch(() => []),
          apiClient.get('/registration/my').catch(() => []),
          apiClient.get('/award-proof/my', { params: { current: 1, size: 20 } }).catch(() => null),
        ]);
        setGrowth((radarData as unknown as StudentGrowthVO) || null);
        setTimeline(unwrapRecords<TimelineRecord>(timelineData));
        setSubmissions(unwrapRecords<Submission>(submissionData));
        setRegistrations(unwrapRecords<Registration>(registrationData));
        setAwardProofs(unwrapRecords<AwardProof>(awardData));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '获取成长数据失败';
        setError(message || '获取成长数据失败');
      } finally {
        setLoading(false);
      }
    };
    fetchGrowth();
  }, [currentUser?.id]);

  if (loading) return <div className="flex w-full min-w-0 flex-col items-center py-section text-center text-ink-muted-48"><span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span><p className="empty-state-copy mt-2 text-[14px]">加载中…</p></div>;
  if (error) return <div className="flex w-full min-w-0 flex-col items-center py-section text-center text-error"><span className="material-symbols-outlined text-[32px]">error_outline</span><p className="empty-state-copy mt-2 text-[14px]">{error}</p></div>;
  if (!growth) return <div className="flex w-full min-w-0 flex-col items-center py-section text-center text-ink-muted-48"><span className="material-symbols-outlined text-[40px]">insights</span><p className="empty-state-copy mt-3 text-[15px]">暂无成长数据</p></div>;

  const radarData = DIMENSION_LABELS.map((d) => ({ dimension: d.label, score: growth.radarData?.[d.key] ?? 0, maxScore: 100, hint: d.hint }));
  const averageScore = Math.round(radarData.reduce((acc, d) => acc + d.score, 0) / Math.max(1, radarData.length));
  const highest = radarData.reduce((best, item) => item.score > best.score ? item : best, radarData[0]);
  const approvedSubmissions = submissions.filter((s) => s.status === '已审核' && s.approved === true);
  const approvedAwards = awardProofs.filter((proof) => isApprovedAward(proof.status));
  const teamParticipationCount = registrations.filter((r) => Boolean(r.teamName)).length;
  const levelCounts = registrations.reduce<Record<string, number>>((acc, reg) => {
    const level = getLevelMeta(reg.competitionLevel).label;
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {});
  const suggestions = radarData
    .filter((d) => d.score < 75)
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .map((d) => `${d.dimension}当前 ${d.score} 分，${d.hint}。`);
  if (suggestions.length === 0) suggestions.push('各维度表现均衡，建议继续参与不同级别赛事并沉淀可认证荣誉材料。');

  const timelineItems: TimelineItem[] = [
    ...approvedAwards.map((award) => ({
      id: `award-${award.id}`,
      type: 'honor' as const,
      title: `${award.competitionName || '获奖证明'} · ${formatAwardLevel(award.awardLevel)}`,
      subtitle: `${award.winnerName || currentUser?.name || '本人'}${award.organizer ? ` · ${award.organizer}` : ''}`,
      date: award.awardTime || award.updateTime || award.createTime,
      status: '已认证荣誉',
      icon: 'workspace_premium',
    })),
    ...registrations.map((reg) => ({
      id: `reg-${reg.id}`,
      type: 'registration' as const,
      title: reg.competitionName || `赛事 #${reg.competitionId}`,
      subtitle: `${reg.track || '未选赛道'} · ${reg.status}`,
      date: reg.submitDate,
      level: reg.competitionLevel,
      status: reg.status,
      icon: 'emoji_events',
    })),
    ...approvedSubmissions.map((submission) => ({
      id: `sub-${submission.id}`,
      type: 'submission' as const,
      title: submission.competitionName || '成果材料通过审核',
      subtitle: submission.fileName || '成果附件',
      date: submission.uploadDate,
      status: '成果通过',
      icon: 'task_alt',
    })),
    ...timeline.map((record) => ({
      id: `growth-${record.id}`,
      type: 'growth' as const,
      title: record.title || '成长记录',
      subtitle: record.recordType || 'record',
      date: record.happenTime,
      status: '成长记录',
      icon: 'timeline',
    })),
  ].sort((a, b) => dateValue(b.date) - dateValue(a.date));
  const visibleTimeline = showAllTimeline ? timelineItems : timelineItems.slice(0, 4);

  const metrics = [
    { label: '累计参赛', value: registrations.length || growth.totalCompetitions || 0, suffix: '次', icon: 'format_list_numbered' },
    { label: '认证荣誉', value: approvedAwards.length, suffix: '项', icon: 'military_tech' },
    { label: '能力均值', value: averageScore, suffix: '分', icon: 'analytics' },
    { label: '团队参与', value: teamParticipationCount, suffix: '次', icon: 'groups' },
  ];

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" className="flex flex-col gap-6">
      <PageHero eyebrow="Growth" title="我的成长档案" description="查看参赛级别、认证荣誉与能力雷达。" contentClassName="max-w-2xl" />

      <section className="glass p-xl flex items-start gap-lg flex-wrap">
        <div className="w-20 h-20 rounded-full bg-canvas-parchment grid place-items-center shrink-0 border border-hairline">
          <span className="material-symbols-outlined text-[38px] text-primary icon-fill">person</span>
        </div>
        <div className="flex-1 min-w-[260px]">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-[22px] font-medium leading-[1.4] text-ink">{currentUser?.name || '同学'}</h2>
            <span className="chip chip-primary">优势维度：{highest.dimension}</span>
            {approvedAwards.length > 0 && <span className="chip chip-success">认证荣誉 {approvedAwards.length} 项</span>}
          </div>
          <p className="mt-2 text-[14px] text-ink-muted-80">{currentUser?.department || '学院信息暂未同步'}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
            <span className="chip">国家级 {levelCounts['国家级'] || 0}</span>
            <span className="chip">省级 {levelCounts['省级'] || 0}</span>
            <span className="chip">校级 {levelCounts['校级'] || 0}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[12px] text-placeholder">能力均值</p>
          <p className="font-display text-[28px] font-medium leading-none text-primary tabular-nums">{averageScore}</p>
        </div>
      </section>

      <motion.section variants={listContainer} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-4 gap-md">
        {metrics.map((metric) => (
          <motion.div key={metric.label} variants={listItem} className="stat-tile flex flex-col gap-2 p-lg">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-body-subtle">{metric.label}</span>
              <span className="material-symbols-outlined text-[18px] text-primary">{metric.icon}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-[22px] font-medium leading-none tabular-nums text-ink">{metric.value}</span>
              <span className="text-[12px] text-placeholder">{metric.suffix}</span>
            </div>
          </motion.div>
        ))}
      </motion.section>

      <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="flex flex-col gap-6">
          <Panel title="能力雷达" icon="radar" aside={`均值 ${averageScore}`}>
            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-5 items-center">
              <div className="h-[260px] max-w-[280px] mx-auto w-full">
                <RadarChart data={radarData} />
              </div>
              <div className="flex flex-col gap-3">
                {radarData.map((item) => <DimensionRow key={item.dimension} label={item.dimension} score={item.score} hint={item.hint} />)}
              </div>
            </div>
          </Panel>

          <Panel title="参赛记录" icon="emoji_events" aside={`${registrations.length} 条`}>
            {registrations.length > 0 ? (
              <div className="flex flex-col divide-y divide-hairline">
                {registrations.slice(0, 8).map((reg) => <CompetitionRow key={reg.id} registration={reg} />)}
              </div>
            ) : <EmptyState text="暂无参赛记录，去赛事大厅报名后会自动沉淀到这里。" />}
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="荣誉记录" icon="workspace_premium" aside={`${approvedAwards.length} 项`}>
            {approvedAwards.length > 0 ? (
              <div className="flex flex-col divide-y divide-hairline">
                {approvedAwards.slice(0, 5).map((award) => <HonorRow key={award.id} award={award} />)}
              </div>
            ) : approvedSubmissions.length > 0 ? (
              <div className="flex flex-col gap-3">
                <EmptyState text="暂无已认证获奖证明。下面是已审核通过的成果材料；获得奖项后请上传证书。" />
                <div className="flex flex-col divide-y divide-hairline rounded-md border border-hairline bg-canvas">
                  {approvedSubmissions.slice(0, 3).map((submission) => <SubmissionRow key={submission.id} submission={submission} />)}
                </div>
              </div>
            ) : <EmptyState text="暂无荣誉记录。上传获奖证书并通过审核后，将显示具体比赛和奖项。" />}
          </Panel>

          <Panel title="成长时间线" icon="timeline" aside={`${timelineItems.length} 条`}>
            {timelineItems.length > 0 ? (
              <>
                <GrowthTimeline items={visibleTimeline} />
                {timelineItems.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setShowAllTimeline((value) => !value)}
                    className="mt-3 w-full rounded-md border border-hairline bg-canvas py-2 text-[13px] text-primary hover:bg-canvas-parchment transition cursor-pointer"
                  >
                    {showAllTimeline ? '收起' : `查看更多（${timelineItems.length - 4}）`}
                  </button>
                )}
              </>
            ) : <EmptyState text="暂无成长时间线。报名、提交成果或认证荣誉后会自动生成。" />}
          </Panel>

          <Panel title="成长建议" icon="tips_and_updates">
            <ul className="flex flex-col gap-2 text-[13px] text-ink-muted-80 leading-relaxed">
              {suggestions.map((item) => <li key={item} className="flex gap-2"><span className="material-symbols-outlined text-[16px] text-primary mt-0.5">trending_up</span><span>{item}</span></li>)}
            </ul>
          </Panel>
        </div>
      </section>
    </motion.div>
  );
}

function Panel({ title, icon, aside, children }: { title: string; icon: string; aside?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-md gap-3">
        <h3 className="text-[15px] font-semibold text-ink flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary">{icon}</span>
          {title}
        </h3>
        {aside && <span className="chip">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function DimensionRow({ label, score, hint }: { label: string; score: number; hint: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1">
        <p className="text-[13px] font-medium text-ink">{label}</p>
        <span className="text-[13px] font-semibold text-primary tabular-nums">{score}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${Math.min(100, score)}%` }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} />
      </div>
      <p className="mt-1 text-[11px] text-ink-muted-48">{hint}</p>
    </div>
  );
}

function CompetitionRow({ registration }: { registration: Registration }) {
  const level = getLevelMeta(registration.competitionLevel);
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ink truncate">{registration.competitionName || `赛事 #${registration.competitionId}`}</p>
          <p className="mt-1 text-[12px] text-ink-muted-48">{registration.track || '未选赛道'} · {formatDate(registration.submitDate)}</p>
        </div>
        <span className={level.chip}>{level.label}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="chip">{registration.status}</span>
        {registration.teamName && <span className="chip">团队：{registration.teamName}</span>}
      </div>
    </div>
  );
}

function HonorRow({ award }: { award: AwardProof }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ink truncate">{award.competitionName || '获奖证明'}</p>
          <p className="mt-1 text-[12px] text-ink-muted-48">获奖人：{award.winnerName || '—'} · {formatDate(award.awardTime || award.createTime)}</p>
        </div>
        <span className="chip chip-warning">{formatAwardLevel(award.awardLevel)}</span>
      </div>
      {(award.organizer || award.certificateNo) && (
        <p className="mt-2 text-[12px] text-ink-muted-48 truncate">{award.organizer || '主办单位未填写'}{award.certificateNo ? ` · 证书编号：${award.certificateNo}` : ''}</p>
      )}
    </div>
  );
}

function SubmissionRow({ submission }: { submission: Submission }) {
  return (
    <div className="px-3 py-2">
      <p className="text-[13px] font-medium text-ink truncate">{submission.competitionName || '成果材料'}</p>
      <p className="mt-1 text-[12px] text-ink-muted-48 truncate">{submission.fileName || '附件'} · {formatDate(submission.uploadDate)}</p>
    </div>
  );
}

function GrowthTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative ml-2 border-l border-hairline pl-4">
      {items.map((item) => {
        const level = getLevelMeta(item.level);
        return (
          <li key={item.id} className="relative pb-4 last:pb-0">
            <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-white" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-ink truncate">{item.title}</p>
                <p className="mt-1 text-[12px] text-ink-muted-48 truncate">{item.subtitle}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.level && <span className={level.chip}>{level.label}</span>}
                  {item.status && <span className="chip">{item.status}</span>}
                </div>
              </div>
              <span className="shrink-0 text-[11px] text-placeholder tabular-nums">{formatDate(item.date)}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state-copy mx-auto rounded-md border border-dashed border-hairline bg-canvas p-5 text-center text-[13px] text-ink-muted-48">
      {text}
    </div>
  );
}
