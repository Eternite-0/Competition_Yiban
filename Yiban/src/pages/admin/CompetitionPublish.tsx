import { toast } from 'sonner';
import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { listContainer, listItem, smoothEase } from '../../lib/motion';
import apiClient from '../../api/client';
import { uploadToQiniu, getSignedDownloadUrl } from '../../api/qiniu';
import { createActivityCategory, listActivityCategories } from '../../api/activityCategories';
import type { ActivityCategory, ActivityType, CompetitionLevel } from '../../types';
import PageHero from '../../components/PageHero';
import ConfirmModal from '../../components/ConfirmModal';
import LazyImage from '../../components/LazyImage';
import { useConfirmModal } from '../../hooks/useConfirmModal';
import AiImportPanel, { aiDraftToPublishForm } from './components/AiImportPanel';

type PublishStatus = 'draft' | 'published' | 'closed';

interface PublishFormState {
  activityType: ActivityType;
  title: string;
  level: CompetitionLevel | '';
  category: string;
  status: PublishStatus | '';
  organizer: string;
  regStart: string;
  regEnd: string;
  activityStart: string;
  activityEnd: string;
  description: string;
  detailContent: string;
  tags: string;
  coverUrl: string;
  sourceUrl: string;
  maxTeamSize: number;
  maxParticipants: number;
  location: string;
  serviceHours: string;
  tracks: string[];
}

const activityTypes: { value: ActivityType; label: string; icon: string; hint: string }[] = [
  { value: 'competition', label: '竞赛赛事', icon: 'emoji_events', hint: '保留参赛报名、组队、成果提交等完整赛事流程' },
  { value: 'volunteer', label: '志愿服务', icon: 'volunteer_activism', hint: '用于志愿活动报名、岗位选择和服务时长记录' },
  { value: 'culture_sports', label: '文体活动', icon: 'sports_soccer', hint: '用于体育赛事、文艺展演、社团活动等校园成长记录' },
  { value: 'other', label: '其他活动', icon: 'event_available', hint: '用于讲座、培训、实践项目等通用活动' },
];

const levelOptions: { value: CompetitionLevel; label: string }[] = [
  { value: '国家级', label: '国家级' },
  { value: '省级', label: '省级' },
  { value: '校级', label: '校级' },
  { value: '院级', label: '院级' },
];

const defaultForm: PublishFormState = {
  activityType: 'competition',
  title: '',
  level: '',
  category: '',
  status: '',
  organizer: '',
  regStart: '',
  regEnd: '',
  activityStart: '',
  activityEnd: '',
  description: '',
  detailContent: '',
  tags: '',
  coverUrl: '',
  sourceUrl: '',
  maxTeamSize: 5,
  maxParticipants: 0,
  location: '',
  serviceHours: '',
  tracks: [],
};

const defaultTracks: Record<ActivityType, string[]> = {
  competition: ['软件开发', 'AI 大模型', '数字媒体', '硬件创新', '学术论文', '创业实践'],
  volunteer: ['秩序维护', '场馆引导', '资料整理', '宣传服务', '社区走访', '活动保障'],
  culture_sports: ['体育竞赛', '文艺展演', '社团活动', '班级风采', '校园文化', '体质提升'],
  other: ['讲座', '培训', '实践', '调研', '展示', '交流'],
};

const typeText: Record<ActivityType, { noun: string; title: string; stage: string; track: string; trackHint: string }> = {
  competition: { noun: '赛事', title: '赛事名称', stage: '比赛时间', track: '参赛赛道', trackHint: '选择该赛事开放的赛道，学生报名时可从中选择。' },
  volunteer: { noun: '志愿活动', title: '活动名称', stage: '服务时间', track: '服务岗位', trackHint: '选择该志愿活动开放的岗位，学生报名时可从中选择。' },
  culture_sports: { noun: '文体活动', title: '活动名称', stage: '活动时间', track: '活动项目', trackHint: '选择该文体活动开放的项目或场次，学生报名时可从中选择。' },
  other: { noun: '活动', title: '活动名称', stage: '活动时间', track: '活动方向', trackHint: '选择活动方向或场次，学生报名时可从中选择。' },
};

const levelChipClass = (level?: string) => {
  if (level === '国家级') return 'chip chip-national';
  if (level === '省级') return 'chip chip-province';
  return 'chip chip-school';
};

