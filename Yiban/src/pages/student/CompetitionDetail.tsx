import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';

/** Strip dangerous HTML tags while keeping safe formatting */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

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
  content?: string;
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
      } catch (err) {
        console.error('Failed to load competition', err);
        setComp(null);
      } finally {
        setLoading(false);
      }
      try {
        const regs: any = await apiClient.get('/registration/my');
        const list: Registration[] = Array.isArray(regs) ? regs : [];
        const found = list.find((r) => String(r.competitionId) === String(id));
        setRegistration(found || null);
      } catch (err) {
        // currentUser may not be logged in as student, ignore
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
    return (
      <div className="py-section text-center text-ink-muted-48">
        <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
        <p className="mt-2 text-[14px]">加载中…</p>
      </div>
    );
  }

  if (!comp) {
    return (
      <div className="py-section text-center">
        <span className="material-symbols-outlined text-[40px] text-ink-muted-48">search_off</span>
        <p className="mt-3 text-[15px] text-ink-muted-80">赛事不存在</p>
        <button onClick={() => navigate('/student/competitions')} className="btn-primary mt-lg">返回大厅</button>
      </div>
    );
  }

  const deadline = comp.endTime ? new Date(comp.endTime) : null;
  const daysLeft = deadline ? Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
  const isRegistered = Boolean(registration);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="py-lg flex flex-col gap-lg"
    >
      <PageHero
        eyebrow="Competition"
        title={comp.name}
        description={`${comp.level} · ${comp.category}类 · ${statusLabel(comp.status)}`}
        titleClassName="text-[30px] sm:text-[34px]"
        prefix={(
          <nav className="flex items-center gap-1 text-[13px] text-ink-muted-48 mb-1">
            <button onClick={() => navigate('/student/competitions')} className="hover:text-ink transition">赛事大厅</button>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-ink-muted-80 truncate">{comp.name}</span>
          </nav>
        )}
        actions={(
          isRegistered ? (
            <button
              onClick={() => navigate('/student/registrations')}
              className="btn-primary"
            >
              <span className="material-symbols-outlined text-[18px]">assignment</span>
              查看我的报名
            </button>
          ) : (
            <button
              onClick={() => navigate(`/student/registrations/workbench/${comp.id}`)}
              className="btn-primary"
            >
              <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
              立即报名
            </button>
          )
        )}
      />

      {/* Hero */}
      <div className="glass overflow-hidden">
        <div className="h-[280px] md:h-[320px] relative">
          {comp.coverUrl && (
            <img
              className="w-full h-full object-cover"
              src={comp.coverUrl}
              alt={comp.name}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'grid';
              }}
            />
          )}
          <div className="w-full h-full bg-canvas-parchment grid place-items-center" style={comp.coverUrl ? { display: 'none' } : undefined}>
            <span className="material-symbols-outlined text-[120px] text-primary/50 icon-fill">emoji_events</span>
          </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Main */}
        <div className="lg:col-span-2 flex flex-col gap-lg">
          <Section icon="description" title="赛事简介">
            <div
              className="text-[17px] leading-[1.6] text-ink-muted-80 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: comp.content
                  ? sanitizeHtml(comp.content)
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
                <button
                  onClick={() => navigate('/student/registrations')}
                  className="btn-primary w-full !py-3 !text-[15px] mt-md"
                >
                  <span className="material-symbols-outlined text-[18px]">assignment</span>
                  查看我的报名
                </button>
                <button
                  onClick={() => navigate('/student/teams')}
                  className="btn-secondary w-full !py-3 !text-[15px] mt-2"
                >
                  <span className="material-symbols-outlined text-[18px]">group_add</span>
                  去组队
                </button>
              </>
            ) : (
              <>
                <span className="chip chip-primary mb-3">报名截止还剩 {daysLeft} 天</span>
                <h3 className="text-[21px] font-semibold tracking-tight mt-2">立即报名</h3>
                <p className="text-[13px] text-ink-muted-48 mt-1">完成报名后将进入工作台</p>

                <button
                  onClick={() => navigate(`/student/registrations/workbench/${comp.id}`)}
                  className="btn-primary w-full !py-3 !text-[15px] mt-md"
                >
                  <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                  立即报名
                </button>
                <button
                  onClick={() => navigate('/student/teams')}
                  className="btn-secondary w-full !py-3 !text-[15px] mt-2"
                >
                  <span className="material-symbols-outlined text-[18px]">group_add</span>
                  去组队
                </button>
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
