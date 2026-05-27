import { toast } from 'sonner';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import type { CompetitionLevel, CompetitionCategory } from '../../types';
import PageHero from '../../components/PageHero';

interface PublishFormState {
  title: string;
  level: CompetitionLevel | '';
  category: CompetitionCategory | '';
  organizer: string;
  regStart: string;
  regEnd: string;
  compStart: string;
  compEnd: string;
  description: string;
  detailContent: string;
  tags: string;
  openTeam: boolean;
  showExcellent: boolean;
  coverUrl: string;
  maxTeamSize: number;
}

interface UploadResponse {
  fileName: string;
  fileUrl: string;
  fileSize: number;
}

// Map the form state to the backend EventPublishDTO shape.
// Backend expects: name, level, category, startTime, endTime,
// competitionStart, competitionEnd, maxTeamSize, coverUrl, content, status.
const toPublishPayload = (
  form: PublishFormState,
  status: 'draft' | 'published'
) => ({
  name: form.title,
  level: form.level || '校级',
  category: form.category || 'A',
  startTime: form.regStart,
  endTime: form.regEnd,
  competitionStart: form.compStart,
  competitionEnd: form.compEnd,
  maxTeamSize: form.maxTeamSize,
  coverUrl: form.coverUrl,
  content: form.detailContent || form.description,
  status,
});

const levelOptions: { value: CompetitionLevel; label: string }[] = [
  { value: '国家级', label: '国家级' },
  { value: '省级', label: '省级' },
  { value: '校级', label: '校级' },
];

const categoryOptions: { value: CompetitionCategory; label: string }[] = [
  { value: 'A', label: '科技创新' },
  { value: 'B', label: '商业创业' },
  { value: 'C', label: '文化艺术' },
];

const tracks = ['AI 与大数据', '软件开发', '硬件创新', '创业实践', '学术论文'];

