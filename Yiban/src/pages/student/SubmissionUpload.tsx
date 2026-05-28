import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiClient from '../../api/client';
import { uploadToQiniu } from '../../api/qiniu';
import PageHero from '../../components/PageHero';

type Registration = {
  id: number | string;
  competitionId: number | string;
  studentId: number | string;
  teamName?: string;
  status: string;
  submitDate?: string;
  reviewNote?: string;
  approved?: boolean;
};

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function SubmissionUpload() {
  const { registrationId } = useParams<{ registrationId: string }>();
  const navigate = useNavigate();

  const [registration, setRegistration] = useState<Registration | null>(null);
  const [competitionName, setCompetitionName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data: any = await apiClient.get('/registration/my');
        const reg: Registration | undefined = (Array.isArray(data) ? data : []).find(
          (r: any) => String(r.id) === String(registrationId)
        );
        setRegistration(reg || null);
        if (reg) {
          try {
            const c: any = await apiClient.get(`/competition/detail/${reg.competitionId}`);
            if (c?.name) setCompetitionName(c.name);
          } catch {
            // ignore
          }
        }
      } catch (err) {
        console.error('Failed to fetch registration', err);
      } finally {
        setLoading(false);
      }
    };
    if (registrationId) {
      fetchData();
    }
  }, [registrationId]);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setFileSize(selectedFile.size);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFileSelect(selectedFile);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async () => {
    if (!registration || !file) {
      toast.error('请先选择附件');
      return;
    }
    try {
      setSubmitting(true);
      setUploadProgress(0);
      const result = await uploadToQiniu(file, setUploadProgress);
      await apiClient.post('/submission/submit', null, {
        params: {
          registrationId: registration.id,
          fileName: file.name,
          fileUrl: result.url,
          fileSize: result.fsize,
        },
      });
      toast.success('提交成功');
      navigate('/student/registrations');
    } catch (err: any) {
      console.error('Failed to submit', err);
      toast.error(err.message || '提交失败，请重试');
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
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

  if (!registration) {
    return (
      <div className="py-section text-center">
        <span className="material-symbols-outlined text-[40px] text-ink-muted-48">search_off</span>
        <p className="mt-3 text-[15px] text-ink-muted-80">报名记录不存在</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="py-lg flex flex-col gap-lg"
    >
      {/* Breadcrumb + actions */}
      <PageHero
        title="上传成果"
        prefix={(
          <nav className="flex items-center gap-1 text-[13px] text-ink-muted-48 mb-1">
            <button onClick={() => navigate('/student/registrations')} className="hover:text-ink transition">我的报名</button>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-ink">上传成果</span>
          </nav>
        )}
        actions={(
          <>
            <button className="btn-secondary" onClick={() => navigate('/student/registrations')}>取消</button>
            <button
              onClick={handleSubmit}
              disabled={!file || submitting}
              className="btn-primary"
            >
              {submitting && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
              <span className="material-symbols-outlined text-[18px]">send</span>
              提交审核
            </button>
          </>
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        {/* Left: form */}
        <div className="lg:col-span-8 flex flex-col gap-lg">
          {/* Basic Info */}
          <section className="glass p-xl">
            {(registration.status === '审核驳回' || registration.status === '退回补充') && registration.reviewNote && (() => {
              const note = registration.reviewNote;
              const isReturn = registration.status === '退回补充' || note.startsWith('【退回补充】');
              const displayNote = isReturn ? note.replace('【退回补充】', '') : note;
              return (
                <div className={`rounded-md p-3 mb-md ${isReturn ? 'bg-warning/5 border border-warning/15' : 'bg-error/5 border border-error/15'}`}>
                  <div className="flex items-start gap-2">
                    <span className={`material-symbols-outlined text-[16px] mt-0.5 shrink-0 ${isReturn ? 'text-warning' : 'text-error'}`}>
                      {isReturn ? 'assignment_return' : 'info'}
                    </span>
                    <div>
                      <p className={`text-[12px] font-medium mb-0.5 ${isReturn ? 'text-warning' : 'text-error'}`}>
                        {isReturn ? '请根据以下意见补充材料' : '上次驳回原因'}
                      </p>
                      <p className="text-[13px] text-ink">{displayNote}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
            <h3 className="text-[19px] font-semibold tracking-tight text-ink mb-md pb-md border-b border-hairline">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[13px] font-medium text-ink">
                  <span className="text-error mr-1">*</span>赛事名称
                </label>
                <input className="input-glass" readOnly value={competitionName || `赛事 #${registration.competitionId}`} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-ink">
                  团队名称
                </label>
                <input className="input-glass" readOnly value={registration.teamName || '未设置'} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-ink">
                  报名日期
                </label>
                <input className="input-glass" readOnly value={formatDate(registration.submitDate)} />
              </div>
            </div>
          </section>

          {/* Upload */}
          <section className="glass p-xl">
            <div className="flex items-center justify-between mb-md pb-md border-b border-hairline">
              <h3 className="text-[19px] font-semibold tracking-tight text-ink">附件材料</h3>
              <span className="chip">{fileName ? '已上传 1/1' : '已上传 0/1'}</span>
            </div>

            {fileName ? (
              <div className="rounded-md border border-hairline p-3 bg-canvas flex items-center justify-between group hover:border-primary/40 transition">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-md bg-primary/10 grid place-items-center text-primary">
                    <span className="material-symbols-outlined icon-fill">description</span>
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-ink">{fileName}</p>
                    <p className="text-[11px] text-ink-muted-48 mt-0.5">{formatFileSize(fileSize)}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setFile(null); setFileName(''); setFileSize(0); }}
                  className="text-ink-muted-48 hover:text-primary p-2 rounded-md hover:bg-primary/6 transition"
                  title="删除"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>
            ) : (
              <div
                className={`rounded-md border-2 border-dashed p-section flex flex-col items-center justify-center text-center transition-all cursor-pointer group ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-hairline bg-canvas hover:border-primary/50 hover:bg-primary/3'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <div className={`w-14 h-14 rounded-full grid place-items-center mb-3 transition ${
                  isDragging ? 'bg-primary/15' : 'bg-canvas-parchment group-hover:bg-primary/10'
                }`}>
                  <span className={`material-symbols-outlined text-[28px] ${
                    isDragging ? 'text-primary' : 'text-ink-muted-48 group-hover:text-primary'
                  }`}>cloud_upload</span>
                </div>
                <p className="text-[15px] font-semibold text-ink mb-1">点击或拖拽文件到这里</p>
                <p className="text-[12px] text-ink-muted-48">支持 .pdf, .doc, .docx, .jpg, .png, .zip · 限 50 MB</p>
                <input
                  id="file-input"
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.zip,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={handleInputChange}
                />
              </div>
            )}
            {submitting && (
              <div className="mt-3">
                <div className="flex justify-between text-[11px] text-ink-muted-48 mb-1">
                  <span>上传中…</span>
                  <span className="tabular-nums">{uploadProgress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-primary/8 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right: instructions */}
        <aside className="lg:col-span-4 flex flex-col gap-md lg:sticky lg:top-[68px] lg:h-fit">
          <div className="glass p-lg">
            <h3 className="text-[15px] font-semibold text-ink mb-md flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">gavel</span>
              审核说明
            </h3>
            <div className="flex flex-col gap-md">
              <div>
                <h4 className="text-[13px] font-medium text-ink mb-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  材料要求
                </h4>
                <p className="text-[12px] text-ink-muted-80 leading-relaxed pl-3 border-l-2 border-primary/20">
                  附件需清晰可见，包含完整的赛事名称、获奖级别、个人姓名及主办方公章。
                </p>
              </div>
              <div>
                <h4 className="text-[13px] font-medium text-ink mb-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-error" />
                  常见驳回原因
                </h4>
                <ul className="flex flex-col gap-1.5">
                  {[
                    '证书图片模糊，无法辨认关键信息',
                    '填写的获奖等级与上传证书不符',
                    '证明材料缺失官方印章或防伪标识',
                  ].map((item) => (
                    <li key={item} className="text-[12px] text-ink-muted-80 flex items-start gap-1.5 leading-relaxed">
                      <span className="material-symbols-outlined text-[13px] text-error mt-0.5 shrink-0">close</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}
