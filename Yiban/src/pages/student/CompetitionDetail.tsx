import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';
import { displayLevel } from '../../lib/levelDisplay';
import ErrorState from '../../components/ErrorState';
import { PageSkeleton } from '../../components/Skeleton';
import LazyImage from '../../components/LazyImage';

type BackendCompetition = {
  id: number | string;
  name: string;
  level: string;
  category: string;
  status: string;
  startTime?: string;
  endTime?: string;
  competitionStart?: string;
  competitionEnd?: string;
  maxTeamSize?: number;
  coverUrl?: string;
  sourceUrl?: string;
  content?: string;
  stages?: any[];
};

type Registration = {
  id: number | string;
  competitionId: number | string;
  status: string;
  teamName?: string;
};

type TeamVO = {
  id: number | string;
  authorId: number | string;
  authorName: string;
  competitionId: number | string;
  competitionName: string;
  content: string;
  rolesNeeded?: string[];
  status: string;
};

type CtaState = {
  label: string;
  icon: string;
  disabled?: boolean;
  tone?: 'primary' | 'secondary';
  hint: string;
  action: () => void;
};

function statusLabel(status: string) {
  switch (status) {
    case 'published': return '报名中';
    case 'draft': return '未发布';
    case 'closed': return '已结束';
    default: return status || '未知';
  }
}

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function getTimelineState(date?: string): 'done' | 'active' | 'pending' {
  const d = parseDate(date);
  if (!d) return 'pending';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return 'active';
  return d < now ? 'done' : 'pending';
}