export default function CompetitionPublish() {
  const navigate = useNavigate();

  const [form, setForm] = useState<PublishFormState>({
    title: '',
    level: '',
    category: '',
    organizer: '',
    regStart: '',
    regEnd: '',
    compStart: '',
    compEnd: '',
    description: '',
    detailContent: '',
    tags: '',
    openTeam: true,
    showExcellent: false,
    coverUrl: '',
    maxTeamSize: 5,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof PublishFormState, string>>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await apiClient.post('/competition/admin/publish', toPublishPayload(form, 'published'));
      toast.success('发布成功');
      navigate('/admin/competitions');
    } catch (error) {
      console.error('Publish error:', error);
      toast.error('发布失败，请检查网络或联系管理员');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setLoading(true);
    try {
      const draftForm: PublishFormState = {
        ...form,
        title: form.title || '未命名赛事',
        level: form.level || '校级',
        category: form.category || 'A',
      };
      await apiClient.post('/competition/admin/publish', toPublishPayload(draftForm, 'draft'));
      toast.success('已保存为草稿');
      navigate('/admin/competitions');
    } catch (error) {
      console.error('Save draft error:', error);
      toast.error('保存失败');
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
    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    try {
      const res: UploadResponse = await apiClient.post('/file/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res?.fileUrl) {
        updateField('coverUrl', res.fileUrl);
        toast.success('封面上传成功');
      } else {
        toast.error('上传失败，未收到文件地址');
      }
    } catch (err) {
      console.error('Cover upload error:', err);
      toast.error('封面上传失败');
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

  return (
    <div className="py-lg flex flex-col gap-lg pb-32">
      {/* Header */}
      <PageHero
        eyebrow="Publish"
        title="发布新赛事"
        description="填写赛事基本信息，右侧预览即时反映你的修改。"
      />

      <div className="flex flex-col lg:flex-row gap-lg">
        {/* Left: Form */}
        <div className="flex-1 flex flex-col gap-md min-w-0">
          {/* Basic info */}
          <section className="glass p-lg">
            <div className="flex items-center gap-2 mb-md pb-3 border-b border-hairline">
              <span className="material-symbols-outlined text-[20px] text-primary">info</span>
              <h2 className="text-[17px] font-semibold tracking-tight text-ink">基本信息</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <Field label="赛事名称" required error={errors.title} className="md:col-span-2">
                <input
                  className="input-glass"
                  placeholder="输入完整的赛事名称"
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                />
              </Field>

              <Field label="赛事分类" required error={errors.category}>
                <select
                  className="input-glass"
                  value={form.category}
                  onChange={(e) => updateField('category', e.target.value as CompetitionCategory)}
                >
                  <option value="">请选择分类</option>
                  {categoryOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="赛事级别" required error={errors.level}>
                <select
                  className="input-glass"
                  value={form.level}
                  onChange={(e) => updateField('level', e.target.value as CompetitionLevel)}
                >
                  <option value="">请选择级别</option>
                  {levelOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="主办单位" required error={errors.organizer} className="md:col-span-2">
                <input
                  className="input-glass"
                  placeholder="输入主办单位名称，多个用逗号分隔"
                  value={form.organizer}
                  onChange={(e) => updateField('organizer', e.target.value)}
                />
              </Field>

              <Field label="报名时间" required error={errors.regStart}>
                <div className="flex items-center gap-2">
                  <input
                    className="input-glass"
                    type="date"
                    value={form.regStart}
                    onChange={(e) => updateField('regStart', e.target.value)}
                  />
                  <span className="text-ink-muted-48">→</span>
                  <input
                    className="input-glass"
                    type="date"
                    value={form.regEnd}
                    onChange={(e) => updateField('regEnd', e.target.value)}
                  />
                </div>
              </Field>

              <Field label="比赛时间" required error={errors.compStart}>
                <div className="flex items-center gap-2">
                  <input
                    className="input-glass"
                    type="date"
                    value={form.compStart}
                    onChange={(e) => updateField('compStart', e.target.value)}
                  />
                  <span className="text-ink-muted-48">→</span>
                  <input
                    className="input-glass"
                    type="date"
                    value={form.compEnd}
                    onChange={(e) => updateField('compEnd', e.target.value)}
                  />
                </div>
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
                        src={form.coverUrl}
                        alt="封面预览"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="relative z-10 bg-canvas/90 border border-hairline px-3 py-1.5 rounded-pill text-ink text-[12px]">
                        点击或拖拽以替换封面
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-primary/10 grid place-items-center text-primary mb-3 group-hover:scale-110 transition">
                        <span className="material-symbols-outlined">
                          {uploading ? 'hourglass_top' : 'add_photo_alternate'}
                        </span>
                      </div>
                      <p className="text-[14px] text-ink">{uploading ? '上传中…' : '点击或拖拽上传图片'}</p>
                      <p className="text-[12px] text-ink-muted-48 mt-1">推荐 16:9，JPG / PNG，最大 5MB</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onCoverInputChange}
                  />
                </div>
              </Field>
            </div>
          </section>

          {/* Content */}
          <section className="glass p-lg">
            <div className="flex items-center gap-2 mb-md pb-3 border-b border-hairline">
              <span className="material-symbols-outlined text-[20px] text-primary">description</span>
              <h2 className="text-[17px] font-semibold tracking-tight text-ink">赛事内容</h2>
            </div>
            <div className="flex flex-col gap-md">
              <Field label="赛事简介" required error={errors.description}>
                <textarea
                  className="input-glass !h-auto py-2.5 resize-none"
                  rows={3}
                  placeholder="简要描述赛事背景和目的…"
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                />
              </Field>

              <Field label="详细要求与流程">
                <div className="rounded-t-lg border border-hairline border-b-0 bg-canvas p-2 flex flex-wrap gap-1">
                  {['format_bold', 'format_italic', 'format_underlined', 'format_list_bulleted', 'format_list_numbered', 'link', 'image'].map((icon) => (
                    <button key={icon} type="button" className="p-1.5 rounded hover:bg-primary/6 text-ink-muted-80 transition">
                      <span className="material-symbols-outlined text-[16px]">{icon}</span>
                    </button>
                  ))}
                </div>
                <textarea
                  className="input-glass !h-auto !rounded-t-none py-3 resize-none"
                  rows={8}
                  placeholder="在此编辑赛事详细内容…"
                  value={form.detailContent}
                  onChange={(e) => updateField('detailContent', e.target.value)}
                />
              </Field>

              <Field label="标签">
                <input
                  className="input-glass"
                  placeholder="输入标签，用逗号分隔，如：IT/计算机, 创新创业"
                  value={form.tags}
                  onChange={(e) => updateField('tags', e.target.value)}
                />
              </Field>
            </div>
          </section>

          {/* Settings */}
          <section className="glass p-lg">
            <div className="flex items-center gap-2 mb-md pb-3 border-b border-hairline">
              <span className="material-symbols-outlined text-[20px] text-primary">settings</span>
              <h2 className="text-[17px] font-semibold tracking-tight text-ink">扩展设置</h2>
            </div>
            <div className="flex flex-col gap-3">
              <Toggle
                label="开放组队"
                description="允许选手在平台上寻找队友并组建队伍"
                checked={form.openTeam}
                onChange={(v) => updateField('openTeam', v)}
              />
              <Toggle
                label="展示优秀作品"
                description="赛事结束后，允许将获奖作品展示在公共区域"
                checked={form.showExcellent}
                onChange={(v) => updateField('showExcellent', v)}
              />
              <div className="pt-3 border-t border-hairline">
                <label className="text-[13px] font-medium text-ink mb-2 block">参赛赛道</label>
                <div className="flex flex-wrap gap-2">
                  {tracks.map((track) => (
                    <label key={track} className="flex items-center gap-2 px-3 py-1.5 rounded-pill bg-canvas border border-hairline cursor-pointer hover:border-primary/30 transition">
                      <input type="checkbox" className="w-3.5 h-3.5 rounded-xs accent-primary cursor-pointer" />
                      <span className="text-[12px] text-ink-muted-80">{track}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right: Preview */}
        <div className="w-full lg:w-[380px] shrink-0">
          <div className="sticky top-[88px] flex flex-col gap-3">
            <h3 className="text-[12px] uppercase tracking-[0.18em] text-ink-muted-48 px-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">visibility</span>
              发布效果预览
            </h3>
            <div className="glass-strong overflow-hidden rounded-lg">
              {/* Cover */}
              <div className="aspect-video bg-canvas-parchment relative overflow-hidden">
                {form.coverUrl ? (
                  <img src={form.coverUrl} alt="封面预览" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-ink-muted-48 flex-col gap-2">
                    <span className="material-symbols-outlined text-[40px] opacity-30">image</span>
                    <span className="text-[11px]">封面预览</span>
                  </div>
                )}
                <div className="absolute top-3 left-3 glass-tint px-2.5 py-1 rounded-pill flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  <span className="text-[10px] font-medium text-ink">报名中</span>
                </div>
              </div>
              <div className="p-md">
                <h4 className="font-display font-semibold text-[17px] leading-snug text-ink mb-2">
                  {form.title || '赛事名称将在这里显示…'}
                </h4>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {form.category && (
                    <span className="chip chip-primary">{categoryOptions.find((o) => o.value === form.category)?.label}</span>
                  )}
                  {form.level && <span className="chip">{form.level}</span>}
                  {form.openTeam && <span className="chip">支持组队</span>}
                </div>
                <div className="flex flex-col gap-2 mb-4 text-[12px]">
                  <PreviewLine icon="apartment" label="主办" value={form.organizer || '主办单位名称'} />
                  <PreviewLine
                    icon="how_to_reg"
                    label="报名"
                    value={form.regStart && form.regEnd ? `${form.regStart} ~ ${form.regEnd}` : 'YYYY/MM/DD - YYYY/MM/DD'}
                  />
                  <PreviewLine
                    icon="event"
                    label="比赛"
                    value={form.compStart && form.compEnd ? `${form.compStart} ~ ${form.compEnd}` : 'YYYY/MM/DD - YYYY/MM/DD'}
                  />
                </div>
                <div className="flex gap-2">
                  <button className="btn-secondary flex-1 opacity-70 cursor-not-allowed !py-2">查看详情</button>
                  <button className="btn-primary flex-1 opacity-70 cursor-not-allowed !py-2">立即报名</button>
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
            <div className="text-[12px] text-ink-muted-48 flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">edit_note</span>
              未保存的更改
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleSaveDraft} disabled={loading || uploading} className="btn-secondary disabled:opacity-60 disabled:cursor-not-allowed">
                保存草稿
              </button>
              <button type="button" onClick={handlePublish} disabled={loading || uploading} className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed">
                <span className="material-symbols-outlined text-[18px]">publish</span>
                {loading ? '提交中…' : '发布赛事'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
  className = '',
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-[13px] font-medium text-ink">
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </label>
      {children}
      {error && <span className="text-[11px] text-error">{error}</span>}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-md bg-canvas border border-hairline">
      <div className="flex-1 mr-3">
        <h3 className="text-[13px] font-medium text-ink">{label}</h3>
        <p className="text-[11px] text-ink-muted-80 mt-0.5">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-10 h-5.5 bg-primary/12 rounded-full peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-[18px] after:h-[18px] after:bg-white after:rounded-full after:shadow after:transition-transform peer-checked:after:translate-x-[18px]"></div>
      </label>
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
