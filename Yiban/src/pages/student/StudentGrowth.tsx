import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useStore } from '../../store/useStore';
import PageHero from '../../components/PageHero';
import ProgressBar from '../../components/ProgressBar';

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

type GrowthDimension = {
  key: string;
  label: string;
  score: number;
  maxScore?: number;
  evidenceCount?: number;
  summary?: string;
};

type GrowthProfileTimeline = {
  id: string;
  sourceType?: string;
  title?: string;
  subtitle?: string;
  status?: string;
  dimensionKey?: string;
  activityType?: string;
  happenTime?: string;
};

type GrowthProfileVO = {
  studentId: number | string;
  dimensions?: GrowthDimension[];
  totalCompetitions?: number;
  totalAwards?: number;
  totalActivities?: number;
  totalVolunteerHours?: number | string;
  totalCultureSports?: number;
  timeline?: GrowthProfileTimeline[];
  suggestions?: string[];
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
  type: 'honor' | 'registration' | 'submission' | 'growth' | 'activity';
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

const PROFILE_DIMENSION_HINTS: Record<string, string> = {
  competition_practice: '通过审核的赛事报名、成果材料和获奖记录会沉淀到这里',
  innovation: '通过审核的成果、荣誉和创新类赛事会提升该维度',
  volunteer: '志愿服务报名审核通过后，会按服务记录和时长沉淀',
  culture_sports: '文体活动、体育赛事、文艺展演等审核通过后沉淀',
  teamwork: '团队参赛、团队活动和协作记录会提升该维度',
};

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatNumber(value?: number | string) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
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
      <polygon points={dataPoints} fill="var(--color-ink)" fillOpacity="0.08" stroke="var(--color-ink)" strokeWidth="1.5" />
      {data.map((d, i) => {
        const point = getPoint(i, (d.score / d.maxScore) * maxRadius);
        const label = getPoint(i, maxRadius + 18);
        return (
          <g key={d.dimension}>
            <circle cx={point.x} cy={point.y} r="3" fill="var(--color-ink)" />
            <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" className="text-caption-2" fill="var(--color-body-subtle)">{d.dimension.replace('能力', '')}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function StudentGrowth() {
  const { currentUser } = useStore();
  const [profile, setProfile] = useState<GrowthProfileVO | null>(null);
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
        const [profileData, radarData, timelineData, submissionData, registrationData, awardData] = await Promise.all([
          apiClient.get('/growth/profile', { params }).catch(() => null),
          apiClient.get('/growth/radar', { params }).catch(() => null),
          apiClient.get('/growth/timeline', { params: { ...params, current: 1, size: 20 } }).catch(() => null),
          apiClient.get('/submission/my').catch(() => []),
          apiClient.get('/registration/my').catch(() => []),
          apiClient.get('/award-proof/my', { params: { current: 1, size: 20 } }).catch(() => null),
        ]);
        setProfile((profileData as unknown as GrowthProfileVO) || null);
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

  if (loading) {
    return (
      <div className="page-stack">
        <PageHero eyebrow="成长" title="我的成长画像" description="加载中…" />
        <p className="py-10 text-center text-footnote text-placeholder">加载中…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="page-stack">
        <PageHero eyebrow="成长" title="我的成长画像" description="加载失败" />
        <p className="py-10 text-center text-footnote text-error">{error}</p>
      </div>
    );
  }
  if (!growth && !profile) {
    return (
      <div className="page-stack">
        <PageHero eyebrow="成长" title="我的成长画像" description="查看竞赛、志愿、文体活动与认证荣誉沉淀。" />
        <p className="py-10 text-center text-footnote text-placeholder">暂无成长数据</p>
      </div>
    );
  }

  const radarData = profile?.dimensions?.length
    ? profile.dimensions.map((d) => ({
        dimension: d.label,
        score: Number(d.score ?? 0),
        maxScore: Number(d.maxScore ?? 100),
        hint: d.summary || PROFILE_DIMENSION_HINTS[d.key] || '通过审核的校园活动会沉淀到该维度',
      }))
    : DIMENSION_LABELS.map((d) => ({ dimension: d.label, score: growth?.radarData?.[d.key] ?? 0, maxScore: 100, hint: d.hint }));
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
  const suggestions = profile?.suggestions?.length
    ? [...profile.suggestions]
    : radarData
        .filter((d) => d.score < 75)
        .sort((a, b) => a.score - b.score)
        .slice(0, 2)
        .map((d) => `${d.dimension}当前 ${d.score} 分，${d.hint}。`);
  if (suggestions.length === 0) suggestions.push('各维度表现均衡，建议继续参与不同级别赛事并沉淀可认证荣誉材料。');

  const timelineItems: TimelineItem[] = [
    ...(profile?.timeline || []).map((record) => ({
      id: `profile-${record.id}`,
      type: record.sourceType === 'participation' ? 'activity' as const : 'growth' as const,
      title: record.title || '成长画像记录',
      subtitle: record.subtitle || record.sourceType || '校园成长',
      date: record.happenTime,
      status: record.status || '已沉淀',
      icon: record.sourceType === 'participation' ? 'event_available' : 'insights',
    })),
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
    { label: '竞赛实践', value: profile?.totalCompetitions ?? registrations.length ?? growth?.totalCompetitions ?? 0, suffix: '次', hint: '报名与参与' },
    { label: '志愿公益', value: formatNumber(profile?.totalVolunteerHours), suffix: '小时', hint: '服务时长' },
    { label: '文体活动', value: profile?.totalCultureSports ?? 0, suffix: '次', hint: '文体参与' },
    { label: '认证荣誉', value: approvedAwards.length || profile?.totalAwards || 0, suffix: '项', hint: '已审核通过' },
  ];

  return (
    <div className="page-stack">
      <PageHero eyebrow="成长" title="我的成长画像" description="查看竞赛、志愿、文体活动与认证荣誉沉淀。" />

      <section className="page-section">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-hairline pb-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-callout font-medium text-ink">{currentUser?.name || '同学'}</h2>
              <span className="chip chip-primary">优势：{highest.dimension}</span>
              {approvedAwards.length > 0 ? <span className="chip chip-success">荣誉 {approvedAwards.length}</span> : null}
              {(profile?.totalActivities ?? 0) > 0 ? <span className="chip">活动 {profile?.totalActivities}</span> : null}
              {teamParticipationCount > 0 ? <span className="chip">组队 {teamParticipationCount}</span> : null}
            </div>
            <p className="mt-1 text-footnote text-body-subtle">{currentUser?.department || '学院信息暂未同步'}</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-caption text-placeholder">
              <span>国家级 {levelCounts['国家级'] || 0}</span>
              <span>·</span>
              <span>省级 {levelCounts['省级'] || 0}</span>
              <span>·</span>
              <span>校级 {levelCounts['校级'] || 0}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-caption text-placeholder">能力均值</p>
            <p className="mt-1 text-title-2 font-semibold tabular-nums tracking-tight text-ink">{averageScore}</p>
          </div>
        </div>
      </section>

      <section className="metric-row" aria-label="成长指标">
        {metrics.map((metric) => (
          <div key={metric.label} className="metric-item">
            <div className="metric-item-label">{metric.label}</div>
            <div className="metric-item-value">
              {metric.value}
              <span className="ml-1 text-caption font-normal text-placeholder">{metric.suffix}</span>
            </div>
            <div className="metric-item-hint">{metric.hint}</div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-8">
          <section className="page-section">
            <div className="page-section-head">
              <h3 className="page-section-title">校园成长五维</h3>
              <span className="page-section-extra">均值 {averageScore}</span>
            </div>
            <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[240px_1fr]">
              <div className="mx-auto h-[220px] w-full max-w-[240px]">
                <RadarChart data={radarData} />
              </div>
              <div className="flex flex-col gap-3">
                {radarData.map((item) => (
                  <DimensionRow key={item.dimension} label={item.dimension} score={item.score} hint={item.hint} />
                ))}
              </div>
            </div>
          </section>

          <section className="page-section">
            <div className="page-section-head">
              <h3 className="page-section-title">参赛记录</h3>
              <span className="page-section-extra">{registrations.length} 条</span>
            </div>
            {registrations.length > 0 ? (
              <div className="flat-list">
                {registrations.slice(0, 8).map((reg) => <CompetitionRow key={reg.id} registration={reg} />)}
              </div>
            ) : (
              <p className="py-6 text-footnote text-placeholder">暂无参赛记录，去赛事大厅报名后会自动沉淀到这里。</p>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-8">
          <section className="page-section">
            <div className="page-section-head">
              <h3 className="page-section-title">荣誉记录</h3>
              <span className="page-section-extra">{approvedAwards.length} 项</span>
            </div>
            {approvedAwards.length > 0 ? (
              <div className="flat-list">
                {approvedAwards.slice(0, 5).map((award) => <HonorRow key={award.id} award={award} />)}
              </div>
            ) : approvedSubmissions.length > 0 ? (
              <div className="flat-list">
                <p className="py-3 text-caption text-placeholder">暂无已认证获奖证明。以下为已通过的成果材料。</p>
                {approvedSubmissions.slice(0, 3).map((submission) => (
                  <SubmissionRow key={submission.id} submission={submission} />
                ))}
              </div>
            ) : (
              <p className="py-6 text-footnote text-placeholder">暂无荣誉记录。上传获奖证书并通过审核后显示。</p>
            )}
          </section>

          <section className="page-section">
            <div className="page-section-head">
              <h3 className="page-section-title">成长时间线</h3>
              <span className="page-section-extra">{timelineItems.length} 条</span>
            </div>
            {timelineItems.length > 0 ? (
              <>
                <GrowthTimeline items={visibleTimeline} />
                {timelineItems.length > 4 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllTimeline((value) => !value)}
                    className="mt-2 self-start text-caption text-body-muted hover:text-primary"
                  >
                    {showAllTimeline ? '收起' : `查看更多（${timelineItems.length - 4}）`}
                  </button>
                ) : null}
              </>
            ) : (
              <p className="py-6 text-footnote text-placeholder">暂无成长时间线。报名、提交成果或认证荣誉后会自动生成。</p>
            )}
          </section>

          <section className="page-section">
            <div className="page-section-head">
              <h3 className="page-section-title">下一步建议</h3>
            </div>
            <ul className="flex flex-col gap-2 text-footnote leading-relaxed text-body-subtle">
              {suggestions.map((item) => (
                <li key={item} className="border-b border-hairline py-2 last:border-b-0">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function DimensionRow({ label, score, hint }: { label: string; score: number; hint: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <p className="text-footnote font-medium text-ink">{label}</p>
        <span className="text-footnote font-semibold tabular-nums text-primary">{score}</span>
      </div>
      <ProgressBar value={Math.min(100, score)} size="sm" segments={4} showThumb instant />
      <p className="mt-1.5 text-caption-2 text-placeholder">{hint}</p>
    </div>
  );
}

function CompetitionRow({ registration }: { registration: Registration }) {
  const level = getLevelMeta(registration.competitionLevel);
  return (
    <div className="flat-row !items-start">
      <div className="min-w-0 flex-1">
        <p className="truncate text-footnote font-medium text-ink">{registration.competitionName || `赛事 #${registration.competitionId}`}</p>
        <p className="mt-0.5 text-caption text-placeholder">
          {registration.track || '未选赛道'} · {registration.status}
          {registration.teamName ? ` · 团队 ${registration.teamName}` : ''} · {formatDate(registration.submitDate)}
        </p>
      </div>
      <span className={level.chip}>{level.label}</span>
    </div>
  );
}

function HonorRow({ award }: { award: AwardProof }) {
  return (
    <div className="flat-row !items-start">
      <div className="min-w-0 flex-1">
        <p className="truncate text-footnote font-medium text-ink">{award.competitionName || '获奖证明'}</p>
        <p className="mt-0.5 text-caption text-placeholder">
          {award.winnerName || '—'} · {formatDate(award.awardTime || award.createTime)}
          {award.organizer ? ` · ${award.organizer}` : ''}
        </p>
      </div>
      <span className="chip chip-warning">{formatAwardLevel(award.awardLevel)}</span>
    </div>
  );
}

function SubmissionRow({ submission }: { submission: Submission }) {
  return (
    <div className="flat-row">
      <div className="min-w-0 flex-1">
        <p className="truncate text-footnote font-medium text-ink">{submission.competitionName || '成果材料'}</p>
        <p className="mt-0.5 truncate text-caption text-placeholder">{submission.fileName || '附件'} · {formatDate(submission.uploadDate)}</p>
      </div>
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
            <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-ink" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-footnote font-medium text-ink">{item.title}</p>
                <p className="mt-0.5 truncate text-caption text-placeholder">{item.subtitle}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {item.level && <span className={level.chip}>{level.label}</span>}
                  {item.status && <span className="chip">{item.status}</span>}
                </div>
              </div>
              <span className="shrink-0 text-caption-2 tabular-nums text-placeholder">{formatDate(item.date)}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}


