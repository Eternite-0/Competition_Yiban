import { toast } from 'sonner';
import { useState, useEffect, useMemo } from 'react';
import apiClient from '../../api/client';
import { getSignedDownloadUrl } from '../../api/qiniu';
import PageHero from '../../components/PageHero';

interface Submission {
  id: string;
  studentName: string;
  competitionTitle: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  uploadDate: string;
  status: string;
  reviewNote?: string;
  source: 'registration' | 'submission'; // to pick the right audit API
  teamMembers?: { studentId: number; studentName: string; studentNo: string }[];
}

function getFileType(fileName: string): 'image' | 'pdf' | 'word' | 'other' {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'word';
  return 'other';
}

function FilePreview({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const fileType = getFileType(fileName);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setSignedUrl(null);
    if (!fileUrl) {
      setLoading(false);
      return;
    }
    getSignedDownloadUrl(fileUrl)
      .then((url) => setSignedUrl(url))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [fileUrl]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-ink-muted-48">
        <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
        <p className="text-[13px]">加载预览中…</p>
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-ink-muted-48">
        <span className="material-symbols-outlined text-[40px]">broken_image</span>
        <p className="text-[13px]">预览加载失败</p>
        {signedUrl && (
          <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-[12px] underline">
            在新标签页打开
          </a>
        )}
      </div>
    );
  }

  if (fileType === 'image') {
    return (
      <div className="flex items-center justify-center h-full p-4 overflow-auto">
        <img
          src={signedUrl}
          alt={fileName}
          className="max-w-full max-h-full object-contain rounded-md"
        />
      </div>
    );
  }

  if (fileType === 'pdf') {
    return (
      <iframe
        src={signedUrl}
        title={fileName}
        className="w-full h-full border-0 rounded-md"
      />
    );
  }

  if (fileType === 'word') {
    const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`;
    return (
      <iframe
        src={officeUrl}
        title={fileName}
        className="w-full h-full border-0 rounded-md"
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-ink-muted-48">
      <span className="material-symbols-outlined text-[48px]">folder_zip</span>
      <p className="text-[14px] font-medium text-ink">{fileName}</p>
      <p className="text-[12px]">该文件类型不支持在线预览</p>
      <a
        href={signedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary !py-2 !text-[13px] mt-1"
      >
        <span className="material-symbols-outlined text-[16px]">download</span>
        下载文件
      </a>
    </div>
  );
}

function PreviewModal({
  fileName,
  fileUrl,
  onClose,
}: {
  fileName: string;
  fileUrl: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary/15 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-canvas rounded-lg border border-hairline shadow-lg flex flex-col overflow-hidden"
        style={{ width: '90vw', height: '88vh', maxWidth: '1100px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-hairline shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-[20px] text-primary shrink-0">description</span>
            <span className="text-[14px] font-semibold text-ink truncate">{fileName}</span>
          </div>
          <button
            onClick={onClose}
            className="text-ink-muted-48 hover:text-ink p-1.5 rounded-lg hover:bg-primary/6 transition"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>
        {/* Preview area */}
        <div className="flex-1 overflow-hidden">
          <FilePreview fileUrl={fileUrl} fileName={fileName} />
        </div>
      </div>
    </div>
  );
}

export default function SubmissionAudit() {
  const [pendingSubmissions, setPendingSubmissions] = useState<Submission[]>([]);
  const [processedSubmissions, setProcessedSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'全部' | '待审核'>('全部');
  const [sendMessage, setSendMessage] = useState(true);
  const [previewFile, setPreviewFile] = useState<{ fileName: string; fileUrl: string } | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    try {
      // Fetch both sources in parallel
      const [regData, subData] = await Promise.all([
        apiClient.get('/registration/pending', { params: { current: 1, size: 50 } }).catch(() => null),
        apiClient.get('/submission/list', { params: { status: '待审核', current: 1, size: 50 } }).catch(() => null),
      ]);

      const regRecords: any[] = Array.isArray(regData) ? regData : regData?.records ?? [];
      const subRecords: any[] = Array.isArray(subData) ? subData : subData?.records ?? [];

      // Map registrations
      const fromRegs: Submission[] = regRecords.map((item: any) => ({
        id: `reg-${item.id ?? item.registrationId}`,
        studentName: item.studentName ?? (item.studentId != null ? `学号 ${item.studentId}` : '未知学生'),
        competitionTitle: item.competitionName ?? item.competitionTitle ?? (item.competitionId != null ? `赛事 #${item.competitionId}` : '未知赛事'),
        fileName: item.fileName ?? (item.teamName ? `团队：${item.teamName}` : '—'),
        fileUrl: item.fileUrl ?? '',
        fileSize: item.fileSize,
        uploadDate: item.uploadDate ?? item.submitDate ?? '',
        status: '待审核',
        source: 'registration' as const,
      }));

      // Map standalone submissions (only those without registration)
      const fromSubs: Submission[] = subRecords
        .filter((item: any) => !item.registrationId)
        .map((item: any) => ({
          id: `sub-${item.id}`,
          studentName: item.studentName ?? (item.studentId != null ? `学号 ${item.studentId}` : '未知学生'),
          competitionTitle: item.competitionName ?? (item.competitionId != null ? `赛事 #${item.competitionId}` : '未知赛事'),
          fileName: item.fileName ?? '—',
          fileUrl: item.fileUrl ?? '',
          fileSize: item.fileSize,
          uploadDate: item.uploadDate ?? '',
          status: '待审核',
          source: 'submission' as const,
          teamMembers: item.teamMembers,
        }));

      setPendingSubmissions([...fromRegs, ...fromSubs]);
    } catch (error: any) {
      console.error('Failed to fetch pending submissions:', error);
      toast.error(error?.message || '加载待审核列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const filteredPending = useMemo(() => {
    let list = pendingSubmissions;
    if (filterTab === '待审核') list = pendingSubmissions.filter(s => s.status === '待审核');
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          (s.studentName && s.studentName.toLowerCase().includes(q)) ||
          (s.competitionTitle && s.competitionTitle.toLowerCase().includes(q)) ||
          (s.fileName && s.fileName.toLowerCase().includes(q))
      );
    }
    return list;
  }, [pendingSubmissions, filterTab, searchQuery]);

  const selected = selectedId ? pendingSubmissions.find((s) => s.id === selectedId) : null;

  const handleAudit = async (approve: boolean, reviewNote: string) => {
    if (!selected) return;
    try {
      if (selected.source === 'registration') {
        // Registration-based: use registration/audit with the original ID (strip prefix)
        const realId = selected.id.replace(/^reg-/, '');
        await apiClient.post(
          '/registration/audit',
          { approve, reviewNote },
          { params: { registrationId: realId } }
        );
      } else {
        // Standalone submission: use submission/review
        const realId = selected.id.replace(/^sub-/, '');
        await apiClient.post('/submission/review', null, {
          params: { submissionId: realId, approve, reviewNote },
        });
      }
      const processedItem = { ...selected, status: approve ? '审核通过' : '审核驳回', reviewNote };
      setProcessedSubmissions(prev => [processedItem, ...prev]);
      setPendingSubmissions(prev => prev.filter(s => s.id !== selected.id));
      setSelectedId(null);
      setNote('');
      toast.success(approve ? '审核通过' : '已驳回');
    } catch (error: any) {
      console.error('Failed to audit submission:', error);
      toast.error(error?.message || '操作失败，请重试');
    }
  };

  const handleApprove = () => handleAudit(true, note || '');
  const handleReject = () => {
    if (!note.trim()) {
      toast.error('驳回时必须填写审核意见');
      return;
    }
    handleAudit(false, note);
  };

  return (
      <div className="py-lg flex flex-col gap-md h-[calc(100vh-100px)]">
      {/* Header */}
      <PageHero
        eyebrow="Review"
        title="成果审核工作台"
        description="统一处理报名材料，保持审核口径一致并快速反馈结果。"
        titleClassName="text-[30px] sm:text-[32px]"
      />

      {/* Three-column */}
      <div className="flex-1 flex gap-md overflow-hidden">
        {/* Left: list */}
        <section className="w-80 glass flex flex-col overflow-hidden shrink-0">
          <div className="p-md border-b border-hairline">
            <h2 className="text-[15px] font-semibold text-ink mb-3">待审核列表</h2>
            <div className="relative mb-3">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-ink-muted-48">search</span>
              <input
                className="input-glass h-9 pl-9 text-[13px] !rounded-pill"
                placeholder="搜索姓名、赛事…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-1 p-0.5 bg-primary/6 rounded-pill w-fit">
              {(['全部', '待审核'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  className={`px-3 py-1 rounded-pill text-[12px] transition-all ${
                    filterTab === tab
                      ? 'bg-canvas text-ink font-semibold shadow-sm'
                      : 'text-ink-muted-80 hover:text-ink'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center h-full text-ink-muted-48">
                <span className="material-symbols-outlined animate-spin text-[28px]">progress_activity</span>
              </div>
            ) : filteredPending.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-ink-muted-48 py-12 gap-2">
                <span className="material-symbols-outlined text-[36px]">inbox</span>
                <p className="text-[13px]">暂无待审核</p>
              </div>
            ) : (
              filteredPending.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full text-left p-md border-b border-hairline transition relative ${
                    selectedId === s.id
                      ? 'bg-primary/5'
                      : 'hover:bg-primary/6'
                  }`}
                >
                  {selectedId === s.id && (
                    <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-primary" />
                  )}
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-[14px] font-semibold text-ink">{s.studentName || '未知学生'}</span>
                    <span className="chip chip-warning">待审核</span>
                  </div>
                  <p className="text-[12px] text-ink-muted-80 line-clamp-2 leading-snug">{s.competitionTitle || '未知赛事'}</p>
                  <p className="text-[11px] text-ink-muted-48 mt-1">{s.fileName || '无文件'} · {s.uploadDate || '—'}</p>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Middle: details */}
        <section className="flex-1 flex flex-col min-w-[400px] gap-md overflow-y-auto pr-1">
          {selected ? (
            <>
              <div className="glass p-lg">
                <h3 className="text-[17px] font-semibold tracking-tight text-ink pb-3 mb-md border-b border-hairline">申报详情</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-[13px]">
                  <DetailItem label="学生姓名" value={selected.studentName} />
                  <DetailItem label="赛事名称" value={selected.competitionTitle} />
                  <DetailItem label="上传时间" value={selected.uploadDate} />
                  {selected.source === 'submission' && (
                    <DetailItem label="提交方式" value="队长代传" />
                  )}
                  {selected.reviewNote && (
                    <div className="md:col-span-2">
                      <span className="text-ink-muted-48 mr-2">审核意见</span>
                      <span className="text-ink">{selected.reviewNote}</span>
                    </div>
                  )}
                  {selected.teamMembers && selected.teamMembers.length > 0 && (
                    <div className="md:col-span-2">
                      <p className="text-[11px] text-ink-muted-48 uppercase tracking-wider mb-1.5">关联成员</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.teamMembers.map(m => (
                          <span key={m.studentId} className="chip">
                            {m.studentName}
                            <span className="text-ink-muted-48 ml-1">{m.studentNo}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Attachment preview */}
              <div className="glass p-lg">
                <div className="flex items-center justify-between pb-3 mb-md border-b border-hairline">
                  <h3 className="text-[15px] font-semibold text-ink flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">attach_file</span>
                    附件材料
                  </h3>
                  {selected.fileUrl && (
                    <button
                      onClick={() => setPreviewFile({ fileName: selected.fileName, fileUrl: selected.fileUrl })}
                      className="btn-primary !py-1.5 !px-4 !text-[12px]"
                    >
                      <span className="material-symbols-outlined text-[15px]">open_in_full</span>
                      全屏预览
                    </button>
                  )}
                </div>

                {selected.fileUrl ? (
                  <div className="rounded-xl overflow-hidden border border-hairline bg-canvas/50"
                    style={{ height: '420px' }}
                  >
                    <FilePreview fileUrl={selected.fileUrl} fileName={selected.fileName} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-ink-muted-48">
                    <span className="material-symbols-outlined text-[36px]">folder_off</span>
                    <p className="text-[13px]">该申报暂未上传附件</p>
                  </div>
                )}

                {selected.fileName && (
                  <p className="text-[11px] text-ink-muted-48 mt-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">description</span>
                    {selected.fileName}
                    {selected.fileSize != null && (
                      <span className="ml-1">
                        · {selected.fileSize < 1024 * 1024
                          ? `${(selected.fileSize / 1024).toFixed(0)} KB`
                          : `${(selected.fileSize / (1024 * 1024)).toFixed(1)} MB`}
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="glass p-lg">
                <h3 className="text-[15px] font-semibold text-ink pb-3 mb-md border-b border-hairline">流转记录</h3>
                <ol className="relative pl-5">
                  <span className="absolute left-1 top-2 bottom-2 w-px bg-hairline" />
                  <li className="relative mb-3">
                    <span className="absolute -left-[14px] top-1 w-2.5 h-2.5 rounded-full bg-primary" />
                    <p className="text-[13px] text-ink font-medium">学生提交申报</p>
                    <span className="text-[11px] text-ink-muted-48">{selected.uploadDate}</span>
                  </li>
                  <li className="relative">
                    <span className="absolute -left-[14px] top-1 w-2.5 h-2.5 rounded-full bg-canvas border-2 border-primary" />
                    <p className="text-[13px] text-ink-muted-80 font-medium">教师审核</p>
                    <span className="text-[11px] text-primary">待处理</span>
                  </li>
                </ol>
              </div>

              <div className="glass p-lg">
                <label className="block text-[13px] font-medium text-ink mb-2">审核意见</label>
                <textarea
                  className="input-glass !h-auto py-2.5 resize-none mb-3"
                  rows={4}
                  placeholder="请输入审核意见（通过时选填，驳回时必填）"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-[12px] text-ink-muted-80 hover:text-ink transition">
                    <input
                      type="checkbox"
                      className="w-[14px] h-[14px] rounded-xs accent-primary cursor-pointer"
                      checked={sendMessage}
                      onChange={(e) => setSendMessage(e.target.checked)}
                    />
                    同步发送站内消息
                  </label>
                  <div className="flex gap-2">
                    <button className="btn-secondary !py-2 !text-[13px]">退回补充</button>
                    <button
                      className="!py-2 !text-[13px] !px-5 rounded-pill bg-error/10 text-error border border-error/20 font-medium hover:bg-error/15 transition flex items-center gap-2 active:scale-[0.96]"
                      onClick={handleReject}
                    >
                      驳回
                    </button>
                    <button
                      className="btn-primary !py-2 !text-[13px]"
                      onClick={handleApprove}
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      审核通过
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 glass flex flex-col items-center justify-center text-ink-muted-48 gap-2">
              <span className="material-symbols-outlined text-[56px] opacity-40">assignment</span>
              <p className="text-[15px] font-medium text-ink-muted-80">选择左侧列表查看详情</p>
              <p className="text-[13px]">点击待审核项目以查看申报信息</p>
            </div>
          )}
        </section>

        {/* Right: history */}
        <section className="w-72 glass flex flex-col overflow-hidden shrink-0">
          <div className="p-md border-b border-hairline">
            <h3 className="text-[14px] font-semibold text-ink flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">history</span>
              已处理记录
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {processedSubmissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-ink-muted-48 py-8 gap-2">
                <span className="material-symbols-outlined text-[32px] opacity-40">check_circle</span>
                <p className="text-[12px]">暂无已处理记录</p>
              </div>
            ) : (
              processedSubmissions.map((s, index) => (
                <div key={`${s.id}-${index}`} className="p-md border-b border-hairline hover:bg-primary/6 transition">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[13px] font-semibold text-ink">{s.studentName || '未知'}</span>
                    <span className={s.status === '审核通过' ? 'chip chip-success' : 'chip chip-error'}>
                      {s.status}
                    </span>
                  </div>
                  <p className="text-[12px] text-ink-muted-80 line-clamp-1">{s.competitionTitle}</p>
                  {s.reviewNote && (
                    <p className="text-[11px] text-ink-muted-48 mt-1 italic">"{s.reviewNote}"</p>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Preview modal */}
      {previewFile && (
        <PreviewModal
          fileName={previewFile.fileName}
          fileUrl={previewFile.fileUrl}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-ink-muted-48 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-[13px] text-ink font-medium">{value}</p>
    </div>
  );
}
