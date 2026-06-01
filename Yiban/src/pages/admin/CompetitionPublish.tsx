import { toast } from 'sonner';
import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { pageVariants, pageTransition, listContainer, listItem, smoothEase } from '../../lib/motion';
import apiClient from '../../api/client';
import { uploadToQiniu, getSignedDownloadUrl } from '../../api/qiniu';
import type { CompetitionLevel, CompetitionCategory } from '../../types';
import PageHero from '../../components/PageHero';
import ConfirmModal from '../../components/ConfirmModal';
import { useConfirmModal } from '../../hooks/useConfirmModal';

interface PublishFormState {
  title: string;
  level: CompetitionLevel | '';
  category: CompetitionCategory | '';
  status: 'draft' | 'published' | 'closed' | '';
  organizer: string;
  regStart: string;
  regEnd: string;
  compStart: string;
  compEnd: string;
  description: string;
  detailContent: string;
  tags: string;
  coverUrl: string;
  maxTeamSize: number;
  tracks: string[];
}

const toPublishPayload = (form: PublishFormState, status: 'draft' | 'published' | 'closed') => ({
  name: form.title,
  level: form.level || '校级',
  category: form.category || 'A',
  organizer: form.organizer,
  startTime: form.regStart || null,
  endTime: form.regEnd || null,
  competitionStart: form.compStart || null,
  competitionEnd: form.compEnd || null,
  maxTeamSize: form.maxTeamSize,
  coverUrl: form.coverUrl,
  content: form.detailContent || form.description,
  tags: form.tags ? form.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean) : [],
  tracks: form.tracks,
  status,
});

const levelOptions: { value: CompetitionLevel; label: string }[] = [
  { value: '国家级', label: '国家级' },
  { value: '省级', label: '省级' },
  { value: '校级', label: '校级' },
  { value: '院级', label: '院级' },
];

const categoryOptions: { value: CompetitionCategory; label: string }[] = [
  { value: 'A', label: '科技创新' },
  { value: 'B', label: '商业创业' },
  { value: 'C', label: '文化艺术' },
];

const defaultForm: PublishFormState = {
  title: '',
  level: '',
  category: '',
  status: '',
  organizer: '',
  regStart: '',
  regEnd: '',
  compStart: '',
  compEnd: '',
  description: '',
  detailContent: '',
  tags: '',
  coverUrl: '',
  maxTeamSize: 5,
  tracks: [],
};

const defaultTracks = ['软件开发', 'AI 大模型', '数字媒体', '硬件创新', '学术论文', '创业实践'];

const levelChipClass = (level?: string) => {
  if (level === '国家级') return 'chip chip-national';
  if (level === '省级') return 'chip chip-province';
  return 'chip chip-school';
};

