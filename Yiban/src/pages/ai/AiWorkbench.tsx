import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useStore } from '../../store/useStore';
import PageHero from '../../components/PageHero';
import ProgressBar from '../../components/ProgressBar';
import apiClient from '../../api/client';
import {
  getAdminAiAnalytics,
  getAiRecommendations,
  getAiTeamMatches,
  getTeacherAiCockpit,
  precheckAiMaterials,
  type AiAdminAnalyticsResponse,
  type AiPrecheckResponse,
  type AiRecommendation,
  type AiTeamMatchesResponse,
  type AiTeacherCockpitResponse,
} from '../../api/aiFeatures';

type CompetitionOption = { id: number | string; name: string; maxTeamSize?: number; endTime?: string };

export default function AiWorkbench() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useStore((s) => s.currentUser);
  const role = user?.role ?? 'student';
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([]);
  const [profile, setProfile] = useState<Record<string, unknown>>({});
  const [competitions, setCompetitions] = useState<CompetitionOption[]>([]);
  const [precheck, setPrecheck] = useState<AiPrecheckResponse | null>(null);
  const [teamMatches, setTeamMatches] = useState<AiTeamMatchesResponse | null>(null);
  const [teacherData, setTeacherData] = useState<AiTeacherCockpitResponse | null>(null);
  const [adminData, setAdminData] = useState<AiAdminAnalyticsResponse | null>(null);
  const [selectedCompetition, setSelectedCompetition] = useState('');
  const [desiredRole, setDesiredRole] = useState('UI 设计');
  const [projectName, setProjectName] = useState('');
  const [mentorName, setMentorName] = useState('');
  const [teamMemberCount, setTeamMemberCount] = useState('2');
  const [attachments, setAttachments] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        if (role === 'student') {
          const [result, compPage] = await Promise.all([
            getAiRecommendations(),
            apiClient.get('/competition/list', { params: { current: 1, size: 30, status: 'published' } }),
          ]);
          if (cancelled) return;
          setRecommendations(result.recommendations ?? []);
          setProfile(result.profile ?? {});
          const rawCompPage = compPage as any;
          const records = Array.isArray(rawCompPage?.records) ? rawCompPage.records : [];
          setCompetitions(records);
          const requestedCompetition = searchParams.get('competitionId');
          if (requestedCompetition && records.some((item: CompetitionOption) => String(item.id) === requestedCompetition)) {
            setSelectedCompetition(requestedCompetition);
          } else if (result.recommendations?.[0]) setSelectedCompetition(String(result.recommendations[0].competitionId));
        } else if (role === 'teacher') {
          setTeacherData(await getTeacherAiCockpit());
        } else {
          setAdminData(await getAdminAiAnalytics());
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'AI 工作台加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [role]);

  const selectedOption = useMemo(() => competitions.find((item) => String(item.id) === selectedCompetition), [competitions, selectedCompetition]);

  async function handlePrecheck() {
    if (!selectedCompetition) return toast.error('请先选择赛事');
    try {
      const result = await precheckAiMaterials(selectedCompetition, {
        projectName,
        mentorName,
        teamMemberCount: Number(teamMemberCount) || 1,
        attachments: attachments.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean),
      });
      setPrecheck(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '材料预检失败');
    }
  }

  async function handleTeamMatch() {
    if (!selectedCompetition) return toast.error('请先选择赛事');
    try {
      setTeamMatches(await getAiTeamMatches(selectedCompetition, desiredRole));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '队友匹配失败');
    }
  }

  if (loading) {
    return <div className="page-stack"><PageHero eyebrow="AI 智能工作台" title="正在分析你的赛事数据…" description="AI 正在读取可见的业务数据并生成建议。" /><div className="section-card h-48 animate-pulse" /></div>;
  }

  if (role === 'teacher') return <TeacherCockpit data={teacherData} navigate={navigate} />;
  if (role === 'admin') return <AdminAnalytics data={adminData} />;

  return (
    <div className="page-stack">
      <PageHero eyebrow="AI 智能工作台" title="让赛事主动找到你" description="基于专业、年级、历史参赛和报名状态，给出可解释的赛事建议。" />
      <section className="ai-feature-banner">
        <div className="ai-feature-banner-icon"><span className="material-symbols-outlined">auto_awesome</span></div>
        <div className="min-w-0 flex-1"><h2>你的参赛画像</h2><p>{String(profile.major || '专业信息待完善')} · {String(profile.grade || '年级待完善')} · 已沉淀 {String(profile.historyCount || 0)} 次参赛记录</p></div>
        <button className="btn-secondary" type="button" onClick={() => navigate('/student/growth')}>查看成长档案</button>
      </section>

      <section className="section-card">
        <div className="section-card-header"><div><h2 className="section-card-title">个性化赛事推荐</h2><p className="mt-1 text-caption text-body-subtle">推荐理由来自真实赛事和你的参赛历史，不只按截止时间排序。</p></div><span className="chip chip-primary">AI 匹配</span></div>
        <div className="section-card-body grid gap-3 lg:grid-cols-2">
          {recommendations.length === 0 ? <p className="py-6 text-footnote text-placeholder">暂时没有找到开放中的推荐赛事。</p> : recommendations.map((item) => (
            <article key={item.competitionId} className="ai-recommendation-card">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-subhead font-semibold text-ink">{item.name}</h3><p className="mt-1 text-caption text-body-subtle">{item.level || '赛事'} · {item.category || '综合方向'} {item.daysLeft != null ? `· 距截止 ${item.daysLeft} 天` : ''}</p></div><div className="ai-score"><strong>{item.fitScore}</strong><span>匹配度</span></div></div>
              <div className="mt-3 space-y-1.5">{item.reasons.map((reason) => <p key={reason} className="flex gap-2 text-caption text-body-muted"><span className="text-primary">✓</span>{reason}</p>)}</div>
              <div className="mt-4 flex gap-2"><button type="button" className="btn-secondary !h-8 !px-3 text-caption" onClick={() => navigate(`/student/competitions/${item.competitionId}`)}>查看详情</button><button type="button" className="btn-primary !h-8 !px-3 text-caption" onClick={() => navigate(`/student/registrations/workbench/${item.competitionId}`)}>立即报名</button></div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <section className="section-card"><div className="section-card-header"><div><h2 className="section-card-title">AI 材料预检</h2><p className="mt-1 text-caption text-body-subtle">提交前主动发现缺项，减少反复退回。</p></div><span className="material-symbols-outlined text-primary">fact_check</span></div><div className="section-card-body space-y-3">
          <select className="input-glass" value={selectedCompetition} onChange={(event) => setSelectedCompetition(event.target.value)}><option value="">选择要预检的赛事</option>{competitions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <div className="grid gap-3 sm:grid-cols-2"><input className="input-glass" placeholder="作品名称" value={projectName} onChange={(event) => setProjectName(event.target.value)} /><input className="input-glass" placeholder="指导教师" value={mentorName} onChange={(event) => setMentorName(event.target.value)} /></div>
          <div className="grid gap-3 sm:grid-cols-2"><input className="input-glass" type="number" min="1" placeholder="团队人数" value={teamMemberCount} onChange={(event) => setTeamMemberCount(event.target.value)} /><input className="input-glass" placeholder="附件文件名，用逗号分隔" value={attachments} onChange={(event) => setAttachments(event.target.value)} /></div>
          <button type="button" className="btn-primary w-full" onClick={() => void handlePrecheck()}><span className="material-symbols-outlined text-[17px]">rule</span>开始材料预检</button>
          {precheck ? <PrecheckResult result={precheck} /> : null}
        </div></section>

        <section className="section-card"><div className="section-card-header"><div><h2 className="section-card-title">AI 智能组队</h2><p className="mt-1 text-caption text-body-subtle">不只推荐赛事，也推荐一起参赛的人。</p></div><span className="material-symbols-outlined text-primary">group_add</span></div><div className="section-card-body space-y-3">
          <select className="input-glass" value={selectedCompetition} onChange={(event) => setSelectedCompetition(event.target.value)}><option value="">选择意向赛事</option>{competitions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <input className="input-glass" value={desiredRole} onChange={(event) => setDesiredRole(event.target.value)} placeholder="想找什么技能？如 UI 设计 / 后端开发" />
          <button type="button" className="btn-secondary w-full" onClick={() => void handleTeamMatch()}><span className="material-symbols-outlined text-[17px]">person_search</span>匹配队友</button>
          {teamMatches ? <TeamMatchResult result={teamMatches} /> : <div className="rounded-[12px] bg-surface-tile-1 px-3 py-3 text-caption text-body-subtle">输入技能方向后，AI 会优先匹配技能互补且尚未加入该赛事的同学。</div>}
        </div></section>
      </section>
      {selectedOption ? <p className="text-caption text-placeholder">当前选择：{selectedOption.name}。AI 结果仅作辅助，报名和组队仍需本人确认。</p> : null}
    </div>
  );
}

function PrecheckResult({ result }: { result: AiPrecheckResponse }) {
  return <div className="rounded-[14px] border border-border bg-canvas p-3"><div className="flex items-center justify-between"><span className="text-footnote font-medium text-ink">材料完整度</span><strong className={result.completeness >= 80 ? 'text-primary' : 'text-warning'}>{result.completeness}%</strong></div><ProgressBar value={result.completeness} size="sm" instant /><div className="mt-3 space-y-2">{result.issues.length === 0 ? <p className="text-caption text-primary">未发现关键问题，可以进入人工确认提交。</p> : result.issues.map((issue) => <div key={issue.code} className="flex gap-2 text-caption"><span className="mt-0.5 text-warning">!</span><div><strong className="text-ink">{issue.title}</strong><p className="text-body-subtle">{issue.detail}</p></div></div>)}</div></div>;
}

function TeamMatchResult({ result }: { result: AiTeamMatchesResponse }) {
  return <div className="space-y-2">{result.matches.length === 0 ? <div className="rounded-[12px] bg-surface-tile-1 px-3 py-3 text-caption text-body-subtle">暂无符合条件的公开招募，可以先发布自己的组队需求。</div> : result.matches.slice(0, 4).map((match) => <div key={match.postId} className="rounded-[12px] border border-border bg-canvas px-3 py-2.5"><div className="flex items-center justify-between gap-2"><div><strong className="text-footnote text-ink">{match.studentName || '同学'}</strong><span className="ml-2 text-caption text-body-subtle">{match.major || '跨专业'}</span></div><span className="chip chip-primary">{match.matchScore}% 匹配</span></div><p className="mt-1 text-caption text-body-muted">{(match.skillTags || []).join(' / ') || match.matchReason}</p></div>)}</div>;
}

function TeacherCockpit({ data, navigate }: { data: AiTeacherCockpitResponse | null; navigate: ReturnType<typeof useNavigate> }) {
  return <div className="page-stack"><PageHero eyebrow="AI 待办驾驶舱" title="今天先处理什么？" description={`${data?.college || '本学院'}的审核、补交和预警事项已按优先级整理。`} /><section className="section-card"><div className="section-card-header"><h2 className="section-card-title">{data?.title || '今日建议优先处理'}</h2><span className="chip chip-primary">AI 生成</span></div><div className="section-card-body space-y-2">{data?.todos?.map((todo) => <button key={todo.title} type="button" className="list-row list-row-clickable w-full text-left" onClick={() => todo.link && navigate(todo.link)}><span className="mt-1 h-2 w-2 rounded-full bg-primary" /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><strong className="text-footnote text-ink">{todo.title}</strong><span className="chip">{todo.count} 项</span></div><p className="mt-1 text-caption text-body-muted">{todo.description}</p></div><span className="material-symbols-outlined text-placeholder">chevron_right</span></button>)}</div></section><p className="text-caption text-placeholder">AI 只负责聚合和排序，不替教师执行审核决定。</p></div>;
}

function AdminAnalytics({ data }: { data: AiAdminAnalyticsResponse | null }) {
  return <div className="page-stack"><PageHero eyebrow="AI 数据分析助手" title="赛事运行简报" description="从数据查询到异常发现，再给出下一步运营建议。" /><section className="stat-grid">{data?.metrics?.map((metric) => <div key={metric.label} className="stat-card"><div className="stat-card-label">{metric.label}</div><div className="stat-card-value">{metric.value}<span className="ml-1 text-footnote font-normal text-placeholder">{metric.unit}</span></div><div className="stat-card-hint"><span className="material-symbols-outlined text-[15px] text-primary">auto_awesome</span> AI 实时分析</div></div>)}</section><section className="grid gap-4 lg:grid-cols-2"><div className="section-card"><div className="section-card-header"><h2 className="section-card-title">当前异常</h2><span className="material-symbols-outlined text-warning">warning</span></div><div className="section-card-body space-y-2">{(data?.anomalies || []).map((item) => <p key={item} className="rounded-[10px] bg-warning-bg px-3 py-2 text-caption text-body-muted">{item}</p>)}</div></div><div className="section-card"><div className="section-card-header"><h2 className="section-card-title">AI 建议</h2><span className="material-symbols-outlined text-primary">lightbulb</span></div><div className="section-card-body space-y-2">{(data?.suggestions || []).map((item) => <p key={item} className="flex gap-2 text-caption text-body-muted"><span className="text-primary">→</span>{item}</p>)}</div></div></section></div>;
}
