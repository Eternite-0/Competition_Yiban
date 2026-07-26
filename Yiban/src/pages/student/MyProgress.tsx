import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';
import ErrorState from '../../components/ErrorState';
import Pagination from '../../components/Pagination';
import ProgressBar, { StageProgressBar } from '../../components/ProgressBar';
import Skeleton from '../../components/Skeleton';
import { displayLevel } from '../../lib/levelDisplay';
import type { CompetitionProgress, StageProgressStatus, StudentStageProgress } from '../../types';

type RegistrationRecord = {
  id: number | string;
  competitionId: number | string;
  competitionName?: string;
  competitionLevel?: string;
  competitionCategory?: string;
  teamName?: string | null;
  track?: string | null;
  status: string;
  submitDate?: string;
  fileName?: string | null;
  fileUrl?: string | null;
  fileSize?: number | null;
  reviewNote?: string | null;
  approved?: boolean | null;
};

type Recommendation = {
  id: number | string;
  name: string;
  level?: string;
  category?: string;
  endTime?: string;
};

type ProgressCard = {
  cardKey: string;
  competitionId: number | string;
  competitionName: string;
  competitionLevel?: string;
  competitionCategory?: string;
  registration?: RegistrationRecord;
  currentStage?: string;
  stages: StudentStageProgress[];
};

type FilterKey = 'all' | 'todo' | 'reviewing' | 'returned' | 'completed';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'todo', label: '待我处理' },
  { key: 'reviewing', label: '审核中' },
  { key: 'returned', label: '退回补充' },
  { key: 'completed', label: '已完成' },
];