export default function CompetitionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [comp, setComp] = useState<BackendCompetition | null>(null);
  const [loading, setLoading] = useState(true);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<TeamVO[]>([]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setLoading(true);
        const data: any = await apiClient.get(`/competition/detail/${id}`);
        setComp(data);
      } catch (err: any) {
        toast.error(err.message || '加载赛事详情失败');
        setComp(null);
      } finally {
        setLoading(false);
      }
      try {
        const regs: any = await apiClient.get('/registration/my');
        const list: Registration[] = Array.isArray(regs) ? regs : [];
        const relevantStatuses = ['待完善', '已提交', '审核中', '审核通过', '退回补充', '审核驳回'];
        const found = list.find((r) => String(r.competitionId) === String(id) && relevantStatuses.includes(r.status));
        setRegistration(found || null);
      } catch (err: any) {
        if (err?.response?.status !== 403 && err?.response?.status !== 401) {
          console.error('Failed to load registrations:', err);
        }
      }
      try {
        const teamPage: any = await apiClient.get('/team/list', {
          params: { current: 1, size: 5, competitionId: id },
        });
        setRelatedPosts(Array.isArray(teamPage?.records) ? teamPage.records : []);
      } catch (err) {
        // ignore — backend may have issues
      }
    };
    load();
  }, [id]);

  const cta = useMemo<CtaState | null>(() => {
    if (!comp) return null;
    const now = new Date();
    const start = parseDate(comp.startTime);
    const end = parseDate(comp.endTime);
    const notStarted = start ? now < start : false;
    const closed = comp.status === 'closed' || (end ? now > end : false);

    if (registration) {
      if (registration.status === '退回补充') {
        return {
          label: '补充材料',
          icon: 'assignment_return',
          hint: '报名材料被退回，请按审核意见补充后再提交。',
          action: () => navigate(`/student/upload/${registration.id}`),
        };
      }
      if (registration.status === '审核驳回') {
        return {
          label: '查看驳回原因',
          icon: 'error',
          tone: 'secondary',
          hint: '该报名已被驳回，请先查看原因；如需重新报名请确认赛事仍在报名期。',
          action: () => navigate('/student/registrations'),
        };
      }
      return {
        label: '查看我的报名',
        icon: 'assignment',
        hint: `当前报名状态：${registration.status}`,
        action: () => navigate('/student/registrations'),
      };
    }

    if (comp.status === 'draft') {
      return { label: '暂不可报名', icon: 'lock', disabled: true, hint: '赛事尚未发布，暂不能报名。', action: () => {} };
    }
    if (notStarted) {
      return { label: '报名尚未开始', icon: 'event_upcoming', disabled: true, hint: `报名开始：${formatDate(comp.startTime)}`, action: () => {} };
    }
    if (closed) {
      return { label: '报名已截止', icon: 'event_busy', disabled: true, hint: `报名截止：${formatDate(comp.endTime)}`, action: () => {} };
    }
    return {
      label: '立即报名',
      icon: 'how_to_reg',
      hint: '完成报名后可在“我的报名”中查看审核进度。',
      action: () => navigate(`/student/registrations/workbench/${comp.id}`),
    };
  }, [comp, navigate, registration]);

  if (loading) {
    return <PageSkeleton />;
  }

  if (!comp || !cta) {
    return (
      <ErrorState
        variant="not-found"
        title="赛事不存在"
        message="该赛事可能已被删除或您没有访问权限"
        onRetry={() => navigate('/student/competitions')}
      />
    );
  }

  const deadline = comp.endTime ? new Date(comp.endTime) : null;
  const daysLeft = deadline ? Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
  const timeNodes = [
    { phase: '报名开始', range: formatDate(comp.startTime), desc: '提交个人信息及参赛意向。', state: getTimelineState(comp.startTime) },
    { phase: '报名截止', range: formatDate(comp.endTime), desc: '请在此前完成全部报名材料。', state: getTimelineState(comp.endTime) },
    { phase: '赛事开始', range: formatDate(comp.competitionStart), desc: '正式比赛阶段启动。', state: getTimelineState(comp.competitionStart) },
    { phase: '赛事结束', range: formatDate(comp.competitionEnd), desc: '提交最终成果与答辩。', state: getTimelineState(comp.competitionEnd) },
  ];

  const primaryButton = (
    <button
      type="button"
      onClick={cta.action}
      disabled={cta.disabled}
      className={cta.tone === 'secondary' ? 'btn-secondary disabled:opacity-60 disabled:cursor-not-allowed' : 'btn-primary disabled:opacity-60 disabled:cursor-not-allowed'}
    >
      <span className="material-symbols-outlined">{cta.icon}</span>
      {cta.label}
    </button>
  );

  return (
    <div className="competition-detail-page page-stack">
      <PageHero
        eyebrow="赛事详情"
        title={comp.name}
        description={`${displayLevel(comp.level)} · ${comp.category}类 · ${statusLabel(comp.status)}`}
        prefix={(
          <nav className="mb-1 flex items-center gap-1 text-[13px] text-placeholder">
            <button type="button" onClick={() => navigate('/student/competitions')} className="hover:text-ink transition">竞赛中心</button>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="truncate text-body-subtle">{comp.name}</span>
          </nav>
        )}
        actions={primaryButton}
      />

      {comp.coverUrl ? (
        <div className="competition-detail-cover relative h-[210px] overflow-hidden md:h-[280px]">
          <LazyImage className="h-full w-full object-cover" src={comp.coverUrl} alt={comp.name} fallbackIcon="emoji_events" />
        </div>
      ) : (
        <div className="competition-detail-cover competition-detail-cover-fallback" aria-hidden>
          <span>Y</span>
          <div>
            <small>{displayLevel(comp.level)} · {comp.category}类</small>
            <strong>向下一场比赛出发</strong>
          </div>
        </div>
      )}

      <section className="metric-row" aria-label="赛事摘要">
        <div className="metric-item">
          <div className="metric-item-label">状态</div>
          <div className="metric-item-value text-[18px]">{statusLabel(comp.status)}</div>
          <div className="metric-item-hint">{displayLevel(comp.level)} · {comp.category}类</div>
        </div>
        <div className="metric-item">
          <div className="metric-item-label">报名截止</div>
          <div className="metric-item-value text-[18px]">{formatDate(comp.endTime)}</div>
          <div className="metric-item-hint">{cta.disabled ? cta.label : `剩余 ${daysLeft} 天`}</div>
        </div>
        <div className="metric-item">
          <div className="metric-item-label">比赛开始</div>
          <div className="metric-item-value text-[18px]">{formatDate(comp.competitionStart)}</div>
          <div className="metric-item-hint">结束 {formatDate(comp.competitionEnd)}</div>
        </div>
        <div className="metric-item">
          <div className="metric-item-label">组队上限</div>
          <div className="metric-item-value text-[18px]">{comp.maxTeamSize ?? '—'}</div>
          <div className="metric-item-hint">人 / 队</div>
        </div>
      </section>

      {comp.sourceUrl ? (
        <a
          href={comp.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="flat-row flat-row-clickable"
        >
          <span className="material-symbols-outlined text-[20px] text-body-muted">open_in_new</span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-ink">访问赛事官网 / 查看原始公告</p>
            <p className="mt-0.5 truncate text-[12px] text-placeholder">{comp.sourceUrl}</p>
          </div>
          <span className="material-symbols-outlined text-[18px] text-placeholder">chevron_right</span>
        </a>
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          <section className="page-section">
            <div className="page-section-head">
              <h2 className="page-section-title">赛事简介</h2>
            </div>
            <div
              className="prose prose-sm max-w-none text-[14px] leading-[1.65] text-body-subtle"
              dangerouslySetInnerHTML={{
                __html: comp.content
                  ? DOMPurify.sanitize(comp.content)
                  : '<p>本赛事旨在选拔信息技术领域优秀人才，鼓励学生在算法、软件开发、人工智能等方向开展创新实践。</p>'
              }}
            />
          </section>

          <section className="page-section">
            <div className="page-section-head">
              <h2 className="page-section-title">时间节点</h2>
            </div>
            <ol className="relative pl-7">
              <span className="absolute bottom-2 left-2 top-2 w-px bg-hairline" />
              {timeNodes.map((it) => (
                <li key={it.phase} className="relative mb-4 pl-3 last:mb-0">
                  <span
                    className={`absolute -left-[2px] top-1.5 h-2.5 w-2.5 rounded-full ${
                      it.state === 'done'
                        ? 'bg-primary'
                        : it.state === 'active'
                          ? 'border-2 border-primary bg-canvas'
                          : 'border border-border bg-canvas'
                    }`}
                  />
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className={`text-[13.5px] font-medium ${it.state === 'pending' ? 'text-placeholder' : 'text-ink'}`}>
                      {it.phase}
                    </span>
                    <span className="text-[12px] tabular-nums text-placeholder">{it.range}</span>
                  </div>
                  <p className="mt-1 text-[13px] text-body-subtle">{it.desc}</p>
                </li>
              ))}
            </ol>
          </section>

          {Array.isArray(comp.stages) && comp.stages.length > 0 ? (
            <section className="page-section">
              <div className="page-section-head">
                <h2 className="page-section-title">赛事阶段</h2>
              </div>
              <div className="relative pl-7">
                <span className="absolute bottom-2 left-2 top-2 w-px bg-hairline" />
                <div className="flex flex-col gap-4">
                  {comp.stages.map((stage: any) => {
                    const isActive = stage.status === 'active';
                    const isClosed = stage.status === 'closed';
                    return (
                      <div key={stage.id} className="relative pl-3">
                        <span
                          className={`absolute -left-[2px] top-1.5 h-2.5 w-2.5 rounded-full ${
                            isClosed
                              ? 'bg-primary'
                              : isActive
                                ? 'border-2 border-primary bg-canvas'
                                : 'border border-border bg-canvas'
                          }`}
                        />
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className={`text-[13.5px] font-medium ${!isClosed && !isActive ? 'text-placeholder' : 'text-ink'}`}>
                            {stage.name}
                          </span>
                          <span className="text-[12px] tabular-nums text-placeholder">
                            {stage.startTime ? new Date(stage.startTime).toLocaleDateString('zh-CN') : ''}
                            {stage.startTime && stage.endTime ? ' — ' : ''}
                            {stage.endTime ? new Date(stage.endTime).toLocaleDateString('zh-CN') : ''}
                          </span>
                          {isActive ? <span className="chip chip-primary !text-[10px]">进行中</span> : null}
                          {isClosed ? <span className="chip chip-success !text-[10px]">已结束</span> : null}
                        </div>
                        {stage.description ? <p className="mt-1 text-[13px] text-body-subtle">{stage.description}</p> : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          ) : null}

          <section className="page-section">
            <div className="page-section-head">
              <h2 className="page-section-title">参赛说明</h2>
            </div>
            <ul className="space-y-2 text-[13.5px] text-body-subtle">
              <li><b className="text-ink">参赛对象：</b>全日制普通高等院校在校学生。</li>
              <li><b className="text-ink">组队要求：</b>每队最多 {comp.maxTeamSize ?? '—'} 人。</li>
              <li><b className="text-ink">赛事级别：</b>{displayLevel(comp.level)} · {comp.category} 类。</li>
              <li><b className="text-ink">赛事材料：</b>请以官方通知和原始公告为准，按要求准备报名和成果材料。</li>
            </ul>
          </section>
        </div>

        <aside className="competition-detail-aside flex h-fit flex-col gap-6 lg:sticky lg:top-[84px]">
          <section className="page-section">
            <div className="page-section-head">
              <h3 className="page-section-title">{registration ? '报名状态' : '报名入口'}</h3>
              <span className={registration ? 'chip chip-success' : cta.disabled ? 'chip chip-warning' : 'chip chip-primary'}>
                {registration ? '已有报名' : cta.disabled ? cta.label : `还剩 ${daysLeft} 天`}
              </span>
            </div>
            <p className="text-[13px] text-body-subtle">{cta.hint}</p>
            {registration?.teamName ? (
              <p className="text-[13px] text-body-muted">队伍：{registration.teamName}</p>
            ) : null}
            <div className="flex flex-col gap-2">
              {primaryButton}
              <button type="button" onClick={() => navigate('/student/progress')} className="btn-secondary w-full">
                查看我的进度
              </button>
              <button type="button" onClick={() => navigate('/student/teams')} className="btn-secondary w-full">
                去组队
              </button>
            </div>
          </section>

          <section className="page-section">
            <div className="page-section-head">
              <h3 className="page-section-title">组队招募</h3>
              <button type="button" onClick={() => navigate('/student/teams')} className="page-section-extra hover:text-primary">
                全部
              </button>
            </div>
            {relatedPosts.length > 0 ? (
              <div className="flat-list">
                {relatedPosts.map((post) => (
                  <div key={post.id} className="flat-row !items-start">
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-medium text-ink">{post.authorName}</span>
                        <span className="truncate text-[11px] text-placeholder">{post.competitionName}</span>
                      </div>
                      <p className="line-clamp-2 text-[12.5px] leading-snug text-body-subtle">{post.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-[13px] text-placeholder">暂无组队招募</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
