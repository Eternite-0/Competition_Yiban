import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';
import Pagination from '../../components/Pagination';
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
    const prevStatus = teamApplications.find((app) => app.id === appId)?.status;
    try {
      setHandlingAppId(appId);
      setTeamApplications((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, status } : app))
      );
      await apiClient.post(`/team/application/${appId}/handle`, { status });
      toast.success(status === 'approved' ? '已通过' : '已拒绝');
    } catch (err: any) {
      toast.error(err.message || '操作失败');
      setTeamApplications((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, status: prevStatus as TeamApplicationVO['status'] } : app))
      );
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
    <div className="page-stack">
      <PageHero
        eyebrow="组队"
        title="组队招募中心"
        description="发现优质项目，寻找志同道合的队友。"
        actions={(
          <button type="button" onClick={() => setShowCreateModal(true)} className="btn-primary">
            创建招募
          </button>
        )}
      />

      <section className="rounded-xl border border-hairline bg-canvas p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative min-w-0 flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-placeholder">
                search
              </span>
              <input
                className="input-glass h-9 pl-9 text-subhead"
                placeholder="搜索招募内容、队伍或关键字"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-footnote text-body-muted">
                <span className="shrink-0">按赛事筛选</span>
                <select
                  className="input-glass h-9 min-w-[200px] max-w-[320px] text-footnote"
                  value={selectedCompetitionId}
                  onChange={(e) => { setSelectedCompetitionId(e.target.value); setPage(1); }}
                >
                  <option value="">全部赛事</option>
                  {competitionOptions.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input-glass h-9 w-auto text-footnote"
              >
                <option>最新发布</option>
                <option>即将截止</option>
              </select>
            </div>
          </div>
          {competitionOptions.length > 0 && (
            <div className="flex min-w-0 items-center gap-2 border-t border-hairline pt-3">
              <span className="shrink-0 text-caption text-placeholder">快捷筛选</span>
              <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => { setSelectedCompetitionId(''); setPage(1); }}
                  className={`chip shrink-0 ${selectedCompetitionId === '' ? 'chip-primary' : ''}`}
                >
                  全部
                </button>
                {competitionOptions.slice(0, 12).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.name}
                    onClick={() => { setSelectedCompetitionId(String(c.id)); setPage(1); }}
                    className={`chip max-w-[10rem] shrink-0 truncate ${selectedCompetitionId === String(c.id) ? 'chip-primary' : ''}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {selectedCompetitionId ? (
            <p className="text-caption text-body-subtle">
              当前筛选：
              <span className="font-medium text-ink">
                {competitionOptions.find((c) => String(c.id) === selectedCompetitionId)?.name || '指定赛事'}
              </span>
              <button
                type="button"
                className="ml-2 text-primary hover:underline"
                onClick={() => { setSelectedCompetitionId(''); setPage(1); }}
              >
                清除
              </button>
            </p>
          ) : null}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_260px]">
        <section className="page-section min-w-0">
          <div className="page-section-head">
            <h2 className="page-section-title">招募列表</h2>
            <span className="page-section-extra">共 {total} 个团队</span>
          </div>

          {loading ? (
            <p className="py-10 text-center text-footnote text-placeholder">加载中…</p>
          ) : error ? (
            <p className="py-10 text-center text-footnote text-error">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-footnote text-placeholder">暂无招募信息</p>
          ) : (
            <div className="flat-list">
              {filtered.map((post) => (
                <article key={post.id} className="flat-row !items-start flex-col gap-2 py-4 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-subhead font-medium text-ink">{post.authorName || '匿名用户'} 的队伍</h3>
                      <span className="chip chip-success">{post.status || '招募中'}</span>
                    </div>
                    <p className="mt-0.5 text-caption text-placeholder">
                      {post.competitionName} · 发布于 {formatDate(post.date)}
                    </p>
                    <p className="mt-2 line-clamp-2 text-footnote leading-relaxed text-body-subtle">{post.content}</p>
                    {post.rolesNeeded && post.rolesNeeded.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {post.rolesNeeded.map((role) => (
                          <span key={role} className="chip chip-primary">{role}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {String(post.authorId) !== String(currentUser?.id) ? (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setApplyTarget(post);
                          setApplyForm({ role: post.rolesNeeded?.[0] || '', reason: '' });
                        }}
                        className="btn-primary !h-9"
                      >
                        申请加入
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setContactTarget(post);
                          setContactForm({ title: `关于「${post.competitionName}」组队招募`, content: '' });
                        }}
                        className="btn-secondary !h-9"
                      >
                        联系 TA
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}

          <Pagination current={page} total={total} pageSize={pageSize} onChange={setPage} />
        </section>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
          {currentUser ? (
            <section className="page-section">
              <div className="page-section-head">
                <h3 className="page-section-title">我的帖子</h3>
                <button
                  type="button"
                  onClick={() => setShowMyPosts(!showMyPosts)}
                  className="page-section-extra hover:text-primary"
                >
                  {showMyPosts ? '收起' : '展开'}
                </button>
              </div>
              {showMyPosts ? (
                teamPosts.filter((p) => String(p.authorId) === String(currentUser.id)).length === 0 ? (
                  <p className="py-4 text-caption text-placeholder">暂无发布的帖子</p>
                ) : (
                  <div className="flat-list">
                    {teamPosts
                      .filter((p) => String(p.authorId) === String(currentUser.id))
                      .map((post) => (
                        <div key={post.id} className="flat-row !items-start">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-footnote font-medium text-ink">{post.competitionName}</p>
                            <p className="mt-0.5 truncate text-caption text-placeholder">{post.content?.slice(0, 30)}...</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => fetchTeamApplications(post)}
                            className="btn-secondary !h-8 shrink-0 !px-2 !text-caption"
                          >
                            申请
                          </button>
                        </div>
                      ))}
                  </div>
                )
              ) : null}
            </section>
          ) : null}

          <section className="page-section">
            <div className="page-section-head">
              <h3 className="page-section-title">我的申请</h3>
            </div>
            {loadingApps ? (
              <p className="py-4 text-caption text-placeholder">加载中…</p>
            ) : myApplications.length === 0 ? (
              <p className="py-4 text-caption text-placeholder">暂无申请记录</p>
            ) : (
              <div className="flat-list">
                {myApplications.slice(0, 5).map((app) => (
                  <div key={app.id} className="flat-row">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-footnote font-medium text-ink">#{app.teamId} · {app.role}</p>
                      <p className="mt-0.5 text-caption text-placeholder">{formatDate(app.createTime)}</p>
                    </div>
                    <span className={`chip !text-caption-2 ${
                      app.status === 'approved' ? 'chip-success' :
                      app.status === 'rejected' ? 'chip-error' : ''
                    }`}>
                      {app.status === 'approved' ? '已通过' :
                       app.status === 'rejected' ? '已拒绝' : '审核中'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="page-section">
            <div className="page-section-head">
              <h3 className="page-section-title">组队小贴士</h3>
            </div>
            <ul className="flex flex-col gap-1.5 text-caption leading-relaxed text-body-subtle">
              <li>· 招募内容请详细描述项目方向与团队优势。</li>
              <li>· 使用 "/" 分隔多个角色，例如：前端 / UI / 算法。</li>
              <li>· 选择正确的关联赛事，便于其他同学检索到。</li>
            </ul>
          </section>
        </aside>
      </div>

      {showCreateModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal="true" aria-label="创建招募">
          <div className="w-full max-w-md rounded-lg border border-hairline bg-canvas p-5 shadow-lg">
            <h3 className="mb-4 border-b border-hairline pb-3 text-subhead font-medium text-ink">创建招募</h3>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-footnote font-medium text-body-subtle">关联赛事</label>
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
                <label className="text-footnote font-medium text-body-subtle">招募描述</label>
                <textarea
                  className="input-glass !h-auto resize-none py-2.5"
                  rows={4}
                  placeholder="介绍你的团队和项目…"
                  value={createForm.content}
                  onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-footnote font-medium text-body-subtle">需要角色（用 / 分隔）</label>
                <input
                  className="input-glass"
                  placeholder="例如：前端开发 / UI 设计"
                  value={createForm.rolesNeeded}
                  onChange={(e) => setCreateForm({ ...createForm, rolesNeeded: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-hairline pt-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">取消</button>
                <button
                  type="button"
                  onClick={handleCreateSubmit}
                  disabled={creating || !createForm.competitionId || !createForm.content}
                  className="btn-primary"
                >
                  {creating && <span className="material-symbols-outlined animate-spin">progress_activity</span>}
                  发布招募
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {contactTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal="true" aria-label="联系 TA">
          <div className="w-full max-w-[32rem] rounded-lg border border-hairline bg-canvas p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between border-b border-hairline pb-3">
              <h3 className="text-subhead font-medium text-ink">联系 TA</h3>
              <button type="button" onClick={() => setContactTarget(null)} className="icon-button !h-8 !w-8" aria-label="关闭">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <p className="text-footnote text-placeholder">
                向 <strong className="text-ink">{contactTarget.authorName}</strong> 发送站内消息
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="text-footnote font-medium text-body-subtle">标题</label>
                <input
                  className="input-glass"
                  placeholder="消息标题"
                  value={contactForm.title}
                  onChange={(e) => setContactForm({ ...contactForm, title: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-footnote font-medium text-body-subtle">内容</label>
                <textarea
                  className="input-glass !h-auto resize-none py-2.5"
                  rows={5}
                  placeholder="介绍一下自己，表达合作意向…"
                  value={contactForm.content}
                  onChange={(e) => setContactForm({ ...contactForm, content: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-hairline pt-3">
                <button type="button" onClick={() => setContactTarget(null)} className="btn-secondary">取消</button>
                <button
                  type="button"
                  onClick={handleContactSend}
                  disabled={contactSending || !contactForm.title || !contactForm.content}
                  className="btn-primary"
                >
                  {contactSending && <span className="material-symbols-outlined animate-spin">progress_activity</span>}
                  发送消息
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {applyTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal="true" aria-label="申请加入">
          <div className="w-full max-w-[32rem] rounded-lg border border-hairline bg-canvas p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between border-b border-hairline pb-3">
              <h3 className="text-subhead font-medium text-ink">申请加入</h3>
              <button type="button" onClick={() => setApplyTarget(null)} className="icon-button !h-8 !w-8" aria-label="关闭">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <p className="text-footnote text-placeholder">
                申请加入 <strong className="text-ink">{applyTarget.authorName}</strong> 的队伍（{applyTarget.competitionName}）
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="text-footnote font-medium text-body-subtle">申请角色</label>
                {applyTarget.rolesNeeded && applyTarget.rolesNeeded.length > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {applyTarget.rolesNeeded.map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setApplyForm({ ...applyForm, role })}
                          className={`chip cursor-pointer ${applyForm.role === role ? 'chip-primary' : ''}`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                    <input
                      className="input-glass mt-1 text-footnote"
                      placeholder="或输入自定义角色"
                      value={applyTarget.rolesNeeded.includes(applyForm.role) ? '' : applyForm.role}
                      onChange={(e) => setApplyForm({ ...applyForm, role: e.target.value })}
                    />
                  </>
                ) : (
                  <input
                    className="input-glass"
                    placeholder="例如：前端开发"
                    value={applyForm.role}
                    onChange={(e) => setApplyForm({ ...applyForm, role: e.target.value })}
                  />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-footnote font-medium text-body-subtle">申请理由（选填）</label>
                <textarea
                  className="input-glass !h-auto resize-none py-2.5"
                  rows={4}
                  placeholder="简单介绍自己的技能和经验…"
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-hairline pt-3">
                <button type="button" onClick={() => setApplyTarget(null)} className="btn-secondary">取消</button>
                <button
                  type="button"
                  onClick={handleApplySubmit}
                  disabled={applySubmitting || !applyForm.role}
                  className="btn-primary"
                >
                  {applySubmitting && <span className="material-symbols-outlined animate-spin">progress_activity</span>}
                  提交申请
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {applicationsTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal="true" aria-label="申请管理">
          <div className="flex max-h-[80vh] w-full max-w-[32rem] flex-col rounded-lg border border-hairline bg-canvas p-5 shadow-lg">
            <div className="mb-3 flex items-center justify-between border-b border-hairline pb-3">
              <h3 className="text-subhead font-medium text-ink">申请管理</h3>
              <button
                type="button"
                onClick={() => { setApplicationsTarget(null); setTeamApplications([]); }}
                className="icon-button !h-8 !w-8"
                aria-label="关闭"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
              <p className="text-footnote text-placeholder">
                帖子：<strong className="text-ink">{applicationsTarget.competitionName}</strong>
                <span className="ml-2">{applicationsTarget.content?.slice(0, 40)}...</span>
              </p>
              <div className="min-h-[120px] flex-1 overflow-y-auto">
                {loadingTeamApps ? (
                  <p className="py-8 text-center text-footnote text-placeholder">加载中…</p>
                ) : teamApplications.length === 0 ? (
                  <p className="py-8 text-center text-footnote text-placeholder">暂无申请</p>
                ) : (
                  <div className="flat-list">
                    {teamApplications.map((app) => (
                      <div key={app.id} className="border-b border-hairline py-3 last:border-b-0">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div>
                            <p className="text-footnote font-medium text-ink">用户 #{app.applicantId}</p>
                            <p className="text-caption-2 text-placeholder">{formatDate(app.createTime)}</p>
                          </div>
                          <span className={`chip !text-caption-2 ${
                            app.status === 'approved' ? 'chip-success' :
                            app.status === 'rejected' ? 'chip-error' : ''
                          }`}>
                            {app.status === 'approved' ? '已通过' :
                             app.status === 'rejected' ? '已拒绝' : '待审核'}
                          </span>
                        </div>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-caption text-placeholder">申请角色</span>
                          <span className="chip chip-primary !text-caption-2">{app.role}</span>
                        </div>
                        {app.reason && (
                          <p className="mb-3 text-caption leading-relaxed text-body-subtle">{app.reason}</p>
                        )}
                        {app.status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleApplicationAction(app.id, 'rejected')}
                              disabled={handlingAppId === app.id}
                              className="btn-secondary !h-8"
                            >
                              拒绝
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplicationAction(app.id, 'approved')}
                              disabled={handlingAppId === app.id}
                              className="btn-primary !h-8"
                            >
                              通过
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end border-t border-hairline pt-3">
                <button
                  type="button"
                  onClick={() => { setApplicationsTarget(null); setTeamApplications([]); }}
                  className="btn-secondary"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