const statusConfig: Record<StageProgressStatus, { icon: string; label: string; dot: string; text: string }> = {
  passed: { icon: 'check_circle', label: '已完成', dot: 'bg-success text-white', text: 'text-success' },
  in_progress: { icon: 'radio_button_checked', label: '进行中', dot: 'bg-primary text-on-primary', text: 'text-ink' },
  submitted: { icon: 'schedule', label: '已提交', dot: 'bg-primary text-on-primary', text: 'text-ink' },
  failed: { icon: 'error', label: '需处理', dot: 'bg-error text-white', text: 'text-error' },
  not_started: { icon: 'radio_button_unchecked', label: '未开始', dot: 'bg-surface-chip text-placeholder', text: 'text-placeholder' },
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateTime(value?: string | null) {
  if (!value) return 0;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function cleanReviewNote(note?: string | null) {
  return (note || '').replace('【退回补充】', '').trim();
}

function hasSubmission(reg?: RegistrationRecord) {
  return Boolean(reg?.fileName || reg?.fileUrl);
}

function isSubmissionAccepted(reg?: RegistrationRecord) {
  return Boolean(reg?.approved === true || (hasSubmission(reg) && reg?.status === '审核通过'));
}

function isReturned(reg?: RegistrationRecord) {
  return reg?.status === '退回补充';
}

function isRejected(reg?: RegistrationRecord) {
  return reg?.status === '审核驳回';
}

function isReviewing(reg?: RegistrationRecord) {
  return reg?.status === '已提交' || reg?.status === '审核中';
}

function isTodo(reg?: RegistrationRecord) {
  if (!reg) return false;
  if (reg.status === '待完善' || reg.status === '退回补充') return true;
  return reg.status === '审核通过' && !isSubmissionAccepted(reg);
}

function isCompleted(card: ProgressCard) {
  if (card.registration) return isSubmissionAccepted(card.registration);
  return card.stages.length > 0 && card.stages.every((stage) => stage.status === 'passed');
}

function getStatusMeta(reg?: RegistrationRecord) {
  if (!reg) return { label: '阶段跟踪中', chip: 'chip chip-info', icon: 'timeline' };
  if (reg.status === '退回补充') return { label: '退回补充', chip: 'chip chip-warning', icon: 'assignment_return' };
  if (reg.status === '审核驳回') return { label: '审核驳回', chip: 'chip chip-error', icon: 'cancel' };
  if (reg.status === '审核中') return { label: '成果审核中', chip: 'chip chip-warning', icon: 'hourglass_top' };
  if (reg.status === '已提交') return { label: '报名审核中', chip: 'chip chip-info', icon: 'pending_actions' };
  if (reg.status === '审核通过' && isSubmissionAccepted(reg)) return { label: '已完成', chip: 'chip chip-success', icon: 'verified' };
  if (reg.status === '审核通过') return { label: '待上传成果', chip: 'chip chip-primary', icon: 'upload_file' };
  if (reg.status === '待完善') return { label: '待提交成果', chip: 'chip chip-primary', icon: 'upload_file' };
  return { label: reg.status || '未知状态', chip: 'chip', icon: 'info' };
}

function makeStage(
  order: number,
  name: string,
  status: StageProgressStatus,
  description?: string,
  submitTime?: string,
  reviewNote?: string | null,
): StudentStageProgress {
  return {
    progressId: -order,
    stageId: -order,
    stageName: name,
    stageOrder: order,
    status,
    description,
    submitTime,
    reviewNote: reviewNote || undefined,
  };
}

function buildFallbackStages(reg: RegistrationRecord): StudentStageProgress[] {
  const status = reg.status;
  const submittedAt = reg.submitDate;
  const hasFile = hasSubmission(reg);
  const accepted = isSubmissionAccepted(reg);
  const returned = isReturned(reg);
  const rejected = isRejected(reg);
  const returnedAfterUpload = returned && hasFile;
  const rejectedAfterUpload = rejected && hasFile;

  const registrationReviewStatus: StageProgressStatus =
    status === '已提交' ? 'submitted'
      : rejected && !hasFile ? 'failed'
        : returned && !hasFile ? 'failed'
          : 'passed';

  const submissionStatus: StageProgressStatus =
    accepted ? 'passed'
      : status === '审核中' ? 'submitted'
        : returnedAfterUpload || rejectedAfterUpload ? 'failed'
          : hasFile ? 'submitted'
            : status === '审核通过' || status === '待完善' || returned ? 'in_progress'
              : 'not_started';

  const reviewStatus: StageProgressStatus =
    accepted ? 'passed'
      : status === '审核中' ? 'submitted'
        : returnedAfterUpload || rejectedAfterUpload ? 'failed'
          : 'not_started';

  return [
    makeStage(1, '报名信息', 'passed', '已完成参赛信息提交', submittedAt),
    makeStage(
      2,
      '报名审核',
      registrationReviewStatus,
      registrationReviewStatus === 'submitted' ? '报名申请已提交，等待老师审核' : undefined,
      submittedAt,
      !hasFile && (returned || rejected) ? reg.reviewNote : undefined,
    ),
    makeStage(
      3,
      '成果提交',
      submissionStatus,
      submissionStatus === 'in_progress' ? '报名已通过，请按赛事要求上传成果材料' : undefined,
      hasFile ? submittedAt : undefined,
      hasFile && returned ? reg.reviewNote : undefined,
    ),
    makeStage(
      4,
      '成果审核',
      reviewStatus,
      reviewStatus === 'submitted' ? '成果已提交，等待审核结果' : undefined,
      hasFile ? submittedAt : undefined,
      hasFile && (returned || rejected) ? reg.reviewNote : undefined,
    ),
    makeStage(5, '成长记录', accepted ? 'passed' : 'not_started', accepted ? '审核通过后已同步成长档案' : undefined),
  ];
}

function normalizeStages(stages?: StudentStageProgress[]) {
  return (Array.isArray(stages) ? stages : [])
    .filter(Boolean)
    .map((stage, index) => ({
      ...stage,
      progressId: stage.progressId ?? -(index + 1),
      stageId: stage.stageId ?? -(index + 1),
      stageOrder: stage.stageOrder ?? index + 1,
      status: (statusConfig[stage.status] ? stage.status : 'not_started') as StageProgressStatus,
    }))
    .sort((a, b) => a.stageOrder - b.stageOrder);
}

function deriveCurrentStage(card: ProgressCard) {
  const stages = card.stages;
  const active = stages.find((stage) => stage.status === 'failed' || stage.status === 'in_progress' || stage.status === 'submitted');
  if (active) return active.stageName;
  if (isCompleted(card)) return '已完成';
  return card.currentStage || stages[0]?.stageName || '待开始';
}

function getStageDate(stage: StudentStageProgress) {
  return stage.reviewTime || stage.submitTime || stage.endTime || stage.startTime;
}

function getProgressPercent(card: ProgressCard) {
  if (isCompleted(card)) return 100;
  if (card.stages.length === 0) return 0;
  const score = card.stages.reduce((sum, stage) => {
    if (stage.status === 'passed') return sum + 1;
    if (stage.status === 'submitted' || stage.status === 'in_progress') return sum + 0.5;
    if (stage.status === 'failed') return sum + 0.35;
    return sum;
  }, 0);
  return Math.min(100, Math.max(0, Math.round((score / card.stages.length) * 100)));
}

function getAction(card: ProgressCard) {
  const reg = card.registration;
  if (!reg) {
    return { label: '查看赛事', icon: 'open_in_new', path: `/student/competitions/${card.competitionId}`, primary: false };
  }
  if (reg.status === '退回补充') {
    return { label: '补充材料', icon: 'assignment_return', path: `/student/upload/${reg.id}`, primary: true };
  }
  if (reg.status === '审核驳回') {
    return { label: '查看原因', icon: 'info', path: `/student/upload/${reg.id}`, primary: false };
  }
  if (reg.status === '待完善' || (reg.status === '审核通过' && !isSubmissionAccepted(reg))) {
    return { label: '上传成果', icon: 'upload_file', path: `/student/upload/${reg.id}`, primary: true };
  }
  if (reg.status === '审核中' || reg.status === '已提交') {
    return { label: '查看材料', icon: 'visibility', path: `/student/upload/${reg.id}`, primary: false };
  }
  return { label: '查看成长档案', icon: 'trending_up', path: '/student/growth', primary: false };
}

function getPriority(card: ProgressCard) {
  const reg = card.registration;
  if (isReturned(reg)) return 0;
  if (isTodo(reg)) return 1;
  if (isReviewing(reg)) return 2;
  if (isRejected(reg)) return 3;
  if (isCompleted(card)) return 5;
  return 4;
}

function mergeProgressCards(progressList: CompetitionProgress[], registrations: RegistrationRecord[]): ProgressCard[] {
  const progressMap = new Map(progressList.map((item) => [String(item.competitionId), item]));
  const usedProgressIds = new Set<string>();

  const registrationCards: ProgressCard[] = registrations.map((reg) => {
    const progress = progressMap.get(String(reg.competitionId));
    usedProgressIds.add(String(reg.competitionId));
    const backendStages = normalizeStages(progress?.stages);
    return {
      cardKey: `reg-${reg.id}`,
      competitionId: reg.competitionId,
      competitionName: reg.competitionName || progress?.competitionName || `赛事 #${reg.competitionId}`,
      competitionLevel: reg.competitionLevel || progress?.competitionLevel,
      competitionCategory: reg.competitionCategory,
      registration: reg,
      currentStage: progress?.currentStage,
      stages: backendStages.length > 0 ? backendStages : buildFallbackStages(reg),
    };
  });

  const progressOnlyCards: ProgressCard[] = progressList
    .filter((item) => !usedProgressIds.has(String(item.competitionId)))
    .map((item) => ({
      cardKey: `progress-${item.competitionId}`,
      competitionId: item.competitionId,
      competitionName: item.competitionName || `赛事 #${item.competitionId}`,
      competitionLevel: item.competitionLevel,
      currentStage: item.currentStage,
      registration: undefined,
      stages: normalizeStages(item.stages),
    }));

  return [...registrationCards, ...progressOnlyCards].sort((a, b) => {
    const priorityDiff = getPriority(a) - getPriority(b);
    if (priorityDiff !== 0) return priorityDiff;
    return dateTime(b.registration?.submitDate) - dateTime(a.registration?.submitDate);
  });
}

function matchesFilter(card: ProgressCard, filter: FilterKey) {
  if (filter === 'all') return true;
  if (filter === 'todo') return isTodo(card.registration);
  if (filter === 'reviewing') return isReviewing(card.registration);
  if (filter === 'returned') return isReturned(card.registration);
  if (filter === 'completed') return isCompleted(card);
  return true;
}

function StageTimeline({ stages }: { stages: StudentStageProgress[] }) {
  if (stages.length === 0) {
    return (
      <p className="pt-3 text-caption text-placeholder">
        暂无阶段配置，报名与审核状态会在这里持续更新。
      </p>
    );
  }

  const doneIndex = (() => {
    let last = -1;
    stages.forEach((s, i) => {
      if (s.status === 'passed' || s.status === 'submitted' || s.status === 'in_progress' || s.status === 'failed') {
        last = i;
      }
    });
    return last;
  })();

  return (
    <div className="overflow-x-auto pb-1 pt-2">
      <div className="relative min-w-[560px] px-2">
        {/* 背景轨 */}
        <div className="absolute left-[8%] right-[8%] top-[18px] h-3 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-surface-tile-1))]" />
        {/* 已完成轨 */}
        {doneIndex >= 0 && stages.length > 1 ? (
          <div
            className="absolute top-[18px] h-3 rounded-full bg-gradient-to-r from-[#3b82f6] via-[#2563eb] to-[#1d4ed8]"
            style={{
              left: '8%',
              width: `${(doneIndex / (stages.length - 1)) * 84}%`,
            }}
          />
        ) : null}
        <div
          className="relative z-10 grid gap-2"
          style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}
        >
          {stages.map((stage) => {
            const cfg = statusConfig[stage.status] || statusConfig.not_started;
            const stageDate = getStageDate(stage);
            const active = stage.status !== 'not_started';
            return (
              <div key={`${stage.stageId}-${stage.stageOrder}`} className="relative flex min-w-0 flex-col items-center text-center">
                <div
                  className={`grid h-9 w-9 place-items-center rounded-full border-[2.5px] shadow-sm ${
                    active
                      ? 'border-primary bg-canvas text-primary'
                      : 'border-hairline bg-canvas text-placeholder'
                  } ${stage.status === 'passed' ? '!border-primary !bg-primary !text-on-primary' : ''} ${
                    stage.status === 'failed' ? '!border-error !bg-error !text-white' : ''
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{cfg.icon}</span>
                </div>
                <p className="mt-2.5 max-w-[7.5rem] truncate text-caption font-semibold text-ink">{stage.stageName}</p>
                <p className={`mt-0.5 text-caption-2 font-medium ${cfg.text}`}>{cfg.label}</p>
                {stageDate ? (
                  <p className="mt-0.5 text-caption-2 tabular-nums text-placeholder">{formatDate(stageDate)}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** 列表上只展示「最新进度」一句话 */
function latestProgressText(card: ProgressCard) {
  const status = getStatusMeta(card.registration);
  const stage = deriveCurrentStage(card);
  const percent = getProgressPercent(card);
  return `${status.label} · ${stage} · ${percent}%`;
}

function EmptyProgress({ recommendations }: { recommendations: Recommendation[] }) {
  const navigate = useNavigate();

  return (
    <section className="page-section">
      <div className="py-10 text-center">
        <p className="text-subhead font-medium text-ink">暂无赛事进度</p>
        <p className="mt-1 text-footnote text-placeholder">报名赛事后，进度会出现在列表中。</p>
        <button type="button" onClick={() => navigate('/student/competitions')} className="btn-primary mt-4">
          去报名赛事
        </button>
      </div>

      {recommendations.length > 0 ? (
        <div className="page-section">
          <div className="page-section-head">
            <h2 className="page-section-title">推荐赛事</h2>
            <button type="button" onClick={() => navigate('/student/competitions')} className="page-section-extra hover:text-primary">
              查看更多
            </button>
          </div>
          <div className="flat-list">
            {recommendations.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(`/student/competitions/${item.id}`)}
                className="flat-row flat-row-clickable"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-subhead font-medium text-ink">{item.name}</p>
                  <p className="mt-0.5 flex flex-wrap gap-2 text-caption text-placeholder">
                    {item.level ? <span>{displayLevel(item.level)}</span> : null}
                    {item.category ? <span>{item.category} 类</span> : null}
                    <span>截止 {formatDate(item.endTime)}</span>
                  </p>
                </div>
                <span className="material-symbols-outlined text-[18px] text-placeholder">chevron_right</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

/** 详情页：完整阶段 + 操作 */
function ProgressDetail({ card, onBack }: { card: ProgressCard; onBack: () => void }) {
  const navigate = useNavigate();
  const reg = card.registration;
  const status = getStatusMeta(reg);
  const action = getAction(card);
  const currentStage = deriveCurrentStage(card);
  const percent = getProgressPercent(card);
  const note = cleanReviewNote(reg?.reviewNote);
  const activeStage = card.stages.find((stage) => stage.stageName === currentStage)
    || card.stages.find((stage) => stage.status === 'in_progress' || stage.status === 'submitted' || stage.status === 'failed');

  return (
    <div className="page-stack">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onBack} className="btn-secondary !h-9">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          返回列表
        </button>
      </div>

      <PageHero
        eyebrow="进度详情"
        title={card.competitionName}
        description={`${status.label} · 当前阶段 ${currentStage} · 完成 ${percent}%`}
        actions={(
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate(`/student/competitions/${card.competitionId}`)} className="btn-secondary">
              赛事详情
            </button>
            <button
              type="button"
              onClick={() => navigate(action.path)}
              className={action.primary ? 'btn-primary' : 'btn-secondary'}
            >
              {action.label}
            </button>
          </div>
        )}
      />

      <section className="metric-row">
        <div className="metric-item">
          <div className="metric-item-label">状态</div>
          <div className="metric-item-value text-callout">{status.label}</div>
        </div>
        <div className="metric-item">
          <div className="metric-item-label">当前阶段</div>
          <div className="metric-item-value text-callout">{currentStage}</div>
        </div>
        <div className="metric-item">
          <div className="metric-item-label">完成度</div>
          <div className="metric-item-value text-callout">{percent}%</div>
        </div>
        <div className="metric-item">
          <div className="metric-item-label">级别</div>
          <div className="metric-item-value text-callout">{displayLevel(card.competitionLevel)}</div>
        </div>
      </section>

      <ProgressBar value={percent} size="lg" showThumb showLabel segments={Math.min(6, Math.max(3, card.stages.length || 4))} />

      {(reg?.teamName || reg?.track || reg?.submitDate) ? (
        <p className="text-footnote text-body-subtle">
          {[
            reg?.teamName ? `队伍：${reg.teamName}` : '个人报名',
            reg?.track ? `赛道：${reg.track}` : null,
            reg?.submitDate ? `报名：${formatDate(reg.submitDate)}` : null,
            reg?.fileName || (hasSubmission(reg) ? '已上传材料' : '暂未上传材料'),
          ].filter(Boolean).join(' · ')}
        </p>
      ) : null}

      {note && (isReturned(reg) || isRejected(reg)) ? (
        <p className={`rounded-lg border px-3 py-2.5 text-footnote leading-relaxed ${
          isRejected(reg) ? 'border-error/25 bg-error/5 text-error' : 'border-warning/25 bg-warning/5 text-warning'
        }`}>
          {isRejected(reg) ? '驳回原因：' : '补充说明：'}{note}
        </p>
      ) : null}

      {activeStage?.description ? (
        <p className="text-footnote leading-relaxed text-body-subtle">{activeStage.description}</p>
      ) : null}

      <section className="page-section">
        <div className="page-section-head">
          <h2 className="page-section-title">阶段进度</h2>
        </div>
        {card.stages.length > 0 ? (
          <StageProgressBar stages={card.stages} size="md" className="mb-4 max-w-xl" />
        ) : null}
        <StageTimeline stages={card.stages} />
      </section>
    </div>
  );
}

const PAGE_SIZE = 10;

export default function MyProgress() {
  const [progressList, setProgressList] = useState<CompetitionProgress[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [page, setPage] = useState(1);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [progressResult, registrationResult, recommendationResult] = await Promise.allSettled([
          apiClient.get('/student/progress/my'),
          apiClient.get('/registration/my'),
          apiClient.get('/competition/list', { params: { current: 1, size: 3, status: 'published' } }),
        ]);

        if (progressResult.status === 'rejected' && registrationResult.status === 'rejected') {
          throw registrationResult.reason || progressResult.reason;
        }

        const progressData = progressResult.status === 'fulfilled' && Array.isArray(progressResult.value)
          ? progressResult.value
          : [];
        const registrationData = registrationResult.status === 'fulfilled' && Array.isArray(registrationResult.value)
          ? registrationResult.value
          : [];
        const recommendationValue = recommendationResult.status === 'fulfilled' ? recommendationResult.value as any : null;
        const recommendationRecords = Array.isArray(recommendationValue?.records)
          ? recommendationValue.records
          : Array.isArray(recommendationValue)
            ? recommendationValue
            : [];

        setProgressList(progressData);
        setRegistrations(registrationData);
        setRecommendations(recommendationRecords.slice(0, 3).map((item: any) => ({
          id: item.id,
          name: item.name,
          level: item.level,
          category: item.category,
          endTime: item.endTime,
        })));
      } catch (err: any) {
        const message = err?.message || '获取赛事进度失败';
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const cards = useMemo(() => mergeProgressCards(progressList, registrations), [progressList, registrations]);
  const filteredCards = useMemo(() => cards.filter((card) => matchesFilter(card, activeFilter)), [cards, activeFilter]);

  const counts = useMemo(() => ({
    all: cards.length,
    todo: cards.filter((card) => isTodo(card.registration)).length,
    reviewing: cards.filter((card) => isReviewing(card.registration)).length,
    returned: cards.filter((card) => isReturned(card.registration)).length,
    completed: cards.filter(isCompleted).length,
  }), [cards]);

  const totalFiltered = filteredCards.length;
  const pageCount = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedCards = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredCards.slice(start, start + PAGE_SIZE);
  }, [filteredCards, safePage]);

  useEffect(() => {
    setPage(1);
  }, [activeFilter]);

  const selectedCard = selectedKey
    ? cards.find((c) => c.cardKey === selectedKey) ?? null
    : null;

  if (loading) {
    return (
      <div className="page-stack">
        <PageHero eyebrow="进度" title="我的赛事进度" description="加载中…" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="赛事进度加载失败"
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // 详情视图：点进某场赛事
  if (selectedCard) {
    return <ProgressDetail card={selectedCard} onBack={() => setSelectedKey(null)} />;
  }

  return (
    <div className="page-stack">
      <PageHero
        eyebrow="进度"
        title="我的赛事进度"
        description="赛事列表只展示最新进度，点击某一项查看完整阶段。"
        actions={(
          <button type="button" onClick={() => navigate('/student/competitions')} className="btn-secondary">
            浏览更多赛事
          </button>
        )}
      />

      {cards.length === 0 ? (
        <EmptyProgress recommendations={recommendations} />
      ) : (
        <>
          <div className="filter-strip">
            {FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`chip ${activeFilter === filter.key ? 'chip-primary' : ''}`}
              >
                {filter.label}
                <span className="tabular-nums text-placeholder">{counts[filter.key]}</span>
              </button>
            ))}
          </div>

          {filteredCards.length === 0 ? (
            <p className="py-10 text-center text-footnote text-placeholder">
              当前筛选下暂无赛事，可切换到「全部」查看。
            </p>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-hairline bg-canvas">
                <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_88px] gap-3 border-b border-hairline bg-canvas-parchment px-4 py-2.5 text-caption font-medium text-placeholder sm:grid">
                  <span>赛事</span>
                  <span>最新进度</span>
                  <span className="text-right">操作</span>
                </div>
                <div className="divide-y divide-hairline">
                  {pagedCards.map((card) => {
                    const status = getStatusMeta(card.registration);
                    const percent = getProgressPercent(card);
                    return (
                      <button
                        key={card.cardKey}
                        type="button"
                        onClick={() => setSelectedKey(card.cardKey)}
                        className="grid w-full grid-cols-1 gap-2 px-4 py-3.5 text-left transition-colors hover:bg-hover-overlay sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_88px] sm:items-center sm:gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-subhead font-medium text-ink">{card.competitionName}</span>
                            <span className={status.chip}>{status.label}</span>
                          </div>
                          <p className="mt-0.5 text-caption text-placeholder sm:hidden">
                            {latestProgressText(card)}
                          </p>
                        </div>
                        <div className="hidden min-w-0 sm:block">
                          <p className="truncate text-footnote text-body-muted">{latestProgressText(card)}</p>
                          <ProgressBar
                            value={percent}
                            size="sm"
                            showThumb
                            instant
                            segments={4}
                            className="mt-2 max-w-[240px]"
                          />
                        </div>
                        <div className="flex items-center justify-end text-placeholder">
                          <span className="text-caption text-primary sm:hidden">查看详情</span>
                          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {totalFiltered > PAGE_SIZE ? (
                <Pagination
                  current={safePage}
                  total={totalFiltered}
                  pageSize={PAGE_SIZE}
                  onChange={setPage}
                />
              ) : (
                <p className="text-center text-caption text-placeholder">
                  共 {totalFiltered} 场赛事
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