function formatDateForInput(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CompetitionPublish() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { isOpen, title, message, variant, confirm, close } = useConfirmModal();

  const [form, setForm] = useState<PublishFormState>({ ...defaultForm });
  const [errors, setErrors] = useState<Partial<Record<keyof PublishFormState, string>>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [coverDisplayUrl, setCoverDisplayUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Resolve cover URL for display — try direct first, fall back to signed URL on error
  useEffect(() => {
    if (!form.coverUrl) {
      setCoverDisplayUrl('');
      return;
    }
    setCoverDisplayUrl(form.coverUrl);
  }, [form.coverUrl]);

  const handleCoverLoadError = async () => {
    if (!form.coverUrl || coverDisplayUrl !== form.coverUrl) return;
    try {
      const signed = await getSignedDownloadUrl(form.coverUrl);
      if (signed) setCoverDisplayUrl(signed);
    } catch (err) {
      console.error(err);
      setCoverDisplayUrl('');
    }
  };

  // Load existing competition data when editing
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setPageLoading(true);
        const data: any = await apiClient.get(`/competition/detail/${id}`);
        if (!data) {
          toast.error('赛事不存在');
          navigate('/admin');
          return;
        }
        setForm({
          title: data.name || '',
          level: data.level || '',
          category: data.category || '',
          status: data.status || 'draft',
          organizer: data.organizer || '',
          regStart: formatDateForInput(data.startTime),
          regEnd: formatDateForInput(data.endTime),
          compStart: formatDateForInput(data.competitionStart),
          compEnd: formatDateForInput(data.competitionEnd),
          description: data.content || '',
          detailContent: '',
          tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
          coverUrl: data.coverUrl || '',
          maxTeamSize: data.maxTeamSize || 5,
          tracks: Array.isArray(data.tracks) ? data.tracks : [],
        });
      } catch (err) {
        console.error('Failed to load competition', err);
        toast.error('加载赛事信息失败');
        navigate('/admin');
      } finally {
        setPageLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const updateField = <K extends keyof PublishFormState>(field: K, value: PublishFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const toggleTrack = (track: string) => {
    setForm((prev) => ({
      ...prev,
      tracks: prev.tracks.includes(track)
        ? prev.tracks.filter((t) => t !== track)
        : [...prev.tracks, track],
    }));
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof PublishFormState, string>> = {};
    if (!form.title.trim()) errs.title = '请输入赛事名称';
    if (!form.level) errs.level = '请选择赛事级别';
    if (!form.category) errs.category = '请选择赛事分类';
    if (!form.organizer.trim()) errs.organizer = '请输入主办单位';
    if (!form.regStart || !form.regEnd) errs.regStart = '请填写报名时间';
    if (!form.compStart || !form.compEnd) errs.compStart = '请填写比赛时间';
    if (!form.description.trim()) errs.description = '请输入赛事简介';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (status: 'draft' | 'published') => {
    if (status === 'published' && !validate()) return;
    setLoading(true);
    try {
      const payloadStatus = isEdit
        ? (status === 'draft' ? 'draft' : form.status || 'published')
        : status;
      const payload = toPublishPayload(
        status === 'draft' ? { ...form, title: form.title || '未命名赛事', level: form.level || '校级', category: form.category || 'A' } : form,
        payloadStatus as 'draft' | 'published' | 'closed'
      );
      if (isEdit) {
        await apiClient.put(`/competition/admin/update/${id}`, payload);
        toast.success('更新成功');
      } else {
        await apiClient.post('/competition/admin/publish', payload);
        toast.success(status === 'draft' ? '已保存为草稿' : '发布成功');
      }
      navigate('/admin');
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(isEdit ? '更新失败' : '发布失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCoverFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB');
      return;
    }
    setUploading(true);
    try {
      const result = await uploadToQiniu(file);
      if (result?.url) {
        updateField('coverUrl', result.url);
        toast.success('封面上传成功');
      } else {
        toast.error('上传失败，未收到文件地址');
      }
    } catch (err: any) {
      console.error('Cover upload error:', err);
      toast.error(err?.message || '封面上传失败');
    } finally {
      setUploading(false);
    }
  };

  const onCoverInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleCoverFile(file);
    e.target.value = '';
  };

  const onCoverDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleCoverFile(file);
  };

  if (pageLoading) {
    return (
      <div className="py-section text-center text-ink-muted-48">
        <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
        <p className="mt-2 text-[14px]">加载中…</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={pageTransition}
      className="py-lg flex flex-col gap-lg pb-32"
    >
      <PageHero
        eyebrow={isEdit ? 'Edit' : 'Publish'}
        title={isEdit ? '编辑赛事' : '发布新赛事'}
        description={isEdit ? '修改赛事信息，保存后立即生效。' : '填写赛事基本信息，右侧预览即时反映你的修改。'}
      />

      <div className="flex flex-col lg:flex-row gap-lg">
        {/* Left: Form */}
        <motion.div className="flex-1 flex flex-col gap-md min-w-0" variants={listContainer} initial="hidden" animate="visible">
          {/* Basic info */}
          <motion.section variants={listItem} className="glass p-lg">
            <div className="flex items-center gap-2 mb-md pb-3 border-b border-hairline">
              <span className="material-symbols-outlined text-[20px] text-primary">info</span>
              <h2 className="text-[17px] font-semibold tracking-tight text-ink">基本信息</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <Field label="赛事名称" required error={errors.title} className="md:col-span-2">
                <input className="input-glass" placeholder="输入完整的赛事名称" value={form.title} onChange={(e) => updateField('title', e.target.value)} />
              </Field>

              <Field label="赛事分类" required error={errors.category}>
                <select className="input-glass" value={form.category} onChange={(e) => updateField('category', e.target.value as CompetitionCategory)}>
                  <option value="">请选择分类</option>
                  {categoryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>

              <Field label="赛事级别" required error={errors.level}>
                <select className="input-glass" value={form.level} onChange={(e) => updateField('level', e.target.value as CompetitionLevel)}>
                  <option value="">请选择级别</option>
                  {levelOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>

              <Field label="主办单位" required error={errors.organizer} className="md:col-span-2">
                <input className="input-glass" placeholder="输入主办单位名称" value={form.organizer} onChange={(e) => updateField('organizer', e.target.value)} />
              </Field>

              <Field label="报名时间" required error={errors.regStart}>
                <div className="flex items-center gap-2">
                  <input className="input-glass" type="date" value={form.regStart} onChange={(e) => updateField('regStart', e.target.value)} />
                  <span className="text-ink-muted-48">→</span>
                  <input className="input-glass" type="date" value={form.regEnd} onChange={(e) => updateField('regEnd', e.target.value)} />
                </div>
              </Field>

              <Field label="比赛时间" required error={errors.compStart}>
                <div className="flex items-center gap-2">
                  <input className="input-glass" type="date" value={form.compStart} onChange={(e) => updateField('compStart', e.target.value)} />
                  <span className="text-ink-muted-48">→</span>
                  <input className="input-glass" type="date" value={form.compEnd} onChange={(e) => updateField('compEnd', e.target.value)} />
                </div>
              </Field>

              <Field label="最大团队人数">
                <input className="input-glass" type="number" min={1} value={form.maxTeamSize} onChange={(e) => updateField('maxTeamSize', Number(e.target.value) || 1)} />
              </Field>

              <Field label="赛事封面" className="md:col-span-2">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onCoverDrop}
                  className="rounded-lg border border-dashed border-hairline bg-canvas p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-primary/3 transition group relative overflow-hidden"
                >
                  {form.coverUrl ? (
                    <>
                      <img
                        src={coverDisplayUrl || form.coverUrl}
                        alt="封面预览"
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={handleCoverLoadError}
                      />
                      <div className="relative z-10 bg-canvas border border-hairline px-3 py-1.5 rounded-pill text-ink text-[12px]">点击或拖拽以替换封面</div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-primary-soft grid place-items-center text-primary mb-3 group-hover:scale-110 transition">
                        <span className="material-symbols-outlined">{uploading ? 'hourglass_top' : 'add_photo_alternate'}</span>
                      </div>
                      <p className="text-[14px] text-ink">{uploading ? '上传中…' : '点击或拖拽上传图片'}</p>
                      <p className="text-[12px] text-ink-muted-48 mt-1">推荐 16:9，JPG / PNG，最大 5MB</p>
                    </>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onCoverInputChange} />
                </div>
              </Field>
            </div>
          </motion.section>

          {/* Content */}
          <motion.section variants={listItem} className="glass p-lg">
            <div className="flex items-center gap-2 mb-md pb-3 border-b border-hairline">
              <span className="material-symbols-outlined text-[20px] text-primary">description</span>
              <h2 className="text-[17px] font-semibold tracking-tight text-ink">赛事内容</h2>
            </div>
            <div className="flex flex-col gap-md">
              <Field label="赛事简介" required error={errors.description}>
                <textarea className="input-glass !h-auto py-2.5 resize-none" rows={3} placeholder="简要描述赛事背景和目的…" value={form.description} onChange={(e) => updateField('description', e.target.value)} />
              </Field>

              <Field label="详细要求与流程">
                <textarea className="input-glass !h-auto py-3 resize-none" rows={8} placeholder="在此编辑赛事详细内容…" value={form.detailContent} onChange={(e) => updateField('detailContent', e.target.value)} />
              </Field>

              <Field label="标签">
                <input className="input-glass" placeholder="输入标签，用逗号分隔，如：IT/计算机, 创新创业" value={form.tags} onChange={(e) => updateField('tags', e.target.value)} />
              </Field>
            </div>
          </motion.section>

          {/* Settings */}
          <motion.section variants={listItem} className="glass p-lg">
            <div className="flex items-center gap-2 mb-md pb-3 border-b border-hairline">
              <span className="material-symbols-outlined text-[20px] text-primary">settings</span>
              <h2 className="text-[17px] font-semibold tracking-tight text-ink">参赛赛道</h2>
            </div>
            <p className="text-[13px] text-ink-muted-80 mb-4">选择该赛事开放的赛道，学生报名时可从中选择。</p>

            {/* Preset tracks */}
            <div className="flex flex-wrap gap-2 mb-4">
              {defaultTracks.map((track) => {
                const selected = form.tracks.includes(track);
                return (
                  <motion.button
                    key={track}
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => toggleTrack(track)}
                    className={`group relative flex items-center gap-2 pl-3 pr-4 py-2 rounded-lg border text-[13px] font-medium transition-all ${
                      selected
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-canvas border-hairline text-ink-muted-80 hover:border-primary/40 hover:text-ink'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[18px] transition-transform ${selected ? 'scale-110' : 'group-hover:scale-105'}`}>
                      {selected ? 'check_circle' : 'add_circle_outline'}
                    </span>
                    {track}
                  </motion.button>
                );
              })}
            </div>

            {/* Custom track input */}
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-ink-muted-48">edit</span>
                <input
                  className="input-glass !pl-10"
                  placeholder="输入自定义赛道名称…"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val && !form.tracks.includes(val)) {
                        updateField('tracks', [...form.tracks, val]);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
              </div>
              <span className="text-[12px] text-ink-muted-48">按回车添加</span>
            </div>

            {/* Selected tracks */}
            {form.tracks.length > 0 && (
              <div className="p-3 rounded-lg bg-canvas-parchment/60 border border-hairline">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">flag</span>
                  <span className="text-[12px] font-medium text-ink-muted-80">已选赛道 ({form.tracks.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.tracks.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-md bg-primary/8 border border-primary/20 text-[13px] text-primary font-medium group">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {t}
                      <button
                        type="button"
                        onClick={() => toggleTrack(t)}
                        className="ml-1 p-0.5 rounded-full hover:bg-primary-soft text-primary hover:text-primary-focus transition"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.section>

          {/* Stages Management (edit mode only) */}
          {isEdit && (
            <motion.section variants={listItem} className="glass p-xl">
              <h3 className="text-[17px] font-semibold tracking-tight text-ink mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">route</span>
                赛事阶段管理
              </h3>
              <p className="text-[13px] text-ink-muted-48 mb-4">按需添加赛事阶段，如院赛、校赛、省赛等。不添加阶段则使用默认报名流程。</p>
              <StageManager competitionId={Number(id)} />
            </motion.section>
          )}
        </motion.div>

        {/* Right: Preview */}
        <div className="w-full lg:w-[380px] shrink-0">
          <div className="sticky top-[88px] flex flex-col gap-3">
            <h3 className="text-[12px] text-ink-muted-48 px-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">visibility</span>
              发布效果预览
            </h3>
            <div className="glass-strong overflow-hidden rounded-lg">
              <div className="aspect-video bg-canvas-parchment relative overflow-hidden">
                {form.coverUrl ? (
                  <img
                    src={coverDisplayUrl || form.coverUrl}
                    alt="封面预览"
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      handleCoverLoadError();
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'grid';
                    }}
                  />
                ) : null}
                <div className="absolute inset-0 grid place-items-center text-ink-muted-48 flex-col gap-2" style={form.coverUrl ? { display: 'none' } : undefined}>
                  <span className="material-symbols-outlined text-[40px] opacity-30">image</span>
                  <span className="text-[11px]">封面预览</span>
                </div>
                <div className="absolute top-3 left-3 chip chip-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                  <span>报名中</span>
                </div>
              </div>
              <div className="p-md">
                <h4 className="font-display font-semibold text-[17px] leading-snug text-ink mb-2">
                  {form.title || '赛事名称将在这里显示…'}
                </h4>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {form.category && <span className="chip chip-primary">{categoryOptions.find((o) => o.value === form.category)?.label}</span>}
                  {form.level && <span className={levelChipClass(form.level)}>{form.level}</span>}
                  {form.tracks.length > 0 && <span className="chip">{form.tracks.length} 个赛道</span>}
                </div>
                <div className="flex flex-col gap-2 mb-4 text-[12px]">
                  <PreviewLine icon="apartment" label="主办" value={form.organizer || '主办单位名称'} />
                  <PreviewLine icon="how_to_reg" label="报名" value={form.regStart && form.regEnd ? `${form.regStart} ~ ${form.regEnd}` : 'YYYY/MM/DD - YYYY/MM/DD'} />
                  <PreviewLine icon="event" label="比赛" value={form.compStart && form.compEnd ? `${form.compStart} ~ ${form.compEnd}` : 'YYYY/MM/DD - YYYY/MM/DD'} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 lg:left-[240px] right-0 z-40">
        <div className="bg-canvas border-t border-hairline px-lg py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={() => navigate('/admin')} className="btn-secondary">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              返回
            </motion.button>
            <div className="flex items-center gap-2">
              <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={() => handleSubmit('draft')} disabled={loading || uploading} className="btn-secondary disabled:opacity-60">
                保存草稿
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={() => handleSubmit('published')} disabled={loading || uploading} className="btn-primary disabled:opacity-60">
                <span className="material-symbols-outlined text-[18px]">publish</span>
                {loading ? '提交中…' : isEdit ? '保存修改' : '发布赛事'}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StageManager({ competitionId }: { competitionId: number }) {
  const [stages, setStages] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newStage, setNewStage] = useState({ name: '', startTime: '', endTime: '', description: '' });
  const { isOpen, title, message, variant, confirm, close } = useConfirmModal();

  useEffect(() => {
    apiClient.get(`/competition/${competitionId}/stages`).then((data: any) => {
      setStages(Array.isArray(data) ? data : []);
    }).catch(console.error);
  }, [competitionId]);

  const handleAdd = async () => {
    if (!newStage.name.trim()) { toast.error('请输入阶段名称'); return; }
    try {
      const payload: any = {
        name: newStage.name,
        stageOrder: stages.length + 1,
        startTime: newStage.startTime || null,
        endTime: newStage.endTime || null,
        description: newStage.description || null,
        status: 'upcoming',
      };
      const created: any = await apiClient.post(`/competition/${competitionId}/stages`, payload);
      setStages(prev => [...prev, created]);
      setNewStage({ name: '', startTime: '', endTime: '', description: '' });
      setShowAdd(false);
      toast.success('阶段已添加');
    } catch (err: any) { toast.error(err.message || '添加失败'); }
  };

  const handleDelete = async (stageId: number) => {
    const confirmed = await confirm({
      title: '删除阶段',
      message: '确定删除此阶段？',
      confirmText: '删除',
      cancelText: '取消',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await apiClient.delete(`/competition/${competitionId}/stages/${stageId}`);
      setStages(prev => prev.filter(s => s.id !== stageId));
      toast.success('已删除');
    } catch (err: any) { toast.error(err.message || '删除失败'); }
  };

  const handleStatusChange = async (stageId: number, status: string) => {
    try {
      const updated: any = await apiClient.put(`/competition/${competitionId}/stages/${stageId}`, { status });
      setStages(prev => prev.map(s => s.id === stageId ? { ...s, status: updated.status } : s));
    } catch (err: any) { toast.error(err.message || '更新失败'); }
  };

  return (
    <div className="flex flex-col gap-3">
      {stages.map((stage) => (
        <div key={stage.id} className="flex items-center gap-3 p-3 rounded-lg border border-hairline bg-canvas">
          <span className="w-6 h-6 rounded-full bg-primary-soft text-primary text-[12px] font-medium grid place-items-center">{stage.stageOrder}</span>
          <div className="flex-1 min-w-0">
            <span className="text-[14px] font-medium text-ink">{stage.name}</span>
            {stage.startTime && (
              <span className="text-[12px] text-ink-muted-48 ml-2">
                {new Date(stage.startTime).toLocaleDateString('zh-CN')} — {stage.endTime ? new Date(stage.endTime).toLocaleDateString('zh-CN') : ''}
              </span>
            )}
          </div>
          <select
            value={stage.status}
            onChange={(e) => handleStatusChange(stage.id, e.target.value)}
            className="input-glass !w-auto !h-8 !text-[12px] !px-2"
          >
            <option value="upcoming">未开始</option>
            <option value="active">进行中</option>
            <option value="closed">已结束</option>
          </select>
          <button onClick={() => handleDelete(stage.id)} className="p-1 rounded-md text-ink-muted-48 hover:text-error hover:bg-error/8 transition">
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      ))}

      <AnimatePresence mode="wait">
        {showAdd ? (
          <motion.div
            key="add-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: smoothEase }}
            className="overflow-hidden"
          >
            <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 flex flex-col gap-2">
              <input className="input-glass !h-9" placeholder="阶段名称，如：院赛报名、校赛评审" value={newStage.name} onChange={e => setNewStage(s => ({ ...s, name: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <input type="date" className="input-glass !h-9" value={newStage.startTime} onChange={e => setNewStage(s => ({ ...s, startTime: e.target.value }))} />
                <input type="date" className="input-glass !h-9" value={newStage.endTime} onChange={e => setNewStage(s => ({ ...s, endTime: e.target.value }))} />
              </div>
              <input className="input-glass !h-9" placeholder="阶段说明（选填）" value={newStage.description} onChange={e => setNewStage(s => ({ ...s, description: e.target.value }))} />
              <div className="flex gap-2 justify-end">
                <button type="button" className="btn-secondary !py-1.5 !text-[12px]" onClick={() => setShowAdd(false)}>取消</button>
                <button type="button" className="btn-primary !py-1.5 !text-[12px]" onClick={handleAdd}>添加</button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="add-btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 text-[13px] text-primary hover:text-primary-focus font-medium"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            添加阶段
          </motion.button>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={isOpen}
        onClose={close}
        onConfirm={() => {}}
        title={title}
        message={message}
        variant={variant}
      />
    </div>
  );
}

function Field({ label, required, error, children, className = '' }: { label: string; required?: boolean; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-[14px] font-medium text-body-muted">
        {label}{required && <span className="text-error ml-0.5">*</span>}
      </label>
      {children}
      {error && <span className="text-[11px] text-error">{error}</span>}
    </div>
  );
}

function PreviewLine({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="material-symbols-outlined text-[14px] text-ink-muted-48 mt-0.5">{icon}</span>
      <span className="text-ink-muted-48 mr-1">{label}:</span>
      <span className="text-ink-muted-80 flex-1">{value}</span>
    </div>
  );
}