function splitTags(value: string) {
  return value ? value.split(/[,，]/).map((t) => t.trim()).filter(Boolean) : [];
}

function formatDateForInput(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateOffset(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toCompetitionPayload(form: PublishFormState, status: PublishStatus) {
  return {
    name: form.title,
    level: form.level || '校级',
    category: form.category || 'A',
    organizer: form.organizer,
    startTime: form.regStart || null,
    endTime: form.regEnd || null,
    competitionStart: form.activityStart || null,
    competitionEnd: form.activityEnd || null,
    maxTeamSize: form.maxTeamSize,
    coverUrl: form.coverUrl,
    sourceUrl: form.sourceUrl || null,
    content: form.detailContent || form.description,
    tags: splitTags(form.tags),
    tracks: form.tracks,
    status,
  };
}

function toActivityPayload(form: PublishFormState, status: PublishStatus) {
  return {
    type: form.activityType,
    title: form.title,
    level: form.level || null,
    category: form.category,
    organizer: form.organizer,
    startTime: form.regStart || null,
    endTime: form.regEnd || null,
    activityStart: form.activityStart || null,
    activityEnd: form.activityEnd || null,
    maxTeamSize: form.maxTeamSize,
    maxParticipants: form.maxParticipants > 0 ? form.maxParticipants : null,
    coverUrl: form.coverUrl,
    content: form.detailContent || form.description,
    tags: splitTags(form.tags),
    tracks: form.tracks,
    location: form.location || null,
    serviceHours: form.serviceHours ? Number(form.serviceHours) : null,
    status,
    config: {
      sourceUrl: form.sourceUrl || null,
    },
  };
}

export default function CompetitionPublish() {
  const navigate = useNavigate();
  const { id, activityId } = useParams<{ id?: string; activityId?: string }>();
  const isCompetitionEdit = !!id;
  const isActivityEdit = !!activityId;
  const isEdit = isCompetitionEdit || isActivityEdit;

  const [form, setForm] = useState<PublishFormState>({ ...defaultForm });
  const [errors, setErrors] = useState<Partial<Record<keyof PublishFormState, string>>>({});
  const [categories, setCategories] = useState<ActivityCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [coverDisplayUrl, setCoverDisplayUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<'manual' | 'ai-import'>('manual');

  const text = typeText[form.activityType];
  const trackUnit = form.activityType === 'competition' ? '赛道' : form.activityType === 'volunteer' ? '岗位' : '项目';
  const categoryLabel = categories.find((c) => c.code === form.category)?.name || form.category;

  useEffect(() => {
    if (!form.coverUrl) {
      setCoverDisplayUrl('');
      return;
    }
    setCoverDisplayUrl(form.coverUrl);
  }, [form.coverUrl]);

  useEffect(() => {
    let cancelled = false;
    const loadCategories = async () => {
      try {
        setCategoryLoading(true);
        const list = await listActivityCategories(form.activityType);
        if (cancelled) return;
        setCategories(list);
        setForm((prev) => {
          if (!prev.category) return prev;
          return list.some((item) => item.code === prev.category || item.name === prev.category) ? prev : prev;
        });
      } catch (err) {
        console.error(err);
        if (!cancelled) toast.error('活动分类加载失败');
      } finally {
        if (!cancelled) setCategoryLoading(false);
      }
    };
    loadCategories();
    return () => {
      cancelled = true;
    };
  }, [form.activityType]);

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
          ...defaultForm,
          activityType: 'competition',
          title: data.name || '',
          level: data.level || '',
          category: data.category || '',
          status: data.status || 'draft',
          organizer: data.organizer || '',
          regStart: formatDateForInput(data.startTime),
          regEnd: formatDateForInput(data.endTime),
          activityStart: formatDateForInput(data.competitionStart),
          activityEnd: formatDateForInput(data.competitionEnd),
          description: data.content || '',
          detailContent: '',
          tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
          coverUrl: data.coverUrl || '',
          sourceUrl: data.sourceUrl || '',
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

  useEffect(() => {
    if (!activityId) return;
    const load = async () => {
      try {
        setPageLoading(true);
        const data: any = await apiClient.get(`/activities/${activityId}`);
        if (!data) {
          toast.error('活动不存在');
          navigate('/admin/competitions');
          return;
        }
        setForm({
          ...defaultForm,
          activityType: data.type || 'other',
          title: data.title || '',
          level: data.level || '',
          category: data.category || '',
          status: data.status || 'draft',
          organizer: data.organizer || '',
          regStart: formatDateForInput(data.startTime),
          regEnd: formatDateForInput(data.endTime),
          activityStart: formatDateForInput(data.activityStart),
          activityEnd: formatDateForInput(data.activityEnd),
          description: data.content || '',
          detailContent: '',
          tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
          coverUrl: data.coverUrl || '',
          sourceUrl: data.config?.sourceUrl || '',
          maxTeamSize: data.maxTeamSize || 1,
          maxParticipants: data.maxParticipants || 0,
          location: data.location || '',
          serviceHours: data.serviceHours != null ? String(data.serviceHours) : '',
          tracks: Array.isArray(data.tracks) ? data.tracks : [],
        });
      } catch (err) {
        console.error('Failed to load activity', err);
        toast.error('加载活动信息失败');
        navigate('/admin/competitions');
      } finally {
        setPageLoading(false);
      }
    };
    load();
  }, [activityId, navigate]);

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

  const handleTypeChange = (type: ActivityType) => {
    setForm((prev) => ({
      ...prev,
      activityType: type,
      category: '',
      level: type === 'competition' ? prev.level : prev.level || '校级',
      maxTeamSize: type === 'competition' ? prev.maxTeamSize : Math.max(prev.maxTeamSize, 1),
      tracks: [],
    }));
    setNewCategoryName('');
    setErrors({});
  };

  const toggleTrack = (track: string) => {
    setForm((prev) => ({
      ...prev,
      tracks: prev.tracks.includes(track)
        ? prev.tracks.filter((t) => t !== track)
        : [...prev.tracks, track],
    }));
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      toast.error('请输入分类名称');
      return;
    }
    try {
      setCategoryLoading(true);
      const created = await createActivityCategory({
        type: form.activityType,
        name,
      });
      setCategories((prev) => [...prev.filter((item) => item.code !== created.code), created]);
      updateField('category', created.code);
      setNewCategoryName('');
      toast.success('分类已创建');
    } catch (err: any) {
      toast.error(err?.message || '创建分类失败');
    } finally {
      setCategoryLoading(false);
    }
  };

  const validate = (status: PublishStatus): boolean => {
    const errs: Partial<Record<keyof PublishFormState, string>> = {};
    if (status === 'published') {
      if (!form.title.trim()) errs.title = `请输入${text.title}`;
      if (!form.category) errs.category = '请选择或创建分类';
      if (!form.organizer.trim()) errs.organizer = '请输入主办单位';
      if (!form.level) errs.level = '请选择级别';
      if (!form.regStart || !form.regEnd) errs.regStart = '请填写报名时间';
      if (!form.activityStart || !form.activityEnd) errs.activityStart = `请填写${text.stage}`;
      if (!form.description.trim() && !form.detailContent.trim()) errs.description = `请输入${text.noun}简介`;
      if (form.activityType === 'volunteer' && !form.location.trim()) errs.location = '请输入服务地点';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (status: 'draft' | 'published') => {
    if (!validate(status)) return;
    setLoading(true);
    try {
      const fallbackForm = status === 'draft'
        ? {
            ...form,
            title: form.title || `未命名${text.noun}`,
            level: form.level || '校级',
            category: form.category || categories[0]?.code || 'A',
            organizer: form.organizer || '待补充',
            regStart: form.regStart || formatDateOffset(0),
            regEnd: form.regEnd || formatDateOffset(30),
            activityStart: form.activityStart || formatDateOffset(31),
            activityEnd: form.activityEnd || formatDateOffset(32),
            maxTeamSize: form.maxTeamSize > 0 ? form.maxTeamSize : 1,
          }
        : form;
      const payloadStatus = status === 'draft'
        ? 'draft'
        : (isEdit && form.status && form.status !== 'draft' ? form.status : 'published');

      if (fallbackForm.activityType === 'competition') {
        const payload = toCompetitionPayload(fallbackForm, payloadStatus as PublishStatus);
        if (isCompetitionEdit) {
          await apiClient.put(`/competition/admin/update/${id}`, payload);
          toast.success('更新成功');
        } else {
          await apiClient.post('/competition/admin/publish', payload);
          toast.success(status === 'draft' ? '已保存为草稿' : '发布成功');
        }
      } else {
        const payload = toActivityPayload(fallbackForm, payloadStatus as PublishStatus);
        if (isActivityEdit) {
          await apiClient.put(`/activities/${activityId}`, payload);
          toast.success('更新成功');
        } else {
          await apiClient.post('/activities', payload);
          toast.success(status === 'draft' ? '活动草稿已保存' : '活动已上架');
        }
      }
      navigate('/admin/competitions');
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error?.message || (isEdit ? '更新失败' : '发布失败'));
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
      <div className="py-section text-center text-placeholder">
        <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
        <p className="mt-2 text-[14px]">加载中…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-32">
      <PageHero
        eyebrow={isEdit ? 'Edit' : 'Publish'}
        title={isEdit ? `编辑${text.noun}` : '发布新活动'}
        description={isEdit ? `修改${text.noun}信息，保存后立即生效。` : '发布竞赛、志愿服务、文体活动或其他校内活动，并维护可复用的活动分类。'}
      />

      {!isEdit && (
        <div className="flex rounded-sm border border-hairline bg-canvas-parchment p-1 self-start">
          {([
            { key: 'manual', icon: 'edit', label: '手动创建' },
            { key: 'ai-import', icon: 'auto_awesome', label: 'AI 导入赛事' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex h-9 items-center gap-1.5 rounded-sm px-4 text-[13px] font-medium transition ${
                activeTab === tab.key ? 'bg-canvas text-ink shadow-none' : 'text-body-muted hover:text-ink'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {(isEdit || activeTab === 'manual') && (
        <div className="flex min-w-0 flex-col gap-4 xl:flex-row">
          <motion.div className="flex-1 flex flex-col gap-md min-w-0" variants={listContainer} initial="hidden" animate="visible">
            {!isEdit && (
              <motion.section variants={listItem} className="section-card">
                <div className="section-card-header">
                  <h2 className="section-card-title flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-body-muted">category</span>
                    活动类型
                  </h2>
                </div>
                <div className="section-card-body">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {activityTypes.map((type) => {
                      const active = form.activityType === type.value;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => handleTypeChange(type.value)}
                          className={`rounded-md border p-4 text-left transition ${
                            active ? 'border-primary bg-primary-soft text-ink' : 'border-border bg-canvas hover:border-primary/40'
                          }`}
                        >
                          <div className="flex items-center gap-2 text-[14px] font-medium">
                            <span className={`material-symbols-outlined text-[20px] ${active ? 'text-primary' : 'text-placeholder'}`}>{type.icon}</span>
                            {type.label}
                          </div>
                          <p className={`mt-2 text-[12px] leading-5 ${active ? 'text-body-muted' : 'text-placeholder'}`}>{type.hint}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.section>
            )}

            <motion.section variants={listItem} className="section-card">
              <div className="section-card-header">
                <h2 className="section-card-title flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-body-muted">info</span>
                  基本信息
                </h2>
              </div>
              <div className="section-card-body grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label={text.title} required error={errors.title} className="md:col-span-2">
                  <input className="input-glass" placeholder={`输入完整的${text.title}`} value={form.title} onChange={(e) => updateField('title', e.target.value)} />
                </Field>

                <Field label={`${text.noun}分类`} required error={errors.category}>
                  <div className="flex flex-col gap-2">
                    <select className="input-glass" value={form.category} onChange={(e) => updateField('category', e.target.value)}>
                      <option value="">{categoryLoading ? '分类加载中…' : '请选择分类'}</option>
                      {categories.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <input
                        className="input-glass !h-9 text-[13px]"
                        placeholder="新建分类，如：机器人、社区公益"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateCategory();
                          }
                        }}
                      />
                      <button type="button" onClick={handleCreateCategory} disabled={categoryLoading} className="btn-secondary !h-9 !px-3 !text-[12px] disabled:opacity-60">
                        新建
                      </button>
                    </div>
                  </div>
                </Field>

                <Field label="级别" required error={errors.level}>
                  <select className="input-glass" value={form.level} onChange={(e) => updateField('level', e.target.value as CompetitionLevel)}>
                    <option value="">请选择级别</option>
                    {levelOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>

                <Field label="主办单位" required error={errors.organizer} className="md:col-span-2">
                  <input className="input-glass" placeholder="输入主办单位名称" value={form.organizer} onChange={(e) => updateField('organizer', e.target.value)} />
                </Field>

                <Field label="报名时间" required error={errors.regStart} className="md:col-span-2">
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                    <input className="input-glass min-w-0 flex-1" type="date" value={form.regStart} onChange={(e) => updateField('regStart', e.target.value)} />
                    <span className="hidden text-placeholder sm:inline">→</span>
                    <input className="input-glass min-w-0 flex-1" type="date" value={form.regEnd} onChange={(e) => updateField('regEnd', e.target.value)} />
                  </div>
                </Field>

                <Field label={text.stage} required error={errors.activityStart} className="md:col-span-2">
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                    <input className="input-glass min-w-0 flex-1" type="date" value={form.activityStart} onChange={(e) => updateField('activityStart', e.target.value)} />
                    <span className="hidden text-placeholder sm:inline">→</span>
                    <input className="input-glass min-w-0 flex-1" type="date" value={form.activityEnd} onChange={(e) => updateField('activityEnd', e.target.value)} />
                  </div>
                </Field>

                <Field label={form.activityType === 'competition' ? '最大团队人数' : '每组最多人数'}>
                  <input className="input-glass" type="number" min={1} value={form.maxTeamSize} onChange={(e) => updateField('maxTeamSize', Number(e.target.value) || 1)} />
                </Field>

                {form.activityType !== 'competition' && (
                  <Field label="人数上限">
                    <input className="input-glass" type="number" min={0} value={form.maxParticipants} onChange={(e) => updateField('maxParticipants', Number(e.target.value) || 0)} />
                  </Field>
                )}

                {form.activityType !== 'competition' && (
                  <Field label={form.activityType === 'volunteer' ? '服务地点' : '活动地点'} required={form.activityType === 'volunteer'} error={errors.location}>
                    <input className="input-glass" placeholder="如：图书馆一楼、社区服务中心" value={form.location} onChange={(e) => updateField('location', e.target.value)} />
                  </Field>
                )}

                {form.activityType === 'volunteer' && (
                  <Field label="服务时长">
                    <input className="input-glass" type="number" min={0} step={0.5} placeholder="小时" value={form.serviceHours} onChange={(e) => updateField('serviceHours', e.target.value)} />
                  </Field>
                )}

                <Field label="官网 / 公告链接" className="md:col-span-2">
                  <input className="input-glass" placeholder="https://example.edu.cn/notice（选填）" value={form.sourceUrl} onChange={(e) => updateField('sourceUrl', e.target.value)} />
                </Field>

                <Field label={`${text.noun}封面`} className="md:col-span-2">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onCoverDrop}
                    className="rounded-lg border border-dashed border-hairline bg-canvas p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-primary/3 transition group relative overflow-hidden"
                  >
                    {form.coverUrl ? (
                      <>
                        <LazyImage src={coverDisplayUrl || form.coverUrl} alt="封面预览" className="absolute inset-0 w-full h-full object-cover" onError={handleCoverLoadError} />
                        <div className="relative z-10 bg-canvas border border-hairline px-3 py-1.5 rounded-lg text-ink text-[12px]">点击或拖拽以替换封面</div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-md bg-surface-tile-1 grid place-items-center text-placeholder mb-3">
                          <span className="material-symbols-outlined">{uploading ? 'hourglass_top' : 'add_photo_alternate'}</span>
                        </div>
                        <p className="text-[14px] text-ink">{uploading ? '上传中…' : '点击或拖拽上传图片'}</p>
                        <p className="text-[12px] text-placeholder mt-1">推荐 16:9，JPG / PNG，最大 5MB</p>
                      </>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onCoverInputChange} />
                  </div>
                </Field>
              </div>
            </motion.section>

            <motion.section variants={listItem} className="section-card">
              <div className="section-card-header">
                <h2 className="section-card-title flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-body-muted">description</span>
                  {text.noun}内容
                </h2>
              </div>
              <div className="section-card-body flex flex-col gap-4">
                <Field label={`${text.noun}简介`} required error={errors.description}>
                  <textarea className="input-glass !h-auto py-2.5 resize-none" rows={3} placeholder={`简要描述${text.noun}背景、目标和参与方式…`} value={form.description} onChange={(e) => updateField('description', e.target.value)} />
                </Field>

                <Field label="详细要求与流程">
                  <textarea className="input-glass !h-auto py-3 resize-none" rows={8} placeholder="在此编辑详细内容、流程安排、材料要求…" value={form.detailContent} onChange={(e) => updateField('detailContent', e.target.value)} />
                </Field>

                <Field label="标签">
                  <input className="input-glass" placeholder="输入标签，用逗号分隔，如：IT/计算机, 公益服务" value={form.tags} onChange={(e) => updateField('tags', e.target.value)} />
                </Field>
              </div>
            </motion.section>

            <motion.section variants={listItem} className="section-card">
              <div className="section-card-header">
                <h2 className="section-card-title flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-body-muted">settings</span>
                  {text.track}
                </h2>
              </div>
              <div className="section-card-body">
              <p className="mb-4 text-[13px] text-body-muted">{text.trackHint}</p>

              <div className="mb-4 flex flex-wrap gap-2">
                {defaultTracks[form.activityType].map((track) => {
                  const selected = form.tracks.includes(track);
                  return (
                    <button key={track}
                      type="button"
                      onClick={() => toggleTrack(track)}
                      className={`group relative flex items-center gap-2 rounded-md border py-2 pl-3 pr-4 text-[13px] font-medium transition-all ${
                        selected ? 'border-primary bg-primary text-on-primary' : 'border-border bg-canvas text-body-muted hover:border-primary/40 hover:text-ink'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {selected ? 'check_circle' : 'add_circle_outline'}
                      </span>
                      {track}
                    </button>
                  );
                })}
              </div>

              <div className="mb-4 flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-placeholder">edit</span>
                  <input
                    className="input-glass !pl-10"
                    placeholder={`输入自定义${text.track}…`}
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
                <span className="text-[12px] text-placeholder">按回车添加</span>
              </div>

              {form.tracks.length > 0 && (
                <div className="rounded-md border border-border bg-surface-tile-1 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-placeholder">flag</span>
                    <span className="text-[12px] font-medium text-body-muted">已选 {form.tracks.length} 项</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.tracks.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-md bg-surface-tile-1 border border-primary/20 text-[13px] text-body-muted font-medium group">
                        <span className="w-1.5 h-1.5 rounded-md bg-primary" />
                        {t}
                        <button type="button" onClick={() => toggleTrack(t)} className="ml-1 p-0.5 rounded-full hover:bg-surface-tile-1 text-ink hover:text-ink transition">
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              </div>
            </motion.section>

            {isCompetitionEdit && (
              <motion.section variants={listItem} className="section-card">
                <div className="section-card-header">
                  <h2 className="section-card-title flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-body-muted">route</span>
                    赛事阶段管理
                  </h2>
                </div>
                <div className="section-card-body">
                  <p className="mb-4 text-[13px] text-placeholder">按需添加赛事阶段，如院赛、校赛、省赛等。不添加阶段则使用默认报名流程。</p>
                  <StageManager competitionId={Number(id)} />
                </div>
              </motion.section>
            )}
          </motion.div>

          <div className="w-full shrink-0 xl:w-[340px] 2xl:w-[380px]">
            <div className="flex flex-col gap-3 xl:sticky xl:top-[88px]">
              <h3 className="text-[12px] text-placeholder px-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]">visibility</span>
                发布效果预览
              </h3>
              <div className="section-card overflow-hidden">
                <div className="aspect-video bg-canvas-parchment relative overflow-hidden">
                  <LazyImage src={form.coverUrl ? (coverDisplayUrl || form.coverUrl) : ''} alt="封面预览" className="absolute inset-0 w-full h-full object-cover" onError={handleCoverLoadError} />
                  <div className="absolute top-3 left-3 chip chip-success">
                    <span className="w-1.5 h-1.5 rounded-md bg-success" />
                    <span>{form.activityType === 'competition' ? '报名中' : '招募中'}</span>
                  </div>
                </div>
                <div className="p-md">
                  <h4 className="font-display font-semibold text-[17px] leading-snug text-ink mb-2 break-words">
                    {form.title || `${text.noun}名称将在这里显示…`}
                  </h4>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="chip chip-primary">{activityTypes.find((o) => o.value === form.activityType)?.label}</span>
                    {form.category && <span className="chip">{categoryLabel}</span>}
                    {form.level && <span className={levelChipClass(form.level)}>{form.level}</span>}
                    {form.tracks.length > 0 && <span className="chip">{form.tracks.length} 项{trackUnit}</span>}
                  </div>
                  <div className="flex flex-col gap-2 mb-4 text-[12px]">
                    <PreviewLine icon="apartment" label="主办" value={form.organizer || '主办单位名称'} />
                    <PreviewLine icon="how_to_reg" label="报名" value={form.regStart && form.regEnd ? `${form.regStart} ~ ${form.regEnd}` : 'YYYY/MM/DD - YYYY/MM/DD'} />
                    <PreviewLine icon="event" label={text.stage.replace('时间', '')} value={form.activityStart && form.activityEnd ? `${form.activityStart} ~ ${form.activityEnd}` : 'YYYY/MM/DD - YYYY/MM/DD'} />
                    {form.location && <PreviewLine icon="place" label="地点" value={form.location} />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ai-import' && !isEdit && (
        <AiImportPanel onParsed={(draft) => {
          const mapped = aiDraftToPublishForm(draft);
          setForm((prev) => ({ ...prev, ...mapped, activityType: 'competition' }));
          setActiveTab('manual');
          toast.success('已将 AI 解析结果填入赛事表单，请核对后保存');
        }} />
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40 md:left-[200px]">
        <div className="bg-canvas border-t border-hairline px-lg py-3">
          <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-3">
            <button type="button" onClick={() => navigate('/admin/competitions')} className="btn-secondary">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              返回
            </button>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => handleSubmit('draft')} disabled={loading || uploading} className="btn-secondary disabled:opacity-60">
                {isEdit && form.status && form.status !== 'draft' ? '转为草稿' : '保存草稿'}
              </button>
              <button type="button" onClick={() => handleSubmit('published')} disabled={loading || uploading} className="btn-primary disabled:opacity-60">
                <span className="material-symbols-outlined text-[18px]">publish</span>
                {loading ? '提交中…' : isEdit && form.status !== 'draft' ? '保存修改' : form.activityType === 'competition' ? '发布赛事' : '上架活动'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
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
          <span className="w-6 h-6 rounded-md bg-surface-tile-1 text-ink text-[12px] font-medium grid place-items-center">{stage.stageOrder}</span>
          <div className="flex-1 min-w-0">
            <span className="text-[14px] font-medium text-ink">{stage.name}</span>
            {stage.startTime && (
              <span className="text-[12px] text-placeholder ml-2">
                {new Date(stage.startTime).toLocaleDateString('zh-CN')} — {stage.endTime ? new Date(stage.endTime).toLocaleDateString('zh-CN') : ''}
              </span>
            )}
          </div>
          <select value={stage.status} onChange={(e) => handleStatusChange(stage.id, e.target.value)} className="input-glass !w-auto !h-8 !text-[12px] !px-2">
            <option value="upcoming">未开始</option>
            <option value="active">进行中</option>
            <option value="closed">已结束</option>
          </select>
          <button onClick={() => handleDelete(stage.id)} className="p-1 rounded-md text-placeholder hover:text-error hover:bg-error/8 transition">
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
            <div className="p-3 rounded-lg border border-primary/30 bg-hover-overlay flex flex-col gap-2">
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
          <button key="add-btn" type="button" onClick={() => setShowAdd(true)} className="flex items-center gap-2 text-[13px] text-body-muted hover:text-ink font-medium">
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            添加阶段
          </button>
        )}
      </AnimatePresence>

      <ConfirmModal isOpen={isOpen} onClose={close} onConfirm={() => {}} title={title} message={message} variant={variant} />
    </div>
  );
}

function Field({ label, required, error, children, className = '' }: { label: string; required?: boolean; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
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
      <span className="material-symbols-outlined text-[14px] text-placeholder mt-0.5">{icon}</span>
      <span className="text-placeholder mr-1">{label}:</span>
      <span className="text-body-muted min-w-0 flex-1 break-words">{value}</span>
    </div>
  );
}
