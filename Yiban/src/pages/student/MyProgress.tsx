import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';
import ErrorState from '../../components/ErrorState';
import { CardSkeleton } from '../../components/Skeleton';
import type { CompetitionProgress, StageProgressStatus, StudentStageProgress } from '../../types';
import { pageVariants, pageTransition, listContainer, listItem } from '../../lib/motion';

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
  in_progress: { icon: 'radio_button_checked', label: '进行中', dot: 'bg-primary text-on-primary ring-4 ring-primary/15', text: 'text-primary' },
  submitted: { icon: 'schedule', label: '已提交', dot: 'bg-primary text-on-primary ring-4 ring-primary/15', text: 'text-primary' },
  failed: { icon: 'error', label: '需处理', dot: 'bg-error text-white', text: 'text-error' },
  not_started: { icon: 'radio_button_unchecked', label: '未开始', dot: 'bg-surface-chip text-placeholder', text: 'text-ink-muted-48' },
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
  if (!reg) return { label: '阶段跟踪中', chip: 'chip chip-info', icon: 'timeline', tone: 'text-primary' };
  if (reg.status === '退回补充') return { label: '退回补充', chip: 'chip chip-warning', icon: 'assignment_return', tone: 'text-warning' };
  if (reg.status === '审核驳回') return { label: '审核驳回', chip: 'chip chip-error', icon: 'cancel', tone: 'text-error' };
  if (reg.status === '审核中') return { label: '成果审核中', chip: 'chip chip-warning', icon: 'hourglass_top', tone: 'text-warning' };
  if (reg.status === '已提交') return { label: '报名审核中', chip: 'chip chip-info', icon: 'pending_actions', tone: 'text-primary' };
  if (reg.status === '审核通过' && isSubmissionAccepted(reg)) return { label: '已完成', chip: 'chip chip-success', icon: 'verified', tone: 'text-success' };
  if (reg.status === '审核通过') return { label: '待上传成果', chip: 'chip chip-primary', icon: 'upload_file', tone: 'text-primary' };
  if (reg.status === '待完善') return { label: '待提交成果', chip: 'chip chip-primary', icon: 'upload_file', tone: 'text-primary' };
  return { label: reg.status || '未知状态', chip: 'chip', icon: 'info', tone: 'text-ink-muted-80' };
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

function StatTile({ label, value, icon, tone }: { label: string; value: number; icon: string; tone: 'primary' | 'success' | 'warning' | 'error' }) {
  const toneClass = {
    primary: 'text-primary bg-primary/8',
    success: 'text-success bg-success/8',
    warning: 'text-warning bg-warning/8',
    error: 'text-error bg-error/8',
  }[tone];

  return (
    <div className="rounded-md border border-hairline bg-canvas px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-ink-muted-48">{label}</p>
        <span className={`material-symbols-outlined grid h-8 w-8 place-items-center rounded-full text-[18px] ${toneClass}`}>{icon}</span>
      </div>
      <p className="mt-2 text-[24px] font-semibold leading-none text-ink tabular-nums">{value}</p>
    </div>
  );
}

