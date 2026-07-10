import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { uploadToQiniu } from '../../api/qiniu';
import PageHero from '../../components/PageHero';
import ProgressBar from '../../components/ProgressBar';

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
          } catch (err) {
            console.error(err);
          }
        }
      } catch (err: any) {
        toast.error(err.message || '加载报名信息失败');
      } finally {
        setLoading(false);
      }
    };
    if (registrationId) {
      fetchData();
    }
  }, [registrationId]);

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error(`文件大小不能超过50MB（当前: ${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB）`);
      return;
    }
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
      <div className="page-stack">
        <PageHero eyebrow="成果" title="上传成果" description="正在加载报名信息…" />
        <p className="py-10 text-center text-[13.5px] text-placeholder">加载中…</p>
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="page-stack">
        <PageHero eyebrow="成果" title="上传成果" description="未找到对应报名记录。" />
        <div className="py-10 text-center">
          <p className="text-[13.5px] text-placeholder">报名记录不存在</p>
          <button type="button" onClick={() => navigate('/student/registrations')} className="btn-primary mt-4">
            返回我的报名
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHero
        eyebrow="成果"
        title="上传成果"
        description="上传赛事成果附件，提交后进入审核流程。"
        prefix={(
          <nav className="mb-1 flex items-center gap-1 text-[13px] text-placeholder">
            <button type="button" onClick={() => navigate('/student/registrations')} className="transition hover:text-ink">
              我的报名
            </button>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-ink">上传成果</span>
          </nav>
        )}
        actions={(
          <>
            <button type="button" className="btn-secondary" onClick={() => navigate('/student/registrations')}>
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!file || submitting}
              className="btn-primary"
            >
              {submitting ? '提交中…' : '提交审核'}
            </button>
          </>
        )}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="flex flex-col gap-8 lg:col-span-8">
          <section className="page-section">
            <div className="page-section-head">
              <h3 className="page-section-title">基本信息</h3>
            </div>
            <div className="flex flex-col gap-3">
              {(registration.status === '审核驳回' || registration.status === '退回补充') && registration.reviewNote && (() => {
                const note = registration.reviewNote;
                const isReturn = registration.status === '退回补充' || note.startsWith('【退回补充】');
                const displayNote = isReturn ? note.replace('【退回补充】', '') : note;
                return (
                  <p className={`text-[13px] leading-relaxed ${isReturn ? 'text-warning' : 'text-error'}`}>
                    {isReturn ? '补充意见：' : '驳回原因：'}{displayNote}
                  </p>
                );
              })()}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[13px] font-medium text-ink">
                    <span className="mr-1 text-error">*</span>赛事名称
                  </label>
                  <input className="input-glass" readOnly value={competitionName || `赛事 #${registration.competitionId}`} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-ink">团队名称</label>
                  <input className="input-glass" readOnly value={registration.teamName || '未设置'} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-ink">报名日期</label>
                  <input className="input-glass" readOnly value={formatDate(registration.submitDate)} />
                </div>
              </div>
            </div>
          </section>

          <section className="page-section">
            <div className="page-section-head">
              <h3 className="page-section-title">附件材料</h3>
              <span className="page-section-extra">{fileName ? '已上传 1/1' : '已上传 0/1'}</span>
            </div>
            <div>
              {fileName ? (
                <div className="flat-row">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-ink">{fileName}</p>
                    <p className="mt-0.5 text-[11px] text-placeholder">{formatFileSize(fileSize)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setFile(null); setFileName(''); setFileSize(0); }}
                    className="text-placeholder transition hover:text-primary"
                    title="删除"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              ) : (
                <div
                  className={`flex cursor-pointer flex-col items-center justify-center border border-dashed px-4 py-10 text-center transition ${
                    isDragging
                      ? 'border-primary bg-primary/5'
                      : 'border-hairline hover:border-primary/50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <p className="mb-1 text-[14px] font-medium text-ink">点击或拖拽文件到这里</p>
                  <p className="text-[12px] text-placeholder">支持 .pdf, .doc, .docx, .jpg, .png, .zip · 限 50 MB</p>
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
                  <div className="mb-2 flex justify-between text-[11px] text-placeholder">
                    <span>上传中…</span>
                    <span className="tabular-nums font-medium text-primary">{uploadProgress}%</span>
                  </div>
                  <ProgressBar value={uploadProgress} size="md" showThumb segments={5} />
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="flex h-fit flex-col gap-6 lg:sticky lg:top-[68px] lg:col-span-4">
          <section className="page-section">
            <div className="page-section-head">
              <h3 className="page-section-title">审核说明</h3>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <h4 className="mb-1.5 text-[13px] font-medium text-ink">材料要求</h4>
                <p className="text-[12.5px] leading-relaxed text-body-subtle">
                  附件需清晰可见，包含完整的赛事名称、获奖级别、个人姓名及主办方公章。
                </p>
              </div>
              <div>
                <h4 className="mb-1.5 text-[13px] font-medium text-ink">常见驳回原因</h4>
                <ul className="flex flex-col gap-1.5">
                  {[
                    '证书图片模糊，无法辨认关键信息',
                    '填写的获奖等级与上传证书不符',
                    '证明材料缺失官方印章或防伪标识',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-1.5 text-[12px] leading-relaxed text-body-subtle">
                      <span className="text-placeholder">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
