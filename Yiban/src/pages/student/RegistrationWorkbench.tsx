import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import { useStore as useAuthStore } from '../../store/useStore';
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

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function RegistrationWorkbench() {
  const { competitionId } = useParams<{ competitionId: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);

  const [comp, setComp] = useState<BackendCompetition | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  const [teamName, setTeamName] = useState('');
  const [members, setMembers] = useState<string[]>(['']);
  const [selectedTrack, setSelectedTrack] = useState('');

  useEffect(() => {
    if (!competitionId) return;
    const load = async () => {
      try {
        setLoading(true);
        const data: any = await apiClient.get(`/competition/detail/${competitionId}`);
        setComp(data);
      } catch (err) {
        console.error('Failed to load competition', err);
        setComp(null);
      } finally {
        setLoading(false);
      }
      try {
        const regs: any = await apiClient.get('/registration/my');
        const list: Array<{ competitionId: number | string }> = Array.isArray(regs) ? regs : [];
        if (list.some((r) => String(r.competitionId) === String(competitionId))) {
          setAlreadyRegistered(true);
        }
      } catch {
        // ignore
      }
    };
    load();
  }, [competitionId]);

  const addMember = () => setMembers([...members, '']);
  const updateMember = (index: number, value: string) => {
    const updated = [...members];
    updated[index] = value;
    setMembers(updated);
  };
  const removeMember = (index: number) => {
    if (members.length > 1) {
      setMembers(members.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    if (!comp) return;
    if (!teamName.trim()) {
      toast.error('请填写队伍名称');
      return;
    }
    try {
      setSubmitting(true);
      await apiClient.post('/registration/submit', {
        competitionId: Number(comp.id),
        teamName: teamName.trim(),
        track: selectedTrack || undefined,
      });
      toast.success('报名成功');
      navigate('/student/registrations');
    } catch (err: any) {
      toast.error(err.message || '报名失败');
    } finally {
      setSubmitting(false);
    }
  };

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
      </div>
    );
  }

  const steps = [
    { label: '查看通知', done: true },
    { label: '下载附件', done: true },
    { label: '准备材料', done: false, active: true },
    { label: 'AI 解析', done: false },
    { label: '提交报名', done: false },
  ];

  const trackList: string[] = Array.isArray(comp.tracks) && comp.tracks.length > 0
    ? comp.tracks
    : ['软件开发', 'AI 大模型', '数字媒体'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="py-lg flex flex-col gap-lg"
    >
      {/* Header */}
      <PageHero
        title="报名材料填写"
        description="根据赛事要求完成团队信息与赛道选择，确认后提交报名。"
        titleClassName="text-[30px] sm:text-[32px] leading-[1.1]"
        descriptionClassName="text-[14px]"
        prefix={(
          <nav className="flex items-center gap-1 text-[13px] text-ink-muted-48 mb-1">
            <button onClick={() => navigate('/student/competitions')} className="hover:text-ink transition">赛事大厅</button>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-ink-muted-80 truncate">{comp.name}</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-ink">报名工作台</span>
          </nav>
        )}
      />

      {/* Stepper */}
      <div className="glass p-lg">
        <div className="relative grid grid-cols-5">
          <div className="absolute top-5 left-[10%] right-[10%] h-px bg-hairline" />
          <div className="absolute top-5 left-[10%] w-[40%] h-px bg-primary" />
          {steps.map((step, idx) => (
            <div key={idx} className="flex flex-col items-center text-center">
              <div className={`w-10 h-10 rounded-full grid place-items-center text-[14px] font-semibold relative z-10 ${
                step.done
                  ? 'bg-primary text-on-primary'
                  : step.active
                    ? 'bg-canvas border-2 border-primary text-primary'
                    : 'bg-canvas border border-hairline text-ink-muted-48'
              }`}>
                {step.done ? (
                  <span className="material-symbols-outlined text-[18px]">check</span>
                ) : (
                  idx + 1
                )}
              </div>
              <span className={`mt-3 text-[13px] ${
                step.active ? 'text-primary font-semibold' : step.done ? 'text-ink' : 'text-ink-muted-48'
              }`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {alreadyRegistered && (
        <div className="glass p-md flex items-center gap-3 border border-primary/20">
          <span className="material-symbols-outlined text-[20px] text-primary">info</span>
          <div>
            <p className="text-[14px] font-medium text-ink">您已报名该赛事</p>
            <p className="text-[12px] text-ink-muted-80 mt-0.5">可前往我的报名页面查看进度。</p>
          </div>
          <button
            onClick={() => navigate('/student/registrations')}
            className="ml-auto btn-secondary !py-1.5 !text-[13px]"
          >
            查看我的报名
          </button>
        </div>
      )}

      {/* 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        {/* Left: Attachments */}
        <div className="lg:col-span-3 glass p-lg h-fit">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-ink flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">folder_open</span>
              赛事信息
            </h2>
          </div>
          <ul className="flex flex-col gap-2 text-[13px]">
            <li className="flex justify-between border-b border-hairline py-2">
              <span className="text-ink-muted-48">级别</span>
              <span className="text-ink">{comp.level}</span>
            </li>
            <li className="flex justify-between border-b border-hairline py-2">
              <span className="text-ink-muted-48">类别</span>
              <span className="text-ink">{comp.category} 类</span>
            </li>
            <li className="flex justify-between border-b border-hairline py-2">
              <span className="text-ink-muted-48">报名截止</span>
              <span className="text-ink tabular-nums">{formatDate(comp.endTime)}</span>
            </li>
            <li className="flex justify-between border-b border-hairline py-2">
              <span className="text-ink-muted-48">赛事开始</span>
              <span className="text-ink tabular-nums">{formatDate(comp.competitionStart)}</span>
            </li>
            <li className="flex justify-between py-2">
              <span className="text-ink-muted-48">最大人数</span>
              <span className="text-ink">{comp.maxTeamSize ?? '—'} 人</span>
            </li>
          </ul>
        </div>

        {/* Center: Form */}
        <div className="lg:col-span-6 glass p-xl">
          <div className="mb-lg pb-md border-b border-hairline">
            <h2 className="text-[21px] font-semibold tracking-tight text-ink">报名材料</h2>
            <p className="text-[13px] text-ink-muted-48 mt-1">请按要求填写信息并选择赛道。</p>
          </div>

          <div className="flex flex-col gap-md">
            {/* Team Name */}
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-ink">
                <span className="text-error mr-1">*</span>队伍名称
              </label>
              <input
                className="input-glass"
                placeholder="请输入队伍名称"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>

            {/* Members */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-medium text-ink">
                  团队成员（仅供参考）
                </label>
                <button
                  onClick={addMember}
                  className="flex items-center gap-1 text-primary hover:text-primary-focus text-[12px] font-medium transition"
                >
                  <span className="material-symbols-outlined text-[16px]">group_add</span>
                  添加成员
                </button>
              </div>
              <div className="rounded-md border border-hairline overflow-hidden">
                <div className="grid grid-cols-[60px_1fr_60px] text-[11px] uppercase tracking-wider text-ink-muted-48 bg-canvas-parchment/60 px-3 py-2">
                  <span className="text-center">序号</span>
                  <span>姓名</span>
                  <span className="text-center">操作</span>
                </div>
                {members.map((member, idx) => (
                  <div key={idx} className="grid grid-cols-[60px_1fr_60px] items-center px-3 py-2 border-t border-hairline">
                    <span className="text-center text-[13px] text-ink-muted-48 tabular-nums">{idx + 1}</span>
                    <input
                      className="h-8 px-2 rounded-sm border border-hairline bg-canvas/60 text-[13px] text-ink focus:border-primary-focus focus:outline-none transition"
                      placeholder={idx === 0 ? currentUser?.name || '输入成员姓名' : '输入成员姓名'}
                      value={member}
                      onChange={(e) => updateMember(idx, e.target.value)}
                    />
                    <div className="text-center">
                      {members.length > 1 && (
                        <button
                          onClick={() => removeMember(idx)}
                          className="text-ink-muted-48 hover:text-primary transition"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Track */}
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-medium text-ink">
                选择赛道
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {trackList.map((track) => (
                  <button
                    key={track}
                    onClick={() => setSelectedTrack(track)}
                    className={`text-left rounded-md p-md border transition ${
                      selectedTrack === track
                        ? 'border-primary bg-primary/5'
                        : 'border-hairline bg-canvas hover:border-primary/40'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[22px] ${
                      selectedTrack === track ? 'text-primary icon-fill' : 'text-ink-muted-48'
                    }`}>flag</span>
                    <h3 className="text-[14px] font-semibold text-ink mt-2">{track}</h3>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: AI Assistant */}
        <div className="lg:col-span-3 flex flex-col gap-md">
          <div className="glass-strong p-lg">
            <div className="flex items-center justify-between mb-md">
              <h2 className="text-[15px] font-semibold text-ink flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary icon-fill">auto_awesome</span>
                AI 助手
              </h2>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
            </div>
            <p className="text-[12px] text-ink-muted-80 leading-relaxed mb-3">
              助手已阅读官方通知，为您提取关键信息。
            </p>

            <div className="rounded-md bg-canvas p-3 border border-hairline mb-3">
              <h3 className="text-[12px] font-semibold text-ink mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px] text-primary">key</span> 关键信息
              </h3>
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[14px] text-primary mt-0.5">event_busy</span>
                  <div>
                    <p className="text-[11px] font-semibold text-ink">报名截止</p>
                    <p className="text-[11px] text-ink-muted-80">{formatDate(comp.endTime)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[14px] text-primary mt-0.5">group</span>
                  <div>
                    <p className="text-[11px] font-semibold text-ink">团队要求</p>
                    <p className="text-[11px] text-ink-muted-80">最多 {comp.maxTeamSize ?? '—'} 人</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-md bg-canvas p-3 border border-hairline">
              <h3 className="text-[12px] font-semibold text-ink mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px] text-primary">fact_check</span> 检查清单
              </h3>
              <ul className="flex flex-col gap-1.5">
                {[
                  { done: !!teamName.trim(), label: '填写队伍信息' },
                  { done: !!selectedTrack, label: '选择参赛赛道' },
                  { done: members.some((m) => m.trim()), label: '添加团队成员' },
                ].map((it) => (
                  <li key={it.label} className="flex items-center gap-2 text-[12px]">
                    <span className={`material-symbols-outlined text-[16px] ${it.done ? 'text-primary icon-fill' : 'text-ink-muted-48'}`}>
                      {it.done ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <span className={it.done ? 'text-ink-muted-48 line-through' : 'text-ink'}>{it.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="glass p-lg flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-canvas-parchment grid place-items-center text-ink-muted-48 shrink-0">
              <span className="material-symbols-outlined text-[18px]">help</span>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-ink">遇到报名问题？</p>
              <p className="text-[12px] text-ink-muted-48 mt-0.5 mb-2">查看常见问题或联系组委会。</p>
              <button className="text-[12px] text-primary hover:text-primary-focus font-medium flex items-center gap-1">
                联系客服 <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex justify-end gap-2">
        <button className="btn-secondary" onClick={() => navigate(-1)}>
          返回
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || alreadyRegistered || !teamName.trim()}
          className="btn-primary"
        >
          {submitting && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
          <span className="material-symbols-outlined text-[18px]">send</span>
          {alreadyRegistered ? '已报名' : '提交报名'}
        </button>
      </div>
    </motion.div>
  );
}
