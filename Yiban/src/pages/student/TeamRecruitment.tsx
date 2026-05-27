import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';
import { useStore } from '../../store/useStore';

type TeamVO = {
  id: number | string;
  authorId: number | string;
  authorName: string;
  competitionId: number | string;
  competitionName: string;
  content: string;
  rolesNeeded?: string[];
  date?: string;
  status?: string;
};

type CompetitionOption = {
  id: number | string;
  name: string;
};

type TeamApplicationVO = {
  id: number | string;
  teamId: number | string;
  applicantId: number | string;
  role: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  createTime?: string;
};

function formatDate(value?: string) {
  if (!value) return '未知日期';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TeamRecruitment() {
  const [teamPosts, setTeamPosts] = useState<TeamVO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [competitionOptions, setCompetitionOptions] = useState<CompetitionOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>('');
  const [sortBy, setSortBy] = useState('最新发布');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ competitionId: '', content: '', rolesNeeded: '' });
  const [creating, setCreating] = useState(false);

  const [contactTarget, setContactTarget] = useState<TeamVO | null>(null);
  const [contactForm, setContactForm] = useState({ title: '', content: '' });
  const [contactSending, setContactSending] = useState(false);

  const [applyTarget, setApplyTarget] = useState<TeamVO | null>(null);
  const [applyForm, setApplyForm] = useState({ role: '', reason: '' });
  const [applySubmitting, setApplySubmitting] = useState(false);

  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  const currentUser = useStore((s) => s.currentUser);

  const [showMyPosts, setShowMyPosts] = useState(false);
  const [applicationsTarget, setApplicationsTarget] = useState<TeamVO | null>(null);
  const [teamApplications, setTeamApplications] = useState<TeamApplicationVO[]>([]);
  const [loadingTeamApps, setLoadingTeamApps] = useState(false);
  const [handlingAppId, setHandlingAppId] = useState<number | string | null>(null);

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedCompetitionId]);

  useEffect(() => {
    fetchCompetitions();
    fetchMyApplications();
  }, []);

  const fetchCompetitions = async () => {
    try {
      const data: any = await apiClient.get('/competition/list', {
        params: { current: 1, size: 50, status: 'published' },
      });
      const records: CompetitionOption[] = Array.isArray(data?.records) ? data.records : Array.isArray(data) ? data : [];
      setCompetitionOptions(records);
    } catch (err) {
      console.error('Failed to load competitions for select', err);
    }
  };

  const fetchMyApplications = async () => {
    try {
      setLoadingApps(true);
      const data: any = await apiClient.get('/team/applications/mine');
      setMyApplications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load my applications', err);
    } finally {
      setLoadingApps(false);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, any> = { current: page, size: pageSize };
      if (selectedCompetitionId) params.competitionId = selectedCompetitionId;
      const data: any = await apiClient.get('/team/list', { params });
      const records: TeamVO[] = Array.isArray(data?.records) ? data.records : Array.isArray(data) ? data : [];
      setTeamPosts(records);
      setTotal(typeof data?.total === 'number' ? data.total : records.length);
    } catch (err: any) {
      setError(err.message || '获取招募列表失败');
      setTeamPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async () => {
    if (!createForm.competitionId || !createForm.content) {
      toast.error('请选择赛事并填写招募内容');
      return;
    }
    try {
      setCreating(true);
      const rolesNeeded = createForm.rolesNeeded
        .split('/')
        .map((r) => r.trim())
        .filter(Boolean);
      await apiClient.post('/team/create', {
        competitionId: Number(createForm.competitionId),
        content: createForm.content,
        rolesNeeded,
      });
      toast.success('发布成功');
      setShowCreateModal(false);
      setCreateForm({ competitionId: '', content: '', rolesNeeded: '' });
      setPage(1);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleContactSend = async () => {
    if (!contactTarget || !contactForm.title || !contactForm.content) {
      toast.error('请填写标题和内容');
      return;
    }
    try {
      setContactSending(true);
      await apiClient.post('/message/send', {
        toUser: Number(contactTarget.authorId),
        title: contactForm.title,
        content: contactForm.content,
      });
      toast.success('消息已发送');
      setContactTarget(null);
      setContactForm({ title: '', content: '' });
    } catch (err: any) {
      toast.error(err.message || '发送失败');
    } finally {
      setContactSending(false);
    }
  };

  const handleApplySubmit = async () => {
    if (!applyTarget || !applyForm.role) {
      toast.error('请填写申请角色');
      return;
    }
    try {
      setApplySubmitting(true);
      await apiClient.post('/team/apply', {
        teamId: Number(applyTarget.id),
        role: applyForm.role,
        reason: applyForm.reason,
      });
      toast.success('申请已提交，等待队长审核');
      setApplyTarget(null);
      setApplyForm({ role: '', reason: '' });
      fetchMyApplications();
    } catch (err: any) {
      toast.error(err.message || '申请失败');
    } finally {
      setApplySubmitting(false);
    }
  };

  const fetchTeamApplications = async (post: TeamVO) => {
    setApplicationsTarget(post);
    setLoadingTeamApps(true);
    try {
      const data: any = await apiClient.get(`/team/applications/${post.id}`);
      setTeamApplications(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message || '获取申请列表失败');
      setTeamApplications([]);
    } finally {
      setLoadingTeamApps(false);
    }
  };

  const handleApplicationAction = async (appId: number | string, status: 'approved' | 'rejected') => {
    try {
      setHandlingAppId(appId);
      await apiClient.post(`/team/application/${appId}/handle`, { status });
      toast.success(status === 'approved' ? '已通过' : '已拒绝');
      setTeamApplications((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, status } : app))
      );
    } catch (err: any) {
      toast.error(err.message || '操作失败');
    } finally {
      setHandlingAppId(null);
    }
  };

  let filtered = teamPosts;
  if (searchQuery) {
    filtered = filtered.filter((post) => {
      const haystack = `${post.content || ''} ${post.competitionName || ''} ${post.authorName || ''}`;
      return haystack.includes(searchQuery);
    });
  }
  if (sortBy === '最新发布') {
    filtered = [...filtered].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  return (
    <div className="py-lg flex flex-col gap-lg">
      {/* Page Header */}
      <PageHero
        eyebrow="Teams"
        title="组队招募中心"
        description="发现优质项目，寻找志同道合的队友。"
        contentClassName="max-w-2xl"
        actions={(
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <span className="material-symbols-outlined text-[18px]">add</span>
            创建招募
          </button>
        )}
      />

      {/* Filter Bar */}
      <div className="glass-tint flex flex-wrap items-center gap-sm px-md py-3">
        <div className="relative flex-1 min-w-[240px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-muted-48">
            search
          </span>
          <input
            className="input-glass h-9 pl-9 text-[14px] !rounded-pill"
            placeholder="搜索赛事、团队或关键字"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-canvas border border-hairline text-[12px] text-ink-muted-80">
          <span className="text-ink-muted-48">赛事</span>
          <select
            className="bg-transparent focus:outline-none font-medium text-ink"
            value={selectedCompetitionId}
            onChange={(e) => { setSelectedCompetitionId(e.target.value); setPage(1); }}
          >
            <option value="">不限</option>
            {competitionOptions.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        {/* Left: Recruitment Cards */}
        <div className="lg:col-span-8 flex flex-col gap-md">
          <div className="flex justify-between items-center">
            <span className="text-[14px] text-ink-muted-80">
              共找到 <strong className="text-primary tabular-nums">{total}</strong> 个招募团队
            </span>
            <div className="flex items-center gap-2 text-[13px] text-ink-muted-48">
              <span>排序</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-primary cursor-pointer focus:outline-none font-medium"
              >
                <option>最新发布</option>
                <option>即将截止</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-section gap-2 text-ink-muted-48">
              <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
              <span className="text-[14px]">加载中…</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-section gap-2 text-primary">
              <span className="material-symbols-outlined text-[32px]">error_outline</span>
              <span className="text-[14px]">{error}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-section gap-2 text-ink-muted-48">
              <span className="material-symbols-outlined text-[32px]">search_off</span>
              <span className="text-[14px]">暂无招募信息</span>
            </div>
          ) : (
            filtered.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
                className="glass p-lg"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-md bg-canvas-parchment border border-hairline text-primary grid place-items-center text-[18px] font-semibold">
                      {(post.authorName || '匿名')[0]}
                    </div>
                    <div>
                      <h3 className="text-[17px] font-semibold text-ink leading-tight">{post.authorName || '匿名用户'} 的队伍</h3>
                      <p className="text-[12px] text-ink-muted-48 mt-0.5">所属赛事 · {post.competitionName}</p>
                    </div>
                  </div>
                  <span className="chip chip-success">{post.status || '招募中'}</span>
                </div>

                <p className="text-[14px] text-ink-muted-80 mb-md leading-relaxed line-clamp-2">{post.content}</p>

                {post.rolesNeeded && post.rolesNeeded.length > 0 && (
                  <div className="flex items-center gap-2 mb-md flex-wrap">
                    <span className="text-[12px] text-ink-muted-48">急缺角色</span>
                    {post.rolesNeeded.map((role) => (
                      <span key={role} className="chip chip-primary">{role}</span>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center pt-3 border-t border-hairline">
                  <div className="flex items-center gap-1.5 text-ink-muted-48 text-[12px]">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    <span>发布于 {formatDate(post.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {String(post.authorId) !== String(currentUser?.id) && (
                      <>
                        <button
                          onClick={() => {
                            setApplyTarget(post);
                            setApplyForm({ role: post.rolesNeeded?.[0] || '', reason: '' });
                          }}
                          className="btn-primary !py-1.5 !px-4 !text-[13px]"
                        >
                          申请加入
                        </button>
                        <button
                          onClick={() => {
                            setContactTarget(post);
                            setContactForm({ title: `关于「${post.competitionName}」组队招募`, content: '' });
                          }}
                          className="btn-secondary !py-1.5 !px-4 !text-[13px]"
                        >
                          联系 TA
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}

          {total > pageSize && (
            <div className="flex justify-center items-center gap-1 pt-md">
              <button
                className="w-9 h-9 grid place-items-center rounded-full hover:bg-primary/6 text-ink-muted-48 disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <span className="px-3 text-[13px] text-ink tabular-nums">{page} / {Math.max(1, Math.ceil(total / pageSize))}</span>
              <button
                className="w-9 h-9 grid place-items-center rounded-full hover:bg-primary/6 text-ink-muted-80 disabled:opacity-40"
                disabled={page >= Math.ceil(total / pageSize)}
                onClick={() => setPage((p) => p + 1)}
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <aside className="lg:col-span-4 flex flex-col gap-md lg:sticky lg:top-[68px] lg:h-fit">
          {/* My Posts - Captain Application Management */}
          {currentUser && (
            <div className="glass p-lg">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[15px] font-semibold text-ink flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">post_add</span>
                  我的帖子
                </h3>
                <button
                  onClick={() => setShowMyPosts(!showMyPosts)}
                  className="text-[12px] text-primary hover:underline"
                >
                  {showMyPosts ? '收起' : '展开'}
                </button>
              </div>
              {showMyPosts && (
                <div className="flex flex-col gap-2">
                  {/* NOTE: 只能过滤当前分页内的帖子，后端暂不支持按 authorId 筛选 */}
                  {teamPosts.filter((p) => String(p.authorId) === String(currentUser.id)).length === 0 ? (
                    <p className="text-[12px] text-ink-muted-48 py-4 text-center">暂无发布的帖子</p>
                  ) : (
                    teamPosts
                      .filter((p) => String(p.authorId) === String(currentUser.id))
                      .map((post) => (
                        <div key={post.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-canvas/50 text-[12px]">
                          <div className="flex-1 min-w-0">
                            <p className="text-ink font-medium truncate">{post.competitionName}</p>
                            <p className="text-ink-muted-48 mt-0.5 truncate">{post.content?.slice(0, 30)}...</p>
                          </div>
                          <button
                            onClick={() => fetchTeamApplications(post)}
                            className="btn-secondary !py-1 !px-2.5 !text-[11px] shrink-0 ml-2"
                          >
                            查看申请
                          </button>
                        </div>
                      ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* My Applications */}
          <div className="glass p-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[15px] font-semibold text-ink flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">history_edu</span>
                我的申请记录
              </h3>
            </div>
            {loadingApps ? (
              <div className="flex justify-center py-4">
                <span className="material-symbols-outlined animate-spin text-[20px] text-ink-muted-48">progress_activity</span>
              </div>
            ) : myApplications.length === 0 ? (
              <p className="text-[12px] text-ink-muted-48 py-4 text-center">暂无申请记录</p>
            ) : (
              <div className="flex flex-col gap-2">
                {myApplications.slice(0, 5).map((app) => (
                  <div key={app.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-canvas/50 text-[12px]">
                    <div className="flex-1 min-w-0">
                      <p className="text-ink font-medium truncate">#{app.teamId} · {app.role}</p>
                      <p className="text-ink-muted-48 mt-0.5">{formatDate(app.createTime)}</p>
                    </div>
                    <span className={`chip !text-[11px] ${
                      app.status === 'approved' ? 'chip-success' :
                      app.status === 'rejected' ? 'chip-error' :
                      'bg-canvas border border-hairline text-ink-muted-80'
                    }`}>
                      {app.status === 'approved' ? '已通过' :
                       app.status === 'rejected' ? '已拒绝' : '审核中'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="glass p-lg">
            <h3 className="text-[15px] font-semibold text-ink flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[18px] text-primary">tips_and_updates</span>
              组队小贴士
            </h3>
            <ul className="flex flex-col gap-2 text-[12px] text-ink-muted-80 leading-relaxed">
              <li>· 招募内容请详细描述项目方向与团队优势。</li>
              <li>· 使用 "/" 分隔多个角色，例如：前端 / UI / 算法。</li>
              <li>· 选择正确的关联赛事，便于其他同学检索到。</li>
            </ul>
          </div>
        </aside>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/12 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="glass-strong w-full max-w-md p-xl"
          >
            <h3 className="text-[24px] font-semibold tracking-tight text-ink mb-md">创建招募</h3>

            <div className="flex flex-col gap-md">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-ink-muted-80">关联赛事</label>
                <select
                  className="input-glass"
                  value={createForm.competitionId}
                  onChange={(e) => setCreateForm({ ...createForm, competitionId: e.target.value })}
                >
                  <option value="">请选择赛事</option>
                  {competitionOptions.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-ink-muted-80">招募描述</label>
                <textarea
                  className="input-glass !h-auto py-2.5 resize-none"
                  rows={4}
                  placeholder="介绍你的团队和项目…"
                  value={createForm.content}
                  onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-ink-muted-80">需要角色（用 / 分隔）</label>
                <input
                  className="input-glass"
                  placeholder="例如：前端开发 / UI 设计"
                  value={createForm.rolesNeeded}
                  onChange={(e) => setCreateForm({ ...createForm, rolesNeeded: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-lg">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleCreateSubmit}
                disabled={creating || !createForm.competitionId || !createForm.content}
                className="btn-primary"
              >
                {creating && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
                发布招募
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Contact TA Modal */}
      {contactTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,102,204,0.12)', backdropFilter: 'blur(4px)' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="glass-strong w-full max-w-md"
            style={{ padding: '32px' }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: '17px' }}>
              <h3 className="text-[20px] font-semibold tracking-tight text-ink">联系 TA</h3>
              <button onClick={() => setContactTarget(null)} className="text-ink-muted-48 hover:text-ink">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p className="text-[13px] text-ink-muted-48" style={{ marginBottom: '17px' }}>
              向 <strong className="text-ink">{contactTarget.authorName}</strong> 发送站内消息
            </p>
            <div className="flex flex-col" style={{ gap: '17px' }}>
              <div className="flex flex-col" style={{ gap: '6px' }}>
                <label className="text-[13px] font-medium text-ink-muted-80">标题</label>
                <input
                  className="input-glass"
                  placeholder="消息标题"
                  value={contactForm.title}
                  onChange={(e) => setContactForm({ ...contactForm, title: e.target.value })}
                />
              </div>
              <div className="flex flex-col" style={{ gap: '6px' }}>
                <label className="text-[13px] font-medium text-ink-muted-80">内容</label>
                <textarea
                  className="input-glass !h-auto py-2.5 resize-none"
                  rows={4}
                  placeholder="介绍一下自己，表达合作意向…"
                  value={contactForm.content}
                  onChange={(e) => setContactForm({ ...contactForm, content: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end" style={{ gap: '8px', marginTop: '24px' }}>
              <button onClick={() => setContactTarget(null)} className="btn-secondary">取消</button>
              <button
                onClick={handleContactSend}
                disabled={contactSending || !contactForm.title || !contactForm.content}
                className="btn-primary"
              >
                {contactSending && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
                发送消息
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Apply to Join Modal */}
      {applyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,102,204,0.12)', backdropFilter: 'blur(4px)' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="glass-strong w-full max-w-md"
            style={{ padding: '32px' }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: '17px' }}>
              <h3 className="text-[20px] font-semibold tracking-tight text-ink">申请加入</h3>
              <button onClick={() => setApplyTarget(null)} className="text-ink-muted-48 hover:text-ink">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p className="text-[13px] text-ink-muted-48" style={{ marginBottom: '17px' }}>
              申请加入 <strong className="text-ink">{applyTarget.authorName}</strong> 的队伍（{applyTarget.competitionName}）
            </p>
            <div className="flex flex-col" style={{ gap: '17px' }}>
              <div className="flex flex-col" style={{ gap: '6px' }}>
                <label className="text-[13px] font-medium text-ink-muted-80">申请角色</label>
                {applyTarget.rolesNeeded && applyTarget.rolesNeeded.length > 0 ? (
                  <div className="flex flex-wrap" style={{ gap: '8px' }}>
                    {applyTarget.rolesNeeded.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setApplyForm({ ...applyForm, role })}
                        className={`chip cursor-pointer ${applyForm.role === role ? 'chip-primary' : ''}`}
                        style={applyForm.role !== role ? { background: 'var(--color-canvas)', borderColor: 'var(--color-hairline)', color: 'var(--color-ink-muted-80)' } : {}}
                      >
                        {role}
                      </button>
                    ))}
                    <input
                      className="input-glass !h-8 !text-[13px] flex-1 min-w-[120px]"
                      placeholder="自定义角色"
                      value={applyTarget.rolesNeeded.includes(applyForm.role) ? '' : applyForm.role}
                      onChange={(e) => setApplyForm({ ...applyForm, role: e.target.value })}
                    />
                  </div>
                ) : (
                  <input
                    className="input-glass"
                    placeholder="例如：前端开发"
                    value={applyForm.role}
                    onChange={(e) => setApplyForm({ ...applyForm, role: e.target.value })}
                  />
                )}
              </div>
              <div className="flex flex-col" style={{ gap: '6px' }}>
                <label className="text-[13px] font-medium text-ink-muted-80">申请理由（选填）</label>
                <textarea
                  className="input-glass !h-auto py-2.5 resize-none"
                  rows={3}
                  placeholder="简单介绍自己的技能和经验…"
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end" style={{ gap: '8px', marginTop: '24px' }}>
              <button onClick={() => setApplyTarget(null)} className="btn-secondary">取消</button>
              <button
                onClick={handleApplySubmit}
                disabled={applySubmitting || !applyForm.role}
                className="btn-primary"
              >
                {applySubmitting && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
                提交申请
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Applications Management Modal (Captain) */}
      {applicationsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,102,204,0.12)', backdropFilter: 'blur(4px)' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="glass-strong w-full max-w-lg max-h-[80vh] flex flex-col"
            style={{ padding: '32px' }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: '17px' }}>
              <h3 className="text-[20px] font-semibold tracking-tight text-ink">申请管理</h3>
              <button onClick={() => { setApplicationsTarget(null); setTeamApplications([]); }} className="text-ink-muted-48 hover:text-ink">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p className="text-[13px] text-ink-muted-48" style={{ marginBottom: '17px' }}>
              帖子：<strong className="text-ink">{applicationsTarget.competitionName}</strong>
              <span className="ml-2 text-ink-muted-48">{applicationsTarget.content?.slice(0, 40)}...</span>
            </p>

            <div className="flex-1 overflow-y-auto" style={{ minHeight: '120px' }}>
              {loadingTeamApps ? (
                <div className="flex justify-center py-8">
                  <span className="material-symbols-outlined animate-spin text-[24px] text-ink-muted-48">progress_activity</span>
                </div>
              ) : teamApplications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-ink-muted-48">
                  <span className="material-symbols-outlined text-[28px]">inbox</span>
                  <span className="text-[13px]">暂无申请</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {teamApplications.map((app) => (
                    <div key={app.id} className="rounded-lg bg-canvas/50 border border-hairline p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-canvas-parchment border border-hairline text-primary grid place-items-center text-[13px] font-semibold">
                            {String(app.applicantId).slice(-2)}
                          </div>
                          <div>
                            <p className="text-[13px] font-medium text-ink">用户 #{app.applicantId}</p>
                            <p className="text-[11px] text-ink-muted-48">{formatDate(app.createTime)}</p>
                          </div>
                        </div>
                        <span className={`chip !text-[11px] ${
                          app.status === 'approved' ? 'chip-success' :
                          app.status === 'rejected' ? 'chip-error' :
                          'bg-canvas border border-hairline text-ink-muted-80'
                        }`}>
                          {app.status === 'approved' ? '已通过' :
                           app.status === 'rejected' ? '已拒绝' : '待审核'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[12px] text-ink-muted-48">申请角色</span>
                        <span className="chip chip-primary !text-[11px]">{app.role}</span>
                      </div>
                      {app.reason && (
                        <p className="text-[12px] text-ink-muted-80 mb-3 leading-relaxed">{app.reason}</p>
                      )}
                      {app.status === 'pending' && (
                        <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
                          <button
                            onClick={() => handleApplicationAction(app.id, 'rejected')}
                            disabled={handlingAppId === app.id}
                            className="btn-secondary !py-1 !px-3 !text-[12px]"
                          >
                            {handlingAppId === app.id ? (
                              <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
                            ) : '拒绝'}
                          </button>
                          <button
                            onClick={() => handleApplicationAction(app.id, 'approved')}
                            disabled={handlingAppId === app.id}
                            className="btn-primary !py-1 !px-3 !text-[12px]"
                          >
                            {handlingAppId === app.id ? (
                              <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
                            ) : '通过'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end" style={{ marginTop: '17px' }}>
              <button onClick={() => { setApplicationsTarget(null); setTeamApplications([]); }} className="btn-secondary">关闭</button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
