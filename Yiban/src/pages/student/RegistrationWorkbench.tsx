import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import PageHero from '../../components/PageHero';

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
  tracks?: string[];
};

type RegistrationSummary = {
  id: number | string;
  competitionId: number | string;
  status: string;
  teamName?: string;
};

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

export default function RegistrationWorkbench() {
  const { competitionId } = useParams<{ competitionId: string }>();
  const navigate = useNavigate();

  const [comp, setComp] = useState<BackendCompetition | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingRegistration, setExistingRegistration] = useState<RegistrationSummary | null>(null);

  const [teamName, setTeamName] = useState('');
  const [members, setMembers] = useState<string[]>(['']);
  const [selectedTrack, setSelectedTrack] = useState('');
  const [memberError, setMemberError] = useState('');

  useEffect(() => {
    if (!competitionId) return;
    const load = async () => {
      try {
        setLoading(true);
        const data: any = await apiClient.get(`/competition/detail/${competitionId}`);
        setComp(data);
      } catch (err: any) {
        toast.error(err.message || '加载赛事信息失败');
        setComp(null);
      } finally {
        setLoading(false);
      }
      try {
        const regs: any = await apiClient.get('/registration/my');
        const list: RegistrationSummary[] = Array.isArray(regs) ? regs : [];
        const activeStatuses = ['待完善', '已提交', '审核中', '审核通过', '退回补充'];
        const found = list.find((r) => String(r.competitionId) === String(competitionId) && activeStatuses.includes(r.status));
        setExistingRegistration(found || null);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, [competitionId]);

  if (loading) {
    return (
      <div className="page-stack">
        <PageHero eyebrow="报名" title="报名材料填写" description="正在加载赛事信息…" />
        <p className="py-10 text-center text-footnote text-placeholder">加载中…</p>
      </div>
    );
  }

  if (!comp) {
    return (
      <div className="page-stack">
        <PageHero eyebrow="报名" title="报名材料填写" description="未找到对应赛事。" />
        <div className="py-10 text-center">
          <p className="text-footnote text-placeholder">赛事不存在</p>
          <button type="button" onClick={() => navigate('/student/competitions')} className="btn-primary mt-4">
            返回赛事大厅
          </button>
        </div>
      </div>
    );
  }

  const maxTeamSize = Math.max(1, Number(comp.maxTeamSize || 1));
  const isSoloCompetition = maxTeamSize <= 1;
  const maxMemberCount = Math.max(0, maxTeamSize - 1);
  const now = new Date();
  const startTime = parseDate(comp.startTime);
  const endTime = parseDate(comp.endTime);
  const isNotOpen = comp.status === 'draft' || (startTime ? now < startTime : false);
  const isClosed = comp.status === 'closed' || (endTime ? now > endTime : false);

  const validateMembers = () => {
    if (isSoloCompetition) return [];
    const rawMembers = members.map((m) => m.trim()).filter(Boolean);
    if (rawMembers.length > maxMemberCount) {
      setMemberError(`最多只能添加 ${maxMemberCount} 名队友`);
      return null;
    }
    const invalid = rawMembers.find((m) => !/^\d+$/.test(m));
    if (invalid) {
      setMemberError(`队友学号「${invalid}」格式不正确`);
      return null;
    }
    const repeated = rawMembers.find((m, index) => rawMembers.indexOf(m) !== index);
    if (repeated) {
      setMemberError(`队友学号「${repeated}」重复`);
      return null;
    }
    setMemberError('');
    return rawMembers.map(Number);
  };

  const addMember = () => {
    if (members.length >= maxMemberCount) {
      toast.error(`本赛事最多 ${maxTeamSize} 人，最多添加 ${maxMemberCount} 名队友`);
      return;
    }
    setMembers([...members, '']);
    setMemberError('');
  };

  const updateMember = (index: number, value: string) => {
    const updated = [...members];
    updated[index] = value;
    setMembers(updated);
    setMemberError('');
  };

  const removeMember = (index: number) => {
    if (members.length > 1) {
      setMembers(members.filter((_, i) => i !== index));
      setMemberError('');
    }
  };

  const handleSubmit = async () => {
    if (existingRegistration) {
      toast.info('您已报名该赛事，请前往我的报名查看进度');
      return;
    }
    if (isNotOpen || isClosed) {
      toast.error(isNotOpen ? '报名尚未开始' : '报名已截止');
      return;
    }
    if (!isSoloCompetition && !teamName.trim()) {
      toast.error('请填写队伍名称');
      return;
    }
    const memberStudentIds = validateMembers();
    if (memberStudentIds === null) return;
    try {
      setSubmitting(true);
      await apiClient.post('/registration/submit', {
        competitionId: Number(comp.id),
        teamName: isSoloCompetition ? (teamName.trim() || '个人报名') : teamName.trim(),
        track: selectedTrack || undefined,
        memberStudentIds,
      });
      toast.success('报名成功');
      navigate('/student/registrations');
    } catch (err: any) {
      toast.error(err.message || '报名失败');
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { label: '查看要求', done: true },
    { label: '填写信息', done: false, active: !existingRegistration },
    { label: '提交报名', done: Boolean(existingRegistration) },
    { label: '等待审核', done: existingRegistration?.status === '审核通过', active: existingRegistration && existingRegistration.status !== '审核通过' },
    { label: '上传成果', done: false },
  ];

  const trackList: string[] = Array.isArray(comp.tracks) && comp.tracks.length > 0
    ? comp.tracks
    : ['软件开发', 'AI 大模型', '数字媒体'];
  const validMembers = isSoloCompetition ? [] : members.map((m) => m.trim()).filter(Boolean);

  return (
    <div className="registration-workbench-page page-stack">
      <PageHero
        eyebrow="报名"
        title="报名工作台"
        description="在一个页面完成组队、赛道选择和报名确认。"
        prefix={(
          <nav className="mb-1 flex items-center gap-1 text-footnote text-placeholder">
            <button type="button" onClick={() => navigate('/student/competitions')} className="transition hover:text-ink">竞赛中心</button>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="truncate text-body-subtle">{comp.name}</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-ink">报名工作台</span>
          </nav>
        )}
      />

      <section className="page-section" aria-label="报名流程">
        <div className="journey-steps">
          {steps.map((step, idx) => (
            <div key={step.label} className="contents">
              <span
                className={`journey-step ${step.active ? '!border-primary !bg-primary-soft !text-primary' : ''} ${step.done ? '!text-ink' : ''}`}
              >
                <span className="journey-step-num">{step.done ? '✓' : idx + 1}</span>
                {step.label}
              </span>
              {idx < steps.length - 1 ? (
                <span className="journey-sep material-symbols-outlined">chevron_right</span>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {existingRegistration ? (
        <section className="flex flex-col gap-3 border-y border-hairline py-4 md:flex-row md:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-subhead font-medium text-ink">您已报名该赛事</p>
            <p className="mt-0.5 text-footnote text-body-subtle">
              当前状态：{existingRegistration.status}。请在我的报名中查看审核进度和下一步操作。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate('/student/registrations')} className="btn-primary !h-9">
              查看我的报名
            </button>
            <button type="button" onClick={() => navigate('/student/progress')} className="btn-secondary !h-9">
              查看进度
            </button>
            {(existingRegistration.status === '待完善' || existingRegistration.status === '退回补充') ? (
              <button type="button" onClick={() => navigate(`/student/upload/${existingRegistration.id}`)} className="btn-secondary !h-9">
                上传/补充材料
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <section className="page-section h-fit lg:col-span-3">
          <div className="page-section-head">
            <h2 className="page-section-title">赛事信息</h2>
          </div>
          <ul className="flat-list text-footnote">
            <li className="flat-row justify-between"><span className="text-placeholder">级别</span><span className="text-ink">{comp.level}</span></li>
            <li className="flat-row justify-between"><span className="text-placeholder">类别</span><span className="text-ink">{comp.category} 类</span></li>
            <li className="flat-row justify-between"><span className="text-placeholder">报名截止</span><span className="tabular-nums text-ink">{formatDate(comp.endTime)}</span></li>
            <li className="flat-row justify-between"><span className="text-placeholder">赛事开始</span><span className="tabular-nums text-ink">{formatDate(comp.competitionStart)}</span></li>
            <li className="flat-row justify-between"><span className="text-placeholder">最大人数</span><span className="text-ink">{maxTeamSize} 人</span></li>
          </ul>
        </section>

        <section className="page-section lg:col-span-6">
          <div className="page-section-head">
            <h2 className="page-section-title">报名材料</h2>
            <span className="page-section-extra">请按要求填写并选择赛道</span>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-footnote font-medium text-ink">
                {!isSoloCompetition ? <span className="mr-1 text-error">*</span> : null}
                {isSoloCompetition ? '报名名称（选填）' : '队伍名称'}
              </label>
              <input
                className="input-glass"
                placeholder={isSoloCompetition ? '个人报名可不填写' : '请输入队伍名称'}
                value={teamName}
                disabled={Boolean(existingRegistration)}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>

            {!isSoloCompetition ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-footnote font-medium text-ink">团队成员（队友学号）</label>
                  <button
                    type="button"
                    onClick={addMember}
                    disabled={Boolean(existingRegistration)}
                    className="text-caption font-medium text-primary transition hover:text-primary-focus disabled:opacity-50"
                  >
                    添加成员
                  </button>
                </div>
                <p className="text-caption text-placeholder">
                  本赛事最多 {maxTeamSize} 人，除本人外最多添加 {maxMemberCount} 名队友。
                </p>
                <div className="border-y border-hairline">
                  <div className="grid grid-cols-[60px_1fr_60px] border-b border-hairline px-1 py-2 text-caption-2 text-placeholder">
                    <span className="text-center">序号</span>
                    <span>学号</span>
                    <span className="text-center">操作</span>
                  </div>
                  {members.map((member, idx) => (
                    <div key={idx} className="grid grid-cols-[60px_1fr_60px] items-center border-b border-hairline px-1 py-2 last:border-b-0">
                      <span className="text-center text-footnote tabular-nums text-placeholder">{idx + 1}</span>
                      <input
                        className="input-glass !h-8"
                        placeholder="输入队友学号"
                        value={member}
                        disabled={Boolean(existingRegistration)}
                        onChange={(e) => updateMember(idx, e.target.value)}
                      />
                      <div className="text-center">
                        {members.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeMember(idx)}
                            className="text-placeholder transition hover:text-primary"
                            disabled={Boolean(existingRegistration)}
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
                {memberError ? <p className="text-caption text-error">{memberError}</p> : null}
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <label className="text-footnote font-medium text-ink">选择赛道</label>
              <div className="filter-strip !border-b-0 !pb-0">
                {trackList.map((track) => (
                  <button
                    key={track}
                    type="button"
                    onClick={() => !existingRegistration && setSelectedTrack(track)}
                    disabled={Boolean(existingRegistration)}
                    className={`chip ${selectedTrack === track ? 'chip-primary' : ''}`}
                  >
                    {track}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-6 lg:col-span-3">
          <section className="page-section">
            <div className="page-section-head">
              <h2 className="page-section-title">报名提示</h2>
            </div>
            <p className="text-caption leading-relaxed text-body-subtle">请核对截止时间、组队人数和赛道后再提交。</p>
            <div className="flat-list text-footnote">
              <div className="flat-row justify-between"><span className="text-placeholder">报名截止</span><span className="tabular-nums text-ink">{formatDate(comp.endTime)}</span></div>
              <div className="flat-row justify-between"><span className="text-placeholder">团队要求</span><span className="text-ink">{isSoloCompetition ? '个人赛' : `最多 ${maxTeamSize} 人`}</span></div>
              <div className="flat-row justify-between"><span className="text-placeholder">赛道选择</span><span className="text-ink">{selectedTrack || '未选择'}</span></div>
            </div>
            <ul className="mt-2 flex flex-col gap-1.5">
              {[
                { done: isSoloCompetition || !!teamName.trim(), label: isSoloCompetition ? '个人报名' : '填写队伍名称' },
                { done: !!selectedTrack, label: '选择参赛赛道' },
                { done: isSoloCompetition || validMembers.length <= maxMemberCount, label: '成员数量未超限' },
                { done: !isClosed && !isNotOpen, label: '当前处于报名期' },
              ].map((it) => (
                <li key={it.label} className="flex items-center gap-2 text-caption">
                  <span className={`material-symbols-outlined text-[16px] ${it.done ? 'text-primary' : 'text-placeholder'}`}>
                    {it.done ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span className={it.done ? 'text-placeholder line-through' : 'text-ink'}>{it.label}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="page-section">
            <div className="page-section-head">
              <h2 className="page-section-title">遇到问题？</h2>
            </div>
            <p className="text-caption text-placeholder">请先查看赛事原始通知，必要时联系组委会。</p>
          </section>
        </div>
      </div>

      <div className="registration-submit-bar flex justify-end gap-2 border-t border-hairline pt-4">
        <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>返回</button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || Boolean(existingRegistration) || isNotOpen || isClosed || (!isSoloCompetition && !teamName.trim())}
          className="btn-primary"
        >
          {submitting ? '提交中…' : existingRegistration ? '已报名' : isClosed ? '报名已截止' : isNotOpen ? '暂不可报名' : '提交报名'}
        </button>
      </div>
    </div>
  );
}
