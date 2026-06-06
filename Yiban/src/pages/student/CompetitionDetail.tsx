import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';
import ErrorState from '../../components/ErrorState';
import { PageSkeleton } from '../../components/Skeleton';
import LazyImage from '../../components/LazyImage';
import { pageVariants, pageTransition } from '../../lib/motion';

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
        // 只有有效状态的报名才算"已报名"，审核驳回和退回补充允许重新报名
        const activeStatuses = ['待完善', '已提交', '审核中', '审核通过'];
        const found = list.find((r) => String(r.competitionId) === String(id) && activeStatuses.includes(r.status));
        setRegistration(found || null);
      } catch (err: any) {
        // If 403/401, user is not student — that's fine
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

  if (loading) {
    return <PageSkeleton />;
  }

  if (!comp) {
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
  const isRegistered = Boolean(registration);

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      transition={pageTransition}
      className="py-lg flex flex-col gap-lg"
    >
      <PageHero
        eyebrow="Competition"
        title={comp.name}
        description={`${comp.level} · ${comp.category}类 · ${statusLabel(comp.status)}`}
        prefix={(
          <nav className="flex items-center gap-1 text-[13px] text-ink-muted-48 mb-1">
            <button onClick={() => navigate('/student/competitions')} className="hover:text-ink transition">赛事大厅</button>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-ink-muted-80 truncate">{comp.name}</span>
          </nav>
        )}
        actions={(
          isRegistered ? (
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/student/registrations')}
              className="btn-primary"
            >
              <span className="material-symbols-outlined text-[18px]">assignment</span>
              查看我的报名
            </motion.button>
          ) : (
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => navigate(`/student/registrations/workbench/${comp.id}`)}
              className="btn-primary"
            >
              <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
              立即报名
            </motion.button>
          )
        )}
      />

      {/* Hero */}
      <div className="glass overflow-hidden">
        <div className="h-[280px] md:h-[320px] relative">
          <LazyImage
            className="w-full h-full object-cover"
            src={comp.coverUrl}
            alt={comp.name}
            fallbackIcon="emoji_events"
          />
            <div className="absolute bottom-0 left-0 right-0 p-xl bg-canvas border-t border-hairline">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="chip">{comp.level} · {comp.category}类</span>
              <span className="chip chip-primary">{statusLabel(comp.status)}</span>
              {comp.maxTeamSize ? (
                <span className="chip">最多 {comp.maxTeamSize} 人</span>
              ) : null}
            </div>
            <p className="text-[14px] text-ink-muted-80">
              报名截止：{formatDate(comp.endTime)} · 比赛开始：{formatDate(comp.competitionStart)}
            </p>
          </div>
        </div>
      </div>

      {/* Official link */}
      {comp.sourceUrl && (
        <a
          href={comp.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="glass flex items-center gap-3 px-lg py-md transition hover:bg-canvas-parchment"
        >
          <span className="material-symbols-outlined text-[20px] text-primary">open_in_new</span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-ink">访问赛事官网 / 查看原始公告</p>
            <p className="mt-0.5 truncate text-[12px] text-placeholder">{comp.sourceUrl}</p>
          </div>
          <span className="material-symbols-outlined text-[18px] text-placeholder">arrow_forward</span>
        </a>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Main */}
        <div className="lg:col-span-2 flex flex-col gap-lg">
          <Section icon="description" title="赛事简介">
            <div
              className="text-[17px] leading-[1.6] text-ink-muted-80 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: comp.content
                  ? DOMPurify.sanitize(comp.content)
                  : '<p>本赛事旨在选拔信息技术领域优秀人才，鼓励学生在算法、软件开发、人工智能等方向开展创新实践。</p>'
              }}
            />
          </Section>

          <Section icon="schedule" title="时间节点">
            <ol className="relative pl-7">
              <span className="absolute left-2 top-2 bottom-2 w-px bg-hairline" />
              {[
                { phase: '报名开始', range: formatDate(comp.startTime), desc: '提交个人信息及参赛意向。', state: 'done' },
                { phase: '报名截止', range: formatDate(comp.endTime), desc: '请在此前完成全部报名材料。', state: 'active' },
                { phase: '赛事开始', range: formatDate(comp.competitionStart), desc: '正式比赛阶段启动。', state: 'pending' },
                { phase: '赛事结束', range: formatDate(comp.competitionEnd), desc: '提交最终成果与答辩。', state: 'pending' },
              ].map((it) => (
                <li key={it.phase} className="relative mb-md last:mb-0 pl-md">
                  <span
                    className={`absolute -left-[2px] top-1.5 w-[10px] h-[10px] rounded-full ${
                      it.state === 'done'
                        ? 'bg-primary'
                        : it.state === 'active'
                        ? 'bg-canvas border-2 border-primary'
                        : 'bg-canvas border border-primary/20'
                    }`}
                  />
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span
                      className={`text-[15px] font-semibold ${
                        it.state === 'pending' ? 'text-ink-muted-48' : 'text-ink'
                      }`}
                    >
                      {it.phase}
                    </span>
                    <span className="text-[12px] text-ink-muted-48 tabular-nums">{it.range}</span>
                  </div>
                  <p className="text-[14px] text-ink-muted-80 mt-1">{it.desc}</p>
                </li>
              ))}
            </ol>
          </Section>

          {/* Stages */}
          {Array.isArray(comp.stages) && comp.stages.length > 0 && (
            <Section icon="route" title="赛事阶段">
              <div className="relative pl-7">
                <span className="absolute left-2 top-2 bottom-2 w-px bg-hairline" />
                <div className="flex flex-col gap-4">
                  {comp.stages.map((stage: any) => {
                    const isActive = stage.status === 'active';
                    const isClosed = stage.status === 'closed';
                    return (
                      <div key={stage.id} className="relative pl-md">
                        <span className={`absolute -left-[2px] top-1.5 w-[10px] h-[10px] rounded-full ${
                          isClosed ? 'bg-primary' : isActive ? 'bg-canvas border-2 border-primary ring-4 ring-primary/20' : 'bg-canvas border border-primary/20'
                        }`} />
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className={`text-[15px] font-semibold ${!isClosed && !isActive ? 'text-ink-muted-48' : 'text-ink'}`}>
                            {stage.name}
                          </span>
                          <span className="text-[12px] text-ink-muted-48 tabular-nums">
                            {stage.startTime ? new Date(stage.startTime).toLocaleDateString('zh-CN') : ''}
                            {stage.startTime && stage.endTime ? ' — ' : ''}
                            {stage.endTime ? new Date(stage.endTime).toLocaleDateString('zh-CN') : ''}
                          </span>
                          {isActive && <span className="chip chip-primary !text-[10px]">进行中</span>}
                          {isClosed && <span className="chip chip-success !text-[10px]">已结束</span>}
                        </div>
                        {stage.description && (
                          <p className="text-[14px] text-ink-muted-80 mt-1">{stage.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Section>
          )}

          <Section icon="rule" title="参赛说明">
            <ul className="space-y-2 text-[15px] text-ink-muted-80">
              <li><b className="text-ink">参赛对象：</b>全日制普通高等院校在校学生。</li>
              <li><b className="text-ink">组队要求：</b>每队最多 {comp.maxTeamSize ?? '—'} 人。</li>
              <li><b className="text-ink">赛事级别：</b>{comp.level} · {comp.category} 类。</li>
              <li><b className="text-ink">硬件要求：</b>参赛选手需自备电脑，安装指定版本开发工具。</li>
            </ul>
          </Section>
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-lg lg:sticky lg:top-[68px] lg:h-fit">
          <div className="glass-strong p-lg">
            {registration ? (
              <>
                <span className="chip chip-success mb-3">已报名</span>
                <h3 className="text-[21px] font-semibold tracking-tight mt-2">报名状态</h3>
                <p className="text-[13px] text-ink-muted-48 mt-1">当前状态：{registration.status}</p>
                {registration.teamName && (
                  <p className="text-[13px] text-ink-muted-80 mt-1">队伍：{registration.teamName}</p>
                )}
                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/student/registrations')}
                  className="btn-primary w-full !py-3 !text-[15px] mt-md"
                >
                  <span className="material-symbols-outlined text-[18px]">assignment</span>
                  查看我的报名
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/student/progress')}
                  className="btn-secondary w-full !py-3 !text-[15px] mt-2"
                >
                  <span className="material-symbols-outlined text-[18px]">timeline</span>
                  查看我的进度
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/student/teams')}
                  className="btn-secondary w-full !py-3 !text-[15px] mt-2"
                >
                  <span className="material-symbols-outlined text-[18px]">group_add</span>
                  去组队
                </motion.button>
              </>
            ) : (
              <>
                <span className="chip chip-primary mb-3">报名截止还剩 {daysLeft} 天</span>
                <h3 className="text-[21px] font-semibold tracking-tight mt-2">立即报名</h3>
                <p className="text-[13px] text-ink-muted-48 mt-1">完成报名后将进入工作台</p>

                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(`/student/registrations/workbench/${comp.id}`)}
                  className="btn-primary w-full !py-3 !text-[15px] mt-md"
                >
                  <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                  立即报名
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/student/teams')}
                  className="btn-secondary w-full !py-3 !text-[15px] mt-2"
                >
                  <span className="material-symbols-outlined text-[18px]">group_add</span>
                  去组队
                </motion.button>
              </>
            )}
          </div>

          <div className="glass p-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">group_add</span>
                <h3 className="text-[15px] font-semibold tracking-tight">组队招募</h3>
              </div>
              <button onClick={() => navigate('/student/teams')} className="text-[12px] text-primary hover:text-primary-focus">
                全部 →
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {relatedPosts.length > 0 ? (
                relatedPosts.map((post) => (
                <div key={post.id} className="flex items-start gap-3 p-3 rounded-md bg-canvas-parchment border border-hairline">
                    <div className="w-8 h-8 rounded-full bg-primary/12 text-primary grid place-items-center text-[12px] font-semibold flex-shrink-0">
                      {(post.authorName || '?')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[13px] font-semibold text-ink">{post.authorName}</span>
                        <span className="text-[11px] text-ink-muted-48">{post.competitionName}</span>
                      </div>
                      <p className="text-[13px] text-ink-muted-80 mb-1.5 leading-snug line-clamp-2">{post.content}</p>
                      <button className="text-[12px] text-primary hover:text-primary-focus">联系 TA →</button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-[13px] text-ink-muted-48">暂无组队招募</div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <section className="glass p-xl">
      <h2 className="text-[21px] font-semibold tracking-tight mb-md flex items-center gap-2">
        <span className="material-symbols-outlined text-[20px] text-primary">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