function StageTimeline({ stages }: { stages: StudentStageProgress[] }) {
  if (stages.length === 0) {
    return (
      <div className="border-t border-hairline pt-4 text-[13px] text-ink-muted-48">
        暂无阶段配置，报名与审核状态会在这里持续更新。
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-1">
      <div className="relative min-w-[680px] pt-1">
        <div className="absolute left-[10%] right-[10%] top-[19px] h-px bg-hairline" />
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}
        >
          {stages.map((stage) => {
            const cfg = statusConfig[stage.status] || statusConfig.not_started;
            const stageDate = getStageDate(stage);
            return (
              <div key={`${stage.stageId}-${stage.stageOrder}`} className="relative flex min-w-0 flex-col items-center text-center">
                <div className={`relative z-10 grid h-9 w-9 place-items-center rounded-full ${cfg.dot}`}>
                  <span className="material-symbols-outlined text-[19px]">{cfg.icon}</span>
                </div>
                <p className="mt-3 max-w-[8rem] truncate text-[13px] font-medium text-ink">{stage.stageName}</p>
                <p className={`mt-1 text-[11px] ${cfg.text}`}>{cfg.label}</p>
                {stageDate && (
                  <p className="mt-1 text-[11px] text-ink-muted-48 tabular-nums">{formatDate(stageDate)}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProgressCardView({ card }: { card: ProgressCard }) {
  const navigate = useNavigate();
  const reg = card.registration;
  const status = getStatusMeta(reg);
  const action = getAction(card);
  const currentStage = deriveCurrentStage(card);
  const percent = getProgressPercent(card);
  const note = cleanReviewNote(reg?.reviewNote);
  const activeStage = card.stages.find((stage) => stage.stageName === currentStage) || card.stages.find((stage) => stage.status === 'in_progress' || stage.status === 'submitted' || stage.status === 'failed');

  return (
    <motion.article variants={listItem} className="glass p-lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={status.chip}>
              <span className="material-symbols-outlined text-[14px]">{status.icon}</span>
              {status.label}
            </span>
            {card.competitionLevel && <span className="chip chip-primary">{card.competitionLevel}</span>}
            {card.competitionCategory && <span className="chip">{card.competitionCategory} 类</span>}
          </div>
          <h2 className="mt-3 truncate text-[20px] font-semibold tracking-tight text-ink">{card.competitionName}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-muted-80">
            <span className="inline-flex items-center gap-1">
              <span className={`material-symbols-outlined text-[16px] ${status.tone}`}>timeline</span>
              当前阶段：<span className="font-medium text-ink">{currentStage}</span>
            </span>
            {reg?.submitDate && (
              <span className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-ink-muted-48">event</span>
                报名时间：{formatDate(reg.submitDate)}
              </span>
            )}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button onClick={() => navigate(`/student/competitions/${card.competitionId}`)} className="btn-secondary !py-2 !text-[13px]">
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            赛事详情
          </button>
          <button
            onClick={() => navigate(action.path)}
            className={`${action.primary ? 'btn-primary' : 'btn-secondary'} !py-2 !text-[13px]`}
          >
            <span className="material-symbols-outlined text-[16px]">{action.icon}</span>
            {action.label}
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 border-y border-hairline py-4 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCell icon="groups" label="队伍信息" value={reg?.teamName ? `团队：${reg.teamName}` : '个人报名'} />
        <InfoCell icon="flag" label="参赛赛道" value={reg?.track || '暂未选择'} />
        <InfoCell icon="folder_open" label="成果材料" value={reg?.fileName || (hasSubmission(reg) ? '已上传材料' : '暂未上传')} />
        <InfoCell icon="percent" label="完成度" value={`${percent}%`} />
      </div>

      {note && (isReturned(reg) || isRejected(reg)) && (
        <div className={`mt-4 rounded-md border px-4 py-3 ${isRejected(reg) ? 'border-error/20 bg-error/5' : 'border-warning/20 bg-warning/5'}`}>
          <div className="flex gap-3">
            <span className={`material-symbols-outlined mt-0.5 text-[18px] ${isRejected(reg) ? 'text-error' : 'text-warning'}`}>
              {isRejected(reg) ? 'report' : 'assignment_return'}
            </span>
            <div className="min-w-0">
              <p className={`text-[13px] font-medium ${isRejected(reg) ? 'text-error' : 'text-warning'}`}>
                {isRejected(reg) ? '审核驳回原因' : '退回补充说明'}
              </p>
              <p className="mt-1 text-[13px] leading-6 text-ink">{note}</p>
            </div>
          </div>
        </div>
      )}

      {activeStage?.description && (
        <div className="mt-4 flex items-start gap-3 rounded-md border border-primary/12 bg-primary/5 px-4 py-3">
          <span className="material-symbols-outlined mt-0.5 text-[18px] text-primary">tips_and_updates</span>
          <p className="text-[13px] leading-6 text-ink-muted-80">{activeStage.description}</p>
        </div>
      )}

      <div className="mt-5">
        <StageTimeline stages={card.stages} />
      </div>
    </motion.article>
  );
}

function InfoCell({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[12px] text-ink-muted-48">
        <span className="material-symbols-outlined text-[15px] text-primary">{icon}</span>
        {label}
      </p>
      <p className="mt-1 truncate text-[13px] font-medium text-ink">{value}</p>
    </div>
  );
}

function EmptyProgress({ recommendations }: { recommendations: Recommendation[] }) {
  const navigate = useNavigate();

  return (
    <div className="glass p-xl">
      <div className="flex flex-col items-center text-center">
        <span className="material-symbols-outlined text-[48px] text-ink-muted-48">timeline</span>
        <p className="empty-state-copy mt-3 text-[16px] font-medium text-ink">暂无赛事进度</p>
        <p className="empty-state-copy mt-1 text-[13px] text-ink-muted-48">报名赛事后，你的阶段进度、审核意见和下一步操作会在这里集中展示。</p>
        <button onClick={() => navigate('/student/competitions')} className="btn-primary mt-4">
          <span className="material-symbols-outlined text-[16px]">search</span>
          去报名赛事
        </button>
      </div>

      {recommendations.length > 0 && (
        <div className="mt-8 border-t border-hairline pt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-ink">正在报名的赛事</h2>
            <button onClick={() => navigate('/student/competitions')} className="text-[13px] font-medium text-primary hover:text-primary-focus">
              查看更多
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {recommendations.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/student/competitions/${item.id}`)}
                className="min-w-0 rounded-md border border-hairline bg-canvas px-4 py-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
              >
                <p className="truncate text-[14px] font-medium text-ink">{item.name}</p>
                <p className="mt-2 flex flex-wrap gap-2 text-[12px] text-ink-muted-48">
                  {item.level && <span>{item.level}</span>}
                  {item.category && <span>{item.category} 类</span>}
                  <span>截止 {formatDate(item.endTime)}</span>
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyProgress() {
  const [progressList, setProgressList] = useState<CompetitionProgress[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
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

  if (loading) {
    return (
      <div className="py-lg flex flex-col gap-lg">
        <PageHero eyebrow="My progress" title="我的赛事进度" description="正在整理你的赛事阶段与待办事项。" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => <CardSkeleton key={index} />)}
        </div>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 2 }, (_, index) => <CardSkeleton key={`card-${index}`} />)}
        </div>
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

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      transition={pageTransition}
      className="py-lg flex flex-col gap-lg"
    >
      <PageHero
        eyebrow="My progress"
        title="我的赛事进度"
        description="集中追踪每项赛事的报名、审核、成果提交和成长记录，快速找到下一步要处理的事项。"
        actions={(
          <button onClick={() => navigate('/student/competitions')} className="btn-secondary">
            <span className="material-symbols-outlined text-[18px]">search</span>
            浏览更多赛事
          </button>
        )}
      />

      {cards.length === 0 ? (
        <EmptyProgress recommendations={recommendations} />
      ) : (
        <>
          <motion.div variants={listContainer} initial="hidden" animate="visible" className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <motion.div variants={listItem}><StatTile label="累计报名" value={counts.all} icon="format_list_numbered" tone="primary" /></motion.div>
            <motion.div variants={listItem}><StatTile label="待我处理" value={counts.todo} icon="task_alt" tone="warning" /></motion.div>
            <motion.div variants={listItem}><StatTile label="审核中" value={counts.reviewing} icon="hourglass_top" tone="warning" /></motion.div>
            <motion.div variants={listItem}><StatTile label="退回补充" value={counts.returned} icon="assignment_return" tone="error" /></motion.div>
            <motion.div variants={listItem}><StatTile label="已完成" value={counts.completed} icon="verified" tone="success" /></motion.div>
          </motion.div>

          <div className="flex gap-1 overflow-x-auto rounded-full bg-primary/6 p-1 w-fit max-w-full no-scrollbar">
            {FILTERS.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`rounded-full px-4 py-1.5 text-[13px] whitespace-nowrap transition ${
                  activeFilter === filter.key
                    ? 'bg-canvas text-ink font-semibold shadow-sm'
                    : 'text-ink-muted-80 hover:text-ink'
                }`}
              >
                {filter.label}
                <span className="ml-1 tabular-nums text-[12px] opacity-70">{counts[filter.key]}</span>
              </button>
            ))}
          </div>

          {filteredCards.length === 0 ? (
            <div className="glass">
              <ErrorState
                variant="not-found"
                title="当前筛选下暂无赛事"
                message="可以切换到全部进度查看所有报名赛事。"
              />
            </div>
          ) : (
            <motion.div variants={listContainer} initial="hidden" animate="visible" className="flex flex-col gap-4">
              {filteredCards.map((card) => <ProgressCardView key={card.cardKey} card={card} />)}
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
